import { loadSchema, loadSchemaFailure, loadSchemaSuccess } from './schema.actions';
import { loadResources } from '../resources/resources.actions';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { FieldAnalyzerService } from 'services/schema/field-analyzer.service';
import { SchemaService } from 'services/schema/schema.service';
import { selectContext } from 'state/context/context.selectors';
import { IntrospectionType } from 'models/index';

@Injectable()
export class SchemaEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private schemaService = inject(SchemaService);
  private fieldAnalyzer = inject(FieldAnalyzerService);

  loadSchema$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSchema),
      withLatestFrom(this.store.select(selectContext)),
      switchMap(([{ resourceDefinition }, context]) => {
        console.log('[SchemaEffects] loadSchema triggered, resourceDefinition:', resourceDefinition);
        console.log('[SchemaEffects] context:', context);

        if (!context) {
          console.error('[SchemaEffects] No context available');
          return of(loadSchemaFailure({ error: 'No context available' }));
        }

        // Use readFromParentKcpPath from resource definition config
        const readFromParentKcpPath = resourceDefinition.readFromParentKcpPath ?? false;

        console.log('[SchemaEffects] Introspecting type:', resourceDefinition.kind);
        console.log('[SchemaEffects] Using GraphQL URL:', context.portalContext?.crdGatewayApiUrl);
        console.log('[SchemaEffects] readFromParentKcpPath:', readFromParentKcpPath);

        return this.schemaService
          .introspectType(resourceDefinition.kind, context, readFromParentKcpPath)
          .pipe(
            switchMap((resourceType) => {
              console.log('[SchemaEffects] Introspection result for', resourceDefinition.kind, ':', resourceType);

              if (!resourceType) {
                return of(
                  loadSchemaFailure({
                    error: `Type ${resourceDefinition.kind} not found in schema`,
                  })
                );
              }

              // Extract nested type names from fields
              const nestedTypeNames = this.extractNestedTypeNames(resourceType, resourceDefinition.kind);
              console.log('[SchemaEffects] Nested type names to introspect:', nestedTypeNames);

              // Introspect input type and all nested types
              const queries: Record<string, Observable<IntrospectionType | null>> = {
                inputType: this.schemaService.introspectType(`${resourceDefinition.kind}Input`, context, readFromParentKcpPath),
              };
              nestedTypeNames.forEach((name) => {
                queries[name] = this.schemaService.introspectType(name, context, readFromParentKcpPath);
              });

              return forkJoin(queries).pipe(
                map((results) => {
                  console.log('[SchemaEffects] All introspection results:', results);
                  const inputType = results['inputType'] as IntrospectionType | null;
                  const nestedResults = { ...results };
                  delete nestedResults['inputType'];

                  // Enrich resourceType with nested type field info
                  const enrichedResourceType = this.enrichResourceType(resourceType, nestedResults as Record<string, IntrospectionType | null>);
                  console.log('[SchemaEffects] Enriched resource type:', enrichedResourceType);

                  const fieldAnalysis = this.fieldAnalyzer.analyzeFields(enrichedResourceType);
                  console.log('[SchemaEffects] Field analysis:', fieldAnalysis);

                  return loadSchemaSuccess({
                    resourceType: enrichedResourceType,
                    inputType,
                    fieldAnalysis,
                  });
                })
              );
            }),
            catchError((error) => {
              console.error('[SchemaEffects] Error loading schema:', error);
              return of(loadSchemaFailure({ error: error.message }));
            })
          );
      })
    )
  );

  private extractNestedTypeNames(resourceType: IntrospectionType, _kind: string): string[] {
    const typeNames: string[] = [];
    const fields = resourceType.fields ?? [];

    for (const field of fields) {
      if (['metadata', 'spec', 'status'].includes(field.name)) {
        // Unwrap NON_NULL/LIST wrappers to get the actual type name
        let type = field.type;
        while (type.ofType) {
          type = type.ofType;
        }
        if (type.name) {
          typeNames.push(type.name);
        }
      }
    }
    return typeNames;
  }

  private enrichResourceType(
    resourceType: IntrospectionType,
    nestedTypes: Record<string, IntrospectionType | null>
  ): IntrospectionType {
    const fields = resourceType.fields?.map((field) => {
      if (['metadata', 'spec', 'status'].includes(field.name)) {
        // Find the unwrapped type name
        let type = field.type;
        while (type.ofType) {
          type = type.ofType;
        }
        const typeName = type.name;
        const nestedType = typeName ? nestedTypes[typeName] : null;

        if (nestedType) {
          // Rebuild the type structure with nested fields included
          return {
            ...field,
            type: this.enrichTypeWithFields(field.type, nestedType),
          };
        }
      }
      return field;
    }) ?? [];

    return { ...resourceType, fields };
  }

  private enrichTypeWithFields(type: IntrospectionType, nestedType: IntrospectionType): IntrospectionType {
    if (type.ofType) {
      return { ...type, ofType: this.enrichTypeWithFields(type.ofType, nestedType) };
    }
    // At the base type, add the fields from the introspected nested type
    return { ...type, fields: nestedType.fields, inputFields: nestedType.inputFields };
  }

  schemaLoaded$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSchemaSuccess),
      map(() => loadResources())
    )
  );
}

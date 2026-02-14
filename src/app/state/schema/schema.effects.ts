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
import { IntrospectionType, ResourceDefinition, ResourceNodeContext } from 'models/index';

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

        // Build versioned type name to get correct nested types
        // Format: {Group}{Version}{Kind} e.g., ApisKcpIoV1alpha2APIBinding
        const versionedTypeName = this.buildVersionedTypeName(resourceDefinition);
        console.log('[SchemaEffects] Introspecting versioned type:', versionedTypeName);
        console.log('[SchemaEffects] Using GraphQL URL:', context.portalContext?.crdGatewayApiUrl);
        console.log('[SchemaEffects] readFromParentKcpPath:', readFromParentKcpPath);

        return this.schemaService
          .introspectType(versionedTypeName, context, readFromParentKcpPath)
          .pipe(
            switchMap((resourceType) => {
              console.log('[SchemaEffects] Introspection result for', versionedTypeName, ':', resourceType);

              if (!resourceType) {
                // Fallback to unversioned type name for core API resources
                console.log('[SchemaEffects] Versioned type not found, trying:', resourceDefinition.kind);
                return this.schemaService
                  .introspectType(resourceDefinition.kind, context, readFromParentKcpPath)
                  .pipe(
                    switchMap((fallbackType) => {
                      if (!fallbackType) {
                        return of(
                          loadSchemaFailure({
                            error: `Type ${resourceDefinition.kind} not found in schema`,
                          })
                        );
                      }
                      return this.processResourceType(fallbackType, resourceDefinition, context, readFromParentKcpPath);
                    })
                  );
              }

              return this.processResourceType(resourceType, resourceDefinition, context, readFromParentKcpPath);
            }),
            catchError((error) => {
              console.error('[SchemaEffects] Error loading schema:', error);
              return of(loadSchemaFailure({ error: error.message }));
            })
          );
      })
    )
  );

  private processResourceType(
    resourceType: IntrospectionType,
    resourceDefinition: ResourceDefinition,
    context: ResourceNodeContext,
    readFromParentKcpPath: boolean
  ): Observable<ReturnType<typeof loadSchemaSuccess> | ReturnType<typeof loadSchemaFailure>> {
    // Extract nested type names from fields
    const nestedTypeNames = this.extractNestedTypeNames(resourceType);
    console.log('[SchemaEffects] Nested type names to introspect:', nestedTypeNames);

    // Introspect input type and all nested types
    const versionedInputTypeName = this.buildVersionedTypeName(resourceDefinition) + 'Input';
    const queries: Record<string, Observable<IntrospectionType | null>> = {
      inputType: this.schemaService.introspectType(versionedInputTypeName, context, readFromParentKcpPath),
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
  }

  private buildVersionedTypeName(resourceDefinition: ResourceDefinition): string {
    const { group, version, kind } = resourceDefinition;

    // For core API resources (no group), just use the kind
    if (!group) {
      return kind;
    }

    // Convert group to PascalCase: apis.kcp.io -> ApisKcpIo
    const groupPascal = group
      .split(/[.\-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');

    // Version is typically like v1alpha2 -> V1alpha2
    const versionPascal = version.charAt(0).toUpperCase() + version.slice(1);

    return `${groupPascal}${versionPascal}${kind}`;
  }

  private extractNestedTypeNames(resourceType: IntrospectionType): string[] {
    const typeNames = new Set<string>();
    const fields = resourceType.fields ?? [];

    for (const field of fields) {
      if (['metadata', 'spec', 'status'].includes(field.name)) {
        // Unwrap NON_NULL/LIST wrappers to get the actual type name
        let type = field.type;
        while (type.ofType) {
          type = type.ofType;
        }
        if (type.name) {
          typeNames.add(type.name);

          // Also extract nested type names from the type's fields (if available from introspection)
          // This handles cases where spec fields have nested objects
          if (type.fields) {
            for (const nestedField of type.fields) {
              this.extractTypeNamesRecursive(nestedField.type, typeNames, 2);
            }
          }
        }
      }
    }
    return Array.from(typeNames);
  }

  private extractTypeNamesRecursive(type: IntrospectionType, typeNames: Set<string>, depth: number): void {
    if (depth <= 0) return;

    // Unwrap NON_NULL/LIST wrappers
    let unwrapped = type;
    while (unwrapped.ofType) {
      unwrapped = unwrapped.ofType;
    }

    // Only add OBJECT types (not scalars)
    if (unwrapped.kind === 'OBJECT' && unwrapped.name && !unwrapped.name.startsWith('__')) {
      typeNames.add(unwrapped.name);

      // Recursively extract from nested fields if available
      if (unwrapped.fields) {
        for (const field of unwrapped.fields) {
          this.extractTypeNamesRecursive(field.type, typeNames, depth - 1);
        }
      }
    }
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
          // Also recursively enrich the nested fields within
          const enrichedNestedType = this.enrichNestedTypeRecursively(nestedType, nestedTypes);
          return {
            ...field,
            type: this.enrichTypeWithFields(field.type, enrichedNestedType),
          };
        }
      }
      return field;
    }) ?? [];

    return { ...resourceType, fields };
  }

  private enrichNestedTypeRecursively(
    type: IntrospectionType,
    nestedTypes: Record<string, IntrospectionType | null>
  ): IntrospectionType {
    if (!type.fields) {
      return type;
    }

    const enrichedFields = type.fields.map((field) => {
      // Unwrap the field type
      let unwrapped = field.type;
      while (unwrapped.ofType) {
        unwrapped = unwrapped.ofType;
      }

      const typeName = unwrapped.name;
      const nestedType = typeName ? nestedTypes[typeName] : null;

      if (nestedType && nestedType.fields) {
        // Recursively enrich this nested type
        const enrichedNestedType = this.enrichNestedTypeRecursively(nestedType, nestedTypes);
        return {
          ...field,
          type: this.enrichTypeWithFields(field.type, enrichedNestedType),
        };
      }

      return field;
    });

    return { ...type, fields: enrichedFields };
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

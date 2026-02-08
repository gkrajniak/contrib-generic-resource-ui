import { ApolloFactory } from './apollo-factory';
import { Injectable, inject } from '@angular/core';
import {
  FieldAnalysis,
  Resource,
  ResourceDefinition,
  ResourceListResult,
  ResourceNodeContext,
  ResourceOperationTypeMap,
  ResourceSubscriptionResult,
} from 'models/index';
import { gql } from 'apollo-angular';
import { Observable, throwError } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class GenericResourceService {
  private apolloFactory = inject(ApolloFactory);

  list(
    resourceDefinition: ResourceDefinition,
    fieldAnalysis: FieldAnalysis,
    context: ResourceNodeContext
  ): Observable<Resource[]> {
    const fieldsSelection = this.buildListFieldsSelection(fieldAnalysis);
    const group = this.normalizeGroupName(resourceDefinition.group);
    const version = resourceDefinition.version;
    const kind = this.capitalize(resourceDefinition.plural);
    const isNamespaced = resourceDefinition.scope === 'Namespaced';

    const variables: Record<string, any> = {};
    let variablesDef = '';
    let kindArgs = '';

    if (isNamespaced && context.namespaceId) {
      variablesDef = '($namespace: String)';
      kindArgs = '(namespace: $namespace)';
      variables['namespace'] = context.namespaceId;
    }

    const listQuery = `
      query ListResources${variablesDef} {
        ${group} {
          ${version} {
            ${kind}${kindArgs} {
              resourceVersion
              items {
                ${fieldsSelection}
              }
            }
          }
        }
      }
    `;

    console.log('[GenericResourceService] List query:', listQuery);

    return this.apolloFactory
      .apollo(context)
      .query({
        query: gql`${listQuery}`,
        variables,
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((res: any): ResourceListResult => {
          const path = `${group}.${version}.${kind}`;
          return this.getValueByPath(res.data, path);
        }),
        switchMap((listResult: ResourceListResult) => {
          const { resourceVersion, items } = listResult;
          // Subscription field name format: {group}_{version}_{plural}
          const subscriptionOperation = `${group}_${version}_${resourceDefinition.plural}`.toLowerCase();

          let subVariablesDef = '($resourceVersion: String!)';
          let subArgs = '(resourceVersion: $resourceVersion)';
          const subVariables: Record<string, any> = { resourceVersion };

          if (isNamespaced && context.namespaceId) {
            subVariablesDef = '($resourceVersion: String!, $namespace: String)';
            subArgs = '(resourceVersion: $resourceVersion, namespace: $namespace)';
            subVariables['namespace'] = context.namespaceId;
          }

          const subscriptionQuery = `
            subscription WatchResources${subVariablesDef} {
              ${subscriptionOperation}${subArgs} {
                type
                object {
                  ${fieldsSelection}
                }
              }
            }
          `;
          console.log('[GenericResourceService] Subscription query:', subscriptionQuery);

          const result = new Map<string, Resource>(
            items.map((item) => [item.metadata.uid!, item])
          );

          return this.apolloFactory
            .apollo(context)
            .subscribe({
              query: gql`${subscriptionQuery}`,
              variables: subVariables,
            })
            .pipe(
              map((res: any): Resource[] => {
                const resourceResult: ResourceSubscriptionResult | undefined =
                  this.getValueByPath(res.data, subscriptionOperation);

                if (!resourceResult) {
                  return Array.from(result.values());
                }

                const { type, object } = resourceResult;
                if (type === ResourceOperationTypeMap.ADDED) {
                  result.set(object.metadata.uid!, object);
                } else if (type === ResourceOperationTypeMap.MODIFIED) {
                  result.set(object.metadata.uid!, object);
                } else if (type === ResourceOperationTypeMap.DELETED) {
                  result.delete(object.metadata.uid!);
                }

                return Array.from(result.values());
              }),
              startWith(Array.from(result.values()))
            );
        }),
        catchError((error) => {
          console.error('Error listing resources', error);
          return throwError(() => error);
        })
      );
  }

  read(
    resourceName: string,
    resourceDefinition: ResourceDefinition,
    fieldAnalysis: FieldAnalysis,
    context: ResourceNodeContext
  ): Observable<Resource> {
    const fieldsSelection = this.buildDetailFieldsSelection(fieldAnalysis);
    const group = this.normalizeGroupName(resourceDefinition.group);
    const version = resourceDefinition.version;
    const kind = resourceDefinition.kind;
    const isNamespaced = resourceDefinition.scope === 'Namespaced';

    const variables: Record<string, any> = { name: resourceName };
    let variablesDef = '($name: String!)';
    let kindArgs = '(name: $name)';

    if (isNamespaced && context.namespaceId) {
      variablesDef = '($name: String!, $namespace: String)';
      kindArgs = '(name: $name, namespace: $namespace)';
      variables['namespace'] = context.namespaceId;
    }

    const readQuery = `
      query GetResource${variablesDef} {
        ${group} {
          ${version} {
            ${kind}${kindArgs} {
              ${fieldsSelection}
            }
          }
        }
      }
    `;

    return this.apolloFactory
      .apollo(context)
      .query({
        query: gql`${readQuery}`,
        variables,
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((res: any): Resource => {
          const path = `${group}.${version}.${kind}`;
          return this.getValueByPath(res.data, path);
        }),
        catchError((error) => {
          console.error('Error reading resource', error);
          return throwError(() => error);
        })
      );
  }

  create(
    resource: Resource,
    resourceDefinition: ResourceDefinition,
    context: ResourceNodeContext,
    dryRun = false
  ): Observable<any> {
    const group = this.normalizeGroupName(resourceDefinition.group);
    const version = resourceDefinition.version;
    const kind = resourceDefinition.kind;
    const isNamespaced = resourceDefinition.scope === 'Namespaced';

    const variables: Record<string, any> = { object: resource };
    let variablesDef = `($object: ${kind}Input!)`;
    let mutationArgs = '(object: $object)';

    if (isNamespaced && context.namespaceId) {
      variablesDef = `($object: ${kind}Input!, $namespace: String)`;
      mutationArgs = '(object: $object, namespace: $namespace)';
      variables['namespace'] = context.namespaceId;
    }

    if (dryRun) {
      variablesDef = variablesDef.slice(0, -1) + ', $dryRun: [String!])';
      mutationArgs = mutationArgs.slice(0, -1) + ', dryRun: $dryRun)';
      variables['dryRun'] = ['All'];
    }

    const createMutation = `
      mutation CreateResource${variablesDef} {
        ${group} {
          ${version} {
            create${kind}${mutationArgs} {
              __typename
            }
          }
        }
      }
    `;

    return this.apolloFactory
      .apollo(context)
      .mutate({
        mutation: gql`${createMutation}`,
        variables,
        fetchPolicy: 'no-cache',
      })
      .pipe(
        catchError((error) => {
          console.error('Error creating resource', error);
          return throwError(() => error);
        })
      );
  }

  update(
    resource: Resource,
    resourceDefinition: ResourceDefinition,
    context: ResourceNodeContext,
    dryRun = false
  ): Observable<any> {
    const group = this.normalizeGroupName(resourceDefinition.group);
    const version = resourceDefinition.version;
    const kind = resourceDefinition.kind;
    const isNamespaced = resourceDefinition.scope === 'Namespaced';

    const cleanResource = this.stripTypename(resource);

    const variables: Record<string, any> = {
      name: resource.metadata.name,
      object: cleanResource,
    };
    let variablesDef = `($name: String!, $object: ${kind}Input!)`;
    let mutationArgs = '(name: $name, object: $object)';

    if (isNamespaced && context.namespaceId) {
      variablesDef = `($name: String!, $object: ${kind}Input!, $namespace: String)`;
      mutationArgs = '(name: $name, object: $object, namespace: $namespace)';
      variables['namespace'] = context.namespaceId;
    }

    if (dryRun) {
      variablesDef = variablesDef.slice(0, -1) + ', $dryRun: [String!])';
      mutationArgs = mutationArgs.slice(0, -1) + ', dryRun: $dryRun)';
      variables['dryRun'] = ['All'];
    }

    const updateMutation = `
      mutation UpdateResource${variablesDef} {
        ${group} {
          ${version} {
            update${kind}${mutationArgs} {
              __typename
            }
          }
        }
      }
    `;

    return this.apolloFactory
      .apollo(context)
      .mutate({
        mutation: gql`${updateMutation}`,
        variables,
        fetchPolicy: 'no-cache',
      })
      .pipe(
        catchError((error) => {
          console.error('Error updating resource', error);
          return throwError(() => error);
        })
      );
  }

  delete(
    resourceName: string,
    resourceDefinition: ResourceDefinition,
    context: ResourceNodeContext
  ): Observable<any> {
    const group = this.normalizeGroupName(resourceDefinition.group);
    const version = resourceDefinition.version;
    const kind = resourceDefinition.kind;
    const isNamespaced = resourceDefinition.scope === 'Namespaced';

    const variables: Record<string, any> = { name: resourceName };
    let variablesDef = '($name: String!)';
    let mutationArgs = '(name: $name)';

    if (isNamespaced && context.namespaceId) {
      variablesDef = '($name: String!, $namespace: String)';
      mutationArgs = '(name: $name, namespace: $namespace)';
      variables['namespace'] = context.namespaceId;
    }

    const deleteMutation = `
      mutation DeleteResource${variablesDef} {
        ${group} {
          ${version} {
            delete${kind}${mutationArgs}
          }
        }
      }
    `;

    return this.apolloFactory
      .apollo(context)
      .mutate({
        mutation: gql`${deleteMutation}`,
        variables,
      })
      .pipe(
        catchError((error) => {
          console.error('Error deleting resource', error);
          return throwError(() => error);
        })
      );
  }

  private buildListFieldsSelection(fieldAnalysis: FieldAnalysis): string {
    const metadataFields = ['name', 'namespace', 'uid', 'creationTimestamp', 'labels'];
    const specFields = fieldAnalysis.scalarSpecFields
      .slice(0, 5)
      .map((f) => f.name);
    const statusFields = fieldAnalysis.statusFields
      .slice(0, 3)
      .map((f) => f.name);

    let selection = `metadata { ${metadataFields.join(' ')} }`;

    if (specFields.length > 0) {
      selection += `\nspec { ${specFields.join(' ')} }`;
    }

    if (statusFields.length > 0) {
      selection += `\nstatus { ${statusFields.join(' ')} }`;
    }

    return selection;
  }

  private buildDetailFieldsSelection(fieldAnalysis: FieldAnalysis): string {
    const metadataFields = [
      'name',
      'namespace',
      'uid',
      'resourceVersion',
      'creationTimestamp',
      'deletionTimestamp',
      'labels',
      'annotations',
      'generation',
    ];

    const specFields = fieldAnalysis.allSpecFields
      .filter((f) => f.isScalar)
      .map((f) => f.name);
    const statusFields = fieldAnalysis.allStatusFields
      .filter((f) => f.isScalar)
      .map((f) => f.name);

    let selection = `metadata { ${metadataFields.join(' ')} }`;

    if (specFields.length > 0) {
      selection += `\nspec { ${specFields.join(' ')} }`;
    }

    if (statusFields.length > 0 || fieldAnalysis.conditionsField) {
      let statusSelection = statusFields.join(' ');
      if (fieldAnalysis.conditionsField) {
        statusSelection += ' conditions { type status reason message lastTransitionTime }';
      }
      if (statusSelection.trim()) {
        selection += `\nstatus { ${statusSelection} }`;
      }
    }

    return selection;
  }


  private normalizeGroupName(group: string): string {
    return group.replace(/[.\-]/g, '_');
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  private stripTypename(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.stripTypename(item));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        if (key !== '__typename') {
          result[key] = this.stripTypename(obj[key]);
        }
      }
      return result;
    }

    return obj;
  }
}

# Integration Guide

How to integrate the Generic Resource UI with the portal and GraphQL gateway.

## Portal Integration

### Luigi Microfrontend

The Generic Resource UI is designed as a Luigi microfrontend. It integrates with the portal via:

1. **Context Passing**: Portal passes `resourceDefinition` and `portalContext` via Luigi context
2. **Navigation**: Luigi handles routing between list and detail views
3. **Dialogs**: Create/edit modals can use Luigi dialog service

### URL Structure

The UI uses hash-based routing:

| Route | View | Description |
|-------|------|-------------|
| `/#/` | List | Resource list view |
| `/#/:resourceId` | Detail | Resource detail view |
| `/#/create` | Create | Create resource page |

### Navigation Flow

```
Portal Navigation → Luigi Node Click
       ↓
Luigi Context Update → Generic Resource UI
       ↓
Schema Introspection → GraphQL Gateway
       ↓
Resource Loading → List/Detail View
```

### ContentConfiguration

Create a `ContentConfiguration` CR to register the UI with the portal:

```yaml
apiVersion: ui.platform-mesh.io/v1alpha1
kind: ContentConfiguration
metadata:
  name: my-resources
  labels:
    ui.platform-mesh.io/entity: workspaces_workspace
spec:
  inlineConfiguration:
    contentType: json
    content: |
      {
        "name": "my-resources",
        "luigiConfigFragment": {
          "data": {
            "nodes": [
              {
                "pathSegment": "myresources",
                "label": "My Resources",
                "icon": "database",
                "url": "https://{context.organization}.portal.example.com/ui/generic-resource/#/",
                "context": {
                  "resourceDefinition": {
                    "group": "example.com",
                    "version": "v1",
                    "kind": "MyResource",
                    "plural": "myresources",
                    "singular": "myresource",
                    "scope": "Namespaced"
                  }
                },
                "children": [
                  {
                    "pathSegment": ":resourceId",
                    "hideFromNav": true,
                    "url": "https://{context.organization}.portal.example.com/ui/generic-resource/#/:resourceId"
                  }
                ]
              }
            ]
          }
        }
      }
```

## GraphQL Integration

### Gateway Connection

The UI connects to a Kubernetes GraphQL gateway that exposes CRDs as GraphQL types.

### Query Patterns

#### List Query

```graphql
query ListResources($namespace: String) {
  example_com {
    v1 {
      MyResources(namespace: $namespace) {
        resourceVersion
        items {
          metadata { name namespace uid creationTimestamp labels }
          spec { field1 field2 }
          status { conditions { type status reason message lastTransitionTime } }
        }
      }
    }
  }
}
```

#### Get Single Resource

```graphql
query GetResource($name: String!, $namespace: String) {
  example_com {
    v1 {
      MyResource(name: $name, namespace: $namespace) {
        metadata { ... }
        spec { ... }
        status { ... }
      }
    }
  }
}
```

#### Create Mutation

```graphql
mutation CreateResource($object: MyResourceInput!) {
  example_com {
    v1 {
      createMyResource(object: $object) {
        __typename
      }
    }
  }
}
```

#### Update Mutation

```graphql
mutation UpdateResource($name: String!, $namespace: String, $object: MyResourceInput!) {
  example_com {
    v1 {
      updateMyResource(name: $name, namespace: $namespace, object: $object) {
        __typename
      }
    }
  }
}
```

#### Delete Mutation

```graphql
mutation DeleteResource($name: String!, $namespace: String) {
  example_com {
    v1 {
      deleteMyResource(name: $name, namespace: $namespace)
    }
  }
}
```

#### YAML Query

```graphql
query GetResourceYaml($name: String!, $namespace: String) {
  example_com {
    v1 {
      MyResourceYaml(name: $name, namespace: $namespace)
    }
  }
}
```

### Subscriptions

Real-time updates via Server-Sent Events (SSE):

```graphql
subscription WatchResources($resourceVersion: String!, $namespace: String) {
  example_com_v1_myresources(resourceVersion: $resourceVersion, namespace: $namespace) {
    type
    object {
      metadata { name namespace uid }
      spec { ... }
      status { ... }
    }
  }
}
```

Event types:
- `ADDED`: New resource created
- `MODIFIED`: Resource updated
- `DELETED`: Resource deleted

### Schema Introspection

The UI introspects the GraphQL schema to discover resource fields:

```graphql
query IntrospectType($typeName: String!) {
  __type(name: $typeName) {
    name
    kind
    fields {
      name
      description
      type {
        name
        kind
        ofType { name kind ofType { ... } }
      }
    }
    inputFields {
      name
      type { ... }
    }
  }
}
```

### Type Name Conventions

The UI constructs GraphQL type names from the resource definition:

| Resource | GraphQL Type |
|----------|-------------|
| `core.platform-mesh.io/v1alpha1/Account` | `CorePlatformMeshIoV1alpha1Account` |
| `apis.kcp.io/v1alpha2/APIBinding` | `ApisKcpIoV1alpha2APIBinding` |
| Core API `v1/ConfigMap` | `ConfigMap` |

### Authentication

Bearer token authentication:

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

The token is passed via Luigi context or fallback config.

## KCP Multi-Workspace Support

### KCP Path

For multi-workspace scenarios, the GraphQL gateway URL includes the KCP path:

```
https://portal.example.com/api/kubernetes-graphql-gateway/root:orgs:sap:workspaces:my-workspace/graphql
```

### Read from Parent Path

Some resources (like AccountInfo) live in a parent workspace. Set `readFromParentKcpPath: true` to query the parent:

```json
{
  "resourceDefinition": {
    "group": "core.platform-mesh.io",
    "kind": "AccountInfo",
    "readFromParentKcpPath": true
  }
}
```

This strips the last segment from the KCP path:
- Original: `root:orgs:sap:workspaces:my-workspace`
- Parent: `root:orgs:sap`

## Apollo Client Configuration

### Transport Setup

```typescript
// HTTP for queries and mutations
const httpLink = createHttpLink({
  uri: gatewayUrl,
  headers: { Authorization: `Bearer ${token}` }
});

// SSE for subscriptions
const sseLink = new SSELink({
  uri: gatewayUrl,
  headers: { Authorization: `Bearer ${token}` }
});

// Split based on operation type
const link = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' &&
           definition.operation === 'subscription';
  },
  sseLink,
  httpLink
);
```

### Error Handling

GraphQL errors are caught and displayed as toasts:

```typescript
catchError((error: ApolloError) => {
  console.error('GraphQL error:', error.message);
  return throwError(() => error);
})
```

## Service Integration Points

### ContextService

Handles Luigi context and configuration:

```typescript
// Initialize context from Luigi or fallback
contextService.initialize();

// Update namespace from URL params
contextService.updateNamespaceFromUrl();
```

### SchemaService

Introspects GraphQL schema:

```typescript
// Get type information
schemaService.introspectType(typeName, context, readFromParentKcpPath);
```

### GenericResourceService

CRUD operations on resources:

```typescript
// List resources
resourceService.listResources(resourceDefinition, context, fieldAnalysis);

// Get single resource
resourceService.readResource(resourceDefinition, context, name, namespace);

// Create resource
resourceService.createResource(resourceDefinition, context, resource);

// Update resource
resourceService.updateResource(resourceDefinition, context, name, resource, namespace);

// Delete resource
resourceService.deleteResource(resourceDefinition, context, name, namespace);
```

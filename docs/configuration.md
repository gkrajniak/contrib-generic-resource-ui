# Configuration

Complete guide to configuring the Generic Resource UI.

## Luigi Context Configuration

The UI receives its configuration through Luigi context. The context is passed when the microfrontend is loaded.

### ResourceDefinition Structure

The core configuration that tells the UI which Kubernetes resource to display:

```typescript
interface ResourceDefinition {
  group: string;              // API group (e.g., "core.platform-mesh.io", "" for core API)
  version: string;            // API version (e.g., "v1alpha1", "v1")
  kind: string;               // Resource kind (e.g., "Account", "ConfigMap")
  plural: string;             // Plural name (e.g., "accounts", "configmaps")
  singular: string;           // Singular name (e.g., "account", "configmap")
  scope: 'Cluster' | 'Namespaced';  // Resource scope
  readFromParentKcpPath?: boolean;  // Query parent KCP workspace (optional)
}
```

### PortalContext Structure

Connection details for the GraphQL gateway:

```typescript
interface PortalContext {
  crdGatewayApiUrl: string;   // GraphQL gateway URL
  kcpWorkspaceUrl?: string;   // KCP workspace URL (optional)
  kcpPath?: string;           // KCP path for multi-workspace (optional)
}
```

### UiConfig Structure

Optional UI customization:

```typescript
interface UiConfig {
  title?: string;             // Custom title for resource type
  showCreateButton?: boolean; // Show/hide create button (default: true)
  showDeleteButton?: boolean; // Show/hide delete button (default: true)
  showEditButton?: boolean;   // Show/hide edit button (default: true)
  showYamlPanel?: boolean;    // Show/hide YAML panel toggle (default: true)
  defaultPageSize?: number;   // Pagination size (default: 10)
}
```

### Complete Context Structure

Full context object passed to the UI:

```typescript
interface ResourceNodeContext {
  token: string;              // JWT bearer token for GraphQL API
  resourceDefinition: ResourceDefinition;
  portalContext: PortalContext;
  namespaceId?: string;       // Current namespace (from Luigi or URL)
  accountId?: string;         // Account context
  resourceId?: string;        // Resource ID for detail view
  entityType?: string;        // Entity type context
  entityName?: string;        // Entity name context
  ui?: UiConfig;              // UI customization
}
```

## Configuration Examples

### Cluster-Scoped Resource

```json
{
  "resourceDefinition": {
    "group": "core.platform-mesh.io",
    "version": "v1alpha1",
    "kind": "Account",
    "plural": "accounts",
    "singular": "account",
    "scope": "Cluster"
  },
  "portalContext": {
    "crdGatewayApiUrl": "https://portal.example.com/api/kubernetes-graphql-gateway/root:platform-mesh/graphql"
  },
  "token": "eyJhbGciOiJSUzI1NiIs..."
}
```

### Namespaced Resource

```json
{
  "resourceDefinition": {
    "group": "",
    "version": "v1",
    "kind": "ConfigMap",
    "plural": "configmaps",
    "singular": "configmap",
    "scope": "Namespaced"
  },
  "portalContext": {
    "crdGatewayApiUrl": "https://portal.example.com/api/kubernetes-graphql-gateway/root:platform-mesh/graphql"
  },
  "namespaceId": "default",
  "token": "eyJhbGciOiJSUzI1NiIs..."
}
```

### Custom Resource with UI Config

```json
{
  "resourceDefinition": {
    "group": "apis.kcp.io",
    "version": "v1alpha2",
    "kind": "APIBinding",
    "plural": "APIBindings",
    "singular": "apibinding",
    "scope": "Cluster"
  },
  "portalContext": {
    "crdGatewayApiUrl": "https://portal.example.com/api/kubernetes-graphql-gateway/root:workspaces:my-workspace/graphql"
  },
  "ui": {
    "title": "API Bindings",
    "showCreateButton": false,
    "showDeleteButton": false
  },
  "token": "eyJhbGciOiJSUzI1NiIs..."
}
```

### Read from Parent KCP Path

For entity resources that live in a parent workspace:

```json
{
  "resourceDefinition": {
    "group": "core.platform-mesh.io",
    "version": "v1alpha1",
    "kind": "AccountInfo",
    "plural": "AccountInfoes",
    "singular": "accountinfo",
    "scope": "Cluster",
    "readFromParentKcpPath": true
  },
  "portalContext": {
    "crdGatewayApiUrl": "https://portal.example.com/api/kubernetes-graphql-gateway/root:orgs:sap:workspaces:my-workspace/graphql"
  },
  "token": "eyJhbGciOiJSUzI1NiIs..."
}
```

## ContentConfiguration for Portal

Example ContentConfiguration CR for integrating with the portal:

```yaml
apiVersion: ui.platform-mesh.io/v1alpha1
kind: ContentConfiguration
metadata:
  labels:
    ui.platform-mesh.io/entity: core_platform-mesh_io_account
  name: workspace-accounts
spec:
  inlineConfiguration:
    content: |
      {
        "name": "accounts",
        "luigiConfigFragment": {
          "data": {
            "nodes": [
              {
                "pathSegment": "accounts",
                "navigationContext": "accounts",
                "label": "Accounts",
                "icon": "employee",
                "order": 100,
                "hideSideNav": false,
                "keepSelectedForChildren": true,
                "entityType": "workspaces.workspace",
                "loadingIndicator": { "enabled": false },
                "category": {
                  "id": "administration",
                  "isGroup": true,
                  "label": "Administration",
                  "order": 100
                },
                "url": "https://{context.organization}.portal.example.com/ui/generic-resource/#/",
                "context": {
                  "resourceDefinition": {
                    "group": "core.platform-mesh.io",
                    "version": "v1alpha1",
                    "kind": "Account",
                    "plural": "accounts",
                    "singular": "account",
                    "scope": "Cluster"
                  }
                },
                "children": [
                  {
                    "pathSegment": "create",
                    "hideFromNav": true,
                    "loadingIndicator": { "enabled": false },
                    "url": "https://{context.organization}.portal.example.com/ui/generic-resource/#/create",
                    "context": {
                      "resourceDefinition": {
                        "group": "core.platform-mesh.io",
                        "version": "v1alpha1",
                        "kind": "Account",
                        "plural": "accounts",
                        "singular": "account",
                        "scope": "Cluster"
                      }
                    }
                  },
                  {
                    "pathSegment": ":resourceId",
                    "hideFromNav": true,
                    "loadingIndicator": { "enabled": false },
                    "url": "https://{context.organization}.portal.example.com/ui/generic-resource/#/:resourceId",
                    "context": {
                      "resourceDefinition": {
                        "group": "core.platform-mesh.io",
                        "version": "v1alpha1",
                        "kind": "Account",
                        "plural": "accounts",
                        "singular": "account",
                        "scope": "Cluster"
                      }
                    }
                  }
                ]
              }
            ]
          }
        }
      }
    contentType: json
```

## URL Parameters

The UI supports the following URL query parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `namespace` | Override namespace from context | `?namespace=kube-system` |

## Fallback Configuration

If no Luigi context is received within 500ms, the UI falls back to loading configuration from `assets/config.json`.

### Local Development Config

Create `src/assets/config.json`:

```json
{
  "resourceDefinition": {
    "group": "",
    "version": "v1",
    "kind": "ConfigMap",
    "plural": "configmaps",
    "singular": "configmap",
    "scope": "Namespaced"
  },
  "portalContext": {
    "crdGatewayApiUrl": "https://localhost:4200/graphql"
  },
  "namespaceId": "default",
  "token": "your-dev-token"
}
```

## Environment-Specific Configs

The project includes several pre-configured config files:

| File | Description |
|------|-------------|
| `config.kind.json` | Kind cluster (localhost:8443) |
| `config.local.json` | Local development |
| `config.accountinfo.json` | AccountInfo resource |
| `config.configmaps.json` | ConfigMaps |
| `config.deployments.json` | Deployments |
| `config.namespaces.json` | Namespaces |
| `config.components.json` | Custom Component resources |

Copy the desired config to `config.json` for local development:

```bash
cp src/assets/config.kind.json src/assets/config.json
```

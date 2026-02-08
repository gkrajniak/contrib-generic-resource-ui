# Generic Resource UI - Concept Document

## Overview

The Generic Resource UI is an Angular microfrontend application that automatically generates list, detail, and create views for any Kubernetes resource. It leverages the Platform Mesh kubernetes-graphql-gateway and uses GraphQL introspection to discover resource schemas, then renders the best possible UI without requiring manual configuration.

## Problem Statement

Currently, viewing and managing Kubernetes resources in Platform Mesh requires:
1. Custom UIs for each resource type (marketplace-ui, iam-ui, etc.)
2. Detailed Content Configuration definitions with field-level specifications
3. Significant development effort to support new resource types

The generic resource UI addresses this by:
- Requiring only a minimal `resourceDefinition` (group, version, kind, plural, scope)
- Using GraphQL introspection to discover the resource schema
- Automatically generating optimal list/detail/create views based on the schema
- No manual field configuration needed

## Goals

1. **Zero Configuration Views** - Generate list, detail, and create views automatically from schema
2. **Schema-Driven** - Use GraphQL introspection to discover available fields and their types
3. **Smart Field Selection** - Intelligently select which fields to display in list vs detail views
4. **Required Field Detection** - Identify required fields for create forms
5. **Generic CRUD Operations** - List, view, create, update, and delete any resource
6. **Real-Time Updates** - Subscribe to resource changes via GraphQL subscriptions
7. **Luigi Context Integration** - Use Luigi context for `resourceDefinition` and portal context

## Non-Goals (MVP)

- Manual field configuration (`ui.listView`, `ui.detailView`, `ui.createView`)
- Custom uiSettings (secret masking, links, icons, etc.)
- Field grouping and CSS customization
- Dynamic values from GraphQL queries
- Resource discovery/browsing without configuration

---

## Research Summary

### 1. Platform Mesh / OpenMFP Architecture

Platform Mesh (OpenMFP) is an open multi-tenant platform framework built on:

- **Luigi Micro Frontend Framework** - For composing technology-agnostic micro frontends
- **Kubernetes/KCP** - For multi-cluster and multi-tenant resource management
- **GraphQL Gateway** - Exposing Kubernetes resources via GraphQL APIs

### 2. Luigi Micro Frontend Framework

Luigi passes context to micro frontends containing:
- Current workspace/cluster endpoint (`portalContext.crdGatewayApiUrl`)
- User authentication token
- Entity IDs (account, namespace, etc.)
- Custom context data (resourceDefinition)

### 3. Kubernetes GraphQL Gateway

The gateway generates GraphQL schemas from OpenAPI specs. Each resource type has:

**Operations:**
```graphql
# Query
list<Kind>(namespace, labelselector, limit, continue, sortBy)
get<Kind>(name, namespace)
get<Kind>AsYAML(name, namespace)

# Mutation
create<Kind>(namespace, object, dryRun)
update<Kind>(name, namespace, object, dryRun)
delete<Kind>(name, namespace, dryRun)

# Subscription
subscribe<Kind>(name, namespace, resourceVersion)
subscribe<Kind>s(namespace, labelselector, resourceVersion)
```

**Schema Features:**
- Types are generated from OpenAPI definitions
- Input types (`<Kind>Input`) define writable fields
- Required fields are marked as `NonNull` in GraphQL schema
- Nested objects have their own types

### 4. Headlamp Patterns

Headlamp provides useful patterns for generic resource handling:
- Standard columns: Name, Namespace, Age
- Status conditions display with icons
- Full resource YAML view
- Collapsible spec/status sections

---

## Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Luigi Portal                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Generic Resource UI (Angular)              │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────┐  │  │
│  │  │ Resource List View  │  │ Resource Detail View    │  │  │
│  │  └─────────────────────┘  └─────────────────────────┘  │  │
│  │              │                       │                  │  │
│  │              └───────────┬───────────┘                  │  │
│  │                          │                              │  │
│  │          ┌───────────────┼───────────────┐              │  │
│  │          ▼               ▼               ▼              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │  │
│  │  │ Context     │  │ Schema      │  │ Resource       │  │  │
│  │  │ Service     │  │ Service     │  │ Service        │  │  │
│  │  └─────────────┘  └─────────────┘  └────────────────┘  │  │
│  └──────────────────────────┼─────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────┘
                              │ GraphQL (HTTP/WebSocket)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              Kubernetes GraphQL Gateway                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ - Introspection for schema discovery                    │  │
│  │ - CRUD operations per resource type                     │  │
│  │ - Real-time subscriptions                               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Required Configuration

The only configuration needed is the basic `resourceDefinition` in Luigi context:

```json
{
  "resourceDefinition": {
    "group": "core.platform-mesh.io",
    "version": "v1alpha1",
    "plural": "accounts",
    "singular": "account",
    "kind": "Account",
    "scope": "Cluster"
  }
}
```

Everything else is discovered from the GraphQL schema.

### Component Architecture

#### 1. Context Service
Resolves configuration from Luigi context:
```typescript
class ContextService {
  getResourceDefinition(): ResourceDefinition;
  getPortalContext(): PortalContext;
  getEntityContext(): EntityContext;
}
```

#### 2. Schema Service
Discovers resource schema via GraphQL introspection:
```typescript
class SchemaService {
  // Introspect the GraphQL schema for a resource type
  discoverSchema(definition: ResourceDefinition): Observable<ResourceSchema>;

  // Get the output type (for queries)
  getOutputType(kind: string): Observable<GraphQLType>;

  // Get the input type (for mutations)
  getInputType(kind: string): Observable<GraphQLInputType>;

  // Analyze fields to categorize them
  analyzeFields(type: GraphQLType): FieldAnalysis;
}

interface ResourceSchema {
  outputType: GraphQLType;      // Type returned by queries
  inputType: GraphQLInputType;  // Type for create/update mutations
  listFields: FieldInfo[];      // Fields suitable for list view
  detailFields: FieldInfo[];    // All fields for detail view
  requiredFields: FieldInfo[];  // Required fields for create form
}

interface FieldInfo {
  name: string;
  path: string;                 // Dot-notation path (e.g., "metadata.name")
  type: string;                 // GraphQL type (String, Int, Boolean, Object, etc.)
  isRequired: boolean;
  isScalar: boolean;
  description?: string;
}
```

#### 3. Resource Service
CRUD operations:
```typescript
class ResourceService {
  list(definition: ResourceDefinition, options: ListOptions): Observable<ResourceList>;
  get(definition: ResourceDefinition, name: string, namespace?: string): Observable<Resource>;
  getAsYAML(definition: ResourceDefinition, name: string, namespace?: string): Observable<string>;
  create(definition: ResourceDefinition, resource: Resource, dryRun?: boolean): Observable<Resource>;
  update(definition: ResourceDefinition, name: string, resource: Resource, dryRun?: boolean): Observable<Resource>;
  delete(definition: ResourceDefinition, name: string, namespace?: string, dryRun?: boolean): Observable<boolean>;
  subscribe(definition: ResourceDefinition, options: SubscribeOptions): Observable<ResourceEvent>;
}
```

### State Management (NgRx)

```
state/
├── context/
│   ├── context.actions.ts
│   ├── context.effects.ts
│   ├── context.reducer.ts
│   └── context.selectors.ts
├── schema/
│   ├── schema.actions.ts      # Schema discovery
│   ├── schema.effects.ts      # Introspection queries
│   ├── schema.reducer.ts
│   └── schema.selectors.ts
├── resources/
│   ├── resources.actions.ts   # CRUD operations
│   ├── resources.effects.ts   # GraphQL operations
│   ├── resources.reducer.ts
│   └── resources.selectors.ts
└── ui/
    ├── ui.actions.ts          # Filters, pagination, modals
    ├── ui.reducer.ts
    └── ui.selectors.ts
```

---

## Schema-Driven View Generation

### GraphQL Introspection

Use introspection to discover the schema for a resource type:

```graphql
query IntrospectResourceType($typeName: String!) {
  __type(name: $typeName) {
    name
    kind
    fields {
      name
      description
      type {
        name
        kind
        ofType {
          name
          kind
        }
      }
    }
  }
}

query IntrospectInputType($typeName: String!) {
  __type(name: $typeName) {
    name
    inputFields {
      name
      description
      type {
        name
        kind
        ofType {
          name
          kind
        }
      }
      defaultValue
    }
  }
}
```

### Field Analysis & Categorization

Analyze the schema to categorize fields:

```typescript
interface FieldAnalysis {
  // Core metadata fields (always shown)
  coreFields: FieldInfo[];      // metadata.name, metadata.namespace, metadata.creationTimestamp

  // Scalar spec fields (good for list view)
  scalarSpecFields: FieldInfo[]; // spec.displayName, spec.type, etc.

  // Complex spec fields (detail view only)
  complexSpecFields: FieldInfo[]; // spec.config (objects), spec.items (arrays)

  // Status fields
  statusFields: FieldInfo[];     // status.phase, status.conditions, etc.

  // Required fields for create
  requiredFields: FieldInfo[];   // Fields marked as NonNull in input type
}

function analyzeFields(outputType: GraphQLType, inputType: GraphQLInputType): FieldAnalysis {
  const analysis: FieldAnalysis = {
    coreFields: [],
    scalarSpecFields: [],
    complexSpecFields: [],
    statusFields: [],
    requiredFields: [],
  };

  // Core metadata fields
  analysis.coreFields = [
    { name: 'name', path: 'metadata.name', type: 'String', isRequired: true, isScalar: true },
    { name: 'namespace', path: 'metadata.namespace', type: 'String', isRequired: false, isScalar: true },
    { name: 'creationTimestamp', path: 'metadata.creationTimestamp', type: 'String', isRequired: false, isScalar: true },
  ];

  // Analyze spec fields
  const specType = findField(outputType, 'spec');
  if (specType) {
    for (const field of specType.fields) {
      const fieldInfo = {
        name: field.name,
        path: `spec.${field.name}`,
        type: getTypeName(field.type),
        isRequired: isNonNull(field.type),
        isScalar: isScalarType(field.type),
      };

      if (fieldInfo.isScalar) {
        analysis.scalarSpecFields.push(fieldInfo);
      } else {
        analysis.complexSpecFields.push(fieldInfo);
      }
    }
  }

  // Analyze status fields
  const statusType = findField(outputType, 'status');
  if (statusType) {
    analysis.statusFields = extractFields(statusType, 'status');
  }

  // Find required fields from input type
  if (inputType) {
    analysis.requiredFields = inputType.inputFields
      .filter(f => isNonNull(f.type))
      .map(f => ({
        name: f.name,
        path: f.name,
        type: getTypeName(f.type),
        isRequired: true,
        isScalar: isScalarType(f.type),
      }));
  }

  return analysis;
}
```

### List View Generation

Select fields for list view based on analysis:

```typescript
function generateListColumns(analysis: FieldAnalysis, scope: KubernetesScope): ListColumn[] {
  const columns: ListColumn[] = [];

  // Always show name
  columns.push({
    label: 'Name',
    path: 'metadata.name',
    sortable: true,
  });

  // Show namespace for namespaced resources
  if (scope === 'Namespaced') {
    columns.push({
      label: 'Namespace',
      path: 'metadata.namespace',
      sortable: true,
    });
  }

  // Add up to 3 scalar spec fields (prioritize common names)
  const priorityFields = ['displayName', 'type', 'status', 'phase', 'state', 'description'];
  const sortedScalarFields = analysis.scalarSpecFields.sort((a, b) => {
    const aIndex = priorityFields.indexOf(a.name);
    const bIndex = priorityFields.indexOf(b.name);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  for (const field of sortedScalarFields.slice(0, 3)) {
    columns.push({
      label: humanize(field.name),
      path: field.path,
      sortable: field.type === 'String' || field.type === 'Int',
    });
  }

  // Always show age
  columns.push({
    label: 'Age',
    path: 'metadata.creationTimestamp',
    sortable: true,
    format: 'relativeTime',
  });

  return columns;
}
```

### Detail View Generation

Generate detail sections based on analysis:

```typescript
function generateDetailSections(analysis: FieldAnalysis): DetailSection[] {
  const sections: DetailSection[] = [];

  // Metadata section (always present)
  sections.push({
    title: 'Metadata',
    collapsed: false,
    fields: [
      { label: 'Name', path: 'metadata.name', copyable: true },
      { label: 'UID', path: 'metadata.uid', copyable: true },
      { label: 'Created', path: 'metadata.creationTimestamp', format: 'dateTime' },
      { label: 'Labels', path: 'metadata.labels', format: 'labels' },
      { label: 'Annotations', path: 'metadata.annotations', format: 'annotations' },
    ],
  });

  // Spec section - scalar fields first, then complex as YAML
  if (analysis.scalarSpecFields.length > 0 || analysis.complexSpecFields.length > 0) {
    const specFields: DetailField[] = [];

    // Scalar fields as key-value pairs
    for (const field of analysis.scalarSpecFields) {
      specFields.push({
        label: humanize(field.name),
        path: field.path,
        copyable: field.type === 'String',
      });
    }

    sections.push({
      title: 'Spec',
      collapsed: false,
      fields: specFields,
      // Complex fields rendered as collapsible YAML
      yamlFields: analysis.complexSpecFields.map(f => f.path),
    });
  }

  // Status section
  if (analysis.statusFields.length > 0) {
    // Check for conditions
    const hasConditions = analysis.statusFields.some(f => f.name === 'conditions');

    sections.push({
      title: 'Status',
      collapsed: false,
      fields: analysis.statusFields
        .filter(f => f.isScalar && f.name !== 'conditions')
        .map(f => ({
          label: humanize(f.name),
          path: f.path,
        })),
      // Conditions rendered specially
      showConditions: hasConditions,
      // Remaining complex status as YAML
      yamlFields: analysis.statusFields
        .filter(f => !f.isScalar && f.name !== 'conditions')
        .map(f => f.path),
    });
  }

  return sections;
}
```

### Create Form Generation

Generate create form based on required fields from input type:

```typescript
function generateCreateForm(analysis: FieldAnalysis, definition: ResourceDefinition): CreateForm {
  const fields: FormField[] = [];

  // Name is always required
  fields.push({
    name: 'metadata.name',
    label: 'Name',
    type: 'text',
    required: true,
    validation: {
      pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
      maxLength: 253,
    },
  });

  // Namespace for namespaced resources
  if (definition.scope === 'Namespaced') {
    fields.push({
      name: 'metadata.namespace',
      label: 'Namespace',
      type: 'text',
      required: true,
    });
  }

  // Add required spec fields
  for (const field of analysis.requiredFields) {
    if (field.path.startsWith('spec.') || field.path.startsWith('metadata.')) {
      continue; // Skip already added
    }

    fields.push({
      name: `spec.${field.name}`,
      label: humanize(field.name),
      type: mapGraphQLTypeToFormType(field.type),
      required: true,
    });
  }

  // Add commonly expected optional fields
  const commonOptionalFields = ['displayName', 'description', 'type'];
  for (const fieldName of commonOptionalFields) {
    const field = analysis.scalarSpecFields.find(f => f.name === fieldName);
    if (field && !fields.some(f => f.name === `spec.${fieldName}`)) {
      fields.push({
        name: `spec.${fieldName}`,
        label: humanize(fieldName),
        type: mapGraphQLTypeToFormType(field.type),
        required: false,
      });
    }
  }

  return {
    fields,
    // YAML editor for advanced configuration
    showYamlEditor: true,
    yamlTemplate: generateYamlTemplate(definition, fields),
  };
}

function mapGraphQLTypeToFormType(graphqlType: string): FormFieldType {
  switch (graphqlType) {
    case 'String': return 'text';
    case 'Int': return 'number';
    case 'Float': return 'number';
    case 'Boolean': return 'checkbox';
    default: return 'text';
  }
}

function generateYamlTemplate(definition: ResourceDefinition, fields: FormField[]): string {
  const apiVersion = definition.group
    ? `${definition.group}/${definition.version}`
    : definition.version;

  return `apiVersion: ${apiVersion}
kind: ${definition.kind}
metadata:
  name: ""
spec:
  # Add your spec fields here
`;
}
```

### Ready Status Detection

Auto-detect ready status from status fields:

```typescript
function detectReadyStatus(resource: Resource, analysis: FieldAnalysis): ReadyStatus {
  // Pattern 1: status.conditions with type=Ready
  if (resource.status?.conditions) {
    const readyCondition = resource.status.conditions.find(
      (c: any) => c.type === 'Ready' || c.type === 'Available'
    );
    if (readyCondition) {
      return {
        ready: readyCondition.status === 'True',
        reason: readyCondition.reason,
        message: readyCondition.message,
      };
    }
  }

  // Pattern 2: status.phase
  if (resource.status?.phase) {
    const readyPhases = ['Ready', 'Running', 'Active', 'Bound', 'Succeeded'];
    return {
      ready: readyPhases.includes(resource.status.phase),
      reason: resource.status.phase,
    };
  }

  // Pattern 3: status.ready boolean
  if (typeof resource.status?.ready === 'boolean') {
    return {
      ready: resource.status.ready,
    };
  }

  // Pattern 4: status.state
  if (resource.status?.state) {
    const readyStates = ['ready', 'active', 'running', 'available'];
    return {
      ready: readyStates.includes(resource.status.state.toLowerCase()),
      reason: resource.status.state,
    };
  }

  // Default: consider ready if resource exists
  return { ready: true };
}
```

---

## UI Design

The UI follows SAP Fiori design patterns using UI5 Web Components.

### Resource List View (Fiori List Report)

```
┌────────────────────────────────────────────────────────────────────┐
│ <ui5-bar design="Header">                                          │
│   <ui5-title slot="startContent">Accounts</ui5-title>              │
│   <ui5-button slot="endContent" icon="add">Create</ui5-button>     │
│   <ui5-button slot="endContent" icon="refresh"></ui5-button>       │
│ </ui5-bar>                                                         │
├────────────────────────────────────────────────────────────────────┤
│ <ui5-bar design="Subheader">                                       │
│   <ui5-select>Namespace: All</ui5-select>                          │
│   <ui5-input placeholder="Label selector..."></ui5-input>          │
│   <ui5-button icon="filter">Filter</ui5-button>                    │
│ </ui5-bar>                                                         │
├────────────────────────────────────────────────────────────────────┤
│ <ui5-table>                                                        │
│   ┌───────┬───────────────┬───────────────┬──────────┬──────────┐ │
│   │Status │ Name          │ Display Name  │ Type     │ Age      │ │
│   ├───────┼───────────────┼───────────────┼──────────┼──────────┤ │
│   │ ●     │ my-account    │ My Account    │ standard │ 2d       │ │
│   │ ●     │ dev-account   │ Development   │ trial    │ 5d       │ │
│   │ ○     │ test-account  │ Testing       │ trial    │ 1h       │ │
│   └───────┴───────────────┴───────────────┴──────────┴──────────┘ │
│ </ui5-table>                                                       │
├────────────────────────────────────────────────────────────────────┤
│ <ui5-bar design="Footer">                                          │
│   <ui5-label>Showing 1-20 of 45</ui5-label>                        │
│   <ui5-button icon="navigation-left-arrow"></ui5-button>           │
│   <ui5-button icon="navigation-right-arrow"></ui5-button>          │
│ </ui5-bar>                                                         │
└────────────────────────────────────────────────────────────────────┘
```

**UI5 Components:**
- `ui5-bar` - Header, subheader, footer bars
- `ui5-table` - Data table with sortable columns
- `ui5-object-status` - Ready/not ready indicators (●/○)
- `ui5-button` - Actions (Create, Refresh, Filter)
- `ui5-select` / `ui5-input` - Filters
- `ui5-menu` - Row actions (View, Edit, Delete, YAML)

### Resource Detail View (Fiori Object Page)

```
┌────────────────────────────────────────────────────────────────────┐
│ <ui5-bar design="Header">                                          │
│   <ui5-title slot="startContent">Account: my-account</ui5-title>   │
│   <ui5-button slot="endContent" icon="edit">Edit</ui5-button>      │
│   <ui5-button slot="endContent" icon="delete">Delete</ui5-button>  │
│   <ui5-button slot="endContent" icon="download">YAML</ui5-button>  │
│ </ui5-bar>                                                         │
├────────────────────────────────────────────────────────────────────┤
│ <ui5-object-status state="Success" icon="status-positive">         │
│   Ready - ResourceProvisioned                                      │
│ </ui5-object-status>                                               │
├────────────────────────────────────────────────────────────────────┤
│ <ui5-panel header-text="Metadata" collapsed="false">               │
│   <ui5-form>                                                       │
│     <ui5-form-item>                                                │
│       <ui5-label>Name</ui5-label>                                  │
│       <ui5-text>my-account</ui5-text>                              │
│       <ui5-button icon="copy" tooltip="Copy"></ui5-button>         │
│     </ui5-form-item>                                               │
│     <ui5-form-item>                                                │
│       <ui5-label>UID</ui5-label>                                   │
│       <ui5-text>abc-123-def-456</ui5-text>                         │
│       <ui5-button icon="copy"></ui5-button>                        │
│     </ui5-form-item>                                               │
│     <ui5-form-item>                                                │
│       <ui5-label>Created</ui5-label>                               │
│       <ui5-text>Jan 15, 2024, 10:30 AM</ui5-text>                  │
│     </ui5-form-item>                                               │
│     <ui5-form-item>                                                │
│       <ui5-label>Labels</ui5-label>                                │
│       <ui5-badge>app=frontend</ui5-badge>                          │
│       <ui5-badge>tier=web</ui5-badge>                              │
│     </ui5-form-item>                                               │
│   </ui5-form>                                                      │
│ </ui5-panel>                                                       │
├────────────────────────────────────────────────────────────────────┤
│ <ui5-panel header-text="Spec" collapsed="false">                   │
│   <ui5-form>                                                       │
│     <ui5-form-item>                                                │
│       <ui5-label>displayName</ui5-label>                           │
│       <ui5-text>My Account</ui5-text>                              │
│     </ui5-form-item>                                               │
│     <ui5-form-item>                                                │
│       <ui5-label>type</ui5-label>                                  │
│       <ui5-text>standard</ui5-text>                                │
│     </ui5-form-item>                                               │
│   </ui5-form>                                                      │
│   <!-- Complex fields as collapsible YAML -->                      │
│   <ui5-panel header-text="config" collapsed="true">                │
│     <pre>region: us-east-1\ntier: premium</pre>                    │
│   </ui5-panel>                                                     │
│ </ui5-panel>                                                       │
├────────────────────────────────────────────────────────────────────┤
│ <ui5-panel header-text="Status" collapsed="false">                 │
│   <ui5-table>  <!-- Conditions table -->                           │
│     <ui5-table-column>Type</ui5-table-column>                      │
│     <ui5-table-column>Status</ui5-table-column>                    │
│     <ui5-table-column>Reason</ui5-table-column>                    │
│     <ui5-table-column>Age</ui5-table-column>                       │
│     <ui5-table-row>                                                │
│       <ui5-table-cell>Ready</ui5-table-cell>                       │
│       <ui5-table-cell><ui5-icon name="status-positive"/></ui5-table-cell>│
│       <ui5-table-cell>ResourceProvisioned</ui5-table-cell>         │
│       <ui5-table-cell>2d</ui5-table-cell>                          │
│     </ui5-table-row>                                               │
│   </ui5-table>                                                     │
│ </ui5-panel>                                                       │
└────────────────────────────────────────────────────────────────────┘
```

**UI5 Components:**
- `ui5-panel` - Collapsible sections (Metadata, Spec, Status)
- `ui5-form` / `ui5-form-item` - Key-value field display
- `ui5-object-status` - Ready status banner
- `ui5-badge` - Labels and tags
- `ui5-table` - Conditions display
- `ui5-icon` - Status icons (status-positive, status-negative)

### Create/Edit View (Fiori Dialog)

```
┌────────────────────────────────────────────────────────────────────┐
│ <ui5-dialog header-text="Create Account" open>                     │
├────────────────────────────────────────────────────────────────────┤
│ <ui5-panel header-text="Required Fields">                          │
│   <ui5-form>                                                       │
│     <ui5-form-item>                                                │
│       <ui5-label required>Name</ui5-label>                         │
│       <ui5-input value="my-new-account"                            │
│                  placeholder="Resource name"                       │
│                  value-state="None">                               │
│       </ui5-input>                                                 │
│     </ui5-form-item>                                               │
│   </ui5-form>                                                      │
│ </ui5-panel>                                                       │
│                                                                    │
│ <ui5-panel header-text="Optional Fields">                          │
│   <ui5-form>                                                       │
│     <ui5-form-item>                                                │
│       <ui5-label>Display Name</ui5-label>                          │
│       <ui5-input placeholder="Human-readable name"></ui5-input>    │
│     </ui5-form-item>                                               │
│     <ui5-form-item>                                                │
│       <ui5-label>Description</ui5-label>                           │
│       <ui5-textarea placeholder="Description..."></ui5-textarea>   │
│     </ui5-form-item>                                               │
│   </ui5-form>                                                      │
│ </ui5-panel>                                                       │
│                                                                    │
│ <ui5-panel header-text="Advanced (YAML)" collapsed="true">         │
│   <!-- Monaco Editor embedded -->                                  │
│   <monaco-editor language="yaml">                                  │
│     apiVersion: core.platform-mesh.io/v1alpha1                     │
│     kind: Account                                                  │
│     metadata:                                                      │
│       name: my-new-account                                         │
│     spec:                                                          │
│       displayName: ""                                              │
│   </monaco-editor>                                                 │
│ </ui5-panel>                                                       │
│                                                                    │
│ <ui5-checkbox text="Dry Run (validate without saving)">            │
│ </ui5-checkbox>                                                    │
├────────────────────────────────────────────────────────────────────┤
│ <ui5-bar slot="footer" design="Footer">                            │
│   <ui5-button slot="endContent" design="Transparent">Cancel        │
│   </ui5-button>                                                    │
│   <ui5-button slot="endContent" design="Emphasized">Create         │
│   </ui5-button>                                                    │
│ </ui5-bar>                                                         │
└────────────────────────────────────────────────────────────────────┘
```

**UI5 Components:**
- `ui5-dialog` - Modal dialog container
- `ui5-panel` - Collapsible form sections
- `ui5-form` / `ui5-form-item` - Form layout
- `ui5-input` - Text inputs with validation states
- `ui5-textarea` - Multi-line text
- `ui5-checkbox` - Dry run option
- `ui5-button` - Cancel (Transparent) and Create (Emphasized)

### YAML Slide-Out Panel

The detail view includes a slide-out side panel to view and edit the raw YAML representation of the resource.

```
┌─────────────────────────────────────────┬──────────────────────────────┐
│ Detail View (Main Content)              │ <ui5-side-content>           │
│                                         │                              │
│ <ui5-bar>                               │ <ui5-bar design="Header">    │
│   Account: my-account  [YAML →]         │   Raw YAML     [← Close]     │
│ </ui5-bar>                              │ </ui5-bar>                   │
│                                         │                              │
│ <ui5-panel header-text="Metadata">      │ <monaco-editor readonly>     │
│   Name: my-account                      │ apiVersion: core...          │
│   UID: abc-123-def-456                  │ kind: Account                │
│   ...                                   │ metadata:                    │
│ </ui5-panel>                            │   name: my-account           │
│                                         │   uid: abc-123-def-456       │
│ <ui5-panel header-text="Spec">          │   creationTimestamp: ...     │
│   displayName: My Account               │   labels:                    │
│   type: standard                        │     app: frontend            │
│   ...                                   │ spec:                        │
│ </ui5-panel>                            │   displayName: My Account    │
│                                         │   type: standard             │
│ <ui5-panel header-text="Status">        │   config:                    │
│   Conditions:                           │     region: us-east-1        │
│   ✓ Ready - True                        │ status:                      │
│   ...                                   │   conditions:                │
│ </ui5-panel>                            │     - type: Ready            │
│                                         │       status: "True"         │
│                                         │ </monaco-editor>             │
│                                         │                              │
│                                         │ <ui5-bar design="Footer">    │
│                                         │   [Copy] [Download]          │
│                                         │ </ui5-bar>                   │
└─────────────────────────────────────────┴──────────────────────────────┘
```

**Implementation:**

```typescript
// Component template
<ui5-dynamic-side-content>
  <!-- Main content -->
  <div slot="main">
    <app-resource-detail-content [resource]="resource"></app-resource-detail-content>
  </div>

  <!-- Side panel with YAML -->
  <div slot="side" *ngIf="showYamlPanel">
    <ui5-bar design="Header">
      <ui5-title slot="startContent">Raw YAML</ui5-title>
      <ui5-button slot="endContent" icon="decline"
                  (click)="toggleYamlPanel()">
      </ui5-button>
    </ui5-bar>

    <monaco-editor
      [value]="resourceYaml"
      language="yaml"
      [options]="{ readOnly: true, minimap: { enabled: false } }">
    </monaco-editor>

    <ui5-bar design="Footer">
      <ui5-button slot="endContent" icon="copy" (click)="copyYaml()">
        Copy
      </ui5-button>
      <ui5-button slot="endContent" icon="download" (click)="downloadYaml()">
        Download
      </ui5-button>
    </ui5-bar>
  </div>
</ui5-dynamic-side-content>

// Toggle button in detail header
<ui5-button icon="syntax" (click)="toggleYamlPanel()">
  {{ showYamlPanel ? 'Hide YAML' : 'Show YAML' }}
</ui5-button>
```

**Features:**
- Slide-out panel using `ui5-dynamic-side-content`
- Monaco editor with YAML syntax highlighting (read-only in view mode)
- Copy to clipboard button
- Download as `.yaml` file
- Toggle button in header bar
- Responsive: panel overlays on mobile, side-by-side on desktop

### Feedback Components

```typescript
// Success toast
<ui5-toast>Account created successfully</ui5-toast>

// Error message strip
<ui5-message-strip design="Negative">
  Failed to create resource: name already exists
</ui5-message-strip>

// Loading indicator
<ui5-busy-indicator active size="Medium">
  Loading resources...
</ui5-busy-indicator>

// Delete confirmation
<ui5-dialog header-text="Delete Account">
  <ui5-message-strip design="Warning">
    Are you sure you want to delete "my-account"? This action cannot be undone.
  </ui5-message-strip>
  <ui5-bar slot="footer">
    <ui5-button design="Transparent">Cancel</ui5-button>
    <ui5-button design="Negative">Delete</ui5-button>
  </ui5-bar>
</ui5-dialog>
```

**Auto-Generated Features:**
- Required fields section (from schema NonNull types)
- Optional fields section (common fields like displayName, description)
- Collapsible YAML editor for full control
- Dry-run validation option
- Form syncs with YAML editor bidirectionally
- Fiori-style validation states and feedback
- YAML slide-out panel for raw resource view

---

## Luigi Integration

### Web Component Registration

```typescript
const listViewElement = createCustomElement(GenericListViewComponent, { injector });
customElements.define('generic-resource-list-view', listViewElement);

const detailViewElement = createCustomElement(GenericDetailViewComponent, { injector });
customElements.define('generic-resource-detail-view', detailViewElement);
```

### Minimal Content Configuration

```json
{
  "name": "accounts",
  "luigiConfigFragment": {
    "data": {
      "nodes": [
        {
          "pathSegment": "accounts",
          "navigationContext": "accounts",
          "label": "Accounts",
          "url": "/assets/generic-resource-ui.js#generic-resource-list-view",
          "webcomponent": { "selfRegistered": true },
          "context": {
            "resourceDefinition": {
              "group": "core.platform-mesh.io",
              "version": "v1alpha1",
              "plural": "accounts",
              "singular": "account",
              "kind": "Account",
              "scope": "Cluster"
            }
          },
          "children": [
            {
              "pathSegment": ":resourceId",
              "hideFromNav": true,
              "url": "/assets/generic-resource-ui.js#generic-resource-detail-view",
              "webcomponent": { "selfRegistered": true },
              "context": {
                "resourceId": ":resourceId"
              }
            }
          ]
        }
      ]
    }
  }
}
```

### Context Data Flow

```
Luigi Node Context
    │
    ├─ portalContext.crdGatewayApiUrl  → GraphQL endpoint
    ├─ portalContext.kcpWorkspaceUrl   → Workspace path
    ├─ token                           → Bearer token
    ├─ namespaceId                     → Current namespace (if applicable)
    │
    └─ resourceDefinition (required)
        ├─ group       (optional for core resources)
        ├─ version     (required)
        ├─ kind        (required)
        ├─ plural      (required)
        ├─ singular    (required)
        └─ scope       (required: 'Cluster' | 'Namespaced')
```

---

## Development Phases

### Phase 1: Core Framework (MVP)
- [ ] Project setup (Angular 19, NgRx, Apollo Client, Luigi Client)
- [ ] Context service with Luigi integration
- [ ] Schema service with GraphQL introspection
- [ ] Field analysis and categorization
- [ ] Resource service (list, get, getAsYAML)

### Phase 2: List View
- [ ] Auto-generated columns from schema
- [ ] Ready status auto-detection
- [ ] Server-side pagination
- [ ] Namespace filter (for namespaced resources)
- [ ] Label selector filter
- [ ] Real-time subscriptions (ADDED/MODIFIED/DELETED)

### Phase 3: Detail View
- [ ] Auto-generated sections (Metadata, Spec, Status)
- [ ] Scalar fields as key-value pairs
- [ ] Complex fields as collapsible YAML
- [ ] Conditions table with icons
- [ ] Copy buttons
- [ ] YAML slide-out panel (ui5-dynamic-side-content)
- [ ] Copy/Download YAML actions

### Phase 4: Create/Edit
- [ ] Auto-generated form from required fields
- [ ] Optional fields section
- [ ] YAML editor with syntax highlighting
- [ ] Form ↔ YAML bidirectional sync
- [ ] Dry-run validation
- [ ] Create mutation
- [ ] Update mutation

### Phase 5: Polish
- [ ] Delete with confirmation modal
- [ ] Error handling and display
- [ ] Loading states
- [ ] Fundamental NGX styling
- [ ] Luigi web component packaging

---

## Design System & Styling

### SAP Fiori Design System

The UI follows the [SAP Fiori Design System](https://www.sap.com/design-system/fiori-design-web/) guidelines:

- **Consistent Visual Language** - Fiori design principles for enterprise applications
- **Responsive Layout** - Adapts to different screen sizes
- **Accessibility** - WCAG 2.1 compliant components
- **Theming** - Support for Fiori themes (Horizon, Quartz)

### Fundamental NGX

Implementation uses [Fundamental NGX](https://sap.github.io/fundamental-ngx/) - the Angular implementation of SAP Fiori design system:

```bash
npm install @fundamental-ngx/core @fundamental-ngx/platform @fundamental-ngx/i18n
npm install @sap-theming/theming-base-content @sap-ui5/webcomponents-theming
```

**Why Fundamental NGX:**
- Native Angular components with proper data binding
- Built-in form integration with Angular Reactive Forms
- Type-safe APIs with full TypeScript support
- Easier testing with Angular testing utilities
- Consistent with other platform-mesh UIs (marketplace-ui, iam-ui, portal)

**Key Components Used:**

| View | Fundamental NGX Components |
|------|----------------------------|
| List View | `fd-table`, `fd-toolbar`, `fd-button`, `fd-input`, `fd-select`, `fd-object-status`, `fd-pagination` |
| Detail View | `fd-panel`, `fd-form`, `fd-form-item`, `fd-object-status`, `fd-toolbar`, `fd-dynamic-side-content` |
| Create/Edit | `fd-dialog`, `fd-form`, `fd-form-item`, `fd-input`, `fd-textarea`, `fd-checkbox`, `fd-button` |
| Common | `fd-toolbar`, `fd-title`, `fd-busy-indicator`, `fd-message-strip`, `fd-message-toast` |

**Angular Module Setup:**

```typescript
// app.config.ts
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideFundamentalNgx } from '@fundamental-ngx/core/config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideFundamentalNgx({
      theme: 'sap_horizon',
    }),
  ],
};
```

**Component Import Example:**

```typescript
// In standalone components
import { TableModule } from '@fundamental-ngx/core/table';
import { ToolbarModule } from '@fundamental-ngx/core/toolbar';
import { ButtonModule } from '@fundamental-ngx/core/button';
import { PanelModule } from '@fundamental-ngx/core/panel';
import { FormModule } from '@fundamental-ngx/core/form';
import { DialogModule } from '@fundamental-ngx/core/dialog';

@Component({
  standalone: true,
  imports: [
    TableModule,
    ToolbarModule,
    ButtonModule,
    PanelModule,
    FormModule,
    DialogModule,
  ],
})
export class ResourceListComponent {}
```

---

## Dependencies

### Required
- Angular 19+
- Apollo Angular (GraphQL client)
- NgRx (state management)
- @fundamental-ngx/core (Fiori UI components)
- @fundamental-ngx/platform (advanced components)
- @luigi-project/client (microfrontend integration)
- yaml (YAML parsing/formatting)
- ngx-monaco-editor-v2 (YAML editor)

---

## Open Questions

1. **Schema Caching**: Should we cache introspection results per resource type?
2. **Field Priority**: What heuristics should we use to prioritize which spec fields to show in list view?
3. **Edit Mode**: Should edit use a form or just YAML editor?
4. **Events**: Should detail view show Kubernetes events related to the resource?

---

## References

- [Kubernetes GraphQL Gateway](../kubernetes-graphql-gateway/CLAUDE.local.md)
- [Portal UI Library Generic UI](https://github.com/platform-mesh/portal-ui-lib/blob/main/docs/readme-generic-ui.md)
- [Headlamp](https://github.com/kubernetes-sigs/headlamp)
- [OpenMFP Documentation](https://openmfp.org)
- [Luigi Project](https://luigi-project.io)
- [Fundamental NGX](https://sap.github.io/fundamental-ngx/)

# Architecture

Overview of the Generic Resource UI architecture, including components and state management.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Portal (Luigi)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Generic Resource UI (Microfrontend)           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │  │
│  │  │  List View  │  │ Detail View │  │  Create/Edit    │    │  │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘    │  │
│  │         │                │                   │             │  │
│  │  ┌──────┴────────────────┴───────────────────┴──────┐      │  │
│  │  │              NgRx Store (State Management)        │      │  │
│  │  │  ┌─────────┐ ┌────────┐ ┌───────────┐ ┌────────┐ │      │  │
│  │  │  │ Context │ │ Schema │ │ Resources │ │   UI   │ │      │  │
│  │  │  └─────────┘ └────────┘ └───────────┘ └────────┘ │      │  │
│  │  └──────────────────────┬────────────────────────────┘      │  │
│  │                         │                                   │  │
│  │  ┌──────────────────────┴────────────────────────────┐      │  │
│  │  │                    Services                        │      │  │
│  │  │  Context │ Schema │ Resource │ Field Analyzer      │      │  │
│  │  └──────────────────────┬────────────────────────────┘      │  │
│  └─────────────────────────┼─────────────────────────────────┘  │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │  GraphQL Gateway │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │   Kubernetes    │
                    └─────────────────┘
```

## Component Architecture

### Container Components (Smart)

These components connect to the NgRx store and orchestrate views:

| Component | Purpose |
|-----------|---------|
| `ResourceListViewComponent` | List page with table and filters |
| `ResourceDetailViewComponent` | Detail page with sections |
| `CreateResourcePageComponent` | Standalone create page |

### Feature Components (UI)

UI components that receive data via inputs:

| Component | Purpose |
|-----------|---------|
| `ResourceTableComponent` | Renders list table with columns |
| `ListFiltersComponent` | Namespace/label selector filters |
| `SpecSectionComponent` | Displays spec fields |
| `StatusSectionComponent` | Displays status with conditions |
| `DataSectionComponent` | Displays root-level fields (ConfigMap data) |
| `YamlPanelComponent` | Monaco editor YAML display |

### Modal Components

Dialog components for user interactions:

| Component | Purpose |
|-----------|---------|
| `CreateEditModalComponent` | Form/YAML editor for create/edit |
| `DeleteConfirmationModalComponent` | Confirm deletion dialog |

### Shared Components

Reusable display components:

| Component | Purpose |
|-----------|---------|
| `ReadyStatusBadgeComponent` | Visual ready status indicator |
| `ValueCellComponent` | Value formatting (URLs, paths, etc.) |
| `LabelsDisplayComponent` | Renders labels as badges |
| `CopyButtonComponent` | One-click copy to clipboard |
| `NestedObjectSectionComponent` | Collapsible nested objects |
| `NestedObjectCardComponent` | Card-based nested display |
| `MonacoYamlViewerComponent` | Monaco YAML syntax highlighting |

### Component Hierarchy

```
AppComponent
├── RouterOutlet
│   ├── ResourceListViewComponent
│   │   ├── ListFiltersComponent
│   │   └── ResourceTableComponent
│   │       └── ReadyStatusBadgeComponent
│   │
│   ├── ResourceDetailViewComponent
│   │   ├── DataSectionComponent
│   │   │   └── NestedObjectSectionComponent
│   │   ├── SpecSectionComponent
│   │   │   ├── ValueCellComponent
│   │   │   └── NestedObjectCardComponent
│   │   ├── StatusSectionComponent
│   │   │   └── (Conditions table)
│   │   └── YamlPanelComponent
│   │       └── MonacoYamlViewerComponent
│   │
│   └── CreateResourcePageComponent
│       └── CreateEditModalComponent
│
└── DeleteConfirmationModalComponent
```

## State Management (NgRx)

### State Tree Structure

```typescript
interface AppState {
  context: ContextState;      // Luigi context & config
  schema: SchemaState;        // GraphQL introspection results
  resources: ResourcesState;  // Resource list & detail data
  ui: UiState;                // UI state (filters, modals)
}
```

### Context State

```typescript
interface ContextState {
  context: ResourceNodeContext | null;
  isInitialized: boolean;
  originalGatewayUrl: string | null;
}
```

**Actions:**
- `contextInitialized` - Initial Luigi context received
- `contextUpdated` - Context updated
- `setNamespace` - Update current namespace

### Schema State

```typescript
interface SchemaState {
  resourceType: IntrospectionType | null;
  inputType: IntrospectionType | null;
  fieldAnalysis: FieldAnalysis | null;
  loading: boolean;
  error: string | null;
}
```

**Actions:**
- `loadSchema` - Trigger schema introspection
- `loadSchemaSuccess` - Schema loaded
- `loadSchemaFailure` - Schema load failed
- `clearSchema` - Reset schema state

**Effects:**
- Introspects resource type and input type
- Enriches with nested type schemas
- Analyzes fields for view generation
- Triggers resource loading on success

### Resources State

```typescript
interface ResourcesState {
  resources: Resource[];
  selectedResource: Resource | null;
  selectedResourceName: string | null;
  loading: boolean;
  detailLoading: boolean;
  saving: boolean;
  deleting: boolean;
  error: string | null;
}
```

**Actions:**
- `loadResources` - Fetch resource list
- `loadResourcesSuccess` - List loaded
- `loadResourceDetail` - Fetch single resource
- `loadResourceDetailSuccess` - Detail loaded
- `resourcesUpdated` - Real-time subscription update
- `resourceDetailUpdated` - Detail subscription update
- `createResource` / `createResourceSuccess` - Create
- `updateResource` / `updateResourceSuccess` - Update
- `deleteResource` / `deleteResourceSuccess` - Delete
- `applyYaml` - Apply raw YAML

### UI State

```typescript
interface UiState {
  modalOpen: boolean;
  modalMode: 'create' | 'edit';
  editingResourceName: string | null;
  searchTerm: string;
  yamlPanelOpen: boolean;
  deleteConfirmationOpen: boolean;
  resourceToDelete: string | null;
}
```

**Actions:**
- `openModal` / `closeModal` - Modal visibility
- `openDeleteConfirmation` / `closeDeleteConfirmation` - Delete dialog
- `toggleYamlPanel` - YAML panel visibility
- `setSearchTerm` - Search filter update

### Data Flow Example

```
1. User navigates to list view
   ↓
2. ContextService receives Luigi context
   ↓
3. contextInitialized action dispatched
   ↓
4. Context effect triggers loadSchema
   ↓
5. Schema introspection completes
   ↓
6. loadSchemaSuccess triggers loadResources
   ↓
7. Resources fetched with subscription
   ↓
8. loadResourcesSuccess updates store
   ↓
9. Component selects resources from store
   ↓
10. Table renders with auto-generated columns
```

### Selectors

```typescript
// Context selectors
selectContext
selectResourceDefinition
selectIsContextInitialized
selectNamespaceId

// Schema selectors
selectFieldAnalysis
selectSchemaLoading
selectResourceType

// Resource selectors
selectResources
selectSelectedResource
selectResourcesLoading
selectDetailLoading

// UI selectors
selectSearchTerm
selectYamlPanelOpen
selectModalOpen
selectModalMode
```

## Services Architecture

### Core Services

| Service | Responsibility |
|---------|----------------|
| `ContextService` | Luigi context, config loading, namespace resolution |
| `SchemaService` | GraphQL schema introspection |
| `GenericResourceService` | CRUD operations via GraphQL |
| `FieldAnalyzerService` | Field categorization and analysis |

### View Generation Services

| Service | Responsibility |
|---------|----------------|
| `ReadyStatusDetectorService` | Detect ready status from resource |
| `ListColumnGeneratorService` | Generate columns for list view |
| `DetailSectionGeneratorService` | Generate sections for detail view |
| `FormFieldGeneratorService` | Generate form fields from schema |
| `YamlTemplateGeneratorService` | Generate YAML templates |

### Integration Services

| Service | Responsibility |
|---------|----------------|
| `LuigiClientService` | Luigi navigation and dialogs |
| `ConfigService` | Fallback config loading |
| `ApolloFactory` | Apollo client creation |

## Angular Patterns

### Standalone Components

All components are standalone (no NgModules):

```typescript
@Component({
  selector: 'app-resource-list',
  standalone: true,
  imports: [CommonModule, ...],
  template: `...`
})
export class ResourceListViewComponent {}
```

### Signal-Based Reactivity

Using Angular signals for reactive state:

```typescript
// Convert observable to signal
protected readonly resources = toSignal(
  this.store.select(selectResources)
);

// Computed values
protected readonly filteredResources = computed(() => {
  const all = this.resources() ?? [];
  const term = this.searchTerm();
  return all.filter(r => r.metadata.name.includes(term));
});
```

### OnPush Change Detection

All components use OnPush for performance:

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  ...
})
```

### New Control Flow

Using Angular 17+ control flow syntax:

```html
@if (loading()) {
  <fd-busy-indicator [loading]="true"></fd-busy-indicator>
} @else {
  @for (resource of resources(); track resource.metadata.uid) {
    <tr>...</tr>
  }
}
```

## File Structure

```
src/app/
├── components/
│   ├── resource-list-view/
│   │   ├── resource-list-view.component.ts
│   │   ├── resource-table/
│   │   └── list-filters/
│   ├── resource-detail-view/
│   │   ├── resource-detail-view.component.ts
│   │   ├── spec-section/
│   │   ├── status-section/
│   │   ├── data-section/
│   │   └── yaml-panel/
│   ├── create-resource-page/
│   └── shared/
│       ├── ready-status-badge/
│       ├── value-cell/
│       ├── labels-display/
│       ├── copy-button/
│       ├── nested-object-section/
│       └── monaco-yaml-viewer/
├── models/
│   ├── resource.ts
│   ├── resource-definition.ts
│   ├── field-info.ts
│   └── introspection.ts
├── services/
│   ├── context/
│   ├── schema/
│   ├── resource/
│   ├── view-generator/
│   └── luigi/
├── state/
│   ├── context/
│   ├── schema/
│   ├── resources/
│   └── ui/
└── utils/
    ├── humanize.ts
    ├── yaml.ts
    └── validators.ts
```

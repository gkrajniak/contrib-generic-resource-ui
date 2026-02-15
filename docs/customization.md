# Customization

Guide to customizing the Generic Resource UI behavior and appearance.

## UI Configuration Options

Pass UI configuration via Luigi context:

```json
{
  "ui": {
    "title": "My Custom Title",
    "showCreateButton": true,
    "showDeleteButton": true,
    "showEditButton": true,
    "showYamlPanel": true,
    "defaultPageSize": 20
  }
}
```

### Available Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | Resource kind | Custom page title |
| `showCreateButton` | boolean | true | Show/hide create button |
| `showDeleteButton` | boolean | true | Show/hide delete button |
| `showEditButton` | boolean | true | Show/hide edit button |
| `showYamlPanel` | boolean | true | Show/hide YAML panel toggle |
| `defaultPageSize` | number | 10 | Rows per page in list view |

### Example: Read-Only View

```json
{
  "ui": {
    "showCreateButton": false,
    "showEditButton": false,
    "showDeleteButton": false
  }
}
```

### Example: Custom Title

```json
{
  "ui": {
    "title": "Platform Accounts"
  }
}
```

## Ready Status Detection

The UI automatically detects resource ready status from multiple patterns.

### Supported Patterns

1. **Conditions Pattern**
   ```yaml
   status:
     conditions:
       - type: Ready
         status: "True"
   ```

2. **Phase Pattern**
   ```yaml
   status:
     phase: Running
   ```

3. **Ready Field Pattern**
   ```yaml
   status:
     ready: true
   ```

4. **State Pattern**
   ```yaml
   status:
     state: active
   ```

### Ready Status Values

| Category | Values |
|----------|--------|
| Ready (Green) | ready, active, running, succeeded, healthy, available, bound, complete, completed, true |
| Not Ready (Red) | failed, error, terminated, unhealthy, unavailable, false, crashloopbackoff, imagepullbackoff |
| In Progress (Yellow) | pending, waiting, terminating, unknown, warning, degraded |
| Informative (Blue) | creating, updating, provisioning, scaling, initializing |

## List View Column Priority

The UI automatically selects columns based on field priority.

### Spec Field Priority

Fields are prioritized in this order:
1. `displayName`
2. `type`
3. `status`
4. `phase`
5. `state`
6. `description`
7. `provider`
8. `version`

Up to 5 spec fields are shown in the list view.

### Status Field Priority

Up to 3 status fields are shown, plus conditions if available.

## Nested Object Icons

Icons are auto-mapped based on field names:

| Field Pattern | Icon |
|---------------|------|
| account, user | employee |
| organization, org | org-chart |
| cluster | it-host |
| namespace, ns | folder |
| spec, config | settings |
| status | status-in-process |
| conditions | process |
| reference, ref | chain-link |
| binding | connected |
| export | upload |
| permission | permission |
| security, auth | locked |
| network, endpoint | cloud |
| storage, volume | database |
| secret | key |
| certificate, cert | shield |
| webhook | notification-2 |
| default | detail-view |

## Field Display Formatting

### URL Detection

Fields containing URLs are automatically:
- Made clickable with chain-link icon
- Truncated with "Show full URL" expansion
- Copyable via copy button

### Path Detection

Fields named `path` or ending with `path` are:
- Formatted as breadcrumbs (colons/slashes → arrows)
- Copyable via copy button

### Long Value Handling

Values over 60 characters or containing newlines:
- Displayed as expandable details
- Click to expand full content
- Special handling for certificates and JSON

### Copyable Fields

Fields matching these patterns get copy buttons:
- Contains `id`, `uid`, `uuid`
- Named `name`, `clusterId`

## Empty Field Handling

### Default Behavior

Empty nested objects are hidden by default:
- Objects with only null/undefined values
- Objects with empty nested children
- Empty arrays

### Show Hidden Fields

Click "Show X hidden empty fields" in section headers to reveal:
- Empty optional nested objects
- Fields with null values
- Preserves structure for reference

## Form Field Generation

### Required Fields

Fields are marked required based on GraphQL schema:
- `NonNull` types become required
- `name` is always required
- `namespace` required for namespaced resources

### Optional Fields Auto-Included

These fields are automatically added if present in schema:
- `displayName`
- `description`
- `type`

### Form vs YAML Mode

Users can toggle between:
- **Form Mode**: Structured input fields
- **YAML Mode**: Raw YAML editor with syntax highlighting

Changes sync bidirectionally between modes.

## YAML Templates

### Auto-Generated Template

When creating resources, a YAML template is generated:

```yaml
apiVersion: example.com/v1
kind: MyResource
metadata:
  name: ""
  # namespace: default  # For namespaced resources
spec:
  # Required fields listed here
  requiredField: ""
```

### Template Customization

The template includes:
- apiVersion and kind from resourceDefinition
- metadata.name (required)
- metadata.namespace (if namespaced)
- All required spec fields
- Comments for optional common fields

## Theming

The UI uses SAP Fundamental NGX components with SAP Horizon theme.

### CSS Variables

Key CSS variables for customization:

```css
/* Colors */
--sapTextColor
--sapContent_LabelColor
--sapLinkColor
--sapPositiveColor
--sapNegativeColor
--sapWarningColor
--sapInformativeColor

/* Backgrounds */
--sapBackgroundColor
--sapGroup_ContentBackground
--sapList_Hover_Background

/* Borders */
--sapGroup_TitleBorderColor
--sapGroup_ContentBorderColor

/* Typography */
--sapFontFamily
--sapFontMonospacedFamily
```

### Component Styling

Components use scoped styles with `:host` selector:

```css
:host {
  display: block;
}

.custom-class {
  color: var(--sapTextColor);
}
```

## Namespace Handling

### Priority Order

Namespace is resolved in this order:
1. URL query parameter (`?namespace=kube-system`)
2. Luigi context `namespaceId`
3. Config file `namespaceId`

### URL Override

Override namespace via URL:
```
https://portal.example.com/ui/generic-resource/#/?namespace=kube-system
```

## KCP Workspace Support

### Read from Parent Workspace

For entity resources in parent workspaces:

```json
{
  "resourceDefinition": {
    "readFromParentKcpPath": true
  }
}
```

This strips the last KCP path segment when querying:
- `root:orgs:sap:workspaces:my-workspace` → `root:orgs:sap`

### Use Case

AccountInfo and similar resources that:
- Are created at organization level
- Need to be viewed from child workspaces
- Reference the parent workspace's data

## Extending the UI

### Adding Custom Components

1. Create component in `src/app/components/shared/`
2. Use standalone component pattern
3. Import in parent component
4. Follow OnPush change detection

### Adding Custom Services

1. Create service in `src/app/services/`
2. Use `@Injectable({ providedIn: 'root' })`
3. Inject via constructor

### Adding State

1. Create action file in `src/app/state/{feature}/`
2. Create reducer with handlers
3. Create effects for async operations
4. Create selectors for derived state
5. Register in `app.config.ts`

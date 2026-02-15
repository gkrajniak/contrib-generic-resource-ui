# Features

Complete reference of all Generic Resource UI features.

## List View

### Dynamic Column Generation

The list view automatically generates columns from GraphQL schema introspection:

- **Core Columns**: Name, Namespace (for namespaced resources), Age (relative time)
- **Scalar Spec Fields**: Up to 5 relevant spec fields based on priority
- **Status Fields**: Up to 3 status fields plus conditions if available
- **Ready Status Badge**: Visual indicator showing resource health

### Column Priority

Spec fields are prioritized in this order:
1. `displayName`
2. `type`
3. `status`
4. `phase`
5. `state`
6. `description`
7. `provider`
8. `version`

### Real-time Updates

- WebSocket subscriptions for ADDED/MODIFIED/DELETED events
- Automatic list synchronization without page refresh
- Resource version tracking for efficient updates

### Filtering and Search

- **Namespace Filtering**: Filter by namespace for namespaced resources
- **Label Selector**: Filter by Kubernetes label selectors (e.g., `app=nginx,env=prod`)
- **Search**: Client-side search term filtering across all visible columns
- **Sortable Columns**: Click column headers to sort (for string/integer fields)

### Pagination

- Configurable page size
- Server-side pagination support

## Detail View

### Automatic Section Generation

The detail view organizes data into logical sections:

#### Metadata Section
- Name, UID, Resource Version
- Creation and Deletion Timestamps
- Labels (as badges)
- Annotations
- Generation
- Owner References
- Finalizers

#### Spec Section
- Scalar fields displayed as key-value pairs
- Complex/nested fields as collapsible sections
- Empty fields hidden by default with "Show X hidden empty fields" toggle

#### Status Section
- Scalar status fields
- Special table for Kubernetes Conditions:
  - Type, Status, Reason, Message, Age
  - Color-coded status indicators

### Nested Object Display

- Recursive display up to 3 levels deep
- Collapsible sections with icons
- Auto-mapped icons based on field name
- URL detection with clickable links
- Path detection with breadcrumb formatting

### Ready Status Badge

Intelligent automatic detection from multiple patterns:
- **Conditions**: `status.conditions[].type === 'Ready'` or `'Available'`
- **Phase**: `status.phase` matches ready phases (Ready, Running, Active, etc.)
- **Ready Field**: Direct `status.ready` boolean
- **State**: `status.state` matches ready states

Status types:
- `ready` (green)
- `not-ready` (red)
- `in-progress` (yellow)
- `unknown` (gray)

### YAML Panel

- Side-out panel showing complete raw YAML
- Monaco editor with syntax highlighting
- Copy to clipboard button
- Download as `.yaml` file
- Toggle from header toolbar

### Live Updates

- Watches resource for changes via GraphQL subscriptions
- Automatic refresh on MODIFIED events
- Visual indication of updates

## Create/Edit Features

### Auto-Generated Form

- Required fields automatically detected from GraphQL schema
- K8s-compliant name validation (RFC 1123 DNS labels)
- Namespace field included for namespaced resources

### Form Fields

- **Name**: Always required, read-only in edit mode
- **Namespace**: For namespaced resources
- **Common Optional Fields**: `displayName`, `description`, `type` if present in schema
- Clear separation of required vs optional fields

### YAML Editor

- Toggle between form and raw YAML editing
- Monaco editor with YAML syntax highlighting
- Bidirectional sync between form and YAML
- Pre-populated template for new resources

### Validation

- Real-time form validation
- K8s name format enforcement:
  - Lowercase only
  - Start and end with alphanumeric
  - Only letters, numbers, hyphens allowed
  - Maximum 253 characters
- Required field indicators

### Dry-Run Option

- Validate changes without saving
- Server-side validation feedback

## Delete Features

### Confirmation Dialog

- Modal confirmation to prevent accidental deletion
- Clear display of resource name being deleted
- Warning that action cannot be undone
- Cancel and Confirm buttons

## Data Display Components

### Value Cell

Smart formatting for different data types:
- **Strings**: Truncation with "..." for long values
- **Numbers**: Tabular numeric formatting
- **Booleans**: Check/X icons with color coding
- **Dates**: Relative time display with full date on hover
- **URLs**: Clickable links with chain-link icon
- **Objects**: "[Object]" placeholder
- **Arrays**: "[N items]" count display

### Labels Display

- Rendered as badges/chips
- Configurable maximum visible labels
- "Show more" expansion

### Copy Button

- One-click copy to clipboard
- Available for IDs, UIDs, paths, URLs
- Visual feedback on copy

### Conditions Table

Special formatting for Kubernetes conditions:
- Type column with status icon
- Color-coded status (True=green, False=red, Unknown=gray)
- Reason and Message columns
- Relative time for lastTransitionTime

## Status Color Coding

### Positive (Green)
`ready`, `active`, `running`, `succeeded`, `healthy`, `available`, `bound`, `complete`, `completed`, `true`

### Negative (Red)
`failed`, `error`, `terminated`, `unhealthy`, `unavailable`, `false`, `crashloopbackoff`, `imagepullbackoff`, `errimagepull`

### Warning (Yellow)
`pending`, `waiting`, `terminating`, `unknown`, `warning`, `degraded`

### Informative (Blue)
`creating`, `updating`, `provisioning`, `scaling`, `initializing`

## Navigation

### List to Detail

- Click resource name to navigate to detail view
- URL pattern: `/:resourceId`
- Luigi navigation integration

### Detail Actions

- **Edit**: Opens edit modal with current resource data
- **Delete**: Opens confirmation dialog
- **YAML**: Toggles YAML panel
- **Back**: Returns to list view

## Responsive Design

- Adapts to different screen sizes
- YAML panel adjusts width on mobile
- Collapsible sections for nested data
- Horizontal scrolling for wide tables

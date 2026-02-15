# Development Guide

Setup and development instructions for the Generic Resource UI.

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- Local Kubernetes cluster (Kind) for testing
- mkcert for local SSL certificates

## Initial Setup

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/platform-mesh/generic-resource-ui.git
cd generic-resource-ui

# Install dependencies
npm install
```

### SSL Certificates

The UI requires HTTPS for Luigi integration. Generate local certificates:

```bash
# Install mkcert if not already installed
brew install mkcert  # macOS
# or
choco install mkcert  # Windows

# Create local CA
mkcert -install

# Generate certificates
mkdir -p .certs
mkcert -key-file .certs/localhost-key.pem -cert-file .certs/localhost.pem localhost 127.0.0.1 ::1
```

### Configuration

Copy a config file for local development:

```bash
# For Kind cluster
cp src/assets/config.kind.json src/assets/config.json

# For local GraphQL endpoint
cp src/assets/config.local.json src/assets/config.json
```

Edit `src/assets/config.json` with your settings:

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
    "crdGatewayApiUrl": "https://localhost:8443/api/kubernetes-graphql-gateway/root:platform-mesh/graphql"
  },
  "namespaceId": "default",
  "token": "your-jwt-token"
}
```

## Development Server

### Start Dev Server

```bash
npm start
```

Opens at `https://localhost:4200`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start dev server with SSL |
| `npm run build` | Production build |
| `npm test` | Run unit tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix lint issues |
| `npm run e2e` | Run Playwright tests |

## Project Structure

```
generic-resource-ui/
├── src/
│   ├── app/
│   │   ├── components/        # UI components
│   │   ├── models/            # TypeScript interfaces
│   │   ├── services/          # Business logic
│   │   ├── state/             # NgRx state management
│   │   └── utils/             # Utility functions
│   ├── assets/
│   │   └── config*.json       # Configuration files
│   └── styles/                # Global styles
├── docs/                      # Documentation
├── e2e/                       # E2E tests
├── .certs/                    # SSL certificates (local)
├── angular.json               # Angular CLI config
├── tsconfig.json              # TypeScript config
└── package.json               # Dependencies
```

## Code Style

### TypeScript

- Use strict mode
- Prefer interfaces over types
- Use `readonly` for immutable properties
- Avoid `any` - use proper types

### Angular

- Standalone components only
- OnPush change detection
- Signals for reactive state
- New control flow syntax (`@if`, `@for`)

### Imports

Follow this import order:
1. Angular core
2. Angular modules
3. Third-party libraries
4. Local imports (relative paths)

## State Management

### Adding a New Feature

1. **Actions** (`feature.actions.ts`):
```typescript
export const loadFeature = createAction('[Feature] Load');
export const loadFeatureSuccess = createAction(
  '[Feature] Load Success',
  props<{ data: FeatureData }>()
);
```

2. **Reducer** (`feature.reducer.ts`):
```typescript
export const featureReducer = createReducer(
  initialState,
  on(loadFeature, state => ({ ...state, loading: true })),
  on(loadFeatureSuccess, (state, { data }) => ({
    ...state,
    data,
    loading: false
  }))
);
```

3. **Effects** (`feature.effects.ts`):
```typescript
loadFeature$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadFeature),
    switchMap(() =>
      this.service.load().pipe(
        map(data => loadFeatureSuccess({ data }))
      )
    )
  )
);
```

4. **Selectors** (`feature.selectors.ts`):
```typescript
export const selectFeatureData = createSelector(
  selectFeatureState,
  state => state.data
);
```

## Testing

### Unit Tests

Run unit tests with Jest:

```bash
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### E2E Tests

Run Playwright tests:

```bash
# Run all tests
npm run e2e

# Run specific test
npx playwright test e2e/list-view.spec.ts

# Debug mode
npx playwright test --debug

# UI mode
npx playwright test --ui
```

### Test Configuration

E2E tests use config from `.config/config.kind.json`. Ensure your Kind cluster is running.

## Building

### Development Build

```bash
npm run build
```

Output: `dist/`

### Production Build

```bash
npm run build -- --configuration=production
```

### Docker Build

```bash
# Build Docker image
docker build -t generic-resource-ui:local .

# Load into Kind
kind load docker-image generic-resource-ui:local --name platform-mesh
```

### Task Commands

If using Taskfile:

```bash
# Build and load into Kind
task docker:kind

# Full validation
task validate
```

## Debugging

### Browser DevTools

1. Open Chrome DevTools
2. Go to Sources tab
3. Find source maps under `webpack://`
4. Set breakpoints in TypeScript files

### NgRx DevTools

Install Redux DevTools browser extension to inspect:
- Action history
- State changes
- Time-travel debugging

### Console Logging

Key log prefixes:
- `[ContextService]` - Context initialization
- `[SchemaEffects]` - Schema loading
- `[GenericResourceService]` - GraphQL queries
- `[DetailView]` - Detail view lifecycle

## Common Issues

### CORS Errors

Ensure GraphQL gateway allows requests from `https://localhost:4200`.

### SSL Certificate Errors

1. Regenerate certificates with mkcert
2. Trust the local CA in your browser
3. Restart the dev server

### Luigi Context Not Received

If running standalone (not in portal):
1. Check `config.json` exists
2. Verify token is valid
3. Check console for context service logs

### GraphQL Errors

1. Verify gateway URL is correct
2. Check bearer token is valid
3. Inspect network tab for response details

## Contributing

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation

### Commit Messages

Follow conventional commits:
```
feat: add new feature
fix: resolve issue with X
docs: update configuration guide
refactor: simplify component logic
```

### Pull Requests

1. Create feature branch
2. Make changes with tests
3. Run `npm run lint` and `npm test`
4. Create PR with description
5. Address review feedback

## Deployment

### Kind Cluster

```bash
# Build and deploy
task docker:kind

# Check deployment status
kubectl get pods -n platform-mesh-system -l app=generic-resource-ui
```

### Production

The UI is deployed as part of the Platform Mesh Helm chart. See the main repository for deployment instructions.

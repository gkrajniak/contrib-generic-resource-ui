# E2E Visual Testing

This directory contains Playwright e2e tests for the generic-resource-ui.

## Quick Start

### Online Mode (requires gateway)

1. **Start the dev server** (in terminal 1):
   ```bash
   task dev CONFIG_NAME=accountinfo
   ```

2. **Take screenshots** (in terminal 2):
   ```bash
   task screenshots
   ```

### Offline Mode (no gateway needed)

Take screenshots using mocked GraphQL responses:

```bash
task screenshots:offline
```

Fixtures are stored in `e2e/fixtures/` and can be updated from a live gateway:

```bash
task fixtures:capture RESOURCE_NAME=accountinfo
```

## Task Commands

| Command | Description |
|---------|-------------|
| `task screenshots` | Take screenshots of current config |
| `task screenshots:multi` | Take screenshots for all configs in src/assets/configs/ |
| `task screenshots:offline` | Take screenshots with mocked GraphQL (no gateway) |
| `task screenshots:open` | Open screenshots folder |
| `task screenshots:clean` | Remove all screenshots |
| `task fixtures:capture` | Capture live data to fixture files |
| `task test:e2e` | Run all e2e tests |
| `task test:e2e:headed` | Run tests with browser visible |
| `task test:e2e:ui` | Open Playwright UI mode |

## Test Files

| File | Description |
|------|-------------|
| `visual-layout.spec.ts` | Single resource screenshots (uses active config) |
| `multi-resource-screenshots.spec.ts` | Screenshots for all configs in src/assets/configs/ |
| `offline-screenshots.spec.ts` | Screenshots using mocked GraphQL responses |

## Fixtures

Fixtures in `e2e/fixtures/` contain mocked GraphQL responses:

```
e2e/fixtures/
├── accountinfo.fixture.json
├── configmaps.fixture.json
└── namespaces.fixture.json
```

Each fixture contains:
- `listResponse`: Response for list queries
- `detailResponse`: Response for single-resource queries
- `schema` (optional): GraphQL schema for introspection

### Capturing Fixtures from Live Gateway

```bash
# Ensure you have a valid token
echo 'your-jwt-token' > .secret/token

# Capture fixture for a specific resource
task fixtures:capture RESOURCE_NAME=accountinfo

# List available configs to capture
task fixtures:capture
```

## Screenshot Output

Screenshots are organized by test type:

```
test-results/screenshots/
├── 01-list-view.png              # From visual-layout.spec.ts
├── 02-detail-view-full.png
├── 03-detail-content.png
├── accountinfo/                   # From multi-resource-screenshots.spec.ts
│   ├── 01-list-view.png
│   └── 02-detail-view-full.png
├── configmaps/
│   └── ...
└── offline/                       # From offline-screenshots.spec.ts
    ├── accountinfo/
    └── configmaps/
```

## Running Specific Tests

```bash
# Run only single-resource test
npx playwright test e2e/visual-layout.spec.ts

# Run multi-resource tests
npx playwright test e2e/multi-resource-screenshots.spec.ts

# Run offline tests
npx playwright test e2e/offline-screenshots.spec.ts

# Run with browser visible
npx playwright test --headed

# Debug mode (step through)
npx playwright test --debug
```

## Tips for Layout Iteration

1. Start dev server: `task dev CONFIG_NAME=accountinfo`
2. Make CSS/template changes
3. Run `task screenshots:keep-server` for quick screenshots (keeps server running)
4. Compare visually with previous captures
5. Repeat until satisfied

For faster iteration, use `task test:e2e:ui` for Playwright's interactive mode.

## Adding New Resource Types

1. Create config file: `src/assets/configs/{resource}.json`
2. Capture fixture: `task fixtures:capture RESOURCE_NAME={resource}`
3. Run offline test: `task screenshots:offline`

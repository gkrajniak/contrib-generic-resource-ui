# E2E Visual Testing

This directory contains Playwright e2e tests for the generic-resource-ui.

## Quick Start

1. **Start the dev server** (in terminal 1):
   ```bash
   task dev CONFIG_NAME=accountinfo
   ```

2. **Take screenshots** (in terminal 2):
   ```bash
   task screenshots
   ```

3. **View results**:
   ```bash
   task screenshots:open
   # or
   open test-results/screenshots/
   ```

## Task Commands

| Command | Description |
|---------|-------------|
| `task screenshots` | Take screenshots of standalone app |
| `task screenshots:all` | Take all screenshots (portal + standalone) |
| `task screenshots:open` | Open screenshots folder |
| `task screenshots:clean` | Remove all screenshots |
| `task test:e2e` | Run all e2e tests |
| `task test:e2e:headed` | Run tests with browser visible |
| `task test:e2e:ui` | Open Playwright UI mode |

## Test Files

- `visual-layout.spec.ts` - Screenshots for layout iteration
- `create-edit-modal.spec.ts` - Modal functionality tests

## Running Specific Tests

```bash
# Run only standalone tests (faster, no portal)
npx playwright test e2e/visual-layout.spec.ts --grep "Standalone"

# Run with browser visible
npx playwright test --headed

# Run single test file
npx playwright test e2e/visual-layout.spec.ts

# Debug mode (step through)
npx playwright test --debug
```

## Screenshot Output

Screenshots are saved to `test-results/screenshots/`:

- `standalone-list.png` - List view
- `standalone-detail-full.png` - Full detail page
- `standalone-detail-content.png` - Just the content area
- `standalone-spec-panel.png` - Spec section panel
- `standalone-card-*.png` - Individual nested cards
- `viewport-*.png` - Responsive breakpoint screenshots

## Configuration

The visual tests use the config from `LOCAL_DEV_SETTINGS` in the spec file.
To test different resources, modify the config URL:

```typescript
const LOCAL_DEV_SETTINGS = {
  isActive: true,
  configs: [{ url: 'https://localhost:4200/ui/generic-resource/assets/config.accountinfo.json' }],
  serviceProviderConfig: {},
};
```

## Tips for Layout Iteration

1. Start dev server: `task dev CONFIG_NAME=accountinfo`
2. Make CSS/template changes
3. Run `task screenshots` to capture new screenshots
4. Compare visually with previous captures
5. Repeat until satisfied

For faster iteration, use `task test:e2e:ui` for Playwright's interactive mode.

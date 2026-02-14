# UX Improvement Plan: Generic Resource UI

## Summary of Issues Found

After reviewing screenshots of the AccountInfo resource display, several UX issues were identified that affect usability and visual polish.

---

## Priority 1: Critical Issues

### 1.1 Raw GraphQL Type Names Displayed as Subtitles
**Problem:** Card subtitles show internal type names like "AccountInfospecspecaccount" instead of user-friendly text.

**Current:** `AccountInfospecspecaccount`
**Expected:** Hidden, or show a cleaned-up version like "Account Configuration"

**Fix Location:** `nested-object-card.component.ts` - `description()` computed property

**Solution:**
```typescript
// Option A: Hide subtitle entirely when it's just the raw type name
protected readonly description = computed(() => {
  const info = this.fieldInfo();
  // Only show description if it's actual documentation, not the type name
  if (info.field.description && !info.field.description.includes('spec')) {
    return info.field.description;
  }
  return undefined; // Hide raw type names
});

// Option B: Clean up the type name
private cleanTypeName(typeName: string): string {
  // Remove prefixes like "AccountInfospecspec"
  return typeName
    .replace(/^[A-Z][a-z]+spec(spec)?/i, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}
```

---

### 1.2 All Cards Have Same Icon
**Problem:** IconMapperService isn't returning different icons for different field types. All cards show the generic "customer" icon.

**Investigation Needed:** Check if `getIconForField()` is being called with correct parameters and returning appropriate icons.

**Expected Icons:**
- Account → `customer`
- Cluster Info → `it-host`
- OIDC → `locked`
- Organization → `org-chart`
- Parent Account → `navigation-up-arrow`

**Fix Location:** `icon-mapper.service.ts` and `field-analyzer.service.ts`

---

### 1.3 "Oidc" Should Be "OIDC"
**Problem:** Acronyms are being converted to Title Case instead of staying uppercase.

**Fix Location:** `utils/humanize.ts` - `humanizeFieldName()` function

**Solution:** Add acronym detection:
```typescript
const KNOWN_ACRONYMS = ['OIDC', 'URL', 'ID', 'CA', 'DNS', 'API', 'UI', 'UID', 'FGA'];

export function humanizeFieldName(name: string): string {
  // First humanize normally
  let result = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim();

  // Then fix known acronyms
  for (const acronym of KNOWN_ACRONYMS) {
    const regex = new RegExp(`\\b${acronym}\\b`, 'gi');
    result = result.replace(regex, acronym);
  }

  return result;
}
```

---

## Priority 2: Important Improvements

### 2.1 Status Visual Treatment
**Problem:** Status shows as plain text "Unknown" with no color or icon indicating severity.

**Fix Location:** `resource-detail-view.component.ts` or create new `StatusBadgeComponent`

**Solution:** Add status badge with colors:
- Ready/True → Green
- NotReady/False → Red
- Unknown/Pending → Yellow/Orange
- Progressing → Blue

---

### 2.2 Hide Empty Fields
**Problem:** "Labels: None" shown when there are no labels.

**Fix Location:** Detail view component template

**Solution:** Conditionally hide fields with no value:
```html
@if (labels && labels.length > 0) {
  <div class="labels">...</div>
}
```

---

### 2.3 List View Title
**Problem:** Shows "AccountInfoes" (incorrect plural from config).

**Fix Location:** `resource-list-view.component.ts`

**Solution:** Use `ui.title` from config, fallback to humanized kind name:
```typescript
protected readonly pageTitle = computed(() => {
  return this.config()?.ui?.title || humanizeFieldName(this.resourceDefinition()?.kind || 'Resources');
});
```

---

### 2.4 Uppercase Labels Hard to Read
**Problem:** Field labels like "GENERATED CLUSTER ID" in all caps are hard to scan.

**Current:** `GENERATED CLUSTER ID`
**Proposed:** `Generated Cluster ID` (Title Case)

**Fix Location:** `nested-object-card.component.ts` styles

**Solution:** Change CSS:
```css
.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--sapContent_LabelColor);
  /* Remove: text-transform: uppercase; */
  /* Add: */ text-transform: capitalize;
}
```

Or keep uppercase but improve letter-spacing for readability.

---

## Priority 3: Polish & Enhancement

### 3.1 Copy Button for Long Values
**Problem:** UID and other long values are truncated with no easy way to copy.

**Solution:** Add copy-to-clipboard button next to truncated values.

---

### 3.2 URL Display Improvement
**Problem:** Long URLs truncated awkwardly, showing partial paths.

**Solution Options:**
- Show just the hostname with tooltip for full URL
- Make URLs clickable links that open in new tab
- Add copy button

---

### 3.3 JSON Preview for Arrays
**Problem:** Arrays show `[JSON - click to expand]` with no preview.

**Better:** Show `[3 items - click to expand]` or first item preview.

---

### 3.4 Empty Card Content
**Problem:** Cluster Info card is nearly empty, showing only CA certificate.

**Consideration:** If a card has only 1 field, consider inline display or collapsing.

---

## Implementation Order

1. **Fix icon mapping** (1.2) - Most visually impactful
2. **Fix acronym handling** (1.3) - Quick win
3. **Hide raw type names** (1.1) - Removes ugly implementation details
4. **Status badge styling** (2.1) - Improves scannability
5. **List view title** (2.3) - Fixes incorrect grammar
6. **Label case styling** (2.4) - Improves readability
7. **Hide empty fields** (2.2) - Cleaner UI
8. **Polish items** (3.x) - As time permits

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/services/icon/icon-mapper.service.ts` | Debug/fix icon selection |
| `src/app/components/shared/nested-object-card/nested-object-card.component.ts` | Hide raw type names, fix subtitle |
| `src/app/utils/humanize.ts` | Add acronym handling |
| `src/app/components/resource-detail-view/resource-detail-view.component.ts` | Status badge, hide empty fields |
| `src/app/components/resource-list-view/resource-list-view.component.ts` | Use config title |

---

## Verification

After implementing fixes, run:
```bash
task screenshots
open test-results/screenshots/
```

Compare before/after to verify improvements.

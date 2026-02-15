import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { CardModule } from '@fundamental-ngx/core/card';
import { IconComponent } from '@fundamental-ngx/core/icon';
import { DetailFieldType, NestedFieldInfo } from 'models/index';
import { ValueCellComponent } from 'components/shared/value-cell/value-cell.component';
import { CopyButtonComponent } from 'components/shared/copy-button/copy-button.component';
import { humanizeFieldName } from 'utils/humanize';

interface ScalarFieldEntry {
  key: string;
  label: string;
  value: any;
  displayValue: string;
  type: DetailFieldType;
  description?: string;
  isUrl?: boolean;
  isPath?: boolean;
  isCopyable?: boolean;
}

interface NestedFieldEntry {
  key: string;
  fieldInfo: NestedFieldInfo;
  data: Record<string, any>;
}

/**
 * A lighter-weight alternative to nested-object-card that uses section headers
 * and dividers instead of cards within cards. This component is used at depth > 0
 * to avoid visual clutter from deeply nested cards.
 */
@Component({
  selector: 'app-nested-object-section',
  imports: [
    CardModule,
    IconComponent,
    ValueCellComponent,
    CopyButtonComponent,
  ],
  template: `
    @if (hasData()) {
      <div class="nested-section" [class.is-root]="depth() === 0">
        <!-- Section header with icon and title -->
        <div
          class="section-header"
          [class.collapsible]="isCollapsible()"
          [attr.role]="isCollapsible() ? 'button' : null"
          [attr.tabindex]="isCollapsible() ? 0 : null"
          (click)="toggleCollapse()"
          (keydown.enter)="toggleCollapse()"
          (keydown.space)="toggleCollapse(); $event.preventDefault()"
        >
          <div class="header-icon-wrapper">
            <fd-icon [glyph]="icon()" class="header-icon"></fd-icon>
          </div>
          <h4 class="section-title">{{ displayTitle() }}</h4>
          @if (isCollapsible()) {
            <fd-icon
              [glyph]="isCollapsed() ? 'navigation-right-arrow' : 'navigation-down-arrow'"
              class="collapse-icon"
            ></fd-icon>
          }
        </div>

        @if (!isCollapsed()) {
          <div class="section-content">
            <!-- Scalar fields in a compact layout -->
            @if (allDisplayFields().length > 0) {
              <div class="field-list">
                @for (field of allDisplayFields(); track field.key) {
                  <div class="field-row">
                    <div class="field-label">{{ field.label }}</div>
                    <div class="field-value" [class.long-value]="isLongValue(field.value)">
                      @if (field.isUrl) {
                        <span class="value-with-copy">
                          <a [href]="field.value" target="_blank" rel="noopener noreferrer" class="url-link">
                            <fd-icon glyph="chain-link" class="url-icon"></fd-icon>
                            <span class="url-text" [title]="field.value">{{ field.displayValue }}</span>
                          </a>
                          <app-copy-button [value]="field.value" [label]="field.label"></app-copy-button>
                        </span>
                        @if (isUrlTruncated(field.value, field.displayValue)) {
                          <button
                            type="button"
                            class="show-url-btn"
                            (click)="toggleUrl($event, field.key)"
                          >
                            {{ expandedUrls().has(field.key) ? 'Hide' : 'Show full URL' }}
                          </button>
                          @if (expandedUrls().has(field.key)) {
                            <pre class="full-url">{{ field.value }}</pre>
                          }
                        }
                      } @else if (field.isPath) {
                        <span class="value-with-copy">
                          <span class="path-breadcrumb">{{ field.displayValue }}</span>
                          <app-copy-button [value]="field.value" [label]="field.label"></app-copy-button>
                        </span>
                      } @else if (isLongValue(field.value)) {
                        <details class="expandable-value">
                          <summary>{{ truncateValue(field.value) }}</summary>
                          <pre class="full-value">{{ field.value }}</pre>
                        </details>
                      } @else if (field.isCopyable) {
                        <span class="value-with-copy">
                          <app-value-cell
                            [value]="field.displayValue"
                            [type]="field.type"
                          ></app-value-cell>
                          <app-copy-button [value]="field.value" [label]="field.label"></app-copy-button>
                        </span>
                      } @else {
                        <app-value-cell
                          [value]="field.displayValue"
                          [type]="field.type"
                        ></app-value-cell>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Nested children rendered as subsections -->
            @if (displayNestedEntries().length > 0 && depth() < maxDepth()) {
              <div class="nested-subsections">
                @for (nested of displayNestedEntries(); track nested.key) {
                  <app-nested-object-section
                    [fieldInfo]="nested.fieldInfo"
                    [data]="nested.data"
                    [depth]="depth() + 1"
                    [maxDepth]="maxDepth()"
                    [showEmptyFields]="showEmptyFields()"
                  ></app-nested-object-section>
                }
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .nested-section {
        margin-bottom: 0.75rem;
      }
      .nested-section.is-root {
        margin-bottom: 1rem;
      }
      .section-header {
        display: flex;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--sapGroup_TitleBorderColor);
        margin-bottom: 0.75rem;
      }
      .section-header.collapsible {
        cursor: pointer;
      }
      .section-header.collapsible:hover {
        background: var(--sapList_Hover_Background);
        border-radius: 4px 4px 0 0;
      }
      .header-icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        background: var(--sapButton_Lite_Background);
        margin-right: 0.5rem;
        flex-shrink: 0;
      }
      .header-icon {
        font-size: 0.875rem;
        color: var(--sapContent_IconColor);
      }
      .section-title {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--sapTextColor);
        flex: 1;
      }
      .collapse-icon {
        font-size: 0.75rem;
        color: var(--sapContent_NonInteractiveIconColor);
      }
      .section-content {
        padding-left: 0.5rem;
      }
      .field-list {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }
      .field-row {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        gap: 0.75rem;
        padding: 0.25rem 0;
      }
      .field-label {
        flex: 0 0 auto;
        min-width: 100px;
        max-width: 140px;
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--sapContent_LabelColor);
      }
      .field-value {
        flex: 1 1 auto;
        font-size: 0.8125rem;
        color: var(--sapTextColor);
        word-break: break-word;
        line-height: 1.4;
      }
      .value-with-copy {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
      }
      .long-value {
        font-family: var(--sapFontMonospacedFamily, monospace);
        font-size: 0.75rem;
      }
      .expandable-value {
        cursor: pointer;
      }
      .expandable-value summary {
        color: var(--sapLinkColor);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        max-width: 100%;
      }
      .full-value {
        margin: 0.5rem 0 0 0;
        padding: 0.5rem;
        background: var(--sapBackgroundColor);
        border: 1px solid var(--sapGroup_TitleBorderColor);
        border-radius: 4px;
        font-size: 0.6875rem;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 120px;
        overflow: auto;
      }
      .nested-subsections {
        margin-top: 0.75rem;
        padding-left: 0.75rem;
        border-left: 2px solid var(--sapGroup_ContentBorderColor, #e5e5e5);
      }
      .url-link {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        color: var(--sapLinkColor);
        text-decoration: none;
      }
      .url-link:hover {
        text-decoration: underline;
      }
      .url-icon {
        font-size: 0.75rem;
      }
      .url-text {
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .show-url-btn {
        display: inline;
        margin-left: 0.5rem;
        padding: 0;
        font-size: 0.625rem;
        color: var(--sapLinkColor);
        background: transparent;
        border: none;
        cursor: pointer;
        text-decoration: underline;
      }
      .full-url {
        margin: 0.25rem 0 0 0;
        padding: 0.375rem;
        background: var(--sapBackgroundColor);
        border: 1px solid var(--sapGroup_TitleBorderColor);
        border-radius: 4px;
        font-size: 0.6875rem;
        font-family: var(--sapFontMonospacedFamily, monospace);
        white-space: pre-wrap;
        word-break: break-all;
      }
      .path-breadcrumb {
        font-family: var(--sapFontMonospacedFamily, monospace);
        font-size: 0.75rem;
        color: var(--sapTextColor);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NestedObjectSectionComponent {
  readonly fieldInfo = input.required<NestedFieldInfo>();
  readonly data = input.required<Record<string, any>>();
  readonly depth = input(0);
  readonly maxDepth = input(3);
  readonly showEmptyFields = input(false);

  protected readonly expandedUrls = signal<Set<string>>(new Set());
  protected readonly isCollapsed = signal(false);

  private readonly HIDDEN_FIELDS = ['__typename', '_typename', 'typeName'];
  private readonly URL_MIN_LENGTH_FOR_TRUNCATION = 50;
  private readonly COPYABLE_FIELD_PATTERNS = ['id', 'uid', 'clusterId', 'clusterid', 'name'];
  private readonly PATH_FIELD_NAMES = ['path'];

  protected readonly hasData = computed(() => {
    const d = this.data();
    const fieldName = this.fieldInfo().field.name;
    const showEmpty = this.showEmptyFields();

    if (!d) {
      console.log(`[NestedSection ${fieldName}] hasData: no data, showEmpty=${showEmpty}`);
      return showEmpty; // Show even with no data if showEmptyFields is true
    }

    const visibleKeys = Object.keys(d).filter((k) => !this.HIDDEN_FIELDS.includes(k));

    // If showEmptyFields is true, show even if effectively empty
    if (showEmpty) {
      console.log(`[NestedSection ${fieldName}] hasData: showEmpty=true, returning true`);
      return true;
    }

    if (visibleKeys.length === 0) {
      console.log(`[NestedSection ${fieldName}] hasData: no visible keys`);
      return false;
    }

    // Check if effectively empty
    if (this.isEffectivelyEmpty(d)) return false;

    // Also check if we would actually render any content
    // (either scalar fields or nested entries)
    return this.scalarFieldEntries().length > 0 || this.nestedFieldEntries().length > 0;
  });

  protected readonly icon = computed(() => this.fieldInfo().icon);

  protected readonly title = computed(() => {
    const info = this.fieldInfo();
    if (info.field.description) {
      return info.field.description;
    }
    return humanizeFieldName(info.field.name);
  });

  protected readonly displayTitle = computed(() => {
    if (this.shouldFlatten()) {
      const nested = this.nestedFieldEntries();
      if (nested.length === 1) {
        return `${this.title()} › ${humanizeFieldName(nested[0].key)}`;
      }
    }
    return this.title();
  });

  protected readonly isCollapsible = computed(() => {
    return this.depth() > 0;
  });

  protected readonly shouldFlatten = computed(() => {
    const scalars = this.scalarFieldEntries();
    const nested = this.nestedFieldEntries();
    return scalars.length === 0 && nested.length === 1;
  });

  protected readonly allDisplayFields = computed((): ScalarFieldEntry[] => {
    if (this.shouldFlatten()) {
      const nested = this.nestedFieldEntries()[0];
      return this.extractFieldsFromData(nested.data, nested.fieldInfo);
    }
    return this.scalarFieldEntries();
  });

  protected readonly displayNestedEntries = computed((): NestedFieldEntry[] => {
    if (this.shouldFlatten()) {
      const nested = this.nestedFieldEntries()[0];
      const childData = nested.data;
      return Object.entries(childData)
        .filter(([key]) => !this.HIDDEN_FIELDS.includes(key))
        .filter(([, value]) => this.isNestedObject(value))
        .filter(([, value]) => !this.isEffectivelyEmpty(value))
        .map(([key, value]) => ({
          key,
          fieldInfo: this.createFallbackNestedInfo(key),
          data: value as Record<string, any>,
        }));
    }
    return this.nestedFieldEntries();
  });

  protected readonly scalarFieldEntries = computed((): ScalarFieldEntry[] => {
    const d = this.data();
    const info = this.fieldInfo();

    if (!d) {
      return [];
    }

    return this.extractFieldsFromData(d, info);
  });

  protected toggleCollapse(): void {
    if (this.isCollapsible()) {
      this.isCollapsed.set(!this.isCollapsed());
    }
  }

  private extractFieldsFromData(d: Record<string, any>, info: NestedFieldInfo): ScalarFieldEntry[] {
    if (info.scalarChildren.length > 0) {
      return info.scalarChildren
        .filter((f) => !this.HIDDEN_FIELDS.includes(f.name))
        .filter((f) => d[f.name] !== undefined && d[f.name] !== null)
        .map((f) => this.createFieldEntry(f.name, d[f.name], f.description));
    }

    // Fallback: data-driven scalar fields - also filter out null/undefined/empty values
    return Object.entries(d)
      .filter(([key]) => !this.HIDDEN_FIELDS.includes(key))
      .filter(([, value]) => this.isScalarValue(value))
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => this.createFieldEntry(key, value));
  }

  private createFieldEntry(key: string, value: any, description?: string): ScalarFieldEntry {
    const isUrl = this.isUrlValue(value);
    const isPath = this.isPathField(key, value);
    const isCopyable = this.isCopyableField(key, value);

    return {
      key,
      label: humanizeFieldName(key),
      value,
      displayValue: this.getDisplayValue(key, value),
      type: this.getFieldType(value),
      description,
      isUrl,
      isPath,
      isCopyable: isCopyable && !isUrl && !isPath,
    };
  }

  protected readonly nestedFieldEntries = computed((): NestedFieldEntry[] => {
    const d = this.data();
    const info = this.fieldInfo();
    const includeEmpty = this.showEmptyFields();

    if (!d) {
      return [];
    }

    if (info.nestedChildren.length > 0) {
      // Schema-defined nested children path
      const result = info.nestedChildren
        .filter((nested) => {
          const data = d[nested.field.name];
          if (includeEmpty) {
            // Include all defined fields when showing empty
            const include = data !== undefined || nested.field.name in d;
            console.log(`[NestedSection ${info.field.name}] Child ${nested.field.name}: data=${JSON.stringify(data)?.substring(0, 50)}, include=${include}`);
            return include;
          }
          return data && !this.isEffectivelyEmpty(data);
        })
        .map((nested) => ({
          key: nested.field.name,
          fieldInfo: nested,
          data: d[nested.field.name] ?? {},
        }));

      if (includeEmpty) {
        console.log(`[NestedSection ${info.field.name}] nestedFieldEntries with includeEmpty: ${result.length} entries`);
      }
      return result;
    }

    // Fallback: Data-driven nested objects
    return Object.entries(d)
      .filter(([key]) => !this.HIDDEN_FIELDS.includes(key))
      .filter(([, value]) => this.isNestedObject(value))
      .filter(([, value]) => includeEmpty || !this.isEffectivelyEmpty(value))
      .map(([key, value]) => ({
        key,
        fieldInfo: this.createFallbackNestedInfo(key),
        data: value as Record<string, any>,
      }));
  });

  private getFieldType(value: any): DetailFieldType {
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    if (typeof value === 'number') {
      return 'number';
    }
    if (value instanceof Date || (typeof value === 'string' && this.isDateString(value))) {
      return 'date';
    }
    return 'text';
  }

  private isDateString(value: string): boolean {
    const datePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
    return datePattern.test(value);
  }

  protected isLongValue(value: any): boolean {
    if (typeof value !== 'string') return false;
    return value.length > 60 || value.includes('\n') || value.startsWith('-----');
  }

  protected truncateValue(value: string): string {
    if (value.startsWith('-----')) {
      return '[Certificate - click to expand]';
    }
    if (value.startsWith('[') || value.startsWith('{')) {
      return '[JSON - click to expand]';
    }
    return value.substring(0, 40) + '...';
  }

  protected toggleUrl(event: Event, key: string): void {
    event.preventDefault();
    event.stopPropagation();
    const current = this.expandedUrls();
    const updated = new Set(current);
    if (updated.has(key)) {
      updated.delete(key);
    } else {
      updated.add(key);
    }
    this.expandedUrls.set(updated);
  }

  protected getUrlDisplay(url: string): string {
    if (url.length <= this.URL_MIN_LENGTH_FOR_TRUNCATION) {
      return url;
    }
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;
      const pathParts = path.split('/').filter(Boolean);
      if (pathParts.length > 2) {
        const lastPart = pathParts[pathParts.length - 1];
        return `${parsed.host}/.../\u200B${lastPart}`;
      }
      return `${parsed.host}${path}`;
    } catch {
      return url.substring(0, 30) + '...';
    }
  }

  protected isUrlTruncated(originalUrl: string, displayValue: string): boolean {
    if (displayValue.includes('...') || displayValue.includes('\u200B')) {
      return true;
    }
    return displayValue.length > 28 || originalUrl.length > this.URL_MIN_LENGTH_FOR_TRUNCATION;
  }

  private getDisplayValue(key: string, value: any): string {
    if (this.isPathField(key, value)) {
      return this.formatPathAsBreadcrumb(value);
    }
    if (this.isUrlValue(value)) {
      return this.getUrlDisplay(value);
    }
    return value;
  }

  private formatPathAsBreadcrumb(path: string): string {
    if (typeof path !== 'string') return path;
    if (path.includes(':')) {
      return path.split(':').join(' › ');
    }
    if (path.includes('/') && !path.startsWith('http')) {
      return path.split('/').filter(Boolean).join(' › ');
    }
    return path;
  }

  private isPathField(key: string, value: any): boolean {
    if (typeof value !== 'string') return false;
    const keyLower = key.toLowerCase();
    if (this.PATH_FIELD_NAMES.some(p => keyLower === p || keyLower.endsWith('path'))) {
      return true;
    }
    if (value.includes(':') && !value.startsWith('http') && value.split(':').length >= 3) {
      return true;
    }
    return false;
  }

  private isCopyableField(key: string, value: any): boolean {
    if (typeof value !== 'string') return false;
    const keyLower = key.toLowerCase();
    return this.COPYABLE_FIELD_PATTERNS.some(pattern =>
      keyLower === pattern ||
      keyLower.endsWith(pattern) ||
      keyLower.includes('id') ||
      keyLower.includes('uuid')
    );
  }

  private isUrlValue(value: any): boolean {
    if (typeof value !== 'string') return false;
    return value.startsWith('http://') || value.startsWith('https://');
  }

  private isScalarValue(value: any): boolean {
    return (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  }

  private isNestedObject(value: any): boolean {
    return (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    );
  }

  private isEffectivelyEmpty(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value as object).filter(
        (k) => !this.HIDDEN_FIELDS.includes(k)
      );
      if (keys.length === 0) {
        return true;
      }
      // Recursively check if all values are null/undefined/empty or nested empty objects
      return keys.every((key) => {
        const v = (value as Record<string, unknown>)[key];
        if (v === null || v === undefined || v === '') {
          return true;
        }
        // Recursively check nested objects
        if (typeof v === 'object') {
          return this.isEffectivelyEmpty(v);
        }
        return false;
      });
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return value === '';
  }

  private createFallbackNestedInfo(fieldName: string): NestedFieldInfo {
    return {
      field: {
        name: fieldName,
        typeName: 'Object',
        kind: 'OBJECT',
        isNonNull: false,
        isList: false,
        isScalar: false,
      },
      scalarChildren: [],
      nestedChildren: [],
      depth: this.depth() + 1,
      displayTitle: humanizeFieldName(fieldName),
      icon: 'detail-view',
    };
  }
}

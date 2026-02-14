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

@Component({
  selector: 'app-nested-object-card',
  imports: [
    CardModule,
    IconComponent,
    ValueCellComponent,
    CopyButtonComponent,
  ],
  template: `
    @if (hasData()) {
      <fd-card class="nested-card" [class.nested-depth]="depth() > 0" [class.flattened]="shouldFlatten()">
        <div class="card-header">
          <div class="header-icon-wrapper">
            <fd-icon [glyph]="icon()" class="header-icon"></fd-icon>
          </div>
          <h3 class="header-title">{{ displayTitle() }}</h3>
        </div>

        <fd-card-content>
          <div class="card-content-inner">
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
                          [attr.aria-expanded]="expandedUrls().has(field.key)"
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

          @if (displayNestedEntries().length > 0 && depth() < maxDepth()) {
            <div class="nested-cards">
              @for (nested of displayNestedEntries(); track nested.key) {
                <app-nested-object-card
                  [fieldInfo]="nested.fieldInfo"
                  [data]="nested.data"
                  [depth]="depth() + 1"
                  [maxDepth]="maxDepth()"
                ></app-nested-object-card>
              }
            </div>
          }
          </div>
        </fd-card-content>
      </fd-card>
    }
  `,
  styles: [
    `
      .nested-card {
        margin-bottom: 1rem;
        min-width: 280px;
        max-width: 520px;
        width: fit-content;
      }
      .nested-depth {
        border: 1px solid var(--sapGroup_TitleBorderColor);
      }
      .flattened {
        /* Flattened cards with merged child content */
      }
      .card-header {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--sapGroup_TitleBorderColor);
      }
      .header-icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        background: var(--sapButton_Lite_Background);
        margin-right: 0.75rem;
        flex-shrink: 0;
      }
      .header-icon {
        font-size: 1rem;
        color: var(--sapContent_IconColor);
      }
      .header-title {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--sapTextColor);
      }
      .card-content-inner {
        padding: 1rem;
      }
      .field-list {
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
      }
      .field-row {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        gap: 1rem;
        padding: 0.375rem 0;
        border-bottom: 1px solid var(--sapGroup_ContentBorderColor, #e5e5e5);
      }
      .field-row:last-child {
        border-bottom: none;
      }
      .field-label {
        flex: 0 0 auto;
        min-width: 100px;
        max-width: 160px;
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--sapContent_LabelColor);
      }
      .field-value {
        flex: 1 1 auto;
        font-size: 0.875rem;
        color: var(--sapTextColor);
        word-break: break-word;
        line-height: 1.4;
        min-width: 120px;
      }
      .value-with-copy {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
      }
      .value-with-copy:hover app-copy-button {
        opacity: 1;
      }
      .long-value {
        font-family: var(--sapFontMonospacedFamily, monospace);
        font-size: 0.8125rem;
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
      .expandable-value summary:hover {
        text-decoration: underline;
      }
      .full-value {
        margin: 0.5rem 0 0 0;
        padding: 0.75rem;
        background: var(--sapBackgroundColor);
        border: 1px solid var(--sapGroup_TitleBorderColor);
        border-radius: 4px;
        font-size: 0.75rem;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 150px;
        overflow: auto;
      }
      .nested-cards {
        margin-top: 1rem;
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
        font-size: 0.875rem;
      }
      .url-text {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .show-url-btn {
        display: block;
        margin-top: 0.25rem;
        padding: 0.125rem 0.5rem;
        font-size: 0.6875rem;
        color: var(--sapLinkColor);
        background: transparent;
        border: none;
        cursor: pointer;
        text-decoration: underline;
      }
      .show-url-btn:hover {
        color: var(--sapLink_Hover_Color);
      }
      .full-url {
        margin: 0.5rem 0 0 0;
        padding: 0.5rem;
        background: var(--sapBackgroundColor);
        border: 1px solid var(--sapGroup_TitleBorderColor);
        border-radius: 4px;
        font-size: 0.75rem;
        font-family: var(--sapFontMonospacedFamily, monospace);
        white-space: pre-wrap;
        word-break: break-all;
      }
      .path-breadcrumb {
        font-family: var(--sapFontMonospacedFamily, monospace);
        font-size: 0.8125rem;
        color: var(--sapTextColor);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NestedObjectCardComponent {
  readonly fieldInfo = input.required<NestedFieldInfo>();
  readonly data = input.required<Record<string, any>>();
  readonly depth = input(0);
  readonly maxDepth = input(3);

  protected readonly expandedUrls = signal<Set<string>>(new Set());

  private readonly HIDDEN_FIELDS = ['__typename', '_typename', 'typeName'];
  private readonly URL_MIN_LENGTH_FOR_TRUNCATION = 50;
  private readonly COPYABLE_FIELD_PATTERNS = ['id', 'uid', 'clusterId', 'clusterid', 'name'];
  private readonly PATH_FIELD_NAMES = ['path'];

  protected readonly hasData = computed(() => {
    const d = this.data();
    if (!d) return false;
    const visibleKeys = Object.keys(d).filter((k) => !this.HIDDEN_FIELDS.includes(k));
    return visibleKeys.length > 0;
  });

  protected readonly icon = computed(() => this.fieldInfo().icon);

  protected readonly title = computed(() => {
    const info = this.fieldInfo();
    if (info.field.description) {
      return info.field.description;
    }
    return humanizeFieldName(info.field.name);
  });

  // Display title that includes flattened child name if applicable
  protected readonly displayTitle = computed(() => {
    if (this.shouldFlatten()) {
      const nested = this.nestedFieldEntries();
      if (nested.length === 1) {
        return `${this.title()} › ${humanizeFieldName(nested[0].key)}`;
      }
    }
    return this.title();
  });

  // Check if we should flatten: no scalar fields and exactly one nested child
  protected readonly shouldFlatten = computed(() => {
    const scalars = this.scalarFieldEntries();
    const nested = this.nestedFieldEntries();
    return scalars.length === 0 && nested.length === 1;
  });

  // Get all fields to display, including flattened child fields
  protected readonly allDisplayFields = computed((): ScalarFieldEntry[] => {
    if (this.shouldFlatten()) {
      const nested = this.nestedFieldEntries()[0];
      return this.extractFieldsFromData(nested.data, nested.fieldInfo);
    }
    return this.scalarFieldEntries();
  });

  // Get nested entries to display (empty if flattened)
  protected readonly displayNestedEntries = computed((): NestedFieldEntry[] => {
    if (this.shouldFlatten()) {
      // When flattened, check if the single child has its own nested children
      const nested = this.nestedFieldEntries()[0];
      const childData = nested.data;
      return Object.entries(childData)
        .filter(([key]) => !this.HIDDEN_FIELDS.includes(key))
        .filter(([, value]) => this.isNestedObject(value))
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

  private extractFieldsFromData(d: Record<string, any>, info: NestedFieldInfo): ScalarFieldEntry[] {
    // If we have schema children defined, use them
    if (info.scalarChildren.length > 0) {
      return info.scalarChildren
        .filter((f) => !this.HIDDEN_FIELDS.includes(f.name))
        .filter((f) => d[f.name] !== undefined && d[f.name] !== null)
        .map((f) => this.createFieldEntry(f.name, d[f.name], f.description));
    }

    // Fallback: extract scalar fields directly from data when no schema children
    return Object.entries(d)
      .filter(([key]) => !this.HIDDEN_FIELDS.includes(key))
      .filter(([, value]) => this.isScalarValue(value))
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

    if (!d) {
      return [];
    }

    // If we have schema nested children defined, use them
    if (info.nestedChildren.length > 0) {
      return info.nestedChildren
        .filter((nested) => d[nested.field.name])
        .map((nested) => ({
          key: nested.field.name,
          fieldInfo: nested,
          data: d[nested.field.name] ?? {},
        }));
    }

    // Fallback: find nested objects in data when no schema nested children
    return Object.entries(d)
      .filter(([key]) => !this.HIDDEN_FIELDS.includes(key))
      .filter(([, value]) => this.isNestedObject(value))
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
        // Show: host/.../lastMeaningfulPart
        const lastPart = pathParts[pathParts.length - 1];
        return `${parsed.host}/.../\u200B${lastPart}`;
      }
      return `${parsed.host}${path}`;
    } catch {
      return url.substring(0, 30) + '...';
    }
  }

  protected isUrlTruncated(originalUrl: string, displayValue: string): boolean {
    // Show "Show full URL" when:
    // 1. The display value was explicitly truncated (contains ... or zero-width space)
    // 2. The display value is long enough that CSS text-overflow will kick in (~25+ chars)
    // 3. The original URL is significantly longer than what we show
    if (displayValue.includes('...') || displayValue.includes('\u200B')) {
      return true;
    }
    // CSS truncates at ~200px which is roughly 25-30 chars for URLs
    // Show expand link if the display value will likely be CSS-truncated
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
    // Convert colon-separated paths to breadcrumb format
    if (path.includes(':')) {
      return path.split(':').join(' › ');
    }
    // Also handle slash-separated paths
    if (path.includes('/') && !path.startsWith('http')) {
      return path.split('/').filter(Boolean).join(' › ');
    }
    return path;
  }

  private isPathField(key: string, value: any): boolean {
    if (typeof value !== 'string') return false;
    const keyLower = key.toLowerCase();
    // Check if field name suggests it's a path
    if (this.PATH_FIELD_NAMES.some(p => keyLower === p || keyLower.endsWith('path'))) {
      return true;
    }
    // Check if value looks like a colon-separated path (e.g., root:orgs:sap)
    if (value.includes(':') && !value.startsWith('http') && value.split(':').length >= 3) {
      return true;
    }
    return false;
  }

  private isCopyableField(key: string, value: any): boolean {
    if (typeof value !== 'string') return false;
    const keyLower = key.toLowerCase();
    // Check if field name suggests it's an ID that should be copyable
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

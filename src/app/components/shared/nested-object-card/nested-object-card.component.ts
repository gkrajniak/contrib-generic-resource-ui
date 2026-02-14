import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { CardModule } from '@fundamental-ngx/core/card';
import { IconComponent } from '@fundamental-ngx/core/icon';
import { DetailFieldType, NestedFieldInfo } from 'models/index';
import { ValueCellComponent } from 'components/shared/value-cell/value-cell.component';
import { humanizeFieldName } from 'utils/humanize';

interface ScalarFieldEntry {
  key: string;
  label: string;
  value: any;
  type: DetailFieldType;
  description?: string;
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
  ],
  template: `
    @if (hasData()) {
      <fd-card class="nested-card" [class.nested-depth]="depth() > 0">
        <fd-card-header>
          <fd-icon [glyph]="icon()" fd-card-header-avatar class="header-icon"></fd-icon>
          <h3 fd-card-header-title>{{ title() }}</h3>
        </fd-card-header>

        <fd-card-content>
          @if (scalarFieldEntries().length > 0) {
            <div class="field-list">
              @for (field of scalarFieldEntries(); track field.key) {
                <div class="field-row">
                  <div class="field-label">{{ field.label }}</div>
                  <div class="field-value" [class.long-value]="isLongValue(field.value)">
                    @if (isLongValue(field.value)) {
                      <details class="expandable-value">
                        <summary>{{ truncateValue(field.value) }}</summary>
                        <pre class="full-value">{{ field.value }}</pre>
                      </details>
                    } @else {
                      <app-value-cell
                        [value]="field.value"
                        [type]="field.type"
                      ></app-value-cell>
                    }
                  </div>
                </div>
              }
            </div>
          }

          @if (nestedFieldEntries().length > 0 && depth() < maxDepth()) {
            <div class="nested-cards">
              @for (nested of nestedFieldEntries(); track nested.key) {
                <app-nested-object-card
                  [fieldInfo]="nested.fieldInfo"
                  [data]="nested.data"
                  [depth]="depth() + 1"
                  [maxDepth]="maxDepth()"
                ></app-nested-object-card>
              }
            </div>
          }
        </fd-card-content>
      </fd-card>
    }
  `,
  styles: [
    `
      .nested-card {
        margin-bottom: 1rem;
        max-width: 480px;
      }
      .nested-depth {
        border: 1px solid var(--sapGroup_TitleBorderColor);
      }
      .header-icon {
        font-size: 1.25rem;
        color: var(--sapContent_IconColor);
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
        flex: 0 0 140px;
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--sapContent_LabelColor);
      }
      .field-value {
        flex: 1;
        font-size: 0.875rem;
        color: var(--sapTextColor);
        word-break: break-word;
        line-height: 1.4;
        min-width: 0;
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NestedObjectCardComponent {
  readonly fieldInfo = input.required<NestedFieldInfo>();
  readonly data = input.required<Record<string, any>>();
  readonly depth = input(0);
  readonly maxDepth = input(3);

  private readonly HIDDEN_FIELDS = ['__typename', '_typename', 'typeName'];

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

  protected readonly description = computed(() => {
    const info = this.fieldInfo();
    return info.field.description ? undefined : info.field.typeName;
  });

  protected readonly scalarFieldEntries = computed((): ScalarFieldEntry[] => {
    const d = this.data();
    const info = this.fieldInfo();

    if (!d) {
      return [];
    }

    return info.scalarChildren
      .filter((f) => !this.HIDDEN_FIELDS.includes(f.name))
      .filter((f) => d[f.name] !== undefined && d[f.name] !== null)
      .map((f) => ({
        key: f.name,
        label: humanizeFieldName(f.name),
        value: d[f.name],
        type: this.getFieldType(d[f.name]),
        description: f.description,
      }));
  });

  protected readonly nestedFieldEntries = computed((): NestedFieldEntry[] => {
    const d = this.data();
    const info = this.fieldInfo();

    if (!d) {
      return [];
    }

    return info.nestedChildren
      .filter((nested) => d[nested.field.name])
      .map((nested) => ({
        key: nested.field.name,
        fieldInfo: nested,
        data: d[nested.field.name] ?? {},
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
}

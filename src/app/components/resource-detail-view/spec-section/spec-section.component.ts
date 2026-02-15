import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { IconComponent } from '@fundamental-ngx/core/icon';
import { DetailFieldType, FieldAnalysis, NestedFieldInfo, Resource } from 'models/index';
import { ValueCellComponent } from 'components/shared/value-cell/value-cell.component';
import { NestedObjectSectionComponent } from 'components/shared/nested-object-section/nested-object-section.component';
import { humanizeFieldName } from 'utils/humanize';

interface ScalarField {
  key: string;
  label: string;
  value: any;
  type: DetailFieldType;
  description?: string;
}

interface NestedObjectEntry {
  key: string;
  fieldInfo: NestedFieldInfo;
  data: Record<string, unknown>;
  isEmpty?: boolean;
}

@Component({
  selector: 'app-spec-section',
  imports: [
    IconComponent,
    ValueCellComponent,
    NestedObjectSectionComponent,
  ],
  template: `
    @if (hasSpec()) {
      <div class="spec-section">
        <!-- Section header -->
        <div class="section-header">
          <fd-icon glyph="settings" class="header-icon"></fd-icon>
          <h3 class="section-title">Spec</h3>
          @if (hiddenEmptyFieldsCount() > 0) {
            <button
              type="button"
              class="show-hidden-link"
              (click)="toggleShowEmptyFields()"
            >
              {{ showEmptyFields() ? 'Hide empty fields' : 'Show ' + hiddenEmptyFieldsCount() + ' hidden empty fields' }}
            </button>
          }
        </div>

        <!-- Scalar fields in a grid -->
        @if (scalarFields().length > 0) {
          <div class="spec-grid">
            @for (field of scalarFields(); track field.key) {
              <div class="spec-item">
                <div class="spec-label">
                  {{ field.label }}
                  @if (field.description) {
                    <fd-icon
                      glyph="hint"
                      class="info-icon"
                      [title]="field.description"
                    ></fd-icon>
                  }
                </div>
                <div class="spec-value">
                  <app-value-cell
                    [value]="field.value"
                    [type]="field.type"
                  ></app-value-cell>
                </div>
              </div>
            }
          </div>
        }

        <!-- Nested objects as lightweight sections -->
        @if (visibleNestedObjectFields().length > 0) {
          <div class="nested-sections">
            @for (nested of visibleNestedObjectFields(); track nested.key) {
              <app-nested-object-section
                [fieldInfo]="nested.fieldInfo"
                [data]="nested.data"
                [depth]="0"
                [maxDepth]="3"
                [showEmptyFields]="showEmptyFields()"
              ></app-nested-object-section>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .spec-section {
        padding: 1rem;
        background: var(--sapGroup_ContentBackground);
        border-radius: 8px;
        border: 1px solid var(--sapGroup_TitleBorderColor);
      }
      .section-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding-bottom: 0.75rem;
        border-bottom: 2px solid var(--sapGroup_TitleBorderColor);
      }
      .header-icon {
        font-size: 1.25rem;
        color: var(--sapContent_IconColor);
      }
      .section-title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--sapTextColor);
        flex: 1;
      }
      .show-hidden-link {
        background: transparent;
        border: none;
        color: var(--sapLinkColor);
        font-size: 0.75rem;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
      }
      .show-hidden-link:hover {
        text-decoration: underline;
      }
      .spec-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem 2rem;
        margin-bottom: 1rem;
      }
      .spec-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .spec-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--sapContent_LabelColor);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      .info-icon {
        font-size: 0.875rem;
        color: var(--sapContent_NonInteractiveIconColor);
        cursor: help;
      }
      .info-icon:hover {
        color: var(--sapContent_IconColor);
      }
      .spec-value {
        font-size: 0.875rem;
        color: var(--sapTextColor);
        word-break: break-word;
      }
      .nested-sections {
        margin-top: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecSectionComponent {
  readonly resource = input.required<Resource>();
  readonly fieldAnalysis = input<FieldAnalysis | null | undefined>();

  protected readonly showEmptyFields = signal(false);

  protected readonly hasSpec = computed(() => {
    const spec = this.resource().spec;
    return spec && Object.keys(spec).length > 0;
  });

  private readonly HIDDEN_FIELDS = ['__typename', '_typename', 'typeName'];

  protected readonly scalarFields = computed((): ScalarField[] => {
    const spec = this.resource().spec;
    const analysis = this.fieldAnalysis();

    if (!spec) {
      return [];
    }

    const scalarSchemaFields = analysis?.scalarSpecFields ?? [];
    const scalarFieldNames = scalarSchemaFields.map((f) => f.name);

    return Object.entries(spec)
      .filter(([key]) => !this.HIDDEN_FIELDS.includes(key))
      .filter(([key]) => scalarFieldNames.includes(key) || this.isScalarValue(spec[key]))
      .map(([key, value]) => {
        const schemaField = scalarSchemaFields.find((f) => f.name === key);
        return {
          key,
          label: humanizeFieldName(key),
          value,
          type: this.getFieldType(value),
          description: schemaField?.description,
        };
      });
  });

  protected readonly nestedObjectFields = computed((): NestedObjectEntry[] => {
    const spec = this.resource().spec;
    const analysis = this.fieldAnalysis();

    if (!spec || !analysis?.nestedSpecFields) {
      return [];
    }

    return analysis.nestedSpecFields
      .filter((nested) => spec[nested.field.name] !== undefined)
      .map((nested) => ({
        key: nested.field.name,
        fieldInfo: nested,
        data: spec[nested.field.name] ?? {},
        isEmpty: this.isEmptyObject(spec[nested.field.name]),
      }));
  });

  protected readonly visibleNestedObjectFields = computed((): NestedObjectEntry[] => {
    const allFields = this.nestedObjectFields();
    if (this.showEmptyFields()) {
      return allFields;
    }
    return allFields.filter((entry) => !entry.isEmpty);
  });

  protected readonly hiddenEmptyFieldsCount = computed(() => {
    const analysis = this.fieldAnalysis();
    const spec = this.resource().spec;

    if (!spec || !analysis?.nestedSpecFields) {
      return 0;
    }

    // Count empty fields at all levels recursively
    return this.countEmptyNestedFields(spec, analysis.nestedSpecFields);
  });

  private countEmptyNestedFields(data: Record<string, unknown>, nestedFields: NestedFieldInfo[]): number {
    let count = 0;

    for (const nested of nestedFields) {
      const fieldData = data[nested.field.name];

      if (fieldData === undefined) {
        continue;
      }

      if (this.isEmptyObject(fieldData)) {
        count++;
      } else if (typeof fieldData === 'object' && fieldData !== null && !Array.isArray(fieldData)) {
        // Recursively count empty children
        if (nested.nestedChildren.length > 0) {
          count += this.countEmptyNestedFields(fieldData as Record<string, unknown>, nested.nestedChildren);
        }
      }
    }

    return count;
  }

  protected toggleShowEmptyFields(): void {
    this.showEmptyFields.update((v) => !v);
  }

  private isEmptyObject(value: unknown): boolean {
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
          return this.isEmptyObject(v);
        }
        return false;
      });
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return value === '';
  }

  private isScalarValue(value: unknown): boolean {
    return (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  }

  private getFieldType(value: unknown): DetailFieldType {
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    if (typeof value === 'number') {
      return 'number';
    }
    return 'text';
  }
}

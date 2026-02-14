import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
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
  data: Record<string, any>;
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
        @if (nestedObjectFields().length > 0) {
          <div class="nested-sections">
            @for (nested of nestedObjectFields(); track nested.key) {
              <app-nested-object-section
                [fieldInfo]="nested.fieldInfo"
                [data]="nested.data"
                [depth]="0"
                [maxDepth]="3"
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
      .filter((nested) => spec[nested.field.name])
      .map((nested) => ({
        key: nested.field.name,
        fieldInfo: nested,
        data: spec[nested.field.name] ?? {},
      }));
  });

  private isScalarValue(value: any): boolean {
    return (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  }

  private getFieldType(value: any): DetailFieldType {
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    if (typeof value === 'number') {
      return 'number';
    }
    return 'text';
  }
}

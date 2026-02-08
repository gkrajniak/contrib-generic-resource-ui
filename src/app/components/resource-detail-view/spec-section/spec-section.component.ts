import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  LayoutPanelComponent,
  LayoutPanelBodyComponent,
  LayoutPanelHeaderComponent,
  LayoutPanelHeadComponent,
  LayoutPanelTitleDirective,
} from '@fundamental-ngx/core/layout-panel';
import { DetailFieldType, FieldAnalysis, Resource } from 'models/index';
import { ValueCellComponent } from 'components/shared/value-cell/value-cell.component';
import { humanizeFieldName } from 'utils/humanize';
import * as YAML from 'yaml';

interface ScalarField {
  key: string;
  label: string;
  value: any;
  type: DetailFieldType;
}

interface ComplexField {
  key: string;
  label: string;
  value: any;
  yamlValue: string;
}

@Component({
  selector: 'app-spec-section',
  imports: [
    LayoutPanelComponent,
    LayoutPanelBodyComponent,
    LayoutPanelHeaderComponent,
    LayoutPanelHeadComponent,
    LayoutPanelTitleDirective,
    ValueCellComponent,
  ],
  template: `
    @if (hasSpec()) {
      <fd-layout-panel>
        <fd-layout-panel-header>
          <fd-layout-panel-head>
            <h4 fd-layout-panel-title>Spec</h4>
          </fd-layout-panel-head>
        </fd-layout-panel-header>

        <fd-layout-panel-body>
          <div class="spec-grid">
            @for (field of scalarFields(); track field.key) {
              <div class="spec-item">
                <div class="spec-label">{{ field.label }}</div>
                <div class="spec-value">
                  <app-value-cell
                    [value]="field.value"
                    [type]="field.type"
                  ></app-value-cell>
                </div>
              </div>
            }
          </div>

          @for (field of complexFields(); track field.key) {
            <div class="complex-field">
              <div class="spec-label">{{ field.label }}</div>
              <pre class="yaml-content">{{ field.yamlValue }}</pre>
            </div>
          }
        </fd-layout-panel-body>
      </fd-layout-panel>
    }
  `,
  styles: [
    `
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
      }
      .spec-value {
        font-size: 0.875rem;
        color: var(--sapTextColor);
        word-break: break-word;
      }
      .complex-field {
        margin-bottom: 1rem;
      }
      .yaml-content {
        background: var(--sapBackgroundColor);
        padding: 0.75rem;
        border-radius: 4px;
        font-size: 0.8125rem;
        font-family: monospace;
        overflow-x: auto;
        max-height: 200px;
        margin: 0.5rem 0 0 0;
        border: 1px solid var(--sapGroup_TitleBorderColor);
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

  protected readonly scalarFields = computed((): ScalarField[] => {
    const spec = this.resource().spec;
    const analysis = this.fieldAnalysis();

    if (!spec) {
      return [];
    }

    const scalarFieldNames = analysis?.scalarSpecFields.map((f) => f.name) ?? [];

    return Object.entries(spec)
      .filter(([key]) => scalarFieldNames.includes(key) || this.isScalarValue(spec[key]))
      .map(([key, value]) => ({
        key,
        label: humanizeFieldName(key),
        value,
        type: this.getFieldType(value),
      }));
  });

  protected readonly complexFields = computed((): ComplexField[] => {
    const spec = this.resource().spec;
    const analysis = this.fieldAnalysis();

    if (!spec) {
      return [];
    }

    const complexFieldNames =
      analysis?.complexSpecFields.map((f) => f.name) ?? [];

    return Object.entries(spec)
      .filter(
        ([key, value]) =>
          complexFieldNames.includes(key) || !this.isScalarValue(value)
      )
      .map(([key, value]) => ({
        key,
        label: humanizeFieldName(key),
        value,
        yamlValue: YAML.stringify(value, { indent: 2 }),
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

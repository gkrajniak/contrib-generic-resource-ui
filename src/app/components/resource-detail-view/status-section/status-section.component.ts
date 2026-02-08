import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  LayoutPanelComponent,
  LayoutPanelBodyComponent,
  LayoutPanelHeaderComponent,
  LayoutPanelHeadComponent,
  LayoutPanelTitleDirective,
} from '@fundamental-ngx/core/layout-panel';
import { TableModule } from '@fundamental-ngx/core/table';
import { ObjectStatusModule } from '@fundamental-ngx/core/object-status';
import { Condition, DetailFieldType, FieldAnalysis, Resource } from 'models/index';
import { ValueCellComponent } from 'components/shared/value-cell/value-cell.component';
import { humanizeFieldName } from 'utils/humanize';

interface StatusField {
  key: string;
  label: string;
  value: any;
  type: DetailFieldType;
}

@Component({
  selector: 'app-status-section',
  imports: [
    DatePipe,
    LayoutPanelComponent,
    LayoutPanelBodyComponent,
    LayoutPanelHeaderComponent,
    LayoutPanelHeadComponent,
    LayoutPanelTitleDirective,
    TableModule,
    ObjectStatusModule,
    ValueCellComponent,
  ],
  template: `
    @if (hasStatus()) {
      <fd-layout-panel>
        <fd-layout-panel-header>
          <fd-layout-panel-head>
            <h4 fd-layout-panel-title>Status</h4>
          </fd-layout-panel-head>
        </fd-layout-panel-header>

        <fd-layout-panel-body>
          @if (statusFields().length > 0) {
            <div class="status-grid">
              @for (field of statusFields(); track field.key) {
                <div class="status-item">
                  <div class="status-label">{{ field.label }}</div>
                  <div class="status-value">
                    <app-value-cell
                      [value]="field.value"
                      [type]="field.type"
                    ></app-value-cell>
                  </div>
                </div>
              }
            </div>
          }

          @if (conditions().length > 0) {
            <h5 class="conditions-title">Conditions</h5>
            <table fd-table>
              <thead fd-table-header>
                <tr fd-table-row>
                  <th fd-table-cell>Type</th>
                  <th fd-table-cell>Status</th>
                  <th fd-table-cell>Reason</th>
                  <th fd-table-cell>Message</th>
                  <th fd-table-cell>Last Transition</th>
                </tr>
              </thead>
              <tbody fd-table-body>
                @for (condition of conditions(); track condition.type) {
                  <tr fd-table-row>
                    <td fd-table-cell>{{ condition.type }}</td>
                    <td fd-table-cell>
                      <span fd-object-status
                        [status]="getConditionStatus(condition)"
                        [label]="condition.status"
                      ></span>
                    </td>
                    <td fd-table-cell>{{ condition.reason || '-' }}</td>
                    <td fd-table-cell class="message-cell">
                      {{ condition.message || '-' }}
                    </td>
                    <td fd-table-cell>
                      {{ condition.lastTransitionTime | date: 'short' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </fd-layout-panel-body>
      </fd-layout-panel>
    }
  `,
  styles: [
    `
      .status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem 2rem;
        margin-bottom: 1rem;
      }
      .status-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .status-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--sapContent_LabelColor);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .status-value {
        font-size: 0.875rem;
        color: var(--sapTextColor);
        word-break: break-word;
      }
      .conditions-title {
        margin: 1.5rem 0 0.75rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--sapContent_LabelColor);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .message-cell {
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusSectionComponent {
  readonly resource = input.required<Resource>();
  readonly fieldAnalysis = input<FieldAnalysis | null | undefined>();

  protected readonly hasStatus = computed(() => {
    const status = this.resource().status;
    return status && Object.keys(status).length > 0;
  });

  protected readonly statusFields = computed((): StatusField[] => {
    const status = this.resource().status;
    if (!status) {
      return [];
    }

    return Object.entries(status)
      .filter(([key]) => key !== 'conditions' && this.isScalarValue(status[key]))
      .map(([key, value]) => ({
        key,
        label: humanizeFieldName(key),
        value,
        type: this.getFieldType(value),
      }));
  });

  protected readonly conditions = computed((): Condition[] => {
    const status = this.resource().status;
    if (!status || !Array.isArray(status['conditions'])) {
      return [];
    }
    return status['conditions'] as Condition[];
  });

  protected getConditionStatus(
    condition: Condition
  ): 'positive' | 'negative' | 'informative' {
    switch (condition.status) {
      case 'True':
        return 'positive';
      case 'False':
        return 'negative';
      default:
        return 'informative';
    }
  }

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

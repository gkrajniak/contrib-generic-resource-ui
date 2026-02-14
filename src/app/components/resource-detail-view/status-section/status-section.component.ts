import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from '@fundamental-ngx/core/table';
import { ObjectStatusModule } from '@fundamental-ngx/core/object-status';
import { IconComponent } from '@fundamental-ngx/core/icon';
import { Condition, DetailFieldType, FieldAnalysis, Resource } from 'models/index';
import { ValueCellComponent } from 'components/shared/value-cell/value-cell.component';
import { humanizeFieldName } from 'utils/humanize';

interface StatusField {
  key: string;
  label: string;
  value: any;
  type: DetailFieldType;
  description?: string;
}

@Component({
  selector: 'app-status-section',
  imports: [
    DatePipe,
    TableModule,
    ObjectStatusModule,
    IconComponent,
    ValueCellComponent,
  ],
  template: `
    @if (hasStatus()) {
      <div class="status-section">
        <!-- Section header -->
        <div class="section-header">
          <fd-icon glyph="status-in-process" class="header-icon"></fd-icon>
          <h3 class="section-title">Status</h3>
        </div>

        @if (statusFields().length > 0) {
          <div class="status-grid">
            @for (field of statusFields(); track field.key) {
              <div class="status-item">
                <div class="status-label">
                  {{ field.label }}
                  @if (field.description) {
                    <fd-icon
                      glyph="hint"
                      class="info-icon"
                      [title]="field.description"
                    ></fd-icon>
                  }
                </div>
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
      </div>
    }
  `,
  styles: [
    `
      .status-section {
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
    const analysis = this.fieldAnalysis();

    if (!status) {
      return [];
    }

    const statusSchemaFields = analysis?.statusFields ?? [];

    return Object.entries(status)
      .filter(([key]) => key !== 'conditions' && this.isScalarValue(status[key]))
      .map(([key, value]) => {
        const schemaField = statusSchemaFields.find((f) => f.name === key);
        return {
          key,
          label: humanizeFieldName(key),
          value,
          type: this.getFieldType(value),
          description: schemaField?.description,
        };
      });
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

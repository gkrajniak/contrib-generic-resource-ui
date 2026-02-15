import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { DatePipe, JsonPipe, NgClass } from '@angular/common';
import { IconComponent } from '@fundamental-ngx/core/icon';
import { DetailFieldType } from 'models/index';
import { formatRelativeTime } from 'utils/humanize';

@Component({
  selector: 'app-value-cell',
  imports: [NgClass, JsonPipe, DatePipe, IconComponent],
  template: `
    @switch (type()) {
      @case ('boolean') {
        <fd-icon
          [glyph]="value() ? 'accept' : 'decline'"
          [ngClass]="value() ? 'fd-color--positive' : 'fd-color--negative'"
        ></fd-icon>
      }
      @case ('date') {
        <span [title]="value() | date: 'medium'">{{ relativeTime() }}</span>
      }
      @case ('number') {
        <span class="fd-text--numeric">{{ value() }}</span>
      }
      @case ('status') {
        @if (isEmpty()) {
          <span class="fd-text--muted">-</span>
        } @else {
          <span [ngClass]="statusColorClass()">{{ displayValue() }}</span>
        }
      }
      @case ('object') {
        @if (isComplex()) {
          <span class="fd-text--muted">[Object]</span>
        } @else {
          {{ value() | json }}
        }
      }
      @case ('array') {
        @if (arrayLength() > 0) {
          <span class="fd-text--muted">[{{ arrayLength() }} items]</span>
        } @else {
          <span class="fd-text--muted">[]</span>
        }
      }
      @default {
        @if (isEmpty()) {
          <span class="fd-text--muted">-</span>
        } @else {
          {{ displayValue() }}
        }
      }
    }
  `,
  styles: [
    `
      :host {
        display: inline;
      }
      .fd-text--numeric {
        font-variant-numeric: tabular-nums;
      }
      .fd-text--muted {
        color: var(--sapContent_DisabledTextColor);
      }
      .fd-color--positive {
        color: var(--sapPositiveColor);
      }
      .fd-color--negative {
        color: var(--sapNegativeColor);
      }
      .fd-color--warning {
        color: var(--sapWarningColor);
      }
      .fd-color--informative {
        color: var(--sapInformativeColor);
      }
      .status-text {
        font-weight: 500;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValueCellComponent {
  readonly value = input<any>();
  readonly type = input<DetailFieldType>('text');
  readonly maxLength = input(50);

  protected readonly isEmpty = computed(() => {
    const val = this.value();
    return val === null || val === undefined || val === '';
  });

  protected readonly isComplex = computed(() => {
    const val = this.value();
    return typeof val === 'object' && val !== null && !Array.isArray(val);
  });

  protected readonly arrayLength = computed(() => {
    const val = this.value();
    return Array.isArray(val) ? val.length : 0;
  });

  protected readonly displayValue = computed(() => {
    const val = this.value();
    if (typeof val === 'string' && val.length > this.maxLength()) {
      return val.substring(0, this.maxLength()) + '...';
    }
    return val;
  });

  protected readonly relativeTime = computed(() => {
    return formatRelativeTime(this.value());
  });

  protected readonly statusColorClass = computed(() => {
    const val = String(this.value() ?? '').toLowerCase();

    // Positive statuses (green)
    if (['ready', 'active', 'running', 'succeeded', 'healthy', 'available', 'bound', 'complete', 'completed', 'true'].includes(val)) {
      return 'fd-color--positive status-text';
    }

    // Negative statuses (red)
    if (['failed', 'error', 'terminated', 'unhealthy', 'unavailable', 'false', 'crashloopbackoff', 'imagepullbackoff', 'errimagepull'].includes(val)) {
      return 'fd-color--negative status-text';
    }

    // Warning statuses (yellow/orange)
    if (['pending', 'waiting', 'terminating', 'unknown', 'warning', 'degraded'].includes(val)) {
      return 'fd-color--warning status-text';
    }

    // Informative statuses (blue)
    if (['creating', 'updating', 'provisioning', 'scaling', 'initializing'].includes(val)) {
      return 'fd-color--informative status-text';
    }

    return 'status-text';
  });
}

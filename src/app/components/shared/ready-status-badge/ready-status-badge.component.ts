import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { ObjectStatusModule } from '@fundamental-ngx/core/object-status';
import { ReadyStatus, ReadyStatusType } from 'models/index';

@Component({
  selector: 'app-ready-status-badge',
  imports: [ObjectStatusModule],
  template: `
    <span fd-object-status [status]="fdStatus()" [inverted]="inverted()" [label]="displayLabel()"></span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadyStatusBadgeComponent {
  readonly status = input.required<ReadyStatus | null>();
  readonly inverted = input(false);
  readonly showMessage = input(false);

  protected readonly fdStatus = computed(() => {
    const status = this.status();
    if (!status) {
      return 'informative';
    }

    return this.mapStatusToFd(status.status);
  });

  protected readonly displayLabel = computed(() => {
    const status = this.status();
    if (!status) {
      return 'Unknown';
    }

    if (this.showMessage() && status.message) {
      return status.message;
    }

    return this.getStatusLabel(status.status);
  });

  private mapStatusToFd(
    statusType: ReadyStatusType
  ): 'positive' | 'negative' | 'critical' | 'informative' {
    switch (statusType) {
      case 'ready':
        return 'positive';
      case 'not-ready':
        return 'negative';
      case 'in-progress':
        return 'critical';
      default:
        return 'informative';
    }
  }

  private getStatusLabel(statusType: ReadyStatusType): string {
    switch (statusType) {
      case 'ready':
        return 'Ready';
      case 'not-ready':
        return 'Not Ready';
      case 'in-progress':
        return 'In Progress';
      default:
        return 'Unknown';
    }
  }
}

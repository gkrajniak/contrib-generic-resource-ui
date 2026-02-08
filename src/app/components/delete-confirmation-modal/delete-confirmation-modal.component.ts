import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonBarComponent } from '@fundamental-ngx/core/bar';
import { DialogModule } from '@fundamental-ngx/core/dialog';
import { FormItemComponent, FormLabelComponent, FormControlComponent } from '@fundamental-ngx/core/form';
import { MessageStripComponent } from '@fundamental-ngx/core/message-strip';
import { BusyIndicatorComponent } from '@fundamental-ngx/core/busy-indicator';
import { Store } from '@ngrx/store';
import { deleteResource } from 'state/resources/resources.actions';
import { selectDeleting } from 'state/resources/resources.selectors';
import {
  selectDeleteConfirmationOpen,
  selectDeletingResourceName,
} from 'state/ui/ui.selectors';
import { closeDeleteConfirmation } from 'state/ui/ui.actions';

@Component({
  selector: 'app-delete-confirmation-modal',
  imports: [
    FormsModule,
    ButtonBarComponent,
    DialogModule,
    FormItemComponent,
    FormLabelComponent,
    FormControlComponent,
    MessageStripComponent,
    BusyIndicatorComponent,
  ],
  template: `
    @if (isOpen()) {
      <fd-dialog>
        <fd-dialog-header>
          <h3 fd-dialog-title>Delete Resource</h3>
        </fd-dialog-header>

        <fd-dialog-body>
          <fd-busy-indicator [loading]="deleting()" size="m" [block]="true">
            <fd-message-strip type="warning" [dismissible]="false">
              This action cannot be undone. The resource will be permanently
              deleted.
            </fd-message-strip>

            <p class="confirmation-text">
              To confirm deletion, please type the resource name:
              <strong>{{ resourceName() }}</strong>
            </p>

            <div fd-form-item>
              <label fd-form-label>Resource Name</label>
              <input
                fd-form-control
                type="text"
                [(ngModel)]="confirmationInput"
                placeholder="Enter resource name"
              />
            </div>
          </fd-busy-indicator>
        </fd-dialog-body>

        <fd-dialog-footer>
          <fd-button-bar
            fdType="transparent"
            (click)="onCancel()"
          >Cancel</fd-button-bar>
          <fd-button-bar
            fdType="negative"
            [disabled]="!canDelete()"
            (click)="onDelete()"
          >Delete</fd-button-bar>
        </fd-dialog-footer>
      </fd-dialog>
    }
  `,
  styles: [
    `
      .confirmation-text {
        margin: 1rem 0;
      }
      strong {
        font-family: monospace;
        background: var(--sapBackgroundColor);
        padding: 0.125rem 0.25rem;
        border-radius: 4px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteConfirmationModalComponent {
  private store = inject(Store);

  protected readonly isOpen = toSignal(
    this.store.select(selectDeleteConfirmationOpen),
    { initialValue: false }
  );
  protected readonly resourceName = toSignal(
    this.store.select(selectDeletingResourceName),
    { initialValue: '' }
  );
  protected readonly deleting = toSignal(this.store.select(selectDeleting), {
    initialValue: false,
  });

  protected confirmationInput = '';

  protected canDelete(): boolean {
    return this.confirmationInput === this.resourceName();
  }

  protected onCancel(): void {
    this.confirmationInput = '';
    this.store.dispatch(closeDeleteConfirmation());
  }

  protected onDelete(): void {
    const name = this.resourceName();
    if (name && this.canDelete()) {
      this.store.dispatch(deleteResource({ resourceName: name }));
      this.confirmationInput = '';
      this.store.dispatch(closeDeleteConfirmation());
    }
  }
}

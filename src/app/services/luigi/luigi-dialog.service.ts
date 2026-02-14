import { Injectable } from '@angular/core';
import LuigiClient from '@luigi-project/client';

/**
 * Service to manage Luigi backdrop when showing modal dialogs.
 * When running inside Luigi micro-frontend framework, dialogs need
 * to coordinate with Luigi's UX manager for proper backdrop handling.
 */
@Injectable({
  providedIn: 'root',
})
export class LuigiDialogService {
  private dialogOpenCount = 0;

  /**
   * Call when opening a modal dialog to add Luigi backdrop
   */
  dialogOpened(): void {
    this.dialogOpenCount++;
    try {
      LuigiClient.uxManager().addBackdrop();
    } catch {
      // Not running in Luigi context - ignore
    }
  }

  /**
   * Call when closing a modal dialog to remove Luigi backdrop
   */
  dialogClosed(): void {
    this.dialogOpenCount--;
    if (this.dialogOpenCount <= 0) {
      this.dialogOpenCount = 0;
      try {
        LuigiClient.uxManager().removeBackdrop();
      } catch {
        // Not running in Luigi context - ignore
      }
    }
  }
}

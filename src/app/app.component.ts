import { CreateEditModalComponent } from './components/create-edit-modal/create-edit-modal.component';
import { DeleteConfirmationModalComponent } from './components/delete-confirmation-modal/delete-confirmation-modal.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemingService } from '@fundamental-ngx/core';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    CreateEditModalComponent,
    DeleteConfirmationModalComponent,
  ],
  template: `
    <router-outlet></router-outlet>
    <app-create-edit-modal></app-create-edit-modal>
    <app-delete-confirmation-modal></app-delete-confirmation-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  constructor(themingService: ThemingService) {
    themingService.init();
  }
}

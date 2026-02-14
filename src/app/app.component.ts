import { DeleteConfirmationModalComponent } from './components/delete-confirmation-modal/delete-confirmation-modal.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemingService } from '@fundamental-ngx/core';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    DeleteConfirmationModalComponent,
  ],
  template: `
    <router-outlet></router-outlet>
    <app-delete-confirmation-modal></app-delete-confirmation-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  constructor(themingService: ThemingService) {
    themingService.init();
  }
}

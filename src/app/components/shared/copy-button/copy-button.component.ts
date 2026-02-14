import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { IconComponent } from '@fundamental-ngx/core/icon';
import { MessageToastService } from '@fundamental-ngx/core/message-toast';

@Component({
  selector: 'app-copy-button',
  imports: [IconComponent],
  template: `
    <button
      type="button"
      class="copy-btn"
      [class.copied]="copied()"
      [title]="copied() ? 'Copied!' : 'Copy to clipboard'"
      (click)="onCopy($event)"
    >
      <fd-icon [glyph]="copied() ? 'accept' : 'copy'" class="copy-icon"></fd-icon>
    </button>
  `,
  styles: [
    `
      .copy-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.125rem;
        background: transparent;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        opacity: 0.5;
        transition: opacity 0.15s ease, background 0.15s ease;
      }
      .copy-btn:hover {
        opacity: 1;
        background: var(--sapButton_Lite_Hover_Background);
      }
      .copy-btn.copied {
        opacity: 1;
      }
      .copy-icon {
        font-size: 0.875rem;
        color: var(--sapContent_IconColor);
      }
      .copied .copy-icon {
        color: var(--sapPositiveColor);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyButtonComponent {
  private messageToast = inject(MessageToastService);

  readonly value = input.required<string>();
  readonly label = input<string>('Value');

  protected readonly copied = signal(false);

  protected onCopy(event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    navigator.clipboard.writeText(this.value()).then(() => {
      this.copied.set(true);
      this.messageToast.open(`${this.label()} copied to clipboard`, {
        duration: 2000,
      });
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}

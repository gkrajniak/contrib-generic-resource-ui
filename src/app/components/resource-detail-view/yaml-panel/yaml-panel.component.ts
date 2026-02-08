import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { ToolbarComponent, ToolbarSpacerDirective, ToolbarSeparatorComponent } from '@fundamental-ngx/core/toolbar';
import { TitleComponent } from '@fundamental-ngx/core/title';
import { MessageToastService } from '@fundamental-ngx/core/message-toast';
import { Resource } from 'models/index';
import { resourceToYaml, countHiddenAnnotations } from 'utils/yaml-utils';
import { Store } from '@ngrx/store';
import { closeYamlPanel } from 'state/ui/ui.actions';

@Component({
  selector: 'app-yaml-panel',
  imports: [
    ButtonComponent,
    ToolbarComponent,
    ToolbarSpacerDirective,
    ToolbarSeparatorComponent,
    TitleComponent,
  ],
  template: `
    <div class="yaml-panel-container">
      <fd-toolbar size="xs">
        <h5 fd-title [headerSize]="5">YAML</h5>
        <fd-toolbar-spacer></fd-toolbar-spacer>
        @if (hiddenAnnotationCount() > 0) {
          <button
            fd-button
            fdType="transparent"
            [glyph]="hideAnnotations() ? 'show' : 'hide'"
            [ariaLabel]="hideAnnotations() ? 'Show hidden annotations' : 'Hide annotations'"
            (click)="toggleAnnotations()"
          >
            {{ hideAnnotations() ? 'Show ' + hiddenAnnotationCount() + ' hidden' : 'Hide annotations' }}
          </button>
          <fd-toolbar-separator></fd-toolbar-separator>
        }
        <button
          fd-button
          fdType="transparent"
          glyph="copy"
          ariaLabel="Copy"
          (click)="onCopy()"
        ></button>
        <button
          fd-button
          fdType="transparent"
          glyph="download"
          ariaLabel="Download"
          (click)="onDownload()"
        ></button>
        <button
          fd-button
          fdType="transparent"
          glyph="decline"
          ariaLabel="Close"
          (click)="onClose()"
        ></button>
      </fd-toolbar>

      <pre class="yaml-content">{{ yamlContent() }}</pre>
    </div>
  `,
  styles: [
    `
      .yaml-panel-container {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--sapBackgroundColor);
      }
      .yaml-content {
        flex: 1;
        overflow: auto;
        padding: 1rem;
        margin: 0;
        font-family: monospace;
        font-size: 0.8125rem;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YamlPanelComponent {
  private messageToast = inject(MessageToastService);
  private store = inject(Store);

  readonly resource = input.required<Resource>();

  protected hideAnnotations = signal(true);

  protected readonly hiddenAnnotationCount = computed(() => {
    return countHiddenAnnotations(this.resource());
  });

  protected readonly yamlContent = computed(() => {
    return resourceToYaml(this.resource(), this.hideAnnotations());
  });

  toggleAnnotations(): void {
    this.hideAnnotations.update((v) => !v);
  }

  onCopy(): void {
    navigator.clipboard.writeText(this.yamlContent()).then(() => {
      this.messageToast.open('YAML copied to clipboard', {
        duration: 3000,
      });
    });
  }

  onDownload(): void {
    const yaml = this.yamlContent();
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.resource().metadata.name}.yaml`;
    link.click();
    URL.revokeObjectURL(url);
  }

  onClose(): void {
    this.store.dispatch(closeYamlPanel());
  }
}

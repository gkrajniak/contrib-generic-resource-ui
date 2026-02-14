import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { BusyIndicatorComponent } from '@fundamental-ngx/core/busy-indicator';
import { ToolbarComponent, ToolbarSpacerDirective, ToolbarSeparatorComponent } from '@fundamental-ngx/core/toolbar';
import { TitleComponent } from '@fundamental-ngx/core/title';
import { MessageToastService } from '@fundamental-ngx/core/message-toast';
import { Resource } from 'models/index';
import { Store } from '@ngrx/store';
import { closeYamlPanel } from 'state/ui/ui.actions';
import { selectResourceContext } from 'state/context/context.selectors';
import { GenericResourceService } from 'services/resource/generic-resource.service';
import { filter, take } from 'rxjs';
import { MonacoYamlViewerComponent } from 'components/shared/monaco-yaml-viewer/monaco-yaml-viewer.component';

@Component({
  selector: 'app-yaml-panel',
  imports: [
    ButtonComponent,
    BusyIndicatorComponent,
    ToolbarComponent,
    ToolbarSpacerDirective,
    ToolbarSeparatorComponent,
    TitleComponent,
    MonacoYamlViewerComponent,
  ],
  template: `
    <div class="yaml-panel-container">
      <fd-toolbar size="xs">
        <h5 fd-title [headerSize]="5">YAML</h5>
        <fd-toolbar-spacer></fd-toolbar-spacer>
        @if (isOutdated()) {
          <button
            fd-button
            fdType="transparent"
            glyph="refresh"
            ariaLabel="Refresh - newer version available"
            [disabled]="loading()"
            (click)="onRefresh()"
          >
            Refresh
          </button>
          <fd-toolbar-separator></fd-toolbar-separator>
        }
        <button
          fd-button
          fdType="transparent"
          [glyph]="hideManagedFields() ? 'show' : 'hide'"
          [ariaLabel]="hideManagedFields() ? 'Show system fields' : 'Hide system fields'"
          [disabled]="loading()"
          (click)="toggleManagedFields()"
        >
          {{ hideManagedFields() ? 'Show system fields' : 'Hide system fields' }}
        </button>
        <fd-toolbar-separator></fd-toolbar-separator>
        <!-- eslint-disable @angular-eslint/template/elements-content -->
        <button
          fd-button
          fdType="transparent"
          glyph="copy"
          ariaLabel="Copy"
          [disabled]="loading()"
          (click)="onCopy()"
        ></button>
        <button
          fd-button
          fdType="transparent"
          glyph="download"
          ariaLabel="Download"
          [disabled]="loading()"
          (click)="onDownload()"
        ></button>
        <button
          fd-button
          fdType="transparent"
          glyph="decline"
          ariaLabel="Close"
          (click)="onClose()"
        ></button>
        <!-- eslint-enable @angular-eslint/template/elements-content -->
      </fd-toolbar>

      <fd-busy-indicator [loading]="loading()" size="m" [block]="true" class="yaml-content-container">
        @if (error()) {
          <div class="error-message">
            <span class="error-icon">&#9888;</span>
            <span>{{ error() }}</span>
          </div>
        } @else {
          <app-monaco-yaml-viewer [content]="yamlContent()"></app-monaco-yaml-viewer>
        }
      </fd-busy-indicator>
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
      .yaml-content-container {
        flex: 1;
        overflow: hidden;
      }
      .error-message {
        padding: 1rem;
        color: var(--sapNegativeTextColor);
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .error-icon {
        font-size: 1.25rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YamlPanelComponent implements OnInit {
  private messageToast = inject(MessageToastService);
  private store = inject(Store);
  private resourceService = inject(GenericResourceService);
  private destroyRef = inject(DestroyRef);

  readonly resource = input.required<Resource>();

  protected readonly resourceContext = toSignal(this.store.select(selectResourceContext));
  protected readonly rawYamlContent = signal<string>('');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly yamlResourceVersion = signal<string | null>(null);
  protected readonly hideManagedFields = signal(true);

  protected readonly yamlContent = computed(() => {
    const raw = this.rawYamlContent();
    if (!raw) return '';
    return this.hideManagedFields() ? this.stripManagedFieldsAndAnnotations(raw) : raw;
  });

  protected readonly currentResourceVersion = computed(() => {
    return this.resource()?.metadata?.resourceVersion ?? null;
  });

  protected readonly isOutdated = computed(() => {
    const yamlVersion = this.yamlResourceVersion();
    const currentVersion = this.currentResourceVersion();
    if (!yamlVersion || !currentVersion) return false;
    return yamlVersion !== currentVersion;
  });

  constructor() {
    effect(() => {
      const yaml = this.rawYamlContent();
      if (yaml) {
        this.yamlResourceVersion.set(this.extractResourceVersion(yaml));
      }
    });
  }

  ngOnInit(): void {
    this.loadYaml();
  }

  private extractResourceVersion(yaml: string): string | null {
    const match = yaml.match(/resourceVersion:\s*["']?(\d+)["']?/);
    return match ? match[1] : null;
  }

  private stripManagedFieldsAndAnnotations(yaml: string): string {
    const lines = yaml.split('\n');
    const result: string[] = [];
    let inManagedFields = false;
    let managedFieldsIndent = 0;
    let skipNextLine = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (skipNextLine) {
        skipNextLine = false;
        continue;
      }

      // Check if this is the managedFields key
      const managedFieldsMatch = line.match(/^(\s*)managedFields:/);
      if (managedFieldsMatch) {
        inManagedFields = true;
        managedFieldsIndent = managedFieldsMatch[1].length;
        continue;
      }

      if (inManagedFields) {
        // Check if we're still in managedFields section by indent
        const currentIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
        const isEmptyOrComment = line.trim() === '' || line.trim().startsWith('#');

        // Exit managedFields if we find a line with same or less indentation
        // that isn't empty or a continuation
        if (!isEmptyOrComment && currentIndent <= managedFieldsIndent && line.trim() !== '') {
          inManagedFields = false;
          result.push(line);
        }
        // Skip lines within managedFields
        continue;
      }

      // Skip kubectl.kubernetes.io/last-applied-configuration annotation
      if (line.includes('kubectl.kubernetes.io/last-applied-configuration:')) {
        // Check if value is on the same line or next line (for multi-line values)
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.trim().startsWith('|')) {
          // Multi-line value - skip until we find a line with less/equal indentation
          const annotationIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
          i++; // Skip the '|' line
          while (i + 1 < lines.length) {
            const checkLine = lines[i + 1];
            const checkIndent = checkLine.match(/^(\s*)/)?.[1].length ?? 0;
            const isEmpty = checkLine.trim() === '';
            if (!isEmpty && checkIndent <= annotationIndent + 2) {
              break;
            }
            i++;
          }
        }
        continue;
      }

      result.push(line);
    }

    return result.join('\n');
  }

  private loadYaml(): void {
    this.loading.set(true);
    this.error.set(null);

    this.store
      .select(selectResourceContext)
      .pipe(
        filter((ctx) => !!ctx),
        take(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((ctx) => {
        if (!ctx) {
          this.error.set('Context not available');
          this.loading.set(false);
          return;
        }

        const resourceName = this.resource().metadata.name;

        this.resourceService
          .readYaml(resourceName, ctx.resourceDefinition, ctx)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (yaml) => {
              this.rawYamlContent.set(yaml);
              this.loading.set(false);
            },
            error: (err) => {
              console.error('Failed to load YAML:', err);
              this.error.set('Failed to load YAML');
              this.loading.set(false);
            },
          });
      });
  }

  toggleManagedFields(): void {
    this.hideManagedFields.update((v) => !v);
  }

  onRefresh(): void {
    this.loadYaml();
  }

  onCopy(): void {
    const content = this.yamlContent();
    if (!content) return;

    navigator.clipboard.writeText(content).then(() => {
      this.messageToast.open('YAML copied to clipboard', {
        duration: 3000,
      });
    });
  }

  onDownload(): void {
    const yaml = this.yamlContent();
    if (!yaml) return;

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

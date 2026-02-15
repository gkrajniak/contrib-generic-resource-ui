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
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { BusyIndicatorComponent } from '@fundamental-ngx/core/busy-indicator';
import { ToolbarComponent, ToolbarSpacerDirective, ToolbarSeparatorComponent } from '@fundamental-ngx/core/toolbar';
import { TitleComponent } from '@fundamental-ngx/core/title';
import { MessageToastService } from '@fundamental-ngx/core/message-toast';
import { Resource } from 'models/index';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { closeYamlPanel } from 'state/ui/ui.actions';
import { selectResourceContext } from 'state/context/context.selectors';
import { GenericResourceService } from 'services/resource/generic-resource.service';
import { filter, take } from 'rxjs';
import { MonacoYamlViewerComponent } from 'components/shared/monaco-yaml-viewer/monaco-yaml-viewer.component';
import { applyYaml, applyYamlFailure, applyYamlSuccess } from 'state/resources/resources.actions';

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
        @if (editMode()) {
          <button
            fd-button
            fdType="emphasized"
            glyph="save"
            ariaLabel="Save"
            [disabled]="saving() || !hasChanges()"
            (click)="onSave()"
          >
            Save
          </button>
          <button
            fd-button
            fdType="transparent"
            glyph="decline"
            ariaLabel="Cancel editing"
            [disabled]="saving()"
            (click)="onCancelEdit()"
          >
            Cancel
          </button>
          <fd-toolbar-separator></fd-toolbar-separator>
        } @else {
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
            glyph="edit"
            ariaLabel="Edit"
            [disabled]="loading()"
            (click)="onEdit()"
          >
            Edit
          </button>
          <fd-toolbar-separator></fd-toolbar-separator>
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
        }
        <!-- eslint-disable @angular-eslint/template/elements-content -->
        <button
          fd-button
          fdType="transparent"
          glyph="copy"
          ariaLabel="Copy"
          [disabled]="loading() || saving()"
          (click)="onCopy()"
        ></button>
        <button
          fd-button
          fdType="transparent"
          glyph="download"
          ariaLabel="Download"
          [disabled]="loading() || saving()"
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

      <fd-busy-indicator [loading]="loading() || saving()" size="m" [block]="true" class="yaml-content-container">
        @if (error()) {
          <div class="error-message">
            <span class="error-icon">&#9888;</span>
            <span>{{ error() }}</span>
          </div>
        } @else {
          <app-monaco-yaml-viewer
            [content]="displayContent()"
            [readOnly]="!editMode()"
            (contentChanged)="onContentChanged($event)"
          ></app-monaco-yaml-viewer>
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
  private actions$ = inject(Actions);
  private resourceService = inject(GenericResourceService);
  private destroyRef = inject(DestroyRef);

  readonly resource = input.required<Resource>();
  readonly monacoEditor = viewChild(MonacoYamlViewerComponent);

  protected readonly resourceContext = toSignal(this.store.select(selectResourceContext));
  protected readonly rawYamlContent = signal<string>('');
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly yamlResourceVersion = signal<string | null>(null);
  protected readonly hideManagedFields = signal(true);
  protected readonly editMode = signal(false);
  protected readonly editedContent = signal<string>('');

  protected readonly yamlContent = computed(() => {
    const raw = this.rawYamlContent();
    if (!raw) return '';
    return this.hideManagedFields() ? this.stripManagedFieldsAndAnnotations(raw) : raw;
  });

  protected readonly displayContent = computed(() => {
    if (this.editMode()) {
      return this.editedContent();
    }
    return this.yamlContent();
  });

  protected readonly hasChanges = computed(() => {
    if (!this.editMode()) return false;
    return this.editedContent() !== this.yamlContent();
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

    this.actions$
      .pipe(ofType(applyYamlSuccess), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.saving.set(false);
        this.editMode.set(false);
        this.messageToast.open('YAML applied successfully', { duration: 3000 });
        this.loadYaml();
      });

    this.actions$
      .pipe(ofType(applyYamlFailure), takeUntilDestroyed(this.destroyRef))
      .subscribe(({ error }) => {
        this.saving.set(false);
        this.messageToast.open(`Failed to apply YAML: ${error}`, { duration: 5000 });
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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const managedFieldsMatch = line.match(/^(\s*)managedFields:/);
      if (managedFieldsMatch) {
        inManagedFields = true;
        managedFieldsIndent = managedFieldsMatch[1].length;
        continue;
      }

      if (inManagedFields) {
        const currentIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
        const isEmptyOrComment = line.trim() === '' || line.trim().startsWith('#');

        if (!isEmptyOrComment && currentIndent <= managedFieldsIndent && line.trim() !== '') {
          inManagedFields = false;
          result.push(line);
        }
        continue;
      }

      if (line.includes('kubectl.kubernetes.io/last-applied-configuration:')) {
        // Check if it's a multiline block scalar (ends with | or >)
        if (line.trimEnd().endsWith('|') || line.trimEnd().endsWith('>')) {
          const annotationIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
          // Skip all continuation lines (lines with greater indentation)
          while (i + 1 < lines.length) {
            const checkLine = lines[i + 1];
            const checkIndent = checkLine.match(/^(\s*)/)?.[1].length ?? 0;
            const isEmpty = checkLine.trim() === '';
            if (!isEmpty && checkIndent <= annotationIndent) {
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

  onEdit(): void {
    this.editedContent.set(this.yamlContent());
    this.editMode.set(true);
  }

  onCancelEdit(): void {
    this.editMode.set(false);
    this.editedContent.set('');
  }

  onSave(): void {
    const yaml = this.monacoEditor()?.getValue() ?? this.editedContent();
    if (!yaml) return;

    this.saving.set(true);
    this.store.dispatch(applyYaml({ yaml }));
  }

  onContentChanged(content: string): void {
    this.editedContent.set(content);
  }

  onRefresh(): void {
    this.loadYaml();
  }

  onCopy(): void {
    const content = this.editMode()
      ? this.monacoEditor()?.getValue() ?? this.editedContent()
      : this.yamlContent();
    if (!content) return;

    navigator.clipboard.writeText(content).then(() => {
      this.messageToast.open('YAML copied to clipboard', {
        duration: 3000,
      });
    });
  }

  onDownload(): void {
    const yaml = this.editMode()
      ? this.monacoEditor()?.getValue() ?? this.editedContent()
      : this.yamlContent();
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

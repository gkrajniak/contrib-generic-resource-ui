import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { ButtonBarComponent } from '@fundamental-ngx/core/bar';
import { DialogModule } from '@fundamental-ngx/core/dialog';
import { FormItemComponent, FormLabelComponent, FormControlComponent } from '@fundamental-ngx/core/form';
import { InputGroupModule } from '@fundamental-ngx/core/input-group';
import { SegmentedButtonModule } from '@fundamental-ngx/core/segmented-button';
import { BusyIndicatorComponent } from '@fundamental-ngx/core/busy-indicator';
import { Store } from '@ngrx/store';
import { Subject, filter, take, takeUntil } from 'rxjs';
import { Resource } from 'models/index';
import { createResource, updateResource } from 'state/resources/resources.actions';
import {
  selectResourceByName,
  selectSaving,
} from 'state/resources/resources.selectors';
import { selectFieldAnalysis } from 'state/schema/schema.selectors';
import {
  selectEditingResourceName,
  selectModalMode,
  selectModalOpen,
} from 'state/ui/ui.selectors';
import { closeModal } from 'state/ui/ui.actions';
import { FormFieldGeneratorService } from 'services/view-generator/form-field-generator.service';
import { resourceToYaml, yamlToResource, stripTypename } from 'utils/yaml-utils';

type EditorMode = 'form' | 'yaml';

@Component({
  selector: 'app-create-edit-modal',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonComponent,
    ButtonBarComponent,
    DialogModule,
    FormItemComponent,
    FormLabelComponent,
    FormControlComponent,
    InputGroupModule,
    SegmentedButtonModule,
    BusyIndicatorComponent,
  ],
  template: `
    @if (isOpen()) {
      <fd-dialog>
        <fd-dialog-header>
          <h3 fd-dialog-title>{{ title() }}</h3>
        </fd-dialog-header>

        <fd-dialog-body>
          <fd-busy-indicator [loading]="saving()" size="m" [block]="true">
            <div class="mode-selector">
              <fd-segmented-button>
                <button
                  fd-button
                  [class.is-selected]="editorMode() === 'form'"
                  (click)="setEditorMode('form')"
                >
                  Form
                </button>
                <button
                  fd-button
                  [class.is-selected]="editorMode() === 'yaml'"
                  (click)="setEditorMode('yaml')"
                >
                  YAML
                </button>
              </fd-segmented-button>
            </div>

            @if (editorMode() === 'form') {
              <form [formGroup]="resourceForm">
                <div fd-form-item>
                  <label fd-form-label [required]="true">Name</label>
                  <input
                    fd-form-control
                    formControlName="name"
                    placeholder="Enter resource name"
                    [readonly]="isEditMode()"
                  />
                </div>

                @for (field of formFields(); track field.key) {
                  <div fd-form-item>
                    <label fd-form-label [required]="field.required">
                      {{ field.label }}
                    </label>
                    @if (field.type === 'boolean') {
                      <input
                        type="checkbox"
                        fd-form-control
                        [formControlName]="field.key"
                      />
                    } @else if (field.type === 'number') {
                      <input
                        type="number"
                        fd-form-control
                        [formControlName]="field.key"
                        [placeholder]="field.placeholder || ''"
                      />
                    } @else if (field.type === 'yaml' || field.type === 'textarea') {
                      <textarea
                        fd-form-control
                        [formControlName]="field.key"
                        [placeholder]="field.placeholder || ''"
                        rows="5"
                      ></textarea>
                    } @else {
                      <input
                        type="text"
                        fd-form-control
                        [formControlName]="field.key"
                        [placeholder]="field.placeholder || ''"
                      />
                    }
                  </div>
                }
              </form>
            } @else {
              <textarea
                class="yaml-editor"
                [(ngModel)]="yamlContent"
                rows="20"
              ></textarea>
              @if (yamlError()) {
                <div class="yaml-error">{{ yamlError() }}</div>
              }
            }
          </fd-busy-indicator>
        </fd-dialog-body>

        <fd-dialog-footer>
          <fd-button-bar
            fdType="transparent"
            (click)="onCancel()"
          >Cancel</fd-button-bar>
          <fd-button-bar
            fdType="emphasized"
            [disabled]="!canSubmit()"
            (click)="onSubmit()"
          >{{ isEditMode() ? 'Update' : 'Create' }}</fd-button-bar>
        </fd-dialog-footer>
      </fd-dialog>
    }
  `,
  styles: [
    `
      .mode-selector {
        margin-bottom: 1rem;
      }
      .yaml-editor {
        width: 100%;
        font-family: monospace;
        font-size: 0.875rem;
      }
      .yaml-error {
        color: var(--sapNegativeColor);
        margin-top: 0.5rem;
        font-size: 0.875rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateEditModalComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private fb = inject(FormBuilder);
  private formFieldGenerator = inject(FormFieldGeneratorService);
  private destroy$ = new Subject<void>();

  protected readonly isOpen = toSignal(this.store.select(selectModalOpen), {
    initialValue: false,
  });
  protected readonly modalMode = toSignal(this.store.select(selectModalMode));
  protected readonly editingResourceName = toSignal(
    this.store.select(selectEditingResourceName)
  );
  protected readonly fieldAnalysis = toSignal(
    this.store.select(selectFieldAnalysis)
  );
  protected readonly saving = toSignal(this.store.select(selectSaving), {
    initialValue: false,
  });

  protected readonly editorMode = signal<EditorMode>('form');
  protected readonly yamlError = signal<string | null>(null);
  protected yamlContent = '';
  protected resourceForm: FormGroup;

  protected readonly isEditMode = computed(() => this.modalMode() === 'edit');
  protected readonly title = computed(() =>
    this.isEditMode() ? 'Edit Resource' : 'Create Resource'
  );

  protected readonly formFields = computed(() => {
    const analysis = this.fieldAnalysis();
    if (!analysis) {
      return [];
    }
    return this.formFieldGenerator.generateFormFields(
      analysis.requiredInputFields,
      analysis.scalarSpecFields
    ).filter(f => f.key !== 'name');
  });

  constructor() {
    this.resourceForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/)]],
    });
  }

  ngOnInit(): void {
    this.store
      .select(selectEditingResourceName)
      .pipe(
        takeUntil(this.destroy$),
        filter((name) => !!name)
      )
      .subscribe((name) => {
        if (name) {
          this.store
            .select(selectResourceByName(name))
            .pipe(take(1))
            .subscribe((resource) => {
              if (resource) {
                this.loadResourceIntoForm(resource);
              }
            });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected setEditorMode(mode: EditorMode): void {
    if (mode === 'yaml' && this.editorMode() === 'form') {
      this.syncFormToYaml();
    } else if (mode === 'form' && this.editorMode() === 'yaml') {
      this.syncYamlToForm();
    }
    this.editorMode.set(mode);
  }

  protected canSubmit(): boolean {
    if (this.editorMode() === 'form') {
      return this.resourceForm.valid;
    }
    return !!this.yamlContent && !this.yamlError();
  }

  protected onCancel(): void {
    this.store.dispatch(closeModal());
    this.resetForm();
  }

  protected onSubmit(): void {
    let resource: Resource;

    if (this.editorMode() === 'yaml') {
      try {
        resource = yamlToResource(this.yamlContent);
      } catch (error) {
        this.yamlError.set('Invalid YAML');
        return;
      }
    } else {
      resource = this.buildResourceFromForm();
    }

    if (this.isEditMode()) {
      this.store.dispatch(updateResource({ resource }));
    } else {
      this.store.dispatch(createResource({ resource }));
    }

    this.store.dispatch(closeModal());
    this.resetForm();
  }

  private loadResourceIntoForm(resource: Resource): void {
    this.resourceForm.patchValue({
      name: resource.metadata.name,
    });

    if (resource.spec) {
      for (const [key, value] of Object.entries(resource.spec)) {
        if (this.resourceForm.contains(key)) {
          this.resourceForm.patchValue({ [key]: value });
        } else {
          this.resourceForm.addControl(key, this.fb.control(value));
        }
      }
    }

    this.yamlContent = resourceToYaml(stripTypename(resource));
  }

  private buildResourceFromForm(): Resource {
    const formValue = this.resourceForm.value;
    const { name, ...specFields } = formValue;

    return {
      metadata: {
        name,
      },
      spec: specFields,
    };
  }

  private syncFormToYaml(): void {
    const resource = this.buildResourceFromForm();
    this.yamlContent = resourceToYaml(resource);
    this.yamlError.set(null);
  }

  private syncYamlToForm(): void {
    try {
      const resource = yamlToResource(this.yamlContent);
      this.resourceForm.patchValue({
        name: resource.metadata?.name || '',
      });

      if (resource.spec) {
        for (const [key, value] of Object.entries(resource.spec)) {
          if (this.resourceForm.contains(key)) {
            this.resourceForm.patchValue({ [key]: value });
          }
        }
      }

      this.yamlError.set(null);
    } catch (error) {
      this.yamlError.set('Invalid YAML');
    }
  }

  private resetForm(): void {
    this.resourceForm.reset();
    this.yamlContent = '';
    this.yamlError.set(null);
    this.editorMode.set('form');
  }
}

import { SpecSectionComponent } from './spec-section/spec-section.component';
import { StatusSectionComponent } from './status-section/status-section.component';
import { YamlPanelComponent } from './yaml-panel/yaml-panel.component';
import { ReadyStatusBadgeComponent } from 'components/shared/ready-status-badge/ready-status-badge.component';
import { ValueCellComponent } from 'components/shared/value-cell/value-cell.component';
import { LabelsDisplayComponent } from 'components/shared/labels-display/labels-display.component';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { BusyIndicatorComponent } from '@fundamental-ngx/core/busy-indicator';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import {
  FacetComponent,
  FacetGroupComponent,
} from '@fundamental-ngx/core/facets';
import { FormLabelComponent } from '@fundamental-ngx/core/form';
import { ObjectStatusComponent } from '@fundamental-ngx/core/object-status';
import { ToolbarComponent } from '@fundamental-ngx/core/toolbar';
import {
  DynamicPageComponent,
  DynamicPageTitleComponent,
  DynamicPageGlobalActionsComponent,
  DynamicPageHeaderComponent,
  DynamicPageContentComponent,
} from '@fundamental-ngx/platform/dynamic-page';
import { Store } from '@ngrx/store';
import { combineLatest, filter, map, take } from 'rxjs';
import { ContextService } from 'services/context/context.service';
import { ReadyStatusDetectorService } from 'services/view-generator/ready-status-detector.service';
import { selectIsContextInitialized, selectResourceDefinition, selectResourceId } from 'state/context/context.selectors';
import { loadResourceDetail } from 'state/resources/resources.actions';
import {
  selectDetailLoading,
  selectSelectedResource,
} from 'state/resources/resources.selectors';
import { selectFieldAnalysis } from 'state/schema/schema.selectors';
import { openDeleteConfirmation, openEditModal, toggleYamlPanel } from 'state/ui/ui.actions';
import { selectYamlPanelOpen } from 'state/ui/ui.selectors';

@Component({
  selector: 'app-resource-detail-view',
  imports: [
    SpecSectionComponent,
    StatusSectionComponent,
    YamlPanelComponent,
    BusyIndicatorComponent,
    ButtonComponent,
    ToolbarComponent,
    FacetComponent,
    FacetGroupComponent,
    FormLabelComponent,
    ObjectStatusComponent,
    DynamicPageComponent,
    DynamicPageTitleComponent,
    DynamicPageGlobalActionsComponent,
    DynamicPageHeaderComponent,
    DynamicPageContentComponent,
    ReadyStatusBadgeComponent,
    ValueCellComponent,
    LabelsDisplayComponent,
  ],
  template: `
    <fd-busy-indicator [loading]="loading()" size="m" [block]="true">
      @if (resource()) {
        <fdp-dynamic-page ariaLabel="Resource Detail" size="large" [autoResponsive]="false">
          <fdp-dynamic-page-title
            [title]="resource()!.metadata.name"
            [subtitle]="subtitle()"
          >
            <fdp-dynamic-page-global-actions>
              <!-- eslint-disable @angular-eslint/template/elements-content -->
              <fd-toolbar fdType="transparent" [clearBorder]="true">
                <button
                  fd-button
                  fdType="transparent"
                  glyph="syntax"
                  label="YAML"
                  (click)="onToggleYaml()"
                ></button>
                <button
                  fd-button
                  glyph="edit"
                  label="Edit"
                  (click)="onEdit()"
                ></button>
                <button
                  fd-button
                  fdType="negative"
                  glyph="delete"
                  label="Delete"
                  (click)="onDelete()"
                ></button>
              </fd-toolbar>
              <!-- eslint-enable @angular-eslint/template/elements-content -->
            </fdp-dynamic-page-global-actions>
          </fdp-dynamic-page-title>

          <!-- eslint-disable @angular-eslint/template/label-has-associated-control -->
          <fdp-dynamic-page-header [collapsible]="true" [pinnable]="true">
            <fd-facet-group ariaLabel="Resource Metadata">
              <fd-facet type="key-value">
                <label fd-form-label [colon]="true">Status</label>
                <app-ready-status-badge
                  [status]="readyStatus()"
                  [showMessage]="true"
                ></app-ready-status-badge>
              </fd-facet>

              @if (resource()!.metadata.namespace) {
                <fd-facet type="key-value">
                  <label fd-form-label [colon]="true">Namespace</label>
                  <span fd-object-status [label]="resource()!.metadata.namespace"></span>
                </fd-facet>
              }

              <fd-facet type="key-value">
                <label fd-form-label [colon]="true">Created</label>
                <span>
                  <app-value-cell
                    [value]="resource()!.metadata.creationTimestamp"
                    type="date"
                  ></app-value-cell>
                </span>
              </fd-facet>

              <fd-facet type="key-value">
                <label fd-form-label [colon]="true">Resource Version</label>
                <span fd-object-status [label]="resource()!.metadata.resourceVersion"></span>
              </fd-facet>

              @if (resource()!.metadata.generation) {
                <fd-facet type="key-value">
                  <label fd-form-label [colon]="true">Generation</label>
                  <span fd-object-status [label]="resource()!.metadata.generation?.toString() ?? ''"></span>
                </fd-facet>
              }

              <fd-facet type="key-value" class="uid-facet">
                <label fd-form-label [colon]="true">UID</label>
                <span class="uid-text" [title]="resource()!.metadata.uid">
                  {{ truncateUid(resource()!.metadata.uid) }}
                </span>
              </fd-facet>

              <fd-facet type="custom" class="labels-facet">
                <div class="facet-labels-section">
                  <label fd-form-label [colon]="true">Labels</label>
                  <app-labels-display
                    [labels]="resource()!.metadata.labels"
                    [maxLabels]="5"
                  ></app-labels-display>
                </div>
              </fd-facet>

              <fd-facet type="custom" class="labels-facet">
                <div class="facet-labels-section">
                  <label fd-form-label [colon]="true">Annotations</label>
                  <app-labels-display
                    [labels]="resource()!.metadata.annotations"
                    [maxLabels]="3"
                    [hideAnnotations]="true"
                  ></app-labels-display>
                </div>
              </fd-facet>
            </fd-facet-group>
          </fdp-dynamic-page-header>
          <!-- eslint-enable @angular-eslint/template/label-has-associated-control -->

          <fdp-dynamic-page-content>
            <div class="sections-container">
              <app-spec-section
                [resource]="resource()!"
                [fieldAnalysis]="fieldAnalysis()"
              ></app-spec-section>

              <app-status-section
                [resource]="resource()!"
                [fieldAnalysis]="fieldAnalysis()"
              ></app-status-section>
            </div>
          </fdp-dynamic-page-content>
        </fdp-dynamic-page>
      }
    </fd-busy-indicator>

    <div class="yaml-panel" [class.open]="yamlPanelOpen()">
      @if (resource() && yamlPanelOpen()) {
        <app-yaml-panel [resource]="resource()!"></app-yaml-panel>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        position: relative;
      }
      .sections-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .yaml-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 400px;
        height: 100%;
        background: var(--sapBackgroundColor);
        border-left: 1px solid var(--sapGroup_TitleBorderColor);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 1000;
        box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
      }
      .yaml-panel.open {
        transform: translateX(0);
      }
      .uid-text {
        font-family: monospace;
        font-size: 0.8125rem;
      }
      .uid-facet {
        max-width: 200px;
      }
      .labels-facet {
        min-width: 200px;
      }
      .facet-labels-section {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      :host ::ng-deep {
        .fd-facet-group {
          display: flex;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .fd-facet {
          margin-bottom: 0;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceDetailViewComponent implements OnInit {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private contextService = inject(ContextService);
  private readyStatusDetector = inject(ReadyStatusDetectorService);

  protected readonly resource = toSignal(
    this.store.select(selectSelectedResource)
  );
  protected readonly resourceDefinition = toSignal(
    this.store.select(selectResourceDefinition)
  );
  protected readonly fieldAnalysis = toSignal(
    this.store.select(selectFieldAnalysis)
  );
  protected readonly loading = toSignal(this.store.select(selectDetailLoading), {
    initialValue: false,
  });
  protected readonly yamlPanelOpen = toSignal(
    this.store.select(selectYamlPanelOpen),
    { initialValue: false }
  );

  protected readonly readyStatus = computed(() => {
    const res = this.resource();
    return res ? this.readyStatusDetector.detectReadyStatus(res) : null;
  });

  protected readonly subtitle = computed(() => {
    const def = this.resourceDefinition();
    return def ? `${def.kind} details` : 'Resource details';
  });

  ngOnInit(): void {
    console.log('[DetailView] ngOnInit called');
    this.contextService.initialize();

    // Wait for context AND schema to be ready before loading resource detail
    combineLatest([
      this.store.select(selectIsContextInitialized),
      this.store.select(selectFieldAnalysis),
    ])
      .pipe(
        filter(([initialized, fieldAnalysis]) => initialized && !!fieldAnalysis),
        take(1)
      )
      .subscribe(() => {
        console.log('[DetailView] Context and schema initialized');
        combineLatest([
          this.route.paramMap.pipe(map((params) => params.get('name'))),
          this.store.select(selectResourceId),
        ])
          .pipe(
            map(([routeName, contextResourceId]) => {
              console.log('[DetailView] routeName:', routeName, 'contextResourceId:', contextResourceId);
              return routeName || contextResourceId;
            }),
            filter((name): name is string => !!name),
            take(1)
          )
          .subscribe((name) => {
            console.log('[DetailView] Loading resource detail for:', name);
            this.store.dispatch(loadResourceDetail({ resourceName: name }));
          });
      });
  }

  onToggleYaml(): void {
    this.store.dispatch(toggleYamlPanel());
  }

  onEdit(): void {
    const res = this.resource();
    if (res) {
      this.store.dispatch(openEditModal({ resourceName: res.metadata.name }));
    }
  }

  onDelete(): void {
    const res = this.resource();
    if (res) {
      this.store.dispatch(openDeleteConfirmation({ resourceName: res.metadata.name }));
    }
  }

  truncateUid(uid: string | undefined): string {
    if (!uid) {
      return '-';
    }
    if (uid.length > 20) {
      return uid.substring(0, 8) + '...' + uid.substring(uid.length - 8);
    }
    return uid;
  }
}

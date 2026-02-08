import { ListFiltersComponent } from './list-filters/list-filters.component';
import { ResourceTableComponent } from './resource-table/resource-table.component';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BusyIndicatorComponent } from '@fundamental-ngx/core/busy-indicator';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { ToolbarComponent } from '@fundamental-ngx/core/toolbar';
import {
  DynamicPageComponent,
  DynamicPageTitleComponent,
  DynamicPageGlobalActionsComponent,
  DynamicPageContentComponent,
} from '@fundamental-ngx/platform/dynamic-page';
import { Store } from '@ngrx/store';
import { ContextService } from 'services/context/context.service';
import { selectResourceDefinition } from 'state/context/context.selectors';
import { loadResources } from 'state/resources/resources.actions';
import {
  selectResources,
  selectResourcesLoading,
} from 'state/resources/resources.selectors';
import { selectFieldAnalysis, selectSchemaLoading } from 'state/schema/schema.selectors';
import { openCreateModal } from 'state/ui/ui.actions';
import { selectSearchTerm } from 'state/ui/ui.selectors';

@Component({
  selector: 'app-resource-list-view',
  imports: [
    ListFiltersComponent,
    ResourceTableComponent,
    BusyIndicatorComponent,
    ButtonComponent,
    ToolbarComponent,
    DynamicPageComponent,
    DynamicPageTitleComponent,
    DynamicPageGlobalActionsComponent,
    DynamicPageContentComponent,
  ],
  template: `
    <fd-busy-indicator [loading]="loading()" size="m" [block]="true">
      <fdp-dynamic-page ariaLabel="Resources" size="large" [autoResponsive]="false">
        <fdp-dynamic-page-title [title]="title()">
          <fdp-dynamic-page-global-actions>
            <fd-toolbar fdType="transparent" [clearBorder]="true">
              <button
                fd-button
                fdType="transparent"
                glyphPosition="before"
                glyph="refresh"
                label="Refresh"
                (click)="onRefresh()"
              >Refresh</button>
              <button
                fd-button
                fdType="emphasized"
                glyphPosition="before"
                glyph="add"
                label="Create"
                (click)="onCreate()"
              >Create</button>
            </fd-toolbar>
          </fdp-dynamic-page-global-actions>
        </fdp-dynamic-page-title>

        <fdp-dynamic-page-content>
          <app-list-filters></app-list-filters>
          <app-resource-table
            [resources]="filteredResources()"
            [fieldAnalysis]="fieldAnalysis()"
            [searchTerm]="searchTerm()"
          ></app-resource-table>
        </fdp-dynamic-page-content>
      </fdp-dynamic-page>
    </fd-busy-indicator>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceListViewComponent implements OnInit {
  private store = inject(Store);
  private contextService = inject(ContextService);

  protected readonly resourceDefinition = toSignal(
    this.store.select(selectResourceDefinition)
  );
  protected readonly resources = toSignal(this.store.select(selectResources), {
    initialValue: [],
  });
  protected readonly fieldAnalysis = toSignal(
    this.store.select(selectFieldAnalysis)
  );
  protected readonly searchTerm = toSignal(this.store.select(selectSearchTerm), {
    initialValue: '',
  });
  protected readonly resourcesLoading = toSignal(
    this.store.select(selectResourcesLoading),
    { initialValue: false }
  );
  protected readonly schemaLoading = toSignal(
    this.store.select(selectSchemaLoading),
    { initialValue: false }
  );

  protected readonly loading = () =>
    this.resourcesLoading() || this.schemaLoading();

  protected readonly title = computed(() => {
    const def = this.resourceDefinition();
    return def
      ? `${def.plural.charAt(0).toUpperCase()}${def.plural.slice(1)}`
      : 'Resources';
  });

  protected readonly filteredResources = () => {
    const resources = this.resources();
    const search = this.searchTerm().toLowerCase();

    if (!search) {
      return resources;
    }

    return resources.filter((resource) =>
      resource.metadata.name.toLowerCase().includes(search)
    );
  };

  ngOnInit(): void {
    this.contextService.initialize();
  }

  onRefresh(): void {
    this.store.dispatch(loadResources());
  }

  onCreate(): void {
    this.store.dispatch(openCreateModal());
  }
}

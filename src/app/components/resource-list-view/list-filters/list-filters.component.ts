import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { FormItemComponent, FormLabelComponent } from '@fundamental-ngx/core/form';
import { InputGroupModule } from '@fundamental-ngx/core/input-group';
import { Store } from '@ngrx/store';
import { clearFilters, setSearchFilter } from 'state/ui/ui.actions';
import {
  selectHasActiveFilters,
  selectSearchTerm,
} from 'state/ui/ui.selectors';

@Component({
  selector: 'app-list-filters',
  imports: [
    FormsModule,
    FormItemComponent,
    FormLabelComponent,
    InputGroupModule,
    ButtonComponent,
  ],
  template: `
    <div class="filters-container">
      <div fd-form-item>
        <label fd-form-label for="search">Search</label>
        <fd-input-group
          glyph="search"
          glyphAriaLabel="Search"
        >
          <input
            fd-input-group-input
            id="search"
            type="text"
            placeholder="Filter by name..."
            [ngModel]="searchTerm()"
            (ngModelChange)="onSearchChange($event)"
          />
        </fd-input-group>
      </div>

      @if (hasActiveFilters()) {
        <!-- eslint-disable-next-line @angular-eslint/template/elements-content -->
        <button
          fd-button
          fdType="transparent"
          label="Clear Filters"
          glyph="clear-filter"
          (click)="onClearFilters()"
        ></button>
      }
    </div>
  `,
  styles: [
    `
      .filters-container {
        display: flex;
        align-items: flex-end;
        gap: 1rem;
        padding: 0.5rem 0;
        margin-bottom: 1rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListFiltersComponent {
  private store = inject(Store);

  protected readonly searchTerm = toSignal(this.store.select(selectSearchTerm), {
    initialValue: '',
  });
  protected readonly hasActiveFilters = toSignal(
    this.store.select(selectHasActiveFilters),
    { initialValue: false }
  );

  onSearchChange(searchTerm: string): void {
    this.store.dispatch(setSearchFilter({ searchTerm }));
  }

  onClearFilters(): void {
    this.store.dispatch(clearFilters());
  }
}

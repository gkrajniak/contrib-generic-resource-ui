import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { LinkComponent } from '@fundamental-ngx/core/link';
import { HIDDEN_ANNOTATION_PREFIXES } from 'utils/yaml-utils';

interface LabelEntry {
  key: string;
  value: string;
  isHidden: boolean;
}

@Component({
  selector: 'app-labels-display',
  imports: [LinkComponent],
  template: `
    @if (allEntries().length > 0) {
      <div class="labels-container">
        @for (label of visibleEntries(); track label.key) {
          <span class="label-tag" [title]="label.key + '=' + label.value">
            <span class="label-key">{{ label.key }}</span>
            <span class="label-value">{{ truncateValue(label.value) }}</span>
          </span>
        }
        @if (hiddenEntries().length > 0 && !showHidden()) {
          <a fd-link (click)="toggleHidden()" class="show-more-link">
            +{{ hiddenEntries().length }} hidden
          </a>
        }
        @if (showHidden()) {
          @for (label of hiddenEntries(); track label.key) {
            <span class="label-tag hidden-tag" [title]="label.key + '=' + label.value">
              <span class="label-key">{{ label.key }}</span>
              <span class="label-value">{{ truncateValue(label.value) }}</span>
            </span>
          }
          <a fd-link (click)="toggleHidden()" class="show-more-link">
            Show less
          </a>
        }
      </div>
    } @else {
      <span class="empty-text">None</span>
    }
  `,
  styles: [
    `
      .labels-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
        align-items: center;
      }
      .label-tag {
        display: inline-flex;
        font-size: 0.75rem;
        border-radius: 4px;
        overflow: hidden;
        border: 1px solid var(--sapGroup_TitleBorderColor);
        max-width: 100%;
      }
      .label-key {
        background: var(--sapList_Background);
        padding: 0.25rem 0.5rem;
        color: var(--sapContent_LabelColor);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
      }
      .label-value {
        background: var(--sapBackgroundColor);
        padding: 0.25rem 0.5rem;
        color: var(--sapTextColor);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 250px;
      }
      .hidden-tag {
        opacity: 0.7;
      }
      .show-more-link {
        font-size: 0.75rem;
        cursor: pointer;
      }
      .empty-text {
        color: var(--sapContent_DisabledTextColor);
        font-size: 0.875rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelsDisplayComponent {
  readonly labels = input<Record<string, string> | null | undefined>();
  readonly maxLabels = input(10);
  readonly hideAnnotations = input(false);

  protected showHidden = signal(false);

  protected readonly allEntries = computed((): LabelEntry[] => {
    const labelsObj = this.labels();
    if (!labelsObj || typeof labelsObj !== 'object') {
      return [];
    }

    return Object.entries(labelsObj).map(([key, value]) => ({
      key,
      value,
      isHidden: this.hideAnnotations() && this.shouldHideAnnotation(key),
    }));
  });

  protected readonly visibleEntries = computed(() => {
    return this.allEntries()
      .filter((e) => !e.isHidden)
      .slice(0, this.maxLabels());
  });

  protected readonly hiddenEntries = computed(() => {
    const visible = this.allEntries().filter((e) => !e.isHidden);
    const beyondMax = visible.slice(this.maxLabels());
    const hiddenByDefault = this.allEntries().filter((e) => e.isHidden);
    return [...beyondMax, ...hiddenByDefault];
  });

  protected toggleHidden(): void {
    this.showHidden.update((v) => !v);
  }

  protected truncateValue(value: string): string {
    if (value.length > 50) {
      return value.substring(0, 47) + '...';
    }
    return value;
  }

  private shouldHideAnnotation(key: string): boolean {
    return HIDDEN_ANNOTATION_PREFIXES.some(
      (prefix) => key === prefix || key.startsWith(prefix)
    );
  }
}

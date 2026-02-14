import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { IconComponent } from '@fundamental-ngx/core/icon';
import { ButtonComponent } from '@fundamental-ngx/core/button';
import { Resource } from 'models/index';
import { CopyButtonComponent } from 'components/shared/copy-button/copy-button.component';

interface DataEntry {
  key: string;
  value: string;
  isMultiline: boolean;
  isBinary: boolean;
  language: string;
}

/**
 * Data Section Component
 *
 * Renders ConfigMap/Secret `data` and `binaryData` fields.
 * Each key-value pair is displayed with syntax highlighting for known file types.
 */
@Component({
  selector: 'app-data-section',
  imports: [
    IconComponent,
    ButtonComponent,
    CopyButtonComponent,
  ],
  template: `
    @if (hasData()) {
      <div class="data-section">
        <div class="section-header">
          <fd-icon glyph="documents" class="header-icon"></fd-icon>
          <h3 class="section-title">Data</h3>
          <span class="entry-count">{{ dataEntries().length }} {{ dataEntries().length === 1 ? 'key' : 'keys' }}</span>
        </div>

        <div class="data-entries">
          @for (entry of dataEntries(); track entry.key) {
            <div class="data-entry" [class.expanded]="expandedKeys().has(entry.key)">
              <div class="entry-header" (click)="toggleEntry(entry.key)">
                <fd-icon
                  [glyph]="expandedKeys().has(entry.key) ? 'navigation-down-arrow' : 'navigation-right-arrow'"
                  class="expand-icon"
                ></fd-icon>
                <fd-icon [glyph]="getFileIcon(entry.key)" class="file-icon"></fd-icon>
                <span class="entry-key">{{ entry.key }}</span>
                @if (entry.isBinary) {
                  <span class="binary-badge">binary</span>
                }
                <span class="entry-size">{{ formatSize(entry.value.length) }}</span>
                <app-copy-button [value]="entry.value" [label]="entry.key"></app-copy-button>
              </div>

              @if (expandedKeys().has(entry.key)) {
                <div class="entry-content">
                  @if (entry.isBinary) {
                    <div class="binary-preview">
                      <span class="binary-message">Binary data ({{ formatSize(entry.value.length) }})</span>
                    </div>
                  } @else {
                    <pre class="code-block" [class]="'language-' + entry.language">{{ entry.value }}</pre>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .data-section {
        padding: 1rem;
        background: var(--sapGroup_ContentBackground);
        border-radius: 8px;
        border: 1px solid var(--sapGroup_TitleBorderColor);
      }
      .section-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding-bottom: 0.75rem;
        border-bottom: 2px solid var(--sapGroup_TitleBorderColor);
      }
      .header-icon {
        font-size: 1.25rem;
        color: var(--sapContent_IconColor);
      }
      .section-title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--sapTextColor);
        flex: 1;
      }
      .entry-count {
        font-size: 0.75rem;
        color: var(--sapContent_LabelColor);
        background: var(--sapButton_Lite_Background);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
      }
      .data-entries {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .data-entry {
        border: 1px solid var(--sapGroup_TitleBorderColor);
        border-radius: 6px;
        overflow: hidden;
      }
      .data-entry.expanded {
        border-color: var(--sapContent_ForegroundBorderColor);
      }
      .entry-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: var(--sapList_Background);
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .entry-header:hover {
        background: var(--sapList_Hover_Background);
      }
      .expand-icon {
        font-size: 0.75rem;
        color: var(--sapContent_NonInteractiveIconColor);
        flex-shrink: 0;
      }
      .file-icon {
        font-size: 1rem;
        color: var(--sapContent_IconColor);
        flex-shrink: 0;
      }
      .entry-key {
        font-family: var(--sapFontMonospacedFamily, monospace);
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--sapTextColor);
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .binary-badge {
        font-size: 0.625rem;
        text-transform: uppercase;
        padding: 0.125rem 0.375rem;
        background: var(--sapInformationBackground);
        color: var(--sapInformativeTextColor);
        border-radius: 3px;
        font-weight: 600;
      }
      .entry-size {
        font-size: 0.75rem;
        color: var(--sapContent_LabelColor);
        flex-shrink: 0;
      }
      .entry-content {
        border-top: 1px solid var(--sapGroup_TitleBorderColor);
      }
      .code-block {
        margin: 0;
        padding: 1rem;
        background: var(--sapShell_Background, #1e1e1e);
        color: var(--sapShell_TextColor, #d4d4d4);
        font-family: var(--sapFontMonospacedFamily, 'Consolas', 'Monaco', monospace);
        font-size: 0.8125rem;
        line-height: 1.5;
        overflow-x: auto;
        white-space: pre;
        max-height: 400px;
        overflow-y: auto;
      }
      .binary-preview {
        padding: 1rem;
        background: var(--sapBackgroundColor);
        text-align: center;
      }
      .binary-message {
        font-size: 0.875rem;
        color: var(--sapContent_LabelColor);
        font-style: italic;
      }
      /* Light theme adjustments */
      @media (prefers-color-scheme: light) {
        .code-block {
          background: #f5f5f5;
          color: #333;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataSectionComponent {
  readonly resource = input.required<Resource>();

  protected readonly expandedKeys = signal<Set<string>>(new Set());

  protected readonly hasData = computed(() => {
    const res = this.resource();
    const data = (res as any).data;
    const binaryData = (res as any).binaryData;
    return (data && Object.keys(data).length > 0) ||
           (binaryData && Object.keys(binaryData).length > 0);
  });

  protected readonly dataEntries = computed((): DataEntry[] => {
    const res = this.resource();
    const data = (res as any).data ?? {};
    const binaryData = (res as any).binaryData ?? {};
    const entries: DataEntry[] = [];

    // Regular data entries
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        entries.push({
          key,
          value,
          isMultiline: value.includes('\n'),
          isBinary: false,
          language: this.detectLanguage(key, value),
        });
      }
    }

    // Binary data entries
    for (const [key, value] of Object.entries(binaryData)) {
      if (typeof value === 'string') {
        entries.push({
          key,
          value: `[Base64 encoded: ${value.length} characters]`,
          isMultiline: false,
          isBinary: true,
          language: 'text',
        });
      }
    }

    // Sort by key name
    return entries.sort((a, b) => a.key.localeCompare(b.key));
  });

  protected toggleEntry(key: string): void {
    const current = this.expandedKeys();
    const updated = new Set(current);
    if (updated.has(key)) {
      updated.delete(key);
    } else {
      updated.add(key);
    }
    this.expandedKeys.set(updated);
  }

  protected getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';

    const iconMap: Record<string, string> = {
      'yaml': 'syntax',
      'yml': 'syntax',
      'json': 'syntax',
      'xml': 'syntax',
      'html': 'syntax',
      'css': 'syntax',
      'js': 'syntax',
      'ts': 'syntax',
      'sh': 'command-line-interfaces',
      'bash': 'command-line-interfaces',
      'py': 'syntax',
      'go': 'syntax',
      'conf': 'settings',
      'cfg': 'settings',
      'ini': 'settings',
      'properties': 'settings',
      'env': 'settings',
      'crt': 'locked',
      'pem': 'locked',
      'key': 'locked',
      'cert': 'locked',
      'ca': 'locked',
    };

    // Check for certificate content
    if (filename.includes('ca') || filename.includes('cert') || filename.includes('crt')) {
      return 'locked';
    }

    return iconMap[ext] ?? 'document';
  }

  protected detectLanguage(filename: string, content: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';

    const langMap: Record<string, string> = {
      'yaml': 'yaml',
      'yml': 'yaml',
      'json': 'json',
      'xml': 'xml',
      'html': 'html',
      'css': 'css',
      'js': 'javascript',
      'ts': 'typescript',
      'sh': 'shell',
      'bash': 'shell',
      'py': 'python',
      'go': 'go',
      'conf': 'ini',
      'cfg': 'ini',
      'ini': 'ini',
      'properties': 'properties',
      'env': 'shell',
    };

    if (langMap[ext]) {
      return langMap[ext];
    }

    // Content-based detection
    if (content.startsWith('-----BEGIN')) {
      return 'text'; // Certificate
    }
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      return 'json';
    }
    if (content.includes(': ') && (content.includes('\n  ') || content.includes('\n-'))) {
      return 'yaml';
    }

    return 'text';
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

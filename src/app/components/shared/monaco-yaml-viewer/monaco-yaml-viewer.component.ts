import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  effect,
  input,
  viewChild,
} from '@angular/core';
import type * as Monaco from 'monaco-editor';

@Component({
  selector: 'app-monaco-yaml-viewer',
  standalone: true,
  template: `<div #editorContainer class="editor-container"></div>`,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
      }
      .editor-container {
        height: 100%;
        width: 100%;
      }
    `,
  ],
})
export class MonacoYamlViewerComponent implements OnInit, OnDestroy {
  readonly content = input<string>('');
  readonly editorContainer = viewChild.required<ElementRef<HTMLDivElement>>('editorContainer');

  private editor: Monaco.editor.IStandaloneCodeEditor | null = null;
  private monaco: typeof Monaco | null = null;

  constructor() {
    effect(() => {
      const newContent = this.content();
      if (this.editor && newContent !== undefined) {
        const currentValue = this.editor.getValue();
        if (currentValue !== newContent) {
          this.editor.setValue(newContent);
        }
      }
    });
  }

  ngOnInit(): void {
    this.loadMonaco();
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.dispose();
    }
  }

  private loadMonaco(): void {
    const onGotAmdLoader = () => {
      (window as any).require.config({
        paths: { vs: 'assets/monaco/vs' },
      });

      (window as any).require(['vs/editor/editor.main'], () => {
        this.monaco = (window as any).monaco;
        this.initEditor();
      });
    };

    if (!(window as any).require) {
      const loaderScript = document.createElement('script');
      loaderScript.type = 'text/javascript';
      loaderScript.src = 'assets/monaco/vs/loader.js';
      loaderScript.addEventListener('load', onGotAmdLoader);
      document.body.appendChild(loaderScript);
    } else {
      onGotAmdLoader();
    }
  }

  private initEditor(): void {
    if (!this.monaco) return;

    const container = this.editorContainer().nativeElement;

    this.editor = this.monaco.editor.create(container, {
      value: this.content(),
      language: 'yaml',
      theme: this.getTheme(),
      readOnly: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      foldingStrategy: 'indentation',
      automaticLayout: true,
      fontSize: 13,
      fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
      lineHeight: 20,
      padding: { top: 8, bottom: 8 },
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        useShadows: false,
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
      renderLineHighlight: 'none',
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      contextmenu: false,
    });

    // Listen for theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.monaco && this.editor) {
        this.monaco.editor.setTheme(this.getTheme());
      }
    });
  }

  private getTheme(): string {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs';
  }
}

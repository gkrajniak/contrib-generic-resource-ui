import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, shareReplay } from 'rxjs';
import { ResourceDefinition, ResourceNodeContext } from 'models/index';

export interface AppConfig {
  resourceDefinition: ResourceDefinition;
  portalContext: {
    crdGatewayApiUrl: string;
    kcpWorkspaceUrl?: string;
  };
  token: string;
  accountId?: string;
  userId?: string;
  namespaceId?: string;
  ui?: UiConfig;
}

export interface UiConfig {
  title?: string;
  showCreateButton?: boolean;
  showDeleteButton?: boolean;
  showEditButton?: boolean;
  showYamlPanel?: boolean;
  defaultPageSize?: number;
  columns?: {
    maxColumns?: number;
    includeMetadata?: boolean;
    includeStatus?: boolean;
  };
}

const DEFAULT_CONFIG: AppConfig = {
  resourceDefinition: {
    group: 'core.platform-mesh.io',
    version: 'v1alpha1',
    kind: 'Account',
    plural: 'accounts',
    singular: 'account',
    scope: 'Cluster',
  },
  portalContext: {
    crdGatewayApiUrl: 'http://localhost:8080/graphql',
  },
  token: '',
};

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private http = inject(HttpClient);
  private config$: Observable<AppConfig> | null = null;

  loadConfig(configPath = '/assets/config.json'): Observable<AppConfig> {
    if (!this.config$) {
      this.config$ = this.http.get<AppConfig>(configPath).pipe(
        map((config) => this.mergeWithDefaults(config)),
        catchError((error) => {
          console.warn('Failed to load config.json, using defaults:', error);
          return of(DEFAULT_CONFIG);
        }),
        shareReplay(1)
      );
    }
    return this.config$;
  }

  toResourceNodeContext(config: AppConfig): ResourceNodeContext {
    return {
      token: config.token,
      resourceDefinition: config.resourceDefinition,
      portalContext: config.portalContext,
      namespaceId: config.namespaceId,
      accountId: config.accountId,
    };
  }

  private mergeWithDefaults(config: Partial<AppConfig>): AppConfig {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      resourceDefinition: {
        ...DEFAULT_CONFIG.resourceDefinition,
        ...config.resourceDefinition,
      },
      portalContext: {
        ...DEFAULT_CONFIG.portalContext,
        ...config.portalContext,
      },
      ui: {
        showCreateButton: true,
        showDeleteButton: true,
        showEditButton: true,
        showYamlPanel: true,
        defaultPageSize: 20,
        ...config.ui,
        columns: {
          maxColumns: 6,
          includeMetadata: true,
          includeStatus: true,
          ...config.ui?.columns,
        },
      },
    };
  }
}

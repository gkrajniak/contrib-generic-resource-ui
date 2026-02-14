import { environment } from '../../../environments/environment';
import { ConfigService } from '../config/config.service';
import { Injectable, inject } from '@angular/core';
import {
  ILuigiContextTypes,
  LuigiContextServiceImpl,
} from '@luigi-project/client-support-angular';
import { Store } from '@ngrx/store';
import deepmerge from 'deepmerge';
import { NodeContext, ResourceNodeContext } from 'models/index';
import { Observable, map, timer, take } from 'rxjs';
import { contextInitialized, contextUpdated } from 'state/context/context.actions';

@Injectable({
  providedIn: 'root',
})
export class ContextService {
  private luigiContextService = inject(LuigiContextServiceImpl);
  private configService = inject(ConfigService);
  private store = inject(Store);
  private initialized = false;

  initialize(): void {
    console.log('[ContextService] Initializing...');

    this.luigiContextService.contextObservable().subscribe((contextMessage) => {
      console.log('[ContextService] Received Luigi context message:', contextMessage.contextType, contextMessage.context);

      if (
        contextMessage.contextType === ILuigiContextTypes.INIT ||
        contextMessage.contextType === ILuigiContextTypes.UPDATE
      ) {
        this.initialized = true;
        const context = this.mergeWithEnvironmentOverwrite(
          contextMessage.context as NodeContext
        );
        console.log('[ContextService] Merged context:', context);

        const resourceContext = this.toResourceNodeContext(context);
        console.log('[ContextService] Resource context:', resourceContext);

        if (contextMessage.contextType === ILuigiContextTypes.INIT) {
          console.log('[ContextService] Dispatching contextInitialized');
          this.store.dispatch(contextInitialized({ context: resourceContext }));
        } else {
          console.log('[ContextService] Dispatching contextUpdated');
          this.store.dispatch(
            contextUpdated({ context: resourceContext })
          );
        }
      }
    });

    timer(500)
      .pipe(take(1))
      .subscribe(() => {
        console.log('[ContextService] Timer fired, initialized:', this.initialized);
        if (!this.initialized) {
          console.log('[ContextService] No Luigi context received, falling back to config');
          this.initializeFromConfig();
        }
      });
  }

  initializeFromConfig(): void {
    console.log('[ContextService] Loading from config...');
    this.configService.loadConfig().subscribe({
      next: (config) => {
        console.log('[ContextService] Config loaded:', config);
        const resourceContext = this.configService.toResourceNodeContext(config);
        console.log('[ContextService] Config resource context:', resourceContext);
        this.store.dispatch(contextInitialized({ context: resourceContext }));
        this.initialized = true;
      },
      error: (err) => {
        console.error('[ContextService] Failed to load config:', err);
      },
    });
  }

  getContextAsync(): Promise<NodeContext> {
    return this.luigiContextService.getContextAsync().then((context) =>
      this.mergeWithEnvironmentOverwrite(context as NodeContext)
    );
  }

  getContext(): NodeContext {
    return this.mergeWithEnvironmentOverwrite(
      this.luigiContextService.getContext() as NodeContext
    );
  }

  contextObservable(): Observable<NodeContext> {
    return this.luigiContextService.contextObservable().pipe(
      map((contextMessage) =>
        this.mergeWithEnvironmentOverwrite(contextMessage.context as NodeContext)
      )
    );
  }

  private mergeWithEnvironmentOverwrite(context: NodeContext): NodeContext {
    if (!environment.luigiContextOverwrite) {
      return context;
    }

    return deepmerge(context, environment.luigiContextOverwrite) as NodeContext;
  }

  private toResourceNodeContext(context: NodeContext): ResourceNodeContext {
    // Fix stale portalContext.crdGatewayApiUrl by deriving it from kcpPath
    const portalContext = this.fixGatewayUrl(context);

    return {
      token: context.token,
      resourceDefinition: context.resourceDefinition!,
      portalContext,
      namespaceId: context.namespaceId,
      accountId: context.accountId,
      resourceId: context['resourceId'] || context['core_platform-mesh_io_accountId'],
      entityType: context.entityType,
      entityName: context.entityName,
    };
  }

  private fixGatewayUrl(context: NodeContext): NodeContext['portalContext'] {
    const portalContext = context.portalContext;
    const kcpPath = context['kcpPath'] as string | undefined;

    if (!portalContext?.crdGatewayApiUrl || !kcpPath) {
      return portalContext;
    }

    // Extract the base URL pattern and rebuild with current kcpPath
    // URL pattern: https://host/api/kubernetes-graphql-gateway/{kcpPath}/graphql
    const urlMatch = portalContext.crdGatewayApiUrl.match(
      /^(https?:\/\/[^/]+\/api\/kubernetes-graphql-gateway\/)([^/]+)(\/graphql)$/
    );

    if (!urlMatch) {
      return portalContext;
    }

    const [, baseUrl, , suffix] = urlMatch;
    const correctedUrl = `${baseUrl}${kcpPath}${suffix}`;

    if (correctedUrl !== portalContext.crdGatewayApiUrl) {
      console.log('[ContextService] Fixed stale gateway URL:', portalContext.crdGatewayApiUrl, '->', correctedUrl);
    }

    return {
      ...portalContext,
      crdGatewayApiUrl: correctedUrl,
    };
  }
}

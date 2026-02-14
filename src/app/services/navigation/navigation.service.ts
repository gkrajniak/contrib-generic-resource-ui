import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import LuigiClient from '@luigi-project/client';
import { setNamespace } from 'state/context/context.actions';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private router = inject(Router);
  private store = inject(Store);

  navigateToResource(resourceName: string, namespace?: string): void {
    // Update the namespace in state before navigating
    if (namespace) {
      this.store.dispatch(setNamespace({ namespaceId: namespace }));
    }

    if (this.isInLuigiContext()) {
      // In Luigi context, use withParams for query parameters
      const linkManager = LuigiClient.linkManager();
      if (namespace) {
        linkManager.withParams({ namespace }).navigate(resourceName);
      } else {
        linkManager.navigate(resourceName);
      }
    } else {
      // Standalone mode: use query params
      const queryParams = namespace ? { namespace } : {};
      this.router.navigate(['/', resourceName], { queryParams });
    }
  }

  navigateBack(): void {
    if (this.isInLuigiContext()) {
      LuigiClient.linkManager().goBack(undefined);
    } else {
      this.router.navigate(['/']);
    }
  }

  private isInLuigiContext(): boolean {
    try {
      const isInIframe = window.self !== window.top;
      if (!isInIframe) {
        return false;
      }
      const context = LuigiClient.getContext();
      return !!context;
    } catch {
      return false;
    }
  }
}

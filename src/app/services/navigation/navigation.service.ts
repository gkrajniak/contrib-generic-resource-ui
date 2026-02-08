import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import LuigiClient from '@luigi-project/client';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private router = inject(Router);

  navigateToResource(resourceName: string): void {
    if (this.isInLuigiContext()) {
      LuigiClient.linkManager().navigate(resourceName);
    } else {
      this.router.navigate(['/', resourceName]);
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

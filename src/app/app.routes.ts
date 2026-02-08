import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/resource-list-view/resource-list-view.component').then(
        (m) => m.ResourceListViewComponent
      ),
  },
  {
    path: 'list',
    loadComponent: () =>
      import('./components/resource-list-view/resource-list-view.component').then(
        (m) => m.ResourceListViewComponent
      ),
  },
  {
    path: ':name',
    loadComponent: () =>
      import('./components/resource-detail-view/resource-detail-view.component').then(
        (m) => m.ResourceDetailViewComponent
      ),
  },
];

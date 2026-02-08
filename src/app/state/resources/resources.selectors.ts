import { ResourcesState } from './resources.reducer';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const selectResourcesState =
  createFeatureSelector<ResourcesState>('resources');

export const selectResources = createSelector(
  selectResourcesState,
  (state) => state.resources
);

export const selectSelectedResource = createSelector(
  selectResourcesState,
  (state) => state.selectedResource
);

export const selectSelectedResourceName = createSelector(
  selectResourcesState,
  (state) => state.selectedResourceName
);

export const selectResourcesLoading = createSelector(
  selectResourcesState,
  (state) => state.loading
);

export const selectDetailLoading = createSelector(
  selectResourcesState,
  (state) => state.detailLoading
);

export const selectSaving = createSelector(
  selectResourcesState,
  (state) => state.saving
);

export const selectDeleting = createSelector(
  selectResourcesState,
  (state) => state.deleting
);

export const selectResourcesError = createSelector(
  selectResourcesState,
  (state) => state.error
);

export const selectResourceByName = (name: string) =>
  createSelector(selectResources, (resources) =>
    resources.find((r) => r.metadata.name === name)
  );

export const selectResourcesCount = createSelector(
  selectResources,
  (resources) => resources.length
);

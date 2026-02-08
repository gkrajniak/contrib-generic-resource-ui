import { ContextState } from './context.reducer';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const selectContextState =
  createFeatureSelector<ContextState>('context');

export const selectContext = createSelector(
  selectContextState,
  (state) => state.context
);

export const selectIsContextInitialized = createSelector(
  selectContextState,
  (state) => state.isInitialized
);

export const selectResourceDefinition = createSelector(
  selectContext,
  (context) => context?.resourceDefinition
);

export const selectToken = createSelector(
  selectContext,
  (context) => context?.token
);

export const selectNamespaceId = createSelector(
  selectContext,
  (context) => context?.namespaceId
);

export const selectGatewayUrl = createSelector(
  selectContext,
  (context) => context?.portalContext?.crdGatewayApiUrl
);

export const selectIsNamespacedResource = createSelector(
  selectResourceDefinition,
  (resourceDef) => resourceDef?.scope === 'Namespaced'
);

export const selectResourceId = createSelector(
  selectContext,
  (context) => context?.resourceId
);

export const selectOriginalGatewayUrl = createSelector(
  selectContextState,
  (state) => state.originalGatewayUrl
);

import {
  clearResources,
  clearSelectedResource,
  createResource,
  createResourceFailure,
  createResourceSuccess,
  deleteResource,
  deleteResourceFailure,
  deleteResourceSuccess,
  loadResourceDetail,
  loadResourceDetailFailure,
  loadResourceDetailSuccess,
  loadResources,
  loadResourcesFailure,
  loadResourcesSuccess,
  resourcesUpdated,
  selectResource,
  updateResource,
  updateResourceFailure,
  updateResourceSuccess,
} from './resources.actions';
import { Resource } from 'models/index';
import { createReducer, on } from '@ngrx/store';

export interface ResourcesState {
  resources: Resource[];
  selectedResource: Resource | null;
  selectedResourceName: string | null;
  loading: boolean;
  detailLoading: boolean;
  saving: boolean;
  deleting: boolean;
  error: string | null;
}

export const initialState: ResourcesState = {
  resources: [],
  selectedResource: null,
  selectedResourceName: null,
  loading: false,
  detailLoading: false,
  saving: false,
  deleting: false,
  error: null,
};

export const resourcesReducer = createReducer(
  initialState,
  on(loadResources, (state): ResourcesState => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(loadResourcesSuccess, (state, { resources }): ResourcesState => ({
    ...state,
    resources,
    loading: false,
    error: null,
  })),
  on(loadResourcesFailure, (state, { error }): ResourcesState => ({
    ...state,
    loading: false,
    error,
  })),
  on(resourcesUpdated, (state, { resources }): ResourcesState => ({
    ...state,
    resources,
  })),
  on(selectResource, (state, { resourceName }): ResourcesState => ({
    ...state,
    selectedResourceName: resourceName,
  })),
  on(loadResourceDetail, (state): ResourcesState => ({
    ...state,
    detailLoading: true,
    error: null,
  })),
  on(loadResourceDetailSuccess, (state, { resource }): ResourcesState => ({
    ...state,
    selectedResource: resource,
    detailLoading: false,
    error: null,
  })),
  on(loadResourceDetailFailure, (state, { error }): ResourcesState => ({
    ...state,
    detailLoading: false,
    error,
  })),
  on(createResource, (state): ResourcesState => ({
    ...state,
    saving: true,
    error: null,
  })),
  on(createResourceSuccess, (state): ResourcesState => ({
    ...state,
    saving: false,
    error: null,
  })),
  on(createResourceFailure, (state, { error }): ResourcesState => ({
    ...state,
    saving: false,
    error,
  })),
  on(updateResource, (state): ResourcesState => ({
    ...state,
    saving: true,
    error: null,
  })),
  on(updateResourceSuccess, (state, { resource }): ResourcesState => ({
    ...state,
    selectedResource: resource,
    saving: false,
    error: null,
  })),
  on(updateResourceFailure, (state, { error }): ResourcesState => ({
    ...state,
    saving: false,
    error,
  })),
  on(deleteResource, (state): ResourcesState => ({
    ...state,
    deleting: true,
    error: null,
  })),
  on(deleteResourceSuccess, (state, { resourceName }): ResourcesState => ({
    ...state,
    resources: state.resources.filter((r) => r.metadata.name !== resourceName),
    selectedResource:
      state.selectedResource?.metadata.name === resourceName
        ? null
        : state.selectedResource,
    deleting: false,
    error: null,
  })),
  on(deleteResourceFailure, (state, { error }): ResourcesState => ({
    ...state,
    deleting: false,
    error,
  })),
  on(clearResources, (): ResourcesState => initialState),
  on(clearSelectedResource, (state): ResourcesState => ({
    ...state,
    selectedResource: null,
    selectedResourceName: null,
  }))
);

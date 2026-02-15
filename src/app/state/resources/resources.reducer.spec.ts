import { resourcesReducer, initialState, ResourcesState } from './resources.reducer';
import {
  loadResources,
  loadResourcesSuccess,
  loadResourcesFailure,
  loadResourceDetail,
  loadResourceDetailSuccess,
  loadResourceDetailFailure,
  createResource,
  createResourceSuccess,
  createResourceFailure,
  updateResource,
  updateResourceSuccess,
  updateResourceFailure,
  deleteResource,
  deleteResourceSuccess,
  deleteResourceFailure,
  clearResources,
  selectResource,
  resourcesUpdated,
} from './resources.actions';
import { Resource } from 'models/index';

describe('Resources Reducer', () => {
  const mockResource: Resource = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'test-resource',
      namespace: 'default',
      uid: 'uid-123',
      resourceVersion: '1',
      creationTimestamp: '2024-01-01T00:00:00Z',
    },
  };

  const mockResource2: Resource = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'test-resource-2',
      namespace: 'default',
      uid: 'uid-456',
      resourceVersion: '1',
      creationTimestamp: '2024-01-02T00:00:00Z',
    },
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const action = { type: 'unknown' };
      const state = resourcesReducer(undefined, action);

      expect(state).toEqual(initialState);
      expect(state.resources).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('load resources', () => {
    it('should set loading to true on loadResources', () => {
      const action = loadResources();
      const state = resourcesReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set resources on loadResourcesSuccess', () => {
      const resources = [mockResource, mockResource2];
      const action = loadResourcesSuccess({ resources });
      const state = resourcesReducer({ ...initialState, loading: true }, action);

      expect(state.resources).toEqual(resources);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error on loadResourcesFailure', () => {
      const error = 'Failed to load resources';
      const action = loadResourcesFailure({ error });
      const state = resourcesReducer({ ...initialState, loading: true }, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('resourcesUpdated', () => {
    it('should update resources list', () => {
      const resources = [mockResource, mockResource2];
      const action = resourcesUpdated({ resources });
      const state = resourcesReducer(initialState, action);

      expect(state.resources).toEqual(resources);
    });

    it('should update selectedResource if it exists in new resources', () => {
      const updatedMockResource = {
        ...mockResource,
        metadata: { ...mockResource.metadata, resourceVersion: '2' },
      };
      const stateWithSelected: ResourcesState = {
        ...initialState,
        resources: [mockResource],
        selectedResource: mockResource,
      };
      const action = resourcesUpdated({ resources: [updatedMockResource] });
      const state = resourcesReducer(stateWithSelected, action);

      expect(state.selectedResource?.metadata.resourceVersion).toBe('2');
    });
  });

  describe('load resource detail', () => {
    it('should set detailLoading to true on loadResourceDetail', () => {
      const action = loadResourceDetail({ resourceName: 'test' });
      const state = resourcesReducer(initialState, action);

      expect(state.detailLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set selectedResource on loadResourceDetailSuccess', () => {
      const action = loadResourceDetailSuccess({ resource: mockResource });
      const state = resourcesReducer({ ...initialState, detailLoading: true }, action);

      expect(state.selectedResource).toEqual(mockResource);
      expect(state.detailLoading).toBe(false);
    });

    it('should set error on loadResourceDetailFailure', () => {
      const error = 'Resource not found';
      const action = loadResourceDetailFailure({ error });
      const state = resourcesReducer({ ...initialState, detailLoading: true }, action);

      expect(state.detailLoading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('create resource', () => {
    it('should set saving to true on createResource', () => {
      const action = createResource({ resource: mockResource });
      const state = resourcesReducer(initialState, action);

      expect(state.saving).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set saving to false on createResourceSuccess', () => {
      const action = createResourceSuccess({ resource: mockResource });
      const state = resourcesReducer({ ...initialState, saving: true }, action);

      expect(state.saving).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error on createResourceFailure', () => {
      const error = 'Failed to create';
      const action = createResourceFailure({ error });
      const state = resourcesReducer({ ...initialState, saving: true }, action);

      expect(state.saving).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('update resource', () => {
    it('should set saving to true on updateResource', () => {
      const action = updateResource({ resource: mockResource });
      const state = resourcesReducer(initialState, action);

      expect(state.saving).toBe(true);
    });

    it('should update selectedResource on updateResourceSuccess', () => {
      const updatedResource = {
        ...mockResource,
        metadata: { ...mockResource.metadata, resourceVersion: '2' },
      };
      const action = updateResourceSuccess({ resource: updatedResource });
      const state = resourcesReducer({ ...initialState, saving: true }, action);

      expect(state.selectedResource).toEqual(updatedResource);
      expect(state.saving).toBe(false);
    });

    it('should set error on updateResourceFailure', () => {
      const error = 'Failed to update';
      const action = updateResourceFailure({ error });
      const state = resourcesReducer({ ...initialState, saving: true }, action);

      expect(state.saving).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('delete resource', () => {
    it('should set deleting to true on deleteResource', () => {
      const action = deleteResource({ resourceName: 'test' });
      const state = resourcesReducer(initialState, action);

      expect(state.deleting).toBe(true);
    });

    it('should remove resource from list on deleteResourceSuccess', () => {
      const stateWithResources: ResourcesState = {
        ...initialState,
        resources: [mockResource, mockResource2],
        deleting: true,
      };
      const action = deleteResourceSuccess({ resourceName: 'test-resource' });
      const state = resourcesReducer(stateWithResources, action);

      expect(state.resources.length).toBe(1);
      expect(state.resources[0].metadata.name).toBe('test-resource-2');
      expect(state.deleting).toBe(false);
    });

    it('should clear selectedResource if deleted resource was selected', () => {
      const stateWithSelected: ResourcesState = {
        ...initialState,
        resources: [mockResource],
        selectedResource: mockResource,
        deleting: true,
      };
      const action = deleteResourceSuccess({ resourceName: 'test-resource' });
      const state = resourcesReducer(stateWithSelected, action);

      expect(state.selectedResource).toBeNull();
    });

    it('should keep selectedResource if different resource was deleted', () => {
      const stateWithSelected: ResourcesState = {
        ...initialState,
        resources: [mockResource, mockResource2],
        selectedResource: mockResource,
        deleting: true,
      };
      const action = deleteResourceSuccess({ resourceName: 'test-resource-2' });
      const state = resourcesReducer(stateWithSelected, action);

      expect(state.selectedResource).toEqual(mockResource);
    });

    it('should set error on deleteResourceFailure', () => {
      const error = 'Failed to delete';
      const action = deleteResourceFailure({ error });
      const state = resourcesReducer({ ...initialState, deleting: true }, action);

      expect(state.deleting).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('selectResource', () => {
    it('should set selectedResourceName', () => {
      const action = selectResource({ resourceName: 'my-resource' });
      const state = resourcesReducer(initialState, action);

      expect(state.selectedResourceName).toBe('my-resource');
    });
  });

  describe('clearResources', () => {
    it('should reset to initial state', () => {
      const stateWithData: ResourcesState = {
        ...initialState,
        resources: [mockResource],
        selectedResource: mockResource,
        loading: true,
        error: 'some error',
      };
      const action = clearResources();
      const state = resourcesReducer(stateWithData, action);

      expect(state).toEqual(initialState);
    });
  });
});

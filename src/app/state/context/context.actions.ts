import { ResourceNodeContext } from 'models/index';
import { createAction, props } from '@ngrx/store';

export const contextInitialized = createAction(
  '[Context] Initialized',
  props<{ context: ResourceNodeContext }>()
);

export const contextUpdated = createAction(
  '[Context] Updated',
  props<{ context: ResourceNodeContext }>()
);

export const contextCleared = createAction('[Context] Cleared');

export const setNamespace = createAction(
  '[Context] Set Namespace',
  props<{ namespaceId: string | undefined }>()
);

import {
  contextCleared,
  contextInitialized,
  contextUpdated,
  setNamespace,
} from './context.actions';
import { ResourceNodeContext } from 'models/index';
import { createReducer, on } from '@ngrx/store';

export interface ContextState {
  context: ResourceNodeContext | null;
  isInitialized: boolean;
  originalGatewayUrl: string | null;
}

export const initialState: ContextState = {
  context: null,
  isInitialized: false,
  originalGatewayUrl: null,
};

export const contextReducer = createReducer(
  initialState,
  on(contextInitialized, (state, { context }): ContextState => ({
    context,
    isInitialized: true,
    originalGatewayUrl: context.portalContext?.crdGatewayApiUrl || null,
  })),
  on(contextUpdated, (state, { context }): ContextState => ({
    ...state,
    context,
    isInitialized: true,
    // Keep the original gateway URL from first initialization
    originalGatewayUrl: state.originalGatewayUrl || context.portalContext?.crdGatewayApiUrl || null,
  })),
  on(contextCleared, (): ContextState => initialState),
  on(setNamespace, (state, { namespaceId }): ContextState => ({
    ...state,
    context: state.context ? { ...state.context, namespaceId } : null,
  }))
);

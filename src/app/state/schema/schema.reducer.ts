import {
  clearSchema,
  loadSchema,
  loadSchemaFailure,
  loadSchemaSuccess,
} from './schema.actions';
import { FieldAnalysis, IntrospectionType } from 'models/index';
import { createReducer, on } from '@ngrx/store';

export interface SchemaState {
  resourceType: IntrospectionType | null;
  inputType: IntrospectionType | null;
  fieldAnalysis: FieldAnalysis | null;
  loading: boolean;
  error: string | null;
}

export const initialState: SchemaState = {
  resourceType: null,
  inputType: null,
  fieldAnalysis: null,
  loading: false,
  error: null,
};

export const schemaReducer = createReducer(
  initialState,
  on(loadSchema, (state): SchemaState => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(
    loadSchemaSuccess,
    (state, { resourceType, inputType, fieldAnalysis }): SchemaState => ({
      ...state,
      resourceType,
      inputType,
      fieldAnalysis,
      loading: false,
      error: null,
    })
  ),
  on(loadSchemaFailure, (state, { error }): SchemaState => ({
    ...state,
    loading: false,
    error,
  })),
  on(clearSchema, (): SchemaState => initialState)
);

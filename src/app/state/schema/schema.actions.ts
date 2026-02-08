import {
  FieldAnalysis,
  IntrospectionType,
  ResourceDefinition,
} from 'models/index';
import { createAction, props } from '@ngrx/store';

export const loadSchema = createAction(
  '[Schema] Load',
  props<{ resourceDefinition: ResourceDefinition }>()
);

export const loadSchemaSuccess = createAction(
  '[Schema] Load Success',
  props<{
    resourceType: IntrospectionType;
    inputType: IntrospectionType | null;
    fieldAnalysis: FieldAnalysis;
  }>()
);

export const loadSchemaFailure = createAction(
  '[Schema] Load Failure',
  props<{ error: string }>()
);

export const clearSchema = createAction('[Schema] Clear');

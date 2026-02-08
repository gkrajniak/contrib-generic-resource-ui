import { SchemaState } from './schema.reducer';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const selectSchemaState = createFeatureSelector<SchemaState>('schema');

export const selectResourceType = createSelector(
  selectSchemaState,
  (state) => state.resourceType
);

export const selectInputType = createSelector(
  selectSchemaState,
  (state) => state.inputType
);

export const selectFieldAnalysis = createSelector(
  selectSchemaState,
  (state) => state.fieldAnalysis
);

export const selectSchemaLoading = createSelector(
  selectSchemaState,
  (state) => state.loading
);

export const selectSchemaError = createSelector(
  selectSchemaState,
  (state) => state.error
);

export const selectCoreFields = createSelector(
  selectFieldAnalysis,
  (analysis) => analysis?.coreFields ?? []
);

export const selectScalarSpecFields = createSelector(
  selectFieldAnalysis,
  (analysis) => analysis?.scalarSpecFields ?? []
);

export const selectComplexSpecFields = createSelector(
  selectFieldAnalysis,
  (analysis) => analysis?.complexSpecFields ?? []
);

export const selectStatusFields = createSelector(
  selectFieldAnalysis,
  (analysis) => analysis?.statusFields ?? []
);

export const selectRequiredInputFields = createSelector(
  selectFieldAnalysis,
  (analysis) => analysis?.requiredInputFields ?? []
);

export const selectConditionsField = createSelector(
  selectFieldAnalysis,
  (analysis) => analysis?.conditionsField
);

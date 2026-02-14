import { SchemaField } from './schema-types';

export interface NestedFieldInfo {
  field: SchemaField;
  scalarChildren: SchemaField[];
  nestedChildren: NestedFieldInfo[];
  depth: number;
  displayTitle: string;
  icon: string;
}

export interface FieldAnalysis {
  coreFields: SchemaField[];
  scalarSpecFields: SchemaField[];
  complexSpecFields: SchemaField[];
  statusFields: SchemaField[];
  conditionsField?: SchemaField;
  requiredInputFields: SchemaField[];
  allSpecFields: SchemaField[];
  allStatusFields: SchemaField[];
  nestedSpecFields: NestedFieldInfo[];
  nestedStatusFields: NestedFieldInfo[];
}

export interface FieldCategory {
  name: string;
  fields: SchemaField[];
  displayName: string;
}

export const CORE_METADATA_FIELDS = [
  'name',
  'namespace',
  'uid',
  'resourceVersion',
  'creationTimestamp',
  'deletionTimestamp',
  'labels',
  'annotations',
  'finalizers',
  'ownerReferences',
  'generation',
  'managedFields',
] as const;

export const SCALAR_TYPES = ['String', 'Int', 'Float', 'Boolean', 'ID'] as const;

export const PRIORITY_DISPLAY_FIELDS = [
  'displayName',
  'type',
  'status',
  'phase',
  'state',
  'description',
  'provider',
  'version',
] as const;

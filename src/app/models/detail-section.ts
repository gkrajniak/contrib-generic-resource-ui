import { SchemaField } from './schema-types';

export interface DetailSection {
  id: string;
  title: string;
  type: SectionType;
  fields: DetailField[];
  collapsed?: boolean;
  order: number;
}

export type SectionType =
  | 'metadata'
  | 'spec'
  | 'status'
  | 'conditions'
  | 'yaml'
  | 'custom';

export interface DetailField {
  key: string;
  label: string;
  path: string;
  type: DetailFieldType;
  schema?: SchemaField;
}

export type DetailFieldType =
  | 'text'
  | 'date'
  | 'boolean'
  | 'number'
  | 'object'
  | 'array'
  | 'labels'
  | 'yaml'
  | 'link'
  | 'status';

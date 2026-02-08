export interface ListColumn {
  key: string;
  label: string;
  path: string;
  sortable: boolean;
  width?: string;
  type: ColumnType;
  priority: number;
}

export type ColumnType =
  | 'text'
  | 'date'
  | 'boolean'
  | 'number'
  | 'status'
  | 'labels'
  | 'link';

export interface ListColumnConfig {
  maxColumns: number;
  includeMetadata: boolean;
  includeStatus: boolean;
}

export const DEFAULT_LIST_COLUMN_CONFIG: ListColumnConfig = {
  maxColumns: 6,
  includeMetadata: true,
  includeStatus: true,
};

import { Injectable } from '@angular/core';
import {
  ColumnType,
  DEFAULT_LIST_COLUMN_CONFIG,
  FieldAnalysis,
  ListColumn,
  ListColumnConfig,
  PRIORITY_DISPLAY_FIELDS,
  SchemaField,
} from 'models/index';
import { humanizeFieldName } from 'utils/humanize';

@Injectable({
  providedIn: 'root',
})
export class ListColumnGeneratorService {
  generateColumns(
    fieldAnalysis: FieldAnalysis,
    config: ListColumnConfig = DEFAULT_LIST_COLUMN_CONFIG
  ): ListColumn[] {
    const columns: ListColumn[] = [];

    columns.push(this.createNameColumn());

    if (config.includeMetadata) {
      columns.push(this.createCreationTimestampColumn());
    }

    const specColumns = this.generateSpecColumns(
      fieldAnalysis.scalarSpecFields,
      config.maxColumns - columns.length - (config.includeStatus ? 1 : 0)
    );
    columns.push(...specColumns);

    if (config.includeStatus && fieldAnalysis.statusFields.length > 0) {
      const statusColumn = this.generateStatusColumn(fieldAnalysis.statusFields);
      if (statusColumn) {
        columns.push(statusColumn);
      }
    }

    return columns.sort((a, b) => a.priority - b.priority);
  }

  private createNameColumn(): ListColumn {
    return {
      key: 'name',
      label: 'Name',
      path: 'metadata.name',
      sortable: true,
      type: 'link',
      priority: 0,
    };
  }

  private createCreationTimestampColumn(): ListColumn {
    return {
      key: 'creationTimestamp',
      label: 'Created',
      path: 'metadata.creationTimestamp',
      sortable: true,
      type: 'date',
      priority: 100,
    };
  }

  private generateSpecColumns(
    specFields: SchemaField[],
    maxColumns: number
  ): ListColumn[] {
    const prioritizedFields = this.prioritizeFields(specFields);
    const selectedFields = prioritizedFields.slice(0, Math.max(0, maxColumns));

    return selectedFields.map((field, index) => ({
      key: field.name,
      label: humanizeFieldName(field.name),
      path: `spec.${field.name}`,
      sortable: field.isScalar,
      type: this.getColumnType(field),
      priority: 10 + index,
    }));
  }

  private generateStatusColumn(statusFields: SchemaField[]): ListColumn | null {
    const priorityField = statusFields.find((f) =>
      ['phase', 'state', 'status', 'ready'].includes(f.name.toLowerCase())
    );

    if (priorityField) {
      return {
        key: priorityField.name,
        label: humanizeFieldName(priorityField.name),
        path: `status.${priorityField.name}`,
        sortable: true,
        type: 'status',
        priority: 50,
      };
    }

    if (statusFields.length > 0) {
      const firstField = statusFields[0];
      return {
        key: firstField.name,
        label: humanizeFieldName(firstField.name),
        path: `status.${firstField.name}`,
        sortable: firstField.isScalar,
        type: this.getColumnType(firstField),
        priority: 50,
      };
    }

    return null;
  }

  private prioritizeFields(fields: SchemaField[]): SchemaField[] {
    return [...fields].sort((a, b) => {
      const aPriority = this.getFieldPriority(a.name);
      const bPriority = this.getFieldPriority(b.name);
      return aPriority - bPriority;
    });
  }

  private getFieldPriority(fieldName: string): number {
    const lowerName = fieldName.toLowerCase();
    const index = PRIORITY_DISPLAY_FIELDS.findIndex(
      (f) => f.toLowerCase() === lowerName
    );
    return index >= 0 ? index : PRIORITY_DISPLAY_FIELDS.length;
  }

  private getColumnType(field: SchemaField): ColumnType {
    const lowerName = field.name.toLowerCase();

    if (
      lowerName.includes('time') ||
      lowerName.includes('date') ||
      lowerName.includes('timestamp')
    ) {
      return 'date';
    }

    if (field.typeName === 'Boolean') {
      return 'boolean';
    }

    if (field.typeName === 'Int' || field.typeName === 'Float') {
      return 'number';
    }

    if (
      lowerName === 'phase' ||
      lowerName === 'state' ||
      lowerName === 'status'
    ) {
      return 'status';
    }

    return 'text';
  }
}

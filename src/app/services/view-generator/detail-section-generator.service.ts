import { Injectable } from '@angular/core';
import {
  DetailField,
  DetailFieldType,
  DetailSection,
  FieldAnalysis,
  SchemaField,
} from 'models/index';
import { humanizeFieldName } from 'utils/humanize';

@Injectable({
  providedIn: 'root',
})
export class DetailSectionGeneratorService {
  generateSections(fieldAnalysis: FieldAnalysis): DetailSection[] {
    const sections: DetailSection[] = [];

    sections.push(this.generateMetadataSection());

    const specSection = this.generateSpecSection(fieldAnalysis);
    if (specSection.fields.length > 0) {
      sections.push(specSection);
    }

    const statusSection = this.generateStatusSection(fieldAnalysis);
    if (statusSection.fields.length > 0) {
      sections.push(statusSection);
    }

    if (fieldAnalysis.conditionsField) {
      sections.push(this.generateConditionsSection());
    }

    return sections;
  }

  private generateMetadataSection(): DetailSection {
    return {
      id: 'metadata',
      title: 'Metadata',
      type: 'metadata',
      order: 0,
      fields: [
        {
          key: 'name',
          label: 'Name',
          path: 'metadata.name',
          type: 'text',
        },
        {
          key: 'namespace',
          label: 'Namespace',
          path: 'metadata.namespace',
          type: 'text',
        },
        {
          key: 'uid',
          label: 'UID',
          path: 'metadata.uid',
          type: 'text',
        },
        {
          key: 'creationTimestamp',
          label: 'Created',
          path: 'metadata.creationTimestamp',
          type: 'date',
        },
        {
          key: 'resourceVersion',
          label: 'Resource Version',
          path: 'metadata.resourceVersion',
          type: 'text',
        },
        {
          key: 'labels',
          label: 'Labels',
          path: 'metadata.labels',
          type: 'labels',
        },
        {
          key: 'annotations',
          label: 'Annotations',
          path: 'metadata.annotations',
          type: 'labels',
        },
      ],
    };
  }

  private generateSpecSection(fieldAnalysis: FieldAnalysis): DetailSection {
    const fields: DetailField[] = [];

    for (const schemaField of fieldAnalysis.scalarSpecFields) {
      fields.push(this.convertSchemaFieldToDetailField(schemaField, 'spec'));
    }

    for (const schemaField of fieldAnalysis.complexSpecFields) {
      fields.push({
        key: schemaField.name,
        label: humanizeFieldName(schemaField.name),
        path: `spec.${schemaField.name}`,
        type: schemaField.isList ? 'array' : 'object',
        schema: schemaField,
      });
    }

    return {
      id: 'spec',
      title: 'Spec',
      type: 'spec',
      order: 1,
      fields,
    };
  }

  private generateStatusSection(fieldAnalysis: FieldAnalysis): DetailSection {
    const fields: DetailField[] = fieldAnalysis.statusFields.map((field) =>
      this.convertSchemaFieldToDetailField(field, 'status')
    );

    return {
      id: 'status',
      title: 'Status',
      type: 'status',
      order: 2,
      fields,
    };
  }

  private generateConditionsSection(): DetailSection {
    return {
      id: 'conditions',
      title: 'Conditions',
      type: 'conditions',
      order: 3,
      fields: [
        {
          key: 'conditions',
          label: 'Conditions',
          path: 'status.conditions',
          type: 'array',
        },
      ],
    };
  }

  private convertSchemaFieldToDetailField(
    schemaField: SchemaField,
    section: string
  ): DetailField {
    return {
      key: schemaField.name,
      label: humanizeFieldName(schemaField.name),
      path: `${section}.${schemaField.name}`,
      type: this.getDetailFieldType(schemaField),
      schema: schemaField,
    };
  }

  private getDetailFieldType(schemaField: SchemaField): DetailFieldType {
    if (schemaField.isList) {
      return 'array';
    }

    switch (schemaField.typeName) {
      case 'Boolean':
        return 'boolean';
      case 'Int':
      case 'Float':
        return 'number';
      default:
        if (schemaField.kind === 'OBJECT' || schemaField.kind === 'INPUT_OBJECT') {
          return 'object';
        }
        return 'text';
    }
  }
}

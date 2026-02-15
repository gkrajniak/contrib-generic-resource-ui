import { inject, Injectable } from '@angular/core';
import {
  CORE_METADATA_FIELDS,
  FieldAnalysis,
  IntrospectionField,
  IntrospectionType,
  NestedFieldInfo,
  SCALAR_TYPES,
  SchemaField,
} from 'models/index';
import { IconMapperService } from 'services/icon';
import { humanizeFieldName } from 'utils/humanize';

@Injectable({
  providedIn: 'root',
})
export class FieldAnalyzerService {
  private iconMapper = inject(IconMapperService);

  analyzeFields(resourceType: IntrospectionType): FieldAnalysis {
    const fields = resourceType.fields ?? [];
    const metadataType = this.findFieldType(fields, 'metadata');
    const specType = this.findFieldType(fields, 'spec');
    const statusType = this.findFieldType(fields, 'status');

    const coreFields = this.extractCoreFields(metadataType);
    const { scalarSpecFields, complexSpecFields, allSpecFields } =
      this.categorizeSpecFields(specType);
    const { statusFields, conditionsField, allStatusFields } =
      this.categorizeStatusFields(statusType);
    const requiredInputFields: SchemaField[] = [];

    const nestedSpecFields = this.analyzeNestedFields(complexSpecFields);
    const nestedStatusFields = this.analyzeNestedFields(
      allStatusFields.filter((f) => !f.isScalar && f.name !== 'conditions')
    );

    // Extract root-level fields (for ConfigMap, Secret, etc.)
    const rootLevelFields = this.extractRootLevelFields(fields);

    // Analyze nested root-level fields (for ClusterRoleBinding roleRef/subjects, etc.)
    const complexRootLevelFields = rootLevelFields.filter((f) => !f.isScalar);
    const nestedRootLevelFields = this.analyzeNestedFields(complexRootLevelFields);

    return {
      coreFields,
      scalarSpecFields,
      complexSpecFields,
      statusFields,
      conditionsField,
      requiredInputFields,
      allSpecFields,
      allStatusFields,
      nestedSpecFields,
      nestedStatusFields,
      rootLevelFields,
      nestedRootLevelFields,
    };
  }

  analyzeInputType(inputType: IntrospectionType | null): SchemaField[] {
    if (!inputType || !inputType.inputFields) {
      return [];
    }

    return inputType.inputFields
      .filter((field) => this.isNonNullType(field.type))
      .map((field) => this.convertToSchemaField(field.name, field.type, field.description));
  }

  private findFieldType(
    fields: IntrospectionField[],
    fieldName: string
  ): IntrospectionType | undefined {
    const field = fields.find((f) => f.name === fieldName);
    return field ? this.unwrapType(field.type) : undefined;
  }

  private extractCoreFields(
    metadataType: IntrospectionType | undefined
  ): SchemaField[] {
    if (!metadataType || !metadataType.fields) {
      return [];
    }

    return metadataType.fields
      .filter((f) => CORE_METADATA_FIELDS.includes(f.name as any))
      .map((f) => this.convertToSchemaField(f.name, f.type, f.description));
  }

  private categorizeSpecFields(specType: IntrospectionType | undefined): {
    scalarSpecFields: SchemaField[];
    complexSpecFields: SchemaField[];
    allSpecFields: SchemaField[];
  } {
    if (!specType || !specType.fields) {
      return {
        scalarSpecFields: [],
        complexSpecFields: [],
        allSpecFields: [],
      };
    }

    const allSpecFields = specType.fields.map((f) =>
      this.convertToSchemaField(f.name, f.type, f.description)
    );

    const scalarSpecFields = allSpecFields.filter((f) => f.isScalar);
    const complexSpecFields = allSpecFields.filter((f) => !f.isScalar);

    return { scalarSpecFields, complexSpecFields, allSpecFields };
  }

  private categorizeStatusFields(statusType: IntrospectionType | undefined): {
    statusFields: SchemaField[];
    conditionsField: SchemaField | undefined;
    allStatusFields: SchemaField[];
  } {
    if (!statusType || !statusType.fields) {
      return {
        statusFields: [],
        conditionsField: undefined,
        allStatusFields: [],
      };
    }

    const allStatusFields = statusType.fields.map((f) =>
      this.convertToSchemaField(f.name, f.type, f.description)
    );

    const conditionsField = allStatusFields.find(
      (f) => f.name === 'conditions'
    );

    const statusFields = allStatusFields.filter(
      (f) => f.name !== 'conditions' && f.isScalar
    );

    return { statusFields, conditionsField, allStatusFields };
  }

  /**
   * Extract root-level fields that are not metadata, spec, status, apiVersion, or kind.
   * These are fields like ConfigMap's `data`, `binaryData`, `immutable`, etc.
   */
  private extractRootLevelFields(fields: IntrospectionField[]): SchemaField[] {
    const excludedFields = ['metadata', 'spec', 'status', 'apiVersion', 'kind', '__typename'];

    return fields
      .filter((f) => !excludedFields.includes(f.name))
      .map((f) => this.convertToSchemaField(f.name, f.type, f.description));
  }

  private convertToSchemaField(
    name: string,
    type: IntrospectionType,
    description?: string
  ): SchemaField {
    const unwrapped = this.unwrapType(type);
    const isNonNull = this.isNonNullType(type);
    const isList = this.isListType(type);
    const typeName = unwrapped?.name ?? 'Unknown';
    const kind = unwrapped?.kind ?? 'SCALAR';
    // A field is only scalar if it's not a list and its underlying type is scalar
    const isScalar = !isList && this.isScalarType(unwrapped);

    return {
      name,
      typeName,
      kind,
      isNonNull,
      isList,
      isScalar,
      description,
      underlyingType: unwrapped,
    };
  }

  private unwrapType(type: IntrospectionType): IntrospectionType {
    if (type.kind === 'NON_NULL' || type.kind === 'LIST') {
      return type.ofType ? this.unwrapType(type.ofType) : type;
    }
    return type;
  }

  private isNonNullType(type: IntrospectionType): boolean {
    return type.kind === 'NON_NULL';
  }

  private isListType(type: IntrospectionType): boolean {
    if (type.kind === 'LIST') {
      return true;
    }
    if (type.kind === 'NON_NULL' && type.ofType) {
      return this.isListType(type.ofType);
    }
    return false;
  }

  private isScalarType(type: IntrospectionType | undefined): boolean {
    if (!type) {
      return false;
    }
    return (
      type.kind === 'SCALAR' ||
      SCALAR_TYPES.includes(type.name as (typeof SCALAR_TYPES)[number])
    );
  }

  analyzeNestedFields(fields: SchemaField[], maxDepth = 3, currentDepth = 0): NestedFieldInfo[] {
    if (currentDepth >= maxDepth) {
      return [];
    }

    return fields
      .filter((f) => !f.isScalar && f.underlyingType?.fields)
      .map((field) => this.buildNestedFieldInfo(field, maxDepth, currentDepth));
  }

  private buildNestedFieldInfo(
    field: SchemaField,
    maxDepth: number,
    currentDepth: number
  ): NestedFieldInfo {
    const nestedType = field.underlyingType;
    const nestedFields = nestedType?.fields ?? [];

    const childSchemaFields = nestedFields.map((f) =>
      this.convertToSchemaField(f.name, f.type, f.description)
    );

    const scalarChildren = childSchemaFields.filter((f) => f.isScalar);
    const complexChildren = childSchemaFields.filter(
      (f) => !f.isScalar && f.underlyingType?.fields
    );

    const nestedChildren =
      currentDepth + 1 < maxDepth
        ? this.analyzeNestedFields(complexChildren, maxDepth, currentDepth + 1)
        : [];

    const displayTitle = field.description || humanizeFieldName(field.name);
    const icon = this.iconMapper.getIconForField(
      field.name,
      field.typeName,
      field.description
    );

    return {
      field,
      scalarChildren,
      nestedChildren,
      depth: currentDepth,
      displayTitle,
      icon,
    };
  }
}

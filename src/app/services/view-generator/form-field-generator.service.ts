import { Injectable } from '@angular/core';
import { SchemaField } from 'models/index';
import { humanizeFieldName } from 'utils/humanize';

export interface FormFieldConfig {
  key: string;
  label: string;
  path: string;
  type: FormFieldType;
  required: boolean;
  defaultValue?: any;
  placeholder?: string;
  validators?: FormFieldValidator[];
}

export type FormFieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'textarea'
  | 'json'
  | 'yaml';

export interface FormFieldValidator {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max';
  value?: any;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class FormFieldGeneratorService {
  generateFormFields(
    requiredFields: SchemaField[],
    allSpecFields: SchemaField[]
  ): FormFieldConfig[] {
    const formFields: FormFieldConfig[] = [];

    formFields.push({
      key: 'name',
      label: 'Name',
      path: 'metadata.name',
      type: 'text',
      required: true,
      placeholder: 'Enter resource name',
      validators: [
        { type: 'required', message: 'Name is required' },
        {
          type: 'pattern',
          value: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
          message:
            'Name must consist of lower case alphanumeric characters or "-", and must start and end with an alphanumeric character',
        },
      ],
    });

    // Only include required fields in the form
    for (const field of allSpecFields) {
      const isRequired = requiredFields.some((rf) => rf.name === field.name);
      if (isRequired) {
        formFields.push(this.convertSchemaFieldToFormField(field, true));
      }
    }

    return formFields;
  }

  private convertSchemaFieldToFormField(
    schemaField: SchemaField,
    required: boolean
  ): FormFieldConfig {
    const baseConfig: FormFieldConfig = {
      key: schemaField.name,
      label: humanizeFieldName(schemaField.name),
      path: `spec.${schemaField.name}`,
      type: this.getFormFieldType(schemaField),
      required,
      defaultValue: this.getDefaultValue(schemaField),
      validators: [],
    };

    if (required) {
      baseConfig.validators?.push({
        type: 'required',
        message: `${baseConfig.label} is required`,
      });
    }

    return baseConfig;
  }

  private getDefaultValue(schemaField: SchemaField): unknown {
    if (schemaField.isList) {
      return [];
    }

    switch (schemaField.typeName) {
      case 'Boolean':
        return false;
      case 'Int':
      case 'Float':
        return null;
      default:
        return '';
    }
  }

  private getFormFieldType(schemaField: SchemaField): FormFieldType {
    if (schemaField.isList || schemaField.kind === 'OBJECT') {
      return 'yaml';
    }

    switch (schemaField.typeName) {
      case 'Boolean':
        return 'boolean';
      case 'Int':
      case 'Float':
        return 'number';
      default:
        return 'text';
    }
  }
}

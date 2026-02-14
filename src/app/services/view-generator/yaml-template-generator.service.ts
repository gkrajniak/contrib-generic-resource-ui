import { Injectable } from '@angular/core';
import { FieldAnalysis, Resource, ResourceDefinition, SchemaField } from 'models/index';

/**
 * Service for generating YAML templates with default values for required fields.
 * Used in Create mode to pre-populate the YAML editor with a valid resource structure.
 */
@Injectable({
  providedIn: 'root',
})
export class YamlTemplateGeneratorService {
  /**
   * Builds a default resource object with all required fields pre-populated.
   */
  buildDefaultResource(
    resourceDefinition: ResourceDefinition,
    fieldAnalysis: FieldAnalysis
  ): Resource {
    return {
      apiVersion: `${resourceDefinition.group}/${resourceDefinition.version}`,
      kind: resourceDefinition.kind,
      metadata: {
        name: '',
      },
      spec: this.buildDefaultSpec(fieldAnalysis),
    };
  }

  /**
   * Builds the spec section with default values for all input fields.
   * Required fields get placeholder values, optional scalar fields are included as empty.
   */
  private buildDefaultSpec(fieldAnalysis: FieldAnalysis): Record<string, unknown> {
    const spec: Record<string, unknown> = {};

    // Add required fields with appropriate default values
    for (const field of fieldAnalysis.requiredInputFields) {
      if (field.name !== 'name') {
        spec[field.name] = this.getDefaultValue(field);
      }
    }

    // Add optional scalar spec fields with empty defaults
    for (const field of fieldAnalysis.scalarSpecFields) {
      if (!(field.name in spec)) {
        spec[field.name] = this.getDefaultValue(field);
      }
    }

    return spec;
  }

  /**
   * Returns an appropriate default value based on field type.
   */
  private getDefaultValue(field: SchemaField): unknown {
    if (field.isList) {
      return [];
    }

    switch (field.typeName) {
      case 'Boolean':
        return false;
      case 'Int':
      case 'Float':
        return null;
      default:
        return '';
    }
  }
}

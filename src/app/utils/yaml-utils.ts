import { Resource } from 'models/index';
import * as YAML from 'yaml';

export const HIDDEN_ANNOTATION_PREFIXES = [
  'kubectl.kubernetes.io/last-applied-configuration',
  'kopf.zalando.org/',
  'helm.sh/',
  'meta.helm.sh/',
  'app.kubernetes.io/managed-by',
];

export function resourceToYaml(resource: Resource, hideAnnotations = false): string {
  let cleanResource = stripTypename(stripManagedFields(resource));
  if (hideAnnotations) {
    cleanResource = stripHiddenAnnotations(cleanResource);
  }
  return YAML.stringify(cleanResource, {
    indent: 2,
    lineWidth: 0,
    singleQuote: false,
  });
}

export function yamlToResource(yamlString: string): Resource {
  return YAML.parse(yamlString) as Resource;
}

export function stripManagedFields(resource: Resource): Resource {
  const cleaned = { ...resource };

  if (cleaned.metadata) {
    cleaned.metadata = { ...cleaned.metadata };
    delete (cleaned.metadata as any).managedFields;
  }

  return cleaned;
}

export function stripHiddenAnnotations(resource: Resource): Resource {
  const cleaned = { ...resource };
  const annotations = cleaned.metadata?.annotations;

  if (annotations) {
    cleaned.metadata = { ...cleaned.metadata! };
    const filteredAnnotations: Record<string, string> = {};

    for (const [key, value] of Object.entries(annotations)) {
      const shouldHide = HIDDEN_ANNOTATION_PREFIXES.some(
        (prefix) => key === prefix || key.startsWith(prefix)
      );
      if (!shouldHide) {
        filteredAnnotations[key] = value;
      }
    }

    if (Object.keys(filteredAnnotations).length > 0) {
      cleaned.metadata.annotations = filteredAnnotations;
    } else {
      delete (cleaned.metadata as any).annotations;
    }
  }

  return cleaned;
}

export function countHiddenAnnotations(resource: Resource): number {
  if (!resource.metadata?.annotations) {
    return 0;
  }

  return Object.keys(resource.metadata.annotations).filter((key) =>
    HIDDEN_ANNOTATION_PREFIXES.some(
      (prefix) => key === prefix || key.startsWith(prefix)
    )
  ).length;
}

export function stripTypename(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => stripTypename(item));
  }

  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      if (key !== '__typename') {
        result[key] = stripTypename(obj[key]);
      }
    }
    return result;
  }

  return obj;
}

export function getValueByPath(obj: any, path: string): any {
  if (!obj || !path) {
    return undefined;
  }

  return path.split('.').reduce((acc, part) => {
    if (acc === undefined || acc === null) {
      return undefined;
    }
    return acc[part];
  }, obj);
}

export function setValueByPath(obj: any, path: string, value: any): void {
  if (!obj || !path) {
    return;
  }

  const parts = path.split('.');
  const lastPart = parts.pop();

  if (!lastPart) {
    return;
  }

  let current = obj;
  for (const part of parts) {
    if (current[part] === undefined) {
      current[part] = {};
    }
    current = current[part];
  }

  current[lastPart] = value;
}

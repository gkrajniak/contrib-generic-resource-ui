import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Validates that a value conforms to Kubernetes naming conventions.
 * RFC 1123: lowercase, start with alphanumeric, contain only lowercase alphanumeric and hyphens,
 * end with alphanumeric, max 63 characters.
 */
export function k8sNameValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) {
    return null;
  }

  // RFC 1123: lowercase alphanumeric, may contain hyphens, max 63 chars
  // Must start and end with alphanumeric
  const pattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

  if (!pattern.test(value)) {
    return {
      k8sNameInvalid: {
        message: 'Name must be lowercase, start and end with alphanumeric, contain only letters, numbers, and hyphens (max 63 characters)',
      },
    };
  }

  return null;
}

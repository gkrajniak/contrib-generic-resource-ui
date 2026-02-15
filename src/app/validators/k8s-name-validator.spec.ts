import { FormControl } from '@angular/forms';
import { k8sNameValidator } from './k8s-name-validator';

describe('k8sNameValidator', () => {
  function validate(value: string) {
    const control = new FormControl(value);
    return k8sNameValidator(control);
  }

  describe('valid names', () => {
    it('should accept simple lowercase names', () => {
      expect(validate('my-app')).toBeNull();
      expect(validate('test')).toBeNull();
      expect(validate('a')).toBeNull();
    });

    it('should accept names with numbers', () => {
      expect(validate('app1')).toBeNull();
      expect(validate('1app')).toBeNull();
      expect(validate('app-123')).toBeNull();
      expect(validate('123')).toBeNull();
    });

    it('should accept names with hyphens', () => {
      expect(validate('my-app')).toBeNull();
      expect(validate('my-long-app-name')).toBeNull();
      expect(validate('a-b-c')).toBeNull();
    });

    it('should accept maximum length names (63 chars)', () => {
      const maxName = 'a'.repeat(63);
      expect(validate(maxName)).toBeNull();
    });

    it('should accept two-character names', () => {
      expect(validate('ab')).toBeNull();
      expect(validate('a1')).toBeNull();
      expect(validate('1a')).toBeNull();
    });
  });

  describe('invalid names', () => {
    it('should reject names with uppercase letters', () => {
      expect(validate('MyApp')).not.toBeNull();
      expect(validate('UPPERCASE')).not.toBeNull();
      expect(validate('myApp')).not.toBeNull();
    });

    it('should reject names starting with hyphen', () => {
      expect(validate('-myapp')).not.toBeNull();
    });

    it('should reject names ending with hyphen', () => {
      expect(validate('myapp-')).not.toBeNull();
    });

    it('should reject names with underscores', () => {
      expect(validate('my_app')).not.toBeNull();
    });

    it('should reject names with dots', () => {
      expect(validate('my.app')).not.toBeNull();
    });

    it('should reject names with spaces', () => {
      expect(validate('my app')).not.toBeNull();
    });

    it('should reject names with special characters', () => {
      expect(validate('my@app')).not.toBeNull();
      expect(validate('my#app')).not.toBeNull();
      expect(validate('my$app')).not.toBeNull();
      expect(validate('my%app')).not.toBeNull();
    });

    it('should reject names exceeding 63 characters', () => {
      const tooLong = 'a'.repeat(64);
      expect(validate(tooLong)).not.toBeNull();
    });

    it('should reject single hyphen', () => {
      expect(validate('-')).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should return null for empty value', () => {
      expect(validate('')).toBeNull();
    });

    it('should return null for null value', () => {
      const control = new FormControl(null);
      expect(k8sNameValidator(control)).toBeNull();
    });

    it('should return null for undefined value', () => {
      const control = new FormControl(undefined);
      expect(k8sNameValidator(control)).toBeNull();
    });
  });

  describe('error message', () => {
    it('should return k8sNameInvalid error with message', () => {
      const result = validate('Invalid_Name');
      expect(result).toEqual({
        k8sNameInvalid: {
          message: 'Name must be lowercase, start and end with alphanumeric, contain only letters, numbers, and hyphens (max 63 characters)',
        },
      });
    });
  });
});

import {describe, expect, it} from 'vitest';

import {type FieldConfig, validators, type WizardSchema} from './wizard-form';

/**
 * Tests for validator functions
 *
 * These are pure functions that can be tested without React dependencies.
 * Integration testing of useFormWizard happens through component tests.
 */

describe('validators - core validation logic', () => {
  describe('required validator', () => {
    it('fails for empty string', () => {
      const validator = validators.required('Name');
      expect(validator('')).toBeTruthy();
    });

    it('fails for whitespace-only string', () => {
      const validator = validators.required('Name');
      expect(validator('   ')).toBeTruthy();
    });

    it('fails for null/undefined', () => {
      const validator = validators.required('Name');
      expect(validator(null)).toBeTruthy();
      expect(validator(undefined)).toBeTruthy();
    });

    it('passes for non-empty string', () => {
      const validator = validators.required('Name');
      expect(validator('John')).toBeNull();
    });

    it('passes for number (including 0)', () => {
      const validator = validators.required('Count');
      expect(validator(1)).toBeNull();
      expect(validator(0)).toBeNull();
    });

    it('passes for non-empty array', () => {
      const validator = validators.required('Items');
      expect(validator([1, 2, 3])).toBeNull();
    });

    it('returns appropriate error message', () => {
      const validator = validators.required('Customer Name');
      const error = validator('');
      expect(error).toContain('Customer Name');
      expect(error).toContain('required');
    });
  });

  describe('email validator', () => {
    const validator = validators.email();

    it('fails for various invalid emails', () => {
      const invalid = [
        'invalid',
        'invalid@',
        '@example.com',
        'user@',
        'user @example.com',
      ];

      invalid.forEach((email) => {
        expect(validator(email), `Should reject "${email}"`).toBeTruthy();
      });
    });

    it('passes for valid emails', () => {
      const valid = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user123@example.io',
      ];

      valid.forEach((email) => {
        expect(validator(email), `Should accept "${email}"`).toBeNull();
      });
    });

    it('passes for empty (optional field)', () => {
      expect(validator('')).toBeNull();
      expect(validator(null)).toBeNull();
    });

    it('returns clear error message', () => {
      const error = validator('invalid');
      expect(error).toContain('valid email');
    });
  });

  describe('phone validator', () => {
    const validator = validators.phone();

    it('fails for invalid phone numbers', () => {
      expect(validator('123')).toBeTruthy();
      expect(validator('1')).toBeTruthy();
    });

    it('passes for valid phone numbers', () => {
      const valid = [
        '5551234567',
        '+1 (555) 123-4567',
        '555-123-4567',
        '+1 555 123 4567',
      ];

      valid.forEach((phone) => {
        expect(validator(phone), `Should accept "${phone}"`).toBeNull();
      });
    });

    it('passes for empty (optional field)', () => {
      expect(validator('')).toBeNull();
      expect(validator(null)).toBeNull();
    });
  });

  describe('minLength validator', () => {
    const validator = validators.minLength(3);

    it('fails when too short', () => {
      expect(validator('a')).toBeTruthy();
      expect(validator('ab')).toBeTruthy();
    });

    it('passes when correct length or longer', () => {
      expect(validator('abc')).toBeNull();
      expect(validator('abcd')).toBeNull();
      expect(validator('abcdefg')).toBeNull();
    });

    it('includes minimum in error message', () => {
      const error = validator('ab');
      expect(error).toContain('3');
    });
  });

  describe('maxLength validator', () => {
    const validator = validators.maxLength(5);

    it('fails when too long', () => {
      expect(validator('abcdef')).toBeTruthy();
      expect(validator('abcdefghij')).toBeTruthy();
    });

    it('passes when correct length or shorter', () => {
      expect(validator('abcde')).toBeNull();
      expect(validator('abc')).toBeNull();
      expect(validator('')).toBeNull();
    });

    it('includes maximum in error message', () => {
      const error = validator('abcdef');
      expect(error).toContain('5');
    });
  });

  describe('min number validator', () => {
    const validator = validators.min(10);

    it('fails when below minimum', () => {
      expect(validator(5)).toBeTruthy();
      expect(validator(9.99)).toBeTruthy();
    });

    it('passes when at or above minimum', () => {
      expect(validator(10)).toBeNull();
      expect(validator(15)).toBeNull();
      expect(validator(100)).toBeNull();
    });

    it('passes for empty values (optional)', () => {
      expect(validator(null)).toBeNull();
      expect(validator(undefined)).toBeNull();
    });

    it('includes minimum in error message', () => {
      const error = validator(5);
      expect(error).toContain('10');
    });
  });

  describe('max number validator', () => {
    const validator = validators.max(100);

    it('fails when above maximum', () => {
      expect(validator(101)).toBeTruthy();
      expect(validator(1000)).toBeTruthy();
    });

    it('passes when at or below maximum', () => {
      expect(validator(100)).toBeNull();
      expect(validator(50)).toBeNull();
      expect(validator(0)).toBeNull();
    });

    it('passes for empty values (optional)', () => {
      expect(validator(null)).toBeNull();
      expect(validator(undefined)).toBeNull();
    });

    it('includes maximum in error message', () => {
      const error = validator(101);
      expect(error).toContain('100');
    });
  });

  describe('minItems array validator', () => {
    const validator = validators.minItems(2);

    it('fails when too few items', () => {
      expect(validator(['one'])).toBeTruthy();
      expect(validator([])).toBeTruthy();
    });

    it('passes when enough items', () => {
      expect(validator(['one', 'two'])).toBeNull();
      expect(validator(['one', 'two', 'three'])).toBeNull();
    });

    it('includes minimum in error message', () => {
      const error = validator(['one']);
      expect(error).toContain('2');
    });
  });

  describe('custom validator', () => {
    const validator = validators.custom(
        (value) => value === 'valid', 'Value must be "valid"');

    it('fails when condition is false', () => {
      expect(validator('invalid')).toBeTruthy();
      expect(validator('anything else')).toBeTruthy();
    });

    it('passes when condition is true', () => {
      expect(validator('valid')).toBeNull();
    });

    it('returns custom error message', () => {
      const error = validator('invalid');
      expect(error).toBe('Value must be "valid"');
    });
  });
});

describe('validator composition - multiple validators on one field', () => {
  it('allows chaining multiple validators', () => {
    // Simulate a field with multiple validators
    const emailValidators = [
      validators.required('Email'),
      validators.email(),
    ];

    const testValue = 'invalid';

    // First validator should pass (not empty)
    expect(emailValidators[0](testValue)).toBeNull();

    // Second validator should fail (invalid email)
    expect(emailValidators[1](testValue)).toBeTruthy();
  });

  it('passes all validators for valid input', () => {
    const validators_list = [
      validators.required('Email'),
      validators.email(),
    ];

    const testValue = 'user@example.com';

    // Both validators should pass
    validators_list.forEach((v) => {
      expect(v(testValue)).toBeNull();
    });
  });
});

describe('common validation patterns', () => {
  it('validates required text input', () => {
    const v = validators.required('Name');
    expect(v('')).toBeTruthy();
    expect(v('John')).toBeNull();
  });

  it('validates optional email field', () => {
    const v = validators.email();
    expect(v('')).toBeNull();  // Optional
    expect(v('user@example.com')).toBeNull();
    expect(v('invalid')).toBeTruthy();
  });

  it('validates required selection with at least 2 items', () => {
    const required = validators.required('Parts');
    const minTwo = validators.minItems(2);

    expect(required([])).toBeTruthy();          // Empty fails required
    expect(minTwo(['one'])).toBeTruthy();       // One item fails minItems
    expect(minTwo(['one', 'two'])).toBeNull();  // Two items pass
  });

  it('validates number within range', () => {
    const minVal = validators.min(0);
    const maxVal = validators.max(100);

    expect(minVal(-1)).toBeTruthy();
    expect(maxVal(101)).toBeTruthy();
    expect(minVal(50)).toBeNull();
    expect(maxVal(50)).toBeNull();
  });
});

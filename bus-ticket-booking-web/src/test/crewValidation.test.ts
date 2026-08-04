import { describe, it, expect } from 'vitest';
import {
  validateNIC,
  validatePhone,
  validateEmail,
  validateLicenseNumber,
  validateDate,
  validateFutureDate,
  validateDriver,
  validateCrewMember,
} from '@/lib/crewValidation';

describe('validateNIC', () => {
  it('accepts legacy 9-digit NIC with V', () => {
    expect(validateNIC('882345678V')).toBe(true);
  });

  it('accepts legacy 9-digit NIC with X', () => {
    expect(validateNIC('882345678X')).toBe(true);
  });

  it('accepts lowercase v (case-insensitive)', () => {
    expect(validateNIC('882345678v')).toBe(true);
  });

  it('accepts new 12-digit NIC', () => {
    expect(validateNIC('199823456789')).toBe(true);
  });

  it('rejects invalid NICs', () => {
    expect(validateNIC('12345')).toBe(false);
    expect(validateNIC('abcdef')).toBe(false);
    expect(validateNIC('882345678')).toBe(false);
    expect(validateNIC('882345678A')).toBe(false);
  });
});

describe('validatePhone', () => {
  it('accepts +94 format', () => {
    expect(validatePhone('+94771234567')).toBe(true);
  });

  it('accepts 0-prefix format', () => {
    expect(validatePhone('0771234567')).toBe(true);
  });

  it('accepts plain digits', () => {
    expect(validatePhone('771234567')).toBe(true);
    expect(validatePhone('0771234567')).toBe(true);
  });

  it('rejects invalid phones', () => {
    expect(validatePhone('123')).toBe(false);
    expect(validatePhone('+9477')).toBe(false);
    expect(validatePhone('')).toBe(false);
  });
});

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('driver@example.com')).toBe(true);
  });

  it('treats empty/undefined as valid (optional)', () => {
    expect(validateEmail(null)).toBe(true);
    expect(validateEmail('')).toBe(true);
    expect(validateEmail(undefined)).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('a@b')).toBe(false);
  });
});

describe('validateLicenseNumber', () => {
  it('accepts common SL license formats', () => {
    expect(validateLicenseNumber('B1234567')).toBe(true);
    expect(validateLicenseNumber('B-1234567')).toBe(true);
    expect(validateLicenseNumber('B 1234567')).toBe(true);
  });

  it('rejects invalid licenses', () => {
    expect(validateLicenseNumber('')).toBe(false);
    expect(validateLicenseNumber('123')).toBe(false);
    expect(validateLicenseNumber('ABCDE')).toBe(false);
  });
});

describe('validateDate', () => {
  it('accepts ISO dates', () => {
    expect(validateDate('2025-12-31')).toBe(true);
  });

  it('rejects invalid dates', () => {
    expect(validateDate('31/12/2025')).toBe(false);
    expect(validateDate('not-a-date')).toBe(false);
    expect(validateDate('')).toBe(false);
    expect(validateDate('2025-13-45')).toBe(false);
    expect(validateDate('2025-02-30')).toBe(false);
  });
});

describe('validateFutureDate', () => {
  it('accepts future dates', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 2);
    expect(validateFutureDate(future.toISOString().split('T')[0])).toBe(true);
  });

  it('rejects past dates', () => {
    expect(validateFutureDate('2020-01-01')).toBe(false);
  });
});

describe('validateDriver', () => {
  const baseInput = {
    fullName: 'Nimal Perera',
    nic: '882345678V',
    phone: '+94771234567',
    email: 'nimal@example.com',
    licenseNumber: 'B1234567',
    licenseExpiryDate: '2030-01-01',
  };

  it('returns no errors for valid input', () => {
    expect(validateDriver(baseInput)).toEqual({});
  });

  it('returns errors for invalid input', () => {
    const errors = validateDriver({
      ...baseInput,
      fullName: 'Na',
      nic: '12345',
      phone: 'abc',
      licenseNumber: 'bad',
      licenseExpiryDate: '2020-01-01',
    });
    expect(errors.fullName).toBeDefined();
    expect(errors.nic).toBeDefined();
    expect(errors.phone).toBeDefined();
    expect(errors.licenseNumber).toBeDefined();
    expect(errors.licenseExpiryDate).toBeDefined();
  });
});

describe('validateCrewMember', () => {
  const baseInput = {
    fullName: 'Saman Silva',
    nic: '199823456789',
    phone: '0771234567',
    email: 'saman@example.com',
    crewRole: 'conductor',
  };

  it('returns no errors for valid input', () => {
    expect(validateCrewMember(baseInput)).toEqual({});
  });

  it('rejects invalid crew role', () => {
    const errors = validateCrewMember({ ...baseInput, crewRole: 'manager' });
    expect(errors.crewRole).toBeDefined();
  });

  it('rejects invalid NIC', () => {
    const errors = validateCrewMember({ ...baseInput, nic: 'abc' });
    expect(errors.nic).toBeDefined();
  });
});


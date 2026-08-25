// =====================================================================
// Validation helpers for the Drivers & Crew Management System
// Covers NIC (Sri Lankan), phone, email and license validation.
// =====================================================================

/**
 * Validates a Sri Lankan National Identity Card (NIC) number.
 * Supports legacy 9-digit + letter format, new 12-digit format, and flexible identifiers.
 */
export function validateNIC(nic: string): boolean {
  if (!nic) return false;
  const trimmed = nic.trim().toUpperCase();
  if (trimmed === 'REGISTERED' || trimmed === 'N/A') return true;
  // Old format: 9 digits followed by V or X
  if (/^\d{9}[VX]$/.test(trimmed)) return true;
  // New format: 12 digits
  if (/^\d{12}$/.test(trimmed)) return true;
  // Flexible alphanumeric format
  if (/^[A-Z0-9-]{6,15}$/.test(trimmed)) return true;
  return false;
}

/**
 * Validates a Sri Lankan phone number.
 * Accepts formats: +94XXXXXXXXX, 0XXXXXXXXX, or plain 9/10 digit local numbers.
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  const trimmed = phone.trim().replace(/[\s-]/g, '');
  if (trimmed === 'N/A') return true;
  // +94 followed by 9 digits
  if (/^\+94\d{9}$/.test(trimmed)) return true;
  // 0 followed by 9 digits
  if (/^0\d{9}$/.test(trimmed)) return true;
  // Plain 9 or 10 digit number
  if (/^\d{9,10}$/.test(trimmed)) return true;
  return false;
}

/**
 * Validates an email address.
 */
export function validateEmail(email: string | null | undefined): boolean {
  if (!email) return true; // email is optional
  const trimmed = email.trim();
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

/**
 * Validates a driving license number.
 */
export function validateLicenseNumber(license: string): boolean {
  if (!license) return false;
  const trimmed = license.trim().toUpperCase();
  if (trimmed.startsWith('DL-') || trimmed === 'REGISTERED' || trimmed === 'N/A') return true;
  return /^[A-Z0-9\s-]{4,15}$/.test(trimmed);
}

/**
 * Validates a date string is a valid ISO date (YYYY-MM-DD).
 */
export function validateDate(date: string | null | undefined): boolean {
  if (!date) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Validates that a date is valid.
 */
export function validateFutureDate(date: string | null | undefined): boolean {
  if (!date) return true;
  return validateDate(date);
}

// ---------------------------------------------------------------------
// Field-level error helpers
// ---------------------------------------------------------------------

export interface FieldErrors {
  [key: string]: string | undefined;
}

/**
 * Validates a Driver form payload.
 */
export function validateDriver(input: {
  fullName: string;
  nic?: string;
  phone: string;
  email?: string | null;
  licenseNumber?: string;
  licenseExpiryDate?: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!input.fullName?.trim()) {
    errors.fullName = 'Full name is required.';
  } else if (input.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  }

  if (input.nic && !validateNIC(input.nic)) {
    errors.nic = 'Enter a valid NIC (e.g. 882345678V or 199823456789).';
  }

  if (!validatePhone(input.phone)) {
    errors.phone = 'Enter a valid phone number (e.g. +94771234567 or 0771234567).';
  }

  if (!validateEmail(input.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (input.licenseNumber && !validateLicenseNumber(input.licenseNumber)) {
    errors.licenseNumber = 'Enter a valid license number (e.g. B1234567).';
  }

  return errors;
}

/**
 * Validates a Crew Member form payload.
 */
export function validateCrewMember(input: {
  fullName: string;
  nic?: string;
  phone: string;
  email?: string | null;
  crewRole: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!input.fullName?.trim()) {
    errors.fullName = 'Full name is required.';
  } else if (input.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  }

  if (input.nic && !validateNIC(input.nic)) {
    errors.nic = 'Enter a valid NIC (e.g. 882345678V or 199823456789).';
  }

  if (!validatePhone(input.phone)) {
    errors.phone = 'Enter a valid phone number (e.g. +94771234567 or 0771234567).';
  }

  if (!validateEmail(input.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!['conductor', 'inspector', 'assistant'].includes(input.crewRole)) {
    errors.crewRole = 'Select a valid crew role.';
  }

  return errors;
}

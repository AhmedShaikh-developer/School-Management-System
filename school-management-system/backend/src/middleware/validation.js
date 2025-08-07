const { body, validationResult } = require('express-validator');

// Validation rules for tenant onboarding
const validateTenantOnboarding = [
  body('schoolName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('School name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z0-9\s\-\.]+$/)
    .withMessage('School name can only contain letters, numbers, spaces, hyphens, and dots'),
  
  body('domain')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Domain must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\-]+$/)
    .withMessage('Domain can only contain letters, numbers, and hyphens')
    .custom((value) => {
      if (value.includes('..') || value.startsWith('-') || value.endsWith('-')) {
        throw new Error('Domain cannot contain consecutive dots or start/end with hyphens');
      }
      return true;
    }),
  
  body('adminName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Admin name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Admin name can only contain letters and spaces'),
  
  body('adminEmail')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .custom((value) => {
      // Additional email validation
      if (value.includes('..') || value.startsWith('.') || value.endsWith('.')) {
        throw new Error('Email address contains invalid characters');
      }
      
      const parts = value.split('@');
      if (parts.length !== 2) {
        throw new Error('Email address format is invalid');
      }
      
      const domain = parts[1];
      if (!domain || !domain.includes('.')) {
        throw new Error('Email domain appears to be invalid');
      }
      
      const tld = domain.split('.').pop();
      if (!tld || tld.length < 2) {
        throw new Error('Email domain appears to be invalid');
      }
      
      return true;
    })
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true; // Optional field
      
      // Remove all non-digit characters except + at the beginning
      const cleaned = value.replace(/[^\d+]/g, '');
      
      // Check if it starts with + (international) or is a local number
      if (cleaned.startsWith('+')) {
        // International format: +[country code][number] (total 7-15 digits)
        const internationalRegex = /^\+[1-9]\d{6,14}$/;
        if (!internationalRegex.test(cleaned)) {
          throw new Error('Please provide a valid international phone number (e.g., +1234567890)');
        }
      } else {
        // Local format: [number] (7-15 digits, can start with 0 in some countries)
        const localRegex = /^[0-9]\d{6,14}$/;
        if (!localRegex.test(cleaned)) {
          throw new Error('Please provide a valid phone number (7-15 digits)');
        }
      }
      
      return true;
    }),
  
  body('schoolType')
    .optional()
    .isIn(['primary', 'secondary', 'high', 'university', 'other'])
    .withMessage('School type must be one of: primary, secondary, high, university, other'),
  
  body('studentCount')
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage('Student count must be between 1 and 100,000'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),
  
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Please provide a valid website URL'),
];

// Validation rules for domain check
const validateDomainCheck = [
  body('domain')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Domain must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\-]+$/)
    .withMessage('Domain can only contain letters, numbers, and hyphens'),
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Custom domain validation
const validateDomainFormat = (domain) => {
  const domainRegex = /^[a-zA-Z0-9\-]+$/;
  if (!domainRegex.test(domain)) {
    return false;
  }
  
  if (domain.includes('..') || domain.startsWith('-') || domain.endsWith('-')) {
    return false;
  }
  
  if (domain.length < 3 || domain.length > 100) {
    return false;
  }
  
  return true;
};

// Custom email validation
const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  // Check for common invalid patterns
  if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
    return false;
  }
  
  // Check domain has at least one dot and valid TLD
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const domain = parts[1];
  if (!domain || !domain.includes('.')) return false;
  
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) return false;
  
  return true;
};

// Custom phone validation
const validatePhoneFormat = (phone) => {
  if (!phone) return true; // Optional field
  
  // Remove all non-digit characters except + at the beginning
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Check if it starts with + (international) or is a local number
  if (cleaned.startsWith('+')) {
    // International format: +[country code][number] (total 7-15 digits)
    const internationalRegex = /^\+[1-9]\d{6,14}$/;
    return internationalRegex.test(cleaned);
  } else {
    // Local format: [number] (7-15 digits, can start with 0 in some countries)
    const localRegex = /^[0-9]\d{6,14}$/;
    return localRegex.test(cleaned);
  }
};

module.exports = {
  validateTenantOnboarding,
  validateDomainCheck,
  handleValidationErrors,
  validateDomainFormat,
  validateEmailFormat,
  validatePhoneFormat
}; 
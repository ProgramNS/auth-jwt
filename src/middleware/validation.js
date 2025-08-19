/**
 * Request Validation Middleware Utilities
 * Provides validation functions for request data
 */

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password validation regex (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

/**
 * Name validation regex (letters, spaces, hyphens, apostrophes)
 */
const NAME_REGEX = /^[a-zA-Z\s\-']{2,50}$/;

/**
 * Generic validation error response
 */
const createValidationError = (field, message, path) => ({
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: `Validation failed for field: ${field}`,
    details: {
      field,
      message,
    },
  },
  timestamp: new Date().toISOString(),
  path,
});

/**
 * Validate email format
 */
const validateEmail = (email) => {
  if (!email) return 'Email is required';
  if (typeof email !== 'string') return 'Email must be a string';
  if (email.length > 254) return 'Email is too long';
  if (!EMAIL_REGEX.test(email)) return 'Invalid email format';
  return null;
};

/**
 * Validate password strength
 */
const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (typeof password !== 'string') return 'Password must be a string';
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (password.length > 128) return 'Password is too long';
  if (!PASSWORD_REGEX.test(password)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }
  return null;
};

/**
 * Validate name fields
 */
const validateName = (name, fieldName = 'Name') => {
  if (!name) return `${fieldName} is required`;
  if (typeof name !== 'string') return `${fieldName} must be a string`;
  if (name.trim().length < 2) return `${fieldName} must be at least 2 characters long`;
  if (name.length > 50) return `${fieldName} is too long`;
  if (!NAME_REGEX.test(name.trim())) return `${fieldName} contains invalid characters`;
  return null;
};

/**
 * Validate UUID format
 */
const validateUUID = (id, fieldName = 'ID') => {
  if (!id) return `${fieldName} is required`;
  if (typeof id !== 'string') return `${fieldName} must be a string`;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) return `Invalid ${fieldName} format`;
  return null;
};

/**
 * Registration validation middleware
 */
const validateRegistration = (req, res, next) => {
  const { email, password, firstName, lastName } = req.body;

  // Validate email
  const emailError = validateEmail(email);
  if (emailError) {
    return res.status(400).json(createValidationError('email', emailError, req.path));
  }

  // Validate password
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json(createValidationError('password', passwordError, req.path));
  }

  // Validate first name
  const firstNameError = validateName(firstName, 'First name');
  if (firstNameError) {
    return res.status(400).json(createValidationError('firstName', firstNameError, req.path));
  }

  // Validate last name
  const lastNameError = validateName(lastName, 'Last name');
  if (lastNameError) {
    return res.status(400).json(createValidationError('lastName', lastNameError, req.path));
  }

  // Sanitize input data
  req.body.email = email.toLowerCase().trim();
  req.body.firstName = firstName.trim();
  req.body.lastName = lastName.trim();

  next();
};

/**
 * Login validation middleware
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  // Validate email
  const emailError = validateEmail(email);
  if (emailError) {
    return res.status(400).json(createValidationError('email', emailError, req.path));
  }

  // Validate password presence (not strength for login)
  if (!password) {
    return res.status(400).json(createValidationError('password', 'Password is required', req.path));
  }

  if (typeof password !== 'string') {
    return res.status(400).json(createValidationError('password', 'Password must be a string', req.path));
  }

  // Sanitize email
  req.body.email = email.toLowerCase().trim();

  next();
};

/**
 * Profile update validation middleware
 */
const validateProfileUpdate = (req, res, next) => {
  const { firstName, lastName, email } = req.body;

  // Validate first name if provided
  if (firstName !== undefined) {
    const firstNameError = validateName(firstName, 'First name');
    if (firstNameError) {
      return res.status(400).json(createValidationError('firstName', firstNameError, req.path));
    }
    req.body.firstName = firstName.trim();
  }

  // Validate last name if provided
  if (lastName !== undefined) {
    const lastNameError = validateName(lastName, 'Last name');
    if (lastNameError) {
      return res.status(400).json(createValidationError('lastName', lastNameError, req.path));
    }
    req.body.lastName = lastName.trim();
  }

  // Validate email if provided
  if (email !== undefined) {
    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json(createValidationError('email', emailError, req.path));
    }
    req.body.email = email.toLowerCase().trim();
  }

  next();
};

/**
 * Password change validation middleware
 */
const validatePasswordChange = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Validate current password
  if (!currentPassword) {
    return res.status(400).json(createValidationError('currentPassword', 'Current password is required', req.path));
  }

  // Validate new password
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return res.status(400).json(createValidationError('newPassword', passwordError, req.path));
  }

  // Ensure new password is different from current
  if (currentPassword === newPassword) {
    return res.status(400).json(createValidationError('newPassword', 'New password must be different from current password', req.path));
  }

  next();
};

/**
 * Generic request body sanitizer
 */
const sanitizeRequestBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    // Remove any null or undefined values
    Object.keys(req.body).forEach(key => {
      if (req.body[key] === null || req.body[key] === undefined) {
        delete req.body[key];
      }
      // Trim string values
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
};

/**
 * Validate request content type for JSON endpoints
 */
const validateContentType = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (!req.is('application/json')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'Content-Type must be application/json',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
  next();
};

module.exports = {
  validateEmail,
  validatePassword,
  validateName,
  validateUUID,
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  sanitizeRequestBody,
  validateContentType,
  createValidationError,
};

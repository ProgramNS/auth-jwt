const bcrypt = require('bcrypt');

/**
 * Password service utilities for hashing and validation
 */
class PasswordService {
  /**
   * Salt rounds for bcrypt hashing (minimum 12 for security)
   */
  static SALT_ROUNDS = 12;

  /**
   * Hash a plain text password
   * @param {string} plainPassword - The plain text password to hash
   * @returns {Promise<string>} - The hashed password
   * @throws {Error} - If password is invalid or hashing fails
   */
  static async hashPassword(plainPassword) {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (plainPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    try {
      return await bcrypt.hash(plainPassword, this.SALT_ROUNDS);
    } catch (error) {
      throw new Error(`Failed to hash password: ${error.message}`);
    }
  }

  /**
   * Compare a plain text password with a hashed password
   * @param {string} plainPassword - The plain text password
   * @param {string} hashedPassword - The hashed password to compare against
   * @returns {Promise<boolean>} - True if passwords match, false otherwise
   * @throws {Error} - If parameters are invalid or comparison fails
   */
  static async comparePassword(plainPassword, hashedPassword) {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Plain password must be a non-empty string');
    }

    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw new Error('Hashed password must be a non-empty string');
    }

    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw new Error(`Failed to compare passwords: ${error.message}`);
    }
  }

  /**
   * Validate password strength
   * @param {string} password - The password to validate
   * @returns {Object} - Validation result with isValid and errors
   */
  static validatePasswordStrength(password) {
    const errors = [];

    if (!password || typeof password !== 'string') {
      errors.push('Password must be a string');
      return { isValid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = PasswordService;

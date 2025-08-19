const PasswordService = require('../../../src/services/passwordService');

describe('PasswordService', () => {
  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await PasswordService.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should throw error for empty password', async () => {
      await expect(PasswordService.hashPassword('')).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for null password', async () => {
      await expect(PasswordService.hashPassword(null)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for undefined password', async () => {
      await expect(PasswordService.hashPassword(undefined)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for non-string password', async () => {
      await expect(PasswordService.hashPassword(123)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for password shorter than 6 characters', async () => {
      await expect(PasswordService.hashPassword('12345')).rejects.toThrow('Password must be at least 6 characters long');
    });

    it('should hash password with exactly 6 characters', async () => {
      const password = '123456';
      const hashedPassword = await PasswordService.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await PasswordService.hashPassword(password);

      const result = await PasswordService.comparePassword(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = await PasswordService.hashPassword(password);

      const result = await PasswordService.comparePassword(wrongPassword, hashedPassword);
      expect(result).toBe(false);
    });

    it('should throw error for empty plain password', async () => {
      const hashedPassword = await PasswordService.hashPassword('TestPassword123!');

      await expect(PasswordService.comparePassword('', hashedPassword))
        .rejects.toThrow('Plain password must be a non-empty string');
    });

    it('should throw error for null plain password', async () => {
      const hashedPassword = await PasswordService.hashPassword('TestPassword123!');

      await expect(PasswordService.comparePassword(null, hashedPassword))
        .rejects.toThrow('Plain password must be a non-empty string');
    });

    it('should throw error for empty hashed password', async () => {
      await expect(PasswordService.comparePassword('TestPassword123!', ''))
        .rejects.toThrow('Hashed password must be a non-empty string');
    });

    it('should throw error for null hashed password', async () => {
      await expect(PasswordService.comparePassword('TestPassword123!', null))
        .rejects.toThrow('Hashed password must be a non-empty string');
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate a strong password', () => {
      const password = 'TestPassword123!';
      const result = PasswordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', () => {
      const password = 'Test1!';
      const result = PasswordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password longer than 128 characters', () => {
      const password = 'A'.repeat(129) + '1!';
      const result = PasswordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be less than 128 characters long');
    });

    it('should reject password without lowercase letter', () => {
      const password = 'TESTPASSWORD123!';
      const result = PasswordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase letter', () => {
      const password = 'testpassword123!';
      const result = PasswordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', () => {
      const password = 'TestPassword!';
      const result = PasswordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const password = 'TestPassword123';
      const result = PasswordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject null password', () => {
      const result = PasswordService.validatePasswordStrength(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be a string');
    });

    it('should reject undefined password', () => {
      const result = PasswordService.validatePasswordStrength(undefined);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be a string');
    });

    it('should reject non-string password', () => {
      const result = PasswordService.validatePasswordStrength(123);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be a string');
    });

    it('should return multiple errors for weak password', () => {
      const password = 'weak';
      const result = PasswordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });
});

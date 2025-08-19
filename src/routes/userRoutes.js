const express = require('express');
const UserController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const userController = new UserController();

/**
 * User Management Routes
 * All routes are prefixed with /api/users
 * All routes require authentication
 */

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, (req, res) => {
  userController.getUserProfile(req, res);
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, (req, res) => {
  userController.updateUserProfile(req, res);
});

/**
 * @route   DELETE /api/users/profile
 * @desc    Delete current user account
 * @access  Private
 */
router.delete('/profile', authenticateToken, (req, res) => {
  userController.deleteUser(req, res);
});

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics (admin functionality)
 * @access  Private (Admin only - for now just authenticated)
 * @note    In a real application, this would require admin role check
 */
router.get('/stats', authenticateToken, (req, res) => {
  userController.getUserStats(req, res);
});

/**
 * @route   GET /api/users
 * @desc    Get list of users with pagination and filtering (admin functionality)
 * @access  Private (Admin only - for now just authenticated)
 * @note    In a real application, this would require admin role check
 */
router.get('/', authenticateToken, (req, res) => {
  userController.getUsers(req, res);
});

module.exports = router;

const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { protect, authorize } = require('../middlewares/auth');

// Public routes (no authentication required)
router.post('/login', driverController.driverLogin);
router.post('/refresh-token', driverController.driverRefreshToken);

// All routes below this require authentication
router.use(protect);

// Driver only routes (self service)
router.get('/profile', authorize('driver'), driverController.getDriverProfile);
router.get('/dashboard', authorize('driver'), driverController.getDriverDashboard);
router.get('/route-manifest', authorize('driver'), driverController.getAssignedRouteAndManifest);
router.post('/location', authorize('driver'), driverController.updateDriverLocation);
router.patch('/status', authorize('driver'), driverController.updateDriverStatus);
router.post('/trip/start', authorize('driver'), driverController.startTrip);
router.post('/trip/end', authorize('driver'), driverController.endTrip);
router.post('/pickup-status', authorize('driver'), driverController.updateStudentPickupStatus);

// Active trip status can be viewed by driver, admin, parent, student
router.get('/trip/active', authorize('driver', 'admin', 'parent', 'student'), driverController.getActiveTrip);

// Admin only routes
router.post('/register', authorize('admin'), driverController.registerDriver);
router.get('/', authorize('admin'), driverController.getAllDrivers);
router.get('/:id', authorize('admin'), driverController.getDriver);
router.patch('/:id', authorize('admin'), driverController.updateDriver);
router.delete('/:id', authorize('admin'), driverController.deleteDriver);

module.exports = router;


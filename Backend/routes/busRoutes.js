const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');
const { protect, authorize } = require('../middlewares/auth');

// Public route for registration dropdowns (before protect)
router.get('/public/:instituteId', busController.getPublicBusesByInstitute);

// All routes below require authentication
router.use(protect);

// Routes that need admin access only
router.post('/', authorize('admin'), busController.createBus);
router.patch('/:id', authorize('admin'), busController.updateBus);
router.delete('/:id', authorize('admin'), busController.deleteBus);
router.post('/:id/assign-driver', authorize('admin'), busController.assignDriverToBus);
router.delete('/:id/remove-driver', authorize('admin'), busController.removeDriverFromBus);

// Routes accessible by admin, parent, driver, student
router.get('/', authorize('admin', 'parent', 'driver', 'student'), busController.getAllBuses);
router.get('/statistics', authorize('admin'), busController.getBusStatistics);
router.get('/nearby', authorize('admin', 'parent', 'driver', 'student'), busController.getBusesByRoute);

// Live location, route, & bus details
router.get('/:id/live-location', authorize('admin', 'parent', 'driver', 'student'), busController.getBusLiveLocation);
router.get('/:id/optimized-route', authorize('admin', 'parent', 'driver', 'student'), busController.getOptimizedRouteForBus);
router.get('/:id', authorize('admin', 'parent', 'driver', 'student'), busController.getBus);
router.get('/:id/with-driver', authorize('admin', 'parent', 'student'), busController.getBusWithDriver);
// Routes with ID parameter
router.get('/:id', authorize('admin', 'parent', 'driver'), busController.getBus);
router.get('/:id/with-driver', authorize('admin', 'parent'), busController.getBusWithDriver);
router.get('/:id/optimal-route', authorize('admin', 'driver'), busController.getOptimalDailyRoute);

module.exports = router;
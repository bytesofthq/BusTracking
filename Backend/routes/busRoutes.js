const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');
const { protect, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// Routes that need admin access only
router.post('/', authorize('admin'), busController.createBus);
router.patch('/:id', authorize('admin'), busController.updateBus);
router.delete('/:id', authorize('admin'), busController.deleteBus);
router.post('/:id/assign-driver', authorize('admin'), busController.assignDriverToBus);
router.delete('/:id/remove-driver', authorize('admin'), busController.removeDriverFromBus);

// Routes accessible by both admin and parents (read only)
router.get('/', authorize('admin', 'parent'), busController.getAllBuses);
router.get('/statistics', authorize('admin'), busController.getBusStatistics);
router.get('/nearby', authorize('admin', 'parent', 'driver'), busController.getBusesByRoute);

// Routes with ID parameter
router.get('/:id', authorize('admin', 'parent', 'driver'), busController.getBus);
router.get('/:id/with-driver', authorize('admin', 'parent'), busController.getBusWithDriver);

module.exports = router;
const mongoose = require('mongoose');
const Bus = require('../models/Bus');
const Driver = require('../models/Driver');

const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    }
}

exports.createBus = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;
    const { busId, busNo, driverId, startLocation, endLocation, pickupPoints, capacity } = req.body;

    if (!busId || !busNo || !startLocation || !endLocation || !capacity) {
        return next(new AppError('busId, busNo, startLocation, endLocation and capacity are required', 400));
    }

    if (capacity <= 0) {
        return next(new AppError('Capacity must be greater than zero', 400));
    }

    const existingBus = await Bus.findOne({ 
        $or: [
            { busId: busId, instituteId: instituteId },
            { busNo: busNo, instituteId: instituteId }
        ]
    });

    if (existingBus) {
        return next(new AppError('A bus with this Bus ID or Bus Number already exists', 400));
    }

    if (!startLocation.name || startLocation.lat === undefined || startLocation.lng === undefined) {
        return next(new AppError('Start location must include name, lat and lng', 400));
    }

    if (!endLocation.name || endLocation.lat === undefined || endLocation.lng === undefined) {
        return next(new AppError('End location must include name, lat and lng', 400));
    }

    if (pickupPoints && Array.isArray(pickupPoints)) {
        for (let i = 0; i < pickupPoints.length; i++) {
            const point = pickupPoints[i];
            if (!point.name || point.lat === undefined || point.lng === undefined) {
                return next(new AppError(`Pickup point at index ${i} must have name, lat and lng`, 400));
            }
        }
    }

    let driverObjectId = null;
    if (driverId) {
        if (!mongoose.Types.ObjectId.isValid(driverId)) {
            return next(new AppError('Invalid driver ID format', 400));
        }

        const driver = await Driver.findOne({ 
            _id: driverId, 
            Institute: instituteId 
        });

        if (!driver) {
            return next(new AppError('Driver not found in your institute', 404));
        }

        const driverAlreadyAssigned = await Bus.findOne({ 
            driver: driverId, 
            instituteId: instituteId 
        });

        if (driverAlreadyAssigned) {
            return next(new AppError('This driver is already assigned to another bus', 400));
        }

        driverObjectId = driverId;
    }

    const busData = {
        busId: busId.trim(),
        instituteId: instituteId,
        busNo: busNo.trim().toUpperCase(),
        driver: driverObjectId,
        startLocation: {
            name: startLocation.name.trim(),
            lat: startLocation.lat,
            lng: startLocation.lng
        },
        endLocation: {
            name: endLocation.name.trim(),
            lat: endLocation.lat,
            lng: endLocation.lng
        },
        pickupPoints: pickupPoints ? pickupPoints.map(point => ({
            name: point.name.trim(),
            lat: point.lat,
            lng: point.lng
        })) : [],
        capacity: capacity
    };

    const bus = await Bus.create(busData);

    if (driverObjectId) {
        await Driver.findByIdAndUpdate(driverObjectId, { Bus_id: bus._id });
    }

    const populatedBus = await Bus.findById(bus._id).populate('driver', 'name phoneNo email');

    res.status(201).json({
        status: 'success',
        message: 'Bus created successfully',
        data: populatedBus
    });
});

exports.getAllBuses = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    let query = { instituteId: instituteId };

    if (search) {
        query.$or = [
            { busId: { $regex: search, $options: 'i' } },
            { busNo: { $regex: search, $options: 'i' } }
        ];
    }

    const buses = await Bus.find(query)
        .populate('driver', 'name phoneNo email')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Bus.countDocuments(query);

    res.status(200).json({
        status: 'success',
        results: buses.length,
        total: total,
        page: page,
        pages: Math.ceil(total / limit),
        data: buses
    });
});

exports.getBus = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError('Invalid bus ID format', 400));
    }

    const bus = await Bus.findOne({ _id: id, instituteId: instituteId })
        .populate('driver', 'name phoneNo email')
        .lean();

    if (!bus) {
        return next(new AppError('Bus not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: bus
    });
});

exports.updateBus = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;
    const { id } = req.params;
    const { busId, busNo, driverId, startLocation, endLocation, pickupPoints, capacity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError('Invalid bus ID format', 400));
    }

    const bus = await Bus.findOne({ _id: id, instituteId: instituteId });

    if (!bus) {
        return next(new AppError('Bus not found', 404));
    }

    if (busId && busId !== bus.busId) {
        const existingBus = await Bus.findOne({ 
            busId: busId, 
            instituteId: instituteId,
            _id: { $ne: id }
        });
        
        if (existingBus) {
            return next(new AppError('Another bus with this Bus ID already exists', 400));
        }
        bus.busId = busId.trim();
    }

    if (busNo && busNo !== bus.busNo) {
        const existingBus = await Bus.findOne({ 
            busNo: busNo.toUpperCase(), 
            instituteId: instituteId,
            _id: { $ne: id }
        });
        
        if (existingBus) {
            return next(new AppError('Another bus with this Bus Number already exists', 400));
        }
        bus.busNo = busNo.trim().toUpperCase();
    }

    if (capacity) {
        if (capacity <= 0) {
            return next(new AppError('Capacity must be greater than zero', 400));
        }
        bus.capacity = capacity;
    }

    if (startLocation) {
        if (!startLocation.name || startLocation.lat === undefined || startLocation.lng === undefined) {
            return next(new AppError('Start location must include name, lat and lng', 400));
        }
        bus.startLocation = {
            name: startLocation.name.trim(),
            lat: startLocation.lat,
            lng: startLocation.lng
        };
    }

    if (endLocation) {
        if (!endLocation.name || endLocation.lat === undefined || endLocation.lng === undefined) {
            return next(new AppError('End location must include name, lat and lng', 400));
        }
        bus.endLocation = {
            name: endLocation.name.trim(),
            lat: endLocation.lat,
            lng: endLocation.lng
        };
    }

    if (pickupPoints) {
        if (!Array.isArray(pickupPoints)) {
            return next(new AppError('Pickup points must be an array', 400));
        }

        for (let i = 0; i < pickupPoints.length; i++) {
            const point = pickupPoints[i];
            if (!point.name || point.lat === undefined || point.lng === undefined) {
                return next(new AppError(`Pickup point at index ${i} must have name, lat and lng`, 400));
            }
        }

        bus.pickupPoints = pickupPoints.map(point => ({
            name: point.name.trim(),
            lat: point.lat,
            lng: point.lng
        }));
    }

    if (driverId !== undefined) {
        if (driverId === null || driverId === '') {
            if (bus.driver) {
                await Driver.findByIdAndUpdate(bus.driver, { Bus_id: null });
            }
            bus.driver = null;
        } else {
            if (!mongoose.Types.ObjectId.isValid(driverId)) {
                return next(new AppError('Invalid driver ID format', 400));
            }

            const driver = await Driver.findOne({ 
                _id: driverId, 
                Institute: instituteId 
            });

            if (!driver) {
                return next(new AppError('Driver not found in your institute', 404));
            }

            const driverAlreadyAssigned = await Bus.findOne({ 
                driver: driverId, 
                instituteId: instituteId,
                _id: { $ne: id }
            });

            if (driverAlreadyAssigned) {
                return next(new AppError('This driver is already assigned to another bus', 400));
            }

            if (bus.driver && bus.driver.toString() !== driverId) {
                await Driver.findByIdAndUpdate(bus.driver, { Bus_id: null });
            }

            bus.driver = driverId;
            await Driver.findByIdAndUpdate(driverId, { Bus_id: bus._id });
        }
    }

    await bus.save();

    const updatedBus = await Bus.findById(bus._id)
        .populate('driver', 'name phoneNo email')
        .lean();

    res.status(200).json({
        status: 'success',
        message: 'Bus updated successfully',
        data: updatedBus
    });
});

exports.deleteBus = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError('Invalid bus ID format', 400));
    }

    const bus = await Bus.findOne({ _id: id, instituteId: instituteId });

    if (!bus) {
        return next(new AppError('Bus not found', 404));
    }

    if (bus.driver) {
        await Driver.findByIdAndUpdate(bus.driver, { Bus_id: null });
    }

    if (mongoose.models.Trip) {
        const Trip = mongoose.models.Trip;
        const activeTrip = await Trip.findOne({
            busId: bus._id,
            status: { $in: ['ongoing', 'scheduled'] }
        });

        if (activeTrip) {
            return next(new AppError('Cannot delete bus with active or scheduled trips', 400));
        }
    }

    await Bus.findByIdAndDelete(id);

    res.status(200).json({
        status: 'success',
        message: 'Bus deleted successfully'
    });
});

exports.assignDriverToBus = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;
    const { id } = req.params;
    const { driverId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError('Invalid bus ID format', 400));
    }

    if (!driverId) {
        return next(new AppError('Driver ID is required', 400));
    }

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
        return next(new AppError('Invalid driver ID format', 400));
    }

    const bus = await Bus.findOne({ _id: id, instituteId: instituteId });

    if (!bus) {
        return next(new AppError('Bus not found', 404));
    }

    const driver = await Driver.findOne({ 
        _id: driverId, 
        Institute: instituteId 
    });

    if (!driver) {
        return next(new AppError('Driver not found in your institute', 404));
    }

    const driverAlreadyAssigned = await Bus.findOne({ 
        driver: driverId, 
        instituteId: instituteId,
        _id: { $ne: id }
    });

    if (driverAlreadyAssigned) {
        return next(new AppError('This driver is already assigned to another bus', 400));
    }

    if (bus.driver && bus.driver.toString() !== driverId) {
        await Driver.findByIdAndUpdate(bus.driver, { Bus_id: null });
    }

    bus.driver = driverId;
    await bus.save();

    driver.Bus_id = bus._id;
    await driver.save();

    const updatedBus = await Bus.findById(bus._id)
        .populate('driver', 'name phoneNo email')
        .lean();

    res.status(200).json({
        status: 'success',
        message: 'Driver assigned to bus successfully',
        data: updatedBus
    });
});

exports.removeDriverFromBus = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError('Invalid bus ID format', 400));
    }

    const bus = await Bus.findOne({ _id: id, instituteId: instituteId });

    if (!bus) {
        return next(new AppError('Bus not found', 404));
    }

    if (!bus.driver) {
        return next(new AppError('No driver is assigned to this bus', 400));
    }

    await Driver.findByIdAndUpdate(bus.driver, { Bus_id: null });

    bus.driver = null;
    await bus.save();

    const updatedBus = await Bus.findById(bus._id)
        .populate('driver', 'name phoneNo email')
        .lean();

    res.status(200).json({
        status: 'success',
        message: 'Driver removed from bus successfully',
        data: updatedBus
    });
});

exports.getBusWithDriver = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError('Invalid bus ID format', 400));
    }

    const bus = await Bus.findOne({ _id: id, instituteId: instituteId })
        .populate('driver', 'name phoneNo email status currentLocation')
        .lean();

    if (!bus) {
        return next(new AppError('Bus not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: bus
    });
});

exports.getBusesByRoute = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;
    const { startLat, startLng, endLat, endLng } = req.query;

    if (!startLat || !startLng) {
        return next(new AppError('Start location coordinates are required', 400));
    }

    const startLatNum = parseFloat(startLat);
    const startLngNum = parseFloat(startLng);

    if (isNaN(startLatNum) || isNaN(startLngNum)) {
        return next(new AppError('Invalid coordinates provided', 400));
    }

    const buses = await Bus.find({ instituteId: instituteId })
        .populate('driver', 'name phoneNo')
        .lean();

    const nearbyBuses = buses.filter(bus => {
        const busStartLat = bus.startLocation.lat;
        const busStartLng = bus.startLocation.lng;
        
        const distance = Math.sqrt(
            Math.pow(busStartLat - startLatNum, 2) + 
            Math.pow(busStartLng - startLngNum, 2)
        );
        
        return distance < 0.1;
    });

    res.status(200).json({
        status: 'success',
        results: nearbyBuses.length,
        data: nearbyBuses
    });
});

exports.getBusStatistics = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;

    const totalBuses = await Bus.countDocuments({ instituteId: instituteId });
    
    const busesWithDrivers = await Bus.countDocuments({ 
        instituteId: instituteId, 
        driver: { $ne: null } 
    });
    
    const busesWithoutDrivers = totalBuses - busesWithDrivers;

    let totalCapacity = 0;
    const buses = await Bus.find({ instituteId: instituteId }).select('capacity');
    buses.forEach(bus => {
        totalCapacity += bus.capacity;
    });

    let activeTripsCount = 0;
    if (mongoose.models.Trip) {
        const Trip = mongoose.models.Trip;
        activeTripsCount = await Trip.countDocuments({
            busId: { $in: await Bus.find({ instituteId: instituteId }).distinct('_id') },
            status: 'ongoing'
        });
    }

    res.status(200).json({
        status: 'success',
        data: {
            totalBuses: totalBuses,
            busesWithDrivers: busesWithDrivers,
            busesWithoutDrivers: busesWithoutDrivers,
            totalCapacity: totalCapacity,
            averageCapacity: totalBuses > 0 ? Math.round(totalCapacity / totalBuses) : 0,
            activeTrips: activeTripsCount
        }
    });
});
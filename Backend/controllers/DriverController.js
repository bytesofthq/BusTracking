const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const Bus = require('../models/Bus');
const jwt = require('jsonwebtoken');

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

exports.registerDriver = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;
    const { name, phoneNo, email, password, busId } = req.body;

    if (!name || !phoneNo || !email || !password) {
        return next(new AppError('Name, phone number, email and password are required', 400));
    }

    const existingDriver = await Driver.findOne({ 
        email: email.toLowerCase(), 
        Institute: instituteId 
    });

    if (existingDriver) {
        return next(new AppError('A driver with this email already exists in your institute', 400));
    }

    if (busId) {
        const bus = await Bus.findOne({ _id: busId, instituteId: instituteId });
        if (!bus) {
            return next(new AppError('Bus not found in your institute', 404));
        }
        
        if (bus.driver) {
            return next(new AppError('This bus already has an assigned driver', 400));
        }
    }

    const driverData = {
        name: name.trim(),
        phoneNo: phoneNo.trim(),
        Institute: instituteId,
        email: email.toLowerCase().trim(),
        password: password
    };

    if (busId) {
        driverData.Bus_id = busId;
    }

    const driver = await Driver.create(driverData);

    if (busId) {
        await Bus.findByIdAndUpdate(busId, { driver: driver._id });
    }

    const driverResponse = driver.toObject();
    delete driverResponse.password;

    res.status(201).json({
        status: 'success',
        message: 'Driver registered successfully',
        data: driverResponse
    });
});

exports.driverLogin = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new AppError('Email and password are required', 400));
    }

    const driver = await Driver.findOne({ email: email.toLowerCase() }).select('+password');

    if (!driver) {
        return next(new AppError('Invalid email or password', 401));
    }

    const isPasswordValid = await driver.comparePassword(password);

    if (!isPasswordValid) {
        return next(new AppError('Invalid email or password', 401));
    }

    const token = jwt.sign(
        {
            id: driver._id,
            role: 'driver',
            instituteId: driver.Institute,
            busId: driver.Bus_id
        },
        process.env.JWT_SECRET,
        { expiresIn: '90d' }
    );

    driver.lastLogin = new Date();
    await driver.save();

    const driverResponse = driver.toObject();
    delete driverResponse.password;

    let busDetails = null;
    if (driver.Bus_id) {
        busDetails = await Bus.findById(driver.Bus_id).select('busNo busId startLocation endLocation capacity');
    }

    res.status(200).json({
        status: 'success',
        message: 'Login successful',
        token: token,
        data: {
            driver: driverResponse,
            assignedBus: busDetails
        }
    });
});

exports.getAllDrivers = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    let query = { Institute: instituteId };

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phoneNo: { $regex: search, $options: 'i' } }
        ];
    }

    const drivers = await Driver.find(query)
        .populate('Bus_id', 'busNo busId')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Driver.countDocuments(query);

    drivers.forEach(driver => {
        delete driver.password;
    });

    res.status(200).json({
        status: 'success',
        results: drivers.length,
        total: total,
        page: page,
        pages: Math.ceil(total / limit),
        data: drivers
    });
});

exports.getDriver = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError('Invalid driver ID', 400));
    }

    const driver = await Driver.findOne({ _id: id, Institute: instituteId })
        .populate('Bus_id', 'busNo busId startLocation endLocation capacity')
        .lean();

    if (!driver) {
        return next(new AppError('Driver not found', 404));
    }

    delete driver.password;

    res.status(200).json({
        status: 'success',
        data: driver
    });
});

exports.updateDriver = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;
    const { id } = req.params;
    const { name, phoneNo, email, busId, password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError('Invalid driver ID', 400));
    }

    const driver = await Driver.findOne({ _id: id, Institute: instituteId });

    if (!driver) {
        return next(new AppError('Driver not found', 404));
    }

    if (email && email !== driver.email) {
        const existingDriver = await Driver.findOne({ 
            email: email.toLowerCase(), 
            Institute: instituteId,
            _id: { $ne: id }
        });
        
        if (existingDriver) {
            return next(new AppError('Another driver with this email already exists', 400));
        }
        driver.email = email.toLowerCase().trim();
    }

    if (name) driver.name = name.trim();
    if (phoneNo) driver.phoneNo = phoneNo.trim();

    if (busId !== undefined) {
        if (busId === null || busId === '') {
            if (driver.Bus_id) {
                await Bus.findByIdAndUpdate(driver.Bus_id, { driver: null });
            }
            driver.Bus_id = null;
        } else {
            const bus = await Bus.findOne({ _id: busId, instituteId: instituteId });
            
            if (!bus) {
                return next(new AppError('Bus not found in your institute', 404));
            }
            
            if (bus.driver && bus.driver.toString() !== driver._id.toString()) {
                return next(new AppError('This bus is already assigned to another driver', 400));
            }
            
            if (driver.Bus_id && driver.Bus_id.toString() !== busId) {
                await Bus.findByIdAndUpdate(driver.Bus_id, { driver: null });
            }
            
            driver.Bus_id = busId;
            await Bus.findByIdAndUpdate(busId, { driver: driver._id });
        }
    }

    if (password) {
        driver.password = password;
    }

    await driver.save();

    const updatedDriver = await Driver.findById(driver._id)
        .populate('Bus_id', 'busNo busId')
        .lean();

    delete updatedDriver.password;

    res.status(200).json({
        status: 'success',
        message: 'Driver updated successfully',
        data: updatedDriver
    });
});

exports.deleteDriver = catchAsync(async (req, res, next) => {
    const { instituteId } = req.user;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError('Invalid driver ID', 400));
    }

    const driver = await Driver.findOne({ _id: id, Institute: instituteId });

    if (!driver) {
        return next(new AppError('Driver not found', 404));
    }

    if (driver.Bus_id) {
        await Bus.findByIdAndUpdate(driver.Bus_id, { driver: null });
    }

    await Driver.findByIdAndDelete(id);

    res.status(200).json({
        status: 'success',
        message: 'Driver deleted successfully'
    });
});

exports.updateDriverLocation = catchAsync(async (req, res, next) => {
    const driverId = req.user.id;
    const { latitude, longitude, speed, heading, accuracy } = req.body;

    if (!latitude || !longitude) {
        return next(new AppError('Latitude and longitude are required', 400));
    }

    if (latitude < -90 || latitude > 90) {
        return next(new AppError('Invalid latitude value', 400));
    }

    if (longitude < -180 || longitude > 180) {
        return next(new AppError('Invalid longitude value', 400));
    }

    const driver = await Driver.findById(driverId);

    if (!driver) {
        return next(new AppError('Driver not found', 404));
    }

    const locationUpdate = {
        coordinates: [longitude, latitude],
        speed: speed || 0,
        heading: heading || 0,
        accuracy: accuracy || 0,
        updatedAt: new Date()
    };

    await Driver.findByIdAndUpdate(driverId, {
        currentLocation: locationUpdate,
        lastActiveAt: new Date()
    });

    if (req.io && driver.Bus_id) {
        req.io.to(`bus-${driver.Bus_id}`).emit('driver-location', {
            busId: driver.Bus_id,
            driverId: driver._id,
            driverName: driver.name,
            location: {
                lat: latitude,
                lng: longitude
            },
            speed: speed || 0,
            timestamp: new Date()
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'Location updated',
        data: {
            latitude: latitude,
            longitude: longitude,
            updatedAt: new Date()
        }
    });
});

exports.getDriverProfile = catchAsync(async (req, res, next) => {
    const driverId = req.user.id;

    const driver = await Driver.findById(driverId)
        .populate('Bus_id', 'busNo busId startLocation endLocation capacity pickupPoints')
        .lean();

    if (!driver) {
        return next(new AppError('Driver not found', 404));
    }

    delete driver.password;

    res.status(200).json({
        status: 'success',
        data: driver
    });
});

exports.getDriverDashboard = catchAsync(async (req, res, next) => {
    const driverId = req.user.id;

    const driver = await Driver.findById(driverId)
        .populate('Bus_id', 'busNo busId capacity')
        .lean();

    if (!driver) {
        return next(new AppError('Driver not found', 404));
    }

    delete driver.password;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayTripCount = 0;
    let currentTrip = null;

    if (mongoose.models.Trip) {
        const Trip = mongoose.model('Trip');
        
        todayTripCount = await Trip.countDocuments({
            driverId: driverId,
            startTime: { $gte: today }
        });

        currentTrip = await Trip.findOne({
            driverId: driverId,
            status: 'ongoing'
        }).select('startTime status routeId currentStop');
    }

    res.status(200).json({
        status: 'success',
        data: {
            profile: {
                id: driver._id,
                name: driver.name,
                phoneNo: driver.phoneNo,
                email: driver.email,
                status: driver.status || 'active'
            },
            assignedBus: driver.Bus_id,
            statistics: {
                totalTripsToday: todayTripCount
            },
            currentTrip: currentTrip,
            lastActiveAt: driver.lastActiveAt || null
        }
    });
});

exports.updateDriverStatus = catchAsync(async (req, res, next) => {
    const driverId = req.user.id;
    const { status } = req.body;

    if (!status) {
        return next(new AppError('Status is required', 400));
    }

    const allowedStatuses = ['active', 'inactive', 'on_break'];
    if (!allowedStatuses.includes(status)) {
        return next(new AppError('Invalid status value', 400));
    }

    const driver = await Driver.findById(driverId);

    if (!driver) {
        return next(new AppError('Driver not found', 404));
    }

    driver.status = status;
    await driver.save();

    res.status(200).json({
        status: 'success',
        message: `Driver status updated to ${status}`,
        data: {
            status: driver.status
        }
    });
}); 
const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const Bus = require('../models/Bus');
const Trip = require('../models/Trip');
const Student = require('../models/StudentModel');
const Parent = require('../models/ParentModel');
const Attendance = require('../models/AttendanceModel');
const sendNotification = require('../utils/sendNotifications');
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
    console.log("Body",req.body);

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

    const accessToken = jwt.sign(
        {
            id: driver._id,
            role: 'driver',
            instituteId: driver.Institute,
            busId: driver.Bus_id
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
        { id: driver._id, role: 'driver' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    driver.lastLogin = new Date();
    await driver.save();

    const driverResponse = driver.toObject();
    delete driverResponse.password;

    let busDetails = null;
    if (driver.Bus_id) {
        busDetails = await Bus.findById(driver.Bus_id).select('busNo busId startLocation endLocation capacity');
    }

    const driverDataWithRole = {
        ...driverResponse,
        role: 'driver',
        busId: driver.Bus_id
    };

    res.status(200).json({
        success: true,
        status: 'success',
        message: 'Login successful',
        token: accessToken,
        accessToken: accessToken,
        refreshToken: refreshToken,
        driver: driverDataWithRole,
        data: {
            driver: driverDataWithRole,
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

exports.driverRefreshToken = catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return next(new AppError('Refresh token is required', 400));
    }

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
        return next(new AppError('Invalid or expired refresh token', 401));
    }

    const driver = await Driver.findById(decoded.id);
    if (!driver) {
        return next(new AppError('Driver not found', 404));
    }

    const newAccessToken = jwt.sign(
        {
            id: driver._id,
            role: 'driver',
            instituteId: driver.Institute,
            busId: driver.Bus_id
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    const newRefreshToken = jwt.sign(
        { id: driver._id, role: 'driver' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    res.status(200).json({
        status: 'success',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    });
});

// Get assigned route, stops, and student manifest for driver
exports.getAssignedRouteAndManifest = catchAsync(async (req, res, next) => {
    const driverId = req.user.id;
    const driver = await Driver.findById(driverId).populate('Bus_id');

    if (!driver) {
        return next(new AppError('Driver not found', 404));
    }

    if (!driver.Bus_id) {
        return res.status(200).json({
            status: 'success',
            hasAssignedBus: false,
            message: 'No bus currently assigned to your account'
        });
    }

    const bus = driver.Bus_id;
    const students = await Student.find({ busId: bus._id })
        .select('name rollNo phoneNo pickupLocation standard section')
        .lean();

    // Check pre-marked absences for today
    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const absentRecords = await Attendance.find({
        busId: bus._id,
        time: startOfToday,
        isPreMarked: true,
        attendance: 'absent'
    }).select('studentId reason').lean();

    const absentStudentIds = new Set(absentRecords.map(r => r.studentId.toString()));

    const manifest = students.map(student => ({
        studentId: student._id,
        studentName: student.name,
        rollNo: student.rollNo,
        phoneNo: student.phoneNo,
        pickupLocation: student.pickupLocation,
        standard: student.standard,
        section: student.section,
        attendanceStatus: absentStudentIds.has(student._id.toString()) ? 'absent' : 'present',
        pickupStatus: absentStudentIds.has(student._id.toString()) ? 'absent' : 'waiting'
    }));

    // Check if there is an active trip right now
    const activeTrip = await Trip.findOne({
        driverId: driver._id,
        status: 'ongoing'
    }).lean();

    res.status(200).json({
        status: 'success',
        hasAssignedBus: true,
        bus: {
            _id: bus._id,
            busId: bus.busId,
            busNo: bus.busNo,
            startLocation: bus.startLocation,
            endLocation: bus.endLocation,
            pickupPoints: bus.pickupPoints || [],
            capacity: bus.capacity
        },
        activeTrip: activeTrip || null,
        manifest: activeTrip ? activeTrip.studentManifest : manifest
    });
});

// Start a live trip
exports.startTrip = catchAsync(async (req, res, next) => {
    const driverId = req.user.id;
    const { tripType } = req.body; // 'pickup' | 'dropoff'

    const driver = await Driver.findById(driverId).populate('Bus_id');
    if (!driver || !driver.Bus_id) {
        return next(new AppError('Driver has no assigned bus to start a trip', 400));
    }

    // Check if active trip already exists
    let existingTrip = await Trip.findOne({
        driverId: driverId,
        status: 'ongoing'
    });

    if (existingTrip) {
        return res.status(200).json({
            status: 'success',
            message: 'Resumed existing active trip',
            data: existingTrip
        });
    }

    const bus = driver.Bus_id;
    const todayStr = new Date().toISOString().split('T')[0];

    // Build manifest from students assigned to bus
    const students = await Student.find({ busId: bus._id }).lean();
    
    // Check pre-marked absences for today
    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const absentRecords = await Attendance.find({
        busId: bus._id,
        time: startOfToday,
        isPreMarked: true,
        attendance: 'absent'
    }).lean();

    const absentStudentIds = new Set(absentRecords.map(r => r.studentId.toString()));

    const studentManifest = students.map(student => {
        const isAbsent = absentStudentIds.has(student._id.toString());
        return {
            studentId: student._id,
            studentName: student.name,
            rollNo: student.rollNo,
            phoneNo: student.phoneNo,
            pickupLocation: student.pickupLocation,
            attendanceStatus: isAbsent ? 'absent' : 'present',
            pickupStatus: isAbsent ? 'absent' : 'waiting'
        };
    });

    const newTrip = await Trip.create({
        busId: bus._id,
        driverId: driver._id,
        instituteId: driver.Institute,
        status: 'ongoing',
        tripType: tripType || 'pickup',
        serviceDate: todayStr,
        startTime: new Date(),
        studentManifest: studentManifest
    });

    driver.status = 'active';
    await driver.save();

    // Broadcast trip-start event via socket
    if (req.io) {
        req.io.to(bus._id.toString()).to(`bus-${bus._id.toString()}`).emit('trip-started', {
            tripId: newTrip._id,
            busId: bus._id,
            busNo: bus.busNo,
            driverName: driver.name,
            tripType: newTrip.tripType,
            startTime: newTrip.startTime
        });
    }

    // Send departure notifications to present students' parents
    const presentStudents = studentManifest.filter(s => s.attendanceStatus === 'present');
    presentStudents.forEach(async (studentItem) => {
        try {
            const parent = await Parent.findOne({
                ChildsRollNo: studentItem.rollNo,
                instituteId: driver.Institute
            });
            if (parent && parent.fcmToken) {
                await sendNotification(
                    parent.fcmToken,
                    'Bus On The Move! 🚌',
                    `School Bus ${bus.busNo} has started its journey for ${studentItem.studentName}.`
                );
            }
        } catch (e) {
            console.error('Failed to send trip start push:', e.message);
        }
    });

    res.status(201).json({
        status: 'success',
        message: 'Trip started successfully',
        data: newTrip
    });
});

// Get ongoing active trip for driver or by busId
exports.getActiveTrip = catchAsync(async (req, res, next) => {
    let query = { status: 'ongoing' };

    if (req.query.busId) {
        query.busId = req.query.busId;
    } else if (req.user && req.user.role === 'driver') {
        query.driverId = req.user.id;
    } else if (req.user && req.user.busId) {
        query.busId = req.user.busId;
    } else {
        return next(new AppError('busId query parameter is required', 400));
    }

    const trip = await Trip.findOne(query)
        .populate('busId', 'busNo busId startLocation endLocation pickupPoints')
        .populate('driverId', 'name phoneNo email')
        .lean();

    res.status(200).json({
        status: 'success',
        data: trip || null
    });
});

// Update student pickup or drop-off status in active trip
exports.updateStudentPickupStatus = catchAsync(async (req, res, next) => {
    const { tripId, studentId, status } = req.body;

    if (!tripId || !studentId || !status) {
        return next(new AppError('tripId, studentId, and status are required', 400));
    }

    const allowedStatuses = ['waiting', 'picked_up', 'dropped_off', 'absent', 'not_picked_up'];
    if (!allowedStatuses.includes(status)) {
        return next(new AppError(`Invalid status: ${status}. Must be one of: ${allowedStatuses.join(', ')}`, 400));
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
        return next(new AppError('Trip not found', 404));
    }

    const manifestItem = trip.studentManifest.find(item => item.studentId.toString() === studentId.toString());
    if (!manifestItem) {
        return next(new AppError('Student not found in this trip manifest', 404));
    }

    manifestItem.pickupStatus = status;
    manifestItem.updatedBy = req.user.id;
    if (status === 'picked_up') {
        manifestItem.pickedUpAt = new Date();
    } else if (status === 'dropped_off') {
        manifestItem.droppedOffAt = new Date();
    }

    await trip.save();

    // Persist to Attendance model for historical reporting
    try {
        const attendanceRecord = new Attendance({
            studentId: studentId,
            instituteId: trip.instituteId,
            busId: trip.busId,
            attendance: (status === 'picked_up' || status === 'dropped_off') ? 'present' : (status === 'absent' ? 'absent' : 'not-marked'),
            time: new Date()
        });
        await attendanceRecord.save();
    } catch (attErr) {
        console.error('Error saving attendance log:', attErr.message);
    }

    // Broadcast manifest update via socket
    if (req.io) {
        req.io.to(trip.busId.toString()).to(`bus-${trip.busId.toString()}`).emit('student-status-updated', {
            tripId: trip._id,
            busId: trip.busId,
            studentId: studentId,
            studentName: manifestItem.studentName,
            status: status,
            timestamp: new Date()
        });
    }

    // Send push notification to parent
    try {
        const parent = await Parent.findOne({
            ChildsRollNo: manifestItem.rollNo,
            instituteId: trip.instituteId
        });

        if (parent && parent.fcmToken) {
            let notifTitle = 'Student Update 🚸';
            let notifBody = `${manifestItem.studentName}'s status is now ${status}.`;

            if (status === 'picked_up') {
                notifTitle = 'Child Boarded Bus ✅';
                notifBody = `${manifestItem.studentName} was picked up and has boarded the school bus.`;
            } else if (status === 'dropped_off') {
                notifTitle = 'Child Dropped Off 🏡';
                notifBody = `${manifestItem.studentName} has been safely dropped off at destination.`;
            } else if (status === 'absent') {
                notifTitle = 'Marked Absent ❌';
                notifBody = `${manifestItem.studentName} was marked absent for the route.`;
            }

            await sendNotification(parent.fcmToken, notifTitle, notifBody);
        }
    } catch (notifErr) {
        console.error('Notification error on pickup status update:', notifErr.message);
    }

    res.status(200).json({
        status: 'success',
        message: `Student status updated to ${status}`,
        data: manifestItem
    });
});

// End active trip
exports.endTrip = catchAsync(async (req, res, next) => {
    const driverId = req.user.id;
    const { tripId } = req.body;

    let query = { driverId: driverId, status: 'ongoing' };
    if (tripId) query._id = tripId;

    const trip = await Trip.findOne(query);
    if (!trip) {
        return next(new AppError('No ongoing trip found to end', 404));
    }

    trip.status = 'completed';
    trip.endTime = new Date();
    await trip.save();

    if (req.io) {
        req.io.to(trip.busId.toString()).to(`bus-${trip.busId.toString()}`).emit('trip-ended', {
            tripId: trip._id,
            busId: trip.busId,
            endTime: trip.endTime
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'Trip completed successfully',
        data: trip
    });
});
 
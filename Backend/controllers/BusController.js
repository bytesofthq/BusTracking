const mongoose = require('mongoose');
const Bus = require('../models/Bus');
const Driver = require('../models/Driver');
const Student = require('../models/StudentModel');
const Attendance = require('../models/AttendanceModel');

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

exports.getPublicBusesByInstitute = catchAsync(async (req, res, next) => {
    const { instituteId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
        return next(new AppError('Invalid institute ID', 400));
    }
    const buses = await Bus.find({ instituteId })
        .select('_id busId busNo startLocation endLocation pickupPoints capacity')
        .lean();
    res.status(200).json({
        status: 'success',
        results: buses.length,
        buses: buses
    });
});

exports.getBusLiveLocation = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const cleanId = String(id).replace(/^bus-/, '');
    
    // Check in-memory real-time cache
    if (req.latestBusLocations && req.latestBusLocations[cleanId]) {
        return res.status(200).json({
            status: 'success',
            live: true,
            data: req.latestBusLocations[cleanId]
        });
    }

    // Check bus in DB
    let query = mongoose.Types.ObjectId.isValid(cleanId) ? { _id: cleanId } : { busId: cleanId };
    const bus = await Bus.findOne(query).populate('driver').lean();
    if (!bus) {
        return next(new AppError('Bus not found', 404));
    }

    // Fallback to driver's last known location or startLocation
    let locationData = {
        busId: bus._id.toString(),
        name: bus.busNo,
        lat: bus.startLocation?.lat || 0,
        lng: bus.startLocation?.lng || 0,
        speed: 0,
        heading: 0,
        status: 'stationary',
        timestamp: new Date().toISOString()
    };

    if (bus.driver && bus.driver.currentLocation && bus.driver.currentLocation.coordinates) {
        locationData.lng = bus.driver.currentLocation.coordinates[0];
        locationData.lat = bus.driver.currentLocation.coordinates[1];
        locationData.speed = bus.driver.currentLocation.speed || 0;
        locationData.heading = bus.driver.currentLocation.heading || 0;
        locationData.status = 'active';
        locationData.timestamp = bus.driver.currentLocation.updatedAt;
    }

    res.status(200).json({
        status: 'success',
        live: false,
        data: locationData
    });
});

// Attendance-driven route generation & optimization
exports.getOptimizedRouteForBus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    const cleanId = String(id).replace(/^bus-/, '');
    let query = mongoose.Types.ObjectId.isValid(cleanId) ? { _id: cleanId } : { busId: cleanId };
    const bus = await Bus.findOne(query).populate('driver', 'name phoneNo email').lean();

    if (!bus) {
        return next(new AppError('Bus not found', 404));
    }

    // Determine target date
    let serviceDateStr;
    let targetDate;
    if (date) {
        serviceDateStr = date;
        const parts = date.split('-');
        targetDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    } else {
        const today = new Date();
        serviceDateStr = today.toISOString().split('T')[0];
        targetDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    }

    // 1. Fetch all assigned students
    const assignedStudents = await Student.find({ busId: bus._id })
        .select('name rollNo pickupLocation standard section phoneNo')
        .lean();

    // 2. Fetch pre-marked absences for the target service date
    const absentRecords = await Attendance.find({
        busId: bus._id,
        time: targetDate,
        isPreMarked: true,
        attendance: 'absent'
    }).select('studentId reason').lean();

    const absentStudentIds = new Set(absentRecords.map(r => r.studentId.toString()));

    // 3. Separate eligible vs absent students
    const eligibleStudents = [];
    const absentStudents = [];

    assignedStudents.forEach(st => {
        if (absentStudentIds.has(st._id.toString())) {
            absentStudents.push({
                ...st,
                status: 'absent'
            });
        } else {
            eligibleStudents.push({
                ...st,
                status: 'present'
            });
        }
    });

    // Helper to calculate distance in meters
    function calculateDistanceMeters(coord1, coord2) {
        if (!coord1 || !coord2) return Infinity;
        const [lng1, lat1] = coord1;
        const [lng2, lat2] = coord2;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Helper to order stops from depot to school avoiding zigzagging
    function orderStopsLogically(startStop, intermediateStops, endStop) {
        const ordered = [startStop];
        const remaining = [...intermediateStops];
        let current = startStop;

        while (remaining.length > 0) {
            let nearestIdx = 0;
            let minDistance = Infinity;
            for (let i = 0; i < remaining.length; i++) {
                const dist = calculateDistanceMeters(current.coordinates, remaining[i].coordinates);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestIdx = i;
                }
            }
            current = remaining.splice(nearestIdx, 1)[0];
            ordered.push(current);
        }

        ordered.push(endStop);
        return ordered;
    }

    // Helper to fetch actual road path from OSRM
    async function fetchRoadGeometry(stopsList) {
        if (!stopsList || stopsList.length < 2) return null;
        try {
            const coordinatesStr = stopsList
                .map(s => `${s.coordinates[0].toFixed(6)},${s.coordinates[1].toFixed(6)}`)
                .join(';');
            const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesStr}?overview=full&geometries=geojson`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                if (data.routes && data.routes[0]) {
                    return {
                        coordinates: data.routes[0].geometry.coordinates,
                        distance: data.routes[0].distance,
                        duration: data.routes[0].duration
                    };
                }
            }
        } catch (e) {
            console.warn('[BusController] Road route fetch fallback:', e.message);
        }
        return null;
    }

    // 4. Build deduplicated intermediate stops
    const intermediateStops = [];

    // Eligible students
    eligibleStudents.forEach((student) => {
        if (student.pickupLocation && student.pickupLocation.lat && student.pickupLocation.lng) {
            const studentCoord = [student.pickupLocation.lng, student.pickupLocation.lat];
            const existing = intermediateStops.find(s => calculateDistanceMeters(s.coordinates, studentCoord) < 50);
            if (existing) {
                existing.students.push({ id: student._id, name: student.name, rollNo: student.rollNo });
                if (!existing.name.includes(student.name)) {
                    existing.name += `, ${student.name}`;
                }
            } else {
                intermediateStops.push({
                    id: `student-${student._id}`,
                    name: `${student.name} (${student.rollNo})`,
                    coordinates: studentCoord,
                    type: 'pickup',
                    students: [{ id: student._id, name: student.name, rollNo: student.rollNo }]
                });
            }
        }
    });

    // Static pickup points
    if (bus.pickupPoints && Array.isArray(bus.pickupPoints)) {
        bus.pickupPoints.forEach((point, pIdx) => {
            if (point.lng && point.lat) {
                const pointCoord = [point.lng, point.lat];
                const existing = intermediateStops.find(s => calculateDistanceMeters(s.coordinates, pointCoord) < 50);
                if (!existing) {
                    intermediateStops.push({
                        id: `stop-${pIdx}`,
                        name: point.name || `Stop ${pIdx + 1}`,
                        coordinates: pointCoord,
                        type: 'waypoint',
                        students: []
                    });
                }
            }
        });
    }

    const startStop = {
        id: 'start-depot',
        name: bus.startLocation?.name || 'Bus Depot / Start',
        coordinates: [bus.startLocation?.lng || 0, bus.startLocation?.lat || 0],
        type: 'depot',
        students: []
    };

    const endStop = {
        id: 'end-school',
        name: bus.endLocation?.name || 'School Destination',
        coordinates: [bus.endLocation?.lng || 0, bus.endLocation?.lat || 0],
        type: 'school',
        students: []
    };

    // 5. Order stops logically to avoid criss-crossing
    const orderedStops = orderStopsLogically(startStop, intermediateStops, endStop);

    // 6. Fetch turn-by-turn road polyline (road snapped)
    const roadData = await fetchRoadGeometry(orderedStops);
    const routeCoordinates = (roadData && roadData.coordinates && roadData.coordinates.length > 0)
        ? roadData.coordinates
        : orderedStops.map(s => s.coordinates);

    const geojson = {
        type: 'Feature',
        properties: {
            busId: bus.busId,
            busNo: bus.busNo,
            serviceDate: serviceDateStr,
            distanceMeters: roadData?.distance || null,
            durationSeconds: roadData?.duration || null,
            isRoadSnapped: !!(roadData && roadData.coordinates)
        },
        geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
        }
    };

    res.status(200).json({
        status: 'success',
        serviceDate: serviceDateStr,
        bus: {
            _id: bus._id,
            busId: bus.busId,
            busNo: bus.busNo,
            capacity: bus.capacity,
            driver: bus.driver
        },
        metrics: {
            totalAssignedStudents: assignedStudents.length,
            eligiblePresentStudents: eligibleStudents.length,
            excludedAbsentStudents: absentStudents.length,
            totalStops: orderedStops.length,
            distanceKm: roadData?.distance ? (roadData.distance / 1000).toFixed(2) : null,
            durationMinutes: roadData?.duration ? Math.round(roadData.duration / 60) : null
        },
        stops: orderedStops,
        eligibleStudents: eligibleStudents,
        absentStudents: absentStudents,
        geojson: geojson
    });
});

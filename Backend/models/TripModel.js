const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
    busId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    instituteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institute',
        required: true
    },
    status: {
        type: String,
        enum: ['ongoing', 'completed', 'cancelled'],
        default: 'ongoing'
    },
    tripType: {
        type: String,
        enum: ['pickup', 'dropoff'],
        default: 'pickup'
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    serviceDate: {
        type: String, // YYYY-MM-DD
        required: true
    },
    currentStopIndex: {
        type: Number,
        default: 0
    },
    studentManifest: [{
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student'
        },
        studentName: String,
        rollNo: String,
        phoneNo: String,
        pickupLocation: {
            lat: Number,
            lng: Number,
            name: String
        },
        attendanceStatus: {
            type: String,
            enum: ['present', 'absent', 'not-marked'],
            default: 'present'
        },
        pickupStatus: {
            type: String,
            enum: ['waiting', 'picked_up', 'dropped_off', 'absent', 'not_picked_up'],
            default: 'waiting'
        },
        pickedUpAt: Date,
        droppedOffAt: Date,
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Driver'
        }
    }],
    routeCoordinates: [{
        lat: Number,
        lng: Number,
        timestamp: Date
    }]
}, {
    timestamps: true
});

tripSchema.index({ driverId: 1, status: 1 });
tripSchema.index({ busId: 1, status: 1 });
tripSchema.index({ instituteId: 1, serviceDate: 1 });

module.exports = mongoose.model('Trip', tripSchema);

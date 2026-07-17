const mongoose = require('mongoose');

const attendanceSchema = mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },
    parentId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Parent"
    },
    instituteId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Institute",
        required: true
    },
    busId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bus",
        required: true
    },
    attendance: {
        type: String,
        enum: ["present", "absent", "not-marked"],
        default: "not-marked"
    },
    time: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            lat: Number,
            lng: Number
        },
        required: false
    },
    isPreMarked: {
        type: Boolean,
        default: false
    },
    reason: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

// Unique index to prevent duplicate planner entries for the same student on the same day
attendanceSchema.index({ studentId: 1, time: 1, isPreMarked: 1 }, { unique: true });

// Query indexes for drivers and institutes
attendanceSchema.index({ busId: 1, time: 1, attendance: 1 });
attendanceSchema.index({ instituteId: 1, time: 1, attendance: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
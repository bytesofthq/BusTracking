const mongoose = require('mongoose');

const attendanceSchema = mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student"
    },
    parentId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Parent"
    },
    instituteId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Institute"
    },
    busId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bus"
    },
    attendance: {
        type: String,
        enum: ["present", "absent","not-marked"],
        default:"not-marked"
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
        required: true
    }
})

module.exports = mongoose.model("Attendance", attendanceSchema);
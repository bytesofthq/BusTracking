const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = mongoose.Schema({
    name:{
type:String,
required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    instituteId:{
        type:mongoose.Schema.ObjectId,
        required:true,
    },
    busId:{
        type:mongoose.Schema.ObjectId,
        required:true,
    },
    pickupLocation:{
        type:{
            lat:{
                type:Number
            },
            lng:{
                type:Number
            }
        },
        required:true,
    },
    fcmToken:{
        type:String,
        required:true,
    },
    phoneNo:{
        type:String,
        required:true,
        unique:true,
    },
    rollNo:{
        type:String,
        required:true,
        unique:true
    },
    standard:{
        type:String,
        required:true,
    },
    section:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true,
    }


})

studentSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

studentSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Student",studentSchema);




// • Name
// • mongoose_id
// • institute name
// • bus_id
// • pickup_location
// • fcm_token
// • phoneNo
// • Roll_no
// • class
// • section





const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const parentSchema = mongoose.Schema({
parentName:{
    type:String,
     required:true,
    },

   childsName:{
   type:String,
   required:true,
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
    },
    ChildsRollNo:{
        type:String,
        required:true,
    },
     ChildsClass:{
        type:String,
        required:true,
    },
    ChildsSection:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true
    }



})

parentSchema.pre('save', async function (next) {
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

parentSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Parent",parentSchema);

















//  Parent_Name
// • Childs_Name
// • mongoose_id
// • institute name
// • institute_id - mongoose.Schema.Types.ObjectId
// • bus_id
// • pickup_location
// • fcm_token
// • phoneNo
// • Roll_no of student
// • class/standard
// • section
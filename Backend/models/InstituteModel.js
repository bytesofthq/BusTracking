const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

const instituteSchema = mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    totalBuses:{
        type:Number,
        required:true,
    },
    totalVans:{
        type:Number,
        required:true,
    },
    plan:{
        type:mongoose.Schema.ObjectId,
        required:true,
    },
    address:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true,
    },
})

instituteSchema.pre('save', async function (next) {
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

instituteSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const institute = mongoose.model("Institute",instituteSchema);
module.exports = institute;






//  Name
// • Total_Buses
// • Total_Vans
// • plan - mongoose.Schema.Types.ObjectId
// • Address
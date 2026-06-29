const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverSchema = mongoose.Schema({

name:{
    type:String,
    required:true
},
phoneNo:{
    type:String,
    required:true
},
Institute:{
    type:mongoose.Schema.ObjectId,
    required:true,
},
email:{
    type:String,
    required:true,
},
Bus_id:{
    type:mongoose.Schema.ObjectId,
    required:true,
},
password:{
    type:String,
    required:true,
}
})

driverSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

driverSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Driver",driverSchema);















//  name
// • phoneNo
// • Institute_id - mongoose.Schema.Types.ObjectId (relate to the institute)
// • email
// • Bus_id - mongoose.Schema.Types.ObjectId (relate to the Bus)
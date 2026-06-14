const mongoose = require('mongoose');

const subscriptionSchema = mongoose.Schema({
    instituteId:{
        type:mongoose.Schema.ObjectId,
        required:true,
    },
    planId:{
        type:mongoose.Schema.ObjectId,
        required:true,
    },
    status:{
        type:String,
        required:true,
    },
    startDate:{
        type:Date,
        required:true,
    },
    endDate:{
        type:Date,
        required:true,
    }
})

module.exports = mongoose.model("Subscription", subscriptionSchema);









//  user - mongoose.Schema.Types.ObjectId (relate to the institute)
// • plan - mongoose.Schema.Types.ObjectId (relate to the plan taken by institute)
// • status ("active", "cancelled", "expired")
// • startDate
// • endDate
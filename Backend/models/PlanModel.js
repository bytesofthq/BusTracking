const mongoose = require('mongoose');

const planSchema = mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    price:{
        type:Number,
        required:true,
    },
    interval:{
        type:String,
        required:true,
    },
    features:{
        type:Array,
        required:true,
    }
})

module.exports = mongoose.model("Plan",planSchema);








// • name
// • price
// • interval(monthly, yearly)
// • features(array)
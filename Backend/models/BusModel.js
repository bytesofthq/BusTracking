const mongoose = require('mongoose');

const busSchema = mongoose.Schema({
    busId:{
        type:String,
        required:true,
    },
    instituteId:{
        type:mongoose.Schema.ObjectId,
        required:true,
    },
    busNo:{
        type:String,
        required:true,
    },
    driver:{
        type:mongoose.Schema.ObjectId,
        required:true,
    },
    startLocation:{
        type:{
            name:{
                type:String,
            },
            lat:{
                type:Number,
            },
            lng:{
                type:Number,
            }
        },
        required:true,
    },
    endLocation:{
        type:{
            name:{
                type:String,
            },
            lat:{
                type:Number,
            },
            lng:{
                type:Number,
            }
        },
        required:true,
    },
    pickupPoints:{
        type:Array,
        required:true,
    },
    capacity:{
        type:Number,
        required:true,
    }
})



















//  BusId (given by school/institute)
// • Institute_id - mongoose.Schema.Types.ObjectId (relate to the institute)
// • BusNo (ex- UP32JJ8898)
// • driver - mongoose.Schema.Types.ObjectId (relate to the driver)
// • startLocation - { name, lat, lng }
// • endLocation - { name, lat, lng }
// • pickupPoints - array[{ name, lat, lng }]
// • capacity
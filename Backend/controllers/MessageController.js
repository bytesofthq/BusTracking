const Student = require('../models/StudentModel');
const sendNotification = require('../utils/sendNotifications');
const Parent = require('../models/ParentModel');
const Bus = require("../models/BusModel");
const Institute = require("../models/InstituteModel");

//Send Message 
exports.sendMessage = async (req,res)=>{
    try{
      const {busId} = req.params;
      const {title,body} = req.body;

      if(!title ||!body || !busId){
        return res.status(400).json({
            success:false,
            message:'All fields are required'
        })
      }

      const students = await Student.find({busId}).select('fcmToken');
      const parents = await Parent.find({busId}).select('fcmToken');

      if(students.length===0 && parents.length===0){
        return res.status(404).json({
            success:false,
            message:'No students found for this busId'
        })
      }

      students.forEach(async (student)=>{
        if(student.fcmToken){
            await sendNotification(student.fcmToken,title,body);
        }
      })

      parents.forEach(async (parent)=>{
        if(parent.fcmToken){
            await sendNotification(parent.fcmToken,title,body);
        }
      })

      res.status(200).json({
        success:true,
        message:'Message sent successfully'
      })
    }
    catch(err){
      console.log(err);
      res.status(500).json({
        success:false,
        message:'Internal server error'
      })
    }
}

exports.sendEmergencyMessage = async(req,res) => {
    try {
        const {busId} = req.params;
        const {title,body} = req.body;
        
        const bus = await Bus.findById(busId).select('instituteId');
        const instituteId = bus.instituteId;
        const institute = await Institute.findById(instituteId).select('fcmToken');

        if(!institute){
            return res.status(404).json({
                success:false,
                message:'Institute not found'
            })
        }

        await sendNotification(institute.fcmToken,title,body);

        res.status(200).json({
            success:true,
            message:'Emergency message sent successfully'
        })
    } catch (err) {
        console.error("Error sending emergency message:", err);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
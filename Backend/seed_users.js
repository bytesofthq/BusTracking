const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Plan = require('./models/PlanModel');
const Institute = require('./models/InstituteModel');
const Bus = require('./models/BusModel');
const Driver = require('./models/DriverModel');
const Parent = require('./models/ParentModel');
const Student = require('./models/StudentModel');

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully.\n');

    const rawPassword = '123456';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    // 1. Create or Find Plan
    let plan = await Plan.findOne({ name: 'Standard School Plan' });
    if (!plan) {
      plan = await Plan.create({
        name: 'Standard School Plan',
        price: 4999,
        interval: 'monthly',
        features: ['Real-time GPS Tracking', 'Attendance Tracking', 'Instant Parent Alerts', 'Route Optimization']
      });
      console.log('✅ Created Plan:', plan.name, `(${plan._id})`);
    } else {
      console.log('ℹ️ Existing Plan found:', plan.name, `(${plan._id})`);
    }

    // 2. Create or Update Admin (Institute)
    let institute = await Institute.findOne({ email: 'admin@test.com' });
    if (institute) {
      institute.password = rawPassword; // will be hashed by pre('save')
      institute.plan = plan._id;
      await institute.save();
      console.log('✅ Updated Admin/Institute password for admin@test.com');
    } else {
      institute = await Institute.create({
        name: 'TrackMyBus Demo School',
        email: 'admin@test.com',
        totalBuses: 10,
        totalVans: 4,
        plan: plan._id,
        address: '123 Campus Avenue, Knowledge City',
        password: rawPassword,
        fcmToken: 'demo_institute_fcm_token'
      });
      console.log('✅ Created Admin/Institute:', institute.email, `(${institute._id})`);
    }

    // 3. Create or Find Bus
    let bus = await Bus.findOne({ busNo: 'UP32-TB-1001' });
    const dummyDriverId = new mongoose.Types.ObjectId();
    if (!bus) {
      bus = await Bus.create({
        busId: 'BUS-101',
        instituteId: institute._id,
        busNo: 'UP32-TB-1001',
        driver: dummyDriverId,
        startLocation: {
          name: 'Main Campus Terminal',
          lat: 26.8467,
          lng: 80.9462
        },
        endLocation: {
          name: 'City Center Hub',
          lat: 26.8550,
          lng: 80.9580
        },
        pickupPoints: [
          { name: 'Station Road Stop', lat: 26.8480, lng: 80.9480 },
          { name: 'Green Park Gate', lat: 26.8510, lng: 80.9520 }
        ],
        capacity: 40
      });
      console.log('✅ Created Bus:', bus.busNo, `(${bus._id})`);
    } else {
      console.log('ℹ️ Existing Bus found:', bus.busNo, `(${bus._id})`);
    }

    // 4. Create or Update Driver
    let driver = await Driver.findOne({ email: 'driver@test.com' });
    if (driver) {
      driver.password = rawPassword;
      driver.Institute = institute._id;
      driver.Bus_id = bus._id;
      await driver.save();
      console.log('✅ Updated Driver password for driver@test.com');
    } else {
      driver = await Driver.create({
        name: 'Ramesh Kumar (Driver)',
        phoneNo: '9876500001',
        Institute: institute._id,
        email: 'driver@test.com',
        Bus_id: bus._id,
        password: rawPassword
      });
      console.log('✅ Created Driver:', driver.email, `(${driver._id})`);
    }

    // Update bus with real driver id
    bus.driver = driver._id;
    await bus.save();

    // 5. Create or Update Parent
    let parent = await Parent.findOne({
      $or: [{ phoneNo: '9876543210' }, { parentName: 'parent@test.com' }]
    });
    if (parent) {
      parent.password = rawPassword;
      parent.instituteId = institute._id;
      parent.busId = bus._id;
      parent.parentName = 'parent@test.com'; // supports login via email field or phone number
      await parent.save();
      console.log('✅ Updated Parent password for parent@test.com / 9876543210');
    } else {
      parent = await Parent.create({
        parentName: 'parent@test.com',
        childsName: 'Aarav Sharma',
        instituteId: institute._id,
        busId: bus._id,
        pickupLocation: {
          lat: 26.8480,
          lng: 80.9480
        },
        fcmToken: 'test_parent_fcm_token',
        phoneNo: '9876543210',
        ChildsRollNo: 'STU-001',
        ChildsClass: '10th',
        ChildsSection: 'A',
        password: rawPassword
      });
      console.log('✅ Created Parent:', parent.parentName, `(${parent._id})`);
    }

    // 6. Create or Update Test Student
    let testStudent = await Student.findOne({ email: 'student@test.com' });
    if (testStudent) {
      testStudent.password = rawPassword;
      testStudent.instituteId = institute._id;
      testStudent.busId = bus._id;
      await testStudent.save();
      console.log('✅ Updated Test Student password for student@test.com');
    } else {
      testStudent = await Student.create({
        name: 'Aarav Sharma',
        email: 'student@test.com',
        instituteId: institute._id,
        busId: bus._id,
        pickupLocation: {
          lat: 26.8480,
          lng: 80.9480
        },
        phoneNo: '9876500002',
        rollNo: 'STU-001',
        standard: '10th',
        section: 'A',
        password: rawPassword
      });
      console.log('✅ Created Student:', testStudent.email, `(${testStudent._id})`);
    }

    // 7. Also update existing students' passwords to 123456 and attach them to valid institute and bus
    const existingEmails = ['mohammeduzaid2@gmail.com', 'uzaidmohammed@gmail.com'];
    for (const email of existingEmails) {
      const stu = await Student.findOne({ email });
      if (stu) {
        stu.password = rawPassword;
        stu.instituteId = institute._id;
        stu.busId = bus._id;
        await stu.save();
        console.log(`✅ Reset password to '123456' for existing student: ${email}`);
      }
    }

    console.log('\n=============================================');
    console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
    console.log('=============================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  }
}

seed();

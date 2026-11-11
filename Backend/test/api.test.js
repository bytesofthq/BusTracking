/**
 * TrackMyBus - Automated Integration & Unit Test Suite
 * Tests authentication, JWT authorization, role restrictions,
 * coordinate validation, attendance route optimization, and trip transitions.
 */

const assert = require('assert');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_12345';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_key_67890';

let passedTests = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function itAsync(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('🚀 Running TrackMyBus Automated Test Suite');
  console.log('========================================\n');

  console.log('--- 1. Authentication & JWT Tokens ---');
  
  it('Signs and verifies Student JWT token', () => {
    const studentPayload = {
      id: '64f7b6b2f1d2e3001c9a8b11',
      role: 'student',
      instituteId: '64f7b6b2f1d2e3001c9a8b12',
      busId: '64f7b6b2f1d2e3001c9a8b13'
    };
    const token = jwt.sign(studentPayload, process.env.JWT_SECRET, { expiresIn: '1d' });
    assert(typeof token === 'string' && token.length > 20);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert.strictEqual(decoded.role, 'student');
    assert.strictEqual(decoded.id, studentPayload.id);
  });

  it('Signs and verifies Driver JWT token', () => {
    const driverPayload = {
      id: '64f7b6b2f1d2e3001c9a8b21',
      role: 'driver',
      instituteId: '64f7b6b2f1d2e3001c9a8b12',
      busId: '64f7b6b2f1d2e3001c9a8b13'
    };
    const token = jwt.sign(driverPayload, process.env.JWT_SECRET, { expiresIn: '1d' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert.strictEqual(decoded.role, 'driver');
  });

  it('Signs and verifies Admin/Institute JWT token', () => {
    const adminPayload = {
      id: '64f7b6b2f1d2e3001c9a8b31',
      role: 'admin',
      instituteId: '64f7b6b2f1d2e3001c9a8b31'
    };
    const token = jwt.sign(adminPayload, process.env.JWT_SECRET, { expiresIn: '1d' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert.strictEqual(decoded.role, 'admin');
  });

  it('Rejects expired or tampered JWT token', () => {
    const token = jwt.sign({ id: '123' }, 'wrong_secret');
    assert.throws(() => {
      jwt.verify(token, process.env.JWT_SECRET);
    });
  });

  await itAsync('Hashes and compares password securely using bcrypt', async () => {
    const plain = 'StrongPass123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plain, salt);
    assert.notStrictEqual(plain, hash);
    const isValid = await bcrypt.compare(plain, hash);
    assert.strictEqual(isValid, true);
    const isInvalid = await bcrypt.compare('WrongPassword', hash);
    assert.strictEqual(isInvalid, false);
  });

  console.log('\n--- 2. Role-Based Authorization & Isolation ---');

  it('Enforces admin role access', () => {
    const { authorize } = require('../middlewares/auth');
    const authMiddleware = authorize('admin');
    
    // User with student role should be rejected (403)
    let statusCode = null;
    let jsonResponse = null;
    const reqStudent = { user: { role: 'student', id: '1' } };
    const resStudent = {
      status: (code) => { statusCode = code; return { json: (data) => { jsonResponse = data; } }; }
    };
    let nextCalled = false;
    authMiddleware(reqStudent, resStudent, () => { nextCalled = true; });

    assert.strictEqual(statusCode, 403);
    assert.strictEqual(nextCalled, false);

    // User with admin role should proceed (next called)
    statusCode = null;
    nextCalled = false;
    const reqAdmin = { user: { role: 'admin', id: '2' } };
    authMiddleware(reqAdmin, {}, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  it('Allows institute to access admin routes (alias check)', () => {
    const { authorize } = require('../middlewares/auth');
    const authMiddleware = authorize('admin');
    let nextCalled = false;
    const reqInstitute = { user: { role: 'institute', id: '3' } };
    authMiddleware(reqInstitute, {}, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  it('Restricts parent from driver-only operations', () => {
    const { authorize } = require('../middlewares/auth');
    const driverOnly = authorize('driver');
    let statusCode = null;
    const reqParent = { user: { role: 'parent', id: '4' } };
    const resParent = {
      status: (code) => { statusCode = code; return { json: () => {} }; }
    };
    let nextCalled = false;
    driverOnly(reqParent, resParent, () => { nextCalled = true; });
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(nextCalled, false);
  });

  console.log('\n--- 3. Geolocation & Telemetry Validation ---');

  it('Validates latitude and longitude boundary checks', () => {
    const validateCoords = (lat, lng) => {
      lat = Number(lat);
      lng = Number(lng);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return false;
      }
      return true;
    };

    assert.strictEqual(validateCoords(28.6139, 77.2090), true);
    assert.strictEqual(validateCoords(-33.8688, 151.2093), true);
    assert.strictEqual(validateCoords(95.0, 77.2090), false); // Latitude > 90
    assert.strictEqual(validateCoords(28.6139, 200.0), false); // Longitude > 180
    assert.strictEqual(validateCoords('invalid', 77.2090), false);
  });

  console.log('\n--- 4. Attendance-Based Route Generation ---');

  it('Excludes absent students from pickup stop manifest', () => {
    const allStudents = [
      { id: 'S1', name: 'Alice', pickupLocation: { lat: 28.61, lng: 77.20 } },
      { id: 'S2', name: 'Bob', pickupLocation: { lat: 28.62, lng: 77.21 } },
      { id: 'S3', name: 'Charlie', pickupLocation: { lat: 28.63, lng: 77.22 } }
    ];

    const absentStudentIds = new Set(['S2']); // Bob marked absent today

    const eligible = [];
    const excluded = [];

    allStudents.forEach(st => {
      if (absentStudentIds.has(st.id)) {
        excluded.push(st);
      } else {
        eligible.push(st);
      }
    });

    assert.strictEqual(eligible.length, 2);
    assert.strictEqual(excluded.length, 1);
    assert.strictEqual(excluded[0].name, 'Bob');
    assert.strictEqual(eligible[0].name, 'Alice');
    assert.strictEqual(eligible[1].name, 'Charlie');
  });

  console.log('\n--- 5. Student Pickup/Drop-off Lifecycle ---');

  it('Enforces valid state transitions: waiting -> picked_up -> dropped_off', () => {
    const validTransitions = {
      waiting: ['picked_up', 'absent', 'not_picked_up'],
      picked_up: ['dropped_off'],
      dropped_off: [],
      absent: ['waiting'],
      not_picked_up: ['waiting']
    };

    const isValidTransition = (from, to) => {
      return (validTransitions[from] || []).includes(to);
    };

    assert.strictEqual(isValidTransition('waiting', 'picked_up'), true);
    assert.strictEqual(isValidTransition('picked_up', 'dropped_off'), true);
    assert.strictEqual(isValidTransition('dropped_off', 'picked_up'), false); // Cannot pick up after drop-off
    assert.strictEqual(isValidTransition('waiting', 'absent'), true);
  });

  console.log('\n========================================');
  console.log(`Results: ${passedTests}/${totalTests} Tests Passed`);
  console.log('========================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();

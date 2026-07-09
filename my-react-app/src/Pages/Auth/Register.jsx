import React, { useState } from 'react';
import { Mail, Lock, User, Shield, GraduationCap, Users, Truck, ArrowLeft, CheckCircle, Phone, FileText, MapPin } from 'lucide-react';
import { getFCMToken } from '../../firebase/fcm';

const MOCK_INSTITUTES = [
  { id: '64f7b6b2f1d2e3001c9a8b11', name: 'Oakridge International School 🏫' },
  { id: '64f7b6c8f1d2e3001c9a8b12', name: 'Springdale High School 🎒' },
  { id: '64f7b6d5f1d2e3001c9a8b13', name: 'Saint Mary Convent Academy 📚' }
];

const MOCK_BUSES = [
  { id: '64f8c122f1d2e3001c9a9c21', name: 'Bus 101 - route North Side 🚌' },
  { id: '64f8c13cf1d2e3001c9a9c22', name: 'Bus 102 - route East Avenue 🚌' },
  { id: '64f8c15bf1d2e3001c9a9c23', name: 'Bus 204 - route South Cross 🚌' }
];

function Register({ setCurrentPage, setIsLoggedIn, setUserRole }) {
  const [role, setRole] = useState('student'); // student | parent | driver
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Student Specific Fields (StudentModel.js)
  const [phoneNo, setPhoneNo] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [standard, setStandard] = useState('');
  const [section, setSection] = useState('');
  const [instituteId, setInstituteId] = useState('');
  const [busId, setBusId] = useState('');
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [otp, setOtp] = useState('');

  // OTP and GPS loading states
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Other Roles specific fields
  const [studentId, setStudentId] = useState(''); // Parent
  const [driverBusId, setDriverBusId] = useState(''); // Driver

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser 😢");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPickupLat(position.coords.latitude.toFixed(6));
        setPickupLng(position.coords.longitude.toFixed(6));
        setLocationLoading(false);
      },
      (error) => {
        console.error(error);
        alert("Unable to retrieve location. Please type coordinates manually! ✍️");
        setLocationLoading(false);
      }
    );
  };

  const handleSendOtp = async () => {
    if (!email) {
      alert('Please enter your email address first to receive the OTP! ✉️');
      return;
    }
    setSendingOtp(true);
    setError('');
    try {
      const response = await fetch('http://localhost:4000/api/otp/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setIsOtpSent(true);
        alert(`OTP sent successfully to ${email}! 🚀 Check your inbox!`);
      } else {
        alert(data.message || 'Failed to send OTP. Please check the email and try again.');
      }
    } catch (err) {
      console.error('[OTP Error]', err);
      alert('Failed to connect to the backend server. Make sure your backend server is running on port 4000!');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all the base details! 📝');
      return;
    }
    if (password !== confirmPassword) {
      setError('Uh oh! Passwords do not match. ❌');
      return;
    }

    // Role specific validation
    if (role === 'student') {
      if (!instituteId) {
        setError('Please select your School/Institute! 🏫');
        return;
      }
      if (!busId) {
        setError('Please select your assigned Bus Route! 🚌');
        return;
      }
      if (!phoneNo) {
        setError('Please tell us your Phone Number! 📱');
        return;
      }
      if (!rollNo) {
        setError('Please tell us your Roll Number! 🎒');
        return;
      }
      if (!standard || !section) {
        setError('Please enter your class Standard and Section! 📝');
        return;
      }
      if (!pickupLat || !pickupLng) {
        setError('Please specify your pickup location coordinates! 📍');
        return;
      }
      if (!otp) {
        setError('Please enter the OTP verification code! ✉️');
        return;
      }
    } else if (role === 'parent') {
      if (!studentId) {
        setError('Please link your child\'s Student ID! 🎒');
        return;
      }
    } else if (role === 'driver') {
      if (!driverBusId) {
        setError('Please select your assigned Bus ID! 🛞');
        return;
      }
    }

    setError('');
    setLoading(true);

    try {
      // Generate FCM token
      const token = await getFCMToken();
      if (token) {
        console.log(`[FCM] Token generated successfully for register (${role}):`, token);
        localStorage.setItem('fcmToken', token);
      } else {
        console.warn('[FCM] Permission denied or token generation failed.');
      }
    } catch (err) {
      console.error('[FCM] Error requesting token during register:', err);
    }

    // Perform actual API register
    try {
      if (role === 'student') {
        const response = await fetch('http://localhost:4000/api/student/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            instituteId,
            busId,
            pickupLocation: {
              lat: Number(pickupLat),
              lng: Number(pickupLng),
            },
            fcmToken: localStorage.getItem('fcmToken') || '',
            phoneNo,
            rollNo,
            standard,
            section,
            password,
            otp,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          setError(data.message || 'Registration failed ❌');
          setLoading(false);
          return;
        }

        console.log('[Register] Student registered successfully:', data);
        alert('Student registered successfully! 🎉');
        localStorage.setItem('currentUser', JSON.stringify(data.student || { name, email, role }));
      } else if (role === 'parent') {
        // If parent registration endpoints are also expected:
        const response = await fetch('http://localhost:4000/api/parent/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            parentName: name,
            childsName: 'Child of ' + name, 
            instituteId: '64f7b6b2f1d2e3001c9a8b11', // default mock ObjectId since parent form is simple
            busId: '64f8c122f1d2e3001c9a9c21', 
            pickupLocation: { lat: 0, lng: 0 },
            fcmToken: localStorage.getItem('fcmToken') || '',
            phoneNo: '+123456789', // mock
            ChildsRollNo: studentId,
            ChildsClass: 'Class 10',
            ChildsSection: 'A',
            password,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          setError(data.message || 'Registration failed ❌');
          setLoading(false);
          return;
        }
        alert('Parent registered successfully! 🎉');
        localStorage.setItem('currentUser', JSON.stringify(data.parent || { name, email, role }));
      }
    } catch (err) {
      console.error('[Register error]', err);
      setError('Connection failed. Make sure the backend server is running! ❌');
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }

    setIsLoggedIn(true);
    setUserRole(role);
    setCurrentPage('home');
  };

  return (
    <div className="flex justify-center items-center py-12 px-6 flex-grow min-h-[80vh]">
      <div className="clay-card w-full max-w-[480px] bg-white text-center anim-float">
        {/* Playful Header */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className={`flex items-center justify-center w-20 h-20 rounded-full border-4 border-white/40 shadow-[inset_-6px_-6px_12px_rgba(0,0,0,0.15),inset_6px_6px_12px_rgba(255,255,255,0.4),0_8px_20px_rgba(0,0,0,0.15)] mb-4 transition-all duration-300 ${
            role === 'student' ? 'bg-clay-blue shadow-clay-blue/30' : role === 'parent' ? 'bg-clay-green shadow-clay-green/30' : 'bg-clay-yellow shadow-clay-yellow/30'
          }`}>
            {role === 'student' && <GraduationCap size={36} color="#ffffff" />}
            {role === 'parent' && <Users size={36} color="#ffffff" />}
            {role === 'driver' && <Truck size={36} color="#ffffff" />}
          </div>
          <h2 className="text-3xl font-friendly text-clay-text-dark font-semibold">Create Account</h2>
          <p className="text-[0.95rem] text-clay-text-muted max-w-[300px]">Join TrackMyBus to begin tracking school buses live!</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex gap-1.5 bg-clay-bg p-1.5 rounded-[18px] shadow-[inset_2px_2px_5px_rgba(166,180,200,0.15),inset_-2px_-2px_5px_rgba(255,255,255,0.7)] mb-8">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`flex-1 border-none bg-transparent py-2.5 px-1.5 rounded-xl font-friendly font-semibold text-[0.85rem] cursor-pointer transition-all duration-200 ${
              role === 'student' 
                ? 'bg-clay-blue text-white shadow-[3px_3px_6px_rgba(91,150,245,0.3),inset_-3px_-3px_6px_rgba(0,0,0,0.1),inset_3px_3px_6px_rgba(255,255,255,0.4)]' 
                : 'text-clay-text-muted hover:text-clay-blue'
            }`}
          >
            🎒 Student
          </button>
          <button
            type="button"
            onClick={() => setRole('parent')}
            className={`flex-1 border-none bg-transparent py-2.5 px-1.5 rounded-xl font-friendly font-semibold text-[0.85rem] cursor-pointer transition-all duration-200 ${
              role === 'parent' 
                ? 'bg-clay-green text-white shadow-[3px_3px_6px_rgba(92,192,117,0.3),inset_-3px_-3px_6px_rgba(0,0,0,0.1),inset_3px_3px_6px_rgba(255,255,255,0.4)]' 
                : 'text-clay-text-muted hover:text-clay-green'
            }`}
          >
            🏡 Parent
          </button>
          <button
            type="button"
            onClick={() => setRole('driver')}
            className={`flex-1 border-none bg-transparent py-2.5 px-1.5 rounded-xl font-friendly font-semibold text-[0.85rem] cursor-pointer transition-all duration-200 ${
              role === 'driver' 
                ? 'bg-clay-yellow text-clay-text-dark shadow-[3px_3px_6px_rgba(248,200,71,0.3),inset_-3px_-3px_6px_rgba(0,0,0,0.1),inset_3px_3px_6px_rgba(255,255,255,0.4)]' 
                : 'text-clay-text-muted hover:text-clay-yellow'
            }`}
          >
            🚌 Driver
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && <div className="clay-badge clay-badge-orange w-full block text-center py-2.5 px-4 rounded-xl border-2">{error}</div>}

          {/* Full Name Input */}
          <div className="flex flex-col">
            <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">Full Name</label>
            <div className="relative flex items-center">
              <User size={18} className="text-slate-400 absolute left-4 z-10" />
              <input
                type="text"
                placeholder="Alex Morgan"
                className="clay-input pl-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="flex flex-col">
            <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">Email Address</label>
            <div className="relative flex items-center">
              <Mail size={18} className="text-slate-400 absolute left-4 z-10" />
              <input
                type="email"
                placeholder="alex@school.com"
                className="clay-input pl-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Dynamic Role-Specific Fields */}
          {role === 'student' && (
            <>
              {/* School and Bus Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">School/Institute</label>
                  <select
                    className="clay-input pr-4 bg-white cursor-pointer"
                    value={instituteId}
                    onChange={(e) => setInstituteId(e.target.value)}
                  >
                    <option value="">Select School</option>
                    {MOCK_INSTITUTES.map((inst) => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">Bus Route</label>
                  <select
                    className="clay-input pr-4 bg-white cursor-pointer"
                    value={busId}
                    onChange={(e) => setBusId(e.target.value)}
                  >
                    <option value="">Select Bus Route</option>
                    {MOCK_BUSES.map((bus) => (
                      <option key={bus.id} value={bus.id}>{bus.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone and Roll No */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">Phone Number</label>
                  <div className="relative flex items-center">
                    <Phone size={18} className="text-slate-400 absolute left-4 z-10" />
                    <input
                      type="tel"
                      placeholder="e.g. +123456789"
                      className="clay-input pl-11"
                      value={phoneNo}
                      onChange={(e) => setPhoneNo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">Roll Number</label>
                  <div className="relative flex items-center">
                    <FileText size={18} className="text-slate-400 absolute left-4 z-10" />
                    <input
                      type="text"
                      placeholder="e.g. ROLL-102"
                      className="clay-input pl-11"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Class Standard and Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">Class/Standard</label>
                  <input
                    type="text"
                    placeholder="e.g., Grade 10"
                    className="clay-input"
                    value={standard}
                    onChange={(e) => setStandard(e.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">Section</label>
                  <input
                    type="text"
                    placeholder="e.g., Sec A"
                    className="clay-input"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                  />
                </div>
              </div>

              {/* Pickup Location Coords with GPS */}
              <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.05)]">
                <span className="text-[0.9rem] font-semibold text-clay-text-dark text-left font-friendly flex items-center gap-1">
                  <MapPin size={16} className="text-clay-blue" /> Pickup Location Coordinates
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[0.8rem] text-slate-500 block text-left mb-1">Latitude</label>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="e.g. 26.8467" 
                      className="clay-input py-2 text-sm bg-white"
                      value={pickupLat}
                      onChange={(e) => setPickupLat(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[0.8rem] text-slate-500 block text-left mb-1">Longitude</label>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="e.g. 80.9462" 
                      className="clay-input py-2 text-sm bg-white"
                      value={pickupLng}
                      onChange={(e) => setPickupLng(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  className="mt-2 text-xs font-bold text-clay-blue hover:text-clay-blue-dark flex items-center justify-center gap-1 self-center bg-white py-1.5 px-3 rounded-full border border-clay-blue/20 shadow-sm cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  {locationLoading ? 'Fetching GPS...' : '🎯 Auto-detect my GPS Coords'}
                </button>
              </div>

              {/* Email Verification OTP */}
              <div className="flex flex-col gap-2 mt-1">
                <label className="clay-label font-friendly font-semibold text-[0.95rem] text-clay-text-dark text-left">Email Verification OTP</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="6-digit OTP"
                    maxLength={6}
                    className="clay-input flex-1"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || !email}
                    className={`clay-btn text-xs py-2.5 px-4 rounded-xl whitespace-nowrap ${
                      isOtpSent ? 'clay-btn-green text-white shadow-clay-green/30' : 'clay-btn-blue text-white shadow-clay-blue/30'
                    } ${(!email || sendingOtp) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {sendingOtp ? 'Sending...' : isOtpSent ? 'Resend OTP 🔁' : 'Send OTP ✉️'}
                  </button>
                </div>
                {!email && <span className="text-[0.8rem] text-clay-orange text-left font-semibold">Enter your email first to send OTP!</span>}
              </div>
            </>
          )}

          {role === 'parent' && (
            <div className="flex flex-col">
              <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">Student ID to Track</label>
              <div className="relative flex items-center">
                <GraduationCap size={18} className="text-slate-400 absolute left-4 z-10" />
                <input
                  type="text"
                  placeholder="e.g., STU-99482"
                  className="clay-input pl-11"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </div>
            </div>
          )}

          {role === 'driver' && (
            <div className="flex flex-col">
              <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">Assigned Vehicle/Bus ID</label>
              <div className="relative flex items-center">
                <Shield size={18} className="text-slate-400 absolute left-4 z-10" />
                <input
                  type="text"
                  placeholder="e.g., BUS-X78"
                  className="clay-input pl-11"
                  value={driverBusId}
                  onChange={(e) => setDriverBusId(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Password Input */}
          <div className="flex flex-col">
            <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">Create Password</label>
            <div className="relative flex items-center">
              <Lock size={18} className="text-slate-400 absolute left-4 z-10" />
              <input
                type="password"
                placeholder="••••••••"
                className="clay-input pl-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="flex flex-col">
            <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">Confirm Password</label>
            <div className="relative flex items-center">
              <Lock size={18} className="text-slate-400 absolute left-4 z-10" />
              <input
                type="password"
                placeholder="••••••••"
                className="clay-input pl-11"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Submit button */}
          <button 
            type="submit" 
            disabled={loading}
            className={`clay-btn clay-btn-green w-full mt-2 py-3.5 rounded-2xl flex justify-center items-center gap-2 transition-all ${
              loading ? 'opacity-85 cursor-wait' : ''
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing Notifications...
              </span>
            ) : (
              <>
                <CheckCircle size={20} />
                Register & Explore
              </>
            )}
          </button>
        </form>

        {/* Footer link to Login */}
        <div className="mt-8 pt-6 border-t-3 border-clay-bg text-[0.9rem]">
          <span className="text-clay-text-muted font-clean">Already have an account? </span>
          <button 
            className="border-none bg-transparent text-clay-blue text-[0.9rem] font-bold cursor-pointer font-friendly hover:underline" 
            onClick={() => setCurrentPage('login')}
          >
            <ArrowLeft size={14} className="mr-1 inline-block" /> Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;

import React, { useState } from 'react';
import { Mail, Lock, User, Shield, GraduationCap, Users, Truck, ArrowLeft, CheckCircle } from 'lucide-react';

function Register({ setCurrentPage, setIsLoggedIn, setUserRole }) {
  const [role, setRole] = useState('student'); // student | parent | driver
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Role specific fields
  const [routeNo, setRouteNo] = useState('');
  const [busId, setBusId] = useState('');
  const [studentId, setStudentId] = useState('');

  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all the base details! 📝');
      return;
    }
    if (password !== confirmPassword) {
      setError('Uh oh! Passwords do not match. ❌');
      return;
    }
    if (role === 'student' && !routeNo) {
      setError('Please tell us your School Route Number! 🚌');
      return;
    }
    if (role === 'parent' && !studentId) {
      setError('Please link your child\'s Student ID! 🎒');
      return;
    }
    if (role === 'driver' && !busId) {
      setError('Please register your assigned Bus ID! 🛞');
      return;
    }

    setError('');
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
            <div className="flex flex-col">
              <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">School Bus Route No.</label>
              <div className="relative flex items-center">
                <Truck size={18} className="text-slate-400 absolute left-4 z-10" />
                <input
                  type="text"
                  placeholder="e.g., Route 42B"
                  className="clay-input pl-11"
                  value={routeNo}
                  onChange={(e) => setRouteNo(e.target.value)}
                />
              </div>
            </div>
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
                  value={busId}
                  onChange={(e) => setBusId(e.target.value)}
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
          <button type="submit" className="clay-btn clay-btn-green w-full mt-2 py-3.5 rounded-2xl flex justify-center items-center gap-2">
            <CheckCircle size={20} />
            Register & Explore
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

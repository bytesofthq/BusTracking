import React, { useState } from 'react';
import { Mail, Lock, LogIn, ArrowRight, GraduationCap, Users, Truck } from 'lucide-react';
import { getFCMToken } from '../../firebase/fcm';

function Login({ setCurrentPage, setIsLoggedIn, setUserRole }) {
  const [role, setRole] = useState('student'); // student | parent | driver
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all the details! 📝');
      return;
    }
    
    setError('');
    setLoading(true);

    let generatedFcmToken = '';
    try {
      // Generate FCM token
      const token = await getFCMToken();
      if (token) {
        console.log(`[FCM] Token generated successfully for ${role}:`, token);
        localStorage.setItem('fcmToken', token);
        generatedFcmToken = token;
      } else {
        console.warn('[FCM] Permission denied or token generation failed.');
      }
    } catch (err) {
      console.error('[FCM] Error requesting token:', err);
    }

    // Hit real backend login
    try {
      const endpoint = role === 'student' 
        ? 'http://localhost:4000/api/student/login'
        : role === 'parent'
        ? 'http://localhost:4000/api/parent/login'
        : 'http://localhost:4000/api/driver/login';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          fcmToken: generatedFcmToken || localStorage.getItem('fcmToken') || ''
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || 'Login failed! Check credentials. ❌');
        setLoading(false);
        return;
      }

      console.log('[Login] Login successful:', data);
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('currentUser', JSON.stringify(data.student || data.parent || data.driver || { role }));
    } catch (err) {
      console.error('[Login Error]', err);
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
    <div className="flex justify-center items-center py-12 px-6 flex-grow min-h-[65vh]">
      <div className="clay-card w-full max-w-[460px] bg-white text-center anim-float">
        {/* Playful Header */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className={`flex items-center justify-center w-20 h-20 rounded-full border-4 border-white/40 shadow-[inset_-6px_-6px_12px_rgba(0,0,0,0.15),inset_6px_6px_12px_rgba(255,255,255,0.4),0_8px_20px_rgba(0,0,0,0.15)] mb-4 transition-all duration-300 ${
            role === 'student' ? 'bg-clay-blue shadow-clay-blue/30' : role === 'parent' ? 'bg-clay-green shadow-clay-green/30' : 'bg-clay-yellow shadow-clay-yellow/30'
          }`}>
            {role === 'student' && <GraduationCap size={36} color="#ffffff" />}
            {role === 'parent' && <Users size={36} color="#ffffff" />}
            {role === 'driver' && <Truck size={36} color="#ffffff" />}
          </div>
          <h2 className="text-3xl font-friendly text-clay-text-dark font-semibold">Welcome Back!</h2>
          <p className="text-[0.95rem] text-clay-text-muted max-w-[300px]">Let's get logged in so you can track your ride!</p>
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

          {/* Email / ID Input */}
          <div className="flex flex-col">
            <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">
              {role === 'student' ? 'Student Email or ID' : role === 'parent' ? 'Parent Email' : 'Driver Registration ID'}
            </label>
            <div className="relative flex items-center">
              <Mail size={18} className="text-slate-400 absolute left-4 z-10" />
              <input
                type="text"
                placeholder={role === 'student' ? 'student@school.edu' : role === 'parent' ? 'parent@home.com' : 'driver-9922'}
                className="clay-input pl-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="flex flex-col">
            <label className="clay-label font-friendly font-semibold mb-2 text-[0.95rem] text-clay-text-dark text-left">Password</label>
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

          {/* Remember me & Forgot Pass */}
          <div className="flex justify-between items-center mt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-clay-blue w-4 h-4 cursor-pointer" />
              <span className="text-[0.9rem] text-clay-text-muted select-none">Keep me logged in</span>
            </label>
            <button 
              type="button" 
              className="border-none bg-transparent text-clay-blue text-[0.85rem] font-semibold cursor-pointer font-friendly" 
              onClick={() => alert('Forgot password helper: Contact your school transport coordinator to reset your credentials!')}
            >
              Forgot Password?
            </button>
          </div>

          {/* Action button */}
          <button 
            type="submit" 
            disabled={loading}
            className={`clay-btn clay-btn-blue w-full mt-2 py-3.5 rounded-2xl flex justify-center items-center gap-2 transition-all ${
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
                <LogIn size={20} />
                Let's Go!
              </>
            )}
          </button>
        </form>

        {/* Footer link to Register */}
        <div className="mt-8 pt-6 border-t-3 border-clay-bg text-[0.9rem]">
          <span className="text-clay-text-muted font-clean">New to TrackMyBus? </span>
          <button 
            className="border-none bg-transparent text-clay-blue text-[0.9rem] font-bold cursor-pointer font-friendly hover:underline" 
            onClick={() => setCurrentPage('register')}
          >
            Create an account <ArrowRight size={14} className="ml-1 inline-block" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;

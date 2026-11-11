import React, { useState, useEffect, useCallback } from 'react';
import { 
  GraduationCap, Bus, MapPin, Navigation, Clock, CheckCircle, 
  XCircle, Phone, RefreshCw, ShieldCheck 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function StudentDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [bus, setBus] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/student/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStudent(data.student);
        setBus(data.bus);
        setActiveTrip(data.activeTrip);
      }
    } catch (err) {
      console.error('[StudentDashboard] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const getTripStatusText = () => {
    if (!activeTrip) return 'Awaiting Morning Departure';
    const manifestItem = activeTrip.studentManifest?.find(
      (m) => String(m.studentId) === String(student?._id)
    );
    if (!manifestItem) return 'Scheduled on Route';
    if (manifestItem.pickupStatus === 'picked_up') return 'On Board Bus ✅';
    if (manifestItem.pickupStatus === 'dropped_off') return 'Arrived at Destination 🏡';
    if (manifestItem.pickupStatus === 'absent') return 'Marked Absent ❌';
    return 'Bus En Route to Pickup ⏳';
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 px-4">
        <div className="clay-card flex flex-col items-center gap-4 p-8">
          <RefreshCw size={36} className="text-clay-blue animate-spin" />
          <h3 className="text-xl font-friendly font-semibold text-clay-text-dark">Loading Student Portal...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-8 w-full flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="text-left">
          <div className="clay-badge clay-badge-blue border-2 text-[0.8rem] py-0.5 px-3 mb-1">
            <GraduationCap size={14} className="inline mr-1" />
            <span>Student Transportation Portal</span>
          </div>
          <h1 className="text-3xl font-friendly font-bold text-clay-text-dark">
            Welcome back, {student?.name || 'Student'}! 🎒
          </h1>
        </div>

        {bus && (
          <button
            onClick={() => navigate(`/tracking?busId=${bus._id || bus.busId}`)}
            className="clay-btn clay-btn-blue py-3 px-6 rounded-2xl flex items-center gap-2 font-friendly font-bold shadow-md cursor-pointer text-sm"
          >
            <Navigation size={18} />
            <span>Track My Bus Live</span>
          </button>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Personal Details */}
        <div className="clay-card bg-white p-6 md:p-8 flex flex-col gap-4 text-left">
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
            <h3 className="text-xl font-friendly font-bold text-clay-text-dark flex items-center gap-2">
              <GraduationCap size={20} className="text-clay-blue" />
              <span>Student Details</span>
            </h3>
            <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold">
              Grade {student?.standard} - Sec {student?.section}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Full Name:</span>
              <span className="font-bold text-clay-text-dark">{student?.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Roll Number:</span>
              <span className="font-mono font-bold text-clay-text-dark">{student?.rollNo}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Phone Number:</span>
              <span className="font-semibold text-slate-600">{student?.phoneNo}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Pickup Coords:</span>
              <span className="font-mono text-xs text-slate-500">
                {student?.pickupLocation?.lat?.toFixed(4)}, {student?.pickupLocation?.lng?.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* Assigned Bus Status */}
        <div className="clay-card bg-white p-6 md:p-8 flex flex-col gap-4 text-left">
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
            <h3 className="text-xl font-friendly font-bold text-clay-text-dark flex items-center gap-2">
              <Bus size={20} className="text-clay-yellow-dark" />
              <span>Assigned Ride</span>
            </h3>
            <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg font-bold">
              {bus?.busNo || 'Route Assigned'}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Bus Number:</span>
              <span className="font-bold text-clay-text-dark">{bus?.busNo} ({bus?.busId})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Ride Status:</span>
              <span className="font-bold text-clay-green">{getTripStatusText()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Starting Depot:</span>
              <span className="font-semibold text-slate-600 truncate max-w-[60%]">
                {bus?.startLocation?.name || 'Depot'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">School Destination:</span>
              <span className="font-semibold text-slate-600 truncate max-w-[60%]">
                {bus?.endLocation?.name || 'School Gates'}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default StudentDashboard;

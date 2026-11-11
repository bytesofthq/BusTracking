import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Bus, MapPin, Calendar, Clock, Bell, CheckCircle, 
  XCircle, ArrowRight, Navigation, ShieldCheck, Phone, RefreshCw, AlertCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function ParentDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const [loading, setLoading] = useState(true);
  const [parentData, setParentData] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [busData, setBusData] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);

  // Leave Planner Calendar state
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [calendarWeeks, setCalendarWeeks] = useState([]);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerReason, setPlannerReason] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Fetch Parent profile & linked child dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/parent/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setParentData(data.parent);
        setStudentData(data.student);
        setBusData(data.bus);
        setActiveTrip(data.activeTrip);
      }
    } catch (err) {
      console.error('[ParentDashboard] Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch leave planner calendar for the selected month
  const fetchPlannerMonth = useCallback(async () => {
    try {
      setPlannerLoading(true);
      const res = await fetch(`${API_BASE}/api/attendance/planner?year=${currentYear}&month=${currentMonth}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.weeks) {
        setCalendarWeeks(data.weeks);
      }
    } catch (err) {
      console.error('[ParentDashboard] Error loading planner:', err);
    } finally {
      setPlannerLoading(false);
    }
  }, [token, currentYear, currentMonth]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    fetchPlannerMonth();
  }, [fetchPlannerMonth]);

  // Toggle planned attendance/leave for a specific date
  const handleToggleLeave = async (dateStr, currentStatus) => {
    const nextStatus = currentStatus === 'absent' ? 'present' : 'absent';
    try {
      const res = await fetch(`${API_BASE}/api/attendance/planner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: dateStr,
          status: nextStatus,
          reason: nextStatus === 'absent' ? (plannerReason || 'Family planned leave') : ''
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await fetchPlannerMonth();
        alert(`Attendance updated: ${dateStr} marked as ${nextStatus.toUpperCase()}! ✅`);
      } else {
        alert(data.message || 'Could not update leave record.');
      }
    } catch (err) {
      console.error('[ParentDashboard] Leave update error:', err);
      alert('Network error while updating leave.');
    }
  };

  // Determine child's trip status
  const childPickupStatus = () => {
    if (!activeTrip || !studentData) return 'Awaiting Route Start';
    const manifestItem = activeTrip.studentManifest?.find(
      (m) => String(m.studentId) === String(studentData._id) || m.rollNo === studentData.rollNo
    );
    if (!manifestItem) return 'Scheduled on Bus';
    if (manifestItem.pickupStatus === 'picked_up') return 'On Board Bus ✅';
    if (manifestItem.pickupStatus === 'dropped_off') return 'Safely Dropped Off 🏡';
    if (manifestItem.pickupStatus === 'absent') return 'Marked Absent ❌';
    return 'Waiting for Bus ⏳';
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 px-4">
        <div className="clay-card flex flex-col items-center gap-4 p-8">
          <RefreshCw size={36} className="text-clay-green animate-spin" />
          <h3 className="text-xl font-friendly font-semibold text-clay-text-dark">Loading Parent Portal...</h3>
          <p className="text-sm text-clay-text-muted">Fetching linked student records, bus status, and attendance plan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 md:px-8 w-full flex flex-col gap-8">
      
      {/* Welcome Banner */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="text-left">
          <div className="clay-badge clay-badge-green border-2 text-[0.8rem] py-0.5 px-3 mb-1">
            <Users size={14} className="inline mr-1" />
            <span>Parent Dashboard</span>
          </div>
          <h1 className="text-3xl font-friendly font-bold text-clay-text-dark">
            Hello, {parentData?.parentName || 'Parent'} 👋
          </h1>
          <p className="text-sm text-clay-text-muted">
            Track your child's bus in real-time and manage upcoming transportation attendance.
          </p>
        </div>

        {/* Live Tracking Quick Button */}
        {busData && (
          <button
            onClick={() => navigate(`/tracking?busId=${busData._id || busData.busId}`)}
            className="clay-btn clay-btn-blue py-3 px-6 rounded-2xl flex items-center gap-2 font-friendly font-bold shadow-md cursor-pointer text-sm"
          >
            <Navigation size={18} />
            <span>Track Bus {busData.busNo} Live</span>
          </button>
        )}
      </div>

      {/* Linked Child & Bus Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Student Profile Card */}
        <div className="clay-card bg-white p-6 md:p-8 flex flex-col gap-4 text-left">
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
            <h3 className="text-xl font-friendly font-bold text-clay-text-dark flex items-center gap-2">
              <Users size={20} className="text-clay-green" />
              <span>Linked Student</span>
            </h3>
            <span className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-lg font-bold">
              {studentData?.standard || parentData?.ChildsClass} - Sec {studentData?.section || parentData?.ChildsSection}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Student Name:</span>
              <span className="font-bold text-clay-text-dark">
                {studentData?.name || parentData?.childsName}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Roll Number:</span>
              <span className="font-bold text-clay-text-dark font-mono">
                {studentData?.rollNo || parentData?.ChildsRollNo}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Today's Ride Status:</span>
              <span className="font-bold text-clay-blue">
                {childPickupStatus()}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Pickup Coordinates:</span>
              <span className="font-semibold text-slate-500 font-mono text-xs">
                {parentData?.pickupLocation?.lat?.toFixed(4)}, {parentData?.pickupLocation?.lng?.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* Assigned Bus Status Card */}
        <div className="clay-card bg-white p-6 md:p-8 flex flex-col gap-4 text-left">
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
            <h3 className="text-xl font-friendly font-bold text-clay-text-dark flex items-center gap-2">
              <Bus size={20} className="text-clay-yellow-dark" />
              <span>Assigned Bus</span>
            </h3>
            <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg font-bold">
              {busData?.busNo || 'Bus Assigned'}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Vehicle Registration:</span>
              <span className="font-bold text-clay-text-dark">
                {busData?.busNo} ({busData?.busId})
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Trip State:</span>
              <span className="font-bold text-clay-green capitalize">
                {activeTrip ? 'Active On Road 🚌' : 'Stationary at Depot'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Route Depot:</span>
              <span className="font-semibold text-slate-600 truncate max-w-[60%]">
                {busData?.startLocation?.name || 'Main School Depot'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-clay-text-muted">Destination:</span>
              <span className="font-semibold text-slate-600 truncate max-w-[60%]">
                {busData?.endLocation?.name || 'School Gates'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Attendance & Planned Leave Calendar */}
      <div className="clay-card bg-white p-6 md:p-8 flex flex-col gap-6 text-left">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b-2 border-slate-100 pb-4">
          <div>
            <h3 className="text-2xl font-friendly font-bold text-clay-text-dark flex items-center gap-2">
              <Calendar size={22} className="text-clay-blue" />
              <span>Monthly Attendance & Leave Planner</span>
            </h3>
            <p className="text-xs text-clay-text-muted">
              Click any school day to pre-mark attendance. Absent days automatically exclude your child from the driver's morning route!
            </p>
          </div>

          {/* Month Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (currentMonth === 1) {
                  setCurrentMonth(12);
                  setCurrentYear(prev => prev - 1);
                } else {
                  setCurrentMonth(prev => prev - 1);
                }
              }}
              className="clay-btn clay-btn-white py-1.5 px-3 rounded-xl text-xs font-bold"
            >
              ◀ Prev
            </button>
            <span className="font-friendly font-bold text-sm px-2 text-clay-text-dark">
              {new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => {
                if (currentMonth === 12) {
                  setCurrentMonth(1);
                  setCurrentYear(prev => prev + 1);
                } else {
                  setCurrentMonth(prev => prev + 1);
                }
              }}
              className="clay-btn clay-btn-white py-1.5 px-3 rounded-xl text-xs font-bold"
            >
              Next ▶
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        {plannerLoading ? (
          <div className="py-12 flex justify-center items-center text-clay-text-muted text-sm">
            <RefreshCw size={20} className="animate-spin mr-2" />
            Loading attendance schedule...
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>

            <div className="flex flex-col gap-2">
              {calendarWeeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-cols-7 gap-2">
                  {week.days?.map((dayObj, dIdx) => {
                    const isAbsent = dayObj.status === 'absent';
                    const isSchoolDay = dayObj.isSchoolDay;

                    return (
                      <div
                        key={dIdx}
                        onClick={() => isSchoolDay && handleToggleLeave(dayObj.date, dayObj.status)}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col justify-between h-20 ${
                          !isSchoolDay 
                            ? 'bg-slate-50/50 border-slate-100 opacity-40 cursor-default'
                            : isAbsent 
                            ? 'bg-amber-50 border-amber-300 shadow-sm cursor-pointer hover:scale-102'
                            : 'bg-white border-slate-100 hover:border-clay-blue cursor-pointer shadow-sm hover:scale-102'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-friendly font-bold text-sm text-clay-text-dark">
                            {dayObj.dayOfMonth}
                          </span>
                          {isAbsent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 font-bold">
                              Absent
                            </span>
                          )}
                        </div>

                        {isSchoolDay && (
                          <span className={`text-[10px] font-semibold ${isAbsent ? 'text-amber-700' : 'text-slate-400'}`}>
                            {isAbsent ? '❌ No Pickup' : '✅ Present'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-clay-text-muted border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-white border border-slate-300" />
            <span>Present (Default Ride Scheduled)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span>Pre-marked Absent (Excluded from morning route)</span>
          </div>
        </div>
      </div>

    </div>
  );
}

export default ParentDashboard;

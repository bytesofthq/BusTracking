import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, Bus, Users, Truck, Navigation, Plus, Search, 
  Calendar, CheckCircle, XCircle, AlertCircle, RefreshCw, 
  Download, ArrowRight, ShieldCheck, CreditCard 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const instituteId = storedUser.instituteId || storedUser._id;

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'fleet' | 'drivers' | 'students' | 'attendance'
  const [loading, setLoading] = useState(true);

  // Data states
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [stats, setStats] = useState({
    totalBuses: 0,
    totalDrivers: 0,
    totalStudents: 0,
    activeTrips: 0
  });

  // Modals & form states
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New Bus form state
  const [newBus, setNewBus] = useState({
    busId: '',
    busNo: '',
    capacity: 40,
    startName: 'School Depot',
    startLat: 28.6139,
    startLng: 77.2090,
    endName: 'School Main Gate',
    endLat: 28.6200,
    endLng: 77.2150
  });

  // New Driver form state
  const [newDriver, setNewDriver] = useState({
    name: '',
    email: '',
    phoneNo: '',
    password: '',
    busId: ''
  });

  // Load all dashboard metrics and datasets
  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch Buses
      const busRes = await fetch(`${API_BASE}/api/bus`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const busData = await busRes.json();
      const busList = busRes.ok && busData.data ? busData.data : [];
      setBuses(busList);

      // 2. Fetch Drivers
      const driverRes = await fetch(`${API_BASE}/api/driver`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const driverData = await driverRes.json();
      const driverList = driverRes.ok && driverData.data ? driverData.data : [];
      setDrivers(driverList);

      // 3. Fetch Students
      let studentList = [];
      if (instituteId) {
        const studentRes = await fetch(`${API_BASE}/api/student/institute/${instituteId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const studentData = await studentRes.json();
        if (studentRes.ok && studentData.students) {
          studentList = studentData.students;
          setStudents(studentList);
        }
      }

      // 4. Fetch Bus Stats & active trips
      const statRes = await fetch(`${API_BASE}/api/bus/statistics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statData = await statRes.json();
      const activeTripsCount = statRes.ok && statData.data ? statData.data.activeTrips : 0;

      // 5. Fetch Attendance
      const attRes = await fetch(`${API_BASE}/api/attendance?instituteId=${instituteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const attData = await attRes.json();
      if (attRes.ok && attData.data) {
        setAttendanceRecords(attData.data);
      }

      setStats({
        totalBuses: busList.length,
        totalDrivers: driverList.length,
        totalStudents: studentList.length,
        activeTrips: activeTripsCount
      });

    } catch (err) {
      console.error('[AdminDashboard] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [token, instituteId]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Handle Add Bus
  const handleCreateBus = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/bus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          busId: newBus.busId,
          busNo: newBus.busNo,
          capacity: Number(newBus.capacity),
          startLocation: {
            name: newBus.startName,
            lat: Number(newBus.startLat),
            lng: Number(newBus.startLng)
          },
          endLocation: {
            name: newBus.endName,
            lat: Number(newBus.endLat),
            lng: Number(newBus.endLng)
          },
          pickupPoints: []
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('Bus created successfully! 🚌');
        setShowAddBusModal(false);
        setNewBus({
          busId: '', busNo: '', capacity: 40,
          startName: 'School Depot', startLat: 28.6139, startLng: 77.2090,
          endName: 'School Main Gate', endLat: 28.6200, endLng: 77.2150
        });
        loadAdminData();
      } else {
        alert(data.message || 'Failed to create bus');
      }
    } catch (err) {
      alert('Error connecting to backend server');
    }
  };

  // Handle Register Driver
  const handleRegisterDriver = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/driver/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newDriver)
      });

      const data = await res.json();
      if (res.ok) {
        alert('Driver registered successfully! 🚌');
        setShowAddDriverModal(false);
        setNewDriver({ name: '', email: '', phoneNo: '', password: '', busId: '' });
        loadAdminData();
      } else {
        alert(data.message || 'Failed to register driver');
      }
    } catch (err) {
      alert('Error connecting to backend server');
    }
  };

  // Export Attendance to CSV
  const handleExportCSV = () => {
    if (attendanceRecords.length === 0) {
      alert('No attendance records available to export.');
      return;
    }
    const headers = ['Student ID', 'Bus ID', 'Status', 'Date', 'PreMarked'];
    const rows = attendanceRecords.map(r => [
      r.studentId,
      r.busId,
      r.attendance,
      new Date(r.time).toLocaleDateString(),
      r.isPreMarked ? 'Yes' : 'No'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 px-4">
        <div className="clay-card flex flex-col items-center gap-4 p-8">
          <RefreshCw size={36} className="text-clay-orange animate-spin" />
          <h3 className="text-xl font-friendly font-semibold text-clay-text-dark">Loading School Portal...</h3>
          <p className="text-sm text-clay-text-muted">Aggregating fleet metrics, driver records, and student rosters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 md:px-8 w-full flex flex-col gap-8">
      
      {/* Admin Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="text-left">
          <div className="clay-badge clay-badge-orange border-2 text-[0.8rem] py-0.5 px-3 mb-1">
            <Building2 size={14} className="inline mr-1" />
            <span>School Fleet Administrator</span>
          </div>
          <h1 className="text-3xl font-friendly font-bold text-clay-text-dark">
            {storedUser.name || 'School Management Portal'}
          </h1>
          <p className="text-sm text-clay-text-muted">
            Manage your fleet of school buses, drivers, routes, and passenger attendance.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddBusModal(true)}
            className="clay-btn clay-btn-blue py-2.5 px-5 rounded-2xl flex items-center gap-2 font-friendly font-bold text-sm cursor-pointer shadow-sm"
          >
            <Plus size={16} />
            <span>Add Bus</span>
          </button>
          <button
            onClick={() => setShowAddDriverModal(true)}
            className="clay-btn clay-btn-green py-2.5 px-5 rounded-2xl flex items-center gap-2 font-friendly font-bold text-sm cursor-pointer shadow-sm"
          >
            <Plus size={16} />
            <span>Add Driver</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="clay-card bg-white p-5 text-left flex flex-col gap-1 border-2 border-slate-100">
          <span className="text-xs uppercase font-bold text-clay-text-muted tracking-wide flex items-center gap-1.5">
            <Bus size={14} className="text-clay-yellow-dark" />
            <span>Total Buses</span>
          </span>
          <span className="text-3xl font-friendly font-bold text-clay-text-dark">
            {stats.totalBuses}
          </span>
        </div>

        <div className="clay-card bg-white p-5 text-left flex flex-col gap-1 border-2 border-slate-100">
          <span className="text-xs uppercase font-bold text-clay-text-muted tracking-wide flex items-center gap-1.5">
            <Truck size={14} className="text-clay-green" />
            <span>Total Drivers</span>
          </span>
          <span className="text-3xl font-friendly font-bold text-clay-text-dark">
            {stats.totalDrivers}
          </span>
        </div>

        <div className="clay-card bg-white p-5 text-left flex flex-col gap-1 border-2 border-slate-100">
          <span className="text-xs uppercase font-bold text-clay-text-muted tracking-wide flex items-center gap-1.5">
            <Users size={14} className="text-clay-blue" />
            <span>Registered Students</span>
          </span>
          <span className="text-3xl font-friendly font-bold text-clay-text-dark">
            {stats.totalStudents}
          </span>
        </div>

        <div className="clay-card bg-white p-5 text-left flex flex-col gap-1 border-2 border-slate-100">
          <span className="text-xs uppercase font-bold text-clay-text-muted tracking-wide flex items-center gap-1.5">
            <Navigation size={14} className="text-clay-orange" />
            <span>Active Trips</span>
          </span>
          <span className="text-3xl font-friendly font-bold text-clay-orange">
            {stats.activeTrips}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 bg-clay-bg p-1.5 rounded-2xl border-2 border-white shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-4 rounded-xl font-friendly font-bold text-xs whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'overview' ? 'bg-clay-orange text-white shadow-md' : 'text-clay-text-muted hover:text-clay-orange'
          }`}
        >
          📊 Live Fleet Overview
        </button>
        <button
          onClick={() => setActiveTab('fleet')}
          className={`py-2 px-4 rounded-xl font-friendly font-bold text-xs whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'fleet' ? 'bg-clay-orange text-white shadow-md' : 'text-clay-text-muted hover:text-clay-orange'
          }`}
        >
          🚌 Fleet Management ({buses.length})
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`py-2 px-4 rounded-xl font-friendly font-bold text-xs whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'drivers' ? 'bg-clay-orange text-white shadow-md' : 'text-clay-text-muted hover:text-clay-orange'
          }`}
        >
          🧑‍✈️ Drivers ({drivers.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`py-2 px-4 rounded-xl font-friendly font-bold text-xs whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'students' ? 'bg-clay-orange text-white shadow-md' : 'text-clay-text-muted hover:text-clay-orange'
          }`}
        >
          🎒 Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-2 px-4 rounded-xl font-friendly font-bold text-xs whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'attendance' ? 'bg-clay-orange text-white shadow-md' : 'text-clay-text-muted hover:text-clay-orange'
          }`}
        >
          📅 Attendance Records
        </button>
      </div>

      {/* Tab 1: Live Fleet Overview */}
      {activeTab === 'overview' && (
        <div className="clay-card bg-white p-6 md:p-8 flex flex-col gap-6 text-left">
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-friendly font-bold text-clay-text-dark">Active Route Monitoring</h3>
              <p className="text-xs text-clay-text-muted">Live status of school transport vehicles on duty.</p>
            </div>
            <button 
              onClick={() => navigate('/tracking')}
              className="clay-btn clay-btn-blue py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Navigation size={14} />
              <span>Open Fleet Radar Map</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buses.map((bus) => (
              <div key={bus._id} className="p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 flex flex-col justify-between gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-friendly font-bold text-base text-clay-text-dark flex items-center gap-1.5">
                      <Bus size={18} className="text-clay-yellow-dark" />
                      <span>{bus.busNo}</span>
                    </h4>
                    <span className="text-xs text-slate-400 font-mono">ID: {bus.busId}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                    Cap: {bus.capacity}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex flex-col gap-1">
                  <span>Depot: {bus.startLocation?.name || 'Main Depot'}</span>
                  <span>Driver: {bus.driver?.name || 'Unassigned'}</span>
                </div>

                <button
                  onClick={() => navigate(`/tracking?busId=${bus._id}`)}
                  className="clay-btn clay-btn-white py-1.5 px-3 rounded-xl text-xs font-bold border border-slate-200 flex items-center justify-center gap-1 w-full"
                >
                  <Navigation size={12} />
                  <span>View Live Tracker</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Fleet Management */}
      {activeTab === 'fleet' && (
        <div className="clay-card bg-white p-6 md:p-8 flex flex-col gap-5 text-left">
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
            <h3 className="text-xl font-friendly font-bold text-clay-text-dark">All Registered Buses</h3>
            <button
              onClick={() => setShowAddBusModal(true)}
              className="clay-btn clay-btn-blue py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Plus size={14} />
              <span>Add Vehicle</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-clay-text-muted uppercase">
                  <th className="py-3 px-3">Bus No</th>
                  <th className="py-3 px-3">Bus ID</th>
                  <th className="py-3 px-3">Assigned Driver</th>
                  <th className="py-3 px-3">Capacity</th>
                  <th className="py-3 px-3">Start Depot</th>
                  <th className="py-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {buses.map((bus) => (
                  <tr key={bus._id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-bold text-clay-text-dark">{bus.busNo}</td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-500">{bus.busId}</td>
                    <td className="py-3 px-3 font-medium">{bus.driver?.name || '—'}</td>
                    <td className="py-3 px-3">{bus.capacity} seats</td>
                    <td className="py-3 px-3 text-slate-500">{bus.startLocation?.name}</td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => navigate(`/tracking?busId=${bus._id}`)}
                        className="text-xs font-bold text-clay-blue hover:underline cursor-pointer"
                      >
                        Track
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Drivers */}
      {activeTab === 'drivers' && (
        <div className="clay-card bg-white p-6 md:p-8 flex flex-col gap-5 text-left">
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
            <h3 className="text-xl font-friendly font-bold text-clay-text-dark">Driver Directory</h3>
            <button
              onClick={() => setShowAddDriverModal(true)}
              className="clay-btn clay-btn-green py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Plus size={14} />
              <span>Register Driver</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-clay-text-muted uppercase">
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Assigned Bus</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((drv) => (
                  <tr key={drv._id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-bold text-clay-text-dark">{drv.name}</td>
                    <td className="py-3 px-3 text-slate-600">{drv.email}</td>
                    <td className="py-3 px-3 font-mono text-xs">{drv.phoneNo}</td>
                    <td className="py-3 px-3 font-medium text-clay-blue">
                      {drv.Bus_id?.busNo || drv.Bus_id || 'Not Assigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Students */}
      {activeTab === 'students' && (
        <div className="clay-card bg-white p-6 md:p-8 flex flex-col gap-5 text-left">
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
            <h3 className="text-xl font-friendly font-bold text-clay-text-dark">Enrolled Students</h3>
            <span className="text-xs font-bold text-slate-500">{students.length} Total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-clay-text-muted uppercase">
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Roll No</th>
                  <th className="py-3 px-3">Grade/Sec</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Pickup Coords</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => (
                  <tr key={st._id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-bold text-clay-text-dark">{st.name}</td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-500">{st.rollNo}</td>
                    <td className="py-3 px-3">{st.standard} - {st.section}</td>
                    <td className="py-3 px-3 font-mono text-xs">{st.phoneNo}</td>
                    <td className="py-3 px-3 text-xs text-slate-400 font-mono">
                      {st.pickupLocation?.lat?.toFixed(3)}, {st.pickupLocation?.lng?.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Attendance Records & Export */}
      {activeTab === 'attendance' && (
        <div className="clay-card bg-white p-6 md:p-8 flex flex-col gap-5 text-left">
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-friendly font-bold text-clay-text-dark">Transportation Attendance</h3>
              <p className="text-xs text-clay-text-muted">Review attendance submissions and pre-marked student leaves.</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="clay-btn clay-btn-green py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-clay-text-muted uppercase">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.slice(0, 50).map((att) => (
                  <tr key={att._id} className="border-b border-slate-100">
                    <td className="py-3 px-3 text-xs">{new Date(att.time).toLocaleDateString()}</td>
                    <td className="py-3 px-3 font-medium">{att.studentId?.name || att.studentId}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                        att.attendance === 'present' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {att.attendance.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500">
                      {att.isPreMarked ? 'Pre-Marked Leave' : 'Route Log'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Bus */}
      {showAddBusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="clay-card bg-white p-8 max-w-md w-full text-left flex flex-col gap-4">
            <h3 className="text-2xl font-friendly font-bold text-clay-text-dark">Add New Bus</h3>
            <form onSubmit={handleCreateBus} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Bus Number Plate</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. DL-01-AB-1234"
                  value={newBus.busNo}
                  onChange={(e) => setNewBus({ ...newBus, busNo: e.target.value })}
                  className="clay-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Internal Bus ID</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. BUS-401"
                  value={newBus.busId}
                  onChange={(e) => setNewBus({ ...newBus, busId: e.target.value })}
                  className="clay-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Passenger Capacity</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  value={newBus.capacity}
                  onChange={(e) => setNewBus({ ...newBus, capacity: e.target.value })}
                  className="clay-input"
                />
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddBusModal(false)}
                  className="clay-btn clay-btn-white py-2 px-4 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="clay-btn clay-btn-blue py-2 px-5 rounded-xl text-xs font-bold"
                >
                  Save Bus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Driver */}
      {showAddDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="clay-card bg-white p-8 max-w-md w-full text-left flex flex-col gap-4">
            <h3 className="text-2xl font-friendly font-bold text-clay-text-dark">Register Driver</h3>
            <form onSubmit={handleRegisterDriver} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Driver Full Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Robert Smith"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  className="clay-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Email Address</label>
                <input 
                  type="email" 
                  required 
                  placeholder="robert@school.edu"
                  value={newDriver.email}
                  onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                  className="clay-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  required 
                  placeholder="e.g. 9876543210"
                  value={newDriver.phoneNo}
                  onChange={(e) => setNewDriver({ ...newDriver, phoneNo: e.target.value })}
                  className="clay-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Login Password</label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  value={newDriver.password}
                  onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                  className="clay-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Assign Bus Route</label>
                <select
                  value={newDriver.busId}
                  onChange={(e) => setNewDriver({ ...newDriver, busId: e.target.value })}
                  className="clay-input bg-white cursor-pointer"
                >
                  <option value="">Select Bus (Optional)</option>
                  {buses.map((b) => (
                    <option key={b._id} value={b._id}>{b.busNo} ({b.busId})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddDriverModal(false)}
                  className="clay-btn clay-btn-white py-2 px-4 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="clay-btn clay-btn-green py-2 px-5 rounded-xl text-xs font-bold"
                >
                  Register Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;

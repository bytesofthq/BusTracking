import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bus, Navigation, MapPin, Play, Square, Users, CheckCircle, 
  AlertCircle, Shield, Wifi, WifiOff, Radio, Phone, UserCheck, 
  Clock, ArrowRight, RefreshCw, XCircle 
} from 'lucide-react';
import Socket from '../../Socket';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function DriverHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasAssignedBus, setHasAssignedBus] = useState(false);
  const [bus, setBus] = useState(null);
  const [manifest, setManifest] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);

  // Tracking telemetry
  const [isTracking, setIsTracking] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'searching' | 'active' | 'error' | 'denied'
  const [currentCoords, setCurrentCoords] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [accuracy, setAccuracy] = useState(null);
  const [lastPingTime, setLastPingTime] = useState(null);
  const [tripType, setTripType] = useState('pickup'); // 'pickup' | 'dropoff'
  const [actionLoading, setActionLoading] = useState(false);

  const watchIdRef = useRef(null);
  const lastEmitTimeRef = useRef(0);

  const token = localStorage.getItem('token');

  // Load route and manifest from backend
  const loadRouteManifest = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE}/api/driver/route-manifest`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to load assigned route');
      }

      setHasAssignedBus(data.hasAssignedBus);
      if (data.hasAssignedBus) {
        setBus(data.bus);
        setManifest(data.manifest || []);
        if (data.activeTrip) {
          setActiveTrip(data.activeTrip);
          setIsTracking(true);
          setGpsStatus('active');
        }
      }
    } catch (err) {
      console.error('[DriverHome] Error fetching manifest:', err);
      setError(err.message || 'Unable to connect to school server');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRouteManifest();
  }, [loadRouteManifest]);

  // Clean up geolocation on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Listen for socket room feedback
  useEffect(() => {
    if (!bus?._id) return;

    Socket.emit('join_room', bus._id);

    const handleStatusUpdated = (payload) => {
      if (payload.busId === bus._id) {
        setManifest((prev) => 
          prev.map((s) => s.studentId === payload.studentId ? { ...s, pickupStatus: payload.status } : s)
        );
      }
    };

    Socket.on('student-status-updated', handleStatusUpdated);

    return () => {
      Socket.off('student-status-updated', handleStatusUpdated);
      Socket.emit('leave_room', bus._id);
    };
  }, [bus?._id]);

  // Handle GPS location updates
  const handleLocationUpdate = useCallback((position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const speed = position.coords.speed ? Math.round(position.coords.speed * 2.23694) : 0; // Convert m/s to mph
    const acc = Math.round(position.coords.accuracy || 0);

    setCurrentCoords({ lat, lng });
    setCurrentSpeed(speed);
    setAccuracy(acc);
    setLastPingTime(new Date().toLocaleTimeString());
    setGpsStatus('active');

    // Throttled Socket.IO emission (max once every 1.5 seconds)
    const now = Date.now();
    if (now - lastEmitTimeRef.current >= 1500 && bus?._id) {
      lastEmitTimeRef.current = now;

      Socket.emit('sendInfo', {
        name: bus.busNo,
        busId: bus._id,
        lat: lat,
        lng: lng,
        speed: speed,
        heading: position.coords.heading || 0,
        accuracy: acc,
        tripId: activeTrip?._id || null,
        status: 'in_transit'
      });
    }
  }, [bus, activeTrip]);

  const handleLocationError = useCallback((err) => {
    console.warn('[DriverHome] Geolocation error:', err.code, err.message);
    if (err.code === 1) {
      setGpsStatus('denied');
      setError('Location permission denied. Please allow GPS access in your browser settings.');
    } else {
      setGpsStatus('searching');
    }
  }, []);

  // Start continuous watchPosition
  const startWatchingLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.');
      setGpsStatus('error');
      return;
    }

    setGpsStatus('searching');

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      handleLocationError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000
      }
    );
  }, [handleLocationUpdate, handleLocationError]);

  const stopWatchingLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsStatus('idle');
    setCurrentSpeed(0);
  }, []);

  // Start Trip
  const handleStartTrip = async () => {
    if (!bus?._id) return;
    try {
      setActionLoading(true);
      setError('');

      const res = await fetch(`${API_BASE}/api/driver/trip/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tripType })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to start trip');
      }

      setActiveTrip(data.data);
      if (data.data.studentManifest) {
        setManifest(data.data.studentManifest);
      }
      setIsTracking(true);
      startWatchingLocation();
    } catch (err) {
      console.error('[DriverHome] Start trip error:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // End Trip
  const handleEndTrip = async () => {
    if (!activeTrip?._id) return;
    const confirmEnd = window.confirm('Are you sure you want to complete and end this trip?');
    if (!confirmEnd) return;

    try {
      setActionLoading(true);
      setError('');

      const res = await fetch(`${API_BASE}/api/driver/trip/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tripId: activeTrip._id })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to end trip');
      }

      stopWatchingLocation();
      setIsTracking(false);
      setActiveTrip(null);
      await loadRouteManifest();
    } catch (err) {
      console.error('[DriverHome] End trip error:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Update Student Pickup / Dropoff Status
  const handleUpdateStudentStatus = async (studentId, nextStatus) => {
    if (!activeTrip?._id) {
      alert('Please start the trip first before marking student boarding actions.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/driver/pickup-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tripId: activeTrip._id,
          studentId,
          status: nextStatus
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update student status');
      }

      setManifest((prev) =>
        prev.map((item) =>
          item.studentId === studentId ? { ...item, pickupStatus: nextStatus } : item
        )
      );
    } catch (err) {
      console.error('[DriverHome] Status update error:', err);
      alert(err.message || 'Could not record status');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 px-4">
        <div className="clay-card flex flex-col items-center gap-4 p-8">
          <RefreshCw size={36} className="text-clay-blue animate-spin" />
          <h3 className="text-xl font-friendly font-semibold text-clay-text-dark">Connecting to Driver Portal...</h3>
          <p className="text-sm text-clay-text-muted">Loading assigned vehicle, route, and passenger manifest.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 md:px-8 w-full flex flex-col gap-6">
      
      {/* Driver Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="text-left">
          <div className="clay-badge clay-badge-yellow border-2 text-[0.8rem] py-0.5 px-3 mb-1">
            <Radio size={14} className="inline mr-1 text-amber-700 animate-pulse" />
            <span>Driver GPS Terminal</span>
          </div>
          <h1 className="text-3xl font-friendly font-semibold text-clay-text-dark">
            {bus ? `Bus ${bus.busNo}` : 'Driver Dashboard'}
          </h1>
        </div>

        {/* GPS Status Indicator */}
        <div className="flex items-center gap-2">
          {gpsStatus === 'active' && (
            <div className="clay-badge clay-badge-green border-2 py-1.5 px-3 flex items-center gap-1.5 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>Live GPS Broadcast Active</span>
            </div>
          )}
          {gpsStatus === 'searching' && (
            <div className="clay-badge clay-badge-yellow border-2 py-1.5 px-3 flex items-center gap-1.5 text-xs font-semibold">
              <RefreshCw size={12} className="animate-spin inline" />
              <span>Acquiring GPS Signal...</span>
            </div>
          )}
          {gpsStatus === 'denied' && (
            <div className="clay-badge clay-badge-orange border-2 py-1.5 px-3 text-xs font-semibold">
              <span>GPS Permission Denied</span>
            </div>
          )}
          {gpsStatus === 'idle' && (
            <div className="clay-badge clay-badge-blue border-2 py-1.5 px-3 text-xs font-semibold">
              <span>Ready for Departure</span>
            </div>
          )}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="clay-card border-amber-300 bg-amber-50/70 p-4 rounded-2xl flex items-center gap-3 text-left">
          <AlertCircle size={22} className="text-amber-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-amber-800">{error}</span>
        </div>
      )}

      {!hasAssignedBus ? (
        <div className="clay-card bg-white p-10 flex flex-col items-center gap-4 text-center">
          <Bus size={56} className="text-slate-300" />
          <h3 className="text-2xl font-friendly font-semibold text-clay-text-dark">No Bus Currently Assigned</h3>
          <p className="text-sm text-clay-text-muted max-w-md">
            Your school administrator has not assigned a bus to your driver profile yet. Please check in with your school transport department.
          </p>
          <button 
            onClick={loadRouteManifest}
            className="clay-btn clay-btn-blue py-2.5 px-6 rounded-2xl mt-2 flex items-center gap-2 text-sm"
          >
            <RefreshCw size={16} />
            <span>Check Assignment</span>
          </button>
        </div>
      ) : (
        <>
          {/* Active Trip Controller Panel */}
          <div className="clay-card bg-white p-6 md:p-8 flex flex-col gap-6">
            <div className="flex flex-wrap justify-between items-center gap-4 border-b-2 border-slate-100 pb-4">
              <div className="text-left">
                <span className="text-xs uppercase font-bold text-clay-text-muted tracking-wide">Vehicle Details</span>
                <h2 className="text-2xl font-friendly font-bold text-clay-text-dark flex items-center gap-2">
                  <Bus size={24} className="text-clay-yellow-dark" />
                  <span>{bus.busNo}</span>
                  <span className="text-xs font-normal text-slate-400">({bus.busId})</span>
                </h2>
              </div>

              {/* Trip Controls */}
              <div className="flex items-center gap-3">
                {!isTracking ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={tripType}
                      onChange={(e) => setTripType(e.target.value)}
                      className="clay-select text-xs py-2 px-3 rounded-xl border border-slate-200"
                    >
                      <option value="pickup">🌅 Morning Pickup Route</option>
                      <option value="dropoff">🏡 Afternoon Drop Route</option>
                    </select>

                    <button
                      onClick={handleStartTrip}
                      disabled={actionLoading}
                      className="clay-btn clay-btn-green py-3 px-6 rounded-2xl flex items-center gap-2 font-friendly font-bold text-sm cursor-pointer shadow-md"
                    >
                      <Play size={18} fill="white" />
                      <span>Start Trip & Broadcast</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleEndTrip}
                    disabled={actionLoading}
                    className="clay-btn clay-btn-orange py-3 px-6 rounded-2xl flex items-center gap-2 font-friendly font-bold text-sm cursor-pointer shadow-md"
                  >
                    <Square size={16} fill="white" />
                    <span>End Trip</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live GPS Telemetry Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                <span className="text-xs text-clay-text-muted font-semibold block">Live Speed</span>
                <span className="text-2xl font-friendly font-bold text-clay-blue">
                  {currentSpeed} <span className="text-xs font-normal text-slate-400">mph</span>
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                <span className="text-xs text-clay-text-muted font-semibold block">GPS Accuracy</span>
                <span className="text-2xl font-friendly font-bold text-clay-green">
                  {accuracy ? `±${accuracy}m` : '—'}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                <span className="text-xs text-clay-text-muted font-semibold block">Last Coordinates</span>
                <span className="text-xs font-mono font-bold text-clay-text-dark block truncate mt-1">
                  {currentCoords ? `${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}` : 'Waiting for GPS...'}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                <span className="text-xs text-clay-text-muted font-semibold block">Last Update Time</span>
                <span className="text-sm font-semibold text-clay-text-dark block mt-1">
                  {lastPingTime || 'Not active'}
                </span>
              </div>
            </div>

            {/* Route Stops Summary */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-left flex flex-col gap-2">
              <span className="text-xs uppercase font-bold text-clay-text-muted tracking-wide flex items-center gap-1.5">
                <MapPin size={14} className="text-clay-blue" />
                <span>Scheduled Route Route Points</span>
              </span>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-clay-text-dark">
                <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">
                  Depot: {bus.startLocation?.name || 'Depot'}
                </span>
                <ArrowRight size={14} className="text-slate-400" />
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  {manifest.length} Assigned Students ({manifest.filter(s => s.attendanceStatus === 'absent').length} Pre-marked Absent)
                </span>
                <ArrowRight size={14} className="text-slate-400" />
                <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">
                  Destination: {bus.endLocation?.name || 'School Gate'}
                </span>
              </div>
            </div>
          </div>

          {/* Student Passenger Manifest */}
          <div className="clay-card bg-white p-6 md:p-8 flex flex-col gap-5">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
              <div className="text-left">
                <h3 className="text-xl font-friendly font-bold text-clay-text-dark flex items-center gap-2">
                  <Users size={20} className="text-clay-blue" />
                  <span>Student Passenger Manifest</span>
                </h3>
                <p className="text-xs text-clay-text-muted">
                  Safely record student boarding and drop-offs while the vehicle is stationary.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-clay-text-muted">
                  On Board:{' '}
                  <strong className="text-clay-blue font-bold">
                    {manifest.filter(s => s.pickupStatus === 'picked_up').length}
                  </strong>{' '}
                  / {manifest.length}
                </span>
              </div>
            </div>

            {manifest.length === 0 ? (
              <div className="py-8 text-center text-clay-text-muted text-sm">
                No students currently assigned to this bus route.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {manifest.map((student) => {
                  const isAbsent = student.attendanceStatus === 'absent';
                  const isPickedUp = student.pickupStatus === 'picked_up';
                  const isDroppedOff = student.pickupStatus === 'dropped_off';

                  return (
                    <div 
                      key={student.studentId} 
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left ${
                        isDroppedOff 
                          ? 'bg-emerald-50/40 border-emerald-200' 
                          : isPickedUp 
                          ? 'bg-blue-50/40 border-blue-200' 
                          : isAbsent 
                          ? 'bg-amber-50/40 border-amber-200 opacity-75' 
                          : 'bg-white border-slate-100 shadow-sm'
                      }`}
                    >
                      {/* Student info */}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-friendly font-bold text-base text-clay-text-dark">
                            {student.studentName}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-md text-slate-600 font-mono">
                            {student.rollNo}
                          </span>
                          {isAbsent && (
                            <span className="text-[11px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-semibold">
                              Marked Absent Today
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-clay-text-muted flex items-center gap-3 mt-1">
                          {student.pickupLocation && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-slate-400" />
                              <span>Lat: {student.pickupLocation.lat?.toFixed(3)}, Lng: {student.pickupLocation.lng?.toFixed(3)}</span>
                            </span>
                          )}
                          {student.phoneNo && (
                            <span className="flex items-center gap-1">
                              <Phone size={12} className="text-slate-400" />
                              <span>{student.phoneNo}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badges & Quick Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isPickedUp ? (
                          <div className="flex items-center gap-2">
                            <span className="clay-badge clay-badge-green text-xs py-1 px-3">
                              ✅ Picked Up
                            </span>
                            <button
                              onClick={() => handleUpdateStudentStatus(student.studentId, 'dropped_off')}
                              disabled={!isTracking}
                              className="clay-btn clay-btn-blue text-xs py-1.5 px-3 rounded-xl cursor-pointer"
                              title="Mark Dropped Off"
                            >
                              Drop Off
                            </button>
                          </div>
                        ) : isDroppedOff ? (
                          <span className="clay-badge clay-badge-blue text-xs py-1 px-3">
                            🏡 Dropped Off
                          </span>
                        ) : isAbsent ? (
                          <span className="clay-badge clay-badge-orange text-xs py-1 px-3">
                            ❌ Absent
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleUpdateStudentStatus(student.studentId, 'picked_up')}
                              disabled={!isTracking}
                              className={`clay-btn clay-btn-green text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 ${
                                !isTracking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              <CheckCircle size={14} />
                              <span>Board Bus</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStudentStatus(student.studentId, 'absent')}
                              disabled={!isTracking}
                              className={`clay-btn clay-btn-white text-xs py-1.5 px-2.5 rounded-xl text-slate-500 border border-slate-200 ${
                                !isTracking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                              title="Student did not show up"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DriverHome;
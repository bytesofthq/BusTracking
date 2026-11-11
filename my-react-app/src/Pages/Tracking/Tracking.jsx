import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Map, { Marker, Source, Layer, NavigationControl, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Bus, MapPin, Navigation, Compass, Layers, Info, Bell, 
  CheckCircle, ShieldAlert, ArrowLeft, RefreshCw, Radio, 
  Wifi, WifiOff, Clock, User, ExternalLink
} from 'lucide-react';
import Socket from '../../Socket';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Map Styles available for selection
const MAP_STYLES = [
  { id: 'streets', name: 'Streets 🗺️', url: 'mapbox://styles/mapbox/streets-v11' },
  { id: 'dark', name: 'Dark Mode 🌙', url: 'mapbox://styles/mapbox/dark-v10' },
  { id: 'light', name: 'Light Mode ☀️', url: 'mapbox://styles/mapbox/light-v10' },
  { id: 'satellite', name: 'Satellite 🛰️', url: 'mapbox://styles/mapbox/satellite-streets-v11' }
];

function Tracking({ isLoggedIn, userRole }) {
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const token = localStorage.getItem('token');
  const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  // Bus selection state
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [busDetails, setBusDetails] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [routeMetrics, setRouteMetrics] = useState({
    distanceKm: null,
    durationMinutes: null,
    isRoadSnapped: false
  });
  
  // Real-time tracking state
  const [busPosition, setBusPosition] = useState(null); // [lng, lat]
  const [busSpeed, setBusSpeed] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [tripStatus, setTripStatus] = useState('stationary'); // 'in_transit' | 'stationary' | 'ended'
  
  // Map controls
  const [mapStyleUrl, setMapStyleUrl] = useState('mapbox://styles/mapbox/streets-v11');
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [autoCenter, setAutoCenter] = useState(true);
  const [viewState, setViewState] = useState({
    longitude: 77.2090, // Default fallback (e.g. India)
    latitude: 28.6139,
    zoom: 13,
    pitch: 30,
    bearing: 0
  });

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), text: '📡 Initialized real-time tracking system.' }
  ]);

  const addLog = useCallback((text) => {
    setLogs((prev) => [
      { time: new Date().toLocaleTimeString(), text },
      ...prev.slice(0, 19)
    ]);
  }, []);

  // Fetch available buses for selection or user's assigned bus
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        setLoading(true);
        let busList = [];

        // Check query param first
        const queryBusId = searchParams.get('busId');

        if (token) {
          const res = await fetch(`${API_BASE}/api/bus`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.data) {
            busList = data.data;
          }
        }

        // If no authenticated bus list, load via public or user profile
        if (busList.length === 0 && storedUser.instituteId) {
          const res = await fetch(`${API_BASE}/api/bus/public/${storedUser.instituteId}`);
          const data = await res.json();
          if (res.ok && data.buses) {
            busList = data.buses;
          }
        }

        setBuses(busList);

        // Determine which bus to select
        let targetId = queryBusId || storedUser.busId || (busList[0] ? (busList[0]._id || busList[0].busId) : '');
        if (targetId) {
          setSelectedBusId(String(targetId));
        }
      } catch (err) {
        console.error('[Tracking] Error loading buses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBuses();
  }, [token, searchParams]);

  // Load bus details, stops, and initial live position when selectedBusId changes
  useEffect(() => {
    if (!selectedBusId) return;

    let isSubscribed = true;

    const loadBusData = async () => {
      try {
        addLog(`🔍 Loading route for Bus ID: ${selectedBusId}`);

        // 1. Fetch optimized route and stops from backend
        const routeRes = await fetch(`${API_BASE}/api/bus/${selectedBusId}/optimized-route`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const routeData = await routeRes.json();

        if (isSubscribed && routeRes.ok && routeData.bus) {
          setBusDetails(routeData.bus);
          const rawStops = routeData.stops || [];
          setRouteStops(rawStops);

          let resolvedGeojson = routeData.geojson || null;
          let resolvedMetrics = {
            distanceKm: routeData.metrics?.distanceKm || null,
            durationMinutes: routeData.metrics?.durationMinutes || null,
            isRoadSnapped: !!routeData.geojson?.properties?.isRoadSnapped
          };

          // If Mapbox token is present and we have multiple stops, fetch precise road directions
          if (mapboxToken && rawStops.length >= 2) {
            try {
              const coordsStr = rawStops
                .filter(s => s.coordinates && s.coordinates.length >= 2)
                .map(s => `${s.coordinates[0].toFixed(6)},${s.coordinates[1].toFixed(6)}`)
                .join(';');

              const mbUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsStr}?geometries=geojson&overview=full&steps=true&access_token=${mapboxToken}`;
              const mbRes = await fetch(mbUrl);
              if (mbRes.ok) {
                const mbData = await mbRes.json();
                if (mbData.routes && mbData.routes[0]) {
                  const primaryRoute = mbData.routes[0];
                  resolvedGeojson = {
                    type: 'Feature',
                    properties: {
                      busId: routeData.bus.busId,
                      busNo: routeData.bus.busNo,
                      distanceMeters: primaryRoute.distance,
                      durationSeconds: primaryRoute.duration,
                      isRoadSnapped: true
                    },
                    geometry: primaryRoute.geometry
                  };
                  resolvedMetrics = {
                    distanceKm: (primaryRoute.distance / 1000).toFixed(2),
                    durationMinutes: Math.round(primaryRoute.duration / 60),
                    isRoadSnapped: true
                  };
                  addLog(`🛣️ Snapped exact road route (${resolvedMetrics.distanceKm} km, ~${resolvedMetrics.durationMinutes} min drive).`);
                }
              }
            } catch (mbErr) {
              console.warn('[Tracking] Client Mapbox directions fallback to server route:', mbErr);
            }
          }

          if (resolvedGeojson) {
            setRouteGeometry(resolvedGeojson);
          }
          setRouteMetrics(resolvedMetrics);

          // Center map on starting depot or first stop if no live position yet
          if (rawStops.length > 0 && rawStops[0].coordinates) {
            const [firstLng, firstLat] = rawStops[0].coordinates;
            if (firstLng && firstLat) {
              setViewState(prev => ({
                ...prev,
                longitude: firstLng,
                latitude: firstLat,
                zoom: 14.5
              }));
            }
          }
        }

        // 2. Fetch latest live location from server cache or DB
        const locRes = await fetch(`${API_BASE}/api/bus/${selectedBusId}/live-location`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const locData = await locRes.json();

        if (isSubscribed && locRes.ok && locData.data) {
          const loc = locData.data;
          if (loc.lat && loc.lng) {
            setBusPosition([loc.lng, loc.lat]);
            setBusSpeed(loc.speed || 0);
            setIsLive(locData.live || loc.status === 'in_transit');
            setTripStatus(loc.status || 'stationary');
            setLastUpdate(new Date(loc.timestamp).toLocaleTimeString());
            addLog(`📍 Retrieved position: [${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}]`);
          }
        }
      } catch (err) {
        console.error('[Tracking] Error fetching bus route data:', err);
      }
    };

    loadBusData();

    // 3. Socket.IO Room Connection
    Socket.emit('join_room', selectedBusId);
    addLog(`🔌 Joined live Socket.IO tracking channel for bus: ${selectedBusId}`);

    const handleReceiveInfo = (data) => {
      if (!isSubscribed) return;
      if (data.lat && data.lng) {
        setBusPosition([data.lng, data.lat]);
        setBusSpeed(data.speed || 0);
        setIsLive(true);
        setTripStatus(data.status || 'in_transit');
        setLastUpdate(new Date(data.timestamp || Date.now()).toLocaleTimeString());

        addLog(`⚡ Live GPS Ping: ${data.name || 'Bus'} moving at ${data.speed || 0} mph.`);
      }
    };

    const handleTripStarted = (payload) => {
      addLog(`🚀 Trip departed! Driver started active route broadcast.`);
      setIsLive(true);
      setTripStatus('in_transit');
    };

    const handleTripEnded = () => {
      addLog(`🏁 Trip completed. Bus has safely reached final destination.`);
      setIsLive(false);
      setTripStatus('ended');
      setBusSpeed(0);
    };

    const handleStudentStatus = (payload) => {
      addLog(`🚸 Manifest Event: ${payload.studentName || 'Student'} marked as ${payload.status}`);
    };

    Socket.on('receiveInfo', handleReceiveInfo);
    Socket.on('trip-started', handleTripStarted);
    Socket.on('trip-ended', handleTripEnded);
    Socket.on('student-status-updated', handleStudentStatus);

    return () => {
      isSubscribed = false;
      Socket.off('receiveInfo', handleReceiveInfo);
      Socket.off('trip-started', handleTripStarted);
      Socket.off('trip-ended', handleTripEnded);
      Socket.off('student-status-updated', handleStudentStatus);
      Socket.emit('leave_room', selectedBusId);
    };
  }, [selectedBusId, token, mapboxToken, addLog]);

  // Handle auto-centering on bus position
  useEffect(() => {
    if (autoCenter && busPosition && mapRef.current) {
      mapRef.current.flyTo({
        center: busPosition,
        duration: 500,
        zoom: Math.max(14.5, mapRef.current.getZoom())
      });
    }
  }, [busPosition, autoCenter]);

  // Google Maps turn-by-turn navigation URL for Driver
  const googleMapsUrl = useMemo(() => {
    if (!routeStops || routeStops.length < 2) return null;
    const origin = `${routeStops[0].coordinates[1]},${routeStops[0].coordinates[0]}`;
    const destination = `${routeStops[routeStops.length - 1].coordinates[1]},${routeStops[routeStops.length - 1].coordinates[0]}`;
    const waypoints = routeStops
      .slice(1, -1)
      .map(s => `${s.coordinates[1]},${s.coordinates[0]}`)
      .join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}&travelmode=driving`;
  }, [routeStops]);

  // Double-layer Google Maps highway style road polyline
  const routeCasingStyle = useMemo(() => ({
    id: 'live-bus-route-casing',
    type: 'line',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#1d4ed8', // Darker navy outline
      'line-width': 9,
      'line-opacity': 0.75
    }
  }), []);

  const routeLayerStyle = useMemo(() => ({
    id: 'live-bus-route-path',
    type: 'line',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#3b82f6', // Google Maps vibrant driving blue
      'line-width': 5,
      'line-opacity': 0.95
    }
  }), []);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 md:px-8 w-full flex flex-col gap-6">
      
      {/* Header Banner */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="clay-btn clay-btn-white !p-3 !rounded-2xl border-3 flex items-center justify-center cursor-pointer shadow-md"
            title="Back to Home"
          >
            <ArrowLeft size={20} className="text-clay-blue-dark" />
          </button>
          <div className="text-left">
            <div className="clay-badge clay-badge-blue text-xs py-0.5 px-3 mb-1 shadow-sm">
              <Radio size={12} className="inline mr-1 text-blue-600 animate-pulse" />
              <span>Real-Time Fleet Radar</span>
            </div>
            <h1 className="text-3xl font-friendly font-bold text-clay-text-dark">
              Live Bus Tracking
            </h1>
          </div>
        </div>

        {/* Bus Selector and Connection Status */}
        <div className="flex items-center gap-3 flex-wrap">
          {buses.length > 0 && (
            <div className="clay-badge bg-white border-3 border-white px-4 py-2 rounded-2xl shadow-[4px_4px_12px_rgba(166,180,200,0.25),inset_-3px_-3px_6px_rgba(166,180,200,0.12),inset_3px_3px_6px_rgba(255,255,255,0.9)] flex items-center gap-2.5">
              <Bus size={20} className="text-clay-yellow-dark" />
              <select
                value={selectedBusId}
                onChange={(e) => setSelectedBusId(e.target.value)}
                className="bg-transparent border-none font-friendly font-bold text-sm text-clay-text-dark outline-none cursor-pointer pr-2"
              >
                {buses.map((b) => (
                  <option key={b._id || b.busId} value={b._id || b.busId}>
                    {b.busNo ? `Bus ${b.busNo}` : `Bus ID: ${b.busId}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isLive ? (
            <div className="clay-badge clay-badge-green text-xs py-2 px-3.5 rounded-2xl flex items-center gap-2 shadow-sm font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>Live Broadcast Connected</span>
            </div>
          ) : (
            <div className="clay-badge clay-badge-yellow text-xs py-2 px-3.5 rounded-2xl flex items-center gap-2 shadow-sm font-bold">
              <Clock size={14} className="inline text-amber-700" />
              <span>Bus Stationary / Awaiting Driver</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Map & Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Interactive Map */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Road Navigation Info Bar (Claymorphic) */}
          <div className="clay-card !p-4 !rounded-[24px] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="clay-badge clay-badge-blue text-sm py-1.5 px-3.5 font-friendly">
                <Navigation size={16} className="text-clay-blue-dark inline mr-1" />
                <span className="font-bold">{routeMetrics.distanceKm ? `${routeMetrics.distanceKm} km` : 'Calculating...'}</span>
                {routeMetrics.durationMinutes && (
                  <span className="opacity-80 font-normal ml-1">({routeMetrics.durationMinutes} min drive)</span>
                )}
              </div>
              <div className="clay-badge clay-badge-yellow text-sm py-1.5 px-3.5 font-friendly">
                <MapPin size={16} className="text-clay-yellow-dark inline mr-1" />
                <span className="font-bold">{routeStops.length} Stops</span>
              </div>
              {routeMetrics.isRoadSnapped && (
                <div className="clay-badge clay-badge-green text-xs py-1.5 px-3 font-friendly">
                  <CheckCircle size={14} className="text-clay-green-dark inline mr-1" />
                  <span>Road Snapped</span>
                </div>
              )}
            </div>

            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="clay-btn clay-btn-blue text-xs !py-2 !px-4 !rounded-2xl flex items-center gap-2 shadow-md hover:scale-105 transition-transform"
                title="Open Google Maps with all stops for turn-by-turn driver navigation"
              >
                <span>Open in Google Maps</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>

          {!mapboxToken ? (
            <div className="clay-card border-red-200 bg-red-50/50 flex flex-col items-center gap-4 py-12 text-center">
              <ShieldAlert size={48} className="text-red-500" />
              <h3 className="text-xl font-friendly font-bold text-red-700">Mapbox Token Missing!</h3>
              <p className="text-sm text-red-600 max-w-md">
                Please verify that <strong>VITE_MAPBOX_TOKEN</strong> is provided in your frontend environment.
              </p>
            </div>
          ) : (
            <div className="clay-card !p-3.5 bg-white relative rounded-[36px] overflow-hidden shadow-[10px_10px_30px_rgba(166,180,200,0.35),inset_-8px_-8px_16px_rgba(166,180,200,0.15),inset_8px_8px_16px_rgba(255,255,255,0.9)] border-4 border-white h-[500px] md:h-[620px]">
              <Map
                ref={mapRef}
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                mapStyle={mapStyleUrl}
                mapboxAccessToken={mapboxToken}
                style={{ width: '100%', height: '100%', borderRadius: '26px' }}
              >
                <NavigationControl position="top-right" />

                {/* Real Turn-by-Turn Road Route Geometry Layers (Casing + Core Navigation Path) */}
                {routeGeometry && (
                  <Source id="bus-route-source" type="geojson" data={routeGeometry}>
                    <Layer {...routeCasingStyle} />
                    <Layer {...routeLayerStyle} />
                  </Source>
                )}

                {/* Real Route Stops */}
                {routeStops.map((stop) => {
                  if (!stop.coordinates || stop.coordinates.length < 2) return null;
                  const [lng, lat] = stop.coordinates;
                  if (!lng || !lat) return null;

                  const isDepot = stop.type === 'depot';
                  const isSchool = stop.type === 'school';

                  return (
                    <Marker
                      key={stop.id}
                      longitude={lng}
                      latitude={lat}
                      anchor="bottom"
                      onClick={(e) => {
                        e.originalEvent.stopPropagation();
                        setSelectedMarker(stop);
                      }}
                    >
                      <div className={`cursor-pointer transition-all duration-300 transform hover:scale-125 flex items-center justify-center w-9 h-9 rounded-full border-3 border-white shadow-[0_4px_12px_rgba(0,0,0,0.18),inset_-2px_-2px_4px_rgba(0,0,0,0.15),inset_2px_2px_4px_rgba(255,255,255,0.5)] ${
                        isSchool 
                          ? 'bg-clay-blue text-white' 
                          : isDepot 
                          ? 'bg-clay-green text-white' 
                          : 'bg-clay-yellow text-clay-text-dark'
                      }`}>
                        <span className="text-[1.05rem]">
                          {isSchool ? '🏫' : isDepot ? '🏁' : '📍'}
                        </span>
                      </div>
                    </Marker>
                  );
                })}

                {/* Real Live Bus Marker */}
                {busPosition && (
                  <Marker
                    longitude={busPosition[0]}
                    latitude={busPosition[1]}
                    anchor="center"
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setSelectedMarker({
                        id: 'live-bus',
                        name: busDetails?.busNo ? `School Bus ${busDetails.busNo}` : 'School Bus',
                        description: `Live GPS: Speed ${busSpeed} mph. Status: ${tripStatus}`,
                        coordinates: busPosition
                      });
                    }}
                  >
                    <div className="relative cursor-pointer transition-all duration-200 transform hover:scale-110 flex items-center justify-center w-13 h-13 bg-clay-yellow rounded-full border-4 border-white shadow-[0_6px_18px_rgba(248,200,71,0.65),inset_-4px_-4px_8px_rgba(0,0,0,0.12),inset_4px_4px_8px_rgba(255,255,255,0.6)] anim-bounce-slow">
                      <Bus size={26} className="text-clay-text-dark" />
                      {isLive && (
                        <span className="absolute -inset-2 rounded-full border-3 border-amber-400 animate-ping opacity-60" />
                      )}
                    </div>
                  </Marker>
                )}

                {/* Marker Popup */}
                {selectedMarker && (
                  <Popup
                    longitude={selectedMarker.coordinates[0]}
                    latitude={selectedMarker.coordinates[1]}
                    anchor="top"
                    onClose={() => setSelectedMarker(null)}
                    closeButton={true}
                    closeOnClick={false}
                  >
                    <div className="p-2 font-clean text-left">
                      <h4 className="font-friendly font-bold text-clay-text-dark text-base">{selectedMarker.name}</h4>
                      {selectedMarker.description && (
                        <p className="text-xs text-clay-text-muted mt-1 leading-snug">{selectedMarker.description}</p>
                      )}
                      <div className="text-[11px] font-mono text-slate-500 mt-2 pt-2 border-t border-slate-100 flex justify-between gap-4">
                        <span>Lng: {selectedMarker.coordinates[0].toFixed(4)}</span>
                        <span>Lat: {selectedMarker.coordinates[1].toFixed(4)}</span>
                      </div>
                    </div>
                  </Popup>
                )}
              </Map>

              {/* Map Style Selector Overlay (Claymorphic) */}
              <div className="absolute bottom-6 left-6 z-10 flex gap-2 flex-wrap max-w-[90%] bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border-3 border-white shadow-[6px_6px_20px_rgba(166,180,200,0.35),inset_-4px_-4px_8px_rgba(166,180,200,0.15),inset_4px_4px_8px_rgba(255,255,255,0.9)]">
                {MAP_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setMapStyleUrl(style.url)}
                    className={`clay-btn text-xs !py-1.5 !px-3.5 !rounded-xl transition-all cursor-pointer ${
                      mapStyleUrl === style.url
                        ? 'clay-btn-blue shadow-md'
                        : 'clay-btn-white text-clay-text-muted hover:text-clay-text-dark'
                    }`}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Real-time Telemetry & Stop Details */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Live Telemetry Card (Claymorphic) */}
          <div className="clay-card !p-6 bg-white flex flex-col gap-5">
            <h3 className="text-xl font-friendly font-bold text-clay-text-dark flex items-center gap-2 border-b-2 border-slate-100/80 pb-3 text-left">
              <Compass size={22} className="text-clay-blue" />
              <span>Vehicle Telemetry</span>
            </h3>

            {/* Metrics Inset Clay Pills */}
            <div className="flex flex-col gap-3 text-left">
              <div className="flex justify-between items-center bg-[#f8fafc] px-4 py-3 rounded-2xl border-2 border-white shadow-[inset_2px_2px_5px_rgba(166,180,200,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]">
                <span className="text-xs text-clay-text-muted font-bold font-friendly">Active Bus:</span>
                <span className="text-sm font-bold text-clay-text-dark font-friendly">
                  {busDetails?.busNo || (selectedBusId ? `Bus ID: ${selectedBusId}` : 'None Selected')}
                </span>
              </div>

              <div className="flex justify-between items-center bg-[#f8fafc] px-4 py-3 rounded-2xl border-2 border-white shadow-[inset_2px_2px_5px_rgba(166,180,200,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]">
                <span className="text-xs text-clay-text-muted font-bold font-friendly">Live Speed:</span>
                <span className="text-base font-bold text-clay-blue font-friendly">
                  {busSpeed} mph
                </span>
              </div>

              <div className="flex justify-between items-center bg-[#f8fafc] px-4 py-3 rounded-2xl border-2 border-white shadow-[inset_2px_2px_5px_rgba(166,180,200,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]">
                <span className="text-xs text-clay-text-muted font-bold font-friendly">Trip Status:</span>
                <span className="text-sm font-bold capitalize text-clay-green-dark font-friendly">
                  {tripStatus.replace('_', ' ')}
                </span>
              </div>

              <div className="flex justify-between items-center bg-[#f8fafc] px-4 py-3 rounded-2xl border-2 border-white shadow-[inset_2px_2px_5px_rgba(166,180,200,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]">
                <span className="text-xs text-clay-text-muted font-bold font-friendly">Last GPS Ping:</span>
                <span className="text-sm font-bold text-clay-orange-dark font-friendly">
                  {lastUpdate || 'Connecting...'}
                </span>
              </div>
            </div>

            {/* Auto center toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none text-left pt-1">
              <input 
                type="checkbox" 
                checked={autoCenter} 
                onChange={(e) => setAutoCenter(e.target.checked)} 
                className="accent-clay-blue w-5 h-5 cursor-pointer rounded-lg"
              />
              <span className="text-sm font-friendly font-bold text-clay-text-dark">Keep Map Centered on Bus</span>
            </label>
          </div>

          {/* Scheduled Stops Card (Claymorphic) */}
          <div className="clay-card !p-6 bg-white flex flex-col gap-4 max-h-[340px]">
            <h3 className="text-lg font-friendly font-bold text-clay-text-dark flex items-center justify-between border-b-2 border-slate-100/80 pb-3 text-left">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-clay-yellow-dark" />
                <span>Route Stops</span>
              </div>
              <span className="clay-badge clay-badge-blue text-xs py-0.5 px-2.5">
                {routeStops.length} Total
              </span>
            </h3>

            <div className="flex flex-col gap-2.5 overflow-y-auto text-left pr-1 scrollbar-thin">
              {routeStops.length === 0 ? (
                <div className="text-xs text-clay-text-muted py-6 text-center font-friendly">
                  Stops will appear once bus route is loaded.
                </div>
              ) : (
                routeStops.map((stop, idx) => (
                  <div 
                    key={stop.id || idx} 
                    className="flex items-center justify-between bg-[#f8fafc] p-2.5 rounded-2xl border-2 border-white shadow-[inset_2px_2px_4px_rgba(166,180,200,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]"
                  >
                    <div className="flex items-center gap-2.5 truncate max-w-[70%]">
                      <span className="w-5 h-5 rounded-full bg-clay-blue text-white font-friendly font-bold text-[10px] flex items-center justify-center flex-shrink-0 shadow-sm">
                        {idx + 1}
                      </span>
                      <span className="font-friendly font-bold text-xs text-clay-text-dark truncate">
                        {stop.name}
                      </span>
                    </div>
                    <span className={`clay-badge text-[10px] uppercase py-0.5 px-2 ${
                      stop.type === 'school' ? 'clay-badge-blue' : stop.type === 'depot' ? 'clay-badge-green' : 'clay-badge-yellow'
                    }`}>
                      {stop.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Real Event Stream Logs Card (Claymorphic) */}
          <div className="clay-card !p-6 bg-white flex flex-col gap-4 h-[250px]">
            <h3 className="text-lg font-friendly font-bold text-clay-text-dark flex items-center gap-2 border-b-2 border-slate-100/80 pb-3 text-left">
              <Bell size={18} className="text-clay-green-dark" />
              <span>Live Event Stream</span>
            </h3>

            <div className="flex flex-col gap-2 overflow-y-auto text-left pr-1 scrollbar-thin h-[160px]">
              {logs.map((log, index) => (
                <div key={index} className="text-xs font-clean flex items-start gap-2 bg-[#f8fafc] p-2 rounded-xl border border-white/80 shadow-[inset_1px_1px_3px_rgba(166,180,200,0.12)]">
                  <span className="text-slate-400 font-mono text-[11px] select-none flex-shrink-0">{log.time}</span>
                  <span className="text-clay-text-dark font-medium leading-tight">{log.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Tracking;

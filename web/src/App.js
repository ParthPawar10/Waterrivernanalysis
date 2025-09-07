import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaWater, FaCopy, FaTrash, FaPaste } from 'react-icons/fa';

import { puneLocations, puneCenter, getRiverColor, preSampledRiver, riverDescriptions } from './locations';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

// ensure leaflet marker icons load correctly when not using bundled images
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
function Calendar({ date, onChange }) {
  const base = date ? new Date(date) : new Date();
  const [viewMonth, setViewMonth] = React.useState(base.getMonth());
  const [viewYear, setViewYear] = React.useState(base.getFullYear());

  React.useEffect(() => {
    const d = date ? new Date(date) : new Date();
    setViewMonth(d.getMonth());
    setViewYear(d.getFullYear());
  }, [date]);

  const startOfMonth = (y, m) => new Date(y, m, 1);
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

  const weeks = [];
  const firstDay = startOfMonth(viewYear, viewMonth).getDay(); // 0=Sun
  const leading = (firstDay + 6) % 7; // shift to Monday first (0=Mon)
  const total = leading + daysInMonth(viewYear, viewMonth);
  const rows = Math.ceil(total / 7);

  let day = 1 - leading;
  for (let r = 0; r < rows; r++) {
    const week = [];
    for (let c = 0; c < 7; c++, day++) {
      const cellDate = new Date(viewYear, viewMonth, day);
      week.push(cellDate);
    }
    weeks.push(week);
  }

  const monthNames = Array.from({ length: 12 }, (_, i) => new Date(2000, i).toLocaleString(undefined, { month: 'long' }));

  const selectDate = (d) => {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    onChange && onChange(iso);
  };

  const selected = date ? new Date(date) : null;

  return (
    <div className="inline-calendar" style={{ padding: 8, background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 12,
        padding: '8px 0'
      }}>
        <button 
          className="calendar-nav-btn" 
          onClick={() => { 
            const m = viewMonth - 1; 
            if (m < 0) { 
              setViewYear(v => v - 1); 
              setViewMonth(11); 
            } else {
              setViewMonth(m); 
            }
          }}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '8px 10px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#334155'
          }}
        >
          {'◀'}
        </button>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select 
            value={viewMonth} 
            onChange={e => setViewMonth(Number(e.target.value))}
            style={{
              background: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '6px 8px',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer',
              minWidth: '120px'
            }}
          >
            {monthNames.map((mn, idx) => <option key={mn} value={idx}>{mn}</option>)}
          </select>
          
          <select 
            value={viewYear} 
            onChange={e => setViewYear(Number(e.target.value))}
            style={{
              background: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '6px 8px',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer',
              minWidth: '80px'
            }}
          >
            {Array.from({ length: 50 }).map((_, i) => viewYear - 4 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        
        <button 
          className="calendar-nav-btn"
          onClick={() => { 
            const m = viewMonth + 1; 
            if (m > 11) { 
              setViewYear(v => v + 1); 
              setViewMonth(0); 
            } else {
              setViewMonth(m); 
            }
          }}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '8px 10px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#334155'
          }}
        >
          {'▶'}
        </button>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7,1fr)', 
        gap: 4, 
        marginTop: 8, 
        fontSize: 12, 
        fontWeight: 600, 
        textAlign: 'center',
        color: '#6b7280'
      }}>
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <div key={d}>{d}</div>)}
      </div>

      <div style={{ marginTop: 8 }}>
        {weeks.map((week, i) => (
          <div key={i} style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7,1fr)', 
            gap: 4, 
            marginBottom: 4 
          }}>
            {week.map(d => {
              const inMonth = d.getMonth() === viewMonth;
              const isSelected = selected && 
                d.getFullYear() === selected.getFullYear() && 
                d.getMonth() === selected.getMonth() && 
                d.getDate() === selected.getDate();
              const isToday = new Date().toDateString() === d.toDateString();
              
              return (
                <button 
                  key={d.toISOString()} 
                  onClick={() => inMonth && selectDate(d)} 
                  style={{ 
                    padding: 8, 
                    borderRadius: 6, 
                    border: isToday ? '2px solid #3b82f6' : '1px solid transparent',
                    background: isSelected ? '#1976d2' : (inMonth ? '#f8fafc' : 'transparent'), 
                    color: isSelected ? '#fff' : (inMonth ? '#374151' : '#9ca3af'),
                    cursor: inMonth ? 'pointer' : 'default',
                    fontSize: '13px',
                    fontWeight: isSelected || isToday ? '600' : '400',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (inMonth && !isSelected) {
                      e.target.style.background = '#e2e8f0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (inMonth && !isSelected) {
                      e.target.style.background = '#f8fafc';
                    }
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatValue(key, value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (!Number.isNaN(n)) {
  if (/pH/i.test(key)) return n.toFixed(3);
    if (/DO|BOD|FC|TC|MPN/i.test(key)) return n.toFixed(2);
    return String(n);
  }
  return String(value);
}

function cleanQualityString(quality) {
  if (quality === null || quality === undefined) return quality;
  let s = String(quality).trim();
  if (!s) return s;
  // normalize whitespace
  s = s.replace(/\s+/g, ' ');
  // remove duplicated trailing punctuation and normalize
  s = s.replace(/[\s\-–_:;,.]+$/g, '').trim();
  // collapse exact repeated phrases like "X X" or "X X X" -> "X"
  const m = s.match(/^(.*?)\s+(?:\1\s+)*\1$/i);
  if (m && m[1]) return m[1].trim();
  // fallback: if full-string repeated twice (older regex)
  const m2 = s.match(/^(.*)\s+\1$/i);
  return m2 ? m2[1].trim() : s;
}

function canonicalizePredictionEntries(pred) {
  // returns array of [key, value] with keys normalized and duplicates collapsed (last value wins)
  if (!pred || typeof pred !== 'object') return [];
  const map = new Map();
  for (const [k, v] of Object.entries(pred)) {
    const key = String(k).trim();
    const norm = key.toLowerCase().replace(/\s+/g, ' ');
    // map some common aliases
    const canonical = norm === 'water quality' ? 'water quality' : norm;
    map.set(canonical, { key: key, value: v });
  }
  // return in insertion order but using original key casing for display
  return Array.from(map.values()).map(x => [x.key, x.value]);
}

// small helper component to forward map click events into lat/lon objects
function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => { onMapClick && onMapClick({ latitude: e.latlng.lat, longitude: e.latlng.lng }); } });
  return null;
}

// basic parameter status mapping used by badges in the UI
function getParameterStatus(param, value) {
  if (value === null || value === undefined) return { cls: 'status-na', label: 'N/A' };
  const key = String(param || '').toLowerCase();
  const v = Number(value);
  if (key.includes('water quality')) {
    const s = String(value || '').toLowerCase();
    if (s.includes('good') || s.includes('ok') || s.includes('acceptable')) return { label: 'Good', cls: 'status-good' };
    if (s.includes('moderate') || s.includes('borderline')) return { label: 'Moderate', cls: 'status-moderate' };
    return { label: String(value), cls: 'status-poor' };
  }
  if (key.includes('pH')) {
    if (isNaN(v)) return { label: String(value), cls: 'status-na' };
    if (v >= 6.5 && v <= 8.5) return { label: 'Good', cls: 'status-good' };
    if (v >= 6 && v < 6.5) return { label: 'Moderate', cls: 'status-moderate' };
    return { label: 'Poor', cls: 'status-poor' };
  }
  if (key.includes('do')) {
    if (isNaN(v)) return { label: String(value), cls: 'status-na' };
    if (v >= 5) return { label: 'Good', cls: 'status-good' };
    if (v >= 3) return { label: 'Moderate', cls: 'status-moderate' };
    return { label: 'Poor', cls: 'status-poor' };
  }
  if (key.includes('bod')) {
    if (isNaN(v)) return { label: String(value), cls: 'status-na' };
    if (v <= 3) return { label: 'Good', cls: 'status-good' };
    if (v <= 6) return { label: 'Moderate', cls: 'status-moderate' };
    return { label: 'Poor', cls: 'status-poor' };
  }
  if (key.includes('fc mpn/100ml')) {
    if (isNaN(v)) return { label: String(value), cls: 'status-na' };
    if (v <= 500) return { label: 'Good', cls: 'status-good' };
    if (v <= 1000) return { label: 'Moderate', cls: 'status-moderate' };
    return { label: 'Poor', cls: 'status-poor' };
  }
  if (key.includes('tc mpn/100ml')) {
    if (isNaN(v)) return { label: String(value), cls: 'status-na' };
    if (v <= 1000) return { label: 'Good', cls: 'status-good' };
    if (v <= 2000) return { label: 'Moderate', cls: 'status-moderate' };
    return { label: 'Poor', cls: 'status-poor' };
  }
  return { label: String(value), cls: 'status-na' };
}

export default function App() {
  const [route, setRoute] = useState('home');
  const [mapInst, setMapInst] = useState(null);
  const [selectMode, setSelectMode] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [interpPoints, setInterpPoints] = useState([]);
  const [interpLoading, setInterpLoading] = useState(false);
  const [sampleCount, setSampleCount] = useState(5);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [predictions, setPredictions] = useState({});
  const [selected, setSelected] = useState(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [startRiver, setStartRiver] = useState(null);
  const [endRiver, setEndRiver] = useState(null);
  const [startStationName, setStartStationName] = useState(null);
  const [endStationName, setEndStationName] = useState(null);
  // Add missing state for forceIndexMedians
  const [forceIndexMedians, setForceIndexMedians] = useState(false);

  const handleMapClick = useCallback((pt) => {
    if (selectMode === 'start') setStartPoint(pt);
    else if (selectMode === 'end') setEndPoint(pt);
  }, [selectMode]);

  const handleMarkerClick = (loc) => {
    // In interpolate route, if user is picking start or end, set them from known station
    if (route === 'interpolate' && selectMode === 'start') {
      const coord = loc.coordinate || loc;
      setStartPoint({ latitude: coord.latitude, longitude: coord.longitude });
      setStartInput(`${coord.latitude.toFixed(6)}, ${coord.longitude.toFixed(6)}`);
      setStartRiver(loc.river || null);
  setStartStationName(loc.name || null);
      setSelectMode(null);
      setInterpPoints([]);
      return;
    }
    if (route === 'interpolate' && selectMode === 'end') {
      // guard: do not allow picking end on a different river than start
      if (startRiver && loc.river && startRiver !== loc.river) {
        alert('Please pick an end station on the same river as the start station.');
        setSelectMode(null);
        return;
      }
      const coord = loc.coordinate || loc;
      setEndPoint({ latitude: coord.latitude, longitude: coord.longitude });
      setEndInput(`${coord.latitude.toFixed(6)}, ${coord.longitude.toFixed(6)}`);
      setEndRiver(loc.river || null);
  setEndStationName(loc.name || null);
      setSelectMode(null);
      setInterpPoints([]);
      return;
    }
    // default behaviour: open details
    setSelected(loc);
    // attach available prediction
    const pred = predictions[loc.id] || null;
    setSelected(prev => ({...loc, prediction: pred}));
  };

  const performInterpolation = async () => {
  if (!startPoint || !endPoint) return alert('Pick start and end');
  setInterpLoading(true);
    // use the provided sampled river segment (lat/lon array) and ask server to pick/sample across it
    // find nearest indices in preSampledRiver for the selected start/end and slice that array
    const nearestIndex = (pt) => {
      let best = 0, bestD = Infinity;
      for (let i=0;i<preSampledRiver.length;i++){
        const dlat = preSampledRiver[i].latitude - pt.latitude;
        const dlng = preSampledRiver[i].longitude - pt.longitude;
        const d2 = dlat*dlat + dlng*dlng;
        if (d2 < bestD){ bestD = d2; best = i; }
      }
      return best;
    };
    const si = nearestIndex(startPoint), ei = nearestIndex(endPoint);
    const a = Math.min(si, ei), b = Math.max(si, ei);
    const sub = preSampledRiver.slice(a, b+1);
    const d = new Date(selectedDate);
    const body = { locations: sub, points: sampleCount, month: d.getMonth()+1, year: d.getFullYear(), pick_from_input: true, blend: 'river' };
    // include explicit station-name override only when user forces index medians
    if (forceIndexMedians && startStationName && endStationName) {
      body.start_station_name = startStationName;
      body.end_station_name = endStationName;
    }
    try {
      const res = await fetch(`${API_BASE}/interpolate_predict`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const jb = await res.json();
      if (jb.error) return alert('Server: '+jb.error);
      const pts = jb.predictions || [];
      setInterpPoints(pts);
      // fit map to interpolated points if we have a map instance
      try{
        if (mapInst && pts && pts.length > 0){
          const latlngs = pts.map(p => [p.latitude, p.longitude]);
          mapInst.fitBounds(latlngs, { padding: [40,40] });
        }
      }catch(e){}
    } catch (err) { alert('Request failed'); }
    finally { setInterpLoading(false); }
  };

  function haversineKm(a, b) {
    if (!a || !b) return 0;
    const toRad = v => v * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const sinDlat = Math.sin(dLat/2), sinDlon = Math.sin(dLon/2);
    const aa = sinDlat*sinDlat + sinDlon*sinDlon * Math.cos(lat1)*Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
    return R * c;
  }

  const copyCoord = (pt) => {
    if (!pt) return;
    const s = `${pt.latitude.toFixed(6)}, ${pt.longitude.toFixed(6)}`;
    try { navigator.clipboard && navigator.clipboard.writeText(s); } catch(e) {}
  };

  const clearStart = () => { setStartPoint(null); setInterpPoints([]); };
  const clearEnd = () => { setEndPoint(null); setInterpPoints([]); };

  // Fetch predictions for all stations when app loads or selectedDate changes
  useEffect(() => {
    async function fetchPredictions() {
      if (!selectedDate) return;
      try {
        const d = new Date(selectedDate);
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        const res = await fetch(`${API_BASE}/predict_all?month=${month}&year=${year}`);
        const jb = await res.json();
        if (jb && jb.predictions) {
          // Map predictions to station id
          const preds = {};
          jb.predictions.forEach((pred) => {
            // Find location by name
            const loc = puneLocations.find(l => l.name === pred.location);
            if (loc && loc.id) preds[loc.id] = pred;
          });
          setPredictions(preds);
        }
      } catch (err) {
        // Optionally handle error
      }
    }
    fetchPredictions();
  }, [selectedDate]);

  return (
    <div className="page">
      <main className="main" style={{display:'flex', gap:20}}>
        <div style={{flex:1}}>
          {route === 'home' ? (
            <div className="home-page">
              <div className="home-card">
                <div className="home-hero">
                  <div className="logo"><FaWater size={28} color="#fff" /></div>
                  <div>
                    <h1>RiverWatch — Pune Rivers</h1>
                    <p className="muted">Water quality predictions for Pune rivers</p>
                  </div>
                </div>
                <p>Explore predicted water quality across the Mula, Mutha and Mula-Mutha rivers. Use Predict for single-point queries and Interpolate to sample between two points.</p>
                <div className="columns">
                  <div className="col rivers">
                    <h3>Rivers</h3>
                    <div className="river-item">
                      <span className="river-name river-mula">Mula</span>
                      <div className="river-desc">{(riverDescriptions['Mula'] || '').split('. ')[0]}.</div>
                    </div>
                    <div className="river-item">
                      <span className="river-name river-mutha">Mutha</span>
                      <div className="river-desc">{(riverDescriptions['Mutha'] || '').split('. ')[0]}.</div>
                    </div>
                    <div className="river-item">
                      <span className="river-name river-mula-mutha">Mula-Mutha</span>
                      <div className="river-desc">{(riverDescriptions['Mula-Mutha'] || '').split('. ')[0]}.</div>
                    </div>
                  </div>
                  <div className="col center">
                    <h3>About</h3>
                    <p>This site reproduces the mobile water-quality model and exposes the same prediction logic on the web. It runs the trained model server-side and offers interpolation that follows river polylines so you can sample predicted values between two points. Use the map to select monitoring sites, compare parameter compliance across locations, and run multi-point interpolation to see spatial patterns for pH, dissolved oxygen, BOD and bacterial indicators across the river network.</p>
                  </div>
                  <div className="col params">
                    <h3>Parameters</h3>
                    <ul className="param-names">
                      <li><strong>pH</strong> <div className="desc">Measures water acidity and alkalinity on a scale of 0-14, with 7 being neutral. Deviations indicate pollution from industrial discharge or organic decomposition affecting aquatic life.</div></li>
                      <li><strong>DO</strong> <div className="desc">Dissolved oxygen levels in milligrams per liter, essential for fish and aquatic organisms. Low DO levels signal organic pollution and eutrophication from sewage or agricultural runoff.</div></li>
                      <li><strong>BOD</strong> <div className="desc">Biological oxygen demand measures oxygen consumed by microorganisms breaking down organic matter. High BOD indicates sewage contamination and reduces available oxygen for aquatic life.</div></li>
                      <li><strong>FC/TC</strong> <div className="desc">Fecal and total coliform bacteria counts per 100ml, indicating sewage contamination and potential health risks. High levels suggest inadequate wastewater treatment and pose serious public health concerns.</div></li>
                    </ul>
                  </div>
                </div>
                <div className="home-cta">
                  <button onClick={() => setRoute('predict')}>Go to Predict</button>
                  <button className="secondary" onClick={() => setRoute('interpolate')}>Go to Interpolate</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="main-content" style={{height: 'calc(100vh - 36px)'}}>
              <MapContainer center={[puneCenter.latitude, puneCenter.longitude]} zoom={puneCenter.zoom} className="map" whenCreated={m=>setMapInst(m)} style={{height:'100%'}}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapClickHandler onMapClick={handleMapClick} />
                {puneLocations.map(loc => {
                  const pred = predictions[loc.id] || null;
                  const entries = pred ? canonicalizePredictionEntries(pred) : [];
                  const overallEntry = entries.find(([k]) => String(k).toLowerCase() === 'water quality');
                  const overallValue = overallEntry ? cleanQualityString(String(overallEntry[1])) : null;
                  const overallStatus = overallEntry ? getParameterStatus('Water Quality', overallEntry[1]) : null;

                  return (
                    <CircleMarker key={loc.id} center={[loc.coordinate.latitude, loc.coordinate.longitude]} pathOptions={{ color: getRiverColor(loc.river), fillColor: getRiverColor(loc.river), fillOpacity:0.9 }} radius={8} eventHandlers={{ click: () => handleMarkerClick(loc) }}>
                      <Popup>
                        <div className="popup-card" style={{minWidth:260}}>
                          <div className="popup-header">
                            <div>
                              <div className="popup-title">{cleanQualityString(loc.name)}</div>
                              <div className="popup-sub muted" style={{display:'flex',gap:8,alignItems:'center',marginTop:8}}>
                                <span className={`river-tag ${cleanQualityString(loc.river).replace(/\s+/g, '-').toLowerCase()}`}>{cleanQualityString(loc.river)}</span>
                                {overallValue ? <div className={`badge ${overallStatus ? overallStatus.cls : 'status-na'}`}>{overallValue}</div> : null}
                              </div>
                            </div>
                          </div>

                          {pred ? (
                            <div className="popup-grid">
                              {entries
                                .filter(([k]) => {
                                  const key = String(k).toLowerCase();
                                  return !['location','location_name','river','month','year','id','water quality'].includes(key);
                                })
                                .map(([k,v]) => {
                                  const value = formatValue(k, v);
                                  const s = getParameterStatus(k, v);
                                  // For pH, show value and status side by side
                                  if (String(k).toLowerCase() === 'pH') {
                                    return (
                                      <div className="param-row" key={k}>
                                        <div className="param-name">{k}</div>
                                        <div className="param-value">
                                          <span className="val-text">{value}</span>
                                          <span className={`badge ${s.cls}`} style={{marginLeft:8}}>{s.label}</span>
                                        </div>
                                      </div>
                                    );
                                  }
                                  // For other parameters, show value and status as before
                                  return (
                                    <div className="param-row" key={k}>
                                      <div className="param-name">{k}</div>
                                      <div className="param-value">
                                        <span className="val-text">{value}</span>
                                        <span className={`badge ${s.cls}`} style={{marginLeft:8}}>{s.label}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          ) : <div style={{marginTop:8}}>Loading...</div>}
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
                {route === 'interpolate' && startPoint ? <Marker position={[startPoint.latitude, startPoint.longitude]}><Popup>Start</Popup></Marker> : null}
                {route === 'interpolate' && endPoint ? <Marker position={[endPoint.latitude, endPoint.longitude]}><Popup>End</Popup></Marker> : null}
                {route === 'interpolate' && interpPoints.length > 0 && (
                  <>
                    <Polyline positions={interpPoints.map(p => [p.latitude, p.longitude])} pathOptions={{color:'#0077b6', weight:3, opacity:0.7}} />
                    {interpPoints.map((pt, i) => (
                      <CircleMarker key={i} center={[pt.latitude, pt.longitude]} radius={6} pathOptions={{color:'#0077b6', fillColor:'#00b4d8', fillOpacity:0.9}}>
                        <Popup>
                          <div style={{minWidth:220}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                              <div><strong>Interpolated</strong></div>
                              <div className={`badge ${getParameterStatus('Water Quality', pt['Water Quality']).cls}`}>{cleanQualityString(pt['Water Quality'])}</div>
                            </div>
                            {/* Show pH, DO, BOD rows prominently */}
                            {['pH', 'DO (mg/L)', 'BOD (mg/L)'].map((param, idx) => {
                              const val = pt[param];
                              const valStr = (val === null || val === undefined) ? '—' : Number(val).toFixed(3);
                              const status = getParameterStatus(param, val);
                              return (
                                <div key={param} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:idx===0?8:4,borderTop:idx===0?'1px solid #edf2f7':'none',paddingTop:idx===0?8:0}}>
                                  <div style={{fontSize:13,color:'#334155',fontWeight:700}}>{param}</div>
                                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    <div style={{fontSize:18,fontWeight:800,color:'#0b3b52'}}>{valStr}</div>
                                    <div className={`badge ${status.cls}`}>{status.label}</div>
                                  </div>
                                </div>
                              );
                            })}
                            {/* Optionally show FC/TC if present */}
                            {['FC MPN/100ml', 'TC MPN/100ml'].map((param) => {
                              if (pt[param] !== undefined && pt[param] !== null) {
                                const val = pt[param];
                                const valStr = (val === null || val === undefined) ? '—' : Number(val).toFixed(2);
                                const status = getParameterStatus(param, val);
                                return (
                                  <div key={param} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:4}}>
                                    <div style={{fontSize:13,color:'#334155',fontWeight:700}}>{param}</div>
                                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                                      <div style={{fontSize:15,fontWeight:700,color:'#0b3b52'}}>{valStr}</div>
                                      <div className={`badge ${status.cls}`}>{status.label}</div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })}
                            {/* show t_frac if returned by server */}
                            {pt && (pt.t_frac !== undefined && pt.t_frac !== null) ? (
                              <div style={{marginTop:8,fontSize:12,color:'#64748b'}}>Blend t: <strong>{Number(pt.t_frac).toFixed(3)}</strong></div>
                            ) : null}
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </>
                )}
              </MapContainer>
            </div>
          )}
        </div>

        {/* right sidebar: show only on inner pages (not on Home) */}
        {route !== 'home' && (
          <aside className="detail-panel" style={{width:360}}>
          <div style={{display:'flex', justifyContent:'flex-end', gap:8, padding:8}}>
            <button onClick={()=>setRoute('home')} className="small">Home</button>
            <button onClick={()=>setRoute('interpolate')} className="small primary">Interpolate</button>
          </div>
          <div className="detail-calendar">
            <Calendar date={selectedDate} onChange={d=>setSelectedDate(d)} />
          </div>

          {route === 'interpolate' && (
            <div style={{marginTop:12}}>
              <div className="control-card">
                <div className="controls-row" style={{marginBottom:8}}>
                  <button onClick={()=>setSelectMode(selectMode==='start'?null:'start')} className={selectMode==='start'?'active small primary':''}>Pick Start</button>
                  <button onClick={()=>setSelectMode(selectMode==='end'?null:'end')} className={selectMode==='end'?'active small primary':''}>Pick End</button>
                  <button onClick={()=>{ setSelectMode(null); setInterpPoints([]); setStartPoint(null); setEndPoint(null); setStartInput(''); setEndInput(''); setStartRiver(null); setEndRiver(null); setStartStationName(null); setEndStationName(null); }} className="small">Reset</button>
                </div>
                <div style={{marginBottom:8,color:'#0b3b52',fontSize:13}}><strong>Pick stations only</strong> — interpolation will use river-linear blending</div>

                <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:10}}>
                  <label style={{margin:0,fontSize:13,color:'#475569'}}>Points k:</label>
                  <input className="input-box" type="number" min={1} max={50} value={sampleCount} onChange={e=>setSampleCount(Number(e.target.value))} />
                  <div style={{marginLeft:'auto'}}>
                    <button className="small" onClick={()=>{ setSampleCount( Math.min(50, (sampleCount||1)+1) ); }}>+1</button>
                    <button className="small" onClick={()=>{ setSampleCount( Math.max(1, (sampleCount||1)-1) ); }} style={{marginLeft:6}}>-1</button>
                  </div>
                </div>

                <div className="coord-row">
                  <div className="coord-box">
                      <div className="coord-label">Start</div>
                      <input className="coord-input" readOnly={route==='interpolate'} value={startInput || (startPoint?`${startPoint.latitude.toFixed(6)}, ${startPoint.longitude.toFixed(6)}`:'')} onChange={e=>setStartInput(e.target.value)} onBlur={(e)=>{
                        if (route === 'interpolate') return; // disable manual entry while in interpolate mode
                        const v = e.target.value.trim();
                        if (!v) return;
                        const parts = v.split(/[ ,]+/).map(x=>x.trim()).filter(Boolean);
                        if (parts.length >= 2){ const lat = Number(parts[0]); const lon = Number(parts[1]); if (!isNaN(lat) && !isNaN(lon)) setStartPoint({latitude:lat, longitude:lon}); }
                      }} onKeyDown={(e)=>{ if (e.key==='Enter'){ e.target.blur(); } }} placeholder="lat, lon" />
                    </div>
                    <div className="coord-actions">
                      <button className="small" onClick={()=>{ copyCoord(startPoint); }} disabled={!startPoint}><FaCopy/></button>
                      <button className="small" disabled={route==='interpolate'} onClick={async ()=>{ try { const t = await navigator.clipboard.readText(); setStartInput(t); const parts = t.split(/[ ,]+/).map(x=>x.trim()).filter(Boolean); if (parts.length>=2){ const lat=Number(parts[0]), lon=Number(parts[1]); if (!isNaN(lat)&&!isNaN(lon)) setStartPoint({latitude:lat, longitude:lon}); } } catch(e){} }} title="Paste from clipboard"><FaPaste/></button>
                      <button className="small" onClick={()=>{ clearStart(); setStartInput(''); setStartRiver(null); setStartStationName(null); }} disabled={!startPoint} style={{marginLeft:6}}><FaTrash/></button>
                    </div>
                </div>

                <div className="coord-row">
                  <div className="coord-box">
                      <div className="coord-label">End</div>
                      <input className="coord-input" readOnly={route==='interpolate'} value={endInput || (endPoint?`${endPoint.latitude.toFixed(6)}, ${endPoint.longitude.toFixed(6)}`:'')} onChange={e=>setEndInput(e.target.value)} onBlur={(e)=>{
                        if (route === 'interpolate') return; // disable manual entry while in interpolate mode
                        const v = e.target.value.trim();
                        if (!v) return;
                        const parts = v.split(/[ ,]+/).map(x=>x.trim()).filter(Boolean);
                        if (parts.length >= 2){ const lat = Number(parts[0]); const lon = Number(parts[1]); if (!isNaN(lat) && !isNaN(lon)) setEndPoint({latitude:lat, longitude:lon}); }
                      }} onKeyDown={(e)=>{ if (e.key==='Enter'){ e.target.blur(); } }} placeholder="lat, lon" />
                    </div>
                    <div className="coord-actions">
                      <button className="small" onClick={()=>{ copyCoord(endPoint); }} disabled={!endPoint}><FaCopy/></button>
                      <button className="small" disabled={route==='interpolate'} onClick={async ()=>{ try { const t = await navigator.clipboard.readText(); setEndInput(t); const parts = t.split(/[ ,]+/).map(x=>x.trim()).filter(Boolean); if (parts.length>=2){ const lat=Number(parts[0]), lon=Number(parts[1]); if (!isNaN(lat)&&!isNaN(lon)) setEndPoint({latitude:lat, longitude:lon}); } } catch(e){} }} title="Paste from clipboard"><FaPaste/></button>
                      <button className="small" onClick={()=>{ clearEnd(); setEndInput(''); setEndRiver(null); setEndStationName(null); }} disabled={!endPoint} style={{marginLeft:6}}><FaTrash/></button>
                    </div>
                </div>

                <div style={{marginTop:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div className="muted">Distance: <strong style={{color:'#233249'}}>{(startPoint && endPoint)?`${haversineKm(startPoint,endPoint).toFixed(2)} km`:'—'}</strong></div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:12}}>
                    <div style={{fontSize:12,color:'#475569'}}>{forceIndexMedians ? 'Mode: Index medians (override)' : 'Mode: Distance/projection'}</div>
                    <button className="btn-primary" onClick={performInterpolation} disabled={!startPoint || !endPoint || interpLoading}>{interpLoading ? 'Interpolating…' : 'Interpolate'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{marginTop:16}}>
            <div className="selected-date">Selected date: <strong>{new Date(selectedDate).toLocaleDateString()}</strong></div>
                {selected ? (
              <div style={{marginTop:12}}>
                <h3>{cleanQualityString(selected.name)}</h3>
                <div className="muted" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div><span className={`river-tag ${cleanQualityString(selected.river).replace(/\s+/g, '-').toLowerCase()}`}>{cleanQualityString(selected.river)}</span> • {selected.description}</div>
                  {selected.prediction ? (() => {
                    const entries = canonicalizePredictionEntries(selected.prediction);
                    const overall = entries.find(([k]) => String(k).toLowerCase() === 'water quality');
                    if (overall) {
                      const s = getParameterStatus('Water Quality', overall[1]);
                      return <div className={`badge ${s ? s.cls : 'status-na'}`}>{cleanQualityString(String(overall[1]))}</div>;
                    }
                    return null;
                  })() : null}
                </div>
                <h4 style={{marginTop:8}}>Prediction</h4>
                {selected.prediction ? (
                  <div>
                    {canonicalizePredictionEntries(selected.prediction)
                      .filter(([k]) => {
                        const key = String(k).toLowerCase();
                        return !['location','location_name','river','month','year','id','water quality'].includes(key);
                      })
                      .map(([k,v])=>{
                        const value = formatValue(k, v);
                        const s = getParameterStatus(k,v);
                        return (
                          <div key={k} className="inline-param-row">
                            <div className="label">{k}</div>
                            <div className="value"><div className="val-text">{value}</div><div className={`badge ${s.cls}`}>{s.label}</div></div>
                          </div>
                        );
                      })}
                  </div>
                ) : <div>Loading...</div>}
              </div>
            ) : (
              <div className="placeholder" style={{marginTop:12}}>Select a location on the map to see details here.</div>
            )}
          </div>
          </aside>
        )}
      </main>
    </div>
  );
}







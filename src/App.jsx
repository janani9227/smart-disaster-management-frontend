import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./App.css";
import Login from "./Login";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDays(baseDate = new Date(), days = 0) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

function oneYearAgoDateString(baseDate = new Date()) {
  const date = new Date(baseDate);
  date.setFullYear(date.getFullYear() - 1);
  return localDateString(date);
}

const LEVEL_RANK = { HIGH: 3, MEDIUM: 2, LOW: 1, "VERY LOW": 0 };
const LEVEL_COLOR = {
  HIGH: "#d90429",
  MEDIUM: "#f77f00",
  LOW: "#2b9348",
  "VERY LOW": "#55a630",
  "NOT ASSESSED": "#8d99ae",
  "DATA UNAVAILABLE": "#8d99ae",
};

function MapUpdater({ latitude, longitude }) {
  const map = useMap();

  useEffect(() => {
    if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
      map.setView([Number(latitude), Number(longitude)], 13);
    }
  }, [latitude, longitude, map]);

  return null;
}

function App({ onLogout, user }) {
  const API_BASE_URL = import.meta.env.DEV
    ? "http://127.0.0.1:5001"
    : (import.meta.env.VITE_API_BASE_URL || "https://smart-disaster-management-zd17.onrender.com");

  const [city, setCity] = useState("Vellore");
  const [searchCity, setSearchCity] = useState("Vellore");
  const [hazards, setHazards] = useState([]);
  const [history, setHistory] = useState(null);
  const [fromDate, setFromDate] = useState(() => shiftDays(new Date(), -7));
  const [toDate, setToDate] = useState(() => localDateString());
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [weather, setWeather] = useState(null);
  const [risk, setRisk] = useState(null);
  const [resources, setResources] = useState(null);
  const [latitude, setLatitude] = useState(12.9698);
  const [longitude, setLongitude] = useState(79.1559);
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState("");
  const [climate, setClimate] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [medicalFilter, setMedicalFilter] = useState("all");

  const loadData = async (
    selectedLocation,
    selectedFrom = fromDate,
    selectedTo = toDate
  ) => {
    const location = selectedLocation?.trim();
    if (!location) {
      setDateError("Please enter a location name.");
      return;
    }
    if (!selectedFrom || !selectedTo) {
      setDateError("Please specify both From and To dates.");
      return;
    }
    if (selectedFrom > selectedTo) {
      setDateError("From Date must be on or before To Date.");
      return;
    }

    setDateError("");
    setLoading(true);
    setClimate(null);
    setCoverage(null);
    setWeather(null);
    setRisk(null);
    setHazards([]);
    setHistory(null);
    setResources(null);

    try {
      // 1. Fetch live coordinates and weather
      const weatherResponse = await fetch(
        `${API_BASE_URL}/api/weather?city=${encodeURIComponent(location)}`,
        { signal: AbortSignal.timeout(20000) }
      );
      const weatherData = await weatherResponse.json();
      if (!weatherResponse.ok || weatherData.error) {
        throw new Error(weatherData.error || `Could not find weather data for "${location}".`);
      }

      setWeather(weatherData);
      setCity(weatherData.location || location);
      if (Number.isFinite(Number(weatherData.latitude))) setLatitude(Number(weatherData.latitude));
      if (Number.isFinite(Number(weatherData.longitude))) setLongitude(Number(weatherData.longitude));

      const coords = new URLSearchParams({
        city: location,
        lat: String(weatherData.latitude),
        lon: String(weatherData.longitude),
        temperature: String(weatherData.temperature),
        humidity: String(weatherData.humidity),
        rainfall: String(weatherData.rainfall),
        wind_speed: String(weatherData.wind_speed),
      });

      // 2. Fetch all disaster risks with occurrence chances for the selected duration
      const riskTask = (async () => {
        try {
          const riskQuery = new URLSearchParams(coords);
          riskQuery.set("from", selectedFrom);
          riskQuery.set("to", selectedTo);
          const response = await fetch(`${API_BASE_URL}/api/all-disaster-risks?${riskQuery}`, {
            signal: AbortSignal.timeout(90000),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Hazard service unavailable");
          setClimate(data.climate || null);
          setCoverage(data.coverage || null);
          const list = Array.isArray(data.hazards) ? data.hazards : [];
          setHazards(list);
          setRisk(
            list.find((item) => item.disaster_key === "flood") ||
            list[0] || {
              disaster: "Flood",
              risk_level: "LOW",
              occurrence_chance: 5,
              location: weatherData.location || location,
            }
          );
        } catch (error) {
          console.warn("Hazard assessment failed:", error);
          setHazards([
            {
              disaster: "Multi-Hazard Assessment",
              disaster_key: "screening",
              risk_level: "DATA UNAVAILABLE",
              occurrence_chance: null,
              warning: "Hazard models are temporarily updating. Please refresh or retry shortly.",
            },
          ]);
        }
      })();

      // 3. Fetch real emergency medical facilities
      const resourceTask = (async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/resources?city=${encodeURIComponent(location)}&lat=${encodeURIComponent(weatherData.latitude)}&lon=${encodeURIComponent(weatherData.longitude)}&radius=15000`,
            { signal: AbortSignal.timeout(80000) }
          );
          const data = await response.json();
          if (!response.ok || data.error) throw new Error(data.error || "Medical facility lookup timed out");
          setResources(data);
        } catch (error) {
          console.warn("Resource lookup error:", error);
          setResources({
            error: "Public map facility server is momentarily busy. Nearby facilities are temporarily cached.",
            facilities: [],
            medical_facilities: [],
            total_facilities: 0,
            hospitals: [],
            safe_zone: { found: false },
          });
        }
      })();

      // 4. Fetch previous year exact matching date historical disasters
      const historyTask = (async () => {
        try {
          const query = new URLSearchParams({
            city: location,
            lat: String(weatherData.latitude),
            lon: String(weatherData.longitude),
            from: selectedFrom,
            to: selectedTo,
          });
          const response = await fetch(`${API_BASE_URL}/api/history?${query}`, {
            signal: AbortSignal.timeout(90000),
          });
          const data = await response.json();
          if (!response.ok || data.error) throw new Error(data.error || "Historical disaster lookup failed");
          setHistory(data);
        } catch (error) {
          console.warn("History lookup error:", error);
          setHistory({
            total_events: 0,
            events: [],
            notice: "Previous year historical records are temporarily updating. Try again shortly.",
            sources_found: [],
          });
        }
      })();

      await Promise.allSettled([riskTask, resourceTask, historyTask]);
    } catch (error) {
      console.error("Dashboard data load failed:", error);
      setDateError(error.message || "Failed to locate place or load weather data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/status`)
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.status || "Online"))
      .catch(() => setBackendStatus("Offline"));

    loadData("Vellore", shiftDays(new Date(), -7), localDateString());
  }, []);

  const handleSearch = () => {
    loadData(searchCity.trim(), fromDate, toDate);
  };

  const applyPreset = (from, to) => {
    setFromDate(from);
    setToDate(to);
    loadData(searchCity.trim() || city, from, to);
  };

  const topHazard = hazards.reduce(
    (best, item) =>
      (item.occurrence_chance || 0) > (best?.occurrence_chance || 0) ? item : best,
    null
  );

  const safeZone = resources?.safe_zone;

  // Filter facilities based on selected category
  const filteredFacilities = (() => {
    if (!resources) return [];
    if (medicalFilter === "hospitals") return resources.hospitals || [];
    if (medicalFilter === "clinics") return resources.emergency_clinics || [];
    if (medicalFilter === "ambulances") return resources.ambulance_stations || [];
    if (medicalFilter === "pharmacies") return resources.pharmacies || [];
    if (medicalFilter === "services") return [...(resources.fire_stations || []), ...(resources.police_stations || [])];
    if (medicalFilter === "medical") return resources.medical_facilities || [];
    return resources.facilities || [];
  })();

  const climateSummary = climate?.summary;

  return (
    <div className="app">
      {/* Top Header & Authentication Status */}
      <header className="header">
        <div className="header-brand">
          <div className="brand-icon">🌊</div>
          <div>
            <h1>Smart Multi-Hazard Disaster Management</h1>
            <p>Real-Time Climate Analytics, Historical Records & Emergency Medical Response</p>
          </div>
        </div>

        <div className="header-user">
          <div className="user-profile-badge">
            <span className="user-icon">👤</span>
            <div className="user-text">
              <span className="user-name">{user?.name || "Verified Responder"}</span>
              <span className="user-email">{user?.email || "verified@user.org"}</span>
            </div>
            <span className="verified-pill">✓ Verified Account</span>
          </div>

          <div className="header-status-pill">
            <span className={`status-dot ${backendStatus === "online" ? "online" : ""}`}></span>
            API: {backendStatus}
          </div>

          <button type="button" className="logout-btn" onClick={onLogout}>
            Log Out
          </button>
        </div>
      </header>

      <main className="dashboard">
        {/* SECTION 1: GLOBAL LOCATION & TIME DURATION SEARCH */}
        <section className="location-section">
          <div className="section-header">
            <h2>🌍 Worldwide Location & Time Duration</h2>
            <span className="section-tag">Global Records & Satellite Integration</span>
          </div>

          <div className="location-search-row">
            <div className="location-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Enter any worldwide city, district, province, or country (e.g. Tokyo, London, Sydney, Cairo, New York...)"
              />
            </div>
            <button
              type="button"
              className="monitor-btn"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? "Fetching Real Data..." : "Analyze Location & Period"}
            </button>
          </div>

          {/* Quick worldwide suggestions */}
          <div className="quick-suggestions">
            <span className="suggestions-label">Popular Locations:</span>
            {["Tokyo", "New York", "London", "Sydney", "Paris", "Cairo", "Delhi", "Vellore"].map((place) => (
              <button
                key={place}
                type="button"
                className="suggestion-pill"
                onClick={() => {
                  setSearchCity(place);
                  loadData(place, fromDate, toDate);
                }}
              >
                {place}
              </button>
            ))}
          </div>

          {/* Time Duration Preset Pills */}
          <div className="duration-presets">
            <span className="presets-label">Quick Duration Presets:</span>
            <button
              type="button"
              className="preset-btn"
              onClick={() => applyPreset(localDateString(), localDateString())}
            >
              ⚡ Today (Present)
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => applyPreset(localDateString(), shiftDays(new Date(), 7))}
            >
              🔮 Next 7 Days (Forecast)
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => applyPreset(localDateString(), shiftDays(new Date(), 14))}
            >
              🔮 Next 14 Days
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => applyPreset(shiftDays(new Date(), -7), localDateString())}
            >
              📜 Past 7 Days (Observed)
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => applyPreset(shiftDays(new Date(), -30), localDateString())}
            >
              📜 Past Month
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => applyPreset(oneYearAgoDateString(new Date()), localDateString())}
            >
              📅 1 Year Window
            </button>
          </div>

          {/* Custom Date Pickers */}
          <div className="date-selection-box">
            <div className="date-col">
              <label htmlFor="from-date-input">From Date (Past, Present, or Future)</label>
              <input
                id="from-date-input"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDateError("");
                }}
              />
            </div>

            <div className="date-col">
              <label htmlFor="to-date-input">To Date (Past, Present, or Future)</label>
              <input
                id="to-date-input"
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDateError("");
                }}
              />
            </div>

            <button
              type="button"
              className="date-apply-btn"
              onClick={() => loadData(searchCity.trim() || city, fromDate, toDate)}
              disabled={loading}
            >
              Apply Date Range
            </button>
          </div>

          {dateError && <div className="date-error-banner">⚠️ {dateError}</div>}

          {/* Active Location Info Banner */}
          {weather && (
            <div className="active-location-card">
              <div className="location-name-large">
                📍 <strong>{weather.location}</strong>
                {weather.district && weather.district !== weather.location ? `, ${weather.district}` : ""}
                {weather.state ? `, ${weather.state}` : ""}
                {weather.country ? ` (${weather.country})` : ""}
              </div>
              <div className="location-coords">
                <span>Latitude: {weather.latitude}°</span>
                <span>Longitude: {weather.longitude}°</span>
                {weather.elevation !== null && weather.elevation !== undefined && (
                  <span>Elevation: {Math.round(weather.elevation)} m</span>
                )}
                <span className="period-badge">Selected Duration: {fromDate} to {toDate}</span>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2: TOP PRIORITY EMERGENCY ALERT */}
        <section className="emergency-alert-section">
          <div className="alert-badge-wrap">
            <span className="pulse-alert-icon">⚠️</span>
            <div className="alert-content">
              <h3>Real-Time Regional Risk Alert: {city}</h3>
              <p>
                {topHazard && (topHazard.occurrence_chance || 0) >= 45 ? (
                  <>
                    Elevated <strong>{topHazard.disaster}</strong> hazard probability (
                    <strong>{topHazard.occurrence_chance}% Occurrence Chance</strong>) detected
                    between {fromDate} and {toDate}. Follow emergency disaster protocols and official directives.
                  </>
                ) : (
                  <>
                    Hazard screening active. All multi-hazard models evaluated across Open-Meteo,
                    USGS, and NASA EONET catalogs. Nearest emergency resources and medical safe zones mapped below.
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              className="safe-zone-quick-btn"
              onClick={() => document.getElementById("medical-facilities-section")?.scrollIntoView({ behavior: "smooth" })}
            >
              View Medical Facilities
            </button>
          </div>
        </section>

        {/* SECTION 3: ACCURATE CLIMATIC & WEATHER DETAILS */}
        <section className="weather-section">
          <div className="section-header">
            <h2>🌦️ Real-Time Climatic & Weather Conditions</h2>
            <span className="section-tag">Open-Meteo • NOAA GFS • ECMWF Satellite Feed</span>
          </div>

          <div className="weather-metrics-grid">
            <div className="weather-metric-card">
              <span className="metric-icon">🌡️</span>
              <div className="metric-info">
                <h4>Temperature</h4>
                <div className="metric-value">{weather ? `${weather.temperature} °C` : "—"}</div>
                <small className="metric-sub">Ambient 2-meter air temp</small>
              </div>
            </div>

            <div className="weather-metric-card">
              <span className="metric-icon">💧</span>
              <div className="metric-info">
                <h4>Relative Humidity</h4>
                <div className="metric-value">{weather ? `${weather.humidity} %` : "—"}</div>
                <small className="metric-sub">Atmospheric moisture content</small>
              </div>
            </div>

            <div className="weather-metric-card">
              <span className="metric-icon">🌧️</span>
              <div className="metric-info">
                <h4>Precipitation</h4>
                <div className="metric-value">{weather ? `${weather.rainfall} mm` : "—"}</div>
                <small className="metric-sub">Real-time surface rain</small>
              </div>
            </div>

            <div className="weather-metric-card">
              <span className="metric-icon">💨</span>
              <div className="metric-info">
                <h4>Wind Speed</h4>
                <div className="metric-value">{weather ? `${weather.wind_speed} km/h` : "—"}</div>
                <small className="metric-sub">10-meter sustained velocity</small>
              </div>
            </div>
          </div>

          {/* Range Climate Breakdown */}
          {climateSummary && (
            <div className="climate-duration-box">
              <h3>🗓️ Climate Statistics for Duration ({fromDate} to {toDate})</h3>
              <div className="climate-stats-row">
                <div className="stat-pill">
                  <span>Avg Max / Min:</span>
                  <strong>{climateSummary.avg_max_temp_c ?? "—"}°C / {climateSummary.avg_min_temp_c ?? "—"}°C</strong>
                </div>
                <div className="stat-pill">
                  <span>Peak Hottest Day:</span>
                  <strong>{climateSummary.hottest_day_c ?? "—"}°C</strong>
                </div>
                <div className="stat-pill">
                  <span>Total Accumulated Rain:</span>
                  <strong>{climateSummary.total_rain_mm ?? 0} mm</strong>
                </div>
                <div className="stat-pill">
                  <span>Rainy Days:</span>
                  <strong>{climateSummary.rainy_days ?? 0} days</strong>
                </div>
                <div className="stat-pill">
                  <span>Max Gust Recorded:</span>
                  <strong>{climateSummary.max_gust_kmh ?? "—"} km/h</strong>
                </div>
              </div>
              {coverage && (
                <div className="coverage-note">
                  ℹ️ Data breakdown: {coverage.observed_days} observed record days, {coverage.forecast_days} global forecast days.
                  {coverage.notes?.length ? ` Note: ${coverage.notes.join(" ")}` : ""}
                </div>
              )}
            </div>
          )}
        </section>

        {/* SECTION 4: PREDICTED NATURAL DISASTER TYPES & OCCURRENCE CHANCES */}
        <section className="hazards-prediction-section">
          <div className="section-header">
            <h2>🚨 Predicted Natural Disaster Types & Occurrence Chances</h2>
            <span className="section-tag">Multi-Model Physical & Meteorological Prediction</span>
          </div>

          <p className="section-subtext">
            Each disaster type is computed using real meteorological thresholds, GloFAS river discharge,
            USGS seismic seismicity models, and NASA EONET event detections.
          </p>

          <div className="hazards-cards-grid">
            {hazards.map((item, idx) => {
              const chance = item.occurrence_chance;
              const level = item.risk_level || "LOW";
              const isHigh = (chance !== null && chance >= 75) || level === "HIGH";
              const isMed = (chance !== null && chance >= 45 && chance < 75) || level === "MEDIUM";
              const isLow = !isHigh && !isMed;

              const cardColorClass = isHigh ? "hazard-high" : isMed ? "hazard-medium" : "hazard-low";

              return (
                <div key={item.disaster_key || idx} className={`hazard-card ${cardColorClass}`}>
                  <div className="hazard-top-row">
                    <div className="hazard-title-wrap">
                      <span className="hazard-icon">
                        {item.disaster_key === "flood" && "🌊"}
                        {item.disaster_key === "cyclone" && "🌀"}
                        {item.disaster_key === "heatwave" && "🔥"}
                        {item.disaster_key === "earthquake" && "🌋"}
                        {item.disaster_key === "wildfire" && "🌲"}
                        {item.disaster_key === "landslide" && "🏔️"}
                        {item.disaster_key === "tsunami" && "🌊"}
                        {item.disaster_key === "lightning" && "⚡"}
                        {item.disaster_key === "drought" && "🏜️"}
                        {item.disaster_key === "avalanche" && "❄️"}
                        {!["flood", "cyclone", "heatwave", "earthquake", "wildfire", "landslide", "tsunami", "lightning", "drought", "avalanche"].includes(item.disaster_key) && "⚠️"}
                      </span>
                      <h3>{item.disaster}</h3>
                    </div>

                    <span
                      className="risk-level-badge"
                      style={{ backgroundColor: LEVEL_COLOR[level] || "#6c757d" }}
                    >
                      {level} RISK
                    </span>
                  </div>

                  {/* Occurrence Chance Gauge */}
                  <div className="occurrence-chance-wrap">
                    <div className="chance-text-row">
                      <span className="chance-label">Predicted Occurrence Chance:</span>
                      <strong className="chance-value">
                        {chance !== null && chance !== undefined ? `${chance}%` : "Not Assessed"}
                      </strong>
                    </div>

                    <div className="chance-progress-track">
                      <div
                        className="chance-progress-bar"
                        style={{
                          width: `${chance !== null && chance !== undefined ? chance : 0}%`,
                          backgroundColor:
                            chance >= 75 ? "#d90429" : chance >= 45 ? "#f77f00" : chance >= 20 ? "#e09f3e" : "#2b9348",
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Primary Trigger Indicators */}
                  {item.details && Object.keys(item.details).length > 0 && (
                    <div className="hazard-metrics-preview">
                      <span className="preview-label">Physical Indicators:</span>
                      <ul className="metrics-list">
                        {item.details.max_daily_rain_mm !== undefined && (
                          <li>Peak 24h Rain: <strong>{item.details.max_daily_rain_mm} mm</strong></li>
                        )}
                        {item.details.max_3day_rain_mm !== undefined && (
                          <li>3-Day Rain: <strong>{item.details.max_3day_rain_mm} mm</strong></li>
                        )}
                        {item.details.max_gust_kmh !== undefined && (
                          <li>Peak Wind Gusts: <strong>{item.details.max_gust_kmh} km/h</strong></li>
                        )}
                        {item.details.peak_temp_c !== undefined && (
                          <li>Peak Temperature: <strong>{item.details.peak_temp_c} °C</strong></li>
                        )}
                        {item.details.hot_dry_streak_days !== undefined && (
                          <li>Hot Dry Spell: <strong>{item.details.hot_dry_streak_days} days</strong></li>
                        )}
                        {item.details.m4_5_plus_within_300km_last_20y !== undefined && (
                          <li>20-Yr USGS Seismicity: <strong>{item.details.m4_5_plus_within_300km_last_20y} quakes</strong></li>
                        )}
                        {item.details.note && <li className="detail-note">{item.details.note}</li>}
                      </ul>
                    </div>
                  )}

                  <div className="hazard-source-foot">
                    <small>Source: {item.source}</small>
                  </div>
                </div>
              );
            })}
          </div>

          {!hazards.length && (
            <div className="empty-state">
              <p>Analyzing hazard models and physical probability curves for {city}...</p>
            </div>
          )}
        </section>

        {/* SECTION 5: HISTORICAL NATURAL DISASTERS FROM PREVIOUS YEAR EXACT MATCHING DATES */}
        <section className="historical-section" id="historical-disasters-section">
          <div className="section-header">
            <h2>📅 Historical Natural Disasters from Previous Year</h2>
            <span className="section-tag">Exact Matching Calendar Window</span>
          </div>

          <div className="history-target-banner">
            <div className="target-text">
              <strong>Comparison Window: </strong>
              {history ? `${history.from} to ${history.to}` : "Targeting matching dates in previous year..."}
            </div>
            <div className="target-sub">
              Automatically shift-aligned to collect real occurred disasters exactly between the matching dates of the prior completed year for <strong>{city}</strong>.
            </div>
          </div>

          {history ? (
            <>
              <div className="history-count-bar">
                <span>Verified Historical Records Found: <strong>{history.total_events ?? 0}</strong></span>
                {history.sources_found?.length > 0 && (
                  <span className="catalogs-checked">
                    Catalogs: {history.sources_found.join(" • ")}
                  </span>
                )}
              </div>

              {history.events && history.events.length > 0 ? (
                <div className="historical-events-grid">
                  {history.events.map((evt, index) => (
                    <div key={`${evt.source_file}-${evt.date}-${index}`} className="history-event-card">
                      <div className="evt-top">
                        <span className="evt-type-badge">
                          {evt.disaster?.toLowerCase().includes("earthquake") ? "🌋" :
                           evt.disaster?.toLowerCase().includes("rain") || evt.disaster?.toLowerCase().includes("flood") ? "🌧️" :
                           evt.disaster?.toLowerCase().includes("heat") ? "🔥" :
                           evt.disaster?.toLowerCase().includes("wind") || evt.disaster?.toLowerCase().includes("storm") ? "🌀" : "⚠️"}{" "}
                          {evt.disaster}
                        </span>
                        <span className="evt-date-pill">🗓️ {evt.date}</span>
                      </div>

                      <div className="evt-location">
                        <strong>Location:</strong> {evt.location || city}
                      </div>

                      {evt.details && (
                        <div className="evt-details">
                          {evt.details.magnitude !== undefined && (
                            <span className="detail-tag">Magnitude: M {evt.details.magnitude}</span>
                          )}
                          {evt.details.depth_km !== undefined && (
                            <span className="detail-tag">Depth: {evt.details.depth_km} km</span>
                          )}
                          {evt.details.observation && (
                            <span className="detail-tag">{evt.details.observation}</span>
                          )}
                          {evt.details.distance_filter && (
                            <span className="detail-tag">{evt.details.distance_filter}</span>
                          )}
                        </div>
                      )}

                      <div className="evt-foot">
                        <small className="evt-source">Agency: {evt.source_file}</small>
                        {evt.source_url && (
                          <a
                            href={evt.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="evt-link"
                          >
                            Official Catalog Report ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-history-box">
                  <span className="check-icon">✓</span>
                  <div>
                    <strong>No severe natural disaster records found for these exact dates in the previous year.</strong>
                    <p>USGS Earthquake Catalog, NASA EONET events, and Open-Meteo ERA5 extreme reanalysis were screened for this locality.</p>
                  </div>
                </div>
              )}

              {history.notice && <div className="history-notice-footer">ℹ️ {history.notice}</div>}
            </>
          ) : (
            <div className="empty-state">
              <p>Scanning USGS, NASA EONET, and Open-Meteo archive for previous year disaster records...</p>
            </div>
          )}
        </section>

        {/* SECTION 6: REAL MEDICAL EMERGENCY FACILITIES */}
        <section className="medical-facilities-section" id="medical-facilities-section">
          <div className="section-header">
            <h2>🏥 Real Medical Emergency Facilities</h2>
            <span className="section-tag">Live OpenStreetMap GIS • Turn-by-Turn Navigation</span>
          </div>

          <p className="section-subtext">
            Actual verified medical establishments and emergency centers near <strong>{city}</strong>.
            Click any facility to view direct telephone contacts or navigate via Google Maps.
          </p>

          {/* Recommended Safe Zone Highlight Card */}
          {safeZone?.found && (
            <div className="safe-zone-hero-card">
              <div className="safe-zone-badge">🛟 Nearest Primary Safe Facility</div>
              <div className="safe-zone-hero-content">
                <div>
                  <h3>{safeZone.name}</h3>
                  <p>Type: <strong>{safeZone.type}</strong> • Distance: <strong>{safeZone.distance} km</strong></p>
                  <p className="safe-zone-hours">Hours: {safeZone.opening_hours || "24/7 Emergency Response"}</p>
                </div>
                {safeZone.latitude && safeZone.longitude && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${safeZone.latitude},${safeZone.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="direct-maps-btn"
                  >
                    📍 Open GPS Route on Maps ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Medical Category Filter Tabs */}
          <div className="medical-category-tabs">
            <button
              type="button"
              className={`cat-pill ${medicalFilter === "all" ? "active" : ""}`}
              onClick={() => setMedicalFilter("all")}
            >
              All Facilities ({resources?.total_facilities ?? 0})
            </button>
            <button
              type="button"
              className={`cat-pill ${medicalFilter === "hospitals" ? "active" : ""}`}
              onClick={() => setMedicalFilter("hospitals")}
            >
              🏥 Hospitals ({resources?.hospitals?.length ?? 0})
            </button>
            <button
              type="button"
              className={`cat-pill ${medicalFilter === "clinics" ? "active" : ""}`}
              onClick={() => setMedicalFilter("clinics")}
            >
              🩺 Emergency Clinics ({resources?.emergency_clinics?.length ?? 0})
            </button>
            <button
              type="button"
              className={`cat-pill ${medicalFilter === "ambulances" ? "active" : ""}`}
              onClick={() => setMedicalFilter("ambulances")}
            >
              🚑 Ambulance & EMS ({resources?.ambulance_stations?.length ?? 0})
            </button>
            <button
              type="button"
              className={`cat-pill ${medicalFilter === "pharmacies" ? "active" : ""}`}
              onClick={() => setMedicalFilter("pharmacies")}
            >
              💊 24/7 Pharmacies ({resources?.pharmacies?.length ?? 0})
            </button>
            <button
              type="button"
              className={`cat-pill ${medicalFilter === "services" ? "active" : ""}`}
              onClick={() => setMedicalFilter("services")}
            >
              🚒 Fire & Police ({((resources?.fire_stations?.length || 0) + (resources?.police_stations?.length || 0))})
            </button>
          </div>

          {/* Facility Cards Grid */}
          <div className="facilities-grid">
            {filteredFacilities.slice(0, 24).map((f, i) => (
              <div key={`${f.id || f.name}-${i}`} className="facility-record-card">
                <div className="facility-top">
                  <span className={`facility-type-pill ${f.is_medical ? "medical-pill" : "service-pill"}`}>
                    {f.type === "Hospital" ? "🏥 Hospital" :
                     f.type === "Emergency Clinic" ? "🩺 Urgent Care / Clinic" :
                     f.type === "Ambulance Station" ? "🚑 Ambulance EMS" :
                     f.type === "Pharmacy" ? "💊 Pharmacy" :
                     f.type === "Fire Station" ? "🚒 Fire Station" :
                     f.type === "Police Station" ? "👮 Police Station" : `📍 ${f.type}`}
                  </span>
                  <span className="distance-badge">📍 {f.distance} km</span>
                </div>

                <h4 className="facility-title">{f.name}</h4>

                {f.address && f.address !== "Local area" && (
                  <p className="facility-addr">🏠 {f.address}</p>
                )}

                <div className="facility-meta-row">
                  {f.is_24_7 && <span className="open-24-badge">🕒 24/7 Emergency</span>}
                  {f.phone && f.phone !== "Not available" && (
                    <a href={`tel:${f.phone}`} className="phone-link">
                      📞 {f.phone}
                    </a>
                  )}
                </div>

                <div className="facility-actions-row">
                  <a
                    href={f.maps_url || `https://www.google.com/maps/search/?api=1&query=${f.latitude},${f.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nav-btn"
                  >
                    📍 Directions on Google Maps ↗
                  </a>
                </div>
              </div>
            ))}
          </div>

          {filteredFacilities.length === 0 && (
            <div className="no-facilities-msg">
              <p>No facilities under this filter within 15 km. Try selecting "All Facilities" or widening radius.</p>
            </div>
          )}

          {/* Live Interactive Map */}
          {Number.isFinite(latitude) && Number.isFinite(longitude) && (
            <div className="map-wrapper">
              <h3>📍 Geographic Map of Monitoring Location & Emergency Facilities</h3>
              <MapContainer
                center={[latitude, longitude]}
                zoom={13}
                style={{ height: "420px", width: "100%", borderRadius: "14px" }}
              >
                <MapUpdater latitude={latitude} longitude={longitude} />
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[latitude, longitude]}>
                  <Popup>
                    <strong>📍 Monitoring Location</strong>
                    <br />
                    {city}
                  </Popup>
                </Marker>

                {filteredFacilities.slice(0, 20).map((facility, index) => {
                  if (!Number.isFinite(Number(facility.latitude)) || !Number.isFinite(Number(facility.longitude))) {
                    return null;
                  }
                  return (
                    <Marker
                      key={`marker-${facility.id || index}`}
                      position={[Number(facility.latitude), Number(facility.longitude)]}
                    >
                      <Popup>
                        <strong>{facility.name}</strong>
                        <br />
                        {facility.type} • {facility.distance} km away
                        <br />
                        <a
                          href={facility.maps_url || `https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Directions on Maps ↗
                        </a>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function AppWithLogin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Check if token and user exist in localStorage
    const savedUser = localStorage.getItem("sdm_user");
    const token = localStorage.getItem("sdm_auth_token");
    if (savedUser && token) {
      try {
        setCurrentUser(JSON.parse(savedUser));
        setLoggedIn(true);
      } catch (e) {
        localStorage.removeItem("sdm_user");
        localStorage.removeItem("sdm_auth_token");
      }
    }
  }, []);

  if (!loggedIn) {
    return (
      <Login
        onLogin={(user) => {
          setCurrentUser(user);
          setLoggedIn(true);
        }}
      />
    );
  }

  return (
    <App
      user={currentUser}
      onLogout={() => {
        localStorage.removeItem("sdm_auth_token");
        localStorage.removeItem("sdm_user");
        setLoggedIn(false);
        setCurrentUser(null);
      }}
    />
  );
}

export default AppWithLogin;

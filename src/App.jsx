import { useEffect, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./App.css";

import Login from "./Login";


function MapUpdater({ latitude, longitude }) {

  const map = useMap();

  useEffect(() => {

    if (
      latitude !== null &&
      longitude !== null
    ) {

      map.setView(
        [latitude, longitude],
        13
      );

    }

  }, [latitude, longitude, map]);

  return null;
}


function App({ onLogout, role }) {
  const API_BASE_URL = "https://smart-disaster-management-zd17.onrender.com";

  const [city, setCity] =
    useState("Vellore");

  const [searchCity, setSearchCity] =
    useState("Vellore");

  const [backendStatus, setBackendStatus] =
    useState("");

  const [weather, setWeather] =
    useState(null);

  const [risk, setRisk] =
    useState(null);

  const [resources, setResources] =
    useState(null);

  const [latitude, setLatitude] =
    useState(12.9698);

  const [longitude, setLongitude] =
    useState(79.1559);

  const [loading, setLoading] =
    useState(false);


  const loadData = async (
    selectedLocation
  ) => {

    try {

      setLoading(true);


      // -----------------------------
      // WEATHER
      // -----------------------------

      const weatherResponse =
        await fetch(
          `${API_BASE_URL}/api/weather?city=${encodeURIComponent(
  selectedLocation
)}`
        );


      const weatherData =
        await weatherResponse.json();


      if (weatherData.error) {

        alert(
          "Location not found. Try adding the district/state, for example: Katpadi, Vellore"
        );

        return;

      }


      setWeather(
        weatherData
      );


      setCity(
        weatherData.location
      );


      setLatitude(
        weatherData.latitude
      );

      setLongitude(
        weatherData.longitude
      );


      // -----------------------------
      // RISK
      // -----------------------------

      const riskResponse =
  await fetch(
    `${API_BASE_URL}/api/ml-risk?city=${encodeURIComponent(
      selectedLocation
    )}`
  );


      const riskData =
        await riskResponse.json();


      setRisk(
        riskData
      );


      // -----------------------------
      // REAL RESOURCES
      // -----------------------------

      const resourceResponse =
        await fetch(
          `${API_BASE_URL}/api/resources?city=${encodeURIComponent(
            selectedLocation
          )}`
        );


      const resourceData =
        await resourceResponse.json();


      setResources(
        resourceData
      );


    } catch (error) {

      console.error(
        "Connection error:",
        error
      );

      alert(
        "Unable to connect to backend."
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    fetch(
      `${API_BASE_URL}/api/status`
    )

      .then(
        response =>
          response.json()
      )

      .then(
        data =>
          setBackendStatus(
            data.status
          )
      )

      .catch(
        error =>
          console.error(
            "Backend connection error:",
            error
          )
      );


    loadData(
      "Vellore"
    );

  }, []);


  const handleSearch = () => {

    if (
      !searchCity.trim()
    ) {

      alert(
        "Please enter a village, town, locality or city."
      );

      return;

    }


    loadData(
      searchCity.trim()
    );

  };


  const safeZone =
    resources?.safe_zone;


  return (

    <div className="app">


      {/* HEADER */}

      <header className="header">

        <h1>
          Smart Disaster Management
        </h1>

        <p>
          Backend Status:{" "}
          {backendStatus}
        </p>

        <p>
          Logged in as:{" "}
          {role}
        </p>

        <button
          onClick={onLogout}
        >
          Logout
        </button>

      </header>


      <main className="dashboard">


        {/* LOCATION */}

        <section className="location">

          <h2>
            📍 Select Monitoring Location
          </h2>

          <p>
            Current Location:{" "}
            <strong>
              {city}
            </strong>
          </p>


          <div className="location-search">

            <input
              type="text"
              value={searchCity}
              onChange={(e) =>
                setSearchCity(
                  e.target.value
                )
              }
              placeholder="Enter city, town, village or locality"
            />


            <button
              onClick={
                handleSearch
              }
              disabled={loading}
            >

              {loading
                ? "Searching..."
                : "Monitor Location"}

            </button>

          </div>


          <p>
            🌍 You can search for a
            city, town, village or
            locality.
          </p>


          {weather && (

            <p className="location-details">

              📌{" "}
              {weather.location}

              {weather.district &&
                `, ${weather.district}`}

              {weather.state &&
                `, ${weather.state}`}

            </p>

          )}

        </section>


        {/* AI MONITORING AGENT */}

        <section className="agent">

          <h2>
            🤖 AI Monitoring Agent
          </h2>

          <p>
            Status: Active
          </p>

          <p>
            Monitoring live weather
            conditions for{" "}
            {city}.
          </p>

          <p>

            Current Decision:{" "}

            {risk
              ? `Flood risk is ${risk.risk_level}`
              : "Analyzing..."}

          </p>

        </section>


        {/* RESOURCE AGENT */}

        <section className="agent">

          <h2>
            🚑 AI Resource Agent
          </h2>

          <p>
            Status: Active
          </p>

          <p>
            Searching real mapped
            emergency facilities
            around {city}.
          </p>

          <p>

            Current Decision:{" "}

            {resources
              ? `${resources.total_facilities} nearby emergency-support facilities identified`
              : "Searching..."}

          </p>

        </section>


        {/* SAFE-ZONE AGENT */}

        <section className="agent">

          <h2>
            📍 AI Safe-Zone Agent
          </h2>

          <p>
            Status: Active
          </p>

          <p>
            Evaluating nearby mapped
            emergency facilities.
          </p>

          <p>

            Current Recommendation:{" "}

            {safeZone?.found
              ? `${safeZone.name} (${safeZone.type}), ${safeZone.distance} km away`
              : "Searching..."}

          </p>

        </section>


        {/* WEATHER */}

        <section className="weather">

          <h2>
            🌦️ Live Weather Information
          </h2>

          <p>
            Monitoring Location:{" "}
            <strong>
              {city}
            </strong>
          </p>


          <div className="weather-grid">

            <div className="card">

              <h3>
                🌡️ Temperature
              </h3>

              <p>
                {weather
                  ? `${weather.temperature}°C`
                  : "Loading..."}
              </p>

            </div>


            <div className="card">

              <h3>
                💧 Humidity
              </h3>

              <p>
                {weather
                  ? `${weather.humidity}%`
                  : "Loading..."}
              </p>

            </div>


            <div className="card">

              <h3>
                🌧️ Rainfall
              </h3>

              <p>
                {weather
                  ? `${weather.rainfall} mm`
                  : "Loading..."}
              </p>

            </div>


            <div className="card">

              <h3>
                💨 Wind Speed
              </h3>

              <p>
                {weather
                  ? `${weather.wind_speed} km/h`
                  : "Loading..."}
              </p>

            </div>

          </div>


          <p>

            Data Source:{" "}

            {weather
              ? weather.source
              : "Loading..."}

          </p>

        </section>


        {/* RISK */}

        <section className="risk">

          <h2>
            🌊 Flood Risk
          </h2>


          <div
            className={`risk-box ${
  risk?.risk_level
    ? risk.risk_level.toLowerCase()
    : ""
}`}
          >

            <h1>

              {risk
                ? risk.risk_level
                : "Loading..."}

            </h1>


            <p>
              Location:{" "}
              {risk
                ? risk.location
                : "Loading..."}
            </p>


            <p>
              Temperature:{" "}
              {risk
                ? `${risk.temperature}°C`
                : "Loading..."}
            </p>


            <p>
              Humidity:{" "}
              {risk
                ? `${risk.humidity}%`
                : "Loading..."}
            </p>


            <p>
              Rainfall:{" "}
              {risk
                ? `${risk.rainfall} mm`
                : "Loading..."}
            </p>


            <p>
              Wind Speed:{" "}
              {risk
                ? `${risk.wind_speed} km/h`
                : "Loading..."}
            </p>


            <p>

              🤖 Risk Prediction:{" "}

              Based on current
              weather conditions,
              the prototype risk
              engine predicts a{" "}

              <strong>
                {risk
                  ? risk.risk_level
                  : "Loading..."}
              </strong>

              {" "}flood risk.

            </p>

          </div>

        </section>


        {/* ALERT */}

        <section className="alert">

          <h2>
            ⚠️ Emergency Alert
          </h2>


          <p>

            {risk

              ? risk.risk_level ===
                "HIGH"

                ? `⚠️ High flood risk detected in ${city}. Check the recommended emergency location immediately.`

                : risk.risk_level ===
                  "MEDIUM"

                ? `⚠️ Moderate flood risk detected in ${city}. Stay alert and monitor updates.`

                : `✅ Low flood risk detected in ${city}. Continue monitoring weather conditions.`

              : "Checking flood risk..."}

          </p>


          <button
            onClick={() =>
              document
                .getElementById(
                  "safe-zone"
                )
                ?.scrollIntoView({
                  behavior:
                    "smooth"
                })
            }
          >

            Find Nearby Safe Zone

          </button>

        </section>


        {/* SAFE ZONE */}

        <section
          className="safe-zone"
          id="safe-zone"
        >

          <h2>
            📍 Recommended Nearby Emergency Location
          </h2>


          {safeZone?.found ? (

            <>

              <div className="safe-zone-result">

                <h3>
                  🛟{" "}
                  {safeZone.name}
                </h3>

                <p>
                  Type:{" "}
                  <strong>
                    {safeZone.type}
                  </strong>
                </p>

                <p>
                  Distance:{" "}
                  <strong>
                    {safeZone.distance} km
                  </strong>
                </p>

                <p>
                  Opening Hours:{" "}
                  {safeZone.opening_hours}
                </p>

                <p className="warning-text">
                  ⚠️{" "}
                  {safeZone.warning}
                </p>

              </div>


              <MapContainer
                center={[
                  latitude,
                  longitude
                ]}
                zoom={13}
                style={{
                  height: "400px",
                  width: "100%"
                }}
              >

                <MapUpdater
                  latitude={
                    latitude
                  }
                  longitude={
                    longitude
                  }
                />


                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />


                {/* MONITORING LOCATION */}

                <Marker
                  position={[
                    latitude,
                    longitude
                  ]}
                >

                  <Popup>

                    📍 Monitoring Location:
                    {" "}
                    {city}

                  </Popup>

                </Marker>


                {/* SAFE ZONE */}

                <Marker
                  position={[
                    safeZone.latitude,
                    safeZone.longitude
                  ]}
                >

                  <Popup>

                    🛟 Recommended
                    Emergency Location
                    <br />

                    {safeZone.name}

                    <br />

                    {safeZone.distance}
                    {" "}km away

                  </Popup>

                </Marker>

              </MapContainer>

            </>

          ) : (

            <p>
              No suitable nearby
              emergency location was
              found in the current
              map data.
            </p>

          )}

        </section>


        {/* REAL RESOURCES */}

        <section className="resources">

          <h2>
            🚑 Real Emergency Resources
          </h2>


          <p>

            Location:{" "}
            <strong>
              {city}
            </strong>

          </p>


          <p>
            These facilities are
            retrieved from live
            OpenStreetMap data.
            The system does not use
            fixed resource numbers.
          </p>


          <div className="resource-grid">


            <div className="resource-card">

              <h3>
                🏥 Hospitals
              </h3>

              <p>
                {resources
                  ? resources.hospitals.length
                  : "Loading..."}
              </p>

              <small>
                Nearby mapped facilities
              </small>

            </div>


            <div className="resource-card">

              <h3>
                🚒 Fire Stations
              </h3>

              <p>
                {resources
                  ? resources.fire_stations.length
                  : "Loading..."}
              </p>

              <small>
                Nearby mapped facilities
              </small>

            </div>


            <div className="resource-card">

              <h3>
                👮 Police Stations
              </h3>

              <p>
                {resources
                  ? resources.police_stations.length
                  : "Loading..."}
              </p>

              <small>
                Nearby mapped facilities
              </small>

            </div>


            <div className="resource-card">

              <h3>
                🛟 Shelters
              </h3>

              <p>
                {resources
                  ? resources.shelters.length
                  : "Loading..."}
              </p>

              <small>
                Nearby mapped facilities
              </small>

            </div>


          </div>


          {/* FACILITY LIST */}

          {resources && (

            <div className="facility-list">

              <h3>
                Nearby Facilities
              </h3>


              {[
                ...(resources.hospitals || []),
                ...(resources.fire_stations || []),
                ...(resources.police_stations || []),
                ...(resources.shelters || []),
                ...(resources.community_centres || [])
              ]
                .slice(0, 15)
                .map(
                  (facility, index) => (

                    <div
                      className="facility-item"
                      key={`${facility.name}-${index}`}
                    >

                      <div>

                        <strong>
                          {facility.name}
                        </strong>

                        <span>
                          {" "}—{" "}
                          {facility.type}
                        </span>

                      </div>


                      <div>

                        📍{" "}
                        {facility.distance}
                        {" "}km away

                      </div>


                      {facility.opening_hours !==
                        "Not available in map data" && (

                        <div>

                          🕐{" "}
                          {facility.opening_hours}

                        </div>

                      )}

                    </div>

                  )
                )}

            </div>

          )}


          <p className="resource-note">

            ⚠️ Actual ambulance count,
            hospital beds, food stock,
            water stock and rescue-team
            availability cannot be inferred
            from map data. Those require a
            live authorized emergency-service
            database.

          </p>


          <p className="map-attribution">

            Facility data:
            OpenStreetMap contributors

          </p>

        </section>


        {/* ADMIN */}

        {role === "Admin" && (

          <section className="admin">

            <h2>
              🛠️ Admin Dashboard
            </h2>

            <p>
              System Status: Online
            </p>

            <p>
              AI Agents: 3 Active
            </p>

            <p>
              Current Monitoring:
              {" "}
              {city}
            </p>

            <p>
              Risk Level:{" "}

              {risk
                ? risk.risk_level
                : "Loading..."}
            </p>

            <p>
              Weather Source:
              Live API
            </p>

            <p>
              Emergency Facility
              Source:
              OpenStreetMap
            </p>

            <p>
              Mapped Facilities Found:
              {" "}

              {resources
                ? resources.total_facilities
                : "Loading..."}
            </p>

          </section>

        )}

      </main>

    </div>

  );

}


function AppWithLogin() {

  const [loggedIn, setLoggedIn] =
    useState(false);

  const [role, setRole] =
    useState("");


  if (!loggedIn) {

    return (

      <Login
        onLogin={
          (selectedRole) => {

            setRole(
              selectedRole
            );

            setLoggedIn(
              true
            );

          }
        }
      />

    );

  }


  return (

    <App
      role={role}
      onLogout={() => {

        setLoggedIn(false);

        setRole("");

      }}
    />

  );

}


export default AppWithLogin;
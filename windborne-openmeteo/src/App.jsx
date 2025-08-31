import { useEffect, useState, useRef } from "react";
import Globe from "react-globe.gl";

function App() {
  const globeEl = useRef();
  const [balloons, setBalloons] = useState([]); // trajectories as arcs
  const [current, setCurrent] = useState([]);   // current balloons w/ temp + color

  useEffect(() => {
    const fetchBalloonData = async () => {
      let grouped = {};

      // ---- Load 24h history ----
      for (let i = 0; i <= 23; i++) {
        try {
          const url = `/api/windborne/${String(i).padStart(2, "0")}.json`;
          const res = await fetch(url);
          const data = await res.json();

          if (Array.isArray(data)) {
            data.forEach((point, idx) => {
              if (point.length >= 2) {
                const [lat, lon, alt] = point;
                if (!grouped[idx]) grouped[idx] = [];
                grouped[idx].push({ lat, lon, alt, hour: i });
              }
            });
          }
        } catch (e) {
          console.log("Skipping file:", i, e);
        }
      }

      // Build arcs (static lines, not animated)
      const arcs = [];
      Object.values(grouped).forEach(track => {
        for (let j = 1; j < track.length; j++) {
          arcs.push({
            startLat: track[j - 1].lat,
            startLng: track[j - 1].lon,
            endLat: track[j].lat,
            endLng: track[j].lon,
            altitude: 0.05 + track[j].alt / 50.0,
            color: "rgba(255,0,0,0.7)"
          });
        }
      });
      setBalloons(arcs);

      // ---- Current (00.json) ----
      try {
        const res = await fetch(`/api/windborne/00.json`);
        const data = await res.json();

        if (Array.isArray(data)) {
          const sampled = data.slice(0, 5); // only grab first 5 balloons for weather

          const enriched = [];
          for (let [lat, lon, alt] of sampled) {
            try {
              const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
              const wRes = await fetch(weatherUrl);
              if (wRes.ok) {
                const json = await wRes.json();
                const temp = json.current_weather?.temperature;

                // Map temperature → color
                let color = "white";
                if (temp !== null && temp !== undefined) {
                  if (temp < 0) color = "dodgerblue";
                  else if (temp < 15) color = "yellow";
                  else color = "red";
                }

                enriched.push({ lat, lon, alt, temp, color });
              }
            } catch (err) {
              console.log("Weather fetch failed", err);
            }
          }
          setCurrent(enriched);
        }
      } catch (e) {
        console.log("Failed to fetch current balloons", e);
      }
    };

    fetchBalloonData();

    // Refresh every 10 minutes
    const interval = setInterval(fetchBalloonData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Zoom to Earth on load
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });
    }
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

        /* Balloon trajectories (static arcs) */
        arcsData={balloons}
        arcStartLat={d => d.startLat}
        arcStartLng={d => d.startLng}
        arcEndLat={d => d.endLat}
        arcEndLng={d => d.endLng}
        arcColor={d => d.color}
        arcAltitude={0.002}
        arcStroke={0.6}

        /* Current balloons (colored by temp) */
        pointsData={current}
        pointLat={d => d.lat}
        pointLng={d => d.lon}
        pointAltitude={0.01}
        pointColor={d => d.color}
        pointLabel={d =>
          `Current Balloon\nAlt: ${d.alt?.toFixed(2)} km\nTemp: ${d.temp ?? "?"}°C`
        }
        pointRadius={0.65}
        pointResolution={12}
      />
    </div>
  );
}

export default App;
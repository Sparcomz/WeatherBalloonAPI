import { useEffect, useState, useRef } from "react";
import Globe from "react-globe.gl";

// ---- Mapping function: altitude → nearest Open-Meteo pressure level ----
function mapAltToPressure(altKm) {
  const levels = [
    { pressure: "1000hPa", alt: 0.11 },
    { pressure: "975hPa",  alt: 0.32 },
    { pressure: "950hPa",  alt: 0.50 },
    { pressure: "925hPa",  alt: 0.80 },
    { pressure: "900hPa",  alt: 1.0 },
    { pressure: "850hPa",  alt: 1.5 },
    { pressure: "800hPa",  alt: 1.9 },
    { pressure: "700hPa",  alt: 3.0 },
    { pressure: "600hPa",  alt: 4.2 },
    { pressure: "500hPa",  alt: 5.6 },
    { pressure: "400hPa",  alt: 7.2 },
    { pressure: "300hPa",  alt: 9.2 },
    { pressure: "250hPa",  alt: 10.4 },
    { pressure: "200hPa",  alt: 11.8 },
    { pressure: "150hPa",  alt: 13.5 },
    { pressure: "100hPa",  alt: 15.8 },
    { pressure: "70hPa",   alt: 17.7 },
    { pressure: "50hPa",   alt: 19.3 },
    { pressure: "30hPa",   alt: 22.0 }
  ];

  let nearest = levels[0];
  let minDiff = Math.abs(altKm - levels[0].alt);
  for (const lvl of levels) {
    const diff = Math.abs(altKm - lvl.alt);
    if (diff < minDiff) {
      nearest = lvl;
      minDiff = diff;
    }
  }
  return nearest.pressure;
}

function App() {
  const globeEl = useRef();

  // ---- State ----
  const [balloons, setBalloons] = useState([]);          // past 24h arcs
  const [currentBalloons, setCurrentBalloons] = useState([]); // current positions
  const [loading, setLoading] = useState(true);          // dynamic loader state

  // ---- Fetch all data (arcs + current balloons) ----
  useEffect(() => {
    const fetchBalloonData = async () => {
      setLoading(true);  // start loading

      let grouped = {};

      // ---- Load last 24 hours of arcs ----
      for (let i = 0; i <= 23; i++) {
        try {
          const isDev = import.meta.env.DEV;
          const url = isDev 
            ? `/api/windborne/${String(i).padStart(2, "0")}.json`
            : `/api/windborne?file=${String(i).padStart(2, "0")}`;
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

      // ---- Build arcs using bright palette ----
      const arcs = [];
      const palette = [
        "#fbbf24","#3b82f6","#22c55e","#f97316",
        "#a855f7","#06b6d4","#ec4899","#84cc16","#f9a8d4"
      ];

      Object.entries(grouped).forEach(([idx, track]) => {
        const color = palette[idx % palette.length]; 
        for (let j = 1; j < track.length; j++) {
          arcs.push({
            startLat: track[j - 1].lat,
            startLng: track[j - 1].lon,
            endLat: track[j].lat,
            endLng: track[j].lon,
            altitude: 0.002,
            color,
            stroke: 0.3,
            balloonId: idx,
            hour: track[j].hour,
            alt: track[j].alt,
            label: `
              <div style="background:white;color:black;padding:6px;border-radius:6px;
                          box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:12px">
                <b>Balloon #${idx}</b><br/>
                Time: ${track[j].hour}h ago<br/>
                Altitude: ${track[j].alt?.toFixed(1)} km
              </div>`
          });
        }
      });
      setBalloons(arcs);

      // ---- Fetch current balloons (00.json) ----
      try {
        const isDev = import.meta.env.DEV;
        const resNow = await fetch(isDev 
          ? `/api/windborne/00.json`
          : `/api/windborne?file=00`);
        const latest = await resNow.json();
        if (Array.isArray(latest)) {
          const curr = latest.map((p, idx) => ({
            lat: p[0],
            lon: p[1],
            alt: p[2],
            balloonId: idx,
            label: `
              <div style="background:white;color:black;padding:6px;border-radius:6px;
                          box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:12px">
                <b>Balloon #${idx}</b><br/>
                Altitude: ${p[2]?.toFixed(1)} km
              </div>`
          }));
          setCurrentBalloons(curr);
        }
      } catch(e){ 
        console.log("Failed to fetch 00.json balloons", e); 
      }

      setLoading(false); // stop loading once done
    };

    fetchBalloonData();

    // refresh every 10 minutes
    const interval = setInterval(fetchBalloonData, 10*60*1000);
    return () => clearInterval(interval);
  }, []);

  // ---- Handler: enrich arc on click ----
  const handleArcClick = async (arc) => {
    try {
      // map altitude → closest pressure level
      const pressure = mapAltToPressure(arc.alt);

      // fetch forecast at that pressure
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${arc.endLat}&longitude=${arc.endLng}&hourly=windspeed_${pressure},winddirection_${pressure}&timezone=UTC`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.hourly) {
        const ws = data.hourly[`windspeed_${pressure}`][0];
        const wd = data.hourly[`winddirection_${pressure}`][0];

        arc.label = `
          <div style="background:white;color:black;padding:6px;border-radius:6px;
                      box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:12px">
            <b>Balloon #${arc.balloonId}</b><br/>
            Time: ${arc.hour}h ago<br/>
            Altitude: ${arc.alt?.toFixed(1)} km<br/>
            Pressure: ${pressure.replace('hPa', ' hPa')}<br/>
            Wind: ${ws} km/h<br/>
            Direction: ${wd}°
          </div>`;
        arc.stroke = 0.6; // highlight clicked arc
        setBalloons(prev => [...prev]);
      }
    } catch (err) { console.log("Arc weather fetch failed", err); }
  };

  // ---- Handler: enrich point on click ----
  const handlePointClick = async (point) => {
    try {
      // map altitude → closest pressure level
      const pressure = mapAltToPressure(point.alt);

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}&hourly=windspeed_${pressure},winddirection_${pressure}&timezone=UTC`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.hourly) {
        const ws = data.hourly[`windspeed_${pressure}`][0];
        const wd = data.hourly[`winddirection_${pressure}`][0];

        point.label = `
          <div style="background:white;color:black;padding:6px;border-radius:6px;
                      box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:12px">
            <b>Balloon #${point.balloonId}</b><br/>
            Altitude: ${point.alt?.toFixed(1)} km<br/>
            Pressure: ${pressure.replace('hPa', ' hPa')}<br/>
            Wind: ${ws} km/h<br/>
            Direction: ${wd}°
          </div>`;
        setCurrentBalloons(prev => [...prev]);
      }
    } catch (err) { console.log("Point weather fetch failed", err); }
  };

  // ---- Center globe on first load ----
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({lat:20,lng:0,altitude:2.5});
    }
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* ---- Fullscreen Loader Overlay ---- */}
      {loading && (
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          color: "#fff",
          fontFamily: "sans-serif"
        }}>
          {/* Circular spinner */}
          <div style={{
            width: "40px",
            height: "40px",
            border: "4px solid #fff",
            borderTop: "4px solid transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "12px"
          }} />
          Waiting to populate the globe with data...
        </div>
      )}

      {/* ---- Top-left intro + legend card ---- */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          background: "rgba(255, 255, 255, 0.9)",
          padding: "12px 16px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          maxWidth: "220px",
          fontFamily: "sans-serif",
          fontSize: "13px",
          color: "#111",
          zIndex: 10
        }}
      >
        <h3 style={{ margin: "0 0 6px 0", fontSize: "14px" }}>🎈 WindBorne Balloon Tracker</h3>
        <p style={{ margin: "0 0 8px 0", lineHeight: "1.3em" }}>
          This globe shows high-altitude balloons tracked over the past 24h and updates every 10 minutes.
          Click arcs/points for wind conditions at their altitude.
        </p>

        {/* Only show legend once balloons loaded */}
        {!loading && (
          <div>
            <strong>Legend:</strong>
            <div style={{ display: "flex", alignItems: "center", marginTop: "4px" }}>
              <span style={{ color: "#f00", fontWeight: "bold", marginRight: "6px" }}>●</span>
              <span>Current balloons</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: "4px" }}>
              <span style={{ color: "#3b82f6", fontWeight: "bold", marginRight: "6px" }}>━</span>
              <span>Past flight paths</span>
            </div>
          </div>
        )}
      </div>

      {/* ---- Globe fills entire screen ---- */}
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

        // ---- Arcs (balloon tracks) ----
        arcsData={balloons}
        arcStartLat={d => d.startLat}
        arcStartLng={d => d.startLng}
        arcEndLat={d => d.endLat}
        arcEndLng={d => d.endLng}
        arcColor={d => d.color}
        arcAltitude={0}
        arcStroke={d => d.stroke}
        arcLabel={d => d.label}
        onArcClick={handleArcClick}

        // ---- Points (current balloons) ----
        pointsData={currentBalloons}
        pointLat={d => d.lat}
        pointLng={d => d.lon}
        pointAltitude={0.01}
        pointColor={() => "#ff0000"}
        pointLabel={d => d.label}
        pointRadius={0.5}
        pointResolution={12}
        onPointClick={handlePointClick}
      />

      {/* ---- Spinner animation CSS ---- */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
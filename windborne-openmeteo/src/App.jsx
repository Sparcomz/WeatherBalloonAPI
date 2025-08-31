import { useEffect, useState, useRef } from "react";
import Globe from "react-globe.gl";

function App() {
  const globeEl = useRef();
  const [balloons, setBalloons] = useState([]);
  const [currentBalloons, setCurrentBalloons] = useState([]);

  useEffect(() => {
    const fetchBalloonData = async () => {
      let grouped = {};

      // ---- Load last 24 hours of arcs ----
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

      // ---- Build arcs ----
      const colors = ["red","blue","green","orange","purple","cyan","magenta","lime","pink"];
      const arcs = [];

      Object.entries(grouped).forEach(([idx, track]) => {
        const color = colors[idx % colors.length];
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
                ${track[j].hour}h ago<br/>
                Alt: ${track[j].alt?.toFixed(1)} km
              </div>`
          });
        }
      });
      setBalloons(arcs);

      // ---- Fetch current balloons (00.json) ----
      try {
        const resNow = await fetch(`/api/windborne/00.json`);
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
                Alt: ${p[2]?.toFixed(1)} km
              </div>`
          }));
          setCurrentBalloons(curr);
        }
      } catch(e){ console.log("Failed to fetch 00.json balloons", e); }
    };

    fetchBalloonData();
    const interval = setInterval(fetchBalloonData, 10*60*1000);
    return () => clearInterval(interval);
  }, []);

  // ---- Handler: enrich arc on click ----
  const handleArcClick = async (arc) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${arc.endLat}&longitude=${arc.endLng}&current_weather=true`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.current_weather) {
        arc.label = `
          <div style="background:white;color:black;padding:6px;border-radius:6px;
                      box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:12px">
            <b>Balloon #${arc.balloonId}</b><br/>
            ${arc.hour}h ago<br/>
            Alt: ${arc.alt?.toFixed(1)} km<br/>
            Wind: ${data.current_weather.windspeed} km/h<br/>
            Dir: ${data.current_weather.winddirection}°
          </div>`;
        arc.stroke = 0.6; // thicker to show enriched
        setBalloons(prev => [...prev]);
      }
    } catch (err) { console.log("Arc weather fetch failed", err); }
  };

  // ---- Handler: enrich point on click ----
  const handlePointClick = async (point) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}&current_weather=true`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.current_weather) {
        point.label = `
          <div style="background:white;color:black;padding:6px;border-radius:6px;
                      box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:12px">
            <b>Balloon #${point.balloonId}</b><br/>
            Altitude: ${point.alt?.toFixed(1)} km<br/>
            Wind: ${data.current_weather.windspeed} km/h<br/>
            Direction: ${data.current_weather.winddirection}°
          </div>`;
        setCurrentBalloons(prev => [...prev]);
      }
    } catch (err) { console.log("Point weather fetch failed", err); }
  };

  // Center on load
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({lat:20,lng:0,altitude:2.5});
    }
  }, []);

  return (
    <div style={{width:"100vw",height:"100vh"}}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

        // Arcs
        arcsData={balloons}
        arcStartLat={d=>d.startLat}
        arcStartLng={d=>d.startLng}
        arcEndLat={d=>d.endLat}
        arcEndLng={d=>d.endLng}
        arcColor={d=>d.color}
        arcAltitude={0}
        arcStroke={d=>d.stroke}
        arcLabel={d=>d.label}
        onArcClick={handleArcClick}

        // Points
        pointsData={currentBalloons}
        pointLat={d=>d.lat}
        pointLng={d=>d.lon}
        pointAltitude={0.01}
        pointColor={()=>"gold"}
        pointLabel={d=>d.label}
        pointRadius={0.6}
        pointResolution={12}
        onPointClick={handlePointClick}
      />
    </div>
  );
}

export default App;
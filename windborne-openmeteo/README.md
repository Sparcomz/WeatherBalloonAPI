# 🎈 WindBorne Balloon Tracker

An interactive 3D globe visualization of high‑altitude balloon flights.  
Built with **React**, **Vite**, and **react-globe.gl**, with live wind/atmospheric data via [Open‑Meteo](https://open-meteo.com/).

---

## ✨ Features

- 🌍 **3D Earth Globe** powered by `react-globe.gl`
- 📡 **Live Balloon Positions** pulled from `/api/windborne/00.json`
- 🕒 **24h Trajectories** rendered as colored arcs
- 💨 **Stratospheric Winds** from Open‑Meteo API using supported pressure levels
- 📑 **Balloon Info Cards & Tooltips** (altitude, pressure level, wind speed & direction)
- 🎨 **Legend & Intro Card** with status/info
- ⚡ **Dynamic Loading Screen** while balloons populate

---

## 🚀 Getting Started

Clone and install dependencies:

```bash
git clone https://github.com/Sparcomz/WeatherBalloonAPI.git
cd WeatherBalloonAPI
cd windborne-openmeteo
npm install
```

Run in development and then visit 👉 http://localhost:5173:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```
Preview production build:

```bash
npm run preview
```

---

## 🛠 Project Structure

```
public/
  weather-balloon.png     <- favicon / tab logo
  api/windborne/          <- balloon flight JSON files
src/
  App.jsx                 <- main app logic
  main.jsx                <- React entry point
index.html                <- base HTML file (favicon + title)
```

---

## 🌐 Deployment

This project is designed to deploy easily on Vercel:

1. Push your repo to GitHub.
2. Import it to Vercel.
3. Vercel auto‑detects Vite → build command: `npm run build`, output: `dist/`.
4. JSON flight data in `public/api/windborne/` is statically served at `/api/windborne/`.

---

## 📡 Data Sources

- Balloon Data: `https://a.windbornesystems.com/treasure/[hour].json.`
- Weather Data: [Open‑Meteo Forecast API](https://open-meteo.com/).

Open‑Meteo pressure levels are mapped to approximate balloon altitudes.

---

## 📃 License

MIT © 2024 Sparcom
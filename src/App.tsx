import { useEffect, useState } from "react";
import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import { setMasterVolume, setMuted, getMuted } from "./audio/engine";
import { enableMidi, midiDevice, midiEnabled, onMidiState } from "./input/midi";
import Court from "./pages/Court";
import LessonPage from "./pages/LessonPage";
import Shed from "./pages/Shed";
import Daw from "./pages/Daw";

function TopControls() {
  const [vol, setVol] = useState(80);
  const [muted, setM] = useState(getMuted());
  const [, bump] = useState(0);
  useEffect(() => onMidiState(() => bump(n => n + 1)), []);
  return (
    <span style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
      <button title="connect a MIDI keyboard" onClick={() => enableMidi()} style={{ padding: "3px 10px", fontSize: 14 }}>
        🎹 {midiEnabled() ? (midiDevice() ?? "no device") : "MIDI"}
      </button>
      <button onClick={() => { setM(m => { setMuted(!m); return !m; }); }} style={{ padding: "3px 10px", fontSize: 16 }}>
        {muted ? "🔇" : "🔊"}
      </button>
      <input type="range" min={0} max={100} value={vol} style={{ width: 90 }} title="volume"
        onChange={e => { const v = parseInt(e.target.value); setVol(v); setMasterVolume(-40 + (v / 100) * 40); }} />
    </span>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="wrap">
        <nav className="nav">
          <Link to="/" style={{ fontSize: 30 }}>🪨 hopscotch</Link>
          <NavLink to="/" end className={({ isActive }) => isActive ? "on" : ""}>the court</NavLink>
          <NavLink to="/shed" className={({ isActive }) => isActive ? "on" : ""}>the shed</NavLink>
          <NavLink to="/daw" className={({ isActive }) => isActive ? "on" : ""}>the treehouse</NavLink>
          <TopControls />
        </nav>
        <Routes>
          <Route path="/" element={<Court />} />
          <Route path="/lesson/:id" element={<LessonPage />} />
          <Route path="/shed" element={<Shed />} />
          <Route path="/daw" element={<Daw />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

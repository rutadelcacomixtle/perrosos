import React, { useState, useMemo, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, X, MapPin, Clock, Image as ImageIcon, Trash2, Share2, Users, TrendingUp, Gauge, Search, Navigation } from "lucide-react";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS = ["L","M","M","J","V","S","D"];

const ROT = [-5, 4, -3, 6, -6, 3, -4, 5];

function pad(n) { return String(n).padStart(2, "0"); }
function toKey(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

const DIFICULTADES = ["Fácil", "Moderada", "Difícil"];
const DEFAULT_LAT = 19.0413;
const DEFAULT_LNG = -98.2062;
const LEAFLET_CSS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
const LEAFLET_JS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";

const SEED_EVENTS = [
  {
    id: "seed-1",
    date: toKey(new Date().getFullYear(), new Date().getMonth(), 12),
    title: "Rodada Cañón del Águila",
    place: "Trailhead Los Encinos",
    time: "07:00",
    image: null,
    type: "comunidad",
  },
  {
    id: "seed-2",
    date: toKey(new Date().getFullYear(), new Date().getMonth(), 19),
    title: "Salida de equipo: Bosque Sur",
    place: "Parque Los Pinos",
    time: "07:30",
    image: null,
    type: "equipo",
    distance: "28",
    elevation: "620",
    difficulty: "Moderada",
    attendees: ["Charls", "Ale", "Tú"],
  },
];

function Sticker({ event, index, size = "small" }) {
  const rot = ROT[index % ROT.length];
  const dim = size === "small" ? 34 : 84;
  return (
    <div
      style={{
        width: dim,
        height: dim,
        transform: `rotate(${rot}deg)`,
        background: event.image
          ? `url(${event.image}) center/cover no-repeat`
          : "linear-gradient(135deg, #2A2D31, #3D434A)",
        border: event.type === "equipo" ? "2px solid #80C6FF" : "2px solid #EDEFF2",
        boxShadow: "0 3px 8px rgba(0,0,0,0.45)",
      }}
      className="rounded-sm flex items-center justify-center shrink-0"
    >
      {!event.image && (
        <ImageIcon size={size === "small" ? 14 : 26} color="#EDEFF2" strokeWidth={1.5} />
      )}
    </div>
  );
}

function TipoBadge({ type }) {
  const isEquipo = type === "equipo";
  return (
    <span
      className="font-mono uppercase inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm shrink-0"
      style={{
        fontSize: 9,
        color: isEquipo ? "#80C6FF" : "#F5C842",
        border: `1px solid ${isEquipo ? "#80C6FF" : "#F5C842"}`,
      }}
    >
      {isEquipo && <Users size={9} />}
      {isEquipo ? "Equipo" : "Comunidad"}
    </span>
  );
}

function ElevationDivider() {
  return (
    <svg viewBox="0 0 400 24" preserveAspectRatio="none" className="w-full h-6">
      <polyline
        points="0,20 30,20 45,6 60,20 90,20 110,14 130,20 160,20 180,4 200,20 230,20 250,10 270,20 300,20 320,8 340,20 400,20"
        fill="none"
        stroke="#F5C842"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function RodadasCalendario() {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [events, setEvents] = useState(SEED_EVENTS);
  const [modalDate, setModalDate] = useState(null);
  const emptyForm = {
    type: "comunidad",
    title: "",
    place: "",
    placeLat: null,
    placeLng: null,
    time: "",
    image: null,
    distance: "",
    elevation: "",
    difficulty: DIFICULTADES[0],
    attendees: [],
    attendeeInput: "",
  };
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef(null);
  const mapDivRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const searchTimerRef = useRef(null);
  const [leafletReady, setLeafletReady] = useState(!!window.L);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (window.L) { setLeafletReady(true); return; }
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      link.setAttribute("data-leaflet", "true");
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[data-leaflet]')) {
      const script = document.createElement("script");
      script.src = LEAFLET_JS;
      script.setAttribute("data-leaflet", "true");
      script.onload = () => setLeafletReady(true);
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!modalDate || !leafletReady || !mapDivRef.current) return;
    const L = window.L;
    const lat = form.placeLat ?? DEFAULT_LAT;
    const lng = form.placeLng ?? DEFAULT_LNG;
    const map = L.map(mapDivRef.current, { zoomControl: false }).setView([lat, lng], form.placeLat ? 15 : 12);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap, © CARTO",
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const pinColor = form.type === "equipo" ? "#80C6FF" : "#F5C842";
    const pinIcon = L.divIcon({
      className: "",
      html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:${pinColor};border:2px solid #0e0f11;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 22],
    });
    const marker = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(map);
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      reverseGeocode(pos.lat, pos.lng);
    });
    mapInstanceRef.current = map;
    markerInstanceRef.current = marker;
    setTimeout(() => map.invalidateSize(), 150);
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    };
  }, [modalDate, leafletReady]);

  async function reverseGeocode(lat, lng) {
    setForm((f) => ({ ...f, placeLat: lat, placeLng: lng }));
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17`);
      const data = await res.json();
      if (data?.display_name) {
        setForm((f) => ({ ...f, place: data.display_name, placeLat: lat, placeLng: lng }));
      }
    } catch {
      // sin conexión al servicio de geocodificación; se conservan las coordenadas
    }
  }

  function handlePlaceInput(value) {
    setForm((f) => ({ ...f, place: value, placeLat: null, placeLng: null }));
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.trim().length < 3) { setSuggestions([]); return; }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&viewbox=${DEFAULT_LNG - 1},${DEFAULT_LAT + 1},${DEFAULT_LNG + 1},${DEFAULT_LAT - 1}`
        );
        const data = await res.json();
        setSuggestions(data || []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 450);
  }

  function selectSuggestion(s) {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    setForm((f) => ({ ...f, place: s.display_name, placeLat: lat, placeLng: lng }));
    setSuggestions([]);
    const map = mapInstanceRef.current;
    const marker = markerInstanceRef.current;
    if (map && marker) {
      map.setView([lat, lng], 15);
      marker.setLatLng([lat, lng]);
    }
  }

  const grid = useMemo(() => {
    const { y, m } = view;
    const firstDay = (new Date(y, m, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [view]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      map[e.date] = map[e.date] || [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    const now = toKey(today.getFullYear(), today.getMonth(), today.getDate());
    return [...events].filter((e) => e.date >= now).sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  function changeMonth(delta) {
    setView((v) => {
      let m = v.m + delta;
      let y = v.y;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      return { y, m };
    });
  }

  function openDay(day) {
    const key = toKey(view.y, view.m, day);
    setModalDate(key);
    setForm(emptyForm);
  }

  function closeModal() {
    setModalDate(null);
    setForm(emptyForm);
  }

  function addAttendee() {
    const name = form.attendeeInput.trim();
    if (!name) return;
    setForm((f) => ({ ...f, attendees: [...f.attendees, name], attendeeInput: "" }));
  }

  function removeAttendee(name) {
    setForm((f) => ({ ...f, attendees: f.attendees.filter((a) => a !== name) }));
  }

  function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
  }

  function saveEvent() {
    if (!form.title.trim() || !modalDate) return;
    const newEvent = {
      id: `${modalDate}-${Date.now()}`,
      date: modalDate,
      type: form.type,
      title: form.title.trim(),
      place: form.place.trim(),
      placeLat: form.placeLat,
      placeLng: form.placeLng,
      time: form.time,
      image: form.image,
      ...(form.type === "equipo"
        ? {
            distance: form.distance,
            elevation: form.elevation,
            difficulty: form.difficulty,
            attendees: form.attendees,
          }
        : {}),
    };
    setEvents((prev) => [...prev, newEvent]);
    closeModal();
  }

  function removeEvent(id) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const dayEventsForModal = modalDate ? eventsByDay[modalDate] || [] : [];
  const isToday = (day) =>
    day === today.getDate() && view.m === today.getMonth() && view.y === today.getFullYear();

  return (
    <div
      style={{ background: "#0e0f11", color: "#EDEFF2", minHeight: "100vh" }}
      className="w-full flex justify-center"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Work+Sans:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap');
        .font-display { font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.02em; }
        .font-body { font-family: 'Work Sans', sans-serif; }
        .font-mono { font-family: 'Space Mono', monospace; }
        .leaflet-control-zoom a {
          background: #1D1F23 !important;
          color: #EDEFF2 !important;
          border: 1px solid #34383D !important;
        }
        .leaflet-control-zoom a:hover { background: #24272B !important; }
        .leaflet-control-attribution {
          background: rgba(14,15,17,0.75) !important;
          color: #6B747C !important;
        }
        .leaflet-control-attribution a { color: #9BA3AC !important; }
        .leaflet-bar { border: none !important; }
      `}</style>

      <div className="w-full max-w-md px-4 pt-6 pb-16 font-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="font-display text-4xl font-800 leading-none" style={{ color: "#EDEFF2" }}>
              PerroSOS MTB
            </h1>
            <p className="text-xs mt-1" style={{ color: "#9BA3AC" }}>
              Calendario de eventos MTB · comparte el enlace en tu grupo
            </p>
          </div>
          <button
            style={{ background: "#1D1F23", border: "1px solid #34383D" }}
            className="p-2 rounded-full"
            aria-label="Compartir"
          >
            <Share2 size={18} color="#F5C842" />
          </button>
        </div>

        <ElevationDivider />

        {/* Month nav */}
        <div className="flex items-center justify-between mt-3 mb-4">
          <button
            onClick={() => changeMonth(-1)}
            style={{ background: "#17181B" }}
            className="p-2 rounded-full active:scale-95 transition-transform"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={20} color="#EDEFF2" />
          </button>
          <span className="font-display uppercase text-xl tracking-wide" style={{ color: "#EDEFF2" }}>
            {MESES[view.m]} <span style={{ color: "#80C6FF" }}>{view.y}</span>
          </span>
          <button
            onClick={() => changeMonth(1)}
            style={{ background: "#17181B" }}
            className="p-2 rounded-full active:scale-95 transition-transform"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={20} color="#EDEFF2" />
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS.map((d, i) => (
            <div key={i} className="text-center text-xs font-mono" style={{ color: "#6B747C" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day, idx) => {
            if (day === null) return <div key={idx} />;
            const key = toKey(view.y, view.m, day);
            const dayEvents = eventsByDay[key] || [];
            return (
              <button
                key={idx}
                onClick={() => openDay(day)}
                style={{
                  background: isToday(day) ? "#182530" : "#17181B",
                  border: isToday(day) ? "1px solid #80C6FF" : "1px solid #24272B",
                  minHeight: 52,
                }}
                className="relative rounded-md flex flex-col items-center justify-center pt-1 active:scale-95 transition-transform"
              >
                <span className="font-mono text-xs" style={{ color: isToday(day) ? "#EDEFF2" : "#9BA3AC" }}>
                  {pad(day)}
                </span>
                {dayEvents.length > 0 && (
                  <div className="absolute -top-1.5 -right-1.5">
                    <Sticker event={dayEvents[0]} index={idx} size="small" />
                  </div>
                )}
                {dayEvents.length > 1 && (
                  <span
                    className="absolute bottom-0.5 right-1 font-mono"
                    style={{ fontSize: 9, color: "#F5C842" }}
                  >
                    +{dayEvents.length - 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Upcoming list */}
        <div className="mt-8">
          <h2 className="font-display uppercase text-lg mb-3" style={{ color: "#EDEFF2" }}>
            Próximas rodadas
          </h2>
          {upcoming.length === 0 && (
            <p className="text-sm" style={{ color: "#6B747C" }}>
              Sin eventos por venir. Toca un día del calendario para agregar uno.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {upcoming.map((e, i) => (
              <div
                key={e.id}
                style={{ background: "#17181B", border: "1px solid #24272B" }}
                className="rounded-lg p-2 flex items-center gap-3"
              >
                <Sticker event={e} index={i} size="large" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <TipoBadge type={e.type} />
                  </div>
                  <p className="font-display uppercase text-base leading-tight truncate" style={{ color: "#EDEFF2" }}>
                    {e.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 font-mono" style={{ fontSize: 11, color: "#9BA3AC" }}>
                    <span>{e.date}</span>
                    {e.time && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {e.time}
                      </span>
                    )}
                  </div>
                  {e.place && (
                    <div className="flex items-center gap-1.5 mt-0.5" style={{ fontSize: 11, color: "#6B747C" }}>
                      <MapPin size={10} className="shrink-0" /> <span className="truncate">{e.place}</span>
                      {e.placeLat && e.placeLng && (
                        <a
                          href={`https://www.google.com/maps?q=${e.placeLat},${e.placeLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#80C6FF" }}
                          className="shrink-0 underline"
                        >
                          Cómo llegar
                        </a>
                      )}
                    </div>
                  )}
                  {e.type === "equipo" && (
                    <div className="flex flex-wrap items-center gap-2.5 mt-1 font-mono" style={{ fontSize: 10.5, color: "#80C6FF" }}>
                      {e.distance && (
                        <span className="flex items-center gap-1">
                          <TrendingUp size={10} /> {e.distance} km
                        </span>
                      )}
                      {e.elevation && <span>+{e.elevation} m</span>}
                      {e.difficulty && (
                        <span className="flex items-center gap-1">
                          <Gauge size={10} /> {e.difficulty}
                        </span>
                      )}
                      {e.attendees?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users size={10} /> {e.attendees.length} confirmados
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => removeEvent(e.id)} className="p-1.5 shrink-0" aria-label="Eliminar">
                  <Trash2 size={16} color="#6B747C" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs mt-8 text-center" style={{ color: "#454B52" }}>
          Prototipo · los eventos viven solo en esta sesión
        </p>
      </div>

      {/* Modal */}
      {modalDate && (
        <div
          style={{ background: "rgba(0,0,0,0.6)" }}
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#17181B", border: "1px solid #34383D" }}
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-sm" style={{ color: "#80C6FF" }}>{modalDate}</span>
              <button onClick={closeModal} aria-label="Cerrar">
                <X size={20} color="#9BA3AC" />
              </button>
            </div>

            {dayEventsForModal.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {dayEventsForModal.map((e, i) => (
                  <div key={e.id} style={{ background: "#1D1F23" }} className="rounded-lg p-2 flex items-center gap-3">
                    <Sticker event={e} index={i} size="large" />
                    <div className="flex-1 min-w-0">
                      <TipoBadge type={e.type} />
                      <p className="font-display uppercase text-base mt-0.5" style={{ color: "#EDEFF2" }}>{e.title}</p>
                      {e.place && (
                        <p style={{ fontSize: 11, color: "#9BA3AC" }} className="flex items-center gap-1.5">
                          <span className="truncate">{e.place}</span>
                          {e.placeLat && e.placeLng && (
                            <a
                              href={`https://www.google.com/maps?q=${e.placeLat},${e.placeLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#80C6FF" }}
                              className="shrink-0 underline"
                            >
                              Cómo llegar
                            </a>
                          )}
                        </p>
                      )}
                      {e.type === "equipo" && e.attendees?.length > 0 && (
                        <p className="flex items-center gap-1 mt-0.5" style={{ fontSize: 10.5, color: "#80C6FF" }}>
                          <Users size={10} /> {e.attendees.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="font-display uppercase text-sm mb-3" style={{ color: form.type === "equipo" ? "#80C6FF" : "#F5C842" }}>
              Agregar evento
            </p>

            <div className="flex mb-3 rounded-md overflow-hidden" style={{ border: "1px solid #34383D" }}>
              <button
                onClick={() => setForm((f) => ({ ...f, type: "comunidad" }))}
                style={{
                  background: form.type === "comunidad" ? "#F5C842" : "transparent",
                  color: form.type === "comunidad" ? "#0e0f11" : "#9BA3AC",
                }}
                className="flex-1 py-2 text-xs font-display uppercase tracking-wide"
              >
                Comunidad
              </button>
              <button
                onClick={() => setForm((f) => ({ ...f, type: "equipo" }))}
                style={{
                  background: form.type === "equipo" ? "#80C6FF" : "transparent",
                  color: form.type === "equipo" ? "#0e0f11" : "#9BA3AC",
                }}
                className="flex-1 py-2 text-xs font-display uppercase tracking-wide flex items-center justify-center gap-1"
              >
                <Users size={12} /> Rodada de equipo
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <input
                value={form.title}
                onChange={(ev) => setForm((f) => ({ ...f, title: ev.target.value }))}
                placeholder="Nombre de la rodada"
                style={{ background: "#0e0f11", border: "1px solid #34383D", color: "#EDEFF2" }}
                className="rounded-md px-3 py-2 text-sm outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="time"
                  value={form.time}
                  onChange={(ev) => setForm((f) => ({ ...f, time: ev.target.value }))}
                  style={{ background: "#0e0f11", border: "1px solid #34383D", color: "#EDEFF2" }}
                  className="rounded-md px-3 py-2 text-sm outline-none font-mono w-28"
                />
                <span className="flex items-center text-xs" style={{ color: "#6B747C" }}>hora de encuentro</span>
              </div>

              <div className="relative">
                <div className="relative">
                  <Search size={14} color="#6B747C" className="absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={form.place}
                    onChange={(ev) => handlePlaceInput(ev.target.value)}
                    placeholder="Buscar punto de reunión o dirección"
                    style={{ background: "#0e0f11", border: "1px solid #34383D", color: "#EDEFF2" }}
                    className="rounded-md pl-9 pr-3 py-2 text-sm outline-none w-full"
                  />
                </div>
                {suggestions.length > 0 && (
                  <div
                    style={{ background: "#1D1F23", border: "1px solid #34383D" }}
                    className="absolute z-10 w-full mt-1 rounded-md overflow-hidden"
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s.place_id}
                        onClick={() => selectSuggestion(s)}
                        style={{ color: "#EDEFF2", borderBottom: "1px solid #24272B" }}
                        className="w-full text-left px-3 py-2 text-xs flex items-start gap-2 last:border-b-0"
                      >
                        <MapPin size={12} className="mt-0.5 shrink-0" color="#80C6FF" />
                        <span className="truncate">{s.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searching && (
                  <p className="text-xs mt-1" style={{ color: "#6B747C" }}>Buscando…</p>
                )}
              </div>

              <div>
                <div
                  ref={mapDivRef}
                  style={{ height: 160, background: "#1D1F23", border: "1px solid #34383D" }}
                  className="rounded-md overflow-hidden"
                />
                <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "#6B747C" }}>
                  <Navigation size={11} /> Arrastra el pin para ajustar el punto exacto
                </p>
              </div>

              {form.type === "equipo" && (
                <div className="flex flex-col gap-3 rounded-md p-3" style={{ background: "#182530", border: "1px solid #24272B" }}>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={form.distance}
                      onChange={(ev) => setForm((f) => ({ ...f, distance: ev.target.value }))}
                      placeholder="Distancia (km)"
                      style={{ background: "#0e0f11", border: "1px solid #34383D", color: "#EDEFF2" }}
                      className="rounded-md px-3 py-2 text-sm outline-none flex-1 min-w-0 font-mono"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.elevation}
                      onChange={(ev) => setForm((f) => ({ ...f, elevation: ev.target.value }))}
                      placeholder="Desnivel (m)"
                      style={{ background: "#0e0f11", border: "1px solid #34383D", color: "#EDEFF2" }}
                      className="rounded-md px-3 py-2 text-sm outline-none flex-1 min-w-0 font-mono"
                    />
                  </div>

                  <div className="flex gap-2">
                    {DIFICULTADES.map((d) => (
                      <button
                        key={d}
                        onClick={() => setForm((f) => ({ ...f, difficulty: d }))}
                        style={{
                          background: form.difficulty === d ? "#80C6FF" : "#0e0f11",
                          color: form.difficulty === d ? "#0e0f11" : "#9BA3AC",
                          border: "1px solid #34383D",
                        }}
                        className="flex-1 rounded-md py-1.5 text-xs font-display uppercase"
                      >
                        {d}
                      </button>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs mb-1.5 flex items-center gap-1" style={{ color: "#9BA3AC" }}>
                      <Users size={11} /> Quién confirma
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={form.attendeeInput}
                        onChange={(ev) => setForm((f) => ({ ...f, attendeeInput: ev.target.value }))}
                        onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); addAttendee(); } }}
                        placeholder="Nombre"
                        style={{ background: "#0e0f11", border: "1px solid #34383D", color: "#EDEFF2" }}
                        className="rounded-md px-3 py-2 text-sm outline-none flex-1 min-w-0"
                      />
                      <button
                        onClick={addAttendee}
                        style={{ background: "#0e0f11", border: "1px solid #34383D" }}
                        className="rounded-md px-3"
                        aria-label="Agregar asistente"
                      >
                        <Plus size={16} color="#80C6FF" />
                      </button>
                    </div>
                    {form.attendees.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {form.attendees.map((name) => (
                          <span
                            key={name}
                            style={{ background: "#0e0f11", border: "1px solid #34383D", color: "#EDEFF2" }}
                            className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                          >
                            {name}
                            <button onClick={() => removeAttendee(name)} aria-label={`Quitar ${name}`}>
                              <X size={11} color="#6B747C" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => fileRef.current?.click()}
                style={{ background: "#1D1F23", border: "1px dashed #454B52" }}
                className="rounded-md px-3 py-3 text-sm flex items-center justify-center gap-2"
              >
                <ImageIcon size={16} color="#9BA3AC" />
                <span style={{ color: "#9BA3AC" }}>
                  {form.image ? "Imagen lista ✓" : "Subir imagen del evento"}
                </span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />

              <button
                onClick={saveEvent}
                disabled={!form.title.trim()}
                style={{
                  background: form.title.trim() ? (form.type === "equipo" ? "#80C6FF" : "#F5C842") : "#2A2D31",
                  color: "#0e0f11",
                }}
                className="rounded-md px-3 py-2.5 font-display uppercase tracking-wide text-sm flex items-center justify-center gap-2 mt-1 disabled:cursor-not-allowed"
              >
                <Plus size={16} /> Guardar evento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

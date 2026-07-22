import { useState, useRef } from "react";
import {
  ChevronLeft,
  Trash2,
  Clock,
  MapPin,
  TrendingUp,
  Gauge,
  Users,
  Image as ImageIcon,
  ExternalLink,
  Save,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { uploadEventImage } from "../lib/upload";
import { MapPicker } from "./MapPicker";
import { AttendeeList } from "./AttendeeList";
import { TipoBadge } from "./EventCard";
import type { EventWithAttendees } from "../types";

const DIFICULTADES = ["Facil", "Moderada", "Dificil"] as const;

interface EventDetailProps {
  event: EventWithAttendees;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function EventDetail({
  event,
  onClose,
  onSaved,
  onDeleted,
}: EventDetailProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(event.title);
  const [type, setType] = useState(event.type);
  const [time, setTime] = useState(event.time || "");
  const [place, setPlace] = useState(event.place || "");
  const [placeLat, setPlaceLat] = useState(event.place_lat);
  const [placeLng, setPlaceLng] = useState(event.place_lng);
  const [distance, setDistance] = useState(event.distance || "");
  const [elevation, setElevation] = useState(event.elevation || "");
  const [difficulty, setDifficulty] = useState(event.difficulty || "Facil");
  const [sourceUrl, setSourceUrl] = useState(event.source_url || "");
  const [attendees, setAttendees] = useState(
    event.attendees.map((a) => a.display_name || "").filter(Boolean)
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(event.image_url);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
    setImageFile(file);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const updates: Record<string, unknown> = {
      title: title.trim(),
      type,
      time: time || null,
      place: place.trim() || null,
      place_lat: placeLat,
      place_lng: placeLng,
      source_url: sourceUrl.trim() || null,
      distance: type === "equipo" ? distance || null : null,
      elevation: type === "equipo" ? elevation || null : null,
      difficulty: type === "equipo" ? difficulty : null,
    };

    const { error: updateError } = await supabase
      .from("eventos")
      .update(updates)
      .eq("id", event.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    if (imageFile) {
      const url = await uploadEventImage(imageFile, event.id);
      if (url) {
        await supabase
          .from("eventos")
          .update({ image_url: url })
          .eq("id", event.id);
      }
    }

    // Sync attendees for equipo events
    if (type === "equipo") {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      await supabase
        .from("event_attendees")
        .delete()
        .eq("event_id", event.id);

      if (attendees.length > 0 && userId) {
        const rows = attendees.map((name) => ({
          event_id: event.id,
          user_id: userId,
          display_name: name,
        }));
        await supabase.from("event_attendees").insert(rows);
      }
    }

    setSaving(false);
    setEditing(false);
    onSaved();
  }

  async function handleDelete() {
    if (!confirm("Eliminar este evento?")) return;
    setDeleting(true);
    await supabase.from("eventos").delete().eq("id", event.id);
    setDeleting(false);
    onDeleted();
    onClose();
  }

  return (
    <div
      style={{ background: "#0e0f11", minHeight: "100vh" }}
      className="w-full flex justify-center"
    >
      <div className="w-full max-w-md px-4 pt-6 pb-16 font-[family-name:var(--font-body)]">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-full cursor-pointer"
              style={{ background: "#1D1F23", border: "1px solid #34383D" }}
              aria-label="Volver"
            >
              <ChevronLeft size={18} color="#9BA3AC" />
            </button>
            <p
              className="font-[family-name:var(--font-display)] uppercase text-lg"
              style={{ color: "#EDEFF2" }}
            >
              Detalle
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 rounded-md text-xs font-[family-name:var(--font-display)] uppercase tracking-wide cursor-pointer"
                style={{ background: "#80C6FF", color: "#0e0f11" }}
              >
                Editar
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 rounded-full cursor-pointer"
              style={{ background: "#1D1F23", border: "1px solid #34383D" }}
              aria-label="Eliminar"
            >
              <Trash2 size={16} color="#ff6b6b" />
            </button>
          </div>
        </div>

        {/* Image */}
        {imageUrl && (
          <div
            className="rounded-xl overflow-hidden mb-4"
            style={{ height: 200, background: "#1D1F23" }}
          >
            <img
              src={imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {editing ? (
          /* Edit mode */
          <div className="flex flex-col gap-3">
            <div className="flex mb-1 rounded-md overflow-hidden" style={{ border: "1px solid #34383D" }}>
              <button
                onClick={() => setType("comunidad")}
                style={{
                  background: type === "comunidad" ? "#F5C842" : "transparent",
                  color: type === "comunidad" ? "#0e0f11" : "#9BA3AC",
                }}
                className="flex-1 py-2 text-xs font-[family-name:var(--font-display)] uppercase tracking-wide cursor-pointer"
              >
                Comunidad
              </button>
              <button
                onClick={() => setType("equipo")}
                style={{
                  background: type === "equipo" ? "#80C6FF" : "transparent",
                  color: type === "equipo" ? "#0e0f11" : "#9BA3AC",
                }}
                className="flex-1 py-2 text-xs font-[family-name:var(--font-display)] uppercase tracking-wide cursor-pointer"
              >
                Rodada de equipo
              </button>
            </div>

            <input
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              placeholder="Nombre de la rodada"
              style={{
                background: "#0e0f11",
                border: "1px solid #34383D",
                color: "#EDEFF2",
              }}
              className="rounded-md px-3 py-2 text-sm outline-none"
            />

            <div className="flex gap-2">
              <input
                type="time"
                value={time}
                onChange={(ev) => setTime(ev.target.value)}
                style={{
                  background: "#0e0f11",
                  border: "1px solid #34383D",
                  color: "#EDEFF2",
                }}
                className="rounded-md px-3 py-2 text-sm outline-none font-[family-name:var(--font-mono)] w-28"
              />
              <span className="flex items-center text-xs" style={{ color: "#6B747C" }}>
                hora de encuentro
              </span>
            </div>

            <input
              value={sourceUrl}
              onChange={(ev) => setSourceUrl(ev.target.value)}
              placeholder="Enlace al post original"
              style={{
                background: "#0e0f11",
                border: "1px solid #34383D",
                color: "#EDEFF2",
              }}
              className="rounded-md px-3 py-2 text-sm outline-none"
            />

            <MapPicker
              place={place}
              placeLat={placeLat}
              placeLng={placeLng}
              onPlaceChange={(p, lat, lng) => {
                setPlace(p);
                setPlaceLat(lat);
                setPlaceLng(lng);
              }}
            />

            {type === "equipo" && (
              <div
                className="flex flex-col gap-3 rounded-md p-3"
                style={{ background: "#182530", border: "1px solid #24272B" }}
              >
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={distance}
                    onChange={(ev) => setDistance(ev.target.value)}
                    placeholder="Distancia (km)"
                    style={{
                      background: "#0e0f11",
                      border: "1px solid #34383D",
                      color: "#EDEFF2",
                    }}
                    className="rounded-md px-3 py-2 text-sm outline-none flex-1 min-w-0 font-[family-name:var(--font-mono)]"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={elevation}
                    onChange={(ev) => setElevation(ev.target.value)}
                    placeholder="Desnivel (m)"
                    style={{
                      background: "#0e0f11",
                      border: "1px solid #34383D",
                      color: "#EDEFF2",
                    }}
                    className="rounded-md px-3 py-2 text-sm outline-none flex-1 min-w-0 font-[family-name:var(--font-mono)]"
                  />
                </div>
                <div className="flex gap-2">
                  {DIFICULTADES.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      style={{
                        background: difficulty === d ? "#80C6FF" : "#0e0f11",
                        color: difficulty === d ? "#0e0f11" : "#9BA3AC",
                        border: "1px solid #34383D",
                      }}
                      className="flex-1 rounded-md py-1.5 text-xs font-[family-name:var(--font-display)] uppercase cursor-pointer"
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <AttendeeList attendees={attendees} onChange={setAttendees} />
              </div>
            )}

            <button
              onClick={() => fileRef.current?.click()}
              style={{
                background: "#1D1F23",
                border: "1px dashed #454B52",
              }}
              className="rounded-md px-3 py-3 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <ImageIcon size={16} color="#9BA3AC" />
              <span style={{ color: "#9BA3AC" }}>
                {imageUrl ? "Cambiar imagen" : "Subir imagen"}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="hidden"
            />

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#2a1a1a", color: "#ff6b6b" }}>
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 rounded-md px-3 py-2.5 text-sm cursor-pointer"
                style={{ background: "#1D1F23", border: "1px solid #34383D", color: "#9BA3AC" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim() || saving}
                className="flex-1 rounded-md px-3 py-2.5 font-[family-name:var(--font-display)] uppercase tracking-wide text-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background: title.trim() ? "#80C6FF" : "#2A2D31",
                  color: "#0e0f11",
                }}
              >
                <Save size={14} /> {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        ) : (
          /* View mode */
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <TipoBadge type={event.type} />
            </div>

            <h1
              className="font-[family-name:var(--font-display)] uppercase text-2xl font-bold leading-tight"
              style={{ color: "#EDEFF2" }}
            >
              {event.title}
            </h1>

            <div
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: "#1D1F23", border: "1px solid #24272B" }}
            >
              <div className="flex items-center gap-2" style={{ color: "#9BA3AC" }}>
                <span className="font-[family-name:var(--font-mono)] text-sm">{event.date}</span>
                {event.time && (
                  <>
                    <span style={{ color: "#34383D" }}>|</span>
                    <span className="flex items-center gap-1 text-sm">
                      <Clock size={12} /> {event.time}
                    </span>
                  </>
                )}
              </div>

              {event.place && (
                <div className="flex items-start gap-2" style={{ color: "#9BA3AC" }}>
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{event.place}</p>
                    {event.place_lat != null && event.place_lng != null && (
                      <a
                        href={`https://www.google.com/maps?q=${event.place_lat},${event.place_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs mt-1"
                        style={{ color: "#80C6FF" }}
                      >
                        <ExternalLink size={10} /> Como llegar
                      </a>
                    )}
                  </div>
                </div>
              )}

              {event.type === "equipo" && (
                <div
                  className="flex flex-wrap items-center gap-3 pt-2"
                  style={{ borderTop: "1px solid #24272B" }}
                >
                  {event.distance && (
                    <span className="flex items-center gap-1 text-sm font-[family-name:var(--font-mono)]" style={{ color: "#80C6FF" }}>
                      <TrendingUp size={12} /> {event.distance} km
                    </span>
                  )}
                  {event.elevation && (
                    <span className="text-sm font-[family-name:var(--font-mono)]" style={{ color: "#80C6FF" }}>
                      +{event.elevation} m
                    </span>
                  )}
                  {event.difficulty && (
                    <span className="flex items-center gap-1 text-sm font-[family-name:var(--font-mono)]" style={{ color: "#80C6FF" }}>
                      <Gauge size={12} /> {event.difficulty}
                    </span>
                  )}
                </div>
              )}

              {event.type === "equipo" && event.attendees.length > 0 && (
                <div
                  className="flex flex-wrap items-center gap-2 pt-2"
                  style={{ borderTop: "1px solid #24272B" }}
                >
                  <Users size={12} style={{ color: "#80C6FF" }} />
                  <span className="text-xs" style={{ color: "#9BA3AC" }}>
                    {event.attendees.map((a) => a.display_name).join(", ")}
                  </span>
                </div>
              )}

              {event.source_url && (
                <a
                  href={event.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs pt-2"
                  style={{ color: "#80C6FF", borderTop: "1px solid #24272B" }}
                >
                  <ExternalLink size={10} /> Ver publicacion original
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

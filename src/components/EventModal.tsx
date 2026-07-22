import { useState, useRef } from "react";
import { Plus, X, Image as ImageIcon, Users } from "lucide-react";
import { MapPicker } from "./MapPicker";
import { Sticker, TipoBadge } from "./EventCard";
import { supabase } from "../lib/supabase";
import { uploadEventImage } from "../lib/upload";
import type { EventWithAttendees, EventType } from "../types";

const DIFICULTADES = ["Facil", "Moderada", "Dificil"] as const;

interface EventModalProps {
  dateKey: string;
  existingEvents: EventWithAttendees[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  type: EventType;
  title: string;
  place: string;
  placeLat: number | null;
  placeLng: number | null;
  time: string;
  imageFile: File | null;
  imageUrl: string | null;
  sourceUrl: string;
  distance: string;
  elevation: string;
  difficulty: string;
  attendees: string[];
}

const EMPTY_FORM: FormState = {
  type: "comunidad",
  title: "",
  place: "",
  placeLat: null,
  placeLng: null,
  time: "",
  imageFile: null,
  imageUrl: null,
  sourceUrl: "",
  distance: "",
  elevation: "",
  difficulty: "Facil",
  attendees: [],
};

export function EventModal({
  dateKey,
  existingEvents,
  onClose,
  onSaved,
}: EventModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function updateForm<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      updateForm("imageUrl", reader.result as string);
    reader.readAsDataURL(file);
    updateForm("imageFile", file);
  }

  async function saveEvent() {
    if (!form.title.trim()) return;
    setSaving(true);
    setSaveError(null);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;

    if (!userId) {
      setSaveError("No se pudo identificar al usuario. Inicia sesion de nuevo.");
      setSaving(false);
      return;
    }

    // Ensure profile exists (for users who signed up before the trigger fix)
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        { id: userId, display_name: userData.user?.user_metadata?.full_name || userData.user?.user_metadata?.name || null },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("Error upserting profile:", profileError.message);
    }

    const newEvent = {
      date: dateKey,
      type: form.type,
      title: form.title.trim(),
      place: form.place.trim() || null,
      place_lat: form.placeLat,
      place_lng: form.placeLng,
      time: form.time || null,
      image_url: null as string | null,
      source_url: form.sourceUrl.trim() || null,
      distance: form.type === "equipo" ? form.distance || null : null,
      elevation: form.type === "equipo" ? form.elevation || null : null,
      difficulty: form.type === "equipo" ? form.difficulty : null,
      created_by: userId,
    };

    const { data: inserted, error } = await supabase
      .from("eventos")
      .insert(newEvent)
      .select("id")
      .single();

    if (error || !inserted) {
      console.error("Error guardando evento:", error?.message);
      setSaveError(error?.message || "Error al guardar el evento. Intenta de nuevo.");
      setSaving(false);
      return;
    }

    if (form.imageFile) {
      const url = await uploadEventImage(form.imageFile, inserted.id);
      if (url) {
        await supabase
          .from("eventos")
          .update({ image_url: url })
          .eq("id", inserted.id);
      }
    }

    if (form.type === "equipo" && form.attendees.length > 0) {
      const rows = form.attendees.map((name) => ({
        event_id: inserted.id,
        user_id: userId,
        display_name: name,
      }));
      await supabase.from("event_attendees").insert(rows);
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div
      style={{ background: "rgba(0,0,0,0.6)" }}
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#17181B",
          border: "1px solid #34383D",
        }}
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <span
            className="font-[family-name:var(--font-mono)] text-sm"
            style={{ color: "#80C6FF" }}
          >
            {dateKey}
          </span>
          <button onClick={onClose} aria-label="Cerrar" className="cursor-pointer">
            <X size={20} color="#9BA3AC" />
          </button>
        </div>

        {existingEvents.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {existingEvents.map((e, i) => (
              <div
                key={e.id}
                style={{ background: "#1D1F23" }}
                className="rounded-lg p-2 flex items-center gap-3"
              >
                <Sticker event={e} index={i} size="large" />
                <div className="flex-1 min-w-0">
                  <TipoBadge type={e.type} />
                  <p
                    className="font-[family-name:var(--font-display)] uppercase text-base mt-0.5"
                    style={{ color: "#EDEFF2" }}
                  >
                    {e.title}
                  </p>
                  {e.place && (
                    <p
                      style={{ fontSize: 11, color: "#9BA3AC" }}
                      className="flex items-center gap-1.5"
                    >
                      <span className="truncate">{e.place}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p
          className="font-[family-name:var(--font-display)] uppercase text-sm mb-3"
          style={{
            color: form.type === "equipo" ? "#80C6FF" : "#EDEFF2",
          }}
        >
          Agregar evento
        </p>

        <div
          className="flex mb-3 rounded-md overflow-hidden"
          style={{ border: "1px solid #34383D" }}
        >
          <button
            onClick={() => updateForm("type", "comunidad")}
              style={{
                background:
                  form.type === "comunidad" ? "#F3443F" : "transparent",
                color:
                  form.type === "comunidad" ? "#EDEFF2" : "#9BA3AC",
              }}
            className="flex-1 py-2 text-xs font-[family-name:var(--font-display)] uppercase tracking-wide cursor-pointer"
          >
            Comunidad
          </button>
          <button
            onClick={() => updateForm("type", "equipo")}
            style={{
              background:
                form.type === "equipo" ? "#80C6FF" : "transparent",
              color:
                form.type === "equipo" ? "#0e0f11" : "#9BA3AC",
            }}
            className="flex-1 py-2 text-xs font-[family-name:var(--font-display)] uppercase tracking-wide flex items-center justify-center gap-1 cursor-pointer"
          >
            <Users size={12} /> Rodada de equipo
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={form.title}
            onChange={(ev) => updateForm("title", ev.target.value)}
            placeholder="Nombre de la rodada"
            style={{
              background: "#0e0f11",
              border: "1px solid #34383D",
              color: "#EDEFF2",
            }}
            className="rounded-md px-3 py-2 text-sm outline-none"
          />

          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "#9BA3AC" }}>Hora de encuentro</span>
            <input
              type="time"
              value={form.time}
              onChange={(ev) => updateForm("time", ev.target.value)}
              style={{
                background: "#0e0f11",
                border: "1px solid #34383D",
                color: "#EDEFF2",
              }}
              className="rounded-md px-3 py-2 text-sm outline-none font-[family-name:var(--font-mono)] w-36"
            />
          </div>

          <MapPicker
            place={form.place}
            placeLat={form.placeLat}
            placeLng={form.placeLng}
            onPlaceChange={(p, lat, lng) => {
              updateForm("place", p);
              updateForm("placeLat", lat);
              updateForm("placeLng", lng);
            }}
          />

          {form.place && (
            <div className="flex items-center gap-2">
              <span className="text-xs shrink-0" style={{ color: "#9BA3AC" }}>Punto de reunión</span>
              <span className="text-xs truncate" style={{ color: "#EDEFF2" }}>{form.place}</span>
            </div>
          )}

          {form.type === "equipo" && (
            <div
              className="flex flex-col gap-3 rounded-md p-3"
              style={{
                background: "#182530",
                border: "1px solid #24272B",
              }}
            >
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.distance}
                  onChange={(ev) =>
                    updateForm("distance", ev.target.value)
                  }
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
                  value={form.elevation}
                  onChange={(ev) =>
                    updateForm("elevation", ev.target.value)
                  }
                  placeholder="Desnivel + (m)"
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
                    onClick={() => updateForm("difficulty", d)}
                    style={{
                      background:
                        form.difficulty === d ? "#80C6FF" : "#0e0f11",
                      color:
                        form.difficulty === d ? "#0e0f11" : "#9BA3AC",
                      border: "1px solid #34383D",
                    }}
                    className="flex-1 rounded-md py-1.5 text-xs font-[family-name:var(--font-display)] uppercase cursor-pointer"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.type === "comunidad" && (
            <>
              <input
                value={form.sourceUrl}
                onChange={(ev) => updateForm("sourceUrl", ev.target.value)}
                placeholder="Enlace al post original (FB, IG, TT...)"
                style={{
                  background: "#0e0f11",
                  border: "1px solid #34383D",
                  color: "#EDEFF2",
                }}
                className="rounded-md px-3 py-2 text-sm outline-none"
              />
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
                  {form.imageUrl
                    ? "Imagen lista"
                    : "Subir imagen del evento"}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleImage}
                className="hidden"
              />
            </>
          )}

          {saveError && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: "#2a1a1a", color: "#ff6b6b" }}
            >
              {saveError}
            </p>
          )}

          <button
            onClick={saveEvent}
            disabled={!form.title.trim() || saving}
            style={{
              background: form.title.trim()
                ? form.type === "equipo"
                  ? "#80C6FF"
                  : "#F3443F"
                : "#2A2D31",
              color: form.type === "equipo" ? "#0e0f11" : "#EDEFF2",
            }}
            className="rounded-md px-3 py-2.5 font-[family-name:var(--font-display)] uppercase tracking-wide text-sm flex items-center justify-center gap-2 mt-1 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus size={16} /> {saving ? "Guardando..." : "Guardar evento"}
          </button>
        </div>
      </div>
    </div>
  );
}

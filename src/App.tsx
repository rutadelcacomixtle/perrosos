import { useEffect, useState, useMemo } from "react";
import { Trash2, Clock, MapPin, Users, TrendingUp, Gauge } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { Header, ElevationDivider } from "./components/Header";
import { Calendar } from "./components/Calendar";
import { Sticker, TipoBadge } from "./components/EventCard";
import { EventModal } from "./components/EventModal";
import type { EventWithAttendees, Event } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventWithAttendees[]>([]);
  const [modalDate, setModalDate] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState({}, "", "/");
      }
    }
    handleCallback();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchEvents() {
      const { data: eventos } = await supabase
        .from("eventos")
        .select("*")
        .order("date", { ascending: true });

      if (!eventos) return;

      const eventIds = eventos.map((e) => e.id);

      const { data: attendeesRows } = await supabase
        .from("event_attendees")
        .select("event_id, user_id, display_name, avatar_url")
        .in("event_id", eventIds);

      const attendeesByEvent: Record<string, typeof attendeesRows> = {};
      for (const row of attendeesRows ?? []) {
        (attendeesByEvent[row.event_id] ??= []).push(row);
      }

      const merged: EventWithAttendees[] = eventos.map((e) => ({
        ...e,
        attendees: (attendeesByEvent[e.id] ?? []).map((a) => ({
          event_id: a.event_id,
          user_id: a.user_id,
          display_name: a.display_name,
          avatar_url: a.avatar_url,
        })),
      }));

      setEvents(merged);
    }

    fetchEvents();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("eventos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "eventos" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const newEvent: EventWithAttendees = {
              ...payload.new as Event,
              attendees: [],
            };
            setEvents((prev) =>
              [...prev, newEvent].sort((a, b) =>
                a.date.localeCompare(b.date)
              )
            );
          } else if (payload.eventType === "DELETE") {
            setEvents((prev) =>
              prev.filter((e) => e.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const upcoming = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    return events.filter((e) => e.date >= now);
  }, [events]);

  function removeEvent(id: string) {
    supabase.from("eventos").delete().eq("id", id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const dayEventsForModal = modalDate
    ? events.filter((e) => e.date === modalDate)
    : [];

  return (
    <div
      style={{ background: "#0e0f11", color: "#EDEFF2", minHeight: "100vh" }}
      className="w-full flex justify-center"
    >
      <div className="w-full max-w-md px-4 pt-6 pb-16 font-[family-name:var(--font-body)]">
        <Header user={user} />
        <ElevationDivider />

        <Calendar events={events} onDayClick={setModalDate} />

        {/* Upcoming list */}
        <div className="mt-8">
          <h2
            className="font-[family-name:var(--font-display)] uppercase text-lg mb-3"
            style={{ color: "#EDEFF2" }}
          >
            Proximas rodadas
          </h2>
          {upcoming.length === 0 && (
            <p className="text-sm" style={{ color: "#6B747C" }}>
              Sin eventos por venir. Toca un dia del calendario para agregar uno.
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
                  <p
                    className="font-[family-name:var(--font-display)] uppercase text-base leading-tight truncate"
                    style={{ color: "#EDEFF2" }}
                  >
                    {e.title}
                  </p>
                  <div
                    className="flex items-center gap-3 mt-0.5 font-[family-name:var(--font-mono)]"
                    style={{ fontSize: 11, color: "#9BA3AC" }}
                  >
                    <span>{e.date}</span>
                    {e.time && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {e.time}
                      </span>
                    )}
                  </div>
                  {e.place && (
                    <div
                      className="flex items-center gap-1.5 mt-0.5"
                      style={{ fontSize: 11, color: "#6B747C" }}
                    >
                      <MapPin size={10} className="shrink-0" />{" "}
                      <span className="truncate">{e.place}</span>
                      {e.place_lat != null && e.place_lng != null && (
                        <a
                          href={`https://www.google.com/maps?q=${e.place_lat},${e.place_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#80C6FF" }}
                          className="shrink-0 underline"
                        >
                          Como llegar
                        </a>
                      )}
                    </div>
                  )}
                  {e.type === "equipo" && (
                    <div
                      className="flex flex-wrap items-center gap-2.5 mt-1 font-[family-name:var(--font-mono)]"
                      style={{ fontSize: 10.5, color: "#80C6FF" }}
                    >
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
                      {e.attendees.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users size={10} /> {e.attendees.length} confirmados
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeEvent(e.id)}
                  className="p-1.5 shrink-0 cursor-pointer"
                  aria-label="Eliminar"
                >
                  <Trash2 size={16} color="#6B747C" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <p
          className="text-xs mt-8 text-center"
          style={{ color: "#454B52" }}
        >
          PerroSOS MTB · Powered by Supabase
        </p>
      </div>

      {modalDate && (
        <EventModal
          dateKey={modalDate}
          existingEvents={dayEventsForModal}
          onClose={() => setModalDate(null)}
          onSaved={() => {
            /* re-fetch or optimistic update already handled */
          }}
        />
      )}
    </div>
  );
}

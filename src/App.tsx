import { useEffect, useState, useMemo } from "react";
import { Clock, MapPin, Users, TrendingUp, Gauge, ChevronDown, ChevronUp, Check } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { AuthScreen } from "./components/AuthScreen";
import { Header, ElevationDivider } from "./components/Header";
import { Calendar } from "./components/Calendar";
import { Sticker, TipoBadge } from "./components/EventCard";
import { EventModal } from "./components/EventModal";
import { EventDetail } from "./components/EventDetail";
import { ProfileScreen } from "./components/ProfileScreen";
import type { EventWithAttendees, Event } from "./types";

const INITIAL_VISIBLE = 3;

function formatCardDate(dateStr: string) {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventWithAttendees[]>([]);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithAttendees | null>(null);

  useEffect(() => {
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
      .channel("db-changes")
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
          } else if (payload.eventType === "UPDATE") {
            setEvents((prev) =>
              prev.map((ev) =>
                ev.id === payload.new.id
                  ? { ...ev, ...(payload.new as Event) }
                  : ev
              )
            );
          } else if (payload.eventType === "DELETE") {
            setEvents((prev) =>
              prev.filter((e) => e.id !== payload.old.id)
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_attendees" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as { event_id: string; user_id: string; display_name: string | null; avatar_url: string | null };
            setEvents((prev) =>
              prev.map((ev) =>
                ev.id === row.event_id
                  ? {
                      ...ev,
                      attendees: ev.attendees.some((a) => a.user_id === row.user_id)
                        ? ev.attendees
                        : [...ev.attendees, { event_id: row.event_id, user_id: row.user_id, display_name: row.display_name, avatar_url: row.avatar_url }],
                    }
                  : ev
              )
            );
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as { event_id: string; user_id: string };
            setEvents((prev) =>
              prev.map((ev) =>
                ev.id === row.event_id
                  ? { ...ev, attendees: ev.attendees.filter((a) => a.user_id !== row.user_id) }
                  : ev
              )
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

  const visibleUpcoming = useMemo(
    () => upcoming.slice(0, showAllUpcoming ? upcoming.length : INITIAL_VISIBLE),
    [upcoming, showAllUpcoming]
  );

  const groupedUpcoming = useMemo(() => {
    const groups: { date: string; events: EventWithAttendees[] }[] = [];
    for (const e of visibleUpcoming) {
      const last = groups[groups.length - 1];
      if (last && last.date === e.date) {
        last.events.push(e);
      } else {
        groups.push({ date: e.date, events: [e] });
      }
    }
    return groups;
  }, [visibleUpcoming]);

  const dayEventsForModal = modalDate
    ? events.filter((e) => e.date === modalDate)
    : [];

  if (!user) {
    return <AuthScreen />;
  }

  async function toggleAttend(e: EventWithAttendees) {
    if (!user) return;
    const isAttending = e.attendees.some((a) => a.user_id === user.id);
    if (isAttending) {
      await supabase
        .from("event_attendees")
        .delete()
        .eq("event_id", e.id)
        .eq("user_id", user.id);
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === e.id
            ? { ...ev, attendees: ev.attendees.filter((a) => a.user_id !== user.id) }
            : ev
        )
      );
    } else {
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "";
      await supabase.from("profiles").upsert(
        { id: user.id, display_name: name },
        { onConflict: "id" }
      );
      await supabase.from("event_attendees").insert({
        event_id: e.id,
        user_id: user.id,
        display_name: name,
      });
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === e.id
            ? { ...ev, attendees: [...ev.attendees, { event_id: e.id, user_id: user.id, display_name: name, avatar_url: null }] }
            : ev
        )
      );
    }
  }

  if (showProfile) {
    return <ProfileScreen user={user} onBack={() => setShowProfile(false)} />;
  }

  if (selectedEvent) {
    return (
      <EventDetail
        event={selectedEvent}
        user={user}
        onClose={() => setSelectedEvent(null)}
        onSaved={() => {
          setSelectedEvent(null);
        }}
        onDeleted={() => {
          setSelectedEvent(null);
          setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
        }}
      />
    );
  }

  return (
    <div
      style={{ background: "#0e0f11", color: "#EDEFF2", minHeight: "100vh" }}
      className="w-full flex justify-center"
    >
      <div className="w-full max-w-md px-4 pt-6 pb-16 font-[family-name:var(--font-body)]">
        <Header user={user} onProfileClick={() => setShowProfile(true)} />
        <ElevationDivider />

        {/* Proximas rodadas */}
        <div className="mt-4 mb-8">
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
          <div className="flex flex-col gap-3">
            {groupedUpcoming.map((group) => (
              <div key={group.date}>
                <div
                  className="flex items-center gap-2 mb-1.5"
                >
                  <div className="h-px flex-1" style={{ background: "#34383D" }} />
                  <span
                    className="font-[family-name:var(--font-display)] uppercase text-xs tracking-wide whitespace-nowrap"
                    style={{ color: "#9BA3AC" }}
                  >
                    {formatCardDate(group.date)}
                  </span>
                  <div className="h-px flex-1" style={{ background: "#34383D" }} />
                </div>
                <div className="flex flex-col gap-2">
                  {group.events.map((e, i) => (
              <div
                key={e.id}
                onClick={() => setSelectedEvent(e)}
                style={{ background: "#17181B", border: "1px solid #24272B" }}
                className="rounded-lg p-2 flex items-start gap-2.5 cursor-pointer"
              >
                <Sticker event={e} index={i} size="small" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <TipoBadge type={e.type} />
                  </div>
                  <p
                    className="font-[family-name:var(--font-display)] uppercase text-sm leading-tight truncate"
                    style={{ color: "#EDEFF2" }}
                  >
                    {e.title}
                  </p>
                  {e.time && (
                    <div
                      className="flex items-center gap-1.5 mt-0.5 font-[family-name:var(--font-mono)]"
                      style={{ fontSize: 10.5, color: "#9BA3AC" }}
                    >
                      <Clock size={9} /> {e.time}
                    </div>
                  )}
                  {e.place && (
                    <div
                      className="flex items-center gap-1 mt-0.5"
                      style={{ fontSize: 10.5, color: "#6B747C" }}
                    >
                      <MapPin size={9} className="shrink-0" />{" "}
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
                      className="flex items-center gap-2 mt-0.5 font-[family-name:var(--font-mono)] whitespace-nowrap"
                      style={{ fontSize: 10, color: "#80C6FF" }}
                    >
                      {e.distance && (
                        <span className="flex items-center gap-1">
                          <TrendingUp size={9} /> {e.distance} km
                        </span>
                      )}
                      {e.elevation && <span>+{e.elevation} m</span>}
                      {e.difficulty && (
                        <span className="flex items-center gap-1">
                          <Gauge size={9} /> {e.difficulty}
                        </span>
                      )}
                    </div>
                  )}
                  {e.attendees.length > 0 && (
                    <div
                      className="flex items-center gap-1 mt-0.5 font-[family-name:var(--font-mono)] whitespace-nowrap"
                      style={{ fontSize: 10, color: e.type === "equipo" ? "#80C6FF" : "#F3443F" }}
                    >
                      <Users size={9} /> {e.attendees.length} confirmados
                    </div>
                  )}
                </div>
                <button
                  onClick={(ev) => { ev.stopPropagation(); toggleAttend(e); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-[family-name:var(--font-display)] uppercase tracking-wide cursor-pointer shrink-0"
                  style={{
                    background: e.attendees.some((a) => a.user_id === user.id)
                      ? (e.type === "equipo" ? "#80C6FF" : "#F3443F")
                      : "transparent",
                    color: e.attendees.some((a) => a.user_id === user.id)
                      ? "#0e0f11"
                      : (e.type === "equipo" ? "#80C6FF" : "#EDEFF2"),
                    border: `1px solid ${e.type === "equipo" ? "#80C6FF" : "#F3443F"}`,
                  }}
                >
                  {e.attendees.some((a) => a.user_id === user.id) ? (
                    <><Check size={10} /> Voy</>
                  ) : (
                    "Asistiré"
                  )}
                </button>
              </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {upcoming.length > INITIAL_VISIBLE && (
            <button
              onClick={() => setShowAllUpcoming(!showAllUpcoming)}
              className="w-full flex items-center justify-center gap-1 mt-3 py-2 text-sm cursor-pointer"
              style={{ color: "#80C6FF" }}
            >
              {showAllUpcoming ? (
                <>Ver menos <ChevronUp size={16} /></>
              ) : (
                <>Ver todas ({upcoming.length}) <ChevronDown size={16} /></>
              )}
            </button>
          )}
        </div>

        <Calendar events={events} onDayClick={setModalDate} />

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

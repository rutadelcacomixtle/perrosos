import { useMemo, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EventWithAttendees } from "../types";
import { Sticker } from "./EventCard";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

interface CalendarProps {
  events: EventWithAttendees[];
  onDayClick: (dateKey: string) => void;
}

export function Calendar({ events, onDayClick }: CalendarProps) {
  const today = new Date();
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());

  const prevMonth = () => {
    if (viewM === 0) { setViewM(11); setViewY(viewY - 1); }
    else setViewM(viewM - 1);
  };
  const nextMonth = () => {
    if (viewM === 11) { setViewM(0); setViewY(viewY + 1); }
    else setViewM(viewM + 1);
  };

  const grid = useMemo(() => {
    const firstDay = (new Date(viewY, viewM, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewY, viewM]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, EventWithAttendees[]> = {};
    for (const e of events) {
      (map[e.date] ??= []).push(e);
    }
    return map;
  }, [events]);

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewM === today.getMonth() &&
    viewY === today.getFullYear();

  const touchStartX = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0]!.clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) nextMonth();
      else prevMonth();
    }
  }, [viewY, viewM]);

  return (
    <>
      <div className="flex items-center justify-between mt-3 mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-full cursor-pointer"
          style={{ background: "#1D1F23", border: "1px solid #34383D" }}
        >
          <ChevronLeft size={16} color="#9BA3AC" />
        </button>
        <span className="font-[family-name:var(--font-display)] uppercase text-xl tracking-wide" style={{ color: "#EDEFF2" }}>
          {MESES[viewM]} <span style={{ color: "#80C6FF" }}>{viewY}</span>
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-full cursor-pointer"
          style={{ background: "#1D1F23", border: "1px solid #34383D" }}
        >
          <ChevronRight size={16} color="#9BA3AC" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DIAS.map((d, i) => (
          <div
            key={i}
            className="text-center text-xs font-[family-name:var(--font-mono)]"
            style={{ color: "#6B747C" }}
          >
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-1"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {grid.map((day, idx) => {
          if (day === null) return <div key={idx} />;
          const key = toKey(viewY, viewM, day);
          const dayEvents = eventsByDay[key] ?? [];

          return (
            <button
              key={idx}
              onClick={() => onDayClick(key)}
              style={{
                background: isToday(day) ? "#182530" : "#17181B",
                border: isToday(day) ? "1px solid #80C6FF" : "1px solid #24272B",
                minHeight: 52,
              }}
              className="relative rounded-md flex flex-col items-center justify-center pt-1 active:scale-95 transition-transform cursor-pointer"
            >
              <span
                className="font-[family-name:var(--font-mono)] text-xs"
                style={{
                  color: isToday(day) ? "#EDEFF2" : "#9BA3AC",
                }}
              >
                {pad(day)}
              </span>
              {dayEvents.length > 0 && (
                <div className="absolute -top-1.5 -right-1.5">
                  <Sticker event={dayEvents[0]!} index={idx} size="small" />
                </div>
              )}
              {dayEvents.length > 1 && (
                <span
                  className="absolute bottom-0.5 right-1 font-[family-name:var(--font-mono)]"
                  style={{ fontSize: 9, color: "#F3443F" }}
                >
                  +{dayEvents.length - 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

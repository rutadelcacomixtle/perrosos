import { Image as ImageIcon, Users } from "lucide-react";
import type { Event } from "../types";

const ROT = [-5, 4, -3, 6, -6, 3, -4, 5];

export function Sticker({
  event,
  index,
  size = "small",
}: {
  event: Event;
  index: number;
  size?: "small" | "large";
}) {
  const rot = ROT[index % ROT.length]!;
  const w = size === "small" ? 38 : 84;
  const h = size === "small" ? 67 : 149;

  return (
    <div
      style={{
        width: w,
        height: h,
        transform: `rotate(${rot}deg)`,
        background: "linear-gradient(135deg, #2A2D31, #3D434A)",
        border:
          event.type === "equipo"
            ? "2px solid #80C6FF"
            : "2px solid #EDEFF2",
        boxShadow: "0 3px 8px rgba(0,0,0,0.45)",
      }}
      className="rounded-sm flex items-center justify-center shrink-0 overflow-hidden"
    >
      {event.image_url ? (
        <img
          src={event.image_url}
          alt={event.title}
          style={{ width: "100%", height: "100%" }}
          className="object-contain"
        />
      ) : event.type === "equipo" ? (
        <img
          src="/perrosos-logo.svg"
          alt="Equipo"
          style={{ width: w * 0.5, height: w * 0.5, opacity: 0.9 }}
        />
      ) : (
        size === "small" ? (
          <ImageIcon size={14} color="#EDEFF2" strokeWidth={1.5} />
        ) : (
          <ImageIcon size={26} color="#EDEFF2" strokeWidth={1.5} />
        )
      )}
    </div>
  );
}

export function TipoBadge({ type }: { type: Event["type"] }) {
  const isEquipo = type === "equipo";
  return (
    <span
      className="font-[family-name:var(--font-mono)] uppercase inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm shrink-0"
      style={{
        fontSize: 9,
        color: isEquipo ? "#80C6FF" : "#F3443F",
        border: `1px solid ${isEquipo ? "#80C6FF" : "#F3443F"}`,
      }}
    >
      {isEquipo && <Users size={9} />}
      {isEquipo ? "Equipo" : "Comunidad"}
    </span>
  );
}

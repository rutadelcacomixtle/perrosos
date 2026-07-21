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
  const dim = size === "small" ? 34 : 84;

  return (
    <div
      style={{
        width: dim,
        height: dim,
        transform: `rotate(${rot}deg)`,
        background: event.image_url
          ? `url(${event.image_url}) center/cover no-repeat`
          : "linear-gradient(135deg, #2A2D31, #3D434A)",
        border:
          event.type === "equipo"
            ? "2px solid #80C6FF"
            : "2px solid #EDEFF2",
        boxShadow: "0 3px 8px rgba(0,0,0,0.45)",
      }}
      className="rounded-sm flex items-center justify-center shrink-0"
    >
      {!event.image_url &&
        (size === "small" ? (
          <ImageIcon size={14} color="#EDEFF2" strokeWidth={1.5} />
        ) : (
          <ImageIcon size={26} color="#EDEFF2" strokeWidth={1.5} />
        ))}
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
        color: isEquipo ? "#80C6FF" : "#F5C842",
        border: `1px solid ${isEquipo ? "#80C6FF" : "#F5C842"}`,
      }}
    >
      {isEquipo && <Users size={9} />}
      {isEquipo ? "Equipo" : "Comunidad"}
    </span>
  );
}

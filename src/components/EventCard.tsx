import { useState, useCallback } from "react";
import { Image as ImageIcon, Users } from "lucide-react";
import type { Event } from "../types";

const ROT = [-5, 4, -3, 6, -6, 3, -4, 5];

const PENTAGON_POINTS = "50,-3 102,32 82,95 18,95 -2,32";

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
  const maxW = size === "small" ? 38 : 84;
  const maxH = size === "small" ? 67 : 149;

  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const onImgLoad = useCallback(
    (ev: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = ev.currentTarget;
      if (!naturalWidth || !naturalHeight) return;
      const ratio = naturalWidth / naturalHeight;
      let w: number, h: number;
      if (ratio >= maxW / maxH) {
        w = maxW;
        h = Math.round(maxW / ratio);
      } else {
        h = maxH;
        w = Math.round(maxH * ratio);
      }
      setDims({ w, h });
    },
    [maxW, maxH]
  );

  const w = dims?.w ?? maxW;
  const h = dims?.h ?? maxH;

  if (event.type === "equipo" && !event.image_url) {
    return (
      <div
        style={{
          width: maxW,
          height: maxH,
          transform: `rotate(${rot}deg)`,
          position: "relative",
        }}
        className="shrink-0"
      >
        <svg
          viewBox="0 0 100 100"
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        >
          <polygon
            points={PENTAGON_POINTS}
            fill="none"
            stroke="#EDEFF2"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <img
          src="/perrosos-logo.svg"
          alt="Equipo"
          style={{
            position: "absolute",
            top: "7.5%",
            left: "7.5%",
            width: "85%",
            height: "85%",
            opacity: 0.95,
          }}
        />
      </div>
    );
  }

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
          onLoad={onImgLoad}
          style={{ width: "100%", height: "100%" }}
          className="object-contain"
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

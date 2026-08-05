import { useEffect, useRef, useState } from "react";
import { X, Share2, Download } from "lucide-react";
import {
  renderPoster,
  canvasToBlob,
  posterFileName,
  POSTER_LABELS,
  type PosterFormat,
} from "../lib/poster";
import type { EventWithAttendees } from "../types";

const FORMATS: PosterFormat[] = ["story", "square"];

export function SharePoster({
  event,
  onClose,
}: {
  event: EventWithAttendees;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<PosterFormat>("story");
  const [rendering, setRendering] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accent = event.type === "equipo" ? "#80C6FF" : "#F3443F";

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    setError(null);

    (async () => {
      try {
        if (!canvasRef.current) return;
        await renderPoster(canvasRef.current, event, format);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No se pudo generar el cartel.");
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [event, format]);

  function download(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = posterFileName(event, format);
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    if (!canvasRef.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await canvasToBlob(canvasRef.current);
      const file = new File([blob], posterFileName(event, format), {
        type: "image/png",
      });
      // En iOS el gesto del usuario tiene que seguir "vivo": el cartel ya esta
      // dibujado cuando se toca el boton, asi que aqui solo queda exportarlo.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: event.title });
      } else {
        download(blob);
      }
    } catch (e) {
      // Cancelar la hoja de compartir lanza AbortError; no es un error real.
      if (e instanceof DOMException && e.name === "AbortError") {
        setBusy(false);
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudo compartir el cartel.");
    }
    setBusy(false);
  }

  async function handleDownload() {
    if (!canvasRef.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      download(await canvasToBlob(canvasRef.current));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo descargar el cartel.");
    }
    setBusy(false);
  }

  return (
    <div
      style={{ background: "rgba(0,0,0,0.75)" }}
      className="fixed inset-0 z-50 flex flex-col"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto flex flex-col h-full px-4 py-4"
      >
        <div className="flex items-center justify-between mb-3 shrink-0">
          <p
            className="font-[family-name:var(--font-display)] uppercase text-lg"
            style={{ color: "#EDEFF2" }}
          >
            Compartir cartel
          </p>
          <button onClick={onClose} aria-label="Cerrar" className="cursor-pointer p-1">
            <X size={22} color="#9BA3AC" />
          </button>
        </div>

        {/* Vista previa */}
        <div className="flex-1 min-h-0 flex items-center justify-center mb-3">
          <canvas
            ref={canvasRef}
            className="rounded-lg"
            style={{
              maxHeight: "100%",
              maxWidth: "100%",
              objectFit: "contain",
              border: "1px solid #34383D",
              opacity: rendering ? 0.4 : 1,
              transition: "opacity 150ms",
            }}
          />
        </div>

        <div className="shrink-0 flex flex-col gap-3">
          {/* Selector de formato */}
          <div
            className="flex rounded-md overflow-hidden"
            style={{ border: "1px solid #34383D" }}
          >
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                style={{
                  background: format === f ? accent : "transparent",
                  color:
                    format === f
                      ? event.type === "equipo"
                        ? "#0e0f11"
                        : "#EDEFF2"
                      : "#9BA3AC",
                }}
                className="flex-1 py-2 text-xs font-[family-name:var(--font-display)] uppercase tracking-wide cursor-pointer"
              >
                {POSTER_LABELS[f]}
              </button>
            ))}
          </div>

          {error && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: "#2a1a1a", color: "#ff6b6b" }}
            >
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={rendering || busy}
              className="rounded-xl px-4 py-3 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "#1D1F23",
                border: "1px solid #34383D",
                color: "#9BA3AC",
              }}
              aria-label="Descargar"
            >
              <Download size={16} />
            </button>
            <button
              onClick={handleShare}
              disabled={rendering || busy}
              className="flex-1 rounded-xl px-4 py-3 font-[family-name:var(--font-display)] uppercase tracking-wide text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: accent,
                color: event.type === "equipo" ? "#0e0f11" : "#EDEFF2",
              }}
            >
              <Share2 size={16} />
              {rendering ? "Generando..." : busy ? "Abriendo..." : "Compartir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

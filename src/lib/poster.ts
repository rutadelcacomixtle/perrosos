// Genera el "cartel" compartible de un evento dibujandolo a mano en un canvas.
//
// Se dibuja con la API de canvas en vez de usar html2canvas/html-to-image a
// proposito: son ~50kB de dependencia, su soporte de CSS es parcial, el
// resultado cambia entre navegadores y las imagenes cross-origin les dan
// problemas justo en el caso que importa (Safari en iPhone compartiendo a
// WhatsApp). El cartel es una imagen, unas lineas de texto y un logo.
//
// Composicion: imagen enmarcada arriba, panel de datos abajo. La altura del
// panel se mide primero y el marco de la imagen se queda con el espacio que
// sobra, para que los dos formatos se adapten solos y el texto nunca se salga.

import type { EventWithAttendees } from "../types";
import { formatLongDate, formatTime12 } from "./format";

export type PosterFormat = "story" | "square";

export const POSTER_SIZES: Record<PosterFormat, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
};

export const POSTER_LABELS: Record<PosterFormat, string> = {
  story: "Historia 9:16",
  square: "Cuadrado 1:1",
};

const BG = "#0e0f11";
const SURFACE = "#17181B";
const BORDER = "#24272B";
const BORDER_STRONG = "#34383D";
const TEXT = "#EDEFF2";
const TEXT_MUTED = "#6B747C";
const ACCENT_COMUNIDAD = "#F3443F";
const ACCENT_EQUIPO = "#80C6FF";

const FONT_DISPLAY = '"Barlow Condensed", sans-serif';
const FONT_BODY = '"Work Sans", sans-serif';
const FONT_MONO = '"Space Mono", monospace';

interface Metrics {
  pad: number;
  logo: number;
  brand: number;
  badge: number;
  titleStart: number;
  titleMin: number;
  titleLines: number;
  date: number;
  place: number;
  stats: number;
  gap: number;
  minImage: number;
}

const METRICS: Record<PosterFormat, Metrics> = {
  story: {
    pad: 72, logo: 104, brand: 46, badge: 28, titleStart: 112, titleMin: 64,
    titleLines: 3, date: 48, place: 34, stats: 36, gap: 34, minImage: 520,
  },
  square: {
    pad: 48, logo: 60, brand: 30, badge: 20, titleStart: 66, titleMin: 40,
    titleLines: 2, date: 30, place: 24, stats: 26, gap: 18, minImage: 240,
  },
};

// Perfil de elevacion para las rodadas de equipo sin imagen. Coordenadas
// normalizadas (x de 0 a 1, y de 0 arriba a 1 abajo).
const ELEVATION: Array<[number, number]> = [
  [0, 0.78], [0.06, 0.74], [0.12, 0.56], [0.18, 0.70], [0.26, 0.40],
  [0.33, 0.60], [0.40, 0.31], [0.47, 0.52], [0.55, 0.16], [0.62, 0.46],
  [0.70, 0.36], [0.78, 0.64], [0.86, 0.49], [0.93, 0.72], [1, 0.67],
];

// Trazo de montanas del ElevationDivider, en coordenadas del viewBox original.
const DIVIDER: Array<[number, number]> = [
  [0, 20], [30, 20], [45, 6], [60, 20], [90, 20], [110, 14], [130, 20],
  [160, 20], [180, 4], [200, 20], [230, 20], [250, 10], [270, 20],
  [300, 20], [320, 8], [340, 20], [400, 20],
];

async function ensureFonts() {
  if (!document.fonts) return;
  // Sin esto el cartel sale en Arial: las fuentes de Google se cargan en
  // diferido y el canvas no espera a que esten listas.
  await Promise.all([
    document.fonts.load('700 100px "Barlow Condensed"'),
    document.fonts.load('600 48px "Barlow Condensed"'),
    document.fonts.load('400 40px "Work Sans"'),
    document.fonts.load('700 36px "Space Mono"'),
    document.fonts.load('400 36px "Space Mono"'),
  ]);
  await document.fonts.ready;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Necesario para que el canvas no quede "contaminado" y se pueda exportar.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("no se pudo cargar la imagen"));
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D, text: string, maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fitTitle(
  ctx: CanvasRenderingContext2D, text: string, maxWidth: number,
  maxLines: number, start: number, min: number
) {
  let size = start;
  let lines = [text];
  while (size >= min) {
    ctx.font = `700 ${size}px ${FONT_DISPLAY}`;
    lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) break;
    size -= 4;
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const last = lines[maxLines - 1];
    if (last) lines[maxLines - 1] = `${last}…`;
  }
  return { size, lines };
}

// Pin de mapa, mismo trazo que el marcador del MapPicker.
function drawPin(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  const r = size / 2;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.25, r * 0.72, Math.PI, 0, false);
  ctx.lineTo(cx, cy + r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = BG;
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.28, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDivider(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, h / 8);
  ctx.lineJoin = "round";
  ctx.beginPath();
  DIVIDER.forEach(([px, py], i) => {
    const dx = x + (px / 400) * w;
    const dy = y + (py / 24) * h;
    if (i === 0) ctx.moveTo(dx, dy);
    else ctx.lineTo(dx, dy);
  });
  ctx.stroke();
  ctx.restore();
}

// Grafico de perfil de elevacion, para rodadas de equipo sin imagen.
function drawElevationProfile(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, accent: string
) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 24);
  ctx.clip();

  // Lineas de referencia, para que se lea como un grafico de datos.
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  for (let i = 1; i <= 3; i++) {
    const gy = y + (h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(x + 32, gy);
    ctx.lineTo(x + w - 32, gy);
    ctx.stroke();
  }

  const px = (t: number) => x + t * w;
  const py = (t: number) => y + t * h;

  ctx.beginPath();
  ctx.moveTo(px(0), py(1));
  for (const [tx, ty] of ELEVATION) ctx.lineTo(px(tx), py(ty));
  ctx.lineTo(px(1), py(1));
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, `${accent}55`);
  grad.addColorStop(1, `${accent}05`);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ELEVATION.forEach(([tx, ty], i) => {
    if (i === 0) ctx.moveTo(px(tx), py(ty));
    else ctx.lineTo(px(tx), py(ty));
  });
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

export async function renderPoster(
  canvas: HTMLCanvasElement,
  event: EventWithAttendees,
  format: PosterFormat
): Promise<void> {
  const { w: W, h: H } = POSTER_SIZES[format];
  const m = METRICS[format];
  const accent = event.type === "equipo" ? ACCENT_EQUIPO : ACCENT_COMUNIDAD;
  const contentW = W - m.pad * 2;

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar el lienzo del cartel.");

  await ensureFonts();

  const [logo, photo] = await Promise.all([
    loadImage("/perrosos-logo.svg").catch(() => null),
    event.image_url ? loadImage(event.image_url).catch(() => null) : Promise.resolve(null),
  ]);

  // ---- Medir el panel de datos antes de dibujar ----
  const { size: titleSize, lines: titleLines } = fitTitle(
    ctx, event.title.toUpperCase(), contentW, m.titleLines, m.titleStart, m.titleMin
  );
  const titleLineH = titleSize * 0.92;

  ctx.font = `400 ${m.place}px ${FONT_BODY}`;
  const placeLines = event.place
    ? wrapText(ctx, event.place, contentW - m.place * 2).slice(0, 2)
    : [];

  const statsParts: string[] = [];
  if (event.type === "equipo") {
    if (event.distance) statsParts.push(`${event.distance} km`);
    if (event.elevation) statsParts.push(`+${event.elevation} m`);
    if (event.difficulty) statsParts.push(event.difficulty);
  }
  const statsText = statsParts.join("   ·   ");
  const attendeesText =
    event.attendees.length > 0 ? `${event.attendees.length} confirmados` : "";

  let panelH = 0;
  panelH += m.badge * 1.9 + m.gap * 0.6;              // badge de tipo
  panelH += titleLines.length * titleLineH + m.gap * 0.7;
  panelH += 2 + m.gap * 0.7;                           // regla
  panelH += m.date * 1.15 + m.gap * 0.5;               // fecha y hora
  if (placeLines.length) panelH += placeLines.length * m.place * 1.35 + m.gap * 0.5;
  if (statsText) panelH += m.stats * 1.3 + m.gap * 0.4;
  if (attendeesText) panelH += m.stats * 1.2;

  const headerH = m.logo;
  const dividerH = Math.round(m.logo * 0.32);
  const usedH =
    m.pad * 2 + headerH + m.gap * 0.5 + dividerH + m.gap + panelH + m.gap;
  const imageH = Math.max(m.minImage, H - usedH);

  // ---- Dibujar ----
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  let y = m.pad;

  // Encabezado: logo + nombre del equipo
  if (logo) {
    const lw = (logo.width / logo.height) * m.logo;
    ctx.drawImage(logo, m.pad, y, lw, m.logo);
    ctx.fillStyle = TEXT;
    ctx.font = `800 ${m.brand}px ${FONT_DISPLAY}`;
    ctx.textBaseline = "middle";
    ctx.fillText("PERROSOS MTB", m.pad + lw + m.gap * 0.5, y + m.logo / 2);
  } else {
    ctx.fillStyle = TEXT;
    ctx.font = `800 ${m.brand}px ${FONT_DISPLAY}`;
    ctx.textBaseline = "middle";
    ctx.fillText("PERROSOS MTB", m.pad, y + m.logo / 2);
  }
  y += headerH + m.gap * 0.5;

  drawDivider(ctx, m.pad, y, contentW, dividerH, accent);
  y += dividerH + m.gap;

  // Marco de la imagen. Toma la proporcion de la foto en vez de ser fijo: si el
  // marco fuera siempre del ancho del cartel, una imagen vertical dentro de un
  // formato cuadrado dejaria dos franjas negras enormes a los lados. El aire
  // sobrante se reparte arriba y abajo para que el panel no se mueva.
  let frameW = contentW;
  let frameH = imageH;
  if (photo) {
    const scale = Math.min(contentW / photo.width, imageH / photo.height);
    frameW = photo.width * scale;
    frameH = photo.height * scale;
  }
  const frameX = m.pad + (contentW - frameW) / 2;
  const frameY = y + (imageH - frameH) / 2;

  ctx.fillStyle = SURFACE;
  roundRect(ctx, frameX, frameY, frameW, frameH, 24);
  ctx.fill();

  if (photo) {
    ctx.save();
    roundRect(ctx, frameX, frameY, frameW, frameH, 24);
    ctx.clip();
    ctx.drawImage(photo, frameX, frameY, frameW, frameH);
    ctx.restore();
  } else {
    drawElevationProfile(ctx, frameX, frameY, frameW, frameH, accent);
  }

  ctx.strokeStyle = photo ? BORDER_STRONG : BORDER;
  ctx.lineWidth = 2;
  roundRect(ctx, frameX, frameY, frameW, frameH, 24);
  ctx.stroke();

  y += imageH + m.gap;

  // Badge de tipo
  ctx.textBaseline = "middle";
  ctx.font = `700 ${m.badge}px ${FONT_MONO}`;
  const badgeText = event.type === "equipo" ? "EQUIPO" : "COMUNIDAD";
  const badgeW = ctx.measureText(badgeText).width + m.badge * 1.6;
  const badgeH = m.badge * 1.9;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  roundRect(ctx, m.pad, y, badgeW, badgeH, 6);
  ctx.stroke();
  ctx.fillStyle = event.type === "equipo" ? ACCENT_EQUIPO : TEXT;
  ctx.fillText(badgeText, m.pad + m.badge * 0.8, y + badgeH / 2);
  y += badgeH + m.gap * 0.6;

  // Titulo
  ctx.fillStyle = TEXT;
  ctx.font = `700 ${titleSize}px ${FONT_DISPLAY}`;
  ctx.textBaseline = "top";
  for (const line of titleLines) {
    ctx.fillText(line, m.pad, y);
    y += titleLineH;
  }
  y += m.gap * 0.7;

  ctx.fillStyle = BORDER_STRONG;
  ctx.fillRect(m.pad, y, contentW, 2);
  y += 2 + m.gap * 0.7;

  // Fecha y hora
  ctx.fillStyle = accent;
  ctx.font = `600 ${m.date}px ${FONT_DISPLAY}`;
  const dateText = formatLongDate(event.date).toUpperCase();
  const timeText = event.time ? formatTime12(event.time) : "";
  ctx.fillText(timeText ? `${dateText}   ·   ${timeText}` : dateText, m.pad, y);
  y += m.date * 1.15 + m.gap * 0.5;

  // Lugar
  if (placeLines.length) {
    drawPin(ctx, m.pad + m.place * 0.45, y + m.place * 0.6, m.place * 1.1, accent);
    ctx.fillStyle = TEXT;
    ctx.font = `400 ${m.place}px ${FONT_BODY}`;
    let py2 = y;
    for (const line of placeLines) {
      ctx.fillText(line, m.pad + m.place * 1.5, py2);
      py2 += m.place * 1.35;
    }
    y = py2 + m.gap * 0.5;
  }

  // Stats de la rodada de equipo
  if (statsText) {
    ctx.fillStyle = accent;
    ctx.font = `700 ${m.stats}px ${FONT_MONO}`;
    ctx.fillText(statsText, m.pad, y);
    y += m.stats * 1.3 + m.gap * 0.4;
  }

  // Confirmados
  if (attendeesText) {
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = `400 ${m.stats * 0.9}px ${FONT_MONO}`;
    ctx.fillText(attendeesText, m.pad, y);
  }
}

export function posterFileName(event: EventWithAttendees, format: PosterFormat) {
  const slug = event.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "evento";
  return `perrosos-${slug}-${format === "story" ? "9x16" : "1x1"}.png`;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("No se pudo generar la imagen del cartel."));
      }, "image/png");
    } catch {
      // SecurityError: el canvas quedo contaminado por una imagen sin CORS.
      reject(
        new Error(
          "No se pudo exportar el cartel porque la imagen del evento no permite descargarse desde otro sitio."
        )
      );
    }
  });
}

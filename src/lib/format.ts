// Formateo de fechas y horas compartido por App y EventDetail.

// Fecha de hoy en zona horaria local, como "YYYY-MM-DD".
// No usar toISOString(): devuelve la fecha UTC, que en Mexico (UTC-6) ya adelanto
// un dia a partir de las 6 p.m. local.
export function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// "sabado, 9 de agosto de 2026". Se parsea a mano para construir la fecha en
// hora local; new Date("2026-08-09") la interpretaria como UTC y en Mexico
// mostraria el dia anterior.
export function formatLongDate(dateStr: string) {
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

// "7:30 a.m." a partir de "07:30".
export function formatTime12(time: string) {
  const [h, m] = time.split(":").map(Number);
  if (h == null || m == null) return time;
  const period = h >= 12 ? "p.m." : "a.m.";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

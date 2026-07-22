import type { User } from "@supabase/supabase-js";

export function Header({ user, onProfileClick }: { user: User; onProfileClick: () => void }) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between mb-1">
      <div>
        <h1
          className="text-4xl font-extrabold leading-none font-[family-name:var(--font-display)]"
          style={{ color: "#EDEFF2" }}
        >
          PerroSOS MTB
        </h1>
        <p
          className="text-xs mt-1"
          style={{ color: "#9BA3AC" }}
        >
          Calendario de eventos MTB
        </p>
      </div>
      <button
        onClick={onProfileClick}
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer shrink-0"
        style={{
          background: "linear-gradient(135deg, #F3443F, #c23a35)",
          color: "#0e0f11",
        }}
        aria-label="Perfil"
      >
        {initial}
      </button>
    </div>
  );
}

export function ElevationDivider() {
  return (
    <svg viewBox="0 0 400 24" preserveAspectRatio="none" className="w-full h-6">
      <polyline
        points="0,20 30,20 45,6 60,20 90,20 110,14 130,20 160,20 180,4 200,20 230,20 250,10 270,20 300,20 320,8 340,20 400,20"
        fill="none"
        stroke="#F3443F"
        strokeWidth="1.5"
      />
    </svg>
  );
}

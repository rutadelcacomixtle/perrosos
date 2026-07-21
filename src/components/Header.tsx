import { Share2, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";

export function Header() {
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
          Calendario de eventos MTB · comparte el enlace en tu grupo
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => supabase.auth.signOut()}
          className="p-2 rounded-full cursor-pointer"
          style={{ background: "#1D1F23", border: "1px solid #34383D" }}
          aria-label="Cerrar sesion"
        >
          <LogOut size={18} color="#9BA3AC" />
        </button>
        <button
          style={{ background: "#1D1F23", border: "1px solid #34383D" }}
          className="p-2 rounded-full cursor-pointer"
          aria-label="Compartir"
        >
          <Share2 size={18} color="#F5C842" />
        </button>
      </div>
    </div>
  );
}

export function ElevationDivider() {
  return (
    <svg viewBox="0 0 400 24" preserveAspectRatio="none" className="w-full h-6">
      <polyline
        points="0,20 30,20 45,6 60,20 90,20 110,14 130,20 160,20 180,4 200,20 230,20 250,10 270,20 300,20 320,8 340,20 400,20"
        fill="none"
        stroke="#F5C842"
        strokeWidth="1.5"
      />
    </svg>
  );
}

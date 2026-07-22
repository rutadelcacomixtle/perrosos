import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { LogOut, ChevronLeft } from "lucide-react";

export function ProfileScreen({ user, onBack }: { user: User; onBack: () => void }) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
  const email = user.email || "";
  const initial = (name || email).charAt(0).toUpperCase();

  return (
    <div
      style={{ background: "#0e0f11", minHeight: "100vh" }}
      className="w-full flex justify-center"
    >
      <div className="w-full max-w-md px-4 pt-6 pb-16 font-[family-name:var(--font-body)]">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onBack}
            className="p-2 rounded-full cursor-pointer"
            style={{ background: "#1D1F23", border: "1px solid #34383D" }}
            aria-label="Volver"
          >
            <ChevronLeft size={18} color="#9BA3AC" />
          </button>
          <p
            className="font-[family-name:var(--font-display)] uppercase text-lg"
            style={{ color: "#EDEFF2" }}
          >
            Perfil
          </p>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mb-4"
            style={{
              background: "linear-gradient(135deg, #F3443F, #c23a35)",
              color: "#0e0f11",
            }}
          >
            {initial}
          </div>
          {name && (
            <p
              className="font-[family-name:var(--font-display)] text-xl font-bold"
              style={{ color: "#EDEFF2" }}
            >
              {name}
            </p>
          )}
          <p className="text-sm mt-1" style={{ color: "#9BA3AC" }}>
            {email}
          </p>
        </div>

        {/* Info card */}
        <div
          className="rounded-xl p-5 mb-8"
          style={{ background: "#1D1F23", border: "1px solid #24272B" }}
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "#6B747C" }}>
                Nombre
              </p>
              <p className="text-sm" style={{ color: "#EDEFF2" }}>
                {name || "Sin nombre"}
              </p>
            </div>
            <div style={{ borderTop: "1px solid #24272B" }} />
            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "#6B747C" }}>
                Email
              </p>
              <p className="text-sm" style={{ color: "#EDEFF2" }}>
                {email}
              </p>
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm cursor-pointer transition-opacity hover:opacity-80"
          style={{
            background: "#1D1F23",
            border: "1px solid #34383D",
            color: "#9BA3AC",
          }}
        >
          <LogOut size={16} />
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}

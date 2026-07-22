import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "register") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: displayName },
          },
        });
        if (signUpError) {
          setError(signUpError.message || "Error al crear la cuenta. Intenta de nuevo.");
        } else {
          setSuccess("Revisa tu email para confirmar tu cuenta.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message || "Error al iniciar sesión. Intenta de nuevo.");
        }
      }
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta de nuevo.");
    }

    setLoading(false);
  }

  return (
    <div
      style={{ background: "#0e0f11", minHeight: "100vh" }}
      className="w-full flex justify-center items-center px-4"
    >
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          background: "#1D1F23",
          border: "1px solid #24272B",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/perrosos-logo.svg" alt="PerroSOS MTB" className="h-16 w-16" />
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <p
            className="text-2xl font-bold mb-2 font-[family-name:var(--font-display)]"
            style={{ color: "#EDEFF2" }}
          >
            {mode === "login" ? "Bienvenido" : "Crear cuenta"}
          </p>
          <p
            className="text-sm"
            style={{ color: "#9BA3AC" }}
          >
            {mode === "login"
              ? "Inicia sesión para crear eventos"
              : "Regístrate para empezar"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label
                className="block text-xs font-medium mb-1.5 uppercase tracking-wide font-[family-name:var(--font-display)]"
                style={{ color: "#9BA3AC" }}
              >
                Nombre
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Tu nombre"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 font-[family-name:var(--font-body)]"
                style={{
                  background: "#17181B",
                  border: "2px solid #34383D",
                  color: "#EDEFF2",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#F3443F")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#34383D")}
              />
            </div>
          )}

          <div>
            <label
              className="block text-xs font-medium mb-1.5 uppercase tracking-wide font-[family-name:var(--font-display)]"
              style={{ color: "#9BA3AC" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 font-[family-name:var(--font-body)]"
              style={{
                background: "#17181B",
                border: "2px solid #34383D",
                color: "#EDEFF2",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#F3443F")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#34383D")}
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-1.5 uppercase tracking-wide font-[family-name:var(--font-display)]"
              style={{ color: "#9BA3AC" }}
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all duration-200 font-[family-name:var(--font-body)]"
                style={{
                  background: "#17181B",
                  border: "2px solid #34383D",
                  color: "#EDEFF2",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "#F3443F")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "#34383D")
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? (
                  <EyeOff size={16} color="#6B747C" />
                ) : (
                  <Eye size={16} color="#6B747C" />
                )}
              </button>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: "#2a1a1a", color: "#ff6b6b" }}
            >
              {error}
            </p>
          )}
          {success && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: "#1a2a1a", color: "#6bffb5" }}
            >
              {success}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="group w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer font-[family-name:var(--font-display)] uppercase tracking-wide"
            style={{
              background: "linear-gradient(135deg, #F3443F, #c23a35)",
              color: "#0e0f11",
            }}
          >
            <span>{loading ? "Cargando..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</span>
            {!loading && (
              <ArrowRight
                size={18}
                className="transform transition-transform duration-300 group-hover:translate-x-1"
              />
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div
            className="absolute inset-0 flex items-center"
          >
            <div className="w-full" style={{ borderTop: "1px solid #24272B" }} />
          </div>
          <div className="relative flex justify-center text-sm">
            <span
              className="px-4"
              style={{ background: "#1D1F23", color: "#6B747C" }}
            >
              o
            </span>
          </div>
        </div>

        {/* Toggle mode */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
              setSuccess(null);
            }}
            className="text-sm cursor-pointer transition-colors duration-200 font-[family-name:var(--font-body)]"
            style={{ color: "#80C6FF" }}
          >
            {mode === "login"
              ? "¿No tienes cuenta? Créala aquí"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}

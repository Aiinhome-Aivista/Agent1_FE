import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, auth } from "../services/api";

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      auth.setToken(res.access_token);
      nav("/app");
    } catch (e: any) {
      setErr(e.message || "login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center login-bg">
      <div className="w-full max-w-sm login-card border border-app-border rounded-2xl p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-app-primary">
            DataOps Orchestrator
          </h1>
          <p className="text-sm text-app-secondary mt-1">Sign in to continue</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-app-secondary mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-surface text-app-primary focus:outline-none focus:border-app-btn focus:ring-1 focus:ring-app-btn"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-app-secondary mb-1">
              Password
            </label>
                        <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-app-border login-card text-app-primary focus:outline-none focus:border-app-btn focus:ring-1 focus:ring-app-btn pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-app-secondary hover:text-app-primary focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-app-btn text-white text-sm font-medium hover:bg-app-hover disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        {/* <p className="text-xs text-[#9CA3AF] mt-6">
          The first admin is created from <code>BOOTSTRAP_ADMIN_EMAIL</code> /
          <code> BOOTSTRAP_ADMIN_PASSWORD</code> on backend startup.
        </p> */}
      </div>
    </div>
  );
}

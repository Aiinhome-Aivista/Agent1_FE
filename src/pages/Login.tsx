import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, auth } from "../services/api";

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
      <div className="w-full max-w-sm bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#111827]">
            DataOps Orchestrator
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">Sign in to continue</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#6B7280] mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:border-[#111827]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#6B7280] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:border-[#111827]"
            />
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-[#111827] text-white text-sm font-medium hover:bg-black disabled:opacity-60"
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

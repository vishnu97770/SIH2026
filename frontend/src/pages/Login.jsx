import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { isLoggedIn, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("analyst@mining.gov.in");
  const [password, setPassword] = useState("demo1234");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!validEmail) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (remember) localStorage.setItem("mi_remember", "true");
    login(email.trim());
    navigate("/dashboard");
  };

  const handleDemoLogin = () => {
    login("analyst@mining.gov.in");
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen bg-stone-950">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950 p-10 lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-amber-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white">
              <path
                d="M12 3l7 3v5c0 4.5-2.6 7.8-7 9-4.4-1.2-7-4.5-7-9V6l7-3z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="text-sm font-semibold uppercase tracking-widest text-stone-200">
            Mine Intelligence
          </div>
        </div>

        <div className="relative">
          <h1 className="text-3xl font-semibold leading-tight text-white">
            AI-powered mining &amp; geological intelligence for faster, evidence-backed decisions.
          </h1>
          <p className="mt-4 max-w-md text-sm text-stone-300">
            Centralize fragmented mining records, uncover production insights, and generate
            intelligence reports — all in one platform.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          {[
            { k: "128", v: "Documents ingested" },
            { k: "1.42M", v: "Tonnes tracked" },
            { k: "7", v: "Active anomalies" },
          ].map((s) => (
            <div key={s.v} className="rounded-lg border border-white/10 bg-[#fffaf1]/5 p-4 backdrop-blur">
              <div className="text-2xl font-semibold text-white">{s.k}</div>
              <div className="mt-1 text-xs text-stone-400">{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-stone-50 p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white">
                <path
                  d="M12 3l7 3v5c0 4.5-2.6 7.8-7 9-4.4-1.2-7-4.5-7-9V6l7-3z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-stone-900">Mine Intelligence</div>
              <div className="text-xs text-stone-500">Mining &amp; Geological Intelligence Platform</div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-[#fffaf1] p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-900">Sign in</h2>
            <p className="mt-1 text-sm text-stone-500">
              Enter your credentials to access the platform.
            </p>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@mining.gov.in"
                  className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium text-stone-700" htmlFor="password">
                    Password
                  </label>
                  <Link to="#" className="text-xs font-medium text-amber-600 hover:text-amber-700">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-100"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-stone-600">
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100"
              >
                Sign In
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs text-stone-400">or</span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>

            <button
              onClick={handleDemoLogin}
              className="w-full rounded-lg border border-stone-300 bg-[#fffaf1] py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              Demo Login
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-stone-400">
            © 2026 Mine Intelligence · Demo prototype for Smart India Hackathon
          </p>
        </div>
      </div>
    </div>
  );
}

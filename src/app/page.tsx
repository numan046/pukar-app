"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RadarMark, WordMark } from "@/components/Brand";
import { Button, Card } from "@/components/ui";
import type { Lang } from "@/lib/i18n";
import type { Role } from "@/types";

type Step = "splash" | "notice" | "language" | "auth";

/** Animated aurora backdrop shared by the intro / auth screens (purely decorative). */
function AuroraBg() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-brand-400/25 blur-3xl animate-float" />
      <div className="absolute top-1/3 -left-32 h-[28rem] w-[28rem] rounded-full bg-brand-600/15 blur-3xl animate-float-slow" />
      <div className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl animate-float" style={{ animationDelay: "-4s" }} />
    </div>
  );
}

const ROLE_HOME: Record<Role, string> = {
  CITIZEN: "/citizen",
  DEPARTMENT_OFFICER: "/officer",
  EMPLOYEE: "/employee",
  SUPER_ADMIN: "/admin",
  CM: "/cm",
  CMO: "/cmo",
};

const DEMO_ACCOUNTS: { label: string; email: string; color: string }[] = [
  { label: "Super Admin", email: "admin@ppr.ai", color: "bg-red-50" },
  { label: "CM (Chief Minister)", email: "cm@ppr.ai", color: "bg-violet-50" },
  { label: "Gas CMO", email: "gas-cmo@ppr.ai", color: "bg-orange-50" },
  { label: "Electricity CMO", email: "electricity-cmo@ppr.ai", color: "bg-yellow-50" },
  { label: "Roads CMO", email: "roads-cmo@ppr.ai", color: "bg-stone-50" },
  { label: "Water CMO", email: "water-cmo@ppr.ai", color: "bg-teal-50" },
  { label: "Gas Officer (Sialkot)", email: "gas-officer-sialkot@ppr.ai", color: "bg-amber-50" },
  { label: "Elec. Officer (Sialkot)", email: "electricity-officer-sialkot@ppr.ai", color: "bg-blue-50" },
  { label: "Roads Officer (Sialkot)", email: "roads-officer-sialkot@ppr.ai", color: "bg-slate-50" },
  { label: "Water Officer (Sialkot)", email: "water-officer-sialkot@ppr.ai", color: "bg-cyan-50" },
  { label: "Employee (Gas, Sialkot)", email: "gas-emp1-sialkot@ppr.ai", color: "bg-emerald-50" },
  { label: "Citizen", email: "citizen@ppr.ai", color: "bg-purple-50" },
];

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("splash");
  const [lang, setLang] = useState<Lang>("EN");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [checkingSession, setCheckingSession] = useState(true);
  const [showLogo, setShowLogo] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, skip straight to the right dashboard.
  // If ?login=1 (returning from logout), skip splash and go to auth directly.
  const skipIntro = searchParams.get("login") === "1";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          router.replace(ROLE_HOME[data.user.role as Role] ?? "/citizen");
        } else {
          setCheckingSession(false);
          // Show logo for 5 seconds then go to notice
          const timer = setTimeout(() => {
            setShowLogo(false);
            if (skipIntro) {
              const m = document.cookie.match(/ppr_lang=(EN|UR)/);
              if (m) setLang(m[1] as Lang);
              setStep("auth");
            } else {
              setStep("notice");
            }
          }, 3000);
          return () => clearTimeout(timer);
        }
      })
      .catch(() => {
        setCheckingSession(false);
        const timer = setTimeout(() => {
          setShowLogo(false);
          if (skipIntro) {
            const m = document.cookie.match(/ppr_lang=(EN|UR)/);
            if (m) setLang(m[1] as Lang);
            setStep("auth");
          } else {
            setStep("notice");
          }
        }, 3000);
        return () => clearTimeout(timer);
      });
  }, [router, skipIntro]);

  useEffect(() => {
    if (checkingSession || step !== "splash") return;
    setStep("notice");
  }, [step, checkingSession]);

  async function chooseLanguage(next: Lang) {
    setLang(next);
    await fetch("/api/lang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: next }),
    });
    setStep("auth");
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body = mode === "login" ? { email, password } : { name, email, password, phone: phone.trim() || undefined };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      router.push(ROLE_HOME[data.user.role as Role] ?? "/citizen");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(demoEmail: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: "Demo@1234" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not sign in.");
        return;
      }
      router.push(ROLE_HOME[data.user.role as Role] ?? "/citizen");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession || showLogo) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(600px_400px_at_50%_45%,rgba(26,176,130,0.12),transparent_70%)]" />
        <div className="relative">
          <div aria-hidden className="absolute inset-0 -z-10 scale-125 rounded-full bg-brand-300/30 blur-3xl animate-float-slow" />
          <img src="/logo.png" alt="Pukar" className="w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 object-contain" style={{ animation: "pukarGrow 1.2s ease-out forwards" }} />
        </div>
      </div>
    );
  }

  if (step === "notice") {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <AuroraBg />
        <Card className="glass relative w-full max-w-lg p-8 animate-scale-in">
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl2 bg-gradient-to-r from-brand-400 via-brand-600 to-brand-800" />
          <h1 className="text-xl font-bold text-slate-900">Important Notice / اہم اطلاع</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            This platform is designed to report, monitor and manage public problems. In life-threatening
            emergencies, users should also contact appropriate emergency services.
          </p>
          <p className="mt-3 text-right text-sm leading-loose text-slate-600" dir="rtl" style={{ fontFamily: "var(--font-urdu)" }}>
            یہ پلیٹ فارم عوامی مسائل کی اطلاع دینے، نگرانی کرنے اور ان کا انتظام کرنے کے لیے بنایا گیا ہے۔ جان لیوا
            ہنگامی صورتحال میں، صارفین کو متعلقہ ہنگامی خدمات سے بھی رابطہ کرنا چاہیے۔
          </p>
          <Button className="mt-6 w-full" onClick={() => setStep("language")}>
            I Understand / میں سمجھ گیا
          </Button>
        </Card>
      </div>
    );
  }

  if (step === "language") {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <AuroraBg />
        <Card className="glass relative w-full max-w-md p-8 text-center animate-scale-in">
          <div className="flex justify-center">
            <RadarMark size={56} animated />
          </div>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Choose your language / اپنی زبان منتخب کریں</h1>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => chooseLanguage("EN")}
              className="rounded-xl border border-slate-200 bg-white/70 p-6 font-semibold text-slate-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-50 hover:shadow-glow"
            >
              English
            </button>
            <button
              onClick={() => chooseLanguage("UR")}
              className="rounded-xl border border-slate-200 bg-white/70 p-6 font-semibold text-slate-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-50 hover:shadow-glow"
              style={{ fontFamily: "var(--font-urdu)" }}
            >
              اردو
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // step === "auth"
  const isUrdu = lang === "UR";
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4" dir={isUrdu ? "rtl" : "ltr"}>
      <AuroraBg />
      <div className="relative grid w-full max-w-4xl gap-4 sm:gap-6 md:grid-cols-2 animate-fade-in-up">
        <Card className="glass p-6 sm:p-8">
          <WordMark />
          <div className="mt-6 flex rounded-xl bg-slate-900/5 p-1 text-sm font-semibold">
            <button
              className={`flex-1 rounded-lg py-2 transition-all duration-200 ${mode === "login" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setMode("login")}
            >
              {isUrdu ? "لاگ ان" : "Login"}
            </button>
            <button
              className={`flex-1 rounded-lg py-2 transition-all duration-200 ${mode === "signup" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setMode("signup")}
            >
              {isUrdu ? "سائن اپ" : "Sign up"}
            </button>
          </div>

          <form onSubmit={handleAuth} className="mt-6 flex flex-col gap-3">
            {mode === "signup" && (
              <input
                required
                placeholder={isUrdu ? "پورا نام" : "Full name"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:shadow-glow"
              />
            )}
            {mode === "signup" && (
              <input
                type="tel"
                placeholder={isUrdu ? "فون نمبر" : "Phone number"}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:shadow-glow"
              />
            )}
            <input
              required
              type="email"
              placeholder={isUrdu ? "ای میل" : "Email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:shadow-glow"
            />
            <input
              required
              type="password"
              placeholder={isUrdu ? "پاسورڈ" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:shadow-glow"
            />
            {error && <div className="animate-fade-in rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <Button type="submit" disabled={loading} className="mt-1 w-full">
              {loading ? "…" : mode === "login" ? (isUrdu ? "لاگ ان" : "Login") : isUrdu ? "سائن اپ" : "Sign up"}
            </Button>
          </form>
        </Card>

        <Card className="glass flex flex-col p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            {isUrdu ? "ڈیمو اکاؤنٹس" : "Demo Accounts"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {isUrdu ? "ایک کلک سے داخل ہوں۔ پاسورڈ: Demo@1234" : "One-click sign-in. Password: Demo@1234"}
          </p>
          <div className="mt-3 flex flex-1 flex-col gap-1.5 overflow-auto max-h-[50vh] sm:max-h-none">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                onClick={() => quickLogin(acc.email)}
                disabled={loading}
                className={`flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm transition-all duration-200 hover:-translate-y-px hover:border-brand-500 hover:bg-brand-50 hover:shadow-card ${acc.color}`}
              >
                <span className="font-medium text-slate-700">{acc.label}</span>
                <span className="text-[11px] text-slate-400">{acc.email}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

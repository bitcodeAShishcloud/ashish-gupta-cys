"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ShieldCheck, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Captcha {
  token: string;
  problem: string;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchCaptcha() {
    try {
      const res = await fetch("/api/admin/captcha", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setCaptcha({ token: String(data.token), problem: String(data.problem) });
        setAnswer("");
      }
    } catch {
      /* captcha unavailable — leave as is */
    }
  }

  useEffect(() => {
    fetchCaptcha();
    (async () => {
      try {
        const res = await fetch("/api/admin/verify", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.admin) {
            router.replace("/admin");
            return;
          }
        }
      } catch {
        /* fall through to the form */
      } finally {
        setChecking(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !captcha) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          captchaToken: captcha.token,
          captchaAnswer: answer,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.replace("/admin");
        return;
      }
      if (res.status === 400 && data.error === "captcha_failed") {
        setError(data.message || "Captcha failed.");
        fetchCaptcha();
      } else {
        setError(data.message || "Login failed.");
      }
      if (data.error === "invalid_credentials") fetchCaptcha();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-5 py-16">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/40 bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="section-label font-mono text-xs uppercase tracking-widest text-primary">
              {"restricted"}
            </p>
            <h1 className="text-lg font-bold">Admin sign in</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-primary" /> Credentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="captcha">Verification</Label>
                  <button
                    type="button"
                    onClick={fetchCaptcha}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" /> New challenge
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="glass min-w-[110px] rounded-md px-3 py-2 text-center font-mono text-sm text-primary">
                    {captcha?.problem ?? "…"}
                  </span>
                  <Input
                    id="captcha"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Answer"
                    inputMode="numeric"
                    className="w-28"
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={busy || !captcha}>
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Sign in
              </Button>
            </form>
            <p className="mt-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
              Sessions are server-signed (HMAC) and last 1 hour. Attempt
              limits apply per IP.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

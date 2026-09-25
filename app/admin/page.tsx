"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Cpu,
  Loader2,
  LogOut,
  Plus,
  Rocket,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProviderShape {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  endpoint: string;
  contextWindow: number;
  maxOutput: number;
  hasKey: boolean;
  keyPreview: string;
}

interface Draft {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  contextWindow: string;
  maxOutput: string;
  endpoint: string;
  authHeader: string;
  authPrefix: string;
  responseField: string;
}

const EMPTY_DRAFT: Draft = {
  id: "",
  name: "",
  baseUrl: "",
  apiKey: "",
  model: "",
  contextWindow: "",
  maxOutput: "",
  endpoint: "",
  authHeader: "",
  authPrefix: "",
  responseField: "",
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString()}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return String(n);
}

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [activeId, setActiveId] = useState("");
  const [providers, setProviders] = useState<ProviderShape[]>([]);

  // Generator state
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Test state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function checkAuth() {
    setChecking(true);
    try {
      const res = await fetch("/api/admin/verify", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.admin) {
        const pr = await fetch("/api/providers", { cache: "no-store" });
        if (pr.ok) {
          const pd = await pr.json();
          setProviders(Array.isArray(pd.providers) ? pd.providers : []);
          setActiveId(String(pd.activeId || ""));
        }
      } else {
        router.replace("/admin/login");
        return;
      }
    } catch {
      router.replace("/admin/login");
      return;
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  const generatedJson = useCallback(() => {
    const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
    const d: Record<string, unknown> = {
      id: draft.id.trim() || `p${providers.length + 1}`,
      name: draft.name.trim() || "Custom",
      baseUrl: draft.baseUrl.trim(),
      model: draft.model.trim(),
    };
    if (draft.apiKey.trim()) d.apiKey = draft.apiKey.trim();
    const cw = num(draft.contextWindow);
    const mo = num(draft.maxOutput);
    if (cw) d.contextWindow = cw;
    if (mo) d.maxOutput = mo;
    if (draft.endpoint.trim()) d.endpoint = draft.endpoint.trim();
    if (draft.authHeader.trim()) d.authHeader = draft.authHeader.trim();
    if (draft.authPrefix.trim() !== "") d.authPrefix = draft.authPrefix.trim();
    if (draft.responseField.trim()) d.responseField = draft.responseField.trim();
    return d;
  }, [draft, providers.length]);

  /*
   * Output ONLY the draft entry. The server never exposes real API keys of
   * configured providers, so merging them here would silently corrupt the
   * env var (masked previews instead of keys). The note below tells the
   * user to paste the object into an existing providers array instead.
   */
  const envSnippet = (() => {
    const entry = generatedJson();
    const obj = { activeId: String((entry as { id?: string }).id ?? "p1"), providers: [entry] };
    return `AI_PROVIDERS_JSON=${JSON.stringify(obj)}`;
  })();

  function copySnippet() {
    navigator.clipboard?.writeText(envSnippet).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setTestResult({ ok: true, text: `Connected to ${data.provider} (${data.model}), replied: "${(data.reply || "").slice(0, 80)}"` });
      } else {
        setTestResult({
          ok: false,
          text: data.detail || data.message || `Provider test failed (HTTP ${res.status}).`,
        });
      }
    } catch {
      setTestResult({ ok: false, text: "Network error while testing." });
    } finally {
      setTesting(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.replace("/admin/login");
  }

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label font-mono text-xs uppercase tracking-widest text-primary">
            {"control panel"}
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
            <ShieldCheck className="h-6 w-6 text-primary" /> Admin
            <Badge variant="success" className="font-mono text-[10px]">
              session active
            </Badge>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={checkAuth}>
            <Cpu className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="mr-1.5 h-4 w-4" /> Log out
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <Tabs defaultValue="providers">
          <TabsList>
            <TabsTrigger value="providers">
              <Cpu className="mr-1.5 h-4 w-4" /> Providers
            </TabsTrigger>
            <TabsTrigger value="generate">
              <Plus className="mr-1.5 h-4 w-4" /> Generate Env
            </TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Configured providers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {providers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No providers configured. Set{" "}
                      <code className="font-mono text-xs text-primary">
                        AI_PROVIDERS_JSON
                      </code>{" "}
                      on the server, or use the &ldquo;Generate Env&rdquo; tab.
                    </p>
                  ) : (
                    providers.map((p) => (
                      <div
                        key={p.id}
                        className={cn(
                          "glass rounded-lg p-4",
                          p.id === activeId && "border-primary/50",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-foreground">
                              {p.name}
                            </span>
                            {p.id === activeId ? (
                              <Badge variant="success" className="text-[10px]">
                                active
                              </Badge>
                            ) : null}
                          </div>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {p.keyPreview || "no key"}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[11px] text-muted-foreground">
                          <span title={p.model}>{p.model}</span>
                          <span>{p.endpoint}</span>
                          <span>ctx {fmt(p.contextWindow)}</span>
                          <span>out {fmt(p.maxOutput)}</span>
                        </div>
                      </div>
                    ))
                  )}

                  <div className="border-t border-border/60 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        Test the <span className="font-mono text-foreground">active</span> provider
                        with a tiny ping.
                      </p>
                      <Button size="sm" onClick={runTest} disabled={testing}>
                        {testing ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <Rocket className="mr-1.5 h-4 w-4" />
                        )}
                        Test
                      </Button>
                    </div>
                    {testResult ? (
                      <div
                        className={cn(
                          "mt-3 rounded-md border px-3 py-2 font-mono text-xs",
                          testResult.ok
                            ? "border-success/40 bg-success/10 text-success"
                            : "border-danger/40 bg-danger/10 text-danger",
                        )}
                      >
                        {testResult.ok ? "✓ " : "✗ "}
                        {testResult.text}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wrench className="h-4 w-4 text-primary" /> Security model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="text-primary">▸</span>
                      Providers are defined only by the server env var{" "}
                      <code className="font-mono text-xs text-foreground">
                        AI_PROVIDERS_JSON
                      </code>{" "}, the admin panel never writes to it.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">▸</span>
                      Outbound calls are https-only and restricted to the{" "}
                      <code className="font-mono text-xs text-foreground">
                        AI_ALLOWED_HOSTS
                      </code>{" "}
                      whitelist; private/loopback addresses are rejected.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">▸</span>
                      API keys never leave the server. Chat history stays in
                      each visitor&apos;s browser only.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">▸</span>
                      Admin session = signed HMAC cookie (1h) + per-IP rate
                      limiting + captcha on login.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="generate" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base">
                    Build a provider entry → AI_PROVIDERS_JSON
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>id</Label>
                      <Input value={draft.id} onChange={set("id")} placeholder="p1" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input value={draft.name} onChange={set("name")} placeholder="XKiro" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Base URL (https only)</Label>
                      <Input
                        value={draft.baseUrl}
                        onChange={set("baseUrl")}
                        placeholder="https://api.xkiro.com/v1"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>API key</Label>
                      <Input
                        value={draft.apiKey}
                        onChange={set("apiKey")}
                        placeholder="sk-…"
                        type="password"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Model</Label>
                      <Input
                        value={draft.model}
                        onChange={set("model")}
                        placeholder="qwen/qwen3.8-max:free"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Context window (tokens)</Label>
                      <Input
                        value={draft.contextWindow}
                        onChange={set("contextWindow")}
                        placeholder="1000000"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Max output (tokens)</Label>
                      <Input
                        value={draft.maxOutput}
                        onChange={set("maxOutput")}
                        placeholder="65536"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    {advancedOpen ? "Hide advanced fields" : "Advanced fields"}
                  </button>
                  {advancedOpen ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>endpoint</Label>
                        <Input
                          value={draft.endpoint}
                          onChange={set("endpoint")}
                          placeholder="/chat/completions"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>responseField</Label>
                        <Input
                          value={draft.responseField}
                          onChange={set("responseField")}
                          placeholder="choices.0.message.content"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>authHeader</Label>
                        <Input
                          value={draft.authHeader}
                          onChange={set("authHeader")}
                          placeholder="Authorization"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>authPrefix</Label>
                        <Input
                          value={draft.authPrefix}
                          onChange={set("authPrefix")}
                          placeholder="Bearer "
                        />
                      </div>
                    </div>
                  ) : null}

                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    Output
                    <Button size="sm" variant="outline" onClick={copySnippet}>
                      {copied ? (
                        <Check className="mr-1.5 h-4 w-4 text-success" />
                      ) : (
                        <Copy className="mr-1.5 h-4 w-4" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-72 overflow-auto rounded-md border border-border/60 bg-black/40 p-3 font-mono text-xs text-primary">
                    {envSnippet}
                  </pre>
                  <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    Paste this into <code>.env.local</code> (dev) or Vercel →
                    Environment Variables. Then set{" "}
                    <code className="text-foreground">
                      AI_ALLOWED_HOSTS
                    </code>{" "}
                    to the provider&apos;s host so the server may only call it.
                    Existing keys are never shown, so to keep other providers,
                    copy this object into your current{" "}
                    <code className="text-foreground">providers</code> array
                    instead of replacing the whole value.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-border/60 pt-4">
        <p className="font-mono text-[11px] text-muted-foreground">
          Panel is read-only for configuration, providers are env-driven.
        </p>
        <Trash2 className="h-4 w-4 text-muted-foreground/40" aria-hidden />
      </div>
    </div>
  );
}

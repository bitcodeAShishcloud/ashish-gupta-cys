"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Cpu,
  Download,
  Edit2,
  Loader2,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  Wrench,
  X,
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
import { AdminAiChats } from "@/components/admin/ai-chats";
import { cn } from "@/lib/utils";

type Protocol = "openai" | "anthropic" | "google";
type ProviderType = "chat" | "image" | "video";

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
  type?: string;
  protocol?: string;
  active?: boolean;
  authHeader?: string;
  authPrefix?: string;
  responseField?: string;
}

interface ProviderDraft {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  type: ProviderType;
  protocol: Protocol;
  contextWindow: string;
  maxOutput: string;
  endpoint: string;
  authHeader: string;
  authPrefix: string;
  responseField: string;
}

/* Presets fill the whole form from one dropdown. baseUrl/model are only
 * suggestions — a custom value typed by the owner is never overwritten. */
const PROTOCOL_PRESETS: Record<
  Protocol,
  { baseUrl: string; model: string; endpoint: string; authHeader: string; authPrefix: string; responseField: string }
> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    endpoint: "/chat/completions",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    responseField: "choices.0.message.content",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-3-5-sonnet-20241022",
    endpoint: "/messages",
    authHeader: "x-api-key",
    authPrefix: "",
    responseField: "content.0.text",
  },
  google: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-1.5-flash",
    endpoint: ":generateContent",
    authHeader: "x-goog-api-key",
    authPrefix: "",
    responseField: "candidates.0.content.parts.0.text",
  },
};

const EMPTY_DRAFT: ProviderDraft = {
  id: "", name: "", baseUrl: "", apiKey: "", model: "",
  type: "chat", protocol: "openai",
  contextWindow: "", maxOutput: "",
  endpoint: "", authHeader: "", authPrefix: "", responseField: "",
};

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [testingIds, setTestingIds] = useState<Record<string, boolean>>({});
  const [rowResults, setRowResults] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [providers, setProviders] = useState<ProviderShape[]>([]);
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pDraft, setPDraft] = useState<ProviderDraft>(EMPTY_DRAFT);

  async function loadProviders() {
    const res = await fetch("/api/admin/providers", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setProviders(Array.isArray(data.providers) ? data.providers : []);
    setEncryptionReady(Boolean(data.encryptionConfigured));
  }

  async function migrateProviders() {
    setMigrating(true);
    setFormMsg(null);
    try {
      const res = await fetch("/api/admin/providers/migrate", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      setFormMsg({ ok: true, text: data.message || "Providers imported." });
      await loadProviders();
    } catch (e) {
      setFormMsg({ ok: false, text: e instanceof Error ? e.message : "Import failed." });
    } finally {
      setMigrating(false);
    }
  }

  async function checkAuth() {
    setChecking(true);
    try {
      const res = await fetch("/api/admin/verify", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.admin) {
        router.replace("/admin/login");
        return;
      }
      await loadProviders();
    } catch {
      router.replace("/admin/login");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setProtocol(protocol: Protocol) {
    const preset = PROTOCOL_PRESETS[protocol];
    setPDraft((d) => ({
      ...d,
      protocol,
      // Only fill URL/model when blank — respect anything the owner typed.
      baseUrl: d.baseUrl || preset.baseUrl,
      model: d.model || preset.model,
      // Advanced fields follow the chosen protocol until manually edited.
      endpoint: preset.endpoint,
      authHeader: preset.authHeader,
      authPrefix: preset.authPrefix,
      responseField: preset.responseField,
    }));
  }

  function resetPDraft() {
    setPDraft(EMPTY_DRAFT);
    setEditId(null);
    setShowAdd(false);
    setAdvancedOpen(false);
    setFormMsg(null);
  }

  function startEdit(p: ProviderShape) {
    const protocol = (
      p.protocol === "anthropic" || p.protocol === "google" ? p.protocol : "openai"
    ) as Protocol;
    setPDraft({
      id: p.id,
      name: p.name,
      baseUrl: p.baseUrl,
      apiKey: "",
      model: p.model,
      type: (p.type === "image" || p.type === "video" ? p.type : "chat") as ProviderType,
      protocol,
      contextWindow: p.contextWindow ? String(p.contextWindow) : "",
      maxOutput: p.maxOutput ? String(p.maxOutput) : "",
      endpoint: p.endpoint || PROTOCOL_PRESETS[protocol].endpoint,
      authHeader: p.authHeader ?? PROTOCOL_PRESETS[protocol].authHeader,
      authPrefix: p.authPrefix ?? PROTOCOL_PRESETS[protocol].authPrefix,
      responseField: p.responseField || PROTOCOL_PRESETS[protocol].responseField,
    });
    setEditId(p.id);
    setShowAdd(true);
    setFormMsg(null);
  }

  async function saveProvider() {
    setSaving(true);
    setFormMsg(null);
    try {
      const isEdit = Boolean(editId);
      const url = isEdit
        ? `/api/admin/providers/${encodeURIComponent(editId!)}`
        : "/api/admin/providers";
      const payload: Record<string, unknown> = {
        name: pDraft.name.trim(),
        baseUrl: pDraft.baseUrl.trim(),
        model: pDraft.model.trim(),
        type: pDraft.type,
        protocol: pDraft.protocol,
        contextWindow: pDraft.contextWindow,
        maxOutput: pDraft.maxOutput,
      };
      if (!isEdit) payload.id = pDraft.id.trim();
      if (pDraft.apiKey.trim()) payload.apiKey = pDraft.apiKey.trim();
      // Advanced overrides are only sent when the owner changed them from the preset.
      const preset = PROTOCOL_PRESETS[pDraft.protocol];
      if (pDraft.endpoint.trim() && pDraft.endpoint.trim() !== preset.endpoint) {
        payload.endpoint = pDraft.endpoint.trim();
      }
      if (pDraft.authHeader.trim() && pDraft.authHeader.trim() !== preset.authHeader) {
        payload.authHeader = pDraft.authHeader.trim();
      }
      if (pDraft.authPrefix !== preset.authPrefix) payload.authPrefix = pDraft.authPrefix;
      if (pDraft.responseField.trim() && pDraft.responseField.trim() !== preset.responseField) {
        payload.responseField = pDraft.responseField.trim();
      }
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      setFormMsg({ ok: true, text: isEdit ? "Provider updated." : "Saved — API key encrypted at rest." });
      resetPDraft();
      await loadProviders();
    } catch (e) {
      setFormMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  async function setActiveProvider(p: ProviderShape) {
    try {
      const res = await fetch(`/api/admin/providers/${encodeURIComponent(p.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      if (!res.ok) throw new Error("Failed to set active.");
      await loadProviders();
      setFormMsg({ ok: true, text: `${p.name} is now the active ${p.type || "chat"} provider.` });
    } catch (e) {
      setFormMsg({ ok: false, text: e instanceof Error ? e.message : "Failed." });
    }
  }

  async function deleteProvider(p: ProviderShape) {
    if (!confirm(`Delete provider "${p.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/providers/${encodeURIComponent(p.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete.");
      setProviders((prev) => prev.filter((x) => x.id !== p.id));
      setFormMsg({ ok: true, text: `${p.name} deleted.` });
    } catch (e) {
      setFormMsg({ ok: false, text: e instanceof Error ? e.message : "Delete failed." });
    }
  }

  async function runTest(id: string) {
    setTestingIds((prev) => ({ ...prev, [id]: true }));
    setRowResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", id }),
      });
      const data = await res.json().catch(() => ({}));
      setRowResults((prev) => ({
        ...prev,
        [id]: res.ok && data.ok
          ? {
              ok: true,
              text: `Connected to ${data.provider} (${data.model}), replied: "${(data.reply || "").slice(0, 80)}"`,
            }
          : {
              ok: false,
              text: data.detail || data.message || `Provider test failed (HTTP ${res.status}).`,
            },
      }));
    } catch {
      setRowResults((prev) => ({ ...prev, [id]: { ok: false, text: "Network error while testing." } }));
    } finally {
      setTestingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
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
            <TabsTrigger value="chats">
              <MessageSquare className="mr-1.5 h-4 w-4" /> AI Chats
            </TabsTrigger>
          </TabsList>
          <TabsContent value="providers" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" /> Providers
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  title="Copy legacy AI_PROVIDERS_JSON providers into the encrypted DB registry"
                  onClick={() => void migrateProviders()}
                  disabled={migrating || !encryptionReady}
                >
                  {migrating ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Import env
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    resetPDraft();
                    setShowAdd(true);
                    setProtocol("openai");
                  }}
                  disabled={!encryptionReady}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add provider
                </Button>
              </div>
            </div>
            {!encryptionReady ? (
              <p className="mt-2 text-xs text-danger">
                Set <code className="font-mono">PROVIDER_ENCRYPTION_KEY</code> on the server to save providers.
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {formMsg ? (
              <div
                className={cn(
                  "rounded-md border px-3 py-2 text-xs",
                  formMsg.ok
                    ? "border-border/60 text-muted-foreground"
                    : "border-danger/40 bg-danger/10 text-danger",
                )}
              >
                {formMsg.ok ? "✓ " : "✗ "}
                {formMsg.text}
              </div>
            ) : null}

            {showAdd ? (
              <div className="rounded-lg border border-border/60 bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">{editId ? "Edit provider" : "New provider"}</p>
                  <button
                    type="button"
                    onClick={resetPDraft}
                    aria-label="Close form"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input
                      value={pDraft.name}
                      onChange={(e) => setPDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="My provider"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Protocol</Label>
                    <div className="relative">
                      <select
                        value={pDraft.protocol}
                        onChange={(e) => setProtocol(e.target.value as Protocol)}
                        className="w-full appearance-none rounded-md border border-border bg-background px-3 py-2 pr-8 font-mono text-xs"
                      >
                        <option value="openai">OpenAI-compatible</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="google">Google Gemini</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Base URL (https only)</Label>
                    <Input
                      value={pDraft.baseUrl}
                      onChange={(e) => setPDraft((d) => ({ ...d, baseUrl: e.target.value }))}
                      placeholder="https://api.example.com/v1"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Model</Label>
                    <Input
                      value={pDraft.model}
                      onChange={(e) => setPDraft((d) => ({ ...d, model: e.target.value }))}
                      placeholder="model-id"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>API key {editId ? "(blank = keep existing)" : ""}</Label>
                    <Input
                      type="password"
                      value={pDraft.apiKey}
                      onChange={(e) => setPDraft((d) => ({ ...d, apiKey: e.target.value }))}
                      placeholder="sk-…"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Used for</Label>
                    <select
                      value={pDraft.type}
                      onChange={(e) => setPDraft((d) => ({ ...d, type: e.target.value as ProviderType }))}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
                    >
                      <option value="chat">Chat</option>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                  {!editId ? (
                    <div className="space-y-1.5">
                      <Label>ID (optional)</Label>
                      <Input
                        value={pDraft.id}
                        onChange={(e) => setPDraft((d) => ({ ...d, id: e.target.value }))}
                        placeholder="auto"
                        className="font-mono text-xs"
                      />
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    <Label>Context window</Label>
                    <Input
                      value={pDraft.contextWindow}
                      onChange={(e) => setPDraft((d) => ({ ...d, contextWindow: e.target.value }))}
                      placeholder="optional"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max output</Label>
                    <Input
                      value={pDraft.maxOutput}
                      onChange={(e) => setPDraft((d) => ({ ...d, maxOutput: e.target.value }))}
                      placeholder="optional"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAdvancedOpen((v) => !v)}
                  className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  {advancedOpen ? "Hide advanced fields" : "Advanced fields (auto-filled by protocol)"}
                </button>
                {advancedOpen ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {(["endpoint", "authHeader", "authPrefix", "responseField"] as const).map((k) => (
                      <div key={k} className="space-y-1.5">
                        <Label className="font-mono text-[11px]">{k}</Label>
                        <Input
                          value={pDraft[k]}
                          onChange={(e) => setPDraft((d) => ({ ...d, [k]: e.target.value }))}
                          className="font-mono text-xs"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    onClick={saveProvider}
                    disabled={
                      saving ||
                      !pDraft.name.trim() ||
                      !pDraft.baseUrl.trim() ||
                      !pDraft.model.trim() ||
                      (!editId && !pDraft.apiKey.trim())
                    }
                  >
                    {saving ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {editId ? "Save changes" : "Save & encrypt"}
                  </Button>
                </div>
              </div>
            ) : null}

            {providers.length === 0 && !showAdd ? (
              <p className="text-sm text-muted-foreground">
                No providers yet. Add one — keys are encrypted before they leave this browser.
              </p>
            ) : (
              providers.map((p) => (
                <div key={p.id} className="glass rounded-lg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold text-foreground">{p.name}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">{p.type || "chat"}</Badge>
                      <Badge variant="outline" className="font-mono text-[10px] text-primary">
                        {p.protocol || "openai"}
                      </Badge>
                      {p.active ? (
                        <Badge variant="success" className="text-[10px]">active</Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      {!p.active ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-mono text-[11px]"
                          onClick={() => setActiveProvider(p)}
                          title="Set active for this type"
                        >
                          <Star className="mr-1 h-3.5 w-3.5" /> Activate
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => runTest(p.id)}
                        disabled={!!testingIds[p.id]}
                        title="Test provider"
                      >
                        {testingIds[p.id] ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(p)} title="Edit">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProvider(p)}
                        title="Delete"
                        className="text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                    {p.model} · {p.keyPreview || "no key"}
                  </div>
                  {rowResults[p.id] ? (
                    <div
                      className={cn(
                        "mt-2 rounded-md border px-2 py-1.5 font-mono text-[11px]",
                        rowResults[p.id].ok
                          ? "border-border/60 text-muted-foreground"
                          : "border-danger/40 bg-danger/10 text-danger",
                      )}
                    >
                      {rowResults[p.id].ok ? "✓ " : "✗ "}
                      {rowResults[p.id].text}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4 text-primary" /> How it works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">▸</span>
                <span>
                  Old providers in the server env var can be pulled in with{" "}
                  <strong className="text-foreground">Import env</strong> — keys are encrypted on the way in.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">▸</span>
                <span>
                  Pick a <strong className="text-foreground">protocol</strong> — OpenAI-compatible,
                  Anthropic or Google Gemini. Endpoint, auth header and response mapping are
                  filled automatically.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">▸</span>
                <span>
                  All three are translated to the same stream format, so visitors get the
                  identical token-by-token chat experience.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">▸</span>
                <span>
                  Providers live in Turso. API keys are encrypted with{" "}
                  <code className="font-mono text-xs text-foreground">PROVIDER_ENCRYPTION_KEY</code>{" "}
                  (AES-256-GCM) and never leave the server.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">▸</span>
                <span>
                  Outbound calls are https-only and restricted to the{" "}
                  <code className="font-mono text-xs text-foreground">AI_ALLOWED_HOSTS</code>{" "}
                  whitelist. Private/loopback addresses are rejected.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">▸</span>
                <span>
                  One active provider per type. Admin session = signed HMAC cookie (1h) + per-IP
                  rate limiting + captcha on login.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
            </div>
          </TabsContent>
          <TabsContent value="chats" className="mt-6">
            <AdminAiChats />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

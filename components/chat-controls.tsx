"use client";

import { useState } from "react";
import { Minus, Plus, Type, Settings2, RotateCcw, X } from "lucide-react";
import {
  DEFAULT_TYPOGRAPHY, FONT_FAMILIES, TYPOGRAPHY_KEY,
  type TypographySettings,
} from "@/lib/typography";
import { cn } from "@/lib/utils";

/* Chat header toolbar (locked decision #3): compact A−/A+ always visible,
 * with a popover for font family, line height and reading width. */
export function ChatControls({
  settings,
  onChange,
  onExportConversation,
}: {
  settings: TypographySettings;
  onChange: (s: TypographySettings) => void;
  onExportConversation?: () => void;
}) {
  const [open, setOpen] = useState(false);

  function set<K extends keyof TypographySettings>(key: K, value: TypographySettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  function save(s: TypographySettings) {
    onChange(s);
    try {
      localStorage.setItem(TYPOGRAPHY_KEY, JSON.stringify(s));
    } catch {
      /* storage unavailable — session-only is fine */
    }
  }

  const bump = (delta: number) =>
    save({ ...settings, fontScale: Math.round(Math.min(1.35, Math.max(0.85, settings.fontScale + delta)) * 10) / 10 });

  return (
    <div className="md-controls">
      <button type="button" onClick={() => bump(-0.1)} aria-label="Decrease text size" title="Smaller text" className="md-ctrl-btn">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="md-ctrl-value">{Math.round(settings.fontScale * 100)}%</span>
      <button type="button" onClick={() => bump(0.1)} aria-label="Increase text size" title="Larger text" className="md-ctrl-btn">
        <Plus className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Text settings"
        title="Text settings"
        className={cn("md-ctrl-btn", open && "is-on")}
      >
        <Type className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <div className="md-controls-pop" role="dialog" aria-label="Text settings">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-medium"><Settings2 className="h-3.5 w-3.5" /> Reading settings</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>

          <label className="md-field">
            <span>Font family</span>
            <select
              value={settings.fontFamily}
              onChange={(e) => save({ ...settings, fontFamily: e.target.value as TypographySettings["fontFamily"] })}
            >
              {FONT_FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>

          <label className="md-field">
            <span>Line spacing <b>{settings.lineHeight.toFixed(2)}</b></span>
            <input type="range" min="1.5" max="2" step="0.05" value={settings.lineHeight}
              onChange={(e) => set("lineHeight", Number(e.target.value))}
              onPointerUp={() => save(settings)} />
          </label>

          <label className="md-field">
            <span>Reading width <b>{settings.readingWidth}px</b></span>
            <input type="range" min="640" max="1000" step="16" value={settings.readingWidth}
              onChange={(e) => set("readingWidth", Number(e.target.value))}
              onPointerUp={() => save(settings)} />
          </label>

          <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
            <button type="button" onClick={() => save({ ...DEFAULT_TYPOGRAPHY })} className="md-reset">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
            {onExportConversation ? (
              <button type="button" onClick={() => { setOpen(false); onExportConversation(); }} className="md-reset">
                Export conversation
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

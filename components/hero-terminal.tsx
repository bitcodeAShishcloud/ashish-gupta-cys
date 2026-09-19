"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/*
 * Hero "access control" terminal card — mirrors the side card on the
 * reference site (cyberinvaders.tech): ssh status lines + a restricted
 * access form that routes to the standalone admin console.
 */
export function HeroTerminal() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="animate-fade-in-up relative mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end" style={{ animationDelay: "150ms" }}>
      {/* violet corner glow, like the reference */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl"
      />
      <div className="glass relative w-full rounded-2xl border-primary/20 p-6 shadow-[0_0_50px_hsl(var(--primary)/0.2)]">
        {/* header */}
        <div className="mb-5 flex items-center gap-3">
          <span className="grad-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold text-white shadow-[0_0_14px_hsl(var(--primary)/0.4)]">
            #
          </span>
          <div>
            <p className="font-mono text-sm font-bold text-foreground">
              ashish_gupta <span className="text-primary">~</span> admin
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
              access control
            </p>
          </div>
        </div>

        {/* terminal body */}
        <div className="space-y-3 rounded-lg border border-primary/15 bg-popover p-4 font-mono text-xs">
          <p className="text-foreground">
            <span className="mr-2 text-primary">$</span>
            ssh ashish@portfolio
          </p>
          <p className="text-secondary">Connection established...</p>
          <p className="text-muted-foreground">Authentication required.</p>

          <div className="space-y-1.5 pt-1">
            <label htmlFor="hero-email" className="block text-secondary">
              <span className="mr-1 text-primary">&gt;</span> EMAIL
            </label>
            <Input
              id="hero-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@portfolio"
              className="border-primary/20 bg-black font-mono placeholder:text-muted-foreground/60 focus-visible:border-primary/60 focus-visible:shadow-[0_0_16px_hsl(var(--primary)/0.35)]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="hero-password" className="block text-secondary">
              <span className="mr-1 text-primary">&gt;</span> PASSWORD
            </label>
            <Input
              id="hero-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="border-primary/20 bg-black font-mono placeholder:text-muted-foreground/60 focus-visible:border-primary/60 focus-visible:shadow-[0_0_16px_hsl(var(--primary)/0.35)]"
            />
          </div>

          <Button type="button" className="mt-1 w-full" onClick={() => router.push("/admin/login")}>
            <span className="mr-1 font-mono text-xs">&gt;</span> ACCESS CONSOLE
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            restricted · authorized sessions only
          </p>
        </div>
      </div>
    </div>
  );
}

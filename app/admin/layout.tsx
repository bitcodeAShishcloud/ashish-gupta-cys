import Link from "next/link";
import { Home } from "lucide-react";

/*
 * Standalone admin console, deliberately without the public navbar/footer,
 * so /admin reads like its own subdomain (admin.<yourdomain.com>). The public
 * site never links to it; the only way in is the URL.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5 font-mono text-sm font-bold">
            <img
              src="/favicon.webp"
              alt="Ashish Gupta logo"
              width={28}
              height={28}
              className="h-7 w-7 rounded-md object-cover"
            />
            <span>
              admin<span className="text-primary">.</span>console
            </span>
            <span className="hidden font-mono text-[10px] font-normal text-muted-foreground sm:inline">
              restricted · signed sessions only
            </span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition hover:text-primary"
          >
            <Home className="h-3.5 w-3.5" /> back to portfolio
          </Link>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </header>

      <main className="flex flex-1 flex-col pt-6">{children}</main>

      <footer className="border-t border-border/40 py-4 text-center font-mono text-[11px] text-muted-foreground">
        restricted console · authorized sessions only · no public access
      </footer>
    </div>
  );
}

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

/*
 * Public site chrome: skip-to-content, fixed navbar + main + footer.
 * Admin lives under its own route group with a standalone console layout,
 * so the public pages never expose it.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="relative z-0 min-h-[calc(100vh-72px)] pt-[72px]">
        {children}
      </main>
      <Footer />
    </>
  );
}

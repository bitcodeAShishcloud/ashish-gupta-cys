import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

/*
 * Public site chrome: fixed navbar + main content + footer.
 * Admin lives under its own route group with a standalone console layout,
 * so the public pages never expose it.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="relative z-0 min-h-[calc(100vh-72px)] pt-[72px]">{children}</main>
      <Footer />
    </>
  );
}

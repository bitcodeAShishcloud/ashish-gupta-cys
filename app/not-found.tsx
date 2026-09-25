import Link from "next/link";
import { Button } from "@/components/ui/button";

/*
 * Root 404-covers routes outside the (site) group (e.g. /admin/xyz),
 * which would otherwise fall back to Next's bare default page.
 */
export default function RootNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="grad-card w-full max-w-md rounded-xl p-10 text-center animate-fade-in-up">
        <p className="section-label font-mono text-xs uppercase tracking-widest text-primary">
          {"error 404"}
        </p>
        <h1 className="grad-text mt-3 font-mono text-5xl font-bold">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This page does not exist in the network.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">
            <span className="mr-2 font-mono text-xs">&gt;_</span> Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
}

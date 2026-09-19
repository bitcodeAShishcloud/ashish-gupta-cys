import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-5">
      <div className="glass w-full max-w-md rounded-xl p-10 text-center animate-fade-in-up">
        <p className="section-label font-mono text-xs uppercase tracking-widest text-primary">
          {"error 404"}
        </p>
        <h1 className="mt-3 font-mono text-5xl font-bold text-foreground">404</h1>
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

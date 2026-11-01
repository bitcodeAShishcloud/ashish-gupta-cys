import Link from "next/link";

/*
 * /chat is a distraction-free, app-like page (Dribbble Sorin reference):
 * no site navbar/footer — just its own minimal top bar with a way home.
 */
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-5">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/favicon.webp"
            alt="Ashish Gupta logo"
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
          />
          <span className="font-mono text-sm font-bold">Ashish_Gupta</span>
        </Link>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

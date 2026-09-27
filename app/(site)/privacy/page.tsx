import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How this portfolio handles data: no tracking, no analytics, chat stays in your browser.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="section-label font-mono text-xs uppercase tracking-widest text-primary">
        legal
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: February 2026
      </p>

      <div className="markdown-body mt-8">
        <p>
          This portfolio is a personal website. I keep data collection to the
          bare minimum, and this page explains exactly what happens when you
          visit.
        </p>

        <h2>What I collect</h2>
        <p>
          Nothing, deliberately. There are no analytics scripts, no tracking
          pixels, no cookies set for visitors, and no advertising on this site.
          I do not know who you are unless you contact me directly.
        </p>

        <h2>AI chat assistant</h2>
        <p>
          The chat assistant asks for your first name and keeps your
          conversation in your own browser using localStorage. That data never
          leaves your device except for the message text itself, which is sent
          to my server, and then relayed to the AI provider to generate a
          reply. I do not store your name, your messages, or the replies on any
          database. You can erase everything at any time with the
          &quot;Erase data&quot; button in the chat.
        </p>

        <h2>Server logs</h2>
        <p>
          The site is hosted on Vercel. Like any web host, Vercel processes
          standard request logs (IP address, requested URL, timestamp) for
          security and abuse prevention. I use per-IP rate limiting on the chat
          and admin endpoints for the same reason. I do not use these logs for
          profiling or marketing.
        </p>

        <h2>Admin area</h2>
        <p>
          The /admin console is for my own use only. Signing in there sets a
          single session cookie in my browser. It is not accessible to
          visitors.
        </p>

        <h2>External links</h2>
        <p>
          Project pages, GitHub, and LinkedIn links lead to third-party sites
          with their own privacy policies. This site opens them in a new tab
          and does not pass any information about you.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy? Email me at{" "}
          <a href="mailto:agupta38160@gmail.com">agupta38160@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}

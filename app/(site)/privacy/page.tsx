import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How this portfolio handles data: no tracking, no analytics, optional cloud sync for chat conversations with an anonymous device token.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="relative mx-auto max-w-3xl px-5 py-16">
      {/* soft radial brand glow behind the header */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-120px] h-[380px] w-[680px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[110px]"
      />
      <p className="section-label relative font-mono text-xs uppercase tracking-widest text-primary">
        legal
      </p>
      <h1 className="relative mt-1 font-display text-3xl font-bold">Privacy Policy</h1>
      <p className="relative mt-2 text-sm text-muted-foreground">
        Last updated: November 2026
      </p>

      <div className="markdown-body mt-8">
        <p>
          This portfolio is a personal website. I keep data collection to the
          bare minimum, and this page explains exactly what happens when you
          visit — including the one place where chat data can leave your
          browser beyond the reply itself.
        </p>

        <h2>What I collect</h2>
        <p>
          No analytics scripts, no tracking pixels, no advertising, and no
          cookies set for visitors. I do not know who you are unless you
          contact me directly.
        </p>

        <h2>AI chat assistant — the message text itself</h2>
        <p>
          When you send a message in the chat, that message text is sent to my
          server, which relays it to the configured AI provider to generate a
          reply. The provider API key never leaves the server, and the reply
          streams back through my server to your browser. That is inherent to
          any AI chat and cannot work any other way.
        </p>

        <h2>AI chat assistant — conversation sync (optional, when enabled)</h2>
        <p>
          The chat can keep your conversations in sync with a small database so
          they survive browser clears and can be managed from the sidebar. When
          this sync is active on the server:
        </p>
        <ul>
          <li>
            What is stored: the conversation title (the first 50 characters of
            your first message), the messages themselves (user and assistant,
            up to 12,000 characters each), and generation settings.
          </li>
          <li>
            How it is tied to you: there is no account, no email, and no
            password. Your browser generates a random device token that stays
            in your own localStorage; the server stores only a SHA-256 hash of
            that token. Without the token, nobody can match the data to you.
          </li>
          <li>
            A device name is stored alongside it, which your browser derives
            from your user-agent unless you change it.
          </li>
          <li>
            Who can read it: me, the site owner, through a password-protected
            admin console. No one else — the data is scoped per device token.
          </li>
          <li>
            Deleting: you can delete individual conversations from the chat
            sidebar at any time. The &quot;Clear it&quot; button in the chat
            clears everything stored locally in your browser; synced copies
            already on the server can be removed conversation-by-conversation
            from the sidebar, or become permanently unreachable if you clear
            your browser storage (the device token is not recoverable).
          </li>
        </ul>
        <p>
          When this sync is not enabled on the server, none of the above
          applies: your conversations live only in your browser&apos;s
          localStorage and never leave your device except for the message text
          described above.
        </p>

        <h2>Server logs</h2>
        <p>
          The site is hosted on Vercel. Like any web host, Vercel processes
          standard request logs (IP address, requested URL, timestamp) for
          security and abuse prevention. I use per-IP rate limiting on the
          chat, image, video, and admin endpoints for the same reason. I do not
          use these logs for profiling or marketing.
        </p>

        <h2>Admin area</h2>
        <p>
          The /admin console is for my own use only. Signing in there sets a
          single session cookie in my browser. It is not accessible to
          visitors. Through it I can view synced conversations — which is why
          they are disclosed above.
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

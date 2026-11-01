import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms for using this portfolio site: content ownership, acceptable use of the AI assistant, and liability.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
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
      <h1 className="relative mt-1 font-display text-3xl font-bold">Terms &amp; Conditions</h1>
      <p className="relative mt-2 text-sm text-muted-foreground">
        Last updated: February 2026
      </p>

      <div className="markdown-body mt-8">
        <p>
          By using this website you agree to the terms below. They are short on
          purpose.
        </p>

        <h2>Content ownership</h2>
        <p>
          All text, project writeups, images, and code shown on this site are
          my work unless stated otherwise. You may link to anything here, but
          you may not copy or republish it without asking first.
        </p>

        <h2>AI assistant</h2>
        <p>
          The chat assistant is provided as-is for learning about my work. Do
          not use it to generate spam, unlawful content, or to attack the
          service. Requests are rate limited per IP, and abuse may be blocked.
          The assistant can be wrong about facts; verify anything important
          directly with me.
        </p>

        <h2>No warranty</h2>
        <p>
          This site is provided without any warranty. Code samples in blog
          posts are for education and are used at your own risk. Availability
          is best effort, it is a personal site, not a product with an SLA.
        </p>

        <h2>External links</h2>
        <p>
          Links to client sites, GitHub repositories, and certifications point
          to third-party properties that I do not control. I am not
          responsible for their content or availability.
        </p>

        <h2>Changes</h2>
        <p>
          I may update these terms as the site evolves. The date at the top
          shows the current version.
        </p>

        <h2>Contact</h2>
        <p>
          Anything unclear? Reach me at{" "}
          <a href="mailto:agupta38160@gmail.com">agupta38160@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}

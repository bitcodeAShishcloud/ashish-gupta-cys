import { BLOG_POSTS, PORTFOLIO } from "@/lib/content";

/*
 * Chat knowledge base. The assistant historically knew only the two-line
 * intro baked into its system prompt — every real fact (projects,
 * certifications, experience, education, skills, blog topics) lived in
 * content.ts and never reached the model. This renders the whole portfolio
 * into a compact fact sheet that the chat route injects into the system
 * prompt once per request. Pure function over public portfolio data only —
 * nothing here is secret, and it tracks content.ts automatically, so new
 * projects or certifications flow into the assistant without edits here.
 */

function clip(text: string, max: number): string {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function buildKnowledgeBase(): string {
  const lines: string[] = [];

  lines.push("=== PORTFOLIO FACT SHEET (verified data — answer from this) ===");
  lines.push(
    `${PORTFOLIO.name} — ${PORTFOLIO.role}. ${clip(PORTFOLIO.tagline, 160)}`,
  );
  lines.push(
    `Education: ${PORTFOLIO.education.degree}, ${PORTFOLIO.education.institution}, ${PORTFOLIO.education.year}. Subjects: ${PORTFOLIO.education.subjects.join(", ")}.`,
  );

  lines.push("Experience:");
  for (const e of PORTFOLIO.experience) {
    lines.push(`- ${e.title} @ ${e.org} (${e.year}): ${clip(e.desc, 180)} [${e.tech.join(", ")}]`);
  }

  lines.push("Skills:");
  for (const cat of PORTFOLIO.skills) {
    lines.push(
      `- ${cat.category}: ${cat.items
        .map((s) => `${s.name} (${s.skillLevel ?? "working"})`)
        .join(", ")}`,
    );
  }

  lines.push(`Projects (${PORTFOLIO.projects.length}):`);
  for (const p of PORTFOLIO.projects) {
    const bits = [clip(p.desc, 200)];
    if (p.tech?.length) bits.push(`tech: ${p.tech.join(", ")}`);
    if (p.live) bits.push(`live website: ${p.live}`);
    if (p.github) bits.push(`code: ${p.github}`);
    if (p.caseStudy) bits.push(`case study: /blog/${p.caseStudy}`);
    lines.push(`- ${p.name} (${p.category ?? "project"}): ${bits.join(" | ")}`);
  }

  lines.push("Certifications:");
  for (const c of PORTFOLIO.certifications) {
    lines.push(
      `- ${c.title} — ${c.issuer}, ${c.date}${c.status ? ` (${c.status})` : ""}`,
    );
  }

  lines.push("Blog posts (latest, with case studies and guides):");
  for (const post of [...BLOG_POSTS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)) {
    lines.push(
      `- "${post.title}" (${post.category}, ${post.date}): ${clip(post.excerpt, 140)} — /blog/${post.id}`,
    );
  }

  lines.push(
    `Contact: email ${PORTFOLIO.socials.email}; GitHub ${PORTFOLIO.socials.github}; LinkedIn ${PORTFOLIO.socials.linkedin}.`,
  );
  lines.push(
    "When a visitor asks for a project link, share the live website URL from this sheet directly.",
  );

  return lines.join("\n");
}

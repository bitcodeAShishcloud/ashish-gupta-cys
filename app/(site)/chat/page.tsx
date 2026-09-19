import type { Metadata } from "next";
import { ChatPanel } from "@/components/chat-panel";

export const metadata: Metadata = {
  title: "AI Chat — Ashish Gupta",
  description:
    "Ask Ashish's AI assistant about cybersecurity, skills, projects and the blog. Data stays in your browser.",
};

export default function ChatPage() {
  return <ChatPanel />;
}

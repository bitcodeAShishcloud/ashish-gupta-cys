import type { Metadata } from "next";
import { ChatPanel } from "@/components/chat-panel";

export const metadata: Metadata = {
  title: "Ask Ashish, Ashish Gupta",
  description:
    "Ask about Ashish's projects, skills and cybersecurity journey. Everything stays in your browser.",
};

export default function ChatPage() {
  return <ChatPanel />;
}

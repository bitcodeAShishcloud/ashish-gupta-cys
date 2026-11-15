import type { Metadata } from "next";
import { ChatPanel } from "@/components/chat-panel";

export const metadata: Metadata = {
  title: "Ask Ashish, Ashish Gupta",
  description:
    "Ask about Ashish's projects, skills and certifications — streaming replies, image and video generation. See the privacy page for how chat data is handled.",
};

export default function ChatPage() {
  return <ChatPanel />;
}

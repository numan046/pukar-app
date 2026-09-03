"use client";
import { useEffect, useState, useRef } from "react";
import { Card, Button } from "@/components/ui";
import { MessageSquare, Send, Bot, User, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How is the system performing?",
  "Total complaints",
  "Which department has most complaints?",
  "Employee workload",
  "Resolution rate",
  "Overdue complaints",
  "Citizen verification stats",
  "Category analysis",
  "Recent complaints",
];

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    // Bold
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });
    if (line.startsWith("• ") || line.startsWith("- ")) {
      // Remove the bullet prefix from parts (first 2 chars)
      const content = line.slice(2);
      const contentParts = content.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return <span key={j}>{part}</span>;
      });
      return <div key={i} className="flex gap-1.5 py-0.5"><span className="text-brand-400">•</span><span>{contentParts}</span></div>;
    }
    if (line.trim() === "") return <div key={i} className="h-1.5" />;
    return <div key={i} className="py-0.5">{parts}</div>;
  });
}

export default function CmChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm the Pukar AI analytics assistant. I can answer questions about complaint data across all departments. What would you like to know?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/cm/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        setMessages([...newMessages, { role: "assistant", content: data.answer }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: "Sorry, I couldn't process that right now. Please try again." }]);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Network error. Please check your connection and try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={20} className="text-brand-600" />
        <div>
          <h1 className="text-lg font-bold text-slate-900">AI Analytics Chatbot</h1>
          <p className="text-xs text-slate-500">Ask anything about complaint data across all departments — read-only, data-driven insights</p>
        </div>
      </div>

      {/* Chat area */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                  msg.role === "user" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"
                }`}>
                  {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-slate-50 text-slate-700 border border-slate-100"
                }`}>
                  {msg.role === "user" ? msg.content : renderMarkdown(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Bot size={16} />
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="border-t border-slate-100 px-4 py-3">
            <div className="text-xs font-medium text-slate-500 mb-2">Try asking:</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
              placeholder="Ask about complaint data, department performance, employee workload…"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
              disabled={loading}
            />
            <Button disabled={loading || !input.trim()} onClick={() => sendMessage(input)}>
              <Send size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

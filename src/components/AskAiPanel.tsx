"use client";
import { useState } from "react";
import { Card, Button } from "@/components/ui";
import { Sparkles } from "lucide-react";

const SAMPLE_QUESTIONS = [
  "Total complaints",
  "Pending complaints",
  "Resolved complaints",
  "Complaints by department",
  "Biggest problem",
];

export function AskAiPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to answer right now.");
        return;
      }
      setAnswer(data.answer);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={18} className="text-brand-600" />
        <h2 className="text-sm font-bold text-slate-900">Ask Pukar</h2>
      </div>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your data..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          onKeyDown={(e) => e.key === "Enter" && question.trim() && ask(question)}
        />
        <Button disabled={loading || !question.trim()} onClick={() => ask(question)}>
          {loading ? "…" : "Ask"}
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => { setQuestion(q); ask(q); }}
            className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 hover:border-brand-400 hover:text-brand-600"
          >
            {q}
          </button>
        ))}
      </div>
      {error && <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {answer && <div className="mt-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">{answer}</div>}
    </Card>
  );
}

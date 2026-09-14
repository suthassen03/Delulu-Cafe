"use client";

import { useState } from "react";
import { useT } from "@/i18n/LocaleProvider";
import { askAI, generateSummary } from "@/app/(app)/ai/actions";

const EXAMPLES = [
  "How much chicken do we have left?",
  "What should I order tomorrow?",
  "What products are likely to run out this weekend?",
  "How much coffee did we use this week?",
  "Why has our milk consumption increased?",
  "How much money did we lose through waste this month?",
  "Which supplier has increased their prices?",
  "What are our most profitable menu items?",
];

interface Message { role: "user" | "assistant"; text: string; }

export function AiClient({ hasKey }: { hasKey: boolean }) {
  const t = useT();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  async function send(question: string) {
    if (!question.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    const answer = await askAI(question);
    setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{t("ai.title")}</h1>
        <p className="text-sm text-slate-500">{t("ai.subtitle")}</p>
        {!hasKey && <p className="mt-1 text-xs text-slate-400">{t("ai.noKeyNotice")}</p>}
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">{t("ai.dailySummary")}</h2>
          <button
            className="btn-secondary !py-1 !px-2.5 text-xs"
            disabled={summaryLoading}
            onClick={async () => { setSummaryLoading(true); setSummary(await generateSummary()); setSummaryLoading(false); }}
          >
            {t("ai.generateSummary")}
          </button>
        </div>
        {summary && <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{summary}</pre>}
      </div>

      <div className="card flex h-[420px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">{t("ai.examples")}</p>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button key={ex} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={() => send(ex)}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[85%] rounded-xl px-3.5 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "ml-auto bg-brand-600 text-white" : "bg-slate-100 text-slate-800"}`}>
              {m.text}
            </div>
          ))}
          {loading && <div className="max-w-[60%] rounded-xl bg-slate-100 px-3.5 py-2 text-sm text-slate-400">{t("common.loading")}</div>}
        </div>
        <form
          className="mt-3 flex gap-2 border-t border-slate-100 pt-3"
          onSubmit={(e) => { e.preventDefault(); send(input); }}
        >
          <input className="input" placeholder={t("ai.askPlaceholder")} value={input} onChange={(e) => setInput(e.target.value)} />
          <button type="submit" className="btn-primary" disabled={loading}>{t("ai.send")}</button>
        </form>
      </div>
    </div>
  );
}

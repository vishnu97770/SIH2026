import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { Icon } from "../components/Icon";
import { formatNumber } from "../utils/format";

export function Assistant() {
  const [suggestions, setSuggestions] = useState([]);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCitation, setSelectedCitation] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [suggestionPack, sessionPack] = await Promise.all([api.suggestions(), api.session()]);
        setSuggestions(suggestionPack.suggestions || []);
        setSession(sessionPack.session);
      } catch {
        setSuggestions([
          "Summarize this dataset",
          "Why did production fall?",
          "Which mine is performing best?",
          "Show major anomalies",
        ]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendQuestion = async (question) => {
    const q = (question ?? input).trim();
    if (!q || loading) return;

    setMessages((current) => [...current, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await api.askAssistant(q);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: res.answer,
          citations: res.citations || [],
          grounding: res.grounding,
          context: res.context,
        },
      ]);
    } catch (err) {
      setMessages((current) => [...current, { role: "error", text: err.message || "Chat failed." }]);
      setError(err.message || "Chat failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr,0.8fr]">
      {selectedCitation && (
        <CitationModal citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
      )}

      <div className="flex min-h-[70vh] flex-col rounded-3xl border border-stone-200 bg-[#fffaf1] shadow-sm">
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
            <Icon name="assistant" className="h-4 w-4 text-amber-600" />
            AI Mining Assistant
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Ask grounded questions about the uploaded dataset. The backend calculates the numbers
            first and Groq explains the result.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.length === 0 && !loading && (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-6 py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <Icon name="search" className="h-6 w-6" />
              </div>
              <div className="text-sm font-semibold text-stone-800">Start a grounded analysis</div>
              <p className="mt-1 max-w-lg text-xs leading-5 text-stone-500">
                Try asking about production decline, best-performing mines, anomaly reasons, or
                the forecast for the next few years.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} onCitationClick={setSelectedCitation} />
          ))}

          {loading && <TypingIndicator />}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-stone-200 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuestion();
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about production, anomalies, targets, or forecast..."
              className="flex-1 rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ask
            </button>
          </form>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-stone-200 bg-[#fffaf1] p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Suggested questions</div>
          <div className="mt-3 space-y-2">
            {suggestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => sendQuestion(question)}
                disabled={loading}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-left text-sm text-stone-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-[#fffaf1] p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Session summary</div>
          <div className="mt-3 space-y-2 text-sm">
            <SummaryRow label="Dataset" value={session?.source_name || "No dataset uploaded"} />
            <SummaryRow label="Rows" value={formatNumber(session?.row_count)} />
            <SummaryRow label="Quality" value={`${session?.quality?.quality_score ?? "N/A"} / 100`} />
            <SummaryRow label="Years" value={session?.quality?.year_range?.join(" - ") || "N/A"} />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMessages([])}
              className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              Clear conversation
            </button>
            <button
              type="button"
              onClick={() => sendQuestion("Generate an executive summary for this dataset")}
              className="flex-1 rounded-xl bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              Executive summary
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function MessageBubble({ message, onCitationClick }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-amber-600 px-4 py-3 text-sm text-white">
          {message.text}
        </div>
      </div>
    );
  }

  if (message.role === "error") {
    return (
      <div className="flex justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white">
        <Icon name="assistant" className="h-4 w-4" />
      </div>
      <div className="min-w-0 max-w-[85%]">
        <div className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{message.text}</div>
        {message.grounding && (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-emerald-800">Grounding confidence</div>
                <div className="mt-0.5 text-[10px] text-emerald-700">{message.grounding.method}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-800">{message.grounding.percent}%</div>
                <div className="text-[10px] text-emerald-700">{message.grounding.label}</div>
              </div>
            </div>
          </div>
        )}
        {message.citations?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.citations.map((citation, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onCitationClick(citation)}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
              >
                {citation.document} · p.{citation.page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white">
        <Icon name="assistant" className="h-4 w-4" />
      </div>
      <div className="flex gap-1 pt-2">
        <span className="h-2 w-2 animate-bounce rounded-full bg-stone-300" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-stone-300 [animation-delay:120ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-stone-300 [animation-delay:240ms]" />
      </div>
    </div>
  );
}

function CitationModal({ citation, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-3xl bg-[#fffaf1] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Evidence source</div>
            <h3 className="mt-1 text-lg font-semibold text-stone-900">
              {citation.document} <span className="text-sm font-normal text-stone-500">p.{citation.page}</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
          >
            Close
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-stone-600">{citation.snippet}</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-3 py-2">
      <span className="text-stone-500">{label}</span>
      <span className="font-semibold text-stone-800">{value}</span>
    </div>
  );
}


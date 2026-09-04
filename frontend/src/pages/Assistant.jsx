import { useEffect, useRef, useState } from "react";
import { apiJson } from "../api/client";
import { suggestions } from "../data/mockData";
import { Icon } from "../components/Icon";

export function Assistant() {
  const [suggested, setSuggested] = useState(suggestions);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCitation, setSelectedCitation] = useState(null);
  const endRef = useRef(null);

  const loadSuggestions = async () => {
    try {
      const res = await apiJson("/assistant/suggestions");
      if (res?.suggestions?.length) setSuggested(res.suggestions);
    } catch {
      /* keep local suggestions if backend unavailable */
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendQuestion = async (question) => {
    const q = (question ?? input).trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await apiJson("/ask", "POST", { question: q });
      setMessages((m) => [
        ...m,
        { role: "assistant", text: res.answer, citations: res.citations, grounding: res.grounding },
      ]);
    } catch (err) {
      setMessages((m) => [...m, { role: "error", text: err.message }]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    sendQuestion();
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 lg:flex-row">
      {selectedCitation && (
        <CitationModal citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
      )}

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-stone-200 bg-[#fffaf1] shadow-sm">
        <div className="border-b border-stone-200 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
            <Icon name="assistant" className="h-4 w-4 text-amber-600" />
            AI Mining Assistant
          </h3>
          <p className="mt-0.5 text-xs text-stone-500">
            Ask questions about mining and geological records. Answers are grounded in source
            documents.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.length === 0 && !loading && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Icon name="search" className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-stone-700">Ask a question about Mine X</p>
              <p className="mt-1 max-w-sm text-xs text-stone-400">
                Ask about production trends, the 2024 decline, or geological conditions.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <MessageBubble
              key={i}
              m={m}
              onCite={(c) => setSelectedCitation(c)}
            />
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-white">
                <Icon name="assistant" className="h-4 w-4" />
              </div>
              <div className="flex gap-1 pt-2">
                <span className="h-2 w-2 animate-bounce rounded-full bg-stone-300" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-stone-300 [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-stone-300 [animation-delay:240ms]" />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {error} Showing you the chat interface — make sure the backend is running.
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="border-t border-stone-200 p-3">
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Mine X production, geological factors, inspections..."
              className="flex-1 rounded-lg border border-stone-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ask
            </button>
          </form>
        </div>
      </div>

      <aside className="w-full shrink-0 rounded-xl border border-stone-200 bg-[#fffaf1] p-4 shadow-sm lg:w-80">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
          Suggested questions
        </h4>
        <div className="space-y-2">
          {suggested.map((s, i) => (
            <button
              key={i}
              onClick={() => sendQuestion(s)}
              disabled={loading}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-left text-sm text-stone-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-stone-600">Knowledge base</div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">INDEXED</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-md bg-[#fffaf1] p-2"><div className="text-sm font-bold text-stone-800">128</div><div className="text-[10px] text-stone-400">Documents</div></div>
            <div className="rounded-md bg-[#fffaf1] p-2"><div className="text-sm font-bold text-stone-800">1,842</div><div className="text-[10px] text-stone-400">Chunks</div></div>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-stone-400">Retrieve → rank → ground → answer. Index status is available for every uploaded document.</p>
        </div>
      </aside>
    </div>
  );
}

function MessageBubble({ m, onCite }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-amber-600 px-4 py-2.5 text-sm text-white">
          {m.text}
        </div>
      </div>
    );
  }
  if (m.role === "error") {
    return (
      <div className="flex justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {m.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white">
        <Icon name="assistant" className="h-4 w-4" />
      </div>
      <div className="min-w-0 max-w-[85%]">
        <div className="leading-relaxed text-sm text-stone-700">{m.text}</div>
        {m.grounding && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-emerald-800">Grounding confidence</div>
                <div className="mt-0.5 text-[10px] text-emerald-700">{m.grounding.method}</div>
              </div>
              <div className="text-right"><div className="text-lg font-bold text-emerald-800">{m.grounding.percent}%</div><div className="text-[10px] font-semibold text-emerald-700">{m.grounding.label}</div></div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-emerald-500" style={{width: `${m.grounding.percent}%`}} /></div>
            <div className="mt-2 text-[10px] text-emerald-700">{m.grounding.evidenceCount} source chunks used · answers are restricted to indexed evidence.</div>
          </div>
        )}
        {m.citations?.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Evidence
            </div>
            <div className="flex flex-wrap gap-2">
              {m.citations.map((c, i) => (
                <button
                  key={i}
                  onClick={() => onCite(c)}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
                >
                  {c.document} · p.{c.page} · {Math.round((c.retrievalScore || 0.9) * 100)}% match
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CitationModal({ citation, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-[#fffaf1] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Evidence source
            </div>
            <h3 className="text-lg font-semibold text-stone-900">
              {citation.document}
              <span className="ml-2 text-sm font-normal text-stone-500">p.{citation.page}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="text-sm leading-relaxed text-stone-600">{citation.snippet}</p>
        <p className="mt-4 text-xs text-stone-400">
          Demo/sample document — not an official government record.
        </p>
      </div>
    </div>
  );
}

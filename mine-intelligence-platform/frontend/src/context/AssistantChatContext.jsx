import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AssistantChatContext = createContext(null);
const STORAGE_KEY = "mi_assistant_conversations";

function loadConversations() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* ignore corrupt storage */
  }
  return [makeConversation()];
}

function makeConversation() {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    createdAt: Date.now(),
  };
}

function titleFromQuestion(question) {
  const trimmed = question.trim();
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
}

export function AssistantChatProvider({ children }) {
  const [conversations, setConversations] = useState(loadConversations);
  const [activeId, setActiveId] = useState(() => loadConversations()[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      /* storage full or unavailable - conversation still works for this tab */
    }
  }, [conversations]);

  const activeConversation = conversations.find((c) => c.id === activeId) || conversations[0];

  const updateConversation = (id, updater) => {
    setConversations((current) => current.map((c) => (c.id === id ? updater(c) : c)));
  };

  const newConversation = () => {
    const conversation = makeConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setError("");
    return conversation.id;
  };

  const switchConversation = (id) => {
    setActiveId(id);
    setError("");
  };

  const closeConversation = (id) => {
    setConversations((current) => {
      const remaining = current.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const fresh = makeConversation();
        if (id === activeId) setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(remaining[0].id);
      return remaining;
    });
  };

  const clearActiveConversation = () => {
    updateConversation(activeId, (c) => ({ ...c, messages: [] }));
  };

  const sendQuestion = async (question) => {
    const q = question.trim();
    if (!q || loading) return;

    const conversationId = activeId;
    updateConversation(conversationId, (c) => ({
      ...c,
      title: c.messages.length === 0 ? titleFromQuestion(q) : c.title,
      messages: [...c.messages, { role: "user", text: q }],
    }));
    setLoading(true);
    setError("");

    try {
      const res = await api.askAssistant(q);
      updateConversation(conversationId, (c) => ({
        ...c,
        messages: [
          ...c.messages,
          {
            role: "assistant",
            text: res.answer,
            citations: res.citations || [],
            grounding: res.grounding,
            context: res.context,
          },
        ],
      }));
    } catch (err) {
      const message = err.message || "Chat failed.";
      updateConversation(conversationId, (c) => ({
        ...c,
        messages: [...c.messages, { role: "error", text: message }],
      }));
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AssistantChatContext.Provider
      value={{
        conversations,
        activeConversation,
        loading,
        error,
        sendQuestion,
        newConversation,
        switchConversation,
        closeConversation,
        clearActiveConversation,
      }}
    >
      {children}
    </AssistantChatContext.Provider>
  );
}

export function useAssistantChat() {
  return useContext(AssistantChatContext);
}

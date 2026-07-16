"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  getAssistantConfig,
  getAssistantConversations,
  getAssistantConversation,
  deleteAssistantConversation,
  streamAssistantMessage,
  type AssistantStreamMeta,
} from "@/lib/api/client";
import {
  Loader2,
  AlertTriangle,
  Send,
  Plus,
  Trash2,
  ShieldAlert,
  RefreshCw,
  Siren,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;      // true while tokens are still arriving
  urgency?: string;
  intent?: string;
  show_sos?: boolean;
  suggested_route?: string | null;
  actions?: string[];
  created_at?: string;
  disclaimer?: string;
}

interface AssistantConfig {
  enabled: boolean;
  provider?: string;
  streaming?: boolean;
  max_input_characters?: number;
  disclaimer?: string;
}

// ── Urgent keyword pre-check (mirrors backend safety.py) ─────────────────
// Critical emergencies get a local warning card immediately — before any
// network call — so the user sees SOS actions without waiting for the AI.
const URGENT_KEYWORDS = [
  "bleed", "can't breathe", "cannot breathe", "choking", "chest pain",
  "unconscious", "stroke", "seizure", "heart attack", "stabbing", "shooting",
  "suicide", "kill myself", "poisoning", "poison", "major accident",
];

function isUrgentMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return URGENT_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Component ─────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const router = useRouter();
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Holds the AbortController for the active SSE stream so we can cancel on unmount
  const streamAbortRef = useRef<AbortController | null>(null);

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const conf = await getAssistantConfig();
        setConfig(conf);
        if (conf.enabled) {
          try {
            const convs = await getAssistantConversations();
            setConversations(Array.isArray(convs) ? convs : []);
          } catch {
            setConversations([]);
          }
        }
      } catch {
        // Backend unreachable — show temporary unavailable, not "disabled"
        setConfigError(true);
        setConfig({ enabled: true, max_input_characters: 4000 });
      } finally {
        setLoading(false);
      }
    }
    init();

    // Cancel any in-flight stream on unmount
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Conversation management ──────────────────────────────────────────────
  const loadConversation = async (id: string) => {
    setLoading(true);
    try {
      const res = await getAssistantConversation(id);
      setActiveConvId(id);
      const normalized: Message[] = (res.messages ?? []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        urgency: m.urgency,
        intent: m.intent,
        created_at: m.created_at,
      }));
      setMessages(normalized);
    } catch {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setActiveConvId(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const newConversation = () => {
    setActiveConvId(null);
    setMessages([]);
  };

  const deleteConversation = async (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) newConversation();
    try {
      await deleteAssistantConversation(id);
    } catch {
      // 404 means already gone — no action needed
    }
  };

  // ── Send message (SSE streaming) ─────────────────────────────────────────
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || sending) return;
      const msg = text.trim();
      setInput("");

      // Local urgent check — show SOS card immediately without waiting for AI
      const urgent = isUrgentMessage(msg);

      // Optimistic user message
      const userMsgId = `user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: msg, created_at: new Date().toISOString() },
      ]);

      if (urgent) {
        // Critical path — append urgent card immediately
        const urgentId = `urgent-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: urgentId,
            role: "assistant",
            content:
              "This sounds like a critical emergency. Please call your local emergency services immediately and use the SOS button below.",
            urgency: "critical",
            show_sos: true,
            actions: [
              "Call emergency services (911 / 112 / your local number).",
              "Use the SOS button to alert nearby responders.",
              "Stay calm and follow dispatcher instructions.",
            ],
            created_at: new Date().toISOString(),
          },
        ]);
        // Still send to AI for additional guidance after the immediate card
      }

      setSending(true);

      // Placeholder streaming message
      const streamId = `stream-${Date.now()}`;
      if (!urgent) {
        setMessages((prev) => [
          ...prev,
          { id: streamId, role: "assistant", content: "", streaming: true },
        ]);
      }

      let accumulatedText = "";
      let metaReceived: AssistantStreamMeta | null = null;

      // Cancel any previous stream
      streamAbortRef.current?.abort();

      const abortController = streamAssistantMessage(
        {
          message: msg,
          conversation_id: activeConvId,
        },
        {
          onToken(text) {
            accumulatedText += text;
            if (!urgent) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamId
                    ? { ...m, content: accumulatedText, streaming: true }
                    : m
                )
              );
            }
          },
          onMeta(meta) {
            metaReceived = meta;
            // Update the active conversation ID if this was a new conversation
            if (meta.conversation_id && !activeConvId) {
              setActiveConvId(meta.conversation_id);
              // Refresh sidebar
              getAssistantConversations()
                .then((convs) => setConversations(Array.isArray(convs) ? convs : []))
                .catch(() => {});
            }
          },
          onDone() {
            setSending(false);
            streamAbortRef.current = null;
            if (!urgent) {
              // Finalize the streaming message with metadata
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamId
                    ? {
                        ...m,
                        content: accumulatedText,
                        streaming: false,
                        urgency: metaReceived?.urgency,
                        intent: metaReceived?.intent,
                        show_sos: metaReceived?.show_sos,
                        suggested_route: metaReceived?.suggested_route,
                        actions: metaReceived?.actions,
                      }
                    : m
                )
              );
            }
          },
          onError(errorMessage) {
            setSending(false);
            streamAbortRef.current = null;
            if (!urgent) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamId
                    ? { ...m, content: errorMessage, streaming: false, urgency: "routine" }
                    : m
                )
              );
            }
          },
        }
      );

      streamAbortRef.current = abortController;
    },
    [sending, activeConvId]
  );

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading && !config) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // ── Disabled state (only when backend explicitly returns enabled=false) ──
  // configError means the backend was unreachable — show temporary unavailable,
  // NOT "disabled", because the feature is enabled but the service is down.
  if (config && !config.enabled && !configError) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-4 text-slate-500">
        <ShieldAlert className="h-12 w-12 text-slate-400" />
        <p className="text-lg font-medium">Assistant is currently disabled.</p>
        <p className="text-sm text-slate-400">Contact your administrator to enable the AI Assistant.</p>
      </div>
    );
  }

  // ── Temporary unavailable (backend unreachable but feature is enabled) ───
  if (configError) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-4 text-slate-500">
        <AlertTriangle className="h-12 w-12 text-amber-400" />
        <p className="text-lg font-medium">AI Assistant is temporarily unavailable.</p>
        <p className="text-sm text-slate-400">Please try again in a moment.</p>
        <Button
          variant="outline"
          className="mt-2 flex items-center gap-2"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-200 bg-slate-50 flex-col hidden md:flex">
        <div className="p-4 border-b border-slate-200">
          <Button
            onClick={newConversation}
            className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`p-3 text-sm rounded-md cursor-pointer flex justify-between items-center group mb-1 ${
                activeConvId === c.id
                  ? "bg-blue-100 text-blue-900"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
              onClick={() => loadConversation(c.id)}
            >
              <span className="truncate flex-1">{c.title || "Conversation"}</span>
              <Trash2
                className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(c.id);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Disclaimer banner */}
        <div className="p-3 bg-white border-b border-slate-200 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span>
            {config?.disclaimer ||
              "This assistant provides general info only — not professional medical care. For emergencies call 911."}
          </span>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <ShieldAlert className="h-16 w-16 mb-4 text-blue-200" />
              <h2 className="text-xl font-semibold text-slate-700 mb-2">Medicare Assistant</h2>
              <p className="text-sm mb-8 text-center max-w-md text-slate-500">
                I can help with general emergency guidance, app navigation, and finding nearby services.
                <br />
                <span className="text-red-500 font-medium">
                  For life-threatening emergencies, call 911 immediately.
                </span>
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {[
                  "How do I use the SOS button?",
                  "Find a nearby hospital",
                  "First aid for minor cuts",
                  "What should I include in a request?",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="bg-white border border-slate-200 rounded-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm"
                    }`}
                  >
                    {/* Message text — show cursor while streaming */}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {m.content}
                      {m.streaming && (
                        <span className="inline-block w-2 h-4 ml-0.5 bg-blue-400 animate-pulse rounded-sm align-text-bottom" />
                      )}
                    </p>

                    {/* ── Critical / urgent warning card ── */}
                    {m.role === "assistant" && m.urgency === "critical" && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-red-700 font-semibold mb-2 text-sm">
                          <Siren className="h-5 w-5 flex-shrink-0" />
                          Critical Emergency — Act Now
                        </div>
                        <p className="text-xs text-red-600 mb-3">
                          Call your local emergency services immediately (911 / 112).
                          Do not wait for an AI response.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white text-xs"
                            onClick={() => router.push("/dashboard/emergency")}
                          >
                            <Siren className="h-4 w-4 mr-1" />
                            Send SOS Request
                          </Button>
                          <Button
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50 text-xs"
                            onClick={() => router.push("/dashboard/nearby")}
                          >
                            Find Nearby Help
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ── Suggested actions list ── */}
                    {m.role === "assistant" &&
                      m.actions &&
                      m.actions.length > 0 &&
                      m.urgency !== "critical" && (
                        <ul className="mt-3 space-y-1">
                          {m.actions.map((act, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span className="text-blue-500 font-bold">•</span> {act}
                            </li>
                          ))}
                        </ul>
                      )}

                    {/* ── Suggested route button ── */}
                    {m.role === "assistant" &&
                      m.suggested_route &&
                      m.urgency !== "critical" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 border-blue-200 text-blue-700 hover:bg-blue-50 text-xs"
                          onClick={() => router.push(m.suggested_route!)}
                        >
                          Go to Action
                        </Button>
                      )}
                  </div>
                </div>
              ))}

              {/* Typing indicator while waiting for first token */}
              {sending && !messages.some((m) => m.streaming) && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form
            className="flex gap-2 max-w-3xl mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              className="flex-1 rounded-full border border-slate-300 px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={config?.max_input_characters ?? 4000}
              disabled={sending}
              aria-label="Assistant message input"
            />
            <Button
              type="submit"
              disabled={!input.trim() || sending}
              className="rounded-full w-12 h-12 p-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5 ml-0.5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { 
  getAssistantConfig, 
  sendAssistantMessage, 
  getAssistantConversations, 
  getAssistantConversation, 
  deleteAssistantConversation 
} from "@/lib/api/client";
import { Loader2, AlertTriangle, Send, Plus, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export default function AssistantPage() {
  const router = useRouter();
  const [config, setConfig] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
            // Tables may not exist yet — start with empty list, don't crash
            setConversations([]);
          }
        }
      } catch (e) {
        console.error("[assistant] init error:", e);
        // Config fetch failed (backend may be down) — show disabled state
        setConfig({ enabled: false, disclaimer: "", max_input_characters: 4000 });
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = async (id: string) => {
    setLoading(true);
    try {
      const res = await getAssistantConversation(id);
      setActiveConvId(id);
      setMessages(Array.isArray(res.messages) ? res.messages : []);
    } catch (e: any) {
      console.error("[assistant] load conversation error:", e);
      // Conversation no longer exists — remove it from the sidebar and start fresh
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
    // Optimistically remove from UI immediately
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) newConversation();
    try {
      await deleteAssistantConversation(id);
    } catch (e: any) {
      console.error("[assistant] delete conversation error:", e);
      // 404 means it was already gone — that's fine, UI is already updated
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    const msg = text.trim();
    setInput("");

    // Optimistic user message
    const tempId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: msg, created_at: new Date().toISOString() },
    ]);
    setSending(true);

    try {
      const res = await sendAssistantMessage({
        message: msg,
        conversation_id: activeConvId,
      });

      // If this was a new conversation, update the active ID and refresh sidebar
      if (!activeConvId && res.conversation_id) {
        setActiveConvId(res.conversation_id);
        try {
          const convs = await getAssistantConversations();
          setConversations(Array.isArray(convs) ? convs : []);
        } catch {
          // Non-fatal — sidebar just won't update
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: res.message_id,
          role: "assistant",
          content: res.answer,
          intent: res.intent,
          urgency: res.urgency,
          actions: res.actions,
          suggested_route: res.suggested_route,
          should_show_sos: res.should_show_sos,
          created_at: res.created_at,
          disclaimer: res.disclaimer,
        },
      ]);
    } catch (e: any) {
      const errMsg =
        e?.message === "AI Assistant is currently disabled."
          ? "The AI Assistant is currently unavailable. Please try again later."
          : e?.status === 429
          ? "You have sent too many messages. Please wait a moment and try again."
          : e?.status === 503
          ? "The AI Assistant is currently unavailable. Please try again later."
          : "I'm unable to respond right now. Please try again in a moment.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: errMsg,
          urgency: "routine",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (config && !config.enabled) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-4 text-slate-500">
        <ShieldAlert className="h-12 w-12" />
        <p>Assistant is currently disabled.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-slate-200">
          <Button onClick={newConversation} className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((c) => (
            <div 
              key={c.id} 
              className={`p-3 text-sm rounded-md cursor-pointer flex justify-between items-center group mb-1 ${activeConvId === c.id ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-200 text-slate-700'}`}
              onClick={() => loadConversation(c.id)}
            >
              <span className="truncate flex-1">{c.title || "Conversation"}</span>
              <Trash2 className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity" onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }} />
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 bg-white border-b border-slate-200 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>{config?.disclaimer || "This assistant provides general info, not professional medical care."}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <ShieldAlert className="h-16 w-16 mb-4 text-blue-200" />
              <h2 className="text-xl font-semibold text-slate-700 mb-2">Medicare Assistant</h2>
              <p className="text-sm mb-8 text-center max-w-md">I can help with general emergency guidance, app navigation, and finding nearby services.</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {[
                  "How do I use the SOS button?",
                  "Find a nearby hospital",
                  "First aid for minor cuts",
                  "What should I include in a request?"
                ].map(prompt => (
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
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                    
                    {m.role === 'assistant' && m.urgency === 'critical' && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                          <AlertTriangle className="h-5 w-5" />
                          Critical Emergency Warning
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button 
                            variant="destructive" 
                            className="bg-red-600 hover:bg-red-700 text-white text-xs"
                            onClick={() => router.push('/dashboard/emergency')}
                          >
                            Send SOS Request
                          </Button>
                          <Button 
                            variant="outline" 
                            className="border-red-200 text-red-700 hover:bg-red-100 text-xs"
                            onClick={() => router.push('/dashboard/nearby')}
                          >
                            Find Nearby Help
                          </Button>
                        </div>
                      </div>
                    )}

                    {m.role === 'assistant' && m.actions && m.actions.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {m.actions.map((act: string, i: number) => (
                          <li key={i} className="text-sm flex gap-2"><span className="text-blue-500 font-bold">•</span> {act}</li>
                        ))}
                      </ul>
                    )}

                    {m.role === 'assistant' && m.suggested_route && m.urgency !== 'critical' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3 border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => router.push(m.suggested_route)}
                      >
                        Go to Action
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm flex items-center gap-2">
                    <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce"></span>
                    <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-75"></span>
                    <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-150"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
          <form 
            className="flex gap-2 max-w-3xl mx-auto relative" 
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 rounded-full border border-slate-300 px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={config?.max_input_characters || 4000}
              disabled={sending}
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || sending}
              className="rounded-full w-12 h-12 p-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white shrink-0"
            >
              <Send className="h-5 w-5 ml-1" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { MessageCircle, X, Send, HelpCircle, Bug, Lightbulb, Bot, Mail, ArrowUp } from "lucide-react";
import { getAIResponse } from "../data/appKnowledgeBase";
import { sendAIChatMessage } from "../api/aiChat";
import gsap from "gsap";

interface SupportWidgetProps {
  recipientEmail?: string;
}

type RequestType = "question" | "bug" | "suggestion";
type ActiveTab = "ai" | "contact";

interface ChatMessage {
  id: number;
  text: string;
  sender: "user" | "bot";
}

const requestTypeLabels: Record<RequestType, { label: string; icon: typeof HelpCircle }> = {
  question: { label: "Domanda", icon: HelpCircle },
  bug: { label: "Segnala Bug", icon: Bug },
  suggestion: { label: "Suggerimento", icon: Lightbulb },
};

const quickSuggestions = [
  "Come creo una lista?",
  "Come funziona l'offline?",
  "Come condivido una lista?",
  "Come installo l'app?",
];

export default function SupportWidget({
  recipientEmail = "luigibalestrucci52@gmail.com",
}: SupportWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("ai");

  // Contact form state
  const [requestType, setRequestType] = useState<RequestType>("question");
  const [subject, setSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  // AI chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      text: "Ciao! 👋 Sono l'assistente virtuale di ToDoApp. Chiedimi qualsiasi cosa sulle funzionalita dell'app!",
      sender: "bot",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const widgetRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // GSAP animation for panel open
  useLayoutEffect(() => {
    if (isOpen && panelRef.current) {
      setIsAnimating(true);
      gsap.fromTo(
        panelRef.current,
        {
          opacity: 0,
          scale: 0.8,
          y: 20,
          transformOrigin: "bottom right",
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.35,
          ease: "back.out(1.4)",
          onComplete: () => {
            setIsAnimating(false);
            chatInputRef.current?.focus();
          },
        }
      );
    }
  }, [isOpen]);

  // GSAP animation for button
  useEffect(() => {
    if (!isOpen && buttonRef.current) {
      gsap.fromTo(
        buttonRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
      );
    }
  }, [isOpen]);

  // Animate new messages
  useEffect(() => {
    if (messagesContainerRef.current && chatMessages.length > 1) {
      const lastMessage = messagesContainerRef.current.lastElementChild?.previousElementSibling;
      if (lastMessage) {
        gsap.fromTo(
          lastMessage,
          { opacity: 0, y: 10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: "power2.out" }
        );
      }
    }
  }, [chatMessages]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node) && !isAnimating) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isAnimating]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isTyping]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    if (panelRef.current && !isAnimating) {
      setIsAnimating(true);
      gsap.to(panelRef.current, {
        opacity: 0,
        scale: 0.8,
        y: 20,
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => {
          setIsOpen(false);
          setSent(false);
          setIsAnimating(false);
        },
      });
    }
  };

  const handleSendMessage = async (text?: string) => {
    const msg = text || chatInput.trim();
    if (!msg || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      text: msg,
      sender: "user",
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsTyping(true);

    // Build conversation history for AI context
    const history = chatMessages
      .filter((m) => m.id !== 0)
      .map((m) => ({
        role: m.sender === "user" ? "user" as const : "assistant" as const,
        content: m.text,
      }));

    try {
      // Try real AI first
      if (navigator.onLine) {
        const response = await sendAIChatMessage(msg, history);
        const botMsg: ChatMessage = {
          id: Date.now() + 1,
          text: response.reply,
          sender: "bot",
        };
        setChatMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
        return;
      }
    } catch {
      // Fall through to local fallback
    }

    // Fallback: local keyword matching (works offline)
    setTimeout(() => {
      const response = getAIResponse(msg);
      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        text: response,
        sender: "bot",
      };
      setChatMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !contactMessage.trim()) return;

    setIsSending(true);

    const emailSubject = `[ToDo App - ${requestTypeLabels[requestType].label}] ${subject}`;
    const emailBody = `Tipo: ${requestTypeLabels[requestType].label}\n\nMessaggio:\n${contactMessage}\n\n---\nInviato da ToDo WebApp`;
    const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    window.location.href = mailtoLink;

    setTimeout(() => {
      setIsSending(false);
      setSent(true);

      setTimeout(() => {
        handleClose();
        setTimeout(() => {
          setSubject("");
          setContactMessage("");
          setSent(false);
        }, 300);
      }, 2000);
    }, 500);
  };

  const handleTabChange = (tab: ActiveTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  return (
    <div ref={widgetRef} className="fixed bottom-24 right-4 z-50 lg:bottom-8">
      {/* Chat bubble button */}
      {!isOpen && (
        <button
          ref={buttonRef}
          onClick={handleOpen}
          className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-2xl
                     flex items-center justify-center hover:scale-110 transition-transform duration-200"
          title="Assistenza"
        >
          <MessageCircle size={26} />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="w-[calc(100vw-32px)] sm:w-96 max-w-[384px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
          style={{ maxHeight: "min(70vh, 520px)" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  {activeTab === "ai" ? <Bot size={22} /> : <Mail size={22} />}
                </div>
                <div>
                  <h3 className="font-semibold text-base">
                    {activeTab === "ai" ? "Assistente AI" : "Contattaci"}
                  </h3>
                  <p className="text-xs text-white/80">
                    {activeTab === "ai" ? "Risposte immediate sull'app" : "Invia una richiesta"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={() => handleTabChange("ai")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all relative ${
                activeTab === "ai"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Bot size={16} />
              <span>Assistente AI</span>
              {activeTab === "ai" && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => handleTabChange("contact")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all relative ${
                activeTab === "contact"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Mail size={16} />
              <span>Contattaci</span>
              {activeTab === "contact" && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          </div>

          {/* === AI TAB === */}
          {activeTab === "ai" && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
                style={{ minHeight: "180px" }}
              >
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md shadow-sm"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-md"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "0.6s" }} />
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms", animationDuration: "0.6s" }} />
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms", animationDuration: "0.6s" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Quick suggestions (only if few messages) */}
              {chatMessages.length <= 2 && !isTyping && (
                <div className="px-4 pb-3 flex-shrink-0">
                  <div className="flex flex-wrap gap-1.5">
                    {quickSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSendMessage(suggestion)}
                        disabled={isTyping}
                        className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex items-center gap-2">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Chiedi qualcosa sull'app..."
                    disabled={isTyping}
                    className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600
                             rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                             text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!chatInput.trim() || isTyping}
                    className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700
                             disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700
                             text-white rounded-full flex items-center justify-center transition-all disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
                  >
                    <ArrowUp size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* === CONTACT TAB === */}
          {activeTab === "contact" && (
            <div className="flex-1 overflow-y-auto">
              {sent ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send size={32} className="text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Email pronta!
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Si aprira il tuo client email per inviarla
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                  {/* Request type selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tipo di richiesta
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(requestTypeLabels) as RequestType[]).map((type) => {
                        const { label, icon: Icon } = requestTypeLabels[type];
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setRequestType(type)}
                            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                              requestType === type
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                          >
                            <Icon size={20} />
                            <span className="text-xs font-medium">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Oggetto
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Breve descrizione..."
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600
                               rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                               text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                      required
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Messaggio
                    </label>
                    <textarea
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Descrivi la tua richiesta..."
                      rows={3}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600
                               rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                               text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none text-sm"
                      required
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSending || !subject.trim() || !contactMessage.trim()}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl
                             hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isSending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Invio...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Invia Email
                      </>
                    )}
                  </button>

                  <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                    Si aprira il tuo client email predefinito
                  </p>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

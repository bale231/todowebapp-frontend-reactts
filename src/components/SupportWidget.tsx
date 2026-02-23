import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, HelpCircle, Bug, Lightbulb, Bot, Mail, ArrowUp } from "lucide-react";
import { getAIResponse } from "../data/appKnowledgeBase";

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
      text: "Ciao! Sono l'assistente virtuale di ToDoApp. Chiedimi qualsiasi cosa sulle funzionalita dell'app!",
      sender: "bot",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const widgetRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  const handleSendMessage = (text?: string) => {
    const msg = text || chatInput.trim();
    if (!msg) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      text: msg,
      sender: "user",
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = getAIResponse(msg);
      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        text: response,
        sender: "bot",
      };
      setChatMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600 + Math.random() * 400);
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
        setSent(false);
        setSubject("");
        setContactMessage("");
        setIsOpen(false);
      }, 2000);
    }, 500);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSent(false);
  };

  return (
    <div ref={widgetRef} className="fixed bottom-24 right-4 z-50 lg:bottom-8">
      {/* Chat bubble button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-2xl
                     flex items-center justify-center hover:scale-110 transition-all duration-300
                     animate-bounce-slow"
          title="Assistenza"
        >
          <MessageCircle size={26} />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in flex flex-col" style={{ maxHeight: "70vh" }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  {activeTab === "ai" ? <Bot size={22} /> : <MessageCircle size={22} />}
                </div>
                <div>
                  <h3 className="font-semibold">
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
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
                activeTab === "ai"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Bot size={16} />
              Assistente AI
            </button>
            <button
              onClick={() => setActiveTab("contact")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
                activeTab === "contact"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Mail size={16} />
              Contattaci
            </button>
          </div>

          {/* === AI TAB === */}
          {activeTab === "ai" && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "320px", minHeight: "200px" }}>
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line ${
                        msg.sender === "user"
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md"
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
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Quick suggestions (only if few messages) */}
              {chatMessages.length <= 2 && (
                <div className="px-4 pb-2 flex-shrink-0">
                  <div className="flex flex-wrap gap-1.5">
                    {quickSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSendMessage(suggestion)}
                        disabled={isTyping}
                        className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Chiedi qualcosa sull'app..."
                    disabled={isTyping}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                             rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                             text-sm text-gray-900 dark:text-white placeholder-gray-500 disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!chatInput.trim() || isTyping}
                    className="w-10 h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700
                             text-white rounded-full flex items-center justify-center transition-colors disabled:cursor-not-allowed flex-shrink-0"
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
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
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
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                               rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                               text-gray-900 dark:text-white placeholder-gray-500"
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
                      rows={4}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                               rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                               text-gray-900 dark:text-white placeholder-gray-500 resize-none"
                      required
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSending || !subject.trim() || !contactMessage.trim()}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl
                             hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all flex items-center justify-center gap-2"
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

                  <p className="text-xs text-center text-gray-500 dark:text-gray-400">
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

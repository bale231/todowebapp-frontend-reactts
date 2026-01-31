import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, HelpCircle, Bug, Lightbulb } from "lucide-react";

interface SupportWidgetProps {
  recipientEmail?: string;
}

type RequestType = "question" | "bug" | "suggestion";

const requestTypeLabels: Record<RequestType, { label: string; icon: typeof HelpCircle }> = {
  question: { label: "Domanda", icon: HelpCircle },
  bug: { label: "Segnala Bug", icon: Bug },
  suggestion: { label: "Suggerimento", icon: Lightbulb },
};

export default function SupportWidget({
  recipientEmail = "luigibalestrucci52@gmail.com",
}: SupportWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>("question");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) return;

    setIsSending(true);

    // Build email subject with type prefix
    const emailSubject = `[ToDo App - ${requestTypeLabels[requestType].label}] ${subject}`;

    // Build email body
    const emailBody = `Tipo: ${requestTypeLabels[requestType].label}

Messaggio:
${message}

---
Inviato da ToDo WebApp`;

    // Open mailto link
    const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    window.location.href = mailtoLink;

    // Show success state
    setTimeout(() => {
      setIsSending(false);
      setSent(true);

      // Reset after showing success
      setTimeout(() => {
        setSent(false);
        setSubject("");
        setMessage("");
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
        <div className="w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <h3 className="font-semibold">Assistenza</h3>
                  <p className="text-xs text-white/80">Come posso aiutarti?</p>
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

          {/* Content */}
          {sent ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={32} className="text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Email pronta!
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Si aprirà il tuo client email per inviarla
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
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
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
                disabled={isSending || !subject.trim() || !message.trim()}
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
                Si aprirà il tuo client email predefinito
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

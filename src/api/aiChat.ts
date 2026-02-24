const API_URL = "https://bale231.pythonanywhere.com/api";

interface AIChatResponse {
  reply: string;
  error?: string;
}

export async function sendAIChatMessage(
  message: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[]
): Promise<AIChatResponse> {
  const token =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");

  const response = await fetch(`${API_URL}/ai-chat/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message,
      conversation_history: conversationHistory.slice(-10), // Last 10 messages for context
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

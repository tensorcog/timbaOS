export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  userContext?: {
    userId: string;
    role: string;
    locationIds: string[];
  };
}

export interface ChatResponse {
  message: string;
  timestamp: Date;
}

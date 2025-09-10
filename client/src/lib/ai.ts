// Simple client helper for AI chat
import { apiRequest } from './queryClient';

export interface AIMessage { role: 'user' | 'bot'; content: string }

export async function fetchAIReply(history: AIMessage[], language: string) {
  const resp = await apiRequest('POST', '/api/chat/ai', { messages: history, language });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(txt || 'AI error');
  }
  return resp.json() as Promise<{ reply: string; model: string }>
}
import { anthropic, CLAUDE_MODEL, SYSTEM_PROMPT } from './claude-client';
import { ChatMessage, ChatRequest, ChatResponse } from './types';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

export class ChatService {
  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Build conversation history
      const messages: MessageParam[] = [];

      // Add conversation history if provided
      if (request.conversationHistory && request.conversationHistory.length > 0) {
        for (const msg of request.conversationHistory) {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: request.message,
      });

      // Add user context to system prompt if available
      let systemPrompt = SYSTEM_PROMPT;
      if (request.userContext) {
        systemPrompt += `\n\nCurrent User Context:
- User ID: ${request.userContext.userId}
- Role: ${request.userContext.role}
- Accessible Locations: ${request.userContext.locationIds.join(', ')}

Keep this context in mind when providing assistance. Only show information the user has access to based on their role and locations.`;
      }

      // Call Claude API
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      });

      // Extract the response text
      const assistantMessage =
        response.content[0].type === 'text' ? response.content[0].text : '';

      return {
        message: assistantMessage,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw new Error('Failed to get response from AI assistant');
    }
  }

  /**
   * Send a streaming message to Claude
   */
  async *sendMessageStream(request: ChatRequest): AsyncGenerator<string> {
    try {
      // Build conversation history
      const messages: MessageParam[] = [];

      // Add conversation history if provided
      if (request.conversationHistory && request.conversationHistory.length > 0) {
        for (const msg of request.conversationHistory) {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: request.message,
      });

      // Add user context to system prompt if available
      let systemPrompt = SYSTEM_PROMPT;
      if (request.userContext) {
        systemPrompt += `\n\nCurrent User Context:
- User ID: ${request.userContext.userId}
- Role: ${request.userContext.role}
- Accessible Locations: ${request.userContext.locationIds.join(', ')}

Keep this context in mind when providing assistance.`;
      }

      // Call Claude API with streaming
      const stream = await anthropic.messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      });

      // Stream the response
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          yield chunk.delta.text;
        }
      }
    } catch (error) {
      console.error('Error streaming from Claude API:', error);
      throw new Error('Failed to stream response from AI assistant');
    }
  }
}

export const chatService = new ChatService();

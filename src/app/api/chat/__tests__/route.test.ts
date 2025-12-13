/**
 * Tests for Next.js Chat API Route
 * Tests authentication, validation, and AI bridge integration
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('Chat API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no user ID', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: {},
      });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Request Validation', () => {
    beforeEach(() => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'user-123',
          role: 'ADMIN',
          locationIds: ['loc-1'],
        },
      });
    });

    it('should return 400 for missing message', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should return 400 for empty message', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: '' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should return 400 for message exceeding max length', async () => {
      const longMessage = 'a'.repeat(5001);

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: longMessage }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should accept valid conversation history', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'AI response',
          timestamp: new Date().toISOString(),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          conversationHistory: [
            {
              role: 'user',
              content: 'Previous message',
              timestamp: new Date().toISOString(),
            },
            {
              role: 'assistant',
              content: 'Previous response',
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('AI Bridge Integration', () => {
    beforeEach(() => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'user-123',
          role: 'ADMIN',
          locationIds: ['loc-1', 'loc-2'],
        },
      });
    });

    it('should forward request to AI bridge server', async () => {
      const mockResponse = {
        message: 'AI response to your query',
        timestamp: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Show me recent orders',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Show me recent orders'),
        })
      );

      expect(response.status).toBe(200);
      expect(data.message).toBe(mockResponse.message);
    });

    it('should include conversation history in request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Response',
          timestamp: new Date().toISOString(),
        }),
      });

      const conversationHistory = [
        {
          role: 'user' as const,
          content: 'Hello',
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant' as const,
          content: 'Hi!',
          timestamp: new Date().toISOString(),
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Continue',
          conversationHistory,
        }),
      });

      await POST(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.conversationHistory).toHaveLength(2);
      expect(requestBody.conversationHistory[0]).toEqual({
        role: 'user',
        content: 'Hello',
      });
    });

    it('should handle AI bridge server errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'AI bridge server error',
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(data.error).toBeDefined();
    });

    it('should handle malformed AI bridge responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('Response Format', () => {
    beforeEach(() => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'user-123',
          role: 'ADMIN',
          locationIds: ['loc-1'],
        },
      });
    });

    it('should return proper response format', async () => {
      const mockTimestamp = new Date().toISOString();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Test response',
          timestamp: mockTimestamp,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.message).toBe('string');
    });
  });
});

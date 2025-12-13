/**
 * Tests for AI Bridge Server
 * Tests the main server endpoints and tool execution
 */

import request from 'supertest';
import app from '../test-server.js';

describe('AI Bridge Server', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        model: 'qwen3:8b',
      });
    });
  });

  describe('POST /api/chat', () => {
    it('should handle simple chat request', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Hello',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.message).toBe('string');
    });

    it('should return 400 for missing message', async () => {
      const response = await request(app).post('/api/chat').send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Message is required');
    });

    it('should handle conversation history', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Continue conversation',
          conversationHistory: [
            {
              role: 'user',
              content: 'Hello',
            },
            {
              role: 'assistant',
              content: 'Hi there!',
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should include timestamp in response', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test message',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
    });
  });
});

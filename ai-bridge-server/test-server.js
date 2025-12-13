/**
 * Test server export
 * Exports the Express app without starting it for testing
 */

import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Mock Prisma and Ollama for testing
const mockPrisma = global.mockPrisma || {};
const mockOllama = global.mockOllama || { chat: async () => ({}) };

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', model: 'qwen3:8b' });
});

// Chat endpoint (simplified for testing)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Mock implementation for testing
    res.json({
      message: 'Test response',
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error.message
    });
  }
});

export default app;

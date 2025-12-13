import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { chatService } from '@/lib/ai/chat-service';
import { classifyError } from '@/lib/error-handler';
import type { ChatMessage } from '@/lib/ai/types';

// Validation schema
const chatMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        timestamp: z.string().transform((str) => new Date(str)),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = chatMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { message, conversationHistory } = validationResult.data;

    // Check if user wants streaming response
    const useStreaming = request.headers.get('accept') === 'text/event-stream';

    if (useStreaming) {
      // Create a streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const streamGenerator = chatService.sendMessageStream({
              message,
              conversationHistory,
              userContext: {
                userId: session.user.id,
                role: session.user.role,
                locationIds: session.user.locationIds || [],
              },
            });

            for await (const chunk of streamGenerator) {
              const data = `data: ${JSON.stringify({ chunk })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }

            // Send done signal
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            const errorData = `data: ${JSON.stringify({ error: 'Stream error' })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      // Regular non-streaming response
      const response = await chatService.sendMessage({
        message,
        conversationHistory,
        userContext: {
          userId: session.user.id,
          role: session.user.role,
          locationIds: session.user.locationIds || [],
        },
      });

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Chat API error:', error);
    const errorResponse = classifyError(error);
    return NextResponse.json(
      { error: errorResponse.error, details: errorResponse.details },
      { status: errorResponse.status }
    );
  }
}

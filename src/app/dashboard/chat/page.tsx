import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ChatClient } from '@/components/chat/chat-client';

export const metadata = {
  title: 'AI Chat - Pine ERP',
  description: 'Chat with AI assistant about your ERP system',
};

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AI Chat Assistant</h1>
        <p className="text-muted-foreground">
          Get help with orders, inventory, customers, and business insights
        </p>
      </div>
      <ChatClient />
    </div>
  );
}

import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { getSharedChat } from '@/app/actions'
import { ChatList } from '@/components/chat-list'
import { FooterText } from '@/components/footer'
import { Message } from 'ai'

function transformZepMessagesToChatMessages(zepMessages: any[]): Message[] {
  console.log("Transforming Zep messages")
  return zepMessages.map((zepMessage) => ({
    id: zepMessage.uuid,
    createdAt: zepMessage.created_at,
    role: zepMessage.role === 'ai' ? 'assistant' : 'user',
    content: zepMessage.content
  }));
}

interface SharePageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({
  params
}: SharePageProps): Promise<Metadata> {
  const chat = await getSharedChat(params.id)

  return {
    title: chat?.messages[0].content.substring(0, 50) ?? 'Chat'
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const chat = await getSharedChat(params.id)

  if (!chat) {
    notFound()
  }
  const transformedMessages = transformZepMessagesToChatMessages(chat.messages);

  return (
    <>
      <div className="flex-1 space-y-6">
        <div className="px-4 py-6 border-b bg-background md:px-6 md:py-8">
          <div className="max-w-2xl mx-auto md:px-6">
            <div className="space-y-1 md:-mx-8">
              <h1 className="text-2xl font-bold">{chat.title}</h1>
              <div className="text-sm text-muted-foreground">
                {formatDate(chat.createdAt)} · {chat.messages.length} messages
              </div>
            </div>
          </div>
        </div>
        <ChatList messages={transformedMessages} />
      </div>
      <FooterText className="py-8" />
    </>
  )
}

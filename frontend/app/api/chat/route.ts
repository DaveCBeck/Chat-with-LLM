
import { LangChainStream, StreamingTextResponse, Message } from 'ai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { auth } from '@/auth';
import { kv } from '@vercel/kv'
import { nanoid } from '@/lib/utils'
import { PromptTemplate } from "langchain/prompts";
import { RunnableSequence } from "langchain/schema/runnable";
import { StringOutputParser } from "langchain/schema/output_parser";
import { ChromaClient } from 'chromadb'

// back on the Edge to test and diagnose timeout issue.
export const runtime = 'edge'
const formatMessage = (message: Message) => {
  return `${message.role}: ${message.content}`;
};

export async function POST(req: Request) {
  const json = await req.json()
  const { messages, previewToken } = json
  const userId = (await auth())?.user.id
  
  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  const { stream, handlers } = LangChainStream({
    async onCompletion(stream: any) {
      const title = json.messages[0].content.substring(0, 100)
      const id = json.id ?? nanoid()
      const createdAt = Date.now()
      const path = `/chat/${id}`
      const payload = {
        id,
        title,
        userId,
        createdAt,
        path,
        messages: [
          ...messages,
          {
            content: stream,
            role: 'assistant'
          }
        ]
      }
      await kv.hmset(`chat:${id}`, payload)
      await kv.zadd(`user:chat:${userId}`, {
        score: createdAt,
        member: `chat:${id}`
      })
    }
  });
  // Connecting to Chroma with a timeout to try and catch the stack
  const timeout = (ms: any) => new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms));

  try {
    const client = new ChromaClient({
      path: process.env.CHROMA_URL,
    });
    // Use Promise.race to throw an error if the heartbeat takes longer than 5 seconds
    const result = await Promise.race([
      client.heartbeat(),
      timeout(5000) // 5 seconds timeout
    ]);
    console.log(result);
  } catch (error) {
    const e = error as Error;
    console.error('Error occurred:', e.message);
    // The stack trace might not be very detailed in Vercel Edge, but it's worth logging
    console.error('Stack Trace:', e.stack);
  }

  const model = new ChatOpenAI() 
  const llm = new ChatOpenAI({
    streaming: true,
    callbacks: [handlers],
  });
  const currentMessageContent = messages[messages.length - 1].content;
  console.log(currentMessageContent)
  
  const previousmessages = messages.slice(0, -1).map(formatMessage)
  console.log(previousmessages)

  const initialprompt = PromptTemplate.fromTemplate(
    "{history}, {latest}"
  );
  const finalprompt = PromptTemplate.fromTemplate(
    "Could you re-write this into a funny limerick, please? {resp}"
  );
  
  const chain = initialprompt.pipe(model).pipe(new StringOutputParser())
  const combinedChain = RunnableSequence.from([
    {
      resp: chain,
    },
    finalprompt,
    llm,
  ]);
  
  combinedChain.invoke({ history: previousmessages, latest: currentMessageContent });

  return new StreamingTextResponse(stream)
}

import { LangChainStream, StreamingTextResponse, Message } from 'ai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { auth } from '@/auth';
import { kv } from '@vercel/kv'
import { nanoid } from '@/lib/utils'
import { PromptTemplate } from "langchain/prompts";
import { RunnableSequence } from "langchain/schema/runnable";
import { StringOutputParser } from "langchain/schema/output_parser";
import { ChromaClient } from 'chromadb'

// off the Edge for now, because otherwise the ChromaClient times out without sending a request to the server.
export const maxDuration = 300
//export const runtime = 'edge'

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
 // Connecting to Chroma 
 const client = new ChromaClient({
  path: process.env.CHROMA_URL,
  auth: {
    provider: "token",
    credentials: process.env.CHROMA_TOKEN,
    providerOptions: { headerType: "AUTHORIZATION" },
  },
  });
  console.log(await client.heartbeat())
  console.log(await client.listCollections())

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
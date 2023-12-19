import { LangChainStream, StreamingTextResponse, Message } from 'ai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { auth } from '@/auth';
import { kv } from '@vercel/kv'
import { nanoid } from '@/lib/utils'
import { PromptTemplate } from "langchain/prompts";
import { RunnableSequence, RunnablePassthrough } from "langchain/schema/runnable";
import { StringOutputParser } from "langchain/schema/output_parser";
import { ChromaClient } from 'chromadb';
import { Chroma } from "langchain/vectorstores/chroma";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { formatDocumentsAsString } from "langchain/util/document";

// off the Edge for now, because otherwise the ChromaClient times out without sending a request to the server.
export const maxDuration = 300;
//export const runtime = 'edge'

const chromacollection = "CuriousHumanssentences"
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
    // Store the messages in KV on completion of the stream; will replace this with Zep at some point
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
 
// Define components for initial chain to craft a vectorstore query
const model = new ChatOpenAI() 
const currentMessageContent = messages[messages.length - 1].content;
console.log(currentMessageContent)
const previousmessages = messages.slice(0, -1).map(formatMessage)
console.log(previousmessages)
const initialPrompt = PromptTemplate.fromTemplate(
  `Please write a vectorstore query to retrieve relevent information for creating a response to the message below. Include context from the conversation history as appropriate, and ensure the latest message is included in full.
  
  Conversation History: {history} 
  
  Latest: {latest}`
);

// Connecting to Chroma 
 const chromaclient = new ChromaClient({
  path: process.env.CHROMA_URL,
  auth: {
    provider: "token",
    credentials: process.env.CHROMA_TOKEN,
    providerOptions: { headerType: "AUTHORIZATION" },
  },
  });
  console.log(await chromaclient.heartbeat())
  console.log(await chromaclient.listCollections())
  const collection = await chromaclient.getCollection({ name: chromacollection });
  console.log(await collection.count())

// Passing Chroma client to Langchain
  const embeddings = new OpenAIEmbeddings()
  const client = Chroma.fromExistingCollection(embeddings, {
    index: chromaclient,
    numDimensions: 1536,
    collectionName: chromacollection,
  })
  const retriever = (await client).asRetriever({k : 8})

  // Function to process documents and extract 'window' metadata
  const extractWindowMetadata = (documents: any[]) => {
    return documents.map((document) => {
      const metadata = document.metadata;
      const nodeContent = JSON.parse(metadata._node_content);
      return nodeContent.metadata.window;
    }).join('....'); // Join the windows with a space, or use any other delimiter you prefer
  };

// Chain to retrieve relevent context from Chroma - pipes the prompt to a model defined above and uses a stringified response to retrieve content from the DB, the formats the documents as a string.
  const contextChain = initialPrompt.pipe(model).pipe(new StringOutputParser()).pipe(retriever).pipe(extractWindowMetadata)

// Final chain to generate the response that's streamed to the client
  const finalllm = new ChatOpenAI({
    streaming: true,
    callbacks: [handlers],
  });
  const stylePrompt = PromptTemplate.fromTemplate(
    `Below is some context with which to respond to a message from a user. Please respond as patchy the pirate.
    
    Latest Message: {question}

    Context: {resp}
    `
  );
  
// Chain-of-chains
  const combinedChain = RunnableSequence.from([
    {
      question: (input) => input.latest,
      resp: contextChain,
    },
    stylePrompt,
    finalllm,
  ]);

  // Call the chain-of-chains, return the streaming response via Vercel's Chat
  combinedChain.invoke({ history: previousmessages, latest: currentMessageContent });
  return new StreamingTextResponse(stream)
}
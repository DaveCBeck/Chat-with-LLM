'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { type Chat } from '@/lib/types'
import { ZepClient, ICreateUserRequest, ISession, Session}  from '@getzep/zep-js'
import { nanoid } from '@/lib/utils'
import { Message } from 'ai'

const zepURL = process.env.ZEP_URL || ''
const zepapikey = process.env.ZEP_API_KEY || ''
interface ZepMessage {
  uuid: string;
  created_at: Date;
  role: string;
  content: string;
}

export async function createSessionAndUser(id: string) {
  const client = await ZepClient.init(zepURL, zepapikey);
  const userId: string = (await auth())!.user.id
  console.log("attempting to get a user")
  try {
    // Attempt to get the user
    const getUser = await client.user.get(userId);
    // If the user is found, no further action is needed
  } catch (error) {
    // If there is an error, assume the user does not exist and create them. Edit this later.
    const user: ICreateUserRequest = {
      user_id: userId,
      metadata: {  },
    };
    const newUser = await client.user.add(user);
    console.log("new user created")
  }

  // Associate user with current session id
  const sessionData: ISession = {
    session_id: id,
    user_id: userId, 
    metadata: { title:  ''},
    created_at: new Date().toISOString(),
  };
  const session = new Session(sessionData);
  await client.memory.addSession(session);
  console.log("user associated with session")
}

export async function getChats(userId?: string | null) {
  if (!userId) {
    return []
  }
  try {
    console.log("attempting to connect to Zep in getChats")
    const client = await ZepClient.init(zepURL, zepapikey);
    const sessions = await client.user.getSessions(userId);
    
    const memories: any[] = [];
    for (const session of sessions) {
      const memory = await client.memory.getMemory(session.session_id);
      if (memory && memory.messages.length === 0) {
        console.debug("No messages found for session ", session.session_id);
      } else if (memory) {
        memory.messages.forEach((message: any) => {
          console.debug(JSON.stringify(message));
        });
      }
      // Ensure memory is a plain object
      memories.push(JSON.parse(JSON.stringify(memory)));
    }
    console.log("mapping sessions in getChats")
    const chats: Chat[] = sessions.map((session: any, index: any) => {
      // Use index to match session with corresponding memory
      const memory = memories[index];
      return {
        id: session.session_id,
        userId: session.user_id || '',
        createdAt: new Date(session.created_at || new Date().toISOString()),
        title: memory?.messages[0]?.content.substring(0, 100) || '',
        path: `/chat/${session.session_id}`,
        messages: memory?.messages.map((msg: ZepMessage) => ({
          // Map messages to plain objects
          id: msg.uuid,
          createdAt: msg.created_at,
          role: msg.role,
          content: msg.content
        })) || []
      }
    });
    return chats;
  } catch (error) {
    return []
  }
}

function transformZepMessagesToChatMessages(zepMessages: any[]): Message[] {
  console.log("Transforming Zep messages")
  return zepMessages.map((zepMessage) => ({
    id: zepMessage.uuid,
    createdAt: zepMessage.created_at,
    role: zepMessage.role === 'ai' ? 'assistant' : 'user',
    content: zepMessage.content
  }));
}

export async function getChat(id: string, userId: string) {
  console.log("attempting to connect to Zep in getChat")
  const client = await ZepClient.init(zepURL, zepapikey);
  const session = await client.memory.getSession(id);
  const memory = await client.memory.getMemory(id)
  const zepMessages = memory?.messages || [];
  const chatMessages = transformZepMessagesToChatMessages(zepMessages);
  // returns all memories in an array



  const chat: Chat = {
    id: id,
    userId: userId,
    createdAt: new Date(session.created_at || Date.now()),
    initialMessages: chatMessages[0]?.content.substring(0, 100) || [],
    title: chatMessages[0]?.content.substring(0, 100) || '',
    path: `/chat/${id}`,
    messages: chatMessages,
  };
  
  if (!chat) {
    return null
  }

  return chat
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  const client = await ZepClient.init(zepURL, zepapikey);
  const session = await auth()

  if (!session) {
    return {
      error: 'Unauthorized'
    }
  }

  await client.memory.deleteMemory(id);

  revalidatePath('/')
  return revalidatePath(path)
}

export async function clearChats() {
  const client = await ZepClient.init(zepURL, zepapikey);
  const userId: string = (await auth())!.user.id
  const sessions = await client.user.getSessions(userId);
  for (const session of sessions) {
  await client.memory.deleteMemory(session.session_id);
  }
  revalidatePath('/')
  return redirect('/')
}

export async function getSharedChat(id: string) {
  const client = await ZepClient.init(zepURL, zepapikey);
  const userId = nanoid()
  const chat = await getChat(id, userId)
  if (!chat) {
    return null
  }

  return chat
}

export async function shareChat(chatId: string) {
  const client = await ZepClient.init(zepURL, zepapikey);
  const userId: string = (await auth())!.user.id;
  const chat = await getChat(chatId, userId); // Retrieve the chat using the chat ID and user ID

  if (!chat) {
    return {
      error: 'Chat not found'
    };
  }

  if (!userId || userId !== chat.userId) {
    return {
      error: 'Unauthorized'
    };
  }

//upodate the session metadata with a share path
  const sessionData: ISession = {
    session_id: chat.id,
    metadata: { sharePath: `/share/${chat.id}` },
  };
  const session = new Session(sessionData);
  await client.memory.updateSession(session);

  //get the session and its messages for return
  const sessiondata = await client.memory.getSession(chat.id);
  const memory = await client.memory.getMemory(chat.id);
  const zepMessages = memory?.messages || [];
  const chatMessages = transformZepMessagesToChatMessages(zepMessages);
  const sharedchat: Chat = {
    id: sessiondata.session_id,
    userId: sessiondata.user_id || '',
    createdAt: new Date(sessiondata.created_at || new Date().toISOString()),
    title: memory?.messages[0]?.content.substring(0, 100) || '',
    path: `/chat/${sessiondata.session_id}`,
    sharePath: `/share/${chat.id}`,
    messages: chatMessages
  };
  return sharedchat
}
import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { createSessionAndUser } from '@/app/actions'

export default async function IndexPage() {
  const id = nanoid()
  await createSessionAndUser(id)
  return <Chat id={id} />
}

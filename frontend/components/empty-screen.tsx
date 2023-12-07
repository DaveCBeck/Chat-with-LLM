import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { IconArrowRight } from '@/components/ui/icons'

const exampleMessages = [
  {
    heading: 'Clarify understanding',
    message: `What did the author mean when he said: \n`
  },
  {
    heading: 'Find examples',
    message: 'Could you give me a few examples of them talking about: \n'
  }
]

export function EmptyScreen({ setInput }: Pick<UseChatHelpers, 'setInput'>) {
  return (
    <div className="mx-auto max-w-2xl px-4">
    <div className="rounded-lg border bg-background p-8">
      <h1 className="mb-2 text-lg font-semibold">
        Welcome.
      </h1>
      <p className="mb-2 leading-normal text-muted-foreground">
        This is an open source AI chatbot template which will use RAG to allow you to chat with an author of a book, or the people who have spoken on a podcast.
        </p>
      <p className="leading-normal text-muted-foreground">
        You can start a conversation below (not too much please as this uses my OpenAI API), but there are no documents to retrieve so these examples will not work yet:
      </p>
      <div className="mt-4 flex flex-col items-start space-y-2">
        {exampleMessages.map((message, index) => (
          <Button
            key={index}
            variant="link"
            className="h-auto p-0 text-base"
            onClick={() => setInput(message.message)}
          >
            <IconArrowRight className="mr-2 text-muted-foreground" />
            {message.heading}
          </Button>
        ))}
      </div>
    </div>
  </div>
  )
}

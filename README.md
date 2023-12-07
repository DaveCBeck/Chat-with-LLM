# Chat-with-LLM
Work in progress - I would not advise using this yet but it is in active development (contributions welcome). When more complete, you'll be welcome to use it in anything open source, with attribution (GNU GPLv3).

Finished stack will be based on Next.js, Langchain, Chroma and Zep for chat with LLMs including RAG and message search/persistence.
 
For now I'll use Vercel KV in place of Zep, until langchain memory integration is enabled for runnables.

## To Personalize (visuals)
/frontend/components/footer.tsx
/frontend/components/header.tsx
/frontend/components/empty-screen.tsx (the initial display for the user, can be used to populate suggested messages and for other introductory purposes)

### Note-to-self
To bring in updates from Vercel's AI chatbot template, which is still in development:
git fetch NextUI main
git subtree pull --prefix frontend NextUI main
(and then merge changes)


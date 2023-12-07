# Chat-with-LLM
Work in progress - I would not advise using this yet but it is in active development (contributions welcome). When more complete, you'll be welcome to use it in anything open source, with attribution (GNU GPLv3).

Finished stack will be based on Next.js, Langchain, Chroma and Zep for chat with LLMs including RAG and message search/persistence.
 
For now I'll use Vercel KV in place of Zep, until langchain memory integration is enabled for runnables.

# Frontend

## To Personalize (visuals)
/frontend/components/footer.tsx
/frontend/components/header.tsx
/frontend/components/empty-screen.tsx (the initial display for the user, can be used to populate suggested messages and for other introductory purposes)

### Note-to-self
To bring in updates from Vercel's AI chatbot template, which is still in development:
git fetch NextUI main
git subtree pull --prefix frontend NextUI main
(and then merge changes)

# Backend
Backend-single.yaml is a template for deployment using AWS CloudFormation. It creates two EC2 instances (t4g.medium for Chroma t4g.small for Zep) with no scaling. Uses a nameprefix to distinguish between deployments.

Configuration is currently via environment variables within the cloudformation template. Follow the security practices for each service, mentioned below, for persistent deployments.

For scalability in production, Zep can use Kubernetes and Chroma will be able to following their next update.

## Chroma v 0.4.17
For document-based RAG.

### Deployment
Set a token in the Backend-single.yaml file, use that token directly in the Chroma DB client config.

## Zep 0.19 - note the config needs some attention (config.yaml maybe?)
Will not be integrated until LangChain runnables integrate memory classes. Or I set something up directly using an async function via actions.ts.

Used to store chat history (and associate each user to a session). Note that the web interface is disabled as this is a public-facing installation.

### Deployment
Note https://docs.getzep.com/deployment/auth/ on authentication. Generate a secret and JWT token for each install.

Set the token where appropriate in the Backend-single.yaml file, use the JWT in the client.
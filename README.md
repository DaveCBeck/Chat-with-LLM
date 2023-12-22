# Chat-with-LLM
Basic stack for creating a next.js chatbot that uses Langchain for RAG from a Chroma vectorstore. Message history is stored in Zep.

# Frontend

Based on Vercel's AI chatbot template, which is still in active development. 

Edited to integrate Langchain and Chroma RAG (frontend\app\api\chat\route.ts).

And to replace vercel's KV memory store with Zep (multiple files, see history). Users and sessions are associated in Zep.

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
Backend-single.yaml is a template for deployment using AWS CloudFormation. It creates two EC2 instances (t4g.medium for Chroma t4g.small for Zep) with no scaling. There's a nameprefix to distinguish between deployments as I anticipate using this stack a few times.

Configuration is currently via environment variables within the cloudformation template. Follow the security practices for each service, mentioned below, for persistent deployments.

For scalability in production, Zep can use Kubernetes and Chroma will be able to following their next update.

## Chroma v 0.4.17
For document-based RAG.

### Deployment
Set a token in the Backend-single.yaml file, use that token directly in the Chroma DB client config.

## Zep 0.19 - note the config needs some attention 
Integrated manually for now using Vercel's chat functions - probably revise this when LangChain runnables integrate memory classes. 

Used to store chat history (and associate each user to a session). Note that the web interface for the server is disabled as this is a public-facing installation.

### Deployment
Note https://docs.getzep.com/deployment/auth/ on authentication. Generate a secret and JWT token for each install.

Set the token where appropriate in the Backend-single.yaml file, use the JWT in the client.
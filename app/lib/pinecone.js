import { Pinecone } from '@pinecone-database/pinecone';

const pc = (process.env.PINECONE_API_KEY) ? new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
}) : null;

export default pc;
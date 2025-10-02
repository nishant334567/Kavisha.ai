import { GoogleAuth } from 'google-auth-library';


const auth =(process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY) ? new GoogleAuth({
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
}):null;

export async function generateEmbedding(text) {
    try {
  
      
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();
      
      const embeddingResponse = await fetch(
        `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/us-central1/publishers/google/models/text-embedding-005:predict`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            instances: [{ content: text }],
            parameters: {}
          }),
        }
      );
  
      
      if (!embeddingResponse.ok) {
        return 0;
      }
  
      const embeddingData = await embeddingResponse.json();
  
      const embedding = embeddingData.predictions[0].embeddings.values;
      return embedding;
    } catch (error) {
      return 0;
    }
}
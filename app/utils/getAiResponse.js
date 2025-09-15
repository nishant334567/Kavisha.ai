import OpenAI from "openai";
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export const createChatCompletion = async (
  model = "gpt-4o-mini",
  messages = [{ role: "user", content: "Hi open ai" }],
  temperature = 0.7,
  max_completion_tokens = 800
) => {
  try {
    const chatCompletion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: temperature,
      max_completion_tokens: max_completion_tokens,
    });

    return chatCompletion;
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw error;
  }
};

export const createEmbedding = async (text) => {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return embedding.data[0].embedding;
};

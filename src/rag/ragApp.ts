import { ChatOllama } from "@langchain/ollama";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";

import "cheerio";

const { CHROMA_URL } = process.env;

const modelName = 'deepseek-r1:14b';

const llm = new ChatOllama({
  baseUrl: 'http://localhost:11434',
  model: modelName,
  temperature: 0.6,
});

const embeddings = new OllamaEmbeddings({
  baseUrl: 'http://localhost:11434',
  // model: 'text-embedding-3-small',  //  dimension =  1536
  model: 'nomic-embed-text',  //  dimension = 768
});

const vectorStore = new Chroma(embeddings, {
  collectionName: "rag-collection",
  url: CHROMA_URL,
});

export { modelName, llm, embeddings, vectorStore };


import { ChatOllama } from "@langchain/ollama";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";


import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { Document } from "@langchain/core/documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

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

/**
 * # Preview
 */
const preview = async () => {
  // Load and chunk contents of blog
  const pTagSelector = "p";
  const cheerioLoader = new CheerioWebBaseLoader(
    "https://lilianweng.github.io/posts/2023-06-23-agent/",
    {
      selector: pTagSelector
    }
  );

  const docs = await cheerioLoader.load();
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000, chunkOverlap: 200
  });
  const allSplits = await splitter.splitDocuments(docs);
  
  // Index chunks
  await vectorStore.addDocuments(allSplits);
  
  // Define prompt for question-answering
  const promptTemplate = await pull<ChatPromptTemplate>("rlm/rag-prompt");
  
  // Define state for application
  const InputStateAnnotation = Annotation.Root({
    question: Annotation<string>,
  });
  
  const StateAnnotation = Annotation.Root({
    question: Annotation<string>,
    context: Annotation<Document[]>,
    answer: Annotation<string>,
  });
  
  // Define application steps
  const retrieve = async (state: typeof InputStateAnnotation.State) => {
    const retrievedDocs = await vectorStore.similaritySearch(state.question)
    return { context: retrievedDocs };
  };
  
  
  const generate = async (state: typeof StateAnnotation.State) => {
    const docsContent = state.context.map(doc => doc.pageContent).join("\n");
    const messages = await promptTemplate.invoke({ question: state.question, context: docsContent });
    const response = await llm.invoke(messages);
    return { answer: response.content };
  };
  
  
  // Compile application and test
  const graph = new StateGraph(StateAnnotation)
    .addNode("retrieve", retrieve)
    .addNode("generate", generate)
    .addEdge("__start__", "retrieve")
    .addEdge("retrieve", "generate")
    .addEdge("generate", "__end__")
    .compile();



  let inputs = { question: "What is Task Decomposition?" };

  const result = await graph.invoke(inputs);
  console.log(result.answer);
};



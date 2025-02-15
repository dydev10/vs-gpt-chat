import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";


import { Document } from "@langchain/core/documents";
import { Annotation, StateGraph } from "@langchain/langgraph";

// import { concat } from "@langchain/core/utils/stream";
import { llm, vectorStore } from "./ragApp";
import { searchStruct, SectionQuerySchema, template } from "./LLM";


const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
});

const StateAnnotationQA = Annotation.Root({
  question: Annotation<string>,
  search: Annotation<SectionQuerySchema>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
});



export const pullingTemplate = async () => {
  return await pull<ChatPromptTemplate>("rlm/rag-prompt");
};

const analyzeQuery = async (state: typeof InputStateAnnotation.State) => {
  const result = await structuredLlm.invoke(state.question);
  return { search: result };
};

const retrieve = async (state: typeof StateAnnotationQA.State) => {
  const retrievedDocs = await vectorStore.similaritySearch(
    state.search.query,
    2,
    { 'section': { '$eq': state.search.section } }, // wrong type
  );

  console.log('Retrieved non-QA docs:', retrievedDocs.length);
  
  return { context: retrievedDocs };
};

const retrieveQA = async (state: typeof StateAnnotationQA.State) => {
  const retrievedDocs = await vectorStore.similaritySearch(
    state.search.query,
    2,
    {
      'section': state.search.section,
    },
  );

  console.log('Retrieved QA docs:', retrievedDocs.length);
  
  return { context: retrievedDocs };
};

const generate = async (state: typeof StateAnnotationQA.State) => {
  const docsContent = state.context.map((doc) => doc.pageContent).join("\n");
  const response = await llm.invoke(state.question, docsContent);
  return { answer: response.content };
};

const generateQA = async (state: typeof StateAnnotationQA.State) => {
  const docsContent = state.context.map((doc) => doc.pageContent).join("\n");
  const response = await llm.invoke(state.question, docsContent);
  return { answer: response.content };
};

const structuredLlm = llm.withStructuredOutput(searchStruct);

export const graph = new StateGraph(StateAnnotationQA)
  .addNode("analyzeQuery", analyzeQuery)
  // .addNode("retrieveQA", retrieve)
  .addNode("retrieveQA", retrieveQA)
  .addNode("generateQA", generateQA)
  .addEdge("__start__", "analyzeQuery")
  .addEdge("analyzeQuery", "retrieveQA")
  .addEdge("retrieveQA", "generateQA")
  .addEdge("generateQA", "__end__")
  .compile();

export const invokeGraph = async () => {
  let inputs = { question: "What is Task Decomposition?" };

  const result = await graph.invoke(inputs);
  console.log(result.context.slice(0, 2));
  console.log(`\nAnswer: ${result["answer"]}`);
};


export const streamGraphSteps = async () => {
  let inputs = { question: "What is Task Decomposition?" };

  console.log(inputs);
  console.log("\n====\n");
  for await (const stepChunk of await graph.stream(inputs, {
    streamMode: "updates",
  })) {
    console.log(stepChunk);
    console.log("\n====\n");
  }
};

export const streamGraph = async (question: string) => {
  // let inputs = { question: "What is Task Decomposition?" };
  let inputs = { question };

  const stream = await graph.stream(inputs, { streamMode: 'messages' });
  // for await (const [message, _metadata] of stream) {
    //   process.stdout.write(message.content + "|");
    // }
  return stream;
};

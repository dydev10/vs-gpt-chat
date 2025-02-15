import { z } from "zod";

import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";


import { Document } from "@langchain/core/documents";
import { Annotation, StateGraph } from "@langchain/langgraph";

import { concat } from "@langchain/core/utils/stream";
import { llm, vectorStore } from "./ragApp";


const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
});

const StateAnnotationQA = Annotation.Root({
  question: Annotation<string>,
  search: Annotation<z.infer<typeof searchSchema>>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
});

const template = `Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Use three sentences maximum and keep the answer as concise as possible.
Always say "thanks for asking!" at the end of the answer.

{context}

Question: {question}

Helpful Answer:`;

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
      'section': {
        '$eq': state.search.section
      },
    },
  );

  console.log('Retrieved QA docs:', retrievedDocs.length);
  
  return { context: retrievedDocs };
};

const generate = async (state: typeof StateAnnotationQA.State) => {
  // const promptTemplate = await pullingTemplate();
  const promptTemplateCustom = ChatPromptTemplate.fromMessages([
    ["user", template],
  ]);;
  const docsContent = state.context.map((doc) => doc.pageContent).join("\n");
  const messages = await promptTemplateCustom.invoke({
    question: state.question,
    context: docsContent,
  });
  const response = await llm.invoke(messages);
  return { answer: response.content };
};

const generateQA = async (state: typeof StateAnnotationQA.State) => {
  const promptTemplate = await pullingTemplate();
  // const promptTemplate = ChatPromptTemplate.fromMessages([
  //   ["user", template],
  // ]);
  const docsContent = state.context.map((doc) => doc.pageContent).join("\n");
  const messages = await promptTemplate.invoke({
    question: state.question,
    context: docsContent,
  });
  const response = await llm.invoke(messages);
  return { answer: response.content };
};

const searchSchema = z.object({
  query: z.string().describe("Search query to run."),
  section: z.enum(["beginning", "middle", "end"]).describe("Section to query."),
});

const structuredLlm = llm.withStructuredOutput(searchSchema);

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

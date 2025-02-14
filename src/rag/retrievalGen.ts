import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";


import { Document } from "@langchain/core/documents";
import { Annotation, StateGraph } from "@langchain/langgraph";

import { concat } from "@langchain/core/utils/stream";
import { llm, vectorStore } from "./ragApp";


const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
});

const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
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


const retrieve = async (state: typeof InputStateAnnotation.State) => {
  const retrievedDocs = await vectorStore.similaritySearch(state.question);
  return { context: retrievedDocs };
};

const generate = async (state: typeof StateAnnotation.State) => {
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

export const graph = new StateGraph(StateAnnotation)
  .addNode("retrieve", retrieve)
  .addNode("generate", generate)
  .addEdge("__start__", "retrieve")
  .addEdge("retrieve", "generate")
  .addEdge("generate", "__end__")
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

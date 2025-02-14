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

export const pullingTemplate = async () => {
  return await pull<ChatPromptTemplate>("rlm/rag-prompt");
};

export const examplePrompting = async () => {
  const promptTemplate = await pullingTemplate();

  // Example:
  const example_prompt = await promptTemplate.invoke({
    context: "(context goes here)",
    question: "(question goes here)",
  });
  const example_messages = example_prompt.messages;
  
  console.assert(example_messages.length === 1);
  example_messages[0].content;
};


const retrieve = async (state: typeof InputStateAnnotation.State) => {
  const retrievedDocs = await vectorStore.similaritySearch(state.question);
  return { context: retrievedDocs };
};

const generate = async (state: typeof StateAnnotation.State) => {
  const promptTemplate = await pullingTemplate();
  const docsContent = state.context.map((doc) => doc.pageContent).join("\n");
  const messages = await promptTemplate.invoke({
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


// export const streamGraph = async () => {
//   let inputs = { question: "What is Task Decomposition?" };

//   console.log(inputs);
//   console.log("\n====\n");
//   for await (const chunk of await graph.stream(inputs, {
//     streamMode: "updates",
//   })) {
//     console.log(chunk);
//     console.log("\n====\n");
//   }
// };

export const streamGraph = async (question: string) => {
  // let inputs = { question: "What is Task Decomposition?" };
  let inputs = { question };

  const stream = await graph.stream(inputs, { streamMode: 'messages' });
  // for await (const [message, _metadata] of stream) {
    //   process.stdout.write(message.content + "|");
    // }
  return stream;
};

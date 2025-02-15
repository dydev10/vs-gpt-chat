import { Document } from "@langchain/core/documents";
import {
  Annotation,
  MessagesAnnotation,
  CompiledStateGraph,
  StateGraph,
  MemorySaver,
  StreamMode,
} from "@langchain/langgraph";

// import { concat } from "@langchain/core/utils/stream";
import { llm, vectorStore } from "./ragApp";
import { searchStruct, SectionQuerySchema, template } from "./LLM";
import { DynamicStructuredTool, Tool, tool } from "@langchain/core/tools";
import { z } from "zod";

import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { createReactAgent, ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";

export const retrieverSchema = z.object({ query: z.string() });

const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
});

const StateAnnotationQA = Annotation.Root({
  question: Annotation<string>,
  search: Annotation<SectionQuerySchema>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
});

class RetrievalAI {
  graph: CompiledStateGraph<
    typeof StateAnnotationQA.State,   // S (State type)
    typeof StateAnnotationQA.Update,  // U (Update type)
    string                            // N (Node names)
  >;
  anotherGraph: CompiledStateGraph<
    typeof MessagesAnnotation.State,
    typeof MessagesAnnotation.Update,
    string
  >;
  retriever: DynamicStructuredTool<typeof retrieverSchema>;
  threadConfig: { streamMode: StreamMode, configurable: { thread_id: string } };
  memory: MemorySaver;

  agent: any;

  constructor() {
    this.threadConfig = {
      configurable: { thread_id: crypto.randomUUID(), },
      streamMode: 'messages',
    };
    this.memory = new MemorySaver();

    this.retriever = this.getRetriever();
    
    // rag graph
    this.graph = this.setupGraph();

    // rag 2 graph
    this.anotherGraph = this.setupAnotherGraph();
  
    this.agent = this.setupAgent();
  }

  setupAgent = () => {
    const agent = createReactAgent({ llm: llm.api, tools: [this.getRetriever()] });
    return agent;
  };

  streamAgent = async (question: string) => {
    let inputs = { 
      messages: [
        {
          role: 'human',
          content: question,
        },
      ],
    };

    const stream = await this.agent.stream(inputs, { streamMode: 'messages', configurable: { thread_id: this.threadConfig.configurable.thread_id } });
    return stream;
  };

  setupGraph = () => {
    const graph = new StateGraph(StateAnnotationQA)
      .addNode("analyzeQuery", this.analyzeQuery)
      .addNode("retrieveQA", this.retrieveQA)
      .addNode("generateQA", this.generateQA)
      .addEdge("__start__", "analyzeQuery")
      .addEdge("analyzeQuery", "retrieveQA")
      .addEdge("retrieveQA", "generateQA")
      .addEdge("generateQA", "__end__")
      .compile({ checkpointer: this.memory });

    return graph;
  };

  // analyzeQuery = async (state: typeof InputStateAnnotation.State) => {
  analyzeQuery = async (state: typeof InputStateAnnotation.State) => {
    const structuredLlm = llm.withStructuredOutput(searchStruct);
    const result = await structuredLlm.invoke(state.question, { configurable: { thread_id: this.threadConfig.configurable } });
    return { search: result };
  };

  retrieveQA = async (state: typeof StateAnnotationQA.State) => {
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

  generateQA = async (state: typeof StateAnnotationQA.State) => {
    const docsContent = state.context.map((doc) => doc.pageContent).join("\n");
    const response = await llm.invoke(state.question, docsContent, this.threadConfig.configurable.thread_id);
    return { answer: response.content };
  };

  invokeGraph = async (question: string) => {
    let inputs = { question };
  
    const result = await this.graph.invoke(inputs);
    console.log(result.context.slice(0, 2));
    console.log(`\nAnswer: ${result["answer"]}`);
  };

  streamGraph = async (question: string) => {
    let inputs = { question };
    const stream = await this.graph.stream(inputs, this.threadConfig);
    return stream;
  };


  /**
   * rag 2 stuff
   */

  /**
   * 
   * @returns Tool retriever
   */
  getRetriever = () => {
    const retriever = tool(
      async ({ query }) => {
        const retrievedDocs = await vectorStore.similaritySearch(query, 2);
        
        const serialized = retrievedDocs
          .map(
            (doc) => `Source: ${doc.metadata.source}\nContent: ${doc.pageContent}`
          )
          .join("\n");
        return [serialized, retrievedDocs];
      },
      {
        name: 'retriever',
        description: "Retrieves information related to a query.",
        schema: retrieverSchema,
        responseFormat: 'content_and_artifact',
      }
    );

    return retriever;
  };

  setupAnotherGraph = () => {
    const graphBuilder = new StateGraph(MessagesAnnotation)
      .addNode("queryOrRespond", this.queryOrRespond)
      .addNode("tools", this.retrievalToolNode)
      .addNode("generate", this.generate)
      .addEdge("__start__", "queryOrRespond")
      .addConditionalEdges("queryOrRespond", toolsCondition, {
        __end__: "__end__",
        tools: "tools",
      })
      .addEdge("tools", "generate")
      .addEdge("generate", "__end__");

    const anotherGraph = graphBuilder.compile({ checkpointer: this.memory });
    
    return anotherGraph;
  };

  // Step 1: Generate an AIMessage that may include a tool-call to be sent.
  queryOrRespond = async (state: typeof MessagesAnnotation.State) => {
    const llmWithTools = llm.bindTools([this.retriever]);
    const response = await llmWithTools.invoke(state.messages, { configurable: { thread_id: this.threadConfig.configurable.thread_id } });
    // MessagesState appends messages to state instead of overwriting
    return { messages: [response] };
  };

  // Step 2: Execute the retrieval.
  retrievalToolNode = () => {
    const tools = new ToolNode([this.retriever]);
    return tools;
  };

  // Step 3: Generate a response using the retrieved content.
  generate = async (state: typeof MessagesAnnotation.State) => {
    // Get generated ToolMessages
    let recentToolMessages = [];
    for (let i = state["messages"].length - 1; i >= 0; i--) {
      let message = state["messages"][i];
      if (message instanceof ToolMessage) {
        recentToolMessages.push(message);
      } else {
        break;
      }
    }
    let toolMessages = recentToolMessages.reverse();

    // Format into prompt
    const docsContent = toolMessages.map((doc) => doc.content).join("\n");
    const systemMessageContent =
      "You are an assistant for question-answering tasks. " +
      "Use the following pieces of retrieved context to answer " +
      "the question. If you don't know the answer, say that you " +
      "don't know. Use three sentences maximum and keep the " +
      "answer concise." +
      "\n\n" +
      `${docsContent}`;

    const conversationMessages = state.messages.filter(
      (message) =>
        message instanceof HumanMessage ||
        message instanceof SystemMessage ||
        (message instanceof AIMessage && message.tool_calls?.length === 0)
    );
    const prompt = [
      new SystemMessage(systemMessageContent),
      ...conversationMessages,
    ];

    // Run
    const response = await llm.invoke(prompt, '', this.threadConfig.configurable.thread_id);
    return { messages: [response] };
  };

  streamAnotherGraph = async (question: string) => {
    // let inputs = { messages: [new HumanMessage(question)] };
    let inputs = { 
      messages: [
        {
          role: 'human',
          content: question,
        },
      ],
    };

    const stream = await this.graph.stream(inputs, { streamMode: 'messages', configurable: { thread_id: this.threadConfig.configurable.thread_id } });
    return stream;
  };
}

export default RetrievalAI;

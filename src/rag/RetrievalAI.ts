import { Document } from "@langchain/core/documents";
import { Annotation, CompiledStateGraph, StateDefinition, StateGraph, StateType, UpdateType } from "@langchain/langgraph";

// import { concat } from "@langchain/core/utils/stream";
import { llm, vectorStore } from "./ragApp";
import { searchStruct, SectionQuerySchema, template } from "./LLM";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

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

  constructor() {
    this.graph = this.setupGraph();
  }

  setupGraph = () => {
    const graph = new StateGraph(StateAnnotationQA)
      .addNode("analyzeQuery", this.analyzeQuery)
      .addNode("retrieveQA", this.retrieveQA)
      .addNode("generateQA", this.generateQA)
      .addEdge("__start__", "analyzeQuery")
      .addEdge("analyzeQuery", "retrieveQA")
      .addEdge("retrieveQA", "generateQA")
      .addEdge("generateQA", "__end__")
      .compile();

    return graph;
  };

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

  // analyzeQuery = async (state: typeof InputStateAnnotation.State) => {
  analyzeQuery = async (state: typeof InputStateAnnotation.State) => {
    const structuredLlm = llm.withStructuredOutput(searchStruct);
    const result = await structuredLlm.invoke(state.question);
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
    const response = await llm.invoke(state.question, docsContent);
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
  
    const stream = await this.graph.stream(inputs, { streamMode: 'messages' });
    return stream;
  };
}

export default RetrievalAI;

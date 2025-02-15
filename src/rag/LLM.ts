import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOllama } from "@langchain/ollama";
import { pull } from "langchain/hub";
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { retrieverSchema } from "./RetrievalAI";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";


// predefined llm model names
export const deepSeekR1 = "deepseek-r1:14b";

// local model host (ollama instance or similar);
export const localModelHost = 'http://localhost:11434';

// predefined search schema for parsing user prompt
export const searchStruct = z.object({
  query: z.string().describe("Search query to run."),
  section: z.enum(["beginning", "middle", "end"]).describe("Section to query."),
});
export type SectionQuerySchema = z.infer<typeof searchStruct>;

// predefined template to add system prompt and message format
export const template = `Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Use three sentences maximum and keep the answer as concise as possible.
Always say "thanks for asking!" at the end of the answer.

{context}

Question: {question}

Helpful Answer:`;

class LLM {
  modelName: string;
  host: string;
  api: ChatOllama;

  constructor(name: string = deepSeekR1, host: string = localModelHost) {
    this.modelName = name;
    this.host = host;
    
    const llm = new ChatOllama({
      baseUrl: host,
      model: name,
      temperature: 0.6,
    });
    this.api = llm;
  };
  
  pullTemplate = async () => {
    return await pull<ChatPromptTemplate>("rlm/rag-prompt");
  };

  invoke = async (question: BaseLanguageModelInput, context: string = '') => {
    const promptTemplate = await this.pullTemplate();
    // const promptTemplate = ChatPromptTemplate.fromMessages([
    //   ["user", template],
    // ]);
    let messages;
    if (typeof question === 'string') {
      messages = await promptTemplate.invoke({
        question,
        context,
      });
    } else {
      messages = question;
    }
    const response = await this.api.invoke(messages);
    return response;
  };

  withStructuredOutput = (searchSchema: typeof searchStruct) => {
    return this.api.withStructuredOutput(searchSchema);
  };

  bindTools = (tools: DynamicStructuredTool<typeof retrieverSchema>[]) => {
    return this.api.bindTools(tools);
  };
}

export default LLM;

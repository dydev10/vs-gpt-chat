import { AIMessageChunk } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { ChatOllama } from "@langchain/ollama";


export type LLMChatContext = {
  question: string;
  docContext: string;
}

export type LLMChatMessage = {
  role: 'user' | 'assistant' | 'system',
  content: string;
  context: LLMChatContext;
};
export type LLMChatHistory = LLMChatMessage[]; 

// TODO: make this class streamable(use with prompt.pipe()) like langchain classes
class LLMChat {
  abortController: AbortController;
  modelName: string;
  threadId: string;
  model: ChatOllama;
  chatHistory: LLMChatHistory;
  // vectorDBService: VectorDBService; 

  constructor(modelName: string, threadId: string = crypto.randomUUID()) {
    this.modelName = modelName;
    this.threadId = threadId;
    this.chatHistory = [];
    this.model = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model:this.modelName,
      temperature: 0.6,
    });

    this.abortController = new AbortController();
  }

  systemPromptTemplate: (docContext: string, question: string) => LLMChatMessage = (docContext, question) => ({
    role: 'system',
    content: `A conversation between User and Assistant.
    The user asks a question, and the Assistant solves it.
    The Assistance first thinks about the reasoning process in the mind and then provides the user with the answer.
    The reasoning process and answer are enclosed within <think> </think> and <answer> </answer> tags, respectively, i.e., <think> reasoning process here </think> <answer> answer here </answer>.
    You are an Assistance who knows everything about Aseprite, a software tool for Pixel art & Animated sprite
    Use the below content to augment what you know about Aseprite.
    The context will provide you with the basic Aseprite api and parsing information for .ase/.aseprite file format.
    ----------------
    START CONTEXT
    {docContext}
    END CONTEXT
    ----------------
    QUESTION: {question}
    ----------------
    `,
    context: {
      question,
      docContext,
    }
  });

  // TODO: fix stream typing to make it arg
    chat = async (question: string, docContext: string = ''): Promise<IterableReadableStream<AIMessageChunk>> => {
      const systemMessage = this.systemPromptTemplate(docContext, question);

      // systemMessage contains userPrompt as question, so only system Message stored in history is enough
      this.chatHistory.push(systemMessage);
      const prompt = ChatPromptTemplate.fromMessages([
        [systemMessage.role, systemMessage.content ],
        [ 'user', question],
      ]);

      console.log('THREAD ID', this.threadId);
      
  
      const chain = prompt.pipe(this.model);
      const response = await chain.stream(
        {
          docContext,
          question,
        },
        {
          signal: this.abortController.signal,
          configurable: {
            threadId: this.threadId,
          }
        }
      );
      return response;
    };
}

export default LLMChat;

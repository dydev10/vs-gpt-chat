import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOllama } from "@langchain/ollama";

export type LLMChatMessage = {
  role: 'user' | 'assistant' | 'system',
  content: string;
};
export type LLMChatHistory = LLMChatMessage[]; 

// TODO: make this class streamable(use with prompt.pipe()) like langchain classes
class LLMChat {
  modelName: string;
  model: ChatOllama;
  chatHistory: LLMChatHistory;
  // vectorDBService: VectorDBService; 

  constructor(modelName: string) {
    this.modelName = modelName;
    this.chatHistory = [];
    this.model = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model:this.modelName,
      temperature: 0.6,
    });
  }

  systemPromptTemplate: (docContext: string, userPrompt: string) => LLMChatMessage = (docContext, userMessage) => ({
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
    QUESTION: {userPrompt}
    ----------------
    `,
  });

  // TODO: fix stream typing to make it arg
    chat = async (userPrompt: string, docContext: string = '') => {
      const systemMessage = this.systemPromptTemplate(docContext, userPrompt);
    
      const prompt = ChatPromptTemplate.fromMessages([
        [systemMessage.role, systemMessage.content ],
        [ 'user', userPrompt],
      ]);
  
      const chain = prompt.pipe(this.model);
      const response = await chain.stream({
        docContext,
        userPrompt,
      });
      return response;
    };
}

export default LLMChat;

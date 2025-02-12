import { ChatOllama } from "@langchain/ollama";

class LangModel {
  modelName: string;
  model: ChatOllama;

  constructor(modelName: string = 'deepseek-r1:7b') {
    this.modelName = modelName;
    
    this.model = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model: 'deepseek-r1:7b',
    });
  }

  // TODO: fix stream typing to make it arg
  chat = async (userPrompt: string) => {
    const response = await this.model.client.chat({
      model: this.modelName,
      messages: [{ role: 'user', content: userPrompt }],
      stream: true,
    });
    return response;
  };
}

export default LangModel;

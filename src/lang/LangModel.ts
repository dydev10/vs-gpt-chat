import ollama, { ChatResponse } from "ollama";
import { Stream } from "stream";

class LangModel {
  model: string;

  constructor(model: string = 'deepseek-r1:7b') {
    this.model = model;
  }

  // TODO: fix stream typing to make it arg
  chat = async (userPrompt: string): Promise<AsyncIterable<ChatResponse>> => {
    return await ollama.chat({
      model: this.model,
      messages: [{ role: 'user', content: userPrompt }],
      stream: true,
    });
  };
}

export default LangModel;

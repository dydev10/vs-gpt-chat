import VectorStore from "./VectorStore";
import LLM from "./LLM";


const modelName = 'deepseek-r1:14b';

const llm = new LLM();

const vectorStore = new VectorStore();

export { modelName, llm, vectorStore };


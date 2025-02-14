import { SomeId } from "@datastax/astra-db-ts";
import { OllamaEmbeddings } from "@langchain/ollama";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";


class VectorEmbedder {
  ready: boolean;
  embeddings: OllamaEmbeddings;
  splitter: RecursiveCharacterTextSplitter;
  
  constructor() {
    console.log('Embedder Init');
    
    this.ready = false;
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 512,
      chunkOverlap: 100,
      // chunkSize: 1000,
      // chunkOverlap: 200,
    });
    this.embeddings = new OllamaEmbeddings({
      baseUrl: 'http://localhost:11434',
      // model: 'text-embedding-3-small',  //  dimension =  1536
      model: 'nomic-embed-text',  //  dimension = 768
    });
  }

  setup = async () => {
    await this.pullEmbeddingsModel();
  };
  
  pullEmbeddingsModel = async () => {
    // console.log("Awaiting embeddings PULL...");

    return this.embeddings.client.pull({
      model: 'nomic-embed-text',
    })
    .then(() => {
      // console.log('Done Embedding PULL');
      
      this.ready = true;
      return;
    });
  };

  /**
   * TODO: return iterable stream instead of callback for onChunk
   * OR flag stream=true or create stream* variant
   */
  createVectorEmbeds = async (content: string, onChunk: (vector: number[], chunk: string) => Promise<void | SomeId>): Promise<number[][]> => {
    if (!this.ready) {
      throw new Error('Too soon. Still PULLING embeddings');
    }

    const vectorEmbeds = [];
    const chunks = await this.splitter.splitText(content);

    for await (const chunk of chunks) {    
      try {
        const vector = await this.embeddings.embedQuery(chunk);
        console.log('Vectors length from embed', vector.length);
        vectorEmbeds.push(vector);

        // sideEffect
        await onChunk(vector, chunk);        
      } catch (error) {
        console.log('...xxxOHno vector', error);
        throw error;
      }
    }
    
    // async awaited aggregated res
    return vectorEmbeds;
  };
}

export default VectorEmbedder;

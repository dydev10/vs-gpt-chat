import { ChromaClient } from "chromadb";
import VectorDBService, { SimilarityMetric } from "./VectorDBService";


class ChromaService extends VectorDBService {
  chromaClient: ChromaClient;

  constructor() {
    super();
    const {
      CHROMA_URL,
    } = process.env;
    
    console.log('$$ CHROMA: DB Init...');
    
    this.chromaClient = new ChromaClient({
      path: CHROMA_URL,
    });
  }
  
  tempChroma = async () => {
    const {
      CHROMA_COLLECTION,
    } = process.env;
    const collection = await this.chromaClient.getOrCreateCollection({
      name: CHROMA_COLLECTION ?? 'fallback_collection',
    });    
    
    const docs = Array
      .from({ length: 3 })
      .map(() => `This is sample doc with a random number: ${Math.random() * 100}`);
    const docIds = docs.map(() => crypto.randomUUID());
    
    await collection.add({
      documents: docs,
      ids: docIds,
    });

    const randomRes = await collection.query({
      queryTexts: "with a random number:", // Chroma will embed this for you
      nResults: 2, // how many results to return
    });
    return randomRes;
  };
}

export default ChromaService;

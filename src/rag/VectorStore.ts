
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { DocumentInterface } from "@langchain/core/documents";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Document } from "langchain/document";

const { CHROMA_URL } = process.env;

class VectorStore {
  embeddings: OllamaEmbeddings;
  api: Chroma;
  
  constructor() {
    const embeddings = new OllamaEmbeddings({
      baseUrl: 'http://localhost:11434',
      // model: 'text-embedding-3-small',  //  dimension =  1536
      model: 'nomic-embed-text',  //  dimension = 768
    });
    this.embeddings = embeddings;
    
    const vectorStore = new Chroma(embeddings, {
      collectionName: "rag-collection",
      url: CHROMA_URL,
    });
    this.api = vectorStore;
  }

  setDocumentMetadata = (allSplits: Document[]): Document[] => {
    // already done in scrapper for doc metadata,
    // maybe set here any additional store specific metadata

    return allSplits;
  };

  addDocuments = async (allSplits: Document[]) => {
    this.setDocumentMetadata(allSplits);
    await this.api.addDocuments(allSplits);
  };

  /**
   * vector query helpers
   */
  similaritySearch = async (query: string, limit: number, filter?: {}): Promise<DocumentInterface[]> => {
    const result = await this.api.similaritySearch(
      query,
      limit,
      filter,
    );

    return result;
  };
}

export default VectorStore;

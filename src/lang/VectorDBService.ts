import { DataAPIClient, Db } from "@datastax/astra-db-ts";

export type SimilarityMetric = 'dot_product' | 'cosine' | 'euclidean';

class VectorDBService {
  client: DataAPIClient;
  db: Db;

  constructor() {
    const {
      ASTRA_DB_TOKEN,
      ASTRA_DB_NAMESPACE,
      ASTRA_DB_COLLECTION,
      ASTRA_DB_URL,
    } = process.env;

    console.log('DB Init', {
      ASTRA_DB_TOKEN,
      ASTRA_DB_NAMESPACE,
      ASTRA_DB_COLLECTION,
      ASTRA_DB_URL,
    });
    

    this.client = new DataAPIClient(ASTRA_DB_TOKEN);  
    this.db = this.client.db(
      ASTRA_DB_URL as string,
      {
        namespace: ASTRA_DB_NAMESPACE,
      },
    );
  }

  createCollection = async (similarityMetric: SimilarityMetric = 'dot_product') => {
    const {
      ASTRA_DB_COLLECTION,
    } = process.env;

    if (ASTRA_DB_COLLECTION) {
      console.log('Called create conn');
      const conn = await this.db.createCollection(
        ASTRA_DB_COLLECTION,
        {
          vector: {
            // dimension: 1536,  //  for text-embedding-3-small
            dimension: 768,  // for nomic-embed-text
            metric: similarityMetric,
          }
        },
      );

      console.log("DB CONNECTION", conn);
      return conn;
      
    } else {
      throw new Error('No Collection name defined in .env file')
    }
  };

  getCollection = async (collectionName: string = process.env.ASTRA_DB_COLLECTION as string) => {
    return this.db.collection(collectionName);
  };
}

export default VectorDBService;

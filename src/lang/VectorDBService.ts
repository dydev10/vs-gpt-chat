import { DataAPIClient, Db, SomeDoc } from "@datastax/astra-db-ts";

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

  writeChunkEmbeddings = async (vector: number[], chunk: string) => {
    try {
      const collection = await this.getCollection();
      const resp = await collection.insertOne({
        $vector: vector,
        text: chunk,
      });
      console.info('VectorDBService:: Finished write to DB:', resp.insertedId);
      return resp.insertedId;
    } catch (error) {
      throw new Error('VectorDBService:: Error:: writeChunkEmbeddings :: Failed write to db!');
    }
  };

  findVectorDocs = async (vector: number[]) => {
    try {
      const collection = await this.getCollection();
      const cursor = collection.find({}, {
        sort: {
          $vector: vector,
        },
        limit: 10,
      });

      const docs = await cursor.toArray();
      const docsMap = docs.map((doc: SomeDoc) => doc.text); 
      
      console.info('VectorDBService:: Found vector docs from DB:', docsMap);
      return docsMap;
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.stack);
      }
      throw new Error('VectorDBService:: Error:: findChunkEmbeddings :: Failed query for chunk embeddings!');
    }
  };
}

export default VectorDBService;

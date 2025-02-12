import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
// import { PromptTemplate } from '@langchain/core/prompts';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import VectorDBService from "./VectorDBService";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";

class LangModel {
  docSources: string[];
  modelName: string;
  model: ChatOllama;
  splitter: RecursiveCharacterTextSplitter;
  vectorDBService: VectorDBService; 

  constructor(modelName: string = 'deepseek-r1:7b') {
    this.modelName = modelName;
    this.docSources = [
      'https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md',
      'https://www.aseprite.org/api',
      'https://www.aseprite.org/api/app#app',
    ];

    this.model = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model: 'deepseek-r1:7b',
    });

    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 512,
      chunkOverlap: 100,
    });

    this.vectorDBService = new VectorDBService();       
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

  scrapPage = async (url: string): Promise<string> => {
    console.log('----Call Scrapper here.... url:--:', url);

    const loader = new PuppeteerWebBaseLoader(url, {
      launchOptions: {
        headless: true,
      },
      gotoOptions: {
        waitUntil: 'domcontentloaded',
      },
      evaluate: async (page, browser) => {
        const result = await page.evaluate(() => document.body.innerHTML);
        await browser.close();
        return result; 
      },
    });

    const scrapped =(await loader.scrape())?.replace(/<[^>]*>?/gm, '')

    console.log('Scrapped');
    

    // TODO: only keeps text content, change regex to include html and code
    return scrapped;
  }

  createSampleCollection = async () => {
    return await this.vectorDBService.createCollection()
      .then(() => {
        return this.loadSampleData();
      });
  };

  /**
   * [SEED] only called once on install for seed data
   */
  setupSample = () => {
    this.createSampleCollection().then(() => {
      console.log('DONE setup Samples');
    });
  };

  loadSampleData = async () => {
    const collection = await this.vectorDBService.getCollection();
    for await (const url of this.docSources) {
      const content = await this.scrapPage(url);
      const chunks = await this.splitter.splitText(content);
              
      const embeddings = new OllamaEmbeddings({
        baseUrl: 'http://localhost:11434',
        // model: 'text-embedding-3-small',  //  dimension =  1536
        model: 'nomic-embed-text',  //  dimension = 768
        // input: chunk,
      });
      embeddings.client.pull({
        model: 'nomic-embed-text',
      })
      for await (const chunk of chunks) {        
        try {
          console.log("AWAITING embeddings...");
          const vector = await embeddings.embedQuery(chunk);
          console.log('Vectors length from embed', vector.length);

          const res = await collection.insertOne({
            $vector: vector,
            text: chunk,
          });
          console.log('Db write chunk res', res);
        } catch (error) {
          console.log('OHno', error);
          throw error;
        }
      }
    }

    return collection;
  };
}

export default LangModel;

import VectorDBService from "./VectorDBService";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import VectorEmbedder from "./VectorEmbedder";
import { Message } from "ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import LLMChat from "./LLMChat";
import { sampleUrls } from "./samples";

class LangModel {
  threadId: string;
  docSources: string[];
  modelName: string;
  llmChat: LLMChat;
  vectorDBService: VectorDBService; 

  constructor(modelName: string = 'deepseek-r1:14b') {
    this.threadId = crypto.randomUUID();    
    this.modelName = modelName;
    this.docSources = [...sampleUrls];

    this.llmChat = new LLMChat(this.modelName, this.threadId);
    this.vectorDBService = new VectorDBService();       
  }

  getContentVectors = async (getContentVectors: string): Promise<number[][]> => {
    let contentVectors: number[][] = [];
    const embeddings = new VectorEmbedder();
    await embeddings.setup();
    await embeddings.createVectorEmbeds(
      getContentVectors,
      async (vector, _chunk) => {
        contentVectors.push(vector);
      }
    );
    return contentVectors;
  };

  sendMessage = async (userMessage: string) => {
    let docContext = "";
    const contentVectors = await this.getContentVectors(userMessage);
    console.log('!!!Done getContentVectors', contentVectors);
    
    try {
      for (const vec of contentVectors) {
        const docs = await this.vectorDBService.findVectorDocs(vec);
        docContext = docContext + JSON.stringify(docs);
      }
    } catch (error) {
      docContext = '';
      throw new Error('LangModel:: Error:: sendMessage: Error while fetching vector docs');
    }

    const chatStream = this.llmChat.chat(userMessage, docContext);
    return chatStream;
  };


  /**
   * data seed stuff
   */
  scrapPage = async (url: string): Promise<string> => {
    console.log('----Called Scrapper here.... url:--:', url);

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

    const scrapped = await loader.scrape();
    const strippedScrap = scrapped.replace(/<[^>]*>?/gm, '');
    console.log(':--: Scrapped!', url);

    // TODO: only keeps text content, change regex to include html and code
    return strippedScrap;
  };

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

      const embeddings = new VectorEmbedder();
      await embeddings.setup();
      
      await embeddings.createVectorEmbeds(
        content,
        this.vectorDBService.writeChunkEmbeddings,
      );
    }

    console.log('...Finished loadSampleData');
    return collection;
  };
}

export default LangModel;

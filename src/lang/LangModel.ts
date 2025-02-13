import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
// import { PromptTemplate } from '@langchain/core/prompts';
import VectorDBService from "./VectorDBService";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import VectorEmbedder from "./VectorEmbedder";
import { Message } from "ollama";

const systemPromptTemplate: (docContext: string, userMessage: string) => Message = (docContext, userMessage) => ({
  role: 'user',
  content: `A conversation between User and Assistant.
  The user asks a question, and the Assistant solves it.
  The Assistance first thinks about the reasoning process in the mind and then provides the user with the answer.
  The reasoning process and answer are enclosed within <think> </think> and <answer> </answer> tags, respectively, i.e., <think> reasoning process here </think> <answer> answer here </answer>.
  You are an Assistance who knows everything about Aseprite, a software tool for Pixel art & Animated sprite
  Use the below content to augment what you know about Aseprite.
  The context will provide you with the basic Aseprite api and file format.
  ----------------
  START CONTEXT
  ${docContext}
  END CONTEXT
  ----------------
  QUESTION: ${userMessage}
  ----------------
  `,
});

class LangModel {
  docSources: string[];
  modelName: string;
  model: ChatOllama;
  vectorDBService: VectorDBService; 

  constructor(modelName: string = 'deepseek-r1:14b') {
    this.modelName = modelName;
    this.docSources = [
      'https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md',
      'https://www.aseprite.org/api',
      'https://www.aseprite.org/api/app#app',
    ];

    this.model = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model:this.modelName,
      temperature: 0,
    });

    this.vectorDBService = new VectorDBService();       
  }

  // TODO: fix stream typing to make it arg
  chat = async (userPrompt: string, docContext: string = '') => {
    const systemPrompt = systemPromptTemplate(docContext, userPrompt);
  
    const response = await this.model.stream(
      [
        [systemPrompt.role, systemPrompt.content ],
        [ 'user', userPrompt],
      ]
    );
    return response;
  };

  sendMessage = async (userMessage: string) => {
    let docContext = "";
    let messageVectors: number[][] = [];
    const embeddings = new VectorEmbedder();
    await embeddings.setup();
    await embeddings.createVectorEmbeds(
      userMessage,
      async (vector, _chunk) => {
        messageVectors.push(vector);
      }
    );

    try {
      for (const vec of messageVectors) {
        const docs = await this.vectorDBService.findVectorDocs(vec);
        docContext = docContext + JSON.stringify(docs);
      }
    } catch (error) {
      docContext = '';
      throw new Error('LangModel:: Error:: sendMessage: Error while fetching vector docs');
    }
    
    return this.chat(userMessage, docContext);
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
    console.log(':--: Scrapped!');

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
      
      embeddings.createVectorEmbeds(
        content,
        this.vectorDBService.writeChunkEmbeddings,
      );
    }

    return collection;
  };
}

export default LangModel;

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import {
  START,
  END,
  MessagesAnnotation,
  StateGraph,
  MemorySaver,
  BinaryOperatorAggregate,
  Messages,
  StateDefinition,
  AnnotationRoot,
  CompiledStateGraph,
} from "@langchain/langgraph";
import VectorEmbedder from "./VectorEmbedder";
import VectorDBService from "./VectorDBService";
import LLMChat from "./LLMChat";
import { sampleUrls } from "./samples";
import { BaseMessage } from "@langchain/core/messages";
import { ChatOllama } from "@langchain/ollama";

class LangModel {
  threadId: string;
  docSources: string[];
  modelName: string;
  llmChat: LLMChat;
  vectorDBService: VectorDBService;

  // workflow
  app: any;
  memory: MemorySaver;

  constructor(modelName: string = 'deepseek-r1:14b') {
    this.threadId = crypto.randomUUID();    
    this.modelName = modelName;
    this.docSources = [...sampleUrls];

    this.llmChat = new LLMChat(this.modelName, this.threadId);
    this.vectorDBService = new VectorDBService();
    
    // init workflow
    const {
      // workflow,
      memory,
      app
    } = this.setupAppWorkflow();

    this.app = app;
    this.memory = memory;
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

  // // Define the method for sending message to chatLLM model
  // callChatModel = (state: typeof MessagesAnnotation.State) => {
  //   // const chatStream = this.llmChat.chat(userMessage, docContext);
  //   const chatStream = this.llmChat.chat(state.messages[0]);
  //   return chatStream;
  // };

  setupAppWorkflow = () => {
    // const llm = this.llmChat.model;
    const llm = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model:this.modelName,
      temperature: 0.6,
    });

    // Define the function that calls the model
    const callModel = async (state: typeof MessagesAnnotation.State) => {
      // const response = await llm.invoke(state.messages);
      const response = await llm.stream(state.messages);
      return { messages: response };
    };
    // Define a new Workflow graph
    const workflow = new StateGraph(MessagesAnnotation)
    // Define the node and edge
    .addNode("model", callModel)
    .addEdge(START, "model")
    .addEdge("model", END);

    // Add memory
    const memory = new MemorySaver();
    const app = workflow.compile({ checkpointer: memory });

    return {
      workflow,
      memory,
      app
    };
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

    // const chatStream = this.llmChat.chat(userMessage, docContext);
    // return chatStream;
    const chatStream = await this.app.stream({ messages: ['user', userMessage] } , { configurable: { thread_id: this.threadId, streamMode: 'updates' }, streamMode: "updates", });
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

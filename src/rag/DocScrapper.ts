import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import "cheerio";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

// predefined html selector to target for scrapping
export const pTagSelector = "p";

class DocScrapper {
  local: boolean; // will be used to support local relative path
  loader: CheerioWebBaseLoader;
  splitter: RecursiveCharacterTextSplitter;
  /**
   * 
   * @param path path of the resource to read. relative paths are treaded local unless flag web=true
   * @param local set to true when path is always web url
   */
  constructor(path: string, local: boolean = false) {
    this.local = local;
    this.loader = new CheerioWebBaseLoader(path, {
      selector: pTagSelector,
    });

    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  };

  static runYoinkList = async (list: string[]): Promise<Document[][]> => {
    const yoinkList: Document[][] = [];
    for await (const url of list) {
      const scrapper = new DocScrapper(url);
      const contentSplits = await scrapper.yoinkDoc();

      yoinkList.push(contentSplits);
    }
    console.log('Finished ...All Yoink');
    return yoinkList;
  };

  loadDoc = async (): Promise<Document[]> => {
    const docs = await this.loader.load();

    console.assert(docs.length === 1, 'loaded doc *1', `loaded doc [${docs.length}]`);
    console.log(`Total characters: ${docs[0].pageContent.length}`);
    return docs;
  };

  splitDoc = async (docs: Document[]) => {
    const allSplits = await this.splitter.splitDocuments(docs);
    return allSplits;
  };

  setMetadata = (splits: Document[]) => {
    const totalDocuments = splits.length;
    const third = Math.floor(totalDocuments / 3);
    
    splits.forEach((document, i) => {
      if (i < third) {
        document.metadata["section"] = "beginning";
      } else if (i < 2 * third) {
        document.metadata["section"] = "middle";
      } else {
        document.metadata["section"] = "end";
      }
    });

    return splits;
  };

  yoinkDoc = async () => {
    const docs = await this.loadDoc();
    const splits = await this.splitDoc(docs);
    this.setMetadata(splits);
    console.log('Finished ...Yoink');
    return splits;
  };
}

export default DocScrapper;

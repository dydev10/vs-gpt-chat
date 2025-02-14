import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { vectorStore } from "./ragApp";

// step2
// export default async (): Document<Record<string, any>>[] => {
export const docLoading =  async (): Promise<Document[]> => {
  const pTagSelector = "p";
  const cheerioLoader = new CheerioWebBaseLoader(
    "https://lilianweng.github.io/posts/2023-06-23-agent/",
    {
      selector: pTagSelector,
    }
  );
  
  const docs = await cheerioLoader.load();
  
  console.assert(docs.length === 1);
  console.log(`Total characters: ${docs[0].pageContent.length}`);

  return docs;
};

// step2
export const textSplitting = async (docs: Document[]): Promise<Document[]> => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const allSplits = await splitter.splitDocuments(docs);
  console.log(`Split blog post into ${allSplits.length} sub-documents.`);

  return allSplits;
};

// step3
export const docStoring =  async (allSplits: Document[]) => {
  await vectorStore.addDocuments(allSplits);
};
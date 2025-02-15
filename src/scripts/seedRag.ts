
import '@dotenvx/dotenvx/config';
import { docIndexing, docIndexingQA } from '../rag/pipeIndexing';


docIndexing().then(() => {
  console.log('Done RAG indexing');
  
});
docIndexingQA().then(() => {
  console.log('Done RAG indexing');
  
});

console.log('...End script');





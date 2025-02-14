
import '@dotenvx/dotenvx/config';
import { docIndexing } from '../rag/pipeIndexing';


docIndexing().then(() => {
  console.log('Done RAG indexing');
  
});

console.log('...End script');





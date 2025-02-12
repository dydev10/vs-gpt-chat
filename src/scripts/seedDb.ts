
import '@dotenvx/dotenvx/config';
import LangModel from '../lang/LangModel';

const llm = new LangModel();

llm.setupSample();

console.log('...End script');





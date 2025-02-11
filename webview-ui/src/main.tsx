import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// import 'prismjs/themes/prism-tomorrow.css';
// import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
// import 'prismjs';

import './index.css'
import App from './App.tsx'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

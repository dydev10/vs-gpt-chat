import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'prismjs';
import 'prismjs/plugins/line-numbers/prism-line-numbers';

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

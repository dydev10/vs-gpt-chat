import React, { useEffect, useRef } from 'react'
import './Fresh.css';
import { parseCodeBlock } from '../utilities/parse';
import { WebviewApi } from 'vscode-webview';

const Fresh: React.FC = () => {
  // const vscode = acquireVsCodeApi();
  const vscodeRef = useRef<WebviewApi<unknown>>(null);

  const submitChat = () =>{
    const promptTextArea = document.getElementById('fresh-prompt') as HTMLInputElement;
    const text = promptTextArea.value;
    vscodeRef.current?.postMessage({ command: 'chat', text });

    console.log('submit');
    
  }

  const resetChat = () => {
    const promptTextArea = document.getElementById('fresh-prompt') as HTMLInputElement;
    promptTextArea.setSelectionRange(0, promptTextArea.value.length);
    promptTextArea.focus();
    promptTextArea.value = "";
  };

  useEffect(() => {
    console.log('Fresh Init');

    // vscodeRef.current = acquireVsCodeApi();

    document.getElementById('askForm')?.addEventListener('submit', (e) => {
					e.preventDefault();
					submitChat();
				});

    // trigger submit on enter press
    document.addEventListener('keydown', (e) => {
      if (!e.shiftKey && e.code == 'Enter') {
        e.preventDefault();
        submitChat();
      }
    })

    window.addEventListener('message', (ev) => {
      const { command, text } = ev.data;
      const responseEl = document.getElementById('fresh-response');

      if (command === 'chatResponse' && responseEl !== null) {
        responseEl.innerHTML = parseCodeBlock(text);
      }
      
      resetChat();
    });
  }, []);

  return (
      <div className="fresh-container">
        <form id="askForm" action="">
				<textarea autoFocus id="fresh-prompt" rows={3} placeholder="Ask ..."></textarea>
				<button type="submit" id="askBtn">Ask <span id="fresh-note">(Fresh Context)</span></button>
        </form>
        <div id="fresh-response"></div>
      </div>
  );
}

export default Fresh;

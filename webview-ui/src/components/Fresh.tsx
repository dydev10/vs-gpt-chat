import React, { FormEvent, KeyboardEvent, useCallback, useEffect } from 'react';
import './Fresh.css';
import { parseCodeBlock } from '../utilities/parse';
import useChat from '../hooks/useChat';

const Fresh: React.FC = () => {
  const handleMessage = useCallback((text: string) => {
    const responseEl = document.getElementById('fresh-response') as HTMLElement;
    responseEl.innerHTML = parseCodeBlock(text);

    resetChat();
  }, []);

  const { sendChat } = useChat(handleMessage);
  
  const submitChat = () => {
    const promptTextArea = document.getElementById('fresh-prompt') as HTMLInputElement;
    const text = promptTextArea.value;
    sendChat(text);
  }

  const resetChat = () => {
    const promptTextArea = document.getElementById('fresh-prompt') as HTMLInputElement;
    promptTextArea.setSelectionRange(0, promptTextArea.value.length);
    promptTextArea.focus();
    promptTextArea.value = "";
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleWebviewMessage = useCallback((ev: any) => {
    const { command, text } = ev.data;
    const responseEl = document.getElementById('fresh-response');

    if (command === 'chatResponse' && responseEl !== null) {
      responseEl.innerHTML = parseCodeBlock(text);
    }
    
    resetChat();
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    // trigger submit on enter press
    if (!e.shiftKey && e.code == 'Enter') {
      e.preventDefault();
      submitChat();
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitChat();
  };

  useEffect(() => {
    window.addEventListener('message', handleWebviewMessage);
    return () => {
      window.removeEventListener('message', handleWebviewMessage);
    }
  }, [handleWebviewMessage]);

  return (
      <div className="fresh-container">
        <form id="askForm" onSubmit={handleFormSubmit} action="">
				<textarea onKeyDown={handleKeyDown} autoFocus id="fresh-prompt" rows={3} placeholder="Ask ..."></textarea>
				<button type="submit" id="askBtn">Ask <span id="fresh-note">(Fresh Context)</span></button>
        </form>
        <div id="fresh-response"></div>
      </div>
  );
}

export default Fresh;

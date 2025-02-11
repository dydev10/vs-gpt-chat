import React, { useCallback } from 'react';
import './Fresh.css';
import { parseCodeBlock } from '../utilities/parse';
import useChat from '../hooks/useChat';
import useForm from '../hooks/useForm';

const Fresh: React.FC = () => {
  const resetChat = () => {
    const promptTextArea = document.getElementById('fresh-prompt') as HTMLInputElement;
    promptTextArea.setSelectionRange(0, promptTextArea.value.length);
    promptTextArea.focus();
    promptTextArea.value = "";
  };
  
  const handleMessage = useCallback((text: string) => {
    const responseEl = document.getElementById('fresh-response') as HTMLElement;
    responseEl.innerHTML = parseCodeBlock(text);

    resetChat();
  }, []);

  /**
   * hooks
   */
  const { sendChat } = useChat(handleMessage);
  const { handleKeyDown , handleFormSubmit} = useForm('fresh-prompt', sendChat);

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

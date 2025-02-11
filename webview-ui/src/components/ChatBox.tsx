import React, { useCallback, useState } from 'react'
import './ChatBox.css';
import useChat from '../hooks/useChat';
import useForm from '../hooks/useForm';
import { parseCodeBlock } from '../utilities/parse';

const ChatBox: React.FC = () => {
  const [responseId, setResponseId] = useState<number|null>(null);

  const createBubble = (text: string, bot: boolean = false, resId?: number) => {
    const chatBox = document.getElementById("chat-box") as HTMLElement;
    const bubbleEl = document.createElement("div");
    bubbleEl.classList.add("message", bot ? "bot": "user");
    bubbleEl.textContent = text;
    chatBox.appendChild(bubbleEl);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    if (bot && resId !== null) {
      bubbleEl.id =  `${resId}`;
    }
  }

  const updateBubble = (resId: number, text: string) => {
    const chatBox = document.getElementById("chat-box") as HTMLElement;
    const bubbleEl = document.getElementById(`${resId}`) as HTMLElement;
   
    bubbleEl.innerHTML = text;
    chatBox.scrollTop = chatBox.scrollHeight;
  }


  const handleMessage = useCallback((text: string) => {
    if (responseId) {
      updateBubble(responseId, parseCodeBlock(text));
    }
  }, [responseId]);

  const handleMessageStart = useCallback(() => {
    const resId = responseId === null ? 0 : responseId + 1;
    createBubble('', true, resId);
    
    setResponseId(resId);
  }, [responseId]);

  const handleMessageEnd = useCallback(() => {
    // setResponseId(null);
  }, []);

  /**
   * hooks
   */
  const { sendChat } = useChat(handleMessage, handleMessageStart, handleMessageEnd);
  const { handleKeyDown , handleFormSubmit} = useForm('chat-prompt', (text: string) => {
    createBubble(text, false);
    sendChat(text);
  });

  return (
      <div className="chat-container">
        <div className="chat-box" id="chat-box"></div>
        <form id="input-container" onSubmit={handleFormSubmit} action="">
				<textarea onKeyDown={handleKeyDown} autoFocus id="chat-prompt" rows={3} placeholder="Ask ..."></textarea>
				<button type="submit" id="sendBtn">Send</button>
        </form>
      </div>
  );
}

export default ChatBox
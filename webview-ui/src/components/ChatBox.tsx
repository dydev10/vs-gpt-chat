import React, { useCallback, useState } from 'react'
import './ChatBox.css';
import useChat from '../hooks/useChat';
import useForm from '../hooks/useForm';
import { parseCodeBlock } from '../utilities/parse';

type HistoryItem = {
  text: string;
  type: string;
  bubbleId: string;
};

export const bubbleIdByIndex = (index: number, bot: boolean = false) => {
  return `${index}${bot ? '' : '-user'}`;
}

const ChatBox: React.FC = () => {
  const [promptId, setPromptId] = useState<number|null>(null);
  const [responseId, setResponseId] = useState<number|null>(null);
  const [chatHistory, setChatHistory] = useState<HistoryItem[]>([]);

  console.log(chatHistory);

  const createBubble = (text: string, id: number, bot: boolean = false): string => {
    const chatBox = document.getElementById("chat-box") as HTMLElement;
    const bubbleEl = document.createElement("div");
    const bubbleId = bubbleIdByIndex(id, bot);
    bubbleEl.classList.add("message", bot ? "bot": "user");
    bubbleEl.textContent = text;
    chatBox.appendChild(bubbleEl);
    chatBox.scrollTop = chatBox.scrollHeight;
    bubbleEl.id =  bubbleId;

    return bubbleId;
  }

  const updateBubble = (id: number, text: string) => {
    const chatBox = document.getElementById("chat-box") as HTMLElement;
    const bubbleEl = document.getElementById(bubbleIdByIndex(id, true)) as HTMLElement;
   
    bubbleEl.innerHTML = text;
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  const getBubble = (id: number, bot: boolean = false) => {
    const bubbleEl = document.getElementById(bubbleIdByIndex(id, bot)) as HTMLElement;
    return {
      content: bubbleEl.innerHTML,
      id: bubbleEl.id,
    }
  }


  const handleMessage = useCallback((text: string) => {
    if (responseId !== null) {
      updateBubble(responseId, parseCodeBlock(text));
    }
  }, [responseId]);

  const handleMessageStart = useCallback(() => {
    const id = responseId === null ? 0 : responseId + 1;
    
    createBubble('', id, true);;
    
    setResponseId(id);
  }, [responseId]);

  const handleMessageEnd = useCallback(() => {
    // setResponseId(null);
    if (responseId !== null) {
      const bubble = getBubble(responseId, true);
       setChatHistory((history) => [
        ...history,
        { text: bubble.content,
          bubbleId: bubble.id,
          type: 'prompt',}
      ])
    }
  }, [responseId]);

  /**
   * hooks
  */
 const { sendChat } = useChat(handleMessage, handleMessageStart, handleMessageEnd);
 
 const handlePrompt = useCallback((text: string) => {
   const id = promptId === null ? 0 : promptId + 1;
   const bubbleId = createBubble(text, id, false);
   sendChat(text);
   setPromptId(id);
   setChatHistory((history) => [...history, { text, bubbleId, type: 'prompt',}])
 }, [sendChat, promptId]);
  const { handleKeyDown , handleFormSubmit} = useForm('chat-prompt', handlePrompt);

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
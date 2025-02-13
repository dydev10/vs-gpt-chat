import React, { useCallback, useRef, useState } from 'react'
import './ChatBox.css';
import useChat from '../hooks/useChat';
import useForm from '../hooks/useForm';
import { formatMessage } from '../utilities/parse';

type HistoryItemType = 'prompt' | 'response';
type HistoryItem = {
  type: HistoryItemType;
  text: string;
  bubbleId: string;
  message: ChatMessage;
};

export type ChatRole = 'user' | 'system' | 'assistant';
type ChatMessage = {
  role: ChatRole;
  content: string;
};

const ChatBox: React.FC = () => {
  const [promptId, setPromptId] = useState<number|null>(null);
  const [responseId, setResponseId] = useState<number|null>(null);
  const [chatHistory, setChatHistory] = useState<HistoryItem[]>([]);
  const responseItem = useRef<HistoryItem | null>(null);

  console.log("Full History: ", chatHistory);

  const createBubble = useCallback((text: string, id: number, bot: boolean = false): string => {
    const chatBox = document.getElementById("chat-box") as HTMLElement;
    const bubbleEl = document.createElement("div");
    const bubbleId = bubbleIdByIndex(id, bot);
    
    bubbleEl.id =  bubbleId;
    bubbleEl.innerHTML = text;
    bubbleEl.classList.add("message", "prose", bot ? "bot": "user");
    
    chatBox.appendChild(bubbleEl);
    chatBox.scrollTop = chatBox.scrollHeight;

    return bubbleId;
  }, []);

  const updateBubble = useCallback((id: number, text: string) => {
    const chatBox = document.getElementById("chat-box") as HTMLElement;
    const bubbleEl = document.getElementById(bubbleIdByIndex(id, true)) as HTMLElement;
   
    bubbleEl.innerHTML = text;
    chatBox.scrollTop = chatBox.scrollHeight;
  }, []);

  const bubbleIdByIndex = (index: number, bot: boolean = false) => {
    return `${bot ? 'bot-' : 'user-'}${index}`;
  }


  const handleMessageChunk = useCallback((text: string) => {
    if (responseId !== null) {
      updateBubble(responseId, formatMessage(text));
    }
  }, [responseId, updateBubble]);

  const handleMessageStart = useCallback(() => {
    const id = responseId === null ? 0 : responseId + 1;
    setResponseId(id);
        
    const bubbleId = createBubble('', id, true);;
    const message : ChatMessage = {
      role: 'assistant',
      content: '',
    };
    const historyItem: HistoryItem = {
      message,
      type: 'response',
      text: '',
      bubbleId,
    };

    responseItem.current = historyItem ;
  }, [responseId, createBubble]);

  const handleMessageEnd = useCallback(() => {
    const item = responseItem.current;
    responseItem.current = null;

    if (responseId !== null && item !== null) {
       setChatHistory((history) => [
        ...history,
        item,
      ]);
    }
  }, [responseId]);

  /**
   * hooks
  */
 const { sendChat } = useChat(handleMessageChunk, handleMessageStart, handleMessageEnd);
 
 const handlePrompt = useCallback((text: string) => {
   const id = promptId === null ? 0 : promptId + 1;
   const bubbleId = createBubble(text, id, false);
   sendChat(text);
   setPromptId(id);
   setChatHistory((history) => [
    ...history,
    {
      text,
      bubbleId,
      type: 'prompt',
      message: {
        role: 'user',
        content: text,
      },
    }
  ]);
 }, [sendChat, promptId, createBubble]);
  const { handleKeyDown , handleFormSubmit} = useForm('chat-prompt', handlePrompt);

  return (
      <div className="chat-container">
        <div className="chat-box" id="chat-box"></div>
        <form id="input-container" onSubmit={handleFormSubmit} action="">
				<textarea onKeyDown={handleKeyDown} autoFocus id="chat-prompt" rows={2} placeholder="Type ..."></textarea>
				<button type="submit" id="sendBtn">Send</button>
        </form>
      </div>
  );
}

export default ChatBox
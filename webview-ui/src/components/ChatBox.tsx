import React, { useCallback } from 'react'
import './ChatBox.css';
import useChat from '../hooks/useChat';
import useForm from '../hooks/useForm';
import { parseCodeBlock } from '../utilities/parse';

const ChatBox: React.FC = () => {
  const createBubble = (text: string, bot: boolean = false) => {
    const chatBox = document.getElementById("chat-box") as HTMLElement;
    const bubbleEl = document.createElement("div");
    bubbleEl.classList.add("message", bot ? "bot": "user");
    bubbleEl.textContent = text;
    chatBox.appendChild(bubbleEl);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
  const handleMessage = useCallback((text: string) => {
    const responseEl = document.getElementById('fresh-response') as HTMLElement;
    responseEl.innerHTML = parseCodeBlock(text);

    const botText = "I'm just a bot!. hUGE TEST RESPONSE. SKFHFKHAFS FIHAFKAFHASHKFASF SFHSFKHASFAS";
    createBubble(botText, true);
  }, []);

  /**
   * hooks
   */
  const { sendChat } = useChat(handleMessage);
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
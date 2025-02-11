import React from 'react'
import './ChatBox.css';

const ChatBox: React.FC = () => {
  function sendMessage() {
    const input = document.getElementById("message-input") as HTMLInputElement;
    const message = input.value.trim();
    if (message === "") return;

    const chatBox = document.getElementById("chat-box") as HTMLElement;
    const userMessage = document.createElement("div");
    userMessage.classList.add("message", "user");
    userMessage.textContent = message;
    chatBox.appendChild(userMessage);

    setTimeout(() => {
        const botMessage = document.createElement("div");
        botMessage.classList.add("message", "bot");
        botMessage.textContent = "I'm just a bot!. hUGE TEST RESPONSE. SKFHFKHAFS FIHAFKAFHASHKFASF SFHSFKHASFAS";
        chatBox.appendChild(botMessage);
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 500);

    input.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;
}

  return (
      <div className="chat-container">
        <div className="chat-box" id="chat-box"></div>
        <div className="input-container">
            <input type="text" id="message-input" placeholder="Type a message..." />
            <button onClick={sendMessage}>Send</button>
        </div>
      </div>
  );
}

export default ChatBox
import React from 'react'
import './ChatBox.css';

const ChatBox: React.FC = () => {
  const sendMessage = () => {
    console.log('mock');
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
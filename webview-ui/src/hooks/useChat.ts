import { useCallback, useEffect } from "react";
import { vscode } from "../utilities/vscode";

export type ChatRole = 'human' | 'AI' | 'system';
export type ChatMessage = {
  role: ChatRole;
  content: string;
};

const useChat = (
  onMessage?: (text: string) => void,
  onMessageStart?: () => void,
  onMessageEnd?: () => void,
) => {
  const sendChat = (text: string, history: ChatMessage[] = []) => {
    console.log("...Messages History[]:", history);

    vscode.postMessage({ command: 'chat', text });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleWebviewMessage = useCallback((ev: any) => {
    const { command, text } = ev.data;
    if (command === 'chatResponse' && onMessage) {
      onMessage(text);
    }
    if (command === 'chatStart' && onMessageStart) {
      onMessageStart();
    }
    if (command === 'chatEnd' && onMessageEnd) {
      onMessageEnd();
    }
    
  }, [onMessage, onMessageStart, onMessageEnd]);

  useEffect(() => {
    window.addEventListener('message', handleWebviewMessage);
    return () => {
      window.removeEventListener('message', handleWebviewMessage);
    }
  }, [handleWebviewMessage]);

  return {
    sendChat,
  };
};

export default useChat;

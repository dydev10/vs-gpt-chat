import { useCallback, useEffect } from "react";
import { vscode } from "../utilities/vscode";

const useChat = (onMessage?: (text: string) => void) => {
  const sendChat = (text: string) => {
    vscode.postMessage({ command: 'chat', text });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleWebviewMessage = useCallback((ev: any) => {
    const { command, text } = ev.data;
    if (command === 'chatResponse' && onMessage) {
      onMessage(text);
    }
    
  }, [onMessage]);

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

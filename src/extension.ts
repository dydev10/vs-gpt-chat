import ollama from 'ollama';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "vs-gpt-chat" is now active!');

	// The command has been defined in the package.json file
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('vs-gpt-chat.startChat', () => {
		// vscode.window.showInformationMessage('Starting chat with from vs-gpt-chat...');
		const panel = vscode.window.createWebviewPanel(
			'deepChat',
			'Deep Seek Chat',
			vscode.ViewColumn.One,
			{ enableScripts: true }
		);


		panel.webview.html = getWebviewContent(); 
		
		panel.webview.onDidReceiveMessage(async (message: any) => {
			if (message.command === 'chat') {
				const userPrompt = message.text;
				let responseText = '';

				try {
					const streamResponse = await ollama.chat({
						model: 'deepseek-r1:7b',
						messages: [{ role: 'user', content: userPrompt }],
						stream: true,
					});

					for await (const part of streamResponse) {
						responseText += part.message.content;
						panel.webview.postMessage({ command: 'chatResponse', text: responseText });
					}
				} catch (error: any) {
					panel.webview.postMessage({ command: 'chatError', text: String(error.message) });
					vscode.window.showErrorMessage('Error while running model', error.message);
				}
			}
		}); 
	});
	
	context.subscriptions.push(disposable);
}

function getWebviewContent() {
	return /*html*/`
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>DY DeepSeek Chat</title>
			<style>
				 body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
						overflow: hidden;
            background-color: #f4f4f4;
						margin: 0;
        }
        .chat-container {
            width: 300px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .chat-box {
            height: 300px;
            overflow-y: auto;
            padding: 10px;
            border-bottom: 1px solid #ccc;
            display: flex;
            flex-direction: column;
        }
        .message {
            padding: 8px;
            margin: 5px 0;
            max-width: 70%;
        }
        .user {
            background-color: #007bff;
            color: white;
            align-self: flex-end;
            border-radius: 10px 10px 0 10px;
            padding: 8px;
        }
        .bot {
            background-color: #e1e1e1;
            color: black;
            align-self: flex-start;
            width: 100%;
            padding: 8px;
        }
        .input-container {
            display: flex;
            padding: 10px;
        }
        input {
            flex: 1;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 5px;
        }
        button {
            margin-left: 5px;
            padding: 8px 12px;
            border: none;
            background: #007bff;
            color: white;
            border-radius: 5px;
            cursor: pointer;
        }
				
				#fresh-prompt {
					width: 100%;
					box-sizing:
					border-box;
				}

				#fresh-note {
					font-size: 0.625rem;
				}

				#fresh-response {
					border: 1px solid #ccc;
					margin-top: 1rem;
					padding: 0.5rem;
					white-space: pre-wrap;
					max-height: 100%;
					overflow-y: auto;
				}
				code {
					display: block;
					background-color: #282c34;
					color: #abb2bf;
					padding: 10px;
					border-radius: 5px;
					font-family: monospace;
					white-space: pre-wrap;
				}
			</style>
		</head>
		<body>
			<h2>DY DeepSeek Chat</h2>
			<form id="askForm" action="">
				<textarea autofocus id="fresh-prompt" rows="3" placeholder="Ask ..."></textarea>
				<button type="submit" id="askBtn">Ask <span id="fresh-note">(Fresh Context)</span></button>
			</form>
			<div id="fresh-response"></div>

			<div class="chat-container">
        <div class="chat-box" id="chat-box"></div>
        <div class="input-container">
            <input type="text" id="message-input" placeholder="Type a message...">
            <button onclick="sendMessage()">Send</button>
        </div>
    	</div>
		
			<script>
				const vscode = acquireVsCodeApi();

				const submitChat = () =>{
					const promptTextArea = document.getElementById('fresh-prompt');
					const text = promptTextArea.value;
					vscode.postMessage({ command: 'chat', text });
				}

				const resetChat = () => {
					const promptTextArea = document.getElementById('fresh-prompt');
					promptTextArea.setSelectionRange(0, promptTextArea.value.length);
					promptTextArea.focus();
					promptTextArea.value = "";
				};
		
				document.getElementById('askForm').addEventListener('submit', (e) => {
					e.preventDefault();
					submitChat();
				});

				// trigger submit on enter press
				document.addEventListener('keydown', (e) => {
					if (!e.shiftKey && e.code == 'Enter') {
						e.preventDefault();
						submitChat();
					}
				})
		
				window.addEventListener('message', (ev) => {
					const { command, text } = ev.data;

					if (command === 'chatResponse') {
						document.getElementById('fresh-response').innerHTML = parseCodeBlock(text);
					}
					
					resetChat();
				});

				function htmlEntities(str) {
					return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
				}

				const parseCodeBlock = (string) => {
					const codeRegex = /\`\`\`(.*?)\`\`\`/sg;
					const encoded = htmlEntities(string);
					console.log('encoded', encoded);
					return encoded.replaceAll(codeRegex, (match) => {
						return '<br><code>' + match.slice(3, -3) + '</code><br>';
					});
				};
			</script>
		</body>
		</html>
	`;
}

export function deactivate() {}

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
					font-family: sans-serif;
					margin: 1rem;
				}
				#prompt {
					width: 100%;
					box-sizing:
					border-box;
				}
				#response {
					border: 1px solid #ccc;
					margin-top: 1rem;
					padding: 0.5rem;
					white-space: pre-wrap;
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
				<textarea autofocus id="prompt" rows="3" placeholder="Ask ..."></textarea>
				<button type="submit" id="askBtn">Ask</button>
			</form>
			<div id="response"></div>
		
			<script>
				const vscode = acquireVsCodeApi();

				const submitChat = () =>{
					const promptTextArea = document.getElementById('prompt');
					const text = promptTextArea.value;
					vscode.postMessage({ command: 'chat', text });
				}

				const resetChat = () => {
					const promptTextArea = document.getElementById('prompt');
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
						document.getElementById('response').innerHTML = parseCodeBlock(text);
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

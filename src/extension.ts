import * as vscode from 'vscode';
import { ChatPanel } from './panels/ChatPanel';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "vs-gpt-chat" is now active!');
	
	ChatPanel.render(context.extensionUri);
	console.log('TEMP: rendering finished on startup');

	// The command has been defined in the package.json file
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('vs-gpt-chat.startChat', () => {
		ChatPanel.render(context.extensionUri);
	});
	
	context.subscriptions.push(disposable);
}

export function deactivate() {}

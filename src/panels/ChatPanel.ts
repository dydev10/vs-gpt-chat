import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import LangModel from "../lang/LangModel";
import { streamGraph } from "../rag/retrievalGen";

/**
 * Comments marked with [HelloWorld] from the HelloWorld webview panels for doc reference
 * 
 */

/**
  * [HelloWorld]
  * 
  * This class manages the state and behavior of ChatPanel webview panels.
  *
  * It contains all the data and methods for:
  *
  * - Creating and rendering ChatPanel webview panels
  * - Properly cleaning up and disposing of webview resources when the panel is closed
  * - Setting the HTML (and by proxy CSS/JavaScript) content of the webview panel
  * - Setting message listeners so data can be passed between the webview and extension
  */
export class ChatPanel {
  public static currentPanel: ChatPanel | undefined;
  public static currentLLM: LangModel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];

  /**
   * [HelloWorld]
   * 
   * The ChatPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;

    // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
    // the panel or when the panel is closed programmatically)
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Set the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);

    // Set an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview);

    if(!ChatPanel.currentLLM) {
      ChatPanel.currentLLM = new LangModel('deepseek-r1:7b');
    }
  }

  /**
   * [HelloWorld]
   * 
   * Renders the current webview panel if it exists otherwise a new webview panel
   * will be created and displayed.
   *
   * @param extensionUri The URI of the directory containing the extension.
   */
  public static render(extensionUri: Uri) {
    if (ChatPanel.currentPanel) {
      // If the webview panel already exists reveal it
      ChatPanel.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      // If a webview panel does not already exist create and show a new one
      const panel = window.createWebviewPanel(
        // Panel view type
        "deepChat",
        // Panel title
        "Deep Seek Chat",
        // The editor column the panel should be displayed in
        ViewColumn.One,
        // Extra panel configurations
        {
          // Enable JavaScript in the webview
          enableScripts: true,
          // Restrict the webview to only load resources from the `out` and `webview-ui/build` directories
          localResourceRoots: [Uri.joinPath(extensionUri, "out"), Uri.joinPath(extensionUri, "webview-ui/dist")],
        }
      );

      ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
    }
  }

  /**
   * [HelloWorld]
   * 
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */
  public dispose() {
    ChatPanel.currentPanel = undefined;
    ChatPanel.currentLLM = undefined;

    // Dispose of the current webview panel
    this._panel.dispose();

    // Dispose of all disposables (i.e. commands) for the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * [HelloWorld]
   * 
   * Defines and returns the HTML that should be rendered within the webview panel.
   *
   * @remarks This is also the place where references to the React webview build files
   * are created and inserted into the webview HTML.
   *
   * @param webview A reference to the extension webview
   * @param extensionUri The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be
   * rendered within the webview panel
   */
  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    // The CSS file from the React build output
    const stylesUri = getUri(webview, extensionUri, ["webview-ui", "dist", "assets", "index.css"]);
    // The JS file from the React build output
    const scriptUri = getUri(webview, extensionUri, ["webview-ui", "dist", "assets", "index.js"]);

    const nonce = getNonce();

    // [HelloWorld] Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>DY DeepSeek Chat</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  private async handleChatMessageChunk(message: { command: string, text: string }) {
    if (!ChatPanel.currentLLM) { return; };

      const userPrompt = message.text;
      let responseText = '';

      try {
        const streamResponse = await ChatPanel.currentLLM.sendMessage(userPrompt);
        let started = false;

        for await (const part of streamResponse) {
          // Maybe this await loop will fix no streaming??
          for await (const mPart of part.model.messages) {
            if (!started) {
              started = true;
              this._panel.webview.postMessage({ command: 'chatStart', text: '' });
            }
            responseText += mPart.content;
            this._panel.webview.postMessage({ command: 'chatResponse', text: responseText });
          }

          // send stream end event
          started = false;
          this._panel.webview.postMessage({ command: 'chatEnd', text: '' });
        }

      } catch (error: any) {
        console.log('&&   XXxxxxxxx&&&& __________ERROr NOW');
        console.error(error);

        this._panel.webview.postMessage({ command: 'chatError', text: `${error.message}` });
        window.showErrorMessage('Error while running model', error.message);
      }
      return;
  }

  /**
   * [HelloWorld]
   * 
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is recieved.
   *
   * @param webview A reference to the extension webview
   * @param context A reference to the extension context
   */
  private _setWebviewMessageListener(webview: Webview) {
    webview.onDidReceiveMessage(
      async (message: any) => {
        const command = message.command;
        const text = message.text;

        switch (command) {
          case "hello": {
            // Code that should run in response to the hello message command
            window.showInformationMessage(text);
            return;
          };
          
          case "chat": {
            const question = message.text;
            let responseText = '';
            // await this.handleChatMessageChunk(message);

            console.log("Skipping chats");
            const graphStream = await streamGraph(question);
            let started = false;
            for await (const [message, _metadata] of graphStream) {
              // process.stdout.write(message.content + "|");
              
              if (!started) {
                started = true;
                this._panel.webview.postMessage({ command: 'chatStart', text: '' });
              }
              responseText += message.content;
              this._panel.webview.postMessage({ command: 'chatResponse', text: responseText });
            }
            // send stream end event
            started = false;
            this._panel.webview.postMessage({ command: 'chatEnd', text: '' });
            console.log('graphStream ...End');
          };
        }
      },
      undefined,
      this._disposables
    );
  }

  /**
   * Setup Language Model
   * 
   * call run, set system prompts, setup pipeline
   */
  private _setupLLM() {

  }
}

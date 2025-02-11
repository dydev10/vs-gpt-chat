export const htmlEntities = (str: string): string => {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

export const parseCodeBlock = (text: string): string => {
  const codeRegex = /```(.*?)```/sg;
  const encoded = htmlEntities(text);
  return encoded.replaceAll(codeRegex, (match: string) => {
    return '<br><code>' + match.slice(3, -3) + '</code><br>';
  });
};

export const formatMessage = (content: string) => {
  // const codeBlockRegex = /```(.*?)```/sg;
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const escaped = htmlEntities(content);
  let formattedContent = escaped.replace(codeBlockRegex, (_match, language, code) => {
      language = language || 'plaintext';
    // const highlightedCode = hljs.highlight(code.trim(), { language: language }).value;
    return `<pre><div class="code-header"><span class="code-language">${language}</span><button class="copy-button">Copy</button></div><code class="hljs ${language}">${code}</code></pre>`;
  });
  
  // Format inline code
  formattedContent = formattedContent.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  
  return formattedContent;
}

import Prism from "prismjs";

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
  const formattedContent = content.replace(codeBlockRegex, (_match, language, code) => {
    language = language || 'plaintext';
   
    const highlightedCode = Prism.highlight(code.trim(), Prism.languages[language], language);
    console.log('Preims', {
      language,
      highlightedCode,
      grammar: Prism.languages[language],
    });
    
    // const escapedCode = htmlEntities(highlightedCode);
    return `<pre class="line-numbers" language-${language}><div class="code-header"><span class="code-language">${language}</span><button class="copy-button">Copy</button></div><code>${highlightedCode}</code></pre>`;
  });
  
  // Format inline code
  // formattedContent = formattedContent.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  
  return formattedContent;
}

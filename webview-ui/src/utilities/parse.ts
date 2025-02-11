import Prism from "prismjs";
import dompurify from "dompurify";

const NEW_LINE_EXP = /\n(?!$)/g;
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
      lines: highlightedCode.match(NEW_LINE_EXP),
      sanitized: dompurify.sanitize(code, { USE_PROFILES: { html: true } }),
    });

    const match = highlightedCode.match(NEW_LINE_EXP);
    const linesNum = match ? match.length + 1 : 1;
    const lines = new Array(linesNum + 1).join('<span></span>');

    const lineNumbersWrapper = `<span aria-hidden="true" class="line-numbers-rows">${lines}</span>`;
    
    // const escapedCode = htmlEntities(highlightedCode);
    // return `<pre class="language-${language} line-numbers" language-${language}><div class="code-header"><span class="code-language">${language}</span><button class="copy-button">Copy</button></div><code class="language-${language}">${highlightedCode}</code></pre>`;
    return `<pre class="language-${language} line-numbers" language-${language}><code class="language-${language}">${highlightedCode} ${lineNumbersWrapper}</code></pre>`;
  });
  
  // Format inline code
  // formattedContent = formattedContent.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  
  return formattedContent;
}

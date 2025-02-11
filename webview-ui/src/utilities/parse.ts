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

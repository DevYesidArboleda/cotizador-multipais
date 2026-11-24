/** Divide por `\n{2,}` (también con espacios en las líneas en blanco), recorta y descarta bloques vacíos (R-03.7). */
export function splitTerms(content: string): readonly string[] {
  return content
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*(?:\n[ \t]*)+/)
    .map((block) => block.trim())
    .filter((block) => block !== '');
}

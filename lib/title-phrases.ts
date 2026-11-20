/**
 * 標題依標點分段，畫面上一段一段換行，不會把「熱門」這類詞拆在兩行。
 * 英文標點後面接數字時不分（NT$1,000 要放在一起）。彈窗是前端元件，所以獨立成小檔案。
 */
export function titlePhrases(title: string) {
  return title
    .split(/(?<=[，。；、！？：])|(?<=[,;!?:])(?!\d)/u)
    .map((phrase) => phrase.trim())
    .filter(Boolean);
}

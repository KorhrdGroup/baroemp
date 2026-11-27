/**
 * 낱말 뒤에 붙는 목적격 조사("을" · "를")를 받침에 맞춰 고른다. "사회복지사 2급" → "을", "요양보호사" → "를".
 * 숫자로 끝나면 읽는 소리(일 · 이 · 삼 …)의 받침을 따르고, 한글 · 숫자가 아니면 "을"로 둔다.
 */
export function objectParticle(word: string): "을" | "를" {
  const last = word.trim().slice(-1);
  if (/[0-9]/.test(last)) return "2459".includes(last) ? "를" : "을";
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "을";
  return (code - 0xac00) % 28 === 0 ? "를" : "을";
}

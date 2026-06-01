export function generateCardSerial(frase: string, autor: string): string {
  const str = `${frase}-${autor}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const part1 = Math.abs(hash % 1000).toString().padStart(3, '0');
  const part2 = Math.abs((hash >> 3) % 10000).toString().padStart(4, '0');
  return `MMM-${part1}-${part2}`;
}

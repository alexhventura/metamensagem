import fs from 'fs';

const p = 'src/views/FraseDetalhe.tsx';
let s = fs.readFileSync(p, 'utf8');
if (!s.includes('display.explicacao')) {
  s = s.replace('{frase.explicacao}', '{display.explicacao ?? frase.explicacao}');
}
if (!s.includes('explicacao: frase.explicacao')) {
  s = s.replace(
    'setDisplay({ texto: frase.frase_original, isTranslated: false });',
    `setDisplay({
      texto: frase.frase_original,
      autor: frase.autor_original,
      explicacao: frase.explicacao ?? undefined,
      isTranslated: false,
    });`
  );
}
fs.writeFileSync(p, s);
console.log('OK');

import fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  `onGenerateImage={
                  item.tipo === 'frase'
                    ? (i) => setImageQuote(quoteFromItem(i))
                    : undefined
                }`,
  `onGenerateImage={
                  item.tipo === 'frase' ? (quote) => setImageQuote(quote) : undefined
                }`
);
fs.writeFileSync('src/App.tsx', app);
console.log('OK');

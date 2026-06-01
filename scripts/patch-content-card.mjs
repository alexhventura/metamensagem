import fs from 'fs';
const path = 'src/components/ContentCard.tsx';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(
  "const CardTranslateMenu = lazy(() => import('./CardTranslateMenu'));",
  "const CardTranslateMenu = lazy(() =>\n  import('./CardTranslateMenu').then((m) => ({ default: m.CardTranslateMenu }));"
);
if (!c.includes('Suspense fallback')) {
  c = c.replace(
    "<CardTooltip text={t('common.translate')} tema={tema}>\n            <CardTranslateMenu",
    "<CardTooltip text={t('common.translate')} tema={tema}>\n            <Suspense fallback={<span className=\"inline-block min-h-[36px] min-w-[36px]\" aria-hidden />}>\n            <CardTranslateMenu"
  );
  c = c.replace(
    /tooltipLabel=\{t\('common\.translate'\)\}\s*\n\s*\/>/,
    "tooltipLabel={t('common.translate')}\n            />\n            </Suspense>"
  );
}
fs.writeFileSync(path, c);
console.log('patched ContentCard');

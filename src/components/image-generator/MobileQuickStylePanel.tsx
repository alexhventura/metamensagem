import type { ReactNode } from 'react';
import MobileColorGrid from './MobileColorGrid';
import MobileFontPicker from './MobileFontPicker';
import MobileBackgroundGrid from './MobileBackgroundGrid';
import MobileFormatStrip from './MobileFormatStrip';
import type { ImageFontId } from './fonts';
import type { TextColorChoice } from './colors';
import type { ImageFormat } from './types';

function SectionLabel({ children, tema }: { children: ReactNode; tema: string }) {
  return (
    <h3
      className={`text-[10px] font-black uppercase tracking-[0.32em] mb-2 ${
        tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'
      }`}
    >
      {children}
    </h3>
  );
}

export default function MobileQuickStylePanel({
  tema,
  format,
  onFormatChange,
  textColor,
  onTextColorChange,
  fontId,
  onFontChange,
  fontSample,
  collectionId,
  skinId,
  recommendedCollectionId,
  recommendedSkinId,
  onBackgroundSelect,
}: {
  tema: string;
  format: ImageFormat;
  onFormatChange: (f: ImageFormat) => void;
  textColor: TextColorChoice;
  onTextColorChange: (c: TextColorChoice) => void;
  fontId: ImageFontId;
  onFontChange: (id: ImageFontId) => void;
  fontSample: string;
  collectionId: string;
  skinId: string;
  recommendedCollectionId?: string;
  recommendedSkinId?: string;
  onBackgroundSelect: (collectionId: string, skinId: string) => void;
}) {
  return (
    <div className="mm-quick-style-panel space-y-4 pb-2">
      <section>
        <SectionLabel tema={tema}>Formato</SectionLabel>
        <MobileFormatStrip value={format} onChange={onFormatChange} tema={tema} />
      </section>

      <section>
        <SectionLabel tema={tema}>Cores</SectionLabel>
        <MobileColorGrid value={textColor} onChange={onTextColorChange} tema={tema} />
      </section>

      <section>
        <SectionLabel tema={tema}>Fonte</SectionLabel>
        <MobileFontPicker value={fontId} onChange={onFontChange} sample={fontSample} tema={tema} />
      </section>

      <section>
        <SectionLabel tema={tema}>Fundo</SectionLabel>
        <MobileBackgroundGrid
          collectionId={collectionId}
          skinId={skinId}
          recommendedCollectionId={recommendedCollectionId}
          recommendedSkinId={recommendedSkinId}
          onSelect={onBackgroundSelect}
        />
      </section>
    </div>
  );
}

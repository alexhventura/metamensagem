import React from 'react';
import { useTranslation } from 'react-i18next';

export default function TranslationPendingNotice({
  tema,
  className = '',
}: {
  tema: string;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
        tema === 'light'
          ? 'bg-sky-50/90 border-sky-200/80 text-sky-950'
          : 'bg-sky-500/10 border-sky-500/25 text-sky-100'
      } ${className}`}
    >
      <p className="font-semibold mb-1.5">
        {t('translate_menu.pending_title', 'Tradução ainda não disponível.')}
      </p>
      <p className="opacity-90 text-[13px]">
        {t(
          'translate_menu.pending_body',
          'Esta frase foi adicionada à fila de tradução e ficará disponível em breve.'
        )}
      </p>
    </div>
  );
}

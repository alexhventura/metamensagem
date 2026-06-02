import React from 'react';
import { useTranslation } from 'react-i18next';

export default function TranslationContingencyNotice({
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
          ? 'bg-amber-50/90 border-amber-200/80 text-amber-950'
          : 'bg-amber-500/10 border-amber-500/25 text-amber-100'
      } ${className}`}
    >
      <p className="font-semibold mb-1.5">
        {t('translate_menu.contingency_title', 'Tradução oficial em preparação')}
      </p>
      <p className="opacity-90 text-[13px]">
        {t(
          'translate_menu.contingency_body',
          'Esta frase ainda não possui tradução oficial para o idioma selecionado. Sua solicitação foi registrada e ajudará a priorizar futuras traduções do MetaMensagem. Caso deseje visualizar esta página imediatamente, você pode utilizar a tradução integrada do seu navegador.'
        )}
      </p>
    </div>
  );
}

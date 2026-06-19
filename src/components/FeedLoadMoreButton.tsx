import React from 'react';
import { useTranslation } from 'react-i18next';

export default function FeedLoadMoreButton({
  onClick,
}: {
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full mt-10 py-5 mm-feed-load-more bg-transparent border-2 border-dashed border-zinc-800 rounded-[2rem] text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:border-[#A855F7] hover:bg-[#A855F7]/5 transition-all"
    >
      {t('home.explore_more')}
    </button>
  );
}

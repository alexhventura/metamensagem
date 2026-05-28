import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export type FraseCardData = {
  slug: string;
  frase_original: string;
  autor_original: string;
};

type FraseCardProps = {
  frase: FraseCardData;
  tema: string;
};

export function FraseCard({ frase, tema }: FraseCardProps) {
  const texto = frase.frase_original?.trim() || '';
  const autor = frase.autor_original?.trim() || 'Anônimo';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-[1px] rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] h-full`}
    >
      <div
        className={`rounded-2xl p-5 flex flex-col justify-between h-full min-h-[200px] ${
          tema === 'light'
            ? 'bg-white shadow-[0_8px_24px_rgb(0,0,0,0.04)]'
            : 'bg-[#0a0a0a]'
        }`}
      >
        <div className="flex-1 flex flex-col">
          <p
            className={`text-base sm:text-[15px] font-bold leading-snug tracking-tight line-clamp-5 flex-1 ${
              tema === 'light' ? 'text-black' : 'text-white'
            }`}
          >
            &ldquo;{texto}&rdquo;
          </p>
          <p
            className={`mt-4 text-[10px] font-black uppercase tracking-widest truncate ${
              tema === 'light' ? 'text-zinc-500' : 'text-zinc-500'
            }`}
          >
            {autor}
          </p>
        </div>

        <Link
          to={`/frases/${frase.slug}`}
          className={`mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            tema === 'light'
              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              : 'bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25'
          }`}
        >
          Saber mais
          <ChevronRight size={14} />
        </Link>
      </div>
    </motion.article>
  );
}

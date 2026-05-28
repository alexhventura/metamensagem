import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/** Tooltip leve para botões de card — não quebra se falhar render filho. */
export default function CardTooltip({
  children,
  text,
  tema,
}: {
  children: React.ReactNode;
  text: string;
  tema: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative flex flex-col items-center justify-end shrink-0"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && text ? (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute bottom-full mb-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap z-50 pointer-events-none ${
              tema === 'light' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            {text}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

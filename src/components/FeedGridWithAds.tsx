import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdSlot from './AdSlot';
import type { FeedRow } from '../lib/feedWithAds';
import { FEED_INITIAL_VISIBLE } from '../lib/feedWithAds';
import { GRID_CONTENT } from '../lib/contentGrid';
import type { AdPlacement } from './AdSlot';

export default function FeedGridWithAds<T extends { id: string }>({
  rows,
  tema,
  placement,
  renderCard,
  lazyAfterIndex = FEED_INITIAL_VISIBLE,
  animated = false,
}: {
  rows: FeedRow<T>[];
  tema: string;
  placement: AdPlacement;
  renderCard: (content: T, contentIndex: number) => React.ReactNode;
  lazyAfterIndex?: number;
  animated?: boolean;
}) {
  let contentIndex = 0;

  const nodes = rows.map((itemObj) => {
    if (itemObj.tipoItem === 'anuncio') {
      const ad = (
        <div key={itemObj.id} className="col-span-full">
          <AdSlot tema={tema} placement={placement} />
        </div>
      );
      if (!animated) return ad;
      return (
        <motion.div
          key={itemObj.id}
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="col-span-full h-full"
        >
          <AdSlot tema={tema} placement={placement} />
        </motion.div>
      );
    }

    const idx = contentIndex++;
    const card = (
      <div
        key={itemObj.content.id}
        className={idx >= lazyAfterIndex ? 'mm-card-lazy' : undefined}
      >
        {renderCard(itemObj.content, idx)}
      </div>
    );
    return card;
  });

  if (animated) {
    return (
      <div className={GRID_CONTENT}>
        <AnimatePresence mode="popLayout">{nodes}</AnimatePresence>
      </div>
    );
  }

  return <div className={GRID_CONTENT}>{nodes}</div>;
}

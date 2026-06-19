import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdSlot from './AdSlot';
import type { FeedRow } from '../lib/feedWithAds';
import { FEED_INITIAL_VISIBLE } from '../lib/feedWithAds';
import { GRID_CONTENT } from '../lib/contentGrid';
import type { AdPlacement } from './AdSlot';
import type { AdSlotStatus } from '../lib/adSlotDetect';

function FeedAdRow({
  id,
  tema,
  placement,
  animated,
}: {
  id: string;
  tema: string;
  placement: AdPlacement;
  animated?: boolean;
}) {
  const [status, setStatus] = useState<AdSlotStatus>('detecting');

  if (status === 'hidden') return null;

  const ad = <AdSlot tema={tema} placement={placement} onStatus={setStatus} />;

  if (status === 'detecting') {
    return <div className="col-span-full h-0 overflow-hidden">{ad}</div>;
  }

  if (animated) {
    return (
      <motion.div
        key={id}
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="col-span-full h-full"
      >
        {ad}
      </motion.div>
    );
  }

  return <div className="col-span-full">{ad}</div>;
}

export default function FeedGridWithAds<T extends { id: string }>({
  rows,
  tema,
  placement,
  renderCard,
  lazyAfterIndex = 3,
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
      return (
        <FeedAdRow
          key={itemObj.id}
          id={itemObj.id}
          tema={tema}
          placement={placement}
          animated={animated}
        />
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

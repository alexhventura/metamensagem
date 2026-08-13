import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type FaqItem = {
  question: string;
  answer: string;
};

type SiteFaqProps = {
  title: string;
  items: FaqItem[];
  tema: string;
  id?: string;
};

/** FAQ expansível com Schema FAQPage embutido via JSON-LD no parent quando necessário. */
export default function SiteFaq({ title, items, tema, id = 'faq' }: SiteFaqProps) {
  const [open, setOpen] = useState<number | null>(0);

  if (!items.length) return null;

  return (
    <section
      id={id}
      className={`mt-14 mb-8 rounded-[2rem] border p-6 md:p-8 ${
        tema === 'light' ? 'bg-white border-zinc-200' : 'bg-zinc-900/60 border-zinc-700/50'
      }`}
      aria-labelledby={`${id}-title`}
    >
      <h2
        id={`${id}-title`}
        className={`text-xl md:text-2xl font-black tracking-tight mb-6 ${
          tema === 'light' ? 'text-zinc-900' : 'text-zinc-50'
        }`}
      >
        {title}
      </h2>
      <div className="space-y-2">
        {items.map((item, index) => {
          const isOpen = open === index;
          return (
            <div
              key={item.question}
              className={`rounded-2xl border overflow-hidden ${
                tema === 'light' ? 'border-zinc-100' : 'border-zinc-800'
              }`}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : index)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left font-bold text-sm md:text-base ${
                  tema === 'light' ? 'text-zinc-800 hover:bg-zinc-50' : 'text-zinc-100 hover:bg-zinc-800/60'
                }`}
              >
                <span>{item.question}</span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-purple-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              {isOpen ? (
                <div
                  className={`px-4 pb-4 text-sm leading-relaxed ${
                    tema === 'light' ? 'text-zinc-600' : 'text-zinc-400'
                  }`}
                >
                  {item.answer}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

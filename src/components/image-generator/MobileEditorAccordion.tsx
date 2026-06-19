import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export type MobileEditorSection = {
  id: string;
  title: string;
  content: ReactNode;
};

export default function MobileEditorAccordion({
  sections,
  openId,
  onOpenChange,
  tema,
}: {
  sections: MobileEditorSection[];
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  tema: string;
}) {
  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const open = openId === section.id;
        return (
          <section
            key={section.id}
            className={`rounded-2xl border overflow-hidden ${
              tema === 'light' ? 'border-zinc-200 bg-white' : 'border-zinc-800 bg-zinc-950/80'
            }`}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => onOpenChange(open ? null : section.id)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left font-black text-sm tracking-tight ${
                tema === 'light' ? 'text-zinc-900' : 'text-white'
              }`}
            >
              <span>{section.title}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {open ? (
              <div
                className={`px-4 pb-4 pt-0 border-t ${
                  tema === 'light' ? 'border-zinc-100' : 'border-zinc-800/80'
                }`}
              >
                {section.content}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

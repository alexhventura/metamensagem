import { Link } from 'react-router-dom';

type EditorialBlockProps = {
  tema: string;
  title: string;
  paragraphs: string[];
  links?: { to: string; label: string }[];
  howToTitle?: string;
  howToSteps?: string[];
};

/** Bloco editorial para enriquecer páginas de listagem (AdSense / conteúdo útil). */
export default function EditorialBlock({
  tema,
  title,
  paragraphs,
  links = [],
  howToTitle,
  howToSteps = [],
}: EditorialBlockProps) {
  return (
    <section
      className={`mt-4 mb-10 rounded-[2rem] border p-6 md:p-8 ${
        tema === 'light' ? 'bg-purple-50/40 border-purple-100' : 'bg-purple-500/5 border-purple-500/15'
      }`}
    >
      <h2
        className={`text-lg md:text-xl font-black tracking-tight mb-4 ${
          tema === 'light' ? 'text-zinc-900' : 'text-zinc-50'
        }`}
      >
        {title}
      </h2>
      <div
        className={`space-y-3 text-sm md:text-base leading-relaxed ${
          tema === 'light' ? 'text-zinc-700' : 'text-zinc-400'
        }`}
      >
        {paragraphs.map((p) => (
          <p key={p.slice(0, 48)}>{p}</p>
        ))}
      </div>

      {howToSteps.length > 0 ? (
        <div className="mt-6">
          {howToTitle ? (
            <h3
              className={`text-sm font-black uppercase tracking-widest mb-3 ${
                tema === 'light' ? 'text-purple-700' : 'text-purple-300'
              }`}
            >
              {howToTitle}
            </h3>
          ) : null}
          <ol
            className={`list-decimal list-inside space-y-2 text-sm ${
              tema === 'light' ? 'text-zinc-700' : 'text-zinc-400'
            }`}
          >
            {howToSteps.map((step) => (
              <li key={step.slice(0, 40)}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {links.length > 0 ? (
        <nav className="mt-6 flex flex-wrap gap-3" aria-label="Páginas relacionadas">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-xs font-black uppercase tracking-wider px-3 py-2 rounded-full border transition-colors ${
                tema === 'light'
                  ? 'border-purple-200 text-purple-700 hover:bg-purple-100'
                  : 'border-purple-500/30 text-purple-300 hover:bg-purple-500/10'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </section>
  );
}

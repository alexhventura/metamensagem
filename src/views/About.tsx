import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Quote, Sparkles, ShieldCheck, Users, RefreshCw } from 'lucide-react';

export default function About({ tema }: { tema: string }) {
  const card = tema === 'light' ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800';
  const muted = tema === 'light' ? 'text-zinc-600' : 'text-zinc-400';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`max-w-3xl mx-auto px-4 py-12 ${tema === 'light' ? 'text-zinc-800' : 'text-zinc-300'}`}
    >
      <h1 className="text-4xl font-black mb-4 uppercase tracking-widest text-[#A855F7]">
        Sobre a Metamensagem
      </h1>
      <p className={`text-lg mb-10 ${muted}`}>
        Mente, Mensagem e Mudança — uma plataforma editorial de frases inspiradoras e metáforas
        terapêuticas, com curadoria, contexto e ferramentas para reflexão e compartilhamento.
      </p>

      <div className="space-y-10 leading-relaxed">
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-purple-500">Por que existimos</h2>
          <p>
            Em meio a feeds infinitos e textos superficiais, sentíamos falta de um espaço digital onde
            palavras bem escolhidas pudessem ser lidas com calma — e usadas de verdade. A Metamensagem
            nasceu para reunir <strong>frases</strong> e <strong>metáforas terapêuticas</strong> com
            atribuição de autoria, categorias temáticas e, sempre que possível, uma explicação que
            ajude o leitor a entender o sentido e o contexto da mensagem.
          </p>
          <p>
            Não somos um agregador anônimo de citações. Cada página de frase busca oferecer mais do que
            o texto isolado: tema, categoria, idioma original, fontes quando disponíveis e uma leitura
            interpretativa curta. As metáforas trazem narrativas mais longas, pensadas para reflexão
            profunda — não apenas um trecho solto.
          </p>
        </section>

        <section className={`p-8 rounded-[2rem] border ${card}`}>
          <h2 className="text-2xl font-black mb-6 text-purple-500">O que você encontra aqui</h2>
          <ul className="space-y-5">
            <li className="flex gap-4">
              <Quote className="text-purple-500 shrink-0 mt-1" size={22} />
              <div>
                <h3 className="font-bold mb-1">Acervo de frases com contexto</h3>
                <p className={muted}>
                  Citações organizadas por temas (amor, motivação, reflexão, coragem e outros), com
                  busca e páginas de detalhe que incluem explicação e metadados úteis.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <BookOpen className="text-purple-500 shrink-0 mt-1" size={22} />
              <div>
                <h3 className="font-bold mb-1">Metáforas terapêuticas</h3>
                <p className={muted}>
                  Histórias e metáforas mais longas, no espírito da tradição terapêutica narrativa,
                  para quem busca profundidade além da frase de status.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <Sparkles className="text-purple-500 shrink-0 mt-1" size={22} />
              <div>
                <h3 className="font-bold mb-1">Studio de imagens</h3>
                <p className={muted}>
                  Ferramenta para transformar uma frase escolhida em arte visual e compartilhar com
                  atribuição — uso pessoal e de inspiração, não substituto de aconselhamento
                  profissional.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <RefreshCw className="text-purple-500 shrink-0 mt-1" size={22} />
              <div>
                <h3 className="font-bold mb-1">Manutenção contínua</h3>
                <p className={muted}>
                  O acervo e as páginas de categoria são atualizados com novas entradas, melhorias de
                  SEO, traduções e correções. Preferimos qualidade e clareza a volume vazio.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-purple-500 flex items-center gap-2">
            <ShieldCheck size={24} /> Critérios editoriais
          </h2>
          <p>
            Nossa curadoria segue princípios simples e públicos:
          </p>
          <ol className={`list-decimal list-inside space-y-2 ${muted}`}>
            <li>
              <strong className={tema === 'light' ? 'text-zinc-800' : 'text-zinc-200'}>
                Autoria e respeito
              </strong>{' '}
              — citamos autores quando conhecidos; evitamos apresentar frases anônimas como se fossem
              de celebridades.
            </li>
            <li>
              <strong className={tema === 'light' ? 'text-zinc-800' : 'text-zinc-200'}>
                Contexto útil
              </strong>{' '}
              — priorizamos páginas com explicação, tema e categoria, para o leitor entender o
              “porquê” da mensagem, não só o texto.
            </li>
            <li>
              <strong className={tema === 'light' ? 'text-zinc-800' : 'text-zinc-200'}>
                Uso responsável
              </strong>{' '}
              — conteúdo inspiracional e reflexivo; <em>não</em> substitui terapia, medicina ou
              aconselhamento jurídico.
            </li>
            <li>
              <strong className={tema === 'light' ? 'text-zinc-800' : 'text-zinc-200'}>
                Experiência legível
              </strong>{' '}
              — anúncios (quando veiculados via Google AdSense) ficam em zonas secundárias do feed e
              nunca devem impedir a leitura do conteúdo principal.
            </li>
          </ol>
        </section>

        <section className={`p-8 rounded-[2rem] border ${card} space-y-4`}>
          <h2 className="text-2xl font-black text-purple-500 flex items-center gap-2">
            <Users size={24} /> Quem mantém o projeto
          </h2>
          <p>
            A Metamensagem é um projeto editorial independente, desenvolvido e mantido com apoio da{' '}
            <a
              href="https://hervenhub.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-500 font-bold hover:underline"
            >
              Herven Hub
            </a>
            . Publicamos em{' '}
            <a
              href="https://metamensagem.com"
              className="text-purple-500 font-bold hover:underline"
            >
              metamensagem.com
            </a>{' '}
            e mantemos presença ativa no Instagram{' '}
            <a
              href="https://www.instagram.com/metamensagem/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-500 font-bold hover:underline"
            >
              @metamensagem
            </a>
            .
          </p>
          <p className={muted}>
            Dúvidas, sugestões de conteúdo ou pedidos relacionados a privacidade:{' '}
            <Link to="/contato" className="text-purple-500 font-bold hover:underline">
              página de contato
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black text-purple-500">Comece por aqui</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/frases"
              className="px-5 py-3 rounded-2xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-500 transition-colors"
            >
              Explorar frases
            </Link>
            <Link
              to="/metaforas"
              className={`px-5 py-3 rounded-2xl border font-bold text-sm transition-colors ${
                tema === 'light'
                  ? 'border-purple-200 text-purple-700 hover:bg-purple-50'
                  : 'border-purple-500/40 text-purple-300 hover:bg-purple-500/10'
              }`}
            >
              Ler metáforas
            </Link>
            <Link
              to="/privacidade"
              className={`px-5 py-3 rounded-2xl border font-bold text-sm transition-colors ${
                tema === 'light'
                  ? 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Privacidade e anúncios
            </Link>
          </div>
          <p className={`text-xs ${muted}`}>Última atualização editorial: setembro de 2026.</p>
        </section>
      </div>
    </motion.div>
  );
}

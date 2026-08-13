import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Quote, Sparkles, Heart } from 'lucide-react';

export default function About({ tema }: { tema: string }) {
  const text = tema === 'light' ? 'text-zinc-800' : 'text-zinc-300';
  const muted = tema === 'light' ? 'text-zinc-600' : 'text-zinc-400';
  const card =
    tema === 'light' ? 'bg-white border-zinc-200' : 'bg-zinc-900/70 border-zinc-700/50';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`max-w-3xl mx-auto px-4 py-12 ${text}`}
    >
      <h1 className="text-3xl md:text-4xl font-black mb-6 tracking-tight text-[#A855F7]">
        Sobre a Metamensagem
      </h1>

      <div className={`space-y-8 leading-relaxed text-base ${muted}`}>
        <section>
          <p className="text-xl font-medium italic text-purple-500 mb-4">
            “Uma reflexão no momento certo pode mudar um dia, uma decisão ou até uma vida.”
          </p>
          <p>
            A Metamensagem é um projeto editorial global dedicado a frases inspiradoras e metáforas
            terapêuticas. Nosso objetivo é oferecer um espaço calmo e bem organizado para leitura,
            reflexão e compartilhamento consciente — com conteúdo em diversos idiomas, mantendo cada
            citação no idioma original em que foi publicada.
          </p>
          <p className="mt-3">
            Em vez de um feed genérico de citações, priorizamos curadoria, contexto (quando
            disponível), navegação por temas e ferramentas úteis para quem deseja transformar uma
            frase em imagem para redes sociais.
          </p>
        </section>

        <section className="grid sm:grid-cols-2 gap-4">
          {[
            {
              icon: Quote,
              title: 'Frases',
              body: 'Insights curtos para status, reflexão diária e estudo de temas como amor, mudança, resiliência e fé.',
              to: '/frases',
            },
            {
              icon: BookOpen,
              title: 'Metáforas',
              body: 'Narrativas mais longas, com ritmo de leitura, pensadas para insight psicológico e mudança de atitude.',
              to: '/metaforas',
            },
            {
              icon: Sparkles,
              title: 'Studio de imagens',
              body: 'Gere artes 1:1, 4:5 e 9:16 a partir da frase, com tipografia legível e identidade Metamensagem.',
              to: '/frases',
            },
            {
              icon: Heart,
              title: 'Experiência global',
              body: 'Interface no idioma do navegador; tags e menus acompanham sua preferência. O texto original da citação é preservado.',
              to: '/',
            },
          ].map((item) => (
            <Link
              key={item.title}
              to={item.to}
              className={`p-5 rounded-3xl border transition-colors hover:border-purple-400/50 ${card}`}
            >
              <item.icon className="text-purple-500 mb-3" size={22} aria-hidden />
              <h2 className={`font-black text-base mb-2 ${text}`}>{item.title}</h2>
              <p className="text-sm leading-relaxed">{item.body}</p>
            </Link>
          ))}
        </section>

        <section>
          <h2 className={`text-xl font-bold mb-3 ${text}`}>Nossa missão editorial</h2>
          <p>
            Selecionamos e organizamos conteúdos que ajudam pessoas a nomear emoções, encontrar
            perspectiva e compartilhar ideias com responsabilidade. Trabalhamos na interseção entre
            filosofia prática, psicologia aplicada e design digital acessível.
          </p>
          <p className="mt-3">
            Transparência importa: publicamos{' '}
            <Link to="/privacidade" className="text-purple-500 underline">
              Política de Privacidade
            </Link>
            ,{' '}
            <Link to="/cookies" className="text-purple-500 underline">
              Cookies
            </Link>{' '}
            e{' '}
            <Link to="/termos" className="text-purple-500 underline">
              Termos de Uso
            </Link>
            , e mantemos canais claros de{' '}
            <Link to="/contato" className="text-purple-500 underline">
              Contato
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className={`text-xl font-bold mb-3 ${text}`}>Como usar o site</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Escolha Frases ou Metáforas no menu principal.</li>
            <li>Filtre por tema (tags) alinhadas ao idioma da sua interface.</li>
            <li>Abra o detalhe para ler explicações, contexto e conteúdos relacionados.</li>
            <li>Se quiser, gere uma imagem e compartilhe com crédito a @metamensagem.</li>
          </ol>
        </section>
      </div>
    </motion.div>
  );
}

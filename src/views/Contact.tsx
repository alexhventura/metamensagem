import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Instagram, Mail, MessageCircle } from 'lucide-react';

const CONTACT_EMAIL = 'contato@metamensagem.com';

export default function Contact({ tema }: { tema: string }) {
  const card = tema === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900 border-zinc-800';
  const muted = tema === 'light' ? 'text-zinc-600' : 'text-zinc-400';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`max-w-3xl mx-auto px-4 py-12 ${tema === 'light' ? 'text-zinc-800' : 'text-zinc-300'}`}
    >
      <h1 className="text-4xl font-black mb-4 uppercase tracking-widest text-[#A855F7]">Contato</h1>
      <p className={`text-lg mb-10 ${muted}`}>
        Fale com a equipe da Metamensagem. Respondemos sugestões de conteúdo, dúvidas sobre o site,
        parcerias e solicitações relacionadas à privacidade (LGPD).
      </p>

      <div className="space-y-6">
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Contato — Metamensagem')}`}
          className={`block p-8 rounded-[2rem] border transition-transform hover:scale-[1.01] ${card}`}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Mail size={26} />
            </div>
            <div>
              <h2 className="text-xl font-black mb-1">E-mail</h2>
              <p className="text-purple-500 font-bold break-all">{CONTACT_EMAIL}</p>
              <p className={`text-sm mt-2 ${muted}`}>
                Canal principal para assuntos editoriais, técnicos e de privacidade. Inclua o máximo
                de contexto para acelerarmos a resposta.
              </p>
            </div>
          </div>
        </a>

        <a
          href="https://www.instagram.com/metamensagem/"
          target="_blank"
          rel="noopener noreferrer"
          className={`block p-8 rounded-[2rem] border transition-transform hover:scale-[1.01] ${card}`}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white flex items-center justify-center shrink-0">
              <Instagram size={26} />
            </div>
            <div>
              <h2 className="text-xl font-black mb-1">Instagram</h2>
              <p className="text-purple-500 font-bold">@metamensagem</p>
              <p className={`text-sm mt-2 ${muted}`}>
                Ideal para feedback rápido, ideias de frases e conversa com a comunidade. Envie uma
                mensagem direta (DM).
              </p>
            </div>
          </div>
        </a>

        <section className={`p-8 rounded-[2rem] border ${card}`}>
          <h2 className="text-xl font-black mb-3 flex items-center gap-2">
            <MessageCircle className="text-purple-500" size={22} /> Antes de escrever
          </h2>
          <ul className={`space-y-2 list-disc list-inside ${muted}`}>
            <li>
              Dúvidas sobre cookies e anúncios: veja a{' '}
              <Link to="/privacidade" className="text-purple-500 font-semibold hover:underline">
                Política de Privacidade
              </Link>{' '}
              e a{' '}
              <Link to="/cookies" className="text-purple-500 font-semibold hover:underline">
                Política de Cookies
              </Link>
              .
            </li>
            <li>
              Quer conhecer a curadoria e o propósito do projeto:{' '}
              <Link to="/sobre" className="text-purple-500 font-semibold hover:underline">
                Sobre a Metamensagem
              </Link>
              .
            </li>
            <li>
              Conteúdo inspiracional não substitui aconselhamento médico, psicológico ou jurídico.
            </li>
          </ul>
        </section>

        <p className={`text-xs ${muted}`}>
          Operado em metamensagem.com · Desenvolvido com apoio da{' '}
          <a
            href="https://hervenhub.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline"
            style={{ color: '#F5C400' }}
          >
            Herven Hub
          </a>
          .
        </p>
      </div>
    </motion.div>
  );
}

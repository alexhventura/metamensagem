import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Instagram, Mail, Send } from 'lucide-react';

export default function Contact({ tema }: { tema: string }) {
  const text = tema === 'light' ? 'text-zinc-800' : 'text-zinc-300';
  const muted = tema === 'light' ? 'text-zinc-600' : 'text-zinc-400';
  const card =
    tema === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900 border-zinc-700/50';
  const [sent, setSent] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`max-w-3xl mx-auto px-4 py-12 ${text}`}
    >
      <h1 className="text-3xl md:text-4xl font-black mb-4 tracking-tight text-[#A855F7]">Contato</h1>
      <p className={`text-base leading-relaxed mb-10 ${muted}`}>
        Fale com a equipe Metamensagem para sugestões editoriais, dúvidas sobre privacidade,
        parcerias ou reportar problemas técnicos. Respondemos pelo Instagram e pelo e-mail abaixo.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        <a
          href="https://www.instagram.com/metamensagem/"
          target="_blank"
          rel="noopener noreferrer"
          className={`p-6 rounded-3xl border flex flex-col gap-3 hover:border-purple-400/60 transition-colors ${card}`}
        >
          <Instagram className="text-purple-500" size={28} aria-hidden />
          <h2 className="font-black text-lg">Instagram</h2>
          <p className={`text-sm ${muted}`}>@metamensagem — DM para conversas rápidas e feedback.</p>
        </a>
        <a
          href="mailto:contato@metamensagem.com"
          className={`p-6 rounded-3xl border flex flex-col gap-3 hover:border-purple-400/60 transition-colors ${card}`}
        >
          <Mail className="text-purple-500" size={28} aria-hidden />
          <h2 className="font-black text-lg">E-mail</h2>
          <p className={`text-sm ${muted}`}>contato@metamensagem.com — privacidade, termos e parcerias.</p>
        </a>
      </div>

      <section className={`rounded-3xl border p-6 md:p-8 mb-10 ${card}`}>
        <h2 className="font-black text-xl mb-2 flex items-center gap-2">
          <Send size={18} className="text-purple-500" aria-hidden />
          Enviar mensagem
        </h2>
        <p className={`text-sm mb-6 ${muted}`}>
          Prefere escrever por aqui? O botão abre seu aplicativo de e-mail com o assunto preenchido.
        </p>
        {sent ? (
          <p className="text-sm font-bold text-purple-500">
            Cliente de e-mail aberto. Se nada aconteceu, escreva para contato@metamensagem.com.
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const name = String(data.get('name') || '').trim();
              const message = String(data.get('message') || '').trim();
              const subject = encodeURIComponent(`Contato Metamensagem — ${name || 'Visitante'}`);
              const body = encodeURIComponent(message);
              window.location.href = `mailto:contato@metamensagem.com?subject=${subject}&body=${body}`;
              setSent(true);
            }}
          >
            <label className="block text-sm font-bold">
              Nome
              <input
                name="name"
                required
                className={`mt-1 w-full rounded-xl border px-3 py-2 font-normal ${
                  tema === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-700'
                }`}
              />
            </label>
            <label className="block text-sm font-bold">
              Mensagem
              <textarea
                name="message"
                required
                rows={5}
                className={`mt-1 w-full rounded-xl border px-3 py-2 font-normal ${
                  tema === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-700'
                }`}
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-purple-600 text-white text-sm font-black hover:bg-purple-500 transition-colors"
            >
              Abrir e-mail
            </button>
          </form>
        )}
      </section>

      <nav className={`flex flex-wrap gap-4 text-sm font-bold ${muted}`}>
        <Link to="/sobre" className="text-purple-500 hover:underline">
          Sobre
        </Link>
        <Link to="/privacidade" className="text-purple-500 hover:underline">
          Privacidade
        </Link>
        <Link to="/frases" className="text-purple-500 hover:underline">
          Frases
        </Link>
        <Link to="/metaforas" className="text-purple-500 hover:underline">
          Metáforas
        </Link>
      </nav>
    </motion.div>
  );
}

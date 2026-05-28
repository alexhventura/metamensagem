import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Instagram, Send, Mail } from 'lucide-react';

export default function Contact({ tema }: { tema: string }) {
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`max-w-3xl mx-auto px-4 py-12 ${tema === 'light' ? 'text-zinc-800' : 'text-zinc-300'}`}
    >
      <h1 className="text-4xl font-black mb-8 uppercase tracking-widest text-[#A855F7]">Sobre a Metamensagem</h1>
      
      <div className="space-y-12 leading-relaxed">
        <section className="space-y-6">
          <p className="text-xl font-medium italic text-purple-500">
            "Acreditamos que uma reflexão no momento certo pode mudar um dia, uma decisão ou até uma vida."
          </p>
          <p className="text-lg">
            A Metamensagem nasceu da paixão profunda por palavras e pelo seu poder silencioso de transformação. Em um mundo cada vez mais veloz e ruidoso, sentíamos falta de um refúgio digital onde a sabedoria pudesse ser apreciada com calma e estética.
          </p>
          <p className="text-lg">
            Nossa plataforma é mais do que um banco de citações; é uma curadoria emocional. Frases e metáforas têm a capacidade única de atravessar nossas defesas racionais e conversar diretamente com a nossa essência. Cada conteúdo aqui listado foi escolhido para gerar um "clique" interno, uma pequena mudança de perspectiva que pode desencadear grandes transformações.
          </p>
          <p className="text-lg">
            Trabalhamos na intersecção entre a filosofia secular, a psicologia prática e a arte digital. Nosso compromisso é fornecer doses diárias de clareza mental e inspiração soft-premium.
          </p>
        </section>

        <section className="bg-gradient-to-br from-purple-500/10 to-transparent p-10 rounded-[3rem] border border-purple-500/20">
          <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">Quer falar conosco?</h2>
          <p className="mb-8 opacity-80">
            Estamos sempre abertos para sugestões, histórias inspiradoras e novas ideias. O canal oficial de comunicação e interação com a comunidade é através do nosso Instagram.
          </p>
          
          <a 
            href="https://www.instagram.com/metamensagem/" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`p-8 rounded-[2rem] border transition-all flex flex-col items-center gap-4 hover:scale-105 ${
              tema === 'light' ? 'bg-white border-zinc-100 shadow-xl' : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] rounded-2xl flex items-center justify-center text-white">
              <Instagram size={32} />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-xl">Instagram Oficial</h3>
              <p className="text-purple-500 font-bold">@metamensagem</p>
              <p className="text-xs opacity-50 mt-1">Envie uma mensagem direta (DM)</p>
            </div>
          </a>
        </section>

        <section className={`p-8 rounded-[2.5rem] border ${tema === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Send size={20} className="text-purple-500" /> Como aproveitar a experiência?
          </h3>
          <ul className="space-y-3 list-inside list-disc opacity-80">
            <li>Navegue pelas <strong>Frases</strong> para insights rápidos e impactantes.</li>
            <li>Explore as <strong>Metáforas</strong> para reflexões narrativas profundas.</li>
            <li>Use o <strong>Studio de Imagens</strong> para criar suas próprias artes e compartilhar sabedoria.</li>
            <li>Aproveite a tecnologia <strong>Edge-First</strong>: o site funciona offline após o primeiro acesso.</li>
          </ul>
        </section>
      </div>
    </motion.div>
  );
}

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function Terms({ tema }: { tema: string }) {
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`max-w-3xl mx-auto px-4 py-12 ${tema === 'light' ? 'text-zinc-800' : 'text-zinc-300'}`}
    >
      <h1 className="text-4xl font-black mb-8 uppercase tracking-widest text-[#A855F7]">{t('nav.terms')}</h1>
      
      <div className="space-y-8 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">1. Aceitação dos Termos</h2>
          <p>Ao acessar e usar a Metamensagem, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá usar nossa plataforma.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">2. Uso do Conteúdo</h2>
          <p>Todo o conteúdo disponibilizado (frases, metáforas e artes geradas) é para seu uso pessoal e não comercial. O compartilhamento em redes sociais é incentivado, desde que mantida a atribuição à Metamensagem (@metamensagem).</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">3. Direitos Autorais</h2>
          <p>As metáforas e frases podem ser de autoria própria ou de terceiros (devidamente citados). A Metamensagem detém os direitos sobre a curadoria e o design da plataforma.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">4. Limitação de Responsabilidade</h2>
          <p>A Metamensagem fornece conteúdo inspirador e reflexivo, mas não substitui aconselhamento profissional, médico ou psicológico. O uso das informações é por sua conta e risco.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">5. Alterações Futuras</h2>
          <p>Reservamo-nos o direito de modificar estes termos a qualquer momento. O uso continuado da plataforma após as alterações constitui sua aceitação dos novos termos.</p>
        </section>
      </div>
    </motion.div>
  );
}

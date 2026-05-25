import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function Privacy({ tema }: { tema: string }) {
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`max-w-3xl mx-auto px-4 py-12 ${tema === 'light' ? 'text-zinc-800' : 'text-zinc-300'}`}
    >
      <h1 className="text-4xl font-black mb-8 uppercase tracking-widest text-[#A855F7]">{t('nav.privacy')}</h1>
      
      <div className="space-y-8 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">1. Respeito Total à Privacidade</h2>
          <p>Na Metamensagem, acreditamos que sua privacidade é fundamental. Nossa plataforma foi construída com tecnologia "Edge-First", o que significa que seus dados de navegação e preferências são processados quase inteiramente no seu próprio dispositivo.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">2. Coleta de Dados</h2>
          <p>Não coletamos informações de identificação pessoal (PII) sem o seu consentimento. Utilizamos armazenamento local (LocalStorage e Cache Storage) para salvar sua preferência de tema (Claro/Escuro) e garantir que o site funcione offline.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">3. Conformidade GDPR e LGPD</h2>
          <p>Estamos em total conformidade com o Regulamento Geral sobre a Proteção de Dados (GDPR) da União Europeia e a Lei Geral de Proteção de Dados (LGPD) do Brasil. Você tem total controle sobre seus dados locais, podendo limpá-los a qualquer momento através das configurações do seu navegador.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">4. Cookies e Tecnologias Semelhantes</h2>
          <p>Não utilizamos cookies de rastreamento de terceiros para fins publicitários. Os dados armazenados são puramente técnicos para a funcionalidade da plataforma.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">5. Segurança</h2>
          <p>Implementamos medidas de segurança técnicas e organizacionais para proteger as informações processadas localmente e qualquer comunicação com nossos servidores de borda (CDN).</p>
        </section>
      </div>
    </motion.div>
  );
}

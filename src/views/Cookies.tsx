import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function Cookies({ tema }: { tema: string }) {
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`max-w-3xl mx-auto px-4 py-12 ${tema === 'light' ? 'text-zinc-800' : 'text-zinc-300'}`}
    >
      <h1 className="text-4xl font-black mb-8 uppercase tracking-widest text-[#A855F7]">{t('nav.cookies')}</h1>
      
      <div className="space-y-8 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">1. O que são Cookies?</h2>
          <p>Cookies são pequenos arquivos de texto enviados pelo site ao seu navegador para registrar seu comportamento e preferências. Eles nos ajudam a fornecer uma experiência mais fluida e personalizada.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">2. Google AdSense</h2>
          <p>Utilizamos o Google AdSense para exibir anúncios. O Google utiliza o cookie DART para exibir anúncios baseados em suas visitas a este e outros sites na Internet. Você pode desativar o uso do cookie DART visitando a Política de Privacidade da rede de conteúdo e anúncios do Google.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">3. Google Analytics</h2>
          <p>Utilizamos o Google Analytics para entender como os usuários interagem com nosso site. Isso nos ajuda a melhorar nosso conteúdo e arquitetura. Os dados coletados são anônimos e focados em padrões de uso.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">4. Consentimento e Gerenciamento</h2>
          <p>Ao continuar navegando na Metamensagem, você concorda com o uso de cookies técnicos essenciais. Para cookies de terceiros (anúncios e analytics), você pode gerenciar suas preferências diretamente nas configurações do seu navegador.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">5. Conformidade LGPD e GDPR</h2>
          <p>Nossa Política de Cookies está em conformidade com a LGPD (Brasil) e GDPR (Europa), garantindo transparência sobre quais dados são coletados e como você pode ter controle sobre eles.</p>
        </section>
      </div>
    </motion.div>
  );
}

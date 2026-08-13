import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function Cookies({ tema }: { tema: string }) {
  const { t } = useTranslation();
  const text = tema === 'light' ? 'text-zinc-800' : 'text-zinc-300';
  const muted = tema === 'light' ? 'text-zinc-600' : 'text-zinc-400';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`max-w-3xl mx-auto px-4 py-12 ${text}`}
    >
      <h1 className="text-3xl md:text-4xl font-black mb-3 tracking-tight text-[#A855F7]">
        {t('nav.cookies')}
      </h1>
      <p className={`text-sm mb-10 ${muted}`}>Última atualização: agosto de 2026</p>

      <div className={`space-y-8 leading-relaxed text-base ${muted}`}>
        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">1. O que são cookies</h2>
          <p>
            Cookies são pequenos arquivos armazenados no seu navegador. Também usamos tecnologias
            semelhantes (localStorage, sessionStorage) para lembrar preferências e medir uso do site
            de forma agregada.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">2. Cookies essenciais</h2>
          <p>
            Necessários para segurança, balanceamento de carga e preferências básicas (como tema
            claro/escuro). Sem eles, partes do site podem falhar. Esses cookies não exigem
            consentimento adicional sob a maioria das legislações, por serem estritamente necessários.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">3. Google AdSense e publicidade</h2>
          <p>
            A Metamensagem pode exibir anúncios do Google AdSense. O Google e seus parceiros usam
            cookies (incluindo tecnologias relacionadas ao DoubleClick/DART e identificadores de
            dispositivo) para:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-3">
            <li>exibir anúncios contextuais ou personalizados;</li>
            <li>limitar a frequência de anúncios;</li>
            <li>medir desempenho e combater fraude publicitária.</li>
          </ul>
          <p className="mt-3">
            Você pode gerenciar anúncios personalizados em{' '}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-500 underline"
            >
              adssettings.google.com
            </a>{' '}
            e consultar a política do Google em{' '}
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-500 underline"
            >
              policies.google.com/technologies/ads
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">4. Analytics</h2>
          <p>
            Podemos usar ferramentas de analytics (incluindo Google Analytics, quando ativadas) para
            entender páginas mais visitadas, origem do tráfego e erros técnicos. Os relatórios são
            agregados e usados para melhorar conteúdo e navegação.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">5. Como gerenciar</h2>
          <p>
            Você pode bloquear ou apagar cookies nas configurações do navegador (Chrome, Safari,
            Firefox, Edge). Bloquear cookies essenciais pode reduzir funcionalidades. Em dispositivos
            móveis, revise também as configurações de rastreamento do sistema operacional.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">6. Relação com a Privacidade</h2>
          <p>
            Esta página complementar a{' '}
            <Link to="/privacidade" className="text-purple-500 underline">
              Política de Privacidade
            </Link>
            . Em caso de conflito sobre cookies de publicidade, prevalece a descrição mais recente
            desta Política de Cookies.
          </p>
        </section>

        <nav className="pt-4 flex flex-wrap gap-4 text-sm font-bold">
          <Link to="/privacidade" className="text-purple-500 hover:underline">
            Privacidade
          </Link>
          <Link to="/termos" className="text-purple-500 hover:underline">
            Termos
          </Link>
          <Link to="/contato" className="text-purple-500 hover:underline">
            Contato
          </Link>
        </nav>
      </div>
    </motion.div>
  );
}

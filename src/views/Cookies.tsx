import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Cookies({ tema }: { tema: string }) {
  const muted = tema === 'light' ? 'text-zinc-600' : 'text-zinc-400';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`max-w-3xl mx-auto px-4 py-12 ${tema === 'light' ? 'text-zinc-800' : 'text-zinc-300'}`}
    >
      <h1 className="text-4xl font-black mb-4 uppercase tracking-widest text-[#A855F7]">
        Política de Cookies
      </h1>
      <p className={`mb-10 ${muted}`}>
        Explicamos quais cookies e tecnologias semelhantes a Metamensagem e seus parceiros (incluindo
        o Google AdSense) podem usar. Última atualização: setembro de 2026.
      </p>

      <div className="space-y-8 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">1. O que são cookies?</h2>
          <p>
            Cookies são pequenos arquivos armazenados no seu navegador. Também usamos armazenamento
            local e tecnologias semelhantes para lembrar preferências e permitir funcionalidades do
            site. Cookies de terceiros são definidos por serviços externos que integramos, como
            Google AdSense e, quando ativo, Google Analytics.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">2. Cookies essenciais e preferências</h2>
          <p>
            Guardamos no seu dispositivo preferências como tema claro/escuro e estados de interface.
            Esses dados são necessários ou fortemente ligados à experiência do site e, em regra, não
            identificam você perante nós como pessoa.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">3. Google AdSense (publicidade)</h2>
          <p className="mb-3">
            Usamos o Google AdSense (publisher ID público no site) para exibir anúncios. O Google
            pode utilizar cookies — inclusive cookies de publicidade — para:
          </p>
          <ul className={`list-disc list-inside space-y-2 mb-3 ${muted}`}>
            <li>exibir anúncios relevantes com base em visitas a este e a outros sites;</li>
            <li>limitar a frequência de um mesmo anúncio;</li>
            <li>medir a eficácia das campanhas publicitárias.</li>
          </ul>
          <p className="mb-3">
            Fornecedores de tecnologia publicitária de terceiros também podem usar cookies para
            veicular anúncios. Você pode gerenciar anúncios personalizados do Google em{' '}
            <a
              href="https://adssettings.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-500 font-semibold hover:underline"
            >
              adssettings.google.com
            </a>{' '}
            ou desativar cookies de publicidade de muitos provedores em{' '}
            <a
              href="https://www.aboutads.info/choices/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-500 font-semibold hover:underline"
            >
              aboutads.info/choices
            </a>
            .
          </p>
          <p>
            Documentação do Google:{' '}
            <a
              href="https://policies.google.com/technologies/ads?hl=pt-BR"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-500 font-semibold hover:underline"
            >
              Como o Google usa cookies em publicidade
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">4. Analytics</h2>
          <p>
            Quando a medição de audiência estiver ativa, o Google Analytics (ou equivalente) pode
            registrar páginas vistas e eventos de uso de forma agregada, ajudando-nos a melhorar
            conteúdo, performance e navegação. O compartilhamento com o Google segue os termos desses
            produtos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">5. Como gerenciar cookies</h2>
          <p className="mb-3">
            Você pode bloquear ou apagar cookies nas configurações do navegador. Bloquear cookies de
            publicidade pode reduzir a personalização dos anúncios, mas o site continua utilizável;
            alguns recursos de medição podem ficar limitados.
          </p>
          <p>
            Detalhes sobre dados pessoais e direitos LGPD estão na{' '}
            <Link to="/privacidade" className="text-purple-500 font-semibold hover:underline">
              Política de Privacidade
            </Link>
            . Dúvidas:{' '}
            <Link to="/contato" className="text-purple-500 font-semibold hover:underline">
              Contato
            </Link>
            .
          </p>
        </section>
      </div>
    </motion.div>
  );
}

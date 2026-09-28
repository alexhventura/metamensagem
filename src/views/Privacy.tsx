import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Privacy({ tema }: { tema: string }) {
  const muted = tema === 'light' ? 'text-zinc-600' : 'text-zinc-400';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`max-w-3xl mx-auto px-4 py-12 ${tema === 'light' ? 'text-zinc-800' : 'text-zinc-300'}`}
    >
      <h1 className="text-4xl font-black mb-4 uppercase tracking-widest text-[#A855F7]">
        Política de Privacidade
      </h1>
      <p className={`mb-10 ${muted}`}>
        Esta política descreve como a Metamensagem (metamensagem.com) trata dados quando você usa o
        site, incluindo preferências locais, analytics e publicidade via Google AdSense. Última
        atualização: setembro de 2026.
      </p>

      <div className="space-y-8 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">1. Controlador e contato</h2>
          <p>
            O site Metamensagem é mantido como projeto editorial independente. Para exercer direitos
            previstos na LGPD ou tirar dúvidas sobre privacidade, use a{' '}
            <Link to="/contato" className="text-purple-500 font-semibold hover:underline">
              página de contato
            </Link>{' '}
            ou o e-mail <strong>contato@metamensagem.com</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">2. Dados que processamos</h2>
          <ul className={`list-disc list-inside space-y-2 ${muted}`}>
            <li>
              <strong className={tema === 'light' ? 'text-zinc-800' : 'text-zinc-200'}>
                Preferências no dispositivo
              </strong>{' '}
              — tema claro/escuro e preferências de interface, via LocalStorage ou mecanismos
              equivalentes, para melhorar a experiência.
            </li>
            <li>
              <strong className={tema === 'light' ? 'text-zinc-800' : 'text-zinc-200'}>
                Dados de uso (analytics)
              </strong>{' '}
              — quando habilitado e com as configurações aplicáveis, usamos ferramentas de medição
              (por exemplo Google Analytics) para entender páginas visitadas e desempenho, de forma
              agregada.
            </li>
            <li>
              <strong className={tema === 'light' ? 'text-zinc-800' : 'text-zinc-200'}>
                Publicidade (Google AdSense)
              </strong>{' '}
              — exibimos anúncios por meio do Google AdSense. O Google e seus parceiros podem usar
              cookies e identificadores semelhantes para veicular, medir e personalizar anúncios,
              conforme as políticas do Google.
            </li>
            <li>
              <strong className={tema === 'light' ? 'text-zinc-800' : 'text-zinc-200'}>
                Mensagens que você nos envia
              </strong>{' '}
              — se entrar em contato por e-mail ou Instagram, trataremos o conteúdo da mensagem para
              responder ao pedido.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">3. Google AdSense e cookies de anúncios</h2>
          <p className="mb-3">
            Utilizamos o Google AdSense para financiar a manutenção do site. Fornecedores de
            tecnologia publicitária de terceiros, incluindo o Google, usam cookies para veicular
            anúncios com base em visitas anteriores a este e a outros sites.
          </p>
          <p className="mb-3">
            O uso de cookies de publicidade pelo Google permite que o Google e seus parceiros
            exibam anúncios aos usuários com base na visita feita a nossos sites ou a outros sites
            na Internet.
          </p>
          <p className="mb-3">
            Você pode desativar a publicidade personalizada nas{' '}
            <a
              href="https://adssettings.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-500 font-semibold hover:underline"
            >
              Configurações de anúncios do Google
            </a>
            . Como alternativa, é possível desativar o uso de cookies de publicidade de terceiros
            visitando a{' '}
            <a
              href="https://www.aboutads.info/choices/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-500 font-semibold hover:underline"
            >
              página de desativação da iniciativa About Ads
            </a>
            .
          </p>
          <p>
            Saiba mais na{' '}
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-500 font-semibold hover:underline"
            >
              Política de anúncios do Google
            </a>{' '}
            e na nossa{' '}
            <Link to="/cookies" className="text-purple-500 font-semibold hover:underline">
              Política de Cookies
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">4. Base legal e finalidades (LGPD)</h2>
          <p>
            Tratamos dados para operar o site (interesse legítimo / execução de funcionalidades
            solicitadas), medir audiência e melhorar o conteúdo, veicular publicidade que sustenta o
            serviço gratuito e atender solicitações de contato. Quando exigido, solicitamos
            consentimento para cookies não essenciais conforme a legislação aplicável.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">5. Seus direitos</h2>
          <p>
            Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção,
            anonimização, portabilidade (quando aplicável), eliminação de dados pessoais que
            tenhamos e informações sobre compartilhamento. Para exercer esses direitos, use{' '}
            <Link to="/contato" className="text-purple-500 font-semibold hover:underline">
              Contato
            </Link>
            . Preferências locais podem ser apagadas nas configurações do navegador.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">6. Segurança e retenção</h2>
          <p>
            Adotamos medidas técnicas razoáveis (HTTPS, boas práticas de hospedagem e acesso) para
            proteger o serviço. Dados de contato são retidos pelo tempo necessário para responder e
            cumprir obrigações legais. Cookies de terceiros seguem as políticas dos respectivos
            provedores (Google).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">7. Crianças</h2>
          <p>
            O conteúdo é de natureza geral e inspiracional. Não direcionamos o serviço à coleta
            consciente de dados de crianças. Responsáveis devem supervisionar o uso por menores.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">8. Alterações</h2>
          <p>
            Podemos atualizar esta política para refletir mudanças no site ou na legislação. A data
            de atualização será indicada no topo desta página. O uso continuado após alterações
            relevantes implica ciência da nova versão.
          </p>
        </section>
      </div>
    </motion.div>
  );
}

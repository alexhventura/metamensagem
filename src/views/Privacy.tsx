import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function Privacy({ tema }: { tema: string }) {
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
        {t('nav.privacy')}
      </h1>
      <p className={`text-sm mb-10 ${muted}`}>Última atualização: agosto de 2026</p>

      <div className={`space-y-8 leading-relaxed text-base ${muted}`}>
        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">1. Quem somos</h2>
          <p>
            A Metamensagem (metamensagem.com) é uma plataforma editorial de frases inspiradoras e
            metáforas terapêuticas para reflexão, estudo pessoal e compartilhamento consciente.
            Esta Política descreve quais dados tratamos, para quais finalidades e quais são os seus
            direitos, em conformidade com a LGPD (Brasil) e o GDPR (União Europeia), quando aplicável.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">2. Dados que tratamos</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong className={text}>Dados técnicos de navegação:</strong> endereço IP aproximado,
              tipo de dispositivo, navegador, páginas visitadas e tempos de permanência — usados para
              segurança, desempenho e estatísticas agregadas.
            </li>
            <li>
              <strong className={text}>Preferências locais:</strong> tema claro/escuro e idioma da
              interface, armazenados no seu dispositivo (localStorage), sem envio obrigatório a
              servidores nossos.
            </li>
            <li>
              <strong className={text}>Mensagens que você envia:</strong> se entrar em contato por
              e-mail ou Instagram, trataremos o conteúdo necessário para responder.
            </li>
            <li>
              <strong className={text}>Dados de publicidade:</strong> quando o Google AdSense estiver
              ativo, o Google e parceiros podem usar cookies e identificadores para exibir anúncios
              personalizados ou contextuais. Detalhes na nossa{' '}
              <Link to="/cookies" className="text-purple-500 underline">
                Política de Cookies
              </Link>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">3. Finalidades</h2>
          <p>Utilizamos dados para: (a) operar e melhorar o site; (b) medir audiência de forma
            agregada; (c) proteger a plataforma contra abusos; (d) exibir anúncios de forma
            compatível com as políticas do Google AdSense; (e) responder solicitações de suporte.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">4. Bases legais</h2>
          <p>
            Tratamos dados com base em legítimo interesse (segurança e melhoria do serviço),
            execução de funcionalidades solicitadas por você e, quando exigido, consentimento
            (cookies não essenciais e publicidade personalizada, conforme configuração do navegador
            e das ferramentas do Google).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">5. Compartilhamento</h2>
          <p>
            Podemos compartilhar dados técnicos com provedores de infraestrutura (CDN/hospedagem),
            analytics e publicidade (Google). Não vendemos listas de contatos pessoais. Parceiros
            processam dados segundo as próprias políticas e contratos de processamento.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">6. Retenção e segurança</h2>
          <p>
            Preferências locais permanecem no seu aparelho até você limpá-las. Logs técnicos são
            retidos pelo tempo necessário à operação e segurança. Aplicamos HTTPS, controle de acesso
            e práticas de minimização de dados.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">7. Seus direitos</h2>
          <p>
            Você pode solicitar acesso, correção, anonimização, portabilidade ou exclusão de dados
            pessoais que tenhamos, além de informações sobre compartilhamento. Para exercer direitos
            ou tirar dúvidas, use os canais da página{' '}
            <Link to="/contato" className="text-purple-500 underline">
              Contato
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">8. Crianças e adolescentes</h2>
          <p>
            O conteúdo é de natureza reflexiva e geral. Não coletamos intencionalmente dados de
            menores de 13 anos. Se souber de coleta indevida, contate-nos para remoção.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">9. Alterações</h2>
          <p>
            Podemos atualizar esta política para refletir mudanças legais ou operacionais. A data no
            topo indica a versão vigente. O uso continuado após alterações relevantes constitui
            ciência da nova redação.
          </p>
        </section>

        <nav className="pt-4 flex flex-wrap gap-4 text-sm font-bold">
          <Link to="/cookies" className="text-purple-500 hover:underline">
            Política de Cookies
          </Link>
          <Link to="/termos" className="text-purple-500 hover:underline">
            Termos de Uso
          </Link>
          <Link to="/sobre" className="text-purple-500 hover:underline">
            Sobre
          </Link>
        </nav>
      </div>
    </motion.div>
  );
}

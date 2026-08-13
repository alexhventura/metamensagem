import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function Terms({ tema }: { tema: string }) {
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
        {t('nav.terms')}
      </h1>
      <p className={`text-sm mb-10 ${muted}`}>Última atualização: agosto de 2026</p>

      <div className={`space-y-8 leading-relaxed text-base ${muted}`}>
        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">1. Aceitação</h2>
          <p>
            Ao acessar metamensagem.com você concorda com estes Termos de Uso e com a{' '}
            <Link to="/privacidade" className="text-purple-500 underline">
              Política de Privacidade
            </Link>
            . Se não concordar, interrompa o uso do site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">2. Descrição do serviço</h2>
          <p>
            A Metamensagem oferece curadoria de frases e metáforas, páginas de leitura, busca por
            temas e ferramentas para gerar imagens de compartilhamento. O acervo é multilíngue: cada
            citação permanece no idioma em que foi publicada. A interface acompanha o idioma do seu
            navegador.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">3. Uso permitido</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>leitura pessoal, estudo e reflexão;</li>
            <li>compartilhamento em redes sociais com atribuição a @metamensagem quando possível;</li>
            <li>criação de imagens pelo Studio para uso pessoal não comercial.</li>
          </ul>
          <p className="mt-3">
            É proibido: scraping massivo abusivo, republicação integral do acervo como produto
            próprio, uso que viole direitos de autores citados ou leis aplicáveis.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">4. Propriedade intelectual</h2>
          <p>
            Autores das frases e metáforas mantêm seus direitos. A Metamensagem detém direitos sobre
            a curadoria, design, marca, código e materiais originais da plataforma. Citações de
            terceiros são apresentadas com crédito quando disponível.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">5. Conteúdo e responsabilidade</h2>
          <p>
            O material é inspiracional e educacional geral. Não substitui terapia, diagnóstico médico
            ou aconselhamento profissional. Você é responsável pelo uso que fizer das informações e
            imagens geradas.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">6. Publicidade</h2>
          <p>
            O site pode exibir anúncios de terceiros (incluindo Google AdSense). Não controlamos o
            conteúdo de todos os anúncios. Consulte a{' '}
            <Link to="/cookies" className="text-purple-500 underline">
              Política de Cookies
            </Link>{' '}
            para opções de personalização.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">7. Disponibilidade</h2>
          <p>
            Nos esforçamos para manter o serviço estável, mas não garantimos disponibilidade
            ininterrupta. Podemos alterar, suspender ou descontinuar funcionalidades com aviso
            razoável quando possível.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">8. Limitação de responsabilidade</h2>
          <p>
            Na máxima extensão permitida pela lei, a Metamensagem não responde por danos indiretos,
            lucros cessantes ou perdas decorrentes do uso ou impossibilidade de uso do site, salvo
            dolo ou culpa grave.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-purple-500">9. Alterações e foro</h2>
          <p>
            Podemos atualizar estes termos. A versão vigente é a publicada nesta página. Questões
            relacionadas ao uso no Brasil observam a legislação brasileira e o foro da comarca do
            administrador do site, salvo regra de proteção ao consumidor em contrário.
          </p>
        </section>

        <nav className="pt-4 flex flex-wrap gap-4 text-sm font-bold">
          <Link to="/privacidade" className="text-purple-500 hover:underline">
            Privacidade
          </Link>
          <Link to="/cookies" className="text-purple-500 hover:underline">
            Cookies
          </Link>
          <Link to="/contato" className="text-purple-500 hover:underline">
            Contato
          </Link>
          <Link to="/sobre" className="text-purple-500 hover:underline">
            Sobre
          </Link>
        </nav>
      </div>
    </motion.div>
  );
}

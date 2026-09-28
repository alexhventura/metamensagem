import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Terms({ tema }: { tema: string }) {
  const muted = tema === 'light' ? 'text-zinc-600' : 'text-zinc-400';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`max-w-3xl mx-auto px-4 py-12 ${tema === 'light' ? 'text-zinc-800' : 'text-zinc-300'}`}
    >
      <h1 className="text-4xl font-black mb-4 uppercase tracking-widest text-[#A855F7]">
        Termos de Uso
      </h1>
      <p className={`mb-10 ${muted}`}>
        Ao usar metamensagem.com você concorda com estes termos. Última atualização: setembro de
        2026.
      </p>

      <div className="space-y-8 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">1. Aceitação</h2>
          <p>
            O acesso e o uso da Metamensagem implicam aceitação destes Termos de Uso, da{' '}
            <Link to="/privacidade" className="text-purple-500 font-semibold hover:underline">
              Política de Privacidade
            </Link>{' '}
            e da{' '}
            <Link to="/cookies" className="text-purple-500 font-semibold hover:underline">
              Política de Cookies
            </Link>
            . Se não concordar, não utilize o site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">2. Natureza do serviço</h2>
          <p>
            A Metamensagem oferece curadoria de frases inspiradoras, metáforas terapêuticas e
            ferramentas (como geração de imagens para compartilhamento). O conteúdo é editorial e
            inspiracional. <strong>Não constitui</strong> aconselhamento médico, psicológico,
            jurídico, financeiro ou profissional de qualquer natureza.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">3. Uso do conteúdo</h2>
          <p>
            Você pode ler, copiar e compartilhar trechos para uso pessoal e não comercial, mantendo
            a atribuição ao autor original quando indicado e, sempre que possível, referência à
            Metamensagem (@metamensagem / metamensagem.com). É vedado apresentar o conteúdo como se
            fosse de sua autoria exclusiva ou usá-lo de forma enganosa.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">4. Direitos autorais</h2>
          <p>
            Frases e metáforas podem ser de domínio público, de terceiros (citados) ou de curadoria
            própria. A Metamensagem detém direitos sobre a organização do acervo, textos
            explicativos de sua autoria, design e software da plataforma. Se você for titular de
            direitos e acreditar que algum material está indevido, contate-nos pela{' '}
            <Link to="/contato" className="text-purple-500 font-semibold hover:underline">
              página de contato
            </Link>{' '}
            para análise e eventual remoção.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">5. Publicidade</h2>
          <p>
            O site pode exibir anúncios do Google AdSense e de parceiros. A presença de publicidade
            não altera nossa obrigação de oferecer conteúdo útil e legível; anúncios não devem ser
            interpretados como endosso da Metamensagem aos produtos anunciados.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">6. Limitação de responsabilidade</h2>
          <p>
            O serviço é oferecido “como está”. Empregamos esforços razoáveis de disponibilidade e
            qualidade, mas não garantimos ausência de erros, interrupções ou adequação a um fim
            específico. Na máxima extensão permitida pela lei, não respondemos por decisões tomadas
            com base no conteúdo inspiracional do site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">7. Conduta</h2>
          <p>
            É proibido tentar comprometer a segurança do site, automatizar abusivamente o acesso,
            inserir malware ou usar a plataforma para fins ilícitos ou que violem direitos de
            terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-500">8. Alterações</h2>
          <p>
            Podemos atualizar estes termos. A versão vigente será publicada nesta página com a data
            de atualização. O uso continuado após mudanças relevantes constitui aceitação.
          </p>
        </section>
      </div>
    </motion.div>
  );
}

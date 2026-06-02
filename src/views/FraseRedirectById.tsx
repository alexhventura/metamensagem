import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadFraseDetailById } from '../lib/frasesModel';
import { frasePath, seoLocaleFromLanguageOriginal } from '../lib/i18nRoutes';

/** /f/:id → redireciona para /frases/:slug (links compartilhados resilientes). */
export default function FraseRedirectById() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!id) {
      setFailed(true);
      return;
    }
    let cancel = false;
    void loadFraseDetailById(id).then((frase) => {
      if (cancel) return;
      if (!frase) {
        setFailed(true);
        return;
      }
      const def = seoLocaleFromLanguageOriginal(
        frase.semantica?.languageOriginal || frase.semantica?.idiomaOriginal
      );
      navigate(frasePath(frase.slug, def, def), { replace: true });
    });
    return () => {
      cancel = true;
    };
  }, [id, navigate]);

  if (failed) {
    return (
      <div className="p-20 text-center text-red-400" role="alert">
        Frase não encontrada.
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-20">
      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

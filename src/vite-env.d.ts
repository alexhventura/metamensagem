/// <reference types="vite/client" />

/** Apenas variáveis públicas do Vite — nunca service role, DATABASE_URL ou senhas. */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GA4_MEASUREMENT_ID?: string;
  readonly VITE_CLARITY_PROJECT_ID?: string;
  readonly VITE_MYMEMORY_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

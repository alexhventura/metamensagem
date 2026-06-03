#!/usr/bin/env node
/**
 * Entrada única: digite a senha do Postgres → conexão testada → .env.local atualizado.
 *
 *   npm run supabase:config
 *   node setup-supabase/configurar.mjs
 */

import { setupSupabaseFromPasswordPrompt } from './lib/connection.mjs';

await setupSupabaseFromPasswordPrompt();

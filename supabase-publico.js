import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './supabase-config.js';

// Cliente exclusivo para datos que el servidor publica a anon. Usa otra clave
// de almacenamiento y no recupera ni renueva la sesión del navegador. Así una
// sesión vencida nunca bloquea categorías ni el catálogo de compra invitada.
export const supabasePublico = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storageKey: 'mg_supabase_publico_anon',
    detectSessionInUrl: false,
    persistSession: false,
    autoRefreshToken: false,
  },
});

let tokenCliente = '';
let clienteConToken = null;

// Captura el JWT de una sola operación. No consulta storage ni puede cambiar a
// anon entre comprobar la sesión y ejecutar una página del algoritmo.
export function supabaseConToken(accessToken) {
  const token = typeof accessToken === 'string' ? accessToken.trim() : '';
  if (token.length < 20 || token.length > 12000) {
    throw new TypeError('Se esperaba un access token válido para la lectura personalizada.');
  }
  if (clienteConToken && tokenCliente === token) return clienteConToken;
  tokenCliente = token;
  clienteConToken = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    accessToken: async () => token,
  });
  return clienteConToken;
}

export default supabasePublico;

// ============================================================
//  MAGANDHI · CONFIG DEL CLIENTE SUPABASE (tienda publica)
//  ------------------------------------------------------------
//  Modulo ES que crea UNA sola instancia del cliente Supabase y la
//  exporta para que las paginas de la tienda (home y producto) lean
//  EN VIVO la vista publica catalogo_publico.
//
//  SEGURIDAD (lee esto antes de tocar nada):
//  · La "publishable key" de abajo es PUBLICA POR DISENO. Va en el
//    cliente, cualquiera que abra el navegador puede verla, y eso es
//    correcto: no da acceso a los datos internos por si sola.
//  · La seguridad REAL vive en la base de datos: la tienda SOLO puede
//    leer la vista catalogo_publico (grant select a anon), que expone
//    unicamente productos publicados y campos publicos. Las tablas base
//    de Campanas no tienen acceso para anon. El candado esta en los
//    datos, no en este archivo ni en el HTML.
//  · La secret key / service_role key NUNCA se pone aqui, ni en el
//    frontend, ni en el repo. Salta la seguridad y solo la usa el dueno
//    desde el dashboard de Supabase.
// ============================================================

// Version EXACTA (no '@2' flotante): '@2' deja que esm.sh sirva cualquier 2.x,
// incluida una futura que cambie comportamiento o, peor, una comprometida que
// correria con la sesion del usuario en la tienda publica. Al fijar 2.116.0 el
// navegador siempre carga el mismo modulo auditado. Es la MISMA version que el
// back-office (coherencia). Para subir: cambiar el numero aqui a proposito y
// verificar que esm.sh responde 200.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

export const SUPABASE_URL = 'https://bxlzipwxyxdtffnuizbz.supabase.co';

// Publishable key: publica por diseno, protegida por RLS/vista. NUNCA la secret.
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ap4jdsO_0KPOPWhUk9Y7ZA_0jDUvHu1';

// Instancia unica del cliente. Importar { supabase } desde este modulo.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export default supabase;

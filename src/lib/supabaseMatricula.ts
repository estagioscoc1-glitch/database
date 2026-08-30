/**
 * Conexão SEPARADA com o projeto Supabase do site de matrícula online
 * (matriculasonline.colegiooswaldocruz.com.br) — projeto DIFERENTE do
 * Portal Acadêmico, de propósito (decisão de segurança: dado sensível de
 * matrícula, como CPF e documento, fica isolado no projeto dele).
 *
 * Só LÊ a view "matriculas_resumo_portal" (protocolo, nome, curso, horário,
 * status, data — nada sensível). Ver o script
 * PARA_RODAR_NO_SUPABASE_DA_MATRICULA.sql pra saber exatamente o que essa
 * view expõe.
 *
 * Precisa de duas variáveis de ambiente NOVAS, configuradas no Cloudflare
 * Pages do Portal Acadêmico (mesmo lugar onde já estão as variáveis do
 * banco de dados principal):
 *   VITE_MATRICULA_SUPABASE_URL
 *   VITE_MATRICULA_SUPABASE_ANON_KEY
 * (pegue os dois valores no config.js do site de matrícula, ou no painel
 * Supabase daquele projeto -> Settings -> API)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_MATRICULA_SUPABASE_URL as string | undefined;
const CHAVE = import.meta.env.VITE_MATRICULA_SUPABASE_ANON_KEY as string | undefined;

export const matriculaConfigurada = !!(URL && CHAVE);

if (!matriculaConfigurada) {
  console.warn(
    '[Matrícula Online] Faltam VITE_MATRICULA_SUPABASE_URL e/ou VITE_MATRICULA_SUPABASE_ANON_KEY. ' +
    'O aviso de matrículas novas fica desligado até essas variáveis serem configuradas — o resto do ' +
    'Portal Acadêmico continua funcionando normalmente.'
  );
}

export const supabaseMatricula: SupabaseClient | null = matriculaConfigurada
  ? createClient(URL as string, CHAVE as string, {
      auth: { persistSession: false, autoRefreshToken: false }, // não precisa de sessão — só leitura pública da view
    })
  : null;

export interface ResumoMatriculaOnline {
  id: string;
  protocol: string;
  studentName: string;
  course: string;
  schedule: string;
  status: 'pendente' | 'aprovada' | 'rejeitada' | 'cancelada';
  createdAt: string;
}

/** Carrega o resumo (sem dado sensível) das matrículas recebidas pelo site externo. */
export async function carregarResumoMatriculasOnline(): Promise<ResumoMatriculaOnline[] | null> {
  if (!supabaseMatricula) return null;
  const { data, error } = await supabaseMatricula
    .from('matriculas_resumo_portal')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(200);

  if (error) {
    console.warn('[Matrícula Online] Falha ao carregar resumo:', error.message);
    return null;
  }
  return (data ?? []).map((m: any) => ({
    id: m.id,
    protocol: m.protocolo,
    studentName: m.nome,
    course: m.curso,
    schedule: m.horario,
    status: m.status,
    createdAt: m.criado_em,
  }));
}

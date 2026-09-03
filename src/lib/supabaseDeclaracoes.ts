/**
 * DECLARAÇÕES — dados, preenchimento dos campos e acesso ao banco.
 *
 * Depende das tabelas criadas por supabase/17_declaracoes.sql. Se aquele
 * script ainda não tiver sido rodado, tudo aqui devolve o modelo padrão e o
 * portal continua funcionando — só não dá para salvar edições nem guardar
 * histórico.
 */

import { supabase } from './supabase';
import { MODELOS_PADRAO } from './declaracaoTextos';
import type { ModeloDeclaracao, TipoDeclaracao } from './declaracaoTextos';

export interface DadosDeclaracao {
  alunoId?: string;
  alunoNome: string;
  matricula?: string;
  cursoNome?: string;
  modulo?: string;
  turno?: string;
  nomeMae?: string;
  nomePai?: string;
  dataNascimento?: string;   // AAAA-MM-DD
  cidadeNascimento?: string;
  ufNascimento?: string;
  cpf?: string;
  rg?: string;
  /** Preenchidos à mão: datas de conclusão, semestre etc. */
  manuais: Record<string, string>;
  dataEmissao: string;       // AAAA-MM-DD
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** 2026-08-31 -> "31 de agosto de 2026". É como as declarações da escola escrevem. */
export function dataPorExtenso(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function dataCurta(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

/**
 * Monta a filiação. A escola escreve "filho(a) de Pai e Mãe" quando tem os
 * dois, e só a mãe quando o pai não está no cadastro — foi o que aparece nas
 * declarações que a secretaria usa hoje.
 */
function montarFiliacao(pai?: string, mae?: string): string {
  const p = (pai || '').trim();
  const m = (mae || '').trim();
  if (p && m) return `${p} e ${m}`;
  return p || m || '____________________________';
}

/** Troca os {{CAMPOS}} pelos valores reais. */
export function preencherDeclaracao(texto: string, d: DadosDeclaracao): string {
  const naturalidade = [d.cidadeNascimento, d.ufNascimento].filter(Boolean).join(' - ');
  const mapa: Record<string, string> = {
    ALUNO: (d.alunoNome || '').toUpperCase(),
    MATRICULA: d.matricula || '____________',
    CURSO: (d.cursoNome || '____________________').toUpperCase(),
    MODULO: d.modulo || '',
    TURNO: (d.turno || '').toUpperCase(),
    FILIACAO: montarFiliacao(d.nomePai, d.nomeMae),
    MAE: d.nomeMae || '____________________',
    PAI: d.nomePai || '____________________',
    NASCIMENTO: dataPorExtenso(d.dataNascimento) || '____________________',
    NATURALIDADE: naturalidade || '____________________',
    CPF: d.cpf || '______________',
    RG: d.rg || '____________',
    DATA: dataPorExtenso(d.dataEmissao),
  };

  // Os campos preenchidos à mão entram por cima: se a secretaria digitou uma
  // data de conclusão, é ela que vale, mesmo que exista campo de mesmo nome.
  for (const [chave, valor] of Object.entries(d.manuais || {})) {
    const ehData = /^\d{4}-\d{2}-\d{2}$/.test(valor);
    mapa[chave] = ehData ? dataCurta(valor) : valor;
  }

  return texto.replace(/\{\{(\w+)\}\}/g, (_, chave) => mapa[chave] ?? `{{${chave}}}`);
}

// --------------------------------------------------------------- BANCO

function padrao(tipo: TipoDeclaracao): ModeloDeclaracao {
  const m = MODELOS_PADRAO.find(x => x.tipo === tipo);
  if (!m) throw new Error(`Tipo de declaração desconhecido: ${tipo}`);
  return JSON.parse(JSON.stringify(m));
}

/** O modelo que vale hoje: o editado no banco, ou o padrão de fábrica. */
export async function carregarModelo(
  tipo: TipoDeclaracao
): Promise<{ modelo: ModeloDeclaracao; editado: boolean }> {
  const base = padrao(tipo);

  const { data, error } = await supabase
    .from('declaracoes_modelos')
    .select('titulo, paragrafos, mostrar_rodape, mostrar_assinatura')
    .eq('tipo', tipo)
    .maybeSingle();

  if (error || !data || !Array.isArray(data.paragrafos) || data.paragrafos.length === 0) {
    if (error) console.warn('[Declarações] Usando o texto padrão:', error.message);
    return { modelo: base, editado: false };
  }

  return {
    modelo: {
      ...base,
      titulo: data.titulo || base.titulo,
      paragrafos: data.paragrafos as string[],
      mostrarRodape: data.mostrar_rodape !== false,
      mostrarAssinatura: data.mostrar_assinatura !== false,
    },
    editado: true,
  };
}

export async function salvarModelo(
  m: ModeloDeclaracao,
  editadoPor?: string
): Promise<{ erro?: string }> {
  const { error } = await supabase.from('declaracoes_modelos').upsert(
    {
      tipo: m.tipo,
      titulo: m.titulo,
      paragrafos: m.paragrafos,
      mostrar_rodape: m.mostrarRodape,
      mostrar_assinatura: m.mostrarAssinatura,
      editado_por: editadoPor ?? null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'tipo' }
  );
  if (error) {
    if (error.message.includes('does not exist')) {
      return { erro: 'A tabela de modelos ainda não existe. Rode supabase/17_declaracoes.sql no Supabase.' };
    }
    return { erro: error.message };
  }
  return {};
}

export async function restaurarModeloPadrao(tipo: TipoDeclaracao): Promise<{ erro?: string }> {
  const { error } = await supabase.from('declaracoes_modelos').delete().eq('tipo', tipo);
  if (error) return { erro: error.message };
  return {};
}

/** Histórico. Falhar aqui não impede a impressão. */
export async function registrarDeclaracao(
  tipo: TipoDeclaracao,
  d: DadosDeclaracao,
  emitidoPor?: string
): Promise<void> {
  const { error } = await supabase.from('declaracoes_emitidas').insert({
    tipo,
    aluno_id: d.alunoId ?? null,
    aluno_nome: d.alunoNome,
    aluno_matricula: d.matricula ?? null,
    curso_nome: d.cursoNome ?? null,
    dados_manuais: d.manuais ?? {},
    emitido_por: emitidoPor ?? null,
    data_emissao: d.dataEmissao,
  });
  if (error) console.warn('[Declarações] Não deu para registrar no histórico:', error.message);
}

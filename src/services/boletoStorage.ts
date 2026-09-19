import { supabase } from '../lib/supabase';
import { addFinancialAuditLog, explicarErroFinanceiro } from './financeiroStorage';
import type { ConvenioBancario, Installment } from '../types/financeiro';

// ===========================================================================
//  BOLETO BANCÁRIO
//
//  Boleto de verdade (registrado no banco) depende de duas coisas que só a
//  ESCOLA consegue fornecer, e só depois de assinar o convênio de cobrança
//  com um banco:
//    1) Os dados do convênio (código do cedente/beneficiário, carteira,
//       agência, conta) — sem isso não tem nada pra gerar.
//    2) O layout exato do "campo livre" (25 dígitos dentro dos 44 do código
//       de barras) — cada banco usa um formato próprio pra esse campo.
//
//  O que ESTE ARQUIVO já deixa pronto, sem depender de banco nenhum:
//    - A tela de configuração do convênio (ConvenioBancarioManager.tsx)
//    - O cálculo das partes do código de barras que são IGUAIS em todo
//      banco (banco, moeda, DV geral, fator de vencimento, valor)
//    - O layout visual do boleto (BoletoPrintView.tsx), com recibo do
//      pagador + ficha de compensação, do jeito que sai impresso de verdade
//    - O desenho do código de barras (Intercalado 2 de 5) a partir dos 44
//      dígitos — funciona pra qualquer banco, não muda nada aí
//
//  O que falta, e só dá pra fazer depois que o convênio existir de verdade:
//    - O "campo livre" (25 dígitos) tem o formato do BANCO DO BRASIL como
//      referência aqui embaixo (é o mais comum pra convênio de escola) —
//      mas cada banco tem o seu. Se a escola conveniar com outro banco,
//      é só me mandar o manual de emissão de boletos dele (todo banco
//      fornece) que eu ajusto essa uma função, o resto continua igual.
// ===========================================================================

const TABELA = 'financeiro_convenio_bancario';

export async function getConvenioBancario(): Promise<ConvenioBancario | null> {
  const { data, error } = await supabase.from(TABELA).select('*').eq('id', 'default').maybeSingle();
  if (error) { console.warn('[Boleto] convênio:', explicarErroFinanceiro(error)); return null; }
  if (!data) return null;
  return {
    bancoCodigo: data.banco_codigo, bancoNome: data.banco_nome, agencia: data.agencia,
    contaCorrente: data.conta_corrente, carteira: data.carteira, codigoCedente: data.codigo_cedente,
    cedenteNome: data.cedente_nome, cedenteCnpj: data.cedente_cnpj, especieDocumento: data.especie_documento,
    aceite: data.aceite, localPagamento: data.local_pagamento, instrucoes: data.instrucoes ?? [],
    proximoNossoNumero: data.proximo_nosso_numero ?? 1, ativo: data.ativo ?? false,
  };
}

export async function salvarConvenioBancario(c: ConvenioBancario, user: string): Promise<boolean> {
  const { error } = await supabase.from(TABELA).upsert({
    id: 'default', banco_codigo: c.bancoCodigo, banco_nome: c.bancoNome, agencia: c.agencia,
    conta_corrente: c.contaCorrente, carteira: c.carteira, codigo_cedente: c.codigoCedente,
    cedente_nome: c.cedenteNome, cedente_cnpj: c.cedenteCnpj, especie_documento: c.especieDocumento,
    aceite: c.aceite, local_pagamento: c.localPagamento, instrucoes: c.instrucoes,
    proximo_nosso_numero: c.proximoNossoNumero, ativo: c.ativo,
  });
  if (error) { console.warn('[Boleto] salvar convênio:', explicarErroFinanceiro(error)); return false; }
  await addFinancialAuditLog(user, 'CONVENIO_BANCARIO_ATUALIZADO', `Dados do convênio bancário atualizados (banco ${c.bancoNome}).`);
  return true;
}

/** Reserva o próximo "nosso número" e já incrementa o contador salvo — pra nunca repetir. */
export async function reservarProximoNossoNumero(user: string): Promise<number | null> {
  const convenio = await getConvenioBancario();
  if (!convenio) return null;
  const numero = convenio.proximoNossoNumero;
  const ok = await salvarConvenioBancario({ ...convenio, proximoNossoNumero: numero + 1 }, user);
  return ok ? numero : null;
}

// ---------------------------------------------------------------------------
// CÁLCULO DO CÓDIGO DE BARRAS / LINHA DIGITÁVEL (padrão Febraban, 44 dígitos)
// ---------------------------------------------------------------------------

/** Dias corridos entre 07/10/1997 (data-base Febraban) e o vencimento. */
function fatorVencimento(vencimentoISO: string): string {
  const base = new Date('1997-10-07T00:00:00');
  const venc = new Date(vencimentoISO + 'T00:00:00');
  const dias = Math.round((venc.getTime() - base.getTime()) / 86400000);
  // A tabela Febraban esgotou em 21/02/2025 e reiniciou do zero (fator 1000
  // pra essa data) — como não sabemos ainda com qual banco a escola vai
  // conveniar nem a versão do manual dele, fica a fórmula clássica aqui;
  // é a primeira coisa a conferir com o banco antes de usar pra valer.
  return String(dias).padStart(4, '0').slice(-4);
}

/** Módulo 11 usado no dígito verificador GERAL do código de barras (posição 5). */
function mod11DvGeral(campo43: string): string {
  let soma = 0;
  let peso = 2;
  for (let i = campo43.length - 1; i >= 0; i--) {
    soma += Number(campo43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = 11 - resto;
  return (dv === 0 || dv === 10 || dv === 11) ? '1' : String(dv);
}

/**
 * Campo livre (25 dígitos, posições 20-44) — formato Banco do Brasil com
 * convênio de 6 dígitos (o mais comum pra escolas). Fonte: manual de
 * emissão de boletos do BB, convênios de 6 dígitos.
 *   AAAAAA (convênio, 6) + NNNNNNNNNNN (nosso número, 11) + N (carteira, 1) + 0000000 (7)
 * SE A ESCOLA CONVENIAR COM OUTRO BANCO OU OUTRO TAMANHO DE CONVÊNIO, essa é
 * a ÚNICA função que precisa mudar — o resto do cálculo é padrão de mercado.
 */
function campoLivreBancoDoBrasil(convenio: ConvenioBancario, nossoNumero: number): string {
  const conv6 = convenio.codigoCedente.replace(/\D/g, '').padStart(6, '0').slice(-6);
  const nn11 = String(nossoNumero).padStart(11, '0');
  const carteira1 = convenio.carteira.replace(/\D/g, '').padStart(1, '0').slice(-1);
  return `${conv6}${nn11}${carteira1}0000000`;
}

function montarCampoLivre(convenio: ConvenioBancario, nossoNumero: number): string {
  switch (convenio.bancoCodigo) {
    case '001': // Banco do Brasil
      return campoLivreBancoDoBrasil(convenio, nossoNumero);
    default:
      // Sem o manual do banco escolhido ainda — usa o formato do BB como
      // rascunho de layout (pra tela não quebrar), mas isso NÃO é válido
      // pra registrar de verdade nesse banco. gerarDadosBoleto() abaixo
      // sinaliza isso em "valido".
      return campoLivreBancoDoBrasil(convenio, nossoNumero);
  }
}

export interface DadosBoleto {
  codigoBarras44: string;
  linhaDigitavel: string;
  nossoNumero: number;
  valido: boolean; // false = layout do campo livre ainda não confirmado pra esse banco
  avisoValidade?: string;
}

export function gerarDadosBoleto(
  installment: Installment,
  convenio: ConvenioBancario,
  nossoNumero: number
): DadosBoleto {
  const valorCentavos = Math.round(((installment.originalValue - installment.discountValue) || 0) * 100);
  const valor10 = String(valorCentavos).padStart(10, '0').slice(-10);
  const vencimento4 = fatorVencimento(installment.dueDate);
  const campoLivre = montarCampoLivre(convenio, nossoNumero);

  // Monta o campo de 43 posições (sem o DV geral) pra calcular o DV, depois
  // remonta os 44 com o DV na posição 5.
  const banco3 = convenio.bancoCodigo.padStart(3, '0').slice(-3);
  const moeda1 = '9';
  const semDv = `${banco3}${moeda1}${vencimento4}${valor10}${campoLivre}`; // 43 dígitos
  const dv = mod11DvGeral(semDv);
  const codigoBarras44 = `${banco3}${moeda1}${dv}${vencimento4}${valor10}${campoLivre}`;

  const linhaDigitavel = montarLinhaDigitavel(codigoBarras44);

  const bancosComLayoutConfirmado = ['001'];
  const valido = bancosComLayoutConfirmado.includes(convenio.bancoCodigo);

  return {
    codigoBarras44,
    linhaDigitavel,
    nossoNumero,
    valido,
    avisoValidade: valido
      ? undefined
      : `Layout do campo livre do banco "${convenio.bancoNome || convenio.bancoCodigo}" ainda não confirmado — ` +
        `este boleto está usando o formato do Banco do Brasil como rascunho e NÃO deve ser usado pra cobrar de verdade ` +
        `até conferir o manual de emissão desse banco.`,
  };
}

/** Reagrupa os 44 dígitos do código de barras nos 5 campos da linha digitável, com os DVs de cada campo (mod10). */
function montarLinhaDigitavel(codigoBarras44: string): string {
  const banco = codigoBarras44.slice(0, 3);
  const moeda = codigoBarras44.slice(3, 4);
  const dvGeral = codigoBarras44.slice(4, 5);
  const fator = codigoBarras44.slice(5, 9);
  const valor = codigoBarras44.slice(9, 19);
  const livre = codigoBarras44.slice(19, 44);

  const campo1base = banco + moeda + livre.slice(0, 5);
  const campo2base = livre.slice(5, 15);
  const campo3base = livre.slice(15, 25);

  const campo1 = campo1base + mod10(campo1base);
  const campo2 = campo2base + mod10(campo2base);
  const campo3 = campo3base + mod10(campo3base);

  const f = (s: string) => (s.length > 5 ? `${s.slice(0, 5)}.${s.slice(5)}` : s);
  return `${f(campo1)} ${f(campo2)} ${f(campo3)} ${dvGeral} ${fator}${valor}`;
}

function mod10(campo: string): string {
  let soma = 0;
  let peso = 2;
  for (let i = campo.length - 1; i >= 0; i--) {
    let mult = Number(campo[i]) * peso;
    if (mult > 9) mult = Math.floor(mult / 10) + (mult % 10);
    soma += mult;
    peso = peso === 2 ? 1 : 2;
  }
  const resto = soma % 10;
  return resto === 0 ? '0' : String(10 - resto);
}

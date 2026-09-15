/**
 * Storage & Logic Service for Módulo Financeiro
 *
 * PARTE 1 DE 12 JÁ CONVERTIDA PARA O BANCO DE VERDADE: os logs de auditoria
 * e as cinco funções de Caixa (getCashRegisters, getOpenCashRegister,
 * openCashRegister, closeCashRegister, reopenCashRegister) leem e gravam no
 * Supabase agora, não mais no navegador. O resto deste arquivo — parcelas,
 * entradas, saídas, bolsas e tudo mais — continua em safeLocalStorage até
 * as próximas entregas converterem, uma parte de cada vez.
 */

import { safeLocalStorage } from '../lib/safeStorage';
import { supabase } from '../lib/supabase';
import { 
  CashRegister, PaymentMethodItem, Installment, MiscPaymentCatalog,
  MiscIncome, Expense, Scholarship, CoursePriceConfig,
  FinancialNote, FinancialReceipt, FinancialAuditLog, ExemptionItem, ReportTemplate
} from '../types/financeiro';

function explicarErroFinanceiro(erro: any): string {
  const m = String(erro?.message || erro);
  if (m.includes('financeiro_') && m.includes('does not exist')) {
    return 'O financeiro ainda não foi instalado no banco. Rode o arquivo 40_financeiro_tabelas.sql no Supabase.';
  }
  return m;
}

const STORAGE_KEYS = {
  CASH_REGISTERS: 'gestao_fin_cash_registers_v1',
  PAYMENT_METHODS: 'gestao_fin_payment_methods_v1',
  INSTALLMENTS: 'gestao_fin_installments_v1',
  MISC_CATALOG: 'gestao_fin_misc_catalog_v1',
  MISC_INCOMES: 'gestao_fin_misc_incomes_v1',
  EXPENSES: 'gestao_fin_expenses_v1',
  SCHOLARSHIPS: 'gestao_fin_scholarships_v1',
  COURSE_PRICES: 'gestao_fin_course_prices_v1',
  FINANCIAL_NOTES: 'gestao_fin_notes_v1',
  RECEIPTS: 'gestao_fin_receipts_v1',
  AUDIT_LOGS: 'gestao_fin_audit_logs_v1',
  REPORT_TEMPLATES: 'gestao_fin_report_templates_v1'
};

// Initial Default Payment Methods Seed
export const defaultPaymentMethods: PaymentMethodItem[] = [
  { id: 'pm_dinheiro', name: 'Dinheiro', isSystemDefault: true, active: true },
  { id: 'pm_pix', name: 'PIX', isSystemDefault: true, active: true },
  { id: 'pm_cartao_credito', name: 'Cartão de Crédito', isSystemDefault: true, active: true },
  { id: 'pm_cartao_debito', name: 'Cartão de Débito', isSystemDefault: true, active: true },
  { id: 'pm_transferencia', name: 'Transferência Bancária', isSystemDefault: true, active: true },
  { id: 'pm_deposito', name: 'Depósito', isSystemDefault: true, active: true },
  { id: 'pm_cheque', name: 'Cheque', isSystemDefault: true, active: true },
  { id: 'pm_convenio', name: 'Convênio', isSystemDefault: true, active: true },
];

// Initial Course Price Configurations Seed
export const initialCoursePriceConfigs: CoursePriceConfig[] = [
  {
    id: 'cpc_enf',
    courseId: 'ENF',
    courseName: 'TÉCNICO EM ENFERMAGEM',
    enrollmentPrice: 350.00,
    reenrollmentPrice: 300.00,
    monthlyPrice: 480.00,
    dependencyPrice: 150.00,
    maxInstallments: 12,
    discountPercent: 10,
    discountLimitDay: 10,
    finePercent: 2,
    dailyInterestPercent: 0.033,
    notes: 'Desconto de 10% para pagamentos até o dia 10.'
  },
  {
    id: 'cpc_rad',
    courseId: 'RAD',
    courseName: 'TÉCNICO EM RADIOLOGIA',
    enrollmentPrice: 380.00,
    reenrollmentPrice: 320.00,
    monthlyPrice: 520.00,
    dependencyPrice: 160.00,
    maxInstallments: 12,
    discountPercent: 10,
    discountLimitDay: 10,
    finePercent: 2,
    dailyInterestPercent: 0.033,
    notes: 'Inclui material de proteção radiológica basico.'
  }
];

// Initial Misc Payment Catalog Seed
export const initialMiscCatalog: MiscPaymentCatalog[] = [
  {
    id: 'cat_apostila',
    name: 'Apostila / Material Didático',
    category: 'Material',
    defaultValue: 120.00,
    description: 'Apostila completa do semestre letivo',
    active: true,
    blockedActions: []
  },
  {
    id: 'cat_uniforme',
    name: 'Kit Uniforme Escolar',
    category: 'Vestuário',
    defaultValue: 180.00,
    description: 'Camisa e Jaleco bordado oficial',
    active: true,
    blockedActions: []
  },
  {
    id: 'cat_segunda_via',
    name: 'Segunda Via de Documentos / Carteira',
    category: 'Taxa Administrativa',
    defaultValue: 35.00,
    description: 'Emissão de segunda via de documento escolar',
    active: true,
    blockedActions: ['DOCUMENTOS']
  },
  {
    id: 'cat_diploma',
    name: 'Taxa de Emissão e Registro de Diploma',
    category: 'Diploma',
    defaultValue: 250.00,
    description: 'Taxa administrativa para confecção de diploma e histórico oficial',
    active: true,
    blockedActions: ['DIPLOMA', 'CERTIFICADO']
  },
  {
    id: 'cat_estagio',
    name: 'Taxa de Convênio de Estágio Supervisionado',
    category: 'Estágio',
    defaultValue: 150.00,
    description: 'Taxa de seguro de acidentes e termo de estágio',
    active: true,
    blockedActions: ['ESTAGIO']
  }
];

/*
 * DINHEIRO FICTÍCIO NÃO É PADRÃO DE SISTEMA EM PRODUÇÃO.
 *
 * Parcelas, despesas, recibos, bolsas e receitas avulsas tinham massa de
 * demonstração como VALOR PADRÃO — servida sempre que o navegador ainda não
 * tinha dados salvos. Num sistema recém-zerado, o painel da direção abria
 * mostrando "Total Recebido: R$ 432" e "Despesas: R$ 180" de alunos que não
 * existem, com nomes inventados como "Maria Silva de Oliveira".
 *
 * Isso é pior que enfeite: é número financeiro errado numa tela de gestão, e
 * quem olha não tem como saber que é mentira. Os padrões agora são listas
 * vazias — o painel mostra zero até alguém lançar algo de verdade.
 *
 * Catálogos de configuração (formas de pagamento, tabelas de preço) continuam
 * com valores iniciais: aquilo é parâmetro da escola, não lançamento.
 */

// Helper to safely fetch from localStorage
function getItemJSON<T>(key: string, defaultValue: T): T {
  try {
    const data = safeLocalStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItemJSON<T>(key: string, value: T): void {
  try {
    safeLocalStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to safeLocalStorage:`, err);
  }
}

// --- LOGS DE AUDITORIA (já no banco) ---
export async function getFinancialAuditLogs(): Promise<FinancialAuditLog[]> {
  const { data, error } = await supabase
    .from('financeiro_logs_auditoria').select('*').order('data', { ascending: false }).limit(500);
  if (error) { console.warn('[Financeiro] logs:', explicarErroFinanceiro(error)); return []; }
  return (data ?? []).map((l: any) => ({
    id: l.id, date: l.data, user: l.usuario, action: l.acao, details: l.detalhes ?? '', module: l.modulo,
  }));
}

export async function addFinancialAuditLog(user: string, action: string, details: string): Promise<void> {
  const { error } = await supabase.from('financeiro_logs_auditoria').insert({
    usuario: user, acao: action, detalhes: details,
  });
  if (error) console.warn('[Financeiro] não gravou o log de auditoria:', explicarErroFinanceiro(error));
}

// --- CAIXA (parte 1 já ligada ao banco — as demais partes ainda usam
//     o navegador, até serem convertidas nas próximas entregas) ---

/*
 * PRIMEIRA PARTE CONVERTIDA PARA O BANCO DE VERDADE.
 *
 * Antes, "getCashRegisters()" e as outras quatro funções abaixo liam e
 * gravavam no navegador (safeLocalStorage) — cada computador da tesouraria
 * tinha o seu próprio caixa, sem nada em comum com os outros. Agora conversam
 * com o Supabase, na tabela financeiro_caixas.
 *
 * As funções continuam com o MESMO NOME e o mesmo formato de retorno de
 * antes — só que agora devolvem uma Promise, porque falar com o banco nunca
 * é instantâneo como ler o navegador. Por isso toda tela que chamava
 * "getCashRegisters()" direto precisa passar a escrever
 * "await getCashRegisters()" — é a única mudança que a interface precisa
 * fazer para esta parte.
 */
function caixaDoBanco(c: any): CashRegister {
  return {
    id: c.id, seqNumber: c.seq_numero, openedAt: c.aberto_em, closedAt: c.fechado_em ?? undefined,
    responsibleUser: c.responsavel, initialBalance: Number(c.saldo_inicial),
    finalBalance: c.saldo_final != null ? Number(c.saldo_final) : undefined,
    status: c.status, notes: c.observacoes ?? undefined,
    calculatedIncomes: c.entradas_calculadas != null ? Number(c.entradas_calculadas) : undefined,
    calculatedExpenses: c.saidas_calculadas != null ? Number(c.saidas_calculadas) : undefined,
  };
}

export async function getCashRegisters(): Promise<CashRegister[]> {
  const { data, error } = await supabase
    .from('financeiro_caixas').select('*').order('seq_numero', { ascending: false });
  if (error) { console.warn('[Financeiro] caixas:', explicarErroFinanceiro(error)); return []; }
  return (data ?? []).map(caixaDoBanco);
}

export async function getOpenCashRegister(): Promise<CashRegister | null> {
  const { data, error } = await supabase
    .from('financeiro_caixas').select('*').eq('status', 'OPEN').maybeSingle();
  if (error || !data) return null;
  return caixaDoBanco(data);
}

export async function openCashRegister(user: string, initialBalance: number, notes?: string): Promise<CashRegister> {
  const jaAberto = await getOpenCashRegister();
  if (jaAberto) throw new Error(`Já existe o Caixa #${jaAberto.seqNumber} aberto. Feche-o antes de abrir outro.`);

  const { data: seqData, error: erroSeq } = await supabase.rpc('nextval_financeiro_caixa');
  if (erroSeq) throw new Error(explicarErroFinanceiro(erroSeq));

  const { data, error } = await supabase.from('financeiro_caixas').insert({
    seq_numero: seqData, responsavel: user, saldo_inicial: Number(initialBalance),
    status: 'OPEN', observacoes: notes?.trim() || null,
  }).select('*').single();
  if (error) throw new Error(explicarErroFinanceiro(error));

  const novo = caixaDoBanco(data);
  await addFinancialAuditLog(user, 'ABERTURA_CAIXA', `Caixa #${novo.seqNumber} aberto com saldo inicial de R$ ${initialBalance.toFixed(2)}`);
  return novo;
}

export async function closeCashRegister(registerId: string, user: string, finalNotes?: string): Promise<CashRegister | null> {
  const { data: reg, error: erroReg } = await supabase
    .from('financeiro_caixas').select('*').eq('id', registerId).single();
  if (erroReg || !reg) return null;

  const { data: recibos } = await supabase
    .from('financeiro_recibos').select('valor_total').eq('caixa_id', registerId).eq('status', 'VALIDO');
  const { data: saidas } = await supabase
    .from('financeiro_saidas').select('valor').eq('caixa_id', registerId);

  const totalEntradas = (recibos ?? []).reduce((s: number, r: any) => s + Number(r.valor_total), 0);
  const totalSaidas = (saidas ?? []).reduce((s: number, e: any) => s + Number(e.valor), 0);
  const saldoFinal = Number(reg.saldo_inicial) + totalEntradas - totalSaidas;

  const { data, error } = await supabase.from('financeiro_caixas').update({
    status: 'CLOSED', fechado_em: new Date().toISOString(), saldo_final: saldoFinal,
    entradas_calculadas: totalEntradas, saidas_calculadas: totalSaidas,
    observacoes: finalNotes ? `${reg.observacoes || ''} | Fechamento: ${finalNotes}` : reg.observacoes,
  }).eq('id', registerId).select('*').single();
  if (error) { console.warn('[Financeiro] fechar caixa:', explicarErroFinanceiro(error)); return null; }

  await addFinancialAuditLog(user, 'FECHAMENTO_CAIXA',
    `Caixa #${reg.seq_numero} fechado. Entradas: R$ ${totalEntradas.toFixed(2)}, Saídas: R$ ${totalSaidas.toFixed(2)}, Saldo Final: R$ ${saldoFinal.toFixed(2)}`);
  return caixaDoBanco(data);
}

export async function reopenCashRegister(registerId: string, user: string): Promise<boolean> {
  const { data: reg, error } = await supabase
    .from('financeiro_caixas').update({ status: 'OPEN', fechado_em: null }).eq('id', registerId).select('seq_numero').single();
  if (error || !reg) return false;
  await addFinancialAuditLog(user, 'REABERTURA_CAIXA', `Caixa #${reg.seq_numero} reaberto pelo Administrador.`);
  return true;
}

// --- FORMAS DE PAGAMENTO (parte 2 já ligada ao banco) ---
/*
 * MESMA CONVERSÃO DA PARTE 1: nomes iguais, agora devolvendo Promise.
 * A tabela financeiro_formas_pagamento já nasceu com as nove formas padrão
 * (Dinheiro, PIX, Cartão de Crédito/Débito, Transferência, Depósito,
 * Cheque, Convênio, Boleto) — foi o próprio SQL da Parte 1 que inseriu.
 */
function formaDoBanco(f: any): PaymentMethodItem {
  return { id: f.id, name: f.nome, isSystemDefault: f.padrao_sistema, active: f.ativo };
}

export async function getPaymentMethods(): Promise<PaymentMethodItem[]> {
  const { data, error } = await supabase.from('financeiro_formas_pagamento').select('*').order('nome');
  if (error) { console.warn('[Financeiro] formas de pagamento:', explicarErroFinanceiro(error)); return defaultPaymentMethods; }
  return (data ?? []).map(formaDoBanco);
}

export async function savePaymentMethod(method: PaymentMethodItem, user: string): Promise<void> {
  const { error } = await supabase.from('financeiro_formas_pagamento').upsert({
    id: method.id, nome: method.name, padrao_sistema: method.isSystemDefault, ativo: method.active,
  });
  if (error) { console.warn('[Financeiro] salvar forma de pagamento:', explicarErroFinanceiro(error)); return; }
  await addFinancialAuditLog(user, 'FORMA_PAGAMENTO_SALVA', `Forma de pagamento ${method.name} configurada.`);
}

export async function addCustomPaymentMethod(name: string, user: string): Promise<PaymentMethodItem> {
  const novoItem: PaymentMethodItem = { id: 'pm_' + Date.now(), name: name.trim(), isSystemDefault: false, active: true };
  const { error } = await supabase.from('financeiro_formas_pagamento').insert({
    id: novoItem.id, nome: novoItem.name, padrao_sistema: false, ativo: true,
  });
  if (error) throw new Error(explicarErroFinanceiro(error));
  await addFinancialAuditLog(user, 'FORMA_PAGAMENTO_CRIADA', `Nova forma de pagamento criada: ${name.trim()}`);
  return novoItem;
}

// --- PREÇOS POR CURSO (parte 2 já ligada ao banco) ---
function precoCursoDoBanco(p: any): CoursePriceConfig {
  return {
    id: p.id, courseId: p.curso_id, courseName: p.curso_nome,
    enrollmentPrice: Number(p.valor_matricula), reenrollmentPrice: Number(p.valor_rematricula),
    monthlyPrice: Number(p.valor_mensalidade), dependencyPrice: Number(p.valor_dependencia),
    maxInstallments: p.max_parcelas, discountPercent: Number(p.desconto_percent),
    discountLimitDay: p.dia_limite_desconto, finePercent: Number(p.multa_percent),
    dailyInterestPercent: Number(p.juros_diario_percent), notes: p.observacoes ?? undefined,
  };
}

export async function getCoursePriceConfigs(): Promise<CoursePriceConfig[]> {
  const { data, error } = await supabase.from('financeiro_precos_curso').select('*').order('curso_nome');
  if (error) { console.warn('[Financeiro] preços por curso:', explicarErroFinanceiro(error)); return []; }
  return (data ?? []).map(precoCursoDoBanco);
}

export async function saveCoursePriceConfig(config: CoursePriceConfig, user: string): Promise<void> {
  const { error } = await supabase.from('financeiro_precos_curso').upsert({
    curso_id: config.courseId, curso_nome: config.courseName,
    valor_matricula: config.enrollmentPrice, valor_rematricula: config.reenrollmentPrice,
    valor_mensalidade: config.monthlyPrice, valor_dependencia: config.dependencyPrice,
    max_parcelas: config.maxInstallments, desconto_percent: config.discountPercent,
    dia_limite_desconto: config.discountLimitDay, multa_percent: config.finePercent,
    juros_diario_percent: config.dailyInterestPercent, observacoes: config.notes || null,
  }, { onConflict: 'curso_id' });
  if (error) { console.warn('[Financeiro] salvar preço do curso:', explicarErroFinanceiro(error)); return; }
  await addFinancialAuditLog(user, 'VALOR_CURSO_ATUALIZADO', `Valores do curso ${config.courseName} salvos.`);
}

// --- SCHOLARSHIPS (BOLSAS) ---
export function getScholarships(): Scholarship[] {
  const seedScholarships: Scholarship[] = [
    {
      id: 'bolsa_001',
      studentId: '1', // Default sample student if exists
      studentName: 'Maria Silva de Oliveira',
      enrollment: 'ALU202601',
      type: 'Bolsa Mérito Acadêmico',
      discountType: 'PERCENT',
      discountValue: 20,
      startDate: '2026-02-01',
      reason: 'Excelente desempenho no exame de bolsa',
      partnerInstitution: 'Fundação Educacional',
      authorizer: 'Direção Geral',
      notes: 'Bolsa de 20% concedida para o ano de 2026.',
      active: true
    }
  ];
  return getItemJSON<Scholarship[]>(STORAGE_KEYS.SCHOLARSHIPS, []);
}

export function saveScholarship(scholarship: Scholarship, user: string): void {
  const list = getScholarships();
  const idx = list.findIndex(s => s.id === scholarship.id);
  if (idx >= 0) {
    list[idx] = scholarship;
  } else {
    list.push(scholarship);
  }
  setItemJSON(STORAGE_KEYS.SCHOLARSHIPS, list);

  // Apply discount automatically to student's FUTURE open installments!
  applyScholarshipToInstallments(scholarship, user);

  addFinancialAuditLog(user, 'BOLSA_CADASTRADA', `Bolsa ${scholarship.type} (${scholarship.discountValue}${scholarship.discountType === 'PERCENT' ? '%' : ' R$'}) associada ao aluno ${scholarship.studentName}`);
}

function applyScholarshipToInstallments(scholarship: Scholarship, user: string): void {
  if (!scholarship.active) return;
  const installments = getInstallments();
  let modifiedCount = 0;

  installments.forEach((inst, i) => {
    if (inst.studentId === scholarship.studentId && inst.status === 'PENDENTE') {
      let discountVal = 0;
      if (scholarship.discountType === 'PERCENT') {
        discountVal = (inst.originalValue * scholarship.discountValue) / 100;
      } else {
        discountVal = scholarship.discountValue;
      }

      installments[i] = {
        ...inst,
        discountValue: discountVal,
        scholarshipApplied: `${scholarship.type} (${scholarship.discountValue}${scholarship.discountType === 'PERCENT' ? '%' : ' R$'})`
      };
      modifiedCount++;
    }
  });

  if (modifiedCount > 0) {
    setItemJSON(STORAGE_KEYS.INSTALLMENTS, installments);
    addFinancialAuditLog(user, 'BOLSA_APLICADA_PARCELAS', `Desconto da bolsa aplicado automaticamente a ${modifiedCount} parcela(s) pendente(s) do aluno ${scholarship.studentName}`);
  }
}

// --- CATÁLOGO DE PAGAMENTOS DIVERSOS (parte 5 já ligada ao banco) ---
function itemCatalogoDoBanco(i: any): MiscPaymentCatalog {
  return {
    id: i.id, name: i.nome, category: i.categoria, defaultValue: Number(i.valor_padrao),
    description: i.descricao ?? '', active: i.ativo, blockedActions: i.acoes_bloqueadas ?? [],
  };
}

export async function getMiscPaymentCatalog(): Promise<MiscPaymentCatalog[]> {
  const { data, error } = await supabase.from('financeiro_catalogo_diversos').select('*').order('nome');
  if (error) { console.warn('[Financeiro] catálogo diverso:', explicarErroFinanceiro(error)); return []; }
  return (data ?? []).map(itemCatalogoDoBanco);
}

/*
   A tela de cadastro gera um id provisório tipo "cat_1699999999" para item
   novo (antes de saber o id de verdade) — bom para o navegador reconhecer o
   item na hora, mas essa string nunca é um UUID válido, e a coluna "id" da
   tabela exige um UUID de verdade. Por isso: só reaproveita o id recebido
   quando ele já É um UUID de verdade (ou seja, veio de uma edição, lido do
   banco antes); qualquer outro formato vira um cadastro novo, com o banco
   gerando o UUID sozinho.
*/
const pareceUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function saveMiscPaymentCatalog(item: MiscPaymentCatalog, user: string): Promise<void> {
  const linha: any = {
    nome: item.name, categoria: item.category, valor_padrao: item.defaultValue,
    descricao: item.description, ativo: item.active, acoes_bloqueadas: item.blockedActions ?? [],
  };
  if (pareceUUID(item.id)) linha.id = item.id;

  const { error } = await supabase.from('financeiro_catalogo_diversos').upsert(linha);
  if (error) { console.warn('[Financeiro] salvar catálogo diverso:', explicarErroFinanceiro(error)); return; }
  await addFinancialAuditLog(user, 'PAGAMENTO_DIVERSO_CATALOGO', `Cobrança diversa ${item.name} cadastrada/atualizada.`);
}

// --- ENTRADAS DIVERSAS (parte 5 já ligada ao banco) ---
function miscIncomeDoBanco(m: any): MiscIncome {
  return {
    id: m.id, studentId: m.aluno_id, studentName: m.aluno_nome, enrollment: m.matricula ?? '',
    chargeName: m.nome_cobranca, category: m.categoria, value: Number(m.valor),
    paidValue: m.valor_pago != null ? Number(m.valor_pago) : Number(m.valor),
    paymentMethod: m.forma_pagamento ?? '', cashRegisterId: m.caixa_id ?? undefined,
    paidAt: m.pago_em ?? m.criado_em, receiptNumber: m.recibo_numero ?? '', user: m.usuario ?? '',
    status: m.status, notes: m.observacoes ?? undefined, blockedActions: m.acoes_bloqueadas ?? undefined,
    waivedAt: m.abonado_em ?? undefined, waivedBy: m.abonado_por ?? undefined, waiveReason: m.motivo_abono ?? undefined,
  };
}

export async function getMiscIncomes(): Promise<MiscIncome[]> {
  const { data, error } = await supabase
    .from('financeiro_entradas_diversas').select('*').order('criado_em', { ascending: false });
  if (error) { console.warn('[Financeiro] entradas diversas:', explicarErroFinanceiro(error)); return []; }
  return (data ?? []).map(miscIncomeDoBanco);
}

export async function payMiscIncome(
  studentId: string, studentName: string, enrollment: string, chargeName: string, category: string,
  value: number, paymentMethod: string, user: string, blockedActions?: string[], notes?: string
): Promise<{ income: MiscIncome; receipt: FinancialReceipt }> {
  const openCash = await getOpenCashRegister();
  const receiptNum = 'REC-' + new Date().getFullYear() + Math.floor(100000 + Math.random() * 900000);

  const { data, error } = await supabase.from('financeiro_entradas_diversas').insert({
    aluno_id: studentId, aluno_nome: studentName, matricula: enrollment, nome_cobranca: chargeName,
    categoria: category, valor: value, valor_pago: value, forma_pagamento: paymentMethod,
    caixa_id: openCash?.id ?? null, pago_em: new Date().toISOString(), recibo_numero: receiptNum,
    usuario: user, status: 'PAGO', observacoes: notes ?? null, acoes_bloqueadas: blockedActions ?? [],
  }).select('*').single();
  if (error) throw new Error(explicarErroFinanceiro(error));

  const receipt: FinancialReceipt = {
    receiptNumber: receiptNum, date: new Date().toISOString(), studentId, studentName, enrollment,
    description: `Recebimento Diverso: ${chargeName}`, items: [{ title: chargeName, value }],
    totalValue: value, paymentMethod, cashRegisterId: openCash?.id, cashRegisterSeq: openCash?.seqNumber,
    user, status: 'VALIDO',
  };
  await saveReceipt(receipt);
  await addFinancialAuditLog(user, 'RECEBIMENTO_DIVERSO', `Recebimento diverso de R$ ${value.toFixed(2)} (${chargeName}) do aluno ${studentName}. Recibo #${receiptNum}`);

  return { income: miscIncomeDoBanco(data), receipt };
}

export async function waiveMiscIncome(incomeId: string, waivedBy: string, waiveReason: string): Promise<boolean> {
  const { data, error } = await supabase.from('financeiro_entradas_diversas').update({
    status: 'ABONADO', abonado_em: new Date().toISOString(), abonado_por: waivedBy, motivo_abono: waiveReason,
  }).eq('id', incomeId).select('nome_cobranca, aluno_nome').single();
  if (error || !data) return false;
  await addFinancialAuditLog(waivedBy, 'ABONO_COBRANCA_DIVERSA', `Cobrança diversa ${data.nome_cobranca} abonada para o aluno ${data.aluno_nome}. Motivo: ${waiveReason}`);
  return true;
}

// --- SAÍDAS (parte 6 já ligada ao banco) ---
function expenseDoBanco(e: any): Expense {
  return {
    id: e.id, cashRegisterId: e.caixa_id ?? undefined, resourceOrigin: e.origem_recurso,
    category: e.categoria, description: e.descricao, value: Number(e.valor),
    paymentMethod: e.forma_pagamento, beneficiary: e.beneficiario ?? '', date: e.data,
    user: e.usuario ?? '', notes: e.observacoes ?? undefined, voucher: e.comprovante ?? undefined,
  };
}

export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase.from('financeiro_saidas').select('*').order('data', { ascending: false });
  if (error) { console.warn('[Financeiro] saídas:', explicarErroFinanceiro(error)); return []; }
  return (data ?? []).map(expenseDoBanco);
}

export async function addExpense(expenseData: Omit<Expense, 'id'>, user: string): Promise<Expense> {
  const openCash = await getOpenCashRegister();
  const { data, error } = await supabase.from('financeiro_saidas').insert({
    caixa_id: expenseData.resourceOrigin === 'CAIXA_ABERTO' ? (openCash?.id ?? null) : null,
    origem_recurso: expenseData.resourceOrigin, categoria: expenseData.category,
    descricao: expenseData.description, valor: expenseData.value, forma_pagamento: expenseData.paymentMethod,
    beneficiario: expenseData.beneficiary, data: expenseData.date, usuario: user,
    observacoes: expenseData.notes ?? null, comprovante: expenseData.voucher ?? null,
  }).select('*').single();
  if (error) throw new Error(explicarErroFinanceiro(error));

  await addFinancialAuditLog(user, 'SAIDA_REGISTRADA', `Saída de R$ ${expenseData.value.toFixed(2)} (${expenseData.description}) para ${expenseData.beneficiary}. Origem: ${expenseData.resourceOrigin}`);
  return expenseDoBanco(data);
}

// --- PARCELAS (parte 3 e parte 4 já ligadas ao banco) ---
function installmentDoBanco(p: any): Installment {
  return {
    id: p.id, studentId: p.aluno_id, studentName: p.aluno_nome, enrollment: p.matricula ?? '',
    courseId: p.curso_id ?? undefined, courseName: p.curso_nome ?? undefined,
    classId: p.turma_id ?? undefined, className: p.turma_nome ?? undefined,
    number: p.numero, totalInstallments: p.total_parcelas, competencia: p.competencia ?? '',
    originalValue: Number(p.valor_original), discountValue: Number(p.valor_desconto || 0),
    discountLimitDate: p.data_limite_desconto ?? '', dueDate: p.vencimento,
    interestStartDate: p.data_inicio_juros ?? p.vencimento, finePercent: Number(p.multa_percent),
    dailyInterestPercent: Number(p.juros_diario_percent), status: p.status,
    paidAt: p.pago_em ?? undefined, paidValue: p.valor_pago != null ? Number(p.valor_pago) : undefined,
    paidMethod: p.forma_pagamento ?? undefined, receiptNumber: p.recibo_numero ?? undefined,
    cashRegisterId: p.caixa_id ?? undefined, notes: p.observacoes ?? undefined,
    scholarshipApplied: p.bolsa_aplicada ?? undefined, waivedAt: p.abonado_em ?? undefined,
    waivedBy: p.abonado_por ?? undefined, waiveReason: p.motivo_abono ?? undefined,
  };
}

export async function getInstallments(): Promise<Installment[]> {
  const { data, error } = await supabase
    .from('financeiro_parcelas').select('*').order('vencimento', { ascending: true });
  if (error) { console.warn('[Financeiro] parcelas:', explicarErroFinanceiro(error)); return []; }
  return (data ?? []).map(installmentDoBanco);
}

/** As duas funções abaixo (saveInstallment/saveInstallments) ficaram sem uso
    real depois da conversão — cada gerador grava direto no banco agora. Mantidas
    só para não quebrar um import esquecido em algum lugar; não fazem nada sozinhas. */
export async function saveInstallment(_inst: Installment): Promise<void> {
  console.warn('[Financeiro] saveInstallment não é mais usada — parcelas são geradas direto no banco.');
}
export async function saveInstallments(_list: Installment[]): Promise<void> {
  console.warn('[Financeiro] saveInstallments não é mais usada — parcelas são geradas direto no banco.');
}

/** Geração simples, usada pela Matrícula (EnrollmentManager) — sem curso/turno
    detalhado, sem desconto configurado. Grava tudo de uma vez, num lote só. */
export async function generateStudentInstallments(params: {
  studentId: string; studentName: string; enrollment: string; courseName: string; className?: string;
  monthlyValue: number; totalInstallments: number; firstDueDate: string; user: string; notes?: string;
}): Promise<Installment[]> {
  const linhas: any[] = [];
  const startDate = new Date(params.firstDueDate || Date.now());

  for (let i = 1; i <= params.totalInstallments; i++) {
    const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + (i - 1), startDate.getDate());
    const dueDateStr = dueDate.toISOString().substring(0, 10);
    const discLimit = new Date(dueDate.getFullYear(), dueDate.getMonth(), Math.min(10, dueDate.getDate())).toISOString().substring(0, 10);
    const mm = (dueDate.getMonth() + 1).toString().padStart(2, '0');
    linhas.push({
      aluno_id: params.studentId, aluno_nome: params.studentName, matricula: params.enrollment,
      curso_nome: params.courseName, turma_nome: params.className ?? null,
      numero: i, total_parcelas: params.totalInstallments, tipo: 'MENSALIDADE',
      competencia: `${mm}/${dueDate.getFullYear()}`, valor_original: params.monthlyValue,
      valor_desconto: 0, data_limite_desconto: discLimit, vencimento: dueDateStr,
      data_inicio_juros: dueDateStr, multa_percent: 2, juros_diario_percent: 0.033,
      status: 'PENDENTE', observacoes: params.notes ?? null,
    });
  }

  const { data, error } = await supabase.from('financeiro_parcelas').insert(linhas).select('*');
  if (error) throw new Error(explicarErroFinanceiro(error));

  await addFinancialAuditLog(params.user, 'PARCELAS_GERADAS', `${params.totalInstallments} parcelas geradas para ${params.studentName}`);
  return (data ?? []).map(installmentDoBanco);
}

export function calculateInstallmentAmountDue(inst: Installment, targetDateStr?: string): {
  originalValue: number; discountApplied: number; fineValue: number; interestValue: number;
  finalTotal: number; isDiscountEligible: boolean; isOverdue: boolean; daysOverdue: number;
} {
  const today = targetDateStr || new Date().toISOString().split('T')[0];
  const orig = inst.originalValue;

  let discountApplied = 0, fineValue = 0, interestValue = 0, isDiscountEligible = false, isOverdue = false, daysOverdue = 0;

  if (today <= inst.discountLimitDate && inst.discountValue > 0) {
    isDiscountEligible = true;
    discountApplied = inst.discountValue;
  } else if (today > inst.dueDate) {
    isOverdue = true;
    fineValue = (orig * (inst.finePercent || 2)) / 100;
    const dueTime = new Date(inst.interestStartDate || inst.dueDate).getTime();
    const currTime = new Date(today).getTime();
    const diffDays = Math.max(0, Math.ceil((currTime - dueTime) / (1000 * 60 * 60 * 24)));
    daysOverdue = diffDays;
    interestValue = (orig * (inst.dailyInterestPercent || 0.033) / 100) * diffDays;
  }

  const finalTotal = Math.max(0, orig - discountApplied + fineValue + interestValue);
  return { originalValue: orig, discountApplied, fineValue, interestValue, finalTotal, isDiscountEligible, isOverdue, daysOverdue };
}

/** DAR BAIXA numa parcela — o coração da Parte 4. */
export async function payInstallment(
  installmentId: string, paymentMethod: string, user: string, overrideValue?: number, notes?: string
): Promise<{ installment: Installment; receipt: FinancialReceipt } | null> {
  const { data: linha, error: erroLer } = await supabase
    .from('financeiro_parcelas').select('*').eq('id', installmentId).single();
  if (erroLer || !linha) return null;

  const inst = installmentDoBanco(linha);
  const calc = calculateInstallmentAmountDue(inst);
  const openCash = await getOpenCashRegister();
  const finalPaid = overrideValue !== undefined ? Number(overrideValue) : calc.finalTotal;
  const receiptNum = 'REC-' + new Date().getFullYear() + Math.floor(100000 + Math.random() * 900000);

  const { data: atualizada, error: erroUpdate } = await supabase.from('financeiro_parcelas').update({
    status: 'PAGA', pago_em: new Date().toISOString(), valor_pago: finalPaid, forma_pagamento: paymentMethod,
    recibo_numero: receiptNum, caixa_id: openCash?.id ?? null,
    observacoes: notes ? `${inst.notes || ''} ${notes}`.trim() : inst.notes,
  }).eq('id', installmentId).select('*').single();
  if (erroUpdate) throw new Error(explicarErroFinanceiro(erroUpdate));

  const receipt: FinancialReceipt = {
    receiptNumber: receiptNum, date: new Date().toISOString(), studentId: inst.studentId,
    studentName: inst.studentName, enrollment: inst.enrollment, courseName: inst.courseName,
    description: `Quitação de Mensalidade - Parcela ${inst.number}/${inst.totalInstallments} (${inst.competencia})`,
    items: [
      { title: `Mensalidade ${inst.number}/${inst.totalInstallments} - Comp. ${inst.competencia}`, value: inst.originalValue },
      ...(calc.discountApplied > 0 ? [{ title: 'Desconto Pontualidade/Bolsa', value: -calc.discountApplied }] : []),
      ...(calc.fineValue > 0 ? [{ title: 'Multa por Atraso', value: calc.fineValue }] : []),
      ...(calc.interestValue > 0 ? [{ title: 'Juros de Mora', value: calc.interestValue }] : []),
    ],
    totalValue: finalPaid, paymentMethod, cashRegisterId: openCash?.id, cashRegisterSeq: openCash?.seqNumber,
    user, status: 'VALIDO',
  };
  await saveReceipt(receipt);
  await addFinancialAuditLog(user, 'QUITACAO_PARCELA', `Parcela ${inst.number}/${inst.totalInstallments} do aluno ${inst.studentName} quitada por R$ ${finalPaid.toFixed(2)} (${paymentMethod}). Recibo #${receiptNum}`);

  return { installment: installmentDoBanco(atualizada), receipt };
}

export async function updateInstallmentDueDate(
  installmentId: string, newDueDate: string, newDiscountValue: number, newDiscountLimitDate: string,
  newInterestStartDate: string, user: string, reason: string
): Promise<boolean> {
  const { data: linha, error: erroLer } = await supabase
    .from('financeiro_parcelas').select('*').eq('id', installmentId).single();
  if (erroLer || !linha) return false;

  const { error } = await supabase.from('financeiro_parcelas').update({
    vencimento: newDueDate, valor_desconto: newDiscountValue, data_limite_desconto: newDiscountLimitDate,
    data_inicio_juros: newInterestStartDate,
    observacoes: `${linha.observacoes || ''} | Vencimento alterado em ${new Date().toLocaleDateString('pt-BR')} por ${user}: ${reason}`.trim(),
  }).eq('id', installmentId);
  if (error) return false;

  await addFinancialAuditLog(user, 'ALTERACAO_VENCIMENTO', `Vencimento da Parcela ${linha.numero}/${linha.total_parcelas} de ${linha.aluno_nome} alterado para ${newDueDate}. Motivo: ${reason}`);
  return true;
}

export async function waiveInstallment(installmentId: string, user: string, reason: string): Promise<boolean> {
  const { data: linha, error } = await supabase.from('financeiro_parcelas').update({
    status: 'ABONADA', abonado_em: new Date().toISOString(), abonado_por: user, motivo_abono: reason,
  }).eq('id', installmentId).select('*').single();
  if (error || !linha) return false;

  await addFinancialAuditLog(user, 'ABONO_PARCELA', `Parcela ${linha.numero}/${linha.total_parcelas} (${linha.competencia}) de ${linha.aluno_nome} abonada. Motivo: ${reason}`);
  return true;
}

/** Geração completa, usada pela tela Gerar Parcelas — com curso, desconto e
    multa/juros configuráveis. */
export async function generateIndividualInstallments(params: {
  studentId: string; studentName: string; enrollment: string; courseId: string; courseName: string;
  monthlyValue: number; totalInstallments: number; firstDueDate: string; enrollmentValue?: number;
  reenrollmentValue?: number; dependencyValue?: number; discountValue: number; discountLimitDay: number;
  interestStartDayOffset?: number; finePercent: number; dailyInterestPercent: number; notes?: string; user: string;
}): Promise<Installment[]> {
  const linhas: any[] = [];
  const startDt = new Date(params.firstDueDate + 'T12:00:00');

  for (let i = 1; i <= params.totalInstallments; i++) {
    const curDate = new Date(startDt);
    curDate.setMonth(startDt.getMonth() + (i - 1));
    const y = curDate.getFullYear();
    const m = (curDate.getMonth() + 1).toString().padStart(2, '0');
    const dueStr = curDate.toISOString().split('T')[0];

    const discLimitDt = new Date(curDate);
    discLimitDt.setDate(Math.min(params.discountLimitDay || 10, 28));
    const discLimitStr = discLimitDt.toISOString().split('T')[0];

    const interestStartDt = new Date(curDate);
    interestStartDt.setDate(interestStartDt.getDate() + 1);

    linhas.push({
      aluno_id: params.studentId, aluno_nome: params.studentName, matricula: params.enrollment,
      curso_id: params.courseId, curso_nome: params.courseName, tipo: 'MENSALIDADE',
      numero: i, total_parcelas: params.totalInstallments, competencia: `${m}/${y}`,
      valor_original: params.monthlyValue, valor_desconto: params.discountValue,
      data_limite_desconto: discLimitStr, vencimento: dueStr,
      data_inicio_juros: interestStartDt.toISOString().split('T')[0],
      multa_percent: params.finePercent, juros_diario_percent: params.dailyInterestPercent,
      status: 'PENDENTE', observacoes: params.notes ?? null,
    });
  }

  const { data, error } = await supabase.from('financeiro_parcelas').insert(linhas).select('*');
  if (error) throw new Error(explicarErroFinanceiro(error));

  await addFinancialAuditLog(params.user, 'GERACAO_PARCELAS_INDIVIDUAL', `${params.totalInstallments} parcelas de R$ ${params.monthlyValue.toFixed(2)} geradas para o aluno ${params.studentName}`);
  return (data ?? []).map(installmentDoBanco);
}

/** Geração em lote, para a turma toda de uma vez — um único insert no banco,
    não um por aluno, para não fazer dezenas de viagens ao servidor. */
export async function generateBatchClassInstallments(params: {
  students: { id: string; name: string; enrollment: string }[]; courseId: string; courseName: string;
  className: string; monthlyValue: number; totalInstallments: number; firstDueDate: string;
  discountValue: number; discountLimitDay: number; finePercent: number; dailyInterestPercent: number; user: string;
}): Promise<number> {
  const todasAsLinhas: any[] = [];
  const startDt = new Date(params.firstDueDate + 'T12:00:00');

  for (const st of params.students) {
    for (let i = 1; i <= params.totalInstallments; i++) {
      const curDate = new Date(startDt);
      curDate.setMonth(startDt.getMonth() + (i - 1));
      const y = curDate.getFullYear();
      const m = (curDate.getMonth() + 1).toString().padStart(2, '0');
      const dueStr = curDate.toISOString().split('T')[0];

      const discLimitDt = new Date(curDate);
      discLimitDt.setDate(Math.min(params.discountLimitDay || 10, 28));

      const interestStartDt = new Date(curDate);
      interestStartDt.setDate(interestStartDt.getDate() + 1);

      todasAsLinhas.push({
        aluno_id: st.id, aluno_nome: st.name, matricula: st.enrollment,
        curso_id: params.courseId, curso_nome: params.courseName, turma_nome: params.className,
        tipo: 'MENSALIDADE', numero: i, total_parcelas: params.totalInstallments, competencia: `${m}/${y}`,
        valor_original: params.monthlyValue, valor_desconto: params.discountValue,
        data_limite_desconto: discLimitDt.toISOString().split('T')[0], vencimento: dueStr,
        data_inicio_juros: interestStartDt.toISOString().split('T')[0],
        multa_percent: params.finePercent, juros_diario_percent: params.dailyInterestPercent,
        status: 'PENDENTE', observacoes: `Geração em Lote - Turma ${params.className}`,
      });
    }
  }

  const { error } = await supabase.from('financeiro_parcelas').insert(todasAsLinhas);
  if (error) throw new Error(explicarErroFinanceiro(error));

  await addFinancialAuditLog(params.user, 'GERACAO_PARCELAS_LOTE', `Geração em lote concluída para ${params.students.length} alunos da turma ${params.className}`);
  return params.students.length;
}

// --- RECIBOS E CANCELAMENTOS (parte 4 já ligada ao banco) ---
function receiptDoBanco(r: any): FinancialReceipt {
  return {
    receiptNumber: r.numero_recibo, date: r.data, studentId: r.aluno_id ?? '',
    studentName: r.aluno_nome ?? '', enrollment: r.matricula ?? '', cpf: r.cpf ?? undefined,
    courseName: r.curso_nome ?? undefined, description: r.descricao ?? '', items: r.itens ?? [],
    totalValue: Number(r.valor_total), paymentMethod: r.forma_pagamento ?? '',
    cashRegisterId: r.caixa_id ?? undefined, cashRegisterSeq: r.caixa_seq ?? undefined,
    user: r.usuario ?? '', status: r.status, cancelledAt: r.cancelado_em ?? undefined,
    cancelledBy: r.cancelado_por ?? undefined, cancelReason: r.motivo_cancelamento ?? undefined,
  };
}

export async function getReceipts(): Promise<FinancialReceipt[]> {
  const { data, error } = await supabase.from('financeiro_recibos').select('*').order('data', { ascending: false });
  if (error) { console.warn('[Financeiro] recibos:', explicarErroFinanceiro(error)); return []; }
  return (data ?? []).map(receiptDoBanco);
}

export async function saveReceipt(receipt: FinancialReceipt): Promise<void> {
  const { error } = await supabase.from('financeiro_recibos').upsert({
    numero_recibo: receipt.receiptNumber, data: receipt.date, aluno_id: receipt.studentId || null,
    aluno_nome: receipt.studentName || null, matricula: receipt.enrollment || null, cpf: receipt.cpf ?? null,
    curso_nome: receipt.courseName ?? null, descricao: receipt.description, itens: receipt.items,
    valor_total: receipt.totalValue, forma_pagamento: receipt.paymentMethod,
    caixa_id: receipt.cashRegisterId ?? null, caixa_seq: receipt.cashRegisterSeq ?? null,
    usuario: receipt.user, status: receipt.status,
  });
  if (error) console.warn('[Financeiro] salvar recibo:', explicarErroFinanceiro(error));
}

export async function cancelReceipt(receiptNumber: string, user: string, reason: string): Promise<boolean> {
  const { data: rc, error: erroLer } = await supabase
    .from('financeiro_recibos').select('*').eq('numero_recibo', receiptNumber).single();
  if (erroLer || !rc) return false;

  const { error } = await supabase.from('financeiro_recibos').update({
    status: 'CANCELADO', cancelado_em: new Date().toISOString(), cancelado_por: user, motivo_cancelamento: reason,
  }).eq('numero_recibo', receiptNumber);
  if (error) return false;

  // Reabre a parcela ligada a este recibo, se houver.
  await supabase.from('financeiro_parcelas').update({
    status: 'PENDENTE', pago_em: null, valor_pago: null, forma_pagamento: null,
    recibo_numero: null, caixa_id: null,
    observacoes: `Recibo #${receiptNumber} cancelado em ${new Date().toLocaleDateString('pt-BR')} por ${user}: ${reason}`,
  }).eq('recibo_numero', receiptNumber);

  // Marca a entrada diversa ligada a este recibo como cancelada, se houver.
  await supabase.from('financeiro_entradas_diversas').update({
    status: 'CANCELADO',
    observacoes: `Cancelado por ${user}: ${reason}`,
  }).eq('recibo_numero', receiptNumber);

  await addFinancialAuditLog(user, 'CANCELAMENTO_RECIBO', `Recibo #${receiptNumber} cancelado. Recebimento estornado e lançamento reaberto. Motivo: ${reason}`);
  return true;
}

export async function updateReceiptPaymentMethod(
  receiptNumber: string, newMethod: string, user: string, isAdmin: boolean
): Promise<{ success: boolean; message: string }> {
  const { data: rc, error: erroLer } = await supabase
    .from('financeiro_recibos').select('*').eq('numero_recibo', receiptNumber).single();
  if (erroLer || !rc) return { success: false, message: 'Recibo não encontrado.' };

  if (rc.caixa_id) {
    const { data: caixa } = await supabase.from('financeiro_caixas').select('status').eq('id', rc.caixa_id).single();
    if (caixa?.status === 'CLOSED' && !isAdmin) {
      return { success: false, message: 'O caixa deste recebimento está FECHADO. Apenas o Administrador pode alterar a forma de pagamento.' };
    }
  }

  const oldMethod = rc.forma_pagamento;
  const { error } = await supabase.from('financeiro_recibos').update({ forma_pagamento: newMethod }).eq('numero_recibo', receiptNumber);
  if (error) return { success: false, message: explicarErroFinanceiro(error) };

  await supabase.from('financeiro_parcelas').update({ forma_pagamento: newMethod }).eq('recibo_numero', receiptNumber);
  await supabase.from('financeiro_entradas_diversas').update({ forma_pagamento: newMethod }).eq('recibo_numero', receiptNumber);

  await addFinancialAuditLog(user, 'ALTERACAO_FORMA_PAGAMENTO', `Forma de pagamento do recibo #${receiptNumber} alterada de ${oldMethod} para ${newMethod}.`);
  return { success: true, message: `Forma de pagamento alterada com sucesso de ${oldMethod} para ${newMethod}.` };
}

// --- FINANCIAL NOTES (HISTÓRICO FINANCEIRO DO ALUNO) ---
export function getFinancialNotes(): FinancialNote[] {
  const seedNotes: FinancialNote[] = [
    {
      id: 'fnote_001',
      studentId: '1',
      studentName: 'Maria Silva de Oliveira',
      enrollment: 'ALU202601',
      category: 'BOLSA',
      description: 'Concessão de Bolsa Mérito Acadêmico de 20% autorizada pela Direção.',
      date: new Date().toISOString(),
      user: 'Direção Financeira',
      semester: '2026/1'
    }
  ];
  return getItemJSON<FinancialNote[]>(STORAGE_KEYS.FINANCIAL_NOTES, []);
}

export function addFinancialNote(
  studentId: string,
  studentName: string,
  enrollment: string,
  category: FinancialNote['category'],
  description: string,
  user: string,
  semester?: string,
  period?: string
): FinancialNote {
  const newNote: FinancialNote = {
    id: 'fnote_' + Date.now(),
    studentId,
    studentName,
    enrollment,
    category,
    description: description.trim(),
    date: new Date().toISOString(),
    user,
    semester,
    period
  };

  const notes = getFinancialNotes();
  notes.unshift(newNote);
  setItemJSON(STORAGE_KEYS.FINANCIAL_NOTES, notes);

  addFinancialAuditLog(user, 'OBSERVACAO_FINANCEIRA_CRIADA', `Observação (${category}) registrada para o aluno ${studentName}`);
  return newNote;
}

// --- ACTION ENFORCEMENT (CONDICIONAR FUNCIONALIDADE AO PAGAMENTO) ---
// --- ACTION ENFORCEMENT (CONDICIONAR FUNCIONALIDADE AO PAGAMENTO) ---
export async function checkActionBlockedByFinance(
  studentId: string, actionType: string
): Promise<{ blocked: boolean; pendingCharges: string[] }> {
  const todasEntradas = await getMiscIncomes();
  const naoPagas = todasEntradas.filter(m => m.studentId === studentId && m.status !== 'PAGO' && m.status !== 'ABONADO');
  const bloqueando = naoPagas.filter(m => m.blockedActions && m.blockedActions.includes(actionType));

  if (bloqueando.length > 0) {
    return { blocked: true, pendingCharges: bloqueando.map(i => i.chargeName) };
  }
  return { blocked: false, pendingCharges: [] };
}

// --- INCOME TAX DECLARATION (IRPF) ---
export async function generateIRPFStatementData(studentId: string, year: number): Promise<{
  institutionName: string; cnpj: string; address: string; studentName: string; studentEnrollment: string;
  studentCpf: string; courseName: string; baseYear: number;
  items: { date: string; description: string; receiptNumber: string; paymentMethod: string; value: number }[];
  totalPaid: number; issueDate: string; validationCode: string;
}> {
  const todos = await getReceipts();
  const receipts = todos.filter(r => r.studentId === studentId && r.status === 'VALIDO' && new Date(r.date).getFullYear() === year);

  const items = receipts.map(r => ({
    date: new Date(r.date).toLocaleDateString('pt-BR'), description: r.description,
    receiptNumber: r.receiptNumber, paymentMethod: r.paymentMethod, value: r.totalValue,
  }));
  const totalPaid = items.reduce((sum, i) => sum + i.value, 0);
  const student = receipts[0];

  return {
    institutionName: 'COLÉGIO OSWALDO CRUZ DE BRASÍLIA', cnpj: '01.234.567/0001-89',
    address: 'SGAN 608 Módulo B/C - Asa Norte, Brasília - DF',
    studentName: student?.studentName || 'Aluno Selecionado', studentEnrollment: student?.enrollment || 'ALU-2026',
    studentCpf: student?.cpf || '000.000.000-00', courseName: student?.courseName || 'Curso Técnico',
    baseYear: year, items, totalPaid, issueDate: new Date().toLocaleDateString('pt-BR'),
    validationCode: 'IRPF-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
  };
}

export async function getStudentPaidYearTotal(
  studentIdOrEnrollment: string, year: number
): Promise<{ receipts: any[]; totalValue: number }> {
  const todos = await getReceipts();
  const receipts = todos.filter(r =>
    (r.studentId === studentIdOrEnrollment || r.enrollment === studentIdOrEnrollment) &&
    r.status === 'VALIDO' && new Date(r.date).getFullYear() === year
  );
  const totalValue = receipts.reduce((sum, r) => sum + (r.totalValue || 0), 0);
  return { receipts, totalValue };
}

export function getExemptions(): ExemptionItem[] {
  return getItemJSON<ExemptionItem[]>('gestao_fin_exemptions_v1', []);
}

export async function applyExemption(
  installmentId: string, type: 'TOTAL' | 'PARTIAL', waivedValue: number,
  reason: string, authorizer: string, user: string
): Promise<boolean> {
  // getInstallments (Parte 3) já fala com o banco — esta função dependia
  // dela por dentro (lia e regravava a lista inteira), por isso também
  // precisou virar assíncrona, mesmo sendo parte do Abono (peça futura).
  const { data: linha, error: erroLer } = await supabase
    .from('financeiro_parcelas').select('*').eq('id', installmentId).single();
  if (erroLer || !linha) return false;

  const inst = installmentDoBanco(linha);
  const actualWaived = type === 'TOTAL' ? inst.originalValue : Math.min(waivedValue, inst.originalValue);

  const atualizacao: any = type === 'TOTAL'
    ? { status: 'ABONADA', abonado_em: new Date().toISOString(), abonado_por: user, motivo_abono: `${reason} (Autorizado por: ${authorizer})` }
    : (() => {
        const newOrig = Math.max(0, inst.originalValue - actualWaived);
        return {
          valor_original: newOrig,
          status: newOrig === 0 ? 'ABONADA' : inst.status,
          observacoes: `${inst.notes || ''} | Abono parcial de R$ ${actualWaived.toFixed(2)} por ${user}: ${reason} (${authorizer})`.trim(),
        };
      })();

  const { error } = await supabase.from('financeiro_parcelas').update(atualizacao).eq('id', installmentId);
  if (error) return false;

  const newExemption: ExemptionItem = {
    id: 'ex_' + Date.now(), installmentId, studentId: inst.studentId, studentName: inst.studentName,
    enrollment: inst.enrollment, competencia: inst.competencia, type,
    originalValue: inst.originalValue, waivedValue: actualWaived, reason, authorizer,
    date: new Date().toISOString(), user,
  };
  const exemptions = getExemptions();
  exemptions.unshift(newExemption);
  setItemJSON('gestao_fin_exemptions_v1', exemptions);

  await addFinancialAuditLog(user, 'CONCESSAO_ABONO', `Abono (${type}) de R$ ${actualWaived.toFixed(2)} concedido na parcela ${inst.number}/${inst.totalInstallments} (${inst.competencia}) do aluno ${inst.studentName}. Autorizado por: ${authorizer}`);
  return true;
}

// --- MODELOS DE RELATÓRIOS (PDF / TEMPLATES) ---

export const defaultReportTemplates: ReportTemplate[] = [
  {
    id: 'tpl_caixa_padrão',
    name: 'Modelo Padrão - Fechamento de Caixa Diário',
    category: 'CAIXA_DIARIO',
    fileName: 'Modelo_Fechamento_Caixa_COC.pdf',
    fileType: 'application/pdf',
    fileSize: 145200,
    fileData: 'data:application/pdf;base64,JVBERi0xLjQKJSDl4...[Modelo Padrão Sistema]',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Sistema',
    isActive: true,
    description: 'Cabeçalho Colégio Oswaldo Cruz, tabela de entradas e saídas por forma de pagamento e campos de assinatura de operador e gerência.'
  },
  {
    id: 'tpl_mensal_padrao',
    name: 'Modelo Padrão - Relatório Financeiro Mensal',
    category: 'MENSAL',
    fileName: 'Modelo_Relatorio_Mensal_COC.pdf',
    fileType: 'application/pdf',
    fileSize: 210400,
    fileData: 'data:application/pdf;base64,JVBERi0xLjQKJSDl4...[Modelo Mensal Sistema]',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Sistema',
    isActive: true,
    description: 'Resumo mensal de mensalidades recebidas, despesas por categoria, inadimplência e gráficos comparativos.'
  },
  {
    id: 'tpl_anual_dre',
    name: 'Modelo Padrão - Relatório Anual & DRE',
    category: 'ANUAL',
    fileName: 'Modelo_DRE_Anual_COC.pdf',
    fileType: 'application/pdf',
    fileSize: 320000,
    fileData: 'data:application/pdf;base64,JVBERi0xLjQKJSDl4...[Modelo DRE Anual Sistema]',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Sistema',
    isActive: true,
    description: 'Demonstrativo de Resultado do Exercício (DRE), faturamento bruto anual, custos e resultado operacional.'
  }
];

export function getReportTemplates(): ReportTemplate[] {
  const templates = getItemJSON<ReportTemplate[]>(STORAGE_KEYS.REPORT_TEMPLATES, []);
  if (templates.length === 0) {
    setItemJSON(STORAGE_KEYS.REPORT_TEMPLATES, defaultReportTemplates);
    return defaultReportTemplates;
  }
  return templates;
}

export function saveReportTemplate(
  templateData: Omit<ReportTemplate, 'id' | 'uploadedAt'>
): ReportTemplate {
  const templates = getReportTemplates();
  
  // If set to active, deactivate other templates in same category
  if (templateData.isActive) {
    templates.forEach(t => {
      if (t.category === templateData.category) {
        t.isActive = false;
      }
    });
  }

  const newTemplate: ReportTemplate = {
    ...templateData,
    id: 'tpl_' + Date.now(),
    uploadedAt: new Date().toISOString()
  };

  templates.unshift(newTemplate);
  setItemJSON(STORAGE_KEYS.REPORT_TEMPLATES, templates);

  addFinancialAuditLog(
    templateData.uploadedBy || 'Administrador',
    'IMPORTACAO_MODELO_RELATORIO',
    `Novo modelo de relatório PDF importado: ${templateData.name} (${templateData.category}) - ${templateData.fileName}`
  );

  return newTemplate;
}

export function deleteReportTemplate(id: string, user: string = 'Administrador'): void {
  let templates = getReportTemplates();
  const target = templates.find(t => t.id === id);
  if (!target) return;

  templates = templates.filter(t => t.id !== id);
  
  // If deleted was active and others exist in category, activate the first remaining
  if (target.isActive) {
    const remainingCategory = templates.find(t => t.category === target.category);
    if (remainingCategory) {
      remainingCategory.isActive = true;
    }
  }

  setItemJSON(STORAGE_KEYS.REPORT_TEMPLATES, templates);

  addFinancialAuditLog(
    user,
    'EXCLUSAO_MODELO_RELATORIO',
    `Modelo de relatório excluído: ${target.name} (${target.fileName})`
  );
}

export function setActiveReportTemplate(id: string, category: string, user: string = 'Administrador'): void {
  const templates = getReportTemplates();
  templates.forEach(t => {
    if (t.category === category) {
      t.isActive = t.id === id;
    }
  });
  setItemJSON(STORAGE_KEYS.REPORT_TEMPLATES, templates);

  const active = templates.find(t => t.id === id);
  if (active) {
    addFinancialAuditLog(
      user,
      'ATIVACAO_MODELO_RELATORIO',
      `Modelo de relatório marcado como ativo para ${category}: ${active.name}`
    );
  }
}


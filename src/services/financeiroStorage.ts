/**
 * Storage & Logic Service for Módulo Financeiro
 */

import { safeLocalStorage } from '../lib/safeStorage';
import { 
  CashRegister, PaymentMethodItem, Installment, MiscPaymentCatalog,
  MiscIncome, Expense, Scholarship, CoursePriceConfig,
  FinancialNote, FinancialReceipt, FinancialAuditLog, ExemptionItem, ReportTemplate
} from '../types/financeiro';

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

// --- AUDIT LOGS ---
export function getFinancialAuditLogs(): FinancialAuditLog[] {
  return getItemJSON<FinancialAuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
}

export function addFinancialAuditLog(user: string, action: string, details: string): void {
  const logs = getFinancialAuditLogs();
  const newLog: FinancialAuditLog = {
    id: 'flog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    date: new Date().toISOString(),
    user,
    action,
    details,
    module: 'Financeiro'
  };
  logs.unshift(newLog);
  setItemJSON(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 500)); // limit to 500
}

// --- CASH REGISTERS ---
export function getCashRegisters(): CashRegister[] {
  const seedRegisters: CashRegister[] = [
    {
      id: 'cx_001',
      seqNumber: 1,
      openedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      closedAt: new Date(Date.now() - 86400000).toISOString(),
      responsibleUser: 'Tesouraria Principal',
      initialBalance: 200.00,
      finalBalance: 1650.00,
      status: 'CLOSED',
      notes: 'Fechamento do dia anterior sem inconsistências.',
      calculatedIncomes: 1850.00,
      calculatedExpenses: 400.00
    },
    {
      id: 'cx_002',
      seqNumber: 2,
      openedAt: new Date().toISOString(),
      responsibleUser: 'Administração Financeira',
      initialBalance: 300.00,
      status: 'OPEN',
      notes: 'Caixa do dia atual aberto normalmente.'
    }
  ];
  return getItemJSON<CashRegister[]>(STORAGE_KEYS.CASH_REGISTERS, seedRegisters);
}

export function getOpenCashRegister(): CashRegister | null {
  const registers = getCashRegisters();
  return registers.find(r => r.status === 'OPEN') || null;
}

export function openCashRegister(user: string, initialBalance: number, notes?: string): CashRegister {
  const registers = getCashRegisters();
  const maxSeq = registers.reduce((acc, r) => Math.max(acc, r.seqNumber || 0), 0);
  
  const newReg: CashRegister = {
    id: 'cx_' + Date.now(),
    seqNumber: maxSeq + 1,
    openedAt: new Date().toISOString(),
    responsibleUser: user,
    initialBalance: Number(initialBalance),
    status: 'OPEN',
    notes: notes?.trim()
  };

  registers.push(newReg);
  setItemJSON(STORAGE_KEYS.CASH_REGISTERS, registers);
  addFinancialAuditLog(user, 'ABERTURA_CAIXA', `Caixa #${newReg.seqNumber} aberto com saldo inicial de R$ ${initialBalance.toFixed(2)}`);
  return newReg;
}

export function closeCashRegister(registerId: string, user: string, finalNotes?: string): CashRegister | null {
  const registers = getCashRegisters();
  const idx = registers.findIndex(r => r.id === registerId);
  if (idx === -1) return null;

  const reg = registers[idx];
  
  // Calculate incomes and expenses linked to this cash register
  const receipts = getReceipts().filter(rc => rc.cashRegisterId === registerId && rc.status === 'VALIDO');
  const expenses = getExpenses().filter(ex => ex.cashRegisterId === registerId);

  const totalIncomes = receipts.reduce((sum, r) => sum + r.totalValue, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
  const finalBalance = reg.initialBalance + totalIncomes - totalExpenses;

  registers[idx] = {
    ...reg,
    status: 'CLOSED',
    closedAt: new Date().toISOString(),
    finalBalance,
    calculatedIncomes: totalIncomes,
    calculatedExpenses: totalExpenses,
    notes: finalNotes ? `${reg.notes || ''} | Fechamento: ${finalNotes}` : reg.notes
  };

  setItemJSON(STORAGE_KEYS.CASH_REGISTERS, registers);
  addFinancialAuditLog(user, 'FECHAMENTO_CAIXA', `Caixa #${reg.seqNumber} fechado. Entradas: R$ ${totalIncomes.toFixed(2)}, Saídas: R$ ${totalExpenses.toFixed(2)}, Saldo Final: R$ ${finalBalance.toFixed(2)}`);
  return registers[idx];
}

export function reopenCashRegister(registerId: string, user: string): boolean {
  const registers = getCashRegisters();
  const idx = registers.findIndex(r => r.id === registerId);
  if (idx === -1) return false;

  registers[idx].status = 'OPEN';
  delete registers[idx].closedAt;

  setItemJSON(STORAGE_KEYS.CASH_REGISTERS, registers);
  addFinancialAuditLog(user, 'REABERTURA_CAIXA', `Caixa #${registers[idx].seqNumber} reaberto pelo Administrador.`);
  return true;
}

// --- PAYMENT METHODS ---
export function getPaymentMethods(): PaymentMethodItem[] {
  return getItemJSON<PaymentMethodItem[]>(STORAGE_KEYS.PAYMENT_METHODS, defaultPaymentMethods);
}

export function savePaymentMethod(method: PaymentMethodItem, user: string): void {
  const list = getPaymentMethods();
  const idx = list.findIndex(m => m.id === method.id);
  if (idx >= 0) {
    list[idx] = method;
  } else {
    list.push(method);
  }
  setItemJSON(STORAGE_KEYS.PAYMENT_METHODS, list);
  addFinancialAuditLog(user, 'FORMA_PAGAMENTO_SALVA', `Forma de pagamento ${method.name} configurada.`);
}

export function addCustomPaymentMethod(name: string, user: string): PaymentMethodItem {
  const list = getPaymentMethods();
  const newItem: PaymentMethodItem = {
    id: 'pm_' + Date.now(),
    name: name.trim(),
    isSystemDefault: false,
    active: true
  };
  list.push(newItem);
  setItemJSON(STORAGE_KEYS.PAYMENT_METHODS, list);
  addFinancialAuditLog(user, 'FORMA_PAGAMENTO_CRIADA', `Nova forma de pagamento criada: ${name.trim()}`);
  return newItem;
}

// --- COURSE PRICE CONFIGS ---
export function getCoursePriceConfigs(): CoursePriceConfig[] {
  return getItemJSON<CoursePriceConfig[]>(STORAGE_KEYS.COURSE_PRICES, initialCoursePriceConfigs);
}

export function saveCoursePriceConfig(config: CoursePriceConfig, user: string): void {
  const configs = getCoursePriceConfigs();
  const idx = configs.findIndex(c => c.courseId === config.courseId);
  if (idx >= 0) {
    configs[idx] = config;
  } else {
    configs.push(config);
  }
  setItemJSON(STORAGE_KEYS.COURSE_PRICES, configs);
  addFinancialAuditLog(user, 'VALOR_CURSO_ATUALIZADO', `Valores do curso ${config.courseName} salvos.`);
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
  return getItemJSON<Scholarship[]>(STORAGE_KEYS.SCHOLARSHIPS, seedScholarships);
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

// --- MISC PAYMENT CATALOG & INCOMES ---
export function getMiscPaymentCatalog(): MiscPaymentCatalog[] {
  return getItemJSON<MiscPaymentCatalog[]>(STORAGE_KEYS.MISC_CATALOG, initialMiscCatalog);
}

export function saveMiscPaymentCatalog(item: MiscPaymentCatalog, user: string): void {
  const catalog = getMiscPaymentCatalog();
  const idx = catalog.findIndex(c => c.id === item.id);
  if (idx >= 0) {
    catalog[idx] = item;
  } else {
    catalog.push(item);
  }
  setItemJSON(STORAGE_KEYS.MISC_CATALOG, catalog);
  addFinancialAuditLog(user, 'PAGAMENTO_DIVERSO_CATALOGO', `Cobrança diversa ${item.name} cadastrada/atualizada.`);
}

export function getMiscIncomes(): MiscIncome[] {
  const seedIncomes: MiscIncome[] = [
    {
      id: 'minc_001',
      studentId: '1',
      studentName: 'Maria Silva de Oliveira',
      enrollment: 'ALU202601',
      chargeName: 'Apostila / Material Didático',
      category: 'Material',
      value: 120.00,
      paidValue: 120.00,
      paymentMethod: 'PIX',
      cashRegisterId: 'cx_001',
      paidAt: new Date(Date.now() - 86400000).toISOString(),
      receiptNumber: 'REC-20260210-001',
      user: 'Tesouraria',
      status: 'PAGO'
    }
  ];
  return getItemJSON<MiscIncome[]>(STORAGE_KEYS.MISC_INCOMES, seedIncomes);
}

export function payMiscIncome(
  studentId: string,
  studentName: string,
  enrollment: string,
  chargeName: string,
  category: string,
  value: number,
  paymentMethod: string,
  user: string,
  blockedActions?: string[],
  notes?: string
): { income: MiscIncome; receipt: FinancialReceipt } {
  const openCash = getOpenCashRegister();
  const receiptNum = 'REC-' + new Date().getFullYear() + Math.floor(100000 + Math.random() * 900000);

  const newIncome: MiscIncome = {
    id: 'minc_' + Date.now(),
    studentId,
    studentName,
    enrollment,
    chargeName,
    category,
    value,
    paidValue: value,
    paymentMethod,
    cashRegisterId: openCash?.id,
    paidAt: new Date().toISOString(),
    receiptNumber: receiptNum,
    user,
    status: 'PAGO',
    blockedActions,
    notes
  };

  const incomes = getMiscIncomes();
  incomes.unshift(newIncome);
  setItemJSON(STORAGE_KEYS.MISC_INCOMES, incomes);

  // Generate Receipt
  const receipt: FinancialReceipt = {
    receiptNumber: receiptNum,
    date: new Date().toISOString(),
    studentId,
    studentName,
    enrollment,
    description: `Recebimento Diverso: ${chargeName}`,
    items: [{ title: chargeName, value }],
    totalValue: value,
    paymentMethod,
    cashRegisterId: openCash?.id,
    cashRegisterSeq: openCash?.seqNumber,
    user,
    status: 'VALIDO'
  };

  saveReceipt(receipt);
  addFinancialAuditLog(user, 'RECEBIMENTO_DIVERSO', `Recebimento diverso de R$ ${value.toFixed(2)} (${chargeName}) do aluno ${studentName}. Recibo #${receiptNum}`);

  return { income: newIncome, receipt };
}

export function waiveMiscIncome(
  incomeId: string,
  waivedBy: string,
  waiveReason: string
): boolean {
  const incomes = getMiscIncomes();
  const idx = incomes.findIndex(i => i.id === incomeId);
  if (idx === -1) return false;

  incomes[idx] = {
    ...incomes[idx],
    status: 'ABONADO',
    waivedAt: new Date().toISOString(),
    waivedBy,
    waiveReason
  };

  setItemJSON(STORAGE_KEYS.MISC_INCOMES, incomes);
  addFinancialAuditLog(waivedBy, 'ABONO_COBRANCA_DIVERSA', `Cobrança diversa ${incomes[idx].chargeName} abonada para o aluno ${incomes[idx].studentName}. Motivo: ${waiveReason}`);
  return true;
}

// --- EXPENSES (SAÍDAS) ---
export function getExpenses(): Expense[] {
  const seedExpenses: Expense[] = [
    {
      id: 'exp_001',
      cashRegisterId: 'cx_001',
      resourceOrigin: 'CAIXA_ABERTO',
      category: 'MATERIAL',
      description: 'Compra de papel A4 e suprimentos para secretaria',
      value: 180.00,
      paymentMethod: 'PIX',
      beneficiary: 'Papelaria Central',
      date: new Date().toISOString().split('T')[0],
      user: 'Financeiro',
      notes: 'Nota Fiscal nº 4920'
    }
  ];
  return getItemJSON<Expense[]>(STORAGE_KEYS.EXPENSES, seedExpenses);
}

export function addExpense(expenseData: Omit<Expense, 'id'>, user: string): Expense {
  const openCash = getOpenCashRegister();
  const newExp: Expense = {
    ...expenseData,
    id: 'exp_' + Date.now(),
    cashRegisterId: expenseData.resourceOrigin === 'CAIXA_ABERTO' ? openCash?.id : undefined,
    user
  };

  const expenses = getExpenses();
  expenses.unshift(newExp);
  setItemJSON(STORAGE_KEYS.EXPENSES, expenses);

  addFinancialAuditLog(user, 'SAIDA_REGISTRADA', `Saída de R$ ${newExp.value.toFixed(2)} (${newExp.description}) para ${newExp.beneficiary}. Origem: ${newExp.resourceOrigin}`);
  return newExp;
}

// --- INSTALLMENTS & INTEREST LOGIC ---
export function getInstallments(): Installment[] {
  const today = new Date().toISOString().split('T')[0];
  const seedInstallments: Installment[] = [
    {
      id: 'inst_101',
      studentId: '1',
      studentName: 'Maria Silva de Oliveira',
      enrollment: 'ALU202601',
      courseId: 'ENF',
      courseName: 'TÉCNICO EM ENFERMAGEM',
      number: 1,
      totalInstallments: 12,
      competencia: '02/2026',
      originalValue: 480.00,
      discountValue: 48.00,
      discountLimitDate: '2026-02-10',
      dueDate: '2026-02-15',
      interestStartDate: '2026-02-16',
      finePercent: 2,
      dailyInterestPercent: 0.033,
      status: 'PAGA',
      paidAt: '2026-02-08T10:30:00.000Z',
      paidValue: 432.00,
      paidMethod: 'PIX',
      receiptNumber: 'REC-20260208-101',
      cashRegisterId: 'cx_001'
    },
    {
      id: 'inst_102',
      studentId: '1',
      studentName: 'Maria Silva de Oliveira',
      enrollment: 'ALU202601',
      courseId: 'ENF',
      courseName: 'TÉCNICO EM ENFERMAGEM',
      number: 2,
      totalInstallments: 12,
      competencia: '03/2026',
      originalValue: 480.00,
      discountValue: 48.00,
      discountLimitDate: '2026-03-10',
      dueDate: '2026-03-15',
      interestStartDate: '2026-03-16',
      finePercent: 2,
      dailyInterestPercent: 0.033,
      status: 'PENDENTE'
    },
    {
      id: 'inst_103',
      studentId: '1',
      studentName: 'Maria Silva de Oliveira',
      enrollment: 'ALU202601',
      courseId: 'ENF',
      courseName: 'TÉCNICO EM ENFERMAGEM',
      number: 3,
      totalInstallments: 12,
      competencia: '04/2026',
      originalValue: 480.00,
      discountValue: 48.00,
      discountLimitDate: '2026-04-10',
      dueDate: '2026-04-15',
      interestStartDate: '2026-04-16',
      finePercent: 2,
      dailyInterestPercent: 0.033,
      status: 'PENDENTE'
    }
  ];
  return getItemJSON<Installment[]>(STORAGE_KEYS.INSTALLMENTS, seedInstallments);
}

export function saveInstallment(inst: Installment): void {
  const installments = getInstallments();
  const idx = installments.findIndex(i => i.id === inst.id);
  if (idx >= 0) {
    installments[idx] = inst;
  } else {
    installments.push(inst);
  }
  setItemJSON(STORAGE_KEYS.INSTALLMENTS, installments);
}

export function saveInstallments(list: Installment[]): void {
  setItemJSON(STORAGE_KEYS.INSTALLMENTS, list);
}

export function generateStudentInstallments(params: {
  studentId: string;
  studentName: string;
  enrollment: string;
  courseName: string;
  className?: string;
  monthlyValue: number;
  totalInstallments: number;
  firstDueDate: string;
  user: string;
  notes?: string;
}): Installment[] {
  const installments = getInstallments();
  const newInstallments: Installment[] = [];
  const startDate = new Date(params.firstDueDate || Date.now());

  for (let i = 1; i <= params.totalInstallments; i++) {
    const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + (i - 1), startDate.getDate());
    const dueDateStr = dueDate.toISOString().substring(0, 10);
    const discLimit = new Date(dueDate.getFullYear(), dueDate.getMonth(), Math.min(10, dueDate.getDate())).toISOString().substring(0, 10);
    const mm = (dueDate.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = dueDate.getFullYear();

    const inst: Installment = {
      id: `inst_${params.studentId}_${i}_${Date.now()}`,
      studentId: params.studentId,
      studentName: params.studentName,
      enrollment: params.enrollment,
      courseName: params.courseName,
      className: params.className,
      number: i,
      totalInstallments: params.totalInstallments,
      competencia: `${mm}/${yyyy}`,
      originalValue: params.monthlyValue,
      discountValue: 0,
      discountLimitDate: discLimit,
      dueDate: dueDateStr,
      interestStartDate: dueDateStr,
      finePercent: 2,
      dailyInterestPercent: 0.033,
      status: 'PENDENTE',
      notes: params.notes
    };
    newInstallments.push(inst);
    installments.push(inst);
  }

  saveInstallments(installments);
  addFinancialAuditLog(params.user, 'PARCELAS_GERADAS', `${params.totalInstallments} parcelas geradas para ${params.studentName}`);
  return newInstallments;
}

export function calculateInstallmentAmountDue(inst: Installment, targetDateStr?: string): {
  originalValue: number;
  discountApplied: number;
  fineValue: number;
  interestValue: number;
  finalTotal: number;
  isDiscountEligible: boolean;
  isOverdue: boolean;
  daysOverdue: number;
} {
  const today = targetDateStr || new Date().toISOString().split('T')[0];
  const orig = inst.originalValue;

  let discountApplied = 0;
  let fineValue = 0;
  let interestValue = 0;
  let isDiscountEligible = false;
  let isOverdue = false;
  let daysOverdue = 0;

  if (today <= inst.discountLimitDate && inst.discountValue > 0) {
    isDiscountEligible = true;
    discountApplied = inst.discountValue;
  } else if (today > inst.dueDate) {
    isOverdue = true;
    // Fine
    fineValue = (orig * (inst.finePercent || 2)) / 100;
    // Interest
    const dueTime = new Date(inst.interestStartDate || inst.dueDate).getTime();
    const currTime = new Date(today).getTime();
    const diffDays = Math.max(0, Math.ceil((currTime - dueTime) / (1000 * 60 * 60 * 24)));
    daysOverdue = diffDays;
    interestValue = (orig * (inst.dailyInterestPercent || 0.033) / 100) * diffDays;
  }

  const finalTotal = Math.max(0, orig - discountApplied + fineValue + interestValue);

  return {
    originalValue: orig,
    discountApplied,
    fineValue,
    interestValue,
    finalTotal,
    isDiscountEligible,
    isOverdue,
    daysOverdue
  };
}

export function payInstallment(
  installmentId: string,
  paymentMethod: string,
  user: string,
  overrideValue?: number,
  notes?: string
): { installment: Installment; receipt: FinancialReceipt } | null {
  const installments = getInstallments();
  const idx = installments.findIndex(i => i.id === installmentId);
  if (idx === -1) return null;

  const inst = installments[idx];
  const calc = calculateInstallmentAmountDue(inst);
  const openCash = getOpenCashRegister();
  const finalPaid = overrideValue !== undefined ? Number(overrideValue) : calc.finalTotal;

  const receiptNum = 'REC-' + new Date().getFullYear() + Math.floor(100000 + Math.random() * 900000);

  installments[idx] = {
    ...inst,
    status: 'PAGA',
    paidAt: new Date().toISOString(),
    paidValue: finalPaid,
    paidMethod: paymentMethod,
    receiptNumber: receiptNum,
    cashRegisterId: openCash?.id,
    notes: notes ? `${inst.notes || ''} ${notes}`.trim() : inst.notes
  };

  setItemJSON(STORAGE_KEYS.INSTALLMENTS, installments);

  // Generate Receipt
  const receipt: FinancialReceipt = {
    receiptNumber: receiptNum,
    date: new Date().toISOString(),
    studentId: inst.studentId,
    studentName: inst.studentName,
    enrollment: inst.enrollment,
    courseName: inst.courseName,
    description: `Quitação de Mensalidade - Parcela ${inst.number}/${inst.totalInstallments} (${inst.competencia})`,
    items: [
      { title: `Mensalidade ${inst.number}/${inst.totalInstallments} - Comp. ${inst.competencia}`, value: inst.originalValue },
      ...(calc.discountApplied > 0 ? [{ title: 'Desconto Pontualidade/Bolsa', value: -calc.discountApplied }] : []),
      ...(calc.fineValue > 0 ? [{ title: 'Multa por Atraso', value: calc.fineValue }] : []),
      ...(calc.interestValue > 0 ? [{ title: 'Juros de Mora', value: calc.interestValue }] : [])
    ],
    totalValue: finalPaid,
    paymentMethod,
    cashRegisterId: openCash?.id,
    cashRegisterSeq: openCash?.seqNumber,
    user,
    status: 'VALIDO'
  };

  saveReceipt(receipt);
  addFinancialAuditLog(user, 'QUITACAO_PARCELA', `Parcela ${inst.number}/${inst.totalInstallments} do aluno ${inst.studentName} quitada por R$ ${finalPaid.toFixed(2)} (${paymentMethod}). Recibo #${receiptNum}`);

  return { installment: installments[idx], receipt };
}

export function updateInstallmentDueDate(
  installmentId: string,
  newDueDate: string,
  newDiscountValue: number,
  newDiscountLimitDate: string,
  newInterestStartDate: string,
  user: string,
  reason: string
): boolean {
  const installments = getInstallments();
  const idx = installments.findIndex(i => i.id === installmentId);
  if (idx === -1) return false;

  const oldInst = installments[idx];

  installments[idx] = {
    ...oldInst,
    dueDate: newDueDate,
    discountValue: newDiscountValue,
    discountLimitDate: newDiscountLimitDate,
    interestStartDate: newInterestStartDate,
    notes: `${oldInst.notes || ''} | Vencimento alterado em ${new Date().toLocaleDateString('pt-BR')} por ${user}: ${reason}`.trim()
  };

  setItemJSON(STORAGE_KEYS.INSTALLMENTS, installments);
  addFinancialAuditLog(user, 'ALTERACAO_VENCIMENTO', `Vencimento da Parcela ${oldInst.number}/${oldInst.totalInstallments} de ${oldInst.studentName} alterado para ${newDueDate}. Motivo: ${reason}`);

  return true;
}

export function waiveInstallment(
  installmentId: string,
  user: string,
  reason: string
): boolean {
  const installments = getInstallments();
  const idx = installments.findIndex(i => i.id === installmentId);
  if (idx === -1) return false;

  const oldInst = installments[idx];

  installments[idx] = {
    ...oldInst,
    status: 'ABONADA',
    waivedAt: new Date().toISOString(),
    waivedBy: user,
    waiveReason: reason
  };

  setItemJSON(STORAGE_KEYS.INSTALLMENTS, installments);
  addFinancialAuditLog(user, 'ABONO_PARCELA', `Parcela ${oldInst.number}/${oldInst.totalInstallments} (${oldInst.competencia}) de ${oldInst.studentName} abonada. Motivo: ${reason}`);

  return true;
}

// Generate Individual Installments
export function generateIndividualInstallments(params: {
  studentId: string;
  studentName: string;
  enrollment: string;
  courseId: string;
  courseName: string;
  monthlyValue: number;
  totalInstallments: number;
  firstDueDate: string; // YYYY-MM-DD
  enrollmentValue?: number;
  reenrollmentValue?: number;
  dependencyValue?: number;
  discountValue: number;
  discountLimitDay: number;
  interestStartDayOffset?: number;
  finePercent: number;
  dailyInterestPercent: number;
  notes?: string;
  user: string;
}): Installment[] {
  const newInstallments: Installment[] = [];
  const startDt = new Date(params.firstDueDate + 'T12:00:00');

  for (let i = 1; i <= params.totalInstallments; i++) {
    const curDate = new Date(startDt);
    curDate.setMonth(startDt.getMonth() + (i - 1));

    const y = curDate.getFullYear();
    const m = (curDate.getMonth() + 1).toString().padStart(2, '0');
    const compStr = `${m}/${y}`;

    const dueStr = curDate.toISOString().split('T')[0];

    // Limit date for discount
    const discLimitDt = new Date(curDate);
    discLimitDt.setDate(Math.min(params.discountLimitDay || 10, 28));
    const discLimitStr = discLimitDt.toISOString().split('T')[0];

    // Interest start date
    const interestStartDt = new Date(curDate);
    interestStartDt.setDate(interestStartDt.getDate() + 1);
    const interestStartStr = interestStartDt.toISOString().split('T')[0];

    const inst: Installment = {
      id: 'inst_' + Date.now() + '_' + i,
      studentId: params.studentId,
      studentName: params.studentName,
      enrollment: params.enrollment,
      courseId: params.courseId,
      courseName: params.courseName,
      number: i,
      totalInstallments: params.totalInstallments,
      competencia: compStr,
      originalValue: params.monthlyValue,
      discountValue: params.discountValue,
      discountLimitDate: discLimitStr,
      dueDate: dueStr,
      interestStartDate: interestStartStr,
      finePercent: params.finePercent,
      dailyInterestPercent: params.dailyInterestPercent,
      status: 'PENDENTE',
      notes: params.notes
    };

    newInstallments.push(inst);
  }

  // Save to storage
  const existing = getInstallments();
  const updated = [...existing, ...newInstallments];
  setItemJSON(STORAGE_KEYS.INSTALLMENTS, updated);

  addFinancialAuditLog(params.user, 'GERACAO_PARCELAS_INDIVIDUAL', `${params.totalInstallments} parcelas de R$ ${params.monthlyValue.toFixed(2)} geradas para o aluno ${params.studentName}`);

  return newInstallments;
}

// Generate Batch Installments for Class
export function generateBatchClassInstallments(params: {
  students: { id: string; name: string; enrollment: string }[];
  courseId: string;
  courseName: string;
  className: string;
  monthlyValue: number;
  totalInstallments: number;
  firstDueDate: string;
  discountValue: number;
  discountLimitDay: number;
  finePercent: number;
  dailyInterestPercent: number;
  user: string;
}): number {
  let count = 0;
  params.students.forEach(st => {
    generateIndividualInstallments({
      studentId: st.id,
      studentName: st.name,
      enrollment: st.enrollment,
      courseId: params.courseId,
      courseName: params.courseName,
      monthlyValue: params.monthlyValue,
      totalInstallments: params.totalInstallments,
      firstDueDate: params.firstDueDate,
      discountValue: params.discountValue,
      discountLimitDay: params.discountLimitDay,
      finePercent: params.finePercent,
      dailyInterestPercent: params.dailyInterestPercent,
      notes: `Geração em Lote - Turma ${params.className}`,
      user: params.user
    });
    count++;
  });

  addFinancialAuditLog(params.user, 'GERACAO_PARCELAS_LOTE', `Geração em lote concluída para ${count} alunos da turma ${params.className}`);
  return count;
}

// --- RECEIPTS & CANCELATIONS ---
export function getReceipts(): FinancialReceipt[] {
  const seedReceipts: FinancialReceipt[] = [
    {
      receiptNumber: 'REC-20260208-101',
      date: '2026-02-08T10:30:00.000Z',
      studentId: '1',
      studentName: 'Maria Silva de Oliveira',
      enrollment: 'ALU202601',
      courseName: 'TÉCNICO EM ENFERMAGEM',
      description: 'Quitação de Mensalidade - Parcela 1/12 (02/2026)',
      items: [{ title: 'Mensalidade 1/12', value: 432.00 }],
      totalValue: 432.00,
      paymentMethod: 'PIX',
      cashRegisterId: 'cx_001',
      cashRegisterSeq: 1,
      user: 'Tesouraria',
      status: 'VALIDO'
    }
  ];
  return getItemJSON<FinancialReceipt[]>(STORAGE_KEYS.RECEIPTS, seedReceipts);
}

export function saveReceipt(receipt: FinancialReceipt): void {
  const receipts = getReceipts();
  const idx = receipts.findIndex(r => r.receiptNumber === receipt.receiptNumber);
  if (idx >= 0) {
    receipts[idx] = receipt;
  } else {
    receipts.unshift(receipt);
  }
  setItemJSON(STORAGE_KEYS.RECEIPTS, receipts);
}

export function cancelReceipt(receiptNumber: string, user: string, reason: string): boolean {
  const receipts = getReceipts();
  const idx = receipts.findIndex(r => r.receiptNumber === receiptNumber);
  if (idx === -1) return false;

  const rc = receipts[idx];
  receipts[idx] = {
    ...rc,
    status: 'CANCELADO',
    cancelledAt: new Date().toISOString(),
    cancelledBy: user,
    cancelReason: reason
  };

  setItemJSON(STORAGE_KEYS.RECEIPTS, receipts);

  // Reopen associated installment if available
  const installments = getInstallments();
  const instIdx = installments.findIndex(i => i.receiptNumber === receiptNumber);
  if (instIdx >= 0) {
    installments[instIdx] = {
      ...installments[instIdx],
      status: 'PENDENTE',
      paidAt: undefined,
      paidValue: undefined,
      paidMethod: undefined,
      receiptNumber: undefined,
      cashRegisterId: undefined,
      notes: `${installments[instIdx].notes || ''} | Recibo #${receiptNumber} cancelado em ${new Date().toLocaleDateString('pt-BR')} por ${user}: ${reason}`.trim()
    };
    setItemJSON(STORAGE_KEYS.INSTALLMENTS, installments);
  }

  // Reopen associated misc income if available
  const miscIncomes = getMiscIncomes();
  const mIdx = miscIncomes.findIndex(m => m.receiptNumber === receiptNumber);
  if (mIdx >= 0) {
    miscIncomes[mIdx] = {
      ...miscIncomes[mIdx],
      status: 'CANCELADO',
      notes: `${miscIncomes[mIdx].notes || ''} | Cancelado por ${user}: ${reason}`.trim()
    };
    setItemJSON(STORAGE_KEYS.MISC_INCOMES, miscIncomes);
  }

  addFinancialAuditLog(user, 'CANCELAMENTO_RECIBO', `Recibo #${receiptNumber} cancelado. Recebimento estornado e lançamento reaberto. Motivo: ${reason}`);
  return true;
}

export function updateReceiptPaymentMethod(
  receiptNumber: string,
  newMethod: string,
  user: string,
  isAdmin: boolean
): { success: boolean; message: string } {
  const receipts = getReceipts();
  const idx = receipts.findIndex(r => r.receiptNumber === receiptNumber);
  if (idx === -1) return { success: false, message: 'Recibo não encontrado.' };

  const rc = receipts[idx];

  // Check if cash register is open
  if (rc.cashRegisterId) {
    const cashRegisters = getCashRegisters();
    const c = cashRegisters.find(x => x.id === rc.cashRegisterId);
    if (c && c.status === 'CLOSED' && !isAdmin) {
      return { 
        success: false, 
        message: 'O caixa deste recebimento está FECHADO. Apenas o Administrador pode alterar a forma de pagamento.' 
      };
    }
  }

  const oldMethod = rc.paymentMethod;
  receipts[idx] = {
    ...rc,
    paymentMethod: newMethod
  };
  setItemJSON(STORAGE_KEYS.RECEIPTS, receipts);

  // Update in installment or misc income
  const installments = getInstallments();
  const instIdx = installments.findIndex(i => i.receiptNumber === receiptNumber);
  if (instIdx >= 0) {
    installments[instIdx].paidMethod = newMethod;
    setItemJSON(STORAGE_KEYS.INSTALLMENTS, installments);
  }

  const miscIncomes = getMiscIncomes();
  const mIdx = miscIncomes.findIndex(m => m.receiptNumber === receiptNumber);
  if (mIdx >= 0) {
    miscIncomes[mIdx].paymentMethod = newMethod;
    setItemJSON(STORAGE_KEYS.MISC_INCOMES, miscIncomes);
  }

  addFinancialAuditLog(user, 'ALTERACAO_FORMA_PAGAMENTO', `Forma de pagamento do recibo #${receiptNumber} alterada de ${oldMethod} para ${newMethod}.`);
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
  return getItemJSON<FinancialNote[]>(STORAGE_KEYS.FINANCIAL_NOTES, seedNotes);
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
export function checkActionBlockedByFinance(studentId: string, actionType: string): { blocked: boolean; pendingCharges: string[] } {
  const miscIncomes = getMiscIncomes().filter(m => m.studentId === studentId && m.status === 'PAGO'); // Paid ones don't block
  const catalog = getMiscPaymentCatalog().filter(c => c.active && c.blockedActions.includes(actionType));

  // Check if student has pending unpaid items in catalog or misc incomes
  // Find all unpaid required charges
  const allUnpaidIncomes = getMiscIncomes().filter(m => m.studentId === studentId && m.status !== 'PAGO' && m.status !== 'ABONADO');
  
  const blockingIncomes = allUnpaidIncomes.filter(m => m.blockedActions && m.blockedActions.includes(actionType));

  if (blockingIncomes.length > 0) {
    return {
      blocked: true,
      pendingCharges: blockingIncomes.map(i => i.chargeName)
    };
  }

  return { blocked: false, pendingCharges: [] };
}

// --- INCOME TAX DECLARATION (IRPF) ---
export function generateIRPFStatementData(studentId: string, year: number): {
  institutionName: string;
  cnpj: string;
  address: string;
  studentName: string;
  studentEnrollment: string;
  studentCpf: string;
  courseName: string;
  baseYear: number;
  items: { date: string; description: string; receiptNumber: string; paymentMethod: string; value: number }[];
  totalPaid: number;
  issueDate: string;
  validationCode: string;
} {
  const receipts = getReceipts().filter(r => 
    r.studentId === studentId && 
    r.status === 'VALIDO' && 
    new Date(r.date).getFullYear() === year
  );

  const items = receipts.map(r => ({
    date: new Date(r.date).toLocaleDateString('pt-BR'),
    description: r.description,
    receiptNumber: r.receiptNumber,
    paymentMethod: r.paymentMethod,
    value: r.totalValue
  }));

  const totalPaid = items.reduce((sum, i) => sum + i.value, 0);
  const student = receipts[0];

  return {
    institutionName: 'COLÉGIO OSWALDO CRUZ DE BRASÍLIA',
    cnpj: '01.234.567/0001-89',
    address: 'SGAN 608 Módulo B/C - Asa Norte, Brasília - DF',
    studentName: student?.studentName || 'Aluno Selecionado',
    studentEnrollment: student?.enrollment || 'ALU-2026',
    studentCpf: student?.cpf || '000.000.000-00',
    courseName: student?.courseName || 'Curso Técnico',
    baseYear: year,
    items,
    totalPaid,
    issueDate: new Date().toLocaleDateString('pt-BR'),
    validationCode: 'IRPF-' + Math.random().toString(36).substring(2, 10).toUpperCase()
  };
}

export function getStudentPaidYearTotal(studentIdOrEnrollment: string, year: number): { receipts: any[]; totalValue: number } {
  const receipts = getReceipts().filter(r => 
    (r.studentId === studentIdOrEnrollment || r.enrollment === studentIdOrEnrollment) && 
    r.status === 'VALIDO' && 
    new Date(r.date).getFullYear() === year
  );

  const totalValue = receipts.reduce((sum, r) => sum + (r.totalValue || 0), 0);
  return { receipts, totalValue };
}

// --- EXEMPTIONS / ABONOS ---
export function getExemptions(): ExemptionItem[] {
  return getItemJSON<ExemptionItem[]>('gestao_fin_exemptions_v1', []);
}

export function applyExemption(
  installmentId: string,
  type: 'TOTAL' | 'PARTIAL',
  waivedValue: number,
  reason: string,
  authorizer: string,
  user: string
): boolean {
  const installments = getInstallments();
  const idx = installments.findIndex(i => i.id === installmentId);
  if (idx === -1) return false;

  const inst = installments[idx];
  const actualWaived = type === 'TOTAL' ? inst.originalValue : Math.min(waivedValue, inst.originalValue);

  if (type === 'TOTAL') {
    installments[idx] = {
      ...inst,
      status: 'ABONADA',
      waivedAt: new Date().toISOString(),
      waivedBy: user,
      waiveReason: `${reason} (Autorizado por: ${authorizer})`
    };
  } else {
    const newOrig = Math.max(0, inst.originalValue - actualWaived);
    installments[idx] = {
      ...inst,
      originalValue: newOrig,
      status: newOrig === 0 ? 'ABONADA' : inst.status,
      notes: `${inst.notes || ''} | Abono parcial de R$ ${actualWaived.toFixed(2)} por ${user}: ${reason} (${authorizer})`.trim()
    };
  }

  setItemJSON(STORAGE_KEYS.INSTALLMENTS, installments);

  const newExemption: ExemptionItem = {
    id: 'ex_' + Date.now(),
    installmentId,
    studentId: inst.studentId,
    studentName: inst.studentName,
    enrollment: inst.enrollment,
    competencia: inst.competencia,
    type,
    originalValue: inst.originalValue,
    waivedValue: actualWaived,
    reason,
    authorizer,
    date: new Date().toISOString(),
    user
  };

  const exemptions = getExemptions();
  exemptions.unshift(newExemption);
  setItemJSON('gestao_fin_exemptions_v1', exemptions);

  addFinancialAuditLog(user, 'CONCESSAO_ABONO', `Abono (${type}) de R$ ${actualWaived.toFixed(2)} concedido na parcela ${inst.number}/${inst.totalInstallments} (${inst.competencia}) do aluno ${inst.studentName}. Autorizado por: ${authorizer}`);
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


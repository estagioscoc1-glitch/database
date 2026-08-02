/**
 * Types for Módulo Financeiro
 */

export type CashRegisterStatus = 'OPEN' | 'CLOSED';

export interface CashRegister {
  id: string;
  seqNumber: number;
  openedAt: string;
  closedAt?: string;
  responsibleUser: string;
  initialBalance: number;
  finalBalance?: number;
  status: CashRegisterStatus;
  notes?: string;
  calculatedIncomes?: number;
  calculatedExpenses?: number;
}

export interface PaymentMethodItem {
  id: string;
  name: string;
  isSystemDefault: boolean;
  active: boolean;
}

export type InstallmentStatus = 'PENDENTE' | 'PAGA' | 'ATRASADA' | 'ABONADA' | 'CANCELADA';

export interface Installment {
  id: string;
  studentId: string;
  studentName: string;
  enrollment: string;
  courseId?: string;
  courseName?: string;
  classId?: string;
  className?: string;
  number: number; // e.g. 1
  totalInstallments: number; // e.g. 12
  competencia: string; // MM/YYYY
  originalValue: number;
  discountValue: number;
  discountLimitDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  interestStartDate: string; // YYYY-MM-DD
  finePercent: number; // e.g. 2 (%)
  dailyInterestPercent: number; // e.g. 0.033 (%)
  status: InstallmentStatus;
  paidAt?: string;
  paidValue?: number;
  paidMethod?: string;
  receiptNumber?: string;
  cashRegisterId?: string;
  notes?: string;
  scholarshipApplied?: string;
  waivedAt?: string;
  waivedBy?: string;
  waiveReason?: string;
}

export interface MiscPaymentCatalog {
  id: string;
  name: string;
  category: string;
  defaultValue: number;
  description: string;
  active: boolean;
  blockedActions: string[]; // e.g. ['MATRICULA', 'REMATRICULA', 'ESTAGIO', 'DIPLOMA', 'CERTIFICADO', 'DOCUMENTOS']
}

export interface MiscIncome {
  id: string;
  studentId: string;
  studentName: string;
  enrollment: string;
  chargeName: string;
  category: string;
  value: number;
  paidValue: number;
  paymentMethod: string;
  cashRegisterId?: string;
  paidAt: string;
  receiptNumber: string;
  user: string;
  status: 'PAGO' | 'ABONADO' | 'CANCELADO';
  notes?: string;
  blockedActions?: string[];
  waivedAt?: string;
  waivedBy?: string;
  waiveReason?: string;
}

export interface Expense {
  id: string;
  cashRegisterId?: string;
  resourceOrigin: 'CAIXA_ABERTO' | 'CONTA_BANCARIA';
  category: string;
  description: string;
  value: number;
  paymentMethod: string;
  beneficiary: string;
  date: string;
  user: string;
  notes?: string;
  voucher?: string;
}

export interface Scholarship {
  id: string;
  studentId: string;
  studentName: string;
  enrollment: string;
  type: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  startDate: string;
  endDate?: string;
  reason: string;
  partnerInstitution?: string;
  authorizer: string;
  notes?: string;
  active: boolean;
}

export interface CoursePriceConfig {
  id: string;
  courseId: string;
  courseName: string;
  enrollmentPrice: number;
  reenrollmentPrice: number;
  monthlyPrice: number;
  dependencyPrice: number;
  maxInstallments: number;
  discountPercent: number;
  discountLimitDay: number; // Day of month e.g. 10
  finePercent: number;
  dailyInterestPercent: number;
  notes?: string;
}

export type FinancialNoteCategory = 
  | 'OCORRENCIA' 
  | 'INADIMPLENCIA' 
  | 'RENEGOCIACAO' 
  | 'BOLSA' 
  | 'ISENCAO' 
  | 'PROBLEMA_ADM' 
  | 'GERAL';

export interface FinancialNote {
  id: string;
  studentId: string;
  studentName: string;
  enrollment: string;
  category: FinancialNoteCategory;
  description: string;
  date: string; // ISO
  user: string;
  semester?: string;
  period?: string;
}

export interface FinancialReceipt {
  receiptNumber: string;
  date: string;
  studentId: string;
  studentName: string;
  enrollment: string;
  cpf?: string;
  courseName?: string;
  description: string;
  items: { title: string; value: number }[];
  totalValue: number;
  paymentMethod: string;
  cashRegisterId?: string;
  cashRegisterSeq?: number;
  user: string;
  status: 'VALIDO' | 'CANCELADO';
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
}

export interface ExemptionItem {
  id: string;
  installmentId: string;
  studentId: string;
  studentName: string;
  enrollment: string;
  competencia: string;
  type: 'TOTAL' | 'PARTIAL';
  originalValue: number;
  waivedValue: number;
  reason: string;
  authorizer: string;
  date: string;
  user: string;
}

export interface FinancialAuditLog {
  id: string;
  date: string;
  user: string;
  action: string;
  details: string;
  module: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  category: 'CAIXA_DIARIO' | 'MENSAL' | 'ANUAL' | 'OUTROS';
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string;
  uploadedAt: string;
  uploadedBy: string;
  isActive: boolean;
  description?: string;
}

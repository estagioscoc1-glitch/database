export type ModalityType = 'Presencial' | 'EAD' | 'Híbrido';
export type TeachingType = 'Técnico' | 'Graduação' | 'Pós' | 'Qualificação';

export interface CurriculumSubject {
  id: string;
  name: string;
  workloadHours: number;
  order: number;
  module: number;
  code?: string;
}

export interface CurriculumGrade {
  id: string;
  courseId: string;
  courseName: string;
  modality: ModalityType;
  teachingType: TeachingType;
  subjects: CurriculumSubject[];
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentDocumentCheckitem {
  name: string;
  delivered: boolean;
  deliveredAt?: string;
  deadlineDays?: number;
  notes?: string;
}

export interface StudentEnrollment {
  id: string;
  enrollmentNumber: string;
  studentId: string;
  studentName: string;
  studentCpf: string;
  courseId: string;
  courseName: string;
  shift: 'Manhã' | 'Tarde' | 'Noite' | 'EAD';
  classId: string;
  className: string;
  roomId?: string;
  roomName?: string;
  semester: string;
  enrollmentDate: string;
  status: 'ATIVA' | 'TRANSFERIDA' | 'CANCELADA' | 'CONCLUIDA' | 'PENDENTE';
  financialPlan: {
    enrollmentFee: number;
    installmentsCount: number;
    installmentValue: number;
    discountPercent: number;
    scholarshipType?: string;
    specialConditions?: string;
  };
  documentsChecklist: EnrollmentDocumentCheckitem[];
  cetranDeclarationGenerated?: boolean;
  matriculaRequerimentoGenerated?: boolean;
  createdAt: string;
  createdBy: string;
}

export interface TransferRecord {
  id: string;
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  transferType: 'TURMA' | 'TURNO' | 'CURSO';
  oldCourseId?: string;
  oldCourseName?: string;
  newCourseId?: string;
  newCourseName?: string;
  oldClassId?: string;
  oldClassName?: string;
  newClassId?: string;
  newClassName?: string;
  oldShift?: string;
  newShift?: string;
  reason: string;
  transferredBy: string;
  transferredAt: string;
}

export interface CancelationRecord {
  id: string;
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  courseId: string;
  courseName: string;
  classId: string;
  className: string;
  reason: string;
  canceledBy: string;
  canceledAt: string;
  futureInstallmentsCanceled: boolean;
}

export interface DependencyEnrollment {
  id: string;
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  courseId: string;
  courseName: string;
  subjectId: string;
  subjectName: string;
  semester: string;
  teacherId?: string;
  teacherName?: string;
  enrollmentDate: string;
  feeValue: number;
  installmentsCount: number;
  status: 'ATIVA' | 'CONCLUIDA' | 'CANCELADA';
  createdBy: string;
}

export interface RequirementCondition {
  id: string;
  name: string;
  key?: 'NO_OVERDUE' | 'FEE_PAID' | 'ACTIVE_ENROLLMENT' | 'STAGES_COMPLETED' | 'DOCS_DELIVERED' | 'SEMESTER_PAID' | 'CANCELED_ENROLLMENT' | 'CUSTOM';
  required: boolean;
  description?: string;
}

export interface DocumentRequirementConfig {
  id: string;
  name: string;
  type: 'Declaração' | 'Histórico' | 'Transferência' | 'Diploma' | 'Certificado' | 'Outros';
  deliveryDays: number;
  feeValue: number;
  isFeeMandatory: boolean;
  rules: {
    requireNoOverdueInstallments: boolean;
    requireFeePaid: boolean;
    requireActiveEnrollment: boolean;
  };
  customConditions?: RequirementCondition[];
  createdAt: string;
}

export interface StudentRequirementRequest {
  id: string;
  protocolNumber?: string;
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  courseName?: string;
  className?: string;
  configId: string;
  documentName: string;
  type: string;
  requestedAt: string;
  deliveryDays?: number;
  deliveryDeadline: string;
  feeValue: number;
  feePaid: boolean;
  status: 'PENDENTE' | 'EM_ANALISE' | 'APROVADO' | 'CONCLUIDO' | 'REJEITADO';
  conditionsCheck?: {
    conditionId: string;
    name: string;
    fulfilled: boolean;
    notes?: string;
  }[];
  rejectionReason?: string;
  adminNotes?: string;
  uploadedDocumentUrl?: string;
  completedAt?: string;
  createdBy?: string;
}

export interface OfficialTemplate {
  id: string;
  title: string;
  docType: 'CONTRATO' | 'HISTORICO' | 'DIPLOMA' | 'CERTIFICADO' | 'TRANSFERENCIA' | 'REQUERIMENTO' | 'DECLARACAO' | 'ESTAGIO' | 'FINANCEIRO' | 'OUTROS';
  courseId?: string;
  courseName?: string;
  modality?: string;
  module?: number;
  contentHtml: string;
  pdfDataUrl?: string;
  fileName?: string;
  version: string;
  updatedAt: string;
  updatedBy: string;
}

export type OfficialDocumentTemplate = OfficialTemplate;

export interface EventMinicourse {
  id: string;
  title: string;
  date: string;
  time: string;
  workloadHours: number;
  location: string;
  instructor: string;
  description: string;
  feeValue: number;
  certificateTemplateHtml?: string;
  createdAt: string;
  createdBy?: string;
}

export type AcademicEvent = EventMinicourse;

export interface EventParticipant {
  id: string;
  eventId: string;
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  paid: boolean;
  attended: boolean;
  registeredAt: string;
  certificateGenerated?: boolean;
  certificateUrl?: string; // Uploaded PDF base64 or URL
  certificateFileName?: string;
  issueDate?: string;
}

export interface StageRequirementConfig {
  id: string;
  courseId?: string;
  insurancePaid: boolean;
  kitPaid: boolean;
  tuitionUpToDate: boolean;
  activeEnrollment: boolean;
}

export interface StageDefinition {
  id: string;
  courseId: string;
  courseName: string;
  stageName: string;
  workloadHours: number;
  description: string;
  minPassingGrade: number;
  maxGrade: number;
  studentPrice: number;
  teacherPayRate: number;
  paymentMethodInfo: string;
  createdAt: string;
}

export interface StageVacancyStudent {
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  status: string;
}

export interface StageVacancy {
  id: string;
  vacancyNumber?: string;
  companyName?: string;
  sector?: string;
  supervisorName?: string;
  courseId?: string;
  courseName?: string;
  stageId?: string;
  stageName?: string;
  teacherId: string;
  teacherName: string;
  teacherCouncilNumber?: string;
  classId?: string;
  className?: string;
  maxStudents?: number;
  enrolledStudentIds?: string[];
  studentsAllocated?: StageVacancyStudent[];
  startDate: string;
  endDate: string;
  scheduleDaysTime?: string;
  location?: string;
  totalHours?: number;
  hourlyRate?: number;
  accessLinkCode?: string;
  status: 'ABERTA' | 'EM_ANDAMENTO' | 'CONCLUIDA';
  evaluationFormTemplateHtml?: string;
  createdAt: string;
}

export interface StageEvaluationCriteria {
  id: string;
  label: string;
  maxScore: number;
  score: number;
}

export interface StageEvaluation {
  id: string;
  vacancyId: string;
  studentId: string;
  studentName: string;
  enrollmentNumber?: string;
  grade?: number;
  approved?: boolean;
  comments?: string;
  techGrade?: number;
  ethicsGrade?: number;
  punctualityGrade?: number;
  reportGrade?: number;
  technicalGrade?: number;
  totalAbsences?: number;
  completedHours?: number;
  finalGrade?: number;
  supervisorFeedback?: string;
  evaluatedAt?: string;
  companyName?: string;
  status?: string;
  criteriaScores?: StageEvaluationCriteria[];
  filledAt?: string;
  filledByTeacher?: string;
  teacherName?: string;
  teacherId?: string;
}

export type StageEvaluationSheet = StageEvaluation;

export interface StageScheduleItem {
  id: string;
  vacancyId: string;
  stageId: string;
  date: string;
  time: string;
  stepTitle: string;
  description: string;
  location?: string;
}

export interface StageTeacherReceipt {
  id: string;
  vacancyId: string;
  teacherId: string;
  teacherName: string;
  stageName?: string;
  className?: string;
  companyName?: string;
  studentsCount: number;
  ratePerStudent?: number;
  hourlyRate?: number;
  totalHours?: number;
  totalHoursAccompanying?: number;
  totalAmountPaid?: number;
  issuedAt?: string;
  receiptNumber?: string;
  totalValue: number;
  status: 'PENDENTE' | 'PAGO';
  paidAt?: string;
  paidBy?: string;
  generatedAt?: string;
  createdAt?: string;
}

export type TeacherStageReceipt = StageTeacherReceipt;

export interface StageField {
  id: string;
  companyName: string;
  cnpj?: string;
  address?: string;
  sector?: string;
  supervisorName?: string;
  phone?: string;
  email?: string;
  maxCapacity?: number;
  status: 'ATIVO' | 'INATIVO';
  createdAt?: string;
}

export interface StageTeacher {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  councilNumber: string; // e.g. COREN, COFFITO
  specialty?: string;
  pixKey?: string;
  status: 'ATIVO' | 'INATIVO';
  createdAt?: string;
}

export interface StageCronograma {
  id: string;
  title: string;
  courseName: string;
  stageName: string;
  className: string;
  companyName?: string;
  releaseDate: string; // Date students are unlocked/notified
  startDate: string;
  endDate: string;
  shift: 'MANHA' | 'TARDE' | 'NOITE' | 'INTEGRAL';
  vacanciesCount: number;
  status: 'AGUARDANDO_LIBERACAO' | 'LIBERADO' | 'EM_ANDAMENTO' | 'FINALIZADO';
  observations?: string;
  createdAt?: string;
}

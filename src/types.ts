/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  STAFF = 'STAFF'
}

export enum Shift {
  MATUTINO = 'MATUTINO',
  VESPERTINO = 'VESPERTINO',
  NOTURNO = 'NOTURNO',
  SABADO = 'SÁBADO',
  EAD = 'EAD'
}

export enum CalendarEventType {
  CLOSING_S1 = 'CLOSING_S1',
  CLOSING_S2 = 'CLOSING_S2',
  DEFINITIVE_CLOSING = 'DEFINITIVE_CLOSING',
  HOLIDAY = 'HOLIDAY',
  EXAM = 'EXAM',
  INFO = 'INFO'
}

export type PermissionModule =
  | 'dashboard'
  | 'cadastros'
  | 'matriculas'
  | 'financeiro'
  | 'diarios'
  | 'frequencia'
  | 'boletins'
  | 'historico'
  | 'certificados'
  | 'relatorios'
  | 'configuracoes'
  | 'usuarios'
  | 'cursos'
  | 'disciplinas'
  | 'turmas'
  | 'importacoes'
  | 'exportacoes'
  | 'administracao'
  | 'dependencias'
  | 'funcionarios';

export interface ModuleActions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  print: boolean;
  export: boolean;
}

export type StaffPermissions = Record<string, ModuleActions>;

export interface StaffMember {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  position: string; // Cargo
  registrationDate: string; // Data de cadastro
  active: boolean; // Status (Ativo/Inativo)
  username: string; // Número de usuário (login auto-gerado)
  password?: string; // Senha inicial/atual
  permissions: StaffPermissions;
}

export interface DependencyEnrollment {
  id: string;
  studentId: string;
  studentName: string;
  enrollment: string;
  courseId: string;
  subjectId: string;
  semester: number;
  schedule: string; // Horário da dependência
  createdClassId: string; // ID do Diário gerado automaticamente
  createdAt: string;
  status: 'ATIVO' | 'CONCLUÍDO' | 'CANCELADO';
}

export interface User {
  id: string;
  name: string;
  username: string; // for login
  email: string;
  role: UserRole;
  password?: string;
  cpf?: string; // for teachers/staff
  phone?: string;
  position?: string;
  enrollment?: string; // matricula for students/teachers
  dossierNumber?: string; // Número do Dossiê do Aluno
  active: boolean;
  classId?: string; // student's active class section
  courseId?: string;
  status?: string;
  createdAt?: string;

  /**
   * Id da CONTA DE LOGIN da pessoa (a linha dela em `usuarios`).
   *
   * Aluno e professor têm DOIS identificadores: o da ficha (`std_...`,
   * `prof_...`) e o da conta de login. O `id` acima guarda o da ficha, porque
   * é o que o resto do sistema usa.
   *
   * As mensagens, porém, são endereçadas à CONTA — a coluna `destinatario_id`
   * aponta para `usuarios`. Sem guardar esse segundo número aqui, a tela do
   * aluno procurava as mensagens dele pelo id da ficha e nunca achava nada:
   * a mensagem existia, correta, endereçada à pessoa certa, e simplesmente
   * não aparecia. Nenhum erro na tela.
   */
  contaId?: string;

  assignedJournals?: { classId: string, subjectId: string }[];
  staffPermissions?: StaffPermissions;
  /** 'M' ou 'F'. Define se o Certificado de Reservista é exigido. */
  sexo?: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  totalWorkload?: number;
  shifts?: Shift[];
  status?: 'ATIVO' | 'INATIVO';
  active?: boolean;
}

export interface ClassSection {
  id: string;
  name: string;
  code?: string;
  courseId: string;
  shift: Shift;
  module: number;
  year: number;
  semester: number;
  closedS1: boolean;
  closedS2: boolean;
  closedDefinitive: boolean;
  isImported?: boolean;
  isDependency?: boolean;
  dependencySubjectId?: string;
  scheduleText?: string;
}

export interface Subject {
  id: string;
  name: string;
  courseId: string;
  module: number;
  workload: number; // Carga Horária in hours
}

export interface GradeRecord {
  id: string;
  subjectId: string;
  classId: string;
  studentId: string;
  // S1 evaluations
  av1?: number | null;
  av2?: number | null;
  av3?: number | null;
  recS1?: number | null;
  s1: number; // S1 calculated
  // S2 evaluations
  av4?: number | null;
  av5?: number | null;
  av6?: number | null;
  recS2?: number | null;
  s2: number; // S2 calculated

  extra?: number | null; // EX
  conselho?: number | null; // CS
  afc?: number | null; // AFC (Avaliação Final de Competência)
  pf: number; // Pontuação Final calculated
  concept: string; // A, B, C, D, etc.
  result: 'APTO' | 'NÃO APTO' | 'F. NOTA' | 'REP. FALTAS' | 'Pendente' | 'DISPENSADO' | 'DESISTENTE';
  isHistoricalImport?: boolean;
}

export interface AttendanceSession {
  id: string;
  subjectId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  lessonsCount: number; // e.g. 2 or 4 lessons (aulas)
  teacherId: string;
  topic: string; // observações/conteúdo
  // Map of studentId -> 'P' (Presença) or 'F' (Falta)
  records: { [studentId: string]: 'P' | 'F' };
}

export interface ConceptRange {
  id: string;
  minGrade: number;
  maxGrade: number;
  letter: string;
  description: string; // e.g. Excelente, Bom, etc.
}

export interface Message {
  id: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string; // studentId, teacherId, or 'ALL_TEACHERS'
  content: string;
  date: string;
  attachmentUrl?: string;
  attachmentType?: 'audio' | 'pdf' | 'image';
  attachmentName?: string;
}

export interface AcademicNotification {
  id: string;
  userId: string;
  content: string;
  date: string;
  read: boolean;
  /**
   * Mensagem que originou este aviso, quando houver.
   *
   * Sem esta ligação, apagar a mensagem deixava o aviso órfão na tela do
   * destinatário — e o aviso carrega os primeiros 60 caracteres do texto, então
   * o trecho continuava visível depois de a mensagem ter sido apagada.
   */
  messageId?: string;
}

export interface AcademicCalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  description: string;
}

export interface SystemStats {
  teachersCount: number;
  studentsCount: number;
  classesCount: number;
  subjectsCount: number;
  journalsCount: number; // Total number of diários
  journalsClosed: number;
  journalsOpen: number;
  studentsApto: number;
  studentsNaoApto: number;
  overallApprovalRate: number; // percentage
  totalAbsences: number;
  pendingGradesCount: number;
}

export interface StudentDocument {
  id: string; // doc_studentId_documentName
  studentId: string;
  name: string;
  status: 'PENDENTE' | 'ENVIADO' | 'ENTREGUE';
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
}

export interface DeclarationConfigs {
  institutionName?: string;
  escolaridade: { startDate: string; endDate: string };
  ctransp: { startDate: string; endDate: string };
}

export interface InternshipRecord {
  id: string;
  studentId: string;
  subjectName: string;
  workload: number;
  location: string;
  /** Docente responsável pela supervisão na unidade concedente. */
  teacherName?: string;
  grade: number | null;
  updatedAt?: string;
}

export interface CustomDashboardWidget {
  id: string;
  name: string;
  type: 'card' | 'barChart' | 'pieChart' | 'table' | 'indicator' | 'list' | 'calendar';
  dataSource: 'students' | 'courses' | 'classes' | 'financial' | 'internships' | 'diplomas' | 'staff';
  metric: 'count' | 'average' | 'sum' | 'percentage';
  filterKey?: string;
  icon: string;
  color: string;
  position: number;
  description?: string;
}

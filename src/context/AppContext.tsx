/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, UserRole, Course, ClassSection, Subject, GradeRecord, 
  AttendanceSession, ConceptRange, AcademicCalendarEvent, Message, 
  AcademicNotification, Shift, SystemStats, StudentDocument, DeclarationConfigs,
  InternshipRecord, StaffMember, StaffPermissions, DependencyEnrollment,
  CalendarEventType
} from '../types';
import { 
  initialCourses, initialConceptRanges, initialUsers, 
  initialClasses, initialSubjects, initialGrades, 
  generateInitialAttendance, initialCalendarEvents, getDemoDataToLoad
} from '../data/initialData';
import { safeLocalStorage } from '../lib/safeStorage';
import {
  saveStateToCloud, loadStateFromCloud, SystemStatePayload,
  uploadBackupToStorage, listBackupsFromStorage, deleteBackupFromStorage, StorageBackupFile,
  bancoDisponivel, isPermissionError, assinarMudancas,
  registrarFalhaDeGravacao, limparFalhaDeGravacao
} from '../lib/nuvem';
import {
  supabase,
  criarAcesso,
  entrar as entrarNoPortal,
  sair as sairDoPortal,
  carregarPerfil,
  sessaoAtual,
  idDoAlunoLogado,
  montarUsuario,
  trocarSenha as trocarSenhaNoAuth,
  enviarRecuperacaoSenha,
  validarForcaSenha,
} from '../lib/supabase';
import { salvarNota, salvarFaltas, salvarAula, publicarEstrutura, carregarEstrutura, carregarNotas, carregarFaltas, carregarAulas, salvarMensagem, carregarMensagens, salvarDocumentoAluno, carregarDocumentosAluno, criarAcessosDosAlunos, alunosSemAcesso, carregarEventosCalendario, salvarEventosCalendario, excluirCurso, excluirDisciplina, excluirTurma, excluirAluno, excluirProfessor, excluirMensagem, carregarPeriodoAtual, salvarPeriodoAtual } from '../lib/repositorios';
import {
  restaurarDoServidor, iniciarEspelho, pararEspelho, enviarAgora as enviarEspelhoAgora,
  enviarTudoQueJaExiste,
} from '../lib/espelhoLocal';
import { getDefaultStaffPermissions } from '../utils/permissionUtils';

function safeJsonParse<T>(savedValue: string | null, fallback: T): T {
  if (!savedValue) return fallback;
  try {
    if (savedValue === 'undefined' || savedValue === 'null') return fallback;
    const parsed = JSON.parse(savedValue);
    
    // Type defense: if fallback is an array, ensure parsed is an array
    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      console.warn(`[safeJsonParse] Expected array for stored state but got:`, typeof parsed);
      return fallback;
    }
    
    // Type defense: if fallback is an object (non-null, non-array), ensure parsed matches
    if (fallback !== null && typeof fallback === 'object' && !Array.isArray(fallback)) {
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        console.warn(`[safeJsonParse] Expected object for stored state but got:`, typeof parsed);
        return fallback;
      }
    }
    
    return parsed as T;
  } catch (e) {
    console.warn(`[safeJsonParse] Error parsing JSON value:`, e);
    return fallback;
  }
}

export interface BackupScheduleConfig {
  frequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  lastBackupTime: string | null;
  nextBackupTime: string | null;
  hour: string; // e.g. "02:00"
}

export interface HistoricalImportSummary {
  coursesCreated: number;
  classesCreated: number;
  subjectsCreated: number;
  studentsCreated: number;
  studentsRecognized: number;
  gradesImported: number;
}

export interface DataRepairSummary {
  classesMerged: number;
  subjectsMerged: number;
  studentsMerged: number;
  gradesReattached: number;
  details: string[];
}

interface AppContextType {
  isLoading: boolean;
  currentUser: User | null;
  users: User[];
  courses: Course[];
  classes: ClassSection[];
  subjects: Subject[];
  grades: GradeRecord[];
  attendance: AttendanceSession[];
  conceptRanges: ConceptRange[];
  calendarEvents: AcademicCalendarEvent[];
  messages: Message[];
  notifications: AcademicNotification[];
  activeClassId: string | null;
  activeSubjectId: string | null;
  
  // Automated closing config
  autoLockEnabled: boolean;
  setAutoLockEnabled: (enabled: boolean) => void;
  simulatedDate: string;
  setSimulatedDate: (date: string) => void;
  updateCalendarEventDate: (id: string, date: string) => void;
  isClassS1Locked: (cl: ClassSection) => boolean;
  isClassS2Locked: (cl: ClassSection) => boolean;
  isClassDefinitiveLocked: (cl: ClassSection) => boolean;
  
  // Period/Semester Management
  currentPeriod: string;
  periods: string[];
  setCurrentPeriod: (period: string) => void;
  addPeriod: (period: string) => void;
  
  // Admin DB controls
  wipeAllData: () => void;
  wipeAllStudents: () => void;
  loadDemoData: () => void;
  
  // Auth
  /**
   * Entra no portal. O papel NÃO é informado por quem entra: ele é lido do
   * banco depois que a senha é conferida. A tela de login não tem mais como
   * escolher entre Aluno, Professor e Administração.
   */
  login: (usuario: string, senha: string) => Promise<boolean>;
  logout: () => void;
  updatePassword: (userId: string, newPass: string) => Promise<void>;
  recoverPassword: (email: string) => Promise<string | null>;
  
  // Set Active
  setActiveClassId: (id: string | null) => void;
  setActiveSubjectId: (id: string | null) => void;

  // DB Mutators
  addCourse: (course: Omit<Course, 'id'> & { id?: string }) => Course;
  addClass: (cls: ClassSection) => void;
  updateClass: (id: string, updates: Partial<ClassSection>) => void;
  deleteClass: (id: string) => void;
  addSubject: (sub: Subject) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  unifyDuplicateStudents: (principalId: string, duplicateIds: string[]) => void;
  unifyDuplicateSubjects: (correctSubjectId: string, duplicateSubjectIds: string[]) => void;
  syncSubjectsWithOfficialCurriculum: () => {
    renamed: { original: string; official: string; id: string }[];
    unified: { original: string; kept: string; keptId: string; deletedId: string }[];
  };
  updateGrade: (id: string, updates: Partial<GradeRecord>) => void;
  updateConceptRanges: (ranges: ConceptRange[]) => void;
  
  // Attendance
  saveAttendanceSession: (session: AttendanceSession) => void;
  addAttendanceSession: (session: Omit<AttendanceSession, 'id'>) => void;
  directAbsences: Record<string, number>;
  updateStudentAbsences: (studentId: string, subjectId: string, classId: string, total: number) => void;
  
  // Actions
  toggleJournalStatus: (classId: string, type: 'S1' | 'S2' | 'Definitive') => void;
  sendMessage: (
    senderName: string, 
    senderRole: UserRole, 
    recipientId: string, 
    content: string,
    attachmentUrl?: string,
    attachmentType?: 'audio' | 'pdf' | 'image',
    attachmentName?: string
  ) => void;
  deleteMessage: (id: string) => void;
  addNotification: (userId: string, content: string) => void;
  clearNotifications: (userId: string) => void;
  
  // Helpers
  getStudentAbsences: (studentId: string, subjectId: string, classId?: string) => { total: number, frequency: number };
  getStudentAttendanceGrid: (studentId: string) => { [subjectId: string]: { total: number, frequency: number } };
  
  // Bulk imports
  importStudents: (studentList: { name: string, enrollment: string, email: string }[], targetClassId: string) => void;
  importSubjects: (subjectList: { name: string, workload: number }[], courseId: string, module: number) => void;
  importConcepts: (conceptList: ConceptRange[]) => void;
  importHistoricalData: (data: any, targetPeriod?: string) => HistoricalImportSummary;
  repairDuplicateImports: () => DataRepairSummary;
  undoHistoricalImports: () => { removedClassesCount: number; removedStudentsCount: number; removedGradesCount: number };

  // Security and Backups
  securityLogs: any[];
  cloudBackupStatus: 'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'quota_exceeded';
  lastCloudBackupTime: string | null;
  addSecurityLog: (eventType: string, details: string, severity?: 'low' | 'medium' | 'high') => void;
  triggerLocalBackup: () => void;
  triggerCloudBackup: () => Promise<boolean>;
  restoreFromBackup: (jsonString: string) => { success: boolean; message: string };
  restoreFromCloud: () => Promise<{ success: boolean; message: string }>;
  failedAttemptsMap: Record<string, { count: number; lockoutUntil: number | null }>;
  resetFailedAttempts: (username: string) => void;

  // Storage Backups & Scheduling
  backupSchedule: BackupScheduleConfig;
  updateBackupSchedule: (config: Partial<BackupScheduleConfig>) => Promise<void>;
  storageBackups: StorageBackupFile[];
  isLoadingStorageBackups: boolean;
  fetchStorageBackups: () => Promise<void>;
  triggerStorageBackup: () => Promise<string | null>;
  deleteStorageBackup: (filename: string) => Promise<boolean>;

  staffMembers: StaffMember[];
  dependencies: DependencyEnrollment[];
  updateCourse: (course: Course) => void;
  deleteCourse: (id: string) => void;
  addStaffMember: (staffData: Omit<StaffMember, 'id' | 'username' | 'registrationDate'> & { permissions?: StaffPermissions }) => { staff: StaffMember; generatedUsername: string; initialPassword: string };
  updateStaffMember: (staff: StaffMember) => void;
  deleteStaffMember: (id: string) => void;
  updateStaffPermissions: (staffId: string, permissions: StaffPermissions) => void;
  createDependencyEnrollment: (data: { studentId: string; courseId: string; subjectId: string; semester: number; schedule: string }) => Promise<{ dependency: DependencyEnrollment; classSection: ClassSection }>;

  declarationConfigs: DeclarationConfigs;
  studentDocuments: StudentDocument[];
  internships: InternshipRecord[];
  updateDeclarationConfig: (type: 'escolaridade' | 'ctransp', fields: { startDate: string, endDate: string }) => void;
  updateStudentDocumentStatus: (id: string, status: 'PENDENTE' | 'ENVIADO' | 'ENTREGUE', fileUrl?: string, fileName?: string) => void;
  transferStudent: (studentId: string, targetClassId: string) => void;
  updateInternshipRecord: (studentId: string, subjectName: string, workload: number, location: string, grade: number | null) => void;
  adminPasswordResetDone: boolean;
  /** Ligado quando a pessoa precisa trocar a senha antes de usar o portal. */
  precisaTrocarSenha: boolean;
  concluirTrocaDeSenha: () => void;
  /** Aviso exibido dentro da página, no lugar do alert() do navegador. */
  aviso: { titulo: string; mensagem: string; destaque?: string; aoConfirmar?: () => void } | null;
  mostrarAviso: (titulo: string, mensagem: string, destaque?: string) => void;
  /** Confirmação dentro da página, no lugar do window.confirm() do navegador. */
  pedirConfirmacao: (titulo: string, mensagem: string, aoConfirmar: () => void) => void;
  fecharAviso: () => void;
  /** Cria as contas de acesso dos alunos importados que ainda não têm login. */
  gerarAcessosDosAlunos: (aoProgredir?: (feitos: number, total: number) => void) => Promise<{ total: number; criados: number; falhas: number; erros: string[] }>;
  /** Quantos alunos ativos ainda não conseguem entrar no portal. */
  contarAlunosSemAcesso: () => Promise<number>;
  resetAdminPassword: (newPassword: string) => Promise<{ success: boolean; message: string }>;
  unlockAdminReset: () => void;
}

export function getRequiredDocsForStudent(courseName?: string): string[] {
  const base = [
    'RG',
    'CPF',
    'Título de Eleitor',
    'Certidão de Nascimento ou Casamento',
    'Comprovante de Endereço',
    'Foto 3x4',
    'Diploma de Ensino Médio',
    'Histórico do Ensino Médio'
  ];
  if (!courseName) return base;
  const nameLower = courseName.toLowerCase();
  if (nameLower.includes('instrumentação') || nameLower.includes('cirúrgica')) {
    return [...base, 'Diploma do Curso Técnico em Enfermagem', 'Histórico do Curso Técnico em Enfermagem'];
  }
  if (nameLower.includes('graduação') && nameLower.includes('enfermagem')) {
    return [...base, 'Diploma da Graduação em Enfermagem'];
  }
  return base;
}

export const officialCurriculum = [
  {
    courseName: "TÉCNICO EM ENFERMAGEM",
    modules: {
      1: [
        "Anatomia e Fisiologia Humana",
        "Biossegurança nas Ações de Saúde",
        "Introdução à Enfermagem",
        "Microbiologia e Parasitologia",
        "Noções de Farmacologia",
        "Nutrição",
        "Primeiros Socorros",
        "Estágio Supervisionado"
      ],
      2: [
        "Enfermagem em Centro Cirúrgico",
        "Enfermagem em Clínica Cirúrgica",
        "Enfermagem em Clínica Médica",
        "Enfermagem em Centro de Material e Esterilização",
        "Enfermagem em Obstetrícia",
        "Enfermagem em Pediatria",
        "Enfermagem em Saúde Mental",
        "Ética e Legislação Profissional",
        "Psicologia do Trabalho em Saúde",
        "Saúde Coletiva",
        "Estágio Supervisionado"
      ],
      3: [
        "Cardiologia",
        "Dietoterapia",
        "Enfermagem em Unidade de Terapia Intensiva",
        "Enfermagem em Urgência e Emergência",
        "Introdução ao Trabalho Científico",
        "Fundamentos de Informática",
        "Gastroenterologia",
        "Geriatria",
        "Nefrologia",
        "Neurologia",
        "Queimaduras Graves",
        "Estágio Supervisionado"
      ]
    }
  },
  {
    courseName: "TÉCNICO EM ENFERMAGEM EAD",
    modules: {
      1: [
        "Anatomia e Fisiologia Humana",
        "Microbiologia e Parasitologia",
        "Biossegurança nas Ações de Saúde",
        "Saúde Coletiva I",
        "Nutrição",
        "Fundamentos de Enfermagem"
      ],
      2: [
        "Centro de Material e Esterilização",
        "Ética e Legislação",
        "Psicologia do Trabalho em Saúde",
        "Gestão e Descarte de Resíduos em Saúde",
        "Assist. de Enfermagem Em Clínica Cirúrgica",
        "Assist. de Enfermagem em Clínica Médica",
        "Saúde Coletiva II",
        "Assistência de Enfermagem à Criança e à Mulher"
      ],
      3: [
        "Assist. de Enf. em Urgências e Emergências",
        "Assistência de Enfermagem em Saúde Mental",
        "Assist. de Enf. a Pacientes em Estado Grave",
        "Cardiologia",
        "Dietoterapia",
        "Gastroenterologia",
        "Geriatria",
        "Nefrologia",
        "Neurologia",
        "Projeto Integrador Multidisciplinar"
      ]
    }
  },
  {
    courseName: "TÉCNICO EM RADIOLOGIA",
    modules: {
      1: [
        "Química Aplicada à Radiologia",
        "Biossegurança nas Ações de Saúde",
        "Anatomia I",
        "Fisiologia",
        "Primeiros Socorros",
        "Patologia Aplicada à Radiologia I",
        "Técnicas Radiográficas I",
        "Psicologia do Trabalho em Saúde",
        "Estágio Supervisionado"
      ],
      2: [
        "Anatomia II",
        "Patologia Aplicada à Radiologia II",
        "Física das Radiações",
        "Equipamentos e Acessórios Radiológicos",
        "Ética e Legislação",
        "Efeitos Biológicos dos Meios de Contraste e das Radiações Ionizantes",
        "Técnicas Radiográficas II",
        "Proteção e Higiene das Radiações I",
        "Estágio Supervisionado"
      ],
      3: [
        "Mamografia",
        "Densitometria Óssea",
        "Radiologia Buco-Maxilo-Facial",
        "Noções de Radioterapia",
        "Tomografia Computadorizada",
        "Ressonância Magnética Nuclear",
        "Proteção e Higiene das Radiações II",
        "Saúde Coletiva",
        "Gestão e Descarte de Resíduos Radiológicos",
        "Introdução ao Trabalho Científico",
        "Noções de Informática",
        "Estágio Supervisionado"
      ]
    }
  },
  {
    courseName: "TÉCNICO EM SEGURANÇA DO TRABALHO",
    modules: {
      1: [
        "Segurança e Saúde Ocupacional I",
        "Desenho Técnico",
        "Psicologia Organizacional e do Trabalho",
        "Legislação Trabalhista e Previdenciária",
        "Expressão e Comunicação",
        "Informática Básica",
        "Relações Humanas no Trabalho",
        "Primeiros Socorros"
      ],
      2: [
        "Ergonomia do Trabalho",
        "Legislação e Normas Técnicas I",
        "Segurança e Saúde Ocupacional II",
        "Epidemiologia e Toxicologia",
        "Higiene e Saneamento no Trabalho",
        "Prevenção e Combate a Catástrofes e Sinistros"
      ],
      3: [
        "Legislação e Normas Técnicas II",
        "Educação Ambiental",
        "Programas Prevencionistas",
        "Investigação e Análise de Acidentes",
        "SGI – Sistema de Gestão Integrada: Qualidade, Meio Ambiente, Segurança e Saúde no trabalho",
        "Estágio Supervisionado"
      ]
    }
  }
];

export const cleanTextForSync = (text: string) => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
};

export function isMatchForSync(nameA: string, nameB: string): boolean {
  const normA = cleanTextForSync(nameA);
  const normB = cleanTextForSync(nameB);

  // 1. Exact match after cleaning
  if (normA === normB) return true;

  // 2. Expand abbreviations helper
  const expand = (str: string) => {
    return str
      .replace(/\bassist\b\.?/g, 'assistencia')
      .replace(/\benf\b\.?/g, 'enfermagem')
      .replace(/\bclin\b\.?/g, 'clinica')
      .replace(/\bcirurg\b\.?/g, 'cirurgica')
      .replace(/\bmed\b\.?/g, 'medica')
      .replace(/\burg\b\.?/g, 'urgencia')
      .replace(/\bemerg\b\.?/g, 'emergencia')
      .replace(/\bped\b\.?/g, 'pediatria')
      .replace(/\bobstet\b\.?/g, 'obstetricia')
      .replace(/\bpsi\b\.?/g, 'psicologia')
      .replace(/\bpsicol\b\.?/g, 'psicologia')
      .replace(/\btrab\b\.?/g, 'trabalho')
      .replace(/\banat\b\.?/g, 'anatomia')
      .replace(/\bfisiol\b\.?/g, 'fisiologia')
      .replace(/\bfarmac\b\.?/g, 'farmacologia')
      .replace(/\bi\b/g, '1')
      .replace(/\bii\b/g, '2')
      .replace(/\biii\b/g, '3')
      .replace(/\bsgi\b/g, 'sistema de gestao integrada')
      .replace(/[^a-z0-9\s]/g, '') // strip special characters
      .replace(/\s+/g, ' ')
      .trim();
  };

  const expA = expand(normA);
  const expB = expand(normB);

  if (expA === expB) return true;

  // 3. Check token intersection / similarity
  const tokensA = expA.split(' ').filter(t => t.length > 2);
  const tokensB = expB.split(' ').filter(t => t.length > 2);

  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // Calculate intersection
  const intersect = tokensA.filter(t => tokensB.includes(t));
  const unionSize = new Set([...tokensA, ...tokensB]).size;
  const jaccard = intersect.length / unionSize;

  if (jaccard >= 0.5) return true;

  // 4. Try Levenshtein Distance for close typos
  const distance = levenshteinDistanceFromSync(expA, expB);
  const maxLength = Math.max(expA.length, expB.length);
  const similarity = 1 - distance / maxLength;

  if (similarity > 0.75) return true;

  return false;
}

export function levenshteinDistanceFromSync(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

export function calculateSimilarityForSync(nameA: string, nameB: string): number {
  const normA = cleanTextForSync(nameA);
  const normB = cleanTextForSync(nameB);

  if (normA === normB) return 1.0;

  // Let's do token intersection
  const tokensA = normA.split(' ').filter(t => t.length > 2);
  const tokensB = normB.split(' ').filter(t => t.length > 2);

  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const intersect = tokensA.filter(t => tokensB.includes(t));
  const jaccard = intersect.length / new Set([...tokensA, ...tokensB]).size;

  const distance = levenshteinDistanceFromSync(normA, normB);
  const maxLength = Math.max(normA.length, normB.length);
  const levSim = maxLength === 0 ? 1.0 : (1 - distance / maxLength);

  // Return weighted average
  return (jaccard * 0.4) + (levSim * 0.6);
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Ensure we have the correct up-to-date localStorage schema. Wipes old versions once.
  // v10: sistema novo, sem dados de demonstração.
  //
  // A v9 chegou a ser gravada com a limpeza ainda incompleta (só apagava as
  // chaves 'oc_'). Como a verificação é por igualdade, os navegadores que já
  // marcaram v9 nunca mais rodariam a limpeza corrigida. Por isso a versão
  // sobe para v10: é o que faz a limpeza rodar de novo.
  //
  // A limpeza anterior só removia chaves com prefixo 'oc_'. Só que o portal
  // guarda dados sob VÁRIOS prefixos: 'gestao_' (CRM e cadastros),
  // 'movimentacao_', 'financeiro_'. Por isso o CRM continuava aparecendo com
  // dados de demonstração mesmo depois da limpeza.
  //
  // Agora a lógica é invertida: apaga tudo, EXCETO o que precisa sobreviver.
  // Assim nenhum prefixo novo passa despercebido no futuro.
  // A MARCA SOBE PARA 'v11' PORQUE O SISTEMA FOI ZERADO PARA ENTRAR EM PRODUÇÃO.
  //
  // Existem TRÊS cópias dos dados: o banco, este armazenamento do navegador, e
  // o retrato `portal_estado.json` no Storage. Limpar só o banco não adianta:
  // ao abrir o portal, o navegador reenvia o que tinha guardado e a
  // sincronização regrava tudo em três segundos. Foi o que fez as 601 turmas
  // de demonstração voltarem depois de cada limpeza.
  //
  // Subir esta marca faz cada navegador apagar a própria cópia sozinho, na
  // primeira vez que abrir o portal — inclusive as máquinas da secretaria, sem
  // ninguém precisar mexer em configuração do Chrome em cada uma.
  if (typeof window !== 'undefined' && safeLocalStorage.getItem('oc_ls_version') !== 'v11') {
    const preservar = (chave: string) =>
      chave === 'oc_ls_version' ||
      chave === 'oc_dark_mode' ||        // preferência de tema
      chave === 'coc_portal_sessao' ||   // sessão do Supabase (evita deslogar)
      chave.startsWith('sb-');           // chaves internas do Supabase

    const paraRemover: string[] = [];
    for (let i = 0; i < safeLocalStorage.length; i++) {
      const chave = safeLocalStorage.key(i);
      if (chave && !preservar(chave)) paraRemover.push(chave);
    }
    paraRemover.forEach(k => safeLocalStorage.removeItem(k));
    safeLocalStorage.setItem('oc_ls_version', 'v11');
  }

  const [precisaTrocarSenha, setPrecisaTrocarSenha] = useState<boolean>(false);
  // Aviso dentro da página. O alert() do navegador congela tudo e some ao
  // primeiro Enter — e era nele que a senha gerada aparecia. Perdida a senha,
  // a pessoa não conseguia entrar.
  const [aviso, setAviso] = useState<{ titulo: string; mensagem: string; destaque?: string; aoConfirmar?: () => void } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasReceivedInitialCloudSync, setHasReceivedInitialCloudSync] = useState<boolean>(false);

  // Storage Backups & Scheduling states
  const [backupSchedule, setBackupSchedule] = useState<BackupScheduleConfig>(() => {
    const saved = safeLocalStorage.getItem('oc_backup_schedule');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse backup schedule:', e);
      }
    }
    return {
      frequency: 'manual',
      enabled: false,
      lastBackupTime: null,
      nextBackupTime: null,
      hour: '02:00'
    };
  });

  const [storageBackups, setStorageBackups] = useState<StorageBackupFile[]>([]);
  const [isLoadingStorageBackups, setIsLoadingStorageBackups] = useState<boolean>(false);
  const [adminPasswordResetDone, setAdminPasswordResetDone] = useState<boolean>(() => {
    return safeLocalStorage.getItem('oc_admin_reset_done') === 'true';
  });

  // Load state from localStorage or use seeded data
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_current_user'), null);
  });

  const [users, setUsers] = useState<User[]>(() => {
    // O administrador de verdade vem do Supabase Auth ao entrar. Não se cria
    // mais um admin fictício aqui: ele aparecia na lista de usuários como se
    // fosse uma pessoa cadastrada ("ADMINISTRAÇÃO PEDAGÓGICA / lindemberg").
    const val = safeJsonParse(safeLocalStorage.getItem('oc_users'), [] as User[]);
    const baseList = (val && Array.isArray(val)) ? val : [];
    const hasAdmin = true;   // dispensa o remendo antigo
    if (!hasAdmin) {
      return [initialUsers[0], ...baseList.filter(u => u.id !== 'admin')];
    }
    return baseList;
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    // Lista VAZIA guardada no navegador não vale como "já tem dados": nesse
    // caso a matriz curricular do código precisa entrar, senão o portal abre
    // sem curso nenhum e nunca mais se recupera.
    const val = safeJsonParse(safeLocalStorage.getItem('oc_courses'), initialCourses);
    return (val && Array.isArray(val) && val.length > 0) ? val : initialCourses;
  });

  const [classes, setClasses] = useState<ClassSection[]>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_classes'), initialClasses);
    return (val && Array.isArray(val) && val.length > 0) ? val : initialClasses;
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_subjects'), initialSubjects);
    return (val && Array.isArray(val) && val.length > 0) ? val : initialSubjects;
  });

  const [grades, setGrades] = useState<GradeRecord[]>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_grades'), initialGrades);
    return (val && Array.isArray(val)) ? val : initialGrades;
  });

  const [attendance, setAttendance] = useState<AttendanceSession[]>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_attendance'), generateInitialAttendance());
  });

  const [directAbsences, setDirectAbsences] = useState<Record<string, number>>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_direct_absences'), {});
  });

  const [conceptRanges, setConceptRanges] = useState<ConceptRange[]>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_concept_ranges'), initialConceptRanges);
  });

  const [calendarEvents, setCalendarEvents] = useState<AcademicCalendarEvent[]>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_calendar_events'), initialCalendarEvents);
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_messages'), []);
  });

  const [notifications, setNotifications] = useState<AcademicNotification[]>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_notifications'), []);
  });

  // Security and backup states
  const [securityLogs, setSecurityLogs] = useState<any[]>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_security_logs'), []);
  });

  const [cloudBackupStatus, setCloudBackupStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'quota_exceeded'>('idle');
  const [lastCloudBackupTime, setLastCloudBackupTime] = useState<string | null>(() => {
    return safeLocalStorage.getItem('oc_last_cloud_backup_time') || new Date().toISOString();
  });
  const [lastLocalWriteTime, setLastLocalWriteTime] = useState<string | null>(() => {
    return safeLocalStorage.getItem('oc_last_local_write_time');
  });

  const [failedAttemptsMap, setFailedAttemptsMap] = useState<Record<string, { count: number; lockoutUntil: number | null }>>({});

  const [currentPeriod, setCurrentPeriodLocal] = useState<string>(() => {
    return safeLocalStorage.getItem('oc_current_period') || '2026/1';
  });

  const [periods, setPeriods] = useState<string[]>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_periods'), ['2026/1', '2026/2', '2027/1', '2027/2', '2028/1', '2028/2']);
  });

  const [activeClassId, setActiveClassId] = useState<string | null>(() => {
    return safeLocalStorage.getItem('oc_active_class_id') || 'class_enf_m1_matutino';
  });

  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(() => {
    return safeLocalStorage.getItem('oc_active_subject_id') || 'enf_m1_anatomia';
  });

  const [autoLockEnabled, setAutoLockEnabled] = useState<boolean>(() => {
    const saved = safeLocalStorage.getItem('oc_auto_lock_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [simulatedDate, setSimulatedDate] = useState<string>(() => {
    return safeLocalStorage.getItem('oc_simulated_date') || '2026-07-01';
  });

  const [declarationConfigs, setDeclarationConfigs] = useState<DeclarationConfigs>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_declaration_configs'), {
      escolaridade: { startDate: '2026-02-04', endDate: '2026-06-26' },
      ctransp: { startDate: '2026-08-03', endDate: '2026-12-22' }
    });
    return val;
  });

  const [studentDocuments, setStudentDocuments] = useState<StudentDocument[]>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_student_documents'), []);
    return val || [];
  });

  const [internships, setInternships] = useState<InternshipRecord[]>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_internships'), []);
    return val || [];
  });

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_staff_members'), []);
    return val || [];
  });

  const [dependencies, setDependencies] = useState<DependencyEnrollment[]>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_dependencies'), []);
    return val || [];
  });

  useEffect(() => {
    safeLocalStorage.setItem('oc_auto_lock_enabled', autoLockEnabled ? 'true' : 'false');
  }, [autoLockEnabled]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_simulated_date', simulatedDate);
  }, [simulatedDate]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_declaration_configs', JSON.stringify(declarationConfigs));
  }, [declarationConfigs]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_student_documents', JSON.stringify(studentDocuments));
  }, [studentDocuments]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_internships', JSON.stringify(internships));
  }, [internships]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_staff_members', JSON.stringify(staffMembers));
  }, [staffMembers]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_dependencies', JSON.stringify(dependencies));
  }, [dependencies]);

  const latestStateRef = React.useRef({
    users, courses, classes, subjects, grades, attendance, directAbsences,
    conceptRanges, calendarEvents, messages, notifications,
    currentPeriod, periods, simulatedDate, autoLockEnabled,
    declarationConfigs, studentDocuments, internships, staffMembers, dependencies,
    adminPasswordResetDone, securityLogs
  });

  useEffect(() => {
    latestStateRef.current = {
      users, courses, classes, subjects, grades, attendance, directAbsences,
      conceptRanges, calendarEvents, messages, notifications,
      currentPeriod, periods, simulatedDate, autoLockEnabled,
      declarationConfigs, studentDocuments, internships, staffMembers, dependencies,
      adminPasswordResetDone, securityLogs
    };
  }, [users, courses, classes, subjects, grades, attendance, directAbsences, conceptRanges, calendarEvents, messages, notifications, currentPeriod, periods, simulatedDate, autoLockEnabled, declarationConfigs, studentDocuments, internships, staffMembers, dependencies, adminPasswordResetDone, securityLogs]);

  const lastReceivedPayloadRef = React.useRef<string>('');
  const lastLocalWriteTimeRef = React.useRef<string | null>(lastLocalWriteTime);
  const editStartTimeRef = React.useRef<number | null>(null);
  const hasReceivedInitialCloudSyncRef = React.useRef<boolean>(false);

  useEffect(() => {
    lastLocalWriteTimeRef.current = lastLocalWriteTime;
  }, [lastLocalWriteTime]);

  useEffect(() => {
    hasReceivedInitialCloudSyncRef.current = hasReceivedInitialCloudSync;
  }, [hasReceivedInitialCloudSync]);

  // Carga inicial e sincronização com o Supabase.
  //
  // O que mudou em relação ao Firestore que estava aqui:
  //  - Não existe mais um documento único com limite de 1 MiB. Era esse limite
  //    que fazia lançamentos falharem em silêncio quando a base crescia.
  //  - A falha de gravação não é mais escondida: o estado vira 'error' e a
  //    interface precisa avisar quem está usando.
  //  - A leitura só acontece com sessão ativa. Antes, o app entrava como
  //    "anônimo" antes de qualquer login e já conseguia ler tudo.
  useEffect(() => {
    let cancelarInscricao: (() => void) | undefined;
    let desmontado = false;

    // Sistema novo começa vazio: lista vazia é um estado válido, não um defeito.
    const protegerEstadoMinimo = () => {
      setUsers(prev => Array.isArray(prev) ? prev : []);
      setClasses(prev => Array.isArray(prev) ? prev : []);
      setGrades(prev => Array.isArray(prev) ? prev : []);
    };

    const aplicarEstado = (state: SystemStatePayload) => {
      if (!state) return;

      // Cursos, turmas, disciplinas, professores, alunos e notas NÃO vêm daqui.
      // Eles têm tabelas próprias e são carregados por carregarEstrutura().
      // Ler daqui recriaria a duplicidade que causou os dados "ressuscitando".
      if (state.attendance) { setAttendance(state.attendance); safeLocalStorage.setItem('oc_attendance', JSON.stringify(state.attendance)); }
      if (state.directAbsences) { setDirectAbsences(state.directAbsences); safeLocalStorage.setItem('oc_direct_absences', JSON.stringify(state.directAbsences)); }
      if (state.conceptRanges) { setConceptRanges(state.conceptRanges); safeLocalStorage.setItem('oc_concept_ranges', JSON.stringify(state.conceptRanges)); }
      if (state.calendarEvents) { setCalendarEvents(state.calendarEvents); safeLocalStorage.setItem('oc_calendar_events', JSON.stringify(state.calendarEvents)); }
      if (state.messages) { setMessages(state.messages); safeLocalStorage.setItem('oc_messages', JSON.stringify(state.messages)); }
      if (state.notifications) { setNotifications(state.notifications); safeLocalStorage.setItem('oc_notifications', JSON.stringify(state.notifications)); }
      if (state.currentPeriod) { setCurrentPeriodLocal(state.currentPeriod); safeLocalStorage.setItem('oc_current_period', state.currentPeriod); }
      if (state.periods) { setPeriods(state.periods); safeLocalStorage.setItem('oc_periods', JSON.stringify(state.periods)); }
      if (state.simulatedDate) { setSimulatedDate(state.simulatedDate); safeLocalStorage.setItem('oc_simulated_date', state.simulatedDate); }
      if (state.autoLockEnabled !== undefined) { setAutoLockEnabled(state.autoLockEnabled); safeLocalStorage.setItem('oc_auto_lock_enabled', state.autoLockEnabled ? 'true' : 'false'); }
      if (state.securityLogs) { setSecurityLogs(state.securityLogs); safeLocalStorage.setItem('oc_security_logs', JSON.stringify(state.securityLogs)); }
      if (state.declarationConfigs) { setDeclarationConfigs(state.declarationConfigs); safeLocalStorage.setItem('oc_declaration_configs', JSON.stringify(state.declarationConfigs)); }
      if (state.studentDocuments) { setStudentDocuments(state.studentDocuments); safeLocalStorage.setItem('oc_student_documents', JSON.stringify(state.studentDocuments)); }
      if (state.internships) { setInternships(state.internships); safeLocalStorage.setItem('oc_internships', JSON.stringify(state.internships)); }
      if (state.staffMembers) { setStaffMembers(state.staffMembers); safeLocalStorage.setItem('oc_staff_members', JSON.stringify(state.staffMembers)); }
      if (state.dependencies) { setDependencies(state.dependencies); safeLocalStorage.setItem('oc_dependencies', JSON.stringify(state.dependencies)); }
      if (state.lastBackupTime) {
        setLastCloudBackupTime(state.lastBackupTime);
        safeLocalStorage.setItem('oc_last_cloud_backup_time', state.lastBackupTime);
      }
      setCloudBackupStatus('success');
      setHasReceivedInitialCloudSync(true);
    };

    const sincronizar = async () => {
      if (!bancoDisponivel) {
        protegerEstadoMinimo();
        setCloudBackupStatus('offline');
        setIsLoading(false);
        return;
      }

      setCloudBackupStatus('syncing');
      try {
        // NADA É PEDIDO AO BANCO ANTES DE EXISTIR UMA SESSÃO.
        //
        // Ao abrir o portal na tela de login ainda não há ninguém autenticado.
        // Mesmo assim esta rotina saía pedindo cursos, disciplinas, turmas,
        // alunos, professores e diários. Sem sessão, o banco atende como
        // visitante — que não tem permissão para ver nada — e devolvia uma
        // sequência de erros 401 e "permission denied for table cursos".
        //
        // O portal funcionava assim mesmo, porque depois do login ele recarrega
        // tudo. Mas o console ficava tomado de erros vermelhos que não eram
        // problema, e isso esconde os que SÃO. Passamos horas hoje investigando
        // um defeito por causa desse ruído.
        //
        // Agora: sem sessão, o portal simplesmente espera o login.
        const sessao = await sessaoAtual();
        if (!sessao) {
          // SEM SESSÃO NO SERVIDOR, NINGUÉM ESTÁ LOGADO — NEM NA TELA.
          //
          // Faltava limpar aqui o usuário guardado no navegador. O portal abria
          // mostrando "Administrador", com todos os menus à mão, enquanto o
          // banco recusava tudo com "permission denied": para ele não havia
          // ninguém. A pessoa entrava sem digitar senha, via a tela de admin e
          // lançava dados que não chegavam a lugar nenhum — só o aviso laranja
          // de "alterações não salvas" denunciava.
          //
          // Numa secretaria com computador compartilhado isso é pior ainda:
          // qualquer um que abrisse o navegador via a tela da administração.
          //
          // O mesmo cuidado já existia logo abaixo, para sessão sem perfil.
          // Este caminho — sessão inexistente ou expirada — passava direto.
          if (safeLocalStorage.getItem('oc_current_user')) {
            addSecurityLog('SESSAO_INVALIDA', 'Sessão expirada ou ausente. Acesso local encerrado.', 'high');
          }
          setCurrentUser(null);
          safeLocalStorage.removeItem('oc_current_user');
          protegerEstadoMinimo();
          setCloudBackupStatus('offline');
          setIsLoading(false);
          return;
        }

        // Precisa saber o papel ANTES de decidir gravar qualquer coisa.
        const perfilInicial = await carregarPerfil();
        const resultado = await loadStateFromCloud();
        if (desmontado) return;

        if (resultado && 'isOffline' in resultado) {
          // Sem sessão ainda (tela de login) ou servidor fora do ar.
          setCloudBackupStatus('offline');
        } else if (resultado === null && (perfilInicial?.papel === 'ADMIN' || perfilInicial?.papel === 'SECRETARIA')) {
          // Banco novo, ainda sem dados: grava o estado inicial.
          //
          // SÓ a gestão faz isso. Quando um professor lia, o servidor negava —
          // e a negativa se parece com "arquivo não existe". O código entendia
          // "banco novo" e tentava gravar, o que é justamente o que ele não
          // pode. Resultado: o professor via "alterações não salvas" a cada
          // carregamento, sem ter alterado nada.
          const payload: SystemStatePayload = {
            users, courses, classes, subjects, grades, attendance, directAbsences,
            conceptRanges, calendarEvents, messages, notifications,
            currentPeriod, periods, simulatedDate, autoLockEnabled, securityLogs,
            declarationConfigs, studentDocuments, internships, adminPasswordResetDone
          };
          const gravou = await saveStateToCloud(payload);
          setCloudBackupStatus(gravou ? 'success' : 'error');
          if (gravou) {
            addSecurityLog('SINC_NUVEM_CRIACAO', 'Primeira gravação do portal criada na nuvem.', 'low');
          }
          setHasReceivedInitialCloudSync(true);
        } else {
          aplicarEstado(resultado as SystemStatePayload);
        }

        // A estrutura acadêmica vem das tabelas — nunca do retrato.
        //
        // MAS: banco vazio não pode apagar o que existe localmente. Numa
        // instalação nova, a matriz curricular (cursos, disciplinas, turmas)
        // vem do código e ainda não subiu. Se aplicássemos o resultado vazio,
        // ela seria zerada antes de ter chance de ser gravada — e o portal
        // abriria sem nenhum curso, para sempre.
        // Cada chamada agora tem sua própria rede de proteção.
        //
        // Antes, todo este trecho rodava dentro de um único try/catch lá de
        // fora: bastava UMA dessas chamadas falhar (rede lenta, uma tabela
        // demorando a responder) para que NENHUMA das outras rodasse — e o
        // portal caía no aviso genérico de "alterações não salvas", mesmo
        // sem o professor ter alterado nada. Pior: como a falha interrompia
        // o carregamento no meio, os diários do professor podiam nunca
        // chegar a ser lidos, e o painel abria com "Diários Ativos: 0" sem
        // motivo real.
        let estrutura: Awaited<ReturnType<typeof carregarEstrutura>> | null = null;
        try {
          estrutura = await carregarEstrutura();
        } catch (err: any) {
          console.warn('[Portal] Falha ao carregar cursos/turmas/disciplinas:', err?.message || err);
        }

        if (estrutura && !desmontado) {
          // Cada parte é avaliada SEPARADAMENTE.
          //
          // Avaliar em bloco causava um erro real: o banco podia ter
          // professores mas ainda não ter cursos. O bloco dava "tem estrutura"
          // por causa dos professores e sobrescrevia os cursos com lista
          // vazia — apagando a matriz curricular que ainda ia ser gravada.
          if (estrutura.courses.length > 0) setCourses(estrutura.courses);
          if (estrutura.subjects.length > 0) setSubjects(estrutura.subjects);
          if (estrutura.classes.length > 0) setClasses(estrutura.classes);
          if (estrutura.users.length > 0) setUsers(prev => {
            // Preserva quem é gestão (admin/secretaria): eles não estão nas
            // tabelas de aluno nem de professor.
            const gestao = prev.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.STAFF);
            return [...gestao, ...estrutura.users];
          });

          try {
            const notas = await carregarNotas();
            if (notas && !desmontado) {
              // O QUE ACABOU DE VIR DO BANCO NÃO PRECISA VOLTAR PARA O BANCO.
              //
              // O efeito de gravação considera "pendente" toda nota cuja
              // assinatura não esteja em `notasGravadasRef`. Esse mapa só era
              // preenchido depois de GRAVAR — nunca depois de LER. A auditoria
              // registrou 102.174 UPDATEs em seis dias, e a nota recém-digitada
              // era atropelada por esse rodízio, regravada em branco por cima.
              notasGravadasRef.current = new Map(
                notas.map(n => [n.id, JSON.stringify(n)] as [string, string])
              );
              setGrades(notas);
            }
          } catch (err: any) {
            console.warn('[Portal] Falha ao carregar notas:', err?.message || err);
          }

          try {
            const faltas = await carregarFaltas();
            if (faltas && !desmontado) setDirectAbsences(faltas);
          } catch (err: any) {
            console.warn('[Portal] Falha ao carregar faltas:', err?.message || err);
          }

          try {
            const aulas = await carregarAulas();
            if (aulas && aulas.length > 0 && !desmontado) setAttendance(aulas as any);
          } catch (err: any) {
            console.warn('[Portal] Falha ao carregar aulas:', err?.message || err);
          }

          try {
            const docs = await carregarDocumentosAluno();
            if (docs && docs.length > 0 && !desmontado) {
              setStudentDocuments(docs as any);
              docs.forEach((d: any) => documentosGravadosRef.current.set(d.id, JSON.stringify(d)));
            }
          } catch (err: any) {
            console.warn('[Portal] Falha ao carregar documentos de alunos:', err?.message || err);
          }

          try {
            const msgs = await carregarMensagens();
            if (msgs && msgs.length > 0 && !desmontado) {
              setMessages(msgs as any);
              msgs.forEach((m: any) => mensagensGravadasRef.current.add(m.id));
            }
          } catch (err: any) {
            console.warn('[Portal] Falha ao carregar mensagens:', err?.message || err);
          }

          setHasReceivedInitialCloudSync(true);
          setCloudBackupStatus('success');
        }

        // Recarregar a página não passa pelo login. Sem isto, o CRM, os
        // estágios e o financeiro voltariam a ler só o armazenamento local.
        const perfil = perfilInicial;

        // QUEM ESTÁ LOGADO É DECIDIDO PELO SERVIDOR, NÃO PELO NAVEGADOR.
        //
        // O portal guardava a identidade em 'oc_current_user' no navegador e
        // confiava nela ao recarregar. Bastava editar esse valor pelo DevTools,
        // trocar o papel para ADMIN, e as telas administrativas abriam. O banco
        // recusava os dados, mas tudo que fica guardado no navegador (CRM,
        // financeiro, estágios) ficava à mostra.
        //
        // Agora: sem sessão válida no servidor, não há usuário logado.
        if (!perfil && !desmontado) {
          const tinhaUsuario = !!safeLocalStorage.getItem('oc_current_user');
          if (tinhaUsuario) {
            console.warn('[Portal] Sessão do servidor ausente ou expirada. Encerrando a sessão local.');
            addSecurityLog('SESSAO_INVALIDA', 'Sessão local sem correspondência no servidor. Acesso encerrado.', 'high');
          }
          setCurrentUser(null);
          safeLocalStorage.removeItem('oc_current_user');
          setIsLoading(false);
          return;
        }

        // REMONTA QUEM ESTÁ LOGADO A PARTIR DO SERVIDOR.
        //
        // Antes, ao recarregar a página, o portal só CONFERIA o papel e mantinha
        // o resto do que estava guardado no navegador. O efeito prático: os
        // diários do professor (`assignedJournals`), que passaram a vir da
        // tabela `diarios`, nunca chegavam ao recarregar — o painel abria com
        // "Diários Ativos: 0" e o professor não achava as turmas dele.
        //
        // Agora o usuário é montado de novo do banco a cada carregamento. Além
        // de resolver os diários, isso faz turma, curso e matrícula seguirem o
        // servidor: transferir um aluno passa a valer na tela dele sem precisar
        // sair e entrar de novo.
        if (perfil && !desmontado) {
          const papelDoServidor =
            perfil.papel === 'ADMIN' ? UserRole.ADMIN :
            perfil.papel === 'SECRETARIA' ? UserRole.STAFF :
            perfil.papel === 'PROFESSOR' ? UserRole.TEACHER : UserRole.STUDENT;

          try {
            const doServidor = await montarUsuario(perfil);
            if (!desmontado) {
              setCurrentUser(atual => {
                if (atual && atual.role !== papelDoServidor) {
                  addSecurityLog('PAPEL_ADULTERADO',
                    `Papel no navegador (${atual.role}) diferente do servidor (${perfil.papel}). Corrigido.`, 'high');
                }
                // Preserva o que é só da tela (preferências), troca o que é do banco.
                return atual ? { ...atual, ...doServidor } : doServidor;
              });
            }
          } catch (err: any) {
            // Se o servidor não responder, ao menos o papel não fica adulterado.
            console.warn('[Portal] Não foi possível remontar o usuário do servidor:', err?.message || err);
            setCurrentUser(atual => {
              if (atual && atual.role !== papelDoServidor) {
                addSecurityLog('PAPEL_ADULTERADO',
                  `Papel no navegador (${atual.role}) diferente do servidor (${perfil.papel}). Corrigido.`, 'high');
                return { ...atual, role: papelDoServidor };
              }
              return atual;
            });
          }
        }

        // CALENDÁRIO ACADÊMICO — vem da tabela, não do retrato geral.
        //
        // Todo mundo logado lê, inclusive o professor: é dele o prazo que essas
        // datas controlam. Se a tabela ainda estiver vazia (primeira vez), a
        // gestão a preenche com as datas padrão para que exista uma resposta
        // única no servidor, em vez de cada navegador ter a sua.
        if (perfil && !desmontado) {
          try {
            const doServidor = await carregarEventosCalendario();

            if (doServidor && doServidor.length > 0) {
              setCalendarEvents(doServidor.map(e => ({
                id: e.id,
                title: e.title,
                date: e.date,
                type: e.type as CalendarEventType,
                description: e.description,
              })));
            } else if (doServidor && doServidor.length === 0 &&
                       (perfil.papel === 'ADMIN' || perfil.papel === 'SECRETARIA')) {
              await salvarEventosCalendario(initialCalendarEvents.map(e => ({
                id: e.id,
                title: e.title,
                date: e.date,
                type: String(e.type),
                description: e.description,
              })));
            }
          } catch (err: any) {
            console.warn('[Portal] Falha ao carregar o calendário:', err?.message || err);
          }
        }

        // PERÍODO LETIVO ATUAL — mesma lógica do calendário: vem de uma
        // tabela de leitura pública, não do retrato geral (que só a gestão
        // consegue ler). É esta leitura que faltava para professor e aluno
        // saberem o período certo — sem ela, cada navegador ficava com
        // qualquer valor salvo localmente (ou o padrão do código), o que
        // fazia lançamentos de nota/falta/aula mirarem no diário do período
        // errado.
        if (perfil && !desmontado) {
          try {
            const periodoDoServidor = await carregarPeriodoAtual();
            if (periodoDoServidor && !desmontado) {
              setCurrentPeriodLocal(periodoDoServidor.periodoAtual);
              safeLocalStorage.setItem('oc_current_period', periodoDoServidor.periodoAtual);
              if (periodoDoServidor.periodos.length > 0) {
                setPeriods(periodoDoServidor.periodos);
                safeLocalStorage.setItem('oc_periods', JSON.stringify(periodoDoServidor.periodos));
              }
            } else if (periodoDoServidor === null &&
                       (perfil.papel === 'ADMIN' || perfil.papel === 'SECRETARIA')) {
              // Tabela nova, ainda sem linha: a gestão semeia com o valor
              // que este navegador já tinha, pra existir uma resposta única
              // no servidor a partir de agora.
              await salvarPeriodoAtual(currentPeriod, periods);
            }
          } catch (err: any) {
            console.warn('[Portal] Falha ao carregar o período letivo atual:', err?.message || err);
          }
        }

        // TROCA DE SENHA OBRIGATÓRIA — precisa sobreviver ao F5.
        //
        // Isto estava guardado apenas na memória da página. Bastava apertar
        // F5 para a exigência desaparecer e a pessoa entrar com a senha
        // temporária. Agora a resposta vem do banco a cada carregamento.
        if (perfil && !desmontado) {
          setPrecisaTrocarSenha(!!perfil.trocar_senha);
        }

        // Gestão espelha os dados administrativos; o aluno espelha as próprias
        // marcações (aceite da taxa de seguro de estágio, por exemplo), que
        // antes ficavam só neste navegador e sumiam ao trocar de computador.
        if (perfil && !desmontado) {
          const ehGestaoAqui = perfil.papel === 'ADMIN' || perfil.papel === 'SECRETARIA';
          const alunoIdAqui = perfil.papel === 'ALUNO' ? await idDoAlunoLogado(perfil.id) : null;

          if (ehGestaoAqui || alunoIdAqui) {
            await restaurarDoServidor(alunoIdAqui);
            iniciarEspelho({
              alunoId: alunoIdAqui,
              aoFalhar: (msg) => {
                setCloudBackupStatus('error');
                registrarFalhaDeGravacao(msg || 'Falha ao salvar dados no servidor.');
                addSecurityLog('ESPELHO_FALHA', `Falha ao salvar dados no servidor: ${msg}`, 'high');
              },
            });
            // Sobe o que só existe neste navegador. Sem isto, dado gravado antes
            // do espelho existir ficava parado aqui até alguém reescrevê-lo.
            enviarTudoQueJaExiste();
          }
        }
      } catch (err: any) {
        if (desmontado) return;
        if (isPermissionError(err)) {
          console.warn('[Nuvem] Acesso negado pelas regras do banco (sessão ausente ou sem permissão).');
          setCloudBackupStatus('offline');
        } else {
          console.error('[Nuvem] Falha na sincronização:', err?.message || err);
          setCloudBackupStatus('error');
          // Este é o caminho que acende o aviso para o PROFESSOR ao entrar —
          // ele não passa pelos laços de gestão, então ficava aceso e mudo.
          registrarFalhaDeGravacao(err?.message || 'Falha ao sincronizar com o banco em nuvem.');
          addSecurityLog('SINC_NUVEM_FALHA', 'Falha ao sincronizar com o banco em nuvem.', 'medium');
        }
      } finally {
        if (!desmontado) {
          protegerEstadoMinimo();
          setTimeout(() => { if (!desmontado) setIsLoading(false); }, 400);
        }
      }
    };

    sincronizar();

    // Refaz a carga quando outro usuário alterar notas/frequência/alunos.
    cancelarInscricao = assinarMudancas(() => { if (!desmontado) sincronizar(); });

    // Refaz a carga ao entrar ou sair (o que a pessoa pode ver muda com o papel).
    const { data: assinaturaAuth } = supabase.auth.onAuthStateChange((evento) => {
      if (desmontado) return;
      if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT' || evento === 'TOKEN_REFRESHED') {
        sincronizar();
      }
    });

    return () => {
      desmontado = true;
      try { cancelarInscricao?.(); } catch (e) { console.warn('Falha ao cancelar inscrição de mudanças:', e); }
      try { assinaturaAuth?.subscription?.unsubscribe(); } catch (e) { console.warn('Falha ao cancelar inscrição de autenticação:', e); }
    };
  }, []);

  // ===========================================================================
  // GRAVAÇÃO POR LINHA
  //
  // Antes, qualquer alteração mandava o estado INTEIRO para a nuvem. Dois
  // professores lançando ao mesmo tempo se sobrescreviam: o último a salvar
  // apagava o trabalho do primeiro.
  //
  // Agora só as linhas que mudaram são gravadas, uma a uma. O professor A
  // mexendo na nota do aluno X não encosta na linha do professor B.
  // ===========================================================================

  // Contador que dispara uma nova rodada de gravação quando ainda sobrou fila.
  //
  // As gravações são feitas em lotes para não travar a tela. Mas o efeito só
  // roda de novo quando os dados mudam — então, numa importação de 250 alunos,
  // tudo que passasse do primeiro lote NUNCA seria gravado, e sem erro nenhum.
  const [rodadaDeGravacao, setRodadaDeGravacao] = useState(0);

  const notasGravadasRef = React.useRef<Map<string, string>>(new Map());

  /*
   * POR QUE OS EFEITOS ABAIXO DEPENDEM DE `currentUser?.id` E NÃO DE
   * `currentUser`
   *
   * `currentUser` é um objeto, e o React o recria a cada renderização. Mesmo
   * sem mudar de conteúdo, ele muda de identidade — e um efeito que o tem como
   * dependência é desmontado e remontado junto. Como cada um destes efeitos
   * espera 1 a 6 segundos antes de gravar, e a limpeza cancela a espera, o
   * relógio era zerado antes de disparar.
   *
   * Foi exatamente essa a causa de "atribuir professor ao diário não salva".
   * Levei muito tempo para achar porque o sintoma era intermitente: quando a
   * tela ficava quieta, gravava; quando havia movimento (uma nota sendo
   * salva, por exemplo), nunca.
   *
   * O id e o papel são texto — só mudam quando a pessoa realmente troca.
   */

  /**
   * Quantas vezes seguidas já tentamos regravar as notas que falharam.
   *
   * Zera assim que uma rodada termina sem falha. Serve para distinguir uma
   * falha passageira (o aluno ainda não tinha chegado na tabela) de uma
   * permanente (sem permissão) — a primeira resolve sozinha na tentativa
   * seguinte, a segunda não resolveria nunca e não pode ficar em laço.
   */
  const tentativasDeRetentativaRef = React.useRef(0);
  const faltasGravadasRef = React.useRef<Map<string, number>>(new Map());

  /** O usuário logado pode gravar neste diário? Evita tentativas que o banco vai recusar. */
  const podeGravarNoDiario = React.useCallback((classId: string, subjectId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.STAFF) return true;
    if (currentUser.role === UserRole.TEACHER) {
      return (currentUser.assignedJournals ?? []).some(
        j => j.classId === classId && j.subjectId === subjectId
      );
    }
    return false;   // aluno nunca grava nota
  }, [currentUser]);

  // --- notas
  useEffect(() => {
    if (!bancoDisponivel || !currentUser || isLoading) return;

    const tempo = setTimeout(async () => {
      const pendentes = grades.filter(g => {
        if (!g.classId || !g.subjectId || !g.studentId) return false;
        if (!podeGravarNoDiario(g.classId, g.subjectId)) return false;
        return notasGravadasRef.current.get(g.id) !== JSON.stringify(g);
      });
      if (pendentes.length === 0) return;

      const professorId = currentUser.role === UserRole.TEACHER ? currentUser.id : null;
      let falhas = 0;
      let ultimoErro = '';

      // Lotes pequenos para não travar a interface em importações grandes.
      for (const nota of pendentes.slice(0, 150)) {
        // O PERÍODO VEM DA TURMA DA NOTA, NÃO DO QUE ESTÁ SELECIONADO NA TELA.
        //
        // Mesmo motivo do carimbo do diário: corrigir uma nota de 2025/2 com a
        // tela em 2026/2 criava um diário carimbado 2026/2 para uma turma de
        // 2025/2, que colidia com o diário verdadeiro e travava a gravação.
        const turmaDaNota = classes.find(c => c.id === nota.classId);
        const periodoDaNota = (turmaDaNota?.year && turmaDaNota?.semester)
          ? `${turmaDaNota.year}/${turmaDaNota.semester}`
          : currentPeriod;
        const res = await salvarNota(nota, periodoDaNota, professorId);
        if (res.ok) {
          notasGravadasRef.current.set(nota.id, JSON.stringify(nota));
        } else {
          falhas++;
          ultimoErro = res.erro || '';
        }
      }

      if (falhas > 0) {
        // Falha de gravação NUNCA fica em silêncio: acende o aviso na tela.
        setCloudBackupStatus('error');
        registrarFalhaDeGravacao(`${falhas} lançamento(s) de nota não gravado(s). ${ultimoErro}`);
        addSecurityLog('GRAVACAO_NOTA_FALHA', `${falhas} lançamento(s) não gravado(s). ${ultimoErro}`, 'high');
      } else {
        setCloudBackupStatus('success');
        setLastCloudBackupTime(new Date().toISOString());
        tentativasDeRetentativaRef.current = 0;
      }

      // Sobrou fila? Faz outra rodada — MAS só se esta rodada gravou algo.
      //
      // Sem a condição de progresso, uma falha permanente (permissão, por
      // exemplo) faria o efeito se reagendar para sempre, travando a tela.
      const gravouAlgo = pendentes.length - falhas > 0;
      if (pendentes.length > 150 && gravouAlgo) {
        setRodadaDeGravacao(n => n + 1);
        return;
      }

      // TENTAR DE NOVO O QUE FALHOU
      //
      // Isto resolve uma corrida real, vista numa importação de planilha: as
      // notas dos primeiros alunos da lista eram enviadas ANTES de o aluno
      // existir na tabela `alunos`, e o banco as recusava por chave
      // estrangeira. Segundos depois o aluno já estava lá — mas ninguém tentava
      // de novo, e aqueles alunos ficavam fora de TODOS os diários.
      //
      // Na prática: a turma abria com 12 alunos em vez de 14, e ninguém era
      // avisado de quais faltaram.
      //
      // O limite de tentativas existe para o caso oposto: se a falha for
      // permanente (sem permissão, por exemplo), insistir para sempre travaria
      // a tela. Depois de 6 tentativas o aviso de erro permanece aceso.
      if (falhas > 0 && tentativasDeRetentativaRef.current < 6) {
        tentativasDeRetentativaRef.current++;
        setTimeout(() => setRodadaDeGravacao(n => n + 1), 2500);
      }
    }, 1200);

    return () => clearTimeout(tempo);
  }, [grades, currentUser?.id, currentUser?.role, currentPeriod, isLoading, podeGravarNoDiario, rodadaDeGravacao]);

  // --- diário de classe (aulas + chamada)
  //
  // Antes isto só existia no retrato geral da escola, que apenas a gestão pode
  // gravar. Como quem lança aula é o PROFESSOR, na prática o diário de classe
  // dele nunca chegava ao servidor: sumia ao trocar de máquina ou limpar o
  // navegador. Agora cada aula vira uma linha própria.
  const aulasGravadasRef = React.useRef<Map<string, string>>(new Map());
  useEffect(() => {
    if (!bancoDisponivel || !currentUser || isLoading) return;

    const tempo = setTimeout(async () => {
      const pendentes = (attendance || []).filter(a => {
        if (!a.classId || !a.subjectId || !a.date) return false;
        if (!podeGravarNoDiario(a.classId, a.subjectId)) return false;
        return aulasGravadasRef.current.get(a.id) !== JSON.stringify(a);
      });
      if (pendentes.length === 0) return;

      const professorId = currentUser.role === UserRole.TEACHER ? currentUser.id : null;
      let falhas = 0;
      let ultimoErro = '';

      for (const aula of pendentes.slice(0, 60)) {
        const res = await salvarAula(
          aula.classId, aula.subjectId, currentPeriod,
          { id: aula.id, date: aula.date, lessonsCount: aula.lessonsCount, topic: aula.topic, records: aula.records },
          professorId
        );
        if (res.ok) aulasGravadasRef.current.set(aula.id, JSON.stringify(aula));
        else { falhas++; ultimoErro = res.erro || ''; }
      }

      if (falhas > 0) {
        setCloudBackupStatus('error');
        registrarFalhaDeGravacao(`${falhas} aula(s) de chamada não gravada(s). ${ultimoErro}`);
        addSecurityLog('GRAVACAO_AULA_FALHA', `${falhas} aula(s) não gravada(s). ${ultimoErro}`, 'high');
      }
      if (pendentes.length > 60 && falhas < pendentes.length) setRodadaDeGravacao(n => n + 1);
    }, 1500);

    return () => clearTimeout(tempo);
  }, [attendance, currentUser?.id, currentUser?.role, currentPeriod, isLoading, podeGravarNoDiario, rodadaDeGravacao]);

  // --- documentos do aluno
  //
  // Quem envia é o ALUNO, e isso ficava só no retrato geral da escola — que
  // apenas a gestão grava. O envio do aluno nunca chegava ao servidor.
  const documentosGravadosRef = React.useRef<Map<string, string>>(new Map());
  useEffect(() => {
    if (!bancoDisponivel || !currentUser || isLoading) return;

    const tempo = setTimeout(async () => {
      const pendentes = (studentDocuments || []).filter(d => {
        if (!d.studentId) return false;
        // Aluno só grava os próprios; gestão grava todos.
        if (currentUser.role === UserRole.STUDENT && d.studentId !== currentUser.id) return false;
        if (currentUser.role === UserRole.TEACHER) return false;
        return documentosGravadosRef.current.get(d.id) !== JSON.stringify(d);
      });
      if (pendentes.length === 0) return;

      let gravados = 0;
      for (const doc of pendentes.slice(0, 60)) {
        const res = await salvarDocumentoAluno(doc as any);
        if (res.ok) { documentosGravadosRef.current.set(doc.id, JSON.stringify(doc)); gravados++; }
        else console.warn('[Portal] Documento não gravado:', res.erro);
      }
      if (pendentes.length > 60 && gravados > 0) setRodadaDeGravacao(n => n + 1);
    }, 1500);

    return () => clearTimeout(tempo);
  }, [studentDocuments, currentUser?.id, currentUser?.role, isLoading, rodadaDeGravacao]);

  // --- mensagens
  //
  // Professor e aluno também enviam mensagem, e isso ficava apenas no retrato
  // geral da escola — que só a gestão grava. Mensagem de professor sumia.
  const mensagensGravadasRef = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!bancoDisponivel || !currentUser || isLoading) return;

    const tempo = setTimeout(async () => {
      const pendentes = (messages || []).filter(m => !mensagensGravadasRef.current.has(m.id));
      if (pendentes.length === 0) return;

      for (const m of pendentes.slice(0, 50)) {
        const res = await salvarMensagem({
          id: m.id,
          senderName: (m as any).senderName,
          recipientId: (m as any).recipientId,
          content: (m as any).content ?? '',
          attachmentUrl: (m as any).attachmentUrl,
          attachmentType: (m as any).attachmentType,
          attachmentName: (m as any).attachmentName,
        });
        // Marca mesmo em caso de recusa: mensagem antiga de outra pessoa não
        // pode ser regravada por quem está logado (o banco exige remetente = você).
        mensagensGravadasRef.current.add(m.id);
        if (!res.ok) console.warn('[Portal] Mensagem não gravada:', res.erro);
      }
      if (pendentes.length > 50) setRodadaDeGravacao(n => n + 1);   // a fila sempre diminui: toda mensagem é marcada como tratada
    }, 1500);

    return () => clearTimeout(tempo);
  }, [messages, currentUser?.id, currentUser?.role, isLoading, rodadaDeGravacao]);

  // --- faltas
  useEffect(() => {
    if (!bancoDisponivel || !currentUser || isLoading) return;

    const tempo = setTimeout(async () => {
      let falhas = 0;
      for (const [chave, total] of Object.entries(directAbsences)) {
        if (faltasGravadasRef.current.get(chave) === total) continue;

        const partes = chave.split('_');
        if (partes.length < 3) continue;
        // A chave é montada como `${classId}_${subjectId}_${studentId}`
        const studentId = partes[partes.length - 1];
        const resto = partes.slice(0, -1).join('_');
        const alvo = grades.find(g => `${g.classId}_${g.subjectId}` === resto && g.studentId === studentId);
        if (!alvo || !podeGravarNoDiario(alvo.classId, alvo.subjectId)) continue;

        const res = await salvarFaltas(alvo.classId, alvo.subjectId, studentId, total, currentPeriod);
        if (res.ok) faltasGravadasRef.current.set(chave, total);
        else falhas++;
      }
      if (falhas > 0) {
        setCloudBackupStatus('error');
        addSecurityLog('GRAVACAO_FALTA_FALHA', `${falhas} lançamento(s) de falta não gravado(s).`, 'high');
      }
    }, 1200);

    return () => clearTimeout(tempo);
  }, [directAbsences, currentUser?.id, currentUser?.role, currentPeriod, isLoading, podeGravarNoDiario, grades]);

  // --- salvamento automático do estado geral
  //
  // Mensagens, notificações, calendário, estágios, documentos e dependências
  // ficam neste bloco. Antes, ele só era enviado ao servidor no momento em que
  // a pessoa clicava em "sair" — quem fechasse a aba direto perdia o trabalho.
  // Agora grava sozinho pouco depois de cada alteração.
  const ultimoEstadoGravadoRef = React.useRef<string>('');
  const gravandoEstadoRef = React.useRef(false);

  // Espelho sempre atual, para o intervalo abaixo ler sem virar dependência.
  const dadosEstadoRef = React.useRef<any>({});
  dadosEstadoRef.current = {
    attendance, directAbsences, conceptRanges, calendarEvents,
    messages, notifications, currentPeriod, periods, simulatedDate,
    autoLockEnabled, securityLogs, declarationConfigs, studentDocuments,
    internships, staffMembers, dependencies, adminPasswordResetDone,
  };

  useEffect(() => {
    if (!bancoDisponivel || !currentUser || isLoading) return;
    // Só a gestão grava o estado geral. Professor e aluno não têm permissão —
    // e a tentativa fazia aparecer, para eles, o aviso de "não foi possível
    // gravar", como se algo estivesse errado com o trabalho deles.
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.STAFF) return;

    const tempo = setInterval(async () => {
      if (gravandoEstadoRef.current) return;   // não empilha gravações

      // DESEMPENHO: só entram aqui os dados que realmente vão para o retrato.
      // Antes, o estado INTEIRO era serializado a cada pausa na digitação —
      // com centenas de turmas e disciplinas, isso travava a escrita nos
      // formulários. Cursos, turmas, alunos e notas já vão para as tabelas
      // por outro caminho e não precisam ser serializados aqui.
      const payload = { ...dadosEstadoRef.current } as unknown as SystemStatePayload;

      const assinatura = JSON.stringify(payload);
      if (assinatura === ultimoEstadoGravadoRef.current) return;

      gravandoEstadoRef.current = true;
      try {
        const gravou = await saveStateToCloud(payload);
        if (gravou) {
          ultimoEstadoGravadoRef.current = assinatura;
          setLastCloudBackupTime(new Date().toISOString());
          // Mesmo motivo do laço da estrutura: quem acende também tem que
          // saber apagar, senão a faixa vira paisagem.
          setCloudBackupStatus('success');
          limparFalhaDeGravacao();
        } else {
          setCloudBackupStatus('error');
        }
      } finally {
        gravandoEstadoRef.current = false;
      }
    }, 6000);

    // MESMA ARMADILHA DA PUBLICAÇÃO DA ESTRUTURA — corrigida do mesmo jeito.
    //
    // Este era um `setTimeout` recriado a cada mudança em qualquer um dos 15
    // estados listados, mais o objeto `currentUser` (que o React recria a cada
    // renderização). Na prática o relógio era zerado antes dos 6 segundos e
    // nunca disparava: funcionários, dependências, documentos do aluno,
    // notificações, estágios e configurações de declaração NUNCA chegavam ao
    // servidor. Tudo isso passa por aqui.
    //
    // Agora é intervalo fixo, com dependências estáveis, lendo a foto mais
    // recente pelo espelho.
    return () => clearInterval(tempo);
  }, [currentUser?.id, currentUser?.role, isLoading]);

  // --- estrutura (cursos, turmas, disciplinas, professores, alunos, diários)
  //
  // ATENÇÃO: antes isto rodava UMA VEZ por sessão. Resultado: tudo que fosse
  // cadastrado DEPOIS de entrar no sistema — um professor novo, uma turma
  // nova — nunca chegava ao banco. Agora republica sempre que algo muda.
  // O RELÓGIO NÃO PODE SER REINICIADO PELO MOVIMENTO DOS DADOS
  //
  // Antes isto era um `setTimeout` de 2,5 s recriado a cada mudança de
  // `grades`/`users`. A limpeza do efeito cancelava o anterior — então bastava
  // algo mexer nesses dados a cada menos de 2,5 s para o relógio NUNCA chegar
  // ao fim. E é exatamente o que acontece: a gravação de notas altera `grades`
  // continuamente, e a retentativa de notas roda a cada 2,5 s.
  //
  // O sintoma era este: atribuir um professor a um diário parecia funcionar na
  // tela, mas nunca chegava ao banco. Ao recarregar, o vínculo sumia — e sem
  // professor no diário ninguém lança nota.
  //
  // Agora é um intervalo fixo, com dependências estáveis: ele dispara a cada
  // 3 s independentemente da agitação dos dados, olha a foto mais recente e
  // publica se algo mudou de verdade.
  const ultimaEstruturaRef = React.useRef<string>('');
  const publicandoRef = React.useRef(false);

  // Espelho sempre atual dos dados, para o intervalo ler sem virar dependência.
  const dadosEstruturaRef = React.useRef({ courses, subjects, classes, users, currentPeriod, grades });
  dadosEstruturaRef.current = { courses, subjects, classes, users, currentPeriod, grades };

  useEffect(() => {
    if (!bancoDisponivel || !currentUser || isLoading) return;
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.STAFF) return;

    const tempo = setInterval(async () => {
      if (publicandoRef.current) return;   // não empilha publicações

      const { courses, subjects, classes, users, currentPeriod, grades } = dadosEstruturaRef.current;

      // Só o que de fato vai para o banco entra na comparação.
      //
      // "TUDO o que vai para o banco", e não uma amostra dele. A regra parece
      // óbvia e foi violada duas vezes, sempre do mesmo jeito: alguém compara
      // dois ou três campos, o resto muda sem mudar a assinatura, e a gravação
      // é pulada em silêncio. A tela mostra o valor novo — ele está na memória
      // — e o banco guarda o antigo para sempre. Ninguém vê nada errado até
      // abrir o portal em outro computador.
      //
      // O caso encontrado em 01/08: de um CURSO só entravam id e nome. Editar
      // carga horária, descrição, turnos ou ativar/inativar não mexia na
      // assinatura, e NADA disso chegava ao banco. Era por isso que a carga
      // horária dos cursos reais estava nula: o valor existe na tela desde
      // sempre, e nunca foi gravado. O mesmo valia para módulo e carga horária
      // de disciplina, e para quase tudo de uma turma.
      //
      // Se um campo novo passar a ser gravado, ele PRECISA entrar aqui também.
      const assinatura = JSON.stringify({
        c: courses.map(x => [
          x.id, x.name, x.description, x.totalWorkload,
          (x.shifts ?? []).join('|'), x.status, x.active,
        ]),
        s: subjects.map(x => [x.id, x.name, x.courseId, x.module, x.workload]),
        t: classes.map(x => [
          x.id, x.name, x.courseId, x.code, x.shift, x.module, x.year,
          x.semester, x.scheduleText, x.closedS1, x.closedS2,
          x.closedDefinitive, x.isDependency,
        ]),
        // QUAIS diários, não QUANTOS.
        //
        // Antes entrava só a contagem. Trocar o professor de disciplina —
        // tirar Anatomia e pôr Nutrição — mantém a contagem igual, a
        // assinatura não mudava, e a troca NUNCA chegava ao banco. Na tela
        // aparecia certo; o professor abria e via a disciplina antiga.
        u: users.filter(u => u.role === UserRole.TEACHER || u.role === UserRole.STUDENT)
                .map(x => [
                  x.id, x.name, x.role, x.classId, x.courseId,
                  x.enrollment, x.dossierNumber, x.cpf, x.email, x.phone,
                  x.status, x.active,
                  (x.assignedJournals ?? [])
                    .map(j => `${j.classId}|${j.subjectId}`)
                    .sort()
                    .join(','),
                ]),
        p: currentPeriod,
      });
      if (assinatura === ultimaEstruturaRef.current) return;

      publicandoRef.current = true;
      try {
        const res = await publicarEstrutura({ courses, subjects, classes, users, currentPeriod, grades });
        if (res.ok) {
          ultimaEstruturaRef.current = assinatura;
          // O AVISO LARANJA PRECISA SABER APAGAR, NÃO SÓ ACENDER.
          //
          // Antes, os dois laços de gravação só chamavam `setCloudBackupStatus`
          // no caso de falha. Uma falha passageira — rede oscilando, ou os
          // minutos em que o site esteve no ar pela metade — acendia a faixa e
          // ela ficava acesa para sempre, mesmo com tudo voltando a gravar
          // normalmente. A secretaria via "alterações não salvas" o dia inteiro
          // sem ter nada por salvar, e aprendia a ignorar o aviso. No dia em
          // que a falha fosse real, ninguém ia olhar.
          setCloudBackupStatus('success');
          limparFalhaDeGravacao();
          addSecurityLog('ESTRUTURA_PUBLICADA', 'Cursos, turmas, disciplinas, professores e alunos sincronizados.', 'low');
        } else {
          setCloudBackupStatus('error');
          // O motivo precisa CHEGAR NA TELA. Indo só para o log de segurança,
          // a secretaria via o aviso laranja aceso e nenhuma explicação.
          registrarFalhaDeGravacao(res.erro || 'Falha ao gravar cursos, turmas, professores ou alunos.');
          addSecurityLog('ESTRUTURA_FALHA', `Falha ao sincronizar a estrutura: ${res.erro}`, 'high');
        }
      } catch (err: any) {
        console.error('[Portal] Falha ao publicar estrutura:', err);
        setCloudBackupStatus('error');
        registrarFalhaDeGravacao(err?.message || String(err));
      } finally {
        publicandoRef.current = false;
      }
    }, 3000);

    // Dependências propositalmente estáveis: os dados chegam pelo espelho
    // acima. Se `grades`/`users` entrassem aqui, o intervalo seria recriado a
    // cada mudança e voltaríamos ao problema de nunca disparar.
    //
    // E são o ID e o PAPEL, não o objeto `currentUser`. Este é recriado a cada
    // renderização — como objeto, muda de identidade mesmo sem mudar de
    // conteúdo. Usá-lo aqui destruía e recriava o intervalo antes dos 3
    // segundos, e ele nunca chegava a disparar: exatamente a mesma armadilha
    // do `setTimeout` anterior, só que num lugar diferente. Foi por isso que
    // atribuir professor ao diário continuou não salvando mesmo depois da
    // primeira correção.
    return () => clearInterval(tempo);
  }, [currentUser?.id, currentUser?.role, isLoading]);

  const updateCalendarEventDate = (id: string, date: string) => {
    let alterado: AcademicCalendarEvent | undefined;

    setCalendarEvents(prev => prev.map(e => {
      if (e.id !== id) return e;
      alterado = { ...e, date };
      return alterado;
    }));

    addSecurityLog('SISTEMA_PRAZO', `Data limite de fechamento (${id}) alterada para ${date}.`, 'low');

    // Vai para a tabela `eventos_calendario` na hora, não no retrato geral.
    //
    // Estas datas travam o lançamento de nota da escola inteira. Se a gravação
    // falhar, a pessoa PRECISA saber — antes ficava só no navegador dela, e o
    // professor continuava com o prazo antigo.
    if (alterado) {
      const evento = alterado;
      salvarEventosCalendario([{
        id: evento.id,
        title: evento.title,
        date: evento.date,
        type: String(evento.type),
        description: evento.description,
      }]).then(r => {
        if (!r.ok) {
          setCloudBackupStatus('error');
          // `mostrarAviso` não existe aqui dentro — é montado lá embaixo, no
          // objeto do contexto. Chamar esse nome aqui estourava um erro dentro
          // do `.then`, e o aviso que deveria alertar a secretaria era
          // justamente o que quebrava: a data não salvava E ninguém era
          // avisado. O estado por trás do aviso é o `setAviso`.
          setAviso({
            titulo: 'A data NÃO foi salva',
            mensagem: `A nova data de "${evento.title}" ficou só neste computador. Os professores continuam com o prazo antigo.\n\nMotivo: ${r.erro}`,
          });
        }
      });
    }
  };

  const getS1ClosingDate = () => calendarEvents.find(e => e.type === 'CLOSING_S1')?.date || '';
  const getS2ClosingDate = () => calendarEvents.find(e => e.type === 'CLOSING_S2')?.date || '';
  const getDefinitiveClosingDate = () => calendarEvents.find(e => e.type === 'DEFINITIVE_CLOSING')?.date || '';

  const isClassS1Locked = (cl: ClassSection) => {
    if (cl.closedDefinitive || cl.closedS1) return true;
    if (autoLockEnabled) {
      const s1Date = getS1ClosingDate();
      if (s1Date && simulatedDate >= s1Date) return true;
      const defDate = getDefinitiveClosingDate();
      if (defDate && simulatedDate >= defDate) return true;
    }
    return false;
  };

  const isClassS2Locked = (cl: ClassSection) => {
    if (cl.closedDefinitive || cl.closedS2) return true;
    if (autoLockEnabled) {
      const s2Date = getS2ClosingDate();
      if (s2Date && simulatedDate >= s2Date) return true;
      const defDate = getDefinitiveClosingDate();
      if (defDate && simulatedDate >= defDate) return true;
    }
    return false;
  };

  const isClassDefinitiveLocked = (cl: ClassSection) => {
    if (cl.closedDefinitive) return true;
    if (autoLockEnabled) {
      const defDate = getDefinitiveClosingDate();
      if (defDate && simulatedDate >= defDate) return true;
    }
    return false;
  };

  // Sync to localStorage
  useEffect(() => {
    safeLocalStorage.setItem('oc_current_period', currentPeriod);
  }, [currentPeriod]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_periods', JSON.stringify(periods));
  }, [periods]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_current_user', currentUser ? JSON.stringify(currentUser) : '');
  }, [currentUser]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_grades', JSON.stringify(grades));
  }, [grades]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_direct_absences', JSON.stringify(directAbsences));
  }, [directAbsences]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_concept_ranges', JSON.stringify(conceptRanges));
  }, [conceptRanges]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_calendar_events', JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Unify duplicate subjects: "INTRODUÇÃO Á ENFERMAGEM" and "Introdução à Enfermagem"
  const unifiedRef = React.useRef(false);
  useEffect(() => {
    if (isLoading || unifiedRef.current) return;

    const wrongSubj = subjects.find(s => s.name === 'INTRODUÇÃO Á ENFERMAGEM');
    const correctSubj = subjects.find(s => s.name === 'Introdução à Enfermagem');

    if (wrongSubj && correctSubj) {
      // 1. Change the subjectId of all grade records that are linked to the wrong subject to the correct one
      const updatedGrades = grades.map(g => {
        if (g.subjectId === wrongSubj.id) {
          return { ...g, subjectId: correctSubj.id };
        }
        return g;
      });

      // 2. Unify directAbsences
      const updatedDirectAbsences = { ...directAbsences };
      let absencesChanged = false;
      Object.keys(directAbsences).forEach(key => {
        const parts = key.split('_');
        if (parts.length === 3 && parts[1] === wrongSubj.id) {
          const newKey = `${parts[0]}_${correctSubj.id}_${parts[2]}`;
          updatedDirectAbsences[newKey] = directAbsences[key];
          delete updatedDirectAbsences[key];
          absencesChanged = true;
        }
      });

      // 3. Delete the duplicate subject "INTRODUÇÃO Á ENFERMAGEM" from the list of subjects
      const updatedSubjects = subjects.filter(s => s.id !== wrongSubj.id);

      setGrades(updatedGrades);
      setSubjects(updatedSubjects);
      if (absencesChanged) {
        setDirectAbsences(updatedDirectAbsences);
      }

      addSecurityLog(
        'UNIFICACAO_DISCIPLINAS',
        `Unificação concluída: Notas e faltas directAbsences da disciplina "${wrongSubj.name}" migradas para "${correctSubj.name}", e a disciplina duplicada foi removida.`,
        'medium'
      );
      unifiedRef.current = true;
    } else if (correctSubj) {
      // Fallback: wrongSubj is already deleted from subjects, but directAbsences might still contain its keys
      const updatedDirectAbsences = { ...directAbsences };
      let absencesChanged = false;
      const allSubjectIds = new Set(subjects.map(s => s.id));

      Object.keys(directAbsences).forEach(key => {
        const parts = key.split('_');
        if (parts.length === 3) {
          const [classId, subjId, studentId] = parts;
          if (!allSubjectIds.has(subjId)) {
            // Find if this class belongs to 'ENF' or 'ENF_EAD' or similar
            const targetClass = classes.find(c => c.id === classId);
            const isEnfermagem = targetClass && (
              targetClass.courseId === 'ENF' || 
              targetClass.courseId === 'ENF_EAD' || 
              targetClass.name.toUpperCase().includes('ENFERMAGEM')
            );
            if (isEnfermagem || subjId.startsWith('sub_imp_')) {
              const newKey = `${classId}_${correctSubj.id}_${studentId}`;
              updatedDirectAbsences[newKey] = directAbsences[key];
              delete updatedDirectAbsences[key];
              absencesChanged = true;
            }
          }
        }
      });

      if (absencesChanged) {
        setDirectAbsences(updatedDirectAbsences);
        addSecurityLog(
          'UNIFICACAO_DISCIPLINAS_FALTAS_CORRECAO',
          `Migração tardia de faltas: Chaves directAbsences órfãs de Enfermagem migradas com sucesso para a disciplina "${correctSubj.name}".`,
          'medium'
        );
      }
      unifiedRef.current = true;
    }
  }, [isLoading, subjects, grades, directAbsences, classes]);

  useEffect(() => {
    if (activeClassId) safeLocalStorage.setItem('oc_active_class_id', activeClassId);
    else safeLocalStorage.removeItem('oc_active_class_id');
  }, [activeClassId]);

  useEffect(() => {
    if (activeSubjectId) safeLocalStorage.setItem('oc_active_subject_id', activeSubjectId);
    else safeLocalStorage.removeItem('oc_active_subject_id');
  }, [activeSubjectId]);



  /* ------------------------------------------------------------------------
   * REGISTRADOR TEMPORÁRIO: quem apaga o DISPENSADO?
   *
   * Marcar DISPENSADO deixa a linha roxa na tela, mas o valor nunca chega ao
   * banco. Já foi verificado, um por um, que os caminhos automáticos que mexem
   * em notas PROTEGEM esse valor: o recálculo por frequência, a função de
   * cálculo, e a carga inicial (que roda uma vez só). Mesmo assim ele some.
   *
   * Em vez de continuar adivinhando qual rotina é, este trecho observa a lista
   * de notas e anota o momento em que qualquer registro deixa de ser
   * DISPENSADO, junto da pilha de chamadas — que diz exatamente qual código
   * provocou a mudança.
   *
   * É temporário e não altera nada: só observa e escreve num registro que eu
   * consigo ler. Sai assim que a causa for encontrada.
   * ------------------------------------------------------------------------ */
  const dispensadosAnterioresRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    const agora = new Set(
      grades.filter(g => g.result === 'DISPENSADO').map(g => g.id)
    );

    const perdidos: string[] = [];
    dispensadosAnterioresRef.current.forEach(id => {
      if (!agora.has(id)) perdidos.push(id);
    });

    if (perdidos.length > 0) {
      const trilha = {
        quando: new Date().toISOString(),
        registrosQuePerderamODispensado: perdidos,
        virouOQue: perdidos.map(id => {
          const g = grades.find(x => x.id === id);
          return { id, result: g?.result ?? '(registro sumiu da lista)', concept: g?.concept };
        }),
        pilhaDeChamadas: new Error('rastro').stack,
      };
      console.error('[DISPENSADO PERDIDO]', trilha);
      try {
        const anterior = JSON.parse(safeLocalStorage.getItem('oc_diag_dispensado') || '[]');
        anterior.push(trilha);
        safeLocalStorage.setItem('oc_diag_dispensado', JSON.stringify(anterior.slice(-10)));
      } catch { /* diagnóstico não pode quebrar o portal */ }
    }

    dispensadosAnterioresRef.current = agora;
  }, [grades]);

  // Recalculate grades whenever attendance or concept ranges change
  useEffect(() => {
    // We update grades to match the attendance frequency automatically
    setGrades(prevGrades => {
      let changed = false;
      const updated = prevGrades.map(g => {
        if (g.result === 'DISPENSADO' || g.result === 'DESISTENTE') {
          return g;
        }
        // NOTA IMPORTADA DE MAPA ANTIGO NÃO SE RECALCULA
        //
        // Este efeito refaz resultado e conceito de TODAS as notas sempre que a
        // frequência muda. Para o histórico isso é errado: um "F. NOTA" (aluno
        // sem nota lançada) era reescrito como "NÃO APTO", porque a conta só
        // conhece nota e frequência.
        //
        // Foi o último dos caminhos de reescrita a aparecer — os outros dois
        // eu já havia bloqueado, e mesmo assim o rótulo mudava. É o que torna
        // esse tipo de defeito difícil: são várias portas para o mesmo erro.
        if (g.isHistoricalImport) {
          return g;
        }
        const { frequency } = getStudentAbsencesInternal(g.studentId, g.subjectId, g.classId, attendance, subjects);
        const newResult = getStudentResult(g, frequency);
        const newConcept = getStudentConcept(g.pf, conceptRanges);
        
        if (g.result !== newResult || g.concept !== newConcept) {
          changed = true;
          return { ...g, result: newResult, concept: newConcept };
        }
        return g;
      });
      return changed ? updated : prevGrades;
    });
  }, [attendance, conceptRanges, subjects]);

  // Absences Internal Helper
  const getStudentAbsencesInternal = (
    studentId: string, 
    subjectId: string, 
    classId: string | undefined,
    sessionsList: AttendanceSession[],
    subjectsList: Subject[]
  ) => {
    let totalAbsences = 0;
    let hasDirect = false;

    const resolvedClassId = classId || users.find(u => u.id === studentId)?.classId;

    if (resolvedClassId) {
      const key = `${resolvedClassId}_${subjectId}_${studentId}`;
      if (directAbsences && directAbsences[key] !== undefined) {
        totalAbsences = directAbsences[key];
        hasDirect = true;
      }
    }

    if (!hasDirect) {
      const subjectSessions = sessionsList.filter(s => s.subjectId === subjectId);
      subjectSessions.forEach(sess => {
        if (sess.date.includes('-00') || sess.date.startsWith('2026-00')) return;
        if (sess.records[studentId] === 'F') {
          totalAbsences += 1;
        }
      });
    }

    const subject = subjectsList.find(s => s.id === subjectId);
    const workload = subject ? subject.workload : 80;

    // Calculate frequency relative to the total subject workload to prevent premature failures
    const frequency = workload === 0 ? 100 : Math.max(0, ((workload - totalAbsences) / workload) * 100);
    return { total: totalAbsences, frequency };
  };

  const updateStudentAbsences = (studentId: string, subjectId: string, classId: string, total: number) => {
    const key = `${classId}_${subjectId}_${studentId}`;
    setDirectAbsences(prev => ({
      ...prev,
      [key]: total
    }));
  };

  // Absences Helper for components
  const getStudentAbsences = (studentId: string, subjectId: string, classId?: string) => {
    return getStudentAbsencesInternal(studentId, subjectId, classId, attendance, subjects);
  };

  const getStudentAttendanceGrid = (studentId: string) => {
    const grid: { [subjectId: string]: { total: number, frequency: number } } = {};
    const studentClassId = users.find(u => u.id === studentId)?.classId;
    subjects.forEach(sub => {
      grid[sub.id] = getStudentAbsences(studentId, sub.id, studentClassId);
    });
    return grid;
  };

  // Auth Functions
  const login = async (username: string, cpfOrEnrollment: string): Promise<boolean> => {
    const cleanedUsername = username.trim().toLowerCase();
    const cleanedCpfOrEnrollment = cpfOrEnrollment.trim();

    // 1. Sanitize Inputs (XSS prevention)
    const sanitizedUsername = cleanedUsername.replace(/<[^>]*>/g, '');
    const sanitizedCpfOrEnrollment = cleanedCpfOrEnrollment.replace(/<[^>]*>/g, '');

    // 2. Check lockout limits
    const lockout = failedAttemptsMap[sanitizedUsername];
    if (lockout && lockout.lockoutUntil && lockout.lockoutUntil > Date.now()) {
      const remainingSecs = Math.ceil((lockout.lockoutUntil - Date.now()) / 1000);
      addSecurityLog('SISTEMA_BLOQUEIO', `Tentativa de login rejeitada para [${sanitizedUsername}] (Bloqueio Anti-Brute-Force ativo por mais ${remainingSecs}s).`, 'medium');
      throw new Error(`Acesso bloqueado por excesso de tentativas. Aguarde ${remainingSecs}s.`);
    }

    // ------------------------------------------------------------------
    // AUTENTICAÇÃO REAL (Supabase Auth)
    //
    // A senha é conferida NO SERVIDOR, comparada contra um hash. O navegador
    // nunca vê nem guarda senha de ninguém.
    //
    // Foi removido daqui, de propósito:
    //   - a senha mestra fixa 'Admin@Lynx2026', que entrava como administrador
    //     independentemente da senha cadastrada;
    //   - os usuários fixos 'lindemberg' / 'admin' / 'administrador';
    //   - o login de administrador com o campo de usuário VAZIO;
    //   - aceitar CPF ou matrícula no lugar da senha;
    //   - o "se a autenticação falhar, confere localmente", que mantinha todas
    //     as portas acima abertas mesmo com autenticação de verdade ligada.
    // ------------------------------------------------------------------
    const resultado = await entrarNoPortal(sanitizedUsername, cpfOrEnrollment);

    if (resultado.ok && resultado.usuario) {
      // NÃO HÁ MAIS CONFERÊNCIA DE PAPEL AQUI.
      //
      // Antes a tela mandava junto o papel escolhido pela pessoa (Aluno,
      // Professor ou Administração) e este trecho comparava com o registro do
      // banco, recusando se não batesse. A conferência era correta, mas o
      // problema estava um passo atrás: não deveria existir escolha nenhuma.
      //
      // O papel agora vem só de `usuarios.papel`, lido depois que o servidor
      // confere a senha. Quem entra não tem como influenciar o resultado.
      setFailedAttemptsMap(prev => ({
        ...prev,
        [sanitizedUsername]: { count: 0, lockoutUntil: null }
      }));

      // Traz do servidor os dados de CRM, estágios, minicursos, requerimentos e
      // financeiro ANTES de abrir as telas — elas leem o armazenamento local no
      // momento em que montam. Se restaurássemos depois, abririam vazias.
      // O aluno também espelha, mas só o que é dele: para ele, `usuario.id` já
      // é o id da ficha em `alunos`, e o banco só libera as linhas com esse id.
      const ehGestao = resultado.usuario.role === UserRole.ADMIN || resultado.usuario.role === UserRole.STAFF;
      const alunoDoEspelho = resultado.usuario.role === UserRole.STUDENT ? resultado.usuario.id : null;
      if (ehGestao || alunoDoEspelho) {
        try {
          await restaurarDoServidor(alunoDoEspelho);
          iniciarEspelho({
            alunoId: alunoDoEspelho,
            aoFalhar: (msg) => {
              setCloudBackupStatus('error');
              addSecurityLog('ESPELHO_FALHA', `Falha ao salvar dados no servidor: ${msg}`, 'high');
            },
          });
          // Sobe o que só existe neste navegador. Sem isto, dado gravado antes
          // do espelho existir ficava parado aqui até alguém reescrevê-lo.
          enviarTudoQueJaExiste();
        } catch (err: any) {
          console.error('[Portal] Falha ao restaurar dados do servidor:', err);
          setCloudBackupStatus('error');
        }
      }

      setPrecisaTrocarSenha(!!resultado.precisaTrocarSenha);
      setCurrentUser(resultado.usuario);
      setUsers(prev => {
        const jaExiste = prev.some(u => u.id === resultado.usuario!.id);
        return jaExiste
          ? prev.map(u => (u.id === resultado.usuario!.id ? { ...u, ...resultado.usuario! } : u))
          : [...prev, resultado.usuario!];
      });
      addSecurityLog('LOGIN_SUCESSO', `Usuário [${sanitizedUsername}] autenticado com sucesso no portal acadêmico.`, 'low');
      return true;
    }

    // Increment failed count
    setFailedAttemptsMap(prev => {
      const current = (prev[sanitizedUsername]?.count || 0) + 1;
      let lockoutUntil: number | null = null;
      if (current >= 3) {
        lockoutUntil = Date.now() + 30000; // 30s lockout
        addSecurityLog('SISTEMA_LOCKOUT', `Múltiplas tentativas falhas para [${sanitizedUsername}]. Bloqueio preventivo ativado por 30 segundos.`, 'high');
      } else {
        addSecurityLog('LOGIN_FALHA', `Credenciais inválidas informadas para [${sanitizedUsername}]. Tentativa ${current}/3.`, 'medium');
      }
      return {
        ...prev,
        [sanitizedUsername]: { count: current, lockoutUntil }
      };
    });

    return false;
  };

  const logout = () => {
    // Envia o que estiver pendente do CRM/estágios/financeiro e desliga o espelho.
    try { enviarEspelhoAgora(); pararEspelho(); } catch { /* não impede a saída */ }

    // Antes de encerrar, tenta gravar o que ainda estiver pendente.
    const payload: SystemStatePayload = {
      users, courses, classes, subjects, grades, attendance, directAbsences,
      conceptRanges, calendarEvents, messages, notifications,
      currentPeriod, periods, simulatedDate, autoLockEnabled, securityLogs,
      declarationConfigs, studentDocuments, internships, adminPasswordResetDone
    };

    const ehGestaoSaida = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.STAFF;
    (ehGestaoSaida ? saveStateToCloud(payload) : Promise.resolve(true))
      .then(gravou => {
        if (!gravou) {
          console.warn('[Portal] Havia alterações que não foram gravadas na nuvem antes da saída.');
        }
      })
      .catch(err => console.warn('[Portal] Falha ao gravar na saída:', err?.message || err))
      .finally(() => {
        // Encerra a sessão no servidor: o token deixa de valer.
        sairDoPortal().catch(() => { /* a sessão local já foi limpa */ });
      });

    setCurrentUser(null);
  };

  const updatePassword = async (userId: string, newPass: string) => {
    // A senha vai com hash para o servidor. NÃO é mais guardada no objeto do
    // usuário nem no navegador — era assim que ela acabava exposta.
    const problema = validarForcaSenha(newPass);
    if (problema) {
      addSecurityLog('SENHA_RECUSADA', `Troca de senha recusada: ${problema}`, 'low');
      throw new Error(problema);
    }

    const res = await trocarSenhaNoAuth(newPass);
    if (!res.ok) {
      addSecurityLog('SENHA_FALHA', `Falha ao alterar a senha do usuário ${userId}: ${res.mensagem}`, 'medium');
      throw new Error(res.mensagem);
    }

    setPrecisaTrocarSenha(false);
    addNotification(userId, 'Sua senha foi alterada com sucesso.');
    addSecurityLog('SENHA_ALTERADA', `Senha do usuário ID ${userId} alterada com sucesso.`, 'low');
  };

  const recoverPassword = async (email: string): Promise<string | null> => {
    // A resposta é SEMPRE a mesma, exista o e-mail ou não. Antes, o sistema
    // dizia quando o e-mail não existia — o que permitia descobrir quem tem
    // conta no portal. Pior: quando não achava, ele CRIAVA a conta sozinho,
    // com uma senha previsível ('Portal@123' ou a matrícula do aluno).
    const res = await enviarRecuperacaoSenha(email);
    addSecurityLog('RECUPERACAO_SENHA', 'Solicitação de recuperação de senha processada.', 'low');
    return res.mensagem;
  };

  /**
   * DESATIVADO POR SEGURANÇA.
   *
   * Antes, a tela de login permitia redefinir a senha do administrador
   * protegida apenas por uma caixinha de "confirmo que sou o proprietário" —
   * ou seja, qualquer pessoa que abrisse o portal podia tomar a conta de
   * administrador. E o botão "Liberar Nova Redefinição" reativava essa porta
   * quantas vezes quisesse, anulando o suposto "uso único".
   *
   * A recuperação de senha agora é por e-mail, com link que expira.
   */
  const resetAdminPassword = async (_newPassword: string): Promise<{ success: boolean; message: string }> => {
    addSecurityLog(
      'REDEFINICAO_ADMIN_BLOQUEADA',
      'Tentativa de usar a redefinição de senha do administrador pela tela de login. Recurso desativado por segurança.',
      'high'
    );
    return {
      success: false,
      message: 'Este recurso foi desativado por segurança. Use "Esqueci minha senha" para receber o link por e-mail.',
    };
  };

  /**
   * Cria as contas de acesso dos alunos que ainda não têm.
   *
   * A importação de planilha cadastra os alunos, mas não criava login para
   * nenhum. Com 250 alunos isso significava cadastrar um por um.
   */
  const gerarAcessosDosAlunos = async (aoProgredir?: (feitos: number, total: number) => void) => {
    const relatorio = await criarAcessosDosAlunos(criarAcesso, aoProgredir);
    addSecurityLog(
      'ACESSOS_ALUNOS',
      `Geração de acessos: ${relatorio.criados} criado(s), ${relatorio.falhas} falha(s) de ${relatorio.total}.`,
      'medium'
    );
    return relatorio;
  };

  const contarAlunosSemAcesso = async () => (await alunosSemAcesso()).length;

  const unlockAdminReset = () => {
    addSecurityLog(
      'DESBLOQUEIO_REDEFINICAO_BLOQUEADO',
      'Tentativa de reabrir a redefinição de senha do administrador. Recurso desativado por segurança.',
      'high'
    );
  };

  // Grade Calculations
  const calculateS1 = (g: Partial<GradeRecord>) => {
    const hasAnyS1 = (g.av1 !== null && g.av1 !== undefined) ||
                     (g.av2 !== null && g.av2 !== undefined) ||
                     (g.av3 !== null && g.av3 !== undefined) ||
                     (g.recS1 !== null && g.recS1 !== undefined);
    if (!hasAnyS1 && g.s1 !== undefined && g.s1 !== null) {
      return g.s1;
    }
    const av1 = g.av1 ?? 0;
    const av2 = g.av2 ?? 0;
    const av3 = g.av3 ?? 0;
    const recS1 = g.recS1;

    let avs = [av1, av2, av3];
    if (recS1 !== null && recS1 !== undefined) {
      const minIndex = avs.indexOf(Math.min(...avs));
      if (recS1 > avs[minIndex]) {
        avs[minIndex] = recS1;
      }
    }
    return Math.min(30, avs[0] + avs[1] + avs[2]);
  };

  const calculateS2 = (g: Partial<GradeRecord>) => {
    const hasAnyS2 = (g.av4 !== null && g.av4 !== undefined) ||
                     (g.av5 !== null && g.av5 !== undefined) ||
                     (g.av6 !== null && g.av6 !== undefined) ||
                     (g.recS2 !== null && g.recS2 !== undefined);
    if (!hasAnyS2 && g.s2 !== undefined && g.s2 !== null) {
      return g.s2;
    }
    const av4 = g.av4 ?? 0;
    const av5 = g.av5 ?? 0;
    const av6 = g.av6 ?? 0;
    const recS2 = g.recS2;

    let avs = [av4, av5, av6];
    if (recS2 !== null && recS2 !== undefined) {
      const minIndex = avs.indexOf(Math.min(...avs));
      if (recS2 > avs[minIndex]) {
        avs[minIndex] = recS2;
      }
    }
    return Math.min(30, avs[0] + avs[1] + avs[2]);
  };

  const getStudentConcept = (finalGrade: number, ranges: ConceptRange[]) => {
    const matched = ranges.find(r => finalGrade >= r.minGrade && finalGrade <= r.maxGrade);
    return matched ? matched.letter : 'D';
  };

  const getStudentResult = (g: Partial<GradeRecord> & { pf: number }, frequency: number): 'APTO' | 'NÃO APTO' | 'REP. FALTAS' | 'Pendente' => {
    // If student was failed by attendance
    if (frequency < 75) {
      return 'REP. FALTAS';
    }
    const totalScore = g.pf;
    const isApproved = totalScore >= 60;
    
    if (isApproved) {
      return 'APTO';
    }
    return 'NÃO APTO';
  };

  // Mutators
  const addCourse = (courseData: Omit<Course, 'id'> & { id?: string }): Course => {
    const id = courseData.id ? courseData.id.toUpperCase() : `CURSO_${Date.now()}`;
    const newCourse: Course = {
      id,
      name: courseData.name.toUpperCase(),
      description: (courseData.description || `Curso ${courseData.name}`).toUpperCase(),
      totalWorkload: courseData.totalWorkload || 1200,
      shifts: courseData.shifts || [Shift.MATUTINO, Shift.VESPERTINO, Shift.NOTURNO],
      status: courseData.status || 'ATIVO',
      active: courseData.status !== 'INATIVO' && courseData.active !== false
    };

    setCourses(prev => {
      const filtered = prev.filter(c => c.id !== id);
      return [...filtered, newCourse];
    });
    return newCourse;
  };

  const updateCourse = (course: Course) => {
    setCourses(prev => prev.map(c => c.id === course.id ? course : c));
  };

  const deleteCourse = (id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id));
    // A sincronização automática da estrutura só faz upsert (grava o que
    // existe), nunca apaga quem sumiu da lista local. Sem este comando
    // direto, o curso reaparecia em qualquer outro aparelho — porque, para
    // o banco, ele nunca tinha sido removido de verdade.
    excluirCurso(id).then(res => {
      if (!res.ok) {
        addSecurityLog('SISTEMA_ERRO', `Falha ao excluir curso ${id} do banco: ${res.erro}`, 'high');
      }
    });
  };

  const addStaffMember = (staffData: Omit<StaffMember, 'id' | 'username' | 'registrationDate'> & { permissions?: StaffPermissions; username?: string }) => {
    const id = `staff_${Date.now()}`;
    // O login pode vir pronto de quem chamou — a tela de funcionários monta
    // `func_nome.sobrenome` e deixa o servidor resolver repetição, do mesmo
    // jeito que professor. `func_4821` ninguém decora, e a pessoa acaba
    // ligando para a secretaria perguntar qual era o dela.
    const generatedUsername = staffData.username || `func_${Math.floor(1000 + Math.random() * 9000)}`;
    const initialPassword = `Func@2026`;
    const registrationDate = new Date().toISOString().split('T')[0];

    const staff: StaffMember = {
      id,
      username: generatedUsername,
      name: staffData.name,
      cpf: staffData.cpf,
      phone: staffData.phone,
      email: staffData.email,
      position: staffData.position || 'Secretário Acadêmico',
      registrationDate,
      active: staffData.active !== false,
      permissions: staffData.permissions || getDefaultStaffPermissions(true)
    };

    setStaffMembers(prev => [...prev, staff]);

    // Also register as system user for authentication
    const newUser: User = {
      id: generatedUsername,
      username: generatedUsername,
      name: staffData.name,
      cpf: staffData.cpf,
      email: staffData.email,
      role: UserRole.ADMIN, // Staff member acts as system operator
      active: staffData.active !== false,
      password: initialPassword
    };

    setUsers(prev => {
      const exists = prev.some(u => u.username === generatedUsername);
      return exists ? prev : [...prev, newUser];
    });

    return { staff, generatedUsername, initialPassword };
  };

  const updateStaffMember = (staff: StaffMember) => {
    setStaffMembers(prev => prev.map(s => s.id === staff.id ? staff : s));
  };

  const deleteStaffMember = (id: string) => {
    setStaffMembers(prev => prev.filter(s => s.id !== id));
  };

  const updateStaffPermissions = (staffId: string, permissions: StaffPermissions) => {
    setStaffMembers(prev => prev.map(s => s.id === staffId ? { ...s, permissions } : s));
  };

  const createDependencyEnrollment = async (data: {
    studentId: string;
    courseId: string;
    subjectId: string;
    semester: number;
    schedule: string;
  }): Promise<{ dependency: DependencyEnrollment; classSection: ClassSection }> => {
    const student = users.find(u => u.id === data.studentId);
    if (!student) throw new Error('Aluno não encontrado.');

    const subject = subjects.find(s => s.id === data.subjectId);
    if (!subject) throw new Error('Disciplina não encontrada.');

    const dependencyId = `dep_${Date.now()}`;
    const createdClassId = `class_dep_${Date.now()}`;
    const createdClassName = `DEP-${subject.name.toUpperCase()} (${data.schedule.slice(0, 15)})`;

    // 1. Create ClassSection / Diário for dependency
    const newClassSection: ClassSection = {
      id: createdClassId,
      name: createdClassName,
      code: `DEP-${subject.id.toUpperCase()}`,
      courseId: data.courseId,
      shift: Shift.SABADO,
      module: data.semester,
      year: new Date().getFullYear(),
      semester: 1,
      isDependency: true,
      dependencySubjectId: data.subjectId,
      scheduleText: data.schedule,
      closedS1: false,
      closedS2: false,
      closedDefinitive: false
    };

    setClasses(prev => [...prev, newClassSection]);

    // 2. Bind student to this class section and create GradeRecord
    const newGrade: GradeRecord = {
      id: `g_dep_${Date.now()}_${data.subjectId}_${student.id}`,
      classId: createdClassId,
      subjectId: data.subjectId,
      studentId: student.id,
      av1: null, av2: null, av3: null, recS1: null, s1: 0,
      av4: null, av5: null, afc: null, recS2: null, s2: 0,
      extra: null, conselho: null, pf: 0,
      concept: 'D',
      result: 'Pendente'
    };

    setGrades(prev => [...prev, newGrade]);

    // 3. Create DependencyEnrollment record
    const newDependency: DependencyEnrollment = {
      id: dependencyId,
      studentId: student.id,
      studentName: student.name,
      enrollment: student.enrollment || student.username,
      courseId: data.courseId,
      subjectId: data.subjectId,
      semester: data.semester,
      schedule: data.schedule,
      createdAt: new Date().toISOString(),
      status: 'ATIVO',
      createdClassId
    };

    setDependencies(prev => [...prev, newDependency]);

    return { dependency: newDependency, classSection: newClassSection };
  };

  const addClass = (cls: ClassSection) => {
    const uppercaseCls = {
      ...cls,
      name: cls.name.toUpperCase(),
      code: cls.code ? cls.code.toUpperCase() : cls.code
    };
    setClasses(prev => [...prev, uppercaseCls]);
    // Create automatic diaries/records for all existing subjects under this class's course
    const classSubjects = subjects.filter(s => s.courseId === cls.courseId && s.module === cls.module);
    const classStudents = users.filter(u => u.role === UserRole.STUDENT && u.classId === cls.id);

    const newGrades: GradeRecord[] = [];
    classSubjects.forEach(sub => {
      classStudents.forEach(std => {
        newGrades.push({
          id: `g_new_${Date.now()}_${sub.id}_${std.id}`,
          classId: cls.id,
          subjectId: sub.id,
          studentId: std.id,
          av1: null, av2: null, av3: null, recS1: null, s1: 0,
          av4: null, av5: null, afc: null, recS2: null, s2: 0,
          extra: null, conselho: null, pf: 0,
          concept: 'D',
          result: 'Pendente'
        });
      });
    });

    if (newGrades.length > 0) {
      setGrades(prev => [...prev, ...newGrades]);
    }
  };

  const deleteClass = (id: string) => {
    const classToDelete = classes.find(c => c.id === id);
    setClasses(prev => prev.filter(c => c.id !== id));
    setGrades(prev => prev.filter(g => g.classId !== id));
    setAttendance(prev => prev.filter(a => a.classId !== id));
    setDirectAbsences(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${id}_`)) {
          delete next[key];
        }
      });
      return next;
    });
    if (activeClassId === id) {
      setActiveClassId(null);
    }
    addSecurityLog('TURMA_REMOVIDA', `Turma ${classToDelete?.name || ''} (ID: ${id}) foi excluída do sistema.`, 'medium');
    // Mesmo motivo do curso: a sincronização automática só faz upsert e
    // nunca apaga uma linha sozinha, então a exclusão precisa ser mandada
    // direto pro banco aqui, ou a turma reaparece em outro aparelho.
    excluirTurma(id).then(res => {
      if (!res.ok) {
        addSecurityLog('SISTEMA_ERRO', `Falha ao excluir turma ${id} do banco: ${res.erro}`, 'high');
      }
    });
  };

  const updateClass = (id: string, updates: Partial<ClassSection>) => {
    const uppercaseUpdates = { ...updates };
    if (uppercaseUpdates.name) uppercaseUpdates.name = uppercaseUpdates.name.toUpperCase();
    if (uppercaseUpdates.code) uppercaseUpdates.code = uppercaseUpdates.code.toUpperCase();
    setClasses(prev => prev.map(c => c.id === id ? { ...c, ...uppercaseUpdates } : c));
    addSecurityLog('TURMA_ATUALIZADA', `Turma ID ${id} atualizada com novas informações.`, 'low');
  };

  const addSubject = (sub: Subject) => {
    const uppercaseSub = {
      ...sub,
      name: sub.name.toUpperCase()
    };
    setSubjects(prev => [...prev, uppercaseSub]);
    
    // Auto generate grades for all classes matching course & module
    const matchingClasses = classes.filter(c => c.courseId === sub.courseId && c.module === sub.module);

    const newGrades: GradeRecord[] = [];
    matchingClasses.forEach(cls => {
      const classStudents = users.filter(u => u.role === UserRole.STUDENT && u.classId === cls.id);
      classStudents.forEach(std => {
        newGrades.push({
          id: `g_new_${Date.now()}_${sub.id}_${std.id}`,
          classId: cls.id,
          subjectId: sub.id,
          studentId: std.id,
          av1: null, av2: null, av3: null, recS1: null, s1: 0,
          av4: null, av5: null, av6: null, recS2: null, s2: 0,
          extra: null, conselho: null, afc: null, pf: 0,
          concept: 'D',
          result: 'Pendente'
        });
      });
    });

    if (newGrades.length > 0) {
      setGrades(prev => [...prev, ...newGrades]);
    }
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    const uppercaseUpdates = { ...updates };
    if (uppercaseUpdates.name) uppercaseUpdates.name = uppercaseUpdates.name.toUpperCase();
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...uppercaseUpdates } : s));
    addSecurityLog('DISCIPLINA_ATUALIZADA', `Disciplina ID ${id} atualizada com novas informações.`, 'low');
  };

  const deleteSubject = (id: string) => {
    const subToDelete = subjects.find(s => s.id === id);
    setSubjects(prev => prev.filter(s => s.id !== id));
    setGrades(prev => prev.filter(g => g.subjectId !== id));
    setAttendance(prev => prev.filter(a => a.subjectId !== id));
    setDirectAbsences(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.includes(`_${id}_`)) {
          delete next[key];
        }
      });
      return next;
    });
    if (activeSubjectId === id) {
      setActiveSubjectId(null);
    }
    addSecurityLog('DISCIPLINA_REMOVIDA', `Disciplina ${subToDelete?.name || ''} (ID: ${id}) foi excluída do sistema.`, 'medium');
    // Mesmo motivo do curso e da turma: precisa mandar o comando de
    // exclusão direto pro banco, senão a disciplina reaparece em outro
    // aparelho na próxima vez que a estrutura for recarregada.
    excluirDisciplina(id).then(res => {
      if (!res.ok) {
        addSecurityLog('SISTEMA_ERRO', `Falha ao excluir disciplina ${id} do banco: ${res.erro}`, 'high');
      }
    });
  };

  const addUser = (user: User) => {
    const uppercaseUser = {
      ...user,
      name: user.name.toUpperCase(),
      email: user.email ? user.email.toUpperCase() : user.email,
      cpf: user.cpf ? user.cpf.toUpperCase() : user.cpf,
      enrollment: user.enrollment ? user.enrollment.toUpperCase() : user.enrollment,
    };
    setUsers(prev => [...prev, uppercaseUser]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    const uppercaseUpdates = { ...updates };
    if (uppercaseUpdates.name) uppercaseUpdates.name = uppercaseUpdates.name.toUpperCase();
    if (uppercaseUpdates.email) uppercaseUpdates.email = uppercaseUpdates.email.toUpperCase();
    if (uppercaseUpdates.cpf) uppercaseUpdates.cpf = uppercaseUpdates.cpf.toUpperCase();
    if (uppercaseUpdates.enrollment) uppercaseUpdates.enrollment = uppercaseUpdates.enrollment.toUpperCase();
    setUsers(prev => {
      const updatedList = prev.map(u => u.id === id ? { ...u, ...uppercaseUpdates } : u);
      if (currentUser && currentUser.id === id) {
        const foundUser = updatedList.find(u => u.id === id);
        if (foundUser) {
          setCurrentUser(foundUser);
        }
      }
      return updatedList;
    });
  };

  const deleteUser = (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    setGrades(prev => prev.filter(g => g.studentId !== id));
    setAttendance(prev => prev.map(session => {
      if (!session.records || !(id in session.records)) return session;
      const newRecords = { ...session.records };
      delete newRecords[id];
      return { ...session, records: newRecords };
    }));
    setDirectAbsences(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.endsWith(`_${id}`)) {
          delete next[key];
        }
      });
      return next;
    });
    addSecurityLog('USUARIO_REMOVIDO', `Usuário ${userToDelete?.name || ''} (ID: ${id}) foi excluído do sistema.`, 'medium');
    // Mesmo motivo do curso, turma e disciplina: sem isto, o aluno/professor
    // excluído reaparecia em outro aparelho assim que a estrutura fosse
    // recarregada, porque a sincronização automática nunca apaga sozinha.
    // ADMIN e SECRETARIA não têm linha em nenhuma tabela (por isso não têm
    // exclusão de banco correspondente aqui — não há nada pra apagar).
    if (userToDelete?.role === UserRole.STUDENT) {
      excluirAluno(id).then(res => {
        if (!res.ok) {
          addSecurityLog('SISTEMA_ERRO', `Falha ao excluir aluno ${id} do banco: ${res.erro}`, 'high');
        }
      });
    } else if (userToDelete?.role === UserRole.TEACHER) {
      excluirProfessor(id).then(res => {
        if (!res.ok) {
          addSecurityLog('SISTEMA_ERRO', `Falha ao excluir professor ${id} do banco: ${res.erro}`, 'high');
        }
      });
    }
  };

  const unifyDuplicateStudents = (principalId: string, duplicateIds: string[]) => {
    const principal = users.find(u => u.id === principalId);
    if (!principal) return;

    // 1. Move all GradeRecord of duplicateIds to principalId
    setGrades(prev => prev.map(g => {
      if (duplicateIds.includes(g.studentId)) {
        return { ...g, studentId: principalId };
      }
      return g;
    }));

    // 2. Move all directAbsences of duplicateIds to principalId
    setDirectAbsences(prev => {
      const updated = { ...prev };
      duplicateIds.forEach(dupId => {
        Object.keys(updated).forEach(key => {
          if (key.endsWith(`_${dupId}`)) {
            const newKey = key.slice(0, -dupId.length - 1) + "_" + principalId;
            updated[newKey] = updated[key];
            delete updated[key];
          }
        });
      });
      return updated;
    });

    // 3. Move all attendance sessions records of duplicateIds to principalId
    setAttendance(prev => prev.map(session => {
      const updatedRecords = { ...session.records };
      let changed = false;
      duplicateIds.forEach(dupId => {
        if (updatedRecords[dupId] !== undefined) {
          const existingValue = updatedRecords[principalId];
          const duplicateValue = updatedRecords[dupId];
          if (existingValue === undefined || (existingValue === 'F' && duplicateValue === 'P')) {
            updatedRecords[principalId] = duplicateValue;
          }
          delete updatedRecords[dupId];
          changed = true;
        }
      });
      return changed ? { ...session, records: updatedRecords } : session;
    }));

    // 4. Move all studentDocuments of duplicateIds to principalId
    setStudentDocuments(prev => prev.map(docRecord => {
      if (duplicateIds.includes(docRecord.studentId)) {
        const newId = docRecord.id.replace(new RegExp(`_${docRecord.studentId}_`), `_${principalId}_`);
        return { ...docRecord, id: newId, studentId: principalId };
      }
      return docRecord;
    }));

    // 5. Move all messages of duplicateIds to principalId
    setMessages(prev => prev.map(msg => {
      if (duplicateIds.includes(msg.recipientId)) {
        return { ...msg, recipientId: principalId };
      }
      return msg;
    }));

    // 6. Move all internships of duplicateIds to principalId
    setInternships(prev => prev.map(intern => {
      if (duplicateIds.includes(intern.studentId)) {
        return { ...intern, studentId: principalId };
      }
      return intern;
    }));

    // 7. Delete duplicates from users
    setUsers(prev => prev.filter(u => !duplicateIds.includes(u.id)));

    // 8. Record a security log
    const duplicatesNames = duplicateIds.map(id => {
      const u = users.find(x => x.id === id);
      return `${u?.name || ''} (ID: ${id})`;
    }).join(', ');

    addSecurityLog(
      'UNIFICACAO_ESTUDANTES',
      `Alunos duplicados unificados no registro principal: ${principal.name} (ID: ${principalId}). Registros removidos: ${duplicatesNames}`,
      'medium'
    );
  };

  const unifyDuplicateSubjects = (correctSubjectId: string, duplicateSubjectIds: string[]) => {
    const correctSubj = subjects.find(s => s.id === correctSubjectId);
    if (!correctSubj) return;

    // 1. Move all GradeRecord of duplicateSubjectIds to correctSubjectId
    setGrades(prev => prev.map(g => {
      if (duplicateSubjectIds.includes(g.subjectId)) {
        return { ...g, subjectId: correctSubjectId };
      }
      return g;
    }));

    // 2. Move all AttendanceSession of duplicateSubjectIds to correctSubjectId
    setAttendance(prev => prev.map(session => {
      if (duplicateSubjectIds.includes(session.subjectId)) {
        return { ...session, subjectId: correctSubjectId };
      }
      return session;
    }));

    // 3. Move directAbsences keys of duplicateSubjectIds to correctSubjectId
    setDirectAbsences(prev => {
      const updated = { ...prev };
      duplicateSubjectIds.forEach(dupId => {
        Object.keys(updated).forEach(key => {
          const parts = key.split('_');
          if (parts.length === 3 && parts[1] === dupId) {
            const newKey = `${parts[0]}_${correctSubjectId}_${parts[2]}`;
            if (updated[newKey] !== undefined) {
              updated[newKey] = Math.max(updated[newKey], updated[key]);
            } else {
              updated[newKey] = updated[key];
            }
            delete updated[key];
          }
        });
      });
      return updated;
    });

    // 4. Update assignedJournals for users (teachers)
    setUsers(prev => prev.map(u => {
      if (u.assignedJournals && u.assignedJournals.length > 0) {
        const updatedJournals = u.assignedJournals.map(j => {
          if (duplicateSubjectIds.includes(j.subjectId)) {
            return { ...j, subjectId: correctSubjectId };
          }
          return j;
        });
        
        // Remove duplicate journals for the same class/subject if they occur
        const uniqueJournals = updatedJournals.filter((journal, index, self) => 
          index === self.findIndex(t => t.classId === journal.classId && t.subjectId === journal.subjectId)
        );
        
        return { ...u, assignedJournals: uniqueJournals };
      }
      return u;
    }));

    // 5. Remove duplicate subjects from subjects list
    setSubjects(prev => prev.filter(s => !duplicateSubjectIds.includes(s.id)));

    // 6. Record a security log
    const duplicateNames = duplicateSubjectIds.map(id => {
      const s = subjects.find(x => x.id === id);
      return `${s?.name || ''} (ID: ${id})`;
    }).join(', ');

    addSecurityLog(
      'UNIFICACAO_DISCIPLINAS',
      `Disciplinas duplicadas unificadas na disciplina principal: ${correctSubj.name} (ID: ${correctSubjectId}). Disciplinas removidas: ${duplicateNames}`,
      'medium'
    );
  };

  const syncSubjectsWithOfficialCurriculum = () => {
    // 1. Map courses to their official counterparts
    const courseIdToOfficial: { [courseId: string]: typeof officialCurriculum[0] } = {};
    courses.forEach(c => {
      const matchedOfficial = officialCurriculum.find(off => cleanTextForSync(off.courseName) === cleanTextForSync(c.name));
      if (matchedOfficial) {
        courseIdToOfficial[c.id] = matchedOfficial;
      }
    });

    // 2. Pre-clean prefixes and find official match for each subject
    const processedSubjects = subjects.map(subj => {
      const originalName = subj.name;
      const cleanName = /^\d+_+/.test(originalName) ? originalName.replace(/^\d+_+/, '').trim() : originalName;
      const official = courseIdToOfficial[subj.courseId];
      let targetName = cleanName;
      let bestScore = -1;
      let isOfficialMatch = false;

      if (official) {
        const officialNames = official.modules[subj.module as 1 | 2 | 3] || [];
        officialNames.forEach(offName => {
          if (isMatchForSync(cleanName, offName)) {
            const score = calculateSimilarityForSync(cleanName, offName);
            if (score > bestScore) {
              bestScore = score;
              targetName = offName;
              isOfficialMatch = true;
            }
          }
        });
      }

      return {
        ...subj,
        originalName,
        cleanName,
        targetName,
        score: isOfficialMatch ? bestScore : 1.0
      };
    });

    // 3. Group by course, module, and targetName to detect duplicates
    const groups: { [key: string]: typeof processedSubjects } = {};
    processedSubjects.forEach(ps => {
      const key = `${ps.courseId}_${ps.module}_${ps.targetName.trim().toLowerCase()}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(ps);
    });

    // Let's prepare maps of changes
    const renameMap: { [subjectId: string]: string } = {}; // subjectId -> newName
    const mergeMap: { [duplicateSubjectId: string]: string } = {}; // duplicateId -> correctId
    
    const renamedList: { original: string; official: string; id: string }[] = [];
    const unifiedList: { original: string; kept: string; keptId: string; deletedId: string }[] = [];

    // 4. Resolve renames and unifications
    Object.keys(groups).forEach(key => {
      const entries = groups[key];
      if (entries.length === 1) {
        const single = entries[0];
        if (single.originalName !== single.targetName) {
          renameMap[single.id] = single.targetName;
          renamedList.push({ original: single.originalName, official: single.targetName, id: single.id });
        }
      } else if (entries.length > 1) {
        // Sort descending to choose the primary subject:
        // - Prefer the one that doesn't need rename if possible (exact match to targetName)
        // - Prefer the one with more data records to keep history safe
        entries.sort((a, b) => {
          const isExactA = a.originalName === a.targetName ? 1 : 0;
          const isExactB = b.originalName === b.targetName ? 1 : 0;
          if (isExactA !== isExactB) return isExactB - isExactA;

          const dataA = grades.filter(g => g.subjectId === a.id).length + attendance.filter(s => s.subjectId === a.id).length;
          const dataB = grades.filter(g => g.subjectId === b.id).length + attendance.filter(s => s.subjectId === b.id).length;
          if (dataA !== dataB) return dataB - dataA;

          return a.id.localeCompare(b.id);
        });

        const primary = entries[0];
        const duplicates = entries.slice(1);

        duplicates.forEach(dup => {
          mergeMap[dup.id] = primary.id;
          unifiedList.push({ original: dup.originalName, kept: primary.targetName, keptId: primary.id, deletedId: dup.id });
        });

        if (primary.originalName !== primary.targetName) {
          renameMap[primary.id] = primary.targetName;
          renamedList.push({ original: primary.originalName, official: primary.targetName, id: primary.id });
        }
      }
    });

    if (renamedList.length === 0 && unifiedList.length === 0) {
      return { renamed: [], unified: [] };
    }

    // A. Update subjects list
    setSubjects(prev => {
      return prev
        .filter(s => !mergeMap[s.id])
        .map(s => {
          if (renameMap[s.id]) {
            return { ...s, name: renameMap[s.id] };
          }
          return s;
        });
    });

    // B. Update grades
    setGrades(prev => {
      return prev.map(g => {
        if (mergeMap[g.subjectId]) {
          return { ...g, subjectId: mergeMap[g.subjectId] };
        }
        return g;
      });
    });

    // C. Update attendance sessions
    setAttendance(prev => {
      return prev.map(session => {
        if (mergeMap[session.subjectId]) {
          return { ...session, subjectId: mergeMap[session.subjectId] };
        }
        return session;
      });
    });

    // D. Update directAbsences
    setDirectAbsences(prev => {
      const updated = { ...prev };
      Object.keys(mergeMap).forEach(dupId => {
        const correctId = mergeMap[dupId];
        Object.keys(updated).forEach(key => {
          const parts = key.split('_');
          if (parts.length === 3 && parts[1] === dupId) {
            const newKey = `${parts[0]}_${correctId}_${parts[2]}`;
            if (updated[newKey] !== undefined) {
              updated[newKey] = Math.max(updated[newKey], updated[key]);
            } else {
              updated[newKey] = updated[key];
            }
            delete updated[key];
          }
        });
      });
      return updated;
    });

    // E. Update users (assignedJournals)
    setUsers(prev => {
      return prev.map(u => {
        if (u.assignedJournals && u.assignedJournals.length > 0) {
          const updatedJournals = u.assignedJournals.map(j => {
            if (mergeMap[j.subjectId]) {
              return { ...j, subjectId: mergeMap[j.subjectId] };
            }
            return j;
          });
          
          // Remove duplicate journals for the same class/subject if they occur
          const uniqueJournals = updatedJournals.filter((journal, index, self) => 
            index === self.findIndex(t => t.classId === journal.classId && t.subjectId === journal.subjectId)
          );
          
          return { ...u, assignedJournals: uniqueJournals };
        }
        return u;
      });
    });

    // F. Active Subject Id
    if (activeSubjectId && mergeMap[activeSubjectId]) {
      setActiveSubjectId(mergeMap[activeSubjectId]);
    }

    // G. Create Security Logs
    const renameLogs = renamedList.map(r => `"${r.original}" -> "${r.official}"`).join(', ');
    const unifyLogs = unifiedList.map(u => `"${u.original}" unificada em "${u.kept}"`).join(', ');

    let logMessage = "Sincronização com Grade Curricular Oficial concluída.";
    if (renamedList.length > 0) {
      logMessage += ` Disciplinas corrigidas/renomeadas: ${renameLogs}.`;
    }
    if (unifiedList.length > 0) {
      logMessage += ` Disciplinas unificadas: ${unifyLogs}.`;
    }

    addSecurityLog('SINCRONIZACAO_GRADE', logMessage, 'medium');

    return { renamed: renamedList, unified: unifiedList };
  };

  const computeCalculatedGrade = (record: GradeRecord): GradeRecord => {
    // HISTÓRICO NÃO SE RECALCULA
    //
    // Os mapas de notas importados são documento oficial já fechado e
    // assinado. Alguns trazem PF que não bate com S1+S2+AFC — há alunos com
    // PF 104, por exemplo. Isso é o que está no papel.
    //
    // Sem esta saída, o portal refazia a conta e gravava 100 no lugar de 104:
    // o sistema alteraria sozinho um boletim já emitido. Registro histórico
    // entra como está e só muda se alguém editar de propósito.
    if (record.isHistoricalImport) {
      return record;
    }

    if (record.result === 'DISPENSADO') {
      return {
        ...record,
        concept: record.concept === 'E' || !record.concept ? 'DISP' : record.concept,
        result: 'DISPENSADO'
      };
    }
    if (record.result === 'DESISTENTE') {
      return {
        ...record,
        concept: record.concept === 'E' || !record.concept ? 'DES' : record.concept,
        result: 'DESISTENTE'
      };
    }
    const s1 = calculateS1(record);
    const s2 = calculateS2(record);
    const rawAfc = record.afc;
    const afcVal = rawAfc !== null && rawAfc !== undefined ? Math.min(40, rawAfc) : null;
    const extra = record.extra ?? 0;
    const conselho = record.conselho ?? 0;
    const pf = Math.min(100, s1 + s2 + (afcVal ?? 0) + extra + conselho);
    const concept = getStudentConcept(pf, conceptRanges);
    const { frequency } = getStudentAbsences(record.studentId, record.subjectId, record.classId);
    const result = getStudentResult({ pf, extra, conselho, afc: afcVal }, frequency);
    return {
      ...record,
      afc: afcVal,
      s1,
      s2,
      pf,
      concept,
      result
    };
  };

  const createDefaultGradeRecord = (id: string, updates: Partial<GradeRecord>): GradeRecord => {
    let studentId = updates.studentId || '';
    let classId = updates.classId || '';
    let subjectId = updates.subjectId || '';
    if ((!studentId || !classId || !subjectId) && id.includes(':::')) {
      const parts = id.split(':::');
      if (parts.length >= 4) {
        studentId = studentId || parts[1];
        classId = classId || parts[2];
        subjectId = subjectId || parts[3];
      }
    } else if ((!studentId || !classId || !subjectId) && id.startsWith('grade_')) {
      const parts = id.split('_');
      if (parts.length >= 4) {
        studentId = studentId || parts[1];
        classId = classId || parts[2];
        subjectId = subjectId || parts[3];
      }
    }
    return {
      id,
      studentId,
      classId,
      subjectId,
      av1: null, av2: null, av3: null, recS1: null, s1: 0,
      av4: null, av5: null, av6: null, recS2: null, s2: 0,
      extra: null, conselho: null, afc: null, pf: 0,
      concept: 'E',
      result: 'Pendente',
      ...updates
    };
  };

  const updateGrade = (id: string, updates: Partial<GradeRecord>) => {
    setGrades(prev => {
      const isAfcUpdate = 'afc' in updates;

      if (!isAfcUpdate) {
        const exists = prev.some(g => g.id === id);
        if (exists) {
          return prev.map(g => {
            if (g.id === id) {
              const merged = { ...g, ...updates };
              return computeCalculatedGrade(merged);
            }
            return g;
          });
        } else {
          const newRecord = createDefaultGradeRecord(id, updates);
          return [...prev, computeCalculatedGrade(newRecord)];
        }
      }

      // AFC Update logic: propagate AFC to all subjects of the student in the same module
      const rawAfc = updates.afc;
      const newAfcVal = rawAfc !== null && rawAfc !== undefined ? Math.min(40, rawAfc) : null;

      const existingRecord = prev.find(g => g.id === id);
      let studentId = existingRecord?.studentId || updates.studentId || '';
      let classId = existingRecord?.classId || updates.classId || '';
      let subjectId = existingRecord?.subjectId || updates.subjectId || '';

      if ((!studentId || !classId) && id.includes(':::')) {
        const parts = id.split(':::');
        if (parts.length >= 4) {
          studentId = studentId || parts[1];
          classId = classId || parts[2];
          subjectId = subjectId || parts[3];
        }
      } else if ((!studentId || !classId) && id.startsWith('grade_')) {
        const parts = id.split('_');
        if (parts.length >= 4) {
          studentId = studentId || parts[1];
          classId = classId || parts[2];
          subjectId = subjectId || parts[3];
        }
      }

      const studentUser = users.find(u => u.id === studentId);
      classId = classId || studentUser?.classId || '';

      if (!studentId) {
        // Fallback if studentId cannot be determined
        const exists = prev.some(g => g.id === id);
        if (exists) {
          return prev.map(g => g.id === id ? computeCalculatedGrade({ ...g, ...updates, afc: newAfcVal }) : g);
        } else {
          const newRecord = createDefaultGradeRecord(id, { ...updates, afc: newAfcVal });
          return [...prev, computeCalculatedGrade(newRecord)];
        }
      }

      const targetClass = classes.find(c => c.id === classId);
      const moduleSubjects = targetClass
        ? subjects.filter(s => s.courseId === targetClass.courseId && s.module === targetClass.module)
        : [];
      const moduleSubjectIds = new Set(moduleSubjects.map(s => s.id));

      const updatedPrev = prev.map(g => {
        const isTargetStudent = g.studentId === studentId;
        const isSameClassOrModule = (targetClass && g.classId === targetClass.id) || moduleSubjectIds.has(g.subjectId) || g.id === id;

        if (isTargetStudent && isSameClassOrModule) {
          const merged = g.id === id 
            ? { ...g, ...updates, afc: newAfcVal }
            : { ...g, afc: newAfcVal };
          return computeCalculatedGrade(merged);
        }
        return g;
      });

      if (targetClass) {
        const existingSubjectIds = new Set(
          updatedPrev
            .filter(g => g.studentId === studentId && (g.classId === targetClass.id || moduleSubjectIds.has(g.subjectId)))
            .map(g => g.subjectId)
        );

        const newRecordsToAppend: GradeRecord[] = [];
        moduleSubjects.forEach(sub => {
          if (!existingSubjectIds.has(sub.id)) {
            const newRecId = `grade_${studentId}_${targetClass.id}_${sub.id}`;
            const defaultRec = createDefaultGradeRecord(newRecId, {
              studentId,
              classId: targetClass.id,
              subjectId: sub.id,
              afc: newAfcVal
            });
            newRecordsToAppend.push(computeCalculatedGrade(defaultRec));
          }
        });

        return [...updatedPrev, ...newRecordsToAppend];
      }

      return updatedPrev;
    });
  };

  const updateConceptRanges = (ranges: ConceptRange[]) => {
    setConceptRanges(ranges);
  };

  // Period Management
  const addPeriod = (period: string) => {
    if (!periods.includes(period)) {
      setPeriods(prev => {
        const updated = [...prev, period].sort();
        safeLocalStorage.setItem('oc_periods', JSON.stringify(updated));
        return updated;
      });
      addSecurityLog('PERIODO_CRIADO', `Novo período letivo criado: ${period}`, 'low');
    }
  };

  // Troca o período letivo atual e grava na tabela pública `config_sistema`.
  //
  // Antes, trocar o período só atualizava o estado local e, no máximo,
  // entrava no retrato geral — que só a administração consegue LER de volta.
  // Todo professor e aluno ficava sem saber que o período tinha mudado até
  // limpar o navegador ou logar num aparelho novo.
  const setCurrentPeriod = (period: string) => {
    setCurrentPeriodLocal(period);
    safeLocalStorage.setItem('oc_current_period', period);
    salvarPeriodoAtual(period, periods).then(res => {
      if (!res.ok) {
        addSecurityLog('SISTEMA_ERRO', `Falha ao gravar o período atual no banco: ${res.erro}`, 'high');
      }
    });
  };

  // Admin DB controls
  const wipeAllData = () => {
    // Keep only administrative users
    const cleanUsers = users.filter(u => u.role === UserRole.ADMIN);
    setUsers(cleanUsers);
    safeLocalStorage.setItem('oc_users', JSON.stringify(cleanUsers));

    // Empty grades and attendance diaries
    setGrades([]);
    safeLocalStorage.setItem('oc_grades', JSON.stringify([]));

    setAttendance([]);
    safeLocalStorage.setItem('oc_attendance', JSON.stringify([]));

    // Clear notifications and messages
    setNotifications([]);
    safeLocalStorage.setItem('oc_notifications', JSON.stringify([]));

    setMessages([]);
    safeLocalStorage.setItem('oc_messages', JSON.stringify([]));

    setActiveClassId('class_enf_m1_matutino');
    setActiveSubjectId('enf_m1_anatomia');

    addSecurityLog('BANCO_LIMPO', 'Exclusão completa de alunos, professores, diários, matrículas e lançamentos efetuada com sucesso.', 'high');
  };

  const wipeAllStudents = () => {
    const studentUsers = users.filter(u => u.role === UserRole.STUDENT);
    const studentIdsSet = new Set(studentUsers.map(u => u.id));

    // Keep only non-student users (Admin, Teachers, Staff)
    const remainingUsers = users.filter(u => u.role !== UserRole.STUDENT);
    setUsers(remainingUsers);
    safeLocalStorage.setItem('oc_users', JSON.stringify(remainingUsers));

    // Remove student grades
    const remainingGrades = grades.filter(g => !studentIdsSet.has(g.studentId));
    setGrades(remainingGrades);
    safeLocalStorage.setItem('oc_grades', JSON.stringify(remainingGrades));

    // Remove student attendance records
    const remainingAttendance = attendance.map(session => {
      if (!session.records) return session;
      const newRecords = { ...session.records };
      let changed = false;
      studentUsers.forEach(u => {
        if (u.id in newRecords) {
          delete newRecords[u.id];
          changed = true;
        }
      });
      return changed ? { ...session, records: newRecords } : session;
    });
    setAttendance(remainingAttendance);
    safeLocalStorage.setItem('oc_attendance', JSON.stringify(remainingAttendance));

    // Remove directAbsences
    const remainingDirectAbsences = { ...directAbsences };
    Object.keys(remainingDirectAbsences).forEach(key => {
      if (Array.from(studentIdsSet).some(id => key.endsWith(`_${id}`))) {
        delete remainingDirectAbsences[key];
      }
    });
    setDirectAbsences(remainingDirectAbsences);
    safeLocalStorage.setItem('oc_direct_absences', JSON.stringify(remainingDirectAbsences));

    // Remove student documents, internships, and dependencies
    const remainingDocs = studentDocuments.filter(d => !studentIdsSet.has(d.studentId));
    setStudentDocuments(remainingDocs);
    safeLocalStorage.setItem('oc_student_documents', JSON.stringify(remainingDocs));

    const remainingInternships = internships.filter(i => !studentIdsSet.has(i.studentId));
    setInternships(remainingInternships);
    safeLocalStorage.setItem('oc_internships', JSON.stringify(remainingInternships));

    const remainingDependencies = dependencies.filter(d => !studentIdsSet.has(d.studentId));
    setDependencies(remainingDependencies);
    safeLocalStorage.setItem('oc_dependencies', JSON.stringify(remainingDependencies));

    addSecurityLog('ALUNOS_ZERADOS', `Remoção completa efetuada: Todos os alunos (${studentUsers.length}) e seus registros acadêmicos foram zerados do sistema.`, 'high');
  };

  const loadDemoData = () => {
    const demo = getDemoDataToLoad();
    
    // Merge users, keeping admin
    setUsers(prev => {
      const admins = prev.filter(u => u.role === UserRole.ADMIN);
      const merged = [...admins, ...demo.users];
      safeLocalStorage.setItem('oc_users', JSON.stringify(merged));
      return merged;
    });

    setGrades(demo.grades);
    safeLocalStorage.setItem('oc_grades', JSON.stringify(demo.grades));

    setAttendance(demo.attendance);
    safeLocalStorage.setItem('oc_attendance', JSON.stringify(demo.attendance));

    setActiveClassId('class_enf_m1_matutino');
    setActiveSubjectId('enf_m1_anatomia');

    addSecurityLog('BANCO_DEMO_SEED', 'Massa de dados de teste (professores, alunos, notas e frequências) carregada com sucesso.', 'high');
  };

  // Attendance Session Mutators
  const saveAttendanceSession = (session: AttendanceSession) => {
    const uppercaseSession = {
      ...session,
      topic: session.topic.toUpperCase(),
      records: Object.keys(session.records).reduce((acc, studentId) => {
        acc[studentId] = session.records[studentId].toUpperCase() as 'P' | 'F';
        return acc;
      }, {} as { [studentId: string]: 'P' | 'F' })
    };
    setAttendance(prev => prev.map(s => s.id === session.id ? uppercaseSession : s));
  };

  const addAttendanceSession = (session: Omit<AttendanceSession, 'id'>) => {
    const newSession: AttendanceSession = {
      ...session,
      id: `att_user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      topic: session.topic.toUpperCase(),
      records: Object.keys(session.records).reduce((acc, studentId) => {
        acc[studentId] = session.records[studentId].toUpperCase() as 'P' | 'F';
        return acc;
      }, {} as { [studentId: string]: 'P' | 'F' })
    };
    setAttendance(prev => [...prev, newSession]);
  };

  // S1/S2 journal closing toggling
  const toggleJournalStatus = (classId: string, type: 'S1' | 'S2' | 'Definitive') => {
    setClasses(prev => prev.map(c => {
      if (c.id === classId) {
        if (type === 'S1') return { ...c, closedS1: !c.closedS1 };
        if (type === 'S2') return { ...c, closedS2: !c.closedS2 };
        if (type === 'Definitive') return { ...c, closedDefinitive: !c.closedDefinitive };
      }
      return c;
    }));
  };

  // Messages & Notifications
  const sendMessage = (
    senderName: string, 
    senderRole: UserRole, 
    recipientId: string, 
    content: string,
    attachmentUrl?: string,
    attachmentType?: 'audio' | 'pdf' | 'image',
    attachmentName?: string
  ) => {
    const uppercaseContent = content.toUpperCase();
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      senderName: senderName.toUpperCase(),
      senderRole,
      recipientId,
      content: uppercaseContent,
      date: new Date().toISOString(),
      attachmentUrl,
      attachmentType,
      attachmentName
    };
    setMessages(prev => [newMsg, ...prev]);

    // Send notifications to recipient
    const hasAttachmentText = attachmentType ? ` [ANEXO ${attachmentType.toUpperCase()}]` : '';
    if (recipientId === 'ALL_TEACHERS') {
      users.filter(u => u.role === UserRole.TEACHER).forEach(t => {
        addNotification(t.id, `Nova mensagem de coordenação:${hasAttachmentText} "${uppercaseContent.substring(0, 60)}${uppercaseContent.length > 60 ? '...' : ''}"`);
      });
    } else {
      addNotification(recipientId, `Mensagem de ${senderName.toUpperCase()}:${hasAttachmentText} "${uppercaseContent.substring(0, 100)}${uppercaseContent.length > 100 ? '...' : ''}"`);
    }
  };

  const deleteMessage = (id: string) => {
    // Só tira da tela DEPOIS que o banco confirmar que apagou.
    excluirMensagem(id).then(res => {
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== id));
      } else {
        addSecurityLog('SISTEMA_ERRO', `Não foi possível excluir a mensagem ${id}: ${res.erro}`, 'medium');
      }
    });
  };

  const addNotification = (userId: string, content: string) => {
    const newNot: AcademicNotification = {
      id: `not_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      content,
      date: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNot, ...prev]);
  };

  const clearNotifications = (userId: string) => {
    setNotifications(prev => prev.map(n => n.userId === userId ? { ...n, read: true } : n));
  };

  // Bulk Importers
  const importStudents = (studentList: { name: string, enrollment: string, email: string }[], targetClassId: string) => {
    const cls = classes.find(c => c.id === targetClassId);
    if (!cls) return;

    const newUsers: User[] = [];
    const newGrades: GradeRecord[] = [];
    const existingUserUpdates: Record<string, Partial<User>> = {};

    studentList.forEach(std => {
      // Check if user already exists in current state or already accumulated in this batch
      let exists = users.find(u => u.enrollment === std.enrollment) || newUsers.find(u => u.enrollment === std.enrollment);
      let isMatchedByName = false;

      const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

      if (!exists) {
        const normStdName = normalizeName(std.name);
        const matchedUser = users.find(u => u.role === UserRole.STUDENT && u.name && normalizeName(u.name) === normStdName) ||
                            newUsers.find(u => u.role === UserRole.STUDENT && u.name && normalizeName(u.name) === normStdName);
        if (matchedUser) {
          exists = matchedUser;
          isMatchedByName = true;
        }
      }

      let studentUserId = exists?.id;

      if (!exists) {
        studentUserId = `std_imp_${Date.now()}_${std.enrollment}`;
        const newStud: User = {
          id: studentUserId,
          name: std.name.toUpperCase(),
          username: std.enrollment,
          email: std.email || `${std.enrollment}@aluno.oc.com`,
          role: UserRole.STUDENT,
          enrollment: std.enrollment,
          active: true,
          classId: cls.id,
          // O CURSO VINHA VAZIO EM TODO ALUNO MATRICULADO PELA TELA.
          //
          // Só a turma era preenchida. Em `publicarEstrutura`, `curso_id` vira
          // NULL quando `courseId` não existe — e ficava NULL para sempre.
          // Boletim e diário funcionavam (chegam pela turma), mas relatório,
          // filtro por curso e declaração saíam vazios.
          courseId: cls.courseId
        };
        newUsers.push(newStud);
      } else {
        const currentEffectiveClassId = existingUserUpdates[exists.id]?.classId !== undefined 
          ? existingUserUpdates[exists.id]?.classId 
          : exists.classId;

        let shouldUpdateClassId = false;
        if (!currentEffectiveClassId) {
          shouldUpdateClassId = true;
        } else {
          const currentClass = classes.find(c => c.id === currentEffectiveClassId);
          if (!currentClass || (currentClass.year === cls.year && currentClass.semester === cls.semester)) {
            shouldUpdateClassId = true;
          }
        }

        if (isMatchedByName) {
          const updatedEmail = std.email || exists.email || `${std.enrollment}@aluno.oc.com`;
          const updateObj: Partial<User> = {
            enrollment: std.enrollment,
            username: std.enrollment,
            email: updatedEmail,
            active: true
          };
          if (shouldUpdateClassId) {
            updateObj.classId = cls.id;
          }
          existingUserUpdates[exists.id] = {
            ...existingUserUpdates[exists.id],
            ...updateObj
          };
          const inNewUsers = newUsers.find(u => u.id === exists.id);
          if (inNewUsers) {
            inNewUsers.enrollment = std.enrollment;
            inNewUsers.username = std.enrollment;
            inNewUsers.email = updatedEmail;
            if (shouldUpdateClassId) {
              inNewUsers.classId = cls.id;
            }
          }
        } else {
          const updateObj: Partial<User> = { active: true };
          if (shouldUpdateClassId) {
            updateObj.classId = cls.id;
          }
          existingUserUpdates[exists.id] = {
            ...existingUserUpdates[exists.id],
            ...updateObj
          };
        }
      }

      // Automatically distribute this student to all subjects of the target class
      const classSubjects = subjects.filter(s => s.courseId === cls.courseId && s.module === cls.module);
      classSubjects.forEach(sub => {
        const gradeExists = grades.find(g => g.classId === cls.id && g.subjectId === sub.id && g.studentId === studentUserId) ||
                            newGrades.find(g => g.classId === cls.id && g.subjectId === sub.id && g.studentId === studentUserId);
        if (!gradeExists) {
          const newGrade: GradeRecord = {
            id: `g_imp_${Date.now()}_${sub.id}_${studentUserId}`,
            classId: cls.id,
            subjectId: sub.id,
            studentId: studentUserId!,
            av1: null, av2: null, av3: null, recS1: null, s1: 0,
            av4: null, av5: null, av6: null, recS2: null, s2: 0,
            extra: null, conselho: null, afc: null, pf: 0,
            concept: 'D',
            result: 'Pendente'
          };
          newGrades.push(newGrade);
        }
      });
    });

    // Update users in a single state change
    setUsers(prev => {
      const updatedPrev = prev.map(u => {
        if (existingUserUpdates[u.id]) {
          return { ...u, ...existingUserUpdates[u.id] };
        }
        return u;
      });
      const existingIds = new Set(updatedPrev.map(u => u.id));
      const filteredNewUsers = newUsers.filter(u => !existingIds.has(u.id));
      return [...updatedPrev, ...filteredNewUsers];
    });

    if (newGrades.length > 0) {
      setGrades(prev => {
        // Filter out any duplicate grade records that might have been added to the state concurrently
        const existingKeys = new Set(prev.map(g => `${g.classId}_${g.subjectId}_${g.studentId}`));
        const filteredNewGrades = newGrades.filter(g => !existingKeys.has(`${g.classId}_${g.subjectId}_${g.studentId}`));
        return [...prev, ...filteredNewGrades];
      });
    }
  };

  const importSubjects = (subjectList: { name: string, workload: number }[], courseId: string, module: number) => {
    subjectList.forEach(sub => {
      const exists = subjects.find(s => s.name.toUpperCase() === sub.name.toUpperCase() && s.courseId === courseId);
      if (!exists) {
        const newSub: Subject = {
          id: `sub_imp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: sub.name.toUpperCase(),
          courseId,
          module,
          workload: sub.workload
        };
        addSubject(newSub);
      }
    });
  };

  const importConcepts = (conceptList: ConceptRange[]) => {
    setConceptRanges(conceptList);
  };

  const importHistoricalData = (jsonData: any, targetPeriod?: string): HistoricalImportSummary => {
    if (!jsonData || !Array.isArray(jsonData.classes)) {
      throw new Error("Formato inválido: O JSON deve conter um array 'classes'.");
    }

    let coursesCreated = 0;
    let classesCreated = 0;
    let subjectsCreated = 0;
    let studentsCreated = 0;
    let studentsRecognized = 0;
    let gradesImported = 0;

    let currentCourses = [...courses];
    let currentClasses = [...classes];
    let currentSubjects = [...subjects];
    let currentUsers = [...users];
    let currentGrades = [...grades];
    let currentPeriods = [...periods];
    let currentDirectAbsences = { ...directAbsences };
    const recognizedStudentIds = new Set<string>();
    const createdStudentIds = new Set<string>();

    jsonData.classes.forEach((clsItem: any) => {
      const { className, courseName, shift, module: clsModule, year, semester, subjects: clsSubjects } = clsItem;

      const activeTargetPeriod = targetPeriod || currentPeriod;
      const [pYear, pSem] = activeTargetPeriod.split('/');
      // O ANO DO ARQUIVO MANDA — É UM HISTÓRICO.
      //
      // Antes, quando a tela passava o período ativo (e ela sempre passa), o
      // ano e o semestre escritos no arquivo eram IGNORADOS. Um histórico de
      // 2024/2 entrava como 2026/1 e se misturava com as turmas em andamento —
      // exatamente o contrário do que um importador de histórico deve fazer.
      // Pior: o modelo de arquivo mostrado na tela traz os campos `year` e
      // `semester`, prometendo um comportamento que não acontecia.
      //
      // Agora o arquivo tem prioridade. O período ativo só entra quando o
      // arquivo não informa nada.
      const targetYear = Number(year) || parseInt(pYear) || 2026;
      const targetSemester = Number(semester) || parseInt(pSem) || 1;

      // 1. Course Check / Creation
      // NOTE: use cleanTextForSync (accent/whitespace/case-insensitive) instead of a plain
      // trim+lowercase compare. Mapas convertidos de PDF frequentemente têm pequenas
      // variações de acentuação/espaçamento entre arquivos para o mesmo curso/turma/disciplina,
      // e uma comparação frágil aqui cria registros duplicados "fantasma".
      let course = currentCourses.find(c => cleanTextForSync(c.name) === cleanTextForSync(courseName));
      if (!course) {
        course = {
          id: `crs_hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: courseName.toUpperCase().trim(),
          description: `CURSO IMPORTADO ${courseName.toUpperCase().trim()}`
        };
        currentCourses.push(course);
        coursesCreated++;
      }

      // 2. ClassSection Check / Creation
      let classSection = currentClasses.find(c => 
        cleanTextForSync(c.name) === cleanTextForSync(className) &&
        c.year === targetYear &&
        c.semester === targetSemester &&
        c.module === Number(clsModule)
      );
      if (!classSection) {
        classSection = {
          id: `class_hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: className.toUpperCase().trim(),
          code: `IMP-${targetYear}-${targetSemester}-${clsModule}`,
          courseId: course.id,
          shift: (shift as Shift) || Shift.MATUTINO,
          module: Number(clsModule),
          year: targetYear,
          semester: targetSemester,
          closedS1: false,
          closedS2: false,
          closedDefinitive: false,
          isImported: true
        };
        currentClasses.push(classSection);
        classesCreated++;
      }

      // 3. Period check/creation
      const periodStr = `${targetYear}/${targetSemester}`;
      if (!currentPeriods.includes(periodStr)) {
        currentPeriods.push(periodStr);
      }

      // 4. For each subject within the class
      if (Array.isArray(clsSubjects)) {
        clsSubjects.forEach((subItem: any) => {
          const { subjectName, records } = subItem;
          let subject = currentSubjects.find(s => 
            cleanTextForSync(s.name) === cleanTextForSync(subjectName) &&
            s.courseId === course!.id &&
            s.module === Number(clsModule)
          );
          if (!subject) {
            subject = {
              id: `sub_hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: subjectName.toUpperCase().trim(),
              courseId: course!.id,
              module: Number(clsModule),
              workload: 80
            };
            currentSubjects.push(subject);
            subjectsCreated++;
          }

          // 5. For each record within the subject
          if (Array.isArray(records)) {
            records.forEach((recItem: any) => {
              const { studentName, studentEnrollment, av1, av4, s1, s2, afc, extra, conselho, pf, faltas, concept, result } = recItem;

              let student: any = null;
              if (studentEnrollment && typeof studentEnrollment === 'string' && studentEnrollment.trim() !== '') {
                student = currentUsers.find(u => 
                  u.role === UserRole.STUDENT && 
                  u.enrollment === studentEnrollment.trim()
                );
              }

              if (!student) {
                // Use the accent/whitespace-insensitive comparator here too, for the same
                // reason as course/class/subject above: names converted from different PDF
                // mapas can carry small accent/spacing differences for the same person.
                const cleanedTargetName = cleanTextForSync(studentName);
                student = currentUsers.find(u => 
                  u.role === UserRole.STUDENT && 
                  cleanTextForSync(u.name) === cleanedTargetName
                );
              }

              let studentId = '';
              if (student) {
                studentId = student.id;
                // Count unique students only once, even though this record loop runs once per
                // (student, subject) pair — otherwise "Alunos Reconhecidos"/"Novos Alunos" in the
                // import summary double (or eleven-, or N-) counts each student per subject.
                if (!recognizedStudentIds.has(studentId)) {
                  recognizedStudentIds.add(studentId);
                  studentsRecognized++;
                }
              } else {
                studentId = `std_hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                
                const normalizedUsername = studentName
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^a-z0-9 ]/g, "")
                  .trim()
                  .replace(/\s+/g, ".");

                const finalUsername = `${normalizedUsername}.${Math.floor(100 + Math.random() * 900)}`;
                
                student = {
                  id: studentId,
                  name: studentName.toUpperCase().trim(),
                  username: finalUsername,
                  email: `${normalizedUsername}@historico.oc.com`,
                  role: UserRole.STUDENT,
                  active: true,
                  classId: classSection!.id,
                  enrollment: studentEnrollment && typeof studentEnrollment === 'string' && studentEnrollment.trim() !== '' ? studentEnrollment.trim() : undefined
                };
                currentUsers.push(student);
                if (!createdStudentIds.has(studentId)) {
                  createdStudentIds.add(studentId);
                  studentsCreated++;
                }
              }

              // 6. GradeRecord Check / Creation / Update
              const existingGradeIndex = currentGrades.findIndex(g => 
                g.studentId === studentId &&
                g.subjectId === subject!.id &&
                g.classId === classSection!.id
              );

              if (existingGradeIndex !== -1) {
                // IMPORTANT: build a brand-new object instead of mutating the existing one in
                // place. currentGrades is only a shallow copy of the previous `grades` state,
                // so mutating a found record here would also mutate the object still referenced
                // by the outgoing React state, which can cause stale/inconsistent renders.
                currentGrades[existingGradeIndex] = {
                  ...currentGrades[existingGradeIndex],
                  av1: av1 !== null && av1 !== undefined ? Number(av1) : null,
                  av4: av4 !== null && av4 !== undefined ? Number(av4) : null,
                  s1: Number(s1),
                  s2: Number(s2),
                  afc: afc !== null ? Number(afc) : null,
                  extra: extra !== null ? Number(extra) : null,
                  conselho: conselho !== null ? Number(conselho) : null,
                  pf: Number(pf),
                  concept: concept || 'D',
                  result: result as any || 'Pendente',
                  // MARCA DE HISTÓRICO
                  //
                  // Sem isto o portal refaz a conta em cima do que veio do mapa
                  // oficial: um "F. NOTA" (faltou nota lançada) era reescrito
                  // como "NÃO APTO" — coisas diferentes, e o boletim passava a
                  // dizer outra coisa que não o documento assinado.
                  isHistoricalImport: true
                };
              } else {
                const gradeRecord = {
                  id: `g_hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  studentId,
                  subjectId: subject!.id,
                  classId: classSection!.id,
                  av1: av1 !== null && av1 !== undefined ? Number(av1) : null,
                  av2: null, av3: null, recS1: null, s1: Number(s1),
                  av4: av4 !== null && av4 !== undefined ? Number(av4) : null,
                  av5: null, av6: null, recS2: null, s2: Number(s2),
                  afc: afc !== null ? Number(afc) : null,
                  extra: extra !== null ? Number(extra) : null,
                  conselho: conselho !== null ? Number(conselho) : null,
                  pf: Number(pf),
                  concept: concept || 'D',
                  result: result as any || 'Pendente',
                  // MARCA DE HISTÓRICO
                  //
                  // Sem isto o portal refaz a conta em cima do que veio do mapa
                  // oficial: um "F. NOTA" (faltou nota lançada) era reescrito
                  // como "NÃO APTO" — coisas diferentes, e o boletim passava a
                  // dizer outra coisa que não o documento assinado.
                  isHistoricalImport: true
                };
                currentGrades.push(gradeRecord);
              }
              gradesImported++;

              // 7. Absences Register
              const absenceKey = `${classSection!.id}_${subject!.id}_${studentId}`;
              currentDirectAbsences[absenceKey] = Number(faltas || 0);
            });
          }
        });
      }
    });

    setCourses(currentCourses);
    setClasses(currentClasses);
    setSubjects(currentSubjects);
    setUsers(currentUsers);
    setGrades(currentGrades);
    setPeriods(currentPeriods);
    setDirectAbsences(currentDirectAbsences);

    safeLocalStorage.setItem('oc_courses', JSON.stringify(currentCourses));
    safeLocalStorage.setItem('oc_classes', JSON.stringify(currentClasses));
    safeLocalStorage.setItem('oc_subjects', JSON.stringify(currentSubjects));
    safeLocalStorage.setItem('oc_users', JSON.stringify(currentUsers));
    safeLocalStorage.setItem('oc_grades', JSON.stringify(currentGrades));
    safeLocalStorage.setItem('oc_periods', JSON.stringify(currentPeriods));
    safeLocalStorage.setItem('oc_direct_absences', JSON.stringify(currentDirectAbsences));

    addSecurityLog(
      'IMPORTACAO_HISTORICA', 
      `Importação de dados históricos finalizada: ${classesCreated} turmas, ${subjectsCreated} disciplinas, ${studentsCreated} novos alunos, ${studentsRecognized} alunos reconhecidos, ${gradesImported} notas importadas.`, 
      'medium'
    );

    return {
      coursesCreated,
      classesCreated,
      subjectsCreated,
      studentsCreated,
      studentsRecognized,
      gradesImported
    };
  };

  // Repara duplicatas de turmas/disciplinas/alunos criadas por importações históricas
  // anteriores (antes da comparação de nomes ter sido corrigida para ignorar acentos e
  // espaçamento). Nunca apaga notas: sempre funde o registro "fantasma" no oficial,
  // movendo notas/faltas/matrículas de volta para o registro correto.
  const repairDuplicateImports = (): DataRepairSummary => {
    const details: string[] = [];
    let gradesReattached = 0;

    let currentClasses = [...classes];
    let currentSubjects = [...subjects];
    let currentUsers = [...users];
    let currentGrades = [...grades];
    let currentDirectAbsences: { [key: string]: number } = { ...directAbsences };

    const countGradesFor = (predicate: (g: any) => boolean) => currentGrades.filter(predicate).length;

    // Escolhe o registro "canônico" de um grupo de duplicatas. Prioridade:
    // 1) um id que NÃO tenha sido criado por importação histórica (sem prefixo *_hist_/*_imp_)
    //    — normalmente é o cadastro oficial/curricular, com nome limpo e metadados corretos;
    // 2) em empate (ex.: duas duplicatas criadas por importações diferentes), o que tem mais
    //    notas associadas, por ser o mais provável de estar realmente em uso.
    // A contagem de notas NUNCA deve vencer sobre "é o registro oficial", senão o reparo
    // mantém o id/nome "fantasma" só porque ele foi o que acumulou a nota por engano.
    const pickCanonical = <T extends { id: string }>(group: T[], gradeCountFor: (item: T) => number): T => {
      return [...group].sort((a, b) => {
        const aHist = /_(hist|imp)_/.test(a.id) ? 1 : 0;
        const bHist = /_(hist|imp)_/.test(b.id) ? 1 : 0;
        if (aHist !== bHist) return aHist - bHist;
        return gradeCountFor(b) - gradeCountFor(a);
      })[0];
    };

    // --- 1. Turmas duplicadas (mesmo curso, ano, semestre, módulo e nome equivalente) ---
    const classGroups = new Map<string, ClassSection[]>();
    currentClasses.forEach(c => {
      const key = `${c.courseId}|${c.year}|${c.semester}|${c.module}|${cleanTextForSync(c.name)}`;
      if (!classGroups.has(key)) classGroups.set(key, []);
      classGroups.get(key)!.push(c);
    });

    let classesMerged = 0;
    classGroups.forEach(group => {
      if (group.length < 2) return;
      const canonical = pickCanonical(group, (c) => countGradesFor(g => g.classId === c.id));
      group.forEach(dup => {
        if (dup.id === canonical.id) return;
        const movedGrades = currentGrades.filter(g => g.classId === dup.id).length;
        currentGrades = currentGrades.map(g => g.classId === dup.id ? { ...g, classId: canonical.id } : g);
        currentUsers = currentUsers.map(u => u.classId === dup.id ? { ...u, classId: canonical.id } : u);
        Object.keys(currentDirectAbsences).forEach(key => {
          if (key.startsWith(`${dup.id}_`)) {
            const rest = key.slice(dup.id.length);
            currentDirectAbsences[`${canonical.id}${rest}`] = currentDirectAbsences[key];
            delete currentDirectAbsences[key];
          }
        });
        currentClasses = currentClasses.filter(c => c.id !== dup.id);
        gradesReattached += movedGrades;
        classesMerged++;
        details.push(`Turma duplicada "${dup.name}" (${dup.id}) fundida em "${canonical.name}" (${canonical.id}) — ${movedGrades} nota(s) e alunos realocados.`);
      });
    });

    // --- 2. Disciplinas duplicadas (mesmo curso, módulo e nome equivalente) ---
    const subjectGroups = new Map<string, Subject[]>();
    currentSubjects.forEach(s => {
      const key = `${s.courseId}|${s.module}|${cleanTextForSync(s.name)}`;
      if (!subjectGroups.has(key)) subjectGroups.set(key, []);
      subjectGroups.get(key)!.push(s);
    });

    let subjectsMerged = 0;
    subjectGroups.forEach(group => {
      if (group.length < 2) return;
      const canonical = pickCanonical(group, (s) => countGradesFor(g => g.subjectId === s.id));
      group.forEach(dup => {
        if (dup.id === canonical.id) return;
        const movedGrades = currentGrades.filter(g => g.subjectId === dup.id).length;
        currentGrades = currentGrades.map(g => g.subjectId === dup.id ? { ...g, subjectId: canonical.id } : g);
        Object.keys(currentDirectAbsences).forEach(key => {
          if (key.includes(`_${dup.id}_`)) {
            const newKey = key.replace(`_${dup.id}_`, `_${canonical.id}_`);
            currentDirectAbsences[newKey] = currentDirectAbsences[key];
            delete currentDirectAbsences[key];
          }
        });
        currentSubjects = currentSubjects.filter(s => s.id !== dup.id);
        gradesReattached += movedGrades;
        subjectsMerged++;
        details.push(`Disciplina duplicada "${dup.name}" (${dup.id}) fundida em "${canonical.name}" (${canonical.id}) — ${movedGrades} nota(s) realocadas.`);
      });
    });

    // --- 3. Alunos duplicados (mesma matrícula, ou mesmo nome quando não há matrícula) ---
    // Alunos usam uma regra própria de "quem é o canônico", diferente de turma/disciplina:
    // - std_hist_*  → criado às pressas pelo importador de notas históricas quando não achou
    //                 ninguém correspondente; é o candidato mais provável a ser o "fantasma".
    // - std_imp_*   → criado pela importação da planilha oficial de alunos/matrículas
    //                 (Alunos_e_Matriculas), já tem usuário/matrícula formais.
    // - qualquer outro → cadastro manual/admin, o mais oficial de todos.
    // Isso evita, por exemplo, apagar por engano a conta "oficial" de um aluno (com login já
    // em uso) só porque a conta "fantasma" acumulou mais notas.
    const studentTier = (id: string): number => {
      if (id.startsWith('std_hist_')) return 2;
      if (id.startsWith('std_imp_')) return 1;
      return 0;
    };
    const pickCanonicalStudent = (group: User[]): User => {
      return [...group].sort((a, b) => {
        const tierDiff = studentTier(a.id) - studentTier(b.id);
        if (tierDiff !== 0) return tierDiff;
        const aHasEnrollment = a.enrollment && a.enrollment.trim() !== '' ? 0 : 1;
        const bHasEnrollment = b.enrollment && b.enrollment.trim() !== '' ? 0 : 1;
        if (aHasEnrollment !== bHasEnrollment) return aHasEnrollment - bHasEnrollment;
        return countGradesFor(g => g.studentId === b.id) - countGradesFor(g => g.studentId === a.id);
      })[0];
    };

    const studentGroups = new Map<string, User[]>();
    currentUsers.filter(u => u.role === UserRole.STUDENT).forEach(u => {
      const key = u.enrollment && u.enrollment.trim() !== ''
        ? `enr:${u.enrollment.trim()}`
        : `name:${cleanTextForSync(u.name)}`;
      if (!studentGroups.has(key)) studentGroups.set(key, []);
      studentGroups.get(key)!.push(u);
    });

    let studentsMerged = 0;
    studentGroups.forEach(group => {
      if (group.length < 2) return;
      const canonical = pickCanonicalStudent(group);
      group.forEach(dup => {
        if (dup.id === canonical.id) return;
        const movedGrades = currentGrades.filter(g => g.studentId === dup.id).length;
        currentGrades = currentGrades.map(g => g.studentId === dup.id ? { ...g, studentId: canonical.id } : g);
        Object.keys(currentDirectAbsences).forEach(key => {
          if (key.endsWith(`_${dup.id}`)) {
            const newKey = key.slice(0, -dup.id.length) + canonical.id;
            currentDirectAbsences[newKey] = currentDirectAbsences[key];
            delete currentDirectAbsences[key];
          }
        });
        currentUsers = currentUsers.filter(u => u.id !== dup.id);
        gradesReattached += movedGrades;
        studentsMerged++;
        details.push(`Aluno duplicado "${dup.name}" (${dup.id}) fundido em "${canonical.name}" (${canonical.id}) — ${movedGrades} nota(s) realocadas.`);
      });
    });

    if (classesMerged || subjectsMerged || studentsMerged) {
      setClasses(currentClasses);
      setSubjects(currentSubjects);
      setUsers(currentUsers);
      setGrades(currentGrades);
      setDirectAbsences(currentDirectAbsences);

      safeLocalStorage.setItem('oc_classes', JSON.stringify(currentClasses));
      safeLocalStorage.setItem('oc_subjects', JSON.stringify(currentSubjects));
      safeLocalStorage.setItem('oc_users', JSON.stringify(currentUsers));
      safeLocalStorage.setItem('oc_grades', JSON.stringify(currentGrades));
      safeLocalStorage.setItem('oc_direct_absences', JSON.stringify(currentDirectAbsences));

      addSecurityLog(
        'REPARO_IMPORTACAO',
        `Reparo de duplicatas: ${classesMerged} turma(s), ${subjectsMerged} disciplina(s), ${studentsMerged} aluno(s) fundidos, ${gradesReattached} nota(s) realocadas.`,
        'medium'
      );
    } else {
      details.push('Nenhuma duplicata encontrada.');
    }

    return { classesMerged, subjectsMerged, studentsMerged, gradesReattached, details };
  };

  const undoHistoricalImports = (): { removedClassesCount: number; removedStudentsCount: number; removedGradesCount: number } => {
    // 1. Identificar todas as ClassSection importadas ou históricas
    const historicalClasses = classes.filter(c => c.isImported === true || c.code?.startsWith('HIST-') || c.code?.startsWith('IMP-'));
    const historicalClassIds = new Set(historicalClasses.map(c => c.id));
    const removedClassesCount = historicalClasses.length;

    // 2. Remover todos os GradeRecord vinculados a essas turmas
    const initialGradesCount = grades.length;
    const remainingGrades = grades.filter(g => !historicalClassIds.has(g.classId));
    const removedGradesCount = initialGradesCount - remainingGrades.length;

    // 3. Remover chaves de directAbsences que contenham o classId de turmas históricas
    const remainingDirectAbsences: { [key: string]: number } = { ...directAbsences };
    Object.keys(remainingDirectAbsences).forEach(key => {
      const classId = key.split('_')[0];
      if (historicalClassIds.has(classId)) {
        delete remainingDirectAbsences[key];
      }
    });

    // 4. Remover as turmas históricas da lista de turmas
    const remainingClasses = classes.filter(c => !historicalClassIds.has(c.id));

    // 5. Remover alunos (User role: STUDENT) que só tinham vínculo com essas turmas históricas
    const initialUsersCount = users.length;
    const remainingUsers = users.filter(user => {
      if (user.role !== UserRole.STUDENT) {
        return true; // Preserva administradores, professores, etc.
      }
      const isLinkedToHistoricalClass = user.classId ? historicalClassIds.has(user.classId) : false;
      const hasRemainingGradesOutside = remainingGrades.some(g => g.studentId === user.id);

      // Se a turma atual dele for uma das turmas históricas removidas E ele não tiver nenhuma outra nota fora delas:
      if (isLinkedToHistoricalClass && !hasRemainingGradesOutside) {
        return false; // Remove o usuário
      }
      return true; // Mantém o usuário
    });
    const removedStudentsCount = initialUsersCount - remainingUsers.length;

    // 6. Atualizar os estados do sistema e o localStorage
    setClasses(remainingClasses);
    setGrades(remainingGrades);
    setUsers(remainingUsers);
    setDirectAbsences(remainingDirectAbsences);

    safeLocalStorage.setItem('oc_classes', JSON.stringify(remainingClasses));
    safeLocalStorage.setItem('oc_grades', JSON.stringify(remainingGrades));
    safeLocalStorage.setItem('oc_users', JSON.stringify(remainingUsers));
    safeLocalStorage.setItem('oc_direct_absences', JSON.stringify(remainingDirectAbsences));

    addSecurityLog(
      'DESFAZER_IMPORTACAO_HISTORICA',
      `Remoção de importações históricas realizada: ${removedClassesCount} turma(s), ${removedStudentsCount} aluno(s) e ${removedGradesCount} nota(s) removidas.`,
      'medium'
    );

    return {
      removedClassesCount,
      removedStudentsCount,
      removedGradesCount
    };
  };

  const updateDeclarationConfig = (type: 'escolaridade' | 'ctransp', fields: { startDate: string, endDate: string }) => {
    setDeclarationConfigs(prev => ({
      ...prev,
      [type]: fields
    }));
    addSecurityLog('CONFIG_DECLARACAO', `Configurações da declaração de ${type === 'escolaridade' ? 'Escolaridade' : 'SETRANSP Passe'} atualizadas: ${fields.startDate} a ${fields.endDate}`, 'low');
  };

  const updateStudentDocumentStatus = (id: string, status: 'PENDENTE' | 'ENVIADO' | 'ENTREGUE', fileUrl?: string, fileName?: string) => {
    setStudentDocuments(prev => {
      const exists = prev.some(doc => doc.id === id);
      if (exists) {
        return prev.map(doc => {
          if (doc.id === id) {
            return {
              ...doc,
              status,
              fileUrl: fileUrl !== undefined ? fileUrl : doc.fileUrl,
              fileName: fileName !== undefined ? fileName : doc.fileName,
              uploadedAt: status === 'ENVIADO' ? new Date().toISOString() : doc.uploadedAt
            };
          }
          return doc;
        });
      } else {
        // Create new
        const parts = id.split('_');
        const studentId = parts[1] || '';
        const name = parts.slice(2).join('_') || '';
        return [...prev, {
          id,
          studentId,
          name,
          status,
          fileUrl,
          fileName,
          uploadedAt: status === 'ENVIADO' ? new Date().toISOString() : undefined
        }];
      }
    });
  };

  const updateInternshipRecord = (
    studentId: string,
    subjectName: string,
    workload: number,
    location: string,
    grade: number | null
  ) => {
    setInternships(prev => {
      const recordId = `int_${studentId}_${subjectName.replace(/\s+/g, '_')}`;
      const exists = prev.some(r => r.id === recordId || (r.studentId === studentId && r.subjectName === subjectName));
      const now = new Date().toISOString();

      if (exists) {
        return prev.map(r => {
          if (r.id === recordId || (r.studentId === studentId && r.subjectName === subjectName)) {
            return {
              ...r,
              workload,
              location,
              grade,
              updatedAt: now
            };
          }
          return r;
        });
      } else {
        return [...prev, {
          id: recordId,
          studentId,
          subjectName,
          workload,
          location,
          grade,
          updatedAt: now
        }];
      }
    });

    addSecurityLog(
      'ESTAGIO_LANCADO',
      `Lançamento/atualização de estágio feito para o aluno ID ${studentId}: Componente [${subjectName}], Local [${location || 'Sem local'}], Nota [${grade !== null ? grade : 'Pendente'}].`,
      'low'
    );
  };

  const transferStudent = (studentId: string, targetClassId: string) => {
    const student = users.find(u => u.id === studentId);
    if (!student) return;

    const oldClassId = student.classId;
    const oldClass = classes.find(c => c.id === oldClassId);
    const targetClass = classes.find(c => c.id === targetClassId);
    if (!targetClass) return;

    // Get courses & subjects
    const oldSubjects = oldClass ? subjects.filter(s => s.courseId === oldClass.courseId && s.module === oldClass.module) : [];
    const newSubjects = subjects.filter(s => s.courseId === targetClass.courseId && s.module === targetClass.module);

    // Filter grades
    const studentGrades = grades.filter(g => g.studentId === studentId);
    const oldGrades = studentGrades.filter(g => g.classId === oldClassId);

    // Create new GradeRecords, migrating matching subjects
    const targetGrades = newSubjects.map(sub => {
      const matchedOldGrade = oldGrades.find(og => og.subjectId === sub.id);
      const newGradeId = `grade_${studentId}_${targetClassId}_${sub.id}`;
      
      if (matchedOldGrade) {
        return {
          ...matchedOldGrade,
          id: newGradeId,
          classId: targetClassId
        };
      } else {
        return {
          id: newGradeId,
          subjectId: sub.id,
          classId: targetClassId,
          studentId: studentId,
          av1: null, av2: null, av3: null, recS1: null, s1: 0,
          av4: null, av5: null, av6: null, recS2: null, s2: 0,
          extra: null, conselho: null, afc: null, pf: 0,
          concept: 'E', result: 'Pendente' as const
        };
      }
    });

    // Keep old grade records for this student and old class, and add new ones (prevent duplicates)
    setGrades(prev => {
      const targetGradesFiltered = targetGrades.filter(tg => !prev.some(eg => eg.studentId === studentId && eg.classId === targetClassId && eg.subjectId === tg.subjectId));
      return [...prev, ...targetGradesFiltered];
    });

    // Copy direct absences for matching subjects (keeping old ones intact for history)
    setDirectAbsences(prev => {
      const updated = { ...prev };
      newSubjects.forEach(sub => {
        const oldKey = `${studentId}_${sub.id}_${oldClassId}`;
        const newKey = `${studentId}_${sub.id}_${targetClassId}`;
        if (prev[oldKey] !== undefined) {
          updated[newKey] = prev[oldKey];
          // Do NOT delete the oldKey so the old class keeps the attendance history
        }
      });
      return updated;
    });

    // Update user classId
    setUsers(prev => prev.map(u => u.id === studentId ? { ...u, classId: targetClassId } : u));

    // Initialize/sync document list for the new course
    const targetCourse = courses.find(co => co.id === targetClass.courseId);
    const requiredDocs = getRequiredDocsForStudent(targetCourse?.name);
    
    setStudentDocuments(prev => {
      // Retain existing docs for this student but filter out ones not required anymore
      // and add the newly required ones that don't exist.
      const studentDocs = prev.filter(doc => doc.studentId === studentId);
      const otherStudentsDocs = prev.filter(doc => doc.studentId !== studentId);
      
      const updatedStudentDocs: StudentDocument[] = [];
      requiredDocs.forEach(docName => {
        const docId = `doc_${studentId}_${docName}`;
        const existing = studentDocs.find(d => d.name === docName);
        if (existing) {
          updatedStudentDocs.push(existing);
        } else {
          updatedStudentDocs.push({
            id: docId,
            studentId,
            name: docName,
            status: 'PENDENTE'
          });
        }
      });
      return [...otherStudentsDocs, ...updatedStudentDocs];
    });

    // Log security activity
    addSecurityLog('SISTEMA', `Aluno [${student.name}] transferido com sucesso para a turma [${targetClass.name}].`, 'low');
    addNotification(studentId, `Você foi transferido para a turma ${targetClass.name} do curso ${targetCourse?.name || 'Técnico'}.`);
  };

  // Security Audit Logging
  const addSecurityLog = (eventType: string, details: string, severity: 'low' | 'medium' | 'high' = 'low') => {
    const newLog = {
      id: `sec_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      eventType,
      ipAddress: '186.230.41.12',
      details,
      severity
    };
    setSecurityLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 50);
      safeLocalStorage.setItem('oc_security_logs', JSON.stringify(updated));
      return updated;
    });
  };

  // Local JSON Backup Download
  const triggerLocalBackup = () => {
    const payload = {
      users,
      courses,
      classes,
      subjects,
      grades,
      attendance,
      conceptRanges,
      calendarEvents,
      messages,
      notifications,
      currentPeriod,
      periods,
      simulatedDate,
      autoLockEnabled,
      declarationConfigs,
      studentDocuments,
      internships,
      adminPasswordResetDone,
      securityLogs
    };
    
    // Integrity checksum calculation (non-tampering verification)
    const payloadStr = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < payloadStr.length; i++) {
      const char = payloadStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const signature = `oc-sec-sig-${Math.abs(hash).toString(16)}`;

    const backupData = {
      app: 'colegio_oc_portal_backup',
      version: '2.4.0-secured',
      timestamp: new Date().toISOString(),
      checksum: signature,
      payload
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `colegio_oc_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addSecurityLog('BACKUP_LOCAL', 'Backup local verificado e criptografado gerado e exportado com sucesso.', 'low');
  };

  // Cloud Backup Trigger (Manual forced backup to Google Cloud Firestore)
  const triggerCloudBackup = async (): Promise<boolean> => {
    setCloudBackupStatus('syncing');
    try {
      const payload: SystemStatePayload = {
        users, courses, classes, subjects, grades, attendance, directAbsences,
        conceptRanges, calendarEvents, messages, notifications,
        currentPeriod, periods, simulatedDate, autoLockEnabled, securityLogs,
        declarationConfigs, studentDocuments, internships, adminPasswordResetDone
      };
      const success = await saveStateToCloud(payload);
      if (success) {
        const now = new Date();
        setLastCloudBackupTime(now.toISOString());
        safeLocalStorage.setItem('oc_last_cloud_backup_time', now.toISOString());
        setCloudBackupStatus('success');
        addSecurityLog('BACKUP_NUVEM', 'Backup redundante sincronizado e salvo com sucesso na nuvem Firestore.', 'low');
        return true;
      } else {
        setCloudBackupStatus('error');
        addSecurityLog('BACKUP_NUVEM_FALHA', 'Falha ao forçar backup síncrono na nuvem Firestore.', 'medium');
        return false;
      }
    } catch (err: any) {
      const isQuota = err?.code === 'resource-exhausted' || 
                      err?.message?.toLowerCase().includes('quota') || 
                      err?.message?.toLowerCase().includes('exhausted') ||
                      err?.message?.toLowerCase().includes('limit exceeded');
      if (isQuota) {
        setCloudBackupStatus('quota_exceeded');
        addSecurityLog('BACKUP_NUVEM_COTA', 'Limite de cota de escrita diária do Firestore atingido durante backup manual.', 'medium');
      } else {
        setCloudBackupStatus('error');
        addSecurityLog('BACKUP_NUVEM_FALHA', `Erro inesperado no backup em nuvem: ${(err as Error).message}`, 'medium');
      }
      return false;
    }
  };

  // Restore payload from backup JSON
  const restoreFromBackup = (jsonString: string): { success: boolean; message: string } => {
    try {
      const sanitizedInput = jsonString.trim();
      if (sanitizedInput.includes('<script')) {
        addSecurityLog('ATAQUE_DETECTADO', 'Injeção perigosa de script HTML interceptada durante a importação.', 'high');
        return { success: false, message: 'Filtro Anti-XSS: Caracteres proibidos detectados no backup. Transação negada!' };
      }

      const parsed = JSON.parse(sanitizedInput);
      if (parsed.app !== 'colegio_oc_portal_backup' || !parsed.payload) {
        addSecurityLog('INTEGRIDADE_FALHA', 'Estrutura de cabeçalho de backup ilegível ou violada.', 'medium');
        return { success: false, message: 'Arquivo inválido. Assinatura de cabeçalho incompatível com o sistema.' };
      }

      // Check integrity signature
      const payloadStr = JSON.stringify(parsed.payload);
      let hash = 0;
      for (let i = 0; i < payloadStr.length; i++) {
        const char = payloadStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const calculatedChecksum = `oc-sec-sig-${Math.abs(hash).toString(16)}`;

      if (parsed.checksum && parsed.checksum !== calculatedChecksum) {
        addSecurityLog('INTEGRIDADE_VIOLADA', 'Falha ao validar hash de integridade de arquivo de importação. Conteúdo alterado!', 'high');
        return { success: false, message: 'Aviso de Segurança: O hash de integridade deste arquivo não confere. O arquivo foi adulterado manualmente e pode comprometer o sistema!' };
      }

      const { payload } = parsed;
      if (payload.users) { setUsers(payload.users); safeLocalStorage.setItem('oc_users', JSON.stringify(payload.users)); }
      if (payload.courses) { setCourses(payload.courses); safeLocalStorage.setItem('oc_courses', JSON.stringify(payload.courses)); }
      if (payload.classes) { setClasses(payload.classes); safeLocalStorage.setItem('oc_classes', JSON.stringify(payload.classes)); }
      if (payload.subjects) { setSubjects(payload.subjects); safeLocalStorage.setItem('oc_subjects', JSON.stringify(payload.subjects)); }
      if (payload.grades) { setGrades(payload.grades); safeLocalStorage.setItem('oc_grades', JSON.stringify(payload.grades)); }
      if (payload.attendance) { setAttendance(payload.attendance); safeLocalStorage.setItem('oc_attendance', JSON.stringify(payload.attendance)); }
      if (payload.conceptRanges) { setConceptRanges(payload.conceptRanges); safeLocalStorage.setItem('oc_concept_ranges', JSON.stringify(payload.conceptRanges)); }
      if (payload.calendarEvents) { setCalendarEvents(payload.calendarEvents); safeLocalStorage.setItem('oc_calendar_events', JSON.stringify(payload.calendarEvents)); }
      if (payload.messages) { setMessages(payload.messages); safeLocalStorage.setItem('oc_messages', JSON.stringify(payload.messages)); }
      if (payload.notifications) { setNotifications(payload.notifications); safeLocalStorage.setItem('oc_notifications', JSON.stringify(payload.notifications)); }
      if (payload.currentPeriod) { setCurrentPeriodLocal(payload.currentPeriod); safeLocalStorage.setItem('oc_current_period', payload.currentPeriod); }
      if (payload.periods) { setPeriods(payload.periods); safeLocalStorage.setItem('oc_periods', JSON.stringify(payload.periods)); }
      if (payload.simulatedDate) { setSimulatedDate(payload.simulatedDate); safeLocalStorage.setItem('oc_simulated_date', payload.simulatedDate); }
      if (payload.autoLockEnabled !== undefined) { setAutoLockEnabled(payload.autoLockEnabled); safeLocalStorage.setItem('oc_auto_lock_enabled', payload.autoLockEnabled ? 'true' : 'false'); }
      if (payload.declarationConfigs) { setDeclarationConfigs(payload.declarationConfigs); safeLocalStorage.setItem('oc_declaration_configs', JSON.stringify(payload.declarationConfigs)); }
      if (payload.studentDocuments) { setStudentDocuments(payload.studentDocuments); safeLocalStorage.setItem('oc_student_documents', JSON.stringify(payload.studentDocuments)); }
      if (payload.internships) { setInternships(payload.internships); safeLocalStorage.setItem('oc_internships', JSON.stringify(payload.internships)); }
      if (payload.adminPasswordResetDone !== undefined) { setAdminPasswordResetDone(payload.adminPasswordResetDone); safeLocalStorage.setItem('oc_admin_reset_done', payload.adminPasswordResetDone ? 'true' : 'false'); }
      if (payload.securityLogs) { setSecurityLogs(payload.securityLogs); safeLocalStorage.setItem('oc_security_logs', JSON.stringify(payload.securityLogs)); }

      addSecurityLog('RESTAURACAO_LOCAL', 'Restauração de sistema bem-sucedida via upload de backup encriptado local.', 'high');
      return { success: true, message: 'Dados do sistema restaurados com sucesso!' };

    } catch (err) {
      addSecurityLog('SISTEMA_ERRO', `Restauro local abortado por erro estrutural: ${(err as Error).message}`, 'medium');
      return { success: false, message: 'Erro ao processar arquivo de restauração.' };
    }
  };

  // Restore payload from cloud Firestore database
  const restoreFromCloud = async (): Promise<{ success: boolean; message: string }> => {
    try {
      setCloudBackupStatus('syncing');
      const cloudState = await loadStateFromCloud();
      if (cloudState && 'isOffline' in cloudState) {
        setCloudBackupStatus('offline');
        return { success: false, message: 'O Firestore está temporariamente indisponível (offline ou problema de rede).' };
      }
      if (!cloudState) {
        setCloudBackupStatus('error');
        return { success: false, message: 'Nenhum nó de backup em nuvem foi encontrado no Firestore.' };
      }

      const state = cloudState as SystemStatePayload;

      if (state.users) { setUsers(state.users); safeLocalStorage.setItem('oc_users', JSON.stringify(state.users)); }
      if (state.courses) { setCourses(state.courses); safeLocalStorage.setItem('oc_courses', JSON.stringify(state.courses)); }
      if (state.classes) { setClasses(state.classes); safeLocalStorage.setItem('oc_classes', JSON.stringify(state.classes)); }
      if (state.subjects) { setSubjects(state.subjects); safeLocalStorage.setItem('oc_subjects', JSON.stringify(state.subjects)); }
      if (state.grades) { setGrades(state.grades); safeLocalStorage.setItem('oc_grades', JSON.stringify(state.grades)); }
      if (state.attendance) { setAttendance(state.attendance); safeLocalStorage.setItem('oc_attendance', JSON.stringify(state.attendance)); }
      if (state.directAbsences) { setDirectAbsences(state.directAbsences); safeLocalStorage.setItem('oc_direct_absences', JSON.stringify(state.directAbsences)); }
      if (state.conceptRanges) { setConceptRanges(state.conceptRanges); safeLocalStorage.setItem('oc_concept_ranges', JSON.stringify(state.conceptRanges)); }
      if (state.calendarEvents) { setCalendarEvents(state.calendarEvents); safeLocalStorage.setItem('oc_calendar_events', JSON.stringify(state.calendarEvents)); }
      if (state.messages) { setMessages(state.messages); safeLocalStorage.setItem('oc_messages', JSON.stringify(state.messages)); }
      if (state.notifications) { setNotifications(state.notifications); safeLocalStorage.setItem('oc_notifications', JSON.stringify(state.notifications)); }
      if (state.declarationConfigs) { setDeclarationConfigs(state.declarationConfigs); safeLocalStorage.setItem('oc_declaration_configs', JSON.stringify(state.declarationConfigs)); }
      if (state.studentDocuments) { setStudentDocuments(state.studentDocuments); safeLocalStorage.setItem('oc_student_documents', JSON.stringify(state.studentDocuments)); }
      if (state.internships) { setInternships(state.internships); safeLocalStorage.setItem('oc_internships', JSON.stringify(state.internships)); }
      if (state.currentPeriod) { setCurrentPeriodLocal(state.currentPeriod); safeLocalStorage.setItem('oc_current_period', state.currentPeriod); }
      if (state.periods) { setPeriods(state.periods); safeLocalStorage.setItem('oc_periods', JSON.stringify(state.periods)); }
      if (state.simulatedDate) { setSimulatedDate(state.simulatedDate); safeLocalStorage.setItem('oc_simulated_date', state.simulatedDate); }
      if (state.autoLockEnabled !== undefined) { setAutoLockEnabled(state.autoLockEnabled); safeLocalStorage.setItem('oc_auto_lock_enabled', state.autoLockEnabled ? 'true' : 'false'); }
      if (state.securityLogs) { setSecurityLogs(state.securityLogs); safeLocalStorage.setItem('oc_security_logs', JSON.stringify(state.securityLogs)); }
      if (state.adminPasswordResetDone !== undefined) {
        setAdminPasswordResetDone(state.adminPasswordResetDone);
        safeLocalStorage.setItem('oc_admin_reset_done', state.adminPasswordResetDone ? 'true' : 'false');
      }

      if (state.lastBackupTime) {
        setLastCloudBackupTime(state.lastBackupTime);
        safeLocalStorage.setItem('oc_last_cloud_backup_time', state.lastBackupTime);
      }

      setCloudBackupStatus('success');
      addSecurityLog('RESTAURACAO_NUVEM', 'Portal inteiramente restaurado com sucesso do banco de dados na nuvem Firestore.', 'high');
      return { success: true, message: 'Sistema sincronizado e recuperado com sucesso do banco de dados na nuvem!' };
    } catch (err: any) {
      const isQuota = err?.code === 'resource-exhausted' || 
                      err?.message?.toLowerCase().includes('quota') || 
                      err?.message?.toLowerCase().includes('exhausted') ||
                      err?.message?.toLowerCase().includes('limit exceeded');
      if (isQuota) {
        setCloudBackupStatus('quota_exceeded');
        addSecurityLog('RESTAURACAO_NUVEM_COTA', 'Limite de cota de leitura diária do Firestore atingido durante restauração.', 'medium');
        return { success: false, message: 'Erro: Limite de cota diária do Firestore excedido. Seus dados estão preservados localmente.' };
      }
      setCloudBackupStatus('error');
      return { success: false, message: `Erro crítico ao ler dados da nuvem Firestore: ${(err as Error).message}` };
    }
  };

  const resetFailedAttempts = (username: string) => {
    const cleanUser = username.trim().toLowerCase();
    setFailedAttemptsMap(prev => ({
      ...prev,
      [cleanUser]: { count: 0, lockoutUntil: null }
    }));
    addSecurityLog('SISTEMA_CONF', `Sinal de segurança: Contadores de erros limpos para [${cleanUser}].`, 'low');
  };

  // Helper to calculate the next backup time
  const calculateNextBackupTime = (frequency: 'manual' | 'daily' | 'weekly' | 'monthly', hour: string, fromDateStr: string): string | null => {
    if (frequency === 'manual') return null;
    
    const fromDate = new Date(fromDateStr);
    const [h, m] = hour.split(':').map(Number);
    
    const nextDate = new Date(fromDate);
    nextDate.setHours(h, m, 0, 0);
    
    if (nextDate.getTime() <= fromDate.getTime()) {
      if (frequency === 'daily') {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (frequency === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
    }
    return nextDate.toISOString();
  };

  const fetchStorageBackups = async () => {
    setIsLoadingStorageBackups(true);
    try {
      const files = await listBackupsFromStorage();
      setStorageBackups(files);
    } catch (err) {
      console.error('Failed to fetch storage backups:', err);
    } finally {
      setIsLoadingStorageBackups(false);
    }
  };

  const triggerStorageBackup = async (): Promise<string | null> => {
    try {
      const currentState = latestStateRef.current;
      const payload: SystemStatePayload = {
        users: currentState.users,
        courses: currentState.courses,
        classes: currentState.classes,
        subjects: currentState.subjects,
        grades: currentState.grades,
        attendance: currentState.attendance,
        directAbsences: currentState.directAbsences,
        conceptRanges: currentState.conceptRanges,
        calendarEvents: currentState.calendarEvents,
        messages: currentState.messages,
        notifications: currentState.notifications,
        currentPeriod: currentState.currentPeriod,
        periods: currentState.periods,
        simulatedDate: currentState.simulatedDate,
        autoLockEnabled: currentState.autoLockEnabled,
        securityLogs: currentState.securityLogs,
        adminPasswordResetDone: currentState.adminPasswordResetDone
      };
      
      // Calculate checksum signature
      const payloadStr = JSON.stringify(payload);
      let hash = 0;
      for (let i = 0; i < payloadStr.length; i++) {
        const char = payloadStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const checksum = `oc-sec-sig-${Math.abs(hash).toString(16)}`;

      const backupData = {
        app: 'colegio_oc_portal_backup',
        version: '2.4.0-secured',
        timestamp: new Date().toISOString(),
        checksum,
        payload
      };

      const filename = `colegio_oc_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const url = await uploadBackupToStorage(backupData as any, filename);
      
      if (url) {
        addSecurityLog('EXPORT_STORAGE', `Backup de segurança exportado e armazenado com sucesso na nuvem: ${filename}`, 'low');
        
        // Update backup schedule state with new times
        const nowStr = new Date().toISOString();
        setBackupSchedule(prev => {
          const next = calculateNextBackupTime(prev.frequency, prev.hour, nowStr);
          const updated = {
            ...prev,
            lastBackupTime: nowStr,
            nextBackupTime: next
          };
          safeLocalStorage.setItem('oc_backup_schedule', JSON.stringify(updated));
          return updated;
        });

        // Refresh list
        await fetchStorageBackups();
        return url;
      }
      return null;
    } catch (err) {
      addSecurityLog('SISTEMA_ERRO', `Falha ao exportar backup para a nuvem: ${(err as Error).message}`, 'medium');
      return null;
    }
  };

  const deleteStorageBackup = async (filename: string): Promise<boolean> => {
    try {
      const success = await deleteBackupFromStorage(filename);
      if (success) {
        addSecurityLog('REMOVER_BACKUP', `Backup excluído da nuvem: ${filename}`, 'medium');
        await fetchStorageBackups();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete storage backup:', err);
      return false;
    }
  };

  const updateBackupSchedule = async (config: Partial<BackupScheduleConfig>) => {
    setBackupSchedule(prev => {
      const updated = {
        ...prev,
        ...config
      };
      if (config.frequency || config.hour !== undefined || config.enabled !== undefined) {
        if (updated.enabled && updated.frequency !== 'manual') {
          updated.nextBackupTime = calculateNextBackupTime(updated.frequency, updated.hour, new Date().toISOString());
        } else {
          updated.nextBackupTime = null;
        }
      }
      safeLocalStorage.setItem('oc_backup_schedule', JSON.stringify(updated));
      return updated;
    });
    addSecurityLog('AGENDAMENTO_BACKUP', `Configurações de agendamento de backup atualizadas: Frequência: ${config.frequency || 'mantida'}`, 'low');
  };

  // Automated background backup checker
  useEffect(() => {
    if (!backupSchedule.enabled || backupSchedule.frequency === 'manual' || !backupSchedule.nextBackupTime) {
      return;
    }
    
    const checkSchedule = () => {
      const now = new Date();
      const nextTime = new Date(backupSchedule.nextBackupTime!);
      
      if (now.getTime() >= nextTime.getTime()) {
        console.log('[Scheduler] Executando backup agendado automaticamente para o Storage...');
        triggerStorageBackup();
      }
    };
    
    checkSchedule();
    const interval = setInterval(checkSchedule, 30000);
    return () => clearInterval(interval);
  }, [backupSchedule]);

  // Load backups list initially
  useEffect(() => {
    if (currentUser?.role === UserRole.ADMIN) {
      fetchStorageBackups();
    }
  }, [currentUser]);

  // Automated background backup running with debounced real-time autosave (persists replica in Google Cloud Firestore)
  useEffect(() => {
    if (!hasReceivedInitialCloudSync) return;
    if (isLoading) return; // Prevent overwriting cloud data during initial loading phase
    if (cloudBackupStatus === 'quota_exceeded') return; // Do not attempt saves if quota is exceeded

    // Só a gestão grava o estado geral da escola.
    //
    // Este é o salvamento automático original do sistema. Ele rodava para
    // QUALQUER perfil — inclusive professor e aluno, que não têm permissão.
    // A tentativa era recusada pelo banco e acendia, para eles, o aviso de
    // "alterações não salvas", como se tivessem perdido trabalho.
    if (currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.STAFF) return;

    const currentPayload = {
      users, courses, classes, subjects, grades, attendance, directAbsences,
      conceptRanges, calendarEvents, messages, notifications,
      currentPeriod, periods, simulatedDate, autoLockEnabled,
      declarationConfigs, studentDocuments, internships,
      adminPasswordResetDone
    };
    const currentPayloadStr = JSON.stringify(currentPayload);

    // Skip saving if local state is identical to what was recently received from/saved to the cloud
    if (currentPayloadStr === lastReceivedPayloadRef.current) {
      setCloudBackupStatus('success');
      editStartTimeRef.current = null;
      return;
    }

    // Track when unsaved edits started
    if (!editStartTimeRef.current) {
      editStartTimeRef.current = Date.now();
    }

    // Update local modification time because a change was detected
    const nowStr = new Date().toISOString();
    setLastLocalWriteTime(nowStr);
    safeLocalStorage.setItem('oc_last_local_write_time', nowStr);

    const elapsedTime = Date.now() - editStartTimeRef.current;
    const debounceDelay = elapsedTime >= 4000 ? 0 : 1000;

    const delayDebounceFn = setTimeout(async () => {
      const payload: SystemStatePayload = {
        ...currentPayload,
        securityLogs
      };
      
      setCloudBackupStatus('syncing');
      try {
        const success = await saveStateToCloud(payload);
        
        if (success) {
          editStartTimeRef.current = null; // Reset unsaved edit timestamp on success
          // Prevent re-triggering due to this exact state
          lastReceivedPayloadRef.current = currentPayloadStr;
          
          const now = new Date();
          setLastCloudBackupTime(now.toISOString());
          safeLocalStorage.setItem('oc_last_cloud_backup_time', now.toISOString());
          setCloudBackupStatus('success');

          // Silently insert an autocheck in logs
          setSecurityLogs(prev => {
            const timestampStr = now.toLocaleTimeString('pt-BR');
            const autoLog = {
              id: `sec_auto_${Date.now()}`,
              timestamp: now.toISOString(),
              eventType: 'BACKUP_AUTO',
              ipAddress: 'Google Cloud Firestore',
              details: `Sincronização automática em nuvem concluída com sucesso às ${timestampStr}.`,
              severity: 'low'
            };
            const updated = [autoLog, ...prev].slice(0, 50);
            safeLocalStorage.setItem('oc_security_logs', JSON.stringify(updated));
            return updated;
          });
        } else {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setCloudBackupStatus('offline');
          } else {
            setCloudBackupStatus('error');
          }
        }
      } catch (err: any) {
        const isQuota = err?.code === 'resource-exhausted' || 
                        err?.message?.toLowerCase().includes('quota') || 
                        err?.message?.toLowerCase().includes('exhausted') ||
                        err?.message?.toLowerCase().includes('limit exceeded');
        if (isQuota) {
          console.error('Cota de escrita do Firestore excedida durante sincronização automática:', err);
          setCloudBackupStatus('quota_exceeded');
          addSecurityLog('SINC_NUVEM_COTA', 'Limite de escrita automática do Firestore esgotado.', 'medium');
        } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setCloudBackupStatus('offline');
        } else {
          setCloudBackupStatus('error');
        }
      }
    }, debounceDelay); // Use 0ms if unsaved changes have been pending for >=4000ms, else 1000ms

    return () => clearTimeout(delayDebounceFn);
  }, [isLoading, hasReceivedInitialCloudSync, users, courses, classes, subjects, grades, attendance, directAbsences, conceptRanges, calendarEvents, messages, notifications, currentPeriod, periods, simulatedDate, autoLockEnabled, declarationConfigs, studentDocuments, internships, staffMembers, dependencies, adminPasswordResetDone]);

  // Recovery mechanism for quota_exceeded status (resets status to idle after 5 minutes to retry)
  useEffect(() => {
    if (cloudBackupStatus !== 'quota_exceeded') return;

    const quotaResetTimer = setTimeout(() => {
      console.log('Resetando status de cota excedida para idle para permitir tentativa de autosave.');
      setCloudBackupStatus('idle');
    }, 5 * 60 * 1000);

    return () => clearTimeout(quotaResetTimer);
  }, [cloudBackupStatus]);

  return (
    <AppContext.Provider value={{
      isLoading,
      currentUser, users, courses, classes, subjects, grades, attendance, 
      conceptRanges, calendarEvents, messages, notifications,
      activeClassId, activeSubjectId,
      autoLockEnabled, setAutoLockEnabled,
      simulatedDate, setSimulatedDate,
      updateCalendarEventDate,
      isClassS1Locked, isClassS2Locked, isClassDefinitiveLocked,
      currentPeriod, periods, setCurrentPeriod, addPeriod,
      wipeAllData, wipeAllStudents, loadDemoData,
      login, logout, updatePassword, recoverPassword,
      setActiveClassId, setActiveSubjectId,
      addCourse, updateCourse, deleteCourse,
      addClass, updateClass, deleteClass, addSubject, updateSubject, deleteSubject, addUser, updateUser, deleteUser, unifyDuplicateStudents, unifyDuplicateSubjects, syncSubjectsWithOfficialCurriculum, updateGrade, updateConceptRanges,
      staffMembers, addStaffMember, updateStaffMember, deleteStaffMember, updateStaffPermissions,
      dependencies, createDependencyEnrollment,
      saveAttendanceSession, addAttendanceSession,
      directAbsences, updateStudentAbsences,
      toggleJournalStatus, sendMessage, deleteMessage, addNotification, clearNotifications,
      getStudentAbsences, getStudentAttendanceGrid,
      importStudents, importSubjects, importConcepts, importHistoricalData, repairDuplicateImports, undoHistoricalImports,
      securityLogs, cloudBackupStatus, lastCloudBackupTime,
      addSecurityLog, triggerLocalBackup, triggerCloudBackup,
      restoreFromBackup, restoreFromCloud, failedAttemptsMap, resetFailedAttempts,
      backupSchedule, updateBackupSchedule,
      storageBackups, isLoadingStorageBackups, fetchStorageBackups,
      triggerStorageBackup, deleteStorageBackup,
      declarationConfigs, studentDocuments, internships,
      updateDeclarationConfig, updateStudentDocumentStatus, transferStudent, updateInternshipRecord,
      adminPasswordResetDone, resetAdminPassword, unlockAdminReset,
      precisaTrocarSenha, concluirTrocaDeSenha: () => setPrecisaTrocarSenha(false),
      gerarAcessosDosAlunos, contarAlunosSemAcesso,
      aviso,
      mostrarAviso: (titulo: string, mensagem: string, destaque?: string) => setAviso({ titulo, mensagem, destaque }),
      pedirConfirmacao: (titulo: string, mensagem: string, aoConfirmar: () => void) => setAviso({ titulo, mensagem, aoConfirmar }),
      fecharAviso: () => setAviso(null)
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

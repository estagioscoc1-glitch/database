/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FormularioDocente, DadosNovoDocente } from './cadastros/FormularioDocente';
import { useApp, getRequiredDocsForStudent } from '../context/AppContext';
import { UserRole, Shift, CalendarEventType, User, Subject } from '../types';
import { criarAcesso, redefinirSenhaDeUsuario, conferirSenhaAtual } from '../lib/supabase';
import { criarAcessoDeUmAluno, criarAcessoDeUmDocente, linkDoDocumento, atribuirProfessorAoDiario } from '../lib/repositorios';

/* ==========================================================================
 * QUAIS ABAS APARECEM NO PAINEL
 * ==========================================================================
 *
 * NADA FOI APAGADO. Todo o código dessas telas continua no sistema, inteiro e
 * funcionando. Elas apenas não aparecem no menu.
 *
 * O motivo: a escola começa a usar o portal na segunda-feira e vai liberar um
 * módulo por vez, conferindo cada um antes de mostrar aos usuários. Menu que
 * aparece antes de estar conferido gera pergunta que ninguém sabe responder.
 *
 * PARA REATIVAR UMA ABA: troque `false` por `true` na linha dela. Só isso.
 * A tela volta exatamente como estava, com todos os dados.
 * ========================================================================== */
const ABAS_VISIVEIS = {
  crm: false,                 // CRM
  cadastros: false,           // Cadastros
  financeiro: false,          // Financeiro
  orientacao: false,          // Movimentação
  pesquisa: false,            // Pesquisa
  relatorios: false,          // Relatórios
  boletins: false,            // Boletim Completo

  // Estas continuam visíveis: são as que a escola usa desde a segunda.
  visu: true,                 // Dashboard
  reg: true,                  // Cadastros Acadêmicos
  imp: true,                  // Importar Planilhas
  msg: true,                  // Mensagens & Avisos
  sec: true,                  // Backup & Segurança
  historico_completo: true,   // Histórico do Aluno
  estagio: true,              // Estágios
};
import { 
  Users, UserCheck, GraduationCap, School, BookOpen, FileCheck, CheckCircle2, 
  XCircle, Inbox, Send, Calendar, FolderPlus, BellRing, Settings, UserPlus, 
  Search, Printer, AlertTriangle, ChevronRight, HelpCircle,
  Database, Shield, ShieldCheck, UploadCloud, Lock, Unlock, Server, RefreshCw, Download, Upload, Key,
  Trash2, History, Edit2, Filter, ExternalLink, Minimize2, Maximize2, X, Minus, FileText, Sparkles,
  Paperclip, Mic, Square, Play, Pause, Image as ImageIcon
} from 'lucide-react';
import { SpreadsheetImporter } from './SpreadsheetImporter';
import { HistoricalDataImporter } from './HistoricalDataImporter';
import { PrintModal } from './PrintModal';
import { GradeJournal } from './GradeJournal';
import { AttendanceJournal } from './AttendanceJournal';
import { AdminInternships } from './AdminInternships';
import { SubjectManager } from './SubjectManager';
import { CourseManager } from './CourseManager';
import { StaffManager } from './StaffManager';
import { DependencyManager } from './DependencyManager';
import { ExecutiveBIDashboard } from './ExecutiveBIDashboard';
import { CRMModule } from './CRMModule';
import { CadastrosModule } from './cadastros/CadastrosModule';
import { FinanceiroModule } from './FinanceiroModule';
import { MovimentacaoModule } from './movimentacao/MovimentacaoModule';
import { FinanceiroPlaceholder } from './placeholders/FinanceiroPlaceholder';
import { OrientacaoPlaceholder } from './placeholders/OrientacaoPlaceholder';
import { PesquisaPlaceholder } from './placeholders/PesquisaPlaceholder';
import { PesquisaModule } from './pesquisa/PesquisaModule';
import { RelatoriosModule } from './relatorios/RelatoriosModule';
import { Briefcase } from 'lucide-react';
import { motion } from 'motion/react';

// Helper functions for fuzzy duplicate detection
const cleanName = (name: string) => {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
};

const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return matrix[a.length][b.length];
};

const areNamesSimilar = (name1: string, name2: string): boolean => {
  const n1 = cleanName(name1);
  const n2 = cleanName(name2);
  
  if (n1 === n2) return true;

  const coll1 = n1.replace(/([a-z])\1+/g, '$1');
  const coll2 = n2.replace(/([a-z])\1+/g, '$1');
  if (coll1 === coll2) return true;

  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return false;
  
  const distance = getLevenshteinDistance(n1, n2);
  const threshold = maxLen > 10 ? 2 : 1;
  if (distance <= threshold) return true;

  return false;
};

export const AdminDashboard: React.FC = () => {
  const { 
    users, courses, classes, subjects, grades, attendance, calendarEvents, messages,
    sendMessage, deleteMessage, addClass, updateClass, deleteClass, addSubject, updateSubject, deleteSubject, addUser, updateUser, deleteUser, toggleJournalStatus,
    gerarAcessosDosAlunos, contarAlunosSemAcesso, mostrarAviso, pedirConfirmacao,
    getStudentAbsences, importStudents,
    securityLogs, cloudBackupStatus, lastCloudBackupTime, addSecurityLog,
    triggerLocalBackup, triggerCloudBackup, restoreFromBackup, restoreFromCloud,
    failedAttemptsMap, resetFailedAttempts,
    currentPeriod, periods, setCurrentPeriod, addPeriod,
    wipeAllData, wipeAllStudents, loadDemoData,
    autoLockEnabled, setAutoLockEnabled, simulatedDate, updateCalendarEventDate,
    activeClassId, activeSubjectId, setActiveClassId, setActiveSubjectId,
    backupSchedule, updateBackupSchedule,
    storageBackups, isLoadingStorageBackups, fetchStorageBackups,
    triggerStorageBackup, deleteStorageBackup,
    declarationConfigs, studentDocuments,
    updateDeclarationConfig, updateStudentDocumentStatus, transferStudent,
    unifyDuplicateStudents, unifyDuplicateSubjects, syncSubjectsWithOfficialCurriculum,
    currentUser
  } = useApp();

  const [activeTab, setActiveTab] = useState<'crm' | 'cadastros' | 'financeiro' | 'orientacao' | 'pesquisa' | 'relatorios' | 'visu' | 'reg' | 'imp' | 'msg' | 'sec' | 'boletins' | 'estagio' | 'historico_completo' | 'detect_duplicates' | 'detect_duplicates_subjects' | 'gerenciar_disciplinas'>(
    // A aba inicial precisa ser uma que esteja VISÍVEL. Antes era 'crm' — que
    // agora está oculta; abrir nela deixaria o painel sem conteúdo nenhum.
    ABAS_VISIVEIS.crm ? 'crm' : 'reg'
  );
  const [regSubTab, setRegSubTab] = useState<'cursos' | 'funcionarios' | 'dependencias' | 'turmas'>('cursos');
  const [searchQuery, setSearchQuery] = useState('');
  const [printDoc, setPrintDoc] = useState<any | null>(null);

  // Sync state
  const [syncResult, setSyncResult] = useState<{ renamed: { original: string; official: string; id: string }[]; unified: { original: string; kept: string; keptId: string; deletedId: string }[] } | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Historico Completo states
  const [historicoSearch, setHistoricoSearch] = useState('');
  const [selectedHistoricoStudentId, setSelectedHistoricoStudentId] = useState('');

  // Duplicates unifier states
  const [confirmingGroupKey, setConfirmingGroupKey] = useState<string | null>(null);

  // Subject Duplicates unifier states
  const [confirmingSubjectGroupKey, setConfirmingSubjectGroupKey] = useState<string | null>(null);
  const [selectedCorrectSubjectId, setSelectedCorrectSubjectId] = useState<Record<string, string>>({});

  // Transfer Student states
  const [transferStudentId, setTransferStudentId] = useState('');
  const [transferClassId, setTransferClassId] = useState('');
  const [transferSearch, setTransferSearch] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [transferErrorMsg, setTransferErrorMsg] = useState<string | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [journalError, setJournalError] = useState<string | null>(null);

  // Declaration configuration states
  const [escStart, setEscStart] = useState('');
  const [escEnd, setEscEnd] = useState('');
  const [ctrStart, setCtrStart] = useState('');
  const [ctrEnd, setCtrEnd] = useState('');
  const [configSuccess, setConfigSuccess] = useState(false);

  // Pending Documents states
  const [selectedDocStudentId, setSelectedDocStudentId] = useState<string | null>(null);
  const [docSearchQuery, setDocSearchQuery] = useState('');

  const findSimilarStudents = (studentId: string) => {
    const currentStudent = users.find(u => u.id === studentId);
    if (!currentStudent) return [];
    return users.filter(u => u.role === UserRole.STUDENT && u.id !== studentId && areNamesSimilar(currentStudent.name, u.name));
  };

  React.useEffect(() => {
    if (declarationConfigs) {
      setEscStart(declarationConfigs.escolaridade.startDate);
      setEscEnd(declarationConfigs.escolaridade.endDate);
      setCtrStart(declarationConfigs.ctransp.startDate);
      setCtrEnd(declarationConfigs.ctransp.endDate);
    }
  }, [declarationConfigs]);

  // Boletim Completo state variables
  const [boletimSearch, setBoletimSearch] = useState('');
  const [selectedBoletimClassId, setSelectedBoletimClassId] = useState('');
  const [selectedBoletimStudentId, setSelectedBoletimStudentId] = useState('');

  // Admin Direct Journals Launching / Printing Center state
  const [selectedAdminClassId, setSelectedAdminClassId] = useState<string>('');
  const [gradeWindowState, setGradeWindowState] = useState<'closed' | 'open' | 'minimized'>('closed');
  const [isGradeWindowMaximized, setIsGradeWindowMaximized] = useState<boolean>(false);
  const [attendanceWindowState, setAttendanceWindowState] = useState<'closed' | 'open' | 'minimized'>('closed');
  const [isAttendanceWindowMaximized, setIsAttendanceWindowMaximized] = useState<boolean>(false);

  // Parse active period
  const [yearStr, semStr] = currentPeriod.split('/');
  const currentYear = parseInt(yearStr) || 2026;
  const currentSemester = parseInt(semStr) || 1;

  // POR QUE ISTO ESTÁ DENTRO DE useMemo
  //
  // Este painel tem 5 mil linhas e um único estado — digitar uma letra no campo
  // "Nome Completo" do cadastro de docente refazia TUDO que está abaixo.
  //
  // O pior era o cálculo de `activePeriodStudents`: para cada aluno, percorria
  // a lista inteira de notas (`grades.some`). Com 250 alunos e 2.500 notas dão
  // 625 mil comparações por tecla — e o custo cresce ao quadrado conforme a
  // escola lança nota. Era isso que travava a digitação.
  //
  // Agora só recalcula quando turmas, alunos ou notas mudam de verdade. E a
  // busca por aluno virou um conjunto pronto, em vez de varredura por aluno.
  const {
    activePeriodClasses,
    activePeriodClassIdsSet,
    activePeriodGrades,
    activePeriodAttendance,
    allStudentUsers,
    activePeriodStudents,
    activePeriodStudentIds,
  } = React.useMemo(() => {
    const turmasDoPeriodo = classes.filter(c => c.year === currentYear && c.semester === currentSemester);
    const idsDoPeriodo = new Set(turmasDoPeriodo.map(c => c.id));

    const notasDoPeriodo = grades.filter(g => idsDoPeriodo.has(g.classId));
    const chamadasDoPeriodo = attendance.filter(s => idsDoPeriodo.has(s.classId));

    // Uma passada só pelas notas, montando quem tem nota no período. Substitui
    // o `grades.some` que rodava uma vez por aluno.
    const alunosComNotaNoPeriodo = new Set(notasDoPeriodo.map(g => g.studentId));

    const alunos = users.filter(u => u.role === UserRole.STUDENT);
    const alunosDoPeriodo = alunos.filter(
      u => (u.classId && idsDoPeriodo.has(u.classId)) || alunosComNotaNoPeriodo.has(u.id)
    );

    return {
      activePeriodClasses: turmasDoPeriodo,
      activePeriodClassIdsSet: idsDoPeriodo,
      activePeriodGrades: notasDoPeriodo,
      activePeriodAttendance: chamadasDoPeriodo,
      allStudentUsers: alunos,
      activePeriodStudents: alunosDoPeriodo,
      activePeriodStudentIds: Array.from(new Set(alunosDoPeriodo.map(u => u.id))),
    };
  }, [classes, grades, attendance, users, currentYear, currentSemester]);

  // New class state
  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [classCourse, setClassCourse] = useState(courses[0]?.id || '');
  const [classShift, setClassShift] = useState<Shift>(Shift.MATUTINO);
  const [classModule, setClassModule] = useState(1);

  // New subject state
  const [subName, setSubName] = useState('');
  const [subCourse, setSubCourse] = useState(courses[0]?.id || '');
  const [subModule, setSubModule] = useState(1);
  const [subWorkload, setSubWorkload] = useState(40);

  // New user state (Professor or Administrador/Administração)
  // Os campos do cadastro de docente moram agora em <FormularioDocente>.
  // Ficavam aqui, e por isso cada tecla digitada redesenhava as ~11 mil caixas
  // deste painel — 635 ms de travamento por letra, medido no sistema rodando.

  // Individual student enrollment state
  const [selectedClassIdForStudents, setSelectedClassIdForStudents] = useState(classes[0]?.id || '');
  const [singleStudentEnrollment, setSingleStudentEnrollment] = useState('');
  const [singleStudentName, setSingleStudentName] = useState('');

  // Messaging state
  const [messageRecipient, setMessageRecipient] = useState('ALL_TEACHERS');
  // Vários destinatários de uma vez. 'ALL_TEACHERS' é um canal, não uma pessoa,
  // por isso não se mistura com a seleção individual.
  const [destinatarios, setDestinatarios] = useState<string[]>(['ALL_TEACHERS']);
  const [buscaDestinatario, setBuscaDestinatario] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messageSuccess, setMessageSuccess] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<'audio' | 'pdf' | 'image' | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = React.useRef<any>(null);
  const mediaRecorderRef = React.useRef<any>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  // Drag active and ref for secure backup importer
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [secStatusMsg, setSecStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  // State for teacher access control
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [confirmDeleteTeacherId, setConfirmDeleteTeacherId] = useState<string | null>(null);
  const [confirmandoExclusaoProfessorDe, setConfirmandoExclusaoProfessorDe] = useState<string | null>(null);
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [selectedCourseIdFilter, setSelectedCourseIdFilter] = useState<string>(courses[0]?.id || 'ENF');
  const [filterJournalsByPeriod, setFilterJournalsByPeriod] = useState<boolean>(true);

  // Class editing state
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassCode, setEditClassCode] = useState('');
  const [editClassShift, setEditClassShift] = useState<Shift>(Shift.MATUTINO);
  const [editClassModule, setEditClassModule] = useState(1);
  const [editClassYear, setEditClassYear] = useState(2026);
  const [editClassSemester, setEditClassSemester] = useState(1);

  // User editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>(UserRole.STUDENT);
  const [editUserEnrollment, setEditUserEnrollment] = useState('');
  const [editUserCpf, setEditUserCpf] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // Sync selected class when active period changes or class list changes
  React.useEffect(() => {
    if (activePeriodClasses.length > 0) {
      const activeIds = activePeriodClasses.map(c => c.id);
      
      if (!selectedAdminClassId || !activeIds.includes(selectedAdminClassId)) {
        setSelectedAdminClassId(activePeriodClasses[0].id);
      }
      const allClassIds = classes.map(c => c.id);
      if (!selectedBoletimClassId || !allClassIds.includes(selectedBoletimClassId)) {
        setSelectedBoletimClassId(activePeriodClasses[0]?.id || classes[0]?.id || '');
      }
      if (!selectedClassIdForStudents || !activeIds.includes(selectedClassIdForStudents)) {
        setSelectedClassIdForStudents(activePeriodClasses[0].id);
      }
    }
  }, [activePeriodClasses, selectedAdminClassId, selectedBoletimClassId, selectedClassIdForStudents]);

  const toggleJournalAccess = (teacherId: string, classId: string, subjectId: string) => {
    const teacher = users.find(u => u.id === teacherId);
    if (!teacher) return;
    
    const currentAssigned = teacher.assignedJournals || [];
    const exists = currentAssigned.some(j => j.classId === classId && j.subjectId === subjectId);
    
    let updatedAssigned;
    let novoProfessorId: string | null;
    if (exists) {
      updatedAssigned = currentAssigned.filter(j => !(j.classId === classId && j.subjectId === subjectId));
      novoProfessorId = null;
      setJournalError(null);
    } else {
      const otherTeacher = users.find(u => 
        u.role === UserRole.TEACHER && 
        u.id !== teacherId && 
        u.assignedJournals?.some(j => j.classId === classId && j.subjectId === subjectId)
      );
      if (otherTeacher) {
        setJournalError(`A disciplina já está atribuída ao professor ${otherTeacher.name}.`);
        return;
      }
      setJournalError(null);
      updatedAssigned = [...currentAssigned, { classId, subjectId }];
      novoProfessorId = teacherId;
    }
    
    updateUser(teacherId, { assignedJournals: updatedAssigned });

    // GRAVA DIRETO NO BANCO, NA HORA — não espera o ciclo de sincronização
    // periódica. Antes, a marcação só existia no estado do navegador até o
    // próximo ciclo automático publicar; se esse ciclo rodasse com um
    // estado desatualizado (ex.: outra aba aberta), a atribuição sumia
    // sozinha, sem nenhum aviso. Agora, se a gravação falhar, o admin fica
    // sabendo na hora — e a caixinha volta pro estado anterior.
    const turma = classes.find(c => c.id === classId);
    const periodo = turma && turma.year && turma.semester ? `${turma.year}/${turma.semester}` : currentPeriod;
    atribuirProfessorAoDiario(classId, subjectId, periodo, novoProfessorId).then(res => {
      if (!res.ok) {
        setJournalError(`Não foi possível gravar no banco: ${res.erro || 'motivo não informado'}. Tente novamente.`);
        // Desfaz a marcação na tela — ela não é real, o banco recusou.
        updateUser(teacherId, { assignedJournals: currentAssigned });
      }
    });
  };

  // Números do topo do painel. Também ficam em useMemo: são só indicadores,
  // não mudam porque alguém está digitando um nome num formulário.
  //
  // `journalsTotal` era o segundo maior gasto: percorria as 585 turmas e, para
  // cada uma, filtrava as 103 disciplinas — 60 mil comparações por tecla. Agora
  // as disciplinas são agrupadas uma vez por curso+módulo e só consultadas.
  const activeStudents = activePeriodStudents;
  const {
    activeTeachers,
    journalsTotal,
    totalAbsencesCount,
    approvedCount,
    failedCount,
    pendingGrades,
    overallApprovalRate,
  } = React.useMemo(() => {
    const professores = users.filter(u => u.role === UserRole.TEACHER);

    const disciplinasPorCursoModulo = new Map<string, number>();
    for (const s of subjects) {
      const chave = `${s.courseId}|${s.module}`;
      disciplinasPorCursoModulo.set(chave, (disciplinasPorCursoModulo.get(chave) || 0) + 1);
    }
    const totalDeDiarios = activePeriodClasses.reduce(
      (total, cls) => total + (disciplinasPorCursoModulo.get(`${cls.courseId}|${cls.module}`) || 0),
      0
    );

    const totalDeFaltas = activePeriodAttendance.reduce(
      (acc, sess) => acc + Object.values(sess.records).filter(v => v === 'F').length * sess.lessonsCount,
      0
    );

    let aprovados = 0, reprovados = 0, pendentes = 0;
    for (const g of activePeriodGrades) {
      if (g.result === 'APTO') aprovados++;
      else if (g.result === 'NÃO APTO' || g.result === 'F. NOTA' || g.result === 'REP. FALTAS') reprovados++;
      else pendentes++;
    }

    return {
      activeTeachers: professores,
      journalsTotal: totalDeDiarios,
      totalAbsencesCount: totalDeFaltas,
      approvedCount: aprovados,
      failedCount: reprovados,
      pendingGrades: pendentes,
      overallApprovalRate:
        activePeriodStudents.length > 0 ? (aprovados / (aprovados + reprovados || 1)) * 100 : 100,
    };
  }, [users, subjects, activePeriodClasses, activePeriodAttendance, activePeriodGrades, activePeriodStudents]);

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className) return;

    const finalCode = classCode.trim() 
      ? classCode.trim().toUpperCase() 
      : `${classCourse}-M${classModule}-${classShift.substring(0, 3).toUpperCase()}`;

    addClass({
      id: `class_${Date.now()}`,
      name: className.toUpperCase(),
      code: finalCode,
      courseId: classCourse,
      shift: classShift,
      module: classModule,
      year: currentYear,
      semester: currentSemester,
      closedS1: false,
      closedS2: false,
      closedDefinitive: false
    });

    setClassName('');
    setClassCode('');
    // A MENSAGEM ANTIGA PROMETIA DIÁRIO E NÃO HAVIA DIÁRIO NENHUM.
    //
    // `publicarEstrutura` só cria um diário quando o par turma+disciplina tem
    // professor designado ou nota lançada — de propósito, senão o produto
    // cartesiano derruba a gravação por tempo esgotado. Turma nova nasce sem
    // diário, e a secretaria ficava esperando algo que nunca ia aparecer.
    alert(
      `Nova Turma cadastrada para o período ${currentPeriod}.\n\n` +
      `Os diários aparecem quando você atribuir as disciplinas a um professor.`
    );
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName) return;

    addSubject({
      id: `sub_${Date.now()}`,
      name: subName.toUpperCase(),
      courseId: subCourse,
      module: subModule,
      workload: subWorkload
    });

    setSubName('');
    alert('Nova Disciplina acadêmica criada e incorporada aos diários das turmas.');
  };

  const [criandoAcesso, setCriandoAcesso] = useState(false);
  const [gerandoAcessos, setGerandoAcessos] = useState(false);
  const [progressoAcessos, setProgressoAcessos] = useState('');

  // Redefinição de senha (quando alguém esquece a senha e procura a secretaria).
  const [redefinindoSenhaDe, setRedefinindoSenhaDe] = useState<string | null>(null);
  const [confirmandoExclusaoDe, setConfirmandoExclusaoDe] = useState<string | null>(null);

  // Cadastro de novo administrador.
  const [novoAdminNome, setNovoAdminNome] = useState('');
  const [novoAdminLogin, setNovoAdminLogin] = useState('');
  const [novoAdminEmail, setNovoAdminEmail] = useState('');
  const [criandoAdmin, setCriandoAdmin] = useState(false);
  const [gerandoAcessoDe, setGerandoAcessoDe] = useState<string | null>(null);

  // GERAR ACESSO PARA QUEM JÁ TEM FICHA MAS PERDEU (OU NUNCA TEVE) O LOGIN.
  //
  // Existiu antes um jeito de excluir o login de um professor sem pedir
  // senha nem mostrar confirmação — corrigido, mas alguém pode ter perdido
  // o acesso por essa porta antes da correção. A ficha (com os diários,
  // notas e tudo mais) nunca é apagada quando só o login é excluído, então
  // dá pra recriar o login e linká-lo de volta à mesma ficha, sem perder
  // absolutamente nada do que já estava atribuído à pessoa.
  const gerarAcessoParaFicha = (ficha: { id: string; name: string; username: string; role: UserRole }) => {
    const papel = ficha.role === UserRole.TEACHER ? 'PROFESSOR' : ficha.role === UserRole.STUDENT ? 'ALUNO' : null;
    if (!papel) return;
    pedirConfirmacao(
      'Gerar novo acesso?',
      `Isto cria um novo login para ${ficha.name}, linkado à ficha que já existe — os diários, notas e ` +
      `tudo mais que já estava atribuído a ela continuam exatamente como estão.\n\n` +
      `A senha inicial será gerada agora e mostrada uma única vez.`,
      async () => {
        setGerandoAcessoDe(ficha.id);
        try {
          const r = await criarAcesso({ nome: ficha.name, login: ficha.username, papel, vincularA: ficha.id });
          if (r.ok) {
            mostrarAviso(
              'Acesso gerado',
              `Nome: ${ficha.name}\nUsuário para entrar no portal: ${r.login}\n\n` +
              `Entregue os dois abaixo. A senha não será mostrada de novo.`,
              r.senhaInicial
            );
          } else {
            mostrarAviso('Não foi possível gerar o acesso', String(r.mensagem));
          }
        } catch (err: any) {
          mostrarAviso('Não foi possível gerar o acesso', String(err?.message || err));
        } finally {
          setGerandoAcessoDe(null);
        }
      }
    );
  };

  // Recebe os dados prontos do <FormularioDocente>. Antes lia direto do estado
  // deste componente, e era isso que fazia cada tecla redesenhar o painel todo.
  const handleCreateUser = React.useCallback(async (dados: DadosNovoDocente) => {
    const teachName = dados.nome;
    const teachEmail = dados.email;
    const teachRole = dados.papel;
    const userPassword = dados.senha;

    if (!teachName || !teachEmail) {
      mostrarAviso('Faltam dados', 'Preencha o nome e o e-mail.');
      return;
    }

    // O LOGIN USA NOME E SOBRENOME, N\u00c3O S\u00d3 O PRIMEIRO NOME.
    //
    // Antes era `prof_` + primeira palavra do nome. Duas professoras chamadas
    // Maria geravam o mesmo `prof_maria`, e a segunda ficava sem acesso: a
    // ficha era salva, a conta n\u00e3o, e a mensagem dizia apenas "login j\u00e1 est\u00e1
    // em uso". Numa escola isso acontece na primeira semana.
    //
    // Com nome e sobrenome a colis\u00e3o fica rara; quando ainda assim ocorrer,
    // `criarAcessoDeUmDocente` resolve sozinho acrescentando 2, 3, 4 no fim.
    const semAcento = (s: string) =>
      s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

    const partes = teachName.trim().split(/\s+/).filter(Boolean);
    const primeiro = semAcento(partes[0] || 'usuario');
    const ultimo = partes.length > 1 ? semAcento(partes[partes.length - 1]) : '';
    const baseDoLogin = ultimo ? `${primeiro}.${ultimo}` : primeiro;

    const generatedUsername = teachRole === UserRole.ADMIN
      ? `admin_${baseDoLogin}`
      : `prof_${baseDoLogin}`;

    const uniqueId = teachRole === UserRole.ADMIN ? `admin_${Date.now()}` : `prof_${Date.now()}`;

    // MATRÍCULA DO PROFESSOR: MAIOR JÁ USADA + 1, NUNCA A CONTAGEM.
    //
    // Antes era `1000 + activeTeachers.length + 1`. Como é a CONTAGEM, bastava
    // excluir um professor para o próximo receber uma matrícula que já existia.
    // E `professores.matricula` é UNIQUE no banco: o erro 23505 derrubava a
    // publicação inteira da estrutura, e alunos, matrículas e diários paravam
    // de ser gravados a partir dali — em silêncio, só com o aviso laranja.
    const maiorMatricula = activeTeachers.reduce((maior, t) => {
      const n = Number(t.enrollment);
      return Number.isFinite(n) && n > maior ? n : maior;
    }, 1000);
    const enrollment = teachRole === UserRole.TEACHER
      ? String(maiorMatricula + 1)
      : undefined;

    // 1) Cadastro da pessoa (vai para a tabela de professores).
    addUser({
      id: uniqueId,
      name: teachName,
      username: generatedUsername,
      email: teachEmail,
      role: teachRole,
      cpf: undefined,
      enrollment: enrollment,
      active: true
    });

    // 2) Conta de acesso, criada NO SERVIDOR.
    //
    // Antes, esta tela inventava uma senha fraca (ex.: "1234") e guardava junto
    // do cadastro. Só que isso nunca criava conta de login nenhuma — a pessoa
    // simplesmente nao conseguia entrar. E a senha ficava legivel.
    //
    // Agora o servidor gera uma senha forte, exige troca no primeiro acesso, e
    // a devolve UMA vez para voce entregar a pessoa.
    setCriandoAcesso(true);
    let aviso = '';
    let senhaGerada = '';
    try {
      // Espera a ficha existir no banco de verdade, em vez de apostar num tempo
      // fixo de 3,5s. Se a ficha não chegar, a conta não é criada solta — a
      // secretaria é avisada do que fazer.
      const res = await criarAcessoDeUmDocente(criarAcesso, {
        fichaId: uniqueId,
        nome: teachName,
        login: generatedUsername,
        email: teachEmail,
        papel: teachRole === UserRole.ADMIN ? 'SECRETARIA' : 'PROFESSOR',
        senha: userPassword.trim() || undefined,   // em branco = servidor gera uma forte
      });

      if (res.ok) {
        senhaGerada = res.senhaInicial || '';
        // Mostra o login REALMENTE usado: se o nome estava ocupado, o servidor
        // recebeu uma variação (joao.silva2) e é ela que a pessoa vai digitar.
        aviso = `Usuário de acesso: ${res.loginUsado || generatedUsername}\nA pessoa deverá trocar a senha no primeiro acesso.`;
      } else {
        aviso = `O cadastro foi salvo, mas a conta de acesso NÃO foi criada.\nMotivo: ${res.erro}\nA pessoa ainda não consegue entrar no portal.`;
      }
    } catch (err: any) {
      aviso = `\n\nATENCAO: o cadastro foi salvo, mas a conta de acesso NAO foi criada.\nMotivo: ${err?.message || err}`;
    } finally {
      setCriandoAcesso(false);
    }

    mostrarAviso(
      teachRole === UserRole.ADMIN ? 'Funcionário(a) cadastrado(a)' : 'Professor(a) cadastrado(a)',
      (teachRole === UserRole.TEACHER ? `Matrícula: ${enrollment}\n` : '') + aviso,
      senhaGerada || undefined
    );
  }, [activeTeachers.length, addUser, criarAcesso, mostrarAviso]);

  const handleEnrollSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleStudentName.trim() || !singleStudentEnrollment.trim() || !selectedClassIdForStudents) {
      mostrarAviso('Faltam dados', 'Preencha a turma, a matrícula e o nome do aluno.');
      return;
    }

    const enrollment = singleStudentEnrollment.trim();

    // MATRÍCULA REPETIDA NEM SEMPRE É ERRO — MUITAS VEZES É O MESMO ALUNO.
    //
    // Antes esta tela recusava qualquer matrícula já existente. A intenção era
    // impedir duas pessoas diferentes com o mesmo número, e isso continua
    // valendo. Só que a mesma trava impedia o que a escola faz todo semestre:
    // o aluno cursa 2026/2, passa, e é matriculado em 2027/1. Ele não é um
    // aluno novo — é o mesmo, com boletim separado em cada semestre.
    //
    // Agora a recusa acontece só quando ele JÁ ESTÁ naquela turma. Em qualquer
    // outra turma, é matrícula adicional: o cadastro de 2026/2 permanece
    // intacto, com as notas dele, e nasce um novo em 2027/1.
    const jaCadastrado = users.find(u => u.enrollment === enrollment);
    const turmaDestino = classes.find(c => c.id === selectedClassIdForStudents);

    if (jaCadastrado) {
      const jaTemNotaNestaTurma = grades.some(
        g => g.studentId === jaCadastrado.id && g.classId === selectedClassIdForStudents
      );
      if (jaTemNotaNestaTurma || jaCadastrado.classId === selectedClassIdForStudents) {
        mostrarAviso(
          'Aluno já está nesta turma',
          `${jaCadastrado.name} (matrícula ${enrollment}) já está matriculado(a) em ${turmaDestino?.name || 'nesta turma'}.`
        );
        return;
      }

      // MESMO SEMESTRE, OUTRA TURMA, NÃO É MATRÍCULA NOVA — É TRANSFERÊNCIA.
      //
      // Sem esta checagem, escolher a turma errada por engano deixava o aluno
      // matriculado nas duas ao mesmo tempo, aparecendo em dois diários, sem
      // nenhum aviso. Matrícula em semestre diferente continua liberada: é o
      // caso do aluno que passa de 2026/2 para 2027/1 e precisa dos dois
      // boletins.
      const turmaAtual = classes.find(c => c.id === jaCadastrado.classId);
      const mesmoSemestre =
        turmaAtual && turmaDestino &&
        turmaAtual.year === turmaDestino.year &&
        turmaAtual.semester === turmaDestino.semester &&
        !turmaDestino.isDependency;

      if (mesmoSemestre) {
        mostrarAviso(
          'Aluno já tem turma neste semestre',
          `${jaCadastrado.name} já está em ${turmaAtual?.name} em ${turmaDestino?.year}/${turmaDestino?.semester}.\n\n` +
          `Para mudar de turma dentro do mesmo semestre, use a tela de Transferência de Aluno — ` +
          `ela move o histórico junto.\n\n` +
          `Esta tela serve para matricular em um semestre diferente, aí sim as duas matrículas convivem.`
        );
        return;
      }
      // Nome diferente com a mesma matrícula quase sempre é engano de digitação
      // — e seguir em frente juntaria duas pessoas num cadastro só.
      const mesmoNome =
        jaCadastrado.name?.trim().toUpperCase() === singleStudentName.trim().toUpperCase();
      if (!mesmoNome) {
        mostrarAviso(
          'Matrícula já usada por outra pessoa',
          `A matrícula ${enrollment} pertence a ${jaCadastrado.name}.\n\n` +
          `Se for a mesma pessoa, escreva o nome exatamente como está acima. ` +
          `Se for outra pessoa, use outro número de matrícula.`
        );
        return;
      }
    }

    if (enrollment.length < 4) {
      mostrarAviso('Matrícula curta', 'A matrícula precisa ter pelo menos 4 caracteres, porque ela também é a senha do primeiro acesso.');
      return;
    }

    const newStudent = {
      name: singleStudentName.trim().toUpperCase(),
      enrollment,
      email: `${enrollment}@aluno.oc.com`
    };

    importStudents([newStudent], selectedClassIdForStudents);

    // Aluno que já existia já tem conta. Tentar criar de novo devolveria erro
    // de login duplicado e assustaria a secretaria à toa — a matrícula nova
    // deu certo, só a conta é que já estava lá desde o primeiro semestre.
    if (jaCadastrado) {
      setSingleStudentEnrollment('');
      setSingleStudentName('');
      mostrarAviso(
        'Matrícula adicional criada',
        `${newStudent.name} (matrícula ${enrollment}) foi matriculado(a) também em ` +
        `${turmaDestino?.name || 'nova turma'} (${turmaDestino?.year}/${turmaDestino?.semester}).\n\n` +
        `As matrículas anteriores continuam intactas, cada uma com o boletim do seu semestre.\n\n` +
        `O acesso dele(a) continua o mesmo: usuário ${enrollment}.`
      );
      return;
    }

    // Conta de acesso do aluno: entra com a MATRÍCULA nos dois campos e é
    // obrigado a trocar a senha antes de usar o portal.
    setCriandoAcesso(true);
    let aviso = '';
    try {
      // ANTES ESTA CHAMADA NÃO INFORMAVA A QUAL FICHA A CONTA PERTENCE.
      //
      // A conta nascia solta: o aluno entrava e o portal abria sem notas, sem
      // turma e sem boletim, porque não achava a ficha dele. Sem erro na tela.
      // A importação em massa já fazia certo; só o cadastro individual não.
      const res = await criarAcessoDeUmAluno(criarAcesso, enrollment, newStudent.name);
      aviso = res.ok
        ? `Acesso criado.\nUsuário: ${enrollment}\nSenha do primeiro acesso: a própria matrícula.\nO aluno terá que trocá-la ao entrar.`
        : `A matrícula foi salva, mas a conta de acesso NÃO foi criada.\nMotivo: ${res.erro}\nO aluno ainda não consegue entrar.`;
    } catch (err: any) {
      aviso = `\n\nATENCAO: a matricula foi salva, mas a conta de acesso NAO foi criada.\nMotivo: ${err?.message || err}`;
    } finally {
      setCriandoAcesso(false);
    }

    setSingleStudentEnrollment('');
    setSingleStudentName('');

    const targetClass = classes.find(c => c.id === selectedClassIdForStudents);
    const classNameStr = targetClass ? targetClass.name : 'Turma';

    mostrarAviso(
      'Aluno(a) matriculado(a)',
      `${newStudent.name} (matrícula ${enrollment}) foi vinculado(a) a todos os diários da turma ${classNameStr}.\n\n${aviso}`
    );
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      alert("Seu navegador não suporta gravação de áudio nativa.");
      return;
    }
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAttachmentUrl(reader.result as string);
          setAttachmentType('audio');
          setAttachmentName(`Áudio Gravado - Coordenação (${new Date().toLocaleDateString('pt-BR')})`);
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks to release mic icon
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Não foi possível acessar o microfone. Verifique as permissões do seu navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        if (mediaRecorderRef.current) {
          const stream = mediaRecorderRef.current.stream;
          stream.getTracks().forEach(track => track.stop());
        }
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setRecordingDuration(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileTypeLower = file.type.toLowerCase();
    const fileNameLower = file.name.toLowerCase();
    
    let detectedType: 'audio' | 'pdf' | 'image' | null = null;
    
    if (fileTypeLower.includes('pdf') || fileNameLower.endsWith('.pdf')) {
      detectedType = 'pdf';
    } else if (fileTypeLower.includes('image') || fileNameLower.endsWith('.png') || fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg')) {
      detectedType = 'image';
    } else if (fileTypeLower.includes('audio') || fileNameLower.endsWith('.mp3') || fileNameLower.endsWith('.wav') || fileNameLower.endsWith('.m4a') || fileNameLower.endsWith('.ogg')) {
      detectedType = 'audio';
    }

    if (!detectedType) {
      alert("Por favor, selecione apenas arquivos do tipo PDF, Imagem (JPG, PNG) ou Áudio.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("O arquivo excede o limite de 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachmentUrl(reader.result as string);
      setAttachmentType(detectedType);
      setAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() && !attachmentUrl) return;

    if (destinatarios.length === 0) {
      mostrarAviso('Escolha o destinatário', 'Marque ao menos uma pessoa, ou use "Todos os Professores".');
      return;
    }

    // Uma mensagem POR PESSOA, não uma compartilhada: cada um vê a dele na
    // caixa de entrada, e a leitura de um não afeta a do outro.
    for (const destino of destinatarios) {
      sendMessage(
        'Administração Pedagógica',
        UserRole.ADMIN,
        destino,
        messageContent.trim(),
        attachmentUrl || undefined,
        attachmentType || undefined,
        attachmentName || undefined
      );
    }
    setMessageContent('');
    setAttachmentUrl(null);
    setAttachmentType(null);
    setAttachmentName(null);
    setDestinatarios(['ALL_TEACHERS']);
    setBuscaDestinatario('');
    setMessageSuccess(
      destinatarios.includes('ALL_TEACHERS')
        ? 'Comunicado enviado a todos os professores.'
        : `Comunicado enviado para ${destinatarios.length} pessoa(s).`
    );
    setTimeout(() => setMessageSuccess(''), 3000);
  };

  // Filter student directory search
  const filteredStudents = allStudentUsers.filter(s => {
    return (s.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) || s.enrollment?.includes(searchQuery);
  });

  // Drag and drop events for Backup JSON Importer
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileRestore(e.dataTransfer.files[0]);
    }
  };

  const handleFileRestoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileRestore(e.target.files[0]);
    }
  };

  const handleFileRestore = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const res = restoreFromBackup(event.target.result as string);
        setSecStatusMsg({ success: res.success, text: res.message });
        setTimeout(() => setSecStatusMsg(null), 8000);
      }
    };
    reader.readAsText(file);
  };

  const [restoringCloud, setRestoringCloud] = useState(false);
  const handleCloudRestoreTrigger = async () => {
    setRestoringCloud(true);
    setSecStatusMsg({ success: true, text: 'Conectando ao banco de dados Firestore para restaurar estado...' });
    const res = await restoreFromCloud();
    setRestoringCloud(false);
    setSecStatusMsg({ success: res.success, text: res.message });
    setTimeout(() => setSecStatusMsg(null), 8000);
  };

  const [syncingCloud, setSyncingCloud] = useState(false);
  const handleCloudSyncTrigger = async () => {
    setSyncingCloud(true);
    const success = await triggerCloudBackup();
    setSyncingCloud(false);
    if (success) {
      setSecStatusMsg({ success: true, text: 'Backup em nuvem sincronizado com sucesso no Firestore.' });
    } else {
      setSecStatusMsg({ success: false, text: 'Erro ao sincronizar backup com a nuvem Firestore.' });
    }
    setTimeout(() => setSecStatusMsg(null), 5000);
  };

  // Backup em nuvem (Supabase Storage) — estados locais do centro de exportação
  const [exportingStorage, setExportingStorage] = useState<boolean>(false);
  const [refreshingStorageList, setRefreshingStorageList] = useState<boolean>(false);
  const [storageSuccessMsg, setStorageSuccessMsg] = useState<string>('');

  return (
    <div id="admin-dashboard-container" className="space-y-6">
      
      {/* Administrador Sandbox Control Center */}
      <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-slate-900/60 dark:to-slate-900/40 border border-blue-100/70 dark:border-slate-800 p-5 rounded-3xl flex flex-col md:flex-row md:items-center md:justify-between gap-5 shadow-sm select-none">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Calendar className="h-4.5 w-4.5" />
            <h4 className="font-extrabold text-xs uppercase tracking-wider">Período Letivo Ativo</h4>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={currentPeriod}
              onChange={(e) => setCurrentPeriod(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
            >
              {periods.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const name = prompt('Digite o novo período (Exemplo: 2026/2):');
                if (name && /^\d{4}\/\d$/.test(name.trim())) {
                  addPeriod(name.trim());
                  alert(`Período ${name.trim()} criado com sucesso!`);
                } else if (name) {
                  alert('Formato inválido. Use AAAA/S (ex: 2026/2).');
                }
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all"
            >
              + Novo Período
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            Diários, frequências e matrículas isolados para o período <strong className="text-blue-700 dark:text-blue-400">{currentPeriod}</strong>.
          </p>
        </div>

        {/* Right Side: Quick Access to Internship Management & EAD Platform */}
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="https://col-gio-oswaldo-cruz-carreira-ia-199284089949.us-east1.run.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-350 hover:to-teal-350 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-400/30 hover:shadow-emerald-400/50 active:scale-[0.98] transition-all cursor-pointer select-none uppercase tracking-wide border-2 border-emerald-300"
          >
            <Sparkles className="h-4 w-4 text-slate-950 animate-pulse" />
            <span>OC Carreira IA</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-950" />
          </a>
          <a
            href="https://colegiooswaldocruz-acw.alunoead.com.br/login/index.php"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-450 hover:to-blue-450 text-white font-black rounded-xl text-xs shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-[0.98] transition-all cursor-pointer select-none uppercase tracking-wide border-2 border-indigo-400"
          >
            <ExternalLink className="h-4 w-4 text-white" />
            <span>Acesso Plataforma EAD</span>
          </a>
          <button
            type="button"
            onClick={() => setActiveTab('estagio')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer ${
              activeTab === 'estagio'
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
                : 'bg-white hover:bg-slate-50 text-amber-700 border border-amber-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-amber-400 dark:border-amber-900/40 shadow-sm'
            }`}
          >
            <Briefcase className="h-4.5 w-4.5 text-amber-500" />
            <span>Gerenciar Estágios</span>
          </button>
        </div>

      </div>

      {/* Tab Selectors - Nova Estrutura Principal */}
      <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none border-b border-slate-200 dark:border-slate-800 gap-2 select-none pb-0.5">
        {ABAS_VISIVEIS.crm && (
        <button
          type="button"
          onClick={() => setActiveTab('crm')}
          className={`pb-3 text-xs sm:text-sm font-black px-4 relative transition-all flex items-center gap-1.5 flex-shrink-0 ${
            activeTab === 'crm'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-black'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
          <span>CRM</span>
        </button>
        )}
        {ABAS_VISIVEIS.cadastros && (
        <button
          type="button"
          onClick={() => setActiveTab('cadastros')}
          className={`pb-3 text-xs sm:text-sm font-black px-4 relative transition-all flex items-center gap-1.5 flex-shrink-0 ${
            activeTab === 'cadastros'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-black'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Cadastros</span>
        </button>
        )}
        {ABAS_VISIVEIS.financeiro && (
        <button
          type="button"
          onClick={() => setActiveTab('financeiro')}
          className={`pb-3 text-xs sm:text-sm font-black px-4 relative transition-all flex items-center gap-1.5 flex-shrink-0 ${
            activeTab === 'financeiro'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-black'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Financeiro</span>
        </button>
        )}
        {ABAS_VISIVEIS.orientacao && (
        <button
          type="button"
          onClick={() => setActiveTab('orientacao')}
          className={`pb-3 text-xs sm:text-sm font-black px-4 relative transition-all flex items-center gap-1.5 flex-shrink-0 ${
            activeTab === 'orientacao'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-black'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Movimentação</span>
        </button>
        )}
        {ABAS_VISIVEIS.pesquisa && (
        <button
          type="button"
          onClick={() => setActiveTab('pesquisa')}
          className={`pb-3 text-xs sm:text-sm font-black px-4 relative transition-all flex items-center gap-1.5 flex-shrink-0 ${
            activeTab === 'pesquisa'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-black'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Pesquisa</span>
        </button>
        )}
        {ABAS_VISIVEIS.relatorios && (
        <button
          type="button"
          onClick={() => setActiveTab('relatorios')}
          className={`pb-3 text-xs sm:text-sm font-black px-4 relative transition-all flex items-center gap-1.5 flex-shrink-0 ${
            activeTab === 'relatorios'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-black'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Relatórios</span>
        </button>
        )}

        {/* A barrinha separadora só faz sentido se houver algo à esquerda dela. */}
        {(ABAS_VISIVEIS.crm || ABAS_VISIVEIS.cadastros || ABAS_VISIVEIS.financeiro
          || ABAS_VISIVEIS.orientacao || ABAS_VISIVEIS.pesquisa || ABAS_VISIVEIS.relatorios) && (
          <span className="h-6 w-px bg-slate-200 dark:bg-slate-800 my-auto mx-1"></span>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('visu')}
          className={`pb-3 text-xs sm:text-sm font-extrabold px-3 relative transition-all flex-shrink-0 ${
            activeTab === 'visu' 
              ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400' 
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reg')}
          className={`pb-3 text-xs sm:text-sm font-extrabold px-3 relative transition-all flex-shrink-0 ${
            activeTab === 'reg' 
              ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400' 
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Cadastros Acadêmicos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('imp')}
          className={`pb-3 text-xs sm:text-sm font-extrabold px-3 relative transition-all flex-shrink-0 ${
            activeTab === 'imp' 
              ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400' 
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Importar Planilhas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('msg')}
          className={`pb-3 text-xs sm:text-sm font-extrabold px-3 relative transition-all flex-shrink-0 ${
            activeTab === 'msg' 
              ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400' 
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Mensagens & Avisos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sec')}
          className={`pb-3 text-xs sm:text-sm font-extrabold px-3 relative transition-all flex items-center gap-1.5 flex-shrink-0 ${
            activeTab === 'sec' 
              ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400' 
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Backup & Segurança</span>
        </button>
        {ABAS_VISIVEIS.boletins && (
        <button
          type="button"
          onClick={() => setActiveTab('boletins')}
          className={`pb-3 text-xs sm:text-sm font-extrabold px-3 relative transition-all flex items-center gap-1.5 flex-shrink-0 ${
            activeTab === 'boletins'
              ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>Boletim Completo</span>
        </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('historico_completo')}
          className={`pb-3 text-xs sm:text-sm font-extrabold px-3 relative transition-all flex items-center gap-1.5 flex-shrink-0 ${
            activeTab === 'historico_completo' 
              ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400' 
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>Histórico do Aluno</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('estagio')}
          className={`pb-3 text-xs sm:text-sm font-extrabold px-3 relative transition-all flex items-center gap-1.5 flex-shrink-0 ${
            activeTab === 'estagio' 
              ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400' 
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Briefcase className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>Estágios</span>
        </button>
      </div>

      {/* Tab: CRM */}
      {activeTab === 'crm' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <CRMModule />
        </motion.div>
      )}

      {/* Tab: Cadastros */}
      {activeTab === 'cadastros' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <CadastrosModule />
        </motion.div>
      )}

      {/* Tab: Financeiro */}
      {activeTab === 'financeiro' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <FinanceiroModule 
            currentUser="Administração Financeira"
            allStudentUsers={allStudentUsers}
            courses={courses}
            classes={classes}
            isAdmin={true}
          />
        </motion.div>
      )}

      {/* Tab: Movimentação (Gestão Acadêmica Integrada) */}
      {activeTab === 'orientacao' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <MovimentacaoModule currentUser="Administrador Acadêmico" />
        </motion.div>
      )}

      {/* Tab: Estágios (Atalho Direto para Aba de Estágios) */}
      {activeTab === 'estagio' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <MovimentacaoModule currentUser="Administrador Acadêmico" initialSubTab="estagios" />
        </motion.div>
      )}

      {/* Tab: Pesquisa */}
      {activeTab === 'pesquisa' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <PesquisaModule />
        </motion.div>
      )}

      {/* Tab: Relatórios */}
      {activeTab === 'relatorios' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <RelatoriosModule />
        </motion.div>
      )}

      {/* Tab: VISUALIZADOR DE INDICADORES (Dashboard Executivo BI) */}
      {activeTab === 'visu' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Executive BI Dashboard */}
          <ExecutiveBIDashboard onNavigateTab={(tabKey) => setActiveTab(tabKey as any)} />

          {/* CONTROL CENTER: Automated closing and simulated dates */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Programação de Prazos & Fechamento Automático</h3>
                <p className="text-xs text-slate-400">Configure as datas de encerramento para cada período e gerencie o bloqueio automático de diários.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* S1 Deadline */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Prazo de Fechamento da S1</label>
                <input
                  type="date"
                  value={calendarEvents.find(e => e.type === 'CLOSING_S1')?.date || ''}
                  onChange={(e) => {
                    const ev = calendarEvents.find(evt => evt.type === 'CLOSING_S1');
                    if (ev) updateCalendarEventDate(ev.id, e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-800 dark:text-white font-mono"
                />
              </div>

              {/* S2 Deadline */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Prazo de Fechamento da S2</label>
                <input
                  type="date"
                  value={calendarEvents.find(e => e.type === 'CLOSING_S2')?.date || ''}
                  onChange={(e) => {
                    const ev = calendarEvents.find(evt => evt.type === 'CLOSING_S2');
                    if (ev) updateCalendarEventDate(ev.id, e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-800 dark:text-white font-mono"
                />
              </div>

              {/* Definitive Deadline */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Fechamento Geral Definitivo</label>
                <input
                  type="date"
                  value={calendarEvents.find(e => e.type === 'DEFINITIVE_CLOSING')?.date || ''}
                  onChange={(e) => {
                    const ev = calendarEvents.find(evt => evt.type === 'DEFINITIVE_CLOSING');
                    if (ev) updateCalendarEventDate(ev.id, e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-800 dark:text-white font-mono"
                />
              </div>

              {/* Conselho de Classe */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Conselho de Classe</label>
                <input
                  type="date"
                  value={calendarEvents.find(e => e.id === 'cal_4' || e.type === CalendarEventType.INFO)?.date || ''}
                  onChange={(e) => {
                    const ev = calendarEvents.find(evt => evt.id === 'cal_4' || evt.type === CalendarEventType.INFO);
                    if (ev) updateCalendarEventDate(ev.id, e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-800 dark:text-white font-mono"
                />
              </div>
            </div>

            {/* Checkbox settings */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/20 p-3 rounded-2xl border border-slate-150 dark:border-slate-800/60 text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-lock-checkbox"
                  checked={autoLockEnabled}
                  onChange={(e) => setAutoLockEnabled(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-slate-300 dark:border-slate-700 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="auto-lock-checkbox" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  Bloquear diários automaticamente ao atingir os prazos limites
                </label>
              </div>
            </div>
          </div>

          {/* CONTROL CENTER: Admin Direct Journals Launching & Printing Hub */}
          <div id="admin-journals-central-hub" className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
              <div className="flex items-center gap-2">
                <School className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Central de Lançamentos & Controle de Diários</h3>
                  <p className="text-xs text-slate-400">Abra diários diretamente para lançar notas e faltas ou para visualização de relatórios.</p>
                </div>
              </div>

              {/* Class Selector Dropdown */}
              <div className="w-full sm:max-w-xs space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Selecione a Turma da Sala</label>
                <select
                  id="admin-journals-class-select"
                  value={selectedAdminClassId}
                  onChange={(e) => setSelectedAdminClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-800 dark:text-white font-extrabold cursor-pointer"
                >
                  <option value="" disabled>Selecione uma turma...</option>
                  {activePeriodClasses.map(cls => {
                    const courseName = courses.find(co => co.id === cls.courseId)?.name || 'Curso';
                    return (
                      <option key={cls.id} value={cls.id}>
                        {cls.code ? `[${cls.code}] ` : ''}{cls.name} ({courseName})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {(() => {
              const targetClass = activePeriodClasses.find(c => c.id === selectedAdminClassId);
              if (!targetClass) {
                return (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-400 italic">Nenhuma turma selecionada ou cadastrada para o período {currentPeriod}.</p>
                  </div>
                );
              }

              // Subjects of this class
              const classSubs = (targetClass.isDependency && targetClass.dependencySubjectId ? subjects.filter(s => s.id === targetClass.dependencySubjectId) : subjects.filter(s => s.courseId === targetClass.courseId && s.module === targetClass.module));

              return (
                <div className="space-y-4">
                  {/* Class Info and Global Actions Card */}
                  <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-800 dark:text-white">
                          TURMA: {targetClass.name}
                        </span>
                        {targetClass.code && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold rounded">
                            {targetClass.code}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                          targetClass.closedDefinitive
                            ? 'bg-red-100 dark:bg-red-950/45 text-red-700 dark:text-red-400'
                            : 'bg-emerald-100 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {targetClass.closedDefinitive ? 'FECHAMENTO DEFINITIVO' : 'DIÁRIOS ABERTOS'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Turno: <strong>{targetClass.shift}</strong> • Módulo: <strong>Módulo {targetClass.module}</strong> • Ano/Semestre: <strong>{targetClass.year}/{targetClass.semester}</strong> • Total de Disciplinas: <strong>{classSubs.length}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        id="admin-btn-print-mapa-notas"
                        onClick={() => {
                          const firstSub = classSubs[0];
                          if (!firstSub) {
                            alert('Nenhuma disciplina encontrada para esta turma.');
                            return;
                          }
                          setPrintDoc({ type: 'mapa_notas', classId: targetClass.id, subjectId: firstSub.id });
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm shadow-blue-600/10 cursor-pointer"
                        title="Imprimir Mapa de Notas Completo de Todos os Diários"
                      >
                        <Printer className="h-3.5 w-3.5" /> Abrir Todos os Diários (Mapa da Sala)
                      </button>
                    </div>
                  </div>

                  {/* List of Journals of the selected class */}
                  <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-150 dark:divide-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <div className="bg-slate-50/50 dark:bg-slate-800/40 p-3 grid grid-cols-12 gap-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <div className="col-span-12 sm:col-span-5">Disciplina / Diário</div>
                      <div className="col-span-6 sm:col-span-3 text-center">Status de Acesso</div>
                      <div className="col-span-6 sm:col-span-4 text-right">Ações Rápidas de Lançamento & Impressão</div>
                    </div>

                    {classSubs.length === 0 ? (
                      <p className="p-4 text-xs text-slate-400 italic text-center col-span-12">Nenhuma matéria vinculada a este módulo/curso.</p>
                    ) : (
                      classSubs.map(sub => {
                        // Check locks
                        const closedS1 = targetClass.closedS1;
                        const closedS2 = targetClass.closedS2;
                        const closedDef = targetClass.closedDefinitive;

                        return (
                          <div key={sub.id} className="p-3.5 grid grid-cols-12 gap-2 items-center hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition-all">
                            {/* Subject Name and CH */}
                            <div className="col-span-12 sm:col-span-5 space-y-0.5">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {sub.name}
                              </p>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                <span>Carga Horária: <strong>{sub.workload} horas</strong></span>
                                <span>•</span>
                                <span>Cód. Disciplina: <strong className="font-mono">{sub.id}</strong></span>
                              </p>
                            </div>

                            {/* Locks Status pills */}
                            <div className="col-span-6 sm:col-span-3 flex justify-center gap-1.5 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                closedS1 
                                  ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-950/30' 
                                  : 'bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/20'
                              }`}>
                                S1: {closedS1 ? 'BLOQ.' : 'LIB.'}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                closedS2 
                                  ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-950/30' 
                                  : 'bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/20'
                              }`}>
                                S2: {closedS2 ? 'BLOQ.' : 'LIB.'}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                closedDef 
                                  ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-950/40' 
                                  : 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-950/30'
                              }`}>
                                DEF: {closedDef ? 'FECHADO' : 'ATIVO'}
                              </span>
                            </div>

                            {/* Direct launch / print buttons */}
                            <div className="col-span-6 sm:col-span-4 flex justify-end gap-1.5 flex-wrap">
                              {/* Direct Launch Grades */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveClassId(targetClass.id);
                                  setActiveSubjectId(sub.id);
                                  setGradeWindowState('open');
                                  setIsGradeWindowMaximized(false);
                                }}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-blue-700 dark:text-blue-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-blue-100 dark:border-slate-700"
                                title="Abrir Diário de Notas para Lançamento direto"
                              >
                                📝 Notas
                              </button>

                              {/* Direct Launch Attendance */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveClassId(targetClass.id);
                                  setActiveSubjectId(sub.id);
                                  setAttendanceWindowState('open');
                                  setIsAttendanceWindowMaximized(false);
                                }}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-emerald-100 dark:border-slate-700"
                                title="Abrir Diário de Frequência para Lançamento direto (Faltas)"
                              >
                                📅 Faltas
                              </button>

                              {/* Print single subject Grades journal */}
                              <button
                                type="button"
                                onClick={() => {
                                  setPrintDoc({ type: 'diario_notas', classId: targetClass.id, subjectId: sub.id });
                                }}
                                className="p-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-all border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-center"
                                title="Imprimir Diário de Notas desta Disciplina"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>

                              {/* Print single subject Attendance journal */}
                              <button
                                type="button"
                                onClick={() => {
                                  setPrintDoc({ type: 'diario_freq', classId: targetClass.id, subjectId: sub.id });
                                }}
                                className="p-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-all border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-center"
                                title="Imprimir Diário de Frequência desta Disciplina"
                              >
                                <Calendar className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Student Directory & Print Hub (Ficha de Aproveitamento) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 select-none">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Diretório de Aproveitamento Individual</h3>
                <p className="text-xs text-slate-400">Pesquise por alunos e visualize/imprima boletins acadêmicos oficiais.</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome ou matrícula..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-white transition-all text-xs"
                />
              </div>
            </div>

            {/* Students List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => {
                  const sGrades = grades.filter(g => g.studentId === student.id);
                  const isAptoAll = sGrades.length > 0 && sGrades.every(g => g.result === 'APTO');
                  return (
                    <div 
                      key={student.id} 
                      className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-800/60 rounded-2xl flex items-center justify-between hover:border-blue-400 dark:hover:border-blue-800 transition-all shadow-sm"
                    >
                      <div>
                        <p className="font-extrabold text-slate-800 dark:text-white text-xs">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">Matrícula: {student.enrollment}</p>
                      </div>
                      <button
                        type="button"
                        id={`print-boletim-${student.enrollment}-btn`}
                        onClick={() => setPrintDoc({ type: 'boletim', studentId: student.id, classId: student.classId || selectedAdminClassId })}
                        className="p-2 bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-all"
                        title="Imprimir Ficha de Aproveitamento"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-8 text-center text-slate-400">
                  <Inbox className="h-8 w-8 mx-auto mb-2 opacity-60" /> Ninguém encontrado com os critérios digitados.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab: CADASTROS ACADÊMICOS (Forms to extend metadata) */}
      {activeTab === 'reg' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Sub Navigation Bar for Cadastros Acadêmicos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl flex flex-wrap items-center gap-2 shadow-sm">
            <button
              type="button"
              id="subtab-cadastrar-novo-curso"
              onClick={() => setRegSubTab('cursos')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                regSubTab === 'cursos'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="h-4 w-4" /> Cadastrar Novo Curso
            </button>
            <button
              type="button"
              id="subtab-funcionarios-sistema"
              onClick={() => setRegSubTab('funcionarios')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                regSubTab === 'funcionarios'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="h-4 w-4" /> Funcionários do Sistema
            </button>
            <button
              type="button"
              id="subtab-dependencias"
              onClick={() => setRegSubTab('dependencias')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                regSubTab === 'dependencias'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="h-4 w-4" /> Dependências
            </button>
            <button
              type="button"
              id="subtab-turmas-professores"
              onClick={() => setRegSubTab('turmas')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                regSubTab === 'turmas'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FolderPlus className="h-4 w-4" /> Turmas, Professores & Alunos
            </button>
          </div>

          {/* SubTab Views */}
          {regSubTab === 'cursos' && <CourseManager />}
          {regSubTab === 'funcionarios' && <StaffManager />}
          {regSubTab === 'dependencias' && (
            <DependencyManager
              onVerDiario={(classId, subjectId) => {
                setActiveClassId(classId);
                setActiveSubjectId(subjectId);
                setGradeWindowState('open');
              }}
            />
          )}

          {regSubTab === 'turmas' && (
            <div className="grid md:grid-cols-12 gap-6">
          {/* Create Class Form */}
          <div className="md:col-span-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-1.5 mb-4 text-slate-800 dark:text-white">
              <FolderPlus className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              <h4 className="font-bold">Cadastrar Nova Turma</h4>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Nome da Turma</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: 2A MAT" 
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:bg-white rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Código da Turma</label>
                  <input 
                    type="text" 
                    placeholder="Ex: ENF-M2-MAT" 
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:bg-white rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Curso Vinculado</label>
                <select
                  value={classCourse}
                  onChange={(e) => setClassCourse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                >
                  {courses.map(co => (
                    <option key={co.id} value={co.id}>{co.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Turno</label>
                  <select
                    value={classShift}
                    onChange={(e) => setClassShift(e.target.value as Shift)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                  >
                    {Object.values(Shift).map(sh => (
                      <option key={sh} value={sh}>{sh}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Módulo / Período</label>
                  <select
                    value={classModule}
                    onChange={(e) => setClassModule(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                  >
                    <option value={1}>Módulo I</option>
                    <option value={2}>Módulo II</option>
                    <option value={3}>Módulo III</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                id="create-class-submit-btn"
                className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow shadow-blue-600/10 transition-all cursor-pointer"
              >
                Criar Turma
              </button>
            </form>
          </div>

          {/* Create Subject Form */}
          <div className="md:col-span-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-1.5 mb-4 text-slate-800 dark:text-white">
              <BookOpen className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              <h4 className="font-bold">Nova Disciplina</h4>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Nome da Matéria</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: NOÇÕES DE ANESTESIOLOGIA" 
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:bg-white rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Grade do Curso</label>
                <select
                  value={subCourse}
                  onChange={(e) => setSubCourse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                >
                  {courses.map(co => (
                    <option key={co.id} value={co.id}>{co.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Módulo</label>
                  <select
                    value={subModule}
                    onChange={(e) => setSubModule(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                  >
                    <option value={1}>Módulo I</option>
                    <option value={2}>Módulo II</option>
                    <option value={3}>Módulo III</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Carga Horária</label>
                  <select
                    value={subWorkload}
                    onChange={(e) => setSubWorkload(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                  >
                    <option value={20}>20 Horas</option>
                    <option value={40}>40 Horas</option>
                    <option value={80}>80 Horas</option>
                    <option value={120}>120 Horas</option>
                    <option value={160}>160 Horas</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                id="create-subject-submit-btn"
                className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow shadow-blue-600/10 transition-all cursor-pointer"
              >
                Cadastrar Matéria
              </button>
            </form>
          </div>

          {/* Create User Form (Teacher or Admin) */}
          <div className="md:col-span-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-1.5 mb-4 text-slate-800 dark:text-white">
              <UserPlus className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              <h4 className="font-bold">Cadastrar Usuário (Docente ou Administração)</h4>
            </div>

            <FormularioDocente aoCadastrar={handleCreateUser} />
          </div>

          {/* Form para Matricular Aluno Individual */}
          <div className="md:col-span-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-1.5 mb-4 text-slate-800 dark:text-white">
              <UserCheck className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              <h4 className="font-bold">Matricular Aluno na Turma</h4>
            </div>

            <form onSubmit={handleEnrollSingleStudent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Selecionar Turma Destino</label>
                <select
                  required
                  value={selectedClassIdForStudents}
                  onChange={(e) => setSelectedClassIdForStudents(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                >
                  <option value="" disabled>Selecione uma turma...</option>
                  {/* SÓ AS TURMAS DO PERÍODO ATUAL.
                      Antes esta lista trazia `classes` inteiro — as 601 turmas,
                      de 2024 a 2028, com nomes quase idênticos entre si. E logo
                      abaixo há um efeito que, ao perceber uma turma fora do
                      período corrente, TROCA a escolha sozinho pela primeira
                      turma do período — sem avisar. Quem escolhesse
                      "Enfermagem 1º matutino 2026/1" via o aluno cair em outra
                      turma qualquer, e o destino errado mudava de um dia para o
                      outro, porque a leitura das turmas não pedia ordem nenhuma
                      ao banco. Era a pendência "turma errada na matrícula".
                      Com a lista filtrada, não há mais escolha inválida a
                      corrigir, e a correção silenciosa nunca dispara. */}
                  {activePeriodClasses.map(cl => (
                    <option key={cl.id} value={cl.id}>
                      Período: {cl.year}/{cl.semester} | {cl.code ? `[${cl.code}] ` : ''}{cl.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Número de Matrícula
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: 26101015" 
                    value={singleStudentEnrollment}
                    onChange={(e) => setSingleStudentEnrollment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:bg-white rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Nome do Aluno
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Digite o nome completo do aluno" 
                    value={singleStudentName}
                    onChange={(e) => setSingleStudentName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:bg-white rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                ℹ️ <strong>Regra Acadêmica:</strong> Ao matricular, o aluno é vinculado a <strong>todos os diários e disciplinas</strong> desta sala/turma simultaneamente.
              </div>

              <button
                type="submit"
                id="single-student-submit-btn"
                className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow shadow-blue-600/10 transition-all cursor-pointer uppercase tracking-wider"
              >
                Matricular
              </button>
            </form>
          </div>

          {/* Gerenciar e Excluir Turmas */}
          <div className="md:col-span-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-3 text-slate-800 dark:text-white">
                <Trash2 className="h-5 w-5 text-red-600" />
                <h4 className="font-bold">Gerenciar e Excluir Turmas</h4>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, código ou curso..."
                  value={classSearchQuery}
                  onChange={(e) => setClassSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white focus:bg-white"
                />
              </div>

              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                {classes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma turma cadastrada.</p>
                ) : (() => {
                  const filteredClassList = classes.filter(cl => {
                    if (!classSearchQuery) return true;
                    const query = classSearchQuery.toLowerCase();
                    const courseName = courses.find(co => co.id === cl.courseId)?.name || '';
                    return (
                      (cl.name ?? '').toLowerCase().includes(query) ||
                      (cl.code && cl.code.toLowerCase().includes(query)) ||
                      courseName.toLowerCase().includes(query) ||
                      cl.shift.toLowerCase().includes(query)
                    );
                  });

                  if (filteredClassList.length === 0) {
                    return <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma turma correspondente encontrada.</p>;
                  }

                  return filteredClassList.map(cl => {
                    const courseName = courses.find(co => co.id === cl.courseId)?.name || 'Curso';
                    const isConfirming = confirmDeleteClassId === cl.id;
                    const isEditing = editingClassId === cl.id;

                    if (isEditing) {
                      return (
                        <div 
                          key={cl.id}
                          className="p-3 bg-blue-50/40 dark:bg-blue-950/15 border border-blue-200 dark:border-blue-900/40 rounded-xl space-y-3 animate-fade-in"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Nome da Turma</label>
                              <input 
                                type="text"
                                value={editClassName}
                                onChange={(e) => setEditClassName(e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-white outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Código / Sigla</label>
                              <input 
                                type="text"
                                value={editClassCode}
                                onChange={(e) => setEditClassCode(e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-white outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Turno</label>
                              <select
                                value={editClassShift}
                                onChange={(e) => setEditClassShift(e.target.value as Shift)}
                                className="w-full px-1 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] text-slate-800 dark:text-white outline-none"
                              >
                                <option value="MATUTINO">Matutino</option>
                                <option value="VESPERTINO">Vespertino</option>
                                <option value="NOTURNO">Nocturno</option>
                                <option value="SÁBADO">Sábado</option>
                                <option value="EAD">EAD</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Mód.</label>
                              <input 
                                type="number"
                                min={1}
                                max={10}
                                value={editClassModule}
                                onChange={(e) => setEditClassModule(parseInt(e.target.value) || 1)}
                                className="w-full px-1 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] text-slate-800 dark:text-white outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Ano</label>
                              <input 
                                type="number"
                                value={editClassYear}
                                onChange={(e) => setEditClassYear(parseInt(e.target.value) || 2026)}
                                className="w-full px-1 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] text-slate-800 dark:text-white outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Sem.</label>
                              <input 
                                type="number"
                                min={1}
                                max={2}
                                value={editClassSemester}
                                onChange={(e) => setEditClassSemester(parseInt(e.target.value) || 1)}
                                className="w-full px-1 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] text-slate-800 dark:text-white outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingClassId(null)}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-[10px] font-bold rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateClass(cl.id, {
                                  name: editClassName,
                                  code: editClassCode,
                                  shift: editClassShift,
                                  module: editClassModule,
                                  year: editClassYear,
                                  semester: editClassSemester
                                });
                                setEditingClassId(null);
                              }}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg shadow-sm cursor-pointer"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // TRAVA DE SEGURANÇA CONTRA APAGAR TURMA COM DADO REAL.
                    //
                    // Excluir uma turma apaga em cascata, no banco, toda
                    // matrícula e nota lançada nela — sem aviso nenhum antes
                    // desta correção. Uma turma de teste vazia pode ser
                    // excluída livremente; uma turma com aluno matriculado
                    // ou nota lançada não pode, para não arriscar apagar
                    // histórico acadêmico de verdade sem querer.
                    const alunosNaTurma = users.filter(u => u.role === UserRole.STUDENT && u.classId === cl.id).length;
                    const notasNaTurma = grades.filter(g => g.classId === cl.id).length;
                    const turmaTemDados = alunosNaTurma > 0 || notasNaTurma > 0;

                    return (
                      <div 
                        key={cl.id}
                        className="p-3 bg-slate-50/50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                            <span>{cl.name}</span>
                            {cl.code && (
                              <span className="px-1.5 py-0.5 text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-mono font-bold">
                                {cl.code}
                              </span>
                            )}
                            {turmaTemDados && (
                              <span className="px-1.5 py-0.5 text-[9px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded font-bold">
                                {alunosNaTurma} aluno(s) • {notasNaTurma} nota(s)
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {courseName} • {cl.shift} • Mód. {cl.module} ({cl.year}/{cl.semester})
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClassId(cl.id);
                              setEditClassName(cl.name);
                              setEditClassCode(cl.code || '');
                              setEditClassShift(cl.shift);
                              setEditClassModule(cl.module);
                              setEditClassYear(cl.year);
                              setEditClassSemester(cl.semester);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-150/50 dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Editar Turma"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (turmaTemDados) {
                                mostrarAviso(
                                  'Esta turma não pode ser excluída por aqui',
                                  `"${cl.name}" tem ${alunosNaTurma} aluno(s) matriculado(s) e ${notasNaTurma} nota(s) lançada(s). ` +
                                  `Excluir apagaria esse histórico junto — por isso o botão está bloqueado para turmas com dados. ` +
                                  `Se a turma realmente precisa sumir mesmo assim (ex.: matrícula feita por engano), fale com o suporte técnico em vez de usar este botão.`
                                );
                                return;
                              }
                              if (isConfirming) {
                                deleteClass(cl.id);
                                setConfirmDeleteClassId(null);
                              } else {
                                setConfirmDeleteClassId(cl.id);
                              }
                            }}
                            disabled={turmaTemDados}
                            className={`p-1.5 rounded-lg transition-all text-xs ${
                              turmaTemDados
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                : isConfirming 
                                ? 'bg-red-600 text-white animate-pulse font-bold px-2 py-1' 
                                : 'text-slate-400 hover:text-red-500 hover:bg-slate-150/50 dark:hover:bg-slate-800'
                            }`}
                            title={turmaTemDados ? 'Turma com aluno/nota — exclusão bloqueada' : isConfirming ? 'Confirmar exclusão desta turma?' : 'Excluir Turma'}
                          >
                            {isConfirming && !turmaTemDados ? 'Confirmar?' : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Gerenciar Usuários Cadastrados */}
          <div className="md:col-span-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-white">
                  <Users className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                  <h4 className="font-bold">Gerenciar Usuários Cadastrados</h4>
                </div>
              </div>

              {/* Geração de acessos em massa.
                  A importação de planilha cadastra os alunos mas não cria login
                  para nenhum. Sem este botão, a secretaria teria que cadastrar
                  os 250 alunos um por um só para que pudessem entrar. */}
              <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    <strong>Acessos dos alunos importados</strong>
                    <p className="text-amber-600 dark:text-amber-400 mt-0.5">
                      Alunos vindos de planilha ficam cadastrados, mas sem login. Este botão cria
                      as contas de uma vez. A senha inicial de cada um é a própria matrícula, com
                      troca obrigatória no primeiro acesso.
                    </p>
                    {progressoAcessos && (
                      <p className="mt-1.5 font-bold text-amber-800 dark:text-amber-200">{progressoAcessos}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={gerandoAcessos}
                    onClick={async () => {
                      const pendentes = await contarAlunosSemAcesso();
                      if (pendentes === 0) {
                        mostrarAviso('Nada a fazer', 'Todos os alunos ativos já possuem acesso ao portal.');
                        return;
                      }
                      pedirConfirmacao(
                        'Criar acessos dos alunos',
                        `Serão criadas ${pendentes} conta(s) de acesso.\n\nA senha inicial de cada aluno será a própria matrícula, com troca obrigatória no primeiro acesso.\n\nIsto pode levar alguns minutos.`,
                        async () => {
                          setGerandoAcessos(true);
                          setProgressoAcessos('Iniciando...');
                          try {
                            const r = await gerarAcessosDosAlunos((feitos, total) => {
                              setProgressoAcessos(`Criando acessos: ${feitos} de ${total}...`);
                            });
                            setProgressoAcessos(`Concluído: ${r.criados} criado(s), ${r.falhas} falha(s).`);
                            mostrarAviso(
                              'Acessos criados',
                              `Contas criadas: ${r.criados}\nFalhas: ${r.falhas}\n\n` +
                              (r.erros.length ? `Primeiros problemas:\n- ${r.erros.slice(0, 8).join('\n- ')}` : 'Nenhum problema encontrado.')
                            );
                          } catch (err: any) {
                            setProgressoAcessos('');
                            mostrarAviso('Falha ao gerar acessos', String(err?.message || err));
                          } finally {
                            setGerandoAcessos(false);
                          }
                        }
                      );
                    }}
                    className="shrink-0 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-[10px] font-black uppercase tracking-wider transition-colors"
                  >
                    {gerandoAcessos ? 'Criando...' : 'Gerar acessos'}
                  </button>
                </div>
              </div>

              {/* NOVO ADMINISTRADOR
                  Antes o sistema não tinha como criar outro administrador: a
                  conta inicial era a única, e perdê-la significava perder o
                  controle do portal. Ter um segundo admin é o que evita isso. */}
              <div className="mb-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield className="h-4 w-4 text-purple-700 dark:text-purple-400" />
                  <strong className="text-[11px] text-purple-800 dark:text-purple-300">Cadastrar novo administrador</strong>
                </div>
                <p className="text-[10px] text-purple-600 dark:text-purple-400 leading-relaxed mb-2">
                  Acesso total ao portal. O e-mail precisa ser real e só dessa pessoa — é por ele
                  que a conta pode ser recuperada se o acesso se perder. Tenha sempre pelo menos
                  dois administradores.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={novoAdminNome}
                    onChange={(e) => setNovoAdminNome(e.target.value)}
                    placeholder="Nome completo"
                    className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/40 rounded-lg text-xs text-slate-800 dark:text-white outline-none"
                  />
                  <input
                    type="text"
                    value={novoAdminLogin}
                    onChange={(e) => setNovoAdminLogin(e.target.value)}
                    placeholder="Usuário de login"
                    className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/40 rounded-lg text-xs text-slate-800 dark:text-white outline-none"
                  />
                  <input
                    type="email"
                    value={novoAdminEmail}
                    onChange={(e) => setNovoAdminEmail(e.target.value)}
                    placeholder="E-mail real"
                    className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/40 rounded-lg text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={criandoAdmin}
                  onClick={() => {
                    const nome = novoAdminNome.trim();
                    const login = novoAdminLogin.trim().toLowerCase();
                    const email = novoAdminEmail.trim().toLowerCase();

                    if (nome.length < 3) { mostrarAviso('Faltam dados', 'Informe o nome completo do administrador.'); return; }
                    if (!/^[\w.\-]{3,}$/.test(login)) { mostrarAviso('Usuário inválido', 'Use letras, números, ponto ou hífen — mínimo 3 caracteres, sem espaços.'); return; }
                    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { mostrarAviso('E-mail inválido', 'Informe um e-mail real. É por ele que esta conta poderá ser recuperada.'); return; }

                    pedirConfirmacao(
                      'Criar administrador?',
                      `${nome} passará a ter acesso total ao portal: notas, cadastros, financeiro, ` +
                      `e poderá criar e redefinir senhas de outras pessoas.\n\nConfirma?`,
                      async () => {
                        setCriandoAdmin(true);
                        try {
                          const r = await criarAcesso({ nome, login, papel: 'ADMIN', email });
                          if (r.ok) {
                            setNovoAdminNome(''); setNovoAdminLogin(''); setNovoAdminEmail('');
                            mostrarAviso(
                              'Administrador criado',
                              `Nome: ${nome}\nUsuário: ${r.login}\n\nEntregue a senha abaixo. ` +
                              `Ela não será mostrada de novo, e a pessoa terá que trocá-la ao entrar.`,
                              r.senhaInicial
                            );
                          } else {
                            mostrarAviso('Não foi possível criar', String(r.mensagem));
                          }
                        } catch (err: any) {
                          mostrarAviso('Não foi possível criar', String(err?.message || err));
                        } finally {
                          setCriandoAdmin(false);
                        }
                      }
                    );
                  }}
                  className="mt-2 w-full px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400 text-white text-[10px] font-black uppercase tracking-wider transition-colors"
                >
                  {criandoAdmin ? 'Criando...' : 'Criar administrador'}
                </button>
              </div>

              {/* Search user */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, usuário, e-mail ou matrícula..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white focus:bg-white placeholder-slate-400"
                />
              </div>

              {/* Role filter pills */}
              <div className="flex flex-wrap gap-1 mb-3">
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('ALL')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                    userRoleFilter === 'ALL'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter(UserRole.ADMIN)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                    userRoleFilter === UserRole.ADMIN
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter(UserRole.TEACHER)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                    userRoleFilter === UserRole.TEACHER
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  Professores
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter(UserRole.STUDENT)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                    userRoleFilter === UserRole.STUDENT
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  Alunos
                </button>
              </div>

              {/* User list */}
              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                {(() => {
                  const filteredUsers = users.filter(u => {
                    if (userSearchQuery) {
                      // CAMPO VAZIO NÃO PODE DERRUBAR A BUSCA.
                      //
                      // `u.username.toLowerCase()` e `u.email.toLowerCase()`
                      // supunham que todo mundo tem esses dados. A conta de
                      // administração e a da secretaria não têm e-mail
                      // cadastrado — bastava digitar UMA LETRA no campo de
                      // pesquisa para a tela inteira cair em "Ocorrência de
                      // Sistema", no meio de um atendimento.
                      const q = userSearchQuery.toLowerCase();
                      const contem = (valor?: string | null) =>
                        (valor ?? '').toLowerCase().includes(q);
                      const matchName = contem(u.name);
                      const matchUsername = contem(u.username);
                      const matchEmail = contem(u.email);
                      const matchEnrollment = contem(u.enrollment);
                      if (!matchName && !matchUsername && !matchEmail && !matchEnrollment) {
                        return false;
                      }
                    }

                    if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) {
                      return false;
                    }

                    return true;
                  });

                  if (filteredUsers.length === 0) {
                    return <p className="text-xs text-slate-400 italic text-center py-4">Nenhum usuário correspondente encontrado.</p>;
                  }

                  return filteredUsers.map(u => {
                    const isUserEditing = editingUserId === u.id;
                    const isUserConfirmingDelete = confirmDeleteUserId === u.id;

                    if (isUserEditing) {
                      return (
                        <div 
                          key={u.id}
                          className="p-3 bg-blue-50/40 dark:bg-blue-950/15 border border-blue-200 dark:border-blue-900/40 rounded-xl space-y-3 animate-fade-in"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Nome Completo</label>
                              <input 
                                type="text"
                                value={editUserName}
                                onChange={(e) => setEditUserName(e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-white outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">E-mail</label>
                              <input 
                                type="email"
                                value={editUserEmail}
                                onChange={(e) => setEditUserEmail(e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-white outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Nome de Usuário</label>
                              <input 
                                type="text"
                                value={editUserUsername}
                                onChange={(e) => setEditUserUsername(e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-white outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Nova Senha (Opcional)</label>
                              <input 
                                type="password"
                                placeholder="Deixe em branco p/ manter a atual"
                                value={editUserPassword}
                                onChange={(e) => setEditUserPassword(e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-white outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="col-span-1">
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Função</label>
                              <select
                                value={editUserRole}
                                onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                                className="w-full px-1 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] text-slate-800 dark:text-white outline-none"
                              >
                                <option value={UserRole.STUDENT}>Aluno</option>
                                <option value={UserRole.TEACHER}>Professor</option>
                                <option value={UserRole.ADMIN}>Administrador</option>
                              </select>
                            </div>
                            <div className="col-span-1">
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Matrícula</label>
                              <input 
                                type="text"
                                value={editUserEnrollment}
                                onChange={(e) => setEditUserEnrollment(e.target.value)}
                                className="w-full px-1 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] text-slate-800 dark:text-white outline-none font-mono"
                              />
                            </div>
                            <div className="col-span-1">
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">CPF</label>
                              <input 
                                type="text"
                                value={editUserCpf}
                                onChange={(e) => setEditUserCpf(e.target.value)}
                                className="w-full px-1 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] text-slate-800 dark:text-white outline-none font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingUserId(null)}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-[10px] font-bold rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const userUpdates: any = {
                                  name: editUserName,
                                  email: editUserEmail,
                                  username: editUserUsername,
                                  role: editUserRole,
                                  enrollment: editUserEnrollment || undefined,
                                  cpf: editUserCpf || undefined
                                };
                                if (editUserPassword.trim()) {
                                  userUpdates.password = editUserPassword.trim();
                                }
                                updateUser(u.id, userUpdates);
                                setEditingUserId(null);
                              }}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg shadow-sm cursor-pointer"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // SEM ISTO, NÃO DAVA PRA SABER OLHANDO A TELA se um
                    // aluno/professor tinha login ou não. Depois de excluir o
                    // acesso de alguém, a pessoa continuava aparecendo na
                    // lista do jeito de sempre — parecia que a exclusão não
                    // tinha feito nada, mesmo o login já tendo sumido do
                    // banco de verdade. Agora mostra "SEM LOGIN" bem visível.
                    const semLogin = (u.role === UserRole.STUDENT || u.role === UserRole.TEACHER) && !u.contaId;

                    return (
                      <div 
                        key={u.id}
                        className="p-3 bg-slate-50/50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{u.name}</span>
                            <span className={`px-1.5 py-0.5 text-[8px] font-extrabold uppercase rounded ${
                              u.role === UserRole.ADMIN 
                                ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300' 
                                : u.role === UserRole.TEACHER 
                                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {/* SECRETARIA APARECIA COMO "ALUNO".
                                  Quem não fosse Admin nem Professor caía no
                                  rótulo de aluno. Numa lista onde se redefine
                                  senha e se exclui conta, papel errado leva a
                                  agir sobre a pessoa errada. */}
                              {u.role === UserRole.ADMIN ? 'Admin'
                                : u.role === UserRole.TEACHER ? 'Prof'
                                : u.role === UserRole.STAFF ? 'Secretaria'
                                : 'Aluno'}
                            </span>
                            {semLogin && (
                              <span
                                className="px-1.5 py-0.5 text-[8px] font-extrabold uppercase rounded bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400"
                                title="Esta pessoa não tem conta de login — não consegue entrar no portal. Se o acesso foi excluído recentemente, é esperado; se nunca teve, use 'Acessos dos alunos importados' ou cadastre manualmente."
                              >
                                Sem login
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            Usuário: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{u.username}</span>
                            {u.enrollment && <> • Matrícula: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{u.enrollment}</span></>}
                            {u.password && <> • Senha: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">••••••••</span></>}
                          </p>
                          <p className="text-[9px] text-slate-400 truncate">{u.email}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* REDEFINIR SENHA — não faz sentido para quem não
                              tem login (não existe senha nenhuma pra
                              redefinir). */}
                          {!semLogin && (
                          <button
                            type="button"
                            disabled={redefinindoSenhaDe === u.id}
                            onClick={() => {
                              pedirConfirmacao(
                                'Redefinir a senha desta pessoa?',
                                `A senha atual de ${u.name} deixará de funcionar imediatamente.\n\n` +
                                `Uma senha nova será gerada e mostrada UMA vez, para você entregar a ela. ` +
                                `Ao entrar, ela será obrigada a escolher uma senha só dela.`,
                                async () => {
                                  setRedefinindoSenhaDe(u.id);
                                  try {
                                    // Identifica pela FICHA, não pelo usuário da lista.
                                    //
                                    // O "usuário" mostrado aqui para professor é uma
                                    // numeração local (1001, 1002...) que não existe no
                                    // banco — o login real é outro. Pedir por ele fazia o
                                    // servidor responder "usuário não encontrado".
                                    // Com aluno funcionava por coincidência: lá o usuário
                                    // é a matrícula, que bate com o login.
                                    const r = await redefinirSenhaDeUsuario({
                                      fichaId: u.id,
                                      login: u.username,
                                    });
                                    if (r.ok) {
                                      mostrarAviso(
                                        'Senha redefinida',
                                        `Pessoa: ${r.nome || u.name}\n` +
                                        // O login vem do SERVIDOR de propósito: é o único
                                        // lugar onde ele está correto. É este que a pessoa
                                        // digita para entrar.
                                        `Usuário para entrar no portal: ${r.login}\n\n` +
                                        `Entregue os dois abaixo. A senha não será mostrada de novo.`,
                                        r.senhaNova
                                      );
                                    } else {
                                      mostrarAviso('Não foi possível redefinir', String(r.mensagem));
                                    }
                                  } catch (err: any) {
                                    mostrarAviso('Não foi possível redefinir', String(err?.message || err));
                                  } finally {
                                    setRedefinindoSenhaDe(null);
                                  }
                                }
                              );
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-150/50 dark:hover:bg-slate-800 rounded-lg transition-all disabled:opacity-40"
                            title="Redefinir a senha desta pessoa"
                          >
                            <Key className="h-3.5 w-3.5" />
                          </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUserId(u.id);
                              setEditUserName(u.name);
                              setEditUserEmail(u.email);
                              setEditUserUsername(u.username);
                              setEditUserPassword('');
                              setEditUserRole(u.role);
                              setEditUserEnrollment(u.enrollment || '');
                              setEditUserCpf(u.cpf || '');
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-150/50 dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Editar Usuário"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {/* EXCLUIR USUÁRIO — só o ADMIN vê este botão.
                              A Secretaria (STAFF) e qualquer outro papel não veem a
                              lixeira aqui: podem editar e redefinir senha, mas não
                              apagar contas — e isso agora também vale dentro do banco
                              de dados (não é só a tela escondendo o botão).
                              Antes de excluir, o Admin precisa digitar a PRÓPRIA senha
                              de login, conferida de verdade pelo servidor — não é mais
                              uma senha fixa escrita no código.
                              IMPORTANTE: isto remove só o ACESSO DE LOGIN da pessoa.
                              Notas, frequência, matrícula e histórico escolar do aluno
                              NUNCA são apagados por aqui — ficam preservados como
                              registro permanente, mesmo que ela não estude/trabalhe
                              mais na escola. (Antes desta correção, excluir um aluno
                              apagava o histórico acadêmico inteiro dele; foi
                              corrigido.) */}
                          {currentUser?.role === UserRole.ADMIN && !semLogin && (
                          <button
                            type="button"
                            disabled={confirmandoExclusaoDe === u.id}
                            onClick={async () => {
                              if (isUserConfirmingDelete) {
                                const digitada = window.prompt(
                                  `Isto remove só o ACESSO DE LOGIN de "${u.name}" — notas, frequência e histórico ` +
                                  `NÃO são apagados, continuam registrados.\n\n` +
                                  `Digite a SUA senha de administrador para confirmar:`
                                );
                                if (digitada === null) {
                                  // Cancelou a caixa de senha — não exclui, não fica travado em "Confirmar?"
                                  setConfirmDeleteUserId(null);
                                  return;
                                }
                                setConfirmandoExclusaoDe(u.id);
                                try {
                                  const senhaValida = await conferirSenhaAtual(digitada);
                                  if (!senhaValida) {
                                    mostrarAviso('Senha incorreta', 'A senha digitada não confere com a sua senha de administrador. Nenhum acesso foi removido.');
                                    return;
                                  }
                                  const resultado = await deleteUser(u.id);
                                  if (!resultado.ok) {
                                    mostrarAviso(
                                      'Não foi possível excluir',
                                      `A senha estava certa, mas o banco de dados recusou a exclusão: ${resultado.erro || 'motivo não informado'}. ` +
                                      `Nada foi removido — "${u.name}" continua com acesso normal. Tente novamente; se persistir, pode ser sessão expirada (saia e entre de novo).`
                                    );
                                  }
                                } finally {
                                  setConfirmandoExclusaoDe(null);
                                  setConfirmDeleteUserId(null);
                                }
                              } else {
                                setConfirmDeleteUserId(u.id);
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-all text-xs disabled:opacity-40 ${
                              isUserConfirmingDelete 
                                ? 'bg-red-600 text-white animate-pulse font-bold px-2 py-1' 
                                : 'text-slate-400 hover:text-red-500 hover:bg-slate-150/50 dark:hover:bg-slate-800'
                            }`}
                            title={isUserConfirmingDelete ? 'Confirmar remoção do acesso?' : 'Remover acesso de login (não apaga notas nem histórico)'}
                          >
                            {confirmandoExclusaoDe === u.id ? 'Conferindo...' : isUserConfirmingDelete ? 'Confirmar?' : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                          )}
                          {/* GERAR ACESSO — aparece pra quem está sem
                              login (aluno ou professor). Recria a conta
                              ligada à MESMA ficha, sem perder nada do que
                              já estava atribuído a ela. */}
                          {currentUser?.role === UserRole.ADMIN && semLogin && (u.role === UserRole.STUDENT || u.role === UserRole.TEACHER) && (
                          <button
                            type="button"
                            disabled={gerandoAcessoDe === u.id}
                            onClick={() => gerarAcessoParaFicha({ id: u.id, name: u.name, username: u.username, role: u.role })}
                            className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-40"
                            title="Gerar um novo acesso de login para esta pessoa, mantendo tudo que já tinha"
                          >
                            {gerandoAcessoDe === u.id ? 'Gerando...' : 'Gerar Acesso'}
                          </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Gerenciador de Acessos de Professores */}
          <div className="md:col-span-12 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-800 dark:text-white">
                <Shield className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                <h4 className="font-extrabold">Gerenciador de Acessos de Professores (Salas e Diários)</h4>
              </div>
              <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Controle de Diários
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Defina quais turmas (salas) e disciplinas (diários) cada professor tem permissão para acessar. Professores sem diários atribuídos não visualizarão nenhuma turma ou diário ao fazer login.
            </p>

            <div className="grid lg:grid-cols-12 gap-6 pt-2">
              {/* List of Teachers */}
              <div className="lg:col-span-5 space-y-2 max-h-[480px] overflow-y-auto pr-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Selecione o Docente</p>
                {activeTeachers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 dark:bg-slate-850 rounded-xl">Nenhum professor cadastrado.</p>
                ) : (
                  activeTeachers.map(teacher => {
                    const isSelected = editingTeacherId === teacher.id;
                    const assignedCount = teacher.assignedJournals?.length || 0;
                    // MESMA CORREÇÃO JÁ FEITA EM "GERENCIAR USUÁRIOS
                    // CADASTRADOS" — esta tela tinha o próprio botão de
                    // excluir professor, separado daquele, que nunca
                    // recebeu as mesmas correções: não pedia senha, não
                    // era restrito ao Admin, e chamava `deleteUser` sem
                    // esperar resposta nem mostrar erro — clicar parecia
                    // não fazer nada, com ou sem falha real por trás.
                    const semLogin = !teacher.contaId;
                    return (
                      <div
                        key={teacher.id}
                        className={`w-full p-3 rounded-xl transition-all border flex items-center justify-between gap-2 ${
                          isSelected 
                            ? 'bg-blue-50 dark:bg-blue-950/25 border-blue-200 dark:border-blue-900/30 text-blue-950 dark:text-blue-200 ring-2 ring-blue-600/10' 
                            : 'bg-slate-50/50 dark:bg-slate-850/40 border-slate-200/60 dark:border-slate-800/60 text-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTeacherId(teacher.id);
                            if (teacher.assignedJournals && teacher.assignedJournals.length > 0) {
                              const firstAssignedClassId = teacher.assignedJournals[0].classId;
                              const cls = classes.find(c => c.id === firstAssignedClassId);
                              if (cls) {
                                setSelectedCourseIdFilter(cls.courseId);
                              }
                            }
                          }}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold truncate">{teacher.name}</p>
                              {semLogin && (
                                <span
                                  className="px-1.5 py-0.5 text-[8px] font-extrabold uppercase rounded bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 shrink-0"
                                  title="Este professor não tem conta de login — não consegue entrar no portal."
                                >
                                  Sem login
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 flex-wrap">
                              <span className="truncate">Usuário: <strong className="text-slate-600 dark:text-slate-300 font-mono">{teacher.username}</strong></span>
                              <span>•</span>
                              <span>Matrícula: <strong className="font-mono">{teacher.enrollment}</strong></span>
                              <span>•</span>
                              <span>Senha: <strong className="text-blue-600 dark:text-blue-400 font-mono">{teacher.password ? '••••••••' : 'Sem senha'}</strong></span>
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            assignedCount > 0 
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            {assignedCount} {assignedCount === 1 ? 'diário' : 'diários'}
                          </span>
                          {/* Só Admin, e só quando ainda existe login pra excluir. */}
                          {currentUser?.role === UserRole.ADMIN && !semLogin && (
                          <button
                            type="button"
                            disabled={confirmandoExclusaoProfessorDe === teacher.id}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirmDeleteTeacherId === teacher.id) {
                                const digitada = window.prompt(
                                  `Isto remove só o ACESSO DE LOGIN de "${teacher.name}" — os ${assignedCount} ` +
                                  `${assignedCount === 1 ? 'diário' : 'diários'} atribuídos a ele, com todas as notas e ` +
                                  `frequências já lançadas, NÃO são apagados nem desvinculados.\n\n` +
                                  `Digite a SUA senha de administrador para confirmar:`
                                );
                                if (digitada === null) {
                                  setConfirmDeleteTeacherId(null);
                                  return;
                                }
                                setConfirmandoExclusaoProfessorDe(teacher.id);
                                try {
                                  const senhaValida = await conferirSenhaAtual(digitada);
                                  if (!senhaValida) {
                                    mostrarAviso('Senha incorreta', 'A senha digitada não confere com a sua senha de administrador. Nenhum acesso foi removido.');
                                    return;
                                  }
                                  const resultado = await deleteUser(teacher.id);
                                  if (!resultado.ok) {
                                    mostrarAviso(
                                      'Não foi possível excluir',
                                      `A senha estava certa, mas o banco de dados recusou a exclusão: ${resultado.erro || 'motivo não informado'}. ` +
                                      `Nada foi removido — "${teacher.name}" continua com acesso normal.`
                                    );
                                    return;
                                  }
                                  if (editingTeacherId === teacher.id) {
                                    setEditingTeacherId(null);
                                  }
                                } finally {
                                  setConfirmandoExclusaoProfessorDe(null);
                                  setConfirmDeleteTeacherId(null);
                                }
                              } else {
                                setConfirmDeleteTeacherId(teacher.id);
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-all disabled:opacity-40 ${
                              confirmDeleteTeacherId === teacher.id
                                ? 'bg-red-600 text-white animate-pulse text-[10px] font-extrabold px-2 py-1'
                                : 'text-slate-400 hover:text-red-500 hover:bg-slate-150/50 dark:hover:bg-slate-800'
                            }`}
                            title={confirmDeleteTeacherId === teacher.id ? 'Confirmar Exclusão?' : 'Excluir Professor'}
                          >
                            {confirmandoExclusaoProfessorDe === teacher.id ? (
                              <span>Conferindo...</span>
                            ) : confirmDeleteTeacherId === teacher.id ? (
                              <span>Confirmar?</span>
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                          )}
                          {/* GERAR ACESSO — aparece quando o professor não
                              tem login. Recria a conta ligada à MESMA
                              ficha (mesmos diários, sem perder nada). */}
                          {currentUser?.role === UserRole.ADMIN && semLogin && (
                          <button
                            type="button"
                            disabled={gerandoAcessoDe === teacher.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              gerarAcessoParaFicha({ id: teacher.id, name: teacher.name, username: teacher.username, role: UserRole.TEACHER });
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-40"
                            title="Gerar um novo acesso de login para este professor, mantendo os diários que já tem"
                          >
                            {gerandoAcessoDe === teacher.id ? 'Gerando...' : 'Gerar Acesso'}
                          </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Assignment Controls */}
              <div className="lg:col-span-7 bg-slate-50/50 dark:bg-slate-850/30 border border-slate-150 dark:border-slate-800/80 p-5 rounded-xl space-y-4">
                {editingTeacherId ? (
                  (() => {
                    const teacher = users.find(u => u.id === editingTeacherId);
                    if (!teacher) return null;
                    const assignedList = teacher.assignedJournals || [];

                    // Filter classes for the selected Course and optionally by academic period
                    const filteredClasses = classes.filter(c => {
                      const courseMatch = c.courseId === selectedCourseIdFilter;
                      if (!courseMatch) return false;
                      if (filterJournalsByPeriod) {
                        const [yearStr, semStr] = currentPeriod.split('/');
                        const currentYear = parseInt(yearStr) || 2026;
                        const currentSemester = parseInt(semStr) || 1;
                        return c.year === currentYear && c.semester === currentSemester;
                      }
                      return true;
                    });

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800">
                          <div>
                            <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Configurando Acesso para:</p>
                            <h5 className="font-extrabold text-xs text-slate-800 dark:text-white mt-0.5">{teacher.name}</h5>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const allJournals: { classId: string; subjectId: string }[] = [];
                                let collisionOccurred = false;
                                classes.forEach(cls => {
                                  const classSubs = (cls.isDependency && cls.dependencySubjectId ? subjects.filter(s => s.id === cls.dependencySubjectId) : subjects.filter(s => s.courseId === cls.courseId && s.module === cls.module));
                                  classSubs.forEach(sub => {
                                    const otherTeacher = users.find(u => 
                                      u.role === UserRole.TEACHER && 
                                      u.id !== teacher.id && 
                                      u.assignedJournals?.some(j => j.classId === cls.id && j.subjectId === sub.id)
                                    );
                                    if (!otherTeacher) {
                                      allJournals.push({ classId: cls.id, subjectId: sub.id });
                                    } else {
                                      collisionOccurred = true;
                                    }
                                  });
                                });
                                updateUser(teacher.id, { assignedJournals: allJournals });
                                if (collisionOccurred) {
                                  setJournalError("Algumas disciplinas não puderam ser atribuídas pois já possuem professor cadastrado.");
                                } else {
                                  setJournalError(null);
                                }
                              }}
                              className="px-2 py-1 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-[10px] font-extrabold text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 transition-all cursor-pointer"
                            >
                              Liberar Tudo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateUser(teacher.id, { assignedJournals: [] });
                                setJournalError(null);
                              }}
                              className="px-2 py-1 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-[10px] font-extrabold text-red-700 dark:text-red-300 rounded hover:bg-red-100 transition-all cursor-pointer"
                            >
                              Limpar Tudo
                            </button>
                          </div>
                        </div>

                        {journalError && (
                          <div className="p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-xs rounded-xl flex items-center justify-between font-bold">
                            <span>⚠️ {journalError}</span>
                            <button 
                              type="button" 
                              onClick={() => setJournalError(null)} 
                              className="text-[10px] uppercase font-black hover:underline"
                            >
                              Fechar
                            </button>
                          </div>
                        )}

                        {/* Filter by Course and Period */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtrar por Curso</p>
                            <label className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-750/50 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none transition-all">
                              <input
                                type="checkbox"
                                checked={filterJournalsByPeriod}
                                onChange={(e) => setFilterJournalsByPeriod(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
                              />
                              <span>Filtrar período ativo ({currentPeriod})</span>
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {courses.map(co => (
                              <button
                                key={co.id}
                                type="button"
                                onClick={() => setSelectedCourseIdFilter(co.id)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                  selectedCourseIdFilter === co.id
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                                }`}
                              >
                                {co.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Class sections with checkboxes */}
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                          {filteredClasses.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-6">Nenhuma turma para este filtro.</p>
                          ) : (
                            filteredClasses.map(cls => {
                              const classSubs = (cls.isDependency && cls.dependencySubjectId ? subjects.filter(s => s.id === cls.dependencySubjectId) : subjects.filter(s => s.courseId === cls.courseId && s.module === cls.module));
                              return (
                                <div key={cls.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h6 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                                      <span>{cls.name}</span>
                                      <span className="px-1.5 py-0.5 text-[9px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded font-bold">
                                        Período {cls.year}/{cls.semester}
                                      </span>
                                      {cls.code && (
                                        <span className="px-1.5 py-0.5 text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded font-mono font-bold">
                                          {cls.code}
                                        </span>
                                      )}
                                    </h6>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const otherAssigned = assignedList.filter(j => j.classId !== cls.id);
                                        const isAllAssignedOfThisClass = classSubs.every(s => assignedList.some(j => j.classId === cls.id && j.subjectId === s.id));
                                        
                                        let updated;
                                        if (isAllAssignedOfThisClass) {
                                          updated = otherAssigned;
                                          setJournalError(null);
                                        } else {
                                          let collisionOccurred = false;
                                          const availableSubs = classSubs.filter(sub => {
                                            const otherTeacher = users.find(u => 
                                              u.role === UserRole.TEACHER && 
                                              u.id !== teacher.id && 
                                              u.assignedJournals?.some(j => j.classId === cls.id && j.subjectId === sub.id)
                                            );
                                            if (otherTeacher) {
                                              collisionOccurred = true;
                                              return false;
                                            }
                                            return true;
                                          });
                                          const added = availableSubs.map(s => ({ classId: cls.id, subjectId: s.id }));
                                          updated = [...otherAssigned, ...added];
                                          if (collisionOccurred) {
                                            setJournalError("Algumas disciplinas já possuem professor e não puderam ser adicionadas.");
                                          } else {
                                            setJournalError(null);
                                          }
                                        }
                                        updateUser(teacher.id, { assignedJournals: updated });
                                      }}
                                      className="text-[9px] font-extrabold text-blue-600 hover:underline"
                                    >
                                      Inverter Turma
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-slate-50 dark:border-slate-800">
                                    {classSubs.map(sub => {
                                      const isChecked = assignedList.some(j => j.classId === cls.id && j.subjectId === sub.id);
                                      const otherTeacher = users.find(u => 
                                        u.role === UserRole.TEACHER && 
                                        u.id !== teacher.id && 
                                        u.assignedJournals?.some(j => j.classId === cls.id && j.subjectId === sub.id)
                                      );
                                      return (
                                        <label
                                          key={sub.id}
                                          className={`flex items-start gap-2 p-1.5 rounded-lg border text-[10px] font-medium transition-all ${
                                            otherTeacher
                                              ? 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-600 opacity-90'
                                              : isChecked 
                                                ? 'bg-blue-50/40 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/40 text-blue-850 dark:text-blue-300 cursor-pointer' 
                                                : 'bg-slate-50/30 dark:bg-slate-850/10 border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 cursor-pointer'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            disabled={!!otherTeacher}
                                            onChange={() => toggleJournalAccess(teacher.id, cls.id, sub.id)}
                                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-3 w-3 disabled:opacity-50"
                                          />
                                          <div className="flex flex-col min-w-0 flex-1">
                                            <span className="leading-tight truncate" title={sub.name}>{sub.name}</span>
                                            {otherTeacher && (
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 truncate">
                                                  Prof. {otherTeacher.name}
                                                </span>
                                                {/* TROCAR O PROFESSOR DE UM DIÁRIO QUE JÁ TEM LANÇAMENTOS.
                                                    Antes, o único jeito era ir na ficha do professor antigo,
                                                    tirar o acesso dele, voltar aqui e marcar para o novo —
                                                    dois passos, fácil de esquecer o primeiro. Notas e faltas
                                                    são gravadas por turma+disciplina, não por professor (o
                                                    campo professor não existe na nota), então essa troca
                                                    nunca apaga nem move o que já foi lançado. */}
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    pedirConfirmacao(
                                                      'Transferir este diário?',
                                                      `"${sub.name}" em "${cls.name}" está hoje com o(a) professor(a) ${otherTeacher.name}.\n\n` +
                                                      `Transferir o acesso para ${teacher.name}?\n\n` +
                                                      `Notas e frequências já lançadas NÃO são apagadas nem alteradas — elas ` +
                                                      `pertencem à turma e à disciplina, não ao professor, e continuam exatamente ` +
                                                      `como estão. Só muda quem tem permissão de lançar dali para frente.`,
                                                      () => {
                                                        updateUser(otherTeacher.id, {
                                                          assignedJournals: (otherTeacher.assignedJournals || []).filter(
                                                            j => !(j.classId === cls.id && j.subjectId === sub.id)
                                                          )
                                                        });
                                                        updateUser(teacher.id, {
                                                          assignedJournals: [...assignedList, { classId: cls.id, subjectId: sub.id }]
                                                        });
                                                        setJournalError(null);
                                                      }
                                                    );
                                                  }}
                                                  className="text-[8px] font-extrabold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer shrink-0"
                                                  title={`Transferir este diário de ${otherTeacher.name} para ${teacher.name}, sem perder notas ou faltas já lançadas`}
                                                >
                                                  Transferir p/ {teacher.name.split(' ')[0]}
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                    <Shield className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs font-extrabold text-slate-600 dark:text-slate-400">Nenhum Docente Selecionado</p>
                    <p className="text-[10px] text-slate-400 max-w-[240px]">Clique em um professor na lista à esquerda para carregar, visualizar e configurar seus acessos.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TRANSFERÊNCIA DE ALUNO */}
          <div className="md:col-span-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <RefreshCw className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              <h4 className="font-extrabold text-slate-800 dark:text-white">Transferência de Aluno</h4>
            </div>

            {transferSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs flex items-center justify-between border border-emerald-150">
                <span>⚡ Transferência realizada com sucesso na nuvem!</span>
                <button type="button" onClick={() => setTransferSuccess(false)} className="text-[10px] font-extrabold hover:underline">Fechar</button>
              </div>
            )}

            {transferErrorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 rounded-xl text-xs flex items-center justify-between border border-red-150">
                <span>⚠️ Não foi possível gravar a transferência: {transferErrorMsg}</span>
                <button type="button" onClick={() => setTransferErrorMsg(null)} className="text-[10px] font-extrabold hover:underline">Fechar</button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Pesquisar Aluno</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Digite o nome do aluno para buscar..."
                    value={transferSearch}
                    onChange={(e) => setTransferSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:bg-white rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {transferSearch && (
                <div className="border border-slate-200 dark:border-slate-750 rounded-xl max-h-[140px] overflow-y-auto bg-slate-50 dark:bg-slate-850 p-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {users
                    .filter(u => u.role === UserRole.STUDENT && (u.name ?? '').toLowerCase().includes(transferSearch.toLowerCase()))
                    .slice(0, 5)
                    .map(std => {
                      const currentClass = classes.find(c => c.id === std.classId);
                      return (
                        <button
                          key={std.id}
                          type="button"
                          onClick={() => {
                            setTransferStudentId(std.id);
                            setTransferSearch(std.name);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex justify-between items-center ${
                            transferStudentId === std.id ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="font-bold">{std.name}</span>
                          <span className="text-[10px] text-slate-400">{currentClass?.name || 'Sem turma'}</span>
                        </button>
                      );
                    })}
                  {users.filter(u => u.role === UserRole.STUDENT && (u.name ?? '').toLowerCase().includes(transferSearch.toLowerCase())).length === 0 && (
                    <p className="text-[10px] text-slate-400 italic text-center py-2">Nenhum aluno encontrado.</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Selecionar Nova Turma / Curso Destino</label>
                <select
                  value={transferClassId}
                  onChange={(e) => setTransferClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                >
                  <option value="" disabled>Selecione a turma de destino...</option>
                  {classes
                    .filter(cl => {
                      const [yearStr, semStr] = currentPeriod.split('/');
                      return cl.year === parseInt(yearStr, 10) && cl.semester === parseInt(semStr, 10);
                    })
                    .map(cl => {
                      const co = courses.find(course => course.id === cl.courseId);
                      return (
                        <option key={cl.id} value={cl.id}>
                          {cl.name} ({co?.name || 'Técnico'})
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/40 text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed space-y-1">
                <p>⚠️ <strong>Processamento Automático:</strong></p>
                <ul className="list-disc pl-3.5 space-y-0.5">
                  <li>Remove o aluno da turma antiga e insere na nova;</li>
                  <li>Matricula o aluno em todas as disciplinas da nova turma;</li>
                  <li>Migra notas e frequência de disciplinas com o mesmo código;</li>
                  <li>Se a mudança troca de CURSO (ex.: presencial → EAD), a turma antiga só é apagada quando estiver vazia (nenhuma nota real lançada) — nota de verdade já lançada nunca é apagada, fica preservada como histórico.</li>
                </ul>
              </div>

              <button
                type="button"
                disabled={!transferStudentId || !transferClassId || transferLoading}
                onClick={async () => {
                  setTransferErrorMsg(null);
                  setTransferLoading(true);
                  const resultado = await transferStudent(transferStudentId, transferClassId);
                  setTransferLoading(false);
                  if (resultado.ok) {
                    setTransferSuccess(true);
                    setTransferStudentId('');
                    setTransferClassId('');
                    setTransferSearch('');
                  } else {
                    setTransferErrorMsg(resultado.erro || 'Erro desconhecido.');
                  }
                }}
                className={`w-full py-2 text-xs font-bold rounded-xl transition-all uppercase tracking-wider ${
                  transferStudentId && transferClassId && !transferLoading
                    ? 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {transferLoading ? 'Gravando no banco...' : 'Confirmar Transferência'}
              </button>
            </div>
          </div>

          {/* CONFIGURAÇÃO DE DATAS DE EMISSÃO DE DECLARAÇÃO */}
          <div className="md:col-span-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Calendar className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              <h4 className="font-extrabold text-slate-800 dark:text-white">Emissão de Declarações (Datas)</h4>
            </div>

            {configSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs flex items-center justify-between border border-emerald-150">
                <span>⚡ Configurações salvas e publicadas na nuvem!</span>
                <button type="button" onClick={() => setConfigSuccess(false)} className="text-[10px] font-extrabold hover:underline">Fechar</button>
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              updateDeclarationConfig('escolaridade', { startDate: escStart, endDate: escEnd });
              updateDeclarationConfig('ctransp', { startDate: ctrStart, endDate: ctrEnd });
              setConfigSuccess(true);
            }} className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Declaração de Escolaridade</p>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data Início</label>
                    <input
                      type="date"
                      required
                      value={escStart}
                      onChange={(e) => setEscStart(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:bg-white rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data Limite</label>
                    <input
                      type="date"
                      required
                      value={escEnd}
                      onChange={(e) => setEscEnd(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:bg-white rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Declaração de SETRANSP Passe</p>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data Início</label>
                    <input
                      type="date"
                      required
                      value={ctrStart}
                      onChange={(e) => setCtrStart(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:bg-white rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data Limite</label>
                    <input
                      type="date"
                      required
                      value={ctrEnd}
                      onChange={(e) => setCtrEnd(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:bg-white rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow shadow-blue-600/10 transition-all cursor-pointer uppercase tracking-wider"
              >
                Salvar Configurações
              </button>
            </form>
          </div>

          {/* CONTROLE DE DOCUMENTOS PENDENTES */}
          <div className="md:col-span-12 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <FileText className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                <h4 className="font-extrabold text-slate-800 dark:text-white">Controle de Documentos Obrigatórios dos Alunos</h4>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar aluno..."
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white focus:bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    <th className="px-4 py-2.5">Nome do Aluno</th>
                    <th className="px-4 py-2.5">Matrícula</th>
                    <th className="px-4 py-2.5">Turma</th>
                    <th className="px-4 py-2.5">Status Geral</th>
                    <th className="px-4 py-2.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {users
                    .filter(u => u.role === UserRole.STUDENT && (u.name ?? '').toLowerCase().includes(docSearchQuery.toLowerCase()))
                    .map(std => {
                      const cl = classes.find(c => c.id === std.classId);
                      const targetCourse = courses.find(co => co.id === cl?.courseId);
                      const requiredDocs = getRequiredDocsForStudent(targetCourse?.name);
                      const docs = studentDocuments.filter(d => d.studentId === std.id);
                      const total = requiredDocs.length;
                      const delivered = docs.filter(d => d.status === 'ENTREGUE').length;
                      const sent = docs.filter(d => d.status === 'ENVIADO').length;
                      
                      let docLabel = `PENDENTE (${delivered}/${total})`;
                      let docBadgeColor = 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200';
                      
                      if (delivered === total) {
                        docLabel = 'CONCLUÍDO';
                        docBadgeColor = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200';
                      } else if (sent > 0) {
                        docLabel = `PENDENTE (${delivered}/${total}) - ENVIADO`;
                        docBadgeColor = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200';
                      }

                      return (
                        <tr key={std.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/25">
                          <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{std.name}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{std.username}</td>
                          <td className="px-4 py-3 text-slate-500">{cl?.name || 'Sem turma'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full border ${docBadgeColor}`}>
                              {docLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedDocStudentId(std.id)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-lg transition-all"
                            >
                              Analisar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )}

      {/* Tab: IMPORTADOR DE PLANILHAS */}
      {activeTab === 'imp' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <SpreadsheetImporter />
          <HistoricalDataImporter />
        </motion.div>
      )}

      {/* Tab: MENSAGENS E AVISOS */}
      {activeTab === 'msg' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-3xl shadow-sm max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-1.5 mb-4 text-slate-800 dark:text-white">
            <BellRing className="h-5 w-5 text-blue-700 dark:text-blue-400" />
            <h4 className="font-bold">Comunicados e Avisos Coletivos</h4>
          </div>

          {messageSuccess && (
            <div className="p-4 mb-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs sm:text-sm flex items-center gap-2 border border-emerald-150">
              <CheckCircle2 className="h-4 w-4" />
              <span>{messageSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="space-y-4">
            {/* ENVIO PARA VÁRIAS PESSOAS
                Antes só dava para escolher UM destinatário por vez. Avisar cinco
                alunos exigia escrever a mesma mensagem cinco vezes. Agora a
                escolha é por marcação, e a mensagem é enviada a cada um
                individualmente (cada pessoa recebe a sua, não uma cópia
                compartilhada). */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Para quem enviar
              </label>

              <div className="flex flex-wrap gap-2 mb-2">
                <button type="button" onClick={() => setDestinatarios(['ALL_TEACHERS'])}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${destinatarios.includes('ALL_TEACHERS') ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                  Todos os Professores
                </button>
                <button type="button"
                  onClick={() => setDestinatarios(users.filter(u => u.role === UserRole.STUDENT).map(u => u.id))}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                  Marcar todos os alunos
                </button>
                <button type="button" onClick={() => setDestinatarios([])}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700">
                  Limpar
                </button>
                <span className="px-3 py-1.5 text-[11px] font-bold text-slate-500">
                  {destinatarios.includes('ALL_TEACHERS')
                    ? 'todos os professores'
                    : `${destinatarios.length} selecionado(s)`}
                </span>
              </div>

              <input
                type="text"
                value={buscaDestinatario}
                onChange={(e) => setBuscaDestinatario(e.target.value)}
                placeholder="Filtrar por nome ou matrícula..."
                className="w-full px-3 py-2 mb-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-800 dark:text-white"
              />

              <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                {users
                  .filter(u => u.role !== UserRole.ADMIN)
                  .filter(u => {
                    const t = buscaDestinatario.trim().toLowerCase();
                    if (!t) return true;
                    return (u.name || '').toLowerCase().includes(t) || (u.enrollment || '').includes(t);
                  })
                  .slice(0, 300)
                  .map(u => (
                    <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <input
                        type="checkbox"
                        checked={destinatarios.includes(u.id)}
                        onChange={() => setDestinatarios(prev =>
                          prev.includes(u.id)
                            ? prev.filter(x => x !== u.id)
                            : [...prev.filter(x => x !== 'ALL_TEACHERS'), u.id]
                        )}
                        className="h-3.5 w-3.5 rounded"
                      />
                      <span className="text-slate-700 dark:text-slate-300">
                        {u.role === UserRole.TEACHER ? 'Professor' : 'Aluno'}: {u.name}
                        {u.enrollment ? ` (${u.enrollment})` : ''}
                      </span>
                    </label>
                  ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Mensagem Acadêmica</label>
              <textarea
                required={!attachmentUrl}
                rows={4}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder={attachmentUrl ? "Adicione um comentário opcional para acompanhar o arquivo/áudio..." : "Ex: Caros docentes, os prazos de lançamento para as avaliações S2 do Técnico em Radiologia e Instrumentação Cirúrgica foram estendidos..."}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white rounded-xl outline-none text-xs text-slate-800 dark:text-white placeholder-slate-400"
              ></textarea>
            </div>

            {/* Attachment and Audio Recording Actions */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
              <span className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Anexar Mídia ou Gravar Áudio
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {/* Record Audio Button */}
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={!!attachmentUrl}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400 disabled:opacity-50 text-xs font-black rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Mic className="h-4 w-4" /> Gravar Áudio
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/30">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
                    <span className="text-rose-700 dark:text-rose-400 text-xs font-black font-mono">
                      GRAVANDO: {formatDuration(recordingDuration)}
                    </span>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all"
                      title="Salvar Gravação"
                    >
                      <Square className="h-3 w-3 fill-white" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="p-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-all"
                      title="Cancelar Gravação"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Upload File Button */}
                <label className={`px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all ${attachmentUrl || isRecording ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Paperclip className="h-4 w-4" /> Enviar PDF / Imagem / Áudio
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/jpg,audio/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={!!attachmentUrl || isRecording}
                  />
                </label>
              </div>

              {/* Attachment Preview */}
              {attachmentUrl && (
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                      {attachmentType === 'pdf' ? (
                        <FileText className="h-4 w-4" />
                      ) : attachmentType === 'image' ? (
                        <ImageIcon className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate max-w-[250px] sm:max-w-[400px]">
                        {attachmentName}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {attachmentType === 'pdf' ? 'Documento PDF' : attachmentType === 'image' ? 'Imagem JPG/PNG' : 'Áudio Gravado/Enviado'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {attachmentType === 'audio' && (
                      <audio src={attachmentUrl} controls className="h-7 w-[160px] sm:w-[200px]" />
                    )}
                    {attachmentType === 'image' && (
                      <img src={attachmentUrl} alt="Anexo" referrerPolicy="no-referrer" className="h-8 w-8 rounded-lg object-cover border border-slate-200" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentUrl(null);
                        setAttachmentType(null);
                        setAttachmentName(null);
                      }}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-100 dark:border-rose-900/20 cursor-pointer"
                      title="Remover anexo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              id="send-message-submit-btn"
              disabled={isRecording}
              className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:dark:bg-slate-800 text-white disabled:text-slate-400 text-xs font-extrabold rounded-xl shadow shadow-blue-600/15 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="h-4 w-4" /> Transmitir Comunicado
            </button>
          </form>

          {/* Histórico de Comunicados Transmitidos */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 dark:text-white">
              <History className="h-4 w-4 text-blue-700 dark:text-blue-400" />
              <h5 className="font-bold text-sm">Histórico de Comunicados Transmitidos</h5>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {messages.length > 0 ? (
                messages.map(msg => {
                  const recipientUser = users.find(u => u.id === msg.recipientId);
                  const recipientName = msg.recipientId === 'ALL_TEACHERS' 
                    ? 'Todos os Professores (Global)' 
                    : recipientUser 
                      ? `${recipientUser.role === UserRole.TEACHER ? 'Professor' : 'Aluno'}: ${recipientUser.name} (${recipientUser.enrollment || 'Sem matrícula'})` 
                      : msg.recipientId;

                  return (
                    <div key={msg.id} className="p-3.5 bg-slate-50/50 dark:bg-slate-850/30 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl space-y-2.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Destinatário:</span>
                          <p className="font-black text-slate-850 dark:text-slate-200">{recipientName}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-2 py-0.5 rounded-lg font-mono">
                            {new Date(msg.date).toLocaleDateString('pt-BR')} {new Date(msg.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Excluir este comunicado? Ele vai sumir do painel de todos os destinatários.')) {
                                deleteMessage(msg.id);
                              }
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer shrink-0"
                            title="Excluir Comunicado"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      {msg.content && (
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 leading-relaxed text-[11px] font-medium whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      )}

                      {msg.attachmentUrl && (
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                              {msg.attachmentType === 'pdf' ? (
                                <FileText className="h-3.5 w-3.5" />
                              ) : msg.attachmentType === 'image' ? (
                                <ImageIcon className="h-3.5 w-3.5" />
                              ) : (
                                <Mic className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <span className="font-extrabold text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[180px] sm:max-w-[280px]">
                              {msg.attachmentName}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 justify-end w-full sm:w-auto">
                            {msg.attachmentType === 'audio' && (
                              <audio src={msg.attachmentUrl} controls className="h-7 w-[160px] sm:w-[180px]" />
                            )}
                            {msg.attachmentType === 'image' && (
                              <img src={msg.attachmentUrl} alt="Preview" referrerPolicy="no-referrer" className="h-8 w-8 rounded object-cover border border-slate-200" />
                            )}
                            <a
                              href={msg.attachmentUrl}
                              download={msg.attachmentName || 'arquivo'}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-lg flex items-center gap-1 cursor-pointer transition-all select-none"
                            >
                              <Download className="h-3 w-3" /> Baixar
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center italic">Nenhum comunicado transmitido ainda.</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab: BACKUP E SEGURANÇA (Central de Defesa e Redundância) */}
      {activeTab === 'sec' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {secStatusMsg && (
            <div className={`p-4 rounded-xl text-xs sm:text-sm flex items-center gap-2 border ${
              secStatusMsg.success 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-emerald-150 dark:border-emerald-900/30' 
                : 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 border-red-150 dark:border-red-900/30'
            }`}>
              {secStatusMsg.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              <span>{secStatusMsg.text}</span>
            </div>
          )}

          {/* Indicators row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
            {/* Shield Check Indicator */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-start gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Firewall Ativo</h4>
                <p className="text-sm font-black text-slate-900 dark:text-white">Central de Defesa</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping inline-block"></span>
                  Proteção Integrada Ativa
                </span>
              </div>
            </div>

            {/* Cloud backup Sync Status */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-blue-600 dark:text-blue-400">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nuvem Sincronizada</h4>
                  <p className="text-sm font-black text-slate-900 dark:text-white">Backup Automático</p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                    {lastCloudBackupTime 
                      ? `Último: ${new Date(lastCloudBackupTime).toLocaleTimeString('pt-BR')}` 
                      : 'Aguardando primeiro ciclo (45s)'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloudSyncTrigger}
                disabled={syncingCloud}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-300 transition-all border border-slate-100 dark:border-slate-850 flex items-center justify-center disabled:opacity-50"
                title="Sincronizar Nuvem Agora"
              >
                <RefreshCw className={`h-4 w-4 ${syncingCloud ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Lockout map and quick reset to easily test security block rules */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-start gap-4 justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl text-amber-600 dark:text-amber-400">
                  <Lock className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Rate Limiting</h4>
                  <p className="text-sm font-black text-slate-900 dark:text-white">Brute-Force Guard</p>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold">
                    {Object.values(failedAttemptsMap || {}).filter((a: any) => a.count > 0).length} Usuário(s) Monitorado(s)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetFailedAttempts('admin');
                  resetFailedAttempts('administracao@lynxedu.com.br');
                  setSecStatusMsg({ success: true, text: 'Contadores de segurança redefinidos com sucesso para testes de login!' });
                  setTimeout(() => setSecStatusMsg(null), 3000);
                }}
                className="px-2.5 py-1 text-[10px] font-black bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 border border-amber-200/50 text-amber-700 dark:text-amber-400 rounded-lg transition-all"
                title="Redefinir contadores para testar login livremente"
              >
                Limpar Bloqueios
              </button>
            </div>
          </div>

          {/* Interactive Backup and Security Logs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Column left: Import/Export panel */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Box 0: Zerar Alunos do Sistema — oculto a pedido da direção (risco de exclusão
                  em massa acidental). A função wipeAllStudents() continua existindo no código,
                  só não tem mais botão na tela. */}
              {false && (
              <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 select-none">
                  <Trash2 className="h-5 w-5 text-rose-600" />
                  <h4 className="font-bold text-sm">Zerar Alunos do Sistema</h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Exclui todos os alunos cadastrados e remove em cascata todas as suas notas, chamadas/frequências, faltas diretas e documentos associados.
                </p>

                <button
                  type="button"
                  id="wipe-all-students-btn"
                  onClick={() => {
                    if (window.confirm('TEM CERTEZA? Esta ação zerará permanentemente TODOS os alunos e seus dados acadêmicos!')) {
                      wipeAllStudents();
                      alert('Todos os alunos e seus registros foram zerados do sistema com sucesso.');
                    }
                  }}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" /> Zerar Todos os Alunos
                </button>
              </div>
              )}

              {/* Box 1: Local backup toolbelt */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800 dark:text-white select-none">
                  <Database className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                  <h4 className="font-bold text-sm">Backup Local de Segurança</h4>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                  Gere um arquivo estruturado criptografado contendo todos os dados escolares atuais. Guarde o arquivo como salvaguarda local offline.
                </p>

                <button
                  type="button"
                  id="local-backup-export-btn"
                  onClick={triggerLocalBackup}
                  className="w-full py-2.5 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Exportar Backup (JSON)
                </button>
              </div>

              {/* Box 2: Drag and drop import zone */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800 dark:text-white select-none">
                  <Upload className="h-5 w-5 text-indigo-700 dark:text-indigo-400" />
                  <h4 className="font-bold text-sm">Restaurar do Arquivo Local</h4>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                  Arraste ou selecione um backup homologado para restaurar o portal ao estado salvo. O sistema validará a assinatura de integridade antes da importação.
                </p>

                {/* Drag and Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' 
                      : 'border-slate-200 dark:border-slate-850 hover:border-slate-350 dark:hover:border-slate-700'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileRestoreChange}
                    accept=".json"
                    className="hidden"
                  />
                  <Database className="h-8 w-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
                    Arraste o arquivo .json aqui ou clique para selecionar
                  </p>
                  <span className="text-[9px] text-slate-400 block mt-1">
                    (Válido apenas para backups gerados neste portal)
                  </span>
                </div>
              </div>

              {/* Box 3: Emergency Cloud Restore */}
              <div className="bg-slate-950 dark:bg-slate-900 border border-slate-800 dark:border-slate-850 text-white p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 select-none">
                  <Server className="h-5 w-5 text-emerald-400" />
                  <h4 className="font-bold text-sm text-white">Restauração da Nuvem (AWS-Replica)</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Em caso de falha de dispositivo, você pode restaurar o banco de dados diretamente a partir do último nó replicado em tempo real em nossa infraestrutura de nuvem.
                </p>
                <button
                  type="button"
                  onClick={handleCloudRestoreTrigger}
                  disabled={restoringCloud || syncingCloud}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${restoringCloud ? 'animate-spin' : ''}`} /> {restoringCloud ? 'Sincronizando...' : 'Restaurar Última Cópia da Nuvem'}
                </button>
              </div>

              {/* Box 4: Backups agendados e exportação (Supabase Storage) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800 dark:text-white select-none">
                  <UploadCloud className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                  <h4 className="font-bold text-sm">Backup em Nuvem (Supabase Storage)</h4>
                </div>
                
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                  Configure agendamento automático para exportar snapshots periódicos do portal para a nuvem ou realize exportações síncronas manuais.
                </p>

                {/* Schedule Configuration Form */}
                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Automático Ativo</label>
                    <button
                      type="button"
                      onClick={() => updateBackupSchedule({ enabled: !backupSchedule.enabled })}
                      className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        backupSchedule.enabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          backupSchedule.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Frequência</label>
                      <select
                        value={backupSchedule.frequency}
                        onChange={(e) => updateBackupSchedule({ frequency: e.target.value as any })}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-white outline-none"
                      >
                        <option value="manual">Manual / Desativado</option>
                        <option value="daily">Diário</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Horário de Pico</label>
                      <input
                        type="time"
                        value={backupSchedule.hour}
                        onChange={(e) => updateBackupSchedule({ hour: e.target.value })}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-white outline-none"
                      />
                    </div>
                  </div>

                  {backupSchedule.enabled && backupSchedule.frequency !== 'manual' && backupSchedule.nextBackupTime && (
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      Próximo ciclo: {new Date(backupSchedule.nextBackupTime).toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>

                {/* Manual Trigger Button */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setExportingStorage(true);
                      const url = await triggerStorageBackup();
                      setExportingStorage(false);
                      if (url) {
                        setStorageSuccessMsg('Cópia de segurança exportada com sucesso!');
                        setTimeout(() => setStorageSuccessMsg(''), 3000);
                      } else {
                        setStorageSuccessMsg('Erro ao tentar salvar backup.');
                        setTimeout(() => setStorageSuccessMsg(''), 3000);
                      }
                    }}
                    disabled={exportingStorage}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <UploadCloud className={`h-3.5 w-3.5 ${exportingStorage ? 'animate-spin' : ''}`} />
                    {exportingStorage ? 'Exportando...' : 'Exportar Snap Agora'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      setRefreshingStorageList(true);
                      await fetchStorageBackups();
                      setRefreshingStorageList(false);
                    }}
                    disabled={refreshingStorageList}
                    className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-all flex items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer"
                    title="Atualizar lista de backups"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshingStorageList ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {storageSuccessMsg && (
                  <p className="text-[10px] text-center font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">{storageSuccessMsg}</p>
                )}

                {/* Stored Snapshots List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Histórico no Storage ({storageBackups.length})</h5>
                  </div>

                  <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[220px] overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
                    {isLoadingStorageBackups ? (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-blue-500" />
                        Carregando backups do Storage...
                      </div>
                    ) : storageBackups.length > 0 ? (
                      storageBackups.map((file) => (
                        <div key={file.name} className="p-2.5 text-[11px] flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors">
                          <div className="space-y-0.5 truncate max-w-[160px]">
                            <p className="font-semibold text-slate-700 dark:text-slate-300 truncate font-mono text-[10px]" title={file.name}>
                              {file.name}
                            </p>
                            <span className="text-[9px] text-slate-400 block">
                              {(file.size / 1024).toFixed(1)} KB • {new Date(file.timeCreated).toLocaleDateString('pt-BR')} {new Date(file.timeCreated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <a
                              href={file.url}
                              download={file.name}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                              title="Download JSON"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Deseja restaurar o portal inteiramente a partir do snapshot: ${file.name}?`)) {
                                  try {
                                    setRestoringCloud(true);
                                    const response = await fetch(file.url);
                                    const text = await response.text();
                                    const result = restoreFromBackup(text);
                                    if (result.success) {
                                      alert('Restauração do backup em nuvem concluída com sucesso!');
                                    } else {
                                      alert(`Falha na restauração: ${result.message}`);
                                    }
                                  } catch (err) {
                                    alert(`Erro de conexão ao restaurar do Storage: ${(err as Error).message}`);
                                  } finally {
                                    setRestoringCloud(false);
                                  }
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                              title="Restaurar Snapshot"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Tem certeza que deseja excluir permanentemente o backup ${file.name} da nuvem?`)) {
                                  await deleteStorageBackup(file.name);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                              title="Excluir Backup"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-400 text-xs italic">
                        Nenhum backup encontrado na nuvem.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Column right: Security Audit Logs */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center justify-between select-none">
                <div className="flex items-center gap-2 text-slate-800 dark:text-white">
                  <Shield className="h-5 w-5 text-red-600" />
                  <h4 className="font-bold text-sm">Registro de Auditoria de Segurança (Logs)</h4>
                </div>
                <span className="text-[10px] font-black uppercase bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-md">
                  SIEM Real-Time
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                Logs de auditoria e segurança em conformidade com as diretrizes da LGPD, registrando eventos de acessos, autenticação de diários, bloqueios e backups.
              </p>

              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[480px] overflow-y-auto">
                {securityLogs && securityLogs.length > 0 ? (
                  securityLogs.map((log: any) => (
                    <div key={log.id} className="p-3 text-[11px] flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase mt-0.5 flex-shrink-0 ${
                        log.severity === 'high' 
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400' 
                          : log.severity === 'medium'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                      }`}>
                        {log.eventType}
                      </span>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">{log.details}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                          <span>IP: {log.ipAddress}</span>
                          <span>•</span>
                          <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Nenhum evento registrado nos logs de auditoria.
                  </div>
                )}
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* Tab: BOLETIM DO ALUNO COMPLETO (Busca, Seleção de Sala e Visualização Detalhada) */}
      {activeTab === 'boletins' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <GraduationCap className="h-6 w-6" />
                <h3 className="font-extrabold text-lg">Boletim Escolar Completo</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualize, pesquise e emita boletins individuais ou de turmas inteiras em formato oficial.
              </p>
            </div>
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedBoletimClassId) {
                    setPrintDoc({ type: 'boletim_sala', classId: selectedBoletimClassId });
                  } else {
                    alert('Por favor, selecione uma turma.');
                  }
                }}
                disabled={!selectedBoletimClassId}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/10 transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Imprimir Boletins da Turma
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Filtros & Busca */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Search Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Localizar Aluno (Matrícula ou Nome)</p>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar por Matrícula ou Nome..."
                    value={boletimSearch}
                    onChange={(e) => setBoletimSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white focus:bg-white placeholder-slate-400"
                  />
                </div>

                {/* Instant search results */}
                {boletimSearch.trim() !== '' && (
                  <div className="border border-slate-150 dark:border-slate-800 rounded-xl max-h-[200px] overflow-y-auto bg-slate-50 dark:bg-slate-950 divide-y divide-slate-150 dark:divide-slate-850">
                    {(() => {
                      const matches = users.filter(u => u.role === UserRole.STUDENT && (
                        (u.name ?? '').toLowerCase().includes(boletimSearch.toLowerCase()) || 
                        (u.enrollment && u.enrollment.toLowerCase().includes(boletimSearch.toLowerCase()))
                      ));
                      if (matches.length === 0) {
                        return <p className="p-3 text-[11px] text-slate-400 italic text-center">Nenhum aluno encontrado</p>;
                      }
                      return matches.map(std => {
                        // Find class
                        const stdGrade = grades.find(g => g.studentId === std.id);
                        const stdClass = stdGrade ? classes.find(c => c.id === stdGrade.classId) : null;
                        return (
                          <button
                            key={std.id}
                            type="button"
                            onClick={() => {
                              if (stdClass) {
                                setSelectedBoletimClassId(stdClass.id);
                              }
                              setSelectedBoletimStudentId(std.id);
                              setBoletimSearch(''); // clear search
                            }}
                            className="w-full text-left p-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-xs transition-all flex flex-col gap-0.5"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-200">{std.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Matrícula: {std.enrollment || 'N/A'} {stdClass ? `• Turma: ${stdClass.name}` : ''}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Class & Student Selector Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtro por Turma</p>
                
                {/* Class Select */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Selecione a Turma</label>
                  <select
                    value={selectedBoletimClassId}
                    onChange={(e) => {
                      setSelectedBoletimClassId(e.target.value);
                      setSelectedBoletimStudentId(''); // reset student
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white"
                  >
                    <option value="">Selecione uma Turma...</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name} ({cls.code}) - {cls.year}/{cls.semester}</option>
                    ))}
                  </select>
                </div>

                {/* Student Select */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Selecione o Aluno</label>
                  <select
                    value={selectedBoletimStudentId}
                    onChange={(e) => setSelectedBoletimStudentId(e.target.value)}
                    disabled={!selectedBoletimClassId}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white disabled:opacity-40"
                  >
                    <option value="">Selecione um Aluno...</option>
                    {users
                      .filter(u => u.role === UserRole.STUDENT && (u.classId === selectedBoletimClassId || grades.some(g => g.studentId === u.id && g.classId === selectedBoletimClassId)))
                      .map(std => (
                        <option key={std.id} value={std.id}>{std.name} ({std.enrollment || 'Sem matrícula'})</option>
                      ))}
                  </select>
                </div>

                {/* Interactive list of classroom students */}
                {selectedBoletimClassId && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Alunos da Turma ({users.filter(u => u.role === UserRole.STUDENT && (u.classId === selectedBoletimClassId || grades.some(g => g.studentId === u.id && g.classId === selectedBoletimClassId))).length})
                    </p>
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {users
                        .filter(u => u.role === UserRole.STUDENT && (u.classId === selectedBoletimClassId || grades.some(g => g.studentId === u.id && g.classId === selectedBoletimClassId)))
                        .map(std => {
                          const isSelected = selectedBoletimStudentId === std.id;
                          return (
                            <button
                              key={std.id}
                              type="button"
                              onClick={() => setSelectedBoletimStudentId(std.id)}
                              className={`w-full text-left p-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                                isSelected 
                                  ? 'bg-blue-600 text-white shadow-sm' 
                                  : 'bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="truncate">{std.name}</span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                isSelected 
                                  ? 'bg-blue-700 text-blue-100' 
                                  : 'bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-400'
                              }`}>
                                {std.enrollment || 'N/A'}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Boletim Preview Dashboard */}
            <div className="lg:col-span-8">
              {(() => {
                const student = users.find(u => u.id === selectedBoletimStudentId);
                const sClass = classes.find(c => c.id === selectedBoletimClassId);
                
                if (!student || !sClass) {
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-12 rounded-3xl shadow-sm text-center flex flex-col items-center justify-center h-full min-h-[350px]">
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-full text-blue-600 dark:text-blue-400 mb-4">
                        <GraduationCap className="h-8 w-8" />
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-white">Nenhum Aluno Selecionado</h4>
                      <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                        Escolha uma turma e selecione o aluno ao lado ou use a busca direta por nome ou matrícula para visualizar a Ficha de Aproveitamento Individual.
                      </p>
                    </div>
                  );
                }

                const sCourse = courses.find(co => co.id === sClass.courseId);
                const classSubs = (sClass.isDependency && sClass.dependencySubjectId ? subjects.filter(s => s.id === sClass.dependencySubjectId) : subjects.filter(s => s.courseId === sClass.courseId && s.module === sClass.module));

                // Compute student KPI metrics
                let totalWorkload = 0;
                let studentTotalAbsences = 0;
                let gradeCount = 0;
                let sumGrades = 0;
                let failsCount = 0;

                const subjectsSummary = classSubs.map(sub => {
                  const score = grades.find(g => g.studentId === student.id && g.subjectId === sub.id && g.classId === sClass.id);
                  const absences = getStudentAbsences(student.id, sub.id);
                  
                  totalWorkload += sub.workload;
                  studentTotalAbsences += absences.total;
                  
                  if (score) {
                    gradeCount++;
                    sumGrades += score.pf;
                    if (score.result === 'NÃO APTO' || score.result === 'F. NOTA' || score.result === 'REP. FALTAS') {
                      failsCount++;
                    }
                  }

                  return {
                    subject: sub,
                    score,
                    absences
                  };
                });

                const averageGrade = gradeCount > 0 ? sumGrades / gradeCount : 0;
                const averageFrequency = totalWorkload > 0 ? Math.max(0, ((totalWorkload - studentTotalAbsences) / totalWorkload) * 100) : 100;
                const overallResult = averageFrequency < 75 ? 'RETIDO POR FALTAS' : (failsCount > 0 ? 'PENDENTE/RETIDO' : 'APTO');

                const similarStudents = findSimilarStudents(student.id);

                return (
                  <div className="space-y-4">
                    {similarStudents.map(simStudent => {
                      const simClass = simStudent.classId ? classes.find(c => c.id === simStudent.classId)?.name : '';
                      const simGradesCount = grades.filter(g => g.studentId === simStudent.id).length;
                      return (
                        <div key={simStudent.id} className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs animate-fade-in">
                          <div className="flex gap-2.5 items-start">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
                            <div className="space-y-1">
                              <p className="font-extrabold text-amber-800 dark:text-amber-400">
                                Aluno Duplicado Identificado!
                              </p>
                              <p className="text-slate-600 dark:text-slate-300">
                                Existe outro cadastro com nome correspondente: <strong>{simStudent.name}</strong> 
                                {simClass ? ` (Turma: ${simClass})` : ''} 
                                {simStudent.enrollment ? ` • Matrícula: ${simStudent.enrollment}` : ' • Sem matrícula'} 
                                {` • Registros de notas: ${simGradesCount}`}.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const hasEnrollmentTarget = !!student.enrollment;
                              const hasEnrollmentSim = !!simStudent.enrollment;
                              
                              let principalId = student.id;
                              let duplicateId = simStudent.id;
                              
                              if (!hasEnrollmentTarget && hasEnrollmentSim) {
                                principalId = simStudent.id;
                                duplicateId = student.id;
                              }
                              
                              if (confirm(`Confirmar unificação? Todos os boletins, notas, diários, presenças e documentos de "${simStudent.name}" serão migrados para "${student.name}". O cadastro duplicado será deletado permanentemente.`)) {
                                unifyDuplicateStudents(principalId, [duplicateId]);
                                setSelectedBoletimStudentId(principalId);
                                alert('Registros de alunos unificados com sucesso!');
                              }
                            }}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-[11px] uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer shadow-sm shrink-0 whitespace-nowrap self-start sm:self-center"
                          >
                            Unificar Cadastros
                          </button>
                        </div>
                      );
                    })}

                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden animate-fade-in space-y-6 p-6">
                      {/* Student Info Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block font-mono mb-1">
                          Ficha de Aproveitamento Individual • Período {currentPeriod}
                        </span>
                        <h4 className="font-black text-slate-900 dark:text-white text-lg sm:text-xl leading-none">{student.name}</h4>
                        <p className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold text-slate-500 dark:text-slate-300">Curso:</span> {sCourse?.name || 'N/A'}
                          <span>•</span>
                          <span className="font-semibold text-slate-500 dark:text-slate-300">Turma:</span> {sClass.name}
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-start sm:items-end gap-3 sm:gap-1.5">
                        <div className="text-left sm:text-right">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Matrícula</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{student.enrollment || 'N/A'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPrintDoc({ type: 'boletim', studentId: student.id, classId: sClass.id });
                          }}
                          className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ml-auto cursor-pointer border border-slate-200/40 dark:border-slate-700/40"
                        >
                          <Printer className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Imprimir Boletim
                        </button>
                      </div>
                    </div>

                    {/* KPI Widgets */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
                      {/* Media Geral */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-850/40 border border-slate-150/50 dark:border-slate-800/50 rounded-2xl">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Média Geral</span>
                        <span className="text-xl font-black text-slate-800 dark:text-white font-mono">{averageGrade.toFixed(1)}</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">Pontos acumulados</span>
                      </div>

                      {/* Total Faltas */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-850/40 border border-slate-150/50 dark:border-slate-800/50 rounded-2xl">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Total de Faltas</span>
                        <span className="text-xl font-black text-slate-800 dark:text-white font-mono">{studentTotalAbsences}</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">Aulas não assistidas</span>
                      </div>

                      {/* Frequencia Média */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-850/40 border border-slate-150/50 dark:border-slate-800/50 rounded-2xl">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Frequência</span>
                        <span className={`text-xl font-black font-mono ${averageFrequency < 75 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {averageFrequency.toFixed(1)}%
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">Mínimo exigido: 75%</span>
                      </div>

                      {/* Situação Final */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-850/40 border border-slate-150/50 dark:border-slate-800/50 rounded-2xl">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Situação Geral</span>
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-wider block text-center mt-1.5 ${
                          overallResult === 'APTO' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-400' 
                            : overallResult === 'RETIDO POR FALTAS'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/45 dark:text-red-400 font-extrabold'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/45 dark:text-amber-400'
                        }`}>
                          {overallResult}
                        </span>
                      </div>
                    </div>

                    {/* Grade Matrix Preview Table */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aproveitamento por Disciplina</p>
                      <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-2xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-bold border-b border-slate-150 dark:border-slate-850">
                            <tr>
                              <th className="p-3">Disciplina</th>
                              <th className="p-3 text-center">S1</th>
                              <th className="p-3 text-center">S2</th>
                              <th className="p-3 text-center">AFC</th>
                              <th className="p-3 text-center">PF</th>
                              <th className="p-3 text-center">Faltas</th>
                              <th className="p-3 text-center">Freq.</th>
                              <th className="p-3 text-center">Conceito</th>
                              <th className="p-3 text-center">Resultado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                            {subjectsSummary.map(({ subject, score, absences }) => {
                              const s1Val = score?.s1 ?? 0;
                              const s2Val = score?.s2 ?? 0;
                              const afcVal = score?.afc ?? null;
                              const pfVal = score?.pf ?? 0;
                              const concept = score?.concept ?? 'D';
                              const result = score?.result ?? 'Pendente';

                              return (
                                <tr key={subject.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-all font-medium">
                                  <td className="p-3">
                                    <p className="font-bold text-slate-800 dark:text-slate-200">{subject.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">Carga Horária: {subject.workload}H</p>
                                  </td>
                                  <td className="p-3 text-center font-mono" title={`AV1: ${score?.av1 ?? '-'} | AV2: ${score?.av2 ?? '-'} | AV3: ${score?.av3 ?? '-'} ${score?.recS1 !== null ? `| REC: ${score?.recS1}` : ''}`}>
                                    <span className="cursor-help border-b border-dotted border-slate-400">{s1Val}</span>
                                  </td>
                                  <td className="p-3 text-center font-mono" title={`AV4: ${score?.av4 ?? '-'} | AV5: ${score?.av5 ?? '-'} | AV6: ${score?.av6 ?? '-'} ${score?.recS2 !== null ? `| REC: ${score?.recS2}` : ''}`}>
                                    <span className="cursor-help border-b border-dotted border-slate-400">{s2Val}</span>
                                  </td>
                                  <td className="p-3 text-center font-mono">{afcVal !== null ? afcVal : '-'}</td>
                                  <td className="p-3 text-center font-bold font-mono text-slate-900 dark:text-white">{pfVal}</td>
                                  <td className="p-3 text-center font-mono">{absences.total}</td>
                                  <td className={`p-3 text-center font-bold font-mono ${absences.frequency < 75 ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {absences.frequency.toFixed(0)}%
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black font-mono ${
                                      concept === 'A' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' :
                                      concept === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400' :
                                      concept === 'C' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400' :
                                      'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
                                    }`}>
                                      {concept}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                      result === 'APTO' 
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                        : (result === 'F. NOTA' || result === 'REP. FALTAS') 
                                        ? 'bg-red-50 text-red-750 dark:bg-red-950/45 dark:text-red-400' 
                                        : result === 'NÃO APTO' 
                                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-400'
                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                      {result}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab: ESTÁGIO (Secretaria de Lançamento de Estágios Supervisionados) */}
      {activeTab === 'estagio' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <AdminInternships />
        </motion.div>
      )}

      {/* Tab: HISTÓRICO COMPLETO DO ALUNO */}
      {activeTab === 'historico_completo' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <History className="h-6 w-6" />
                <h3 className="font-extrabold text-lg">Histórico Completo do Aluno</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualize e emita o histórico escolar completo do aluno, contemplando todos os módulos e períodos cursados.
              </p>
            </div>
            {/* Print Action Button */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedHistoricoStudentId) {
                    const stdGrades = grades.filter(g => g.studentId === selectedHistoricoStudentId);
                    const stdClassId = stdGrades[0]?.classId || users.find(u => u.id === selectedHistoricoStudentId)?.classId || classes[0]?.id || '';
                    setPrintDoc({ type: 'historico_completo', studentId: selectedHistoricoStudentId, classId: stdClassId });
                  } else {
                    alert('Por favor, selecione um aluno.');
                  }
                }}
                disabled={!selectedHistoricoStudentId}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-45 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/10 transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Imprimir Histórico Completo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Student Search & Selection */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Search Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Localizar Aluno (Nome ou Matrícula)</p>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar por Nome ou Matrícula..."
                    value={historicoSearch}
                    onChange={(e) => setHistoricoSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white focus:bg-white placeholder-slate-400"
                  />
                </div>

                {/* Instant search results list */}
                {historicoSearch.trim() !== '' && (
                  <div className="border border-slate-150 dark:border-slate-800 rounded-xl max-h-[250px] overflow-y-auto bg-slate-50 dark:bg-slate-950 divide-y divide-slate-150 dark:divide-slate-850">
                    {(() => {
                      const matches = users.filter(u => u.role === UserRole.STUDENT && (
                        (u.name ?? '').toLowerCase().includes(historicoSearch.toLowerCase()) || 
                        (u.enrollment && u.enrollment.toLowerCase().includes(historicoSearch.toLowerCase()))
                      ));
                      if (matches.length === 0) {
                        return <p className="p-3 text-[11px] text-slate-400 italic text-center">Nenhum aluno encontrado</p>;
                      }
                      return matches.map(std => {
                        const stdGrade = grades.find(g => g.studentId === std.id);
                        const stdClass = stdGrade ? classes.find(c => c.id === stdGrade.classId) : null;
                        return (
                          <button
                            key={std.id}
                            type="button"
                            onClick={() => {
                              setSelectedHistoricoStudentId(std.id);
                              setHistoricoSearch(''); // clear search input
                            }}
                            className="w-full text-left p-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-xs transition-all flex flex-col gap-0.5"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-200">{std.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Matrícula: {std.enrollment || 'N/A'} {stdClass ? `• Turma: ${stdClass.name}` : ''}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Student Quick List Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diretório de Alunos</p>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {users
                    .filter(u => u.role === UserRole.STUDENT)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(std => {
                      const isSelected = selectedHistoricoStudentId === std.id;
                      const stdGrade = grades.find(g => g.studentId === std.id);
                      const stdClass = stdGrade ? classes.find(c => c.id === stdGrade.classId) : null;
                      return (
                        <button
                          key={std.id}
                          type="button"
                          onClick={() => setSelectedHistoricoStudentId(std.id)}
                          className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex flex-col gap-0.5 border ${
                            isSelected 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20' 
                              : 'bg-slate-50 dark:bg-slate-850 border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="font-extrabold truncate">{std.name}</span>
                          <span className={`text-[9px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                            Matrícula: {std.enrollment || 'Sem matrícula'} {stdClass ? `• ${stdClass.name}` : ''}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Right Column: Complete academic records grouped by modules */}
            <div className="lg:col-span-8">
              {(() => {
                const targetStudent = users.find(u => u.id === selectedHistoricoStudentId);
                if (!targetStudent) {
                  return (
                    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl text-center min-h-[350px]">
                      <History className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4 animate-pulse" />
                      <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mb-1">Nenhum Aluno Selecionado</h4>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Utilize a busca ou o diretório ao lado para selecionar o aluno e visualizar o Histórico Completo de Aproveitamento.
                      </p>
                    </div>
                  );
                }

                const similarStudents = findSimilarStudents(targetStudent.id);
                const studentGrades = grades.filter(g => g.studentId === targetStudent.id);
                const uniqueClassIds = Array.from(new Set(studentGrades.map(g => g.classId)));
                // MESMA CORREÇÃO JÁ FEITA NA TELA DE IMPRESSÃO (PrintModal.tsx):
                // sem isto, um aluno recém-matriculado (sem nenhuma nota lançada
                // ainda) não aparecia aqui — a tela ficava praticamente vazia
                // depois de selecioná-lo, parecendo que o clique não tinha feito
                // nada. Isso afeta direto os 202 alunos importados hoje em
                // 2026/2, que ainda não têm nota nenhuma lançada.
                if (targetStudent.classId && !uniqueClassIds.includes(targetStudent.classId)) {
                  uniqueClassIds.push(targetStudent.classId);
                }
                const studentClasses = classes.filter(c => uniqueClassIds.includes(c.id));

                studentClasses.sort((a, b) => {
                  if (a.year !== b.year) return a.year - b.year;
                  if (a.semester !== b.semester) return a.semester - b.semester;
                  return a.module - b.module;
                });

                const similarBanner = similarStudents.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {similarStudents.map(simStudent => {
                      const simClass = simStudent.classId ? classes.find(c => c.id === simStudent.classId)?.name : '';
                      const simGradesCount = grades.filter(g => g.studentId === simStudent.id).length;
                      return (
                        <div key={simStudent.id} className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs animate-fade-in">
                          <div className="flex gap-2.5 items-start">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
                            <div className="space-y-1">
                              <p className="font-extrabold text-amber-800 dark:text-amber-400">
                                Cadastro Duplicado Identificado!
                              </p>
                              <p className="text-slate-600 dark:text-slate-300">
                                Existe outro cadastro com nome correspondente: <strong>{simStudent.name}</strong> 
                                {simClass ? ` (Turma: ${simClass})` : ''} 
                                {simStudent.enrollment ? ` • Matrícula: ${simStudent.enrollment}` : ' • Sem matrícula'} 
                                {` • Registros de notas: ${simGradesCount}`}.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const hasEnrollmentTarget = !!targetStudent.enrollment;
                              const hasEnrollmentSim = !!simStudent.enrollment;
                              
                              let principalId = targetStudent.id;
                              let duplicateId = simStudent.id;
                              
                              if (!hasEnrollmentTarget && hasEnrollmentSim) {
                                principalId = simStudent.id;
                                duplicateId = targetStudent.id;
                              }
                              
                              if (confirm(`Confirmar unificação? Todos os boletins, notas, diários, presenças e documentos de "${simStudent.name}" serão migrados para "${targetStudent.name}". O cadastro duplicado será deletado permanentemente.`)) {
                                unifyDuplicateStudents(principalId, [duplicateId]);
                                setSelectedHistoricoStudentId(principalId);
                                alert('Registros de alunos unificados com sucesso!');
                              }
                            }}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-[11px] uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer shadow-sm shrink-0 whitespace-nowrap self-start sm:self-center"
                          >
                            Unificar Cadastros
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );

                if (studentClasses.length === 0) {
                  return (
                    <div className="space-y-4">
                      {similarBanner}
                      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl text-center min-h-[350px]">
                        <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
                        <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mb-1">Nenhum Registro de Notas</h4>
                        <p className="text-xs text-slate-400 max-w-sm">
                          O aluno <strong>{targetStudent.name}</strong> não possui registros de notas cadastrados no sistema.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {similarBanner}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
                          <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">{targetStudent.name}</h4>
                          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                            Matrícula: {targetStudent.enrollment || 'N/A'} • Status: Ativo
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {studentClasses.map(cls => {
                          const classGrades = studentGrades.filter(g => g.classId === cls.id);
                          const clsSubjects = (cls.isDependency && cls.dependencySubjectId ? subjects.filter(s => s.id === cls.dependencySubjectId) : subjects.filter(s => s.courseId === cls.courseId && s.module === cls.module));

                          return (
                            <div key={cls.id} className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                              {/* Group Header */}
                              <div className="bg-slate-50 dark:bg-slate-850 p-4 border-b border-slate-150 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                                  Turma: {cls.name} ({cls.code || 'N/A'})
                                </span>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                                  <span>Ano: {cls.year}</span>
                                  <span>Semestre: {cls.semester}º</span>
                                  <span>Módulo: {cls.module}º</span>
                                </div>
                              </div>

                              {/* Table */}
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-150 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      <th className="py-3 px-4">Disciplina</th>
                                      <th className="py-3 px-2 text-center w-12">S1</th>
                                      <th className="py-3 px-2 text-center w-12">S2</th>
                                      <th className="py-3 px-2 text-center w-12">AFC</th>
                                      <th className="py-3 px-2 text-center w-12">EX</th>
                                      <th className="py-3 px-2 text-center w-12">CS</th>
                                      <th className="py-3 px-2 text-center w-14 font-black">PF</th>
                                      <th className="py-3 px-3 text-center w-16">Faltas</th>
                                      <th className="py-3 px-3 text-center w-20">Conceito</th>
                                      <th className="py-3 px-4 text-right w-24">Resultado</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                                    {clsSubjects.map(sub => {
                                      const score = classGrades.find(g => g.subjectId === sub.id);
                                      const absences = getStudentAbsences(targetStudent.id, sub.id, cls.id);
                                      return (
                                        <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                                            {sub.name}
                                          </td>
                                          <td className="py-3 px-2 text-center font-mono">
                                            {score ? score.s1.toFixed(1) : '0.0'}
                                          </td>
                                          <td className="py-3 px-2 text-center font-mono">
                                            {score ? score.s2.toFixed(1) : '0.0'}
                                          </td>
                                          <td className="py-3 px-2 text-center font-mono">
                                            {score?.afc ? score.afc.toFixed(1) : '0.0'}
                                          </td>
                                          <td className="py-3 px-2 text-center font-mono">
                                            {score?.extra !== null && score?.extra !== undefined ? score.extra.toFixed(1) : '-'}
                                          </td>
                                          <td className="py-3 px-2 text-center font-mono">
                                            {score?.conselho !== null && score?.conselho !== undefined ? score.conselho.toFixed(1) : '-'}
                                          </td>
                                          <td className="py-3 px-2 text-center font-black font-mono bg-blue-50/20 text-blue-700 dark:text-blue-400">
                                            {score ? score.pf.toFixed(1) : '0.0'}
                                          </td>
                                          <td className="py-3 px-3 text-center font-mono font-bold text-red-600">
                                            {absences.total}
                                          </td>
                                          <td className="py-3 px-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                              score?.concept === 'A' 
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                                : score?.concept === 'B' 
                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' 
                                                : score?.concept === 'C' 
                                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' 
                                                : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                                            }`}>
                                              {score ? score.concept : 'D'}
                                            </span>
                                          </td>
                                          <td className="py-3 px-4 text-right">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                              score?.result === 'APTO' 
                                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                            }`}>
                                              {score ? score.result : 'Pendente'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab: DETECTAR E UNIFICAR ALUNOS DUPLICADOS */}
      {activeTab === 'detect_duplicates' && (() => {
        // Helper functions for fuzzy duplicate detection
        const cleanName = (name: string) => {
          return name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // remove accents
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
        };

        const getLevenshteinDistance = (a: string, b: string): number => {
          const matrix: number[][] = [];
          for (let i = 0; i <= a.length; i++) {
            matrix[i] = [i];
          }
          for (let j = 0; j <= b.length; j++) {
            matrix[0][j] = j;
          }
          for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
              matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
              );
            }
          }
          return matrix[a.length][b.length];
        };

        const areNamesSimilar = (name1: string, name2: string): boolean => {
          const n1 = cleanName(name1);
          const n2 = cleanName(name2);
          
          if (n1 === n2) return true;

          const coll1 = n1.replace(/([a-z])\1+/g, '$1');
          const coll2 = n2.replace(/([a-z])\1+/g, '$1');
          if (coll1 === coll2) return true;

          const maxLen = Math.max(n1.length, n2.length);
          if (maxLen === 0) return false;
          
          const distance = getLevenshteinDistance(n1, n2);
          const threshold = maxLen > 10 ? 2 : 1;
          if (distance <= threshold) return true;

          return false;
        };

        // Find all student users
        const studentUsers = users.filter(u => u.role === UserRole.STUDENT);

        // Build groups of duplicates using Connected Components based on name similarity
        const visited = new Set<string>();
        const groups: User[][] = [];

        studentUsers.forEach(u => {
          if (visited.has(u.id)) return;
          
          const component: User[] = [u];
          visited.add(u.id);

          let changed = true;
          while (changed) {
            changed = false;
            for (const other of studentUsers) {
              if (visited.has(other.id)) continue;
              
              const isSimilarToAny = component.some(member => areNamesSimilar(member.name, other.name));
              if (isSimilarToAny) {
                component.push(other);
                visited.add(other.id);
                changed = true;
              }
            }
          }

          if (component.length > 1) {
            groups.push(component);
          }
        });

        // Map groups to duplicateGroups format
        const duplicateGroups = groups.map((membersList, idx) => {
          const members = [...membersList].sort((a, b) => {
            const indexA = users.findIndex(u => u.id === a.id);
            const indexB = users.findIndex(u => u.id === b.id);
            return indexA - indexB;
          });
          return {
            key: `group_${idx}`,
            name: members[0].name,
            members
          };
        });

        const getStudentClass = (student: User) => {
          if (student.classId) {
            const cls = classes.find(c => c.id === student.classId);
            if (cls) return cls.name;
          }
          // fallback to grade records
          const firstGrade = grades.find(g => g.studentId === student.id);
          if (firstGrade) {
            const cls = classes.find(c => c.id === firstGrade.classId);
            if (cls) return cls.name;
          }
          return 'Sem Turma';
        };

        const getGradeRecordsCount = (studentId: string) => {
          return grades.filter(g => g.studentId === studentId).length;
        };

        const getPrincipalForGroup = (members: User[]) => {
          // Choose as principal the one who has an enrollment filled, or if none, the oldest (first in array order)
          const withEnrollment = members.filter(m => m.enrollment && m.enrollment.trim() !== "");
          if (withEnrollment.length > 0) {
            return withEnrollment[0];
          }
          return members[0];
        };

        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <Users className="h-6 w-6" />
                  <h3 className="font-extrabold text-lg">Detectar e Unificar Alunos Duplicados</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Monitore e consolide cadastros duplicados de estudantes. Preserve notas, diários, presenças e histórico acadêmico sob uma única matrícula principal.
                </p>
              </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Alunos</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white">{studentUsers.length}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className={`p-3 rounded-xl ${duplicateGroups.length > 0 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nomes Duplicados</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white">{duplicateGroups.length}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Integridade de Dados</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white">
                    {duplicateGroups.length === 0 ? '100% OK' : `${(((studentUsers.length - duplicateGroups.length * 2) / studentUsers.length) * 100).toFixed(1)}%`}
                  </p>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {duplicateGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl text-center min-h-[350px]">
                <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-950/25 rounded-full flex items-center justify-center mb-4 text-emerald-500">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h4 className="text-base font-extrabold text-slate-800 dark:text-white mb-1">Nenhum Aluno Duplicado Identificado</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Parabéns! Não há alunos cadastrados com nomes correspondentes ou redundantes na base de dados ativa do Lynxoc.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grupos de Registros Duplicados</h4>
                  <span className="px-2 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-extrabold font-mono">
                    Ação Requerida
                  </span>
                </div>

                <div className="space-y-6">
                  {duplicateGroups.map(group => {
                    const principal = getPrincipalForGroup(group.members);
                    const duplicateMembers = group.members.filter(m => m.id !== principal.id);
                    const isConfirming = confirmingGroupKey === group.key;

                    return (
                      <div 
                        key={group.key}
                        className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden"
                      >
                        {/* Group Header */}
                        <div className="bg-slate-50 dark:bg-slate-850/50 p-5 border-b border-slate-150 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-1">
                            <h5 className="font-extrabold text-slate-800 dark:text-white text-sm sm:text-base tracking-tight">
                              {group.name}
                            </h5>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                              {group.members.length} cadastros coincidentes encontrados
                            </p>
                          </div>
                          
                          {!isConfirming ? (
                            <button
                              type="button"
                              onClick={() => setConfirmingGroupKey(group.key)}
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-rose-500/10 active:scale-[0.98] transition-all cursor-pointer select-none uppercase tracking-wider flex items-center gap-1.5"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Unificar Registros
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  unifyDuplicateStudents(principal.id, duplicateMembers.map(m => m.id));
                                  setConfirmingGroupKey(null);
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider"
                              >
                                Confirmar Unificação
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingGroupKey(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-extrabold rounded-xl text-xs active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Side-by-Side Duplicate Student Details */}
                        <div className="p-6">
                          {isConfirming && (
                            <div className="mb-6 p-4.5 bg-rose-50/50 dark:bg-rose-950/15 border border-rose-200 dark:border-rose-900/35 rounded-2xl flex gap-3.5">
                              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <h6 className="text-xs font-extrabold text-rose-800 dark:text-rose-400">
                                  Confirmação Crucial de Mesclagem
                                </h6>
                                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                                  A unificação irá apagar permanentemente os registros duplicados de usuários e mover todas as notas (GradeRecords) e faltas atreladas a eles para o cadastro principal <strong>{principal.name} (ID: {principal.id})</strong>. Esta ação é definitiva e não poderá ser desfeita.
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {group.members.map(member => {
                              const isPrincipal = member.id === principal.id;
                              const classAndMod = getStudentClass(member);
                              const gradesCount = getGradeRecordsCount(member.id);

                              return (
                                <div 
                                  key={member.id}
                                  className={`relative rounded-2xl border p-5 transition-all duration-300 flex flex-col justify-between min-h-[200px] ${
                                    isPrincipal 
                                      ? 'bg-emerald-50/30 dark:bg-emerald-950/5 border-emerald-500/45 dark:border-emerald-500/25 shadow-md shadow-emerald-500/5' 
                                      : 'bg-slate-50/30 dark:bg-slate-850/10 border-slate-200 dark:border-slate-800 shadow-xs'
                                  }`}
                                >
                                  {/* Badge: Principal vs Duplicate */}
                                  <div className="absolute top-4 right-4">
                                    {isPrincipal ? (
                                      <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Principal
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">
                                        Duplicado
                                      </span>
                                    )}
                                  </div>

                                  <div className="space-y-4">
                                    {/* Avatar & Name */}
                                    <div className="flex items-center gap-3">
                                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-black uppercase tracking-wider shadow-inner ${
                                        isPrincipal 
                                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' 
                                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                      }`}>
                                        {member.name.substring(0, 2)}
                                      </div>
                                      <div className="space-y-0.5">
                                        <h6 className="text-xs font-black text-slate-800 dark:text-slate-100 leading-snug pr-24 truncate max-w-[140px]" title={member.name}>
                                          {member.name}
                                        </h6>
                                        <p className="text-[9px] font-mono font-bold text-slate-400">
                                          ID: {member.id}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Student Metadata Table */}
                                    <div className="space-y-2 border-t border-slate-150 dark:border-slate-850 pt-3">
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Matrícula:</span>
                                        <span className={`font-mono font-black ${member.enrollment ? 'text-slate-700 dark:text-slate-300' : 'text-amber-500'}`}>
                                          {member.enrollment || 'Não preenchida'}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Turma Atual:</span>
                                        <span className="font-extrabold text-slate-700 dark:text-slate-300">
                                          {classAndMod}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Histórico Acadêmico:</span>
                                        <span className={`font-mono font-black px-1.5 py-0.5 rounded-md ${gradesCount > 0 ? 'bg-blue-50 dark:bg-blue-950/25 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                          {gradesCount} diários
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        );
      })()}

      {activeTab === 'detect_duplicates_subjects' && (() => {
        // Helper function to clean name for comparison
        const cleanName = (name: string) => {
          return name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // remove accents
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
        };

        // Group subjects by courseId + module
        const subjectsByCourseAndModule: { [key: string]: Subject[] } = {};
        subjects.forEach(subj => {
          const key = `${subj.courseId}_${subj.module}`;
          if (!subjectsByCourseAndModule[key]) {
            subjectsByCourseAndModule[key] = [];
          }
          subjectsByCourseAndModule[key].push(subj);
        });

        // For each courseId + module group, find duplicates
        const subjectGroups: { key: string; courseId: string; module: number; members: Subject[] }[] = [];
        let groupCounter = 0;
        
        Object.keys(subjectsByCourseAndModule).forEach(key => {
          const list = subjectsByCourseAndModule[key];
          const visitedIds = new Set<string>();

          list.forEach(subj => {
            if (visitedIds.has(subj.id)) return;

            const cluster: Subject[] = [subj];
            visitedIds.add(subj.id);

            list.forEach(other => {
              if (visitedIds.has(other.id)) return;

              if (cleanName(subj.name) === cleanName(other.name)) {
                cluster.push(other);
                visitedIds.add(other.id);
              }
            });

            if (cluster.length > 1) {
              subjectGroups.push({
                key: `subj_group_${groupCounter++}`,
                courseId: subj.courseId,
                module: subj.module,
                members: cluster
              });
            }
          });
        });

        const getSubjectGradesCount = (subjectId: string) => {
          return grades.filter(g => g.subjectId === subjectId).length;
        };

        const getSubjectAttendanceCount = (subjectId: string) => {
          return attendance.filter(s => s.subjectId === subjectId).length;
        };

        const handleOfficialSync = () => {
          setIsSyncing(true);
          try {
            const res = syncSubjectsWithOfficialCurriculum();
            setSyncResult(res);
            if (res.renamed.length === 0 && res.unified.length === 0) {
              setSyncMessage("Todas as disciplinas já estão perfeitamente sincronizadas com a grade curricular oficial!");
            } else {
              setSyncMessage(`Sincronização concluída com sucesso! ${res.renamed.length} disciplinas corrigidas/renomeadas e ${res.unified.length} disciplinas duplicadas unificadas.`);
            }
          } catch (err: any) {
            console.error(err);
            setSyncMessage("Ocorreu um erro ao realizar a sincronização.");
          } finally {
            setIsSyncing(false);
          }
        };

        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <BookOpen className="h-6 w-6" />
                  <h3 className="font-extrabold text-lg">Detectar e Unificar Disciplinas Duplicadas</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Identifique e consolide cadastros redundantes de disciplinas vinculadas ao mesmo curso e módulo. Mova automaticamente registros de notas e diários de frequência sob uma única disciplina definitiva.
                </p>
              </div>
              <button
                onClick={handleOfficialSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all self-start md:self-auto shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar com Grade Oficial'}</span>
              </button>
            </div>

            {/* Sync Report Card if there's any sync action */}
            {(syncResult || syncMessage) && (
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-6 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <h4 className="font-bold text-sm">Resumo da Sincronização com a Grade Oficial</h4>
                  </div>
                  <button 
                    onClick={() => { setSyncResult(null); setSyncMessage(null); }}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Fechar Relatório
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {syncMessage}
                </p>

                {syncResult && syncResult.renamed.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-250 uppercase tracking-wider">Disciplinas Corrigidas/Renomeadas ({syncResult.renamed.length}):</p>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-150 dark:border-slate-800 p-3 rounded-xl bg-white dark:bg-slate-900">
                      {syncResult.renamed.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-xs gap-4">
                          <span className="text-slate-400 line-through truncate">{r.original}</span>
                          <ChevronRight className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-white truncate text-right">{r.official}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {syncResult && syncResult.unified.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-250 uppercase tracking-wider">Disciplinas Duplicadas Unificadas ({syncResult.unified.length}):</p>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-150 dark:border-slate-800 p-3 rounded-xl bg-white dark:bg-slate-900">
                      {syncResult.unified.map((u, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-1 py-1 border-b border-slate-100 last:border-b-0">
                          <span className="text-slate-500 font-medium">Removida: {u.original}</span>
                          <span className="text-emerald-600 font-bold">Unificada em: {u.kept}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Disciplinas</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white">{subjects.length}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className={`p-3 rounded-xl ${subjectGroups.length > 0 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grupos Duplicados</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white">{subjectGroups.length}</p>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {subjectGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl text-center min-h-[350px]">
                <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-950/25 rounded-full flex items-center justify-center mb-4 text-emerald-500">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h4 className="text-base font-extrabold text-slate-800 dark:text-white mb-1">Nenhuma Disciplina Duplicada Identificada</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Todas as disciplinas cadastradas por curso e módulo possuem nomes únicos e padronizados.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grupos de Disciplinas Duplicadas</h4>
                  <span className="px-2 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-extrabold font-mono">
                    Ação Requerida
                  </span>
                </div>

                <div className="space-y-6">
                  {subjectGroups.map(group => {
                    const groupKey = group.key;
                    const selectedId = selectedCorrectSubjectId[groupKey] || group.members[0].id;
                    const isConfirming = confirmingSubjectGroupKey === groupKey;

                    const chosenSubject = group.members.find(m => m.id === selectedId) || group.members[0];
                    const otherMembers = group.members.filter(m => m.id !== chosenSubject.id);

                    // Find Course Name
                    const courseName = courses.find(c => c.id === group.courseId)?.name || group.courseId;

                    return (
                      <div 
                        key={groupKey}
                        className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden"
                      >
                        {/* Group Header */}
                        <div className="bg-slate-50 dark:bg-slate-850/50 p-5 border-b border-slate-150 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block font-mono">
                              Curso: {courseName}
                            </span>
                            <h5 className="font-extrabold text-slate-800 dark:text-white text-sm sm:text-base tracking-tight">
                              Módulo {group.module} • {chosenSubject.name}
                            </h5>
                          </div>
                          
                          {!isConfirming ? (
                            <button
                              type="button"
                              onClick={() => setConfirmingSubjectGroupKey(groupKey)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md active:scale-[0.98] transition-all cursor-pointer select-none uppercase tracking-wider flex items-center gap-1.5"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Unificar Disciplinas
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Confirmar unificação? Todas as notas e diários das outras disciplinas deste grupo serão migrados para "${chosenSubject.name}". As disciplinas duplicadas serão deletadas permanentemente.`)) {
                                    unifyDuplicateSubjects(chosenSubject.id, otherMembers.map(m => m.id));
                                    setConfirmingSubjectGroupKey(null);
                                    alert('Disciplinas unificadas com sucesso!');
                                  }
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider"
                              >
                                Confirmar Unificação
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingSubjectGroupKey(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-extrabold rounded-xl text-xs active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Side-by-Side Duplicate Subject Details */}
                        <div className="p-6">
                          {isConfirming && (
                            <div className="mb-6 p-4.5 bg-rose-50/50 dark:bg-rose-950/15 border border-rose-200 dark:border-rose-900/35 rounded-2xl flex gap-3.5">
                              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <h6 className="text-xs font-extrabold text-rose-800 dark:text-rose-400">
                                  Confirmação de Unificação de Disciplinas
                                </h6>
                                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                                  Esta ação é definitiva. Todas as notas (GradeRecords) e lançamentos de frequência (directAbsences e AttendanceSessions) das disciplinas duplicadas serão migrados para a disciplina selecionada: <strong>{chosenSubject.name} (ID: {chosenSubject.id})</strong>. Os cadastros das outras disciplinas duplicadas serão deletados permanentemente.
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="mb-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                              Selecione qual das opções abaixo é o nome correto a manter:
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {group.members.map(member => {
                              const isSelected = member.id === selectedId;
                              const gradesCount = getSubjectGradesCount(member.id);
                              const attendanceCount = getSubjectAttendanceCount(member.id);

                              return (
                                <button
                                  type="button"
                                  key={member.id}
                                  onClick={() => {
                                    if (!isConfirming) {
                                      setSelectedCorrectSubjectId(prev => ({
                                        ...prev,
                                        [groupKey]: member.id
                                      }));
                                    }
                                  }}
                                  disabled={isConfirming}
                                  className={`relative text-left rounded-2xl border p-5 transition-all duration-300 flex flex-col justify-between min-h-[160px] w-full cursor-pointer ${
                                    isSelected 
                                      ? 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-500 shadow-lg shadow-blue-500/5' 
                                      : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                  }`}
                                >
                                  <div className="space-y-3.5 w-full font-sans">
                                    {/* Selected Badge or selection dot */}
                                    <div className="flex items-center justify-between w-full">
                                      <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${
                                        isSelected 
                                          ? 'border-blue-600 bg-blue-600 text-white' 
                                          : 'border-slate-300 dark:border-slate-700'
                                      }`}>
                                        {isSelected && (
                                          <div className="h-2 w-2 rounded-full bg-white" />
                                        )}
                                      </div>
                                      
                                      {isSelected && (
                                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                          Manter este nome
                                        </span>
                                      )}
                                    </div>

                                    <div className="space-y-1.5">
                                      <h6 className="font-extrabold text-slate-800 dark:text-white text-sm leading-tight font-sans">
                                        {member.name}
                                      </h6>
                                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block truncate">
                                        ID: {member.id}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Stats Row */}
                                  <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 dark:border-slate-850 mt-4 text-[11px] w-full">
                                    <div className="space-y-0.5">
                                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Grade Records</span>
                                      <span className="font-extrabold text-slate-700 dark:text-slate-300">{gradesCount} vinculados</span>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Frequências</span>
                                      <span className="font-extrabold text-slate-700 dark:text-slate-300">{attendanceCount} diários</span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        );
      })()}

      {activeTab === 'gerenciar_disciplinas' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <SubjectManager />
        </motion.div>
      )}

      {/* PDF Viewer / Print Frame Overlay */}
      {printDoc && (() => {
        const studentGrades = grades.filter(g => g.studentId === printDoc.studentId);
        const studentClassId = printDoc.classId || studentGrades[0]?.classId || classes[0]?.id || 'class_enf_m1_mat';
        const studentSubjectId = printDoc.subjectId || studentGrades[0]?.subjectId || subjects.find(s => {
          const cls = classes.find(c => c.id === studentClassId);
          return cls && (cls.isDependency && cls.dependencySubjectId ? s.id === cls.dependencySubjectId : (s.courseId === cls.courseId && s.module === cls.module));
        })?.id || 'enf_m1_anatomia';
        return (
          <PrintModal
            documentType={printDoc.type}
            studentId={printDoc.studentId}
            classId={studentClassId}
            subjectId={studentSubjectId}
            onClose={() => setPrintDoc(null)}
          />
        );
      })()}

      {/* Grade Journal Floating Window Window System */}
      {(gradeWindowState === 'open' || gradeWindowState === 'minimized') && (() => {
        const targetClass = classes.find(c => c.id === activeClassId);
        const targetSubject = subjects.find(s => s.id === activeSubjectId);
        return (
          <>
            {/* Backdrop (Only when open and not maximized to dim the page) */}
            {gradeWindowState === 'open' && (
              <div 
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
                onClick={() => setGradeWindowState('minimized')}
              />
            )}
            
            {/* Main Floating Window */}
            <div 
              style={gradeWindowState === 'minimized' ? { display: 'none' } : undefined}
              className={`transition-all duration-300 shadow-2xl flex flex-col overflow-hidden z-50 ${
                isGradeWindowMaximized 
                  ? 'fixed inset-0 bg-slate-50 dark:bg-slate-950' 
                  : 'fixed top-[4%] bottom-[4%] left-[2%] right-[2%] md:top-[8%] md:bottom-[8%] md:left-[8%] md:right-[8%] bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-blue-500/5'
              }`}
            >
              {/* Title Bar / Control Header */}
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between select-none shrink-0 border-b border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center justify-center p-1.5 bg-blue-500/10 rounded-lg shrink-0">
                    <BookOpen className="h-4.5 w-4.5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-[10px] tracking-widest text-slate-400 uppercase block leading-none mb-1">
                      Controle Admin — Diário de Notas
                    </span>
                    <span className="font-black text-xs sm:text-sm text-white block truncate">
                      {targetSubject?.name || 'Disciplina'} — {targetClass?.name || 'Turma'}
                    </span>
                  </div>
                </div>

                {/* Window Controls */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-4">
                  {/* Minimize Button */}
                  <button
                    type="button"
                    onClick={() => setGradeWindowState('minimized')}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-400 hover:text-amber-300 font-extrabold text-[10px] rounded-xl transition-all border border-slate-700 cursor-pointer"
                    title="Minimizar Janela (Mantém lançamentos)"
                  >
                    <Minus className="h-3 w-3" />
                    <span className="hidden sm:inline">Minimizar</span>
                  </button>

                  {/* Maximize / Restore Button */}
                  <button
                    type="button"
                    onClick={() => setIsGradeWindowMaximized(!isGradeWindowMaximized)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 hover:text-emerald-300 font-extrabold text-[10px] rounded-xl transition-all border border-slate-700 cursor-pointer"
                    title={isGradeWindowMaximized ? "Restaurar Tamanho" : "Maximizar (Tela Cheia)"}
                  >
                    {isGradeWindowMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                    <span className="hidden sm:inline">{isGradeWindowMaximized ? 'Restaurar' : 'Maximizar'}</span>
                  </button>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setGradeWindowState('closed');
                    }}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-red-950/40 hover:bg-red-900/60 active:scale-95 text-red-400 hover:text-red-300 font-extrabold text-[10px] rounded-xl transition-all border border-red-900/30 cursor-pointer"
                    title="Fechar Janela"
                  >
                    <X className="h-3 w-3" />
                    <span className="hidden sm:inline">Fechar</span>
                  </button>
                </div>
              </div>

              {/* Window Body - Renders GradeJournal component */}
              <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4 sm:p-6">
                <div className="max-w-7xl mx-auto">
                  <GradeJournal />
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Attendance Journal Floating Window Window System */}
      {(attendanceWindowState === 'open' || attendanceWindowState === 'minimized') && (() => {
        const targetClass = classes.find(c => c.id === activeClassId);
        const targetSubject = subjects.find(s => s.id === activeSubjectId);
        return (
          <>
            {/* Backdrop (Only when open and not maximized to dim the page) */}
            {attendanceWindowState === 'open' && (
              <div 
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
                onClick={() => setAttendanceWindowState('minimized')}
              />
            )}
            
            {/* Main Floating Window */}
            <div 
              style={attendanceWindowState === 'minimized' ? { display: 'none' } : undefined}
              className={`transition-all duration-300 shadow-2xl flex flex-col overflow-hidden z-50 ${
                isAttendanceWindowMaximized 
                  ? 'fixed inset-0 bg-slate-50 dark:bg-slate-950' 
                  : 'fixed top-[4%] bottom-[4%] left-[2%] right-[2%] md:top-[8%] md:bottom-[8%] md:left-[8%] md:right-[8%] bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-emerald-500/5'
              }`}
            >
              {/* Title Bar / Control Header */}
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between select-none shrink-0 border-b border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center justify-center p-1.5 bg-emerald-500/10 rounded-lg shrink-0">
                    <Calendar className="h-4.5 w-4.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-[10px] tracking-widest text-slate-400 uppercase block leading-none mb-1">
                      Controle Admin — Diário de Frequência (Chamadas)
                    </span>
                    <span className="font-black text-xs sm:text-sm text-white block truncate">
                      {targetSubject?.name || 'Disciplina'} — {targetClass?.name || 'Turma'}
                    </span>
                  </div>
                </div>

                {/* Window Controls */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-4">
                  {/* Minimize Button */}
                  <button
                    type="button"
                    onClick={() => setAttendanceWindowState('minimized')}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-400 hover:text-amber-300 font-extrabold text-[10px] rounded-xl transition-all border border-slate-700 cursor-pointer"
                    title="Minimizar Janela (Mantém lançamentos)"
                  >
                    <Minus className="h-3 w-3" />
                    <span className="hidden sm:inline">Minimizar</span>
                  </button>

                  {/* Maximize / Restore Button */}
                  <button
                    type="button"
                    onClick={() => setIsAttendanceWindowMaximized(!isAttendanceWindowMaximized)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 hover:text-emerald-300 font-extrabold text-[10px] rounded-xl transition-all border border-slate-700 cursor-pointer"
                    title={isAttendanceWindowMaximized ? "Restaurar Tamanho" : "Maximizar (Tela Cheia)"}
                  >
                    {isAttendanceWindowMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                    <span className="hidden sm:inline">{isAttendanceWindowMaximized ? 'Restaurar' : 'Maximizar'}</span>
                  </button>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setAttendanceWindowState('closed');
                    }}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-red-950/40 hover:bg-red-900/60 active:scale-95 text-red-400 hover:text-red-300 font-extrabold text-[10px] rounded-xl transition-all border border-red-900/30 cursor-pointer"
                    title="Fechar Janela"
                  >
                    <X className="h-3 w-3" />
                    <span className="hidden sm:inline">Fechar</span>
                  </button>
                </div>
              </div>

              {/* Window Body - Renders AttendanceJournal component */}
              <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4 sm:p-6">
                <div className="max-w-7xl mx-auto">
                  <AttendanceJournal />
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Floating dock action to restore minimized window */}
      {gradeWindowState === 'minimized' && (() => {
        const targetSubject = subjects.find(s => s.id === activeSubjectId);
        return (
          <motion.div
            initial={{ y: 50, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            className="fixed bottom-6 right-6 z-45"
          >
            <button
              type="button"
              onClick={() => setGradeWindowState('open')}
              className="flex items-center gap-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-3.5 rounded-full shadow-2xl shadow-blue-500/40 font-extrabold text-xs border border-white/25 select-none cursor-pointer"
            >
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span>Restaurar Diário: {targetSubject?.name || 'Notas'}</span>
            </button>
          </motion.div>
        );
      })()}

      {/* Floating dock action to restore minimized attendance window */}
      {attendanceWindowState === 'minimized' && (() => {
        const targetSubject = subjects.find(s => s.id === activeSubjectId);
        return (
          <motion.div
            initial={{ y: 50, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            className="fixed bottom-20 right-6 z-45"
          >
            <button
              type="button"
              onClick={() => setAttendanceWindowState('open')}
              className="flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-5 py-3.5 rounded-full shadow-2xl shadow-emerald-500/40 font-extrabold text-xs border border-white/25 select-none cursor-pointer"
            >
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span>Restaurar Frequência: {targetSubject?.name || 'Chamada'}</span>
            </button>
          </motion.div>
        );
      })()}

      {/* MODAL: CONTROLE DE DOCUMENTOS DOS ALUNOS */}
      {selectedDocStudentId && (() => {
        const student = users.find(u => u.id === selectedDocStudentId);
        if (!student) return null;
        const cl = classes.find(c => c.id === student.classId);
        const course = courses.find(co => co.id === cl?.courseId);
        const requiredDocs = getRequiredDocsForStudent(course?.name);
        const docs = studentDocuments.filter(d => d.studentId === selectedDocStudentId);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl p-6 shadow-xl border border-slate-150 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800">
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-white">Documentação Mandatória</h4>
                  <p className="text-[10px] text-slate-500">{student.name} ({course?.name || 'Técnico'})</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDocStudentId(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {requiredDocs.map(docName => {
                  const docId = `doc_${selectedDocStudentId}_${docName}`;
                  const docRecord = docs.find(d => d.name === docName);
                  const status = docRecord?.status || 'PENDENTE';

                  return (
                    <div key={docName} className="p-3 bg-slate-50/50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{docName}</p>
                        {docRecord?.fileName && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 min-w-0">
                            <Paperclip className="h-3 w-3 shrink-0 text-blue-600" />
                            {/* Balde privado: o caminho vira link temporário no
                                clique, e o servidor confere quem pediu. Antes o
                                `href` levava a um endereço público inventado,
                                igual para todos os alunos. */}
                            <button
                              type="button"
                              onClick={async () => {
                                const alvo = await linkDoDocumento(docRecord.fileUrl || '');
                                if (alvo) window.open(alvo, '_blank', 'noopener');
                                else mostrarAviso('Arquivo indisponível', 'Não foi possível abrir o documento. Ele pode ter sido removido do servidor.');
                              }}
                              className="hover:underline text-blue-600 truncate max-w-[180px] cursor-pointer text-left"
                            >
                              {docRecord.fileName}
                            </button>
                            <span className="shrink-0">({new Date(docRecord.uploadedAt || '').toLocaleDateString('pt-BR')})</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={status}
                          onChange={(e) => {
                            updateStudentDocumentStatus(docId, e.target.value as any, docRecord?.fileUrl, docRecord?.fileName);
                          }}
                          className={`px-2 py-1 border rounded-lg text-[10px] font-bold outline-none ${
                            status === 'ENTREGUE'
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200'
                              : status === 'ENVIADO'
                              ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200'
                              : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200'
                          }`}
                        >
                          <option value="PENDENTE">❌ PENDENTE</option>
                          <option value="ENVIADO">🟡 ENVIADO</option>
                          <option value="ENTREGUE">✅ ENTREGUE</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedDocStudentId(null)}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow shadow-blue-600/10 transition-all uppercase tracking-wider"
                >
                  Concluir Análise
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </div>
  );
};

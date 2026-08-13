/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp, getRequiredDocsForStudent } from '../context/AppContext';
import { enviarArquivoDeDocumento, linkDoDocumento } from '../lib/repositorios';
import { 
  GraduationCap, Printer, Bell, Calendar, HelpCircle, CheckCircle, 
  AlertTriangle, BookOpen, Clock, Sparkles, ExternalLink, FileText, 
  Image as ImageIcon, Mic, Download, X, Paperclip, ShieldCheck, ShieldAlert,
  Upload, UploadCloud, Briefcase, MapPin, Award, History
} from 'lucide-react';
import { PrintModal } from './PrintModal';
import { escapeHtml } from '../utils/security';
import { getInternshipComponentsByCourse } from './AdminInternships';
import { motion } from 'motion/react';
import { 
  getStageVacancies, saveStageVacancy, getStageCronogramas, 
  getEventParticipants, getEvents, getOfficialTemplates 
} from '../services/movimentacaoStorage';
import { getInstallments, saveMiscPaymentCatalog } from '../services/financeiroStorage';
import { StageVacancy, EventParticipant, EventMinicourse } from '../types/movimentacao';
import { MovimentacaoDocumentPrintModal } from './movimentacao/MovimentacaoDocumentPrintModal';
import { Check, FileCheck, DollarSign, UserCheck, Lock, AlertCircle } from 'lucide-react';

interface StudentDashboardProps {
  studentId?: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ studentId }) => {
  const { 
    currentUser, subjects, grades, classes, getStudentAbsences, 
    notifications, calendarEvents, currentPeriod, courses, messages,
    simulatedDate, declarationConfigs, studentDocuments, updateStudentDocumentStatus,
    users, internships
  } = useApp();
  const [printDoc, setPrintDoc] = useState<boolean>(false);
  const [printHistorico, setPrintHistorico] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'aproveitamento' | 'declaracoes' | 'documentos' | 'estagio' | 'historico_completo' | 'certificados'>('aproveitamento');
  const [printDeclType, setPrintDeclType] = useState<'decl_escolaridade' | 'decl_ctransp' | 'decl_vacina' | null>(null);
  
  // Local state for simulated uploads
  const [uploadingDocName, setUploadingDocName] = useState<string | null>(null);
  // O ARQUIVO DE VERDADE, NÃO SÓ O NOME DELE.
  //
  // Antes isto guardava apenas `{ name, size }`: o conteúdo do documento nunca
  // era lido. O aluno via "ENVIADO" e não havia arquivo nenhum no servidor.
  const [arquivoEscolhido, setArquivoEscolhido] = useState<File | null>(null);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');

  // Stage self-enrollment states
  const [estagioSubMode, setEstagioSubMode] = useState<'vagas_abertas' | 'meu_progresso'>('vagas_abertas');
  const [pendencyModalVac, setPendencyModalVac] = useState<StageVacancy | null>(null);
  const [pendencyList, setPendencyList] = useState<{ id: string; label: string; details: string; type: 'insurance' | 'tuition' | 'docs' }[]>([]);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Certificate Modal State
  const [selectedCertModal, setSelectedCertModal] = useState<{ title: string; contentHtml?: string; pdfUrl?: string; pdfName?: string } | null>(null);

  const activeStudent = studentId ? (users.find(u => u.id === studentId) || currentUser) : currentUser;

  if (!activeStudent) return null;

  // Parse active period
  const [yearStr, semStr] = currentPeriod.split('/');
  const currentYear = parseInt(yearStr) || 2026;
  const currentSemester = parseInt(semStr) || 1;

  // Active period classes
  const activePeriodClasses = classes.filter(c => c.year === currentYear && c.semester === currentSemester);
  const activePeriodClassIds = activePeriodClasses.map(c => c.id);

  // Student's grade records in the active period
  const studentGrades = grades.filter(g => g.studentId === activeStudent.id && activePeriodClassIds.includes(g.classId));

  // Determine the active class for the student
  const studentClassId = studentGrades[0]?.classId;
  const targetClass = classes.find(c => c.id === studentClassId) || activePeriodClasses[0];

  // Course info
  const courseInfo = targetClass ? courses.find(co => co.id === targetClass.courseId) : null;

  // Enrolled subjects
  const studentSubjects = targetClass 
    ? subjects.filter(s => s.courseId === targetClass.courseId && s.module === targetClass.module)
    : [];

  // Filter student notifications and messages
  const studentNotifications = notifications.filter(n => n.userId === activeStudent.id);
  // MENSAGENS DO ALUNO: ACEITAR OS DOIS IDENTIFICADORES
  //
  // A pessoa tem dois números: o da FICHA (`std_...`, que é o `activeStudent.id`)
  // e o da CONTA DE LOGIN (`contaId`). As mensagens são endereçadas à CONTA —
  // a coluna `destinatario_id` aponta para `usuarios`.
  //
  // Comparando só com o id da ficha, a mensagem enviada para um aluno nunca
  // aparecia para ele: estava no banco, correta, endereçada à pessoa certa, e
  // a tela procurava por outro endereço. Sem erro nenhum.
  const studentMessages = messages.filter(m =>
    m.recipientId === activeStudent.id ||
    (!!activeStudent.contaId && m.recipientId === activeStudent.contaId)
  );

  return (
    <div id="student-dashboard-container" className="space-y-6">
      
      {/* High-visibility Notice Banner */}
      {studentNotifications.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 dark:bg-amber-500/5 border-2 border-amber-500/70 dark:border-amber-500/40 p-4 rounded-2xl shadow-md flex items-start gap-4 select-none relative overflow-hidden animate-pulse-slow"
        >
          {/* Ambient background glow */}
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0 shadow-lg shadow-amber-500/20 mt-0.5">
            <Bell className="h-5 w-5 animate-bounce" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400">
                AVISO ACADÊMICO RECENTE
              </span>
              <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-800 dark:text-amber-400 font-extrabold rounded uppercase tracking-wider">
                Novo
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold ml-auto">
                Dia {studentNotifications[0].date.substring(5, 10).replace('-', '/')} às {studentNotifications[0].date.substring(11, 16)}h
              </span>
            </div>
            <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-amber-100 leading-relaxed">
              {studentNotifications[0].content}
            </p>
          </div>
        </motion.div>
      )}

      {/* Student Welcome Header Card */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden select-none">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-600/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-indigo-600/30 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
              <GraduationCap className="h-8 w-8 text-blue-200" />
            </div>
            <div>
              <span className="bg-white/15 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-blue-200">Aluno Regular</span>
              <h2 className="text-xl sm:text-2xl font-black mt-1 text-white">{activeStudent.name}</h2>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                Matrícula: <strong className="font-mono">{activeStudent.enrollment}</strong> • Curso: {courseInfo?.name || 'Curso Técnico'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
              id="print-individual-bulletin-btn"
              onClick={() => setPrintDoc(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-blue-800 font-extrabold rounded-xl text-xs shadow-md active:scale-[0.98] transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" /> Exportar Ficha de Aproveitamento
            </button>

            <button
              type="button"
              id="student-view-internships-btn"
              onClick={() => setActiveSubTab('estagio')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer select-none border shadow-md active:scale-95 ${
                activeSubTab === 'estagio'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20 font-black'
                  : 'bg-white hover:bg-slate-100 text-amber-700 dark:bg-slate-800 dark:text-amber-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Briefcase className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Acompanhar Estágios</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        
        {/* Left: Ficha de Aproveitamento Individual Table (High Fidelity) */}
        <div className="md:col-span-8 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5">
          
          {/* Sub-Tabs Nav - 2-row layout (3 on top, 2 below) for easier mobile/desktop navigation without scrolling */}
          <div className="flex flex-col gap-2 pb-3 border-b border-slate-150 dark:border-slate-800">
            {/* Top Row: 3 buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setActiveSubTab('aproveitamento')}
                className={`px-2 py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center truncate ${
                  activeSubTab === 'aproveitamento'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                📊 Aproveitamento
              </button>
              <button
                onClick={() => setActiveSubTab('historico_completo')}
                className={`px-2 py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center truncate ${
                  activeSubTab === 'historico_completo'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                📜 Histórico Completo
              </button>
              <button
                onClick={() => setActiveSubTab('declaracoes')}
                className={`px-2 py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center truncate ${
                  activeSubTab === 'declaracoes'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                📄 Minhas Declarações
              </button>
            </div>
            {/* Bottom Row: 3 buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setActiveSubTab('documentos')}
                className={`px-2 py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center truncate ${
                  activeSubTab === 'documentos'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                📁 Envio de Documentos
              </button>
              <button
                onClick={() => setActiveSubTab('estagio')}
                className={`px-2 py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center truncate ${
                  activeSubTab === 'estagio'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                💼 Estágios Curriculares
              </button>
              <button
                onClick={() => setActiveSubTab('certificados')}
                className={`px-2 py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center truncate ${
                  activeSubTab === 'certificados'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                🏆 Meus Certificados
              </button>
            </div>
          </div>

          {/* TAB 1: APROVEITAMENTO */}
          {activeSubTab === 'aproveitamento' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Ficha de Aproveitamento Individual</h3>
                  <p className="text-xs text-slate-400">Notas, conceitos e faltas consolidados em tempo real no módulo atual.</p>
                </div>
                <div className="text-right text-[10px] font-black text-slate-500 uppercase tracking-wide hidden sm:block">
                  MÓDULO {targetClass?.module || 1} • TURNO {targetClass?.shift || 'MATUTINO'} • PERÍODO {currentPeriod}
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto">
                <table className="min-w-[750px] w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase text-[9px] tracking-wider select-none h-10">
                      <th className="py-2.5 px-3 sticky left-0 bg-slate-50 dark:bg-slate-800 border-r border-slate-150 dark:border-slate-800 z-10 w-[180px] min-w-[180px] max-w-[180px]">Disciplinas</th>
                      <th className="py-2.5 px-2 text-center">S1</th>
                      <th className="py-2.5 px-2 text-center">S2</th>
                      <th className="py-2.5 px-2 text-center">AFC</th>
                      <th className="py-2.5 px-2 text-center">EX</th>
                      <th className="py-2.5 px-2 text-center">CS</th>
                      <th className="py-2.5 px-2 text-center font-bold text-blue-700 dark:text-blue-300">PF</th>
                      <th className="py-2.5 px-2 text-center">Faltas</th>
                      <th className="py-2.5 px-2 text-center">Conceito</th>
                      <th className="py-2.5 px-3 text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                    {studentSubjects.map(sub => {
                      const score = studentGrades.find(g => g.subjectId === sub.id);
                      const absences = getStudentAbsences(activeStudent.id, sub.id);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group">
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850 border-r border-slate-150 dark:border-slate-800 z-10 w-[180px] min-w-[180px] max-w-[180px] truncate">{sub.name}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{score ? score.s1.toFixed(1) : '0.0'}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{score ? score.s2.toFixed(1) : '0.0'}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{score?.afc ? score.afc.toFixed(1) : '0.0'}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{score?.extra ? score.extra : '-'}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{score?.conselho ? score.conselho : '-'}</td>
                          <td className="py-2.5 px-2 text-center font-black text-blue-700 dark:text-blue-300 font-mono bg-blue-50/10 dark:bg-blue-950/5">
                            {score ? score.pf.toFixed(1) : '0.0'}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-500 dark:text-slate-400">
                            {absences.total}
                          </td>
                          <td className="py-2.5 px-2 text-center font-black">{score ? score.concept : 'D'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                              score?.result?.includes('APTO') 
                                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' 
                                : (score?.result === 'F. NOTA' || score?.result === 'REP. FALTAS' || score?.result === 'NÃO APTO')
                                  ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                                  : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                            }`}>
                              {score ? (score.result === 'F. NOTA' ? 'REP. FALTAS' : score.result) : 'Pendente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Explanatory footer matches original PDF legend styling */}
              <div className="bg-slate-50 dark:bg-slate-800/20 p-3 rounded-2xl text-[10px] text-slate-400 leading-relaxed font-semibold font-sans">
                <span className="text-slate-600 dark:text-slate-300 font-bold uppercase mr-1">Legenda:</span>
                S1 Somatório de Notas 1, S2 Somatório de Notas 2, PF Pontuação final, AFC Avaliação Final de Competência, EX Nota Extra, CS Conselho. Média para aprovação: 60,00 pontos e frequência mínima de 75%.
              </div>
            </div>
          )}

          {/* TAB 2: DECLARACOES */}
          {activeSubTab === 'declaracoes' && (() => {
            const isDateWithinRange = (dateStr: string, startStr: string, endStr: string) => {
              if (!startStr || !endStr) return false;
              const current = new Date(dateStr);
              const start = new Date(startStr);
              const end = new Date(endStr);
              current.setHours(0,0,0,0);
              start.setHours(0,0,0,0);
              end.setHours(0,0,0,0);
              return current >= start && current <= end;
            };

            const isEscolaridadeActive = isDateWithinRange(
              simulatedDate, 
              declarationConfigs?.escolaridade?.startDate || '', 
              declarationConfigs?.escolaridade?.endDate || ''
            );

            const isCtranspActive = true; // Unlocked/released without date restrictions as requested

            const formatDateBr = (dateStr: string) => {
              if (!dateStr) return '';
              const [year, month, day] = dateStr.split('-');
              return `${day}/${month}/${year}`;
            };

            return (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Minhas Declarações</h3>
                  <p className="text-xs text-slate-400">Emita declarações institucionais oficiais com validação digital para impressão ou download.</p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  
                  {/* CARD 1: ESCOLARIDADE */}
                  <div className="bg-slate-50/50 dark:bg-slate-850/40 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <FileText className="h-5 w-5" />
                      </div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Escolaridade</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Atesta que o discente possui matrícula ativa e frequência regular no curso técnico para o período atual.
                      </p>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      {declarationConfigs?.escolaridade?.startDate && (
                        <div className="text-[10px] text-slate-400 bg-slate-100/50 dark:bg-slate-800/30 p-2 rounded-xl border border-slate-200/40 dark:border-slate-800/40 font-semibold space-y-0.5">
                          <span className="block font-bold text-[9px] uppercase tracking-wider text-slate-500">Período de Emissão:</span>
                          <span>{formatDateBr(declarationConfigs.escolaridade.startDate)} até {formatDateBr(declarationConfigs.escolaridade.endDate)}</span>
                        </div>
                      )}

                      {isEscolaridadeActive ? (
                        <button
                          onClick={() => setPrintDeclType('decl_escolaridade')}
                          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-[10px] tracking-wider uppercase transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Printer className="h-3.5 w-3.5" /> Gerar PDF
                        </button>
                      ) : (
                        <div className="space-y-1.5">
                          <button
                            disabled
                            className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800/60 text-slate-400 font-extrabold rounded-xl text-[10px] tracking-wider uppercase transition-all cursor-not-allowed border border-slate-200/50 dark:border-slate-800/60 flex items-center justify-center gap-1.5"
                          >
                            Bloqueado
                          </button>
                          <p className="text-[9px] text-red-500 font-bold flex items-center gap-1 leading-normal">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Disponível apenas entre {formatDateBr(declarationConfigs?.escolaridade?.startDate || '')} e {formatDateBr(declarationConfigs?.escolaridade?.endDate || '')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CARD 2: SETRANSP PASSE */}
                  <div className="bg-slate-50/50 dark:bg-slate-850/40 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">SETRANSP Passe</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Declaração oficial destinada ao SETRANSP para cadastramento e concessão de passe estudantil meia-tarifa.
                      </p>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      {declarationConfigs?.ctransp?.startDate && (
                        <div className="text-[10px] text-slate-400 bg-slate-100/50 dark:bg-slate-800/30 p-2 rounded-xl border border-slate-200/40 dark:border-slate-800/40 font-semibold space-y-0.5">
                          <span className="block font-bold text-[9px] uppercase tracking-wider text-slate-500">Período de Emissão:</span>
                          <span>{formatDateBr(declarationConfigs.ctransp.startDate)} até {formatDateBr(declarationConfigs.ctransp.endDate)}</span>
                        </div>
                      )}

                      {isCtranspActive ? (
                        <button
                          onClick={() => setPrintDeclType('decl_ctransp')}
                          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-[10px] tracking-wider uppercase transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Printer className="h-3.5 w-3.5" /> Gerar PDF
                        </button>
                      ) : (
                        <div className="space-y-1.5">
                          <button
                            disabled
                            className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800/60 text-slate-400 font-extrabold rounded-xl text-[10px] tracking-wider uppercase transition-all cursor-not-allowed border border-slate-200/50 dark:border-slate-800/60 flex items-center justify-center gap-1.5"
                          >
                            Bloqueado
                          </button>
                          <p className="text-[9px] text-red-500 font-bold flex items-center gap-1 leading-normal">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Disponível apenas entre {formatDateBr(declarationConfigs?.ctransp?.startDate || '')} e {formatDateBr(declarationConfigs?.ctransp?.endDate || '')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CARD 3: VACINA EM DIA */}
                  <div className="bg-slate-50/50 dark:bg-slate-850/40 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Vacina em Dia</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Atestado institucional comprovando a regularidade vacinal do discente para liberação de laboratórios de saúde.
                      </p>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <div className="text-[10px] text-slate-400 bg-slate-100/50 dark:bg-slate-800/30 p-2 rounded-xl border border-slate-200/40 dark:border-slate-800/40 font-semibold space-y-0.5">
                        <span className="block font-bold text-[9px] uppercase tracking-wider text-slate-500">Período de Emissão:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Sempre Disponível</span>
                      </div>

                      <button
                        onClick={() => setPrintDeclType('decl_vacina')}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-[10px] tracking-wider uppercase transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Printer className="h-3.5 w-3.5" /> Gerar PDF
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

          {/* TAB 3: DOCUMENTOS */}
          {activeSubTab === 'documentos' && (() => {
            // A LISTA VEM DA REGRA DA ESCOLA, NÃO DE UM RASCUNHO NA TELA.
            //
            // Aqui havia quatro itens escritos à mão, diferentes dos que a
            // secretaria conferia. O aluno entregava o que ESTA tela pedia e
            // continuava pendente na tela dela, por documentos que nunca lhe
            // foram solicitados. Agora as duas leem a mesma função, que também
            // sabe o que muda por curso e por sexo.
            const requiredDocs = getRequiredDocsForStudent(courseInfo?.name, activeStudent?.sexo);
            const docs = studentDocuments.filter(d => d.studentId === activeStudent.id);

            return (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Meus Documentos Obrigatórios</h3>
                  <p className="text-xs text-slate-400">Verifique a situação e envie seus documentos obrigatórios exigidos pela coordenação.</p>
                </div>

                <div className="space-y-3">
                  {requiredDocs.map(docName => {
                    const docId = `doc_${activeStudent.id}_${docName}`;
                    const docRecord = docs.find(d => d.name === docName);
                    const status = docRecord?.status || 'PENDENTE';

                    return (
                      <div key={docName} className="p-4 bg-slate-50/50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">{docName}</p>
                          {docRecord?.fileName ? (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <Paperclip className="h-3 w-3 shrink-0 text-blue-600" />
                              <button
                                type="button"
                                onClick={async () => {
                                  // O BALDE É PRIVADO: NÃO EXISTE ENDEREÇO FIXO.
                                  //
                                  // Antes o link ia direto no `href`, o que só
                                  // funcionava com o endereço público inventado
                                  // que o sistema gravava. Agora o caminho é
                                  // trocado por um link temporário no momento do
                                  // clique, e é o próprio servidor que confere se
                                  // quem pediu tem direito ao arquivo.
                                  const alvo = await linkDoDocumento(docRecord.fileUrl || "");
                                  if (alvo) window.open(alvo, '_blank', 'noopener');
                                  else alert('Não foi possível abrir o arquivo. Ele pode ter sido removido do servidor.');
                                }}
                                className="hover:underline text-blue-600 truncate max-w-[200px] cursor-pointer text-left"
                              >
                                {docRecord.fileName}
                              </button>
                              <span>({new Date(docRecord.uploadedAt || '').toLocaleDateString('pt-BR')})</span>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">Documento pendente de entrega digital.</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide ${
                            status === 'ENTREGUE'
                              ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50'
                              : status === 'ENVIADO'
                              ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/50'
                              : 'bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200/50'
                          }`}>
                            {status === 'ENTREGUE' ? '✅ HOMOLOGADO' : status === 'ENVIADO' ? '🟡 AGUARDANDO ANÁLISE' : '❌ PENDENTE'}
                          </span>

                          {/* REENVIO ENQUANTO AGUARDA ANÁLISE.
                              Antes, só dava pra enviar quando o status era
                              PENDENTE — depois que o aluno mandava, o botão
                              sumia e só voltava se a secretaria devolvesse o
                              status manualmente. Se o aluno mesmo percebesse
                              que a foto/scan saiu ruim, ficava travado
                              esperando alguém da secretaria notar e agir.
                              Agora o aluno pode substituir o arquivo sozinho
                              enquanto ainda está "aguardando análise" — só
                              trava mesmo depois de HOMOLOGADO (aprovado),
                              que aí sim não faz sentido trocar sem mais nem
                              menos. */}
                          {(status === 'PENDENTE' || status === 'ENVIADO') && (
                            <button
                              onClick={() => setUploadingDocName(docName)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg text-[10px] uppercase tracking-wide cursor-pointer transition-all active:scale-95 shadow-md shadow-blue-500/10"
                            >
                              {status === 'ENVIADO' ? 'Reenviar Documento' : 'Enviar Documento'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* TAB 4: ESTÁGIO (Student Tracking & Self-Enrollment) */}
          {activeSubTab === 'estagio' && (() => {
            const courseId = courseInfo?.id || '';
            const courseName = courseInfo?.name || '';
            const components = getInternshipComponentsByCourse(courseId, courseName);
            const studentInternships = internships.filter(r => r.studentId === activeStudent.id);

            // Calculations
            const totalRequiredHrs = components.reduce((sum, c) => sum + c.workload, 0);
            const completedComponents = components.filter(c => {
              const record = studentInternships.find(r => r.subjectName === c.name);
              return record && record.grade !== null;
            });
            const completedHrs = completedComponents.reduce((sum, c) => sum + c.workload, 0);
            const completionPercent = totalRequiredHrs > 0 ? Math.round((completedHrs / totalRequiredHrs) * 100) : 0;

            const gradedRecords = studentInternships.filter(r => r.grade !== null);
            const averageGrade = gradedRecords.length > 0 
              ? (gradedRecords.reduce((sum, r) => sum + (r.grade || 0), 0) / gradedRecords.length).toFixed(2)
              : null;

            // Vacancies & Cronogramas
            const allVacancies = getStageVacancies();
            const cronogramas = getStageCronogramas();

            // Check pendencies for a vacancy
            const checkAndEnroll = (vac: StageVacancy) => {
              const pList: { id: string; label: string; details: string; type: 'insurance' | 'tuition' | 'docs' }[] = [];

              // 1) Insurance Fee Check
              const insurancePaid = localStorage.getItem(`insurance_paid_${activeStudent.id}`) === 'true';
              if (!insurancePaid) {
                pList.push({
                  id: 'insurance',
                  label: 'Taxa de Seguro de Estágio Obrigatório (R$ 150,00)',
                  details: 'Seguro individual contra acidentes exigido por lei para autorizar entrada nos hospitais/campos.',
                  type: 'insurance'
                });
              }

              // 2) Financial Check
              const allInst = getInstallments();
              const studentInst = allInst.filter(i => i.studentId === activeStudent.id);
              const overdue = studentInst.filter(i => i.status === 'ATRASADA');
              if (overdue.length > 0) {
                pList.push({
                  id: 'tuition',
                  label: `Financeiro: ${overdue.length} mensalidade(s) pendente(s) de pagamento`,
                  details: 'Necessário estar com o período quitado na secretaria para homologação.',
                  type: 'tuition'
                });
              }

              // 3) Documents Check
              // A LISTA VEM DA REGRA DA ESCOLA, NÃO DE UM RASCUNHO NA TELA.
            //
            // Aqui havia quatro itens escritos à mão, diferentes dos que a
            // secretaria conferia. O aluno entregava o que ESTA tela pedia e
            // continuava pendente na tela dela, por documentos que nunca lhe
            // foram solicitados. Agora as duas leem a mesma função, que também
            // sabe o que muda por curso e por sexo.
            const requiredDocs = getRequiredDocsForStudent(courseInfo?.name, activeStudent?.sexo);
              const userDocs = studentDocuments.filter(d => d.studentId === activeStudent.id);
              const missingDocs = requiredDocs.filter(reqName => {
                const docRecord = userDocs.find(d => d.name === reqName);
                return !docRecord || docRecord.status === 'PENDENTE';
              });
              if (missingDocs.length > 0) {
                pList.push({
                  id: 'docs',
                  label: `Documentos Obrigatórios Pendentes (${missingDocs.length} arquivo(s))`,
                  details: `Falta entregar: ${missingDocs.slice(0, 2).join(', ')}`,
                  type: 'docs'
                });
              }

              if (pList.length > 0) {
                setPendencyList(pList);
                setPendencyModalVac(vac);
              } else {
                // Direct enrollment
                doEnroll(vac);
              }
            };

            const doEnroll = (vac: StageVacancy) => {
              const allocated = vac.studentsAllocated || [];
              if (allocated.some(s => s.studentId === activeStudent.id)) {
                setToastMsg({ type: 'error', message: 'Você já está inscrito nesta vaga de estágio.' });
                return;
              }

              const updatedVac: StageVacancy = {
                ...vac,
                studentsAllocated: [
                  ...allocated,
                  {
                    studentId: activeStudent.id,
                    studentName: activeStudent.name,
                    enrollmentNumber: activeStudent.enrollment || 'ALU-2026',
                    status: 'MATRICULADO'
                  }
                ]
              };

              saveStageVacancy(updatedVac, activeStudent.name);
              setToastMsg({ type: 'success', message: `Matrícula realizada com sucesso na vaga "${vac.companyName || vac.stageName}"!` });
              setPendencyModalVac(null);
            };

            return (
              <div className="space-y-5 animate-fade-in">
                
                {/* Header Sub-Nav */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Portal de Estágios Curriculares</h3>
                    <p className="text-xs text-slate-400">Inscreva-se nas vagas abertas e acompanhe seu progresso de horas supervisionadas.</p>
                  </div>

                  {/* Sub-toggle buttons */}
                  <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEstagioSubMode('vagas_abertas')}
                      className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                        estagioSubMode === 'vagas_abertas'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      📌 Vagas Abertas para Inscrição
                    </button>
                    <button
                      type="button"
                      onClick={() => setEstagioSubMode('meu_progresso')}
                      className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                        estagioSubMode === 'meu_progresso'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      📊 Meu Progresso ({completionPercent}%)
                    </button>
                  </div>
                </div>

                {/* SUBMODE 1: VAGAS ABERTAS PARA INSCRIÇÃO */}
                {estagioSubMode === 'vagas_abertas' && (
                  <div className="space-y-4">
                    {/* Cronogramas Banner */}
                    {cronogramas.length > 0 && (
                      <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl border border-blue-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-300 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> Cronograma de Liberação de Estágios
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold text-[9px] rounded uppercase">
                            Datas Oficiais
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold">
                          {cronogramas.map(cro => (
                            <div key={cro.id} className="p-2.5 bg-white/10 rounded-xl border border-white/10 space-y-1">
                              <p className="font-extrabold text-blue-100">{cro.title}</p>
                              <p className="text-[10px] text-slate-300">
                                Liberação: <strong className="text-emerald-400">{cro.releaseDate ? new Date(cro.releaseDate).toLocaleDateString('pt-BR') : 'Imediata'}</strong> • Turno: {cro.shift}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Vagas e Turmas de Estágio Disponíveis ({allVacancies.length})
                    </h4>

                    {allVacancies.length === 0 ? (
                      <div className="p-10 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                        <Briefcase className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="font-bold text-slate-600 dark:text-slate-300">Nenhuma vaga de estágio publicada no momento.</p>
                        <p>A coordenação acadêmica publicará novas vagas no cronograma oficial.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allVacancies.map(vac => {
                          const allocated = vac.studentsAllocated || [];
                          const isEnrolled = allocated.some(s => s.studentId === activeStudent.id);
                          const maxSlots = vac.maxStudents || 15;
                          const slotsLeft = Math.max(0, maxSlots - allocated.length);

                          return (
                            <div key={vac.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3.5 flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold text-[9px] rounded uppercase tracking-wider">
                                      {vac.sector || 'Campo de Estágio'}
                                    </span>
                                    <h5 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                                      {vac.companyName || vac.stageName || 'Hospital Geral'}
                                    </h5>
                                  </div>
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                    isEnrolled
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40'
                                      : slotsLeft > 0
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  }`}>
                                    {isEnrolled ? '✓ MATRICULADO' : slotsLeft > 0 ? `${slotsLeft} Vagas Restantes` : 'VAGAS ESGOTADAS'}
                                  </span>
                                </div>

                                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                  <div>🎓 Docente Preceptor: <strong className="text-blue-600 dark:text-blue-400">{vac.teacherName || 'Prof. Responsável'}</strong></div>
                                  <div>📅 Período: <strong>{vac.startDate} até {vac.endDate}</strong></div>
                                  <div>🕒 Escala / Horário: <strong>{vac.scheduleDaysTime || 'Segunda a Sexta - 07:00 às 12:00'}</strong></div>
                                  <div>👥 Alunos Inscritos: <strong>{allocated.length} de {maxSlots} vagas</strong></div>
                                </div>
                              </div>

                              <div>
                                {isEnrolled ? (
                                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-extrabold">
                                    <span className="flex items-center gap-1">
                                      <Check className="h-4 w-4 text-emerald-600" /> Sua inscrição está confirmada nesta turma!
                                    </span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={slotsLeft <= 0}
                                    onClick={() => checkAndEnroll(vac)}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/15 cursor-pointer transition-all flex items-center justify-center gap-2"
                                  >
                                    <UserCheck className="h-4 w-4" /> Inscrever-me Nesta Vaga de Estágio
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* SUBMODE 2: MEU PROGRESSO DE ESTÁGIO */}
                {estagioSubMode === 'meu_progresso' && (
                  <div className="space-y-5">
                    {/* Progress Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between space-y-2">
                        <div>
                          <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Progresso de Carga Horária</span>
                          <strong className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                            {completedHrs}h <span className="text-slate-400 text-xs sm:text-sm font-bold">/ {totalRequiredHrs}h</span>
                          </strong>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${completionPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase">
                          {completionPercent}% Concluído
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between space-y-2">
                        <div>
                          <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Componentes Concluídos</span>
                          <strong className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                            {completedComponents.length} <span className="text-slate-400 text-xs sm:text-sm font-bold">/ {components.length}</span>
                          </strong>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>Componentes homologados</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between space-y-2">
                        <div>
                          <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Média Geral do Estágio</span>
                          <strong className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                            {averageGrade ? averageGrade : 'N/A'}
                          </strong>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>Aproveitamento homologado</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-extrabold text-slate-700 dark:text-white text-xs uppercase tracking-wide">
                        Detalhamento por Componente
                      </h4>

                      <div className="space-y-3">
                        {components.map(comp => {
                          const record = studentInternships.find(r => r.subjectName === comp.name);
                          const isCompleted = record && record.grade !== null;

                          return (
                            <div 
                              key={comp.name} 
                              className="p-4 bg-slate-50/50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                                    {comp.name}
                                  </p>
                                  <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-500 dark:text-slate-400 rounded uppercase">
                                    {comp.workload}h
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className={record?.location ? 'text-slate-600 dark:text-slate-350 font-medium' : 'italic text-amber-500'}>
                                    {record?.location ? `Realizado em: ${record.location}` : 'Pendente de lançamento'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide shrink-0 ${
                                  isCompleted
                                    ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30'
                                    : 'bg-amber-100/70 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/30'
                                }`}>
                                  {isCompleted ? '✓ CONCLUÍDO' : '🟡 PENDENTE'}
                                </span>

                                <div className="text-right shrink-0 min-w-[50px]">
                                  {isCompleted ? (
                                    <span className={`px-2 py-0.5 text-xs font-black rounded ${
                                      (record?.grade || 0) >= 7
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                    }`}>
                                      Nota: {record?.grade?.toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-bold italic">
                                      Nota Pendente
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })()}

          {/* TAB 5: MEUS CERTIFICADOS */}
          {activeSubTab === 'certificados' && (() => {
            const allParticipants = getEventParticipants();
            const eventsList = getEvents();

            // Filter participants matching active student
            const myCertRecords = allParticipants.filter(p => 
              (p.studentId === activeStudent.id || 
               p.enrollmentNumber === activeStudent.enrollment ||
               p.studentName.toLowerCase().includes(activeStudent.name.toLowerCase())) &&
              p.attended === true
            );

            return (
              <div className="space-y-5 animate-fade-in">
                <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-2">
                      <Award className="h-5 w-5 text-amber-500" /> Meus Certificados
                    </h3>
                    <p className="text-xs text-slate-400">Certificados oficiais de minicursos, palestras e extensões acadêmicas com validação digital.</p>
                  </div>
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-black text-xs rounded-full self-start sm:self-auto">
                    {myCertRecords.length} Certificado(s) Emitido(s)
                  </span>
                </div>

                {myCertRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                    <Award className="h-10 w-10 text-slate-300 mb-1" />
                    <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Nenhum certificado disponível ainda</h4>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Assim que você participar de minicursos, eventos ou concluir disciplinas de extensão, seus certificados homologados aparecerão nesta aba.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myCertRecords.map(part => {
                      const evt = eventsList.find(e => e.id === part.eventId);
                      const title = evt ? evt.title : 'Minicurso Acadêmico';
                      const instructor = evt ? evt.instructor : 'Corpo Docente';
                      const hours = evt ? evt.workloadHours : 20;

                      const handleViewCert = () => {
                        if (part.certificateUrl) {
                          // PDF file uploaded by admin
                          const win = window.open(part.certificateUrl, '_blank');
                          if (!win) {
                            setSelectedCertModal({
                              title: `Certificado Oficial - ${title}`,
                              pdfUrl: part.certificateUrl,
                              pdfName: part.certificateFileName || 'Certificado.pdf'
                            });
                          }
                        } else {
                          // Automatic HTML template certificate
                          const templates = getOfficialTemplates();
                          const certTpl = templates.find(t => t.docType === 'CERTIFICADO') || templates[0];
                          const html = (certTpl?.contentHtml || `
                            <div style="padding: 40px; text-align: center; border: 12px double #1e3a8a; font-family: 'Times New Roman', serif; background-color: #f8fafc; color: #0f172a;">
                              <h1 style="font-size: 32px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; margin-bottom: 20px;">CERTIFICADO DE CONCLUSÃO</h1>
                              <p style="font-size: 16px; margin-bottom: 20px;">A Diretoria Acadêmica do Colégio e Faculdade Oswaldo Cruz certifica que</p>
                              <h2 style="font-size: 26px; font-weight: bold; color: #1d4ed8; text-decoration: underline; margin-bottom: 20px;">{NOME_ALUNO}</h2>
                              <p style="font-size: 15px; line-height: 1.8; margin-bottom: 30px;">
                                Participou e concluiu com êxito o minicurso de extensão de <strong>{CURSO}</strong>, com carga horária total de <strong>{CARGA_HORARIA} horas complementares</strong>, sob instrução do(a) prof(a) <strong>{PROFESSOR}</strong>.
                              </p>
                              <div style="margin-top: 50px; display: flex; justify-content: space-around; align-items: flex-end;">
                                <div style="text-align: center; border-top: 1px solid #334155; width: 220px; padding-top: 5px; font-size: 12px;">{PROFESSOR}<br/>Instrutor / Docente</div>
                                <div style="text-align: center; border-top: 1px solid #334155; width: 220px; padding-top: 5px; font-size: 12px;">Direção Acadêmica<br/>Colégio Oswaldo Cruz</div>
                              </div>
                            </div>
                          `)
                            .replace(/{NOME_ALUNO}/g, escapeHtml(activeStudent.name))
                            .replace(/{CPF}/g, escapeHtml(activeStudent.enrollment || ''))
                            .replace(/{CURSO}/g, escapeHtml(title))
                            .replace(/{CARGA_HORARIA}/g, escapeHtml(hours.toString()))
                            .replace(/{DATA}/g, escapeHtml(evt ? new Date(evt.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')))
                            .replace(/{PROFESSOR}/g, escapeHtml(instructor));

                          setSelectedCertModal({
                            title: `Certificado Oficial - ${title}`,
                            contentHtml: html
                          });
                        }
                      };

                      return (
                        <div key={part.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-extrabold text-[9px] rounded uppercase tracking-wider flex items-center gap-1">
                                <Award className="h-3 w-3 text-amber-500" /> {hours} Horas
                              </span>
                              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/50">
                                ✓ HOMOLOGADO
                              </span>
                            </div>

                            <h4 className="font-black text-sm text-slate-900 dark:text-white leading-snug">
                              {title}
                            </h4>

                            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 font-medium">
                              <div>Instrutor: <strong className="text-slate-800 dark:text-slate-200">{instructor}</strong></div>
                              <div>Emitido em: {part.issueDate ? new Date(part.issueDate).toLocaleDateString('pt-BR') : '2026'}</div>
                              <div className="font-mono text-[10px] text-slate-400">Código de Autenticidade: CERT-{part.id.substring(0, 8).toUpperCase()}</div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleViewCert}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/15 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <FileCheck className="h-4 w-4" /> Visualizar / Baixar Certificado (PDF)
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB: HISTÓRICO COMPLETO */}
          {activeSubTab === 'historico_completo' && (() => {
            const studentGrades = grades.filter(g => g.studentId === activeStudent.id);
            const uniqueClassIds = Array.from(new Set(studentGrades.map(g => g.classId)));
            const studentClasses = classes.filter(c => uniqueClassIds.includes(c.id));

            studentClasses.sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              if (a.semester !== b.semester) return a.semester - b.semester;
              return a.module - b.module;
            });

            return (
              <div className="space-y-5 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-150 dark:border-slate-800">
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Histórico Escolar Completo</h3>
                    <p className="text-xs text-slate-400">Consulte todo o seu aproveitamento acadêmico ao longo do curso.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrintHistorico(true)}
                    className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all cursor-pointer select-none uppercase tracking-wide shrink-0 self-start sm:self-center"
                  >
                    <Printer className="h-4 w-4" /> Gerar Histórico Completo (PDF)
                  </button>
                </div>

                {studentClasses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <History className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                    <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1">Nenhum Registro Encontrado</h4>
                    <p className="text-xs text-slate-400 max-w-sm">Você ainda não possui registros de notas e frequências lançados no sistema.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {studentClasses.map(cls => {
                      const classGrades = studentGrades.filter(g => g.classId === cls.id);
                      const clsSubjects = subjects.filter(s => s.courseId === cls.courseId && s.module === cls.module);

                      return (
                        <div key={cls.id} className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
                          {/* Group Header */}
                          <div className="bg-slate-50 dark:bg-slate-850/70 p-4 border-b border-slate-150 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
                                <tr className="bg-slate-50 dark:bg-slate-850/35 border-b border-slate-150 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                                  const absences = getStudentAbsences(activeStudent.id, sub.id, cls.id);
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
                                          {score ? (score.result === 'F. NOTA' ? 'REP. FALTAS' : score.result) : 'Pendente'}
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
                )}
              </div>
            );
          })()}

        </div>

        {/* Right: Notifications & Deadlines Column */}
        <div className="md:col-span-4 space-y-4">
          
          {/* OC Carreira IA - Premium Highlighted Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 border-2 border-emerald-400/40 p-5 shadow-lg select-none group hover:border-emerald-400 transition-all duration-300"
          >
            {/* Ambient glows */}
            <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-emerald-500/15 rounded-full blur-2xl group-hover:bg-emerald-500/25 transition-all duration-500"></div>
            <div className="absolute -left-6 -top-6 w-20 h-20 bg-blue-500/15 rounded-full blur-xl"></div>

            <div className="relative z-10 space-y-4">
              {/* Brand Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* High-fidelity Brand Logo mimicking the user's attachment */}
                  <div className="h-8 w-8 bg-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-400/20 shrink-0 font-extrabold text-slate-950 text-xs tracking-tighter select-none">
                    oc
                  </div>
                  <div className="font-black text-base tracking-tight leading-none text-white select-none">
                    Carreira <span className="text-emerald-400">IA</span>
                  </div>
                </div>
                <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 rounded-full uppercase tracking-wider animate-pulse">
                  <Sparkles className="h-3 w-3 text-emerald-400" /> Ativo
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                Descubra o seu futuro profissional! Faça testes vocacionais e explore oportunidades de carreira personalizadas com nossa inteligência artificial oficial.
              </p>

              {/* Call to Action Button */}
              <a
                href="https://col-gio-oswaldo-cruz-carreira-ia-199284089949.us-east1.run.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-400 hover:bg-emerald-350 active:scale-[0.98] text-slate-950 font-black rounded-2xl text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-400/20 hover:shadow-emerald-400/30 transition-all duration-200 cursor-pointer text-center"
              >
                <span>Acessar OC Carreira IA</span>
                <ExternalLink className="h-4 w-4 text-slate-950 shrink-0" />
              </a>
            </div>
          </motion.div>
          
          {/* Notifications Inbox (Avisos e Notificações) */}
          <div className="bg-gradient-to-b from-blue-50/30 to-white dark:from-blue-950/10 dark:to-slate-900 border-2 border-blue-200/80 dark:border-blue-900/50 p-5 rounded-2xl shadow-md space-y-3 relative overflow-hidden animate-fade-in">
            {/* Pulsing visual glow effect in the corner */}
            <div className="absolute right-0 top-0 w-16 h-16 bg-blue-500/5 rounded-full blur-lg pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/40 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Bell className="h-4.5 w-4.5 text-blue-700 dark:text-blue-400" />
                  <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                </div>
                <h4 className="font-black text-xs text-blue-800 dark:text-blue-300 uppercase tracking-wider">Avisos e Notificações</h4>
              </div>
              <span className="text-[9px] bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-black animate-pulse">
                {studentNotifications.length} {studentNotifications.length === 1 ? 'Aviso' : 'Avisos'}
              </span>
            </div>

            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {studentNotifications.length > 0 ? (
                studentNotifications.map((not, idx) => (
                  <div 
                    key={not.id} 
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs transition-all ${
                      idx === 0 
                        ? 'bg-amber-500/5 dark:bg-amber-500/5 border-amber-200 dark:border-amber-900/50 shadow-sm' 
                        : 'bg-white dark:bg-slate-850/50 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <CheckCircle className={`h-4.5 w-4.5 flex-shrink-0 mt-0.5 ${
                      idx === 0 ? 'text-amber-500 animate-pulse' : 'text-blue-600 dark:text-blue-400'
                    }`} />
                    <div className="space-y-1">
                      <p className={`leading-relaxed text-[11px] ${
                        idx === 0 ? 'text-slate-800 dark:text-slate-200 font-bold' : 'text-slate-600 dark:text-slate-400'
                      }`}>{not.content}</p>
                      <span className="text-[9px] text-slate-400 mt-1 block flex items-center gap-1 font-semibold">
                        <Clock className="h-3 w-3 text-slate-400" /> {not.date.substring(11, 16)}h do dia {not.date.substring(5, 10).replace('-', '/')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhum aviso ou nota nova lançada recentemente.</p>
              )}
            </div>
          </div>

          {/* Direct Messages from Pedagogical Coordination */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Bell className="h-4.5 w-4.5 text-blue-700 dark:text-blue-400" />
                <h4 className="font-bold text-xs text-slate-700 dark:text-white uppercase tracking-wider">Comunicados da Coordenação</h4>
              </div>
              <span className="text-[9px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-black">
                {studentMessages.length} {studentMessages.length === 1 ? 'Mensagem' : 'Mensagens'}
              </span>
            </div>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {studentMessages.length > 0 ? (
                studentMessages.map((msg, idx) => (
                  <div key={msg.id} className="p-3 bg-slate-50/50 dark:bg-slate-850/30 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl space-y-2.5 text-xs">
                    <div className="flex items-center justify-between font-extrabold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1 text-[11px]">
                        {idx === 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>}
                        {msg.senderName}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-slate-850 px-1.5 py-0.5 rounded-md font-mono font-semibold">
                        {new Date(msg.date).toLocaleDateString('pt-BR')} {new Date(msg.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {msg.content && (
                      <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{msg.content}</p>
                    )}

                    {msg.attachmentUrl && (
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-850/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="p-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-md shrink-0">
                            {msg.attachmentType === 'pdf' ? (
                              <FileText className="h-3.5 w-3.5" />
                            ) : msg.attachmentType === 'image' ? (
                              <ImageIcon className="h-3.5 w-3.5" />
                            ) : (
                              <Mic className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span className="font-extrabold text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[120px] sm:max-w-[180px]">
                            {msg.attachmentName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 justify-end w-full sm:w-auto">
                          {msg.attachmentType === 'audio' && (
                            <audio src={msg.attachmentUrl} controls className="h-6 w-[130px] sm:w-[150px]" />
                          )}
                          {msg.attachmentType === 'image' && (
                            <img src={msg.attachmentUrl} alt="Preview" referrerPolicy="no-referrer" className="h-6 w-6 rounded object-cover border border-slate-200" />
                          )}
                          <a
                            href={msg.attachmentUrl}
                            download={msg.attachmentName || 'arquivo'}
                            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black rounded-md flex items-center gap-0.5 cursor-pointer transition-all select-none"
                          >
                            <Download className="h-2.5 w-2.5" /> Baixar
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center italic">Nenhum comunicado individual da coordenação recebido.</p>
              )}
            </div>
          </div>

          {/* Calendar Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Calendar className="h-4 w-4 text-blue-700 dark:text-blue-400" />
              <h4 className="font-bold text-xs text-slate-700 dark:text-white uppercase tracking-wider">Calendário Acadêmico</h4>
            </div>

            <div className="space-y-2">
              {calendarEvents.map(evt => {
                const month = evt.date.substring(5, 7);
                const months: Record<string, string> = {
                  '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'ABR',
                  '05': 'MAI', '06': 'JUN', '07': 'JUL', '08': 'AGO',
                  '09': 'SET', '10': 'OUT', '11': 'NOV', '12': 'DEZ'
                };
                const monthAbbr = months[month] || 'JUN';
                const isConselho = evt.type === 'INFO' && evt.title.includes('Conselho');
                const title = isConselho ? `Conselho de Classe de ${currentPeriod}` : evt.title;
                return (
                  <div key={evt.id} className="flex gap-3 items-start py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="p-2 bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 rounded-lg text-center leading-none min-w-[36px]">
                      <span className="block text-[8px] font-bold uppercase">{monthAbbr}</span>
                      <span className="block text-sm font-black mt-0.5">{evt.date.substring(8, 10)}</span>
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-slate-700 dark:text-slate-200">{title}</p>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{evt.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Printing Modal */}
      {printDoc && (
        <PrintModal
          documentType="boletim"
          studentId={activeStudent.id}
          classId={targetClass?.id || 'class_enf_m1_matutino'}
          subjectId={studentSubjects[0]?.id || ''}
          onClose={() => setPrintDoc(false)}
        />
      )}

      {/* Printing Modal for Declarations */}
      {printDeclType && (
        <PrintModal
          documentType={printDeclType}
          studentId={activeStudent.id}
          classId={targetClass?.id || 'class_enf_m1_matutino'}
          subjectId={studentSubjects[0]?.id || ''}
          onClose={() => setPrintDeclType(null)}
        />
      )}

      {/* Printing Modal for Complete Academic History */}
      {printHistorico && (
        <PrintModal
          documentType="historico_completo"
          studentId={activeStudent.id}
          classId={targetClass?.id || 'class_enf_m1_matutino'}
          subjectId={''}
          onClose={() => setPrintHistorico(false)}
        />
      )}

      {/* MODAL DE SIMULAÇÃO DE UPLOAD */}
      {uploadingDocName && (() => {
        // Descobre se isto é um primeiro envio ou uma substituição de um
        // arquivo que já estava "aguardando análise" — muda o texto do
        // modal para deixar claro que o arquivo antigo será substituído.
        const docSendoEnviado = studentDocuments.find(
          d => d.studentId === activeStudent.id && d.name === uploadingDocName
        );
        const ehReenvio = docSendoEnviado?.status === 'ENVIADO';

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-xl border border-slate-150 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800">
              <div>
                <h4 className="font-extrabold text-slate-800 dark:text-white text-sm">{ehReenvio ? 'Reenviar Documento' : 'Enviar Documento'}</h4>
                <p className="text-[10px] text-slate-400">
                  {ehReenvio
                    ? `Isto substitui o arquivo que você já enviou de ${uploadingDocName}, antes de alguém analisar.`
                    : `Entrega digital de ${uploadingDocName}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadingDocName(null);
                  setArquivoEscolhido(null);
                  setErroEnvio('');
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Selecione o arquivo correspondente ao documento para submissão e análise da secretaria acadêmica.
              </p>

              {/* Input File Box */}
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 rounded-2xl p-6 text-center transition-all relative">
                <input
                  type="file"
                  id="simulated-file-input"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setErroEnvio('');
                    if (file) setArquivoEscolhido(file);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="space-y-2 pointer-events-none">
                  <UploadCloud className="h-8 w-8 text-slate-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {arquivoEscolhido ? (
                      <span className="text-blue-600 dark:text-blue-400">{arquivoEscolhido.name}</span>
                    ) : (
                      <span>Clique para selecionar ou arraste o arquivo</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {arquivoEscolhido
                      ? `Tamanho: ${(arquivoEscolhido.size / 1048576).toFixed(2)} MB`
                      : 'PDF, JPG, PNG ou WEBP, até 5 MB'}
                  </p>
                </div>
              </div>

              {erroEnvio ? (
                <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 text-[10px] text-amber-800 dark:text-amber-300 leading-normal">
                  <strong>O documento não foi enviado.</strong> {erroEnvio}
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 text-[10px] text-blue-700 dark:text-blue-400 leading-normal">
                  O arquivo fica guardado em área privada. Só você e a secretaria têm acesso.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-150 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setUploadingDocName(null);
                  setArquivoEscolhido(null);
                  setErroEnvio('');
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!arquivoEscolhido || enviandoArquivo}
                onClick={async () => {
                  if (!arquivoEscolhido || !uploadingDocName) return;
                  setEnviandoArquivo(true);
                  setErroEnvio('');

                  // O ARQUIVO SÓ SOBE UMA VEZ, E O STATUS SÓ MUDA SE ELE SUBIU.
                  //
                  // Antes o botão gravava um endereço FIXO e inventado, de um
                  // PDF de demonstração do Firebase — o mesmo para todos os
                  // alunos. Marcar "ENVIADO" antes de ter arquivo é o erro que
                  // fazia o aluno acreditar que entregou.
                  const envio = await enviarArquivoDeDocumento(
                    activeStudent.id, uploadingDocName, arquivoEscolhido
                  );
                  if (!envio.ok || !envio.caminho) {
                    setErroEnvio(envio.erro || 'Não foi possível enviar o arquivo.');
                    setEnviandoArquivo(false);
                    return;
                  }

                  updateStudentDocumentStatus(
                    `doc_${activeStudent.id}_${uploadingDocName}`,
                    'ENVIADO',
                    envio.caminho,
                    arquivoEscolhido.name
                  );
                  setEnviandoArquivo(false);
                  setUploadingDocName(null);
                  setArquivoEscolhido(null);
                }}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow transition-all uppercase tracking-wider ${
                  arquivoEscolhido && !enviandoArquivo
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/15 cursor-pointer'
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                }`}
              >
                {enviandoArquivo ? 'Enviando…' : 'Confirmar Envio'}
              </button>
            </div>
          </motion.div>
        </div>
        );
      })()}

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-black animate-fade-in ${
          toastMsg.type === 'success'
            ? 'bg-emerald-900 text-emerald-100 border-emerald-500/40'
            : 'bg-rose-900 text-rose-100 border-rose-500/40'
        }`}>
          <span>{toastMsg.message}</span>
          <button 
            type="button" 
            onClick={() => setToastMsg(null)}
            className="p-1 hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* MODAL DE PENDÊNCIAS PARA INSCRIÇÃO DE ESTÁGIO */}
      {pendencyModalVac && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Pendências para Liberação do Estágio
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPendencyModalVac(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                A vaga <strong className="text-blue-600 dark:text-blue-400">{pendencyModalVac.companyName || pendencyModalVac.stageName}</strong> exige homologação dos seguintes pré-requisitos antes da confirmação da matrícula:
              </p>

              <div className="space-y-2.5">
                {pendencyList.map(item => (
                  <div key={item.id} className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2 text-xs font-black text-rose-700 dark:text-rose-400">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                      <span>{item.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-350 pl-6">
                      {item.details}
                    </p>

                    {item.type === 'insurance' && (
                      <div className="pt-2 pl-6">
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem(`insurance_paid_${activeStudent.id}`, 'true');
                            saveMiscPaymentCatalog({
                              id: `misc_ins_${Date.now()}`,
                              name: 'Taxa de Seguro de Estágio Obrigatório',
                              category: 'ESTAGIO',
                              defaultValue: 150,
                              description: 'Seguro individual contra acidentes',
                              active: true,
                              blockedActions: []
                            }, activeStudent.name);
                            setToastMsg({ type: 'success', message: 'Taxa de seguro de R$ 150,00 quitada e ativada no financeiro!' });
                            
                            // Re-filter pendencies
                            const rem = pendencyList.filter(p => p.type !== 'insurance');
                            setPendencyList(rem);
                            if (rem.length === 0 && pendencyModalVac) {
                              const currentAllocated = pendencyModalVac.studentsAllocated || [];
                              saveStageVacancy({
                                ...pendencyModalVac,
                                studentsAllocated: [
                                  ...currentAllocated,
                                  {
                                    studentId: activeStudent.id,
                                    studentName: activeStudent.name,
                                    enrollmentNumber: activeStudent.enrollment || 'ALU-2026',
                                    status: 'MATRICULADO'
                                  }
                                ]
                              }, activeStudent.name);
                              setToastMsg({ type: 'success', message: 'Inscrição efetuada com sucesso após quitação do seguro!' });
                              setPendencyModalVac(null);
                            }
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <DollarSign className="h-3.5 w-3.5" /> Pagar e Regularizar Taxa de Seguro (R$ 150,00)
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPendencyModalVac(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL IMPRESSÃO/VISUALIZAÇÃO DE CERTIFICADO */}
      {selectedCertModal && (
        <MovimentacaoDocumentPrintModal
          title={selectedCertModal.title}
          subtitle={selectedCertModal.pdfName || 'Certificado Oficial Emitido'}
          contentHtml={selectedCertModal.contentHtml}
          onClose={() => setSelectedCertModal(null)}
        />
      )}
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BookOpen, Calendar, HelpCircle, BellRing, ClipboardList, CheckCircle2, 
  ChevronRight, CalendarDays, Inbox, AlertCircle, RefreshCw,
  Maximize2, Minimize2, X, Minus, ExternalLink, AlertTriangle, Clock, Sparkles,
  FileText, Image as ImageIcon, Mic, Download
} from 'lucide-react';
import { GradeJournal } from './GradeJournal';
import { AttendanceJournal } from './AttendanceJournal';
import { motion } from 'motion/react';

export const TeacherDashboard: React.FC = () => {
  const { 
    classes, subjects, courses, currentUser, activeClassId, activeSubjectId, 
    setActiveClassId, setActiveSubjectId, messages, notifications, calendarEvents,
    currentPeriod, simulatedDate
  } = useApp();

  const [journalView, setJournalView] = useState<'grades' | 'attendance'>('grades');
  const [gradeWindowState, setGradeWindowState] = useState<'closed' | 'open' | 'minimized'>('closed');
  const [isGradeWindowMaximized, setIsGradeWindowMaximized] = useState<boolean>(false);
  const [attendanceWindowState, setAttendanceWindowState] = useState<'closed' | 'open' | 'minimized'>('closed');
  const [isAttendanceWindowMaximized, setIsAttendanceWindowMaximized] = useState<boolean>(false);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(true);

  // Helper to calculate days remaining
  const getDaysRemaining = (targetDateStr: string, currentDateStr: string): number => {
    if (!targetDateStr || !currentDateStr) return 999;
    const target = new Date(targetDateStr + 'T00:00:00');
    const current = new Date(currentDateStr + 'T00:00:00');
    const diffTime = target.getTime() - current.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Parse active period
  const [yearStr, semStr] = currentPeriod.split('/');
  const currentYear = parseInt(yearStr) || 2026;
  const currentSemester = parseInt(semStr) || 1;

  // Filter classes belonging to the active academic period and assigned to this teacher
  const activePeriodClasses = classes.filter(c => {
    const isPeriod = c.year === currentYear && c.semester === currentSemester;
    if (!isPeriod) return false;
    
    // If teacher has assigned journals, filter only classes that they are assigned to
    if (currentUser?.assignedJournals) {
      return currentUser.assignedJournals.some(aj => aj.classId === c.id);
    }
    return false;
  });

  // Calculate the total count of active journals (class-subject combinations) assigned to the teacher in this period
  const activeJournalsCount = currentUser?.assignedJournals
    ? currentUser.assignedJournals.filter(aj => {
        const cls = classes.find(c => c.id === aj.classId);
        return cls && cls.year === currentYear && cls.semester === currentSemester;
      }).length
    : 0;

  // Selected class
  const selectedClass = activePeriodClasses.find(c => c.id === activeClassId) || activePeriodClasses[0];

  // Subjects corresponding to the selected class and assigned to this teacher
  const classSubjects = selectedClass 
    ? subjects.filter(s => {
        const isMatch = s.courseId === selectedClass.courseId && s.module === selectedClass.module;
        if (!isMatch) return false;
        
        if (currentUser?.assignedJournals) {
          return currentUser.assignedJournals.some(aj => aj.classId === selectedClass.id && aj.subjectId === s.id);
        }
        return false;
      })
    : [];

  // Selected subject
  const selectedSubject = classSubjects.find(s => s.id === activeSubjectId) || classSubjects[0];

  // Keep state synchronized
  React.useEffect(() => {
    if (selectedClass && selectedClass.id !== activeClassId) {
      setActiveClassId(selectedClass.id);
    }
  }, [selectedClass, activeClassId, setActiveClassId]);

  React.useEffect(() => {
    if (selectedSubject && selectedSubject.id !== activeSubjectId) {
      setActiveSubjectId(selectedSubject.id);
    }
  }, [selectedSubject, activeSubjectId, setActiveSubjectId]);

  const s1Event = calendarEvents.find(e => e.type === 'CLOSING_S1');
  const s2Event = calendarEvents.find(e => e.type === 'CLOSING_S2');
  const defEvent = calendarEvents.find(e => e.type === 'DEFINITIVE_CLOSING');
  const conselhoEvent = calendarEvents.find(e => e.id === 'cal_4' || (e.type === 'INFO' && e.title.includes('Conselho')));

  const s1Date = s1Event?.date || '';
  const s2Date = s2Event?.date || '';
  const defDate = defEvent?.date || '';
  const conselhoDate = conselhoEvent?.date || '';

  const s1Days = getDaysRemaining(s1Date, simulatedDate);
  const s2Days = getDaysRemaining(s2Date, simulatedDate);
  const defDays = getDaysRemaining(defDate, simulatedDate);
  const conselhoDays = getDaysRemaining(conselhoDate, simulatedDate);

  const s1Approaching = s1Days >= 0 && s1Days <= 5;
  const s2Approaching = s2Days >= 0 && s2Days <= 5;
  const defApproaching = defDays >= 0 && defDays <= 5;

  const hasApproachingDeadline = s1Approaching || s2Approaching || defApproaching;

  const activeAlerts = [
    { name: 'Fechamento do Módulo S1', days: s1Days, date: s1Date, active: s1Approaching },
    { name: 'Fechamento do Módulo S2', days: s2Days, date: s2Date, active: s2Approaching },
    { name: 'Fechamento Geral Definitivo', days: defDays, date: defDate, active: defApproaching }
  ].filter(a => a.active);

  const formatDaysText = (days: number) => {
    if (days === 0) return 'encerra HOJE';
    if (days === 1) return 'encerra AMANHÃ';
    return `encerra em ${days} dias`;
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const targetClass = selectedClass;
  const targetSubject = selectedSubject;

  // Filter messages for teachers
  const teacherMessages = messages.filter(m => m.recipientId === 'ALL_TEACHERS' || m.recipientId === currentUser?.id);
  const teacherNotifications = notifications.filter(n => n.userId === currentUser?.id);

  return (
    <div id="teacher-dashboard-container" className="space-y-6">

      {/* Warning Popup Modal */}
      {showWarningModal && hasApproachingDeadline && activeAlerts.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border-2 border-red-500 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-4"
          >
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-100 dark:bg-red-950/40 rounded-2xl">
                <AlertTriangle className="h-8 w-8 animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">ALERTA DE PRAZO SE ESGOTANDO!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Atenção Professor(a)</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-150/40 dark:border-red-900/30 rounded-2xl space-y-3">
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                Identificamos que existem prazos de lançamentos de diários prestes a se encerrar neste período letivo (<span className="font-bold">{currentPeriod}</span>). Por favor, certifique-se de realizar todos os lançamentos para evitar bloqueios automáticos:
              </p>
              
              <div className="space-y-2">
                {activeAlerts.map(alert => (
                  <div key={alert.name} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-red-200/50 dark:border-red-900/30 text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-200">{alert.name}</span>
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 rounded-lg animate-pulse">
                      {formatDaysText(alert.days)} ({formatDateBR(alert.date)})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-750 text-white rounded-2xl text-xs font-bold shadow-lg shadow-red-600/20 transition-all cursor-pointer text-center"
              >
                Entendido, vou realizar os lançamentos
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Teacher Welcoming and Portal Information */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-3xl shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-blue-500/5 dark:bg-blue-500/3 rounded-full blur-2xl pointer-events-none"></div>

        <div>
          <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase rounded-lg tracking-wider border border-blue-100 dark:border-blue-900/30">
            Painel Docente Ativo • Período {currentPeriod}
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight mt-1.5">
            Olá, {currentUser?.name || 'Professor(a)'}!
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Matrícula: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{currentUser?.enrollment || currentUser?.username}</span> | Email: {currentUser?.email}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl text-center min-w-[100px]">
            <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Diários Ativos</span>
            <span className="block text-lg font-black text-blue-700 dark:text-blue-400 mt-0.5">
              {activeJournalsCount}
            </span>
          </div>
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl text-center min-w-[100px]">
            <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Simulação</span>
            <span className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mt-1.5">
              {formatDateBR(simulatedDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Programação de Prazos em Destaque */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <CalendarDays className="h-5 w-5 text-blue-700 dark:text-blue-400" />
          <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">Cronograma de Prazos do Período ({currentPeriod})</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* S1 Deadline Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            s1Days < 0 
              ? 'bg-slate-50/50 dark:bg-slate-850/10 border-slate-150 dark:border-slate-800/80 opacity-70' 
              : s1Days <= 5 
                ? 'bg-red-50/40 dark:bg-red-950/10 border-red-200/60 dark:border-red-900/40 shadow-sm shadow-red-500/5 shadow-red-500/10' 
                : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800'
          }`}>
            <div className="flex justify-between items-start">
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[9px] font-extrabold rounded-md uppercase">Módulo S1</span>
              {s1Days < 0 ? (
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold rounded">Bloqueado</span>
              ) : s1Days <= 5 ? (
                <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-[9px] font-extrabold rounded animate-pulse">
                  {s1Days === 0 ? 'Hoje!' : `${s1Days} d`}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold rounded">
                  {s1Days} d restantes
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2.5">Fechamento do Módulo S1</p>
            <p className="text-xs font-mono font-bold text-slate-850 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{formatDateBR(s1Date)}</span>
            </p>
          </div>

          {/* S2 Deadline Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            s2Days < 0 
              ? 'bg-slate-50/50 dark:bg-slate-850/10 border-slate-150 dark:border-slate-800/80 opacity-70' 
              : s2Days <= 5 
                ? 'bg-red-50/40 dark:bg-red-950/10 border-red-200/60 dark:border-red-900/40 shadow-sm shadow-red-500/5 shadow-red-500/10' 
                : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800'
          }`}>
            <div className="flex justify-between items-start">
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-[9px] font-extrabold rounded-md uppercase">Módulo S2</span>
              {s2Days < 0 ? (
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold rounded">Bloqueado</span>
              ) : s2Days <= 5 ? (
                <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-[9px] font-extrabold rounded animate-pulse">
                  {s2Days === 0 ? 'Hoje!' : `${s2Days} d`}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold rounded">
                  {s2Days} d restantes
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2.5">Fechamento do Módulo S2</p>
            <p className="text-xs font-mono font-bold text-slate-850 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{formatDateBR(s2Date)}</span>
            </p>
          </div>

          {/* Definitive Deadline Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            defDays < 0 
              ? 'bg-slate-50/50 dark:bg-slate-850/10 border-slate-150 dark:border-slate-800/80 opacity-70' 
              : defDays <= 5 
                ? 'bg-red-50/40 dark:bg-red-950/10 border-red-200/60 dark:border-red-900/40 shadow-sm shadow-red-500/5 shadow-red-500/10' 
                : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800'
          }`}>
            <div className="flex justify-between items-start">
              <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-[9px] font-extrabold rounded-md uppercase">Fechamento Geral</span>
              {defDays < 0 ? (
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold rounded">Bloqueado</span>
              ) : defDays <= 5 ? (
                <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-[9px] font-extrabold rounded animate-pulse">
                  {defDays === 0 ? 'Hoje!' : `${defDays} d`}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold rounded">
                  {defDays} d restantes
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2.5">Bloqueio Geral do Portal</p>
            <p className="text-xs font-mono font-bold text-slate-850 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{formatDateBR(defDate)}</span>
            </p>
          </div>

          {/* Conselho de Classe Card */}
          <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800">
            <div className="flex justify-between items-start">
              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[9px] font-extrabold rounded-md uppercase">Conselho</span>
              {conselhoDays < 0 ? (
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold rounded">Concluído</span>
              ) : (
                <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[9px] font-bold rounded">
                  {conselhoDays} d restantes
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2.5">Conselho de Classe de {currentPeriod}</p>
            <p className="text-xs font-mono font-bold text-slate-850 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-amber-500" />
              <span>{formatDateBR(conselhoDate)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* High-visibility Urgent Notice Banner */}
      {teacherMessages.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 dark:bg-amber-500/5 border-2 border-amber-500/70 dark:border-amber-500/40 p-4 rounded-2xl shadow-md flex items-start gap-4 select-none relative overflow-hidden animate-pulse-slow"
        >
          {/* Ambient background glow */}
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0 shadow-lg shadow-amber-500/20 mt-0.5">
            <BellRing className="h-5 w-5 animate-bounce" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400">
                COMUNICADO URGENTE DA COORDENAÇÃO
              </span>
              <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-800 dark:text-amber-400 font-extrabold rounded uppercase tracking-wider">
                Novo aviso
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold ml-auto">
                {teacherMessages[0].date.substring(5, 10).replace('-', '/')} às {teacherMessages[0].date.substring(11, 16)}h
              </span>
            </div>
            <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-amber-100 leading-relaxed">
              {teacherMessages[0].content}
            </p>
          </div>
        </motion.div>
      )}

      {/* Subject and Journal Selection Matrix */}
      <div className="grid md:grid-cols-12 gap-6 select-none">
        
        {/* Left Side: Subject Selector and Status */}
        <div className="md:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <ClipboardList className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              <h4 className="font-extrabold text-slate-800 dark:text-white">Meus Diários Ativos</h4>
            </div>

            {/* Class info & Selection */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Selecione a Turma</p>
              {activePeriodClasses.length > 0 ? (
                <select
                  value={targetClass?.id || ''}
                  onChange={(e) => {
                    const classId = e.target.value;
                    setActiveClassId(classId);
                    const assignedSubjectIdsForThisClass = currentUser?.assignedJournals
                      ? currentUser.assignedJournals.filter(j => j.classId === classId).map(j => j.subjectId)
                      : [];
                    const firstSub = subjects.find(s => {
                      const cls = classes.find(c => c.id === classId);
                      return cls && s.courseId === cls.courseId && s.module === cls.module && assignedSubjectIdsForThisClass.includes(s.id);
                    });
                    if (firstSub) {
                      setActiveSubjectId(firstSub.id);
                    }
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-extrabold text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                >
                  {activePeriodClasses.map(cls => {
                    const courseName = courses.find(co => co.id === cls.courseId)?.name || 'Curso';
                    const codePrefix = cls.code ? `[${cls.code}] ` : '';
                    return (
                      <option key={cls.id} value={cls.id}>
                        {codePrefix}{cls.name} ({courseName})
                      </option>
                    );
                  })}
                </select>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                  Nenhuma turma ou diário atribuído pelo administrador para você neste período ({currentPeriod}).
                </p>
              )}
            </div>

            {/* Subjects select list */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Selecione a Matéria</p>
              {classSubjects.length > 0 ? (
                classSubjects.map(sub => {
                  const isActive = sub.id === targetSubject?.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setActiveSubjectId(sub.id)}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between border ${
                        isActive 
                          ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30 text-blue-700 dark:text-blue-300' 
                          : 'bg-white dark:bg-slate-900 border-slate-150/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50/50'
                      }`}
                    >
                      <span className="truncate pr-2">{sub.name}</span>
                      <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'rotate-90 text-blue-600' : 'text-slate-300'}`} />
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 p-2 text-center italic">Sem disciplinas disponíveis.</p>
              )}
            </div>
          </div>

          {/* Pedagógica Inbox Box (Avisos da Coordenação) */}
          <div className="bg-gradient-to-b from-blue-50/30 to-white dark:from-blue-950/10 dark:to-slate-900 border-2 border-blue-200/80 dark:border-blue-900/50 p-5 rounded-2xl shadow-md space-y-3 relative overflow-hidden animate-fade-in">
            {/* Pulsing visual glow effect in the corner */}
            <div className="absolute right-0 top-0 w-16 h-16 bg-blue-500/5 rounded-full blur-lg pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/40 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Inbox className="h-4.5 w-4.5 text-blue-700 dark:text-blue-400" />
                  <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                </div>
                <h5 className="font-black text-xs text-blue-800 dark:text-blue-300 uppercase tracking-wider">Avisos da Coordenação</h5>
              </div>
              <span className="text-[9px] bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-black animate-pulse">
                {teacherMessages.length} {teacherMessages.length === 1 ? 'Aviso' : 'Avisos'}
              </span>
            </div>
            
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {teacherMessages.length > 0 ? (
                teacherMessages.map((msg, idx) => (
                  <div 
                    key={msg.id} 
                    className={`p-3 rounded-xl border space-y-1.5 text-xs transition-all ${
                      idx === 0 
                        ? 'bg-amber-500/5 dark:bg-amber-500/5 border-amber-200 dark:border-amber-900/50 shadow-sm' 
                        : 'bg-white dark:bg-slate-850/50 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-extrabold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1">
                        {idx === 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>}
                        {msg.senderName}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        {msg.date.substring(5, 10).replace('-', '/')}
                      </span>
                    </div>
                    {msg.content && (
                      <p className={`leading-relaxed text-[11px] ${
                        idx === 0 
                          ? 'text-slate-800 dark:text-slate-200 font-bold' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>{msg.content}</p>
                    )}

                    {msg.attachmentUrl && (
                      <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
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
                          <span className="font-extrabold text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[150px] sm:max-w-[200px]">
                            {msg.attachmentName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 justify-end w-full sm:w-auto">
                          {msg.attachmentType === 'audio' && (
                            <audio src={msg.attachmentUrl} controls className="h-6 w-[140px] sm:w-[160px]" />
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
                <p className="text-xs text-slate-400 py-4 text-center">Nenhum aviso emitido hoje.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Active Journal view */}
        <div className="md:col-span-8 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4">
            
            {/* Toggle between grades or attendance */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl max-w-xs select-none">
              <button
                type="button"
                onClick={() => setJournalView('grades')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
                  journalView === 'grades' 
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Diário de Notas
              </button>
              <button
                type="button"
                onClick={() => setJournalView('attendance')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
                  journalView === 'attendance' 
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Frequência (Chamadas)
              </button>
            </div>

            {/* Active view */}
            {journalView === 'grades' ? (
              gradeWindowState === 'closed' ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
                  <div className="p-3.5 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-full w-12.5 h-12.5 flex items-center justify-center mx-auto shadow-sm">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Diário de Notas</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Para facilitar o lançamento e a visualização das notas dos alunos, abra a nova janela interativa com suporte a tela cheia.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGradeWindowState('open');
                      setIsGradeWindowMaximized(false);
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4" /> Lançar Notas (Abrir Janela)
                  </button>
                </div>
              ) : gradeWindowState === 'minimized' ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
                  <div className="p-3.5 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full w-12.5 h-12.5 flex items-center justify-center mx-auto shadow-sm">
                    <BookOpen className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Lançamento de Notas Minimizado</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Você minimizou a janela para navegar ou consultar outras abas. Seus lançamentos estão seguros!
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGradeWindowState('open')}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Maximize2 className="h-4 w-4" /> Restaurar Janela
                    </button>
                    <button
                      type="button"
                      onClick={() => setGradeWindowState('closed')}
                      className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Fechar Diário
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
                  <div className="p-3.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full w-12.5 h-12.5 flex items-center justify-center mx-auto shadow-sm">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Janela de Lançamento Aberta</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      A janela interativa de notas está ativa na sua tela. Use-a para preencher as notas dos alunos confortavelmente.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsGradeWindowMaximized(!isGradeWindowMaximized)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer"
                    >
                      {isGradeWindowMaximized ? 'Restaurar Tamanho' : 'Tela Cheia (Maximizar)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGradeWindowState('minimized')}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer"
                    >
                      Minimizar Janela
                    </button>
                  </div>
                </div>
              )
            ) : (
              attendanceWindowState === 'closed' ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
                  <div className="p-3.5 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-full w-12.5 h-12.5 flex items-center justify-center mx-auto shadow-sm">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Diário de Frequência (Chamadas)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Para preencher e acompanhar as faltas dos alunos de forma ágil, abra a nova janela interativa com visualização de planilha.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAttendanceWindowState('open');
                      setIsAttendanceWindowMaximized(false);
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4" /> Lançar Frequência (Abrir Janela)
                  </button>
                </div>
              ) : attendanceWindowState === 'minimized' ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
                  <div className="p-3.5 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full w-12.5 h-12.5 flex items-center justify-center mx-auto shadow-sm">
                    <Calendar className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Lançamento de Frequência Minimizado</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Você minimizou a janela de chamadas. Seus lançamentos de faltas e datas estão totalmente seguros!
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAttendanceWindowState('open')}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Maximize2 className="h-4 w-4" /> Restaurar Janela
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceWindowState('closed')}
                      className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Fechar Diário
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
                  <div className="p-3.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full w-12.5 h-12.5 flex items-center justify-center mx-auto shadow-sm">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Janela de Lançamento de Frequência Aberta</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      A janela interativa de frequência está ativa na sua tela. Use-a para preencher as chamadas confortavelmente.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsAttendanceWindowMaximized(!isAttendanceWindowMaximized)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer"
                    >
                      {isAttendanceWindowMaximized ? 'Restaurar Tamanho' : 'Tela Cheia (Maximizar)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceWindowState('minimized')}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer"
                    >
                      Minimizar Janela
                    </button>
                  </div>
                </div>
              )
            )}

          </div>
        </div>

      </div>

      {/* Grade Journal Floating Window Window System */}
      {(gradeWindowState === 'open' || gradeWindowState === 'minimized') && (
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
                    Janela de Lançamento de Notas
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
      )}

      {/* Attendance Journal Floating Window System */}
      {(attendanceWindowState === 'open' || attendanceWindowState === 'minimized') && (
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
                    Janela de Lançamento de Frequência (Chamadas)
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
      )}

      {/* Floating dock action to restore minimized window */}
      {gradeWindowState === 'minimized' && (
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
      )}

      {/* Floating dock action to restore minimized attendance window */}
      {attendanceWindowState === 'minimized' && (
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
      )}
    </div>
  );
};

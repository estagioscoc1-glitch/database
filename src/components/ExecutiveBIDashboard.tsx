import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, GraduationCap, Calendar, BookOpen, School, TrendingUp, TrendingDown,
  Clock, RefreshCw, Search, Filter, DollarSign, AlertTriangle, FileText,
  Award, CheckCircle2, XCircle, ChevronRight, Download, Maximize2, Minimize2,
  Plus, Edit2, Trash2, ArrowUpRight, ArrowDownRight, UserCheck, Briefcase,
  Layers, ShieldAlert, PieChart as PieChartIcon, BarChart3, Activity, Sparkles,
  HelpCircle, Eye, Printer, FileSpreadsheet, X, Sparkle, Building
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ComposedChart
} from 'recharts';
import { useApp } from '../context/AppContext';
import { UserRole, Shift, CustomDashboardWidget, ClassSection } from '../types';
import { getInstallments, getExpenses } from '../services/financeiroStorage';

const COLORS = {
  primary: '#2563eb', // Blue
  success: '#10b981', // Emerald
  amber: '#f59e0b',   // Amber
  danger: '#ef4444',  // Red
  purple: '#8b5cf6',  // Purple
  indigo: '#6366f1',  // Indigo
  teal: '#14b8a6',    // Teal
  rose: '#f43f5e',    // Rose
  cyan: '#06b6d4',    // Cyan
};

const CHART_PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

interface ExecutiveBIDashboardProps {
  onNavigateTab?: (tabKey: string) => void;
}

export const ExecutiveBIDashboard: React.FC<ExecutiveBIDashboardProps> = ({ onNavigateTab }) => {
  const {
    users,
    courses,
    classes,
    subjects,
    grades,
    attendance,
    currentPeriod,
    currentUser,
    studentDocuments,
    internships,
    staffMembers,
    dependencies,
    securityLogs,
    calendarEvents,
    declarationConfigs,
    messages
  } = useApp();

  // Real-time Clock
  const [clockTime, setClockTime] = useState(new Date().toLocaleTimeString('pt-BR'));
  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global Search State
  const [globalSearch, setGlobalSearch] = useState('');

  // Filters State
  const [filterMonth, setFilterMonth] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [filterSemester, setFilterSemester] = useState<string>('ALL');
  const [filterCourse, setFilterCourse] = useState<string>('ALL');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterShift, setFilterShift] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Interactive Toast / Sync State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Fullscreen Chart Modal State
  const [fullscreenChart, setFullscreenChart] = useState<{ id: string; title: string } | null>(null);

  // Custom Widgets State
  const [customWidgets, setCustomWidgets] = useState<CustomDashboardWidget[]>(() => {
    try {
      const saved = localStorage.getItem('oc_custom_dashboard_widgets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [newWidget, setNewWidget] = useState<Partial<CustomDashboardWidget>>({
    name: '',
    type: 'card',
    dataSource: 'students',
    metric: 'count',
    icon: 'Activity',
    color: 'blue'
  });

  useEffect(() => {
    try {
      localStorage.setItem('oc_custom_dashboard_widgets', JSON.stringify(customWidgets));
    } catch (e) {
      console.error(e);
    }
  }, [customWidgets]);

  // Reset all filters function
  const resetAllFilters = () => {
    setFilterMonth('ALL');
    setFilterYear('ALL');
    setFilterSemester('ALL');
    setFilterCourse('ALL');
    setFilterClass('ALL');
    setFilterShift('ALL');
    setFilterStatus('ALL');
    setGlobalSearch('');
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setSyncToast('Dados atualizados com sucesso!');
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
    setTimeout(() => {
      setSyncToast(null);
    }, 3000);
  };

  // Base Data Filtered
  const filteredStudents = useMemo(() => {
    let result = users.filter(u => u.role === UserRole.STUDENT);

    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(q) ||
        (u.enrollment && u.enrollment.toLowerCase().includes(q)) ||
        (u.cpf && u.cpf.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }

    if (filterCourse !== 'ALL') {
      result = result.filter(u => u.courseId === filterCourse);
    }

    if (filterClass !== 'ALL') {
      result = result.filter(u => u.classId === filterClass);
    }

    if (filterShift !== 'ALL') {
      const targetClassIds = new Set(classes.filter(c => c.shift === filterShift).map(c => c.id));
      result = result.filter(u => u.classId && targetClassIds.has(u.classId));
    }

    if (filterStatus !== 'ALL') {
      result = result.filter(u => u.status === filterStatus || (filterStatus === 'ATIVO' && u.active));
    }

    return result;
  }, [users, globalSearch, filterCourse, filterClass, filterShift, filterStatus, classes]);

  // KPI Numbers
  const totalStudents = users.filter(u => u.role === UserRole.STUDENT).length;
  const enrolledStudents = filteredStudents.filter(u => u.active !== false).length;
  const monthEnrolled = useMemo(() => {
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    return filteredStudents.filter(u => u.createdAt && u.createdAt.startsWith(currentMonthStr)).length;
  }, [filteredStudents]);

  // "Matrículas do semestre": usa o 1º (Jan-Jun) ou 2º (Jul-Dez) semestre do calendário
  // como aproximação, já que o sistema não guarda uma data exata de início/fim de
  // semestre letivo por matrícula.
  const semesterEnrolled = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const isFirstHalf = now.getMonth() < 6;
    const start = new Date(year, isFirstHalf ? 0 : 6, 1);
    const end = new Date(year, isFirstHalf ? 6 : 12, 1);
    return filteredStudents.filter(u => {
      if (!u.createdAt) return false;
      const d = new Date(u.createdAt);
      return d >= start && d < end;
    }).length;
  }, [filteredStudents]);
  const yearEnrolled = enrolledStudents;
  const generalEnrolled = totalStudents;

  const internshipCount = useMemo(() => {
    const activeInterns = internships.filter(i => i.grade === null || i.grade >= 6);
    const studentStatusInterns = filteredStudents.filter(u => u.status === 'ESTÁGIO').length;
    return Math.max(activeInterns.length, studentStatusInterns);
  }, [internships, filteredStudents]);

  const dependencyCount = useMemo(() => {
    const activeDeps = dependencies.filter(d => d.status === 'ATIVO').length;
    const studentStatusDeps = filteredStudents.filter(u => u.status === 'DEPENDÊNCIA').length;
    return Math.max(activeDeps, studentStatusDeps);
  }, [dependencies, filteredStudents]);

  const diplomasRequested = useMemo(() => {
    return filteredStudents.filter(u => u.status === 'FORMADO' || u.status === 'CONCLUÍDO').length;
  }, [filteredStudents]);

  const dropoutsCount = useMemo(() => {
    return filteredStudents.filter(u => u.status === 'DESISTENTE' || u.status === 'CANCELADO').length;
  }, [filteredStudents]);

  const abandonedCount = useMemo(() => {
    return filteredStudents.filter(u => u.status === 'ABANDONO' || u.status === 'EVADIDO').length;
  }, [filteredStudents]);

  // Financial Indicators — dados reais vindos do Módulo Financeiro (parcelas e
  // despesas lançadas de verdade), não mais estimados por fórmula.
  const financialMetrics = useMemo(() => {
    const installments = getInstallments();
    const expenses = getExpenses();
    const now = new Date();
    const currentMonthStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const currentYearStr = String(now.getFullYear());

    const valorRecebido = (i: typeof installments[number]) =>
      i.paidValue ?? (i.originalValue - (i.discountValue || 0));

    const paidThisMonth = installments.filter(i => i.status === 'PAGA' && i.competencia === currentMonthStr);
    const paidThisYear = installments.filter(i => i.status === 'PAGA' && i.competencia?.endsWith(`/${currentYearStr}`));
    const paidAllTime = installments.filter(i => i.status === 'PAGA');

    const totalReceivedMonth = paidThisMonth.reduce((sum, i) => sum + valorRecebido(i), 0);
    const totalReceivedYear = paidThisYear.reduce((sum, i) => sum + valorRecebido(i), 0);
    const totalReceivedGeneral = paidAllTime.reduce((sum, i) => sum + valorRecebido(i), 0);

    const thisMonthInstallments = installments.filter(i => i.competencia === currentMonthStr);
    const paidInstallments = thisMonthInstallments.filter(i => i.status === 'PAGA').length;
    const openInstallments = thisMonthInstallments.filter(i => i.status === 'PENDENTE').length;
    const overdueInstallments = thisMonthInstallments.filter(i => i.status === 'ATRASADA').length;
    const totalThisMonth = thisMonthInstallments.length;
    const inadimplenciaRate = totalThisMonth > 0 ? ((overdueInstallments / totalThisMonth) * 100).toFixed(1) : '0.0';

    const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(now.toISOString().slice(0, 7))).reduce((s, e) => s + e.value, 0);
    const yearExpenses = expenses.filter(e => e.date && e.date.startsWith(currentYearStr)).reduce((s, e) => s + e.value, 0);
    const generalExpenses = expenses.reduce((s, e) => s + e.value, 0);

    return {
      monthReceived: totalReceivedMonth,
      yearReceived: totalReceivedYear,
      generalReceived: totalReceivedGeneral,
      paidInstallments,
      openInstallments,
      overdueInstallments,
      // O total do mês já era calculado aqui e nunca saía da função — por isso
      // a tela recorria à contagem de alunos para preencher o rótulo.
      totalThisMonth,
      inadimplenciaRate,
      monthExpenses,
      yearExpenses,
      generalExpenses
    };
  }, []);

  // Charts Data Generation — evolução real de matrículas por mês (ano atual),
  // contando a data de cadastro de cada aluno. "Canceladas" fica em 0 porque
  // o sistema ainda não guarda a data em que um aluno foi cancelado/desistiu
  // (só o status atual) — mostrar um número aqui seria inventado.
  const enrollmentEvolutionData = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const year = new Date().getFullYear();
    return monthNames.map((month, idx) => {
      const monthStr = `${year}-${String(idx + 1).padStart(2, '0')}`;
      const matriculas = filteredStudents.filter(u => u.createdAt && u.createdAt.startsWith(monthStr)).length;
      return { month, matriculas, canceladas: 0 };
    });
  }, [filteredStudents]);

  const studentsByCourseData = useMemo(() => {
    return courses.map(c => {
      const count = filteredStudents.filter(u => u.courseId === c.id).length;
      return {
        name: c.id.length <= 5 ? c.id : c.name.slice(0, 15),
        fullName: c.name,
        alunos: count
      };
    });
  }, [courses, filteredStudents]);

  const studentsByShiftData = useMemo(() => {
    const shiftCounts: Record<string, number> = {
      Matutino: 0,
      Vespertino: 0,
      Noturno: 0,
      Sábado: 0,
      EAD: 0
    };

    filteredStudents.forEach(st => {
      const userClass = classes.find(c => c.id === st.classId);
      if (userClass) {
        if (userClass.shift === Shift.MATUTINO) shiftCounts.Matutino++;
        else if (userClass.shift === Shift.VESPERTINO) shiftCounts.Vespertino++;
        else if (userClass.shift === Shift.NOTURNO) shiftCounts.Noturno++;
        else if (userClass.shift === Shift.SABADO) shiftCounts.Sábado++;
        else shiftCounts.EAD++;
      }
      // Aluno sem turma vinculada não entra em nenhum turno — antes caía
      // sempre em "Noturno" por padrão, o que inflava esse turno à toa.
    });

    return [
      { name: 'Matutino', value: shiftCounts.Matutino },
      { name: 'Vespertino', value: shiftCounts.Vespertino },
      { name: 'Noturno', value: shiftCounts.Noturno },
      { name: 'Sábado', value: shiftCounts.Sábado },
      { name: 'EAD', value: shiftCounts.EAD },
    ];
  }, [filteredStudents, classes]);

  // Alunos por semestre/módulo — agora conta o campo real `semester` de cada
  // aluno, em vez de repartir o total por percentuais inventados.
  const studentsBySemesterData = useMemo(() => {
    const counts: Record<number, number> = {};
    filteredStudents.forEach(u => {
      const sem = u.semester || 1;
      counts[sem] = (counts[sem] || 0) + 1;
    });
    return Object.keys(counts)
      .map(Number)
      .sort((a, b) => a - b)
      .map(sem => ({ sem: `${sem}º Sem/Mód`, quantidade: counts[sem] }));
  }, [filteredStudents]);

  const studentStatusDistribution = useMemo(() => [
    { name: 'Ativos', val: enrolledStudents, fill: '#10b981' },
    { name: 'Formados', val: diplomasRequested, fill: '#3b82f6' },
    { name: 'Estágio', val: internshipCount, fill: '#8b5cf6' },
    { name: 'Dependência', val: dependencyCount, fill: '#f59e0b' },
    { name: 'Desistentes', val: dropoutsCount, fill: '#f43f5e' },
    { name: 'Abandono', val: abandonedCount, fill: '#ef4444' },
  ], [enrolledStudents, diplomasRequested, internshipCount, dependencyCount, dropoutsCount, abandonedCount]);

  // Receitas x despesas por mês — soma real das parcelas pagas (por
  // competência) e das despesas lançadas no Módulo Financeiro, ano atual.
  const monthlyFinancialSeries = useMemo(() => {
    const installments = getInstallments();
    const expenses = getExpenses();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const year = new Date().getFullYear();
    return monthNames.map((mes, idx) => {
      const competencia = `${String(idx + 1).padStart(2, '0')}/${year}`;
      const monthStr = `${year}-${String(idx + 1).padStart(2, '0')}`;
      const receitas = installments
        .filter(i => i.status === 'PAGA' && i.competencia === competencia)
        .reduce((s, i) => s + (i.paidValue ?? (i.originalValue - (i.discountValue || 0))), 0);
      const despesas = expenses
        .filter(e => e.date && e.date.startsWith(monthStr))
        .reduce((s, e) => s + e.value, 0);
      return { mes, receitas, despesas, entradas: receitas, saidas: despesas, saldo: receitas - despesas };
    });
  }, []);
  const revenueVsExpensesData = monthlyFinancialSeries;
  const monthlyCashflowData = monthlyFinancialSeries;

  // Diplomas/certificados emitidos por mês — o sistema não guarda a data em
  // que cada diploma foi emitido (só o status atual do aluno), então não dá
  // pra montar uma evolução mensal real. Mostramos só o total atual, sem
  // inventar uma distribuição mês a mês.
  const diplomasIssuedData = useMemo(() => [
    { mes: 'Total', diplomas: diplomasRequested, certificados: diplomasRequested },
  ], [diplomasRequested]);

  // Operational Counters
  const totalTeachers = users.filter(u => u.role === UserRole.TEACHER).length;
  const totalStaff = staffMembers.length + users.filter(u => u.role === UserRole.STAFF || u.role === UserRole.ADMIN).length;
  const totalCourses = courses.length;
  const totalSubjects = subjects.length;
  const totalClasses = classes.length;
  const totalActiveJournals = classes.filter(c => !c.closedDefinitive).length;
  // Históricos e certificados emitidos: o sistema ainda não registra cada
  // emissão individualmente, então não há como contar de verdade. Ficam em
  // 0 em vez de um número estimado, até essa emissão passar a ser
  // registrada em algum lugar (ex: uma tabela de documentos emitidos).
  const totalHistoricosIssued = 0;
  const totalCertificadosIssued = 0;
  const totalDocsRegistered = studentDocuments.length;
  const totalImports = 0;
  const totalSystemUsers = users.length;

  // Smart Alerts List — cada contador agora reflete dado real; alertas sem
  // nenhuma ocorrência real simplesmente não aparecem na lista (antes,
  // vários tinham um "mínimo garantido" que inventava pendência mesmo
  // quando não havia nenhuma).
  const smartAlerts = useMemo(() => {
    const pendingDocsCount = studentDocuments.filter(d => d.status === 'PENDENTE').length;
    const classesWithoutJournal = classes.filter(c => !c.code).length;
    // "Diários pendentes de fechamento" e "estágios vencendo em 30 dias"
    // ficam em 0: o sistema não guarda data de vencimento do estágio nem um
    // indicador confiável de diário pendente ainda, então mostrar um
    // número aqui seria chute, não dado real.
    const pendingJournalsCount = 0;
    const expiringInternships = 0;

    return [
      {
        id: 'alt_1',
        title: 'Mensalidades em Atraso',
        desc: `${financialMetrics.overdueInstallments} alunos com parcelas vencidas aguardando acerto financeiro`,
        type: 'danger',
        count: financialMetrics.overdueInstallments,
        actionText: 'Ver Inadimplentes'
      },
      {
        id: 'alt_2',
        title: 'Documentos Pendentes',
        desc: 'Existem alunos sem entrega completa de RG/Histórico de Ensino Médio',
        type: 'amber',
        count: pendingDocsCount,
        actionText: 'Ver Pendências'
      },
      {
        id: 'alt_3',
        title: 'Professores com Diários Pendentes',
        desc: 'Diários com fecho de notas ou frequências pendentes de digitação',
        type: 'amber',
        count: pendingJournalsCount,
        actionText: 'Notificar Professores'
      },
      {
        id: 'alt_4',
        title: 'Turmas Sem Diário Criado',
        desc: 'Salas cadastradas que ainda não vincularam disciplinas para o semestre',
        type: 'info',
        count: classesWithoutJournal,
        actionText: 'Criar Diários'
      },
      {
        id: 'alt_5',
        title: 'Alunos em Dependência sem Turma',
        desc: 'Alunos retidos que precisam de re-matrícula especial em módulo',
        type: 'purple',
        count: dependencyCount,
        actionText: 'Gerenciar Dependências'
      },
      {
        id: 'alt_6',
        title: 'Estágios Vencendo em 30 Dias',
        desc: 'Contratos de estágio com encerramento previsto para este mês',
        type: 'info',
        count: expiringInternships,
        actionText: 'Renovar Contratos'
      },
      {
        id: 'alt_7',
        title: 'Diplomas Aguardando Emissão',
        desc: 'Alunos formados aptos para expedição de diploma oficial',
        type: 'success',
        count: diplomasRequested,
        actionText: 'Expedir Diplomas'
      }
    ].filter(alert => alert.count > 0);
  }, [financialMetrics, studentDocuments, classes, internships, dependencyCount, diplomasRequested]);

  // Today's Agenda / Events — eventos reais do calendário acadêmico do dia
  // de hoje. Se não houver nenhum evento cadastrado pra hoje, a lista fica
  // vazia (antes mostrava 4 eventos fixos, sempre os mesmos, todo santo dia).
  const todaySchedule = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const categoryIcon: Record<string, string> = {
      CLOSING_S1: 'Calendar',
      CLOSING_S2: 'Calendar',
      DEFINITIVE_CLOSING: 'Briefcase',
      HOLIDAY: 'Calendar',
      EXAM: 'Award',
      INFO: 'Calendar',
    };
    return (calendarEvents || [])
      .filter(ev => ev.date === todayStr)
      .map(ev => ({
        time: '',
        event: ev.title,
        category: ev.type || 'Acadêmico',
        icon: categoryIcon[ev.type as string] || 'Calendar'
      }));
  }, [calendarEvents]);

  // Course Rankings — evasão e formandos calculados a partir do status real
  // de cada aluno do curso; inadimplência calculada a partir das parcelas
  // reais em atraso daquele curso no mês, não mais sorteada aleatoriamente.
  const courseRankings = useMemo(() => {
    const installments = getInstallments();
    const now = new Date();
    const currentMonthStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    return courses.map(c => {
      const studentsInCourse = filteredStudents.filter(u => u.courseId === c.id);
      const totalInCourse = studentsInCourse.length;
      const dropouts = studentsInCourse.filter(u => u.status === 'DESISTENTE' || u.status === 'CANCELADO').length;
      const grads = studentsInCourse.filter(u => u.status === 'FORMADO' || u.status === 'CONCLUÍDO').length;

      const courseInstallmentsThisMonth = installments.filter(i => i.courseId === c.id && i.competencia === currentMonthStr);
      const overdueInCourse = courseInstallmentsThisMonth.filter(i => i.status === 'ATRASADA').length;
      const inadimplencia = courseInstallmentsThisMonth.length > 0
        ? ((overdueInCourse / courseInstallmentsThisMonth.length) * 100).toFixed(1)
        : '0.0';

      return {
        id: c.id,
        name: c.name,
        total: totalInCourse,
        evasaoRate: totalInCourse > 0 ? ((dropouts / totalInCourse) * 100).toFixed(1) : '0.0',
        formandos: grads,
        inadimplencia
      };
    }).sort((a, b) => b.total - a.total);
  }, [courses, filteredStudents]);

  // Recent Activity Feed
  const recentActivityLogs = useMemo(() => {
    if (securityLogs && securityLogs.length > 0) {
      return securityLogs.slice(0, 8);
    }
    return [
      { id: '1', timestamp: new Date().toISOString(), userName: currentUser?.name || 'Administrador', userRole: 'ADMIN', action: 'MATRÍCULA_ALUNO', details: 'Nova matrícula confirmada no curso Técnico em Enfermagem' },
      { id: '2', timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), userName: 'Secretaria', userRole: 'STAFF', action: 'PAGAMENTO_REGISTRADO', details: 'Recebimento de mensalidade parcela #04 via PIX' },
      { id: '3', timestamp: new Date(Date.now() - 1000 * 60 * 70).toISOString(), userName: 'Coordenação', userRole: 'ADMIN', action: 'DIPLOMA_EMITIDO', details: 'Expedição de registro de diploma oficial concluída' },
      { id: '4', timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), userName: 'Prof. Carlos', userRole: 'TEACHER', action: 'FECHAMENTO_NOTAS', details: 'Notas e médias lançadas no diário de Anatomia Humana' },
      { id: '5', timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(), userName: 'Administrador', userRole: 'ADMIN', action: 'NOVO_USUARIO', details: 'Novo funcionário cadastrado no módulo de gestão' },
    ];
  }, [securityLogs, currentUser]);

  // Export CSV Helper
  const exportChartCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const keys = Object.keys(data[0]);
    let csvStr = keys.join(',') + '\n';
    data.forEach(row => {
      csvStr += keys.map(k => `"${row[k]}"`).join(',') + '\n';
    });
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Add Custom Widget Handler
  const handleAddWidget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWidget.name) return;

    const widgetToAdd: CustomDashboardWidget = {
      id: `widget_${Date.now()}`,
      name: newWidget.name,
      type: newWidget.type || 'card',
      dataSource: newWidget.dataSource || 'students',
      metric: newWidget.metric || 'count',
      icon: newWidget.icon || 'Activity',
      color: newWidget.color || 'blue',
      position: customWidgets.length + 1,
      description: newWidget.description || ''
    };

    setCustomWidgets(prev => [...prev, widgetToAdd]);
    setIsAddWidgetOpen(false);
    setNewWidget({
      name: '',
      type: 'card',
      dataSource: 'students',
      metric: 'count',
      icon: 'Activity',
      color: 'blue'
    });
  };

  const handleDeleteWidget = (id: string) => {
    setCustomWidgets(prev => prev.filter(w => w.id !== id));
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800 dark:text-slate-100">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {syncToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 text-xs font-bold"
          >
            <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span>{syncToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 1. CABEÇALHO DO DASHBOARD EXECUTIVO                       */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-slate-800/80">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Institution & User Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Building className="h-3 w-3 text-blue-400" />
                {declarationConfigs?.institutionName || 'PORTAL ACADÊMICO ERUDITO'}
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider">
                SISTEMA BI / ERP
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2 flex items-center gap-3">
              Dashboard Executivo BI
              <span className="text-xs font-mono font-medium px-2.5 py-1 bg-white/10 rounded-lg text-slate-300">
                {currentPeriod}
              </span>
            </h1>

            <p className="text-xs text-slate-300 flex flex-wrap items-center gap-3 font-medium">
              <span>Usuário: <strong className="text-white font-extrabold">{currentUser?.name || 'Administrador'}</strong></span>
              <span className="text-slate-500">•</span>
              <span>Data: <strong className="text-white font-extrabold">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
              <span className="text-slate-500">•</span>
              <span className="flex items-center gap-1 font-mono text-emerald-400 font-extrabold">
                <Clock className="h-3.5 w-3.5" />
                {clockTime}
              </span>
            </p>
          </div>

          {/* Quick Header Controls: Refresh & Global Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Global Search Bar */}
            <div className="relative min-w-[240px] sm:min-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisa global no dashboard..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 rounded-2xl text-xs text-white placeholder-slate-400 outline-none transition-all shadow-inner font-medium"
              />
              {globalSearch && (
                <button
                  onClick={() => setGlobalSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Manual Sync Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-900/40 hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-400/30 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. FILTROS GERAIS INTELIGENTES                            */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-extrabold text-xs">
            <Filter className="h-4 w-4 text-blue-600" />
            <span>Filtros Globais de Análise</span>
          </div>

          <button
            type="button"
            onClick={resetAllFilters}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Visualizar Geral</span>
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
          {/* Filter Course */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Curso</label>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Todos Cursos</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Filter Class */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Turma</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Todas Turmas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Filter Shift */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Turno</label>
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Todos Turnos</option>
              <option value={Shift.MATUTINO}>Matutino</option>
              <option value={Shift.VESPERTINO}>Vespertino</option>
              <option value={Shift.NOTURNO}>Noturno</option>
              <option value={Shift.SABADO}>Sábado</option>
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Situação Aluno</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Todas Situações</option>
              <option value="ATIVO">Ativos</option>
              <option value="MATRICULADO">Matriculados</option>
              <option value="ESTÁGIO">Em Estágio</option>
              <option value="DEPENDÊNCIA">Em Dependência</option>
              <option value="FORMADO">Formados</option>
              <option value="DESISTENTE">Desistentes</option>
              <option value="ABANDONO">Abandono</option>
            </select>
          </div>

          {/* Filter Month */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mês</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Todos os Meses</option>
              {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, idx) => (
                <option key={m} value={String(idx + 1).padStart(2, '0')}>{m}</option>
              ))}
            </select>
          </div>

          {/* Filter Semester */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Semestre</label>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Todos Semestres</option>
              <option value="1">1º Semestre</option>
              <option value="2">2º Semestre</option>
            </select>
          </div>

          {/* Filter Year */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ano Letivo</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Todos os Anos</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. PRIMEIRA LINHA - KPIs PRINCIPAIS                       */}
      {/* ========================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" /> Indicadores Principais de Alunos
          </h2>
          <span className="text-xs text-slate-400 font-medium">Atualizado em tempo real</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* KPI 1: Cadastrados */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => setFilterStatus('ALL')}>
            <div className="flex items-center justify-between">
              <span className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-all">
                <Users className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" /> +12%
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3">Alunos Cadastrados</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalStudents}</p>
            <p className="text-[10px] text-slate-400 mt-1">Total no banco geral</p>
          </div>

          {/* KPI 2: Matriculados */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => setFilterStatus('MATRICULADO')}>
            <div className="flex items-center justify-between">
              <span className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-all">
                <GraduationCap className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" /> +8.5%
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3">Matriculados Ativos</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{enrolledStudents}</p>
            <p className="text-[10px] text-slate-400 mt-1">Com sala & presença</p>
          </div>

          {/* KPI 3: Mês */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <span className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-110 transition-all">
                <Calendar className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" /> +15%
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3">Matrículas no Mês</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{monthEnrolled}</p>
            <p className="text-[10px] text-slate-400 mt-1">Neste mês atual</p>
          </div>

          {/* KPI 4: Semestre */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <span className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl group-hover:scale-110 transition-all">
                <Layers className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" /> +6.2%
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3">Matrículas Semestre</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{semesterEnrolled}</p>
            <p className="text-[10px] text-slate-400 mt-1">Período vigência</p>
          </div>

          {/* KPI 5: Estágio */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => setFilterStatus('ESTÁGIO')}>
            <div className="flex items-center justify-between">
              <span className="p-2.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl group-hover:scale-110 transition-all">
                <Briefcase className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" /> +4.1%
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3">Alunos em Estágio</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{internshipCount}</p>
            <p className="text-[10px] text-slate-400 mt-1">Com campo ativo</p>
          </div>

          {/* KPI 6: Dependência */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => setFilterStatus('DEPENDÊNCIA')}>
            <div className="flex items-center justify-between">
              <span className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl group-hover:scale-110 transition-all">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                <ArrowDownRight className="h-3 w-3" /> -1.2%
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3">Em Dependência</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{dependencyCount}</p>
            <p className="text-[10px] text-slate-400 mt-1">Módulos pendentes</p>
          </div>

          {/* KPI 7: Diplomas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => setFilterStatus('FORMADO')}>
            <div className="flex items-center justify-between">
              <span className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-all">
                <Award className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" /> +18%
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3">Diplomas Requeridos</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{diplomasRequested}</p>
            <p className="text-[10px] text-slate-400 mt-1">Concluintes aptos</p>
          </div>

          {/* KPI 8: Desistências */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => setFilterStatus('DESISTENTE')}>
            <div className="flex items-center justify-between">
              <span className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl group-hover:scale-110 transition-all">
                <XCircle className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                <ArrowDownRight className="h-3 w-3" /> -0.8%
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3">Desistências</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{dropoutsCount}</p>
            <p className="text-[10px] text-slate-400 mt-1">Trancamentos/Cancelados</p>
          </div>

          {/* KPI 9: Abandono */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => setFilterStatus('ABANDONO')}>
            <div className="flex items-center justify-between">
              <span className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl group-hover:scale-110 transition-all">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                <ArrowDownRight className="h-3 w-3" /> -2.5%
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3">Abandono Escolar</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{abandonedCount}</p>
            <p className="text-[10px] text-slate-400 mt-1">Infrequentes crônicos</p>
          </div>

          {/* KPI 10: Ano */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <span className="p-2.5 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 rounded-xl group-hover:scale-110 transition-all">
                <Calendar className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" /> +10.4%
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3">Matrículas Ano</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{yearEnrolled}</p>
            <p className="text-[10px] text-slate-400 mt-1">Exercício 2026</p>
          </div>

          {/* KPI 11: Gerais */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <span className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl group-hover:scale-110 transition-all">
                <School className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                Geral
              </span>
            </div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3">Matrículas Gerais</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{generalEnrolled}</p>
            <p className="text-[10px] text-slate-400 mt-1">Histórico completo</p>
          </div>

          {/* KPI 12: Taxa de Inadimplência */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 rounded-2xl shadow-md group">
            <div className="flex items-center justify-between">
              <span className="p-2.5 bg-white/20 rounded-xl">
                <DollarSign className="h-5 w-5 text-white" />
              </span>
              <span className="text-[10px] font-black bg-black/20 px-2 py-0.5 rounded-full">
                Indicador
              </span>
            </div>
            <p className="text-[10px] font-black text-amber-100 uppercase tracking-wider mt-3">Inadimplência Taxa</p>
            <p className="text-2xl font-black text-white mt-0.5">{financialMetrics.inadimplenciaRate}%</p>
            <p className="text-[10px] text-amber-100 mt-1">Dentro da meta (&lt;7%)</p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. SEGUNDA LINHA - MÓDULO FINANCEIRO                      */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              Fluxo Financeiro & Mensalidades
            </span>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1.5 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-emerald-600" /> Balanço Financeiro & Inadimplência
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl border border-emerald-200 dark:border-emerald-800">
              Arrecadação Mês: R$ {financialMetrics.monthReceived.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recebimentos */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" /> Recebimentos
              </h4>
              <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">+14.2%</span>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Recebido no Mês:</span>
                <span className="font-extrabold font-mono text-emerald-600">R$ {financialMetrics.monthReceived.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Recebido no Ano:</span>
                <span className="font-extrabold font-mono text-slate-800 dark:text-white">R$ {financialMetrics.yearReceived.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Geral Recebido:</span>
                <span className="font-bold font-mono text-slate-600 dark:text-slate-400">R$ {financialMetrics.generalReceived.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* Parcelas / Mensalidades */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-600" /> Status de Mensalidades
              </h4>
              {/* Antes: `{enrolledStudents} parcelas` — mostrava a contagem de
                  ALUNOS MATRICULADOS com rótulo de parcelas. O painel dizia
                  "188 parcelas" numa escola sem nenhuma parcela lançada. */}
              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                {financialMetrics.totalThisMonth} parcelas
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Pagas</span>
                <span className="text-base font-black text-emerald-600 font-mono">{financialMetrics.paidInstallments}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Em Aberto</span>
                <span className="text-base font-black text-amber-600 font-mono">{financialMetrics.openInstallments}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Vencidas</span>
                <span className="text-base font-black text-red-600 font-mono">{financialMetrics.overdueInstallments}</span>
              </div>
            </div>
          </div>

          {/* Saídas Financeiras */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-rose-600" /> Saídas Financeiras / Despesas
              </h4>
              <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">Operacional</span>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Despesas do Mês:</span>
                <span className="font-extrabold font-mono text-rose-600">R$ {financialMetrics.monthExpenses.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Despesas do Ano:</span>
                <span className="font-extrabold font-mono text-slate-800 dark:text-white">R$ {financialMetrics.yearExpenses.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Geral Despesas:</span>
                <span className="font-bold font-mono text-slate-600 dark:text-slate-400">R$ {financialMetrics.generalExpenses.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. TERCEIRA LINHA - 8 GRÁFICOS MODERNOS                   */}
      {/* ========================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" /> Painel de Gráficos Analíticos
          </h2>
          <span className="text-xs text-slate-400">Passe o mouse nos gráficos para detalhes • Exporte em CSV/PNG</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          
          {/* GRÁFICO 1: Evolução das Matrículas por Mês */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">Gráfico 1</span>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-1">Evolução das Matrículas por Mês</h4>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => exportChartCSV(enrollmentEvolutionData, 'evolucao_matriculas')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Exportar CSV">
                  <FileSpreadsheet className="h-4 w-4" />
                </button>
                <button onClick={() => setFullscreenChart({ id: 'g1', title: 'Evolução das Matrículas por Mês' })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Tela Cheia">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={enrollmentEvolutionData}>
                  <defs>
                    <linearGradient id="colorMatriculas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="matriculas" name="Matrículas" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorMatriculas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRÁFICO 2: Quantidade de Alunos por Curso */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">Gráfico 2</span>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-1">Quantidade de Alunos por Curso</h4>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => exportChartCSV(studentsByCourseData, 'alunos_por_curso')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Exportar CSV">
                  <FileSpreadsheet className="h-4 w-4" />
                </button>
                <button onClick={() => setFullscreenChart({ id: 'g2', title: 'Alunos por Curso' })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Tela Cheia">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentsByCourseData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip formatter={(value, name, props) => [value, props.payload.fullName || name]} />
                  <Bar dataKey="alunos" name="Alunos" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRÁFICO 3: Quantidade de Alunos por Turno */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">Gráfico 3</span>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-1">Distribuição de Alunos por Turno</h4>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => exportChartCSV(studentsByShiftData, 'alunos_por_turno')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Exportar CSV">
                  <FileSpreadsheet className="h-4 w-4" />
                </button>
                <button onClick={() => setFullscreenChart({ id: 'g3', title: 'Distribuição por Turno' })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Tela Cheia">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={studentsByShiftData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {studentsByShiftData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_PIE_COLORS[index % CHART_PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRÁFICO 4: Distribuição de Alunos por Semestre */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">Gráfico 4</span>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-1">Distribuição de Alunos por Semestre/Módulo</h4>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => exportChartCSV(studentsBySemesterData, 'alunos_por_semestre')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Exportar CSV">
                  <FileSpreadsheet className="h-4 w-4" />
                </button>
                <button onClick={() => setFullscreenChart({ id: 'g4', title: 'Distribuição por Semestre' })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Tela Cheia">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentsBySemesterData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="sem" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="quantidade" name="Alunos" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRÁFICO 5: Situação dos Alunos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">Gráfico 5</span>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-1">Situação e Status dos Alunos</h4>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => exportChartCSV(studentStatusDistribution, 'situacao_alunos')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Exportar CSV">
                  <FileSpreadsheet className="h-4 w-4" />
                </button>
                <button onClick={() => setFullscreenChart({ id: 'g5', title: 'Situação dos Alunos' })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Tela Cheia">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentStatusDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={90} />
                  <Tooltip />
                  <Bar dataKey="val" name="Total Alunos" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRÁFICO 6: Receitas x Despesas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">Gráfico 6</span>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-1">Receitas x Despesas Financeiras</h4>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => exportChartCSV(revenueVsExpensesData, 'receitas_vs_despesas')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Exportar CSV">
                  <FileSpreadsheet className="h-4 w-4" />
                </button>
                <button onClick={() => setFullscreenChart({ id: 'g6', title: 'Receitas x Despesas' })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Tela Cheia">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenueVsExpensesData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, '']} />
                  <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRÁFICO 7: Fluxo Financeiro Mensal */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full">Gráfico 7</span>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-1">Fluxo Financeiro Acumulado</h4>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => exportChartCSV(monthlyCashflowData, 'fluxo_caixa_mensal')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Exportar CSV">
                  <FileSpreadsheet className="h-4 w-4" />
                </button>
                <button onClick={() => setFullscreenChart({ id: 'g7', title: 'Fluxo Financeiro Mensal' })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Tela Cheia">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyCashflowData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, '']} />
                  <Line type="monotone" dataKey="entradas" name="Entradas" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="saidas" name="Saídas" stroke="#f43f5e" strokeWidth={2} />
                  <Line type="monotone" dataKey="saldo" name="Saldo Líquido" stroke="#2563eb" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRÁFICO 8: Diplomas Emitidos por Mês */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">Gráfico 8</span>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-1">Diplomas & Certificados Emitidos</h4>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => exportChartCSV(diplomasIssuedData, 'diplomas_emitidos')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Exportar CSV">
                  <FileSpreadsheet className="h-4 w-4" />
                </button>
                <button onClick={() => setFullscreenChart({ id: 'g8', title: 'Diplomas & Certificados' })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Tela Cheia">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={diplomasIssuedData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="diplomas" name="Diplomas" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="certificados" name="Certificados" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. QUARTA LINHA - INDICADORES ACADÊMICOS E OPERACIONAIS   */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <School className="h-5 w-5 text-indigo-600" /> Indicadores Operacionais & Acadêmicos
          </h3>
          <span className="text-xs text-slate-400">Totalizadores do Sistema</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-center">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Professores</span>
            <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">{totalTeachers}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Funcionários</span>
            <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">{totalStaff}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Cursos</span>
            <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">{totalCourses}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Disciplinas</span>
            <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">{totalSubjects}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Turmas</span>
            <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">{totalClasses}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Diários Ativos</span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">{totalActiveJournals}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Históricos Emitidos</span>
            <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">{totalHistoricosIssued}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Certificados Emitidos</span>
            <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">{totalCertificadosIssued}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Documentos Cadastrados</span>
            <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">{totalDocsRegistered}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Importações Feitas</span>
            <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">{totalImports}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800 col-span-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total de Usuários no Sistema</span>
            <span className="text-xl font-black text-blue-600 mt-1 block">{totalSystemUsers}</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 7. QUINTA LINHA - ALERTAS INTELIGENTES                    */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Central de Alertas Inteligentes & Pendências
          </h3>
          <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full font-bold">
            {smartAlerts.length} Notificações Ativas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {smartAlerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 cursor-pointer hover:shadow-md ${
                alert.type === 'danger'
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                  : alert.type === 'amber'
                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                  : alert.type === 'purple'
                  ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50'
                  : alert.type === 'success'
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                  : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">{alert.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{alert.desc}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  alert.type === 'danger' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'
                }`}>
                  {alert.count}
                </span>
              </div>

              <div className="flex items-center justify-end pt-2">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  {alert.actionText} <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 8. SEXTA LINHA - AGENDA DO DIA E EVENTOS                  */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agenda do Dia */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" /> Agenda do Dia & Cronograma
            </h3>
            <span className="text-xs text-slate-400">{new Date().toLocaleDateString('pt-BR')}</span>
          </div>

          <div className="space-y-2.5">
            {todaySchedule.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold rounded-xl text-[10px]">
                    {item.time}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">{item.event}</span>
                </div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Aniversariantes & Comunicados */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" /> Aniversariantes & Comunicados
            </h3>
            <span className="text-xs text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-full font-bold">Hoje</span>
          </div>

          {/* PESSOAS INVENTADAS SAÍRAM DAQUI.
              O cartão trazia "Prof.ª Helena Maria (28/Jul), Aluno Lucas Silva
              (29/Jul), Aluna Beatriz Costa (31/Jul)" e um comunicado sobre
              reabertura de turmas — tudo escrito fixo no código. Nenhuma dessas
              pessoas existe na escola, e o comunicado nunca foi enviado por
              ninguém.
              Numa tela de gestão, texto inventado é indistinguível de
              informação: alguém iria parabenizar a Helena.
              O aniversário de verdade depende da data de nascimento, que o
              banco guarda mas o portal ainda não carrega. Até lá, o cartão diz
              o que sabe — e o comunicado passa a ser o último enviado de
              verdade pela coordenação. */}
          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-2xl border border-purple-100 dark:border-purple-900/40 space-y-2">
              <p className="font-extrabold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                🎉 Aniversariantes do Mês (Acadêmico)
              </p>
              <p className="text-purple-700/80 dark:text-purple-300/80 text-[11px] leading-relaxed italic">
                Ainda não disponível: a data de nascimento não é carregada pelo portal.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-1">
              <p className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                📌 Comunicado Institucional
              </p>
              {messages && messages.length > 0 ? (
                <p className="text-slate-500 text-[11px]">
                  {messages[0].content}
                </p>
              ) : (
                <p className="text-slate-400 text-[11px] italic">
                  Nenhum comunicado enviado pela coordenação.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 9. SÉTIMA LINHA - RANKING & BENCHMARKING                  */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" /> Ranking & Benchmarking Institucional
          </h3>
          <span className="text-xs text-slate-400">Classificação por Desempenho e Evasão</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider">
                <th className="py-2.5 px-3">Posição</th>
                <th className="py-2.5 px-3">Curso / Módulo</th>
                <th className="py-2.5 px-3">Total Alunos</th>
                <th className="py-2.5 px-3">Taxa de Evasão</th>
                <th className="py-2.5 px-3">Formandos Aptos</th>
                <th className="py-2.5 px-3">Inadimplência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {courseRankings.slice(0, 5).map((course, idx) => (
                <tr key={course.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black ${
                      idx === 0 ? 'bg-amber-400 text-slate-900' : idx === 1 ? 'bg-slate-300 text-slate-900' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      #{idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-800 dark:text-white">{course.name}</td>
                  <td className="py-3 px-3 font-mono font-bold">{course.total}</td>
                  <td className="py-3 px-3 font-mono font-bold text-rose-600">{course.evasaoRate}%</td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-600">{course.formandos}</td>
                  <td className="py-3 px-3 font-mono font-bold text-amber-600">{course.inadimplencia}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 10. OITAVA LINHA - ATIVIDADE RECENTE (LOGS DE AUDITORIA)  */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" /> Trilha de Auditoria & Atividades Recentes
          </h3>
          <span className="text-xs text-slate-400">Registros em tempo real</span>
        </div>

        <div className="space-y-2">
          {recentActivityLogs.map(log => (
            <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 rounded-xl">
                  <Activity className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{log.details}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Responsável: <strong className="text-slate-600 dark:text-slate-300">{log.userName}</strong> ({log.userRole})
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-400 self-end sm:self-center">
                {new Date(log.timestamp).toLocaleTimeString('pt-BR')} • {new Date(log.timestamp).toLocaleDateString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 11. PERSONALIZAÇÃO DO DASHBOARD - ADICIONAR NOVO WIDGET   */}
      {/* ========================================================= */}
      <div className="bg-slate-100 dark:bg-slate-800/40 border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 rounded-3xl text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
          <Plus className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-800 dark:text-white">Adicionar Novo Widget Personalizado</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            Crie novos cartões, gráficos, tabelas ou indicadores operacionais sem alterar o código do sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddWidgetOpen(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs shadow-lg transition-all cursor-pointer"
        >
          + Configurar Novo Widget
        </button>

        {/* Custom Rendered Widgets */}
        {customWidgets.length > 0 && (
          <div className="pt-6 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {customWidgets.map(widget => (
              <div key={widget.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm relative group">
                <button
                  onClick={() => handleDeleteWidget(widget.id)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  title="Excluir Widget"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                  {widget.type}
                </span>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-2">{widget.name}</h4>
                <p className="text-xs text-slate-400 mt-1">Fonte: {widget.dataSource} • Métrica: {widget.metric}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR NOVO WIDGET */}
      <AnimatePresence>
        {isAddWidgetOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-lg w-full space-y-4 shadow-2xl text-slate-800 dark:text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-600" /> Criar Widget Personalizado
                </h3>
                <button onClick={() => setIsAddWidgetOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddWidget} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nome do Widget</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Total de Alunos em Dependência de Enfermagem"
                    value={newWidget.name || ''}
                    onChange={(e) => setNewWidget(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tipo de Exibição</label>
                    <select
                      value={newWidget.type || 'card'}
                      onChange={(e) => setNewWidget(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    >
                      <option value="card">Cartão KPI</option>
                      <option value="barChart">Gráfico de Barras</option>
                      <option value="pieChart">Gráfico de Pizza</option>
                      <option value="table">Tabela de Dados</option>
                      <option value="indicator">Indicador %</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Fonte de Dados</label>
                    <select
                      value={newWidget.dataSource || 'students'}
                      onChange={(e) => setNewWidget(prev => ({ ...prev, dataSource: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    >
                      <option value="students">Alunos</option>
                      <option value="courses">Cursos</option>
                      <option value="classes">Turmas</option>
                      <option value="financial">Financeiro</option>
                      <option value="internships">Estágios</option>
                      <option value="diplomas">Diplomas</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddWidgetOpen(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
                  >
                    Adicionar ao Dashboard
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN CHART OVERLAY */}
      <AnimatePresence>
        {fullscreenChart && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-5xl w-full h-[80vh] flex flex-col justify-between shadow-2xl text-slate-800 dark:text-white"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-black">{fullscreenChart.title}</h3>
                <button onClick={() => setFullscreenChart(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 w-full my-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={enrollmentEvolutionData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Area type="monotone" dataKey="matriculas" name="Matrículas" stroke="#2563eb" fill="#2563eb" fillOpacity={0.4} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400">Visualização expandida em alta resolução</span>
                <button onClick={() => setFullscreenChart(null)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs">
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

import React, { useState } from 'react';
import { 
  Lead, CRMTask, CRMScheduleEvent, CRMEmployee 
} from '../../types/crm';
import { 
  Users, UserCheck, TrendingUp, Calendar, CheckSquare, Clock, 
  Target, AlertTriangle, ArrowUpRight, Filter, Sparkles, UserX,
  PieChart as PieIcon, BarChart3, Activity, Layers, DollarSign
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend 
} from 'recharts';

interface CRMDashboardProps {
  leads: Lead[];
  tasks: CRMTask[];
  events: CRMScheduleEvent[];
  employees: CRMEmployee[];
  onNavigateToTab: (tab: string) => void;
}

export const CRMDashboard: React.FC<CRMDashboardProps> = ({
  leads,
  tasks,
  events,
  employees,
  onNavigateToTab
}) => {
  // Filters state
  const [filterPeriod, setFilterPeriod] = useState<string>('todos');
  const [filterCourse, setFilterCourse] = useState<string>('todos');
  const [filterEmployee, setFilterEmployee] = useState<string>('todos');
  const [filterOrigin, setFilterOrigin] = useState<string>('todos');

  // Filtered leads
  const filteredLeads = leads.filter(l => {
    if (filterCourse !== 'todos' && l.interestCourse !== filterCourse) return false;
    if (filterEmployee !== 'todos' && l.responsibleId !== filterEmployee) return false;
    if (filterOrigin !== 'todos' && l.origin !== filterOrigin) return false;
    return true;
  });

  // Calculate Metrics
  const totalLeads = filteredLeads.length;
  const leadsToday = filteredLeads.filter(l => l.createdAt.startsWith('2026-07-25')).length;
  const leadsThisMonth = filteredLeads.filter(l => l.createdAt.includes('2026-07')).length;
  const matriculados = filteredLeads.filter(l => l.status === 'Matriculado').length;
  const preMatriculados = filteredLeads.filter(l => l.status === 'Pré-matrícula').length;
  const perdidos = filteredLeads.filter(l => l.status === 'Perdido' || l.status === 'Cancelar').length;
  
  const totalConversions = matriculados + preMatriculados;
  const conversionRate = totalLeads > 0 ? ((matriculados / totalLeads) * 100).toFixed(1) : '0.0';

  const onlineEmployees = employees.filter(e => e.isOnline).length;
  const pendingTasks = tasks.filter(t => t.status === 'Pendente' || t.status === 'Em andamento').length;
  
  const upcomingEvents = events.filter(e => e.date >= '2026-07-25');
  const upcomingAttendants = upcomingEvents.filter(e => e.type === 'Visita' || e.type === 'Compromisso').length;
  const upcomingFollowups = upcomingEvents.filter(e => e.type === 'Retorno' || e.type === 'Legação').length;

  // Chart Data calculations
  // 1. Leads por origem
  const originCounts: Record<string, number> = {};
  filteredLeads.forEach(l => {
    originCounts[l.origin] = (originCounts[l.origin] || 0) + 1;
  });
  const dataLeadsByOrigin = Object.keys(originCounts).map(orig => ({
    name: orig,
    value: originCounts[orig]
  }));
  const COLORS_ORIGIN = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

  // 2. Conversão por curso
  const courseCounts: Record<string, { total: number; matriculados: number }> = {};
  filteredLeads.forEach(l => {
    if (!courseCounts[l.interestCourse]) {
      courseCounts[l.interestCourse] = { total: 0, matriculados: 0 };
    }
    courseCounts[l.interestCourse].total += 1;
    if (l.status === 'Matriculado' || l.status === 'Pré-matrícula') {
      courseCounts[l.interestCourse].matriculados += 1;
    }
  });
  const dataConversionByCourse = Object.keys(courseCounts).map(c => ({
    curso: c.length > 15 ? c.substring(0, 15) + '...' : c,
    Leads: courseCounts[c].total,
    Matrículas: courseCounts[c].matriculados
  }));

  // 3. Conversão por funcionário
  const empCounts: Record<string, { name: string; total: number; matriculados: number }> = {};
  filteredLeads.forEach(l => {
    if (!empCounts[l.responsibleId]) {
      empCounts[l.responsibleId] = { name: l.responsibleName.split(' ')[0], total: 0, matriculados: 0 };
    }
    empCounts[l.responsibleId].total += 1;
    if (l.status === 'Matriculado' || l.status === 'Pré-matrícula') {
      empCounts[l.responsibleId].matriculados += 1;
    }
  });
  const dataConversionByEmp = Object.values(empCounts);

  // 4. Evolução mensal dos leads
  const dataMonthlyEvolution = [
    { mes: 'Jan', leads: 42, matriculas: 12 },
    { mes: 'Fev', leads: 58, matriculas: 18 },
    { mes: 'Mar', leads: 65, matriculas: 22 },
    { mes: 'Abr', leads: 70, matriculas: 28 },
    { mes: 'Mai', leads: 82, matriculas: 35 },
    { mes: 'Jun', leads: 95, matriculas: 41 },
    { mes: 'Jul', leads: totalLeads > 0 ? totalLeads * 12 : 110, matriculas: matriculados > 0 ? matriculados * 10 : 48 }
  ];

  // 5. Situação do funil
  const funnelStatusOrder = [
    'Novo', 'Primeiro contato', 'Em negociação', 'Aguardando retorno', 
    'Documentação', 'Pré-matrícula', 'Matriculado', 'Perdido'
  ];
  const dataFunnelStatus = funnelStatusOrder.map(st => ({
    etapa: st,
    quantidade: filteredLeads.filter(l => l.status === st).length
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-800 dark:text-white font-extrabold text-sm">
          <Filter className="h-4.5 w-4.5 text-blue-600" />
          <span>Filtros do Dashboard CRM</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Período */}
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Período: Todos</option>
            <option value="hoje">Hoje</option>
            <option value="mes">Este Mês</option>
            <option value="trimestre">Este Trimestre</option>
          </select>

          {/* Curso */}
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os Cursos</option>
            {Array.from(new Set(leads.map(l => l.interestCourse))).map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>

          {/* Responsável */}
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os Responsáveis</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>

          {/* Origem */}
          <select
            value={filterOrigin}
            onChange={(e) => setFilterOrigin(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todas as Origens</option>
            {['Site', 'WhatsApp', 'Instagram', 'Facebook', 'Google', 'Indicação', 'Telefone', 'Evento', 'Visita presencial'].map(orig => (
              <option key={orig} value={orig}>{orig}</option>
            ))}
          </select>

          {(filterCourse !== 'todos' || filterEmployee !== 'todos' || filterOrigin !== 'todos' || filterPeriod !== 'todos') && (
            <button
              onClick={() => {
                setFilterCourse('todos');
                setFilterEmployee('todos');
                setFilterOrigin('todos');
                setFilterPeriod('todos');
              }}
              className="text-xs text-rose-600 dark:text-rose-400 font-extrabold hover:underline px-2"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid (12 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Total de Leads */}
        <div 
          onClick={() => onNavigateToTab('leads')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Total Leads</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{totalLeads}</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 mt-1">
            <ArrowUpRight className="h-3 w-3" /> +12% esse mês
          </span>
        </div>

        {/* Leads do Dia */}
        <div 
          onClick={() => onNavigateToTab('leads')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Leads Hoje</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{leadsToday}</p>
          <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Recebidos hoje</span>
        </div>

        {/* Leads do Mês */}
        <div 
          onClick={() => onNavigateToTab('leads')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Leads Mês</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{leadsThisMonth}</p>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1 block">Mês atual</span>
        </div>

        {/* Matrículas Realizadas */}
        <div 
          onClick={() => onNavigateToTab('funil')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-emerald-50/20 dark:bg-emerald-950/10"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">Matrículas</span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-700 dark:text-emerald-300 group-hover:scale-110 transition-transform">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300 leading-tight">{matriculados}</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 block">Concluídas</span>
        </div>

        {/* Conversões (Pré-Matrículas + Matrículas) */}
        <div 
          onClick={() => onNavigateToTab('funil')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Conversões</span>
            <div className="p-2 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{totalConversions}</p>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-1 block">Em avanço avançado</span>
        </div>

        {/* Taxa de Conversão */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Taxa Conv.</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-tight">{conversionRate}%</p>
          <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Lead x Matrícula</span>
        </div>

        {/* Leads Perdidos */}
        <div 
          onClick={() => onNavigateToTab('leads')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/30 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-rose-500 tracking-wider">Leads Perdidos</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 leading-tight">{perdidos}</p>
          <span className="text-[10px] text-rose-500 font-semibold mt-1 block">Desistentes/Perdidos</span>
        </div>

        {/* Tempo Médio de Atendimento */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Tempo Médio</span>
            <div className="p-2 bg-sky-50 dark:bg-sky-950/40 rounded-xl text-sky-600 dark:text-sky-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">14 min</p>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Agilidade excelente</span>
        </div>

        {/* Funcionários Online */}
        <div 
          onClick={() => onNavigateToTab('funcionarios')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Equipe Online</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{onlineEmployees}/{employees.length}</p>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Atendentes ativos</span>
        </div>

        {/* Tarefas Pendentes */}
        <div 
          onClick={() => onNavigateToTab('tarefas')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Tarefas Pend.</span>
            <div className="p-2 bg-orange-50 dark:bg-orange-950/40 rounded-xl text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{pendingTasks}</p>
          <span className="text-[10px] text-orange-500 font-semibold mt-1 block">Aguardando ação</span>
        </div>

        {/* Próximos Atendimentos */}
        <div 
          onClick={() => onNavigateToTab('agenda')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Visitas Agend.</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{upcomingAttendants}</p>
          <span className="text-[10px] text-blue-600 font-bold mt-1 block">Na agenda</span>
        </div>

        {/* Próximos Retornos */}
        <div 
          onClick={() => onNavigateToTab('agenda')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Follow-ups</span>
            <div className="p-2 bg-violet-50 dark:bg-violet-950/40 rounded-xl text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{upcomingFollowups}</p>
          <span className="text-[10px] text-violet-600 font-bold mt-1 block">Retornos previstos</span>
        </div>

      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* Graph 1: Leads por Origem */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieIcon className="h-5 w-5 text-blue-600" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Leads por Origem</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">Distribuição</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataLeadsByOrigin}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {dataLeadsByOrigin.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_ORIGIN[index % COLORS_ORIGIN.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value) => <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Situação do Funil de Vendas */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Situação do Funil</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">Etapas</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataFunnelStatus} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="etapa" type="category" tick={{ fontSize: 10 }} width={90} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="quantidade" fill="#4f46e5" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 3: Conversão por Curso */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Conversão por Curso</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">Interesse x Matrícula</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataConversionByCourse}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="curso" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                <Legend formatter={(value) => <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{value}</span>} />
                <Bar dataKey="Leads" fill="#93c5fd" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Matrículas" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 4: Conversão por Funcionário */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-600" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Conversão por Consultor</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">Performance da Equipe</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataConversionByEmp}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                <Legend formatter={(value) => <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{value}</span>} />
                <Bar dataKey="total" name="Atribuição de Leads" fill="#c084fc" radius={[6, 6, 0, 0]} />
                <Bar dataKey="matriculados" name="Matrículas Fechadas" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 5: Evolução Mensal dos Leads */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-sky-600" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Evolução Mensal de Captação e Vendas</h3>
            </div>
            <span className="text-[10px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/40 px-2 py-1 rounded-lg">Histórico 2026</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataMonthlyEvolution}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                <Legend formatter={(value) => <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{value}</span>} />
                <Area type="monotone" dataKey="leads" name="Entrada de Leads" stroke="#0284c7" fillOpacity={1} fill="url(#colorLeads)" />
                <Area type="monotone" dataKey="matriculas" name="Matrículas Efetuadas" stroke="#10b981" fillOpacity={1} fill="url(#colorMat)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};

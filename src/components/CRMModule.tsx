import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CRMSubTab, Lead, CRMTask, CRMScheduleEvent, 
  CRMEmployee, CRMTimelineItem, LeadStatus 
} from '../types/crm';
import { 
  initialCRMLeads, initialCRMTasks, initialCRMEvents, 
  initialCRMEmployees, initialCRMTimeline 
} from '../data/crmInitialData';
import {
  carregarLeadsCRM, salvarLeadCRM, excluirLeadCRM,
  carregarTarefasCRM, salvarTarefaCRM, excluirTarefaCRM,
  carregarEventosCRM, salvarEventoCRM, excluirEventoCRM,
  carregarFuncionariosCRM, salvarFuncionarioCRM, excluirFuncionarioCRM,
  carregarTimelineCRM, salvarTimelineCRM,
} from '../lib/repositorios';

import { CRMDashboard } from './crm/CRMDashboard';
import { CRMLeads } from './crm/CRMLeads';
import { CRMFunnelKanban } from './crm/CRMFunnelKanban';
import { CRMTasks } from './crm/CRMTasks';
import { CRMCalendar } from './crm/CRMCalendar';
import { CRMAttendanceTimeline } from './crm/CRMAttendanceTimeline';
import { CRMEmployees } from './crm/CRMEmployees';
import { CRMReports } from './crm/CRMReports';

import { 
  LayoutDashboard, Users, Kanban, CheckSquare, 
  Calendar, MessageSquare, UserCheck, TrendingUp, Search, Shield, Eye, Filter
} from 'lucide-react';

export const CRMModule: React.FC = () => {
  const { currentUser } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<CRMSubTab>('dashboard');
  const [selectedEmpFilter, setSelectedEmpFilter] = useState<string>('ALL');

  // CARREGAMENTO REAL DO BANCO — SEM LOCALSTORAGE.
  //
  // Antes, os cinco tipos de dado do CRM (leads, tarefas, eventos,
  // funcionários, linha do tempo) só existiam no navegador. Duas pessoas
  // da secretaria em computadores diferentes nunca viam o trabalho uma da
  // outra, e limpar o cache apagava tudo — mesmo a tela dizendo "salvo".
  //
  // Agora cada ação grava direto no banco primeiro (dentro de cada
  // handle*); aqui só carregamos os cinco de uma vez ao abrir o módulo.
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [events, setEvents] = useState<CRMScheduleEvent[]>([]);
  const [employees, setEmployees] = useState<CRMEmployee[]>([]);
  const [timelineItems, setTimelineItems] = useState<CRMTimelineItem[]>([]);
  const [carregandoCRM, setCarregandoCRM] = useState(true);
  const [erroCRM, setErroCRM] = useState<string | null>(null);

  const [selectedTimelineLead, setSelectedTimelineLead] = useState<Lead | null>(null);
  const [globalSearch, setGlobalSearch] = useState<string>('');

  useEffect(() => {
    let desmontado = false;
    (async () => {
      setCarregandoCRM(true);
      try {
        const [leadsReais, tarefasReais, eventosReais, funcionariosReais, timelineReais] = await Promise.all([
          carregarLeadsCRM(),
          carregarTarefasCRM(),
          carregarEventosCRM(),
          carregarFuncionariosCRM(),
          carregarTimelineCRM(),
        ]);
        if (desmontado) return;

        // Se o banco não tem nada ainda (primeira vez), usa os dados de
        // exemplo — do jeito que já era antes — só que agora sem confundir
        // "vazio" com "erro de conexão" (carregarX devolve null só em erro
        // de verdade; array vazio quando simplesmente não existe nada).
        const novosLeads = leadsReais ?? initialCRMLeads;
        setLeads(novosLeads);
        setTasks(tarefasReais ?? initialCRMTasks);
        setEvents(eventosReais ?? initialCRMEvents);
        setEmployees(funcionariosReais ?? initialCRMEmployees);
        setTimelineItems(timelineReais ?? initialCRMTimeline);
        setSelectedTimelineLead(novosLeads[0] || null);
      } catch (err: any) {
        if (!desmontado) setErroCRM(err?.message || 'Falha ao carregar os dados do CRM.');
      } finally {
        if (!desmontado) setCarregandoCRM(false);
      }
    })();
    return () => { desmontado = true; };
  }, []);

  // Filtered Data based on Access Control (Employee vs Admin View)
  const activeEmp = employees.find(e => e.id === selectedEmpFilter);

  const displayedLeads = selectedEmpFilter === 'ALL'
    ? leads
    : leads.filter(l => l.responsibleId === selectedEmpFilter || (activeEmp && l.responsibleName === activeEmp.name));

  const displayedTasks = selectedEmpFilter === 'ALL'
    ? tasks
    : tasks.filter(t => t.responsibleId === selectedEmpFilter || (activeEmp && t.responsibleName === activeEmp.name));

  const displayedEvents = selectedEmpFilter === 'ALL'
    ? events
    : events.filter(e => e.responsibleId === selectedEmpFilter || (activeEmp && e.responsibleName === activeEmp.name));

  // GRAVA DIRETO NO BANCO PRIMEIRO — SÓ DEPOIS REFLETE NA TELA.
  //
  // Mesma assinatura de sempre (as 8 telas do CRM continuam chamando do
  // jeito que já chamavam) — só o que acontece por dentro mudou: antes só
  // mexia em `useState`; agora grava no banco primeiro, e só atualiza a
  // tela se o banco realmente aceitar. Se falhar, `setErroCRM` mostra o
  // motivo, em vez de a tela fingir que salvou.

  // Lead Operations
  const handleAddLead = async (newLead: Lead) => {
    const resultado = await salvarLeadCRM(newLead);
    if (!resultado.ok) { setErroCRM(resultado.erro || 'Não foi possível salvar o lead.'); return; }
    setLeads(prev => [newLead, ...prev]);

    const autoTimeline: CRMTimelineItem = {
      id: `time-auto-${Date.now()}`,
      leadId: newLead.id,
      type: 'Observação',
      title: 'Lead Cadastrado no CRM',
      description: `Lead criado com origem ${newLead.origin} e interesse no curso ${newLead.interestCourse}. Responsável: ${newLead.responsibleName}.`,
      authorName: 'Sistema CRM',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    const resultadoTimeline = await salvarTimelineCRM(autoTimeline);
    if (resultadoTimeline.ok) setTimelineItems(prev => [autoTimeline, ...prev]);
  };

  const handleUpdateLead = async (updatedLead: Lead) => {
    const resultado = await salvarLeadCRM(updatedLead);
    if (!resultado.ok) { setErroCRM(resultado.erro || 'Não foi possível salvar o lead.'); return; }
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    const atual = leads.find(l => l.id === leadId);
    if (!atual) return;
    const atualizado = { ...atual, status: newStatus };
    const resultado = await salvarLeadCRM(atualizado);
    if (!resultado.ok) { setErroCRM(resultado.erro || 'Não foi possível salvar a etapa do lead.'); return; }
    setLeads(prev => prev.map(l => l.id === leadId ? atualizado : l));

    const statusTimeline: CRMTimelineItem = {
      id: `time-status-${Date.now()}`,
      leadId: leadId,
      type: 'Observação',
      title: `Etapa Atualizada para ${newStatus}`,
      description: `O status do lead ${atual.name} foi alterado para "${newStatus}".`,
      authorName: 'Atendente CRM',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    const resultadoTimeline = await salvarTimelineCRM(statusTimeline);
    if (resultadoTimeline.ok) setTimelineItems(items => [statusTimeline, ...items]);
  };

  const handleDeleteLead = async (leadId: string) => {
    const resultado = await excluirLeadCRM(leadId);
    if (!resultado.ok) { setErroCRM(resultado.erro || 'Não foi possível apagar o lead.'); return; }
    setLeads(prev => prev.filter(l => l.id !== leadId));
  };

  // Task Operations
  const handleAddTask = async (task: CRMTask) => {
    const resultado = await salvarTarefaCRM(task);
    if (!resultado.ok) { setErroCRM(resultado.erro || 'Não foi possível salvar a tarefa.'); return; }
    setTasks(prev => [task, ...prev]);
  };

  const handleUpdateTask = async (task: CRMTask) => {
    const resultado = await salvarTarefaCRM(task);
    if (!resultado.ok) { setErroCRM(resultado.erro || 'Não foi possível salvar a tarefa.'); return; }
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  };

  const handleDeleteTask = async (taskId: string) => {
    const resultado = await excluirTarefaCRM(taskId);
    if (!resultado.ok) { setErroCRM(resultado.erro || 'Não foi possível apagar a tarefa.'); return; }
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // Calendar Operations
  const handleAddEvent = async (evt: CRMScheduleEvent) => {
    const resultado = await salvarEventoCRM(evt);
    if (!resultado.ok) { setErroCRM(resultado.erro || 'Não foi possível salvar o evento.'); return; }
    setEvents(prev => [evt, ...prev]);
  };

  const handleDeleteEvent = async (evtId: string) => {
    const resultado = await excluirEventoCRM(evtId);
    if (!resultado.ok) { setErroCRM(resultado.erro || 'Não foi possível apagar o evento.'); return; }
    setEvents(prev => prev.filter(e => e.id !== evtId));
  };

  // Employee Operations
  const handleAddEmployee = async (emp: CRMEmployee) => {
    const resultado = await salvarFuncionarioCRM(emp);
    if (!resultado.ok) { setErroCRM(resultado.erro || 'Não foi possível salvar o funcionário.'); return; }
    setEmployees(prev => [...prev, emp]);
  };

  const handleUpdateEmployee = async (emp: CRMEmployee) => {
    const resultado = await salvarFuncionarioCRM(emp);
    if (!resultado.ok) { setErroCRM(resultado.erro || 'Não foi possível salvar o funcionário.'); return; }
    setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
  };

  const handleDeleteEmployee = async (empId: string) => {
    const resultado = await excluirFuncionarioCRM(empId);
    if (!resultado.ok) { setErroCRM(resultado.erro || 'Não foi possível apagar o funcionário.'); return; }
    setEmployees(prev => prev.filter(e => e.id !== empId));
  };

  // Timeline Operations
  const handleAddTimelineItem = async (item: CRMTimelineItem) => {
    const resultado = await salvarTimelineCRM(item);
    if (!resultado.ok) { setErroCRM(resultado.erro || 'Não foi possível salvar o registro de atendimento.'); return; }
    setTimelineItems(prev => [item, ...prev]);
  };

  const handleOpenLeadTimeline = (lead: Lead) => {
    setSelectedTimelineLead(lead);
    setActiveSubTab('atendimento');
  };

  if (carregandoCRM) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <div className="h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold">Carregando dados do CRM...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {erroCRM && (
        <div className="flex items-center justify-between gap-3 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-2xl">
          <p className="text-xs font-bold text-red-700 dark:text-red-400">⚠️ {erroCRM}</p>
          <button
            type="button"
            onClick={() => setErroCRM(null)}
            className="text-[10px] font-bold text-red-600 hover:underline shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Access Control Filter Header */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-blue-900/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-800/60 rounded-2xl text-blue-200 shrink-0">
            <Shield className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <span>Módulo CRM Comercial & Operacional</span>
              <span className="text-[10px] bg-blue-600/60 text-blue-200 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-400/30">
                Controle de Acesso
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              {selectedEmpFilter === 'ALL'
                ? 'Modo Administrador: Exibindo todos os leads, tarefas, notificações e compromissos do sistema.'
                : `Visão Restrita do Funcionário: Exibindo somente registros sob responsabilidade de ${activeEmp?.name || 'Funcionário'}.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-blue-800/50 w-full md:w-auto">
          <Filter className="h-4 w-4 text-blue-400 ml-1 shrink-0" />
          <span className="text-xs font-bold text-slate-200 shrink-0">Visão:</span>
          <select
            value={selectedEmpFilter}
            onChange={(e) => setSelectedEmpFilter(e.target.value)}
            className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full md:w-auto"
          >
            <option value="ALL"> Visão Geral de Administrador (Ver Tudo)</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                 Visão Individual ({emp.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Secondary Top Navigation Bar for CRM Sub-tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-2 shadow-xs">
        <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none py-1 px-1">
          
          <div className="flex items-center gap-1 min-w-max">
            
            <button
              onClick={() => setActiveSubTab('dashboard')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveSubTab('leads')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'leads'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Leads ({displayedLeads.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('funil')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'funil'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Kanban className="h-4 w-4" />
              <span>Funil de Vendas</span>
            </button>

            <button
              onClick={() => setActiveSubTab('tarefas')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'tarefas'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              <span>Tarefas ({displayedTasks.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('agenda')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'agenda'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Agenda ({displayedEvents.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('atendimento')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'atendimento'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Atendimento</span>
            </button>

            <button
              onClick={() => setActiveSubTab('funcionarios')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'funcionarios'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>Funcionários</span>
            </button>

            <button
              onClick={() => setActiveSubTab('relatorios')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'relatorios'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Indicadores</span>
            </button>

          </div>

        </div>
      </div>

      {/* Sub-tab Content Rendering */}
      <div>
        {activeSubTab === 'dashboard' && (
          <CRMDashboard
            leads={displayedLeads}
            tasks={displayedTasks}
            events={displayedEvents}
            employees={employees}
            onNavigateToTab={(tab) => setActiveSubTab(tab as CRMSubTab)}
          />
        )}

        {activeSubTab === 'leads' && (
          <CRMLeads
            leads={displayedLeads}
            employees={employees}
            onAddLead={handleAddLead}
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
            onOpenTimeline={handleOpenLeadTimeline}
            searchQuery={globalSearch}
          />
        )}

        {activeSubTab === 'funil' && (
          <CRMFunnelKanban
            leads={displayedLeads}
            employees={employees}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onUpdateLead={handleUpdateLead}
            onOpenTimeline={handleOpenLeadTimeline}
          />
        )}

        {activeSubTab === 'tarefas' && (
          <CRMTasks
            tasks={displayedTasks}
            employees={employees}
            leads={leads}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeSubTab === 'agenda' && (
          <CRMCalendar
            events={displayedEvents}
            leads={leads}
            onAddEvent={handleAddEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        )}

        {activeSubTab === 'atendimento' && (
          <CRMAttendanceTimeline
            selectedLead={selectedTimelineLead}
            timelineItems={timelineItems}
            leads={displayedLeads}
            onSelectLead={setSelectedTimelineLead}
            onAddTimelineItem={handleAddTimelineItem}
            onBackToLeads={() => setActiveSubTab('leads')}
          />
        )}

        {activeSubTab === 'funcionarios' && (
          <CRMEmployees
            employees={employees}
            leads={leads}
            tasks={tasks}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )}

        {activeSubTab === 'relatorios' && (
          <CRMReports
            leads={displayedLeads}
            employees={employees}
            tasks={displayedTasks}
          />
        )}
      </div>

    </div>
  );
};

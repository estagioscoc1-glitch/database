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

  // Persistence Key
  const STORAGE_KEY_LEADS = 'gestao_crm_leads_v1';
  const STORAGE_KEY_TASKS = 'gestao_crm_tasks_v1';
  const STORAGE_KEY_EVENTS = 'gestao_crm_events_v1';
  const STORAGE_KEY_EMPLOYEES = 'gestao_crm_employees_v1';
  const STORAGE_KEY_TIMELINE = 'gestao_crm_timeline_v1';

  // State
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LEADS);
      return saved ? JSON.parse(saved) : initialCRMLeads;
    } catch {
      return initialCRMLeads;
    }
  });

  const [tasks, setTasks] = useState<CRMTask[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TASKS);
      return saved ? JSON.parse(saved) : initialCRMTasks;
    } catch {
      return initialCRMTasks;
    }
  });

  const [events, setEvents] = useState<CRMScheduleEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EVENTS);
      return saved ? JSON.parse(saved) : initialCRMEvents;
    } catch {
      return initialCRMEvents;
    }
  });

  const [employees, setEmployees] = useState<CRMEmployee[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
      return saved ? JSON.parse(saved) : initialCRMEmployees;
    } catch {
      return initialCRMEmployees;
    }
  });

  const [timelineItems, setTimelineItems] = useState<CRMTimelineItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TIMELINE);
      return saved ? JSON.parse(saved) : initialCRMTimeline;
    } catch {
      return initialCRMTimeline;
    }
  });

  const [selectedTimelineLead, setSelectedTimelineLead] = useState<Lead | null>(leads[0] || null);
  const [globalSearch, setGlobalSearch] = useState<string>('');

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

  // Persist effect
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(leads));
    } catch (e) {
      console.error("Error saving leads", e);
    }
  }, [leads]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error("Error saving tasks", e);
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
    } catch (e) {
      console.error("Error saving events", e);
    }
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
    } catch (e) {
      console.error("Error saving employees", e);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TIMELINE, JSON.stringify(timelineItems));
    } catch (e) {
      console.error("Error saving timeline", e);
    }
  }, [timelineItems]);

  // Lead Operations
  const handleAddLead = (newLead: Lead) => {
    setLeads(prev => [newLead, ...prev]);
    // Create automatic initial timeline entry
    const autoTimeline: CRMTimelineItem = {
      id: `time-auto-${Date.now()}`,
      leadId: newLead.id,
      type: 'Observação',
      title: 'Lead Cadastrado no CRM',
      description: `Lead criado com origem ${newLead.origin} e interesse no curso ${newLead.interestCourse}. Responsável: ${newLead.responsibleName}.`,
      authorName: 'Sistema CRM',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setTimelineItems(prev => [autoTimeline, ...prev]);
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  const handleUpdateLeadStatus = (leadId: string, newStatus: LeadStatus) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const updated = { ...l, status: newStatus };
        // Log status change in timeline
        const statusTimeline: CRMTimelineItem = {
          id: `time-status-${Date.now()}`,
          leadId: leadId,
          type: 'Observação',
          title: `Etapa Atualizada para ${newStatus}`,
          description: `O status do lead ${l.name} foi alterado para "${newStatus}".`,
          authorName: 'Atendente CRM',
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
        setTimelineItems(items => [statusTimeline, ...items]);
        return updated;
      }
      return l;
    }));
  };

  const handleDeleteLead = (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
  };

  // Task Operations
  const handleAddTask = (task: CRMTask) => {
    setTasks(prev => [task, ...prev]);
  };

  const handleUpdateTask = (task: CRMTask) => {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // Calendar Operations
  const handleAddEvent = (evt: CRMScheduleEvent) => {
    setEvents(prev => [evt, ...prev]);
  };

  const handleDeleteEvent = (evtId: string) => {
    setEvents(prev => prev.filter(e => e.id !== evtId));
  };

  // Employee Operations
  const handleAddEmployee = (emp: CRMEmployee) => {
    setEmployees(prev => [...prev, emp]);
  };

  const handleUpdateEmployee = (emp: CRMEmployee) => {
    setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
  };

  const handleDeleteEmployee = (empId: string) => {
    setEmployees(prev => prev.filter(e => e.id !== empId));
  };

  // Timeline Operations
  const handleAddTimelineItem = (item: CRMTimelineItem) => {
    setTimelineItems(prev => [item, ...prev]);
  };

  const handleOpenLeadTimeline = (lead: Lead) => {
    setSelectedTimelineLead(lead);
    setActiveSubTab('atendimento');
  };

  return (
    <div className="space-y-6">
      
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

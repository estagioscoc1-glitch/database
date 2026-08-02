import React, { useState } from 'react';
import { 
  Lead, LeadOrigin, LeadStatus, LeadPriority, CRMEmployee 
} from '../../types/crm';
import { 
  Search, Plus, Filter, Phone, MessageCircle, Mail, Tag, 
  MapPin, User, Calendar, Edit, Trash2, Eye, ExternalLink, 
  CheckCircle, Clock, ChevronRight, X, AlertCircle, FileText
} from 'lucide-react';

interface CRMLeadsProps {
  leads: Lead[];
  employees: CRMEmployee[];
  onAddLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onOpenTimeline: (lead: Lead) => void;
  searchQuery?: string;
}

export const CRMLeads: React.FC<CRMLeadsProps> = ({
  leads,
  employees,
  onAddLead,
  onUpdateLead,
  onDeleteLead,
  onOpenTimeline,
  searchQuery = ''
}) => {
  // Local state
  const [localSearch, setLocalSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterOrigin, setFilterOrigin] = useState<string>('todos');
  const [filterCourse, setFilterCourse] = useState<string>('todos');
  const [filterEmployee, setFilterEmployee] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLeadDetail, setSelectedLeadDetail] = useState<Lead | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Lead>>({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    interestCourse: 'Técnico em Enfermagem',
    origin: 'WhatsApp',
    responsibleId: employees[0]?.id || '',
    responsibleName: employees[0]?.name || '',
    status: 'Novo',
    notes: '',
    tags: [],
    priority: 'Média',
    city: 'Ribeirão Preto',
    value: 4500
  });

  const [tagInput, setTagInput] = useState<string>('');

  const activeSearch = searchQuery || localSearch;

  // Filter logic
  const filteredLeads = leads.filter(l => {
    // Search
    if (activeSearch) {
      const q = activeSearch.toLowerCase();
      const matchName = l.name.toLowerCase().includes(q);
      const matchPhone = l.phone.includes(q) || l.whatsapp.includes(q);
      const matchCourse = l.interestCourse.toLowerCase().includes(q);
      const matchEmail = l.email.toLowerCase().includes(q);
      const matchResp = l.responsibleName.toLowerCase().includes(q);
      const matchNotes = l.notes.toLowerCase().includes(q);
      const matchCity = (l.city || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchCourse && !matchEmail && !matchResp && !matchNotes && !matchCity) {
        return false;
      }
    }

    if (filterStatus !== 'todos' && l.status !== filterStatus) return false;
    if (filterOrigin !== 'todos' && l.origin !== filterOrigin) return false;
    if (filterCourse !== 'todos' && l.interestCourse !== filterCourse) return false;
    if (filterEmployee !== 'todos' && l.responsibleId !== filterEmployee) return false;

    return true;
  });

  const handleOpenAddModal = () => {
    setEditingLead(null);
    setFormData({
      name: '',
      phone: '',
      whatsapp: '',
      email: '',
      interestCourse: 'Técnico em Enfermagem',
      origin: 'WhatsApp',
      responsibleId: employees[0]?.id || '',
      responsibleName: employees[0]?.name || '',
      status: 'Novo',
      notes: '',
      tags: ['Novo Lead'],
      priority: 'Média',
      city: 'Ribeirão Preto',
      value: 4500
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({ ...lead });
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('Por favor, informe ao menos o Nome e o Telefone.');
      return;
    }

    const selectedEmp = employees.find(emp => emp.id === formData.responsibleId);
    const respName = selectedEmp ? selectedEmp.name : (formData.responsibleName || 'Consultor');

    const cleanWhatsapp = (formData.whatsapp || formData.phone || '').replace(/\D/g, '');
    const formattedWhatsapp = cleanWhatsapp.length <= 11 ? `55${cleanWhatsapp}` : cleanWhatsapp;

    if (editingLead) {
      const updated: Lead = {
        ...editingLead,
        ...formData,
        responsibleName: respName,
        whatsapp: formattedWhatsapp
      } as Lead;
      onUpdateLead(updated);
    } else {
      const newLead: Lead = {
        id: `lead-${Date.now()}`,
        name: formData.name || '',
        phone: formData.phone || '',
        whatsapp: formattedWhatsapp,
        email: formData.email || '',
        interestCourse: formData.interestCourse || 'Técnico em Enfermagem',
        origin: (formData.origin as LeadOrigin) || 'WhatsApp',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        responsibleId: formData.responsibleId || employees[0]?.id || '',
        responsibleName: respName,
        status: (formData.status as LeadStatus) || 'Novo',
        notes: formData.notes || '',
        tags: formData.tags || ['Novo Lead'],
        priority: (formData.priority as LeadPriority) || 'Média',
        city: formData.city || 'Ribeirão Preto',
        value: Number(formData.value) || 0,
        lastContactDate: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      onAddLead(newLead);
    }

    setIsModalOpen(false);
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const currentTags = formData.tags || [];
    if (!currentTags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...currentTags, tagInput.trim()] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = formData.tags || [];
    setFormData({ ...formData, tags: currentTags.filter(t => t !== tagToRemove) });
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'Novo':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/40';
      case 'Primeiro contato':
        return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-900/40';
      case 'Em negociação':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/40';
      case 'Aguardando retorno':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900/40';
      case 'Documentação':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/40';
      case 'Pré-matrícula':
        return 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-900/40';
      case 'Matriculado':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-extrabold';
      case 'Perdido':
      case 'Cancelar':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/40';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>Gestão de Leads</span>
            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-extrabold">
              {filteredLeads.length} cadastrados
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cadastre, atenda, qualifique e converta interessados em novos alunos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tabela
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                viewMode === 'cards' 
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Cartões
            </button>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" /> Novo Lead
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Search Field */}
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, tel, curso, cidade..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-700 dark:text-slate-200"
          >
            <option value="todos">Status: Todos</option>
            <option value="Novo">Novo</option>
            <option value="Primeiro contato">Primeiro contato</option>
            <option value="Em negociação">Em negociação</option>
            <option value="Aguardando retorno">Aguardando retorno</option>
            <option value="Documentação">Documentação</option>
            <option value="Pré-matrícula">Pré-matrícula</option>
            <option value="Matriculado">Matriculado</option>
            <option value="Perdido">Perdido</option>
          </select>

          <select
            value={filterOrigin}
            onChange={(e) => setFilterOrigin(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-700 dark:text-slate-200"
          >
            <option value="todos">Origem: Todas</option>
            {['Site', 'WhatsApp', 'Instagram', 'Facebook', 'Google', 'Indicação', 'Telefone', 'Evento', 'Visita presencial'].map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-700 dark:text-slate-200"
          >
            <option value="todos">Curso: Todos</option>
            {Array.from(new Set(leads.map(l => l.interestCourse))).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-700 dark:text-slate-200"
          >
            <option value="todos">Responsável: Todos</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4">Lead / Contato</th>
                  <th className="py-3.5 px-4">Curso de Interesse</th>
                  <th className="py-3.5 px-4">Origem</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Responsável</th>
                  <th className="py-3.5 px-4">Cidade</th>
                  <th className="py-3.5 px-4 text-center">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Nenhum lead encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span 
                            onClick={() => setSelectedLeadDetail(lead)}
                            className="font-extrabold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                          >
                            {lead.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-semibold">{lead.phone} • {lead.email}</span>
                          <div className="flex items-center gap-1 mt-1">
                            {lead.tags.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {lead.interestCourse}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {lead.origin}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={lead.status}
                          onChange={(e) => onUpdateLead({ ...lead, status: e.target.value as LeadStatus })}
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border cursor-pointer ${getStatusBadge(lead.status)}`}
                        >
                          <option value="Novo">Novo</option>
                          <option value="Primeiro contato">Primeiro contato</option>
                          <option value="Em negociação">Em negociação</option>
                          <option value="Aguardando retorno">Aguardando retorno</option>
                          <option value="Documentação">Documentação</option>
                          <option value="Pré-matrícula">Pré-matrícula</option>
                          <option value="Matriculado">Matriculado</option>
                          <option value="Perdido">Perdido</option>
                          <option value="Cancelar">Cancelar</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={lead.responsibleId}
                          onChange={(e) => {
                            const emp = employees.find(x => x.id === e.target.value);
                            onUpdateLead({ 
                              ...lead, 
                              responsibleId: e.target.value,
                              responsibleName: emp ? emp.name : lead.responsibleName 
                            });
                          }}
                          className="text-[11px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1"
                        >
                          {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {lead.city || 'Ribeirão Preto'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          
                          {/* WhatsApp Direct */}
                          <a
                            href={`https://wa.me/${lead.whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg transition-all"
                            title="Abrir WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>

                          {/* Call Direct */}
                          <a
                            href={`tel:${lead.phone.replace(/\D/g, '')}`}
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg transition-all"
                            title="Ligar"
                          >
                            <Phone className="h-4 w-4" />
                          </a>

                          {/* Timeline / Atendimento */}
                          <button
                            onClick={() => onOpenTimeline(lead)}
                            className="p-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400 rounded-lg transition-all cursor-pointer"
                            title="Linha do Tempo / Atendimento"
                          >
                            <FileText className="h-4 w-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(lead)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg transition-all cursor-pointer"
                            title="Editar Lead"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Excluir o lead ${lead.name}?`)) {
                                onDeleteLead(lead.id);
                              }
                            }}
                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg transition-all cursor-pointer"
                            title="Excluir Lead"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid of Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h4 
                    onClick={() => setSelectedLeadDetail(lead)}
                    className="font-extrabold text-slate-900 dark:text-white text-base hover:text-blue-600 cursor-pointer"
                  >
                    {lead.name}
                  </h4>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">{lead.interestCourse}</p>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusBadge(lead.status)}`}>
                  {lead.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-y border-slate-100 dark:border-slate-800 py-3">
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {lead.phone}
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {lead.email}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" /> {lead.city || 'Ribeirão Preto'} • Origem: <strong>{lead.origin}</strong>
                </p>
                <p className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-slate-400" /> Resp: <strong>{lead.responsibleName}</strong>
                </p>
              </div>

              {lead.notes && (
                <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl italic">
                  "{lead.notes}"
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1">
                  <a
                    href={`https://wa.me/${lead.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                  <button
                    onClick={() => onOpenTimeline(lead)}
                    className="px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950/60 dark:text-purple-300 text-xs font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    Atendimento
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(lead)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteLead(lead.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                {editingLead ? 'Editar Cadastro do Lead' : 'Cadastrar Novo Lead'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    placeholder="ex: João da Silva"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone / Celular *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value, whatsapp: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    placeholder="(16) 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    Curso de Interesse
                  </label>
                  <select
                    value={formData.interestCourse || 'Técnico em Enfermagem'}
                    onChange={(e) => setFormData({ ...formData, interestCourse: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Técnico em Enfermagem">Técnico em Enfermagem</option>
                    <option value="Técnico em Informática">Técnico em Informática</option>
                    <option value="Administração de Empresas">Administração de Empresas</option>
                    <option value="Técnico em Radiologia">Técnico em Radiologia</option>
                    <option value="Técnico em Edificações">Técnico em Edificações</option>
                    <option value="Técnico em Estética">Técnico em Estética</option>
                    <option value="Design Interiores">Design Interiores</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    Origem do Lead
                  </label>
                  <select
                    value={formData.origin || 'WhatsApp'}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value as LeadOrigin })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {['Site', 'WhatsApp', 'Instagram', 'Facebook', 'Google', 'Indicação', 'Telefone', 'Evento', 'Visita presencial', 'Outros'].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    Responsável (Consultor)
                  </label>
                  <select
                    value={formData.responsibleId || ''}
                    onChange={(e) => setFormData({ ...formData, responsibleId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    Status Atual
                  </label>
                  <select
                    value={formData.status || 'Novo'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Novo">Novo</option>
                    <option value="Primeiro contato">Primeiro contato</option>
                    <option value="Em negociação">Em negociação</option>
                    <option value="Aguardando retorno">Aguardando retorno</option>
                    <option value="Documentação">Documentação</option>
                    <option value="Pré-matrícula">Pré-matrícula</option>
                    <option value="Matriculado">Matriculado</option>
                    <option value="Perdido">Perdido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    placeholder="Ribeirão Preto"
                  />
                </div>

              </div>

              {/* Tags Manager */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Tags / Etiquetas
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                    placeholder="Adicionar tag (ex: Urgente, Bolsista)..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-xs font-extrabold rounded-xl"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(formData.tags || []).map((t, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-lg font-bold">
                      #{t}
                      <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-rose-600">×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Observações
                </label>
                <textarea
                  rows={3}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  placeholder="Anotações gerais do atendimento..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md"
                >
                  {editingLead ? 'Salvar Alterações' : 'Cadastrar Lead'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Lead Detail View Modal */}
      {selectedLeadDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-lg text-slate-900 dark:text-white">Ficha do Lead</h3>
              <button onClick={() => setSelectedLeadDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400">Nome</span>
                <p className="text-sm font-black text-slate-900 dark:text-white">{selectedLeadDetail.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Telefone</span>
                  <p className="font-bold">{selectedLeadDetail.phone}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">E-mail</span>
                  <p className="font-bold">{selectedLeadDetail.email || 'Não informado'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Curso</span>
                  <p className="font-bold text-blue-600">{selectedLeadDetail.interestCourse}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Origem</span>
                  <p className="font-bold">{selectedLeadDetail.origin}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Status</span>
                  <p className="font-bold">{selectedLeadDetail.status}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Responsável</span>
                  <p className="font-bold">{selectedLeadDetail.responsibleName}</p>
                </div>
              </div>

              {selectedLeadDetail.notes && (
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Observações</span>
                  <p className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl italic font-medium">{selectedLeadDetail.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  const lead = selectedLeadDetail;
                  setSelectedLeadDetail(null);
                  onOpenTimeline(lead);
                }}
                className="px-4 py-2 bg-purple-600 text-white text-xs font-extrabold rounded-xl"
              >
                Abrir Atendimento / Linha do Tempo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

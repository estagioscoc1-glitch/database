import React, { useState } from 'react';
import { Lead, LeadStatus, CRMEmployee } from '../../types/crm';
import { 
  Kanban, Plus, MessageCircle, Phone, User, Tag, 
  ArrowRight, ArrowLeft, Clock, MoreVertical, Edit, FileText
} from 'lucide-react';

interface CRMFunnelKanbanProps {
  leads: Lead[];
  employees: CRMEmployee[];
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
  onUpdateLead: (lead: Lead) => void;
  onOpenTimeline: (lead: Lead) => void;
}

const KANBAN_COLUMNS: { id: LeadStatus; label: string; color: string; badge: string }[] = [
  { id: 'Novo', label: 'Novo Lead', color: 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' },
  { id: 'Primeiro contato', label: 'Contato Realizado', color: 'border-sky-500 bg-sky-50/30 dark:bg-sky-950/20', badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200' },
  { id: 'Em negociação', label: 'Negociação', color: 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/20', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200' },
  { id: 'Documentação', label: 'Documentação', color: 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20', badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200' },
  { id: 'Pré-matrícula', label: 'Pré-Matrícula', color: 'border-teal-500 bg-teal-50/30 dark:bg-teal-950/20', badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200' },
  { id: 'Matriculado', label: 'Matrícula Concluída', color: 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' },
  { id: 'Perdido', label: 'Perdido', color: 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200' }
];

export const CRMFunnelKanban: React.FC<CRMFunnelKanbanProps> = ({
  leads,
  employees,
  onUpdateLeadStatus,
  onUpdateLead,
  onOpenTimeline
}) => {
  const [selectedLeadForQuickEdit, setSelectedLeadForQuickEdit] = useState<Lead | null>(null);

  // Drag and drop support
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      onUpdateLeadStatus(leadId, newStatus);
    }
    setDraggedLeadId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Kanban className="h-5 w-5 text-blue-600" />
            <span>Funil de Vendas (Kanban)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Arraste os cartões entre as colunas para atualizar a etapa de negociação em tempo real.
          </p>
        </div>

        <div className="text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          💡 Dica: Arraste os cards ou use os botões direcionais
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {KANBAN_COLUMNS.map((col) => {
          const colLeads = leads.filter(l => l.status === col.id);
          const colValueSum = colLeads.reduce((acc, l) => acc + (l.value || 0), 0);

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex-shrink-0 w-80 rounded-3xl border-t-4 ${col.color} border-slate-200 dark:border-slate-800 p-3.5 space-y-3 min-h-[500px] flex flex-col`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">{col.label}</h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${col.badge}`}>
                    {colLeads.length}
                  </span>
                </div>
                {colValueSum > 0 && (
                  <span className="text-[10px] font-bold text-slate-500">
                    R$ {colValueSum.toLocaleString('pt-BR')}
                  </span>
                )}
              </div>

              {/* Cards List */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[650px] pr-1">
                {colLeads.length === 0 ? (
                  <div className="h-28 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-bold">
                    Solte cards aqui
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2.5 relative group"
                    >
                      {/* Card Title & Course */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-black text-slate-900 dark:text-white text-xs hover:text-blue-600 transition-colors">
                            {lead.name}
                          </h4>
                          <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 block mt-0.5">
                            {lead.interestCourse}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedLeadForQuickEdit(lead)}
                          className="text-slate-300 hover:text-slate-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Info lines */}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                        <p className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-slate-400" /> Resp: <strong className="text-slate-700 dark:text-slate-200">{lead.responsibleName.split(' ')[0]}</strong>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-slate-400" /> Entrou: {lead.createdAt.substring(0, 10)}
                        </p>
                      </div>

                      {/* Tags */}
                      {lead.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.map((tag, idx) => (
                            <span key={idx} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <a
                            href={`https://wa.me/${lead.whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={() => onOpenTimeline(lead)}
                            className="p-1 bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400 rounded-lg cursor-pointer"
                            title="Ver Atendimento"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Move status buttons */}
                        <div className="flex items-center gap-1">
                          {col.id !== 'Novo' && (
                            <button
                              onClick={() => {
                                const prevIdx = KANBAN_COLUMNS.findIndex(c => c.id === col.id) - 1;
                                if (prevIdx >= 0) {
                                  onUpdateLeadStatus(lead.id, KANBAN_COLUMNS[prevIdx].id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-md"
                              title="Recuar Etapa"
                            >
                              <ArrowLeft className="h-3 w-3" />
                            </button>
                          )}
                          {col.id !== 'Matriculado' && col.id !== 'Perdido' && (
                            <button
                              onClick={() => {
                                const nextIdx = KANBAN_COLUMNS.findIndex(c => c.id === col.id) + 1;
                                if (nextIdx < KANBAN_COLUMNS.length) {
                                  onUpdateLeadStatus(lead.id, KANBAN_COLUMNS[nextIdx].id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 rounded-md"
                              title="Avançar Etapa"
                            >
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Edit Modal */}
      {selectedLeadForQuickEdit && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Editar Card: {selectedLeadForQuickEdit.name}
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Responsável</label>
              <select
                value={selectedLeadForQuickEdit.responsibleId}
                onChange={(e) => {
                  const emp = employees.find(x => x.id === e.target.value);
                  const updated = {
                    ...selectedLeadForQuickEdit,
                    responsibleId: e.target.value,
                    responsibleName: emp ? emp.name : selectedLeadForQuickEdit.responsibleName
                  };
                  setSelectedLeadForQuickEdit(updated);
                  onUpdateLead(updated);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
              >
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Observações do Card</label>
              <textarea
                rows={3}
                value={selectedLeadForQuickEdit.notes || ''}
                onChange={(e) => {
                  const updated = { ...selectedLeadForQuickEdit, notes: e.target.value };
                  setSelectedLeadForQuickEdit(updated);
                  onUpdateLead(updated);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLeadForQuickEdit(null)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-extrabold rounded-xl"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

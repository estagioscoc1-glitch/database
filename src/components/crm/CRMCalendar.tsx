import React, { useState } from 'react';
import { CRMScheduleEvent, EventType, Lead } from '../../types/crm';
import { 
  Calendar as CalendarIcon, Plus, Clock, User, 
  MapPin, CheckCircle, ChevronLeft, ChevronRight, X 
} from 'lucide-react';

interface CRMCalendarProps {
  events: CRMScheduleEvent[];
  leads: Lead[];
  onAddEvent: (evt: CRMScheduleEvent) => void;
  onDeleteEvent: (evtId: string) => void;
}

export const CRMCalendar: React.FC<CRMCalendarProps> = ({
  events,
  leads,
  onAddEvent,
  onDeleteEvent
}) => {
  const [viewMode, setViewMode] = useState<'dia' | 'semana' | 'mes' | 'lista'>('mes');
  const [selectedDate, setSelectedDate] = useState<string>('2026-07-26');
  
  // Add Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<CRMScheduleEvent>>({
    title: '',
    type: 'Compromisso',
    date: '2026-07-26',
    time: '14:00',
    responsibleName: 'Carlos Alberto Eduardo',
    notes: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    const selectedLead = leads.find(l => l.id === formData.leadId);

    const newEvt: CRMScheduleEvent = {
      id: `evt-${Date.now()}`,
      title: formData.title || '',
      type: (formData.type as EventType) || 'Compromisso',
      date: formData.date || selectedDate,
      time: formData.time || '10:00',
      leadId: formData.leadId,
      leadName: selectedLead ? selectedLead.name : undefined,
      responsibleName: formData.responsibleName || 'Consultor',
      notes: formData.notes
    };

    onAddEvent(newEvt);
    setIsModalOpen(false);
  };

  const getTypeBadge = (t: EventType) => {
    switch (t) {
      case 'Visita': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
      case 'Retorno': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
      case 'Reunião': return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300';
      case 'Compromisso': return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300';
      case 'Prazo de matrícula': return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            <span>Agenda Integrada de Vendas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Organize visitas, retornos de ligações, reuniões e prazos de matrícula da instituição.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-extrabold">
            {(['dia', 'semana', 'mes', 'lista'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  viewMode === mode 
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Novo Agendamento
          </button>
        </div>
      </div>

      {/* Main Calendar Display */}
      {viewMode === 'lista' || viewMode === 'dia' ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Compromissos Agendados
          </h3>

          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum compromisso agendado.</p>
            ) : (
              events.map((evt) => (
                <div key={evt.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-150 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${getTypeBadge(evt.type)}`}>
                        {evt.type}
                      </span>
                      <h4 className="font-black text-xs text-slate-900 dark:text-white">{evt.title}</h4>
                    </div>
                    {evt.leadName && (
                      <p className="text-xs font-bold text-blue-600">Lead: {evt.leadName}</p>
                    )}
                    {evt.notes && <p className="text-xs text-slate-500 italic">{evt.notes}</p>}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">{evt.date}</span>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">{evt.time}</span>
                    <button
                      onClick={() => onDeleteEvent(evt.id)}
                      className="text-[10px] text-rose-500 hover:underline mt-1 block font-bold"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Month Grid Preview */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Julho de 2026
            </h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-xl">
              {events.length} Agendamentos
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold text-slate-400 border-b pb-2">
            <div>DOM</div><div>SEG</div><div>TER</div><div>QUA</div><div>QUI</div><div>SEX</div><div>SÁB</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 31 }, (_, i) => {
              const dayNum = i + 1;
              const dateStr = `2026-07-${dayNum < 10 ? '0' + dayNum : dayNum}`;
              const dayEvts = events.filter(e => e.date === dateStr);
              const isSelected = selectedDate === dateStr;

              return (
                <div
                  key={dayNum}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`min-h-[80px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected 
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30' 
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className={`text-xs font-extrabold ${dayNum === 26 ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}>
                    {dayNum}
                  </span>

                  <div className="space-y-1">
                    {dayEvts.map(e => (
                      <div key={e.id} className="text-[9px] font-bold truncate px-1 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {e.time} {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Novo Agendamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Título do Agendamento *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="ex: Visita Guiada ao Campus..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Tipo de Evento</label>
                <select
                  value={formData.type || 'Compromisso'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as EventType })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                >
                  <option value="Compromisso">Compromisso</option>
                  <option value="Retorno">Retorno de Ligação</option>
                  <option value="Visita">Visita Presencial</option>
                  <option value="Reunião">Reunião</option>
                  <option value="Prazo de documentos">Prazo de Documentos</option>
                  <option value="Prazo de matrícula">Prazo de Matrícula</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Data</label>
                  <input
                    type="date"
                    value={formData.date || selectedDate}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Horário</label>
                  <input
                    type="time"
                    value={formData.time || '10:00'}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Vincular a Lead</label>
                <select
                  value={formData.leadId || ''}
                  onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                >
                  <option value="">Nenhum lead específico</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name} - {l.interestCourse}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-extrabold rounded-xl"
                >
                  Agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

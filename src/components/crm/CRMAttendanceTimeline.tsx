import React, { useState } from 'react';
import { Lead, CRMTimelineItem, TimelineType } from '../../types/crm';
import { 
  Phone, MessageSquare, MapPin, FileText, Image, Mic, 
  Paperclip, Plus, Calendar, Clock, User, CheckCircle2, ArrowLeft, Send
} from 'lucide-react';

interface CRMAttendanceTimelineProps {
  selectedLead: Lead | null;
  timelineItems: CRMTimelineItem[];
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onAddTimelineItem: (item: CRMTimelineItem) => void;
  onBackToLeads?: () => void;
}

export const CRMAttendanceTimeline: React.FC<CRMAttendanceTimelineProps> = ({
  selectedLead,
  timelineItems,
  leads,
  onSelectLead,
  onAddTimelineItem,
  onBackToLeads
}) => {
  const currentLead = selectedLead || leads[0];

  // New interaction form
  const [interactionType, setInteractionType] = useState<TimelineType>('Observação');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  const activeTimeline = currentLead 
    ? timelineItems.filter(t => t.leadId === currentLead.id)
    : [];

  const handleAddInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLead) return;

    const newItem: CRMTimelineItem = {
      id: `time-${Date.now()}`,
      leadId: currentLead.id,
      type: interactionType,
      title: title || `Registro de ${interactionType}`,
      description: description || 'Interação registrada no CRM.',
      authorName: 'Consultor Ativo',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    onAddTimelineItem(newItem);
    setTitle('');
    setDescription('');
    setIsRecordingAudio(false);
  };

  const getTimelineIcon = (type: TimelineType) => {
    switch (type) {
      case 'Legação': return <Phone className="h-4 w-4 text-blue-600" />;
      case 'Mensagem': return <MessageSquare className="h-4 w-4 text-emerald-600" />;
      case 'Visita': return <MapPin className="h-4 w-4 text-amber-600" />;
      case 'Documento enviado':
      case 'Arquivo': return <Paperclip className="h-4 w-4 text-purple-600" />;
      case 'Áudio': return <Mic className="h-4 w-4 text-rose-600" />;
      case 'Foto': return <Image className="h-4 w-4 text-teal-600" />;
      default: return <FileText className="h-4 w-4 text-indigo-600" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToLeads && (
            <button
              onClick={onBackToLeads}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              title="Voltar para os Leads"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span>Linha do Tempo de Atendimento</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Histórico omnicanal completo de ligações, mensagens, notas, arquivos e visitas.
            </p>
          </div>
        </div>

        {/* Lead Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-slate-400">Lead:</span>
          <select
            value={currentLead?.id || ''}
            onChange={(e) => {
              const l = leads.find(x => x.id === e.target.value);
              if (l) onSelectLead(l);
            }}
            className="text-xs font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {leads.map(l => (
              <option key={l.id} value={l.id}>{l.name} ({l.interestCourse})</option>
            ))}
          </select>
        </div>
      </div>

      {currentLead && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Lead Details Sidebar Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 h-fit">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full">
                {currentLead.status}
              </span>
              <h3 className="font-black text-lg text-slate-900 dark:text-white mt-2">{currentLead.name}</h3>
              <p className="text-xs font-bold text-slate-500">{currentLead.interestCourse}</p>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Telefone:</span>
                <strong>{currentLead.phone}</strong>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">WhatsApp:</span>
                <a 
                  href={`https://wa.me/${currentLead.whatsapp}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-emerald-600 font-bold hover:underline"
                >
                  Abrir Conversa
                </a>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Origem:</span>
                <strong>{currentLead.origin}</strong>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Responsável:</span>
                <strong>{currentLead.responsibleName}</strong>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Cidade:</span>
                <strong>{currentLead.city || 'Ribeirão Preto'}</strong>
              </p>
            </div>

            {currentLead.notes && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 italic">
                "{currentLead.notes}"
              </div>
            )}
          </div>

          {/* Timeline Feed & New Interaction Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* New Interaction Registration Box */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" /> Registar Novo Atendimento
              </h3>

              <form onSubmit={handleAddInteraction} className="space-y-3">
                {/* Type buttons */}
                <div className="flex flex-wrap gap-2">
                  {(['Observação', 'Legação', 'Mensagem', 'Visita', 'Documento enviado', 'Áudio', 'Foto'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInteractionType(type)}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                        interactionType === type 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {getTimelineIcon(type)}
                      <span>{type}</span>
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Título do atendimento (ex: Ligação de acompanhamento)..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />

                <textarea
                  rows={3}
                  placeholder="Detalhes, resposta do lead ou resumo da conversa..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-slate-400">
                    <button type="button" className="p-1.5 hover:text-slate-600" title="Anexar arquivo">
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button type="button" className="p-1.5 hover:text-slate-600" title="Anexar imagem">
                      <Image className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" /> Registrar Interação
                  </button>
                </div>
              </form>
            </div>

            {/* Timeline Stream */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                Histórico do Atendimento ({activeTimeline.length} registros)
              </h3>

              <div className="relative border-l-2 border-slate-100 dark:border-slate-800 pl-6 space-y-6 ml-3">
                {activeTimeline.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhum histórico registrado para este lead ainda.</p>
                ) : (
                  activeTimeline.map((item) => (
                    <div key={item.id} className="relative group">
                      {/* Icon Node */}
                      <div className="absolute -left-9 top-0 p-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-full shadow-xs">
                        {getTimelineIcon(item.type)}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-xs text-slate-900 dark:text-white">{item.title}</h4>
                          <span className="text-[10px] font-bold text-slate-400">{item.createdAt}</span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          {item.description}
                        </p>

                        <div className="text-[10px] text-slate-400 font-extrabold pt-1">
                          Registrado por: {item.authorName}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

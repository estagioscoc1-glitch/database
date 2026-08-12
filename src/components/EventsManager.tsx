import React, { useState, useEffect } from 'react';
import { escapeHtml } from '../../utils/security';
import { useApp } from '../../context/AppContext';
import { EventMinicourse, EventParticipant } from '../../types/movimentacao';
import { 
  getEvents, saveEvent, saveEventParticipant, getEventParticipants, getOfficialTemplates, removeEventParticipant 
} from '../../services/movimentacaoStorage';
import { MovimentacaoDocumentPrintModal } from './MovimentacaoDocumentPrintModal';
import { 
  Sparkles, Calendar, Plus, Users, Award, CheckCircle2, DollarSign, Search, Printer, AlertCircle, Trash2, Upload, FileCheck, UserX, Check, X
} from 'lucide-react';

interface EventsManagerProps {
  currentUser: string;
}

export const EventsManager: React.FC<EventsManagerProps> = ({ currentUser }) => {
  const { users } = useApp();
  const [events, setEvents] = useState<EventMinicourse[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  
  // New Event Form
  const [title, setTitle] = useState<string>('');
  const [instructor, setInstructor] = useState<string>('');
  const [location, setLocation] = useState<string>('Auditório Principal - Bloco B');
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [workloadHours, setWorkloadHours] = useState<number>(20);
  const [feeValue, setFeeValue] = useState<number>(50);

  // New Participant Form
  const [participantName, setParticipantName] = useState<string>('');
  const [participantCpf, setParticipantCpf] = useState<string>('');

  // Certificate Modal
  const [certificateModal, setCertificateModal] = useState<{ title: string; contentHtml: string } | null>(null);

  // Upload Certificate State
  const [uploadModalPart, setUploadModalPart] = useState<EventParticipant | null>(null);
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const list = getEvents();
    setEvents(list);
    if (list.length > 0 && !selectedEventId) {
      setSelectedEventId(list[0].id);
      setParticipants(getEventParticipants(list[0].id));
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      setParticipants(getEventParticipants(selectedEventId));
    }
  }, [selectedEventId]);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !instructor.trim()) return;

    const newEv: EventMinicourse = {
      id: `evt_${Date.now()}`,
      title: title.trim(),
      instructor: instructor.trim(),
      location,
      date: eventDate,
      time: '14:00',
      workloadHours,
      description: title.trim(),
      feeValue,
      createdAt: new Date().toISOString(),
      createdBy: currentUser
    };

    saveEvent(newEv, currentUser);
    const updated = getEvents();
    setEvents(updated);
    setSelectedEventId(newEv.id);
    setParticipants(getEventParticipants(newEv.id));
    setTitle('');
    setInstructor('');
    setNotification({ type: 'success', message: 'Minicurso / Evento cadastrado com sucesso!' });
  };

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    if (!participantName.trim()) return;

    // Try matching student in system users to associate studentId & enrollment
    const matchedStudent = users.find(u => 
      u.name.toLowerCase().includes(participantName.trim().toLowerCase()) ||
      (participantCpf && u.enrollment && u.enrollment.includes(participantCpf.trim()))
    );

    const part: EventParticipant = {
      id: `part_${Date.now()}`,
      eventId: selectedEvent.id,
      studentId: matchedStudent ? matchedStudent.id : `st_${Date.now()}`,
      studentName: participantName.trim(),
      enrollmentNumber: matchedStudent ? (matchedStudent.enrollment || participantCpf.trim()) : (participantCpf.trim() || 'EVT-2026'),
      paid: true,
      attended: true,
      registeredAt: new Date().toISOString()
    };

    saveEventParticipant(part);
    setParticipants(getEventParticipants(selectedEvent.id));
    setParticipantName('');
    setParticipantCpf('');
    setNotification({ type: 'success', message: `Inscrição de ${part.studentName} confirmada!` });
  };

  // Toggle participant attendance (Presente / Ausente)
  const handleToggleAttendance = (part: EventParticipant) => {
    const updated: EventParticipant = {
      ...part,
      attended: !part.attended
    };
    saveEventParticipant(updated);
    if (selectedEventId) {
      setParticipants(getEventParticipants(selectedEventId));
    }
  };

  // Purge participants who did not attend (Limpar Ausentes)
  const handlePurgeNonAttendees = () => {
    if (!selectedEvent) return;
    const absents = participants.filter(p => !p.attended);
    if (absents.length === 0) {
      setNotification({ type: 'error', message: 'Não há participantes marcados como ausentes nesta lista.' });
      return;
    }

    if (window.confirm(`Confirma a remoção de ${absents.length} participante(s) ausente(s)? Ficarão mantidos apenas os participantes com presença confirmada.`)) {
      absents.forEach(p => removeEventParticipant(p.id));
      const remaining = getEventParticipants(selectedEvent.id);
      setParticipants(remaining);
      setNotification({ type: 'success', message: `Lista limpa com sucesso! Permanecem apenas ${remaining.length} participante(s) presentes com direito ao certificado.` });
    }
  };

  const handleGenerateCertificate = (evt: EventMinicourse, part: EventParticipant) => {
    // Mark certificate generated on participant record
    const updatedPart: EventParticipant = {
      ...part,
      certificateGenerated: true,
      issueDate: new Date().toISOString()
    };
    saveEventParticipant(updatedPart);
    setParticipants(getEventParticipants(evt.id));

    const templates = getOfficialTemplates();
    const certTpl = templates.find(t => t.docType === 'CERTIFICADO') || templates[0];

    const html = (certTpl?.contentHtml || `
      <div style="padding: 40px; text-align: center; border: 12px double #1e3a8a; font-family: 'Times New Roman', serif; background-color: #f8fafc; color: #0f172a;">
        <h1 style="font-size: 32px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; margin-bottom: 20px;">CERTIFICADO DE CONCLUSÃO</h1>
        <p style="font-size: 16px; margin-bottom: 20px;">A Diretoria Acadêmica do Colégio e Faculdade Oswaldo Cruz certifica que</p>
        <h2 style="font-size: 26px; font-weight: bold; color: #1d4ed8; text-decoration: underline; margin-bottom: 20px;">{NOME_ALUNO}</h2>
        <p style="font-size: 15px; line-height: 1.8; margin-bottom: 30px;">
          Participou e concluiu com êxito o minicurso de extensão de <strong>{CURSO}</strong>, realizado em <strong>{DATA}</strong>, com carga horária total de <strong>{CARGA_HORARIA} horas complementares</strong>, sob instrução do(a) prof(a) <strong>{PROFESSOR}</strong>.
        </p>
        <div style="margin-top: 50px; display: flex; justify-content: space-around; align-items: flex-end;">
          <div style="text-align: center; border-top: 1px solid #334155; width: 220px; padding-top: 5px; font-size: 12px;">{PROFESSOR}<br/>Instrutor / Docente</div>
          <div style="text-align: center; border-top: 1px solid #334155; width: 220px; padding-top: 5px; font-size: 12px;">Direção Acadêmica<br/>Colégio Oswaldo Cruz</div>
        </div>
      </div>
    `)
      .replace(/{NOME_ALUNO}/g, escapeHtml(part.studentName))
      .replace(/{CPF}/g, escapeHtml(part.enrollmentNumber))
      .replace(/{CURSO}/g, escapeHtml(evt.title))
      .replace(/{CARGA_HORARIA}/g, escapeHtml(evt.workloadHours.toString()))
      .replace(/{DATA}/g, escapeHtml(new Date(evt.date).toLocaleDateString('pt-BR')))
      .replace(/{PROFESSOR}/g, escapeHtml(evt.instructor));

    setCertificateModal({
      title: `Certificado Oficial - ${part.studentName}`,
      contentHtml: html
    });
  };

  // Upload custom Certificate PDF file for a participant
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedFileBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUploadedCertificate = () => {
    if (!uploadModalPart || !uploadedFileBase64) return;

    const updated: EventParticipant = {
      ...uploadModalPart,
      certificateGenerated: true,
      certificateUrl: uploadedFileBase64,
      certificateFileName: uploadedFileName || `Certificado_${uploadModalPart.studentName}.pdf`,
      issueDate: new Date().toISOString()
    };

    saveEventParticipant(updated);
    if (selectedEventId) {
      setParticipants(getEventParticipants(selectedEventId));
    }

    setUploadModalPart(null);
    setUploadedFileBase64(null);
    setUploadedFileName('');
    setNotification({ type: 'success', message: `Certificado em PDF anexado com sucesso para ${updated.studentName}! O aluno já pode visualizar e baixar no Portal.` });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-400/30 text-amber-300">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black">Minicursos, Extensão e Eventos</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Inscrição de participantes, caixa do evento e emissão instantânea de certificados.
              </p>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-2xl text-xs font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {notification.message}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Create Event Form */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">
            Cadastrar Novo Minicurso / Evento
          </h3>

          <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Título do Evento *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Minicurso de Primeiros Socorros e Urgência"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Palestrante / Instrutor *</label>
              <input
                type="text"
                required
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="Ex: Dr. Roberto Alcantara"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Carga Horária (h)</label>
                <input
                  type="number"
                  value={workloadHours}
                  onChange={(e) => setWorkloadHours(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Inscrição (R$)</label>
                <input
                  type="number"
                  value={feeValue}
                  onChange={(e) => setFeeValue(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data de Realização</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 text-white font-black rounded-xl shadow cursor-pointer"
            >
              Criar Minicurso
            </button>
          </form>
        </div>

        {/* Participants & Event Details */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-slate-800 dark:text-white"
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>

            {selectedEvent && (
              <span className="text-xs font-mono font-extrabold text-emerald-600">
                Arrecadação: R$ {(participants.length * (selectedEvent.feeValue || 0)).toFixed(2)}
              </span>
            )}
          </div>

          {selectedEvent && (
            <div className="space-y-4">
              
              {/* Add Participant Form */}
              <form onSubmit={handleAddParticipant} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-600" /> Inscrever Participante no Evento
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="Nome Completo *"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-semibold text-slate-800 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="CPF / Matrícula"
                    value={participantCpf}
                    onChange={(e) => setParticipantCpf(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-semibold text-slate-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl py-2 cursor-pointer"
                  >
                    Confirmar Inscrição
                  </button>
                </div>
              </form>

              {/* Participants List */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                      Lista de Participantes do Minicurso ({participants.length})
                    </h4>
                    <p className="text-[10px] text-slate-400">Marque a presença dos alunos ou remova quem faltou antes de emitir os certificados.</p>
                  </div>

                  {participants.some(p => !p.attended) && (
                    <button
                      onClick={handlePurgeNonAttendees}
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0 self-start sm:self-auto"
                      title="Remove participantes que não compareceram ao evento"
                    >
                      <UserX className="h-3.5 w-3.5" /> Limpar Ausentes
                    </button>
                  )}
                </div>

                {participants.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhum participante inscrito ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {participants.map(p => (
                      <div key={p.id} className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                        p.attended 
                          ? 'bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80' 
                          : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-75'
                      }`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 dark:text-white text-sm">{p.studentName}</span>
                            
                            {/* Attendance Toggle Badge */}
                            <button
                              type="button"
                              onClick={() => handleToggleAttendance(p)}
                              className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                                p.attended 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40' 
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300/40'
                              }`}
                            >
                              {p.attended ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              {p.attended ? 'PRESENTE' : 'AUSENTE (REMOVER)'}
                            </button>

                            {p.certificateGenerated && (
                              <span className="px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[9px] rounded-lg border border-amber-500/30 flex items-center gap-1">
                                <FileCheck className="h-3 w-3 text-amber-500" />
                                {p.certificateUrl ? 'PDF ANEXADO' : 'CERTIFICADO EMITIDO'}
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500 font-mono">
                            Matrícula / CPF: <strong>{p.enrollmentNumber}</strong> • Inscrição Paga (R$ {selectedEvent.feeValue.toFixed(2)})
                          </div>
                        </div>

                        {p.attended && (
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            {/* Upload PDF Certificate Button */}
                            <button
                              type="button"
                              onClick={() => setUploadModalPart(p)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-extrabold text-[10px] uppercase tracking-wide rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                            >
                              <Upload className="h-3.5 w-3.5 text-blue-400" /> Upload PDF
                            </button>

                            {/* Generate Official Certificate */}
                            <button
                              type="button"
                              onClick={() => handleGenerateCertificate(selectedEvent, p)}
                              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-[10px] uppercase tracking-wide rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 transition-all"
                            >
                              <Award className="h-3.5 w-3.5" /> Gerar Certificado
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* MODAL: UPLOAD DE CERTIFICADO EM PDF */}
      {uploadModalPart && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Upload de Certificado (PDF)</h3>
                  <p className="text-[11px] text-slate-400">Anexe o arquivo de certificado do discente.</p>
                </div>
              </div>
              <button 
                onClick={() => { setUploadModalPart(null); setUploadedFileBase64(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Aluno Beneficiário:</span>
                <p className="font-black text-slate-800 dark:text-white text-sm">{uploadModalPart.studentName}</p>
                <p className="text-[10px] text-slate-500 font-mono">Matrícula: {uploadModalPart.enrollmentNumber}</p>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                  Selecione o arquivo PDF ou Imagem do Certificado *
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileUpload}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-white file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white cursor-pointer"
                />
              </div>

              {uploadedFileName && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  <FileCheck className="h-4 w-4 shrink-0" />
                  <span className="truncate">Arquivo selecionado: {uploadedFileName}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => { setUploadModalPart(null); setUploadedFileBase64(null); }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!uploadedFileBase64}
                onClick={handleSaveUploadedCertificate}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs cursor-pointer shadow-md shadow-blue-500/20"
              >
                Salvar Certificado no Portal do Aluno
              </button>
            </div>
          </div>
        </div>
      )}

      {certificateModal && (
        <MovimentacaoDocumentPrintModal
          title={certificateModal.title}
          contentHtml={certificateModal.contentHtml}
          onClose={() => setCertificateModal(null)}
        />
      )}

    </div>
  );
};

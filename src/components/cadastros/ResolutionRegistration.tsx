import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Resolution } from '../../types/cadastros';
import { 
  getResolutions, saveResolutions, 
  addAuditLog, getAuditLogs 
} from '../../services/cadastrosStorage';
import { AuditLogModal } from './AuditLogModal';

import { 
  Plus, Search, Edit3, Trash2, Eye, History, Check, X, 
  FileCheck, Calendar, ShieldAlert, ChevronLeft, ChevronRight, AlertCircle, FileText 
} from 'lucide-react';

export const ResolutionRegistration: React.FC = () => {
  const { courses, currentUser } = useApp();

  const [resolutionsList, setResolutionsList] = useState<Resolution[]>(() => getResolutions());
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Audit Log Modal
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAuditRes, setSelectedAuditRes] = useState<Resolution | null>(null);

  // Form State
  const [number, setNumber] = useState('');
  const [type, setType] = useState<Resolution['type']>('Reconhecimento');
  const [courseId, setCourseId] = useState('');
  const [issuingBody, setIssuingBody] = useState('Conselho Estadual de Educação (CEE/SP)');
  const [publicationDate, setPublicationDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [validityPeriodYears, setValidityPeriodYears] = useState<number>(5);
  const [referenceYear, setReferenceYear] = useState<number>(new Date().getFullYear());
  const [status, setStatus] = useState<Resolution['status']>('Vigente');
  const [syllabus, setSyllabus] = useState('');
  const [notes, setNotes] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    saveResolutions(resolutionsList);
  }, [resolutionsList]);

  // Check expiring / expired resolutions for warning banner
  const expiringOrExpired = resolutionsList.filter(r => {
    if (!r.endDate) return false;
    const end = new Date(r.endDate).getTime();
    const now = Date.now();
    const daysRemaining = (end - now) / (1000 * 60 * 60 * 24);
    return daysRemaining < 90;
  });

  // Search & Filter
  const filteredList = resolutionsList.filter(r => {
    const matchesSearch = 
      r.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.courseName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.issuingBody.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCourse = courseFilter === 'ALL' || r.courseId === courseFilter;
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

    return matchesSearch && matchesCourse && matchesStatus;
  });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedId(null);
    const firstCourse = courses[0];
    setNumber('');
    setType('Reconhecimento');
    setCourseId(firstCourse?.id || '');
    setIssuingBody('Conselho Estadual de Educação (CEE/SP)');
    setPublicationDate(new Date().toISOString().split('T')[0]);
    setStartDate(new Date().toISOString().split('T')[0]);
    
    // Default 5 years ahead
    const future = new Date();
    future.setFullYear(future.getFullYear() + 5);
    setEndDate(future.toISOString().split('T')[0]);

    setValidityPeriodYears(5);
    setReferenceYear(new Date().getFullYear());
    setStatus('Vigente');
    setSyllabus('');
    setNotes('');
    setFeedbackMsg(null);
    setShowModal(true);
  };

  const handleOpenEditOrView = (item: Resolution, mode: 'edit' | 'view') => {
    setModalMode(mode);
    setSelectedId(item.id);
    setNumber(item.number);
    setType(item.type || 'Reconhecimento');
    setCourseId(item.courseId);
    setIssuingBody(item.issuingBody || '');
    setPublicationDate(item.publicationDate || '');
    setStartDate(item.startDate || '');
    setEndDate(item.endDate || '');
    setValidityPeriodYears(item.validityPeriodYears || 5);
    setReferenceYear(item.referenceYear || new Date().getFullYear());
    setStatus(item.status || 'Vigente');
    setSyllabus(item.syllabus || '');
    setNotes(item.notes || '');
    setFeedbackMsg(null);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') return;

    if (!number.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Informe o Número da Resolução.' });
      return;
    }
    if (!courseId) {
      setFeedbackMsg({ type: 'error', text: 'Selecione o Curso Vinculado.' });
      return;
    }

    const performer = currentUser?.name || 'Administrador';
    const courseObj = courses.find(c => c.id === courseId);
    const courseNameStr = courseObj?.name || courseId;

    if (modalMode === 'create') {
      const newRes: Resolution = {
        id: 'res_' + Date.now(),
        number: number.trim(),
        type,
        courseId,
        courseName: courseNameStr,
        issuingBody: issuingBody.trim(),
        publicationDate,
        startDate,
        endDate,
        validityPeriodYears: Number(validityPeriodYears),
        referenceYear: Number(referenceYear),
        status,
        syllabus: syllabus.trim(),
        notes: notes.trim(),
        createdAt: new Date().toISOString()
      };

      const updated = [newRes, ...resolutionsList];
      setResolutionsList(updated);
      addAuditLog(newRes.id, 'RESOLUCAO', 'CRIADO', performer, `Resolução "${number}" cadastrada para o curso ${courseNameStr}.`);
      setFeedbackMsg({ type: 'success', text: `Resolução "${number}" cadastrada com sucesso!` });

    } else if (modalMode === 'edit' && selectedId) {
      const updated = resolutionsList.map(r => {
        if (r.id === selectedId) {
          return {
            ...r,
            number: number.trim(),
            type,
            courseId,
            courseName: courseNameStr,
            issuingBody: issuingBody.trim(),
            publicationDate,
            startDate,
            endDate,
            validityPeriodYears: Number(validityPeriodYears),
            referenceYear: Number(referenceYear),
            status,
            syllabus: syllabus.trim(),
            notes: notes.trim(),
            updatedAt: new Date().toISOString()
          };
        }
        return r;
      });

      setResolutionsList(updated);
      addAuditLog(selectedId, 'RESOLUCAO', 'EDITADO', performer, `Resolução "${number}" atualizada.`);
      setFeedbackMsg({ type: 'success', text: `Resolução "${number}" atualizada com sucesso!` });
    }

    setTimeout(() => {
      setShowModal(false);
      setFeedbackMsg(null);
    }, 1200);
  };

  const handleDelete = (item: Resolution) => {
    if (!window.confirm(`Tem certeza que deseja excluir a resolução "${item.number}"?`)) return;
    const performer = currentUser?.name || 'Administrador';
    const updated = resolutionsList.filter(r => r.id !== item.id);
    setResolutionsList(updated);
    addAuditLog(item.id, 'RESOLUCAO', 'EXCLUIDO', performer, `Resolução "${item.number}" excluída.`);
    alert(`Resolução "${item.number}" excluída.`);
  };

  const handleOpenAudit = (item: Resolution) => {
    setSelectedAuditRes(item);
    setShowAuditModal(true);
  };

  const getResAuditLogs = () => {
    if (!selectedAuditRes) return [];
    return getAuditLogs().filter(l => l.entityId === selectedAuditRes.id && l.entityType === 'RESOLUCAO');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Expiration Warning Alert if applicable */}
      {expiringOrExpired.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-3xl flex items-start gap-3.5 shadow-xs">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <h4 className="font-black text-sm">Alerta de Atos Autorizativos a Vencer ou Vencidos:</h4>
            <p>
              Existem <strong className="font-extrabold">{expiringOrExpired.length} resolução(ões)</strong> com prazo de validade expirado ou prestes a vencer nos próximos 90 dias:
            </p>
            <ul className="list-disc list-inside font-bold pt-1 space-y-0.5">
              {expiringOrExpired.map(e => (
                <li key={e.id}>
                  {e.number} ({e.courseName}) — Validade até: {e.endDate ? new Date(e.endDate).toLocaleDateString('pt-BR') : 'Sem data'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por número da resolução, curso ou órgão emissor..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={courseFilter}
            onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[200px] truncate"
          >
            <option value="ALL">Todos os Cursos</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Todas as Situações</option>
            <option value="Vigente">Vigente</option>
            <option value="Em Renovação">Em Renovação</option>
            <option value="Expirada">Expirada</option>
            <option value="Revogada">Revogada</option>
          </select>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Resolução</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Resolução / Ato</th>
                <th className="py-3.5 px-4">Curso Vinculado</th>
                <th className="py-3.5 px-4">Órgão Emissor</th>
                <th className="py-3.5 px-4 text-center">Vigência</th>
                <th className="py-3.5 px-4 text-center">Situação</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhuma resolução localizada.
                  </td>
                </tr>
              ) : (
                paginatedList.map((r) => {
                  const courseObj = courses.find(c => c.id === r.courseId);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shrink-0">
                            <FileCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm">{r.number}</div>
                            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">{r.type}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-blue-600 dark:text-blue-400">{courseObj?.name || r.courseName || r.courseId}</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {r.issuingBody}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="text-slate-800 dark:text-slate-200">
                          {r.startDate ? new Date(r.startDate).toLocaleDateString('pt-BR') : '---'} até {r.endDate ? new Date(r.endDate).toLocaleDateString('pt-BR') : '---'}
                        </div>
                        <div className="text-[10px] text-slate-400">({r.validityPeriodYears || 5} anos de validade)</div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          r.status === 'Vigente' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' :
                          r.status === 'Em Renovação' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                        }`}>
                          {r.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditOrView(r, 'view')}
                            title="Visualizar Resolução"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditOrView(r, 'edit')}
                            title="Editar Resolução"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAudit(r)}
                            title="Histórico de Auditoria"
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            title="Excluir Resolução"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
          <div>
            Exibindo {paginatedList.length} de {filteredList.length} resolução(ões)
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden">
            
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/30 text-indigo-400 rounded-2xl border border-indigo-500/30">
                  <FileCheck className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-base">
                  {modalMode === 'create' ? 'Nova Resolução de Curso' : modalMode === 'edit' ? 'Editar Resolução' : 'Visualizar Resolução'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {feedbackMsg && (
                <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  feedbackMsg.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Número da Resolução *</label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="Ex: Resolução CEE/SP nº 421/2023"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Tipo de Ato</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Autorização">Autorização</option>
                    <option value="Reconhecimento">Reconhecimento</option>
                    <option value="Renovação">Renovação de Reconhecimento</option>
                    <option value="Credenciamento">Credenciamento</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Curso Vinculado *</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione o curso...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Órgão Emissor</label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={issuingBody}
                    onChange={(e) => setIssuingBody(e.target.value)}
                    placeholder="Ex: CEE/SP - Conselho Estadual de Educação"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Data Publicação D.O.</label>
                  <input
                    type="date"
                    disabled={modalMode === 'view'}
                    value={publicationDate}
                    onChange={(e) => setPublicationDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Início da Vigência</label>
                  <input
                    type="date"
                    disabled={modalMode === 'view'}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Término da Vigência</label>
                  <input
                    type="date"
                    disabled={modalMode === 'view'}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Validade (Anos)</label>
                  <input
                    type="number"
                    min={1}
                    disabled={modalMode === 'view'}
                    value={validityPeriodYears}
                    onChange={(e) => setValidityPeriodYears(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Ano Referência</label>
                  <input
                    type="number"
                    disabled={modalMode === 'view'}
                    value={referenceYear}
                    onChange={(e) => setReferenceYear(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Situação do Ato</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Vigente">Vigente</option>
                    <option value="Em Renovação">Em Renovação</option>
                    <option value="Expirada">Expirada</option>
                    <option value="Revogada">Revogada</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Ementa / Texto do Ato</label>
                <textarea
                  rows={3}
                  disabled={modalMode === 'view'}
                  value={syllabus}
                  onChange={(e) => setSyllabus(e.target.value)}
                  placeholder="Síntese do teor publicado no Diário Oficial..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Observações Gerais</label>
                <textarea
                  rows={2}
                  disabled={modalMode === 'view'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações internas de arquivo ou secretaria..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-extrabold text-xs cursor-pointer"
                >
                  Cancelar
                </button>

                {modalMode !== 'view' && (
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    <span>Salvar Resolução</span>
                  </button>
                )}
              </div>

            </form>

          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL */}
      <AuditLogModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        logs={getResAuditLogs()}
        title="Histórico de Auditoria da Resolução"
        entityName={selectedAuditRes?.number}
      />

    </div>
  );
};

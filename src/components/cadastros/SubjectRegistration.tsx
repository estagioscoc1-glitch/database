import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Subject } from '../../types';
import { addAuditLog, getAuditLogs } from '../../services/cadastrosStorage';
import { AuditLogModal } from './AuditLogModal';

import { 
  Plus, Search, Edit3, Trash2, Eye, History, Check, X, 
  BookMarked, ChevronLeft, ChevronRight, AlertCircle, Layers 
} from 'lucide-react';

export const SubjectRegistration: React.FC = () => {
  const { subjects, courses, addSubject, updateSubject, deleteSubject, currentUser } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Audit Log Modal
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAuditSubject, setSelectedAuditSubject] = useState<Subject | null>(null);

  // Form State
  const [courseId, setCourseId] = useState('');
  const [name, setName] = useState('');
  const [module, setModule] = useState<number>(1);
  const [workload, setWorkload] = useState<number>(80);
  const [subjectType, setSubjectType] = useState<string>('Obrigatória');
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filters
  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCourse = courseFilter === 'ALL' || s.courseId === courseFilter;

    return matchesSearch && matchesCourse;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage) || 1;
  const paginatedSubjects = filteredSubjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedSubjectId(null);
    setCourseId(courses[0]?.id || '');
    setName('');
    setModule(1);
    setWorkload(80);
    setSubjectType('Obrigatória');
    setStatus('ATIVO');
    setFeedbackMsg(null);
    setShowModal(true);
  };

  const handleOpenEditOrView = (sub: Subject, mode: 'edit' | 'view') => {
    setModalMode(mode);
    setSelectedSubjectId(sub.id);
    setCourseId(sub.courseId);
    setName(sub.name);
    setModule(sub.module || 1);
    setWorkload(sub.workload || 80);
    setSubjectType('Obrigatória');
    setStatus('ATIVO');
    setFeedbackMsg(null);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') return;

    if (!name.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Informe o Nome da Disciplina.' });
      return;
    }
    if (!courseId) {
      setFeedbackMsg({ type: 'error', text: 'Selecione o Curso Vinculado.' });
      return;
    }

    const performer = currentUser?.name || 'Administrador';

    if (modalMode === 'create') {
      const newSub: Subject = {
        id: 'sub_' + Date.now(),
        name: name.trim(),
        courseId,
        module: Number(module),
        workload: Number(workload)
      };

      addSubject(newSub);
      addAuditLog(newSub.id, 'DISCIPLINA', 'CRIADO', performer, `Disciplina "${name}" vinculada ao curso ${courseId}.`);
      setFeedbackMsg({ type: 'success', text: `Disciplina "${name}" cadastrada e vinculada à matriz!` });

    } else if (modalMode === 'edit' && selectedSubjectId) {
      updateSubject(selectedSubjectId, {
        name: name.trim(),
        courseId,
        module: Number(module),
        workload: Number(workload)
      });

      addAuditLog(selectedSubjectId, 'DISCIPLINA', 'EDITADO', performer, `Disciplina "${name}" atualizada.`);
      setFeedbackMsg({ type: 'success', text: `Disciplina "${name}" atualizada com sucesso!` });
    }

    setTimeout(() => {
      setShowModal(false);
      setFeedbackMsg(null);
    }, 1200);
  };

  const handleDelete = (sub: Subject) => {
    if (!window.confirm(`Tem certeza que deseja excluir a disciplina "${sub.name}"?`)) return;
    const performer = currentUser?.name || 'Administrador';
    deleteSubject(sub.id);
    addAuditLog(sub.id, 'DISCIPLINA', 'EXCLUIDO', performer, `Disciplina "${sub.name}" excluída.`);
    alert(`Disciplina "${sub.name}" excluída.`);
  };

  const handleOpenAudit = (sub: Subject) => {
    setSelectedAuditSubject(sub);
    setShowAuditModal(true);
  };

  const getSubjectAuditLogs = () => {
    if (!selectedAuditSubject) return [];
    return getAuditLogs().filter(l => l.entityId === selectedAuditSubject.id && l.entityType === 'DISCIPLINA');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar disciplina por nome..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={courseFilter}
            onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[220px] truncate"
          >
            <option value="ALL">Todos os Cursos</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Disciplina</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Disciplina</th>
                <th className="py-3.5 px-4">Curso Vinculado</th>
                <th className="py-3.5 px-4 text-center">Módulo</th>
                <th className="py-3.5 px-4 text-center">Carga Horária</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300">
              {paginatedSubjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Nenhuma disciplina encontrada.
                  </td>
                </tr>
              ) : (
                paginatedSubjects.map((sub) => {
                  const courseObj = courses.find(c => c.id === sub.courseId);

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black shrink-0">
                            <BookMarked className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm">{sub.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">ID: {sub.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-blue-600 dark:text-blue-400">{courseObj?.name || sub.courseId}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] font-extrabold">
                          Módulo {sub.module || 1}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{sub.workload || 80}h</span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditOrView(sub, 'view')}
                            title="Visualizar Disciplina"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditOrView(sub, 'edit')}
                            title="Editar Disciplina"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAudit(sub)}
                            title="Histórico de Auditoria"
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sub)}
                            title="Excluir Disciplina"
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
            Exibindo {paginatedSubjects.length} de {filteredSubjects.length} disciplina(s)
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden">
            
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-2xl border border-blue-500/30">
                  <BookMarked className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-base">
                  {modalMode === 'create' ? 'Nova Disciplina' : modalMode === 'edit' ? 'Editar Disciplina' : 'Visualizar Disciplina'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {feedbackMsg && (
                <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  feedbackMsg.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

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
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Nome da Disciplina *</label>
                <input
                  type="text"
                  disabled={modalMode === 'view'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Anatomia Humana e Fisiologia"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Módulo Correspondente</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    disabled={modalMode === 'view'}
                    value={module}
                    onChange={(e) => setModule(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Carga Horária (Horas)</label>
                  <input
                    type="number"
                    min={10}
                    disabled={modalMode === 'view'}
                    value={workload}
                    onChange={(e) => setWorkload(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
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
                    <span>Salvar Disciplina</span>
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
        logs={getSubjectAuditLogs()}
        title="Histórico de Auditoria da Disciplina"
        entityName={selectedAuditSubject?.name}
      />

    </div>
  );
};

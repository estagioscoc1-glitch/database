import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CourseModule } from '../../types/cadastros';
import { 
  getCourseModules, saveCourseModules, 
  addAuditLog, getAuditLogs 
} from '../../services/cadastrosStorage';
import { AuditLogModal } from './AuditLogModal';

import { 
  Plus, Search, Edit3, Trash2, Eye, History, Check, X, 
  Layers, ChevronLeft, ChevronRight, AlertCircle, BookOpen 
} from 'lucide-react';

export const CourseModuleRegistration: React.FC = () => {
  const { courses, currentUser } = useApp();

  const [modulesList, setModulesList] = useState<CourseModule[]>(() => getCourseModules());
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Audit Log Modal
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAuditModule, setSelectedAuditModule] = useState<CourseModule | null>(null);

  // Form State
  const [courseId, setCourseId] = useState('');
  const [name, setName] = useState('');
  const [order, setOrder] = useState<number>(1);
  const [workload, setWorkload] = useState<number>(400);
  const [teachingType, setTeachingType] = useState<CourseModule['teachingType']>('Técnico');
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Save to persistence whenever modulesList changes
  useEffect(() => {
    saveCourseModules(modulesList);
  }, [modulesList]);

  // Search & Filters
  const filteredModules = modulesList.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.courseName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCourse = courseFilter === 'ALL' || m.courseId === courseFilter;

    return matchesSearch && matchesCourse;
  });

  // Pagination
  const totalPages = Math.ceil(filteredModules.length / itemsPerPage) || 1;
  const paginatedModules = filteredModules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedModuleId(null);
    const firstCourse = courses[0];
    setCourseId(firstCourse?.id || '');
    setName('');
    setOrder(1);
    setWorkload(400);
    setTeachingType('Técnico');
    setStatus('ATIVO');
    setFeedbackMsg(null);
    setShowModal(true);
  };

  const handleOpenEditOrView = (mod: CourseModule, mode: 'edit' | 'view') => {
    setModalMode(mode);
    setSelectedModuleId(mod.id);
    setCourseId(mod.courseId);
    setName(mod.name);
    setOrder(mod.order || 1);
    setWorkload(mod.workload || 400);
    setTeachingType(mod.teachingType || 'Técnico');
    setStatus(mod.status || 'ATIVO');
    setFeedbackMsg(null);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') return;

    if (!name.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Informe o Nome do Módulo.' });
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
      const newModule: CourseModule = {
        id: 'mod_' + Date.now(),
        courseId,
        courseName: courseNameStr,
        name: name.trim(),
        order: Number(order),
        workload: Number(workload),
        teachingType,
        status,
        createdAt: new Date().toISOString()
      };

      const updated = [newModule, ...modulesList];
      setModulesList(updated);
      addAuditLog(newModule.id, 'MODULO', 'CRIADO', performer, `Módulo "${name}" cadastrado para o curso ${courseNameStr}.`);
      setFeedbackMsg({ type: 'success', text: `Módulo "${name}" cadastrado com sucesso!` });

    } else if (modalMode === 'edit' && selectedModuleId) {
      const updated = modulesList.map(m => {
        if (m.id === selectedModuleId) {
          return {
            ...m,
            courseId,
            courseName: courseNameStr,
            name: name.trim(),
            order: Number(order),
            workload: Number(workload),
            teachingType,
            status,
            updatedAt: new Date().toISOString()
          };
        }
        return m;
      });

      setModulesList(updated);
      addAuditLog(selectedModuleId, 'MODULO', 'EDITADO', performer, `Módulo "${name}" atualizado.`);
      setFeedbackMsg({ type: 'success', text: `Módulo "${name}" atualizado com sucesso!` });
    }

    setTimeout(() => {
      setShowModal(false);
      setFeedbackMsg(null);
    }, 1200);
  };

  const handleDelete = (mod: CourseModule) => {
    if (!window.confirm(`Tem certeza que deseja excluir o módulo "${mod.name}"?`)) return;
    const performer = currentUser?.name || 'Administrador';
    const updated = modulesList.filter(m => m.id !== mod.id);
    setModulesList(updated);
    addAuditLog(mod.id, 'MODULO', 'EXCLUIDO', performer, `Módulo "${mod.name}" excluído.`);
    alert(`Módulo "${mod.name}" excluído.`);
  };

  const handleOpenAudit = (mod: CourseModule) => {
    setSelectedAuditModule(mod);
    setShowAuditModal(true);
  };

  const getModuleAuditLogs = () => {
    if (!selectedAuditModule) return [];
    return getAuditLogs().filter(l => l.entityId === selectedAuditModule.id && l.entityType === 'MODULO');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar módulo por nome..."
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
            <span>Novo Módulo</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ordem / Módulo</th>
                <th className="py-3.5 px-4">Curso</th>
                <th className="py-3.5 px-4">Tipo de Ensino</th>
                <th className="py-3.5 px-4 text-center">Carga Horária</th>
                <th className="py-3.5 px-4 text-center">Situação</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300">
              {paginatedModules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum módulo encontrado.
                  </td>
                </tr>
              ) : (
                paginatedModules.map((mod) => {
                  const courseObj = courses.find(c => c.id === mod.courseId);

                  return (
                    <tr key={mod.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black shrink-0">
                            #{mod.order}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm">{mod.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">ID: {mod.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-blue-600 dark:text-blue-400">{courseObj?.name || mod.courseName || mod.courseId}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-extrabold">
                          {mod.teachingType}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{mod.workload}h</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          mod.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {mod.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditOrView(mod, 'view')}
                            title="Visualizar Módulo"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditOrView(mod, 'edit')}
                            title="Editar Módulo"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAudit(mod)}
                            title="Histórico de Auditoria"
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(mod)}
                            title="Excluir Módulo"
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
            Exibindo {paginatedModules.length} de {filteredModules.length} módulo(s)
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full flex flex-col overflow-hidden">
            
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-2xl border border-blue-500/30">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-base">
                  {modalMode === 'create' ? 'Novo Módulo' : modalMode === 'edit' ? 'Editar Módulo' : 'Visualizar Módulo'}
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
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Nome do Módulo *</label>
                <input
                  type="text"
                  disabled={modalMode === 'view'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Módulo I - Fundamentos da Saúde"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Ordem do Módulo</label>
                  <input
                    type="number"
                    min={1}
                    disabled={modalMode === 'view'}
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Carga Horária (módulo)</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Tipo de Ensino</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={teachingType}
                    onChange={(e) => setTeachingType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Regular">Regular</option>
                    <option value="EJA">EJA</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Especialização">Especialização</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Situação</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="INATIVO">INATIVO</option>
                  </select>
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
                    <span>Salvar Módulo</span>
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
        logs={getModuleAuditLogs()}
        title="Histórico de Auditoria do Módulo"
        entityName={selectedAuditModule?.name}
      />

    </div>
  );
};

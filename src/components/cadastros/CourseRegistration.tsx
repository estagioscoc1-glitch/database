import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Course } from '../../types';
import { Shift } from '../../types';
import { addAuditLog, getAuditLogs } from '../../services/cadastrosStorage';
import { AuditLogModal } from './AuditLogModal';

import { 
  Plus, Search, Edit3, Trash2, Eye, History, Check, X, 
  BookOpen, Clock, Layers, ChevronLeft, ChevronRight, AlertCircle 
} from 'lucide-react';

export const CourseRegistration: React.FC = () => {
  const { courses, addCourse, updateCourse, deleteCourse, currentUser } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Audit Log Modal
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAuditCourse, setSelectedAuditCourse] = useState<Course | null>(null);

  // Form State
  const [idCode, setIdCode] = useState('');
  const [name, setName] = useState('');
  const [totalWorkload, setTotalWorkload] = useState<number>(1200);
  const [courseType, setCourseType] = useState<string>('Técnico');
  const [modality, setModality] = useState<string>('Presencial');
  const [selectedShifts, setSelectedShifts] = useState<Shift[]>([Shift.MATUTINO, Shift.VESPERTINO, Shift.NOTURNO]);
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');
  const [description, setDescription] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filters
  const filteredCourses = courses.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    const cStatus = c.status || (c.active === false ? 'INATIVO' : 'ATIVO');
    const matchesStatus = statusFilter === 'ALL' || cStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage) || 1;
  const paginatedCourses = filteredCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedCourseId(null);
    setIdCode('');
    setName('');
    setTotalWorkload(1200);
    setCourseType('Técnico');
    setModality('Presencial');
    setSelectedShifts([Shift.MATUTINO, Shift.VESPERTINO, Shift.NOTURNO]);
    setStatus('ATIVO');
    setDescription('');
    setFeedbackMsg(null);
    setShowModal(true);
  };

  const handleOpenEditOrView = (course: Course, mode: 'edit' | 'view') => {
    setModalMode(mode);
    setSelectedCourseId(course.id);
    setIdCode(course.id);
    setName(course.name);
    setTotalWorkload(course.totalWorkload || 1200);
    setCourseType('Técnico'); // Default
    setModality('Presencial');
    setSelectedShifts(course.shifts || [Shift.MATUTINO, Shift.VESPERTINO, Shift.NOTURNO]);
    setStatus(course.status || (course.active === false ? 'INATIVO' : 'ATIVO'));
    setDescription(course.description || '');
    setFeedbackMsg(null);
    setShowModal(true);
  };

  const toggleShift = (shift: Shift) => {
    if (modalMode === 'view') return;
    if (selectedShifts.includes(shift)) {
      if (selectedShifts.length > 1) {
        setSelectedShifts(selectedShifts.filter(s => s !== shift));
      }
    } else {
      setSelectedShifts([...selectedShifts, shift]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') return;

    if (!name.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Informe o Nome do Curso.' });
      return;
    }

    const performer = currentUser?.name || 'Administrador';

    if (modalMode === 'create') {
      const created = addCourse({
        id: idCode.trim() ? idCode.trim().toUpperCase() : undefined,
        name: name.trim(),
        description: description.trim() || `Curso ${courseType} ${name.trim()}`,
        totalWorkload: Number(totalWorkload),
        shifts: selectedShifts,
        status,
        active: status === 'ATIVO'
      });

      addAuditLog(created.id, 'CURSO', 'CRIADO', performer, `Curso "${name}" (${created.id}) cadastrado e integrado.`);
      setFeedbackMsg({ type: 'success', text: `Curso "${name}" cadastrado com sucesso!` });

    } else if (modalMode === 'edit' && selectedCourseId) {
      updateCourse({
        id: selectedCourseId,
        name: name.trim(),
        description: description.trim(),
        totalWorkload: Number(totalWorkload),
        shifts: selectedShifts,
        status,
        active: status === 'ATIVO'
      });

      addAuditLog(selectedCourseId, 'CURSO', 'EDITADO', performer, `Dados do curso "${name}" (${selectedCourseId}) atualizados.`);
      setFeedbackMsg({ type: 'success', text: `Curso "${name}" atualizado com sucesso!` });
    }

    setTimeout(() => {
      setShowModal(false);
      setFeedbackMsg(null);
    }, 1200);
  };

  const handleDelete = (course: Course) => {
    if (!window.confirm(`Tem certeza que deseja excluir o curso "${course.name}"?`)) return;
    const performer = currentUser?.name || 'Administrador';
    deleteCourse(course.id);
    addAuditLog(course.id, 'CURSO', 'EXCLUIDO', performer, `Curso "${course.name}" (${course.id}) excluído do sistema.`);
    alert(`Curso "${course.name}" excluído com sucesso.`);
  };

  const handleOpenAudit = (course: Course) => {
    setSelectedAuditCourse(course);
    setShowAuditModal(true);
  };

  const getCourseAuditLogs = () => {
    if (!selectedAuditCourse) return [];
    return getAuditLogs().filter(l => l.entityId === selectedAuditCourse.id && l.entityType === 'CURSO');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Search & Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar curso por nome, código ou descrição..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Todas as Situações</option>
            <option value="ATIVO">Ativos</option>
            <option value="INATIVO">Inativos</option>
          </select>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Curso</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Código / Curso</th>
                <th className="py-3.5 px-4">Carga Horária</th>
                <th className="py-3.5 px-4">Turnos Habilitados</th>
                <th className="py-3.5 px-4 text-center">Situação</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300">
              {paginatedCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Nenhum curso localizado.
                  </td>
                </tr>
              ) : (
                paginatedCourses.map((c) => {
                  const cStatus = c.status || (c.active === false ? 'INATIVO' : 'ATIVO');

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black shrink-0">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm">{c.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">Código: {c.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{c.totalWorkload || 1200} Horas</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(c.shifts || [Shift.MATUTINO, Shift.VESPERTINO, Shift.NOTURNO]).map(s => (
                            <span key={s} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-extrabold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          cStatus === 'ATIVO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {cStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditOrView(c, 'view')}
                            title="Visualizar Curso"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditOrView(c, 'edit')}
                            title="Editar Curso"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAudit(c)}
                            title="Histórico de Auditoria"
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            title="Excluir Curso"
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
            Exibindo {paginatedCourses.length} de {filteredCourses.length} curso(s)
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full flex flex-col overflow-hidden">
            
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-2xl border border-blue-500/30">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-base">
                  {modalMode === 'create' ? 'Novo Cadastro de Curso' : modalMode === 'edit' ? 'Editar Curso' : 'Visualizar Curso'}
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

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Nome do Curso *</label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: TÉCNICO EM ENFERMAGEM"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Código Sigla</label>
                  <input
                    type="text"
                    disabled={modalMode !== 'create'}
                    value={idCode}
                    onChange={(e) => setIdCode(e.target.value.toUpperCase())}
                    placeholder="Ex: ENF"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Carga Horária Total</label>
                  <input
                    type="number"
                    disabled={modalMode === 'view'}
                    value={totalWorkload}
                    onChange={(e) => setTotalWorkload(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Tipo de Curso</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={courseType}
                    onChange={(e) => setCourseType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Técnico">Técnico</option>
                    <option value="Graduação">Graduação</option>
                    <option value="Pós-Graduação">Pós-Graduação</option>
                    <option value="Extensão">Extensão</option>
                    <option value="Qualificação">Qualificação</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Modalidade</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={modality}
                    onChange={(e) => setModality(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Semipresencial">Semipresencial</option>
                    <option value="EAD">EAD</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Turnos Disponíveis</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[Shift.MATUTINO, Shift.VESPERTINO, Shift.NOTURNO, Shift.SABADO, Shift.EAD].map((shift) => {
                    const isSelected = selectedShifts.includes(shift);
                    return (
                      <button
                        key={shift}
                        type="button"
                        disabled={modalMode === 'view'}
                        onClick={() => toggleShift(shift)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          isSelected ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {shift}
                      </button>
                    );
                  })}
                </div>
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

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Observações</label>
                <textarea
                  rows={3}
                  disabled={modalMode === 'view'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações complementares sobre o curso..."
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
                    <span>Salvar Curso</span>
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
        logs={getCourseAuditLogs()}
        title="Histórico de Auditoria do Curso"
        entityName={selectedAuditCourse?.name}
      />

    </div>
  );
};

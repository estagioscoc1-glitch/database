import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Course, Shift } from '../types';
import { BookOpen, Plus, Search, CheckCircle2, XCircle, Clock, Calendar, Edit3, Trash2, Check, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CourseManager: React.FC = () => {
  const { courses, addCourse, updateCourse, deleteCourse } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [idCode, setIdCode] = useState('');
  const [description, setDescription] = useState('');
  const [totalWorkload, setTotalWorkload] = useState<number>(1200);
  const [selectedShifts, setSelectedShifts] = useState<Shift[]>([Shift.MATUTINO, Shift.VESPERTINO, Shift.NOTURNO]);
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setName('');
    setIdCode('');
    setDescription('');
    setTotalWorkload(1200);
    setSelectedShifts([Shift.MATUTINO, Shift.VESPERTINO, Shift.NOTURNO]);
    setStatus('ATIVO');
    setShowAddModal(true);
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setName(course.name);
    setIdCode(course.id);
    setDescription(course.description || '');
    setTotalWorkload(course.totalWorkload || 1200);
    setSelectedShifts(course.shifts || [Shift.MATUTINO, Shift.VESPERTINO, Shift.NOTURNO]);
    setStatus(course.status || (course.active === false ? 'INATIVO' : 'ATIVO'));
    setShowAddModal(true);
  };

  const toggleShift = (shift: Shift) => {
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
    setFeedbackMsg(null);

    if (!name.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Por favor, informe o nome do curso.' });
      return;
    }

    if (editingCourse) {
      updateCourse({
        ...editingCourse,
        name: name.trim(),
        description: description.trim(),
        totalWorkload: Number(totalWorkload),
        shifts: selectedShifts,
        status,
        active: status === 'ATIVO'
      });
      setFeedbackMsg({ type: 'success', text: `Curso "${name}" atualizado com sucesso!` });
    } else {
      const created = addCourse({
        id: idCode.trim() ? idCode.trim().toUpperCase() : undefined,
        name: name.trim(),
        description: description.trim() || `Curso técnico ${name.trim()}`,
        totalWorkload: Number(totalWorkload),
        shifts: selectedShifts,
        status,
        active: status === 'ATIVO'
      });
      setFeedbackMsg({ type: 'success', text: `Curso "${created.name}" cadastrado com sucesso e propagado para todo o sistema!` });
    }

    setTimeout(() => {
      setShowAddModal(false);
      setFeedbackMsg(null);
    }, 1500);
  };

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="course-manager-root" className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider mb-3 border border-blue-400/20">
              <BookOpen className="h-3.5 w-3.5" /> Gestão de Cursos Acadêmicos
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Cadastro de Novo Curso</h2>
            <p className="text-sm text-blue-200 mt-1 max-w-2xl leading-relaxed">
              Cadastre e gerencie a oferta de cursos da instituição. Ao cadastrar um curso aqui, ele fica 
              <strong> automaticamente disponível em todo o sistema</strong> (disciplinas, turmas, matrículas, relatórios).
            </p>
          </div>
          <button
            type="button"
            id="btn-cadastrar-novo-curso"
            onClick={handleOpenAdd}
            className="px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-2xl shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="h-5 w-5" /> Cadastrar Novo Curso
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou código do curso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
          Total de Cursos Ativos: <span className="text-blue-600 dark:text-blue-400 text-sm font-extrabold">{courses.filter(c => c.status !== 'INATIVO' && c.active !== false).length}</span>
        </div>
      </div>

      {/* Courses Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCourses.map((course) => {
          const isAtivo = course.status !== 'INATIVO' && course.active !== false;
          const shiftsList = course.shifts || [Shift.MATUTINO, Shift.VESPERTINO, Shift.NOTURNO];
          
          return (
            <div
              key={course.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-black rounded-lg border border-slate-200 dark:border-slate-700">
                    {course.id}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isAtivo 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                      : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  }`}>
                    {isAtivo ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {isAtivo ? 'ATIVO' : 'INATIVO'}
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-800 dark:text-white leading-snug mb-2">
                  {course.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {course.description || 'Nenhuma descrição informada.'}
                </p>

                {/* Details Pills */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                    <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span>Carga Horária: <strong>{course.totalWorkload || 1200} Horas</strong></span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      <span className="text-slate-400 text-[11px] mr-1">Turnos:</span>
                      {shiftsList.map(s => (
                        <span key={s} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Propagado no Sistema
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(course)}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                    title="Editar Curso"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Deseja realmente remover o curso "${course.name}"?`)) {
                        deleteCourse(course.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                    title="Excluir Curso"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Cadastrar / Editar Curso */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">
                      {editingCourse ? 'Editar Curso' : 'Cadastrar Novo Curso'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Preencha os dados do curso acadêmico
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
                >
                  ✕
                </button>
              </div>

              {feedbackMsg && (
                <div className={`p-4 mb-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  feedbackMsg.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}>
                  {feedbackMsg.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Nome do Curso <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Técnico em Enfermagem"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Código / Sigla
                    </label>
                    <input
                      type="text"
                      disabled={!!editingCourse}
                      placeholder="Ex: ENF_2026"
                      value={idCode}
                      onChange={(e) => setIdCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono uppercase font-bold disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Carga Horária Total (Horas)
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      step={10}
                      value={totalWorkload}
                      onChange={(e) => setTotalWorkload(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-bold"
                    />
                  </div>
                </div>

                {/* Turnos disponíveis */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Turnos Disponíveis
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[Shift.MATUTINO, Shift.VESPERTINO, Shift.NOTURNO, Shift.SABADO, Shift.EAD].map((shift) => {
                      const isSelected = selectedShifts.includes(shift);
                      return (
                        <button
                          key={shift}
                          type="button"
                          onClick={() => toggleShift(shift)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                          <span>{shift}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Situação */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Situação do Curso
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setStatus('ATIVO')}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                        status === 'ATIVO'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" /> ATIVO
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('INATIVO')}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                        status === 'INATIVO'
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <XCircle className="h-4 w-4" /> INATIVO
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Descrição Detalhada / Resumo
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Descrição do curso técnico..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 font-medium leading-relaxed border border-blue-200/50">
                  ⚡ <strong>Automação Ativa:</strong> Ao salvar, o curso ficará imediatamente visível no Cadastro de Disciplinas, Cadastro de Turmas, Matrículas e nos filtros do sistema.
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>{editingCourse ? 'Salvar Alterações' : 'Cadastrar Curso'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

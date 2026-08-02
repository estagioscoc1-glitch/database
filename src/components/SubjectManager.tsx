import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BookOpen, Edit2, Trash2, Check, X, Search, AlertTriangle, School, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SubjectManager: React.FC = () => {
  const { 
    classes, 
    subjects, 
    courses, 
    updateSubject, 
    deleteSubject
  } = useApp();

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classSearch, setClassSearch] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Find selected class object
  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Get subjects for selected class
  const classSubjects = selectedClass 
    ? subjects.filter(s => s.courseId === selectedClass.courseId && s.module === selectedClass.module)
    : [];

  // Filter classes by search query
  const filteredClasses = classes.filter(cls => {
    const searchLower = classSearch.toLowerCase();
    const course = courses.find(co => co.id === cls.courseId);
    return (
      cls.name.toLowerCase().includes(searchLower) ||
      (cls.code && cls.code.toLowerCase().includes(searchLower)) ||
      (course && course.name.toLowerCase().includes(searchLower))
    );
  });

  const handleStartEdit = (subId: string, currentName: string) => {
    setEditingSubId(subId);
    setEditingName(currentName);
  };

  const handleCancelEdit = () => {
    setEditingSubId(null);
    setEditingName('');
  };

  const handleSaveEdit = (subId: string) => {
    if (!editingName.trim()) return;
    updateSubject(subId, { name: editingName.trim().toUpperCase() });
    setEditingSubId(null);
    setEditingName('');
    showSuccess('Nome da disciplina atualizado com sucesso!');
  };

  const handleDeleteSubject = (subId: string, subName: string) => {
    if (confirm(`Tem certeza de que deseja excluir a disciplina "${subName}"?\n\nATENÇÃO: Todas as notas e registros de diários vinculados a ela nesta e em outras turmas serão excluídos permanentemente.`)) {
      deleteSubject(subId);
      showSuccess(`Disciplina "${subName}" excluída com sucesso!`);
    }
  };

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => {
      setActionSuccess(null);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-6 w-6 text-indigo-200" />
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Gerenciador de Disciplinas</h2>
        </div>
        <p className="text-xs sm:text-sm text-indigo-100 max-w-2xl leading-relaxed">
          Selecione uma turma para visualizar as disciplinas vinculadas ao seu curso e módulo. Você pode editar o nome das disciplinas ou excluí-las permanentemente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Classes List / Selector (Left Column) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">1. Escolha uma Turma</h3>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar turma por nome ou código..."
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-slate-800 dark:text-white placeholder:text-slate-400"
              />
              {classSearch && (
                <button 
                  type="button" 
                  onClick={() => setClassSearch('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Classes Scrollable Box */}
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin space-y-2 pr-1">
              {filteredClasses.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Nenhuma turma encontrada.
                </div>
              ) : (
                filteredClasses.map(cls => {
                  const isSelected = cls.id === selectedClassId;
                  const course = courses.find(co => co.id === cls.courseId);
                  return (
                    <button
                      type="button"
                      key={cls.id}
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-violet-50/50 dark:bg-violet-950/10 border-violet-500 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1 pr-2 truncate">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-violet-100 dark:bg-violet-950/35 text-violet-700 dark:text-violet-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            Módulo {cls.module}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                            {cls.year}/{cls.semester}
                          </span>
                        </div>
                        <h4 className={`text-xs font-extrabold truncate ${isSelected ? 'text-violet-800 dark:text-violet-300' : 'text-slate-800 dark:text-white'}`}>
                          {cls.code ? `[${cls.code}] ` : ''}{cls.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {course?.name || cls.courseId}
                        </p>
                      </div>
                      <ArrowRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? 'text-violet-500 translate-x-1' : 'text-slate-300 group-hover:translate-x-0.5'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Subjects list for selected class (Right Column) */}
        <div className="lg:col-span-8 space-y-4">
          <AnimatePresence mode="wait">
            {selectedClass ? (
              <motion.div
                key={selectedClass.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6"
              >
                {/* Header Information */}
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <School className="h-4 w-4 text-violet-500" />
                      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest block font-mono">
                        Módulo {selectedClass.module} • {selectedClass.year}/{selectedClass.semester}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-base sm:text-lg tracking-tight">
                      {selectedClass.name}
                    </h3>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-right">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">Total de Disciplinas</span>
                    <span className="text-sm font-black text-slate-800 dark:text-white font-mono">{classSubjects.length}</span>
                  </div>
                </div>

                {/* Toast Success Alert Inside panel */}
                {actionSuccess && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                    <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 animate-bounce" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                {/* Subjects Grid/List */}
                {classSubjects.length === 0 ? (
                  <div className="p-10 text-center space-y-3 bg-slate-50/50 dark:bg-slate-850/15 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhuma disciplina vinculada</p>
                      <p className="text-[11px] text-slate-400">
                        Não existem disciplinas cadastradas para o curso <strong>{selectedClass.courseId}</strong> e módulo <strong>{selectedClass.module}</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Disciplinas Ativas na Turma:
                    </span>

                    <div className="grid grid-cols-1 gap-3">
                      {classSubjects.map((sub, idx) => {
                        const isEditing = editingSubId === sub.id;

                        return (
                          <div 
                            key={sub.id}
                            className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                              isEditing
                                ? 'bg-violet-50/20 dark:bg-violet-950/5 border-violet-400'
                                : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                            }`}
                          >
                            {/* Subject Info or Edit Input */}
                            <div className="flex-1 min-w-0 space-y-1">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
                                    Nome da Disciplina
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit(sub.id);
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                      className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-violet-400 rounded-lg outline-none text-slate-800 dark:text-white uppercase font-bold"
                                      autoFocus
                                    />
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                      #{idx + 1}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                      Carga Horária: <strong className="text-slate-600 dark:text-slate-300 font-mono">{sub.workload}h</strong>
                                    </span>
                                  </div>
                                  <h4 className="font-extrabold text-slate-800 dark:text-white text-sm sm:text-base leading-snug">
                                    {sub.name}
                                  </h4>
                                  <span className="text-[10px] font-mono text-slate-400 block select-all">
                                    ID: {sub.id}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Actions Column */}
                            <div className="flex items-center gap-2 sm:self-center">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(sub.id)}
                                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                    title="Salvar Alteração"
                                  >
                                    <Check className="h-4 w-4" />
                                    <span className="hidden sm:inline px-1">Salvar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer"
                                    title="Cancelar"
                                  >
                                    <X className="h-4 w-4" />
                                    <span className="hidden sm:inline px-1">Cancelar</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(sub.id, sub.name)}
                                    className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-150 dark:border-slate-800 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                    title="Editar Nome"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Editar Nome</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubject(sub.id, sub.name)}
                                    className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                    title="Excluir Disciplina"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Excluir</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 rounded-2xl">
                  <School className="h-8 w-8 animate-bounce" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                    Nenhuma Turma Selecionada
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Selecione uma turma na lista à esquerda para começar a gerenciar, renomear ou excluir as disciplinas dela.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

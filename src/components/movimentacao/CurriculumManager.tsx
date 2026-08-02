import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CurriculumGrade, CurriculumSubject, ModalityType, TeachingType 
} from '../../types/movimentacao';
import { getCurriculums, saveCurriculums } from '../../services/movimentacaoStorage';
import { 
  BookOpen, Plus, Trash2, Edit3, ArrowUp, ArrowDown, Save, Search, 
  Sparkles, Layers, Clock, AlertCircle, CheckCircle2, History 
} from 'lucide-react';

interface CurriculumManagerProps {
  currentUser: string;
}

export const CurriculumManager: React.FC<CurriculumManagerProps> = ({ currentUser }) => {
  const { courses } = useApp();
  const [curriculums, setCurriculums] = useState<CurriculumGrade[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [modality, setModality] = useState<ModalityType>('Presencial');
  const [teachingType, setTeachingType] = useState<TeachingType>('Técnico');
  const [selectedModule, setSelectedModule] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Form for new/edited subject
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState<string>('');
  const [subjectWorkload, setSubjectWorkload] = useState<number>(60);
  const [subjectCode, setSubjectCode] = useState<string>('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const list = getCurriculums();
    setCurriculums(list);
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses]);

  const showNotify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message: msg });
    setTimeout(() => setNotification(null), 3500);
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const activeCurriculum = curriculums.find(c => c.courseId === selectedCourseId) || {
    id: `curr_${selectedCourseId}`,
    courseId: selectedCourseId,
    courseName: selectedCourse?.name || 'Curso Selecionado',
    modality,
    teachingType,
    subjects: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      showNotify('Por favor informe o nome da disciplina', 'error');
      return;
    }

    const updatedSubjects = [...activeCurriculum.subjects];

    if (editingSubjectId) {
      const idx = updatedSubjects.findIndex(s => s.id === editingSubjectId);
      if (idx >= 0) {
        updatedSubjects[idx] = {
          ...updatedSubjects[idx],
          name: subjectName.trim(),
          workloadHours: Number(subjectWorkload),
          code: subjectCode.trim() || undefined,
          module: selectedModule
        };
      }
    } else {
      const maxOrderInModule = updatedSubjects
        .filter(s => s.module === selectedModule)
        .reduce((max, s) => Math.max(max, s.order), 0);

      const newSub: CurriculumSubject = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: subjectName.trim(),
        workloadHours: Number(subjectWorkload),
        order: maxOrderInModule + 1,
        module: selectedModule,
        code: subjectCode.trim() || undefined
      };
      updatedSubjects.push(newSub);
    }

    const updatedCurriculum: CurriculumGrade = {
      ...activeCurriculum,
      modality,
      teachingType,
      subjects: updatedSubjects,
      updatedAt: new Date().toISOString()
    };

    const newCurriculums = curriculums.filter(c => c.courseId !== selectedCourseId);
    newCurriculums.push(updatedCurriculum);

    setCurriculums(newCurriculums);
    saveCurriculums(newCurriculums);

    // Reset form
    setEditingSubjectId(null);
    setSubjectName('');
    setSubjectWorkload(60);
    setSubjectCode('');
    showNotify(editingSubjectId ? 'Disciplina atualizada com sucesso!' : 'Disciplina adicionada à grade curricular!');
  };

  const handleEditSubject = (sub: CurriculumSubject) => {
    setEditingSubjectId(sub.id);
    setSubjectName(sub.name);
    setSubjectWorkload(sub.workloadHours);
    setSubjectCode(sub.code || '');
    setSelectedModule(sub.module);
  };

  const handleRemoveSubject = (id: string) => {
    if (!confirm('Deseja remover esta disciplina da grade curricular?')) return;
    const updatedSubjects = activeCurriculum.subjects.filter(s => s.id !== id);
    const updatedCurriculum: CurriculumGrade = {
      ...activeCurriculum,
      subjects: updatedSubjects,
      updatedAt: new Date().toISOString()
    };
    const newCurriculums = curriculums.filter(c => c.courseId !== selectedCourseId);
    newCurriculums.push(updatedCurriculum);
    setCurriculums(newCurriculums);
    saveCurriculums(newCurriculums);
    showNotify('Disciplina removida da grade');
  };

  const handleReorder = (subId: string, direction: 'up' | 'down') => {
    const moduleSubs = activeCurriculum.subjects
      .filter(s => s.module === selectedModule)
      .sort((a, b) => a.order - b.order);

    const idx = moduleSubs.findIndex(s => s.id === subId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === moduleSubs.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const tempOrder = moduleSubs[idx].order;
    moduleSubs[idx].order = moduleSubs[targetIdx].order;
    moduleSubs[targetIdx].order = tempOrder;

    // Update main array
    const allOthers = activeCurriculum.subjects.filter(s => s.module !== selectedModule);
    const newAll = [...allOthers, ...moduleSubs];

    const updatedCurriculum = { ...activeCurriculum, subjects: newAll, updatedAt: new Date().toISOString() };
    const newCurriculums = curriculums.filter(c => c.courseId !== selectedCourseId);
    newCurriculums.push(updatedCurriculum);
    setCurriculums(newCurriculums);
    saveCurriculums(newCurriculums);
  };

  // Filter subjects for display
  const currentModuleSubjects = activeCurriculum.subjects
    .filter(s => s.module === selectedModule)
    .filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase())))
    .sort((a, b) => a.order - b.order);

  const totalCourseHours = activeCurriculum.subjects.reduce((sum, s) => sum + s.workloadHours, 0);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-400/30 text-blue-300">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black">Grade Curricular Oficial dos Cursos</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Estruturação de disciplinas, cargas horárias e ordem de oferta por módulo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-right">
              <span className="text-[10px] text-blue-200 font-bold uppercase block">Carga Horária Total</span>
              <span className="text-lg font-black text-amber-300">{totalCourseHours} horas</span>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-black flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {notification.message}
        </div>
      )}

      {/* Course Selection Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
            1. Curso
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
            2. Modalidade
          </label>
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value as ModalityType)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="Presencial">Presencial</option>
            <option value="EAD">EAD</option>
            <option value="Híbrido">Híbrido</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
            3. Tipo de Ensino
          </label>
          <select
            value={teachingType}
            onChange={(e) => setTeachingType(e.target.value as TeachingType)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="Técnico">Técnico</option>
            <option value="Graduação">Graduação</option>
            <option value="Pós">Pós-Graduação</option>
            <option value="Qualificação">Qualificação Profissional</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
            4. Módulo / Semestre
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedModule(m)}
                className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                  selectedModule === m
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                M{m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Column */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Layers className="h-5 w-5 text-blue-600" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {editingSubjectId ? 'Editar Disciplina' : 'Cadastrar Disciplina'} - Módulo {selectedModule}
            </h3>
          </div>

          <form onSubmit={handleSaveSubject} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome da Disciplina *
              </label>
              <input
                type="text"
                required
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Ex: Anatomia e Fisiologia Humana"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Carga Horária (h) *
                </label>
                <input
                  type="number"
                  required
                  min={10}
                  step={10}
                  value={subjectWorkload}
                  onChange={(e) => setSubjectWorkload(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Código Sigla
                </label>
                <input
                  type="text"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="Ex: ANAT80"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              {editingSubjectId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSubjectId(null);
                    setSubjectName('');
                    setSubjectWorkload(60);
                    setSubjectCode('');
                  }}
                  className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="h-4 w-4" />
                {editingSubjectId ? 'Atualizar Disciplina' : 'Adicionar à Grade'}
              </button>
            </div>
          </form>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl text-[11px] text-blue-800 dark:text-blue-300 space-y-1">
            <p className="font-extrabold">Uso Institucional:</p>
            <p>Esta grade curricular é a base oficial sincronizada para Histórico Escolar, Diários de Classe, Boletins, Diplomas e Matrículas.</p>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Disciplinas do Módulo {selectedModule} ({selectedCourse?.name})
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Organize a sequência curricular arrastando ou ordenando as disciplinas.
              </p>
            </div>

            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar disciplina..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl w-48 text-slate-800 dark:text-white"
              />
            </div>
          </div>

          {currentModuleSubjects.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhuma disciplina cadastrada para o Módulo {selectedModule} deste curso.
            </div>
          ) : (
            <div className="space-y-2">
              {currentModuleSubjects.map((sub, index) => (
                <div
                  key={sub.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 hover:border-blue-400 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0">
                      {sub.order}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-xs text-slate-800 dark:text-white">{sub.name}</h4>
                        {sub.code && (
                          <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono text-[10px] font-bold">
                            {sub.code}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Carga Horária: <strong className="text-slate-700 dark:text-slate-300">{sub.workloadHours} horas</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleReorder(sub.id, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-slate-500 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
                      title="Subir Ordem"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(sub.id, 'down')}
                      disabled={index === currentModuleSubjects.length - 1}
                      className="p-1.5 text-slate-500 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
                      title="Descer Ordem"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditSubject(sub)}
                      className="p-1.5 text-blue-600 hover:text-blue-800 cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(sub.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

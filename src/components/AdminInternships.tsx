/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modular component for managing and launching student internships (Estágios) from the Admin dashboard.
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, InternshipRecord } from '../types';
import { 
  Briefcase, Search, User, Award, Clock, MapPin, 
  CheckCircle, ArrowRight, Save, Clipboard, RefreshCw, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Predefined internship curriculum components per course
export const getInternshipComponentsByCourse = (courseId: string, courseName: string) => {
  const normalizedId = courseId.toUpperCase();
  const normalizedName = courseName.toLowerCase();

  if (normalizedId.includes('ENF') || normalizedName.includes('enfermagem')) {
    return [
      { name: 'INTRODUÇÃO À ENFERMAGEM', workload: 20 },
      { name: 'FUNDAMENTOS DE ENFERMAGEM', workload: 80 },
      { name: 'ASST. À MUHER, CRIANÇA E O ADOLES.', workload: 80 },
      { name: 'SAÚDE COLETIVA', workload: 40 },
      { name: 'SAÚDE MENTAL', workload: 40 },
      { name: 'URGÊNCIA E EMERGÊNCIA', workload: 40 },
      { name: 'GERIATRIA', workload: 40 },
      { name: 'PROCESSO DE TRABALHO EM CME', workload: 40 },
      { name: 'ASST. EM TRAT. CLINICO CIRURGICO', workload: 100 },
      { name: 'ASST. DE ENF. EM TRAT. ESPECIALIZADO', workload: 120 },
    ];
  }

  if (normalizedId.includes('RAD') || normalizedName.includes('radiologia')) {
    return [
      { name: 'AMBIENTAÇÃO HOSPITALAR', workload: 60 },
      { name: 'TÉCNICAS RADIOGRÁFICAS CONVENCIONAIS', workload: 150 },
      { name: 'TÉCNICAS RADIOGRÁFICAS ESPECIAIS I', workload: 100 },
      { name: 'TÉCNICAS RADIOGRÁFICAS ESPECIAIS II', workload: 90 },
    ];
  }

  if (normalizedId.includes('SEG') || normalizedName.includes('segurança') || normalizedName.includes('trabalho')) {
    return [
      { name: 'ESTÁGIO', workload: 240 },
    ];
  }

  if (normalizedId.includes('INC') || normalizedName.includes('instrumentação') || normalizedName.includes('cirúrgica')) {
    return [
      { name: 'ESTÁGIO', workload: 100 },
    ];
  }

  // Graceful default if not matched
  return [
    { name: 'ESTÁGIO SUPERVISIONADO', workload: 120 },
  ];
};

export const AdminInternships: React.FC = () => {
  const { 
    users, classes, courses, internships, updateInternshipRecord 
  } = useApp();

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Row states for active edits/launches
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editLocation, setEditLocation] = useState<string>('');
  const [editGrade, setEditGrade] = useState<string>('');

  // Status for flash successes
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});

  // Filter students
  const students = users.filter(u => u.role === UserRole.STUDENT);
  const filteredStudents = students.filter(s => {
    const fullSearch = `${s.name} ${s.username}`.toLowerCase();
    return fullSearch.includes(searchTerm.toLowerCase());
  });

  const selectedStudent = users.find(u => u.id === selectedStudentId);

  // Resolve Student's Course & Class
  const studentClass = selectedStudent ? classes.find(c => c.id === selectedStudent.classId) : null;
  const studentCourse = studentClass ? courses.find(co => co.id === studentClass.courseId) : null;

  // Resolve curriculum components
  const internshipComponents = studentCourse 
    ? getInternshipComponentsByCourse(studentCourse.id, studentCourse.name)
    : [];

  const handleEditClick = (compName: string, currentLoc: string, currentGrade: number | null) => {
    setEditingRow(compName);
    setEditLocation(currentLoc);
    setEditGrade(currentGrade !== null ? currentGrade.toString() : '');
  };

  const handleSave = async (compName: string, workload: number) => {
    if (!selectedStudentId) return;

    setSaveStatus(prev => ({ ...prev, [compName]: 'saving' }));

    // Parse grade (between 0 and 10)
    let parsedGrade: number | null = null;
    if (editGrade.trim() !== '') {
      const val = parseFloat(editGrade.replace(',', '.'));
      if (!isNaN(val)) {
        parsedGrade = Math.min(Math.max(val, 0), 10);
      }
    }

    // Persist changes to central context (automatically triggers cloud autosave)
    updateInternshipRecord(
      selectedStudentId,
      compName,
      workload,
      editLocation.trim(),
      parsedGrade
    );

    setSaveStatus(prev => ({ ...prev, [compName]: 'saved' }));
    setEditingRow(null);

    // Fade out success status after a while
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, [compName]: 'idle' }));
    }, 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header card with Amber Amber Accent */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Briefcase className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
              Secretaria de Estágios
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Selecione o estudante para visualizar e lançar a carga horária, local de realização e a nota final dos componentes curriculares de estágio do respectivo curso.
          </p>
        </div>
        
        {/* Statistics or visual indicator */}
        {selectedStudent && studentCourse && (
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="text-right">
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Curso Relacionado</span>
              <strong className="text-xs text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                {studentCourse.name}
              </strong>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
            <div className="text-center">
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">C.H. Total</span>
              <strong className="text-xs text-amber-600 dark:text-amber-400 font-black">
                {internshipComponents.reduce((sum, c) => sum + c.workload, 0)}h
              </strong>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        
        {/* Left: Search & Select Student List */}
        <div className="md:col-span-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
              Buscar Aluno
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar nome ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  Nenhum estudante encontrado.
                </div>
              ) : (
                filteredStudents.map(s => {
                  const active = selectedStudentId === s.id;
                  const sClass = classes.find(c => c.id === s.classId);
                  const sCourse = sClass ? courses.find(co => co.id === sClass.courseId) : null;
                  
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStudentId(s.id);
                        setEditingRow(null);
                      }}
                      className={`w-full p-3 text-left flex items-center justify-between transition-all ${
                        active 
                          ? 'bg-amber-500/10 text-amber-900 dark:bg-amber-500/5 dark:text-amber-200' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="font-extrabold text-xs truncate">
                          {s.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                          <User className="h-3 w-3 shrink-0" />
                          <span>RA: {s.username}</span>
                          {sCourse && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[120px]">{sCourse.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight className={`h-4 w-4 shrink-0 transition-transform ${active ? 'translate-x-1 text-amber-500' : 'text-slate-300'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Internship Component List & Forms */}
        <div className="md:col-span-8 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-sm min-h-[400px]">
          {!selectedStudent ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="p-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
                <Clipboard className="h-10 w-10 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-700 dark:text-white text-base">Aguardando Seleção de Aluno</h4>
                <p className="text-xs text-slate-400 max-w-md">
                  Selecione um aluno na lista ao lado para carregar e gerenciar seus componentes curriculares de estágio supervisionado.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* Selected Student Brief Header */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    Estudante Selecionado
                  </span>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">
                    {selectedStudent.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                    <span>RA: {selectedStudent.username}</span>
                    <span>•</span>
                    <span>CPF: {selectedStudent.cpf || 'Não cadastrado'}</span>
                  </div>
                </div>

                {!studentCourse && (
                  <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Sem curso associado</span>
                  </div>
                )}
              </div>

              {studentCourse && internshipComponents.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-slate-700 dark:text-white text-xs uppercase tracking-wide">
                    Grade de Estágios Supervisionados
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pb-3">
                          <th className="pb-3 pl-2">Componente Curricular</th>
                          <th className="pb-3 text-center">C.H.</th>
                          <th className="pb-3">Local Realizado</th>
                          <th className="pb-3 text-center">Nota</th>
                          <th className="pb-3 text-right pr-2">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {internshipComponents.map(comp => {
                          const record = internships.find(
                            r => r.studentId === selectedStudent.id && r.subjectName === comp.name
                          );

                          const isEditing = editingRow === comp.name;
                          const currentSaveStatus = saveStatus[comp.name] || 'idle';

                          return (
                            <tr 
                              key={comp.name}
                              className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors"
                            >
                              {/* Component Name */}
                              <td className="py-4 pl-2 font-extrabold text-slate-800 dark:text-slate-200">
                                {comp.name}
                              </td>

                              {/* Workload */}
                              <td className="py-4 text-center font-bold">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-extrabold rounded">
                                  {comp.workload}h
                                </span>
                              </td>

                              {/* Local */}
                              <td className="py-4 font-medium text-slate-600 dark:text-slate-400">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editLocation}
                                    onChange={(e) => setEditLocation(e.target.value)}
                                    placeholder="ex: Unidade Básica Centro"
                                    className="w-full text-xs px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
                                  />
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span className={record?.location ? 'text-slate-800 dark:text-slate-350 font-medium' : 'text-amber-500 font-bold italic'}>
                                      {record?.location || 'Pendente'}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Grade */}
                              <td className="py-4 text-center font-black">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    maxLength={4}
                                    value={editGrade}
                                    onChange={(e) => setEditGrade(e.target.value)}
                                    placeholder="0-10"
                                    className="w-14 text-center text-xs px-1 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
                                  />
                                ) : (
                                  <div className="inline-flex items-center justify-center">
                                    {record?.grade !== null && record?.grade !== undefined ? (
                                      <span className={`px-2 py-0.5 text-[10px] font-black rounded ${
                                        record.grade >= 7 
                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                      }`}>
                                        {record.grade.toFixed(1)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-bold italic text-[10px]">
                                        Pendente
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-4 text-right pr-2">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleSave(comp.name, comp.workload)}
                                        className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all flex items-center justify-center shadow-sm"
                                        title="Salvar lançamento"
                                      >
                                        <Save className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingRow(null)}
                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-all flex items-center justify-center"
                                        title="Cancelar"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleEditClick(comp.name, record?.location || '', record?.grade || null)}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 font-extrabold text-[10px] uppercase rounded-lg transition-all"
                                    >
                                      Lançar
                                    </button>
                                  )}

                                  {/* Saved micro indicator */}
                                  <AnimatePresence>
                                    {currentSaveStatus === 'saved' && (
                                      <motion.span
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0"
                                      >
                                        ✓ Salvo
                                      </motion.span>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  Este estudante pertence a um curso que não possui uma grade de estágios definida.
                </div>
              )}

            </div>
          )}
        </div>

      </div>

    </div>
  );
};

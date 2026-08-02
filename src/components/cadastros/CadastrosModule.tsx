import React, { useState } from 'react';
import { 
  Users, BookOpen, BookMarked, Layers, UserCheck, 
  FileSpreadsheet, DoorClosed, FileCheck, FolderKanban, ShieldCheck 
} from 'lucide-react';

import { StudentRegistration } from './StudentRegistration';
import { CourseRegistration } from './CourseRegistration';
import { SubjectRegistration } from './SubjectRegistration';
import { CourseModuleRegistration } from './CourseModuleRegistration';
import { TeacherRegistration } from './TeacherRegistration';
import { EvaluationTypeRegistration } from './EvaluationTypeRegistration';
import { ClassroomRegistration } from './ClassroomRegistration';
import { ResolutionRegistration } from './ResolutionRegistration';

export type CadastrosSubTab = 
  | 'alunos' 
  | 'cursos' 
  | 'disciplinas' 
  | 'modulos' 
  | 'professores' 
  | 'tipos_avaliacao' 
  | 'salas' 
  | 'resolucoes';

export const CadastrosModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<CadastrosSubTab>('alunos');

  const subMenuItems = [
    { id: 'alunos' as CadastrosSubTab, label: 'Alunos', icon: Users, desc: 'Cadastro de estudantes e documentos' },
    { id: 'cursos' as CadastrosSubTab, label: 'Cursos', icon: BookOpen, desc: 'Gestão de ofertas e matrizes' },
    { id: 'disciplinas' as CadastrosSubTab, label: 'Disciplinas', icon: BookMarked, desc: 'Ementas e cargas horárias' },
    { id: 'modulos' as CadastrosSubTab, label: 'Módulos', icon: Layers, desc: 'Estruturação por etapa acadêmica' },
    { id: 'professores' as CadastrosSubTab, label: 'Professores', icon: UserCheck, desc: 'Corpo docente e conselhos' },
    { id: 'tipos_avaliacao' as CadastrosSubTab, label: 'Tipos de Avaliação', icon: FileSpreadsheet, desc: 'Critérios e notas do diário' },
    { id: 'salas' as CadastrosSubTab, label: 'Salas de Aula', icon: DoorClosed, desc: 'Infraestrutura e capacidade' },
    { id: 'resolucoes' as CadastrosSubTab, label: 'Resoluções', icon: FileCheck, desc: 'Atos autorizativos do MEC/CEE' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-600/30 text-blue-400 rounded-2xl border border-blue-500/30">
            <FolderKanban className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">Central de Cadastros</h2>
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Integrado ao Sistema
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Gestão unificada de entidades acadêmicas, permissões e histórico de auditoria.
            </p>
          </div>
        </div>
      </div>

      {/* Submenus Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-2 border border-slate-200 dark:border-slate-800 shadow-xs flex overflow-x-auto gap-1 scrollbar-none">
        {subMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSubTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Submenu View */}
      <div className="min-h-[500px]">
        {activeSubTab === 'alunos' && <StudentRegistration />}
        {activeSubTab === 'cursos' && <CourseRegistration />}
        {activeSubTab === 'disciplinas' && <SubjectRegistration />}
        {activeSubTab === 'modulos' && <CourseModuleRegistration />}
        {activeSubTab === 'professores' && <TeacherRegistration />}
        {activeSubTab === 'tipos_avaliacao' && <EvaluationTypeRegistration />}
        {activeSubTab === 'salas' && <ClassroomRegistration />}
        {activeSubTab === 'resolucoes' && <ResolutionRegistration />}
      </div>

    </div>
  );
};

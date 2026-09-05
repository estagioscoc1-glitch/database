import React, { useState } from 'react';
import { CurriculumManager } from './CurriculumManager';
import { EnrollmentManager } from './EnrollmentManager';
import { TransferManager } from './TransferManager';
import { CancelationManager } from './CancelationManager';
import { DependencyManagerModule } from './DependencyManagerModule';
import { RequirementsManager } from './RequirementsManager';
import { OfficialTemplatesManager } from './OfficialTemplatesManager';
import { EventsManager } from './EventsManager';
import { EstagioCadastrosModule } from '../estagios/EstagioCadastrosModule';
import { EstagioVagasModule } from '../estagios/EstagioVagasModule';
import { EstagioPagamentosModule } from '../estagios/EstagioPagamentosModule';
import { EstagioCronogramaModule } from '../estagios/EstagioCronogramaModule';
import { EstagiosManager } from './EstagiosManager';
import { SpreadsheetImporter } from '../SpreadsheetImporter';
import { 
  BookOpen, UserCheck, ArrowLeftRight, XCircle, Repeat, 
  FileText, FileUp, Sparkles, Briefcase, FileSpreadsheet, ListChecks, Wallet, CalendarRange } from 'lucide-react';

interface MovimentacaoModuleProps {
  currentUser?: string;
  initialSubTab?: MovimentacaoSubTab;
}

export type MovimentacaoSubTab = 
  | 'grade_curricular' 
  | 'matriculas' 
  | 'importar_alunos'
  | 'transferencias' 
  | 'cancelamento' 
  | 'dependencias' 
  | 'requerimentos' 
  | 'upload_documentos' 
  | 'minicursos' 
  | 'estagios'
  | 'estagio_cadastros'
  | 'estagio_vagas'
  | 'estagio_pagamentos'
  | 'estagio_cronograma';

export const MovimentacaoModule: React.FC<MovimentacaoModuleProps> = ({ 
  currentUser = 'Administração Movimentação',
  initialSubTab = 'estagios'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<MovimentacaoSubTab>(initialSubTab);

  // Só as duas telas já corrigidas (ligadas ao banco de verdade) aparecem
  // aqui — as outras (Matrículas, Transferências, Cancelamento,
  // Dependência, Requerimentos, Grade Curricular, Importar Alunos)
  // continuam existindo no código, só não aparecem no menu, porque
  // duplicam funcionalidade que já existe em outro lugar do sistema.
  // "Upload de Documentos" fica de fora de propósito — vai entrar no
  // futuro menu "Gerar e Requerer Documentos".
  const submenus = [
    { id: 'estagios', label: 'Estágios', icon: Briefcase },
    // Módulo novo, ligado ao banco. O 'estagios' acima é a tela antiga, que
    // grava no navegador — as duas convivem até a migração terminar.
    { id: 'estagio_cadastros', label: 'Estágio — Cadastros', icon: ListChecks },
    { id: 'estagio_vagas', label: 'Estágio — Vagas', icon: Briefcase },
    { id: 'estagio_pagamentos', label: 'Estágio — Pagamentos', icon: Wallet },
    { id: 'estagio_cronograma', label: 'Estágio — Cronograma', icon: CalendarRange },
    { id: 'minicursos', label: 'Minicursos e Eventos', icon: Sparkles },
  ] as const;

  return (
    <div className="space-y-6">
      
      {/* Horizontal Navigation Bar for Movimentação Submenus */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-sm">
        <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
          {submenus.map((item) => {
            const Icon = item.icon;
            const isActive = activeSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSubTab(item.id as MovimentacaoSubTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 scale-[1.02]'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Selected Submodule */}
      <div>
        {activeSubTab === 'grade_curricular' && (
          <CurriculumManager currentUser={currentUser} />
        )}

        {activeSubTab === 'matriculas' && (
          <EnrollmentManager currentUser={currentUser} />
        )}

        {activeSubTab === 'importar_alunos' && (
          <SpreadsheetImporter />
        )}

        {activeSubTab === 'transferencias' && (
          <TransferManager currentUser={currentUser} />
        )}

        {activeSubTab === 'cancelamento' && (
          <CancelationManager currentUser={currentUser} />
        )}

        {activeSubTab === 'dependencias' && (
          <DependencyManagerModule currentUser={currentUser} />
        )}

        {activeSubTab === 'requerimentos' && (
          <RequirementsManager currentUser={currentUser} />
        )}

        {activeSubTab === 'upload_documentos' && (
          <OfficialTemplatesManager currentUser={currentUser} />
        )}

        {activeSubTab === 'minicursos' && (
          <EventsManager currentUser={currentUser} />
        )}

        {activeSubTab === 'estagios' && (
          <EstagiosManager currentUser={currentUser} />
        )}

        {/* Cadastros do módulo novo de estágio: supervisores, locais
            conveniados e o catálogo dos 16 estágios com preço. Grava no
            banco, diferente da tela acima. */}
        {activeSubTab === 'estagio_cadastros' && (
          <EstagioCadastrosModule currentUser={currentUser} />
        )}

        {/* Vagas: a turma de estágio, com os alunos dentro. */}
        {activeSubTab === 'estagio_vagas' && (
          <EstagioVagasModule currentUser={currentUser} />
        )}

        {/* Recibos e o relatório do que cada supervisor tem a receber. */}
        {activeSubTab === 'estagio_pagamentos' && (
          <EstagioPagamentosModule currentUser={currentUser} />
        )}

        {/* Cronograma do semestre. Publicado, aparece no painel do aluno. */}
        {activeSubTab === 'estagio_cronograma' && (
          <EstagioCronogramaModule currentUser={currentUser} />
        )}
      </div>

    </div>
  );
};

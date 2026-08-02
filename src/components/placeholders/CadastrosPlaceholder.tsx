import React from 'react';
import { UserCheck, Shield, Clock, Layers } from 'lucide-react';

interface CadastrosPlaceholderProps {
  onGoToCRM?: () => void;
}

export const CadastrosPlaceholder: React.FC<CadastrosPlaceholderProps> = ({ onGoToCRM }) => {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 text-center animate-in fade-in duration-300">
      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-3xl mx-auto flex items-center justify-center shadow-md">
        <Layers className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Módulo: Cadastros</h2>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Estrutura do menu de Cadastros pronta para receber novas funcionalidades de gestão institucional, turmas, disciplinas e professores.
        </p>
      </div>

      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-md mx-auto text-left space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase">
          <Clock className="h-4 w-4 text-blue-500" /> Próximas Expansões
        </div>
        <ul className="text-xs space-y-2 font-bold text-slate-700 dark:text-slate-300">
          <li className="flex items-center gap-2">✓ Cadastro de Cursos e Matrizes</li>
          <li className="flex items-center gap-2">✓ Cadastro de Turmas e Horários</li>
          <li className="flex items-center gap-2">✓ Cadastro de Professores e Colaboradores</li>
          <li className="flex items-center gap-2">✓ Gestão de Salas e Infraestrutura</li>
        </ul>
      </div>

      {onGoToCRM && (
        <button
          onClick={onGoToCRM}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
        >
          Ir para o Módulo CRM
        </button>
      )}
    </div>
  );
};

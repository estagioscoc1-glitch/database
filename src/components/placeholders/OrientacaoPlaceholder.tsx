import React from 'react';
import { Compass, Clock, HeartHandshake } from 'lucide-react';

interface OrientacaoPlaceholderProps {
  onGoToCRM?: () => void;
}

export const OrientacaoPlaceholder: React.FC<OrientacaoPlaceholderProps> = ({ onGoToCRM }) => {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 text-center animate-in fade-in duration-300">
      <div className="w-16 h-16 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-3xl mx-auto flex items-center justify-center shadow-md">
        <Compass className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Módulo: Orientação Educacional</h2>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Estrutura do menu de Orientação pronta para acompanhamento pedagógico, psicopedagógico, ocorrências e tutoria de alunos.
        </p>
      </div>

      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-md mx-auto text-left space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase">
          <Clock className="h-4 w-4 text-purple-500" /> Próximas Expansões
        </div>
        <ul className="text-xs space-y-2 font-bold text-slate-700 dark:text-slate-300">
          <li className="flex items-center gap-2">✓ Registro de Ocorrências e Faltas</li>
          <li className="flex items-center gap-2">✓ Atendimento Psicopedagógico</li>
          <li className="flex items-center gap-2">✓ Planos de Acompanhamento Individual</li>
          <li className="flex items-center gap-2">✓ Comunicação com Pais e Responsáveis</li>
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

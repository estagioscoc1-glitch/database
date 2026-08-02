import React from 'react';
import { DollarSign, Clock, CreditCard } from 'lucide-react';

interface FinanceiroPlaceholderProps {
  onGoToCRM?: () => void;
}

export const FinanceiroPlaceholder: React.FC<FinanceiroPlaceholderProps> = ({ onGoToCRM }) => {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 text-center animate-in fade-in duration-300">
      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-3xl mx-auto flex items-center justify-center shadow-md">
        <DollarSign className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Módulo: Financeiro</h2>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Estrutura do menu Financeiro preparada para gestão de mensalidades, faturamento, boletos, contas a pagar/receber e remessas bancárias.
        </p>
      </div>

      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-md mx-auto text-left space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase">
          <Clock className="h-4 w-4 text-emerald-500" /> Próximas Expansões
        </div>
        <ul className="text-xs space-y-2 font-bold text-slate-700 dark:text-slate-300">
          <li className="flex items-center gap-2">✓ Emissão e Baixa de Mensalidades</li>
          <li className="flex items-center gap-2">✓ Conciliação Bancária e PIX</li>
          <li className="flex items-center gap-2">✓ Gestão de Inadimplência e Acordos</li>
          <li className="flex items-center gap-2">✓ Relatórios Fiscais e DRE</li>
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

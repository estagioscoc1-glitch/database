import React, { useState, useEffect } from 'react';
import { PaymentMethodItem } from '../../types/financeiro';
import { getPaymentMethods, savePaymentMethod, addCustomPaymentMethod } from '../../services/financeiroStorage';
import { CreditCard, PlusCircle, CheckCircle2, XCircle } from 'lucide-react';

interface PaymentMethodsManagerProps {
  currentUser?: string;
}

export const PaymentMethodsManager: React.FC<PaymentMethodsManagerProps> = ({ 
  currentUser = 'Financeiro' 
}) => {
  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [newMethodName, setNewMethodName] = useState('');

  const refreshData = () => {
    setMethods(getPaymentMethods());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleToggleActive = (pm: PaymentMethodItem) => {
    savePaymentMethod({ ...pm, active: !pm.active }, currentUser);
    refreshData();
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodName.trim()) return;

    addCustomPaymentMethod(newMethodName.trim(), currentUser);
    setNewMethodName('');
    refreshData();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-1">
        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" /> Formas de Pagamento Configuráveis
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Gerencie as modalidades de pagamento disponíveis para recebimentos e saídas no sistema.
        </p>
      </div>

      {/* Add New Method Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row items-end gap-3 text-xs">
          <div className="flex-1 space-y-1 w-full">
            <label className="block text-[11px] font-extrabold uppercase text-slate-500">Nome da Nova Forma de Pagamento</label>
            <input
              type="text"
              required
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              placeholder="Ex: Boleto Bancário S2, Carnê Digital, Permuta..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <PlusCircle className="h-4 w-4" /> Cadastrar Modalidade
          </button>
        </form>
      </div>

      {/* Grid of Methods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {methods.map((pm) => (
          <div key={pm.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs block">{pm.name}</span>
              <span className="text-[10px] text-slate-400 block">
                {pm.isSystemDefault ? 'Padrão do Sistema' : 'Personalizada'}
              </span>
            </div>

            <button
              onClick={() => handleToggleActive(pm)}
              className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                pm.active 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {pm.active ? 'Ativa' : 'Inativa'}
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};

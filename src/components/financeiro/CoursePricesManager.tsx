import React, { useState, useEffect } from 'react';
import { CoursePriceConfig } from '../../types/financeiro';
import { getCoursePriceConfigs, saveCoursePriceConfig } from '../../services/financeiroStorage';
import { GraduationCap, Edit3, Save, CheckCircle2, DollarSign } from 'lucide-react';

interface CoursePricesManagerProps {
  currentUser?: string;
  courses?: any[];
}

export const CoursePricesManager: React.FC<CoursePricesManagerProps> = ({ 
  currentUser = 'Financeiro',
  courses = []
}) => {
  const [configs, setConfigs] = useState<CoursePriceConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<CoursePriceConfig | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const refreshData = () => {
    setConfigs(getCoursePriceConfigs());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleEditClick = (cfg: CoursePriceConfig) => {
    setEditingConfig({ ...cfg });
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;

    saveCoursePriceConfig(editingConfig, currentUser);
    setSuccessMessage(`Tabela de preços para ${editingConfig.courseName} atualizada com sucesso!`);
    setTimeout(() => setSuccessMessage(''), 4000);
    setEditingConfig(null);
    refreshData();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-1">
        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-blue-600" /> Tabela de Valores dos Cursos
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Defina os valores padrão de matrícula, rematrícula, mensalidades, dependências e juros por curso.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold flex items-center gap-2 rounded-2xl">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Course Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {configs.map((cfg) => (
          <div key={cfg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-black text-slate-900 dark:text-white text-base">{cfg.courseName}</h4>
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full">
                  ID: {cfg.courseId}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Valor Matrícula</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white text-sm">R$ {cfg.enrollmentPrice.toFixed(2)}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Valor Rematrícula</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white text-sm">R$ {cfg.reenrollmentPrice.toFixed(2)}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Mensalidade Padrão</span>
                  <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">R$ {cfg.monthlyPrice.toFixed(2)}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Valor Dependência</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white text-sm">R$ {cfg.dependencyPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 text-xs space-y-1 text-slate-600 dark:text-slate-400 font-medium">
                <p>• Desconto de Pontualidade: <strong>{cfg.discountPercent}%</strong> até o dia <strong>{cfg.discountLimitDay}</strong> do mês.</p>
                <p>• Multa por Atraso: <strong>{cfg.finePercent}%</strong> • Juros Diários: <strong>{(cfg.dailyInterestPercent * 30).toFixed(1)}%/mês</strong></p>
                {cfg.notes && <p className="text-[11px] text-slate-400 italic mt-1">{cfg.notes}</p>}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => handleEditClick(cfg)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="h-4 w-4" /> Configurar Valores
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT MODAL */}
      {editingConfig && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Editar Valores - {editingConfig.courseName}
              </h3>
              <button onClick={() => setEditingConfig(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Valor Matrícula (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingConfig.enrollmentPrice}
                    onChange={(e) => setEditingConfig({ ...editingConfig, enrollmentPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Valor Rematrícula (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingConfig.reenrollmentPrice}
                    onChange={(e) => setEditingConfig({ ...editingConfig, reenrollmentPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Mensalidade Padrão (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingConfig.monthlyPrice}
                    onChange={(e) => setEditingConfig({ ...editingConfig, monthlyPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Valor Dependência (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingConfig.dependencyPrice}
                    onChange={(e) => setEditingConfig({ ...editingConfig, dependencyPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Desconto Pontualidade (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingConfig.discountPercent}
                    onChange={(e) => setEditingConfig({ ...editingConfig, discountPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Dia Limite Desconto</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={editingConfig.discountLimitDay}
                    onChange={(e) => setEditingConfig({ ...editingConfig, discountLimitDay: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Observações da Tabela</label>
                <textarea
                  rows={2}
                  value={editingConfig.notes || ''}
                  onChange={(e) => setEditingConfig({ ...editingConfig, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingConfig(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md"
                >
                  Salvar Tabela de Preços
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

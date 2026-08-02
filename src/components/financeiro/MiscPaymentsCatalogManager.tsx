import React, { useState, useEffect } from 'react';
import { MiscPaymentCatalog } from '../../types/financeiro';
import { getMiscPaymentCatalog, saveMiscPaymentCatalog } from '../../services/financeiroStorage';
import { 
  PlusCircle, ShieldAlert, CheckCircle2, Edit3, Trash2, Lock, Unlock, Search, Sparkles 
} from 'lucide-react';

interface MiscPaymentsCatalogManagerProps {
  currentUser?: string;
}

export const MiscPaymentsCatalogManager: React.FC<MiscPaymentsCatalogManagerProps> = ({ 
  currentUser = 'Financeiro' 
}) => {
  const [catalog, setCatalog] = useState<MiscPaymentCatalog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Taxa Administrativa');
  const [defaultValue, setDefaultValue] = useState('0.00');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [blockedActions, setBlockedActions] = useState<string[]>([]);

  const refreshData = () => {
    setCatalog(getMiscPaymentCatalog());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setName('');
    setCategory('Taxa Administrativa');
    setDefaultValue('0.00');
    setDescription('');
    setActive(true);
    setBlockedActions([]);
    setShowModal(true);
  };

  const openEditModal = (item: MiscPaymentCatalog) => {
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category);
    setDefaultValue(item.defaultValue.toString());
    setDescription(item.description);
    setActive(item.active);
    setBlockedActions(item.blockedActions || []);
    setShowModal(true);
  };

  const toggleBlockedAction = (actionKey: string) => {
    if (blockedActions.includes(actionKey)) {
      setBlockedActions(blockedActions.filter(a => a !== actionKey));
    } else {
      setBlockedActions([...blockedActions, actionKey]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(defaultValue.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      alert('Informe um valor padrão válido.');
      return;
    }

    const item: MiscPaymentCatalog = {
      id: editingId || 'cat_' + Date.now(),
      name: name.trim(),
      category: category.trim(),
      defaultValue: val,
      description: description.trim(),
      active,
      blockedActions
    };

    saveMiscPaymentCatalog(item, currentUser);
    setShowModal(false);
    refreshData();
  };

  const filteredCatalog = catalog.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableActions = [
    { key: 'MATRICULA', label: 'Bloquear / Liberar Matrícula' },
    { key: 'REMATRICULA', label: 'Bloquear / Liberar Rematrícula' },
    { key: 'ESTAGIO', label: 'Bloquear / Liberar Início de Estágio' },
    { key: 'DIPLOMA', label: 'Bloquear / Liberar Emissão de Diploma' },
    { key: 'CERTIFICADO', label: 'Bloquear / Liberar Certificado' },
    { key: 'DOCUMENTOS', label: 'Bloquear / Liberar Emissão de Histórico / Documentos' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" /> Catálogo de Pagamentos Diversos & Condicionamento
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastre taxas, produtos e serviços. Configure travas que bloqueiam ações (diplomas, estágio, rematrícula) enquanto pendentes.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95 uppercase tracking-wide"
        >
          <PlusCircle className="h-4.5 w-4.5" /> Nova Cobrança Diversa
        </button>
      </div>

      {/* Catalog Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        
        <div className="relative max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cobrança ou categoria..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCatalog.map((item) => (
            <div key={item.id} className="p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl space-y-3 relative flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-md text-[10px] font-black uppercase">
                    {item.category}
                  </span>
                  <span className="font-mono font-black text-slate-900 dark:text-white text-base">
                    R$ {item.defaultValue.toFixed(2)}
                  </span>
                </div>

                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{item.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
              </div>

              {item.blockedActions && item.blockedActions.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Funcionalidades Condicionadas ({item.blockedActions.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {item.blockedActions.map(act => (
                      <span key={act} className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded text-[9px] font-black uppercase">
                        {act}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className={`text-[10px] font-extrabold uppercase ${item.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  ● {item.active ? 'Ativo' : 'Inativo'}
                </span>

                <button
                  onClick={() => openEditModal(item)}
                  className="px-3 py-1 bg-white hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-[11px] border border-slate-200 dark:border-slate-600 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="h-3 w-3" /> Editar
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* EDIT / CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {editingId ? 'Editar Cobrança Diversa' : 'Nova Cobrança Diversa'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Nome da Cobrança (*)</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Taxa de Registro de Diploma"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Categoria (*)</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Material, Vestuário, Diploma"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Valor Padrão (R$ *)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Descrição do Item</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Taxa administrativa de emissão de diploma oficial..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              {/* Condicionar funcionalidade ao pagamento */}
              <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl">
                <span className="text-[11px] font-extrabold text-amber-800 dark:text-amber-200 uppercase tracking-wider block flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4 text-amber-600" /> Condicionar Funcionalidade ao Pagamento
                </span>
                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                  Marque as ações que ficarão BLOQUEADAS para o aluno enquanto esta taxa não for quitada:
                </p>

                <div className="space-y-1.5 pt-1">
                  {availableActions.map((act) => (
                    <label key={act.key} className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={blockedActions.includes(act.key)}
                        onChange={() => toggleBlockedAction(act.key)}
                        className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                      />
                      <span>{act.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md"
                >
                  Salvar Cobrança
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

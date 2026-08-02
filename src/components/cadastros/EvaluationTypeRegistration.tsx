import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { EvaluationType } from '../../types/cadastros';
import { 
  getEvaluationTypes, saveEvaluationTypes, initialEvaluationTypes,
  addAuditLog, getAuditLogs 
} from '../../services/cadastrosStorage';
import { AuditLogModal } from './AuditLogModal';

import { 
  Plus, Search, Edit3, Trash2, Eye, History, Check, X, 
  FileSpreadsheet, ChevronLeft, ChevronRight, AlertCircle, Sparkles 
} from 'lucide-react';

export const EvaluationTypeRegistration: React.FC = () => {
  const { currentUser } = useApp();

  const [evalList, setEvalList] = useState<EvaluationType[]>(() => getEvaluationTypes());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Audit Log Modal
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAuditEval, setSelectedAuditEval] = useState<EvaluationType | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxScore, setMaxScore] = useState<number>(10);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    saveEvaluationTypes(evalList);
  }, [evalList]);

  // Filtered
  const filteredList = evalList.filter(ev => 
    ev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ev.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ev.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedId(null);
    setCode('');
    setName('');
    setDescription('');
    setMaxScore(10);
    setDisplayOrder(evalList.length + 1);
    setStatus('ATIVO');
    setFeedbackMsg(null);
    setShowModal(true);
  };

  const handleOpenEditOrView = (item: EvaluationType, mode: 'edit' | 'view') => {
    setModalMode(mode);
    setSelectedId(item.id);
    setCode(item.code || '');
    setName(item.name);
    setDescription(item.description || '');
    setMaxScore(item.maxScore ?? 10);
    setDisplayOrder(item.displayOrder || 1);
    setStatus(item.status || 'ATIVO');
    setFeedbackMsg(null);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') return;

    if (!name.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Informe o Nome do Tipo de Avaliação.' });
      return;
    }

    const performer = currentUser?.name || 'Administrador';

    if (modalMode === 'create') {
      const newEval: EvaluationType = {
        id: 'eval_' + Date.now(),
        code: code.trim().toUpperCase() || name.trim().slice(0, 6).toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        maxScore: Number(maxScore) || 10,
        displayOrder: Number(displayOrder),
        status,
        isDefault: false
      };

      const updated = [...evalList, newEval].sort((a,b) => a.displayOrder - b.displayOrder);
      setEvalList(updated);
      addAuditLog(newEval.id, 'TIPO_AVALIACAO', 'CRIADO', performer, `Tipo de avaliação "${name}" cadastrado com valor limite ${maxScore}.`);
      setFeedbackMsg({ type: 'success', text: `Tipo de Avaliação "${name}" cadastrado com sucesso!` });

    } else if (modalMode === 'edit' && selectedId) {
      const updated = evalList.map(ev => {
        if (ev.id === selectedId) {
          return {
            ...ev,
            code: code.trim().toUpperCase() || ev.code,
            name: name.trim(),
            description: description.trim(),
            maxScore: Number(maxScore) || 10,
            displayOrder: Number(displayOrder),
            status
          };
        }
        return ev;
      }).sort((a,b) => a.displayOrder - b.displayOrder);

      setEvalList(updated);
      addAuditLog(selectedId, 'TIPO_AVALIACAO', 'EDITADO', performer, `Tipo de avaliação "${name}" atualizado.`);
      setFeedbackMsg({ type: 'success', text: `Tipo de Avaliação "${name}" atualizado!` });
    }

    setTimeout(() => {
      setShowModal(false);
      setFeedbackMsg(null);
    }, 1200);
  };

  const handleDelete = (item: EvaluationType) => {
    if (!window.confirm(`Tem certeza que deseja excluir o tipo de avaliação "${item.name}"?`)) return;
    const performer = currentUser?.name || 'Administrador';
    const updated = evalList.filter(ev => ev.id !== item.id);
    setEvalList(updated);
    addAuditLog(item.id, 'TIPO_AVALIACAO', 'EXCLUIDO', performer, `Tipo de avaliação "${item.name}" excluído.`);
    alert(`Tipo de avaliação "${item.name}" excluído.`);
  };

  const handleOpenAudit = (item: EvaluationType) => {
    setSelectedAuditEval(item);
    setShowAuditModal(true);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Deseja carregar o modelo padrão do Diário de Classe (V1, V2, V3, V4, V5, V6, REC, EX)?')) {
      const performer = currentUser?.name || 'Administrador';
      setEvalList(initialEvaluationTypes);
      saveEvaluationTypes(initialEvaluationTypes);
      addAuditLog('eval_types_reset', 'TIPO_AVALIACAO', 'EDITADO', performer, 'Lista de avaliações restaurada para o padrão do Diário de Classe (V1, V2...).');
      alert('Modelo de diário V1, V2... aplicado com sucesso!');
    }
  };

  const getEvalAuditLogs = () => {
    if (!selectedAuditEval) return [];
    return getAuditLogs().filter(l => l.entityId === selectedAuditEval.id && l.entityType === 'TIPO_AVALIACAO');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por tipo de avaliação ou descrição..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetToDefault}
            title="Carregar avaliações padrão do Diário (V1, V2...)"
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Padrão Diário (V1, V2...)</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Tipo de Avaliação</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ordem / Sigla / Nome</th>
                <th className="py-3.5 px-4">Descrição Pedagógica</th>
                <th className="py-3.5 px-4 text-center">Valor Limite (Nota Máx)</th>
                <th className="py-3.5 px-4 text-center">Situação</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Nenhum tipo de avaliação encontrado.
                  </td>
                </tr>
              ) : (
                paginatedList.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black shrink-0">
                          #{ev.displayOrder}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-900 text-amber-400 dark:bg-slate-800 rounded-lg text-[11px] font-black font-mono">
                              {ev.code || ev.name.split(' ')[0]}
                            </span>
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm">{ev.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {ev.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {ev.description || 'Coluna cadastrada para o diário de classe.'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs font-extrabold">
                        {ev.maxScore !== undefined ? `${ev.maxScore} pts` : '10 pts'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        ev.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {ev.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditOrView(ev, 'view')}
                          title="Visualizar Tipo"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditOrView(ev, 'edit')}
                          title="Editar Tipo"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenAudit(ev)}
                          title="Histórico de Auditoria"
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ev)}
                          title="Excluir Tipo"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
          <div>
            Exibindo {paginatedList.length} de {filteredList.length} tipo(s)
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full flex flex-col overflow-hidden">
            
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-600/30 text-amber-400 rounded-2xl border border-amber-500/30">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-base">
                  {modalMode === 'create' ? 'Novo Tipo de Avaliação' : modalMode === 'edit' ? 'Editar Tipo de Avaliação' : 'Visualizar Tipo'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {feedbackMsg && (
                <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  feedbackMsg.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Sigla / Código *</label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Ex: AV1, S1"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 font-mono uppercase text-slate-900 dark:text-amber-400 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Nome da Avaliação *</label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: AV1 - Avaliação 1"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Valor Limite / Máx</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    disabled={modalMode === 'view'}
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    placeholder="Ex: 10"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Ordem Exibição</label>
                  <input
                    type="number"
                    min={1}
                    disabled={modalMode === 'view'}
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Situação</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="INATIVO">INATIVO</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Descrição / Critérios de Nota</label>
                <textarea
                  rows={3}
                  disabled={modalMode === 'view'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Orientações e regras de avaliação..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-extrabold text-xs cursor-pointer"
                >
                  Cancelar
                </button>

                {modalMode !== 'view' && (
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    <span>Salvar Tipo</span>
                  </button>
                )}
              </div>

            </form>

          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL */}
      <AuditLogModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        logs={getEvalAuditLogs()}
        title="Histórico de Auditoria do Tipo de Avaliação"
        entityName={selectedAuditEval?.name}
      />

    </div>
  );
};

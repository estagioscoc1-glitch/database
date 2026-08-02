import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Classroom } from '../../types/cadastros';
import { 
  getClassrooms, saveClassrooms, 
  addAuditLog, getAuditLogs 
} from '../../services/cadastrosStorage';
import { AuditLogModal } from './AuditLogModal';

import { 
  Plus, Search, Edit3, Trash2, Eye, History, Check, X, 
  DoorClosed, Users, ChevronLeft, ChevronRight, AlertCircle, Building2 
} from 'lucide-react';

export const ClassroomRegistration: React.FC = () => {
  const { currentUser } = useApp();

  const [roomsList, setRoomsList] = useState<Classroom[]>(() => getClassrooms());
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Audit Log Modal
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAuditRoom, setSelectedAuditRoom] = useState<Classroom | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [capacity, setCapacity] = useState<number>(40);
  const [roomType, setRoomType] = useState<Classroom['roomType']>('Sala convencional');
  const [status, setStatus] = useState<Classroom['status']>('ATIVO');
  const [notes, setNotes] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    saveClassrooms(roomsList);
  }, [roomsList]);

  // Search & Filter
  const filteredList = roomsList.filter(r => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.block || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || r.roomType === typeFilter;

    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedId(null);
    setName('');
    setCode('');
    setBlock('Bloco A');
    setFloor('1º Andar');
    setCapacity(40);
    setRoomType('Sala convencional');
    setStatus('ATIVO');
    setNotes('Ar Condicionado, Quadro Branco, Projetor HD');
    setFeedbackMsg(null);
    setShowModal(true);
  };

  const handleOpenEditOrView = (item: Classroom, mode: 'edit' | 'view') => {
    setModalMode(mode);
    setSelectedId(item.id);
    setName(item.name);
    setCode(item.code);
    setBlock(item.block || '');
    setFloor(item.floor || '');
    setCapacity(item.capacity || 40);
    setRoomType(item.roomType || 'Sala convencional');
    setStatus(item.status || 'ATIVO');
    setNotes(item.notes || '');
    setFeedbackMsg(null);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') return;

    if (!name.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Informe o Nome da Sala.' });
      return;
    }
    if (!code.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Informe o Código da Sala.' });
      return;
    }

    const performer = currentUser?.name || 'Administrador';

    if (modalMode === 'create') {
      const newRoom: Classroom = {
        id: 'room_' + Date.now(),
        name: name.trim(),
        code: code.trim().toUpperCase(),
        block: block.trim(),
        floor: floor.trim(),
        capacity: Number(capacity),
        roomType,
        status,
        notes: notes.trim(),
        createdAt: new Date().toISOString()
      };

      const updated = [newRoom, ...roomsList];
      setRoomsList(updated);
      addAuditLog(newRoom.id, 'SALA', 'CRIADO', performer, `Sala de aula "${name}" (${code}) cadastrada.`);
      setFeedbackMsg({ type: 'success', text: `Sala "${name}" cadastrada com sucesso!` });

    } else if (modalMode === 'edit' && selectedId) {
      const updated = roomsList.map(r => {
        if (r.id === selectedId) {
          return {
            ...r,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            block: block.trim(),
            floor: floor.trim(),
            capacity: Number(capacity),
            roomType,
            status,
            notes: notes.trim(),
            updatedAt: new Date().toISOString()
          };
        }
        return r;
      });

      setRoomsList(updated);
      addAuditLog(selectedId, 'SALA', 'EDITADO', performer, `Dados da sala "${name}" (${code}) atualizados.`);
      setFeedbackMsg({ type: 'success', text: `Sala "${name}" atualizada com sucesso!` });
    }

    setTimeout(() => {
      setShowModal(false);
      setFeedbackMsg(null);
    }, 1200);
  };

  const handleDelete = (item: Classroom) => {
    if (!window.confirm(`Tem certeza que deseja excluir a sala "${item.name}"?`)) return;
    const performer = currentUser?.name || 'Administrador';
    const updated = roomsList.filter(r => r.id !== item.id);
    setRoomsList(updated);
    addAuditLog(item.id, 'SALA', 'EXCLUIDO', performer, `Sala "${item.name}" excluída.`);
    alert(`Sala "${item.name}" excluída com sucesso.`);
  };

  const handleOpenAudit = (item: Classroom) => {
    setSelectedAuditRoom(item);
    setShowAuditModal(true);
  };

  const getRoomAuditLogs = () => {
    if (!selectedAuditRoom) return [];
    return getAuditLogs().filter(l => l.entityId === selectedAuditRoom.id && l.entityType === 'SALA');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar sala por nome, código ou bloco..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="Sala convencional">Sala Convencional</option>
            <option value="Laboratório">Laboratório</option>
            <option value="Auditório">Auditório</option>
            <option value="Clínica">Clínica</option>
            <option value="Sala prática">Sala Prática</option>
          </select>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Sala</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Código / Sala</th>
                <th className="py-3.5 px-4">Bloco / Andar</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4 text-center">Capacidade</th>
                <th className="py-3.5 px-4 text-center">Situação</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhuma sala cadastrada.
                  </td>
                </tr>
              ) : (
                paginatedList.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black shrink-0">
                          <DoorClosed className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm">{r.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">Código: {r.code}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-800 dark:text-slate-200">{r.block || 'Bloco Central'}</div>
                      <div className="text-[11px] text-slate-400">{r.floor || 'Térreo'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-extrabold">
                        {r.roomType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-extrabold text-slate-800 dark:text-slate-200">
                        <Users className="h-3.5 w-3.5 text-blue-500" />
                        {r.capacity} alunos
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        r.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' :
                        r.status === 'MANUTENÇÃO' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {r.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditOrView(r, 'view')}
                          title="Visualizar Sala"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditOrView(r, 'edit')}
                          title="Editar Sala"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenAudit(r)}
                          title="Histórico de Auditoria"
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          title="Excluir Sala"
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
            Exibindo {paginatedList.length} de {filteredList.length} sala(s)
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden">
            
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-600/30 text-teal-400 rounded-2xl border border-teal-500/30">
                  <DoorClosed className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-base">
                  {modalMode === 'create' ? 'Nova Sala de Aula' : modalMode === 'edit' ? 'Editar Sala de Aula' : 'Visualizar Sala'}
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
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Nome da Sala *</label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Laboratório de Radiologia B"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Código *</label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Ex: LAB-RAD"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Bloco</label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    placeholder="Bloco A"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Andar</label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="1º Andar"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Capacidade</label>
                  <input
                    type="number"
                    min={1}
                    disabled={modalMode === 'view'}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Tipo de Sala</label>
                  <select
                    disabled={modalMode === 'view'}
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Sala convencional">Sala Convencional</option>
                    <option value="Laboratório">Laboratório</option>
                    <option value="Auditório">Auditório</option>
                    <option value="Clínica">Clínica</option>
                    <option value="Sala prática">Sala Prática</option>
                    <option value="Outro">Outro</option>
                  </select>
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
                    <option value="MANUTENÇÃO">MANUTENÇÃO</option>
                    <option value="INATIVO">INATIVO</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Recursos e Observações</label>
                <textarea
                  rows={3}
                  disabled={modalMode === 'view'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Equipamentos disponíveis, projetor, ar condicionado..."
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
                    <span>Salvar Sala</span>
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
        logs={getRoomAuditLogs()}
        title="Histórico de Auditoria da Sala"
        entityName={selectedAuditRoom?.name}
      />

    </div>
  );
};

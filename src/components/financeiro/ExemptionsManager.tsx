import React, { useState, useEffect } from 'react';
import { ExemptionItem, Installment } from '../../types/financeiro';
import { getExemptions, applyExemption, getInstallments } from '../../services/financeiroStorage';
import { ShieldCheck, PlusCircle, Search, CheckCircle2, History, User } from 'lucide-react';

interface ExemptionsManagerProps {
  currentUser?: string;
  allStudentUsers?: any[];
}

export const ExemptionsManager: React.FC<ExemptionsManagerProps> = ({ 
  currentUser = 'Financeiro',
  allStudentUsers = []
}) => {
  const [exemptions, setExemptions] = useState<ExemptionItem[]>([]);
  const [openInstallments, setOpenInstallments] = useState<Installment[]>([]);
  const [mode, setMode] = useState<'CONCEDER' | 'HISTORICO'>('CONCEDER');

  // Form State
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [selectedInstId, setSelectedInstId] = useState('');
  const [type, setType] = useState<'TOTAL' | 'PARTIAL'>('PARTIAL');
  const [exemptionValue, setExemptionValue] = useState('100.00');
  const [authorizer, setAuthorizer] = useState('Direção Financeira');
  const [reason, setReason] = useState('');

  const refreshData = () => {
    setExemptions(getExemptions());
    setOpenInstallments(getInstallments().filter(i => i.status === 'PENDENTE'));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstId) {
      alert('Selecione uma parcela para aplicar o abono.');
      return;
    }

    const val = parseFloat(exemptionValue.replace(',', '.'));
    if (type === 'PARTIAL' && (isNaN(val) || val <= 0)) {
      alert('Informe um valor de abono válido.');
      return;
    }

    applyExemption(
      selectedInstId,
      type,
      type === 'TOTAL' ? 0 : val,
      reason.trim(),
      authorizer.trim(),
      currentUser
    );

    alert('Abono aplicado com sucesso!');
    setSelectedInstId('');
    setReason('');
    refreshData();
    setMode('HISTORICO');
  };

  const studentInstallments = openInstallments.filter(i => 
    selectedStudent ? i.studentId === selectedStudent.id || i.studentName === selectedStudent.name : true
  );

  const filteredStudents = (query: string) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allStudentUsers.filter((s: any) => 
      s.name?.toLowerCase().includes(q) || 
      s.enrollment?.toLowerCase().includes(q)
    ).slice(0, 5);
  };

  return (
    <div className="space-y-6">
      
      {/* Subtabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setMode('CONCEDER')}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
            mode === 'CONCEDER'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Conceder Abono em Parcela</span>
        </button>

        <button
          onClick={() => setMode('HISTORICO')}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
            mode === 'HISTORICO'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Histórico de Abonos Concedidos ({exemptions.length})</span>
        </button>
      </div>

      {mode === 'CONCEDER' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Concessão de Abono Parcial ou Total
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Isente valores parciais ou quite integralmente uma parcela por decisão da diretoria.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            
            {/* Student Search */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Buscar Aluno (*)</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    if (!e.target.value) setSelectedStudent(null);
                  }}
                  placeholder="Buscar aluno por nome ou matrícula..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />

                {studentSearch && !selectedStudent && (
                  <div className="absolute left-0 right-0 top-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 divide-y divide-slate-100 dark:divide-slate-700 max-h-40 overflow-y-auto">
                    {filteredStudents(studentSearch).map((st: any) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudent(st);
                          setStudentSearch(st.name);
                        }}
                        className="w-full text-left p-2 hover:bg-blue-50 dark:hover:bg-slate-700 font-bold text-slate-800 dark:text-white"
                      >
                        {st.name} ({st.enrollment})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Installment Selection */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Selecione a Parcela Pendente (*)</label>
              <select
                required
                value={selectedInstId}
                onChange={(e) => setSelectedInstId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="">Selecione uma parcela...</option>
                {studentInstallments.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.studentName} - Parcela {inst.number}/{inst.totalInstallments} ({inst.competencia}) - Venc: {inst.dueDate} - R$ {inst.originalValue.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Tipo de Abono (*)</label>
                <select
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="PARTIAL">Abono Parcial (Valor R$)</option>
                  <option value="TOTAL">Abono Total (100% Isenção)</option>
                </select>
              </div>

              {type === 'PARTIAL' && (
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Valor do Abono (R$ *)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={exemptionValue}
                    onChange={(e) => setExemptionValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Autorizado Por (*)</label>
                <input
                  type="text"
                  required
                  value={authorizer}
                  onChange={(e) => setAuthorizer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Motivo / Justificativa OBRIGATÓRIA (*)</label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Abono concedido devido a serviços prestados pelo aluno à instituição..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-600/30 cursor-pointer transition-all uppercase tracking-wide flex items-center gap-2"
              >
                <ShieldCheck className="h-4 w-4" /> Registrar e Conceder Abono
              </button>
            </div>

          </form>
        </div>
      )}

      {mode === 'HISTORICO' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Data / Hora</th>
                  <th className="p-3.5">Aluno</th>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5 text-right">Valor Abono</th>
                  <th className="p-3.5">Autorizado Por</th>
                  <th className="p-3.5">Motivo / Justificativa</th>
                  <th className="p-3.5">Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {exemptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Nenhum abono concedido até o momento.
                    </td>
                  </tr>
                ) : (
                  exemptions.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all">
                      <td className="p-3.5 font-mono text-slate-500">{new Date(ex.date).toLocaleString('pt-BR')}</td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{ex.studentName}</td>
                      <td className="p-3.5 font-bold uppercase text-blue-600">{ex.type}</td>
                      <td className="p-3.5 text-right font-mono font-black text-emerald-600">R$ {ex.waivedValue.toFixed(2)}</td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">{ex.authorizer}</td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">{ex.reason}</td>
                      <td className="p-3.5 font-mono text-slate-500">{ex.user}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

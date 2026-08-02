import React, { useState, useEffect } from 'react';
import { Scholarship } from '../../types/financeiro';
import { getScholarships, saveScholarship } from '../../services/financeiroStorage';
import { 
  Award, PlusCircle, Search, Edit3, CheckCircle2, User, Building, Sparkles 
} from 'lucide-react';

interface ScholarshipsManagerProps {
  currentUser?: string;
  allStudentUsers?: any[];
}

export const ScholarshipsManager: React.FC<ScholarshipsManagerProps> = ({ 
  currentUser = 'Financeiro',
  allStudentUsers = []
}) => {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [type, setType] = useState('Bolsa Mérito');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState('20');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [partnerInstitution, setPartnerInstitution] = useState('');
  const [authorizer, setAuthorizer] = useState('Direção Geral');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  const refreshData = () => {
    setScholarships(getScholarships());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setSelectedStudent(null);
    setStudentSearchQuery('');
    setType('Bolsa Mérito');
    setDiscountType('PERCENT');
    setDiscountValue('20');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setReason('');
    setPartnerInstitution('');
    setAuthorizer('Direção Geral');
    setNotes('');
    setActive(true);
    setShowModal(true);
  };

  const openEditModal = (item: Scholarship) => {
    setEditingId(item.id);
    setSelectedStudent({ id: item.studentId, name: item.studentName, enrollment: item.enrollment });
    setStudentSearchQuery(item.studentName);
    setType(item.type);
    setDiscountType(item.discountType);
    setDiscountValue(item.discountValue.toString());
    setStartDate(item.startDate);
    setEndDate(item.endDate || '');
    setReason(item.reason);
    setPartnerInstitution(item.partnerInstitution || '');
    setAuthorizer(item.authorizer);
    setNotes(item.notes || '');
    setActive(item.active);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      alert('Selecione um aluno para vincular a bolsa.');
      return;
    }
    const val = parseFloat(discountValue.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      alert('Informe um valor de desconto válido.');
      return;
    }

    const item: Scholarship = {
      id: editingId || 'bolsa_' + Date.now(),
      studentId: selectedStudent.id,
      studentName: selectedStudent.name || selectedStudent.studentName,
      enrollment: selectedStudent.enrollment || 'ALU-00',
      type,
      discountType,
      discountValue: val,
      startDate,
      endDate: endDate || undefined,
      reason: reason.trim(),
      partnerInstitution: partnerInstitution.trim() || undefined,
      authorizer: authorizer.trim(),
      notes: notes.trim() || undefined,
      active
    };

    saveScholarship(item, currentUser);
    setShowModal(false);
    refreshData();
    alert('Bolsa salva! O desconto foi recalculado e aplicado a todas as parcelas pendentes do aluno.');
  };

  const filteredScholarships = scholarships.filter(s => 
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.enrollment.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.type.toLowerCase().includes(searchQuery.toLowerCase())
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
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-600" /> Gerenciamento de Bolsas & Descontos
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Concessão de bolsas de estudo, convênios de empresas e descontos especiais. Aplicação automática nas parcelas pendentes.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95 uppercase tracking-wide"
        >
          <PlusCircle className="h-4.5 w-4.5" /> Conceder Nova Bolsa
        </button>
      </div>

      {/* Table List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        
        <div className="relative max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por aluno, matrícula ou tipo..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Aluno Bolsista</th>
                <th className="p-3.5">Matrícula</th>
                <th className="p-3.5">Tipo de Bolsa</th>
                <th className="p-3.5 text-center">Desconto</th>
                <th className="p-3.5">Concedido Por</th>
                <th className="p-3.5">Início</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredScholarships.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Nenhuma bolsa concedida encontrada.
                  </td>
                </tr>
              ) : (
                filteredScholarships.map((bolsa) => (
                  <tr key={bolsa.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{bolsa.studentName}</td>
                    <td className="p-3.5 font-mono text-slate-500">{bolsa.enrollment}</td>
                    <td className="p-3.5 font-semibold text-indigo-600 dark:text-indigo-400">{bolsa.type}</td>
                    <td className="p-3.5 text-center font-mono font-black text-emerald-600">
                      {bolsa.discountValue}{bolsa.discountType === 'PERCENT' ? '%' : ' R$'}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">{bolsa.authorizer}</td>
                    <td className="p-3.5 font-mono text-slate-500">
                      {new Date(bolsa.startDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3.5 text-center">
                      {bolsa.active ? (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase">
                          Ativa
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full text-[10px] font-black uppercase">
                          Inativa
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => openEditModal(bolsa)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-[11px]"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {editingId ? 'Editar Concessão de Bolsa' : 'Conceder Nova Bolsa'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Student Search */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Aluno Beneficiário (*)</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => {
                      setStudentSearchQuery(e.target.value);
                      if (!e.target.value) setSelectedStudent(null);
                    }}
                    placeholder="Buscar aluno por nome ou matrícula..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  />

                  {studentSearchQuery && !selectedStudent && (
                    <div className="absolute left-0 right-0 top-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 divide-y divide-slate-100 dark:divide-slate-700 max-h-40 overflow-y-auto">
                      {filteredStudents(studentSearchQuery).map((st: any) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudent(st);
                            setStudentSearchQuery(st.name);
                          }}
                          className="w-full text-left p-2 hover:bg-blue-50 dark:hover:bg-slate-700 font-bold text-slate-800 dark:text-white"
                        >
                          {st.name} ({st.enrollment})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedStudent && (
                  <span className="text-[10px] font-bold text-emerald-600 block mt-1">
                    ✓ Aluno: {selectedStudent.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Tipo de Bolsa (*)</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="Bolsa Mérito Acadêmico">Bolsa Mérito Acadêmico</option>
                    <option value="Bolsa Desconto Família">Bolsa Desconto Família</option>
                    <option value="Bolsa Convênio Empresa">Bolsa Convênio Empresa</option>
                    <option value="Prouni / Governo">Prouni / Governo</option>
                    <option value="Desconto Especial Diretoria">Desconto Especial Diretoria</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Tipo Desc.</label>
                    <select
                      value={discountType}
                      onChange={(e: any) => setDiscountType(e.target.value)}
                      className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    >
                      <option value="PERCENT">% Porcentagem</option>
                      <option value="FIXED">R$ Fixo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Valor (*)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Data Início (*)</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Autorizador (*)</label>
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
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Empresa / Instituição Parceira (Opcional)</label>
                <input
                  type="text"
                  value={partnerInstitution}
                  onChange={(e) => setPartnerInstitution(e.target.value)}
                  placeholder="Ex: Prefeitura Municipal de Brasília..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Motivo / Justificativa da Concessão (*)</label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Aluno classificado em 1º lugar no processo seletivo..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md"
                >
                  Salvar e Aplicar Desconto
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { FinancialNote, FinancialNoteCategory } from '../../types/financeiro';
import { getFinancialNotes, addFinancialNote } from '../../services/financeiroStorage';
import { FileText, PlusCircle, Search, Filter, Calendar, User } from 'lucide-react';

interface FinancialNotesManagerProps {
  currentUser?: string;
  allStudentUsers?: any[];
}

export const FinancialNotesManager: React.FC<FinancialNotesManagerProps> = ({ 
  currentUser = 'Financeiro',
  allStudentUsers = []
}) => {
  const [notes, setNotes] = useState<FinancialNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [category, setCategory] = useState<FinancialNoteCategory>('RENEGOCIACAO');
  const [description, setDescription] = useState('');
  const [semester, setSemester] = useState('2026/1');

  const refreshData = () => {
    setNotes(getFinancialNotes());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      alert('Selecione um aluno para vincular a observação.');
      return;
    }

    addFinancialNote(
      selectedStudent.id || '1',
      selectedStudent.name || selectedStudent.studentName,
      selectedStudent.enrollment || 'ALU-00',
      category,
      description,
      currentUser,
      semester
    );

    setShowModal(false);
    setDescription('');
    setSelectedStudent(null);
    setStudentSearch('');
    refreshData();
  };

  const filteredNotes = notes.filter(n => {
    const matchesQuery = n.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         n.enrollment.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         n.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = !categoryFilter || n.category === categoryFilter;
    return matchesQuery && matchesCat;
  });

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
            <FileText className="h-5 w-5 text-blue-600" /> Observações & Ocorrências Financeiras
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Histórico auditado de acordos, renegociações, apontamentos de inadimplência e isenções dos alunos.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95 uppercase tracking-wide"
        >
          <PlusCircle className="h-4.5 w-4.5" /> Registrar Observação
        </button>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por aluno, texto ou matrícula..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="">Todas Categorias</option>
              <option value="RENEGOCIACAO">Renegociação</option>
              <option value="INADIMPLENCIA">Inadimplência</option>
              <option value="OCORRENCIA">Ocorrência</option>
              <option value="BOLSA">Bolsa</option>
              <option value="ISENCAO">Isenção</option>
              <option value="PROBLEMA_ADM">Problema Adm</option>
              <option value="GERAL">Geral</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Data / Hora</th>
                <th className="p-3.5">Aluno</th>
                <th className="p-3.5">Matrícula</th>
                <th className="p-3.5">Categoria</th>
                <th className="p-3.5">Detalhamento / Descrição</th>
                <th className="p-3.5">Registrado Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhuma observação financeira encontrada.
                  </td>
                </tr>
              ) : (
                filteredNotes.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all">
                    <td className="p-3.5 font-mono text-slate-500">
                      {new Date(n.date).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{n.studentName}</td>
                    <td className="p-3.5 font-mono text-slate-500">{n.enrollment}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-full text-[10px] font-black uppercase">
                        {n.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-800 dark:text-slate-200 font-normal">{n.description}</td>
                    <td className="p-3.5 font-semibold text-slate-600 dark:text-slate-400">{n.user}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Nova Observação Financeira
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Aluno (*)</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      if (!e.target.value) setSelectedStudent(null);
                    }}
                    placeholder="Buscar aluno por nome..."
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

                {selectedStudent && (
                  <span className="text-[10px] font-bold text-emerald-600 block mt-1">✓ {selectedStudent.name}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Categoria (*)</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="RENEGOCIACAO">Renegociação / Acordo</option>
                    <option value="INADIMPLENCIA">Inadimplência</option>
                    <option value="OCORRENCIA">Ocorrência Administrativa</option>
                    <option value="BOLSA">Bolsa / Desconto</option>
                    <option value="ISENCAO">Isenção / Abono</option>
                    <option value="PROBLEMA_ADM">Problema de Sistema/Banco</option>
                    <option value="GERAL">Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Semestre / Período</label>
                  <input
                    type="text"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Descrição Detalhada (*)</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Acordo firmado com o responsável para pagamento em 3 parcelas..."
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md"
                >
                  Salvar Observação
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

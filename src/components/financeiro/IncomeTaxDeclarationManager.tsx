import React, { useState, useEffect } from 'react';
import { getStudentPaidYearTotal } from '../../services/financeiroStorage';
import { FinancialPrintModal, FinancialPrintData } from './FinancialPrintModal';
import { FileCheck2, Printer, Search, Building2, UserCheck, Calendar } from 'lucide-react';

interface IncomeTaxDeclarationManagerProps {
  currentUser?: string;
  allStudentUsers?: any[];
}

export const IncomeTaxDeclarationManager: React.FC<IncomeTaxDeclarationManagerProps> = ({ 
  currentUser = 'Financeiro',
  allStudentUsers = []
}) => {
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [taxYear, setTaxYear] = useState('2025');

  const [declData, setDeclData] = useState<{ receipts: any[]; totalValue: number }>({ receipts: [], totalValue: 0 });
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    if (selectedStudent) {
      const data = getStudentPaidYearTotal(selectedStudent.id || selectedStudent.enrollment, parseInt(taxYear));
      setDeclData(data);
    }
  }, [selectedStudent, taxYear]);

  const filteredStudents = (query: string) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allStudentUsers.filter((s: any) => 
      s.name?.toLowerCase().includes(q) || 
      s.enrollment?.toLowerCase().includes(q)
    ).slice(0, 5);
  };

  const printPayload: FinancialPrintData = {
    type: 'IRPF_DECLARACAO',
    title: `Declaração para Imposto de Renda (IRPF ${taxYear}) - ${selectedStudent?.name || ''}`,
    subtitle: `Declaração de Quitação Anual de Débitos Educacionais (Lei nº 12.003/2009)`,
    user: currentUser,
    yearCalendar: parseInt(taxYear),
    studentInfo: {
      name: selectedStudent?.name || '',
      enrollment: selectedStudent?.enrollment || '',
      cpf: selectedStudent?.cpf || '000.000.000-00',
      responsibleName: selectedStudent?.responsibleName || selectedStudent?.name || '',
      responsibleCpf: selectedStudent?.responsibleCpf || selectedStudent?.cpf || '000.000.000-00'
    },
    irpfInstallments: declData.receipts.map(rc => ({
      competencia: `Competência ${new Date(rc.date).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}`,
      number: 1,
      totalInstallments: 1,
      paidDate: rc.date,
      receiptNumber: rc.receiptNumber,
      value: rc.totalValue
    }))
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls (Hidden on Print) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4 print:hidden">
        <div className="space-y-1">
          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-blue-600" /> Declaração para Imposto de Renda (IRPF)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Geração de comprovante e declaração de quitação anual de débitos educacionais para comprovante do IRPF.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-2">
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

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Ano-Calendário (*)</label>
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>

        {selectedStudent && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-600/30 cursor-pointer transition-all flex items-center gap-2"
            >
              <Printer className="h-4.5 w-4.5" /> Abrir / Imprimir Declaração IRPF
            </button>
          </div>
        )}
      </div>

      {/* Official Declaration Document Container */}
      {selectedStudent ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-6 shadow-sm max-w-4xl mx-auto print:shadow-none print:border-none print:p-0">
          
          {/* Institution Header */}
          <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-6 text-center space-y-1">
            <h1 className="text-xl font-black uppercase text-slate-900 dark:text-white tracking-wider">
              COLÉGIO OSWALDO CRUZ DE BRASÍLIA
            </h1>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              CNPJ: 00.123.456/0001-89 • Inscrição Estadual: 07.123.456/001-90
            </p>
            <p className="text-xs text-slate-500">
              SGA/SUL Quadra 915 Lote 68A - Asa Sul, Brasília - DF • CEP 70390-150
            </p>
          </div>

          <div className="text-center py-3">
            <h2 className="text-base font-black uppercase tracking-widest text-slate-900 dark:text-white underline">
              DECLARAÇÃO DE QUITAÇÃO ANUAL DE DÉBITOS EDUCACIONAIS
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-1">Para fins de comprovação junto à Secretaria da Receita Federal do Brasil (IRPF {taxYear})</p>
          </div>

          <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed space-y-4">
            <p className="indent-8 text-justify">
              Declaramos para os devidos fins de direito, e em conformidade com a <strong>Lei Federal nº 12.007/2009</strong>, que o(a) aluno(a) <strong>{selectedStudent.name}</strong>, inscrito(a) sob a Matrícula nº <strong>{selectedStudent.enrollment}</strong>, CPF nº <strong>{selectedStudent.cpf || '000.000.000-00'}</strong>, esteve regularmente matriculado(a) nesta instituição de ensino no ano-calendário de <strong>{taxYear}</strong>.
            </p>

            <p className="indent-8 text-justify">
              Atestamos que foram efetuados os pagamentos referentes às prestações dos serviços educacionais contratados conforme discriminado abaixo, totalizando o montante anual de <strong>R$ {declData.totalValue.toFixed(2)}</strong> (<em>{declData.totalValue > 0 ? 'valores devidamente quitados' : 'nenhum lançamento registrado no período'}</em>).
            </p>
          </div>

          {/* Table of Paid Items */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-500">
              Discriminação Analítica dos Pagamentos no Ano de {taxYear}
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Recibo nº</th>
                    <th className="p-3">Data Pagto</th>
                    <th className="p-3">Descrição da Parcela / Taxa</th>
                    <th className="p-3">Forma</th>
                    <th className="p-3 text-right">Valor Quitados (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {declData.receipts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        Nenhum pagamento registrado para este aluno no ano de {taxYear}.
                      </td>
                    </tr>
                  ) : (
                    declData.receipts.map(rc => (
                      <tr key={rc.receiptNumber}>
                        <td className="p-3 font-mono font-bold text-blue-600">{rc.receiptNumber}</td>
                        <td className="p-3 font-mono text-slate-500">
                          {new Date(rc.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{rc.description}</td>
                        <td className="p-3 font-mono text-slate-500">{rc.paymentMethod}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">R$ {rc.totalValue.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800 font-black text-xs">
                  <tr>
                    <td colSpan={4} className="p-3 uppercase text-right">Total Geral Pago no Ano de {taxYear}:</td>
                    <td className="p-3 text-right font-mono text-base text-emerald-600">R$ {declData.totalValue.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Date & Signatures */}
          <div className="pt-12 space-y-12">
            <div className="text-right text-xs font-medium text-slate-600">
              Brasília - DF, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
            </div>

            <div className="grid grid-cols-2 gap-8 text-center text-xs pt-8">
              <div className="border-t border-slate-300 dark:border-slate-700 pt-2">
                <p className="font-bold uppercase text-slate-900 dark:text-white">Departamento Financeiro</p>
                <p className="text-[10px] text-slate-400">Colégio Oswaldo Cruz</p>
              </div>
              <div className="border-t border-slate-300 dark:border-slate-700 pt-2">
                <p className="font-bold uppercase text-slate-900 dark:text-white">Direção Geral</p>
                <p className="text-[10px] text-slate-400">Carimbo e Assinatura</p>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-xs">
          Busque e selecione um aluno para gerar e visualizar a Declaração de Imposto de Renda.
        </div>
      )}

      {/* PRINT MODAL */}
      {showPrintModal && selectedStudent && (
        <FinancialPrintModal
          data={printPayload}
          onClose={() => setShowPrintModal(false)}
        />
      )}

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ConvenioBancario, Installment } from '../../types/financeiro';
import { getInstallments } from '../../services/financeiroStorage';
import { getConvenioBancario, reservarProximoNossoNumero } from '../../services/boletoStorage';
import { BoletoPrintView } from './BoletoPrintView';
import { ConvenioBancarioManager } from './ConvenioBancarioManager';
import { Search, FileText, Loader2, Settings } from 'lucide-react';

// ===========================================================================
//  EMITIR BOLETOS
//
//  Busca o aluno, escolhe a parcela em aberto, gera o boleto. Funciona
//  desde já pra ver o layout — só fica "de verdade" (registrável no banco)
//  quando o convênio estiver marcado como ativo em Configurar Convênio.
// ===========================================================================

interface Props {
  currentUser?: string;
  allStudentUsers?: any[];
}

export const BoletosManager: React.FC<Props> = ({ currentUser = 'Financeiro', allStudentUsers = [] }) => {
  const [aba, setAba] = useState<'EMITIR' | 'CONVENIO'>('EMITIR');
  const [convenio, setConvenio] = useState<ConvenioBancario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState('');
  const [alunoSelecionado, setAlunoSelecionado] = useState<any | null>(null);
  const [parcelasDoAluno, setParcelasDoAluno] = useState<Installment[]>([]);
  const [buscandoParcelas, setBuscandoParcelas] = useState(false);

  const [boletoAtual, setBoletoAtual] = useState<{ inst: Installment; nossoNumero: number } | null>(null);
  const [gerando, setGerando] = useState<string | null>(null);

  useEffect(() => {
    void getConvenioBancario().then(c => { setConvenio(c); setCarregando(false); });
  }, [aba]);

  const alunosFiltrados = busca.trim().length >= 2
    ? allStudentUsers.filter((u: any) =>
        u.name?.toLowerCase().includes(busca.toLowerCase()) || u.enrollment?.includes(busca)
      ).slice(0, 8)
    : [];

  const handleSelecionarAluno = async (aluno: any) => {
    setAlunoSelecionado(aluno);
    setBusca('');
    setBuscandoParcelas(true);
    try {
      const todas = await getInstallments();
      setParcelasDoAluno(
        todas.filter(p => (p.studentId === aluno.id || p.enrollment === aluno.enrollment) && (p.status === 'PENDENTE' || p.status === 'ATRASADA'))
      );
    } finally {
      setBuscandoParcelas(false);
    }
  };

  const handleGerarBoleto = async (inst: Installment) => {
    setGerando(inst.id);
    try {
      const nossoNumero = await reservarProximoNossoNumero(currentUser);
      if (nossoNumero == null) {
        alert('Configure o convênio bancário primeiro, na aba "Configurar Convênio".');
        return;
      }
      setBoletoAtual({ inst, nossoNumero });
    } finally {
      setGerando(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setAba('EMITIR')}
          className={`pb-2 px-1 text-xs font-black uppercase tracking-wide border-b-2 ${aba === 'EMITIR' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
        >
          Emitir Boleto
        </button>
        <button
          onClick={() => setAba('CONVENIO')}
          className={`pb-2 px-1 text-xs font-black uppercase tracking-wide border-b-2 flex items-center gap-1.5 ${aba === 'CONVENIO' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
        >
          <Settings className="h-3.5 w-3.5" /> Configurar Convênio
        </button>
      </div>

      {aba === 'CONVENIO' && <ConvenioBancarioManager currentUser={currentUser} />}

      {aba === 'EMITIR' && (
        carregando ? (
          <div className="flex items-center gap-2 text-slate-400 py-10 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>
        ) : !convenio ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl text-center space-y-3">
            <p className="font-bold text-slate-600 dark:text-slate-300">Nenhum convênio bancário configurado ainda.</p>
            <button onClick={() => setAba('CONVENIO')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs uppercase">
              Configurar agora
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4">
            {!convenio.ativo && (
              <p className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
                Convênio ainda não está ativo — os boletos gerados aqui saem marcados como rascunho.
              </p>
            )}

            <div className="relative">
              <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Buscar aluno (nome ou matrícula)</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Digite ao menos 2 letras..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs"
                />
              </div>
              {alunosFiltrados.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                  {alunosFiltrados.map((a: any) => (
                    <button
                      key={a.id}
                      onClick={() => handleSelecionarAluno(a)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-slate-800 flex justify-between"
                    >
                      <span className="font-bold">{a.name}</span>
                      <span className="text-slate-400">{a.enrollment}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {alunoSelecionado && (
              <div className="p-3 bg-blue-50 dark:bg-slate-800 rounded-xl font-bold text-blue-700 dark:text-blue-300 text-xs">
                ✓ {alunoSelecionado.name} (Matrícula: {alunoSelecionado.enrollment})
              </div>
            )}

            {buscandoParcelas ? (
              <p className="flex items-center gap-2 text-slate-400 text-xs"><Loader2 className="h-4 w-4 animate-spin" /> Buscando parcelas…</p>
            ) : alunoSelecionado && (
              parcelasDoAluno.length === 0 ? (
                <p className="text-xs text-slate-400">Esse aluno não tem parcelas em aberto.</p>
              ) : (
                <div className="space-y-2">
                  {parcelasDoAluno.sort((a, b) => a.number - b.number).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                      <div>
                        <span className="font-bold">Parcela {p.number}/{p.totalInstallments}</span>
                        <span className="text-slate-400 ml-2">{p.competencia} — vence {new Date(p.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold">R$ {(p.originalValue - p.discountValue).toFixed(2)}</span>
                        <button
                          onClick={() => handleGerarBoleto(p)}
                          disabled={gerando === p.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-extrabold rounded-lg text-[11px]"
                        >
                          <FileText className="h-3.5 w-3.5" /> {gerando === p.id ? 'Gerando…' : 'Gerar Boleto'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )
      )}

      {boletoAtual && convenio && (
        <BoletoPrintView
          installment={boletoAtual.inst}
          convenio={convenio}
          nossoNumero={boletoAtual.nossoNumero}
          sacadoNome={alunoSelecionado?.name || boletoAtual.inst.studentName}
          sacadoCpf={alunoSelecionado?.cpf}
          onClose={() => setBoletoAtual(null)}
        />
      )}
    </div>
  );
};

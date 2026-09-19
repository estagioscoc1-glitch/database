import React, { useState, useEffect } from 'react';
import { getInstallments } from '../services/financeiroStorage';
import { listarRegularizacoesDoAluno, RegistroRegularizacao, seguroAindaValido } from '../services/regularizacaoStorage';
import { Installment } from '../types/financeiro';
import { CheckCircle2, XCircle, Loader2, Wallet } from 'lucide-react';

// ===========================================================================
//  ABA FINANCEIRO — área do aluno
//
//  Simples de propósito: verde = pago, vermelho = pendente, sem valor
//  nenhum nos itens vindos de regularização retroativa (só o financeiro
//  normal mostra valor, do jeito que já mostrava antes).
// ===========================================================================

interface Props {
  alunoId: string;
  modulo?: number | string;
}

export const AlunoFinanceiroTab: React.FC<Props> = ({ alunoId, modulo }) => {
  const [parcelas, setParcelas] = useState<Installment[]>([]);
  const [regularizacoes, setRegularizacoes] = useState<RegistroRegularizacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    Promise.all([getInstallments(), listarRegularizacoesDoAluno(alunoId)]).then(([todas, reg]) => {
      if (cancelado) return;
      setParcelas(todas.filter(p => p.studentId === alunoId));
      setRegularizacoes(reg);
      setCarregando(false);
    });
    return () => { cancelado = true; };
  }, [alunoId]);

  if (carregando) {
    return <div className="flex items-center gap-2 text-slate-400 py-10 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>;
  }

  // Junta parcelas do financeiro normal + regularização retroativa numa
  // única linha do tempo, por número — a retroativa só entra se não
  // existir a mesma parcela já lançada no financeiro normal (evita
  // duplicar visualmente a mesma parcela vinda de dois lugares).
  const numerosDoFinanceiroNormal = new Set(parcelas.map(p => p.number));
  const parcelasRetroativas = regularizacoes.filter(r => r.tipo === 'PARCELA' && !numerosDoFinanceiroNormal.has(r.numeroParcela ?? -1));

  const linhasParcelas = [
    ...parcelas.map(p => ({
      numero: p.number, pago: p.status === 'PAGA' || p.status === 'ABONADA',
      origemRetroativa: false, competencia: p.competencia,
    })),
    ...parcelasRetroativas.map(r => ({
      numero: r.numeroParcela ?? 0, pago: r.status === 'PAGO',
      origemRetroativa: true, competencia: r.competencia,
    })),
  ].sort((a, b) => a.numero - b.numero);

  const proximasPendentes = linhasParcelas.filter(l => !l.pago).slice(0, 3);

  const itemExtra = (tipo: 'SEGURO' | 'KIT' | 'JALECO') => regularizacoes.find(r => r.tipo === tipo);

  const ItemStatus: React.FC<{ pago: boolean; label: string; sub?: string }> = ({ pago, label, sub }) => (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${
      pago ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
           : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
    }`}>
      <div>
        <p className={`font-bold text-sm ${pago ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{label}</p>
        {sub && <p className="text-[11px] text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
      {pago ? <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" /> : <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />}
    </div>
  );

  const seguro = itemExtra('SEGURO');
  const kit = itemExtra('KIT');
  const jaleco = itemExtra('JALECO');

  return (
    <div className="space-y-5">
      {modulo && (
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5" /> Módulo {modulo}
        </p>
      )}

      <div>
        <h4 className="text-xs font-black uppercase text-slate-500 mb-2">Mensalidades</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {linhasParcelas.map((l, i) => (
            <div key={i} className={`text-center p-2.5 rounded-xl border ${
              l.pago ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                     : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
            }`}>
              <p className="font-black text-sm">{l.numero}ª</p>
              <p className="text-[10px] font-bold uppercase">{l.pago ? 'Paga' : 'Pendente'}</p>
            </div>
          ))}
          {linhasParcelas.length === 0 && <p className="text-xs text-slate-400 col-span-full">Nenhuma parcela lançada ainda.</p>}
        </div>
      </div>

      {proximasPendentes.length > 0 && (
        <div>
          <h4 className="text-xs font-black uppercase text-slate-500 mb-2">Próximas Parcelas</h4>
          <div className="flex flex-wrap gap-2">
            {proximasPendentes.map((l, i) => (
              <span key={i} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold">
                {l.numero}ª — {l.competencia || 'a definir'}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-black uppercase text-slate-500 mb-2">Outros Pagamentos</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <ItemStatus pago={!!seguro && seguro.status === 'PAGO'} label="Seguro"
            sub={seguro?.status === 'PAGO' && seguro.dataPagamento ? `Pago em ${new Date(seguro.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}` : undefined} />
          <ItemStatus pago={!!kit && kit.status === 'PAGO'} label="Kit" />
          <ItemStatus pago={!!jaleco && jaleco.status === 'PAGO'} label="Jaleco" />
        </div>
      </div>
    </div>
  );
};

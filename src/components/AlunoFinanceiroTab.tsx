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
  // única linha do tempo.
  //
  // BUG REAL corrigido aqui: o financeiro normal numera as parcelas dele
  // sempre a partir de "1" (não sabe que já existiam parcelas antigas
  // antes) — então um aluno do Módulo 2, com 6 parcelas retroativas
  // (1 a 6) e a mensalidade atual gerada pelo sistema novo, tinha a
  // mensalidade atual TAMBÉM numerada como "1", duplicando na tela. A
  // correção: desloca a numeração do financeiro normal pelo tanto de
  // parcelas retroativas que já existem, pra virar uma sequência contínua
  // (retroativas 1–6, financeiro normal 7, 8, 9...).
  const numerosRetroativosBrutos = regularizacoes.filter(r => r.tipo === 'PARCELA').map(r => r.numeroParcela ?? 0);
  const deslocamento = numerosRetroativosBrutos.length > 0 ? Math.max(...numerosRetroativosBrutos) : 0;

  const maiorNumero = Math.max(
    18,
    deslocamento,
    ...parcelas.map(p => deslocamento + (p.totalInstallments || p.number || 0))
  );

  const numerosReaisPorNumeroDeslocado = new Map(parcelas.map(p => [deslocamento + p.number, p]));
  const numerosRetroativosPorNumero = new Map(
    regularizacoes.filter(r => r.tipo === 'PARCELA' && r.numeroParcela != null).map(r => [r.numeroParcela as number, r])
  );

  const linhasParcelas: { numero: number; pago: boolean; competencia?: string | null }[] = [];
  for (let n = 1; n <= maiorNumero; n++) {
    if (n <= deslocamento) {
      const retro = numerosRetroativosPorNumero.get(n);
      linhasParcelas.push({ numero: n, pago: retro?.status === 'PAGO', competencia: retro?.competencia });
    } else {
      const real = numerosReaisPorNumeroDeslocado.get(n);
      linhasParcelas.push({ numero: n, pago: real ? (real.status === 'PAGA' || real.status === 'ABONADA') : false, competencia: real?.competencia });
    }
  }

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
  // Jaleco não aparece pro aluno (a pedido) — continua sendo controlado
  // pela administração em Editar Regularizações, só não é mostrado aqui.

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ItemStatus pago={!!seguro && seguro.status === 'PAGO'} label="Seguro"
            sub={seguro?.status === 'PAGO' && seguro.dataPagamento ? `Pago em ${new Date(seguro.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}` : undefined} />
          <ItemStatus pago={!!kit && kit.status === 'PAGO'} label="Kit" />
        </div>
      </div>
    </div>
  );
};

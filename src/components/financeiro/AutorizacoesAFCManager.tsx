import React, { useState, useEffect } from 'react';
import { MiscPaymentCatalog, MiscIncome } from '../../types/financeiro';
import { getMiscPaymentCatalog, getMiscIncomes } from '../../services/financeiroStorage';
import { AutorizacaoAFCPrintView } from './AutorizacaoAFCPrintView';
import { Search, FileCheck2, Printer, Loader2 } from 'lucide-react';

// ===========================================================================
//  AUTORIZAÇÕES AFC
//
//  Como funciona, do jeito que LG pediu: a direção escolhe QUAL cobrança do
//  catálogo de Pagamentos Diversos representa a autorização (ex.: "Segunda
//  Chamada A.F.C"), o sistema busca todo aluno que já pagou (ou teve
//  abonada) essa cobrança específica, e gera duas coisas pra imprimir:
//
//  1) Uma folha com 12 autorizações pequenas, uma por aluno pago, prontas
//     pra recortar e entregar.
//  2) Uma lista de assinatura com os mesmos alunos, pra eles assinarem
//     confirmando a presença na AFC.
//
//  DE ONDE VEM CADA ALUNO: casa o nome da cobrança paga (MiscIncome.chargeName)
//  com o nome exato do item escolhido no catálogo. Como o campo "Nome da
//  Cobrança" ainda pode ser editado à mão na hora de receber (em Entradas),
//  um nome digitado diferente do catálogo não vai casar — por isso a tela
//  mostra quantos foram encontrados antes de gerar, pra conferir.
// ===========================================================================

interface Props {
  allStudentUsers?: any[];
  courses?: any[];
  classes?: any[];
}

interface AlunoAutorizado {
  studentId: string;
  studentName: string;
  enrollment: string;
  courseName: string;
  className: string;
  paidAt: string;
}

export const AutorizacoesAFCManager: React.FC<Props> = ({
  allStudentUsers = [],
  courses = [],
  classes = [],
}) => {
  const [catalogo, setCatalogo] = useState<MiscPaymentCatalog[]>([]);
  const [catalogoId, setCatalogoId] = useState('');
  const [tituloAutorizacao, setTituloAutorizacao] = useState('Autorizado(a) a realizar a Segunda Chamada A.F.C.');
  const [buscando, setBuscando] = useState(false);
  const [alunos, setAlunos] = useState<AlunoAutorizado[] | null>(null);
  const [mostrarImpressao, setMostrarImpressao] = useState(false);

  useEffect(() => {
    void getMiscPaymentCatalog().then(lista => setCatalogo(lista.filter(c => c.active)));
  }, []);

  const itemEscolhido = catalogo.find(c => c.id === catalogoId);

  const handleBuscar = async () => {
    if (!itemEscolhido) {
      alert('Escolha qual pagamento do catálogo representa essa autorização.');
      return;
    }
    setBuscando(true);
    setAlunos(null);
    try {
      const todasEntradas = await getMiscIncomes();
      const nomeAlvo = itemEscolhido.name.trim().toLowerCase();
      const pagos = todasEntradas.filter(
        m => m.chargeName.trim().toLowerCase() === nomeAlvo && (m.status === 'PAGO' || m.status === 'ABONADO')
      );

      const encontrados: AlunoAutorizado[] = pagos.map((m: MiscIncome) => {
        const aluno = allStudentUsers.find((u: any) => u.id === m.studentId || u.enrollment === m.enrollment);
        const turma = aluno ? classes.find((c: any) => c.id === aluno.classId) : undefined;
        const curso = turma ? courses.find((c: any) => c.id === turma.courseId) : undefined;
        return {
          studentId: m.studentId,
          studentName: m.studentName,
          enrollment: m.enrollment,
          courseName: curso?.name || '—',
          className: turma?.name || '—',
          paidAt: m.paidAt,
        };
      });

      setAlunos(encontrados);
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-6 shadow-sm">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Autorizações AFC
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Escolha qual cobrança do catálogo dá direito à autorização. O sistema busca quem já pagou (ou teve abonado)
            e gera as autorizações prontas pra imprimir, mais a lista de assinatura.
          </p>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
              Qual pagamento dá direito a essa autorização? (*)
            </label>
            <select
              value={catalogoId}
              onChange={(e) => { setCatalogoId(e.target.value); setAlunos(null); }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione o item do catálogo de Pagamentos Diversos...</option>
              {catalogo.map(c => (
                <option key={c.id} value={c.id}>{c.name} (R$ {c.defaultValue.toFixed(2)})</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Se o item não existir ainda, cadastre-o antes em Financeiro → Pagamentos Diversos.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
              Texto da autorização (aparece em cada cartãozinho)
            </label>
            <input
              type="text"
              value={tituloAutorizacao}
              onChange={(e) => setTituloAutorizacao(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
            />
          </div>

          <button
            type="button"
            onClick={handleBuscar}
            disabled={buscando || !catalogoId}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white font-extrabold rounded-xl text-xs uppercase tracking-wide"
          >
            {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {buscando ? 'Buscando…' : 'Buscar alunos que pagaram'}
          </button>

          {alunos !== null && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-3">
              <p className="font-extrabold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4" /> {alunos.length} aluno(s) encontrado(s) para "{itemEscolhido?.name}".
              </p>
              {alunos.length > 0 ? (
                <>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-blue-100 dark:border-blue-900 bg-white dark:bg-slate-900">
                    {alunos.map((a, i) => (
                      <div key={i} className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0 flex justify-between">
                        <span className="font-bold">{a.studentName}</span>
                        <span className="text-slate-400">{a.className}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMostrarImpressao(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-600/30 uppercase tracking-wide"
                  >
                    <Printer className="h-4 w-4" /> Gerar Autorizações + Lista de Assinatura
                  </button>
                </>
              ) : (
                <p className="text-[11px] text-blue-700 dark:text-blue-400">
                  Nenhum aluno pagou esse item ainda (ou o nome da cobrança lançada em Entradas ficou diferente do
                  cadastrado no catálogo — confira em Pagamentos Diversos).
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {mostrarImpressao && alunos && itemEscolhido && (
        <AutorizacaoAFCPrintView
          alunos={alunos}
          tituloAutorizacao={tituloAutorizacao}
          nomeCobranca={itemEscolhido.name}
          onClose={() => setMostrarImpressao(false)}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { Installment } from '../../types/financeiro';
import { getInstallments } from '../../services/financeiroStorage';
import { AutorizacaoAFCPrintView } from './AutorizacaoAFCPrintView';
import { Search, FileCheck2, Printer, Loader2 } from 'lucide-react';

// ===========================================================================
//  AUTORIZAÇÕES AFC
//
//  Regra de verdade (LG explicou depois de eu ter feito a 1ª versão errada,
//  em cima de "Pagamentos Diversos" — não é isso):
//
//  A liberação é por MENSALIDADE, não por taxa avulsa. Pra cada módulo do
//  curso (1, 2, 3...), a direção escolhe até qual número de parcela o aluno
//  precisa ter PAGO pra estar autorizado — ex.: "Módulo 1 libera com as
//  parcelas pagas até a 4ª". Alunos em DEPENDÊNCIA (recuperando disciplina
//  de outro módulo) têm o próprio limite, separado, porque a parcela deles
//  é de outro lançamento (gerado por saveDependency, className começando
//  com "Dependência:").
//
//  DE ONDE VEM módulo/Dependência de cada aluno: da turma dele (classId →
//  classes[].module e classes[].isDependency) — já existe no cadastro,
//  não precisou inventar campo novo.
//
//  "Pagou até a parcela N" = as parcelas de número 1 a N (Installment.number)
//  estão TODAS com status PAGA — não é só ter pago exatamente a Nª.
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
  const [todasParcelas, setTodasParcelas] = useState<Installment[]>([]);
  const [carregandoParcelas, setCarregandoParcelas] = useState(true);

  // módulos regulares existentes nas turmas cadastradas (sem contar Dependência)
  const modulosExistentes = useMemo(() => {
    const set = new Set<number>();
    classes.forEach((c: any) => { if (!c.isDependency && c.module) set.add(c.module); });
    return Array.from(set).sort((a, b) => a - b);
  }, [classes]);

  const [limitePorModulo, setLimitePorModulo] = useState<Record<number, string>>({});
  const [limiteDependencia, setLimiteDependencia] = useState('1');
  const [buscando, setBuscando] = useState(false);
  const [alunos, setAlunos] = useState<AlunoAutorizado[] | null>(null);
  const [mostrarImpressao, setMostrarImpressao] = useState(false);
  const [tituloAutorizacao, setTituloAutorizacao] = useState('Autorizado(a) a realizar a Segunda Chamada A.F.C.');

  useEffect(() => {
    void getInstallments().then(lista => {
      setTodasParcelas(lista);
      setCarregandoParcelas(false);
    });
  }, []);

  const handleBuscar = () => {
    setBuscando(true);
    setAlunos(null);

    try {
      const encontrados: AlunoAutorizado[] = [];

      allStudentUsers.forEach((aluno: any) => {
        const turma = classes.find((c: any) => c.id === aluno.classId);
        if (!turma) return;

        const ehDependencia = !!turma.isDependency;
        const limiteTxt = ehDependencia ? limiteDependencia : limitePorModulo[turma.module];
        const limite = parseInt(limiteTxt, 10);
        if (!limite || limite <= 0) return; // módulo/Dependência sem limite configurado = não entra na busca

        const parcelasDoAluno = todasParcelas.filter(
          p => (p.studentId === aluno.id || p.enrollment === aluno.enrollment) && p.classId === turma.id
        );
        if (parcelasDoAluno.length === 0) return;

        // Precisa ter TODAS as parcelas de 1 até "limite" pagas — não só a última.
        let liberado = true;
        let ultimoPagamento = '';
        for (let n = 1; n <= limite; n++) {
          const parcela = parcelasDoAluno.find(p => p.number === n);
          if (!parcela || parcela.status !== 'PAGA') { liberado = false; break; }
          if (parcela.paidAt) ultimoPagamento = parcela.paidAt;
        }
        if (!liberado) return;

        const curso = courses.find((c: any) => c.id === turma.courseId);
        encontrados.push({
          studentId: aluno.id,
          studentName: aluno.name,
          enrollment: aluno.enrollment || '—',
          courseName: curso?.name || '—',
          className: ehDependencia ? `${turma.name} (Dependência)` : turma.name,
          paidAt: ultimoPagamento,
        });
      });

      setAlunos(encontrados);
    } finally {
      setBuscando(false);
    }
  };

  const algumLimiteConfigurado = modulosExistentes.some(m => Number(limitePorModulo[m]) > 0) || Number(limiteDependencia) > 0;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-6 shadow-sm">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Autorizações AFC
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Defina até qual parcela paga libera a autorização, por módulo (e para Dependência separadamente).
            Só entram alunos com TODAS as parcelas, da 1ª até esse número, já pagas.
          </p>
        </div>

        <div className="space-y-4 text-xs">
          {carregandoParcelas ? (
            <p className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Carregando parcelas do Financeiro…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {modulosExistentes.map(m => (
                  <div key={m}>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                      Módulo {m} — libera até a parcela nº
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={limitePorModulo[m] ?? ''}
                      onChange={(e) => { setLimitePorModulo(prev => ({ ...prev, [m]: e.target.value })); setAlunos(null); }}
                      placeholder="Vazio = não libera"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-amber-600 mb-1">
                    Dependência — libera até a parcela nº
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={limiteDependencia}
                    onChange={(e) => { setLimiteDependencia(e.target.value); setAlunos(null); }}
                    placeholder="Vazio = não libera"
                    className="w-full px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl font-bold focus:ring-2 focus:ring-amber-500"
                  />
                </div>
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
                disabled={buscando || !algumLimiteConfigurado}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white font-extrabold rounded-xl text-xs uppercase tracking-wide"
              >
                {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {buscando ? 'Buscando…' : 'Buscar alunos autorizados'}
              </button>
            </>
          )}

          {alunos !== null && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-3">
              <p className="font-extrabold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4" /> {alunos.length} aluno(s) autorizado(s).
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
                  Nenhum aluno com todas as parcelas em dia até o limite configurado ainda.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {mostrarImpressao && alunos && (
        <AutorizacaoAFCPrintView
          alunos={alunos}
          tituloAutorizacao={tituloAutorizacao}
          nomeCobranca="Mensalidades em dia"
          onClose={() => setMostrarImpressao(false)}
        />
      )}
    </div>
  );
};

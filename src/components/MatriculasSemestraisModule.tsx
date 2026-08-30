import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { Search, Layers, UserPlus, Users2, Sparkles, Briefcase, Building2 } from 'lucide-react';

// MATRÍCULAS SEMESTRAIS — clica em Pesquisar e mostra, do período letivo
// ativo: quantos alunos são novos, quantos são veteranos, quebra por sala,
// quantas dependências e quantos estágios, e o total geral. Tudo lido de
// dados que já existem — não cria matrícula nenhuma nova aqui.
export const MatriculasSemestraisModule: React.FC = () => {
  const { users, classes, grades, dependencies, internships, currentPeriod } = useApp();
  const [pesquisado, setPesquisado] = useState(false);

  const resultado = React.useMemo(() => {
    if (!pesquisado) return null;

    const [yearStr, semStr] = currentPeriod.split('/');
    const anoAtivo = Number(yearStr);
    const semestreAtivo = Number(semStr);

    // Turmas do período ativo (sem contar as de dependência, que são
    // contadas à parte).
    const turmasDoPeriodo = classes.filter(c =>
      c.year === anoAtivo && c.semester === semestreAtivo && !c.isDependency
    );
    const idsTurmasDoPeriodo = new Set(turmasDoPeriodo.map(c => c.id));

    // Um aluno "está matriculado" numa turma do período se tem nota
    // lançada nela OU se essa é a turma atual da ficha dele.
    const alunoIdsPorTurma = new Map<string, Set<string>>();
    for (const t of turmasDoPeriodo) alunoIdsPorTurma.set(t.id, new Set());

    for (const g of grades) {
      if (idsTurmasDoPeriodo.has(g.classId)) {
        alunoIdsPorTurma.get(g.classId)!.add(g.studentId);
      }
    }
    for (const u of users) {
      if (u.role === UserRole.STUDENT && u.classId && idsTurmasDoPeriodo.has(u.classId)) {
        alunoIdsPorTurma.get(u.classId)!.add(u.id);
      }
    }

    // Novo x Veterano: veterano é quem já tem nota lançada em alguma turma
    // de um período ANTERIOR (ano/semestre menor); novo é quem só aparece
    // agora, pela primeira vez.
    const todosOsAlunoIds = new Set<string>();
    for (const set of alunoIdsPorTurma.values()) for (const id of set) todosOsAlunoIds.add(id);

    const temHistoricoAnterior = (alunoId: string): boolean => {
      return grades.some(g => {
        if (g.studentId !== alunoId) return false;
        const turma = classes.find(c => c.id === g.classId);
        if (!turma) return false;
        return turma.year < anoAtivo || (turma.year === anoAtivo && turma.semester < semestreAtivo);
      });
    };

    let novos = 0;
    let veteranos = 0;
    for (const id of todosOsAlunoIds) {
      if (temHistoricoAnterior(id)) veteranos++;
      else novos++;
    }

    const porSala = turmasDoPeriodo
      .map(t => ({
        turma: t,
        quantidade: alunoIdsPorTurma.get(t.id)?.size ?? 0,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);

    // Dependências ativas no período (mesmo semestre do período ativo).
    const dependenciasDoPeriodo = (dependencies || []).filter(d =>
      d.semester === semestreAtivo && d.status === 'ATIVO'
    );

    // Estágios: não tem campo de período próprio — mostra o total geral de
    // componentes lançados (não dá pra filtrar só o semestre atual com o
    // dado disponível hoje).
    const totalEstagios = (internships || []).length;

    return {
      periodo: currentPeriod,
      novos,
      veteranos,
      total: todosOsAlunoIds.size,
      porSala,
      totalDependencias: dependenciasDoPeriodo.length,
      totalEstagios,
    };
  }, [pesquisado, users, classes, grades, dependencies, internships, currentPeriod]);

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Layers className="h-5 w-5" />
            <div>
              <h3 className="font-black text-sm">Matrículas Semestrais</h3>
              <p className="text-[11px] text-slate-500">Período letivo ativo: <strong>{currentPeriod}</strong></p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPesquisado(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all"
          >
            <Search className="h-4 w-4" /> Pesquisar
          </button>
        </div>
      </div>

      {!resultado ? (
        <div className="flex flex-col items-center justify-center p-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center">
          <Layers className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-sm font-bold text-slate-500">Clica em "Pesquisar" pra ver o resumo do período letivo ativo.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* CARTÕES DE RESUMO */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
                <UserPlus className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase">Novas</span>
              </div>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{resultado.novos}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/40">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1">
                <Users2 className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase">Veteranos</span>
              </div>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{resultado.veteranos}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/40">
              <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase">Dependências</span>
              </div>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{resultado.totalDependencias}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 mb-1">
                <Briefcase className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase">Estágios</span>
              </div>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{resultado.totalEstagios}</p>
            </div>
            <div className="bg-slate-800 dark:bg-slate-950 p-4 rounded-2xl border border-slate-700">
              <div className="flex items-center gap-1.5 text-slate-300 mb-1">
                <Layers className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase">Total</span>
              </div>
              <p className="text-2xl font-black text-white">{resultado.total}</p>
            </div>
          </div>

          {/* POR SALA */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="flex items-center gap-2 font-black text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              <Building2 className="h-4 w-4 text-blue-600" /> Por Sala
            </h4>
            {resultado.porSala.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhuma turma encontrada pro período {resultado.periodo}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left font-bold py-2 pr-3">Turma</th>
                      <th className="text-left font-bold py-2 pr-3">Módulo</th>
                      <th className="text-left font-bold py-2 pr-3">Turno</th>
                      <th className="text-right font-bold py-2">Alunos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.porSala.map(({ turma, quantidade }) => (
                      <tr key={turma.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                        <td className="py-2 pr-3 font-bold text-slate-800 dark:text-slate-200">{turma.name} {turma.code ? `(${turma.code})` : ''}</td>
                        <td className="py-2 pr-3">{turma.module}º</td>
                        <td className="py-2 pr-3">{turma.shift}</td>
                        <td className="py-2 text-right font-mono font-black text-blue-700 dark:text-blue-400">{quantidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

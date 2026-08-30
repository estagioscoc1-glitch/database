import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { Search, History, GraduationCap, Sparkles, Briefcase, Calendar } from 'lucide-react';

// HISTÓRICO DE MATRÍCULAS — busca o aluno e mostra, numa tela só: os
// semestres/salas em que ele foi matriculado, as dependências que já
// cursou/está cursando, e os componentes de estágio (Secretaria de
// Estágios). Tudo lido de dados que já existem e já são reais — nenhum
// dado novo é criado aqui, essa tela só organiza o que já está espalhado.
export const HistoricoMatriculasModule: React.FC = () => {
  const { users, classes, grades, dependencies, internships, subjects, currentPeriod, marcarDesistenteNaTurma, marcarStatusDependenciaContexto, mostrarAviso } = useApp();
  const [confirmandoCancelamentoTurma, setConfirmandoCancelamentoTurma] = useState(false);
  const [confirmandoCancelamentoDepId, setConfirmandoCancelamentoDepId] = useState('');
  const [busca, setBusca] = useState('');
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState('');

  const resultadosBusca = busca.trim().length >= 2
    ? users.filter(u =>
        u.role === UserRole.STUDENT &&
        ((u.name || '').toLowerCase().includes(busca.toLowerCase()) ||
         (u.enrollment || '').toLowerCase().includes(busca.toLowerCase()))
      )
    : [];

  const aluno = users.find(u => u.id === alunoSelecionadoId);

  // Semestres/salas — pega todas as turmas em que o aluno tem alguma nota
  // lançada (cada turma = uma "matrícula" num módulo/semestre), mais a
  // turma atual dele mesmo que ainda não tenha nota nenhuma lançada.
  const turmasDoAluno = React.useMemo(() => {
    if (!aluno) return [];
    const idsDasNotas = new Set(grades.filter(g => g.studentId === aluno.id).map(g => g.classId));
    if (aluno.classId) idsDasNotas.add(aluno.classId);
    const turmas = classes.filter(c => idsDasNotas.has(c.id) && !c.isDependency);
    return turmas.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.semester !== b.semester) return b.semester - a.semester;
      return b.module - a.module;
    });
  }, [aluno, grades, classes]);

  const dependenciasDoAluno = React.useMemo(() => {
    if (!aluno) return [];
    return (dependencies || [])
      .filter(d => d.studentId === aluno.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [aluno, dependencies]);

  const estagiosDoAluno = React.useMemo(() => {
    if (!aluno) return [];
    return (internships || []).filter(i => i.studentId === aluno.id);
  }, [aluno, internships]);

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-blue-700 dark:text-blue-400">
          <History className="h-5 w-5" />
          <h3 className="font-black text-sm">Histórico de Matrículas</h3>
        </div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
          Buscar Aluno (Nome ou Matrícula)
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setAlunoSelecionadoId(''); }}
            placeholder="Digite o nome ou a matrícula do aluno..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm text-slate-800 dark:text-white"
          />
        </div>

        {resultadosBusca.length > 0 && !alunoSelecionadoId && (
          <div className="mt-2 border border-slate-150 dark:border-slate-800 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
            {resultadosBusca.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => { setAlunoSelecionadoId(u.id); setBusca(u.name); setConfirmandoCancelamentoTurma(false); setConfirmandoCancelamentoDepId(''); }}
                className="w-full text-left p-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-xs transition-all"
              >
                <span className="font-bold text-slate-800 dark:text-slate-200">{u.name}</span>
                <span className="text-[10px] text-slate-400 font-mono ml-2">Matrícula: {u.enrollment || 'N/A'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!aluno ? (
        <div className="flex flex-col items-center justify-center p-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center">
          <History className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-sm font-bold text-slate-500">Busque um aluno pra ver o histórico completo de matrículas.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-blue-50/60 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-150 dark:border-blue-900/30">
            <p className="font-black text-sm text-slate-800 dark:text-white">{aluno.name}</p>
            <p className="text-[11px] text-slate-500 font-mono">Matrícula: {aluno.enrollment || 'N/A'}</p>
          </div>

          {/* SEMESTRES / SALAS */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="flex items-center gap-2 font-black text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              <GraduationCap className="h-4 w-4 text-blue-600" /> Semestres e Salas ({turmasDoAluno.length})
            </h4>
            {turmasDoAluno.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhuma matrícula em turma encontrada pra este aluno.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left font-bold py-2 pr-3">Ano/Semestre</th>
                      <th className="text-left font-bold py-2 pr-3">Módulo</th>
                      <th className="text-left font-bold py-2 pr-3">Turma</th>
                      <th className="text-left font-bold py-2">Turno</th>
                      <th className="text-right font-bold py-2">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turmasDoAluno.map(t => {
                      const ehPeriodoAtual = `${t.year}/${t.semester}` === currentPeriod;
                      const notaDessaTurma = grades.find(g => g.studentId === aluno!.id && g.classId === t.id);
                      const jaDesistente = notaDessaTurma?.result === 'DESISTENTE';
                      return (
                        <tr key={t.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                          <td className="py-2 pr-3 font-mono text-slate-600 dark:text-slate-300">{t.year}/{t.semester}</td>
                          <td className="py-2 pr-3">{t.module}º</td>
                          <td className="py-2 pr-3 font-bold text-slate-800 dark:text-slate-200">{t.name} {t.code ? `(${t.code})` : ''}</td>
                          <td className="py-2">{t.shift}</td>
                          <td className="py-2 text-right">
                            {jaDesistente ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white">CANCELADO</span>
                            ) : ehPeriodoAtual ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!confirmandoCancelamentoTurma) { setConfirmandoCancelamentoTurma(true); return; }
                                  const quantos = marcarDesistenteNaTurma(aluno!.id, t.id, true);
                                  setConfirmandoCancelamentoTurma(false);
                                  mostrarAviso('Matrícula cancelada', `${quantos} disciplina(s) de ${aluno!.name} nesta turma foram marcadas como canceladas/desistentes — já aparece assim no diário do professor.`);
                                }}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                                  confirmandoCancelamentoTurma
                                    ? 'bg-red-700 text-white animate-pulse'
                                    : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100'
                                }`}
                              >
                                {confirmandoCancelamentoTurma ? 'Confirma cancelar?' : 'Cancelar Matrícula'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-300 dark:text-slate-700">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-[10px] text-slate-400 mt-2">
                  Só é possível cancelar a matrícula do semestre atual ({currentPeriod}) — semestres passados fazem parte do histórico e não são alterados aqui.
                </p>
              </div>
            )}
          </div>

          {/* DEPENDÊNCIAS */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="flex items-center gap-2 font-black text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              <Sparkles className="h-4 w-4 text-purple-600" /> Dependências ({dependenciasDoAluno.length})
            </h4>
            {dependenciasDoAluno.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhuma dependência registrada pra este aluno.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left font-bold py-2 pr-3">Ano/Semestre</th>
                      <th className="text-left font-bold py-2 pr-3">Disciplina</th>
                      <th className="text-left font-bold py-2 pr-3">Horário</th>
                      <th className="text-right font-bold py-2 pr-3">Status</th>
                      <th className="text-right font-bold py-2">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dependenciasDoAluno.map(d => {
                      // O ano de verdade vem da turma que foi criada pra
                      // essa dependência — o registro em si só guarda o
                      // número do semestre, não o ano.
                      const turmaGerada = classes.find(c => c.id === d.createdClassId);
                      const disciplina = subjects.find(s => s.id === d.subjectId);
                      return (
                        <tr key={d.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                          <td className="py-2 pr-3 font-mono text-slate-600 dark:text-slate-300">
                            {turmaGerada ? `${turmaGerada.year}/${d.semester}` : `?/${d.semester}`}
                          </td>
                          <td className="py-2 pr-3 font-bold text-slate-800 dark:text-slate-200">
                            {disciplina?.name || 'Disciplina não identificada'}
                          </td>
                          <td className="py-2 pr-3">{d.schedule}</td>
                          <td className="py-2 pr-3 text-right">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              d.status === 'CONCLUÍDO' ? 'bg-emerald-600 text-white' :
                              d.status === 'CANCELADO' ? 'bg-slate-400 text-white' : 'bg-blue-600 text-white'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            {d.status === 'ATIVO' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirmandoCancelamentoDepId !== d.id) { setConfirmandoCancelamentoDepId(d.id); return; }
                                  const resultado = await marcarStatusDependenciaContexto(d, 'CANCELADO');
                                  setConfirmandoCancelamentoDepId('');
                                  if (!resultado.ok) { mostrarAviso('Não foi possível cancelar', resultado.erro || 'Erro desconhecido.'); return; }
                                  mostrarAviso('Dependência cancelada', `A dependência de ${disciplina?.name || 'disciplina'} foi marcada como cancelada.`);
                                }}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                                  confirmandoCancelamentoDepId === d.id
                                    ? 'bg-red-700 text-white animate-pulse'
                                    : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100'
                                }`}
                              >
                                {confirmandoCancelamentoDepId === d.id ? 'Confirma?' : 'Cancelar'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ESTÁGIOS */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="flex items-center gap-2 font-black text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              <Briefcase className="h-4 w-4 text-amber-600" /> Estágios ({estagiosDoAluno.length})
            </h4>
            {estagiosDoAluno.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhum componente de estágio lançado ainda pra este aluno.</p>
            ) : (
              <div className="space-y-2">
                {estagiosDoAluno.map(e => (
                  <div key={e.id} className="p-3 bg-amber-50/60 dark:bg-amber-950/10 rounded-2xl border border-amber-150 dark:border-amber-900/30 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{e.subjectName}</span>
                      <span className="text-[11px] text-slate-500 ml-2">{e.location || 'Local não definido'} · {e.workload}h</span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      e.grade !== null ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {e.grade !== null ? e.grade.toFixed(1) : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

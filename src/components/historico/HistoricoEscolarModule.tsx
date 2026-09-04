import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { HistoricoEscolarPrintView } from './HistoricoEscolarPrintView';
import {
  modeloDoCurso, conceitoDaNota, RESOLUCOES_DISPONIVEIS,
  type ModeloHistorico,
} from '../../lib/historicoTextos';
import {
  ASSINANTES_PADRAO, registrarHistorico,
  type DadosHistorico, type LinhaHistorico, type TipoHistorico,
} from '../../lib/supabaseHistorico';
import {
  ScrollText, Search, X, AlertTriangle, CheckCircle2, Lock, Info,
} from 'lucide-react';

// ===========================================================================
//  HISTÓRICO ESCOLAR — tela
//
//  TRAVA POR CURSO, igual à da Declaração de Auxiliar: cada curso tem o seu
//  histórico, com resolução, carga horária e competências próprias. Um aluno
//  de Segurança do Trabalho não pode receber o histórico de Enfermagem. Se o
//  curso do aluno não bater com nenhum modelo, a tela não deixa gerar.
//
//  COMPLETO x PARCIAL: o parcial é o que a escola chama de "Modelo de
//  Transferência" — disciplinas não cursadas saem como "À Cursar" e o
//  estágio como "à cursar".
//
//  CONCEITO EM LETRA: a nota do portal (0 a 10) vira A, B, C ou D pela
//  legenda oficial impressa no rodapé do documento.
// ===========================================================================

const campo = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm text-slate-800 dark:text-white';
const rotulo = 'block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1';
const hoje = () => new Date().toISOString().split('T')[0];

interface Props {
  currentUser?: string;
}

export const HistoricoEscolarModule: React.FC<Props> = ({ currentUser = 'Administração' }) => {
  const { users, classes, courses, subjects, grades } = useApp();

  const [busca, setBusca] = useState('');
  const [aluno, setAluno] = useState<any | null>(null);
  const [tipo, setTipo] = useState<TipoHistorico>('COMPLETO');
  const [resolucao, setResolucao] = useState('');
  const [estagioEm, setEstagioEm] = useState('');
  const [frequencia, setFrequencia] = useState<number | ''>('');
  const [resultado, setResultado] = useState('APROVADO (A)');
  const [dataEmissao, setDataEmissao] = useState(hoje());
  const [assinantes, setAssinantes] = useState({ ...ASSINANTES_PADRAO });
  const [preview, setPreview] = useState<any | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const alunos = useMemo(() => users.filter(u => u.role === UserRole.STUDENT), [users]);
  const encontrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (t.length < 2) return [];
    return alunos
      .filter(a => a.name?.toLowerCase().includes(t) || (a.enrollment ?? '').toLowerCase().includes(t))
      .slice(0, 8);
  }, [alunos, busca]);

  const contexto = (a: any) => {
    const turma = classes.find(c => c.id === a?.classId);
    const curso = courses.find(c => c.id === (turma as any)?.courseId || c.id === (a as any)?.courseId);
    return { turma, curso };
  };
  const { curso: cursoAluno } = aluno ? contexto(aluno) : { curso: null };
  const modelo: ModeloHistorico | null = modeloDoCurso(cursoAluno?.name);

  /**
   * Notas do aluno indexadas pelo NOME da disciplina, em maiúsculas.
   * Casar por nome é o que permite ligar a grade fixa do histórico ao que
   * foi lançado no portal, já que a mesma disciplina pode ter ids
   * diferentes em turmas diferentes.
   */
  const notasPorNome = useMemo(() => {
    const mapa: Record<string, { nota: number | null; faltas: number | null }> = {};
    if (!aluno) return mapa;
    for (const g of (grades ?? [])) {
      if ((g as any).studentId !== aluno.id) continue;
      const disc = subjects.find(s => s.id === (g as any).subjectId);
      const nome = (disc?.name || '').trim().toUpperCase();
      if (!nome) continue;
      const nota = (g as any).finalGrade ?? (g as any).pf ?? (g as any).average ?? null;
      mapa[nome] = {
        nota: nota === null || nota === undefined ? null : Number(nota),
        faltas: (g as any).absences ?? null,
      };
    }
    return mapa;
  }, [aluno, grades, subjects]);

  const linhasPorModulo = useMemo(() => {
    if (!modelo) return [];
    return modelo.modulos.map(mod => ({
      nome: mod.nome,
      linhas: mod.disciplinas.map((d): LinhaHistorico => {
        const achado = notasPorNome[d.nome.trim().toUpperCase()];
        const temNota = achado && achado.nota !== null;
        return {
          nome: d.nome,
          ch: d.ch,
          // No parcial, disciplina sem nota é "À Cursar". No completo, traço.
          conceito: temNota ? conceitoDaNota(achado!.nota) : (tipo === 'PARCIAL' ? 'À Cursar' : '----'),
          faltas: achado && achado.faltas !== null ? String(achado.faltas) : '----',
          apMfc: '----',
          apAnoSemestre: '----',
          apNotas: '----',
          apFaltas: '----',
        };
      }),
    }));
  }, [modelo, notasPorNome, tipo]);

  const totalDisciplinas = linhasPorModulo.reduce((s, m) => s + m.linhas.length, 0);
  const comNota = linhasPorModulo.reduce(
    (s, m) => s + m.linhas.filter(l => l.conceito !== '----' && l.conceito !== 'À Cursar').length, 0);

  const gerar = () => {
    if (!aluno || !modelo) return;
    const dados: DadosHistorico = {
      alunoId: aluno.id,
      alunoNome: aluno.name || '',
      dataNascimento: aluno.birthDate || '',
      naturalidade: [aluno.birthCity, aluno.birthState].filter(Boolean).join(' - '),
      nomePai: aluno.fatherName || '',
      nomeMae: aluno.motherName || '',
      tipo,
      estagioConcluidoEm: estagioEm || undefined,
      frequenciaObtida: frequencia === '' ? undefined : Number(frequencia),
      resultadoFinal: resultado,
      dataEmissao,
      resolucaoImpressa: resolucao || modelo.resolucao,
      ...assinantes,
    };
    setPreview({ modelo, dados, linhasPorModulo });
    void registrarHistorico(dados, modelo.cursoNome, currentUser);
  };

  return (
    <div className="space-y-5">

      {aviso && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700">
          <AlertTriangle className="h-4 w-4 mt-0.5" /> <span>{aviso}</span>
        </div>
      )}

      {/* Busca */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-4">
          <ScrollText className="h-5 w-5" />
          <h3 className="font-black text-sm">Histórico Escolar</h3>
        </div>

        <label className={rotulo}>1. Escolha o aluno</label>
        {aluno ? (
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-2xl flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-black text-sm text-slate-800 dark:text-white truncate">{aluno.name}</p>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                {aluno.enrollment ? `Matrícula ${aluno.enrollment}` : 'Sem matrícula'}
                {cursoAluno?.name ? ` · ${cursoAluno.name}` : ' · Sem turma'}
              </p>
              {modelo && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                  Modelo: {modelo.nomeInterno || modelo.cursoNome} · {comNota} de {totalDisciplinas} disciplinas com nota
                </span>
              )}
            </div>
            <button type="button" onClick={() => setAluno(null)} className="p-2 text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                     placeholder="Digite o nome ou a matrícula do aluno" className={campo + ' pl-9'} />
            </div>
            {encontrados.length > 0 && (
              <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                {encontrados.map(a => {
                  const { curso } = contexto(a);
                  return (
                    <button key={a.id} type="button"
                            onClick={() => { setAluno(a); setBusca(''); setResolucao(''); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-white">{a.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {a.enrollment || 'sem matrícula'}{curso?.name ? ` · ${curso.name}` : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* TRAVA POR CURSO */}
      {aluno && !modelo && (
        <div className="flex items-start gap-2 px-4 py-4 rounded-2xl border-2 border-rose-300 bg-rose-50">
          <Lock className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs font-bold text-rose-800 leading-relaxed">
            Não existe modelo de histórico para {cursoAluno?.name || 'o curso deste aluno'}.
            Existem modelos para Enfermagem, Enfermagem EAD, Radiologia e Segurança do Trabalho.
            Cada curso tem resolução, carga horária e competências próprias, então emitir com o
            modelo de outro curso geraria um documento incorreto.
          </div>
        </div>
      )}

      {aluno && modelo && (
        <>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">

            <div>
              <label className={rotulo}>2. Tipo de histórico</label>
              <div className="flex gap-2">
                {([
                  ['COMPLETO', 'Completo'],
                  ['PARCIAL', 'Parcial (transferência)'],
                ] as const).map(([v, t]) => (
                  <button key={v} type="button" onClick={() => setTipo(v)}
                          className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
                            tipo === v ? 'bg-blue-600 text-white border-blue-600'
                                       : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                {tipo === 'PARCIAL'
                  ? 'As disciplinas sem nota saem como "À Cursar" e o estágio como "à cursar". É o modelo usado na transferência.'
                  : 'Documento de conclusão. Disciplinas sem nota saem com traço.'}
              </p>
            </div>

            <div>
              <label className={rotulo}>3. Resolução no cabeçalho</label>
              <select className={campo} value={resolucao}
                      onChange={e => setResolucao(e.target.value)}>
                <option value="">Padrão do curso — {modelo.resolucao}</option>
                {RESOLUCOES_DISPONIVEIS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                O histórico de aluno antigo precisa trazer a resolução que estava em vigor
                quando ele cursou, e não a de hoje. Se a resolução certa não estiver na lista,
                digite no campo abaixo.
              </p>
              <input className={campo + ' mt-2'} placeholder="Ou digite outra resolução"
                     value={resolucao} onChange={e => setResolucao(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tipo === 'COMPLETO' && (
                <div>
                  <label className={rotulo}>Estágio concluído em</label>
                  <input type="date" className={campo} value={estagioEm}
                         onChange={e => setEstagioEm(e.target.value)} />
                </div>
              )}
              <div>
                <label className={rotulo}>Frequência obtida (horas)</label>
                <input type="number" min={0} className={campo}
                       placeholder={String(modelo.cargaTotal)}
                       value={frequencia}
                       onChange={e => setFrequencia(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div>
                <label className={rotulo}>Resultado final</label>
                <input className={campo} value={resultado}
                       onChange={e => setResultado(e.target.value)} />
              </div>
              <div>
                <label className={rotulo}>Data de emissão</label>
                <input type="date" className={campo} value={dataEmissao}
                       onChange={e => setDataEmissao(e.target.value)} />
              </div>
              <div>
                <label className={rotulo}>Assinatura — Secretaria</label>
                <input className={campo} value={assinantes.nomeSecretario}
                       onChange={e => setAssinantes({ ...assinantes, nomeSecretario: e.target.value })} />
              </div>
              <div>
                <label className={rotulo}>Assinatura — Direção</label>
                <input className={campo} value={assinantes.nomeDirecao}
                       onChange={e => setAssinantes({ ...assinantes, nomeDirecao: e.target.value })} />
              </div>
            </div>

            {comNota < totalDisciplinas && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                  {totalDisciplinas - comNota} de {totalDisciplinas} disciplinas estão sem nota lançada.
                  {tipo === 'COMPLETO'
                    ? ' Num histórico completo elas saem com traço — confira se é isso mesmo antes de assinar.'
                    : ' Num histórico parcial isso é esperado: elas saem como "À Cursar".'}
                </p>
              </div>
            )}

            <button type="button" onClick={gerar}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs">
              <ScrollText className="h-4 w-4" />
              Gerar {tipo === 'PARCIAL' ? 'Histórico Parcial' : 'Histórico'}
            </button>
          </div>
        </>
      )}

      {preview && (
        <HistoricoEscolarPrintView
          modelo={preview.modelo}
          dados={preview.dados}
          linhasPorModulo={preview.linhasPorModulo}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

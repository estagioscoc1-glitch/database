import React, { useState, useMemo, useEffect } from 'react';
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
  const { users, classes, courses, subjects, grades, dependencies, attendance } = useApp();

  const [busca, setBusca] = useState('');
  const [aluno, setAluno] = useState<any | null>(null);
  const [tipo, setTipo] = useState<TipoHistorico>('COMPLETO');
  const [resolucao, setResolucao] = useState('');
  const [estagioEm, setEstagioEm] = useState('');
  const [frequencia, setFrequencia] = useState<number | ''>('');
  const [resultado, setResultado] = useState('APROVADO (A)');
  const [dataEmissao, setDataEmissao] = useState(hoje());
  const [assinantes, setAssinantes] = useState({ ...ASSINANTES_PADRAO });
  // Ano/semestre em que o aluno cursou cada módulo. Sai girado na coluna
  // "Mod." do documento, junto do nome do módulo, como na planilha
  // ("MÓDULO I  2025/1"). Não dá para deduzir do cadastro, porque o aluno
  // pode ter cursado os módulos em semestres diferentes.
  const [anoSemestrePorModulo, setAnoSemestrePorModulo] = useState<Record<string, string>>({});
  // Ano/semestre em que a dependência foi cursada, por disciplina. Não existe
  // no cadastro de dependência, então a secretaria informa.
  const [depAnoSemestre, setDepAnoSemestre] = useState<Record<string, string>>({});
  // Disciplinas dispensadas por aproveitamento de estudos, marcadas à mão.
  const [dispensas, setDispensas] = useState<Record<string, boolean>>({});
  // Conceito obtido na dependência. Vem do diário da dependência quando ele
  // existe; este campo permite corrigir ou informar quando não existe.
  const [depConceito, setDepConceito] = useState<Record<string, string>>({});
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

  /**
   * DEPENDÊNCIAS DO ALUNO, indexadas pelo nome da disciplina.
   * Quando o aluno cursou a disciplina em dependência, a coluna CONCEITO sai
   * como "DEP" e o conceito de verdade vai para o bloco de aproveitamento,
   * junto do ano/semestre em que ele fez a dependência. É como a escola
   * preenche: o "D" da primeira tentativa não fica no histórico.
   */
  const dependenciasPorNome = useMemo(() => {
    const mapa: Record<string, { conceito: string; anoSemestre: string }> = {};
    if (!aluno) return mapa;
    for (const d of (dependencies ?? [])) {
      if ((d as any).studentId !== aluno.id) continue;
      if ((d as any).status === 'CANCELADO') continue;
      const disc = subjects.find(x => x.id === (d as any).subjectId);
      const nome = (disc?.name || '').trim().toUpperCase();
      if (!nome) continue;

      // A NOTA DA DEPENDÊNCIA É OUTRO REGISTRO.
      // Quando a secretaria cria uma dependência, o sistema gera um diário
      // separado (createdClassId). A nota dessa segunda tentativa fica ligada
      // a ESSE diário. Buscar pela disciplina, como eu fazia antes, trazia a
      // nota da primeira tentativa — aquela que o aluno reprovou. Era por isso
      // que saía "D" no lugar do "A" que a aluna tirou na dependência.
      const diarioDep = (d as any).createdClassId;
      const notaDep = (grades ?? []).find(
        (g: any) => g.studentId === aluno.id && g.classId === diarioDep
      );
      const valorDep = notaDep
        ? ((notaDep as any).finalGrade ?? (notaDep as any).pf ?? (notaDep as any).average ?? null)
        : null;

      mapa[nome] = {
        // O conceito digitado pela secretaria manda; é a rede de segurança
        // para quando o diário da dependência não estiver no sistema.
        conceito: (depConceito[nome] || '').trim().toUpperCase()
          || (valorDep !== null && valorDep !== undefined ? conceitoDaNota(Number(valorDep)) : '----'),
        anoSemestre: depAnoSemestre[nome] ?? '',
      };
    }
    return mapa;
  }, [aluno, dependencies, subjects, grades, depAnoSemestre, depConceito]);

  /**
   * SUGESTÃO DO ANO/SEMESTRE POR MÓDULO.
   *
   * A turma do aluno guarda o ano, o semestre e em que módulo ela está. Com
   * isso dá para andar para trás no calendário: se o aluno está no módulo III
   * em 2026/1, ele cursou o II em 2025/2 e o I em 2025/1. Cada módulo é um
   * semestre.
   *
   * É SÓ SUGESTÃO, e por isso os campos continuam editáveis. Aluno que trancou,
   * reprovou ou entrou por transferência não segue essa sequência, e nesse caso
   * a secretaria corrige. Deixar em branco também é opção: o documento imprime
   * só o nome do módulo.
   */
  const sugerirAnoSemestre = (a: any) => {
    const { turma } = contexto(a);
    const modeloDele = modeloDoCurso(courses.find(
      c => c.id === (turma as any)?.courseId || c.id === (a as any)?.courseId
    )?.name);
    if (!turma || !modeloDele || !turma.year || !turma.semester) {
      setAnoSemestrePorModulo({});
      return;
    }

    // Posição do módulo atual dentro da grade (0 = primeiro).
    const posAtual = Math.max(0, (turma.module || 1) - 1);
    let ano = turma.year;
    let sem = turma.semester;

    // Anda para trás até o primeiro módulo, guardando o semestre de cada um.
    const semestres: string[] = [];
    for (let i = posAtual; i >= 0; i--) {
      semestres[i] = `${ano}/${sem}`;
      sem -= 1;
      if (sem < 1) { sem = 2; ano -= 1; }
    }

    // E para a frente, para os módulos que ele ainda vai cursar.
    ano = turma.year; sem = turma.semester;
    for (let i = posAtual; i < modeloDele.modulos.length; i++) {
      semestres[i] = semestres[i] ?? `${ano}/${sem}`;
      sem += 1;
      if (sem > 2) { sem = 1; ano += 1; }
    }

    const mapa: Record<string, string> = {};
    modeloDele.modulos.forEach((mod, i) => {
      if (semestres[i]) mapa[mod.nome] = semestres[i];
    });
    setAnoSemestrePorModulo(mapa);
  };

  /**
   * FREQUÊNCIA CALCULADA DAS CHAMADAS.
   *
   * Cada chamada (AttendanceSession) guarda quantas aulas teve naquele dia
   * (lessonsCount) e quem estava presente. Somando as aulas de todas as
   * chamadas dá o total ministrado; somando só as que o aluno tem "P" dá o
   * que ele cumpriu.
   *
   * Devolve null quando não há nenhuma chamada lançada para esse aluno. Nesse
   * caso o campo fica em branco para a secretaria preencher à mão — melhor um
   * campo vazio do que um zero que pareceria frequência nula.
   */
  const frequenciaCalculada = useMemo(() => {
    if (!aluno) return null;
    let ministradas = 0;
    let presentes = 0;
    for (const ch of (attendance ?? [])) {
      const marca = (ch as any).records?.[aluno.id];
      if (marca !== 'P' && marca !== 'F') continue; // aluno não estava nessa turma
      const aulas = Number((ch as any).lessonsCount || 0);
      ministradas += aulas;
      if (marca === 'P') presentes += aulas;
    }
    if (ministradas === 0) return null;
    return { ministradas, presentes, percentual: (presentes / ministradas) * 100 };
  }, [aluno, attendance]);

  // Joga a frequência calculada no campo, que continua editável.
  // ESTE useEffect PRECISA VIR DEPOIS de frequenciaCalculada. Estando antes,
  // a lista de dependências é avaliada durante a renderização e o JavaScript
  // recusa ler uma const que ainda não foi criada — era o erro
  // "Cannot access 'G' before initialization" que derrubava a aba inteira.
  useEffect(() => {
    if (frequenciaCalculada) setFrequencia(frequenciaCalculada.presentes);
  }, [frequenciaCalculada]);

  const linhasPorModulo = useMemo(() => {
    if (!modelo) return [];
    return modelo.modulos.map(mod => ({
      nome: mod.nome,
      anoSemestre: anoSemestrePorModulo[mod.nome] || '',
      linhas: mod.disciplinas.map((d): LinhaHistorico => {
        const chave = d.nome.trim().toUpperCase();
        const achado = notasPorNome[chave];
        const temNota = achado && achado.nota !== null;
        const dep = dependenciasPorNome[chave];
        const dispensado = dispensas[chave];

        // Ordem de prioridade na coluna CONCEITO:
        //   1) dispensado por aproveitamento de estudos -> "Ap. Est."
        //   2) cursou em dependência -> "DEP", e o conceito real vai pro
        //      bloco de aproveitamento, com o ano/semestre da dependência
        //   3) nota lançada -> letra
        //   4) sem nota -> "À Cursar" no parcial, traço no completo
        let conceito: string;
        let apMfc = '----';
        let apAno = '----';

        if (dispensado) {
          conceito = 'Ap. Est';
          // A planilha da escola deixa M.F.C. e Ano/S. em branco na dispensa.
          // Se a secretaria preencher, sai preenchido.
          apMfc = (depConceito[chave] || '').trim().toUpperCase() || '----';
          apAno = depAnoSemestre[chave] || '----';
        } else if (dep) {
          conceito = 'DEP';
          apMfc = dep.conceito;
          apAno = dep.anoSemestre || '----';
        } else if (temNota) {
          conceito = conceitoDaNota(achado!.nota);
        } else {
          conceito = tipo === 'PARCIAL' ? 'À Cursar' : '----';
        }

        return {
          nome: d.nome,
          ch: d.ch,
          conceito,
          faltas: achado && achado.faltas !== null ? String(achado.faltas) : '----',
          apMfc,
          apAnoSemestre: apAno,
        };
      }),
    }));
  }, [modelo, notasPorNome, tipo, anoSemestrePorModulo, dependenciasPorNome, dispensas, depAnoSemestre, depConceito]);

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
                            onClick={() => { setAluno(a); setBusca(''); setResolucao(''); sugerirAnoSemestre(a); }}
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
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  {frequenciaCalculada
                    ? `Calculado das chamadas: ${frequenciaCalculada.presentes} de ${frequenciaCalculada.ministradas} aulas (${frequenciaCalculada.percentual.toFixed(1).replace('.', ',')}%). Confira e corrija se precisar.`
                    : 'Nenhuma chamada lançada para este aluno — preencha à mão.'}
                </p>
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

            <div>
              <label className={rotulo}>Ano e semestre de cada módulo</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {modelo.modulos.map(mod => (
                  <div key={mod.nome}>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">{mod.nome}</label>
                    <input className={campo} placeholder="2025/1"
                           value={anoSemestrePorModulo[mod.nome] ?? ''}
                           onChange={e => setAnoSemestrePorModulo({
                             ...anoSemestrePorModulo, [mod.nome]: e.target.value,
                           })} />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Sai girado na coluna "Mod." do documento, junto do nome do módulo, como na planilha.
                Vem sugerido a partir da turma do aluno, contando um semestre por módulo — confira,
                porque quem trancou, reprovou ou entrou por transferência não segue essa sequência.
                Deixe em branco para imprimir só o nome do módulo.
              </p>
            </div>

            {/* Situações especiais por disciplina */}
            <details className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50">
                Dependências e dispensas — clique para ajustar
                {Object.keys(dependenciasPorNome).length > 0 &&
                  ` (${Object.keys(dependenciasPorNome).length} dependência${Object.keys(dependenciasPorNome).length > 1 ? 's' : ''} encontrada${Object.keys(dependenciasPorNome).length > 1 ? 's' : ''})`}
              </summary>
              <div className="p-4 space-y-3">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Disciplina cursada em <strong>dependência</strong> sai como <strong>DEP</strong> na coluna
                  CONCEITO, e o conceito obtido <strong>na dependência</strong> vai para M.F.C., com o ano
                  e semestre ao lado. O sistema busca esse conceito no diário da dependência; se ele
                  ainda não existir, digite abaixo.
                  Disciplina <strong>dispensada</strong> por aproveitamento de estudos sai como
                  <strong> Ap. Est.</strong> As dependências são achadas sozinhas no cadastro — só o
                  ano/semestre precisa ser informado.
                </p>
                <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-black text-slate-500 uppercase">Disciplina</th>
                        <th className="px-3 py-2 text-center font-black text-slate-500 uppercase">Situação</th>
                        <th className="px-3 py-2 text-center font-black text-slate-500 uppercase">M.F.C.</th>
                        <th className="px-3 py-2 text-center font-black text-slate-500 uppercase">Ano/Sem.</th>
                        <th className="px-3 py-2 text-center font-black text-slate-500 uppercase">Dispensa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelo.modulos.flatMap(mod => mod.disciplinas).map(d => {
                        const chave = d.nome.trim().toUpperCase();
                        const dep = dependenciasPorNome[chave];
                        return (
                          <tr key={d.nome} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200">{d.nome}</td>
                            <td className="px-3 py-1.5 text-center">
                              {dispensas[chave]
                                ? <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-black">Ap. Est.</span>
                                : dep
                                  ? <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-black">DEP</span>
                                  : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <input
                                className="w-14 px-2 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg outline-none text-[11px] text-center font-bold uppercase"
                                placeholder={dep ? dep.conceito : '—'}
                                maxLength={8}
                                disabled={!dep && !dispensas[chave]}
                                value={depConceito[chave] ?? ''}
                                onChange={e => setDepConceito({ ...depConceito, [chave]: e.target.value })}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg outline-none text-[11px] text-center"
                                placeholder="2026/1"
                                disabled={!dep && !dispensas[chave]}
                                value={depAnoSemestre[chave] ?? ''}
                                onChange={e => setDepAnoSemestre({ ...depAnoSemestre, [chave]: e.target.value })}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <input type="checkbox" checked={!!dispensas[chave]}
                                     onChange={e => setDispensas({ ...dispensas, [chave]: e.target.checked })} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>

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

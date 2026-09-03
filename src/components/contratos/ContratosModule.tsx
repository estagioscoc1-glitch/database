import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { ContratoPrintView } from './ContratoPrintView';
import {
  carregarClausulas, salvarClausulas, restaurarPadrao, registrarEmissao,
  PADRAO_CONTRATO, PADRAO_ADITIVO, formatarDinheiro,
  type DadosContrato, type ModalidadeContrato,
} from '../../lib/supabaseContratos';
import { CAMPOS_DISPONIVEIS, CLAUSULAS_ADITIVO_DEPENDENCIA, type ClausulaContrato } from '../../lib/contratoTextos';
import {
  FileSignature, Search, X, Save, RotateCcw, AlertTriangle, CheckCircle2,
  Pencil, Plus, Trash2, FileText, Info,
} from 'lucide-react';

// ===========================================================================
//  CONTRATOS — gerar e editar
//
//  DE ONDE VÊM OS DADOS DO ALUNO:
//  Você escolhe o aluno e o resto se preenche sozinho. O caminho é
//  aluno -> turma -> curso. A turma guarda o módulo (campo "module") e aponta
//  para o curso (campo "courseId"). Por isso um aluno do 2º módulo recebe um
//  contrato escrito "2º módulo" sem ninguém digitar nada.
//
//  QUANDO NÃO DÁ PRA PUXAR:
//  Aluno sem turma, ou entre módulos, ou recém-transferido. Nesses casos os
//  campos ficam em branco e destacados, e a secretaria preenche à mão. O
//  sistema nunca inventa módulo — contrato assinado com módulo errado é
//  problema jurídico, então é melhor deixar visível que falta preencher.
//
//  SOBRE OS VALORES:
//  Vêm dos contratos oficiais como sugestão (R$ 2.400,00 em 6x de R$ 400,00
//  etc.) e são todos editáveis antes de gerar. O que for impresso fica
//  gravado no histórico, para conferência depois.
// ===========================================================================

const campo = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm text-slate-800 dark:text-white';
const rotulo = 'block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1';

const hoje = () => new Date().toISOString().split('T')[0];

interface Props {
  currentUser?: string;
}

export const ContratosModule: React.FC<Props> = ({ currentUser = 'Administração' }) => {
  const { users, classes, courses, subjects, dependencies } = useApp();

  const [aba, setAba] = useState<'gerar' | 'modelos'>('gerar');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const mostrar = (tipo: 'ok' | 'erro', texto: string) => {
    setAviso({ tipo, texto });
    window.setTimeout(() => setAviso(null), 6000);
  };

  // ------------------------------------------------------------- GERAR
  const [busca, setBusca] = useState('');
  const [aluno, setAluno] = useState<any | null>(null);
  const [modalidade, setModalidade] = useState<ModalidadeContrato>('PRESENCIAL');
  const [dados, setDados] = useState<DadosContrato | null>(null);
  const [preview, setPreview] = useState<{
    dados: DadosContrato;
    clausulas: ClausulaContrato[];
    tituloDocumento?: string;
  } | null>(null);
  const [depValorParcela, setDepValorParcela] = useState(PADRAO_ADITIVO.valorParcela);
  const [depNumParcelas, setDepNumParcelas] = useState(PADRAO_ADITIVO.numParcelas);
  const [gerando, setGerando] = useState(false);

  const alunos = useMemo(() => users.filter(u => u.role === UserRole.STUDENT), [users]);

  const encontrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (t.length < 2) return [];
    return alunos
      .filter(a => a.name?.toLowerCase().includes(t) || (a.enrollment ?? '').toLowerCase().includes(t))
      .slice(0, 8);
  }, [alunos, busca]);

  /** aluno -> turma -> curso. É daqui que saem o módulo e o curso. */
  const contexto = (a: any) => {
    const turma = classes.find(c => c.id === a?.classId);
    const curso = courses.find(c => c.id === (turma as any)?.courseId || c.id === (a as any)?.courseId);
    return { turma, curso };
  };

  const escolherAluno = (a: any) => {
    const { turma, curso } = contexto(a);
    setAluno(a);
    setBusca('');

    const enderecoCompleto = [a.address, a.addressNumber].filter(Boolean).join(', ');
    const cidadeUf = [a.city, a.state].filter(Boolean).join('-');

    setDados({
      contratanteNome: a.name || '',
      estadoCivil: a.maritalStatus || '',
      cpf: a.cpf || '',
      rg: a.rg || '',
      rgOrgao: [a.rgIssuer, a.rgUf].filter(Boolean).join(''),
      nacionalidade: a.nationality || 'BRASILEIRA',
      endereco: enderecoCompleto,
      bairro: a.neighborhood || '',
      cidade: cidadeUf || 'GOIÂNIA-GO',

      alunoNome: a.name || '',
      alunoId: a.id,
      cursoNome: curso?.name || '',

      modalidade,
      ano: String(turma?.year || new Date().getFullYear()),
      modulo: turma?.module ? String(turma.module) : '',

      ...PADRAO_CONTRATO,
      dataContrato: hoje(),
    });
  };

  // Trocar presencial/EAD depois de escolher o aluno mantém o resto preenchido.
  useEffect(() => {
    if (dados) setDados({ ...dados, modalidade });
  }, [modalidade]); // eslint-disable-line react-hooks/exhaustive-deps

  const { turma: turmaAluno, curso: cursoAluno } = aluno ? contexto(aluno) : { turma: null, curso: null };
  const faltaModulo = !!aluno && !dados?.modulo;
  const faltaCurso = !!aluno && !dados?.cursoNome;

  const gerar = async () => {
    if (!dados) return;
    setGerando(true);
    const { clausulas } = await carregarClausulas(dados.modalidade);
    setPreview({ dados, clausulas });
    void registrarEmissao(dados, {
      matricula: aluno?.enrollment,
      turmaNome: turmaAluno?.name,
      emitidoPor: currentUser,
    });
    setGerando(false);
  };

  /**
   * DEPENDÊNCIAS DO ALUNO
   * O aditivo só aparece pra quem realmente está em dependência. Duas fontes:
   *  1) a lista de dependências (DependencyEnrollment), que é o registro
   *     formal com status ATIVO;
   *  2) turmas marcadas como isDependency em que o aluno esteja — acontece
   *     quando a secretaria criou o diário de dependência direto, sem passar
   *     pelo cadastro formal.
   * Juntar as duas evita o aditivo sumir por causa de caminho de cadastro.
   */
  const disciplinasDependencia = useMemo(() => {
    if (!aluno) return [] as string[];
    const nomes = new Set<string>();

    for (const d of (dependencies ?? [])) {
      if (d.studentId !== aluno.id) continue;
      if (d.status !== 'ATIVO') continue;
      const disc = subjects.find(s => s.id === d.subjectId);
      nomes.add(disc?.name || 'Disciplina não identificada');
    }

    const turmaDep = classes.find(c => c.id === aluno.classId && (c as any).isDependency);
    if (turmaDep && (turmaDep as any).dependencySubjectId) {
      const disc = subjects.find(s => s.id === (turmaDep as any).dependencySubjectId);
      if (disc) nomes.add(disc.name);
    }

    return Array.from(nomes);
  }, [aluno, dependencies, subjects, classes]);

  const temDependencia = disciplinasDependencia.length > 0;

  const gerarAditivo = () => {
    if (!dados) return;
    setPreview({
      dados: {
        ...dados,
        aditivo: {
          disciplinas: disciplinasDependencia,
          valorParcela: depValorParcela,
          numParcelas: depNumParcelas,
        },
      },
      clausulas: CLAUSULAS_ADITIVO_DEPENDENCIA,
      tituloDocumento: 'TERMO ADITIVO — MATRÍCULA EM DEPENDÊNCIA',
    });
    void registrarEmissao(dados, {
      matricula: aluno?.enrollment,
      turmaNome: turmaAluno?.name,
      emitidoPor: currentUser,
      temAditivoDependencia: true,
      aditivoValorParcela: depValorParcela,
      aditivoNumParcelas: depNumParcelas,
    });
  };

  // ----------------------------------------------------------- MODELOS
  const [modalidadeEdit, setModalidadeEdit] = useState<ModalidadeContrato>('PRESENCIAL');
  const [clausulasEdit, setClausulasEdit] = useState<ClausulaContrato[]>([]);
  const [editado, setEditado] = useState(false);
  const [carregandoModelo, setCarregandoModelo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregarModelo = async (m: ModalidadeContrato) => {
    setCarregandoModelo(true);
    const { clausulas, editado: ed } = await carregarClausulas(m);
    setClausulasEdit(JSON.parse(JSON.stringify(clausulas)));
    setEditado(ed);
    setCarregandoModelo(false);
  };

  useEffect(() => {
    if (aba === 'modelos') void carregarModelo(modalidadeEdit);
  }, [aba, modalidadeEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvarModelo = async () => {
    setSalvando(true);
    const { erro } = await salvarClausulas(modalidadeEdit, clausulasEdit, currentUser);
    setSalvando(false);
    if (erro) { mostrar('erro', erro); return; }
    mostrar('ok', 'Modelo salvo. A partir de agora todo contrato novo sai com este texto.');
    setEditado(true);
  };

  const voltarAoPadrao = async () => {
    if (!window.confirm(
      'Descartar as edições e voltar ao texto original do contrato?\n\n' +
      'Os contratos que já foram impressos não mudam — isso vale só daqui pra frente.'
    )) return;
    const { erro } = await restaurarPadrao(modalidadeEdit);
    if (erro) { mostrar('erro', erro); return; }
    await carregarModelo(modalidadeEdit);
    mostrar('ok', 'Texto original restaurado.');
  };

  const editarParagrafo = (ic: number, ip: number, texto: string) => {
    const copia = [...clausulasEdit];
    copia[ic] = { ...copia[ic], paragrafos: [...copia[ic].paragrafos] };
    copia[ic].paragrafos[ip] = texto;
    setClausulasEdit(copia);
  };

  const editarTitulo = (ic: number, titulo: string) => {
    const copia = [...clausulasEdit];
    copia[ic] = { ...copia[ic], titulo };
    setClausulasEdit(copia);
  };

  const addParagrafo = (ic: number) => {
    const copia = [...clausulasEdit];
    copia[ic] = { ...copia[ic], paragrafos: [...copia[ic].paragrafos, ''] };
    setClausulasEdit(copia);
  };

  const removerParagrafo = (ic: number, ip: number) => {
    const copia = [...clausulasEdit];
    copia[ic] = { ...copia[ic], paragrafos: copia[ic].paragrafos.filter((_, i) => i !== ip) };
    setClausulasEdit(copia);
  };

  const removerClausula = (ic: number) => {
    if (!window.confirm(`Apagar "${clausulasEdit[ic].titulo}" do modelo?`)) return;
    setClausulasEdit(clausulasEdit.filter((_, i) => i !== ic));
  };

  const addClausula = () => {
    setClausulasEdit([...clausulasEdit, { titulo: 'Cláusula Nova', paragrafos: [''] }]);
  };

  // =========================================================== RENDER

  return (
    <div className="space-y-5">

      {aviso && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-2xl border text-xs font-bold ${
          aviso.tipo === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {aviso.tipo === 'ok' ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <AlertTriangle className="h-4 w-4 mt-0.5" />}
          <span className="leading-relaxed">{aviso.texto}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-4">
          <FileSignature className="h-5 w-5" />
          <h3 className="font-black text-sm">Contratos</h3>
        </div>
        <div className="flex gap-2">
          {([
            { id: 'gerar', rotulo: 'Gerar Contrato', icone: FileText },
            { id: 'modelos', rotulo: 'Editar Modelo', icone: Pencil },
          ] as const).map(t => {
            const Icone = t.icone;
            const ativa = aba === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setAba(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs transition-all ${
                  ativa
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <Icone className={`h-4 w-4 ${ativa ? 'text-white' : 'text-blue-600'}`} /> {t.rotulo}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------ GERAR */}
      {aba === 'gerar' && (
        <div className="space-y-4">

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <label className={rotulo}>1. Escolha o aluno</label>
            {aluno ? (
              <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-sm text-slate-800 dark:text-white truncate">{aluno.name}</p>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {aluno.enrollment ? `Matrícula ${aluno.enrollment}` : 'Sem matrícula'}
                      {turmaAluno?.name ? ` · Turma ${turmaAluno.name}` : ' · Sem turma'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                        cursoAluno ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                   : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        Curso: {cursoAluno?.name || 'não encontrado'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                        turmaAluno?.module ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                           : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        Módulo: {turmaAluno?.module ? `${turmaAluno.module}º` : 'não encontrado'}
                      </span>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setAluno(null); setDados(null); }}
                          className="p-2 text-slate-400 hover:text-slate-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                         placeholder="Digite o nome ou a matrícula do aluno"
                         className={campo + ' pl-9'} />
                </div>
                {encontrados.length > 0 && (
                  <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    {encontrados.map(a => {
                      const { turma, curso } = contexto(a);
                      return (
                        <button key={a.id} type="button" onClick={() => escolherAluno(a)}
                                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <p className="font-bold text-sm text-slate-800 dark:text-white">{a.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {a.enrollment || 'sem matrícula'}
                            {curso?.name ? ` · ${curso.name}` : ''}
                            {turma?.module ? ` · ${turma.module}º módulo` : ''}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
                {busca.trim().length >= 2 && encontrados.length === 0 && (
                  <p className="mt-2 text-[11px] font-bold text-slate-400">Nenhum aluno encontrado.</p>
                )}
              </>
            )}
          </div>

          {dados && (
            <>
              {(faltaModulo || faltaCurso) && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                    Não deu para descobrir {faltaCurso && faltaModulo ? 'o curso nem o módulo' : faltaCurso ? 'o curso' : 'o módulo'} deste
                    aluno pela turma dele. Preencha à mão abaixo antes de gerar — o contrato sai com o que estiver escrito aqui.
                  </p>
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <label className={rotulo}>2. Modalidade</label>
                <div className="flex gap-2">
                  {(['PRESENCIAL', 'EAD'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setModalidade(m)}
                            className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
                              modalidade === m
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                      {m === 'EAD' ? 'EAD' : 'Presencial'}
                    </button>
                  ))}
                </div>

                <label className={rotulo}>3. Confira os dados do contrato</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className={rotulo}>Contratante (quem assina)</label>
                    <input className={campo} value={dados.contratanteNome}
                           onChange={e => setDados({ ...dados, contratanteNome: e.target.value })} />
                  </div>
                  <div>
                    <label className={rotulo}>Estado civil</label>
                    <input className={campo} value={dados.estadoCivil ?? ''}
                           onChange={e => setDados({ ...dados, estadoCivil: e.target.value })} />
                  </div>
                  <div>
                    <label className={rotulo}>CPF</label>
                    <input className={campo} value={dados.cpf ?? ''}
                           onChange={e => setDados({ ...dados, cpf: e.target.value })} />
                  </div>
                  <div>
                    <label className={rotulo}>RG</label>
                    <input className={campo} value={dados.rg ?? ''}
                           onChange={e => setDados({ ...dados, rg: e.target.value })} />
                  </div>
                  <div>
                    <label className={rotulo}>Órgão emissor</label>
                    <input className={campo} value={dados.rgOrgao ?? ''}
                           onChange={e => setDados({ ...dados, rgOrgao: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={rotulo}>Endereço</label>
                    <input className={campo} value={dados.endereco ?? ''}
                           onChange={e => setDados({ ...dados, endereco: e.target.value })} />
                  </div>
                  <div>
                    <label className={rotulo}>Bairro</label>
                    <input className={campo} value={dados.bairro ?? ''}
                           onChange={e => setDados({ ...dados, bairro: e.target.value })} />
                  </div>
                  <div>
                    <label className={rotulo}>Cidade</label>
                    <input className={campo} value={dados.cidade ?? ''}
                           onChange={e => setDados({ ...dados, cidade: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={rotulo}>Curso {cursoAluno && <span className="text-emerald-600">(da turma)</span>}</label>
                    <input className={campo + (faltaCurso ? ' border-rose-400 bg-rose-50' : '')}
                           value={dados.cursoNome ?? ''}
                           onChange={e => setDados({ ...dados, cursoNome: e.target.value })} />
                  </div>
                  <div>
                    <label className={rotulo}>Módulo {turmaAluno?.module && <span className="text-emerald-600">(da turma)</span>}</label>
                    <input className={campo + (faltaModulo ? ' border-rose-400 bg-rose-50' : '')}
                           value={dados.modulo}
                           onChange={e => setDados({ ...dados, modulo: e.target.value })} />
                  </div>
                  <div>
                    <label className={rotulo}>Ano letivo</label>
                    <input className={campo} value={dados.ano}
                           onChange={e => setDados({ ...dados, ano: e.target.value })} />
                  </div>
                  <div>
                    <label className={rotulo}>Data do contrato</label>
                    <input type="date" className={campo} value={dados.dataContrato}
                           onChange={e => setDados({ ...dados, dataContrato: e.target.value })} />
                  </div>
                </div>

                <label className={rotulo}>4. Valores</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    ['valorTotal', 'Total do módulo'],
                    ['entrada', 'Entrada'],
                    ['numParcelas', 'Nº de parcelas'],
                    ['valorParcela', 'Valor da parcela'],
                    ['descontoMatutino', 'Desc. matutino'],
                    ['descontoVespertino', 'Desc. vespertino'],
                    ['descontoNoturno', 'Desc. noturno'],
                    ['valorBiosseguranca', 'Biossegurança'],
                    ['valorMaterialEstagio', 'Material estágio'],
                  ] as const).map(([chave, texto]) => (
                    <div key={chave}>
                      <label className={rotulo}>{texto}</label>
                      <input type="number" step="0.01" min={0} className={campo}
                             value={(dados as any)[chave]}
                             onChange={e => setDados({ ...dados, [chave]: Number(e.target.value) } as DadosContrato)} />
                    </div>
                  ))}
                  {dados.modalidade === 'EAD' && (
                    <div>
                      <label className={rotulo}>Desconto EAD (%)</label>
                      <input type="number" step="0.5" min={0} className={campo}
                             value={dados.descontoEadPercentual ?? 37.5}
                             onChange={e => setDados({ ...dados, descontoEadPercentual: Number(e.target.value) })} />
                    </div>
                  )}
                </div>

                {/* ADITIVO DE DEPENDÊNCIA — só aparece pra quem está em dependência */}
                {temDependencia && (
                  <div className="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <FileSignature className="h-4 w-4 text-amber-700" />
                      <p className="font-black text-xs text-amber-800 uppercase tracking-wider">
                        Este aluno está em dependência
                      </p>
                    </div>
                    <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                      Disciplina{disciplinasDependencia.length > 1 ? 's' : ''}: {disciplinasDependencia.join('; ')}.
                      O aditivo é um documento separado, assinado junto com o contrato.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className={rotulo}>Parcela (R$)</label>
                        <input type="number" step="0.01" min={0} className={campo}
                               value={depValorParcela}
                               onChange={e => setDepValorParcela(Number(e.target.value))} />
                      </div>
                      <div>
                        <label className={rotulo}>Nº de parcelas</label>
                        <input type="number" min={1} className={campo}
                               value={depNumParcelas}
                               onChange={e => setDepNumParcelas(Number(e.target.value))} />
                      </div>
                      <div className="col-span-2 flex items-end">
                        <p className="text-[11px] font-black text-amber-800">
                          Total: {formatarDinheiro(depValorParcela * depNumParcelas)}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={gerarAditivo}
                            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs">
                      <FileSignature className="h-4 w-4" /> Gerar Aditivo de Dependência
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button type="button" onClick={() => void gerar()} disabled={gerando}
                          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black rounded-2xl text-xs">
                    <FileSignature className="h-4 w-4" /> {gerando ? 'Montando…' : 'Gerar Contrato'}
                  </button>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Total: {formatarDinheiro(dados.valorTotal)} · {dados.numParcelas}x de {formatarDinheiro(dados.valorParcela)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- MODELOS */}
      {aba === 'modelos' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2">
                {(['PRESENCIAL', 'EAD'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setModalidadeEdit(m)}
                          className={`px-4 py-2 rounded-xl text-xs font-black border ${
                            modalidadeEdit === m ? 'bg-blue-600 text-white border-blue-600'
                                                 : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    {m === 'EAD' ? 'Contrato EAD' : 'Contrato Presencial'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {editado && (
                  <button type="button" onClick={() => void voltarAoPadrao()}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-[11px]">
                    <RotateCcw className="h-3.5 w-3.5" /> Voltar ao original
                  </button>
                )}
                <button type="button" onClick={() => void salvarModelo()} disabled={salvando}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black rounded-xl text-xs">
                  <Save className="h-3.5 w-3.5" /> {salvando ? 'Salvando…' : 'Salvar Modelo'}
                </button>
              </div>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-3 leading-relaxed">
              {editado
                ? 'Este modelo já foi editado. É este texto que sai nos contratos novos.'
                : 'Este é o texto original, transcrito do contrato oficial. Ao salvar qualquer alteração, a versão editada passa a valer.'}
              {' '}Contratos já impressos não mudam.
            </p>
          </div>

          <details className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-2xl overflow-hidden">
            <summary className="px-4 py-3 cursor-pointer flex items-center gap-2 text-xs font-black text-blue-800">
              <Info className="h-4 w-4" /> Campos que se preenchem sozinhos — clique para ver a lista
            </summary>
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              {CAMPOS_DISPONIVEIS.map(c => (
                <div key={c.campo} className="flex gap-2 text-[11px] py-0.5">
                  <code className="font-mono font-bold text-blue-700 flex-shrink-0">{c.campo}</code>
                  <span className="text-slate-600">{c.explica}</span>
                </div>
              ))}
            </div>
          </details>

          {carregandoModelo ? (
            <div className="p-12 text-center text-sm font-bold text-slate-400">Carregando o modelo…</div>
          ) : (
            <>
              {clausulasEdit.map((c, ic) => (
                <div key={ic} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <input value={c.titulo} onChange={e => editarTitulo(ic, e.target.value)}
                           className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-sm outline-none" />
                    <button type="button" onClick={() => removerClausula(ic)}
                            className="p-2 text-slate-300 hover:text-rose-600" title="Apagar cláusula inteira">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {c.paragrafos.map((par, ip) => (
                      <div key={ip} className="flex gap-2">
                        <textarea value={par} rows={Math.max(2, Math.ceil(par.length / 110))}
                                  onChange={e => editarParagrafo(ic, ip, e.target.value)}
                                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-[13px] leading-relaxed resize-y" />
                        <button type="button" onClick={() => removerParagrafo(ic, ip)}
                                className="p-2 text-slate-300 hover:text-rose-600 self-start" title="Apagar este parágrafo">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => addParagrafo(ic)}
                          className="mt-2 flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800">
                    <Plus className="h-3 w-3" /> Novo parágrafo
                  </button>
                </div>
              ))}
              <button type="button" onClick={addClausula}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 hover:border-blue-400 text-slate-500 hover:text-blue-600 font-bold rounded-2xl text-xs">
                <Plus className="h-4 w-4" /> Adicionar cláusula ao fim
              </button>
            </>
          )}
        </div>
      )}

      {preview && (
        <ContratoPrintView
          dados={preview.dados}
          clausulas={preview.clausulas}
          tituloDocumento={preview.tituloDocumento}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { DiplomaPrintView } from './DiplomaPrintView';
import {
  MODELOS_DIPLOMA, RESOLUCOES_DIPLOMA, resolucaoSugeridaDiploma,
  cursoPermiteDiploma, VERSO_VAZIO, OBSERVACAO_AUXILIAR, COMPONENTES_INSTRUMENTACAO,
  type TipoDiploma, type VersoDiploma,
} from '../../lib/diplomaTextos';
import { dataPorExtenso, cursoParaDocumento } from '../../lib/supabaseDeclaracoes';
import { Award, Search, X, Lock, Info } from 'lucide-react';

// ===========================================================================
//  DIPLOMAS E CERTIFICADOS — tela
//
//  TUDO SE PREENCHE SOZINHO E TUDO PODE SER EDITADO. Os dados vêm da ficha do
//  aluno e da turma, mas cada campo é uma caixa de texto — inclusive os
//  parágrafos legais. Documento que vai ao conselho às vezes precisa de um
//  ajuste que nenhum cadastro prevê, e a secretaria não pode ficar travada.
//
//  TRAVA POR CURSO: o Certificado de Auxiliar só sai para aluno de
//  Enfermagem, igual à Declaração de Auxiliar.
// ===========================================================================

const campo = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm text-slate-800 dark:text-white';
const rotulo = 'block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1';

export const DiplomasModule: React.FC<{ currentUser?: string }> = () => {
  const { users, classes, courses } = useApp();

  const [busca, setBusca] = useState('');
  const [aluno, setAluno] = useState<any | null>(null);
  const [tipo, setTipo] = useState<TipoDiploma>('DIPLOMA');
  const [verso, setVerso] = useState<VersoDiploma>({ ...VERSO_VAZIO });
  const [imprimirVerso, setImprimirVerso] = useState(true);
  const [preview, setPreview] = useState<any | null>(null);
  // Notas do histórico do verso — só a Especialização Técnica usa.
  const [notasInstr, setNotasInstr] = useState<Record<string, string>>({});
  const [freqInstr, setFreqInstr] = useState('');
  const [faltasInstr, setFaltasInstr] = useState<Record<string, string>>({});

  const modelo = MODELOS_DIPLOMA.find(m => m.tipo === tipo)!;

  // Todos os campos do documento, editáveis.
  const [d, setD] = useState({
    alunoNome: '', filiacao: '', natural: '', uf: '', nascimento: '',
    conclusao: '', cursoNome: '', resolucao: '', cidadeData: '',
    nomeSecretario: 'Yan Neres da Silva',
    nomeDirecao: 'Aldair Maia Santos dos Reis',
    textoLegal: '', linhaConclusao: '', textoFecho: '',
  });

  const alunos = useMemo(() => users.filter(u => u.role === UserRole.STUDENT), [users]);
  const encontrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (t.length < 2) return [];
    return alunos.filter(a => a.name?.toLowerCase().includes(t) ||
      (a.enrollment ?? '').toLowerCase().includes(t)).slice(0, 8);
  }, [alunos, busca]);

  const contexto = (a: any) => {
    const turma = classes.find(c => c.id === a?.classId);
    const curso = courses.find(c => c.id === (turma as any)?.courseId || c.id === (a as any)?.courseId);
    return { turma, curso };
  };
  const { turma: turmaAluno, curso: cursoAluno } = aluno ? contexto(aluno) : { turma: null, curso: null };

  const escolher = (a: any) => {
    setAluno(a); setBusca('');
    const { turma, curso } = contexto(a);
    // O curso sai SEM a modalidade: diploma não traz EAD.
    const nomeCurso = cursoParaDocumento(curso?.name || '');
    setD({
      alunoNome: a.name || '',
      filiacao: [a.fatherName, a.motherName].filter(Boolean).join(' e '),
      natural: a.birthCity || '',
      uf: a.birthState || '',
      nascimento: dataPorExtenso(a.birthDate) || '',
      conclusao: turma?.year && turma?.semester ? `${turma.year}/${turma.semester}` : '',
      cursoNome: tipo === 'CERTIFICADO_AUXILIAR' ? 'AUXILIAR DE ENFERMAGEM' : nomeCurso,
      resolucao: resolucaoSugeridaDiploma(curso?.name),
      cidadeData: `Goiânia, ${dataPorExtenso(new Date().toISOString().split('T')[0])}`,
      nomeSecretario: 'Yan Neres da Silva',
      nomeDirecao: 'Aldair Maia Santos dos Reis',
      textoLegal: modelo.textoLegal,
      linhaConclusao: modelo.linhaConclusao,
      textoFecho: modelo.textoFecho,
    });
    setVerso({
      ...VERSO_VAZIO,
      observacoes: tipo === 'CERTIFICADO_AUXILIAR' ? OBSERVACAO_AUXILIAR : '',
    });
  };

  // Trocar o tipo recarrega os textos legais daquele modelo.
  useEffect(() => {
    setD(v => ({
      ...v,
      textoLegal: modelo.textoLegal,
      linhaConclusao: modelo.linhaConclusao,
      textoFecho: modelo.textoFecho,
      cursoNome: tipo === 'CERTIFICADO_AUXILIAR'
        ? 'AUXILIAR DE ENFERMAGEM'
        : cursoParaDocumento(cursoAluno?.name || ''),
    }));
    setVerso(v => ({
      ...v,
      observacoes: tipo === 'CERTIFICADO_AUXILIAR' ? OBSERVACAO_AUXILIAR : v.observacoes,
    }));
  }, [tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  const liberado = cursoPermiteDiploma(modelo, cursoAluno?.name);

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-4">
          <Award className="h-5 w-5" />
          <h3 className="font-black text-sm">Diplomas e Certificados</h3>
        </div>

        <label className={rotulo}>1. Escolha o aluno</label>
        {aluno ? (
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-2xl flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-black text-sm text-slate-800 dark:text-white truncate">{aluno.name}</p>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                {cursoAluno?.name || 'Sem turma'}
                {turmaAluno?.year ? ` · ${turmaAluno.year}/${turmaAluno.semester}` : ''}
              </p>
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
                    <button key={a.id} type="button" onClick={() => escolher(a)}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-white">{a.name}</p>
                      <p className="text-[11px] text-slate-500">{a.enrollment || 'sem matrícula'}{curso?.name ? ` · ${curso.name}` : ''}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {aluno && (
        <>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <label className={rotulo}>2. Qual documento</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MODELOS_DIPLOMA.map(m => {
                const ok = cursoPermiteDiploma(m, cursoAluno?.name);
                return (
                  <button key={m.tipo} type="button" disabled={!ok}
                          onClick={() => ok && setTipo(m.tipo)}
                          className={`text-left px-4 py-3 rounded-2xl border transition-all ${
                            !ok ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                                : tipo === m.tipo ? 'bg-blue-50 border-blue-400 dark:bg-blue-950/30'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/60'}`}>
                    <p className="font-black text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                      {!ok && <Lock className="h-3 w-3 text-slate-400" />}{m.nome}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      {ok ? m.explica : `Não disponível para ${cursoAluno?.name || 'este aluno'}.`}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] font-semibold text-blue-800 leading-relaxed">
                Tudo abaixo vem preenchido do cadastro e <strong>tudo pode ser corrigido</strong>,
                inclusive os parágrafos legais. O que estiver escrito aqui é o que vai para o papel.
              </p>
            </div>

            <label className={rotulo}>3. Dados do concluinte</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                ['alunoNome', 'Nome do concluinte'], ['filiacao', 'Filiação (pai e mãe)'],
                ['natural', 'Natural de'], ['uf', 'Estado (UF)'],
                ['nascimento', 'Nascido(a) em'], ['conclusao', 'Concluiu em'],
                ['cursoNome', 'Curso / Habilitação'], ['cidadeData', 'Cidade e data'],
                ['nomeSecretario', 'Assinatura — Secretário'], ['nomeDirecao', 'Assinatura — Direção'],
              ] as const).map(([k, t]) => (
                <div key={k}>
                  <label className={rotulo}>{t}</label>
                  <input className={campo} value={(d as any)[k]}
                         onChange={e => setD({ ...d, [k]: e.target.value })} />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className={rotulo}>Resolução citada no texto legal</label>
                <select className={campo + ' mb-2'} value={d.resolucao}
                        onChange={e => setD({ ...d, resolucao: e.target.value })}>
                  {RESOLUCOES_DIPLOMA.map(r => (
                    <option key={r.texto} value={r.texto}>{r.rotulo} — {r.texto}</option>
                  ))}
                </select>
                <input className={campo} value={d.resolucao}
                       onChange={e => setD({ ...d, resolucao: e.target.value })} />
              </div>
            </div>

            <details className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50">
                Textos legais — clique para editar
              </summary>
              <div className="p-4 space-y-3">
                {([
                  ['textoLegal', 'Parágrafo de abertura'],
                  ['linhaConclusao', 'Linha de naturalidade e conclusão'],
                  ['textoFecho', 'Parágrafo de fecho'],
                ] as const).map(([k, t]) => (
                  <div key={k}>
                    <label className={rotulo}>{t}</label>
                    <textarea rows={4} className={campo + ' resize-y text-[13px] leading-relaxed'}
                              value={(d as any)[k]}
                              onChange={e => setD({ ...d, [k]: e.target.value })} />
                  </div>
                ))}
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Campos automáticos disponíveis nos textos:
                  <code className="mx-1 font-mono font-bold text-blue-700">{'{{RESOLUCAO}}'}</code>
                  <code className="mx-1 font-mono font-bold text-blue-700">{'{{NATURAL}}'}</code>
                  <code className="mx-1 font-mono font-bold text-blue-700">{'{{UF}}'}</code>
                  <code className="mx-1 font-mono font-bold text-blue-700">{'{{NASCIMENTO}}'}</code>
                  <code className="mx-1 font-mono font-bold text-blue-700">{'{{CONCLUSAO}}'}</code>
                </p>
              </div>
            </details>

            {tipo === 'CERTIFICADO_ESPECIALIZACAO' && (
              <details className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <summary className="px-4 py-3 cursor-pointer text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50">
                  Histórico do verso — conceitos e frequência
                </summary>
                <div className="p-4 space-y-3">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    A Especialização Técnica traz o histórico no próprio verso, e não em folha
                    separada. Lance o conceito de cada componente (A, B, C ou D).
                  </p>
                  {COMPONENTES_INSTRUMENTACAO.map(c => (
                    <div key={c.nome} className="flex items-center gap-3">
                      <span className="flex-1 text-[12px] text-slate-700 dark:text-slate-200">
                        {c.nome} <span className="text-slate-400">({c.ch}h)</span>
                      </span>
                      <input className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg outline-none text-[12px] text-center font-bold uppercase"
                             placeholder="A" maxLength={2} value={notasInstr[c.nome] ?? ''}
                             onChange={e => setNotasInstr({ ...notasInstr, [c.nome]: e.target.value })} />
                      <input className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg outline-none text-[12px] text-center"
                             placeholder="faltas" maxLength={3} value={faltasInstr[c.nome] ?? ''}
                             onChange={e => setFaltasInstr({ ...faltasInstr, [c.nome]: e.target.value })} />
                    </div>
                  ))}
                  <div>
                    <label className={rotulo}>Frequência</label>
                    <input className={campo} placeholder="99%" value={freqInstr}
                           onChange={e => setFreqInstr(e.target.value)} />
                  </div>
                </div>
              </details>
            )}

            <details className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50">
                {tipo === 'CERTIFICADO_ESPECIALIZACAO'
                  ? 'Registro no verso — número, livro e folha'
                  : 'Verso — curso anterior, registro e observações'}
              </summary>
              <div className="p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={imprimirVerso}
                         onChange={e => setImprimirVerso(e.target.checked)} />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Imprimir o verso junto</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    ['cursoAnterior', 'Curso anterior'], ['unidadeEscolar', 'Unidade escolar'],
                    ['localDataConclusao', 'Local e data de conclusão'], ['registro', 'Registro nº'],
                    ['livro', 'Livro'], ['folha', 'Folha'],
                  ] as const).map(([k, t]) => (
                    <div key={k}>
                      <label className={rotulo}>{t}</label>
                      <input className={campo} value={(verso as any)[k]}
                             onChange={e => setVerso({ ...verso, [k]: e.target.value })} />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label className={rotulo}>Observações</label>
                    <textarea rows={5} className={campo + ' resize-y text-[13px] leading-relaxed'}
                              value={verso.observacoes}
                              onChange={e => setVerso({ ...verso, observacoes: e.target.value })} />
                  </div>
                </div>
              </div>
            </details>

            <button type="button" disabled={!liberado}
                    onClick={() => setPreview({
                      modelo, dados: d, verso, imprimirVerso,
                      notasInstrumentacao: notasInstr, frequenciaInstrumentacao: freqInstr,
                      faltasInstrumentacao: faltasInstr,
                    })}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black rounded-2xl text-xs">
              <Award className="h-4 w-4" /> Gerar {modelo.palavraDocumento}
            </button>
          </div>
        </>
      )}

      {preview && (
        <DiplomaPrintView
          modelo={preview.modelo}
          dados={preview.dados}
          verso={preview.verso}
          imprimirVerso={preview.imprimirVerso}
          notasInstrumentacao={preview.notasInstrumentacao}
          frequenciaInstrumentacao={preview.frequenciaInstrumentacao}
          faltasInstrumentacao={preview.faltasInstrumentacao}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

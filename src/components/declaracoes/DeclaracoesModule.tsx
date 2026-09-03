import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { DeclaracaoPrintView } from './DeclaracaoPrintView';
import { MODELOS_PADRAO, CAMPOS_DECLARACAO } from '../../lib/declaracaoTextos';
import type { ModeloDeclaracao, TipoDeclaracao } from '../../lib/declaracaoTextos';
import {
  carregarModelo, salvarModelo, restaurarModeloPadrao, registrarDeclaracao,
  type DadosDeclaracao,
} from '../../lib/supabaseDeclaracoes';
import {
  FileText, Search, X, Save, RotateCcw, AlertTriangle, CheckCircle2,
  Pencil, Plus, Trash2, Info, Stamp,
} from 'lucide-react';

// ===========================================================================
//  DECLARAÇÕES — gerar e editar
//
//  CINCO MODELOS, TODOS EDITÁVEIS:
//  Conclusão, Auxiliar de Enfermagem, Escolaridade, SETRANSP e Vacina.
//  Os três últimos são os mesmos que o aluno emite sozinho pelo painel dele.
//
//  DE ONDE VÊM OS DADOS:
//  Nome, matrícula, filiação, nascimento e naturalidade saem da ficha do
//  aluno. Curso, módulo e turno saem da turma em que ele está matriculado.
//  O que não existe em lugar nenhum do cadastro — a data em que concluiu o
//  curso, por exemplo — aparece como caixa para preencher à mão, porque
//  inventar data em declaração assinada não é opção.
// ===========================================================================

const campo = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm text-slate-800 dark:text-white';
const rotulo = 'block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1';

const hoje = () => new Date().toISOString().split('T')[0];

interface Props {
  currentUser?: string;
}

export const DeclaracoesModule: React.FC<Props> = ({ currentUser = 'Administração' }) => {
  const { users, classes, courses } = useApp();

  const [aba, setAba] = useState<'gerar' | 'modelos'>('gerar');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const mostrar = (tipo: 'ok' | 'erro', texto: string) => {
    setAviso({ tipo, texto });
    window.setTimeout(() => setAviso(null), 6000);
  };

  // ------------------------------------------------------------- GERAR
  const [busca, setBusca] = useState('');
  const [aluno, setAluno] = useState<any | null>(null);
  const [tipo, setTipo] = useState<TipoDeclaracao>('CONCLUSAO');
  const [manuais, setManuais] = useState<Record<string, string>>({});
  const [dataEmissao, setDataEmissao] = useState(hoje());
  const [gerando, setGerando] = useState(false);
  const [preview, setPreview] = useState<{ modelo: ModeloDeclaracao; dados: DadosDeclaracao } | null>(null);

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

  const { turma: turmaAluno, curso: cursoAluno } = aluno ? contexto(aluno) : { turma: null, curso: null };

  const modeloEscolhido = MODELOS_PADRAO.find(m => m.tipo === tipo)!;

  // Trocar o tipo limpa os campos manuais do tipo anterior.
  useEffect(() => { setManuais({}); }, [tipo]);

  const montarDados = (): DadosDeclaracao => ({
    alunoId: aluno?.id,
    alunoNome: aluno?.name || '',
    matricula: aluno?.enrollment || aluno?.username || '',
    cursoNome: cursoAluno?.name || '',
    modulo: turmaAluno?.module ? String(turmaAluno.module) : '',
    turno: (turmaAluno as any)?.shift || '',
    nomeMae: aluno?.motherName || '',
    nomePai: aluno?.fatherName || '',
    dataNascimento: aluno?.birthDate || '',
    cidadeNascimento: aluno?.birthCity || '',
    ufNascimento: aluno?.birthState || '',
    cpf: aluno?.cpf || '',
    rg: aluno?.rg || '',
    manuais,
    dataEmissao,
  });

  /** Avisa o que está faltando ANTES de imprimir, não depois. */
  const pendencias = useMemo(() => {
    if (!aluno) return [];
    const d = montarDados();
    const faltas: string[] = [];
    const usados = modeloEscolhido.paragrafos.join(' ');
    if (usados.includes('{{CURSO}}') && !d.cursoNome) faltas.push('curso (o aluno não tem turma)');
    if (usados.includes('{{FILIACAO}}') && !d.nomeMae && !d.nomePai) faltas.push('filiação (pai e mãe na ficha)');
    if (usados.includes('{{NASCIMENTO}}') && !d.dataNascimento) faltas.push('data de nascimento');
    if (usados.includes('{{NATURALIDADE}}') && !d.cidadeNascimento) faltas.push('naturalidade');
    if (usados.includes('{{MATRICULA}}') && !d.matricula) faltas.push('matrícula');
    for (const cm of modeloEscolhido.camposManuais ?? []) {
      if (usados.includes(`{{${cm.chave}}}`) && !manuais[cm.chave]) faltas.push(cm.rotulo.toLowerCase());
    }
    return faltas;
  }, [aluno, tipo, manuais, cursoAluno, turmaAluno]); // eslint-disable-line react-hooks/exhaustive-deps

  const gerar = async () => {
    if (!aluno) return;
    setGerando(true);
    const { modelo } = await carregarModelo(tipo);
    const dados = montarDados();
    setPreview({ modelo, dados });
    void registrarDeclaracao(tipo, dados, currentUser);
    setGerando(false);
  };

  // ----------------------------------------------------------- MODELOS
  const [tipoEdit, setTipoEdit] = useState<TipoDeclaracao>('CONCLUSAO');
  const [modeloEdit, setModeloEdit] = useState<ModeloDeclaracao | null>(null);
  const [editado, setEditado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = async (t: TipoDeclaracao) => {
    setCarregando(true);
    const { modelo, editado: ed } = await carregarModelo(t);
    setModeloEdit(modelo);
    setEditado(ed);
    setCarregando(false);
  };

  useEffect(() => {
    if (aba === 'modelos') void carregar(tipoEdit);
  }, [aba, tipoEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async () => {
    if (!modeloEdit) return;
    setSalvando(true);
    const { erro } = await salvarModelo(modeloEdit, currentUser);
    setSalvando(false);
    if (erro) { mostrar('erro', erro); return; }
    setEditado(true);
    mostrar('ok', 'Modelo salvo. Toda declaração nova deste tipo sai com este texto.');
  };

  const voltarPadrao = async () => {
    if (!window.confirm('Descartar as edições e voltar ao texto original desta declaração?')) return;
    const { erro } = await restaurarModeloPadrao(tipoEdit);
    if (erro) { mostrar('erro', erro); return; }
    await carregar(tipoEdit);
    mostrar('ok', 'Texto original restaurado.');
  };

  // ============================================================ RENDER

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
          <Stamp className="h-5 w-5" />
          <h3 className="font-black text-sm">Declarações</h3>
        </div>
        <div className="flex gap-2">
          {([
            { id: 'gerar', rotulo: 'Gerar Declaração', icone: FileText },
            { id: 'modelos', rotulo: 'Editar Modelos', icone: Pencil },
          ] as const).map(t => {
            const Icone = t.icone;
            const ativa = aba === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setAba(t.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs transition-all ${
                        ativa ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100'}`}>
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
              <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-2xl flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-sm text-slate-800 dark:text-white truncate">{aluno.name}</p>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                    {aluno.enrollment ? `Matrícula ${aluno.enrollment}` : 'Sem matrícula'}
                    {cursoAluno?.name ? ` · ${cursoAluno.name}` : ' · Sem turma'}
                    {turmaAluno?.module ? ` · ${turmaAluno.module}º módulo` : ''}
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
                      const { turma, curso } = contexto(a);
                      return (
                        <button key={a.id} type="button"
                                onClick={() => { setAluno(a); setBusca(''); }}
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

          {aluno && (
            <>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <label className={rotulo}>2. Qual declaração</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODELOS_PADRAO.map(m => (
                    <button key={m.tipo} type="button" onClick={() => setTipo(m.tipo)}
                            className={`text-left px-4 py-3 rounded-2xl border transition-all ${
                              tipo === m.tipo
                                ? 'bg-blue-50 border-blue-400 dark:bg-blue-950/30'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/60 dark:border-slate-750'}`}>
                      <p className="font-black text-xs text-slate-800 dark:text-white">{m.nome}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{m.explica}</p>
                    </button>
                  ))}
                </div>

                {(modeloEscolhido.camposManuais?.length ?? 0) > 0 && (
                  <>
                    <label className={rotulo}>3. Preencha o que não está no cadastro</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {modeloEscolhido.camposManuais!.map(cm => (
                        <div key={cm.chave}>
                          <label className={rotulo}>{cm.rotulo}</label>
                          <input
                            type={cm.tipo === 'data' ? 'date' : 'text'}
                            className={campo}
                            value={manuais[cm.chave] ?? ''}
                            onChange={e => setManuais({ ...manuais, [cm.chave]: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div>
                  <label className={rotulo}>Data de emissão</label>
                  <input type="date" className={campo} value={dataEmissao}
                         onChange={e => setDataEmissao(e.target.value)} />
                </div>

                {pendencias.length > 0 && (
                  <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-[11px] font-bold text-amber-800 leading-relaxed">
                      Esta declaração usa dados que estão faltando: {pendencias.join(', ')}.
                      Onde faltar, sai uma linha em branco para preencher à mão. Se preferir o documento
                      completo, complete a ficha do aluno antes.
                    </div>
                  </div>
                )}

                <button type="button" onClick={() => void gerar()} disabled={gerando}
                        className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black rounded-2xl text-xs">
                  <FileText className="h-4 w-4" /> {gerando ? 'Montando…' : 'Gerar Declaração'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- MODELOS */}
      {aba === 'modelos' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <label className={rotulo}>Qual modelo editar</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {MODELOS_PADRAO.map(m => (
                <button key={m.tipo} type="button" onClick={() => setTipoEdit(m.tipo)}
                        className={`text-left px-4 py-2.5 rounded-2xl border text-xs font-black transition-all ${
                          tipoEdit === m.tipo
                            ? 'bg-blue-50 border-blue-400 text-blue-800 dark:bg-blue-950/30'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                  {m.nome}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-[11px] font-semibold text-slate-500 leading-relaxed max-w-xl">
                {editado
                  ? 'Este modelo já foi editado. É este texto que sai nas declarações novas.'
                  : 'Este é o texto original. Ao salvar qualquer alteração, a versão editada passa a valer.'}
              </p>
              <div className="flex items-center gap-2">
                {editado && (
                  <button type="button" onClick={() => void voltarPadrao()}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-[11px]">
                    <RotateCcw className="h-3.5 w-3.5" /> Voltar ao original
                  </button>
                )}
                <button type="button" onClick={() => void salvar()} disabled={salvando || !modeloEdit}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black rounded-xl text-xs">
                  <Save className="h-3.5 w-3.5" /> {salvando ? 'Salvando…' : 'Salvar Modelo'}
                </button>
              </div>
            </div>
          </div>

          <details className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-2xl overflow-hidden">
            <summary className="px-4 py-3 cursor-pointer flex items-center gap-2 text-xs font-black text-blue-800">
              <Info className="h-4 w-4" /> Campos que se preenchem sozinhos — clique para ver
            </summary>
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              {CAMPOS_DECLARACAO.map(c => (
                <div key={c.campo} className="flex gap-2 text-[11px] py-0.5">
                  <code className="font-mono font-bold text-blue-700 flex-shrink-0">{c.campo}</code>
                  <span className="text-slate-600">{c.explica}</span>
                </div>
              ))}
              {(MODELOS_PADRAO.find(m => m.tipo === tipoEdit)?.camposManuais ?? []).map(cm => (
                <div key={cm.chave} className="flex gap-2 text-[11px] py-0.5">
                  <code className="font-mono font-bold text-amber-700 flex-shrink-0">{`{{${cm.chave}}}`}</code>
                  <span className="text-slate-600">{cm.rotulo} — preenchido à mão</span>
                </div>
              ))}
            </div>
          </details>

          {carregando || !modeloEdit ? (
            <div className="p-12 text-center text-sm font-bold text-slate-400">Carregando o modelo…</div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <label className={rotulo}>Título impresso na folha</label>
                <input className={campo} value={modeloEdit.titulo}
                       onChange={e => setModeloEdit({ ...modeloEdit, titulo: e.target.value })} />
              </div>

              <div>
                <label className={rotulo}>Texto da declaração</label>
                <div className="space-y-2">
                  {modeloEdit.paragrafos.map((par, i) => (
                    <div key={i} className="flex gap-2">
                      <textarea
                        value={par}
                        rows={Math.max(3, Math.ceil(par.length / 90))}
                        onChange={e => {
                          const ps = [...modeloEdit.paragrafos];
                          ps[i] = e.target.value;
                          setModeloEdit({ ...modeloEdit, paragrafos: ps });
                        }}
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-[13px] leading-relaxed resize-y"
                      />
                      <button type="button"
                              onClick={() => setModeloEdit({ ...modeloEdit, paragrafos: modeloEdit.paragrafos.filter((_, j) => j !== i) })}
                              className="p-2 text-slate-300 hover:text-rose-600 self-start">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button"
                        onClick={() => setModeloEdit({ ...modeloEdit, paragrafos: [...modeloEdit.paragrafos, ''] })}
                        className="mt-2 flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800">
                  <Plus className="h-3 w-3" /> Novo parágrafo
                </button>
              </div>

              <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={modeloEdit.mostrarAssinatura}
                         onChange={e => setModeloEdit({ ...modeloEdit, mostrarAssinatura: e.target.checked })} />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Assinatura do secretário</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={modeloEdit.mostrarRodape}
                         onChange={e => setModeloEdit({ ...modeloEdit, mostrarRodape: e.target.checked })} />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Rodapé com endereço</span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {preview && (
        <DeclaracaoPrintView
          modelo={preview.modelo}
          dados={preview.dados}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

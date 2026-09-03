import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { FichaEstagioPrintView } from './FichaEstagioPrintView';
import {
  carregarEstagiosDoAluno, salvarRegistroSupervisor, carregarConfig, salvarConfig,
  mediaGeral, formatarNota, nivelDaMedia, CONFIG_PADRAO, resolucaoSugerida,
  type ComponenteEstagio, type ConfigFicha,
} from '../../lib/supabaseFichaEstagio';
import {
  ClipboardList, Search, X, Save, AlertTriangle, CheckCircle2,
  Settings2, RefreshCw, Info,
} from 'lucide-react';

// ===========================================================================
//  FICHA GERAL DE ESTÁGIO — tela
//
//  Busca o aluno, carrega os estágios que ele já tem lançados no módulo de
//  Estágios e monta o resumo. Nada de nota é digitado aqui: a nota continua
//  sendo lançada onde sempre foi. Esta tela só junta, calcula a média geral
//  e imprime.
//
//  O único campo editável por linha é o REGISTRO do supervisor no conselho
//  (COREN, CRTR...), porque ele aparece na ficha impressa e não existia no
//  cadastro de estágio.
// ===========================================================================

const campo = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm text-slate-800 dark:text-white';
const rotulo = 'block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1';

interface Props {
  currentUser?: string;
}

export const FichaEstagioModule: React.FC<Props> = () => {
  const { users, classes, courses } = useApp();

  const [busca, setBusca] = useState('');
  const [aluno, setAluno] = useState<any | null>(null);
  const [componentes, setComponentes] = useState<ComponenteEstagio[]>([]);
  const [config, setConfig] = useState<ConfigFicha>(CONFIG_PADRAO);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [imprimir, setImprimir] = useState(false);

  const mostrar = (tipo: 'ok' | 'erro', texto: string) => {
    setAviso({ tipo, texto });
    window.setTimeout(() => setAviso(null), 6000);
  };

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

  const escolher = async (a: any) => {
    setAluno(a);
    setBusca('');
    setCarregando(true);
    setErro(null);

    const { curso } = contexto(a);
    const [res, cfg] = await Promise.all([
      carregarEstagiosDoAluno(a.id),
      carregarConfig(curso?.id, curso?.name),
    ]);
    setComponentes(res.componentes);
    setErro(res.erro ?? null);
    setConfig(cfg);
    setCarregando(false);
  };

  const recarregar = async () => {
    if (aluno) await escolher(aluno);
  };

  const editarRegistro = (i: number, valor: string) => {
    const copia = [...componentes];
    copia[i] = { ...copia[i], supervisorRegistro: valor };
    setComponentes(copia);
  };

  const gravarRegistro = async (c: ComponenteEstagio) => {
    if (!aluno) return;
    const { erro: e } = await salvarRegistroSupervisor(aluno.id, c.componente, c.supervisorRegistro);
    if (e) { mostrar('erro', e); return; }
    mostrar('ok', 'Registro do supervisor salvo.');
  };

  const gravarConfig = async () => {
    if (!cursoAluno?.id) { mostrar('erro', 'O aluno precisa ter um curso para salvar a configuração.'); return; }
    const { erro: e } = await salvarConfig(cursoAluno.id, config);
    if (e) { mostrar('erro', e); return; }
    mostrar('ok', 'Configuração salva para este curso.');
  };

  const media = mediaGeral(componentes);
  const semNota = componentes.filter(c => c.nota === null).length;

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

      {erro && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <span className="text-xs font-bold text-amber-800 leading-relaxed">{erro}</span>
        </div>
      )}

      {/* Busca */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-4">
          <ClipboardList className="h-5 w-5" />
          <h3 className="font-black text-sm">Ficha Geral de Estágio</h3>
        </div>

        <label className={rotulo}>Escolha o aluno</label>
        {aluno ? (
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-2xl flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-black text-sm text-slate-800 dark:text-white truncate">{aluno.name}</p>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                {aluno.enrollment ? `Matrícula ${aluno.enrollment}` : 'Sem matrícula'}
                {cursoAluno?.name ? ` · ${cursoAluno.name}` : ' · Sem turma'}
                {` · ${componentes.length} estágio${componentes.length === 1 ? '' : 's'} lançado${componentes.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => void recarregar()}
                      className="p-2 text-slate-400 hover:text-blue-600" title="Recarregar do banco">
                <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
              </button>
              <button type="button" onClick={() => { setAluno(null); setComponentes([]); }}
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
                     placeholder="Digite o nome ou a matrícula do aluno" className={campo + ' pl-9'} />
            </div>
            {encontrados.length > 0 && (
              <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                {encontrados.map(a => {
                  const { curso } = contexto(a);
                  return (
                    <button key={a.id} type="button" onClick={() => void escolher(a)}
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
            {busca.trim().length >= 2 && encontrados.length === 0 && (
              <p className="mt-2 text-[11px] font-bold text-slate-400">Nenhum aluno encontrado.</p>
            )}
          </>
        )}
      </div>

      {aluno && !carregando && (
        <>
          <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] font-semibold text-blue-800 leading-relaxed">
              As cinco colunas de nota da ficha repetem a mesma nota lançada no módulo de Estágios.
              O sistema não recalcula nota de componente. A única conta feita é a
              <strong> média geral</strong>, abaixo.
            </p>
          </div>

          {componentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center">
              <ClipboardList className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-500">
                Este aluno ainda não tem estágio lançado. Lance em Movimentação → Estágios e volte aqui.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60">
                      <tr>
                        {['Componente', 'C.H.', 'Unidade médica', 'Nota', 'Supervisor', 'Registro (COREN, CRTR…)'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-black text-[10px] uppercase tracking-wider text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {componentes.map((c, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{c.componente}</td>
                          <td className="px-3 py-2 text-slate-500">{c.cargaHoraria || '—'}</td>
                          <td className="px-3 py-2 text-slate-500">{c.local || '—'}</td>
                          <td className={`px-3 py-2 font-mono font-black ${c.nota === null ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
                            {formatarNota(c.nota)}
                          </td>
                          <td className="px-3 py-2 text-slate-500">{c.supervisor || '—'}</td>
                          <td className="px-3 py-2">
                            <input
                              value={c.supervisorRegistro}
                              onChange={e => editarRegistro(i, e.target.value)}
                              onBlur={() => void gravarRegistro(c)}
                              placeholder="COREN: 000.000"
                              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg outline-none text-[11px]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Média geral: <span className="font-mono text-base text-blue-700">{formatarNota(media)}</span>
                    {media !== null && <> · {nivelDaMedia(media)} · {media >= config.mediaParaAprovar ? 'APTO' : 'NÃO APTO'}</>}
                    {semNota > 0 && (
                      <span className="text-rose-600"> · {semNota} sem nota, fora do cálculo</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setMostrarConfig(!mostrarConfig)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-[11px]">
                      <Settings2 className="h-3.5 w-3.5" /> Cabeçalho e vistos
                    </button>
                    <button type="button" onClick={() => setImprimir(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs">
                      <ClipboardList className="h-4 w-4" /> Gerar Ficha
                    </button>
                  </div>
                </div>
              </div>

              {mostrarConfig && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                    Vale para todo o curso <strong>{cursoAluno?.name || '—'}</strong>. A resolução do cabeçalho muda
                    de curso para curso: Enfermagem usa a CEE/GO nº 018/2022, Radiologia usa a CEE 041/2022.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className={rotulo}>Resolução no cabeçalho</label>
                      <input className={campo} value={config.resolucao}
                             onChange={e => setConfig({ ...config, resolucao: e.target.value })} />
                    </div>
                    {([
                      ['nomeSecretario', 'Nome — Secretaria'], ['cargoSecretario', 'Cargo — Secretaria'],
                      ['nomeCoordenacao', 'Nome — Coordenação'], ['cargoCoordenacao', 'Cargo — Coordenação'],
                      ['nomeDirecao', 'Nome — Direção'], ['cargoDirecao', 'Cargo — Direção'],
                    ] as const).map(([k, t]) => (
                      <div key={k}>
                        <label className={rotulo}>{t}</label>
                        <input className={campo} value={(config as any)[k]}
                               onChange={e => setConfig({ ...config, [k]: e.target.value } as ConfigFicha)} />
                      </div>
                    ))}
                    <div>
                      <label className={rotulo}>Média mínima para APTO</label>
                      <input type="number" step="0.1" min={0} max={10} className={campo}
                             value={config.mediaParaAprovar}
                             onChange={e => setConfig({ ...config, mediaParaAprovar: Number(e.target.value) })} />
                    </div>
                    <div className="flex items-end gap-2">
                      <button type="button" onClick={() => void gravarConfig()}
                              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs">
                        <Save className="h-3.5 w-3.5" /> Salvar
                      </button>
                      <button type="button"
                              onClick={() => setConfig({ ...CONFIG_PADRAO, resolucao: resolucaoSugerida(cursoAluno?.name) })}
                              className="px-3 py-2 text-slate-500 font-bold text-[11px] hover:text-slate-800">
                        Voltar ao padrão
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {imprimir && aluno && (
        <FichaEstagioPrintView
          alunoNome={aluno.name}
          cursoNome={cursoAluno?.name || ''}
          componentes={componentes}
          config={config}
          onClose={() => setImprimir(false)}
        />
      )}
    </div>
  );
};

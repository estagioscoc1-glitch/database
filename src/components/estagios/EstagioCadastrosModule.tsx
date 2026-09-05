import React, { useState, useEffect } from 'react';
import {
  listarSupervisores, salvarSupervisor, apagarSupervisor,
  listarLocais, salvarLocal, apagarLocal,
  listarCatalogo, salvarCatalogo, formatarDinheiro,
  TIPOS_LOCAL, CURSOS_ESTAGIO,
  type Supervisor, type LocalEstagio, type EstagioCatalogo,
} from '../../lib/supabaseEstagioModulo';
import {
  UserCog, Building2, ListChecks, Plus, Trash2, Save, X,
  AlertTriangle, CheckCircle2, RefreshCw, Search, Info,
} from 'lucide-react';

// ===========================================================================
//  ESTÁGIO — CADASTROS
//
//  Três cadastros que sustentam o resto do módulo:
//   · Supervisores — os professores que acompanham o estágio, com os dados
//     bancários para o pagamento e o registro no conselho, que sai na ficha.
//   · Locais — hospitais, clínicas e unidades conveniadas.
//   · Catálogo — os 16 estágios da escola, com carga horária e o valor que o
//     supervisor recebe POR ALUNO.
//
//  TUDO GRAVA NO BANCO. Não confundir com a tela antiga de Estágios dentro de
//  Movimentação, que guarda no navegador e por isso não é vista por mais
//  ninguém.
// ===========================================================================

const campo = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm text-slate-800 dark:text-white';
const rotulo = 'block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1';

export const EstagioCadastrosModule: React.FC<{ currentUser?: string }> = () => {
  const [aba, setAba] = useState<'supervisores' | 'locais' | 'catalogo'>('supervisores');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [locais, setLocais] = useState<LocalEstagio[]>([]);
  const [catalogo, setCatalogo] = useState<EstagioCatalogo[]>([]);

  const [supEdit, setSupEdit] = useState<Supervisor | null>(null);
  const [localEdit, setLocalEdit] = useState<LocalEstagio | null>(null);
  const [busca, setBusca] = useState('');

  const mostrar = (tipo: 'ok' | 'erro', texto: string) => {
    setAviso({ tipo, texto });
    window.setTimeout(() => setAviso(null), 6000);
  };

  const recarregar = async () => {
    setCarregando(true);
    const [s, l, c] = await Promise.all([listarSupervisores(), listarLocais(), listarCatalogo()]);
    setSupervisores(s.lista); setLocais(l.lista); setCatalogo(c.lista);
    setErro(s.erro || l.erro || c.erro || null);
    setCarregando(false);
  };
  useEffect(() => { void recarregar(); }, []);

  const filtra = (t?: string) => (t || '').toLowerCase().includes(busca.trim().toLowerCase());

  // --------------------------------------------------------------- ações
  const gravarSup = async () => {
    if (!supEdit?.nome.trim()) return;
    const { erro: e } = await salvarSupervisor(supEdit);
    if (e) { mostrar('erro', e); return; }
    mostrar('ok', 'Supervisor salvo.');
    setSupEdit(null); void recarregar();
  };

  const gravarLocal = async () => {
    if (!localEdit?.nome.trim()) return;
    const { erro: e } = await salvarLocal(localEdit);
    if (e) { mostrar('erro', e); return; }
    mostrar('ok', 'Local salvo.');
    setLocalEdit(null); void recarregar();
  };

  const gravarCatalogo = async (c: EstagioCatalogo) => {
    const { erro: e } = await salvarCatalogo(c);
    if (e) { mostrar('erro', e); return; }
    mostrar('ok', `${c.componente} salvo.`);
    void recarregar();
  };

  const semPreco = catalogo.filter(c => !c.valorPorAluno).length;

  return (
    <div className="space-y-5">

      {aviso && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-2xl border text-xs font-bold ${
          aviso.tipo === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
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

      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <ListChecks className="h-5 w-5" />
            <h3 className="font-black text-sm">Estágio — Cadastros</h3>
          </div>
          <button type="button" onClick={() => void recarregar()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-[11px]">
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto whitespace-nowrap">
          {([
            { id: 'supervisores', rotulo: `Supervisores (${supervisores.length})`, icone: UserCog },
            { id: 'locais', rotulo: `Locais (${locais.length})`, icone: Building2 },
            { id: 'catalogo', rotulo: `Estágios e Preços (${catalogo.length})`, icone: ListChecks },
          ] as const).map(t => {
            const Icone = t.icone; const ativa = aba === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setAba(t.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs transition-all ${
                        ativa ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 hover:bg-slate-100'}`}>
                <Icone className={`h-4 w-4 ${ativa ? 'text-white' : 'text-blue-600'}`} /> {t.rotulo}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------ SUPERVISORES */}
      {aba === 'supervisores' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className={campo + ' pl-9'} placeholder="Buscar supervisor"
                     value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <button type="button"
                    onClick={() => setSupEdit({ nome: '', ativo: true })}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs">
              <Plus className="h-4 w-4" /> Novo Supervisor
            </button>
          </div>

          {supEdit && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-blue-300 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={rotulo}>Nome completo</label>
                  <input className={campo} value={supEdit.nome}
                         onChange={e => setSupEdit({ ...supEdit, nome: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo}>CPF</label>
                  <input className={campo} value={supEdit.cpf ?? ''}
                         onChange={e => setSupEdit({ ...supEdit, cpf: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo}>Conselho</label>
                  <input className={campo} placeholder="COREN, CRTR, CREA"
                         value={supEdit.conselho ?? ''}
                         onChange={e => setSupEdit({ ...supEdit, conselho: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo}>Registro</label>
                  <input className={campo} placeholder="161538" value={supEdit.registro ?? ''}
                         onChange={e => setSupEdit({ ...supEdit, registro: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo}>Telefone</label>
                  <input className={campo} value={supEdit.telefone ?? ''}
                         onChange={e => setSupEdit({ ...supEdit, telefone: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={rotulo}>E-mail (será o login)</label>
                  <input className={campo} value={supEdit.email ?? ''}
                         onChange={e => setSupEdit({ ...supEdit, email: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo}>Chave PIX</label>
                  <input className={campo} value={supEdit.chavePix ?? ''}
                         onChange={e => setSupEdit({ ...supEdit, chavePix: e.target.value })} />
                </div>
                <div className="sm:col-span-3">
                  <label className={rotulo}>Endereço</label>
                  <input className={campo} value={supEdit.endereco ?? ''}
                         onChange={e => setSupEdit({ ...supEdit, endereco: e.target.value })} />
                </div>
                {([['banco', 'Banco'], ['agencia', 'Agência'], ['conta', 'Conta']] as const).map(([k, t]) => (
                  <div key={k}>
                    <label className={rotulo}>{t}</label>
                    <input className={campo} value={(supEdit as any)[k] ?? ''}
                           onChange={e => setSupEdit({ ...supEdit, [k]: e.target.value } as Supervisor)} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => void gravarSup()} disabled={!supEdit.nome.trim()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black rounded-xl text-xs">
                  <Save className="h-4 w-4" /> Salvar
                </button>
                <button type="button" onClick={() => setSupEdit(null)}
                        className="px-4 py-2.5 text-slate-500 font-bold text-xs">Cancelar</button>
              </div>
            </div>
          )}

          {supervisores.filter(s => filtra(s.nome)).map(s => (
            <div key={s.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black text-sm text-slate-800 dark:text-white">{s.nome}</p>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                  {s.conselho && s.registro ? `${s.conselho} ${s.registro}` : 'Sem registro no conselho'}
                  {s.telefone ? ` · ${s.telefone}` : ''}
                  {s.email ? ` · ${s.email}` : ''}
                </p>
                {!s.usuarioId && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black">
                    Sem login criado
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setSupEdit(s)}
                        className="px-3 py-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-xl">Editar</button>
                <button type="button"
                        onClick={async () => {
                          if (!window.confirm(`Apagar ${s.nome}? As vagas antigas dele continuam registradas.`)) return;
                          const { erro: e } = await apagarSupervisor(s.id!);
                          if (e) { mostrar('erro', e); return; }
                          void recarregar();
                        }}
                        className="p-2 text-slate-300 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {supervisores.length === 0 && !carregando && (
            <div className="p-12 text-center text-sm font-bold text-slate-400">
              Nenhum supervisor cadastrado ainda.
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------- LOCAIS */}
      {aba === 'locais' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className={campo + ' pl-9'} placeholder="Buscar local"
                     value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <button type="button" onClick={() => setLocalEdit({ nome: '', ativo: true })}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs">
              <Plus className="h-4 w-4" /> Novo Local
            </button>
          </div>

          {localEdit && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-blue-300 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={rotulo}>Nome</label>
                  <input className={campo} value={localEdit.nome}
                         onChange={e => setLocalEdit({ ...localEdit, nome: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo}>Tipo</label>
                  <select className={campo} value={localEdit.tipo ?? ''}
                          onChange={e => setLocalEdit({ ...localEdit, tipo: e.target.value })}>
                    <option value="">Escolha…</option>
                    {TIPOS_LOCAL.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={rotulo}>Endereço</label>
                  <input className={campo} value={localEdit.endereco ?? ''}
                         onChange={e => setLocalEdit({ ...localEdit, endereco: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo}>Bairro</label>
                  <input className={campo} value={localEdit.bairro ?? ''}
                         onChange={e => setLocalEdit({ ...localEdit, bairro: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo}>Telefone</label>
                  <input className={campo} value={localEdit.telefone ?? ''}
                         onChange={e => setLocalEdit({ ...localEdit, telefone: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo}>Responsável</label>
                  <input className={campo} value={localEdit.responsavel ?? ''}
                         onChange={e => setLocalEdit({ ...localEdit, responsavel: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo}>Capacidade (alunos)</label>
                  <input type="number" min={0} className={campo} value={localEdit.capacidade ?? ''}
                         onChange={e => setLocalEdit({ ...localEdit, capacidade: e.target.value === '' ? undefined : Number(e.target.value) })} />
                </div>
                <div>
                  <label className={rotulo}>Convênio válido até</label>
                  <input type="date" className={campo} value={localEdit.convenioAte ?? ''}
                         onChange={e => setLocalEdit({ ...localEdit, convenioAte: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => void gravarLocal()} disabled={!localEdit.nome.trim()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black rounded-xl text-xs">
                  <Save className="h-4 w-4" /> Salvar
                </button>
                <button type="button" onClick={() => setLocalEdit(null)}
                        className="px-4 py-2.5 text-slate-500 font-bold text-xs">Cancelar</button>
              </div>
            </div>
          )}

          {locais.filter(l => filtra(l.nome)).map(l => (
            <div key={l.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black text-sm text-slate-800 dark:text-white">{l.nome}</p>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                  {l.tipo || 'Sem tipo'}{l.bairro ? ` · ${l.bairro}` : ''}
                  {l.capacidade ? ` · até ${l.capacidade} alunos` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setLocalEdit(l)}
                        className="px-3 py-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-xl">Editar</button>
                <button type="button"
                        onClick={async () => {
                          if (!window.confirm(`Apagar ${l.nome}?`)) return;
                          const { erro: e } = await apagarLocal(l.id!);
                          if (e) { mostrar('erro', e); return; }
                          void recarregar();
                        }}
                        className="p-2 text-slate-300 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {locais.length === 0 && !carregando && (
            <div className="p-12 text-center text-sm font-bold text-slate-400">
              Nenhum local conveniado cadastrado ainda.
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------- CATÁLOGO */}
      {aba === 'catalogo' && (
        <div className="space-y-4">
          {semPreco > 0 && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                {semPreco} de {catalogo.length} estágios estão sem preço. Sem ele, o relatório de
                pagamento e o recibo do supervisor saem zerados. Preencha o valor que o supervisor
                recebe <strong>por aluno</strong> em cada um.
              </p>
            </div>
          )}

          {CURSOS_ESTAGIO.map(curso => {
            const doCurso = catalogo.filter(c => c.curso === curso);
            if (doCurso.length === 0) return null;
            return (
              <div key={curso} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 font-black text-xs text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  {curso} · {doCurso.length} estágios
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="px-4 py-2 text-left font-black text-[10px] uppercase text-slate-500">Componente</th>
                      <th className="px-4 py-2 text-center font-black text-[10px] uppercase text-slate-500 w-24">C.H.</th>
                      <th className="px-4 py-2 text-center font-black text-[10px] uppercase text-slate-500 w-40">Valor por aluno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doCurso.map(c => (
                      <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">{c.componente}</td>
                        <td className="px-4 py-2 text-center">
                          <input type="number" min={0}
                                 className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg outline-none text-center text-[11px]"
                                 value={c.cargaHoraria}
                                 onChange={e => setCatalogo(catalogo.map(x => x.id === c.id ? { ...x, cargaHoraria: Number(e.target.value) } : x))}
                                 onBlur={() => void gravarCatalogo(c)} />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input type="number" min={0} step="0.01"
                                 className={`w-28 px-2 py-1 border rounded-lg outline-none text-center text-[11px] font-bold ${
                                   c.valorPorAluno ? 'bg-slate-50 dark:bg-slate-850 border-slate-200'
                                                   : 'bg-amber-50 border-amber-300'}`}
                                 value={c.valorPorAluno}
                                 onChange={e => setCatalogo(catalogo.map(x => x.id === c.id ? { ...x, valorPorAluno: Number(e.target.value) } : x))}
                                 onBlur={() => void gravarCatalogo(c)} />
                          {c.valorPorAluno > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{formatarDinheiro(c.valorPorAluno)}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {catalogo.length === 0 && !carregando && (
            <div className="p-12 text-center text-sm font-bold text-slate-400">
              Catálogo vazio. Rode supabase/24_estagios_modulo.sql no Supabase.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  listarTodosAditivos, criarAditivo, ativarDesativarAditivo, listarAssinantesDoAditivo,
  type Aditivo,
} from '../../lib/supabaseAditivos';
import { FileSignature, Plus, Users, Power, Printer, Search } from 'lucide-react';
import { AditivoPrintView } from './AditivoPrintView';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

// ===========================================================================
//  ADITIVO DE CONTRATO — tela do admin
//
//  O admin escreve o texto que quiser aqui, e ele passa a aparecer para
//  TODOS os alunos no painel deles, pedindo assinatura — um clique de
//  "Li e concordo", não uma assinatura desenhada. Um aditivo pode ser
//  desativado a qualquer momento; desativar não apaga quem já assinou.
// ===========================================================================

interface Props {
  currentUser: string;
}

export const AditivosContratoModule: React.FC<Props> = ({ currentUser }) => {
  const { users } = useApp();
  const alunos = users.filter(u => u.role === UserRole.STUDENT);

  /* PARA QUEM O ADITIVO VALE — todos os alunos (padrão) ou um só. */
  const [paraTodos, setParaTodos] = useState(true);
  const [buscaAluno, setBuscaAluno] = useState('');
  const [alunoEscolhido, setAlunoEscolhido] = useState<any | null>(null);
  const encontrados = buscaAluno.trim().length >= 2
    ? alunos.filter(a => a.name?.toLowerCase().includes(buscaAluno.toLowerCase())).slice(0, 6)
    : [];

  const [imprimindo, setImprimindo] = useState<Aditivo | null>(null);

  const [lista, setLista] = useState<Aditivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoTexto, setNovoTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [assinantesDe, setAssinantesDe] = useState<Aditivo | null>(null);
  const [abrindoTexto, setAbrindoTexto] = useState<Aditivo | null>(null);
  const [assinantes, setAssinantes] = useState<{ alunoNome: string; assinadoEm: string }[]>([]);

  const carregar = async () => {
    setCarregando(true);
    const { lista: l, erro } = await listarTodosAditivos();
    if (erro) setAviso({ tipo: 'erro', texto: erro });
    setLista(l);
    setCarregando(false);
  };

  useEffect(() => { void carregar(); }, []);

  const mostrar = (tipo: 'ok' | 'erro', texto: string) => {
    setAviso({ tipo, texto });
    window.setTimeout(() => setAviso(null), 5000);
  };

  const publicar = async () => {
    if (!novoTitulo.trim() || !novoTexto.trim()) {
      mostrar('erro', 'Preencha o título e o texto do aditivo.');
      return;
    }
    if (!paraTodos && !alunoEscolhido) {
      mostrar('erro', 'Escolha o aluno, ou marque "Todos os alunos".');
      return;
    }
    setSalvando(true);
    const { erro } = await criarAditivo(
      novoTitulo.trim(), novoTexto.trim(), currentUser,
      paraTodos ? undefined : { alunoId: alunoEscolhido.id, alunoNome: alunoEscolhido.name }
    );
    setSalvando(false);
    if (erro) { mostrar('erro', erro); return; }
    mostrar('ok', paraTodos
      ? 'Aditivo publicado. Já aparece no painel de todos os alunos.'
      : `Aditivo publicado só para ${alunoEscolhido.name}.`);
    setNovoTitulo('');
    setNovoTexto('');
    setAlunoEscolhido(null);
    setBuscaAluno('');
    setParaTodos(true);
    void carregar();
  };

  const abrirAssinantes = async (a: Aditivo) => {
    setAssinantesDe(a);
    setAssinantes(await listarAssinantesDoAditivo(a.id));
  };

  return (
    <div className="space-y-4">
      {aviso && (
        <div className={`p-3 rounded-2xl text-xs font-bold ${
          aviso.tipo === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                               : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {aviso.texto}
        </div>
      )}

      {/* Publicar um novo aditivo */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
          <FileSignature className="h-5 w-5" />
          <h3 className="font-black text-sm">Novo Aditivo de Contrato</h3>
        </div>
        <p className="text-[11px] text-slate-500">
          O texto abaixo aparece para todos os alunos assinarem no painel deles — livre, do jeito que você escrever.
        </p>
        <input
          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm font-bold"
          placeholder="Título — ex.: Aditivo de Reajuste de Mensalidade 2027"
          value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)}
        />
        <textarea
          rows={8}
          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm resize-y"
          placeholder="Escreva o texto do aditivo aqui..."
          value={novoTexto} onChange={e => setNovoTexto(e.target.value)}
        />

        {/* PARA QUEM VALE — todos os alunos, ou um só. */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
            Para quem
          </label>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => { setParaTodos(true); setAlunoEscolhido(null); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border ${
                      paraTodos ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-750 text-slate-600'}`}>
              Todos os alunos
            </button>
            <button type="button" onClick={() => setParaTodos(false)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border ${
                      !paraTodos ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-750 text-slate-600'}`}>
              Um aluno específico
            </button>
          </div>

          {!paraTodos && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm"
                placeholder="Nome do aluno"
                value={alunoEscolhido ? alunoEscolhido.name : buscaAluno}
                onChange={e => { setBuscaAluno(e.target.value); setAlunoEscolhido(null); }}
              />
              {encontrados.length > 0 && !alunoEscolhido && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl shadow-lg overflow-hidden">
                  {encontrados.map(a => (
                    <button key={a.id} type="button"
                            onClick={() => { setAlunoEscolhido(a); setBuscaAluno(''); }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold">
                      {a.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button type="button" onClick={() => void publicar()} disabled={salvando}
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black rounded-2xl text-xs">
          <Plus className="h-4 w-4" /> {salvando ? 'Publicando…' : 'Publicar para todos os alunos'}
        </button>
      </div>

      {/* Lista dos que já existem */}
      <div className="space-y-2.5">
        {carregando ? (
          <div className="p-10 text-center text-sm font-bold text-slate-400">Carregando…</div>
        ) : lista.length === 0 ? (
          <div className="p-10 text-center text-sm font-bold text-slate-400">Nenhum aditivo publicado ainda.</div>
        ) : (
          lista.map(a => (
            <div key={a.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-sm text-slate-800 dark:text-white">{a.titulo}</p>
                    <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase ${
                      a.ativo ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {a.ativo ? 'Ativo' : 'Desativado'}
                    </span>
                  </div>
                  {a.destinatarioAlunoNome && (
                    <p className="text-[10px] font-black text-blue-600 mt-1">
                      Só para: {a.destinatarioAlunoNome}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{a.texto}</p>
                  <button type="button" onClick={() => setAbrindoTexto(a)}
                          className="text-[11px] font-black text-blue-600 hover:underline mt-1">
                    Abrir texto completo
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={() => void abrirAssinantes(a)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-[11px] font-black text-slate-600 dark:text-slate-300">
                    <Users className="h-3.5 w-3.5" /> {a.totalAssinaturas ?? 0} assinaram
                  </button>
                  <button type="button" onClick={() => setImprimindo(a)}
                          className="p-2 text-slate-400 hover:text-blue-600" title="Imprimir este aditivo">
                    <Printer className="h-4 w-4" />
                  </button>
                  <button type="button"
                          onClick={async () => { await ativarDesativarAditivo(a.id, !a.ativo); void carregar(); }}
                          className={`p-2 rounded-xl border ${a.ativo ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-emerald-600 border-emerald-200 bg-emerald-50'}`}
                          title={a.ativo ? 'Desativar — para de pedir assinatura' : 'Reativar'}>
                    <Power className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ler o texto inteiro do aditivo — o admin não tinha como reabrir
          depois de publicado, só via o resumo cortado da lista. */}
      {abrindoTexto && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-lg max-h-[80vh] flex flex-col">
            <h3 className="font-black text-sm mb-3">{abrindoTexto.titulo}</h3>
            <div className="flex-1 overflow-y-auto">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {abrindoTexto.texto}
              </p>
            </div>
            <button type="button" onClick={() => setAbrindoTexto(null)}
                    className="mt-4 w-full py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black flex-shrink-0">
              Fechar
            </button>
          </div>
        </div>
      )}

      {imprimindo && <AditivoPrintView aditivo={imprimindo} onClose={() => setImprimindo(null)} />}

      {/* Quem já assinou */}
      {assinantesDe && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="font-black text-sm mb-1">{assinantesDe.titulo}</h3>
            <p className="text-[11px] text-slate-500 mb-3">{assinantes.length} aluno(s) assinaram</p>
            <div className="space-y-1.5">
              {assinantes.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50 dark:bg-slate-850 rounded-xl">
                  <span className="font-bold">{s.alunoNome}</span>
                  <span className="text-slate-400">{new Date(s.assinadoEm).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setAssinantesDe(null)}
                    className="mt-4 w-full py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

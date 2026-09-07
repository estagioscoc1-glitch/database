import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquareWarning, Trash2, Plus, Ban, RefreshCw } from 'lucide-react';
import {
  listarObservacoes, criarObservacao, excluirObservacao,
  SETORES_OBSERVACAO, type ObservacaoAluno,
} from '../lib/supabaseObservacoes';

// ===========================================================================
//  OBSERVAÇÕES DO ALUNO — painel
//
//  Entra dentro da ficha completa. Lista o que já existe, deixa escrever e
//  deixa apagar.
//
//  A caixa "bloquear estágio" é o que separa este painel de um bloco de
//  recados: enquanto houver uma observação marcada, a tela de vagas recusa
//  incluir o aluno e mostra este texto como motivo. Por isso o texto precisa
//  explicar a pendência, não só sinalizar que existe uma.
// ===========================================================================

const campo = 'w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg outline-none text-xs text-slate-800 dark:text-white';

interface Props {
  alunoId: string;
  /** Nome de quem está escrevendo, para ficar registrado no bilhete. */
  autorNome?: string;
}

export const ObservacoesAluno: React.FC<Props> = ({ alunoId, autorNome }) => {
  const [lista, setLista] = useState<ObservacaoAluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [texto, setTexto] = useState('');
  const [setor, setSetor] = useState<string>('SECRETARIA');
  const [bloqueia, setBloqueia] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const { lista: l, erro: e } = await listarObservacoes(alunoId);
    setLista(l);
    setErro(e ?? null);
    setCarregando(false);
  }, [alunoId]);

  useEffect(() => { void recarregar(); }, [recarregar]);

  const adicionar = async () => {
    if (!texto.trim()) return;
    setSalvando(true);
    const { erro: e } = await criarObservacao({
      alunoId, texto, setor, bloqueiaEstagio: bloqueia, autorNome,
    });
    setSalvando(false);
    if (e) { setErro(e); return; }
    setTexto(''); setBloqueia(false); setErro(null);
    await recarregar();
  };

  const apagar = async (id: string) => {
    const { erro: e } = await excluirObservacao(id);
    if (e) { setErro(e); return; }
    setErro(null);
    await recarregar();
  };

  const quando = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('pt-BR') : '';

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-900/40">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <MessageSquareWarning className="h-4 w-4" />
          <span className="text-xs font-black">Observações ({lista.length})</span>
        </div>
        <button type="button" onClick={() => void recarregar()}
                className="p-1.5 text-amber-700 hover:text-amber-900">
          <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {erro && (
        <p className="px-4 py-2 text-[11px] font-bold text-red-700 bg-red-50 border-b border-red-200">
          {erro}
        </p>
      )}

      <div className="p-4 space-y-3">
        {/* O que já existe */}
        {lista.length === 0 && !carregando && (
          <p className="text-[11px] text-slate-400">Nenhuma observação registrada para este aluno.</p>
        )}

        {lista.map(o => (
          <div key={o.id}
               className={`flex items-start gap-2 p-2.5 rounded-xl border ${
                 o.bloqueiaEstagio
                   ? 'bg-red-50 border-red-200 dark:bg-red-900/15 dark:border-red-900/40'
                   : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-750'}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-[10px] font-black text-slate-500 uppercase">{o.setor}</span>
                <span className="text-[10px] text-slate-400">{quando(o.criadoEm)}</span>
                {o.autorNome && <span className="text-[10px] text-slate-400">· {o.autorNome}</span>}
                {o.bloqueiaEstagio && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[9px] font-black">
                    <Ban className="h-2.5 w-2.5" /> BLOQUEIA ESTÁGIO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed break-words">{o.texto}</p>
            </div>
            <button type="button" onClick={() => void apagar(o.id!)}
                    title="Apagar esta observação"
                    className="p-1.5 text-slate-400 hover:text-red-600 flex-shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* Escrever uma nova */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <textarea rows={2} className={campo + ' resize-y'}
                    placeholder="Ex.: mensalidade de agosto em aberto — não liberar estágio"
                    value={texto} onChange={e => setTexto(e.target.value)} />

          <div className="flex items-center gap-2 flex-wrap">
            <select className={campo + ' w-auto'} value={setor}
                    onChange={e => setSetor(e.target.value)}>
              {SETORES_OBSERVACAO.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={bloqueia}
                     onChange={e => setBloqueia(e.target.checked)} />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Bloquear estágio
              </span>
            </label>

            <button type="button" onClick={() => void adicionar()}
                    disabled={!texto.trim() || salvando}
                    className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black rounded-xl text-[11px]">
              <Plus className="h-3.5 w-3.5" /> {salvando ? 'Salvando…' : 'Adicionar'}
            </button>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            Marcando "bloquear estágio", o aluno não pode ser incluído em vaga
            enquanto esta observação existir — e a tela de vagas mostra este
            texto como motivo. Apagar a observação libera na hora.
          </p>
        </div>
      </div>
    </div>
  );
};

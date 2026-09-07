import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, Check, Trash2, ExternalLink, Volume2, VolumeX } from 'lucide-react';
import {
  listarAlertas, marcarComoLido, marcarTudoComoLido, excluirAlerta,
  escutarAlertas, tocarAlarme, type Alerta,
} from '../lib/supabaseAlertas';

// ===========================================================================
//  SINO DE ALERTAS
//
//  Fica no cabeçalho do portal. Mostra quantos avisos não lidos existem e,
//  quando chega um novo, toca o alarme na hora — sem precisar recarregar.
//
//  Os avisos vêm dos outros ambientes da escola: matrícula online, chatbot,
//  site. Aqui é só a campainha; o dado de verdade continua em cada sistema.
// ===========================================================================

const CORES: Record<string, string> = {
  MATRICULA: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  CHATBOT:   'bg-violet-100 text-violet-800 border-violet-300',
  SITE:      'bg-sky-100 text-sky-800 border-sky-300',
  PORTAL:    'bg-slate-100 text-slate-700 border-slate-300',
};

export const SinoDeAlertas: React.FC = () => {
  const [lista, setLista] = useState<Alerta[]>([]);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /* O som pode ser desligado sem desligar o aviso — quem trabalha com o
     portal aberto o dia inteiro pode não querer o toque. A escolha fica neste
     navegador; não é preferência de conta. */
  const [comSom, setComSom] = useState(true);
  const somRef = useRef(true);
  useEffect(() => { somRef.current = comSom; }, [comSom]);

  const naoLidos = lista.filter(a => !a.lido).length;

  const recarregar = useCallback(async () => {
    const { lista: l, erro: e } = await listarAlertas();
    setLista(l);
    setErro(e ?? null);
  }, []);

  useEffect(() => { void recarregar(); }, [recarregar]);

  /* Escuta em tempo real. O desligamento no fim é o que impede o alarme de
     tocar duas, três vezes quando a tela é remontada. */
  useEffect(() => {
    const desligar = escutarAlertas(novo => {
      setLista(atual => [novo, ...atual]);
      if (somRef.current) tocarAlarme();
    });
    return desligar;
  }, []);

  const lerTudo = async () => {
    await marcarTudoComoLido();
    setLista(atual => atual.map(a => ({ ...a, lido: true })));
  };

  const ler = async (a: Alerta) => {
    if (a.lido) return;
    await marcarComoLido(a.id);
    setLista(atual => atual.map(x => x.id === a.id ? { ...x, lido: true } : x));
  };

  const apagar = async (id: string) => {
    await excluirAlerta(id);
    setLista(atual => atual.filter(a => a.id !== id));
  };

  const quando = (iso: string) => {
    const d = new Date(iso);
    const hoje = new Date().toDateString() === d.toDateString();
    return hoje
      ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setAberto(!aberto)}
              title="Alertas dos sistemas da escola"
              className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
        <Bell className={`h-5 w-5 ${naoLidos > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
        {naoLidos > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-black">
            {naoLidos > 99 ? '99+' : naoLidos}
          </span>
        )}
      </button>

      {aberto && (
        <>
          {/* Clicar fora fecha. */}
          <div className="fixed inset-0 z-[90]" onClick={() => setAberto(false)} />

          <div className="absolute right-0 mt-2 w-[340px] max-h-[70vh] overflow-y-auto z-[91] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between gap-2 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black text-slate-700 dark:text-white">
                Alertas {naoLidos > 0 && `(${naoLidos} novos)`}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setComSom(!comSom)}
                        title={comSom ? 'Desligar o som' : 'Ligar o som'}
                        className="p-1.5 text-slate-400 hover:text-slate-700">
                  {comSom ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                </button>
                {naoLidos > 0 && (
                  <button type="button" onClick={() => void lerTudo()}
                          title="Marcar tudo como lido"
                          className="p-1.5 text-slate-400 hover:text-green-600">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
                <button type="button" onClick={() => setAberto(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-700">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {erro && (
              <p className="px-4 py-3 text-[11px] font-bold text-red-700 bg-red-50">{erro}</p>
            )}

            {lista.length === 0 && !erro && (
              <p className="px-4 py-6 text-[11px] text-slate-400 text-center">
                Nenhum alerta por enquanto.
              </p>
            )}

            {lista.map(a => (
              <div key={a.id}
                   onClick={() => void ler(a)}
                   className={`flex items-start gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors ${
                     a.lido ? 'opacity-60' : 'bg-amber-50/50 dark:bg-amber-900/10'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black ${CORES[a.origem] || CORES.PORTAL}`}>
                      {a.origem}
                    </span>
                    <span className="text-[10px] text-slate-400">{quando(a.criadoEm)}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white break-words">{a.titulo}</p>
                  {a.detalhe && (
                    <p className="text-[11px] text-slate-500 break-words mt-0.5">{a.detalhe}</p>
                  )}
                  {a.link && (
                    <a href={a.link} target="_blank" rel="noopener noreferrer"
                       onClick={e => e.stopPropagation()}
                       className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-blue-600 hover:underline">
                      Abrir <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <button type="button"
                        onClick={e => { e.stopPropagation(); void apagar(a.id); }}
                        title="Apagar"
                        className="p-1 text-slate-300 hover:text-red-600 flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

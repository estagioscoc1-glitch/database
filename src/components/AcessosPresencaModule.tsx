import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import type { RegistroDeAcesso } from '../lib/repositorios';
import { Search } from 'lucide-react';

// Extraído do AdminDashboard.tsx pra ficar reaproveitável — usado tanto na
// tela do Admin quanto, quando um professor específico ganha essa
// permissão extra, dentro do painel do professor. O conteúdo e os cálculos
// são EXATAMENTE os mesmos de antes, só isolados num componente próprio.

export const AcessosPresencaModule: React.FC = () => {
  const { acessos, recarregarAcessos } = useApp();
  const [acessosAtualizando, setAcessosAtualizando] = useState(false);
  const [acessosSearch, setAcessosSearch] = useState('');

  const normalizarBusca = (texto: string) =>
    (texto || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // tira os acentos
      .toLowerCase()
      .trim();

  // "Online agora": olha só pro acesso MAIS RECENTE de cada pessoa (pode
  // ter várias sessões ao longo do tempo) e considera online quem deu sinal
  // de vida nos últimos 3 minutos sem ter registrado saída — 3 minutos dá
  // uma folga de duas batidas (o batimento roda a cada 1 minuto) antes de
  // considerar a pessoa offline, pra não piscar à toa por causa de rede lenta.
  const acessosMaisRecentesPorPessoa = React.useMemo(() => {
    const porPessoa = new Map<string, RegistroDeAcesso>();
    for (const a of acessos) {
      const atual = porPessoa.get(a.usuarioId);
      if (!atual || new Date(a.entrouEm) > new Date(atual.entrouEm)) {
        porPessoa.set(a.usuarioId, a);
      }
    }
    return Array.from(porPessoa.values());
  }, [acessos]);

  const onlineAgora = React.useMemo(() => {
    const limiteMs = 3 * 60 * 1000;
    return acessosMaisRecentesPorPessoa
      .filter(a => !a.saiuEm && (Date.now() - new Date(a.ultimaAtividade).getTime()) < limiteMs)
      .sort((a, b) => new Date(b.ultimaAtividade).getTime() - new Date(a.ultimaAtividade).getTime());
  }, [acessosMaisRecentesPorPessoa]);

  // Histórico agrupado por pessoa, pra busca — nome, papel, quantos DIAS
  // diferentes essa pessoa acessou (não quantas sessões — duas entradas no
  // mesmo dia contam como 1 dia), e a lista de sessões (mais recente primeiro).
  const historicoPorPessoa = React.useMemo(() => {
    const busca = normalizarBusca(acessosSearch);
    if (busca.length < 2) return [];

    const porPessoa = new Map<string, { nome: string; papel: string; sessoes: RegistroDeAcesso[] }>();
    for (const a of acessos) {
      if (!normalizarBusca(a.nome).includes(busca)) continue;
      const grupo = porPessoa.get(a.usuarioId) || { nome: a.nome, papel: a.papel, sessoes: [] as RegistroDeAcesso[] };
      grupo.sessoes.push(a);
      porPessoa.set(a.usuarioId, grupo);
    }

    return Array.from(porPessoa.values()).map(grupo => {
      const sessoesOrdenadas = [...grupo.sessoes].sort(
        (a, b) => new Date(b.entrouEm).getTime() - new Date(a.entrouEm).getTime()
      );
      const diasUnicos = new Set(sessoesOrdenadas.map(s => s.entrouEm.slice(0, 10)));
      return { ...grupo, sessoes: sessoesOrdenadas, totalDias: diasUnicos.size };
    });
  }, [acessos, acessosSearch]);

  const formatarDataHora = (iso: string) => {
    const d = new Date(iso);
    return {
      data: d.toLocaleDateString('pt-BR'),
      hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const formatarDuracao = (inicioIso: string, fimIso: string | null) => {
    const fimMs = fimIso ? new Date(fimIso).getTime() : Date.now();
    const minutos = Math.max(0, Math.round((fimMs - new Date(inicioIso).getTime()) / 60000));
    if (minutos < 60) return `${minutos} min`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Online agora */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h3 className="text-base font-black text-slate-800 dark:text-white">
              Online agora ({onlineAgora.length})
            </h3>
          </div>
          <button
            type="button"
            disabled={acessosAtualizando}
            onClick={async () => {
              setAcessosAtualizando(true);
              await recarregarAcessos();
              setAcessosAtualizando(false);
            }}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {acessosAtualizando ? 'Atualizando...' : '↻ Atualizar'}
          </button>
        </div>

        {onlineAgora.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Ninguém online agora.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {onlineAgora.map(a => (
              <div key={a.usuarioId} className="flex items-center gap-3 p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/30 rounded-xl">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{a.nome}</p>
                  <p className="text-[10px] text-slate-500">
                    {a.papel === 'PROFESSOR' ? 'Professor' : 'Aluno'} · desde {formatarDataHora(a.entrouEm).hora}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico por pessoa */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <h3 className="text-base font-black text-slate-800 dark:text-white mb-1">Histórico de Acessos</h3>
        <p className="text-xs text-slate-500 mb-4">
          Busque um professor ou aluno pra ver todos os dias e horários em que ele acessou o sistema.
        </p>

        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Nome do professor ou aluno..."
            value={acessosSearch}
            onChange={(e) => setAcessosSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>

        {acessosSearch.trim().length >= 2 && historicoPorPessoa.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">Nenhum acesso encontrado com esse nome.</p>
        )}

        <div className="space-y-5">
          {historicoPorPessoa.map(pessoa => (
            <div key={pessoa.nome + pessoa.papel} className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-white">{pessoa.nome}</p>
                  <p className="text-[11px] text-slate-500">{pessoa.papel === 'PROFESSOR' ? 'Professor' : 'Aluno'}</p>
                </div>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-3 py-1 rounded-full">
                  {pessoa.totalDias} {pessoa.totalDias === 1 ? 'dia acessado' : 'dias acessados'}
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900">
                    <tr className="text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left font-bold py-2 px-4">Data</th>
                      <th className="text-left font-bold py-2 px-4">Entrou</th>
                      <th className="text-left font-bold py-2 px-4">Saiu</th>
                      <th className="text-left font-bold py-2 px-4">Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pessoa.sessoes.map(s => {
                      const entrada = formatarDataHora(s.entrouEm);
                      const saida = s.saiuEm ? formatarDataHora(s.saiuEm) : null;
                      const aindaOnline = !s.saiuEm && (Date.now() - new Date(s.ultimaAtividade).getTime()) < 3 * 60 * 1000;
                      return (
                        <tr key={s.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                          <td className="py-2 px-4 font-mono text-slate-600 dark:text-slate-300">{entrada.data}</td>
                          <td className="py-2 px-4 font-mono text-slate-600 dark:text-slate-300">{entrada.hora}</td>
                          <td className="py-2 px-4 font-mono text-slate-600 dark:text-slate-300">
                            {aindaOnline ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">online agora</span>
                            ) : saida ? saida.hora : (
                              <span className="text-slate-400">— (não registrada)</span>
                            )}
                          </td>
                          <td className="py-2 px-4 font-mono text-slate-500">
                            {formatarDuracao(s.entrouEm, s.saiuEm)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

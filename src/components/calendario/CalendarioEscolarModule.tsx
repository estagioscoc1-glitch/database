import React, { useEffect, useState, useCallback } from 'react';
import {
  CalendarDays, Plus, Trash2, Save, Eye, EyeOff, ArrowUp, ArrowDown, X, Loader2, CheckCircle2,
} from 'lucide-react';
import {
  type CalendarioEscolarRegistro,
  type MesCalendario,
  type TipoDiaCalendario,
  NOMES_MESES,
  calendarioEmBranco,
  carregarCalendarioEscolar,
  salvarCalendarioEscolar,
  alternarPublicacaoCalendarioEscolar,
  listarCalendariosEscolares,
  totalDiasLetivos,
} from '../../lib/calendarioEscolar';
import { CalendarioGradeVisual } from './CalendarioGradeVisual';

// ===========================================================================
//  CALENDÁRIO ESCOLAR — tela de edição (só direção/secretaria)
//
//  Preenche o calendário de um ano/semestre inteiro no mesmo formato do
//  modelo em PDF (meses, dias marcados, anotações, dias letivos), guarda no
//  banco em rascunho e só mostra pro coordenador quando "Mostrar para o
//  Coordenador" é ligado.
// ===========================================================================

function anoESemestreAtuais(): { ano: number; semestre: 1 | 2 } {
  const hoje = new Date();
  return { ano: hoje.getFullYear(), semestre: hoje.getMonth() + 1 >= 7 ? 2 : 1 };
}

export const CalendarioEscolarModule: React.FC = () => {
  const inicial = anoESemestreAtuais();
  const [ano, setAno] = useState(inicial.ano);
  const [semestre, setSemestre] = useState<1 | 2>(inicial.semestre);
  const [registro, setRegistro] = useState<CalendarioEscolarRegistro | null>(null);
  const [existentes, setExistentes] = useState<Array<{ ano: number; semestre: 1 | 2; publicado: boolean }>>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [avisoSalvo, setAvisoSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [novoMes, setNovoMes] = useState<number>(1);
  const [diaEditando, setDiaEditando] = useState<{ mes: number; dia: number } | null>(null);
  const [novaAnotacao, setNovaAnotacao] = useState('');

  const carregar = useCallback(async (anoAlvo: number, semestreAlvo: 1 | 2) => {
    setCarregando(true);
    setErro(null);
    setDiaEditando(null);
    const existente = await carregarCalendarioEscolar(anoAlvo, semestreAlvo);
    setRegistro(
      existente ?? {
        ano: anoAlvo,
        semestre: semestreAlvo,
        dados: calendarioEmBranco(anoAlvo, semestreAlvo),
        publicado: false,
      }
    );
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar(ano, semestre);
    listarCalendariosEscolares().then(setExistentes);
  }, [ano, semestre, carregar]);

  if (carregando || !registro) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando calendário…
      </div>
    );
  }

  const atualizarDados = (fn: (d: CalendarioEscolarRegistro['dados']) => CalendarioEscolarRegistro['dados']) => {
    setRegistro(r => (r ? { ...r, dados: fn(r.dados) } : r));
  };

  const salvar = async () => {
    if (!registro) return;
    setSalvando(true);
    setErro(null);
    const resultado = await salvarCalendarioEscolar(registro);
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro || 'Não foi possível salvar o calendário.');
      return;
    }
    setAvisoSalvo(true);
    setTimeout(() => setAvisoSalvo(false), 2500);
    listarCalendariosEscolares().then(setExistentes);
  };

  const alternarPublicacao = async () => {
    if (!registro) return;
    const novoValor = !registro.publicado;
    // Se ainda não existe no banco, salva primeiro — não dá pra publicar o que nunca foi gravado.
    setPublicando(true);
    setErro(null);
    const gravado = await salvarCalendarioEscolar({ ...registro, publicado: novoValor });
    if (!gravado.ok) {
      setPublicando(false);
      setErro(gravado.erro || 'Não foi possível atualizar a publicação.');
      return;
    }
    const resultado = await alternarPublicacaoCalendarioEscolar(registro.ano, registro.semestre, novoValor);
    setPublicando(false);
    if (!resultado.ok) {
      setErro(resultado.erro || 'Não foi possível atualizar a publicação.');
      return;
    }
    setRegistro(r => (r ? { ...r, publicado: novoValor } : r));
    listarCalendariosEscolares().then(setExistentes);
  };

  const mesesUsados = new Set(registro.dados.meses.map(m => m.mes));

  const adicionarMes = () => {
    if (mesesUsados.has(novoMes)) return;
    atualizarDados(d => ({
      ...d,
      meses: [...d.meses, { ano: registro.ano, mes: novoMes, diasLetivos: 0, diasMarcados: [] }].sort(
        (a, b) => a.mes - b.mes
      ),
    }));
  };

  const removerMes = (mes: number) => {
    atualizarDados(d => ({ ...d, meses: d.meses.filter(m => m.mes !== mes) }));
  };

  const atualizarMes = (mes: number, fn: (m: MesCalendario) => MesCalendario) => {
    atualizarDados(d => ({ ...d, meses: d.meses.map(m => (m.mes === mes ? fn(m) : m)) }));
  };

  const marcaDoDia = (mes: number, dia: number) =>
    registro.dados.meses.find(m => m.mes === mes)?.diasMarcados.find(x => x.dia === dia);

  const salvarMarcacaoDoDia = (tipo: TipoDiaCalendario | null, rotulo: string, legenda: string) => {
    if (!diaEditando) return;
    const { mes, dia } = diaEditando;
    atualizarMes(mes, m => ({
      ...m,
      diasMarcados: tipo
        ? [
            ...m.diasMarcados.filter(x => x.dia !== dia),
            { dia, tipo, rotulo: rotulo || undefined, legenda: legenda || undefined },
          ]
        : m.diasMarcados.filter(x => x.dia !== dia),
    }));
    setDiaEditando(null);
  };

  const adicionarAnotacao = () => {
    const texto = novaAnotacao.trim();
    if (!texto) return;
    atualizarDados(d => ({ ...d, anotacoes: [...d.anotacoes, { texto }] }));
    setNovaAnotacao('');
  };

  const moverAnotacao = (indice: number, direcao: -1 | 1) => {
    atualizarDados(d => {
      const lista = [...d.anotacoes];
      const alvo = indice + direcao;
      if (alvo < 0 || alvo >= lista.length) return d;
      [lista[indice], lista[alvo]] = [lista[alvo], lista[indice]];
      return { ...d, anotacoes: lista };
    });
  };

  const removerAnotacao = (indice: number) => {
    atualizarDados(d => ({ ...d, anotacoes: d.anotacoes.filter((_, i) => i !== indice) }));
  };

  const painelDia = diaEditando ? marcaDoDia(diaEditando.mes, diaEditando.dia) : undefined;

  return (
    <div className="space-y-6">
      {/* Cabeçalho + seletor de ano/semestre + publicação */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">Calendário Escolar</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preencha o semestre inteiro. Fica só com você até ligar "Mostrar para o Coordenador".
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={`${ano}/${semestre}`}
              onChange={e => {
                const [a, s] = e.target.value.split('/');
                setAno(Number(a));
                setSemestre(Number(s) as 1 | 2);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
            >
              {/* garante que o ano/semestre atual apareça mesmo sem estar salvo ainda */}
              {!existentes.some(e => e.ano === ano && e.semestre === semestre) && (
                <option value={`${ano}/${semestre}`}>{ano}/{semestre} (novo)</option>
              )}
              {existentes.map(e => (
                <option key={`${e.ano}/${e.semestre}`} value={`${e.ano}/${e.semestre}`}>
                  {e.ano}/{e.semestre} {e.publicado ? '• publicado' : '• rascunho'}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={ano}
              onChange={e => setAno(Number(e.target.value) || ano)}
              className="w-20 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-center"
              title="Ou digite outro ano"
            />
            <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              {[1, 2].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSemestre(s as 1 | 2)}
                  className={`px-3 py-2 text-xs font-black ${
                    semestre === s ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {s}º sem.
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white font-black rounded-xl text-xs uppercase tracking-wide"
          >
            {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar calendário
          </button>

          <button
            type="button"
            onClick={alternarPublicacao}
            disabled={publicando}
            className={`flex items-center gap-1.5 px-4 py-2.5 disabled:opacity-40 font-black rounded-xl text-xs uppercase tracking-wide ${
              registro.publicado
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {publicando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : registro.publicado ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
            {registro.publicado ? 'Visível para o coordenador' : 'Oculto do coordenador'}
          </button>

          {avisoSalvo && (
            <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Salvo!
            </span>
          )}
          {erro && <span className="text-rose-600 text-xs font-bold">{erro}</span>}
        </div>
      </div>

      {/* Meses */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase">Meses do semestre</h3>
          <div className="flex items-center gap-2">
            <select
              value={novoMes}
              onChange={e => setNovoMes(Number(e.target.value))}
              className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            >
              {NOMES_MESES.slice(1).map((nome, i) => (
                <option key={i + 1} value={i + 1} disabled={mesesUsados.has(i + 1)}>
                  {nome}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={adicionarMes}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar mês
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {registro.dados.meses.map(m => (
            <div key={m.mes} className="border border-slate-150 dark:border-slate-800 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  Dias letivos:
                  <input
                    type="number"
                    min={0}
                    value={m.diasLetivos}
                    onChange={e =>
                      atualizarMes(m.mes, mm => ({ ...mm, diasLetivos: Number(e.target.value) || 0 }))
                    }
                    className="w-14 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-bold text-slate-700 dark:text-slate-200"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removerMes(m.mes)}
                  className="text-slate-300 hover:text-rose-500"
                  title="Remover mês"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <CalendarioGradeVisual
                ano={m.ano}
                mes={m.mes}
                diasMarcados={m.diasMarcados}
                diaSelecionado={diaEditando?.mes === m.mes ? diaEditando.dia : null}
                onSelecionarDia={dia => setDiaEditando({ mes: m.mes, dia })}
              />
            </div>
          ))}
        </div>

        {registro.dados.meses.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">Nenhum mês adicionado ainda.</p>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 text-xs font-black text-slate-700 dark:text-slate-200 uppercase">
          Total de dias letivos:
          <span className="text-blue-600 text-sm">{totalDiasLetivos(registro.dados)}</span>
        </div>
      </div>

      {/* Painel de edição do dia selecionado */}
      {diaEditando && (
        <PainelDiaCalendario
          mes={diaEditando.mes}
          dia={diaEditando.dia}
          marcaAtual={painelDia}
          onFechar={() => setDiaEditando(null)}
          onSalvar={salvarMarcacaoDoDia}
        />
      )}

      {/* Anotações */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase mb-3">Anotações</h3>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={novaAnotacao}
            onChange={e => setNovaAnotacao(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adicionarAnotacao()}
            placeholder="Ex: 03 DE AGOSTO - INÍCIO DAS AULAS VETERANOS"
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
          />
          <button
            type="button"
            onClick={adicionarAnotacao}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        </div>

        <div className="space-y-1.5">
          {registro.dados.anotacoes.map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs"
            >
              <span className="flex-1 font-semibold text-slate-700 dark:text-slate-200">{a.texto}</span>
              <button type="button" onClick={() => moverAnotacao(i, -1)} className="text-slate-400 hover:text-slate-700">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => moverAnotacao(i, 1)} className="text-slate-400 hover:text-slate-700">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => removerAnotacao(i)} className="text-slate-400 hover:text-rose-500">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {registro.dados.anotacoes.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Nenhuma anotação ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Painel de edição de um dia específico (aparece abaixo dos meses ao clicar
// num dia da grade).
// ---------------------------------------------------------------------------
const PainelDiaCalendario: React.FC<{
  mes: number;
  dia: number;
  marcaAtual?: { tipo: TipoDiaCalendario; rotulo?: string; legenda?: string };
  onFechar: () => void;
  onSalvar: (tipo: TipoDiaCalendario | null, rotulo: string, legenda: string) => void;
}> = ({ mes, dia, marcaAtual, onFechar, onSalvar }) => {
  const [tipo, setTipo] = useState<TipoDiaCalendario | ''>(marcaAtual?.tipo || '');
  const [rotulo, setRotulo] = useState(marcaAtual?.rotulo || '');
  const [legenda, setLegenda] = useState(marcaAtual?.legenda || '');

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-900/50 rounded-3xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-black text-blue-900 dark:text-blue-200">
          Editando {dia} de {NOMES_MESES[mes]}
        </h4>
        <button type="button" onClick={onFechar} className="text-blue-400 hover:text-blue-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-[10px] font-bold text-slate-500 uppercase space-y-1">
          Tipo
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value as TipoDiaCalendario | '')}
            className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          >
            <option value="">Sem marcação</option>
            <option value="inicio">Início das aulas (verde)</option>
            <option value="feriado">Feriado / destaque (laranja)</option>
            <option value="avaliacao">Avaliação / DEP (cinza)</option>
          </select>
        </label>

        <label className="text-[10px] font-bold text-slate-500 uppercase space-y-1">
          Rótulo no dia (opcional)
          <input
            type="text"
            value={rotulo}
            onChange={e => setRotulo(e.target.value)}
            placeholder="Ex: DEP"
            className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
          />
        </label>

        <label className="text-[10px] font-bold text-slate-500 uppercase space-y-1">
          Nota de rodapé (opcional)
          <input
            type="text"
            value={legenda}
            onChange={e => setLegenda(e.target.value)}
            placeholder="Ex: Independência do Brasil"
            className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
          />
        </label>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button
          type="button"
          onClick={() => onSalvar(tipo || null, rotulo, legenda)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs uppercase"
        >
          Salvar dia
        </button>
        {marcaAtual && (
          <button
            type="button"
            onClick={() => onSalvar(null, '', '')}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 font-bold rounded-xl text-xs uppercase"
          >
            Remover marcação
          </button>
        )}
        <button
          type="button"
          onClick={onFechar}
          className="px-4 py-2 text-slate-500 font-bold rounded-xl text-xs uppercase"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import {
  CADERNO_SETEMBRO_2026, PAGAMENTOS_ANTIGOS, RegistroCadernoSetembro, RegistroPagamentoAntigo,
} from '../../lib/regularizacaoSeedData';
import {
  cruzarComAlunosDoSistema, importarRegularizacoesEmLote, listarConfigParcelaTurma,
  salvarConfigParcelaTurma, calcularNumeroParcela, ConfigParcelaTurma, TipoRegularizacao,
} from '../../services/regularizacaoStorage';
import {
  Search, CheckCircle2, XCircle, AlertTriangle, Users, FileWarning, Settings2, Trash2, Loader2,
} from 'lucide-react';

// ===========================================================================
//  IMPORTAÇÃO — REGULARIZAÇÃO FINANCEIRA RETROATIVA
//
//  Fluxo, na ordem exigida: cruzar → mostrar relatório de conferência →
//  só depois de revisar (e poder editar linha a linha) é que grava.
//  Nada é escrito no banco antes do clique final de confirmação.
// ===========================================================================

interface Props {
  currentUser?: string;
  allStudentUsers?: any[];
  classes?: any[];
}

interface LinhaProposta {
  chave: string;
  alunoId: string;
  alunoMatricula: string;
  alunoNome: string;
  tipo: TipoRegularizacao;
  numeroParcela: number | null;
  competencia: string | null;
  status: 'PAGO' | 'PENDENTE';
  dataPagamento: string | null;
  origemPlanilha: string;
  incluir: boolean;
}

const MODULO_PADRAO_PARCELA_SETEMBRO: Record<string, number> = { '1': 1, '2': 7, '3': 13 };

export const RegularizacaoRetroativaManager: React.FC<Props> = ({
  currentUser = 'Financeiro', allStudentUsers = [], classes = [],
}) => {
  const [etapa, setEtapa] = useState<'CONFERENCIA' | 'CONFIG_TURMA' | 'PROPOSTA' | 'CONCLUIDO'>('CONFERENCIA');
  const [configTurmas, setConfigTurmas] = useState<Record<string, ConfigParcelaTurma>>({});
  const [carregandoConfig, setCarregandoConfig] = useState(true);
  const [propostas, setPropostas] = useState<LinhaProposta[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState<string | null>(null);

  useEffect(() => {
    void listarConfigParcelaTurma().then(lista => {
      const mapa: Record<string, ConfigParcelaTurma> = {};
      lista.forEach(c => { mapa[c.turmaNome] = c; });
      setConfigTurmas(mapa);
      setCarregandoConfig(false);
    });
  }, []);

  // ---------------------------------------------------------------- cruzamento
  const cruzamentoSetembro = useMemo(
    () => cruzarComAlunosDoSistema(
      CADERNO_SETEMBRO_2026.filter(s => s.situacao === 'active'),
      allStudentUsers.map((a: any) => ({ id: a.id, enrollment: a.enrollment, name: a.name }))
    ),
    [allStudentUsers]
  );

  const cruzamentoPagamentos = useMemo(
    () => cruzarComAlunosDoSistema(
      PAGAMENTOS_ANTIGOS,
      allStudentUsers.map((a: any) => ({ id: a.id, enrollment: a.enrollment, name: a.name }))
    ),
    [allStudentUsers]
  );

  // turmas do Caderno que precisam de uma referência de parcela configurada
  const turmasDoCaderno = useMemo(() => {
    const nomes = new Set<string>();
    CADERNO_SETEMBRO_2026.forEach(s => nomes.add(s.turma));
    return Array.from(nomes).sort();
  }, []);

  const moduloDaTurma = (turmaNome: string): string | null => {
    const s = CADERNO_SETEMBRO_2026.find(x => x.turma === turmaNome);
    return s?.modulo ?? null;
  };

  const handleSalvarConfigTurmas = async () => {
    for (const turmaNome of turmasDoCaderno) {
      const cfg = configTurmas[turmaNome];
      if (cfg) await salvarConfigParcelaTurma(cfg, currentUser);
    }
    gerarPropostas();
    setEtapa('PROPOSTA');
  };

  // ---------------------------------------------------------------- gerar propostas
  const gerarPropostas = () => {
    const linhas: LinhaProposta[] = [];

    // 1) Parcelas — a partir do Caderno de Setembro, só quem casou por matrícula ou nome
    const todosSetembro = [...cruzamentoSetembro.encontradosPorMatricula, ...cruzamentoSetembro.encontradosPorNome];
    todosSetembro.forEach((s: any) => {
      const cfg = configTurmas[s.turma] || {
        turmaId: s.turma, turmaNome: s.turma, competenciaReferencia: '09/2026',
        numeroParcelaReferencia: MODULO_PADRAO_PARCELA_SETEMBRO[s.modulo] || 1,
      };
      const numeroSetembro = cfg.numeroParcelaReferencia;

      if (s.setembroPago) {
        // Regularização "pra trás": parcelas 1..numeroSetembro-1 como sugestão de PAGO
        // (o próprio setembro fica de fora daqui — ele é a parcela ATUAL, o financeiro
        // normal que tem que assumir dali pra frente, não a regularização retroativa).
        for (let n = 1; n < numeroSetembro; n++) {
          linhas.push({
            chave: `${s.alunoId}-parcela-${n}`,
            alunoId: s.alunoId, alunoMatricula: s.matricula, alunoNome: s.alunoNomeSistema,
            tipo: 'PARCELA', numeroParcela: n, competencia: null, status: 'PAGO', dataPagamento: null,
            origemPlanilha: 'Caderno de Pagamentos — inferido a partir de Setembro/2026 pago',
            incluir: true,
          });
        }
      }
      // Quem está com setembro pendente: não gera proposta nenhuma — continua
      // pendente, aparece só no relatório (não presume nada sem dado).
    });

    // 2) Seguro / Kit / Kit RAD / Jaleco — pagamentos reais das planilhas
    const todosPagamentos = [...cruzamentoPagamentos.encontradosPorMatricula, ...cruzamentoPagamentos.encontradosPorNome];
    todosPagamentos.forEach((p: any) => {
      const tipo: TipoRegularizacao = p.tipo === 'KIT_RAD' ? 'KIT' : p.tipo;
      linhas.push({
        chave: `${p.alunoId}-${p.tipo}-${p.recibo}`,
        alunoId: p.alunoId, alunoMatricula: p.matricula, alunoNome: p.alunoNomeSistema,
        tipo, numeroParcela: null, competencia: null, status: 'PAGO', dataPagamento: p.dataPagamento,
        origemPlanilha: `Planilha de recebimento — recibo ${p.recibo}`,
        incluir: true,
      });
    });

    setPropostas(linhas);
  };

  const handleConfirmarImportacao = async () => {
    setImportando(true);
    try {
      const selecionadas = propostas.filter(p => p.incluir);
      const res = await importarRegularizacoesEmLote(
        selecionadas.map(p => ({
          alunoId: p.alunoId, alunoMatricula: p.alunoMatricula, alunoNome: p.alunoNome, tipo: p.tipo,
          numeroParcela: p.numeroParcela, competencia: p.competencia, status: p.status,
          dataPagamento: p.dataPagamento, origemPlanilha: p.origemPlanilha,
        })),
        currentUser
      );
      if (!res.ok) {
        setResultadoFinal(`Erro: ${res.erro}`);
        return;
      }
      setResultadoFinal(`${res.quantidadeImportada} registro(s) de regularização retroativa importado(s) com sucesso.`);
      setEtapa('CONCLUIDO');
    } finally {
      setImportando(false);
    }
  };

  // =========================================================== RENDER
  if (etapa === 'CONFERENCIA') {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-2">
          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-blue-600" /> Relatório de Conferência
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Nada foi gravado ainda. Confira tudo abaixo antes de avançar — a gravação só acontece depois de você revisar e confirmar.
          </p>
        </div>

        <BlocoConferencia
          titulo="Parcelas — Caderno de Pagamentos (Setembro/2026)"
          total={CADERNO_SETEMBRO_2026.filter(s => s.situacao === 'active').length}
          cruzamento={cruzamentoSetembro}
          extraInfo={`${CADERNO_SETEMBRO_2026.filter(s => s.situacao === 'active' && s.setembroPago).length} com Setembro pago, ${CADERNO_SETEMBRO_2026.filter(s => s.situacao === 'active' && !s.setembroPago).length} pendente (continuarão pendentes).`}
        />

        <BlocoConferencia
          titulo="Seguro, Kit e Jaleco — planilhas de recebimento"
          total={PAGAMENTOS_ANTIGOS.length}
          cruzamento={cruzamentoPagamentos}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setEtapa('CONFIG_TURMA')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-lg uppercase tracking-wide"
          >
            Continuar → Configurar parcela por turma
          </button>
        </div>
      </div>
    );
  }

  if (etapa === 'CONFIG_TURMA') {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-3">
          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-blue-600" /> Qual parcela cai em Setembro/2026, por turma?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Já vem preenchido com a regra padrão (Módulo 1 → parcela 1, Módulo 2 → parcela 7, Módulo 3 → parcela 13).
            Se alguma turma começou em mês diferente (ex.: uma turma de Módulo 2 que começou em abril, onde
            Setembro é a 6ª parcela), corrija só ela aqui.
          </p>

          {carregandoConfig ? (
            <p className="flex items-center gap-2 text-slate-400 text-xs py-4"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>
          ) : (
            <div className="space-y-2">
              {turmasDoCaderno.map(turmaNome => {
                const modulo = moduloDaTurma(turmaNome);
                const atual = configTurmas[turmaNome] || {
                  turmaId: turmaNome, turmaNome, competenciaReferencia: '09/2026',
                  numeroParcelaReferencia: MODULO_PADRAO_PARCELA_SETEMBRO[modulo || '1'] || 1,
                };
                return (
                  <div key={turmaNome} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                    <span className="font-bold flex-1">{turmaNome} <span className="text-slate-400 font-normal">(Módulo {modulo})</span></span>
                    <span className="text-slate-400">Setembro/2026 =</span>
                    <span>parcela nº</span>
                    <input
                      type="number" min={1} value={atual.numeroParcelaReferencia}
                      onChange={(e) => setConfigTurmas(prev => ({
                        ...prev, [turmaNome]: { ...atual, numeroParcelaReferencia: parseInt(e.target.value, 10) || 1 },
                      }))}
                      className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-center"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <button type="button" onClick={() => setEtapa('CONFERENCIA')} className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold rounded-xl text-xs uppercase">
            Voltar
          </button>
          <button type="button" onClick={handleSalvarConfigTurmas} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-lg uppercase tracking-wide">
            Gerar proposta de importação →
          </button>
        </div>
      </div>
    );
  }

  if (etapa === 'PROPOSTA') {
    const incluidas = propostas.filter(p => p.incluir);
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-2">
          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Proposta de Importação — revise antes de confirmar
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {incluidas.length} de {propostas.length} linha(s) serão gravadas como regularização retroativa (status "Pago", sem valor).
            Edite mês/parcela/data ou desmarque qualquer linha que não deva entrar.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
                <tr>
                  {['', 'Aluno', 'Tipo', 'Parcela nº', 'Data Pagto.', 'Origem'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-black text-[10px] uppercase text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {propostas.map((p, i) => (
                  <tr key={p.chave} className={`border-t border-slate-100 dark:border-slate-800 ${!p.incluir ? 'opacity-40' : ''}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={p.incluir} onChange={(e) => {
                        const novo = [...propostas]; novo[i] = { ...p, incluir: e.target.checked }; setPropostas(novo);
                      }} />
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{p.alunoNome} <span className="text-slate-400 font-normal">({p.alunoMatricula})</span></td>
                    <td className="px-3 py-2">{p.tipo}</td>
                    <td className="px-3 py-2">
                      {p.tipo === 'PARCELA' ? (
                        <input type="number" min={1} value={p.numeroParcela ?? ''} disabled={!p.incluir}
                          onChange={(e) => { const novo = [...propostas]; novo[i] = { ...p, numeroParcela: parseInt(e.target.value, 10) || null }; setPropostas(novo); }}
                          className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-center" />
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <input type="date" value={p.dataPagamento ?? ''} disabled={!p.incluir}
                        onChange={(e) => { const novo = [...propostas]; novo[i] = { ...p, dataPagamento: e.target.value || null }; setPropostas(novo); }}
                        className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono" />
                    </td>
                    <td className="px-3 py-2 text-slate-400 text-[10px]">{p.origemPlanilha}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between">
          <button type="button" onClick={() => setEtapa('CONFIG_TURMA')} className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold rounded-xl text-xs uppercase">
            Voltar
          </button>
          <button type="button" onClick={handleConfirmarImportacao} disabled={importando}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-600/30 uppercase tracking-wide">
            {importando ? 'Importando…' : `Confirmar e importar ${incluidas.length} registro(s)`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 rounded-3xl text-center space-y-3">
      <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
      <p className="font-extrabold text-slate-700 dark:text-slate-200">{resultadoFinal}</p>
      <p className="text-xs text-slate-400">
        Confira em "Editar Regularizações" e, quando quiser, libere a aba Financeiro dos alunos em "Visibilidade Financeiro Aluno".
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Bloco de conferência reutilizável
// ---------------------------------------------------------------------------
const BlocoConferencia: React.FC<{ titulo: string; total: number; cruzamento: any; extraInfo?: string }> = ({ titulo, total, cruzamento, extraInfo }) => {
  const [aberto, setAberto] = useState<string | null>(null);
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <h4 className="font-black text-sm text-slate-800 dark:text-white">{titulo}</h4>
        <p className="text-[11px] text-slate-400">{total} registro(s) na planilha. {extraInfo}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800">
        <ItemConferencia icone={CheckCircle2} cor="emerald" label="Por matrícula" valor={cruzamento.encontradosPorMatricula.length}
          aberto={aberto === 'mat'} onClick={() => setAberto(aberto === 'mat' ? null : 'mat')} />
        <ItemConferencia icone={Search} cor="amber" label="Por nome" valor={cruzamento.encontradosPorNome.length}
          aberto={aberto === 'nome'} onClick={() => setAberto(aberto === 'nome' ? null : 'nome')} />
        <ItemConferencia icone={XCircle} cor="rose" label="Não encontrados" valor={cruzamento.naoEncontrados.length}
          aberto={aberto === 'nao'} onClick={() => setAberto(aberto === 'nao' ? null : 'nao')} />
        <ItemConferencia icone={Users} cor="slate" label="Nomes duplicados" valor={cruzamento.nomesDuplicados.length}
          aberto={aberto === 'dup'} onClick={() => setAberto(aberto === 'dup' ? null : 'dup')} />
      </div>
      {aberto && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 max-h-64 overflow-y-auto text-xs space-y-1">
          {aberto === 'mat' && cruzamento.encontradosPorMatricula.map((r: any, i: number) => (
            <div key={i}>✓ {r.nome || r.alunoNomeSistema} — {r.matricula}</div>
          ))}
          {aberto === 'nome' && cruzamento.encontradosPorNome.map((r: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-500" /> {r.nome} — planilha: {r.matriculaOriginal} → sistema: {r.alunoNomeSistema}</div>
          ))}
          {aberto === 'nao' && cruzamento.naoEncontrados.map((r: any, i: number) => (
            <div key={i}>✗ {r.nome} — {r.matricula}</div>
          ))}
          {aberto === 'dup' && cruzamento.nomesDuplicados.map((r: any, i: number) => (
            <div key={i}>{r.nome} aparece {r.quantidade}x no sistema — resolva manualmente</div>
          ))}
          {(aberto === 'mat' ? cruzamento.encontradosPorMatricula.length
            : aberto === 'nome' ? cruzamento.encontradosPorNome.length
            : aberto === 'nao' ? cruzamento.naoEncontrados.length
            : cruzamento.nomesDuplicados.length) === 0 && <p className="text-slate-400">Nenhum.</p>}
        </div>
      )}
    </div>
  );
};

const ItemConferencia: React.FC<{ icone: any; cor: string; label: string; valor: number; aberto: boolean; onClick: () => void }> = ({ icone: Icone, cor, label, valor, aberto, onClick }) => (
  <button type="button" onClick={onClick} className={`p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800/60 ${aberto ? 'bg-slate-50 dark:bg-slate-800/60' : ''}`}>
    <Icone className={`h-5 w-5 mx-auto mb-1 text-${cor}-500`} />
    <p className="text-xl font-black text-slate-800 dark:text-white">{valor}</p>
    <p className="text-[10px] uppercase font-bold text-slate-400">{label}</p>
  </button>
);

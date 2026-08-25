import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import type { Prova, QuestaoProva, QuestaoTabela } from '../types';
import { ProvaPrintView } from './ProvaPrintView';
import {
  FileText, Plus, Trash2, Copy, Printer, Lock, Unlock, ChevronUp, ChevronDown,
  ListChecks, AlignLeft, ArrowLeft, AlertTriangle, CheckCircle2, ImagePlus, Table2,
  Rows3, Columns3, ArrowLeftRight
} from 'lucide-react';

// Estimativa de quanto cada tipo de questão "pesa" numa página impressa —
// usada só pra avisar o professor ANTES de ele fechar a prova, não pra
// travar a impressão em si. Números calibrados olhando o modelo oficial:
// numa página A4 com a fonte usada aqui cabem, em média, essa quantidade de
// linhas de conteúdo de prova.
const LINHAS_POR_PAGINA_NORMAL = 55;
const LINHAS_POR_PAGINA_DUAS_COLUNAS = 100; // duas colunas cabem mais no total
const linhasEstimadasDaQuestao = (q: QuestaoProva): number => {
  const linhasEnunciado = Math.max(1, Math.ceil((q.enunciado || '').length / 70));
  let total = linhasEnunciado;
  if (q.tipo === 'multipla_escolha') {
    total += (q.alternativas?.length || 0) + 1;
  } else if (q.tipo === 'correlacao') {
    total += Math.max(q.colunaA?.length || 0, q.colunaB?.length || 0) + 1;
  } else {
    total += 3; // objetiva: espaço pra resposta
  }
  // Imagem e tabela ocupam espaço real na página impressa — estimativa
  // aproximada baseada na largura escolhida (quanto maior, mais alto costuma
  // ficar também, numa proporção grosseira mas suficiente pro aviso).
  if (q.imagem) total += Math.round(q.imagem.larguraPercentual / 8) + 2;
  if (q.tabela) total += q.tabela.linhas.length + 2;
  return total;
};

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export const ProvaEditor: React.FC = () => {
  const {
    currentUser, users, classes, subjects, courses,
    provas, criarProva, salvarProvaContexto, excluirProvaContexto,
  } = useApp();

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [imprimindoId, setImprimindoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarExclusaoId, setConfirmarExclusaoId] = useState<string | null>(null);

  const minhasProvasTodas = useMemo(
    () => provas.filter(p => p.professorId === currentUser?.id || p.professorId === currentUser?.contaId)
              .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime()),
    [provas, currentUser]
  );

  const provaEditando = editandoId ? provas.find(p => p.id === editandoId) : null;
  const provaImprimindo = imprimindoId ? provas.find(p => p.id === imprimindoId) : null;

  // As turmas/disciplinas que ESTE professor pode escolher — as mesmas que
  // ele já dá aula, nada de digitar nome à mão e errar.
  const meusDiarios = useMemo(() => {
    const lista = currentUser?.assignedJournals || [];
    return lista.map(j => {
      const turma = classes.find(c => c.id === j.classId);
      const disciplina = subjects.find(s => s.id === j.subjectId);
      return { classId: j.classId, subjectId: j.subjectId, turma, disciplina };
    }).filter(x => x.turma && x.disciplina);
  }, [currentUser, classes, subjects]);

  if (imprimindoId && provaImprimindo) {
    return <ProvaPrintView prova={provaImprimindo} onClose={() => setImprimindoId(null)} />;
  }

  if (editandoId && provaEditando) {
    return (
      <ProvaFormulario
        prova={provaEditando}
        meusDiarios={meusDiarios}
        salvando={salvando}
        erro={erro}
        onVoltar={() => { setEditandoId(null); setErro(null); }}
        onImprimir={() => setImprimindoId(provaEditando.id)}
        onSalvar={async (atualizada) => {
          setSalvando(true); setErro(null);
          const resultado = await salvarProvaContexto(atualizada);
          setSalvando(false);
          if (!resultado.ok) { setErro(resultado.erro || 'Não foi possível salvar.'); return false; }
          return true;
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" /> Criador de Provas
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Monte a prova, feche quando estiver pronta, e baixe já formatada no padrão oficial da escola.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!currentUser) return;
            const nova = criarProva(currentUser.contaId || currentUser.id);
            setEditandoId(nova.id);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" /> Nova Prova
        </button>
      </div>

      {minhasProvasTodas.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-250 dark:border-slate-700 rounded-2xl p-12 text-center">
          <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">Nenhuma prova criada ainda.</p>
          <p className="text-xs text-slate-400 mt-1">Clique em "Nova Prova" pra começar a montar a sua primeira avaliação.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {minhasProvasTodas.map(prova => {
            const turma = classes.find(c => c.id === prova.turmaId);
            const disciplina = subjects.find(s => s.id === prova.disciplinaId);
            return (
              <div key={prova.id} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white truncate">{prova.titulo}</h3>
                    <p className="text-[11px] text-slate-500 truncate">
                      {disciplina?.name || 'Sem disciplina'} {turma ? `· ${turma.name}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                    prova.status === 'finalizada'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                  }`}>
                    {prova.status === 'finalizada' ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5" />}
                    {prova.status === 'finalizada' ? 'Fechada' : 'Rascunho'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  {prova.questoes.length} questõe(s) · {prova.dataProva ? new Date(prova.dataProva + 'T00:00:00').toLocaleDateString('pt-BR') : 'sem data'}
                </p>

                <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditandoId(prova.id)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-all"
                  >
                    {prova.status === 'finalizada' ? 'Ver' : 'Editar'}
                  </button>
                  {prova.status === 'finalizada' && (
                    <button
                      type="button"
                      onClick={() => setImprimindoId(prova.id)}
                      title="Baixar / Imprimir"
                      className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-400 rounded-lg transition-all"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!currentUser) return;
                      const copia: Prova = {
                        ...prova,
                        id: `prova_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                        titulo: `${prova.titulo} (cópia)`,
                        status: 'rascunho',
                        criadoEm: new Date().toISOString(),
                        atualizadoEm: new Date().toISOString(),
                      };
                      await salvarProvaContexto(copia);
                      setEditandoId(copia.id);
                    }}
                    title="Duplicar"
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-all"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {confirmarExclusaoId === prova.id ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await excluirProvaContexto(prova.id);
                        setConfirmarExclusaoId(null);
                      }}
                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold transition-all animate-pulse"
                    >
                      Confirma?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmarExclusaoId(prova.id)}
                      title="Excluir"
                      className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * FORMULÁRIO — cabeçalho + montador de questões
 * ========================================================================== */

const ProvaFormulario: React.FC<{
  prova: Prova;
  meusDiarios: { classId: string; subjectId: string; turma?: any; disciplina?: any }[];
  salvando: boolean;
  erro: string | null;
  onVoltar: () => void;
  onImprimir: () => void;
  onSalvar: (p: Prova) => Promise<boolean>;
}> = ({ prova, meusDiarios, salvando, erro, onVoltar, onImprimir, onSalvar }) => {
  const [rascunho, setRascunho] = useState<Prova>(prova);
  const bloqueada = rascunho.status === 'finalizada';

  const totalLinhas = rascunho.questoes.reduce((soma, q) => soma + linhasEstimadasDaQuestao(q), 0);
  const linhasPorPagina = rascunho.layout === 'duas_colunas' ? LINHAS_POR_PAGINA_DUAS_COLUNAS : LINHAS_POR_PAGINA_NORMAL;
  const paginasEstimadas = Math.max(1, Math.ceil(totalLinhas / linhasPorPagina));
  const dentroDoLimite = paginasEstimadas <= 2;

  const atualizar = (campo: keyof Prova, valor: any) => setRascunho(prev => ({ ...prev, [campo]: valor }));

  const adicionarQuestao = (tipo: QuestaoProva['tipo']) => {
    const nova: QuestaoProva = {
      id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tipo,
      enunciado: '',
      alternativas: tipo === 'multipla_escolha' ? ['', '', '', ''] : undefined,
      colunaA: tipo === 'correlacao' ? ['', '', ''] : undefined,
      colunaB: tipo === 'correlacao' ? ['', '', ''] : undefined,
    };
    setRascunho(prev => ({ ...prev, questoes: [...prev.questoes, nova] }));
  };

  const atualizarQuestao = (id: string, updates: Partial<QuestaoProva>) => {
    setRascunho(prev => ({
      ...prev,
      questoes: prev.questoes.map(q => q.id === id ? { ...q, ...updates } : q),
    }));
  };

  const removerQuestao = (id: string) => {
    setRascunho(prev => ({ ...prev, questoes: prev.questoes.filter(q => q.id !== id) }));
  };

  /* ------------------------------------------------------------ imagem na questão */

  const inserirImagem = (questaoId: string, arquivo: File) => {
    // Lida com o arquivo direto no navegador — vira base64 e fica gravado
    // dentro do JSON da própria prova, sem precisar de nenhum servidor de
    // arquivo separado. Suficiente pra imagem de questão de prova (não é
    // pensado pra vídeo ou arquivo gigante).
    const leitor = new FileReader();
    leitor.onload = (e) => {
      const dataUrl = e.target?.result as string;
      atualizarQuestao(questaoId, { imagem: { dataUrl, larguraPercentual: 55 } });
    };
    leitor.readAsDataURL(arquivo);
  };

  const removerImagem = (questaoId: string) => {
    atualizarQuestao(questaoId, { imagem: undefined });
  };

  const redimensionarImagem = (questaoId: string, imagem: NonNullable<QuestaoProva['imagem']>, larguraPercentual: number) => {
    atualizarQuestao(questaoId, { imagem: { ...imagem, larguraPercentual } });
  };

  /* ------------------------------------------------------------ tabela na questão */

  const criarTabelaVazia = (linhas: number, colunas: number): string[][] =>
    Array.from({ length: linhas }, () => Array.from({ length: colunas }, () => ''));

  const inserirTabela = (questaoId: string) => {
    atualizarQuestao(questaoId, { tabela: { linhas: criarTabelaVazia(2, 2), larguraPercentual: 80 } });
  };

  const removerTabela = (questaoId: string) => {
    atualizarQuestao(questaoId, { tabela: undefined });
  };

  const redimensionarTabela = (questaoId: string, tabela: QuestaoTabela, larguraPercentual: number) => {
    atualizarQuestao(questaoId, { tabela: { ...tabela, larguraPercentual } });
  };

  const adicionarLinhaTabela = (questaoId: string, tabela: QuestaoTabela) => {
    const colunas = tabela.linhas[0]?.length || 2;
    atualizarQuestao(questaoId, { tabela: { ...tabela, linhas: [...tabela.linhas, Array.from({ length: colunas }, () => '')] } });
  };

  const removerLinhaTabela = (questaoId: string, tabela: QuestaoTabela) => {
    if (tabela.linhas.length <= 1) return; // sempre sobra pelo menos 1 linha
    atualizarQuestao(questaoId, { tabela: { ...tabela, linhas: tabela.linhas.slice(0, -1) } });
  };

  const adicionarColunaTabela = (questaoId: string, tabela: QuestaoTabela) => {
    atualizarQuestao(questaoId, { tabela: { ...tabela, linhas: tabela.linhas.map(linha => [...linha, '']) } });
  };

  const removerColunaTabela = (questaoId: string, tabela: QuestaoTabela) => {
    if ((tabela.linhas[0]?.length || 0) <= 1) return; // sempre sobra pelo menos 1 coluna
    atualizarQuestao(questaoId, { tabela: { ...tabela, linhas: tabela.linhas.map(linha => linha.slice(0, -1)) } });
  };

  const atualizarCelulaTabela = (questaoId: string, tabela: QuestaoTabela, linhaIdx: number, colIdx: number, valor: string) => {
    const novasLinhas = tabela.linhas.map((linha, li) =>
      li === linhaIdx ? linha.map((c, ci) => (ci === colIdx ? valor : c)) : linha
    );
    atualizarQuestao(questaoId, { tabela: { ...tabela, linhas: novasLinhas } });
  };

  /* ------------------------------------------------------------ correlacionar colunas */

  const atualizarItemColuna = (questao: QuestaoProva, coluna: 'colunaA' | 'colunaB', idx: number, valor: string) => {
    const nova = [...(questao[coluna] || [])];
    nova[idx] = valor;
    atualizarQuestao(questao.id, { [coluna]: nova } as Partial<QuestaoProva>);
  };

  const adicionarItemColuna = (questao: QuestaoProva, coluna: 'colunaA' | 'colunaB') => {
    atualizarQuestao(questao.id, { [coluna]: [...(questao[coluna] || []), ''] } as Partial<QuestaoProva>);
  };

  const removerItemColuna = (questao: QuestaoProva, coluna: 'colunaA' | 'colunaB', idx: number) => {
    const atual = questao[coluna] || [];
    if (atual.length <= 1) return; // sempre sobra pelo menos 1 item
    atualizarQuestao(questao.id, { [coluna]: atual.filter((_, i) => i !== idx) } as Partial<QuestaoProva>);
  };

  const moverQuestao = (id: string, direcao: -1 | 1) => {
    setRascunho(prev => {
      const idx = prev.questoes.findIndex(q => q.id === id);
      const novoIdx = idx + direcao;
      if (novoIdx < 0 || novoIdx >= prev.questoes.length) return prev;
      const copia = [...prev.questoes];
      [copia[idx], copia[novoIdx]] = [copia[novoIdx], copia[idx]];
      return { ...prev, questoes: copia };
    });
  };

  const escolherDiario = (chave: string) => {
    const [classId, subjectId] = chave.split('|');
    setRascunho(prev => ({ ...prev, turmaId: classId, disciplinaId: subjectId }));
  };

  const chaveDiarioAtual = rascunho.turmaId && rascunho.disciplinaId ? `${rascunho.turmaId}|${rascunho.disciplinaId}` : '';

  const salvarComo = async (novoStatus: 'rascunho' | 'finalizada') => {
    if (novoStatus === 'finalizada' && !dentroDoLimite) {
      const confirmou = window.confirm(
        `A prova está estimada em ${paginasEstimadas} páginas — o padrão é até 2. ` +
        `Ainda assim, o texto real pode caber diferente do estimado (isto é só um cálculo aproximado, não uma medida exata). ` +
        `Quer fechar mesmo assim? Se preferir, volte e reduza o número de questões antes.`
      );
      if (!confirmou) return;
    }
    const ok = await onSalvar({ ...rascunho, status: novoStatus });
    if (ok && novoStatus === 'finalizada') onImprimir();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onVoltar} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar pra lista
        </button>
        {bloqueada && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[11px] font-bold">
            <Lock className="h-3 w-3" /> Prova fechada — só leitura. Duplique pra criar uma versão nova editável.
          </span>
        )}
      </div>

      {erro && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-xl text-xs font-bold">
          ⚠️ {erro}
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Cabeçalho da Prova</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Título da Avaliação</label>
            <input
              type="text" disabled={bloqueada} value={rascunho.titulo}
              onChange={(e) => atualizar('titulo', e.target.value)}
              placeholder="Ex: 1ª Avaliação de Anatomia"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Turma / Componente Curricular</label>
            <select
              disabled={bloqueada} value={chaveDiarioAtual}
              onChange={(e) => escolherDiario(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none disabled:opacity-60"
            >
              <option value="">Selecione...</option>
              {meusDiarios.map(d => (
                <option key={`${d.classId}|${d.subjectId}`} value={`${d.classId}|${d.subjectId}`}>
                  {d.disciplina?.name} — {d.turma?.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data da Prova</label>
            <input
              type="date" disabled={bloqueada} value={rascunho.dataProva || ''}
              onChange={(e) => atualizar('dataProva', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sala</label>
            <input
              type="text" disabled={bloqueada} value={rascunho.sala || ''}
              onChange={(e) => atualizar('sala', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Turno</label>
            <select
              disabled={bloqueada} value={rascunho.turno || ''}
              onChange={(e) => atualizar('turno', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none disabled:opacity-60"
            >
              <option value="">-</option>
              <option value="MATUTINO">Matutino</option>
              <option value="VESPERTINO">Vespertino</option>
              <option value="NOTURNO">Noturno</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Frase Motivacional <span className="font-normal normal-case text-slate-400">(opcional)</span>
            </label>
            <input
              type="text" disabled={bloqueada} value={rascunho.fraseMotivacional || ''}
              onChange={(e) => atualizar('fraseMotivacional', e.target.value)}
              placeholder='Ex: "O sucesso é a soma de pequenos esforços repetidos todos os dias."'
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none disabled:opacity-60"
            />
            {/* Alinhamento — só faz sentido escolher se tiver frase digitada.
                Aparece sempre no rodapé da prova impressa, não mais junto das
                questões. */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Alinhamento no rodapé:</span>
              {(['left', 'center', 'right'] as const).map(opcao => (
                <button
                  key={opcao} type="button" disabled={bloqueada}
                  onClick={() => atualizar('fraseMotivacionalAlinhamento', opcao)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-60 ${
                    (rascunho.fraseMotivacionalAlinhamento || 'center') === opcao
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {opcao === 'left' ? 'Esquerda' : opcao === 'center' ? 'Centro' : 'Direita'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Observações pra fazer a prova <span className="font-normal normal-case text-slate-400">(opcional)</span>
            </label>
            <input
              type="text" disabled={bloqueada} value={rascunho.observacoes || ''}
              onChange={(e) => atualizar('observacoes', e.target.value)}
              placeholder="Ex: Uso de caneta azul ou preta. Não é permitido o uso de calculadora."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Layout de Impressão</label>
          <div className="flex gap-2">
            {(['normal', 'duas_colunas'] as const).map(opcao => (
              <button
                key={opcao} type="button" disabled={bloqueada}
                onClick={() => atualizar('layout', opcao)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-60 ${
                  rascunho.layout === opcao
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {opcao === 'normal' ? 'Coluna Única' : 'Duas Colunas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* QUESTÕES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Questões ({rascunho.questoes.length})</h3>
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
            dentroDoLimite
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
          }`}>
            {dentroDoLimite ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            ~{paginasEstimadas} página(s) estimada(s) de 2
          </span>
        </div>

        {rascunho.questoes.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">Nenhuma questão ainda — adicione a primeira abaixo.</p>
        )}

        <div className="space-y-4">
          {rascunho.questoes.map((questao, idx) => (
            <div key={questao.id} className="border border-slate-150 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-slate-50/40 dark:bg-slate-800/20">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-black text-slate-500">
                  {questao.tipo === 'multipla_escolha' ? <ListChecks className="h-3.5 w-3.5" /> : questao.tipo === 'correlacao' ? <ArrowLeftRight className="h-3.5 w-3.5" /> : <AlignLeft className="h-3.5 w-3.5" />}
                  Questão {idx + 1} — {questao.tipo === 'multipla_escolha' ? 'Múltipla Escolha' : questao.tipo === 'correlacao' ? 'Correlacionar Colunas' : 'Objetiva'}
                </span>
                {!bloqueada && (
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moverQuestao(questao.id, -1)} disabled={idx === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => moverQuestao(questao.id, 1)} disabled={idx === rascunho.questoes.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => removerQuestao(questao.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>

              <textarea
                disabled={bloqueada} value={questao.enunciado}
                onChange={(e) => atualizarQuestao(questao.id, { enunciado: e.target.value })}
                placeholder="Digite o enunciado da questão..."
                rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none resize-none disabled:opacity-60"
              />

              {/* IMAGEM NA QUESTÃO — opcional. Fica gravada em base64 dentro
                  da própria prova, sem precisar de servidor de arquivo à
                  parte. Redimensionável pelo controle deslizante. */}
              {questao.imagem && (
                <div className="pl-2 space-y-1.5">
                  <img
                    src={questao.imagem.dataUrl} alt="Imagem da questão"
                    style={{ width: `${questao.imagem.larguraPercentual}%`, maxWidth: '100%' }}
                    className="rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Tamanho:</span>
                    <input
                      type="range" min={10} max={100} disabled={bloqueada}
                      value={questao.imagem.larguraPercentual}
                      onChange={(e) => redimensionarImagem(questao.id, questao.imagem!, Number(e.target.value))}
                      className="flex-1 max-w-[160px]"
                    />
                    <span className="text-[10px] font-mono text-slate-400 w-9">{questao.imagem.larguraPercentual}%</span>
                    {!bloqueada && (
                      <button type="button" onClick={() => removerImagem(questao.id)} className="text-[10px] font-bold text-red-500 hover:underline ml-1">
                        Remover imagem
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TABELA NA QUESTÃO — opcional. Uma grade simples de texto,
                  redimensionável, com botões pra adicionar/remover linha e
                  coluna. */}
              {questao.tabela && (
                <div className="pl-2 space-y-1.5">
                  <div style={{ width: `${questao.tabela.larguraPercentual}%`, maxWidth: '100%' }} className="overflow-x-auto">
                    <table className="border-collapse w-full">
                      <tbody>
                        {questao.tabela.linhas.map((linha, li) => (
                          <tr key={li}>
                            {linha.map((celula, ci) => (
                              <td key={ci} className="border border-slate-300 dark:border-slate-600 p-0">
                                <input
                                  type="text" disabled={bloqueada} value={celula}
                                  onChange={(e) => atualizarCelulaTabela(questao.id, questao.tabela!, li, ci, e.target.value)}
                                  className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 text-xs outline-none disabled:opacity-60"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!bloqueada && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button type="button" onClick={() => adicionarLinhaTabela(questao.id, questao.tabela!)} className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        <Rows3 className="h-3 w-3" /> + Linha
                      </button>
                      <button type="button" onClick={() => removerLinhaTabela(questao.id, questao.tabela!)} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        − Linha
                      </button>
                      <button type="button" onClick={() => adicionarColunaTabela(questao.id, questao.tabela!)} className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        <Columns3 className="h-3 w-3" /> + Coluna
                      </button>
                      <button type="button" onClick={() => removerColunaTabela(questao.id, questao.tabela!)} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        − Coluna
                      </button>
                      <span className="text-[10px] font-bold text-slate-500 uppercase ml-2">Tamanho:</span>
                      <input
                        type="range" min={30} max={100}
                        value={questao.tabela.larguraPercentual}
                        onChange={(e) => redimensionarTabela(questao.id, questao.tabela!, Number(e.target.value))}
                        className="flex-1 max-w-[140px]"
                      />
                      <span className="text-[10px] font-mono text-slate-400 w-9">{questao.tabela.larguraPercentual}%</span>
                      <button type="button" onClick={() => removerTabela(questao.id)} className="text-[10px] font-bold text-red-500 hover:underline ml-1">
                        Remover tabela
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Botões pra inserir imagem/tabela — só aparecem se a questão
                  ainda não tiver uma (não faz sentido ter duas imagens ou
                  duas tabelas soltas na mesma questão; se precisar de mais,
                  cria outra questão). */}
              {!bloqueada && (
                <div className="flex items-center gap-2 pl-2">
                  {!questao.imagem && (
                    <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 rounded-lg text-[11px] font-bold transition-all cursor-pointer">
                      <ImagePlus className="h-3.5 w-3.5" /> + Imagem
                      <input
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) inserirImagem(questao.id, f); e.target.value = ''; }}
                      />
                    </label>
                  )}
                  {!questao.tabela && (
                    <button
                      type="button" onClick={() => inserirTabela(questao.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100 text-teal-700 dark:text-teal-400 rounded-lg text-[11px] font-bold transition-all"
                    >
                      <Table2 className="h-3.5 w-3.5" /> + Tabela
                    </button>
                  )}
                </div>
              )}

              {questao.tipo === 'multipla_escolha' && (
                <div className="space-y-2 pl-2">
                  {(questao.alternativas || []).map((alt, altIdx) => (
                    <div key={altIdx} className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 text-[10px] font-bold text-slate-500 shrink-0">
                        {LETRAS[altIdx]}
                      </span>
                      <input
                        type="text" disabled={bloqueada} value={alt}
                        onChange={(e) => {
                          const novas = [...(questao.alternativas || [])];
                          novas[altIdx] = e.target.value;
                          atualizarQuestao(questao.id, { alternativas: novas });
                        }}
                        placeholder={`Alternativa ${LETRAS[altIdx]}`}
                        className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none disabled:opacity-60"
                      />
                      {!bloqueada && (questao.alternativas || []).length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const novas = (questao.alternativas || []).filter((_, i) => i !== altIdx);
                            const gabaritoAindaValido = questao.gabarito && LETRAS.indexOf(questao.gabarito) < novas.length;
                            atualizarQuestao(questao.id, { alternativas: novas, gabarito: gabaritoAindaValido ? questao.gabarito : undefined });
                          }}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!bloqueada && (questao.alternativas || []).length < 8 && (
                    <button
                      type="button"
                      onClick={() => atualizarQuestao(questao.id, { alternativas: [...(questao.alternativas || []), ''] })}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      + Adicionar alternativa
                    </button>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Gabarito (opcional):</label>
                    <select
                      disabled={bloqueada} value={questao.gabarito || ''}
                      onChange={(e) => atualizarQuestao(questao.id, { gabarito: e.target.value || undefined })}
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none disabled:opacity-60"
                    >
                      <option value="">Não configurar</option>
                      {(questao.alternativas || []).map((_, altIdx) => (
                        <option key={altIdx} value={LETRAS[altIdx]}>{LETRAS[altIdx]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {questao.tipo === 'objetiva' && !bloqueada && (
                <div className="flex items-center gap-2 pl-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Resposta esperada / gabarito (opcional):</label>
                  <input
                    type="text" value={questao.gabarito || ''}
                    onChange={(e) => atualizarQuestao(questao.id, { gabarito: e.target.value || undefined })}
                    className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                  />
                </div>
              )}

              {questao.tipo === 'correlacao' && (
                <div className="pl-2 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Coluna A — numerada (1, 2, 3...) */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Coluna 1 (numerada)</span>
                      {(questao.colunaA || []).map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-5 h-5 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 text-[10px] font-bold text-slate-500 shrink-0">
                            {i + 1}
                          </span>
                          <input
                            type="text" disabled={bloqueada} value={item}
                            onChange={(e) => atualizarItemColuna(questao, 'colunaA', i, e.target.value)}
                            placeholder={`Item ${i + 1}`}
                            className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none disabled:opacity-60"
                          />
                          {!bloqueada && (questao.colunaA || []).length > 1 && (
                            <button type="button" onClick={() => removerItemColuna(questao, 'colunaA', i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                          )}
                        </div>
                      ))}
                      {!bloqueada && (
                        <button type="button" onClick={() => adicionarItemColuna(questao, 'colunaA')} className="text-[11px] font-bold text-blue-600 hover:underline">
                          + Adicionar item
                        </button>
                      )}
                    </div>

                    {/* Coluna B — com letra (A, B, C...) */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Coluna 2 (com letra)</span>
                      {(questao.colunaB || []).map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-5 h-5 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 text-[10px] font-bold text-slate-500 shrink-0">
                            {LETRAS[i]}
                          </span>
                          <input
                            type="text" disabled={bloqueada} value={item}
                            onChange={(e) => atualizarItemColuna(questao, 'colunaB', i, e.target.value)}
                            placeholder={`Item ${LETRAS[i]}`}
                            className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none disabled:opacity-60"
                          />
                          {!bloqueada && (questao.colunaB || []).length > 1 && (
                            <button type="button" onClick={() => removerItemColuna(questao, 'colunaB', i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                          )}
                        </div>
                      ))}
                      {!bloqueada && (
                        <button type="button" onClick={() => adicionarItemColuna(questao, 'colunaB')} className="text-[11px] font-bold text-blue-600 hover:underline">
                          + Adicionar item
                        </button>
                      )}
                    </div>
                  </div>

                  {!bloqueada && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Gabarito (opcional):</label>
                      {(questao.colunaA || []).map((_, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400">{i + 1} =</span>
                          <select
                            value={questao.gabaritoCorrelacao?.[i] || ''}
                            onChange={(e) => {
                              const novo = [...(questao.gabaritoCorrelacao || [])];
                              novo[i] = e.target.value;
                              atualizarQuestao(questao.id, { gabaritoCorrelacao: novo });
                            }}
                            className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[10px] outline-none"
                          >
                            <option value="">-</option>
                            {(questao.colunaB || []).map((_, bi) => (
                              <option key={bi} value={LETRAS[bi]}>{LETRAS[bi]}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {!bloqueada && (
          <div className="flex gap-2 pt-2">
            <button
              type="button" onClick={() => adicionarQuestao('multipla_escolha')}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all"
            >
              <ListChecks className="h-3.5 w-3.5" /> + Múltipla Escolha
            </button>
            <button
              type="button" onClick={() => adicionarQuestao('objetiva')}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100 text-teal-700 dark:text-teal-400 rounded-xl text-xs font-bold transition-all"
            >
              <AlignLeft className="h-3.5 w-3.5" /> + Objetiva
            </button>
            <button
              type="button" onClick={() => adicionarQuestao('correlacao')}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 text-purple-700 dark:text-purple-400 rounded-xl text-xs font-bold transition-all"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" /> + Correlacionar Colunas
            </button>
          </div>
        )}
      </div>

      {/* AÇÕES */}
      <div className="flex items-center justify-end gap-2">
        {!bloqueada ? (
          <>
            <button
              type="button" disabled={salvando}
              onClick={() => salvarComo('rascunho')}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar Rascunho'}
            </button>
            <button
              type="button" disabled={salvando || rascunho.questoes.length === 0}
              onClick={() => salvarComo('finalizada')}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm disabled:opacity-50"
            >
              <Lock className="h-4 w-4" /> Fechar Prova e Baixar
            </button>
          </>
        ) : (
          <button
            type="button" onClick={onImprimir}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
          >
            <Printer className="h-4 w-4" /> Baixar / Imprimir
          </button>
        )}
      </div>
    </div>
  );
};

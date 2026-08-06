import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BookMarked, Printer, Save, Check, AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ClassSection, Subject } from '../types';
import {
  salvarConteudoProgramatico,
  carregarConteudoProgramatico,
  LinhaDeConteudo,
  LINHAS_POR_PAGINA,
  PAGINAS_DE_CONTEUDO,
  TOTAL_DE_LINHAS,
} from '../lib/repositorios';

/**
 * REGISTRO DE CONTEÚDO PROGRAMÁTICO
 *
 * Reproduz o formulário em papel usado pela secretaria: data, conteúdo
 * ministrado e observações pedagógicas, 27 linhas por página, 10 páginas por
 * disciplina.
 *
 * UMA PÁGINA POR VEZ NA TELA, TODAS NA IMPRESSÃO.
 *
 * As 270 linhas existem o tempo todo em memória, mas só as 27 da página atual
 * viram campos de digitação. Renderizar 810 campos de uma vez (270 linhas × 3
 * colunas) trava a digitação em máquina modesta — e a secretaria da escola não
 * tem máquina boa. Na impressão o navegador recebe as 10 páginas montadas como
 * tabela simples, sem campo nenhum.
 *
 * A turma e a disciplina chegam por propriedade porque quem manda nelas é o
 * painel do professor: `selectedClass` é calculado lá, a partir dos diários
 * atribuídos a ele, e não existe no contexto global.
 */
interface Props {
  turma?: ClassSection;
  disciplina?: Subject;
}

export const ContentRegistry: React.FC<Props> = ({ turma, disciplina }) => {
  const { courses, currentPeriod, currentUser } = useApp();

  const [linhas, setLinhas] = useState<LinhaDeConteudo[]>(() =>
    Array.from({ length: TOTAL_DE_LINHAS }, () => ({ data: '', conteudo: '', observacoes: '' }))
  );
  const [pagina, setPagina] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [estado, setEstado] = useState<'parado' | 'salvando' | 'salvo' | 'erro'>('parado');
  const [erro, setErro] = useState('');

  const curso = useMemo(
    () => courses.find(c => c.id === turma?.courseId),
    [courses, turma?.courseId]
  );

  // O PERÍODO É O DA TURMA, NÃO O SELECIONADO NA TELA.
  //
  // O diário é identificado por turma + disciplina + período. Usando o período
  // da tela, abrir o conteúdo de uma turma de 2025/2 com a tela em 2026/2
  // apontaria para um diário que não é o dela — gravando no lugar errado, ou
  // criando um diário carimbado com o semestre errado.
  const periodoDaTurma = (turma?.year && turma?.semester)
    ? `${turma.year}/${turma.semester}`
    : currentPeriod;

  const turnoLegivel = (s?: string) => {
    if (!s) return '';
    if (s === 'SÁBADO') return 'SÁBADO';
    return s.charAt(0) + s.slice(1).toLowerCase();
  };

  /* ------------------------------------------------------------ carregamento */

  useEffect(() => {
    let cancelado = false;
    const vazias = () =>
      Array.from({ length: TOTAL_DE_LINHAS }, () => ({ data: '', conteudo: '', observacoes: '' }));

    if (!turma?.id || !disciplina?.id) {
      setLinhas(vazias());
      return;
    }

    setCarregando(true);
    setEstado('parado');
    setErro('');
    setPagina(0);

    carregarConteudoProgramatico(turma.id, disciplina.id, periodoDaTurma)
      .then(res => {
        if (cancelado) return;
        // `null` significa que o diário ainda não existe no servidor — o
        // formulário abre em branco, e a primeira gravação é que vai avisar
        // se o diário não pode ser criado.
        setLinhas(res ?? vazias());
      })
      .catch(() => {
        if (cancelado) return;
        setLinhas(vazias());
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => { cancelado = true; };
  }, [turma?.id, disciplina?.id, periodoDaTurma]);

  /* --------------------------------------------------------------- gravação */

  const linhasRef = useRef(linhas);
  linhasRef.current = linhas;
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gravar = useCallback(async () => {
    if (!turma?.id || !disciplina?.id) return;
    setEstado('salvando');
    setErro('');
    const r = await salvarConteudoProgramatico(
      turma.id, disciplina.id, periodoDaTurma, linhasRef.current
    );
    if (r.ok) {
      setEstado('salvo');
    } else {
      // O MOTIVO PRECISA APARECER NA TELA.
      //
      // Uma falha aqui é quase sempre permissão ou diário inexistente — nada
      // que se resolva "tentando de novo". Sem o motivo visível, o professor
      // digita as 270 linhas e só descobre no dia da impressão.
      setEstado('erro');
      setErro(r.erro || 'Não foi possível salvar.');
    }
  }, [turma?.id, disciplina?.id, periodoDaTurma]);

  const alterar = (indice: number, campo: keyof LinhaDeConteudo, valor: string) => {
    setLinhas(anterior => {
      const copia = [...anterior];
      copia[indice] = { ...copia[indice], [campo]: valor };
      return copia;
    });
    setEstado('parado');

    // Grava sozinho 1,5 s depois da última tecla. Gravar a cada tecla seria uma
    // requisição por caractere; não gravar nada até o professor clicar em algo
    // repetiria o problema antigo do cabeçalho, que parecia salvo e não estava.
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => { void gravar(); }, 1500);
  };

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  /* --------------------------------------------------------------- impressão */

  const imprimir = () => {
    const janela = window.open('', '_blank', 'width=1100,height=800');
    if (!janela) {
      alert('O navegador bloqueou a janela de impressão. Libere as janelas pop-up para este site e tente de novo.');
      return;
    }

    const escapar = (t: string) =>
      (t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const cabecalho = `
      <table class="cab">
        <tr>
          <td class="logo">
            <div class="marca">LYNX <span>EDU</span></div>
            <div class="sub">SISTEMAS ESCOLARES INTELIGENTES</div>
          </td>
          <td class="titulo">
            REGISTRO DE CONTEÚDO PROGRAMÁTICO<br/>
            CURSO: ${escapar(curso?.name || '—')}
          </td>
          <td class="ident">
            ANO/ SEMESTRE: <b>${turma?.year || ''}/${turma?.semester || ''}</b><br/>
            MÓD.: <b>${turma?.module ?? ''}</b>&nbsp;&nbsp;&nbsp;TURMA: <b>${escapar(turma?.name || '')}</b><br/>
            TURNO.: <b>${escapar(turnoLegivel(turma?.shift))}</b>
          </td>
        </tr>
      </table>`;

    const paginas: string[] = [];
    for (let p = 0; p < PAGINAS_DE_CONTEUDO; p++) {
      const de = p * LINHAS_POR_PAGINA;
      const linhasHtml = linhas.slice(de, de + LINHAS_POR_PAGINA).map(l => `
        <tr>
          <td class="c-data">${escapar(l.data)}</td>
          <td class="c-cont">${escapar(l.conteudo)}</td>
          <td class="c-obs">${escapar(l.observacoes)}</td>
        </tr>`).join('');

      paginas.push(`
        <div class="pagina">
          ${cabecalho}
          <table class="grade">
            <thead>
              <tr>
                <th class="c-data">Data</th>
                <th class="c-cont">Conteúdo Ministrado – Comp. Curricular: ${escapar(disciplina?.name || '')}</th>
                <th class="c-obs">Observações Pedagógicas</th>
              </tr>
            </thead>
            <tbody>${linhasHtml}</tbody>
          </table>
          <table class="rodape">
            <tr>
              <td>${new Date().toLocaleDateString('pt-BR')}</td>
              <td class="ass">
                <div class="linha"></div>
                Nome do Professor${currentUser?.name ? `: ${escapar(currentUser.name)}` : ''}
              </td>
              <td class="ass">
                <div class="linha"></div>
                Assinatura Coordenador
              </td>
            </tr>
          </table>
          <div class="rodape-pag">Página ${p + 1} de ${PAGINAS_DE_CONTEUDO}</div>
        </div>`);
    }

    janela.document.write(`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Conteúdo Programático — ${escapar(turma?.name || '')} — ${escapar(disciplina?.name || '')}</title>
<style>
  /* PAISAGEM, NÃO RETRATO.
     Em retrato, a coluna do conteúdo ministrado fica estreita e a frase do
     professor quebra em três linhas, estourando a altura da linha e jogando
     conteúdo para a página seguinte. Deitada, a mesma frase cabe numa linha. */
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000; margin: 0; }
  .pagina { page-break-after: always; }
  .pagina:last-child { page-break-after: auto; }
  table { width: 100%; border-collapse: collapse; }
  .cab td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
  .logo { width: 20%; text-align: center; }
  .marca { font-weight: bold; font-size: 13pt; }
  .marca span { color: #1d4ed8; }
  .sub { font-size: 6pt; letter-spacing: .5px; }
  .titulo { width: 50%; text-align: center; font-weight: bold; font-size: 10pt; }
  .ident { width: 30%; font-size: 8pt; line-height: 1.6; }
  .grade { margin-top: -1px; }
  .grade th, .grade td { border: 1px solid #000; padding: 3px 5px; }
  .grade th { background: #e8e8e8; font-size: 8.5pt; text-align: left; }
  .grade td { height: 20px; vertical-align: top; word-break: break-word; }
  .c-data { width: 9%; }
  .c-cont { width: 61%; }
  .c-obs  { width: 30%; }
  .rodape { margin-top: 14px; font-size: 8pt; }
  .rodape td { padding-top: 16px; text-align: center; vertical-align: bottom; }
  .rodape .ass { width: 38%; }
  .rodape .linha { border-top: 1px solid #000; margin: 0 8px 3px; }
  .rodape-pag { text-align: right; font-size: 7pt; margin-top: 4px; color: #444; }
</style></head><body>${paginas.join('')}</body></html>`);

    janela.document.close();
    janela.focus();
    // O atraso dá tempo do navegador montar as 10 páginas antes de abrir a
    // caixa de impressão. Sem ele, sai página em branco em alguns navegadores.
    setTimeout(() => janela.print(), 400);
  };

  /* ------------------------------------------------------------------ tela */

  if (!turma || !disciplina) {
    return (
      <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
        <div className="p-3.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
          <BookMarked className="h-6 w-6" />
        </div>
        <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">Registro de Conteúdo Programático</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Escolha a turma e a disciplina ao lado para abrir o registro.
        </p>
      </div>
    );
  }

  const inicio = pagina * LINHAS_POR_PAGINA;
  const daPagina = linhas.slice(inicio, inicio + LINHAS_POR_PAGINA);
  const preenchidas = linhas.filter(
    l => l.data.trim() || l.conteudo.trim() || l.observacoes.trim()
  ).length;

  return (
    <div className="space-y-4">

      {/* Cabeçalho, igual ao do papel */}
      <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 dark:divide-slate-700">
          <div className="sm:col-span-5 p-3 bg-slate-50 dark:bg-slate-900/40">
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              REGISTRO DE CONTEÚDO PROGRAMÁTICO
            </div>
            <div className="text-slate-600 dark:text-slate-400 mt-0.5">
              CURSO: <b>{curso?.name || '—'}</b>
            </div>
          </div>
          <div className="sm:col-span-4 p-3 text-slate-600 dark:text-slate-400 leading-6">
            ANO/SEMESTRE: <b>{turma.year}/{turma.semester}</b><br />
            MÓD.: <b>{turma.module}</b> &nbsp; TURMA: <b>{turma.name}</b><br />
            TURNO: <b>{turnoLegivel(turma.shift)}</b>
          </div>
          <div className="sm:col-span-3 p-3 text-slate-600 dark:text-slate-400 leading-6">
            DISCIPLINA:<br /><b>{disciplina.name}</b>
          </div>
        </div>
      </div>

      {/* Barra de estado e ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          {carregando && (
            <span className="flex items-center gap-1.5 text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
            </span>
          )}
          {!carregando && estado === 'salvando' && (
            <span className="flex items-center gap-1.5 text-blue-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando…
            </span>
          )}
          {!carregando && estado === 'salvo' && (
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <Check className="h-3.5 w-3.5" /> Salvo no servidor
            </span>
          )}
          {!carregando && estado === 'parado' && (
            <span className="text-slate-400">
              {preenchidas} de {TOTAL_DE_LINHAS} linhas preenchidas
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void gravar()}
            disabled={carregando || estado === 'salvando'}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> Salvar agora
          </button>
          <button
            type="button"
            onClick={imprimir}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir {PAGINAS_DE_CONTEUDO} páginas
          </button>
        </div>
      </div>

      {estado === 'erro' && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <b>Não foi salvo no servidor.</b> {erro}
            <div className="mt-1 opacity-80">
              O que você digitou continua na tela. Não feche esta janela antes de conseguir salvar.
            </div>
          </div>
        </div>
      )}

      {/* Navegação entre páginas */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setPagina(p => Math.max(0, p - 1))}
          disabled={pagina === 0}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-1 flex-wrap justify-center">
          {Array.from({ length: PAGINAS_DE_CONTEUDO }, (_, p) => {
            const de = p * LINHAS_POR_PAGINA;
            const temAlgo = linhas.slice(de, de + LINHAS_POR_PAGINA)
              .some(l => l.data.trim() || l.conteudo.trim() || l.observacoes.trim());
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPagina(p)}
                className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${
                  p === pagina
                    ? 'bg-blue-600 text-white shadow'
                    : temAlgo
                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
                title={temAlgo ? `Página ${p + 1} — com conteúdo` : `Página ${p + 1} — em branco`}
              >
                {p + 1}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setPagina(p => Math.min(PAGINAS_DE_CONTEUDO - 1, p + 1))}
          disabled={pagina === PAGINAS_DE_CONTEUDO - 1}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* A grade da página atual */}
      <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-2xl">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800">
              <th className="p-2 text-left font-bold w-8 border-b border-slate-300 dark:border-slate-700">#</th>
              <th className="p-2 text-left font-bold w-28 border-b border-l border-slate-300 dark:border-slate-700">Data</th>
              <th className="p-2 text-left font-bold border-b border-l border-slate-300 dark:border-slate-700">
                Conteúdo Ministrado
              </th>
              <th className="p-2 text-left font-bold w-1/3 border-b border-l border-slate-300 dark:border-slate-700">
                Observações Pedagógicas
              </th>
            </tr>
          </thead>
          <tbody>
            {daPagina.map((linha, i) => {
              const indice = inicio + i;
              return (
                <tr key={indice} className="even:bg-slate-50/60 dark:even:bg-slate-900/30">
                  <td className="p-1 text-center text-slate-400 font-mono text-[10px] border-b border-slate-200 dark:border-slate-800">
                    {indice + 1}
                  </td>
                  <td className="p-0 border-b border-l border-slate-200 dark:border-slate-800">
                    <input
                      type="text"
                      value={linha.data}
                      onChange={e => alterar(indice, 'data', e.target.value)}
                      placeholder="__/__/____"
                      className="w-full px-2 py-1.5 bg-transparent outline-none focus:bg-blue-50 dark:focus:bg-blue-950/30"
                    />
                  </td>
                  <td className="p-0 border-b border-l border-slate-200 dark:border-slate-800">
                    <input
                      type="text"
                      value={linha.conteudo}
                      onChange={e => alterar(indice, 'conteudo', e.target.value)}
                      className="w-full px-2 py-1.5 bg-transparent outline-none focus:bg-blue-50 dark:focus:bg-blue-950/30"
                    />
                  </td>
                  <td className="p-0 border-b border-l border-slate-200 dark:border-slate-800">
                    <input
                      type="text"
                      value={linha.observacoes}
                      onChange={e => alterar(indice, 'observacoes', e.target.value)}
                      className="w-full px-2 py-1.5 bg-transparent outline-none focus:bg-blue-50 dark:focus:bg-blue-950/30"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-400 text-center">
        As linhas são salvas sozinhas 1,5 segundo depois que você para de digitar.
        A impressão sai sempre com as {PAGINAS_DE_CONTEUDO} páginas, mesmo as em branco.
      </p>
    </div>
  );
};

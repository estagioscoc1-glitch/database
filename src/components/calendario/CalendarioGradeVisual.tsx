import React from 'react';
import { NOMES_MESES, type DiaMarcadoCalendario } from '../../lib/calendarioEscolar';

// ===========================================================================
//  GRADE DE UM MÊS — mesmo layout do modelo em PDF (D S T Q Q S S, dias
//  marcados com cor; quando o dia tem "rótulo" — ex: DEP — ele aparece numa
//  caixinha cinza ao lado do número, na mesma linha da semana, igual ao
//  original).
//
//  IMPORTANTE: é um único CSS grid de 8 colunas (7 dias + 1 rótulo) para o
//  cabeçalho e TODAS as semanas — assim as 7 colunas de dias sempre têm a
//  mesma largura, mesmo em semanas sem rótulo. Antes cada semana tinha seu
//  próprio grid de 7 colunas ao lado de uma caixinha "shrink", e como o
//  espaço sobrando variava semana a semana, os quadradinhos (aspect-square)
//  saíam de tamanhos diferentes e desalinhados — foi isso que ficou torto.
//
//  Usada em três lugares:
//   - CalendarioEscolarModule (editor): clicável, `onSelecionarDia` abre o
//     painel de edição do dia.
//   - CalendarioEscolarView / CalendarioEscolarPrintView: apenas leitura.
// ===========================================================================

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const CORES: Record<DiaMarcadoCalendario['tipo'], string> = {
  inicio: 'bg-emerald-300 text-emerald-950',
  feriado: 'bg-amber-300 text-amber-950',
  avaliacao: 'bg-slate-300 text-slate-800',
};

interface Props {
  ano: number;
  mes: number; // 1–12
  diasMarcados: DiaMarcadoCalendario[];
  diaSelecionado?: number | null;
  onSelecionarDia?: (dia: number) => void;
  compacto?: boolean;
}

export const CalendarioGradeVisual: React.FC<Props> = ({
  ano,
  mes,
  diasMarcados,
  diaSelecionado = null,
  onSelecionarDia,
  compacto = false,
}) => {
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay(); // 0 = domingo
  const diasNoMes = new Date(ano, mes, 0).getDate();

  const marcaPorDia = new Map<number, DiaMarcadoCalendario>();
  diasMarcados.forEach(m => marcaPorDia.set(m.dia, m));

  const celulas: Array<number | null> = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];
  // completa a última linha com espaços em branco
  while (celulas.length % 7 !== 0) celulas.push(null);

  const semanas: Array<Array<number | null>> = [];
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));

  const notasDeRodape = diasMarcados
    .filter(m => m.legenda)
    .sort((a, b) => a.dia - b.dia);

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr) auto',
    columnGap: '2px',
    rowGap: '2px',
    alignItems: 'stretch',
  };

  return (
    <div className={compacto ? 'text-[10px]' : 'text-xs'}>
      <h4 className="font-black uppercase tracking-wide text-slate-700 dark:text-slate-200 mb-1.5">
        {NOMES_MESES[mes]}
      </h4>

      <div style={gridStyle}>
        {/* Cabeçalho — 7 letras dos dias da semana + coluna vazia do rótulo */}
        {DIAS_SEMANA.map((letra, i) => (
          <div key={`h${i}`} className="text-center font-bold text-slate-400 dark:text-slate-500">
            {letra}
          </div>
        ))}
        <div />

        {/* Semanas — 7 dias + 1 rótulo por linha, no MESMO grid do cabeçalho */}
        {semanas.map((semana, sIndex) => {
          const rotulosDaSemana = semana
            .filter((dia): dia is number => dia !== null)
            .map(dia => marcaPorDia.get(dia)?.rotulo)
            .filter((r): r is string => Boolean(r));

          return (
            <React.Fragment key={sIndex}>
              {semana.map((dia, i) => {
                if (dia === null) return <div key={i} />;
                const marca = marcaPorDia.get(dia);
                const clicavel = Boolean(onSelecionarDia);
                const selecionado = diaSelecionado === dia;

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!clicavel}
                    onClick={() => onSelecionarDia?.(dia)}
                    className={[
                      'aspect-square w-full rounded-md flex items-center justify-center leading-none font-bold',
                      marca ? CORES[marca.tipo] : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300',
                      clicavel ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : 'cursor-default',
                      selecionado ? 'ring-2 ring-blue-600' : '',
                    ].join(' ')}
                    title={marca?.legenda || undefined}
                  >
                    {dia}
                  </button>
                );
              })}

              {/* Caixinha do rótulo (DEP etc.) — sempre na mesma 8ª coluna */}
              <div className="flex items-center justify-start">
                {rotulosDaSemana.length > 0 && (
                  <span className="shrink-0 px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-black uppercase text-[8px] leading-none whitespace-nowrap">
                    {rotulosDaSemana.join(' ')}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {notasDeRodape.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {notasDeRodape.map((n, i) => (
            <p key={i} className="text-slate-500 dark:text-slate-400 leading-snug">
              <span className="font-bold">{n.dia}</span> – {n.legenda}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

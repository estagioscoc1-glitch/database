import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../lib/imageAssets';
import { GRADES_CURRICULARES } from '../data/gradesCurriculares';
import type { GradeCurricular } from '../data/gradesCurriculares';
import { Layers, Printer, GraduationCap, Clock } from 'lucide-react';

// GRADES CURRICULARES — escolhe o curso e mostra a matriz curricular
// oficial (módulos, componentes, carga horária) com visual moderno e o
// mesmo cabeçalho oficial já usado nas declarações. Conteúdo estático,
// extraído dos PDFs enviados pela escola — não depende do banco de dados.
//
// IMPRESSÃO — por que não é só window.print():
// chamar window.print() direto manda o navegador imprimir a PÁGINA INTEIRA:
// cabeçalho do LYnx, abas do menu, botões, seletor de curso. Saía em 3 folhas
// com a grade espremida no meio. A classe "no-print" que existia aqui nunca
// funcionou porque NÃO EXISTE regra .no-print no index.css — era decorativa.
// A solução é a mesma já usada e testada no ProvaPrintView: jogar só a folha
// num portal preso ao document.body e, no @media print, esconder o #root.
// Assim o navegador só enxerga a matriz curricular.

// Folha da matriz — usada tanto na tela quanto na impressão.
const FolhaGrade: React.FC<{ grade: GradeCurricular; paraImpressao?: boolean }> = ({
  grade,
  paraImpressao = false,
}) => (
  <div
    className={
      paraImpressao
        ? 'grade-folha bg-white'
        : 'grade-folha bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden'
    }
    style={{ padding: paraImpressao ? '0' : '2cm 2.2cm' }}
  >
    {/* Cabeçalho oficial — mesmo usado nas declarações */}
    <div className="flex items-center justify-center border-b border-slate-200 pb-6 mb-8">
      <img
        src={LOGO_COLEGIO_OSWALDO_CRUZ}
        alt="Colégio Oswaldo Cruz"
        className="w-full max-h-24 max-w-[850px] object-contain block"
        referrerPolicy="no-referrer"
      />
    </div>

    <div className="text-center mb-10">
      <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1">Matriz Curricular</p>
      <h2 className="text-2xl font-black text-slate-900">{grade.cursoNome}</h2>
      <div className="flex items-center justify-center gap-1.5 mt-2 text-slate-500">
        <Clock className="h-3.5 w-3.5" />
        <span className="text-xs font-bold">Carga Horária Total: {grade.cargaHorariaTotal} horas</span>
      </div>
    </div>

    <div className="space-y-6">
      {grade.modulos.map((modulo, idx) => {
        const totalModulo = modulo.componentes.reduce((s, c) => s + c.cargaHoraria, 0);
        return (
          <div key={idx} className="grade-modulo rounded-2xl overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <GraduationCap className="h-4 w-4" />
                <span className="font-black text-sm">{modulo.nome}</span>
              </div>
              <span className="text-[11px] font-bold text-blue-100">{totalModulo}h no módulo</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {modulo.componentes.map((c, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="py-2.5 px-5 text-slate-700">{c.nome}</td>
                    <td className="py-2.5 px-5 text-right font-mono font-bold text-slate-600 w-32">{c.cargaHoraria}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>

    <div className="grade-total mt-8 flex items-center justify-between px-5 py-4 bg-slate-900 rounded-2xl">
      <span className="text-white font-black text-sm uppercase tracking-wider">Carga Horária Total do Curso</span>
      <span className="text-white font-black text-2xl font-mono">{grade.cargaHorariaTotal}h</span>
    </div>
  </div>
);

const CSS_IMPRESSAO = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 1.4cm 1.5cm !important;
    }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .grade-print-portal {
      position: static !important;
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
    }
    /* Não deixa um módulo ser cortado no meio entre duas folhas */
    .grade-modulo { break-inside: avoid; page-break-inside: avoid; }
    .grade-total  { break-inside: avoid; page-break-inside: avoid; }
    tr { break-inside: avoid; page-break-inside: avoid; }
  }
`;

export const GradeCurricularModule: React.FC = () => {
  const [gradeSelecionadaId, setGradeSelecionadaId] = useState(GRADES_CURRICULARES[0]?.id || '');
  const [imprimindo, setImprimindo] = useState(false);
  const grade = GRADES_CURRICULARES.find(g => g.id === gradeSelecionadaId);

  // Só dispara o print DEPOIS que o portal montou no document.body.
  // Sem essa espera o navegador pode abrir a caixa de impressão antes do
  // React ter escrito a folha na tela — e sai página em branco.
  useEffect(() => {
    if (!imprimindo) return;

    const style = document.createElement('style');
    style.setAttribute('data-grade-print', 'true');
    style.innerHTML = CSS_IMPRESSAO;
    document.head.appendChild(style);

    const encerrar = () => setImprimindo(false);
    window.addEventListener('afterprint', encerrar);

    const timer = window.setTimeout(() => window.print(), 120);
    // Rede de segurança: se por algum motivo o "afterprint" não disparar
    // (acontece em alguns navegadores/instalações), o botão destravava nunca.
    const destravar = window.setTimeout(() => setImprimindo(false), 15000);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(destravar);
      window.removeEventListener('afterprint', encerrar);
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, [imprimindo]);

  return (
    <div className="space-y-5">
      {/* Seletor — some na impressão (o #root inteiro é escondido) */}
      <div className="no-print bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Layers className="h-5 w-5" />
            <h3 className="font-black text-sm">Grades Curriculares</h3>
          </div>
          <button
            type="button"
            onClick={() => setImprimindo(true)}
            disabled={!grade || imprimindo}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all"
          >
            <Printer className="h-4 w-4" /> {imprimindo ? 'Preparando…' : 'Imprimir / Baixar PDF'}
          </button>
        </div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mt-4 mb-1.5">
          Escolha o curso
        </label>
        <select
          value={gradeSelecionadaId}
          onChange={(e) => setGradeSelecionadaId(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm text-slate-800 dark:text-white"
        >
          {GRADES_CURRICULARES.map(g => (
            <option key={g.id} value={g.id}>{g.cursoNome}</option>
          ))}
        </select>
        <p className="text-[10px] font-semibold text-slate-400 mt-3 leading-relaxed">
          Dica: na caixa do navegador, abra <strong>Mais definições</strong> e marque
          {' '}<strong>Gráficos de fundo</strong> (pra sair com as cores dos módulos) e desmarque
          {' '}<strong>Cabeçalhos e rodapés</strong> (pra tirar a URL e a data da folha).
        </p>
      </div>

      {!grade ? (
        <div className="flex flex-col items-center justify-center p-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center">
          <Layers className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-sm font-bold text-slate-500">Escolha um curso pra ver a matriz curricular.</p>
        </div>
      ) : (
        <FolhaGrade grade={grade} />
      )}

      {/* Folha limpa, fora do #root, só enquanto a impressão acontece */}
      {imprimindo && grade && createPortal(
        <div className="grade-print-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>
          <FolhaGrade grade={grade} paraImpressao />
        </div>,
        document.body
      )}
    </div>
  );
};

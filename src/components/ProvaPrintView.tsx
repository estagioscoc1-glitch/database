import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, FileCheck2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Prova } from '../types';
import { LOGO_COC_PRINCIPAL, LOGO_COC_SELO_30ANOS } from '../assets/logos';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface ProvaPrintViewProps {
  prova: Prova;
  onClose: () => void;
}

export const ProvaPrintView: React.FC<ProvaPrintViewProps> = ({ prova, onClose }) => {
  const { classes, subjects, users } = useApp();
  const [incluirGabarito, setIncluirGabarito] = useState(false);

  const turma = classes.find(c => c.id === prova.turmaId);
  const disciplina = subjects.find(s => s.id === prova.disciplinaId);
  const professor = users.find(u => u.id === prova.professorId || u.contaId === prova.professorId);
  const dataFormatada = prova.dataProva
    ? new Date(prova.dataProva + 'T00:00:00').toLocaleDateString('pt-BR')
    : '';

  const questoesComGabarito = prova.questoes.filter(q => q.gabarito);

  const handlePrint = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: portrait;
          margin: 1.1cm 1.3cm !important;
        }
        #root, .no-print { display: none !important; }
        body {
          background: white !important;
          color: black !important;
          margin: 0 !important; padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-modal-portal-prova {
          position: static !important; display: block !important;
          background: transparent !important; backdrop-filter: none !important;
          padding: 0 !important; margin: 0 !important;
          overflow: visible !important; width: auto !important; height: auto !important; min-height: 0 !important;
        }
        .print-modal-window-prova {
          background: transparent !important; border: none !important; box-shadow: none !important;
          width: 100% !important; max-width: none !important; height: auto !important; max-height: none !important;
          position: static !important; display: block !important; overflow: visible !important;
          margin: 0 !important; padding: 0 !important;
        }
        .print-preview-area-prova {
          background: transparent !important; padding: 0 !important; margin: 0 !important;
          overflow: visible !important; display: block !important; width: 100% !important; height: auto !important;
        }
        .prova-folha { page-break-after: always; }
        .prova-folha:last-child { page-break-after: avoid; }
        .prova-questao { break-inside: avoid; page-break-inside: avoid; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  return createPortal(
    <div className="print-modal-portal-prova fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="print-modal-window-prova bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Barra de ferramentas — some na impressão */}
        <div className="no-print flex items-center justify-between px-5 py-3 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">Pré-visualização — {prova.titulo}</span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer">
              <input type="checkbox" checked={incluirGabarito} onChange={(e) => setIncluirGabarito(e.target.checked)} />
              <FileCheck2 className="h-3.5 w-3.5" /> Incluir folha de gabarito (só pra você)
            </label>
            <button
              type="button" onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir / Baixar PDF
            </button>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Área de pré-visualização / impressão */}
        <div className="print-preview-area-prova overflow-y-auto flex-1 bg-slate-200 dark:bg-slate-950 p-6">
          <div className="mx-auto bg-white shadow-lg" style={{ width: '21cm', minHeight: '29.7cm' }}>
            <div className="prova-folha" style={{
              padding: '1.1cm 1.3cm', fontFamily: "'Times New Roman', Times, serif", color: '#000',
              height: '29.7cm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
            }}>
              <div>

              {/* ===== CABEÇALHO OFICIAL ===== */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                <tbody>
                  <tr>
                    <td style={{ border: 'none', width: '115px', verticalAlign: 'middle' }}>
                      <img src={LOGO_COC_PRINCIPAL} alt="Colégio Oswaldo Cruz" style={{ width: '110px' }} />
                    </td>
                    <td style={{ border: 'none', textAlign: 'center', verticalAlign: 'middle' }}>
                      <h1 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.3px', margin: 0 }}>
                        {prova.titulo}
                      </h1>
                    </td>
                    <td style={{ border: 'none', width: '70px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <img src={LOGO_COC_SELO_30ANOS} alt="" style={{ width: '58px', marginLeft: 'auto' }} />
                    </td>
                  </tr>
                </tbody>
              </table>

              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '10.5px', marginBottom: '10px' }}>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '4px 7px', fontWeight: 700, width: '24%' }}>
                      Professor (a): <span style={{ fontWeight: 400 }}>{professor?.name || ''}</span>
                    </td>
                    <td style={{ border: '1px solid black', padding: '4px 7px', fontWeight: 700, width: '22%' }}>
                      Comp. Curricular: <span style={{ fontWeight: 400 }}>{disciplina?.name || ''}</span>
                    </td>
                    <td style={{ border: '1px solid black', padding: '4px 7px', fontWeight: 700, width: '13%' }}>
                      Data: <span style={{ fontWeight: 400 }}>{dataFormatada}</span>
                    </td>
                    <td style={{ border: '1px solid black', padding: '4px 7px', fontWeight: 700, width: '11%' }}>
                      Sala: <span style={{ fontWeight: 400 }}>{prova.sala || ''}</span>
                    </td>
                    <td style={{ border: '1px solid black', padding: '4px 7px', fontWeight: 700, width: '14%' }}>
                      Turno: <span style={{ fontWeight: 400 }}>{prova.turno || ''}</span>
                    </td>
                    {/* "Nota" fica no TOPO da caixinha (verticalAlign: top), não no
                        meio — no meio não sobrava espaço nenhum pro professor
                        escrever a nota embaixo da palavra. */}
                    <td rowSpan={2} style={{ border: '1px solid black', padding: '4px 7px', fontWeight: 700, width: '10%', textAlign: 'center', verticalAlign: 'top' }}>
                      Nota
                    </td>
                  </tr>
                  <tr>
                    {/* Sem linha de assinatura embaixo do nome — só a
                        caixinha da própria tabela já delimita onde escrever. */}
                    <td colSpan={5} style={{ border: '1px solid black', padding: '4px 7px', fontWeight: 700, height: '22px' }}>
                      Aluno (a):
                    </td>
                  </tr>
                </tbody>
              </table>

              {prova.observacoes && (
                <p style={{ fontSize: '10px', fontStyle: 'italic', margin: '0 0 10px 0', lineHeight: 1.35 }}>
                  <strong style={{ fontStyle: 'normal' }}>Observações: </strong>{prova.observacoes}
                </p>
              )}

              {/* ===== QUESTÕES ===== */}
              <div style={{
                columnCount: prova.layout === 'duas_colunas' ? 2 : 1,
                columnGap: '0.9cm',
                fontSize: '11px',
                lineHeight: 1.4,
              }}>
                {prova.questoes.map((q, idx) => (
                  <div key={q.id} className="prova-questao" style={{ marginBottom: '13px' }}>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 700 }}>
                      {idx + 1}. {q.enunciado}
                      {q.pontuacao ? <span style={{ fontWeight: 400, fontStyle: 'italic' }}> ({q.pontuacao.toFixed(1)} pts)</span> : null}
                    </p>

                    {q.imagem && (
                      <img
                        src={q.imagem.dataUrl} alt=""
                        style={{ width: `${q.imagem.larguraPercentual}%`, maxWidth: '100%', display: 'block', margin: '4px 0 8px 14px' }}
                      />
                    )}

                    {q.tabela && (
                      <table style={{
                        width: `${q.tabela.larguraPercentual}%`, maxWidth: '100%', borderCollapse: 'collapse',
                        margin: '4px 0 8px 14px', fontSize: '10px',
                      }}>
                        <tbody>
                          {q.tabela.linhas.map((linha, li) => (
                            <tr key={li}>
                              {linha.map((celula, ci) => (
                                <td key={ci} style={{ border: '1px solid #666', padding: '3px 6px' }}>{celula}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {q.tipo === 'multipla_escolha' ? (
                      <div style={{ paddingLeft: '14px' }}>
                        {(q.alternativas || []).map((alt, altIdx) => (
                          <p key={altIdx} style={{ margin: '0 0 3px 0' }}>
                            <strong>{LETRAS[altIdx]})</strong> {alt}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div style={{ paddingLeft: '14px' }}>
                        <div style={{ borderBottom: '1px solid #999', height: '15px', marginBottom: '10px' }} />
                        <div style={{ borderBottom: '1px solid #999', height: '15px' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              </div>

              {/* FRASE MOTIVACIONAL — sempre no rodapé da folha, "grudada" no
                  fim da página graças ao marginTop: 'auto' dentro da coluna
                  flex acima (a folha inteira tem altura fixa de uma página).
                  Alinhamento escolhido pelo professor ao montar a prova. */}
              {prova.fraseMotivacional && (
                <p style={{
                  marginTop: 'auto', paddingTop: '18px', fontSize: '11pt', fontStyle: 'italic',
                  textAlign: prova.fraseMotivacionalAlinhamento || 'center', color: '#333',
                }}>
                  “{prova.fraseMotivacional}”
                </p>
              )}
            </div>


            {/* ===== FOLHA DE GABARITO (opcional, só pro professor) ===== */}
            {incluirGabarito && (
              <div className="prova-folha" style={{ padding: '1.5cm', fontFamily: "'Times New Roman', Times, serif", color: '#000' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Gabarito — {prova.titulo}</h2>
                <p style={{ fontSize: '10px', color: '#555', marginBottom: '14px' }}>
                  Uso exclusivo do professor — não faz parte da prova entregue ao aluno.
                </p>
                {questoesComGabarito.length === 0 ? (
                  <p style={{ fontSize: '11px', color: '#777' }}>Nenhuma questão desta prova teve gabarito configurado.</p>
                ) : (
                  <table style={{ borderCollapse: 'collapse', fontSize: '11px' }}>
                    <tbody>
                      {prova.questoes.map((q, idx) => q.gabarito ? (
                        <tr key={q.id}>
                          <td style={{ border: '1px solid #ccc', padding: '4px 10px', fontWeight: 700 }}>Questão {idx + 1}</td>
                          <td style={{ border: '1px solid #ccc', padding: '4px 10px' }}>{q.gabarito}</td>
                        </tr>
                      ) : null)}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

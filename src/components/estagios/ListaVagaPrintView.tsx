import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Users, AlertTriangle } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import { FONTE_DOCUMENTOS } from '../../lib/documentoEstilo';
import { mediaDoAluno, type AlunoNaVaga, type VagaEstagio } from '../../lib/supabaseEstagioModulo';

// ===========================================================================
//  LISTA DA VAGA — a folha que vai para o campo de estágio
//
//  Traz o cabeçalho da vaga (componente, supervisor, local, turno e período)
//  e a relação dos alunos incluídos. É o documento que o supervisor leva no
//  primeiro dia e que o local de estágio recebe.
//
//  Sai com espaço de assinatura por aluno: mesmo com o lançamento de notas
//  pelo sistema, o campo de estágio costuma pedir a lista assinada em papel.
// ===========================================================================

interface Props {
  vaga: VagaEstagio;
  alunos: AlunoNaVaga[];
  supervisorRegistro?: string;
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page { size: A4 portrait; margin: 1.2cm; }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important; margin: 0 !important; padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .lista-portal {
      position: static !important; display: block !important;
      width: 100% !important; margin: 0 !important; padding: 0 !important;
      overflow: visible !important;
    }
    tr { break-inside: avoid; page-break-inside: avoid; }
  }
`;

const cel: React.CSSProperties = {
  border: '0.4mm solid #000', padding: '2px 6px', fontSize: '9.5pt',
};

export const ListaVagaPrintView: React.FC<Props> = ({ vaga, alunos, supervisorRegistro, onClose }) => {
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-lista-print', 'true');
    style.innerHTML = CSS_IMPRESSAO;
    document.head.appendChild(style);
    const encerrar = () => setImprimindo(false);
    window.addEventListener('afterprint', encerrar);
    const t = window.setTimeout(() => window.print(), 150);
    const destravar = window.setTimeout(() => setImprimindo(false), 15000);
    return () => {
      window.clearTimeout(t); window.clearTimeout(destravar);
      window.removeEventListener('afterprint', encerrar);
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, [imprimindo]);

  const dataBr = (iso?: string) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '';
  const periodo = vaga.dataInicio || vaga.dataFim
    ? `${dataBr(vaga.dataInicio)} a ${dataBr(vaga.dataFim)}` : '—';

  const Documento = (
    <div style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000' }}>
      <div style={{ textAlign: 'center', marginBottom: '6mm' }}>
        <img src={LOGO_COLEGIO_OSWALDO_CRUZ} alt="Colégio Oswaldo Cruz"
             referrerPolicy="no-referrer"
             style={{ height: '1.8cm', width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
        <p style={{ fontSize: '8pt', margin: '3px 0 0' }}>
          Rua 20 nº 796 - Centro Goiânia - Goiás CEP 74020-170
        </p>
        <p style={{ fontSize: '8pt', margin: 0 }}>
          Fone: (62) 3223.7602 - www.colegiooswaldocruz.com.br
        </p>
      </div>

      <h1 style={{ textAlign: 'center', fontSize: '13pt', fontWeight: 'bold', margin: '0 0 5mm' }}>
        RELAÇÃO DE ALUNOS EM ESTÁGIO CURRICULAR
      </h1>

      {/* Cabeçalho da vaga */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5mm' }}>
        <tbody>
          <tr>
            <td style={{ ...cel, width: '20%', fontWeight: 'bold' }}>COMPONENTE:</td>
            <td style={cel}>{vaga.componente.toUpperCase()}</td>
            <td style={{ ...cel, width: '14%', fontWeight: 'bold' }}>TURNO:</td>
            <td style={{ ...cel, width: '18%' }}>{vaga.turno || '—'}</td>
          </tr>
          <tr>
            <td style={{ ...cel, fontWeight: 'bold' }}>SUPERVISOR:</td>
            <td style={cel} colSpan={3}>
              {vaga.supervisorNome || '—'}
              {supervisorRegistro ? `   ${supervisorRegistro}` : ''}
            </td>
          </tr>
          <tr>
            <td style={{ ...cel, fontWeight: 'bold' }}>LOCAL:</td>
            <td style={cel}>{vaga.localNome || '—'}</td>
            <td style={{ ...cel, fontWeight: 'bold' }}>PERÍODO:</td>
            <td style={cel}>{periodo}</td>
          </tr>
          <tr>
            <td style={{ ...cel, fontWeight: 'bold' }}>VAGA:</td>
            <td style={cel}>{vaga.codigo}</td>
            <td style={{ ...cel, fontWeight: 'bold' }}>ALUNOS:</td>
            <td style={cel}>{alunos.length} de {vaga.vagasTotal}</td>
          </tr>
        </tbody>
      </table>

      {/* Relação dos alunos */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...cel, background: '#d9d9d9', width: '7%', textAlign: 'center' }}>Nº</th>
            <th style={{ ...cel, background: '#d9d9d9', textAlign: 'left' }}>NOME DO ALUNO</th>
            <th style={{ ...cel, background: '#d9d9d9', width: '16%', textAlign: 'center' }}>MATRÍCULA</th>
            <th style={{ ...cel, background: '#d9d9d9', width: '32%', textAlign: 'center' }}>ASSINATURA</th>
          </tr>
        </thead>
        <tbody>
          {alunos.map((a, i) => (
            <tr key={a.id}>
              <td style={{ ...cel, textAlign: 'center' }}>{String(i + 1).padStart(2, '0')}</td>
              <td style={cel}>{a.alunoNome.toUpperCase()}</td>
              <td style={{ ...cel, textAlign: 'center' }}>{a.alunoMatricula || '—'}</td>
              <td style={{ ...cel, height: '8mm' }} />
            </tr>
          ))}
          {/* Linhas em branco até completar a vaga, para incluir aluno à mão. */}
          {Array.from({ length: Math.max(0, vaga.vagasTotal - alunos.length) }).map((_, i) => (
            <tr key={`vazia-${i}`}>
              <td style={{ ...cel, textAlign: 'center', color: '#999' }}>
                {String(alunos.length + i + 1).padStart(2, '0')}
              </td>
              <td style={{ ...cel, height: '8mm' }} />
              <td style={cel} />
              <td style={cel} />
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-around', gap: '20mm', marginTop: '16mm' }}>
        {['SUPERVISOR DE ESTÁGIO', 'COORDENAÇÃO DE ESTÁGIO'].map(t => (
          <div key={t} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '0.4mm solid #000', paddingTop: '1mm', fontSize: '9pt', fontWeight: 'bold' }}>
              {t}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              Relação de Alunos — {vaga.codigo}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setImprimindo(true)} disabled={imprimindo}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs">
              <Printer className="h-3.5 w-3.5" /> {imprimindo ? 'Preparando…' : 'Imprimir / Baixar PDF'}
            </button>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] font-semibold text-amber-800 leading-relaxed">
            Desmarque <strong>Cabeçalhos e rodapés</strong> e marque <strong>Gráficos de fundo</strong>.
            As linhas em branco no fim são os lugares ainda não preenchidos da vaga.
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-100">
          <div className="bg-white shadow-sm mx-auto" style={{ maxWidth: '740px', padding: '1.2cm 1.5cm' }}>
            {Documento}
          </div>
        </div>
      </div>

      {imprimindo && createPortal(
        <div className="lista-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>
          {Documento}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};

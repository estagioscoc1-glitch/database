import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  listarCronogramas, salvarCronograma, apagarCronograma, cronogramaPublicado,
  type Cronograma,
} from '../../lib/supabaseEstagioModulo';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import { FONTE_DOCUMENTOS } from '../../lib/documentoEstilo';
import {
  CalendarRange, Plus, Trash2, Save, X, AlertTriangle, CheckCircle2,
  Eye, EyeOff, Printer, GripVertical,
} from 'lucide-react';

// ===========================================================================
//  CRONOGRAMA DE ESTÁGIO
//
//  A coordenação monta um por semestre, com blocos livres de título e texto —
//  "a partir de março", "locais disponíveis", "é preciso estar com o seguro
//  ativo". Depois publica, e o aluno passa a ver no painel dele.
//
//  SÓ O PUBLICADO MAIS RECENTE aparece para o aluno. Assim a coordenação pode
//  ir montando o do semestre que vem sem que os alunos vejam pela metade, e
//  publicar quando estiver pronto.
// ===========================================================================

const campo = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm';
const rotulo = 'block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1';

/** A folha do cronograma. Usada na visão da coordenação e na do aluno. */
export const FolhaCronograma: React.FC<{ c: Cronograma }> = ({ c }) => (
  <div style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000' }}>
    <div style={{ textAlign: 'center', marginBottom: '1cm' }}>
      <img src={LOGO_COLEGIO_OSWALDO_CRUZ} alt="Colégio Oswaldo Cruz"
           referrerPolicy="no-referrer"
           style={{ height: '2cm', width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
      <p style={{ fontSize: '8.5pt', margin: '4px 0 0' }}>
        Rua 20 nº 796 - Centro Goiânia - Goiás CEP 74020-170
      </p>
      <p style={{ fontSize: '8.5pt', margin: 0 }}>
        Fone: (62) 3223.7602 - www.colegiooswaldocruz.com.br
      </p>
    </div>

    <h1 style={{ textAlign: 'center', fontSize: '15pt', fontWeight: 'bold', margin: '0 0 4mm' }}>
      {c.titulo}
    </h1>
    <p style={{ textAlign: 'center', fontSize: '11pt', margin: '0 0 8mm' }}>
      Período: <strong>{c.periodo}</strong>
    </p>

    {c.conteudo.map((b, i) => (
      <div key={i} style={{ marginBottom: '5mm' }}>
        <p style={{ fontSize: '11.5pt', fontWeight: 'bold', margin: '0 0 1.5mm' }}>{b.titulo}</p>
        <p style={{ fontSize: '11pt', lineHeight: 1.6, textAlign: 'justify', margin: 0, whiteSpace: 'pre-line' }}>
          {b.texto}
        </p>
      </div>
    ))}

    {c.observacoes && (
      <div style={{ marginTop: '6mm', padding: '3mm', border: '0.4mm solid #000' }}>
        <p style={{ fontSize: '11pt', margin: 0, whiteSpace: 'pre-line' }}>
          <strong>Observações: </strong>{c.observacoes}
        </p>
      </div>
    )}
  </div>
);

/* ------------------------------------------------ VISÃO DA COORDENAÇÃO */

export const EstagioCronogramaModule: React.FC<{ currentUser?: string }> = ({ currentUser }) => {
  const [lista, setLista] = useState<Cronograma[]>([]);
  const [edit, setEdit] = useState<Cronograma | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [imprimir, setImprimir] = useState<Cronograma | null>(null);

  const recarregar = async () => {
    setCarregando(true);
    const { lista: l, erro: e } = await listarCronogramas();
    setLista(l); setErro(e ?? null); setCarregando(false);
  };
  useEffect(() => { void recarregar(); }, []);

  const mostrar = (t: string) => { setAviso(t); window.setTimeout(() => setAviso(null), 5000); };

  const novo = (): Cronograma => {
    const hoje = new Date();
    return {
      periodo: `${hoje.getFullYear()}/${hoje.getMonth() < 6 ? 1 : 2}`,
      titulo: 'Cronograma de Estágio Curricular',
      conteudo: [{ titulo: '', texto: '' }],
      publicado: false,
    };
  };

  const gravar = async () => {
    if (!edit?.periodo.trim()) return;
    const { erro: e } = await salvarCronograma(edit, currentUser);
    if (e) { setErro(e); return; }
    mostrar(edit.publicado
      ? 'Cronograma salvo e publicado. Os alunos já conseguem ver.'
      : 'Cronograma salvo como rascunho. Os alunos ainda não veem.');
    setEdit(null); void recarregar();
  };

  return (
    <div className="space-y-5">
      {aviso && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {aviso}
        </div>
      )}
      {erro && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <span className="text-xs font-bold text-amber-800 leading-relaxed">{erro}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
          <CalendarRange className="h-5 w-5" />
          <h3 className="font-black text-sm">Cronograma de Estágio</h3>
        </div>
        <button type="button" onClick={() => setEdit(novo())}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs">
          <Plus className="h-4 w-4" /> Novo Cronograma
        </button>
      </div>

      {edit && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-blue-300 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={rotulo}>Período</label>
              <input className={campo} placeholder="2026/2" value={edit.periodo}
                     onChange={e => setEdit({ ...edit, periodo: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className={rotulo}>Título</label>
              <input className={campo} value={edit.titulo}
                     onChange={e => setEdit({ ...edit, titulo: e.target.value })} />
            </div>
          </div>

          <div>
            <label className={rotulo}>Blocos do cronograma</label>
            <div className="space-y-3">
              {edit.conteudo.map((b, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <GripVertical className="h-4 w-4 text-slate-300 mt-3 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <input className={campo} placeholder="Título do bloco — ex.: Locais disponíveis"
                           value={b.titulo}
                           onChange={e => {
                             const c = [...edit.conteudo]; c[i] = { ...c[i], titulo: e.target.value };
                             setEdit({ ...edit, conteudo: c });
                           }} />
                    <textarea rows={3} className={campo + ' resize-y'}
                              placeholder="Texto do bloco"
                              value={b.texto}
                              onChange={e => {
                                const c = [...edit.conteudo]; c[i] = { ...c[i], texto: e.target.value };
                                setEdit({ ...edit, conteudo: c });
                              }} />
                  </div>
                  <button type="button"
                          onClick={() => setEdit({ ...edit, conteudo: edit.conteudo.filter((_, j) => j !== i) })}
                          className="p-2 text-slate-300 hover:text-rose-600 mt-1"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <button type="button"
                    onClick={() => setEdit({ ...edit, conteudo: [...edit.conteudo, { titulo: '', texto: '' }] })}
                    className="mt-2 flex items-center gap-1 text-[11px] font-bold text-blue-600">
              <Plus className="h-3 w-3" /> Novo bloco
            </button>
          </div>

          <div>
            <label className={rotulo}>Observações (sai numa caixa no pé da folha)</label>
            <textarea rows={3} className={campo + ' resize-y'} value={edit.observacoes ?? ''}
                      onChange={e => setEdit({ ...edit, observacoes: e.target.value })} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={edit.publicado}
                   onChange={e => setEdit({ ...edit, publicado: e.target.checked })} />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Publicar — o aluno passa a ver no painel dele
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void gravar()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs">
              <Save className="h-4 w-4" /> Salvar
            </button>
            <button type="button" onClick={() => setEdit(null)}
                    className="px-4 py-2.5 text-slate-500 font-bold text-xs">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {lista.map(c => (
          <div key={c.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm text-slate-800 dark:text-white">{c.periodo}</span>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase ${
                  c.publicado ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {c.publicado ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {c.publicado ? 'Publicado' : 'Rascunho'}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 mt-1">
                {c.titulo} · {c.conteudo.length} bloco(s)
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setImprimir(c)}
                      className="p-2 text-slate-400 hover:text-blue-600" title="Imprimir">
                <Printer className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setEdit(c)}
                      className="px-3 py-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-xl">Editar</button>
              <button type="button"
                      onClick={async () => {
                        if (!window.confirm(`Apagar o cronograma de ${c.periodo}?`)) return;
                        await apagarCronograma(c.id!);
                        void recarregar();
                      }}
                      className="p-2 text-slate-300 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {lista.length === 0 && !carregando && (
          <div className="p-12 text-center text-sm font-bold text-slate-400">
            Nenhum cronograma criado ainda.
          </div>
        )}
      </div>

      {imprimir && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50">
              <span className="text-sm font-black text-slate-700">Cronograma — {imprimir.periodo}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => window.print()}
                        className="px-3.5 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs">Imprimir</button>
                <button type="button" onClick={() => setImprimir(null)} className="p-2 text-slate-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8 bg-slate-100">
              <div className="bg-white shadow-sm mx-auto" style={{ maxWidth: '740px', padding: '1.5cm 2cm' }}>
                <FolhaCronograma c={imprimir} />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

/* ------------------------------------------------------ VISÃO DO ALUNO */

export const CronogramaDoAluno: React.FC = () => {
  const [c, setC] = useState<Cronograma | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    void cronogramaPublicado().then(r => { if (ativo) { setC(r); setCarregando(false); } });
    return () => { ativo = false; };
  }, []);

  if (carregando) return null;
  // Sem cronograma publicado, a seção nem aparece no painel do aluno.
  if (!c) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center gap-2">
        <CalendarRange className="h-4 w-4 text-white" />
        <h3 className="font-black text-sm text-white">Cronograma de Estágio — {c.periodo}</h3>
      </div>
      <div className="p-5 space-y-4">
        <p className="font-black text-sm text-slate-800 dark:text-white">{c.titulo}</p>
        {c.conteudo.map((b, i) => (
          <div key={i}>
            {b.titulo && <p className="font-bold text-xs text-blue-700 dark:text-blue-400 mb-1">{b.titulo}</p>}
            <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {b.texto}
            </p>
          </div>
        ))}
        {c.observacoes && (
          <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
            <p className="text-[12px] font-semibold text-amber-800 leading-relaxed whitespace-pre-line">
              <strong>Observações: </strong>{c.observacoes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

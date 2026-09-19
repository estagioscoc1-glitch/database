import React, { useState, useEffect } from 'react';
import { ConvenioBancario } from '../../types/financeiro';
import { getConvenioBancario, salvarConvenioBancario } from '../../services/boletoStorage';
import { Landmark, Save, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

// ===========================================================================
//  CONFIGURAÇÃO DO CONVÊNIO BANCÁRIO
//
//  Enquanto a escola não tiver assinado o convênio de cobrança com um banco,
//  essa tela fica preenchida com dados de exemplo e "ativo" desmarcado — os
//  boletos gerados nesse estado saem com um aviso bem visível de que não
//  servem pra cobrar de verdade. No dia que o banco entregar os dados reais
//  (agência, conta, carteira, código do cedente), é só preencher aqui e
//  marcar "Convênio ativo" — o resto do sistema já está pronto.
// ===========================================================================

const BANCOS_COMUNS = [
  { codigo: '001', nome: 'Banco do Brasil' },
  { codigo: '341', nome: 'Itaú Unibanco' },
  { codigo: '104', nome: 'Caixa Econômica Federal' },
  { codigo: '237', nome: 'Bradesco' },
  { codigo: '033', nome: 'Santander' },
  { codigo: '077', nome: 'Banco Inter' },
  { codigo: '756', nome: 'Sicoob' },
];

const CONVENIO_VAZIO: ConvenioBancario = {
  bancoCodigo: '001',
  bancoNome: 'Banco do Brasil',
  agencia: '',
  contaCorrente: '',
  carteira: '',
  codigoCedente: '',
  cedenteNome: 'Colégio Oswaldo Cruz Ltda',
  cedenteCnpj: '37.653.128/0001-64',
  especieDocumento: 'DM',
  aceite: 'N',
  localPagamento: 'Pagável em qualquer banco até o vencimento',
  instrucoes: ['Não receber após o vencimento.', 'Em caso de dúvidas, entre em contato com a secretaria financeira.'],
  proximoNossoNumero: 1,
  ativo: false,
};

interface Props {
  currentUser?: string;
}

export const ConvenioBancarioManager: React.FC<Props> = ({ currentUser = 'Financeiro' }) => {
  const [convenio, setConvenio] = useState<ConvenioBancario>(CONVENIO_VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    void getConvenioBancario().then(c => {
      if (c) setConvenio(c);
      setCarregando(false);
    });
  }, []);

  const handleSalvar = async () => {
    setSalvando(true);
    setMensagem(null);
    try {
      const ok = await salvarConvenioBancario(convenio, currentUser);
      setMensagem(ok
        ? { tipo: 'sucesso', texto: 'Dados do convênio salvos.' }
        : { tipo: 'erro', texto: 'Não foi possível salvar agora. Tente de novo em alguns segundos.' });
    } finally {
      setSalvando(false);
    }
  };

  const set = <K extends keyof ConvenioBancario>(campo: K, valor: ConvenioBancario[K]) =>
    setConvenio(prev => ({ ...prev, [campo]: valor }));

  if (carregando) {
    return <div className="flex items-center gap-2 text-slate-400 py-10 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>;
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-6 shadow-sm">
      <div>
        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Landmark className="h-5 w-5 text-blue-600" /> Convênio Bancário (Boleto)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Preencha com os dados que o banco entregar ao assinar o convênio de cobrança. Enquanto "Convênio ativo"
          estiver desmarcado, os boletos saem com aviso de que são só rascunho de layout.
        </p>
      </div>

      {!convenio.ativo && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            Convênio ainda não está ativo — os boletos gerados agora não servem pra cobrar de verdade, são só o layout de teste.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Banco</label>
          <select
            value={convenio.bancoCodigo}
            onChange={(e) => {
              const b = BANCOS_COMUNS.find(x => x.codigo === e.target.value);
              set('bancoCodigo', e.target.value);
              if (b) set('bancoNome', b.nome);
            }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
          >
            {BANCOS_COMUNS.map(b => <option key={b.codigo} value={b.codigo}>{b.codigo} — {b.nome}</option>)}
          </select>
          {convenio.bancoCodigo !== '001' && (
            <p className="text-[10px] text-amber-600 mt-1">
              Só o layout do Banco do Brasil está confirmado até agora — pra outro banco, me manda o manual de emissão dele.
            </p>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Código do Cedente / Convênio</label>
          <input type="text" value={convenio.codigoCedente} onChange={(e) => set('codigoCedente', e.target.value)}
            placeholder="Fornecido pelo banco"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold" />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Agência</label>
          <input type="text" value={convenio.agencia} onChange={(e) => set('agencia', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold" />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Conta Corrente</label>
          <input type="text" value={convenio.contaCorrente} onChange={(e) => set('contaCorrente', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold" />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Carteira</label>
          <input type="text" value={convenio.carteira} onChange={(e) => set('carteira', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold" />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Espécie do Documento</label>
          <input type="text" value={convenio.especieDocumento} onChange={(e) => set('especieDocumento', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Nome do Cedente (impresso no boleto)</label>
          <input type="text" value={convenio.cedenteNome} onChange={(e) => set('cedenteNome', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Local de Pagamento</label>
          <input type="text" value={convenio.localPagamento} onChange={(e) => set('localPagamento', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Instruções (uma por linha)</label>
          <textarea
            value={convenio.instrucoes.join('\n')}
            onChange={(e) => set('instrucoes', e.target.value.split('\n'))}
            rows={3}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 font-bold cursor-pointer text-xs">
        <input type="checkbox" checked={convenio.ativo} onChange={(e) => set('ativo', e.target.checked)} />
        Convênio ativo (marcar só depois de confirmar os dados de verdade com o banco)
      </label>

      {mensagem && (
        <p className={`text-xs font-bold flex items-center gap-1.5 ${mensagem.tipo === 'sucesso' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {mensagem.texto}
        </p>
      )}

      <button
        type="button"
        onClick={handleSalvar}
        disabled={salvando}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-600/30 uppercase tracking-wide"
      >
        <Save className="h-4 w-4" /> {salvando ? 'Salvando…' : 'Salvar Convênio'}
      </button>
    </div>
  );
};

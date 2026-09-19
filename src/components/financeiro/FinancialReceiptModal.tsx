import React, { useState } from 'react';
import { FinancialReceipt } from '../../types/financeiro';
import { FinancialPrintModal, FinancialPrintData } from './FinancialPrintModal';
import { ReciboTermicoPrintView } from './ReciboTermicoPrintView';
import { Receipt } from 'lucide-react';

interface FinancialReceiptModalProps {
  receipt: FinancialReceipt | null;
  onClose: () => void;
  turma?: string;
  quemPagou?: string;
}

export const FinancialReceiptModal: React.FC<FinancialReceiptModalProps> = ({ receipt, onClose, turma, quemPagou }) => {
  const [mostrarCupom, setMostrarCupom] = useState(false);
  if (!receipt) return null;

  const dataPayload: FinancialPrintData = {
    type: 'RECIBO_2VIA',
    title: `Recibo de Pagamento (2ª Via) nº ${receipt.receiptNumber}`,
    subtitle: `Comprovante de Quitação • Aluno: ${receipt.studentName} (${receipt.enrollment})`,
    user: receipt.user || 'Tesouraria',
    singleReceipt: receipt
  };

  return (
    <>
      <FinancialPrintModal
        data={dataPayload}
        onClose={onClose}
        // Botão extra na barra do modal — abre o mesmo recibo no formato
        // estreito da impressora térmica (Bematech), sem fechar esta tela.
        extraAction={{
          label: 'Imprimir no Cupom (Bematech)',
          icon: Receipt,
          onClick: () => setMostrarCupom(true),
        }}
      />
      {mostrarCupom && (
        <ReciboTermicoPrintView
          receipt={receipt}
          turma={turma}
          quemPagou={quemPagou}
          onClose={() => setMostrarCupom(false)}
        />
      )}
    </>
  );
};

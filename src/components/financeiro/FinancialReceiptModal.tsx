import React from 'react';
import { FinancialReceipt } from '../../types/financeiro';
import { FinancialPrintModal, FinancialPrintData } from './FinancialPrintModal';

interface FinancialReceiptModalProps {
  receipt: FinancialReceipt | null;
  onClose: () => void;
}

export const FinancialReceiptModal: React.FC<FinancialReceiptModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  const dataPayload: FinancialPrintData = {
    type: 'RECIBO_2VIA',
    title: `Recibo de Pagamento (2ª Via) nº ${receipt.receiptNumber}`,
    subtitle: `Comprovante de Quitação • Aluno: ${receipt.studentName} (${receipt.enrollment})`,
    user: receipt.user || 'Tesouraria',
    singleReceipt: receipt
  };

  return (
    <FinancialPrintModal
      data={dataPayload}
      onClose={onClose}
    />
  );
};

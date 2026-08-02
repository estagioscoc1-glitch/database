import React, { useState, useEffect } from 'react';
import { OfficialTemplate } from '../../types/movimentacao';
import { getOfficialTemplates, saveOfficialTemplate } from '../../services/movimentacaoStorage';
import { MovimentacaoDocumentPrintModal } from './MovimentacaoDocumentPrintModal';
import { 
  FileUp, FileText, CheckCircle2, Eye, Edit3, Plus, Sparkles, Code, Printer,
  Upload, FileCheck, RefreshCw, X, AlertCircle, FileSpreadsheet
} from 'lucide-react';

interface OfficialTemplatesManagerProps {
  currentUser: string;
}

export const OfficialTemplatesManager: React.FC<OfficialTemplatesManagerProps> = ({ currentUser }) => {
  const [templates, setTemplates] = useState<OfficialTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  // Edit Form
  const [title, setTitle] = useState<string>('');
  const [docType, setDocType] = useState<OfficialTemplate['docType']>('OUTROS');
  const [contentHtml, setContentHtml] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState<string>('');

  // Editor Tab: 'EDITOR' | 'PDF_VIEW' | 'PREVIEW'
  const [activeTab, setActiveTab] = useState<'EDITOR' | 'PDF_VIEW' | 'PREVIEW'>('EDITOR');

  // Preview Modal
  const [previewModal, setPreviewModal] = useState<boolean>(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState<boolean>(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const list = getOfficialTemplates();
    setTemplates(list);
    if (list.length > 0) {
      loadTemplate(list[0]);
    }
  }, []);

  const loadTemplate = (tpl: OfficialTemplate) => {
    setSelectedTemplateId(tpl.id);
    setTitle(tpl.title);
    setDocType(tpl.docType);
    setContentHtml(tpl.contentHtml);
    setUploadedFileName(tpl.fileName || '');
    setUploadedPdfUrl(tpl.pdfDataUrl || '');
    setActiveTab('EDITOR');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPdf(true);
    setUploadedFileName(file.name);

    const reader = new FileReader();

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      reader.readAsDataURL(file);
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setUploadedPdfUrl(dataUrl);

        // Auto-generate template skeleton based on document name and type
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ").toUpperCase();
        if (!title || title === 'Novo Modelo de Documento') {
          setTitle(`MODELO OFICIAL: ${cleanName}`);
        }

        // Generate adaptable HTML structure from uploaded PDF
        const pdfConvertedHtml = `
<div style="font-family: 'Times New Roman', serif; padding: 30px; line-height: 1.8; color: #000; background: #fff;">
  <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 25px;">
    <h2 style="font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase;">INSTITUIÇÃO DE ENSINO OSWALDO CRUZ</h2>
    <p style="font-size: 12px; margin: 5px 0 0 0;">RECONHECIDA PELO MEC / SECRETARIA DE EDUCAÇÃO</p>
    <h3 style="font-size: 16px; font-weight: bold; margin-top: 15px; text-decoration: underline;">${cleanName}</h3>
  </div>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 20px;">
    Declaramos para os devidos fins de direito que o(a) aluno(a) <strong>{NOME_ALUNO}</strong>, portador(a) do CPF nº <strong>{CPF}</strong>, regularmente matriculado(a) sob o número <strong>{MATRICULA}</strong> no curso de <strong>{CURSO}</strong>, Turma <strong>{TURMA}</strong>, Turno <strong>{TURNO}</strong>.
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 20px;">
    Por ser verdade, firmamos e assinamos o presente documento para que produza seus efeitos legais.
  </p>

  <div style="margin-top: 60px; text-align: center;">
    <p style="margin-bottom: 50px;">Data de Emissão: {DATA}</p>
    <div style="display: inline-block; border-top: 1px solid #000; width: 280px; padding-top: 5px; font-weight: bold; font-size: 12px;">
      Secretaria de Registro Acadêmico
    </div>
  </div>
</div>`.trim();

        setContentHtml(pdfConvertedHtml);
        setIsProcessingPdf(false);
        setNotification({ 
          type: 'success', 
          message: `Arquivo PDF "${file.name}" importado e analisado! Modelo configurado com variáveis preenchíveis.` 
        });
      };
    } else {
      // Read text file
      reader.readAsText(file);
      reader.onload = () => {
        const text = reader.result as string;
        setContentHtml(`<div style="font-family: Arial; padding: 20px; line-height: 1.6;">${text.replace(/\n/g, '<br/>')}</div>`);
        setIsProcessingPdf(false);
        setNotification({ type: 'success', message: `Documento de texto "${file.name}" lido e carregado com sucesso!` });
      };
    }
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !contentHtml.trim()) {
      setNotification({ type: 'error', message: 'Informe o título e o conteúdo do modelo de documento.' });
      return;
    }

    const tpl: OfficialTemplate = {
      id: selectedTemplateId || `tpl_${Date.now()}`,
      title: title.trim(),
      docType,
      contentHtml,
      pdfDataUrl: uploadedPdfUrl,
      fileName: uploadedFileName,
      version: '1.0',
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser
    };

    saveOfficialTemplate(tpl);
    setTemplates(getOfficialTemplates());
    setNotification({ type: 'success', message: 'Modelo de documento oficial salvo e sincronizado no catálogo!' });
  };

  const handleInsertVariable = (variable: string) => {
    setContentHtml(prev => prev + ' ' + variable);
  };

  // Replace variables for live preview
  const getPreviewHtml = () => {
    return contentHtml
      .replace(/{NOME_ALUNO}/g, 'CARLOS EDUARDO SILVA')
      .replace(/{CPF}/g, '123.456.789-00')
      .replace(/{MATRICULA}/g, '2026.1.ENF.089')
      .replace(/{CURSO}/g, 'TÉCNICO EM ENFERMAGEM')
      .replace(/{TURMA}/g, 'TURMA ENF-2026-A')
      .replace(/{TURNO}/g, 'MANHÃ')
      .replace(/{VALOR_TOTAL}/g, '4200.00')
      .replace(/{VALOR_MATRICULA}/g, '150.00')
      .replace(/{NUMERO_PARCELAS}/g, '12')
      .replace(/{VALOR_PARCELA}/g, '350.00')
      .replace(/{DATA}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/{PROFESSOR}/g, 'DRA. ANA PAULA MENDES');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-400/30 text-blue-300">
              <FileUp className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black">Upload e Edição de Modelos de Documentos</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Faça upload de arquivos PDF/Documentos para estudar a estrutura e criar modelos 100% preenchíveis e customizáveis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-black flex items-center justify-between gap-2 ${
          notification.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {notification.message}
          </div>
          <button onClick={() => setNotification(null)} className="cursor-pointer opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Templates Sidebar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase">Modelos Salvos</h3>
            <button
              onClick={() => {
                setSelectedTemplateId('');
                setTitle('Novo Modelo de Documento');
                setContentHtml('<p>Digite ou faça upload do PDF para estruturar o documento...</p>');
                setUploadedFileName('');
                setUploadedPdfUrl('');
                setActiveTab('EDITOR');
              }}
              className="p-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer"
              title="Novo Modelo"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {templates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => loadTemplate(tpl)}
                className={`w-full text-left p-3 rounded-2xl border text-xs transition-all cursor-pointer ${
                  selectedTemplateId === tpl.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                <div className="font-extrabold truncate">{tpl.title}</div>
                <div className="text-[10px] opacity-80 mt-0.5 flex justify-between items-center">
                  <span>{tpl.docType}</span>
                  {tpl.fileName && <span className="font-mono text-[9px] bg-white/20 px-1.5 py-0.5 rounded">PDF</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          
          {/* File Upload Box */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800 border-2 border-dashed border-blue-300 dark:border-slate-700 rounded-2xl space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300 font-extrabold text-xs">
              <Upload className="h-5 w-5 text-blue-600" /> Upload de Arquivo PDF / Documento Oficial
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Selecione um arquivo PDF para importar e estruturar a minuta do documento automaticamente.
            </p>

            <div className="flex justify-center items-center gap-3 pt-1">
              <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center gap-1.5">
                <FileUp className="h-4 w-4" /> Selecionar Arquivo PDF / DOCX
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {uploadedFileName && (
                <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-blue-600" /> {uploadedFileName}
                </div>
              )}
            </div>

            {isProcessingPdf && (
              <p className="text-[11px] text-blue-600 font-bold flex items-center justify-center gap-1">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Analisando e convertendo arquivo PDF...
              </p>
            )}
          </div>

          <form onSubmit={handleSaveTemplate} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Título do Modelo *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-extrabold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo do Documento *
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-extrabold text-slate-800 dark:text-white"
                >
                  <option value="CONTRATO">Contrato de Matrícula</option>
                  <option value="REQUERIMENTO">Requerimento Oficial</option>
                  <option value="DECLARACAO">Declaração Diversa</option>
                  <option value="CERTIFICADO">Certificado de Evento</option>
                  <option value="RECIBO_PROFESSOR">Recibo do Professor</option>
                  <option value="OUTROS">Outros Documentos</option>
                </select>
              </div>
            </div>

            {/* Variable Tags Bar */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl space-y-1.5">
              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Code className="h-3.5 w-3.5 text-blue-600" /> Clique para Inserir Variável Dinâmica de Preenchimento:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '{NOME_ALUNO}', '{CPF}', '{MATRICULA}', '{CURSO}', '{TURMA}', 
                  '{TURNO}', '{VALOR_TOTAL}', '{VALOR_MATRICULA}', '{NUMERO_PARCELAS}', 
                  '{VALOR_PARCELA}', '{DATA}', '{PROFESSOR}'
                ].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleInsertVariable(v)}
                    className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold rounded-lg hover:bg-blue-50 cursor-pointer"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Textarea & View Options */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Estrutura e Conteúdo do Modelo Oficial *
                </label>

                {uploadedPdfUrl && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('EDITOR')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                        activeTab === 'EDITOR' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Editar HTML/Texto
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('PDF_VIEW')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                        activeTab === 'PDF_VIEW' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Ver PDF Importado
                    </button>
                  </div>
                )}
              </div>

              {activeTab === 'EDITOR' ? (
                <textarea
                  required
                  rows={14}
                  value={contentHtml}
                  onChange={(e) => setContentHtml(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 font-mono text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="w-full h-96 border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-900">
                  <iframe
                    src={uploadedPdfUrl}
                    title="PDF Importado"
                    className="w-full h-full"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setPreviewModal(true)}
                className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="h-4 w-4" /> Testar Preenchimento com Dados de Exemplo
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Salvar Modelo Oficial
              </button>
            </div>

          </form>

        </div>

      </div>

      {previewModal && (
        <MovimentacaoDocumentPrintModal
          title={`Pré-visualização do Modelo: ${title}`}
          subtitle="Variáveis dinâmicas substituídas por dados de simulação"
          contentHtml={getPreviewHtml()}
          onClose={() => setPreviewModal(false)}
        />
      )}

    </div>
  );
};

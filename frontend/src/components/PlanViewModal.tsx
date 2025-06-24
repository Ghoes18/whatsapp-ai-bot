import { dashboardAPI, type PlanContent } from '../services/api';
import { useState, useEffect } from 'react';
import { formatPhoneNumber } from '../utils/phoneFormatter';

interface PlanViewModalProps {
  planId: string;
  isOpen: boolean;
  onClose: () => void;
}

const PlanViewModal: React.FC<PlanViewModalProps> = ({ planId, isOpen, onClose }) => {
  const [plan, setPlan] = useState<PlanContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    if (isOpen && planId) {
      loadPlanContent();
    }
  }, [isOpen, planId]);

  const loadPlanContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardAPI.getPlanContent(planId);
      setPlan(response.plan);
    } catch (err) {
      console.error('Erro ao carregar conteúdo do plano:', err);
      setError('Erro ao carregar o plano');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setGeneratingPDF(true);
      const response = await dashboardAPI.generatePlanPDF(planId);
      
      // Handle base64 PDF data
      if (response.pdfUrl) {
        // Check if it's a data URL (base64)
        if (response.pdfUrl.startsWith('data:application/pdf;base64,')) {
          // Create a blob from the base64 data
          const base64Data = response.pdfUrl.split(',')[1];
          const pdfBlob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], {
            type: 'application/pdf'
          });
          
          // Create a URL for the blob
          const pdfUrl = URL.createObjectURL(pdfBlob);
          
          // Open in new tab
          window.open(pdfUrl, '_blank');
          
          // Clean up the URL after a delay
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
        } else {
          // Handle regular URL (fallback)
          window.open(response.pdfUrl, '_blank');
        }
      }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setError('Erro ao gerar PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setGeneratingPDF(true);
      const response = await dashboardAPI.generatePlanPDF(planId);
      
      // Handle base64 PDF data for download
      if (response.pdfUrl) {
        if (response.pdfUrl.startsWith('data:application/pdf;base64,')) {
          // Create a blob from the base64 data
          const base64Data = response.pdfUrl.split(',')[1];
          const pdfBlob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], {
            type: 'application/pdf'
          });
          
          // Create download link
          const downloadUrl = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `plano-${plan?.type || 'treino'}-${plan?.client.name || 'cliente'}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up the URL
          setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        }
      }
    } catch (err) {
      console.error('Erro ao fazer download do PDF:', err);
      setError('Erro ao fazer download do PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPlanContent = (content: string) => {
    // Converter quebras de linha em elementos <br> e preservar formatação
    return content.split('\n').map((line, index) => (
      <div key={index}>
        {line}
        <br />
      </div>
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {loading ? 'Carregando...' : `Plano de ${plan?.type || 'Treino'}`}
            </h2>
            {plan && (
              <p className="mt-1 text-sm text-gray-600">
                                        Cliente: {plan.client.name} ({formatPhoneNumber(plan.client.phone)})
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {plan && (
              <button
                onClick={handleGeneratePDF}
                disabled={generatingPDF}
                className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingPDF ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Visualizar PDF
                  </>
                )}
              </button>
            )}
            {plan && (
              <button
                onClick={handleDownloadPDF}
                disabled={generatingPDF}
                className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingPDF ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                    Baixando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 transition-colors rounded-lg hover:text-gray-600 hover:bg-gray-100"
              title="Fechar modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              <span className="ml-3 text-gray-600">Carregando plano...</span>
            </div>
          )}

          {error && (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {plan && !loading && !error && (
            <div className="space-y-6">
              {/* Informações do plano */}
              <div className="p-4 rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                  <div>
                    <span className="font-semibold text-gray-700">Tipo:</span>
                    <span className="ml-2 text-gray-900">{plan.type}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Criado em:</span>
                    <span className="ml-2 text-gray-900">{formatDate(plan.created_at)}</span>
                  </div>
                  {plan.expires_at && (
                    <div>
                      <span className="font-semibold text-gray-700">Expira em:</span>
                      <span className="ml-2 text-gray-900">{formatDate(plan.expires_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Conteúdo do plano */}
              <div className="p-6 bg-white border border-gray-200 rounded-lg">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Conteúdo do Plano</h3>
                <div className="prose-sm prose max-w-none">
                  <div className="leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {formatPlanContent(plan.plan_content)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanViewModal; 
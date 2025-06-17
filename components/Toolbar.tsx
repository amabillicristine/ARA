
import React from 'react';
import { NodeType } from '../types';
import { PlusIcon, BrainIcon, DownloadIcon } from './icons';

interface ToolbarProps {
  onAddNode: (type: NodeType) => void;
  onAnalyzeUDEs: () => void;
  hasUDEs: boolean;
  isAnalyzing: boolean;
  selectedNodeId: string | null;
  onOpenPdfConfigModal: () => void; // Changed from onDownloadPdf
  hasAnyNodes: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onAddNode, 
  onAnalyzeUDEs, 
  hasUDEs, 
  isAnalyzing, 
  selectedNodeId,
  onOpenPdfConfigModal, // Changed from onDownloadPdf
  hasAnyNodes
}) => {
  const apiKeyExists = !!process.env.API_KEY;

  return (
    <div className="bg-gray-700 text-white p-3 flex items-center space-x-3 shadow-md flex-wrap">
      <button
        onClick={() => onAddNode(NodeType.UDE)}
        className="flex items-center px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md text-sm font-medium transition-colors mb-2 sm:mb-0"
        title="Adicionar novo Efeito Indesejável (EI)"
      >
        <PlusIcon className="w-5 h-5 mr-2" />
        Adicionar EI
      </button>
      <button
        onClick={() => onAddNode(NodeType.CAUSE)}
        disabled={!selectedNodeId}
        className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2 sm:mb-0"
        title={!selectedNodeId ? "Selecione um nó no diagrama para adicionar uma causa relacionada" : "Adicionar nova Causa"}
      >
        <PlusIcon className="w-5 h-5 mr-2" />
        Adicionar Causa
      </button>
      
      {apiKeyExists && (
        <button
          onClick={onAnalyzeUDEs}
          disabled={!hasUDEs || isAnalyzing}
          className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2 sm:mb-0"
          title={!hasUDEs ? "Adicione EIs para habilitar a análise com IA" : "Analisar EIs para sugerir causas raiz"}
        >
          <BrainIcon className="w-5 h-5 mr-2" />
          {isAnalyzing ? "Analisando..." : "Analisar EIs com IA"}
        </button>
      )}
      {!apiKeyExists && (
         <span className="text-xs text-yellow-400 italic mb-2 sm:mb-0">A funcionalidade de IA está desabilitada. Configure a API_KEY.</span>
      )}
      <button
        onClick={onOpenPdfConfigModal} // Changed from onDownloadPdf
        disabled={!hasAnyNodes}
        className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2 sm:mb-0"
        title={!hasAnyNodes ? "Adicione nós ao diagrama para habilitar o download" : "Configurar e Baixar Árvore como PDF"}
      >
        <DownloadIcon className="w-5 h-5 mr-2" />
        Baixar PDF
      </button>
    </div>
  );
};

export default Toolbar;

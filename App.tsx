
import React, { useState, useCallback, useEffect } from 'react';
import { Node, Edge, NodeType } from './types';
import { NODE_WIDTH, NODE_HEIGHT, MIN_NODE_WIDTH, MIN_NODE_HEIGHT } from './constants';
import Toolbar from './components/Toolbar';
import CurrentRealityTree from './components/CurrentRealityTree';
import { analyzeUDEsForRootCauses } from './services/geminiService';
import { CloseIcon } from './components/icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PdfConfigModal, { PdfConfig } from './components/PdfConfigModal';

const DRAWING_PANE_WRAPPER_ID = "drawing-pane-wrapper";

const App: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [aiPanelUserHidden, setAiPanelUserHidden] = useState<boolean>(false);

  const [isPdfConfigModalOpen, setIsPdfConfigModalOpen] = useState(false);
  const [pdfConfig, setPdfConfig] = useState<PdfConfig>({
    filename: 'current-reality-tree.pdf',
    backgroundColor: '#FFFFFF', 
  });

  const [defaultNodeSize, setDefaultNodeSize] = useState({
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
  });

  const generateId = () => `id_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;

  const addNode = useCallback((type: NodeType, text?: string, x?: number, y?: number): Node => {
    const newNode: Node = {
      id: generateId(),
      text: text || (type === NodeType.UDE ? 'Novo EI' : 'Nova Causa'),
      x: x ?? Math.random() * 300 + 50,
      y: y ?? Math.random() * 200 + 50,
      type,
      width: defaultNodeSize.width,
      height: defaultNodeSize.height,
    };
    setNodes(prev => [...prev, newNode]);
    setAiPanelUserHidden(false); 
    return newNode;
  }, [defaultNodeSize]);

  const updateNodeText = useCallback((nodeId: string, newText: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, text: newText } : n));
  }, []);

  const updateNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, x, y } : n));
  }, []);
  
  const handleUpdateNodeDimensions = useCallback((nodeId: string, newWidth: number, newHeight: number) => {
    setNodes(prevNodes =>
      prevNodes.map(n =>
        n.id === nodeId
          ? {
              ...n,
              width: Math.max(MIN_NODE_WIDTH, newWidth),
              height: Math.max(MIN_NODE_HEIGHT, newHeight),
            }
          : n
      )
    );
  }, []);

  const handleSetDefaultNodeSize = useCallback((newWidth: number, newHeight: number) => {
    setDefaultNodeSize({
        width: Math.max(MIN_NODE_WIDTH, newWidth),
        height: Math.max(MIN_NODE_HEIGHT, newHeight),
    });
  }, []);


  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.sourceId !== nodeId && e.targetId !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null); 
    }
  }, [selectedNodeId]);

  const addEdge = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId || edges.some(e => e.sourceId === sourceId && e.targetId === targetId)) {
      return;
    }
    const newEdge: Edge = { id: generateId(), sourceId, targetId };
    setEdges(prev => [...prev, newEdge]);
  }, [edges]);

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId));
  }, []);

  const handleAnalyzeUDEs = useCallback(async () => {
    const udeTexts = nodes.filter(n => n.type === NodeType.UDE).map(n => n.text);
    if (udeTexts.length === 0) {
      setAiError("Por favor, adicione alguns Efeitos Indesejáveis (EIs) primeiro.");
      setAiPanelUserHidden(false);
      return;
    }
    setIsAnalyzing(true);
    setAiError(null);
    setAiSuggestions([]);
    setAiPanelUserHidden(false);
    try {
      const suggestions = await analyzeUDEsForRootCauses(udeTexts);
      setAiSuggestions(suggestions);
      if (suggestions.length === 0) {
        setAiError("A IA não retornou sugestões ou a resposta foi vazia.");
      }
    } catch (error) {
      console.error("AI Analysis Error:", error);
      setAiError(`Falha ao analisar com IA: ${error instanceof Error ? error.message : "Erro desconhecido"}. Verifique o console para detalhes.`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [nodes]);

  const addAISuggestionAsCause = (suggestionText: string) => {
    const lastNodeY = nodes.length > 0 ? Math.max(...nodes.map(n => n.y + (n.height || NODE_HEIGHT))) : 50;
    const newY = lastNodeY + 30; 
    
    let newX = Math.random() * 300 + 50;
    const currentlySelectedNode = nodes.find(n => n.id === selectedNodeId);

    if (currentlySelectedNode) {
        newX = currentlySelectedNode.x;
    }

    const newCauseNode = addNode(NodeType.CAUSE, suggestionText, newX, newY);
    
    if (currentlySelectedNode && currentlySelectedNode.type === NodeType.UDE) {
        addEdge(newCauseNode.id, currentlySelectedNode.id);
    }
    
    setAiSuggestions(prev => prev.filter(s => s !== suggestionText));
  };

  const handleOpenPdfConfigModal = () => {
    if (nodes.length === 0) {
      alert("Nenhum conteúdo para exportar para PDF.");
      return;
    }
    setIsPdfConfigModalOpen(true);
  };

  const handleConfirmDownloadPdf = useCallback(async (currentConfig: PdfConfig) => {
    const drawingPaneWrapper = document.getElementById(DRAWING_PANE_WRAPPER_ID);
    if (!drawingPaneWrapper) {
      alert("Elemento de desenho não encontrado.");
      setIsPdfConfigModalOpen(false);
      return;
    }

    if (nodes.length === 0) {
      alert("Nenhum nó para exportar. A árvore está vazia.");
      setIsPdfConfigModalOpen(false);
      return;
    }
    
    setSelectedNodeId(null); 
    await new Promise(resolve => setTimeout(resolve, 50)); 

    let originalBgStyle = '';
    if (currentConfig.backgroundColor === '#FFFFFF') { 
        originalBgStyle = drawingPaneWrapper.style.backgroundColor;
        drawingPaneWrapper.style.backgroundColor = 'white';
    }
    
    const html2canvasBackgroundColor = currentConfig.backgroundColor === '#FFFFFF' ? '#FFFFFF' : null;

    try {
      const canvas = await html2canvas(drawingPaneWrapper, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: html2canvasBackgroundColor,
      });

      if (currentConfig.backgroundColor === '#FFFFFF') {
        drawingPaneWrapper.style.backgroundColor = originalBgStyle; 
      }

      const imgData = canvas.toDataURL('image/png');
      const orientation = canvas.width > canvas.height ? 'l' : 'p';
      
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'px',
        format: [canvas.width, canvas.height] 
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(currentConfig.filename.endsWith('.pdf') ? currentConfig.filename : `${currentConfig.filename}.pdf`);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(`Ocorreu um erro ao gerar o PDF: ${error instanceof Error ? error.message : "Erro desconhecido"}. Verifique o console para detalhes.`);
      if (currentConfig.backgroundColor === '#FFFFFF') { 
        drawingPaneWrapper.style.backgroundColor = originalBgStyle;
      }
    } finally {
        setIsPdfConfigModalOpen(false);
    }
  }, [nodes]); 

  const shouldShowAiPanel = process.env.API_KEY && !aiPanelUserHidden && 
                           (isAnalyzing || !!aiError || aiSuggestions.length > 0 || 
                            (!isAnalyzing && !aiError && aiSuggestions.length === 0) 
                           );

  return (
    <div className="flex flex-col h-screen bg-gray-800">
      <Toolbar
        onAddNode={addNode}
        onAnalyzeUDEs={() => {
          handleAnalyzeUDEs();
          setAiPanelUserHidden(false); 
        }}
        hasUDEs={nodes.some(n => n.type === NodeType.UDE)}
        isAnalyzing={isAnalyzing}
        selectedNodeId={selectedNodeId}
        onOpenPdfConfigModal={handleOpenPdfConfigModal}
        hasAnyNodes={nodes.length > 0}
      />
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <div className="flex-1 relative">
          <CurrentRealityTree
            nodes={nodes}
            edges={edges}
            onAddNode={addNode}
            onUpdateNodeText={updateNodeText}
            onUpdateNodePosition={updateNodePosition}
            onUpdateNodeDimensions={handleUpdateNodeDimensions}
            onSetDefaultNodeSize={handleSetDefaultNodeSize}
            defaultNodeSize={defaultNodeSize}
            onDeleteNode={deleteNode}
            onAddEdge={addEdge}
            onDeleteEdge={deleteEdge}
            selectedNodeId={selectedNodeId} 
            onSelectNodeId={setSelectedNodeId} 
          />
        </div>
        {shouldShowAiPanel && (
          <div className="order-last md:order-none w-full md:w-1/4 md:min-w-[300px] md:max-w-[400px] bg-gray-700 p-4 text-white overflow-y-auto shadow-lg flex flex-col max-h-[40vh] md:max-h-full">
            <div className="flex justify-between items-center mb-3 border-b border-gray-600 pb-2">
              <h3 className="text-lg font-semibold">Análise com IA</h3>
              <button 
                onClick={() => setAiPanelUserHidden(true)} 
                className="text-gray-400 hover:text-white"
                title="Fechar Painel de IA"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto">
              {isAnalyzing && <p className="text-purple-300 animate-pulse">Analisando EIs, por favor aguarde...</p>}
              {aiError && <p className="text-red-400 bg-red-900 p-2 rounded-md text-sm">{aiError}</p>}
              
              {!isAnalyzing && !aiError && aiSuggestions.length === 0 && (
                 <p className="text-sm text-gray-400 italic">
                   Aguardando análise ou nenhuma sugestão no momento. Clique em 'Analisar EIs com IA' para obter sugestões.
                 </p>
              )}

              {aiSuggestions.length > 0 && !isAnalyzing && (
                <div>
                  <p className="mb-2 text-sm text-gray-300">Sugestões de causas raiz potenciais:</p>
                  <ul className="space-y-2">
                    {aiSuggestions.map((suggestion, index) => {
                      const currentlySelectedNode = nodes.find(n => n.id === selectedNodeId);
                      const isAddButtonDisabled = !currentlySelectedNode || currentlySelectedNode.type !== NodeType.UDE;
                      return (
                        <li key={index} className="bg-gray-600 p-3 rounded-md shadow">
                          <p className="text-sm mb-2">{suggestion}</p>
                          <button
                            onClick={() => addAISuggestionAsCause(suggestion)}
                            disabled={isAddButtonDisabled}
                            className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={isAddButtonDisabled ? "Selecione um Efeito Indesejável (EI) no diagrama para adicionar esta causa." : "Adicionar como Causa ao EI selecionado"}
                          >
                            Adicionar como Causa
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <PdfConfigModal
        isOpen={isPdfConfigModalOpen}
        onClose={() => setIsPdfConfigModalOpen(false)}
        onSave={handleConfirmDownloadPdf}
        initialConfig={pdfConfig}
        onConfigChange={setPdfConfig}
      />
       <footer className="bg-gray-900 text-center text-xs text-gray-400 p-2">
        Construtor de Árvore da Realidade Atual (ARA) - Teoria das Restrições (TOC)
      </footer>
    </div>
  );
};

export default App;
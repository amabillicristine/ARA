import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Node, NodeType } from '../types';
import { PORT_SIZE, NODE_COLORS, MIN_NODE_WIDTH, MIN_NODE_HEIGHT } from '../constants';
import { TrashIcon, EditIcon, LinkIcon, PinIcon } from './icons';

interface NodeComponentProps {
  node: Node;
  onDragStart: (e: React.MouseEvent, nodeId: string) => void;
  onDrag: (e: MouseEvent, nodeId: string) => void; // Maintained for consistency, but drag is global
  onDragEnd: (e: MouseEvent, nodeId: string) => void; // Maintained for consistency
  onUpdateText: (nodeId: string, newText: string) => void;
  onUpdateNodeDimensions: (nodeId: string, newWidth: number, newHeight: number) => void;
  onSetDefaultNodeSize: (newWidth: number, newHeight: number) => void;
  defaultNodeSize: { width: number; height: number };
  onDeleteNode: (nodeId: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, portType: 'source' | 'target', portX: number, portY: number) => void;
  onPortMouseUp: (e: React.MouseEvent, nodeId: string, portType: 'source' | 'target') => void;
  onStartConnectFromNode: (nodeId: string) => void;
  isSelected: boolean;
  onClick: (nodeId: string) => void;
  isHotTargetForConnection?: boolean;
}

const NodeComponent: React.FC<NodeComponentProps> = ({
  node,
  onDragStart,
  onUpdateText,
  onUpdateNodeDimensions,
  onSetDefaultNodeSize,
  defaultNodeSize,
  onDeleteNode,
  onPortMouseDown,
  onPortMouseUp,
  onStartConnectFromNode,
  isSelected,
  onClick,
  isHotTargetForConnection,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isResizing, setIsResizing] = useState(false);
  const resizeStartInfo = useRef<{ 
    initialMouseX: number; 
    initialMouseY: number; 
    initialWidth: number; 
    initialHeight: number 
  } | null>(null);

  const colors = node.type === NodeType.UDE ? NODE_COLORS.UDE : NODE_COLORS.CAUSE;

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);
  
  useEffect(() => {
    setEditText(node.text);
  },[node.text]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
  };

  const handleTextBlur = () => {
    onUpdateText(node.id, editText.trim() === '' ? (node.type === NodeType.UDE ? "Novo EI" : "Nova Causa") : editText);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextBlur();
    }
    if (e.key === 'Escape') {
      setEditText(node.text);
      setIsEditing(false);
    }
  };
  
  const sourcePortPos = { x: node.width / 2, y: node.height }; 
  const targetPortPos = { x: node.width / 2, y: 0 }; 

  const portBaseClasses = `absolute w-[${PORT_SIZE}px] h-[${PORT_SIZE}px] rounded-full ${colors.port} cursor-crosshair transition-all duration-150 ease-in-out`;
  const portHoverClasses = `hover:ring-2 hover:ring-offset-1 hover:ring-black`;
  
  const targetPortExtraClasses = isHotTargetForConnection 
    ? `ring-4 ring-green-500 ring-offset-2 bg-green-400 scale-125` 
    : '';


  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartInfo.current = {
      initialMouseX: e.clientX,
      initialMouseY: e.clientY,
      initialWidth: node.width,
      initialHeight: node.height,
    };
  }, [node.width, node.height]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isResizing && resizeStartInfo.current) {
        const deltaX = e.clientX - resizeStartInfo.current.initialMouseX;
        const deltaY = e.clientY - resizeStartInfo.current.initialMouseY;
        let newWidth = resizeStartInfo.current.initialWidth + deltaX;
        let newHeight = resizeStartInfo.current.initialHeight + deltaY;

        newWidth = Math.max(MIN_NODE_WIDTH, newWidth);
        newHeight = Math.max(MIN_NODE_HEIGHT, newHeight);
        
        onUpdateNodeDimensions(node.id, newWidth, newHeight);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        resizeStartInfo.current = null;
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isResizing, node.id, onUpdateNodeDimensions]);

  const isCurrentSizeDefault = node.width === defaultNodeSize.width && node.height === defaultNodeSize.height;

  return (
    <div
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
        width: `${node.width}px`,
        height: `${node.height}px`,
      }}
      className={`absolute p-2 rounded-lg shadow-md flex flex-col justify-center items-center ${colors.bg} ${colors.border} border-2 ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2' : ''} ${isResizing ? 'cursor-nwse-resize' : 'cursor-grab'}`}
      onMouseDown={(e) => {
        const targetElement = e.target as HTMLElement;
         // Allow drag only if not clicking on resize handle or other interactive elements (like ports if they were not stopping propagation)
        if (!isResizing && (targetElement === e.currentTarget || targetElement.closest('.node-content'))) {
           onClick(node.id); 
           onDragStart(e, node.id);
        }
      }}
      onDoubleClick={handleDoubleClick}
    >
      <div className="node-content w-full h-full flex flex-col items-center justify-center p-1 overflow-hidden">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onKeyDown={handleKeyDown}
            className={`w-full h-full p-1 text-sm resize-none border border-gray-400 rounded ${colors.text} bg-white focus:outline-none focus:ring-1 focus:ring-purple-500`}
            style={{ minHeight: `${MIN_NODE_HEIGHT - 20}px` }} // Ensure textarea has min height
          />
        ) : (
          <span className={`text-sm text-center break-words ${colors.text} p-1`}>
            {node.text}
          </span>
        )}
      </div>

      {/* Ports */}
      <div
        style={{
          left: `${targetPortPos.x - PORT_SIZE / 2}px`,
          top: `${targetPortPos.y - PORT_SIZE / 2}px`,
        }}
        className={`${portBaseClasses} ${portHoverClasses} ${targetPortExtraClasses}`}
        data-port-type="target"
        onMouseDown={(e) => {
          e.stopPropagation(); 
          onPortMouseDown(e, node.id, 'target', node.x + targetPortPos.x, node.y + targetPortPos.y);
        }}
        onMouseUp={(e) => {
            e.stopPropagation();
            onPortMouseUp(e, node.id, 'target');
        }}
        title="Conectar como Efeito"
      />
      <div
        style={{
          left: `${sourcePortPos.x - PORT_SIZE / 2}px`,
          top: `${sourcePortPos.y - PORT_SIZE / 2}px`,
        }}
        className={`${portBaseClasses} ${portHoverClasses}`}
        data-port-type="source"
        onMouseDown={(e) => {
            e.stopPropagation(); 
            onPortMouseDown(e, node.id, 'source', node.x + sourcePortPos.x, node.y + sourcePortPos.y);
        }}
         onMouseUp={(e) => {
            e.stopPropagation(); // Prevent triggering pane mouseup if edge creation ends here
        }}
        title="Conectar como Causa"
      />
      
      {/* Action Buttons */}
      {isSelected && !isResizing && (
        <div className="absolute -top-3.5 -right-3.5 flex space-x-1 z-10">
          {!isCurrentSizeDefault && (
            <button
              onClick={(e) => { e.stopPropagation(); onSetDefaultNodeSize(node.width, node.height); }}
              className="p-1.5 bg-green-500 hover:bg-green-600 rounded-full shadow text-white"
              title="Definir como Tamanho Padrão"
            >
              <PinIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onStartConnectFromNode(node.id); }}
            className="p-1.5 bg-teal-500 hover:bg-teal-600 rounded-full shadow text-white"
            title="Iniciar Conexão"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="p-1.5 bg-yellow-400 hover:bg-yellow-500 rounded-full shadow text-white"
            title="Editar Texto"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }}
            className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full shadow text-white"
            title="Deletar Nó"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Resize Handle */}
      {isSelected && (
        <div
          className="absolute bottom-[-4px] right-[-4px] w-4 h-4 bg-gray-400 hover:bg-gray-500 border-2 border-white rounded-full cursor-nwse-resize z-20"
          onMouseDown={handleResizeMouseDown}
          title="Redimensionar Nó"
        />
      )}
    </div>
  );
};

export default NodeComponent;
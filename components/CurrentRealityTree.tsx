

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge, NodeType, PendingEdge } from '../types';
import NodeComponent from './NodeComponent';
import { NODE_WIDTH, NODE_HEIGHT, PORT_SIZE, MIN_NODE_WIDTH, MIN_NODE_HEIGHT } from '../constants';

interface CurrentRealityTreeProps {
  nodes: Node[];
  edges: Edge[];
  onAddNode: (type: NodeType, text?: string, x?: number, y?: number) => Node;
  onUpdateNodeText: (nodeId: string, newText: string) => void;
  onUpdateNodePosition: (nodeId: string, x: number, y: number) => void;
  onUpdateNodeDimensions: (nodeId: string, newWidth: number, newHeight: number) => void;
  onSetDefaultNodeSize: (newWidth: number, newHeight: number) => void;
  defaultNodeSize: { width: number; height: number };
  onDeleteNode: (nodeId: string) => void;
  onAddEdge: (sourceId: string, targetId: string) => void;
  onDeleteEdge: (edgeId: string) => void; 
  selectedNodeId: string | null;
  onSelectNodeId: (nodeId: string | null) => void;
}

const ARROW_LENGTH = 15; 
const DEFAULT_EDGE_STROKE_WIDTH = 2.5; 
const SELECTED_EDGE_STROKE_WIDTH = 3.5; 

const calculateIntersectionPointWithNodeBoundary = (node: Node, targetPoint: { x: number; y: number }): { x: number; y: number } => {
  const nodeCenterX = node.x + node.width / 2;
  const nodeCenterY = node.y + node.height / 2;

  const dx = targetPoint.x - nodeCenterX;
  const dy = targetPoint.y - nodeCenterY;

  if (dx === 0 && dy === 0) { 
    return { x: nodeCenterX, y: node.y + node.height };
  }

  let minT = Infinity;
  const halfWidth = node.width / 2;
  const halfHeight = node.height / 2;

  if (dx !== 0) {
      const tEdgeX = Math.abs(halfWidth / dx); 
      minT = Math.min(minT, tEdgeX);
  }
  if (dy !== 0) {
      const tEdgeY = Math.abs(halfHeight / dy); 
      minT = Math.min(minT, tEdgeY);
  }
  
  if (minT === Infinity || minT === 0) { 
     if (dx === 0) return { x: nodeCenterX, y: nodeCenterY + Math.sign(dy) * halfHeight};
     if (dy === 0) return { x: nodeCenterX + Math.sign(dx) * halfWidth, y: nodeCenterY};
     return { x: nodeCenterX, y: node.y + node.height }; 
  }

  let intersectX = nodeCenterX + dx * minT;
  let intersectY = nodeCenterY + dy * minT;

  intersectX = Math.max(node.x, Math.min(intersectX, node.x + node.width));
  intersectY = Math.max(node.y, Math.min(intersectY, node.y + node.height));

  return { x: intersectX, y: intersectY };
};


const CurrentRealityTree: React.FC<CurrentRealityTreeProps> = ({
  nodes,
  edges,
  onAddNode,
  onUpdateNodeText,
  onUpdateNodePosition,
  onUpdateNodeDimensions,
  onSetDefaultNodeSize,
  defaultNodeSize,
  onDeleteNode,
  onAddEdge,
  onDeleteEdge,
  selectedNodeId,
  onSelectNodeId,
}) => {
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pendingEdge, setPendingEdge] = useState<PendingEdge | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [potentialTargetNodeId, setPotentialTargetNodeId] = useState<string | null>(null);

  const drawingPaneRef = useRef<SVGSVGElement>(null);

  const handleNodeClick = useCallback((nodeId: string) => {
    onSelectNodeId(nodeId);
    setSelectedEdgeId(null);
    setPendingEdge(null); 
    setPotentialTargetNodeId(null);
  }, [onSelectNodeId]);

  const handleNodeDragStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDraggingNode(nodeId);
      const paneRect = drawingPaneRef.current?.getBoundingClientRect();
      const offsetX = e.clientX - (paneRect?.left || 0) - node.x;
      const offsetY = e.clientY - (paneRect?.top || 0) - node.y;
      setDragOffset({ x: offsetX, y: offsetY });
      onSelectNodeId(nodeId); 
      setSelectedEdgeId(null); 
      setPendingEdge(null); 
      setPotentialTargetNodeId(null);
    }
  }, [nodes, onSelectNodeId]);

  const handleNodeDrag = useCallback((e: MouseEvent, nodeId: string) => {
    if (!draggingNode || draggingNode !== nodeId) return;
    e.preventDefault();
    e.stopPropagation();
    const paneRect = drawingPaneRef.current?.getBoundingClientRect();
    if (paneRect) {
        let newX = e.clientX - paneRect.left - dragOffset.x;
        let newY = e.clientY - paneRect.top - dragOffset.y;
        onUpdateNodePosition(nodeId, newX, newY);
    }
  }, [draggingNode, dragOffset, onUpdateNodePosition]);

  const handleNodeDragEnd = useCallback((e: MouseEvent, nodeId: string) => {
    if (draggingNode === nodeId) {
        setDraggingNode(null);
    }
  }, [draggingNode]);

  const handleStartConnectFromNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setPendingEdge({
        sourceId: nodeId,
        sourceX: node.x + node.width / 2, 
        sourceY: node.y + node.height,  
        mouseX: node.x + node.width / 2, 
        mouseY: node.y + node.height,
    });
    onSelectNodeId(nodeId); 
    setSelectedEdgeId(null);
    setPotentialTargetNodeId(null);
  }, [nodes, onSelectNodeId]);

  const handlePortMouseDown = useCallback((e: React.MouseEvent, nodeId: string, portType: 'source' | 'target', portX: number, portY: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (portType === 'source') { 
        const paneRect = drawingPaneRef.current?.getBoundingClientRect();
        if (!paneRect) return;
        
        const initialMouseX = e.clientX - paneRect.left;
        const initialMouseY = e.clientY - paneRect.top;

        setPendingEdge({ 
            sourceId: nodeId, 
            sourceX: initialMouseX, 
            sourceY: initialMouseY, 
            mouseX: initialMouseX, 
            mouseY: initialMouseY 
        });
        onSelectNodeId(nodeId); 
        setSelectedEdgeId(null);
        setPotentialTargetNodeId(null);
    } else { 
        if (pendingEdge && pendingEdge.sourceId !== nodeId) {
            onAddEdge(pendingEdge.sourceId, nodeId);
            setPendingEdge(null);
            setPotentialTargetNodeId(null);
        }
    }
  }, [pendingEdge, onAddEdge, onSelectNodeId]); 

  const handlePortMouseUp = useCallback((e: React.MouseEvent, nodeId: string, portType: 'source' | 'target') => {
    e.preventDefault();
    e.stopPropagation();
    if (pendingEdge && portType === 'target' && pendingEdge.sourceId !== nodeId) {
      if (potentialTargetNodeId === nodeId) { 
         onAddEdge(pendingEdge.sourceId, nodeId);
      }
      setPendingEdge(null);
      setPotentialTargetNodeId(null);
    }
  }, [pendingEdge, onAddEdge, potentialTargetNodeId]);

  const handleMouseMoveInPane = useCallback((e: React.MouseEvent) => {
    if (pendingEdge) {
      const paneRect = drawingPaneRef.current?.getBoundingClientRect();
      if (paneRect) {
        const mouseX = e.clientX - paneRect.left;
        const mouseY = e.clientY - paneRect.top;
        
        setPendingEdge(prev => prev ? { ...prev, mouseX, mouseY } : null);

        let foundTarget = false;
        for (const node of nodes) {
            if (node.id === pendingEdge.sourceId) continue;
            
            const distanceToPort = Math.sqrt(
              Math.pow(mouseX - (node.x + node.width / 2), 2) + 
              Math.pow(mouseY - (node.y + PORT_SIZE/2), 2) 
            );

            if (distanceToPort < PORT_SIZE * 2.5) {
                setPotentialTargetNodeId(node.id);
                foundTarget = true;
                break;
            }
        }
        if (!foundTarget) {
            setPotentialTargetNodeId(null);
        }
      }
    }
  }, [pendingEdge, nodes]);
  
  const handleMouseUpInPane = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (pendingEdge && !target.closest('[data-port-type="target"]') && !potentialTargetNodeId ) {
      setPendingEdge(null);
      setPotentialTargetNodeId(null);
    } 
  }, [pendingEdge, potentialTargetNodeId]);

  const handlePaneClick = (e: React.MouseEvent) => {
    const targetIsPane = e.target === e.currentTarget || e.target === drawingPaneRef.current?.parentElement; 
    if (targetIsPane) {
        onSelectNodeId(null); 
        setSelectedEdgeId(null);
        if (pendingEdge) { 
            setPendingEdge(null);
            setPotentialTargetNodeId(null);
        }
    }
  };

  const handleEdgeClick = (e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    setSelectedEdgeId(edgeId);
    onSelectNodeId(null); 
    setPendingEdge(null); 
    setPotentialTargetNodeId(null);
  };

  useEffect(() => {
    const globalMouseMove = (e: MouseEvent) => {
      if (draggingNode) {
        handleNodeDrag(e, draggingNode);
      }
    };
    const globalMouseUp = (e: MouseEvent) => {
      if (draggingNode) {
        handleNodeDragEnd(e, draggingNode);
      }
    };

    document.addEventListener('mousemove', globalMouseMove);
    document.addEventListener('mouseup', globalMouseUp);
    return () => {
      document.removeEventListener('mousemove', globalMouseMove);
      document.removeEventListener('mouseup', globalMouseUp);
    };
  }, [draggingNode, handleNodeDrag, handleNodeDragEnd]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (pendingEdge) {
          setPendingEdge(null);
          setPotentialTargetNodeId(null);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pendingEdge]);

  const defaultEdgeColor = "#6B7280"; 
  const selectedEdgeColor = "#7C3AED"; 

  return (
    <div 
        className="w-full h-full bg-gray-100 relative overflow-auto select-none"
        onMouseMove={handleMouseMoveInPane}
        onMouseUp={handleMouseUpInPane} 
        onClick={handlePaneClick}
        id="drawing-pane-wrapper"
    >
      <svg ref={drawingPaneRef} className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {edges.map(edge => {
          const sourceNode = nodes.find(n => n.id === edge.sourceId);
          const targetNode = nodes.find(n => n.id === edge.targetId);
          if (!sourceNode || !targetNode) return null;

          const sourceNodeCenter = { x: sourceNode.x + sourceNode.width / 2, y: sourceNode.y + sourceNode.height / 2 };
          const targetNodeCenter = { x: targetNode.x + targetNode.width / 2, y: targetNode.y + targetNode.height / 2 };

          const startPoint = calculateIntersectionPointWithNodeBoundary(sourceNode, targetNodeCenter);
          const endPoint = calculateIntersectionPointWithNodeBoundary(targetNode, sourceNodeCenter);
          
          const isSelected = edge.id === selectedEdgeId;
          
          const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
          
          const arrowheadProjectionLength = ARROW_LENGTH * Math.cos(Math.PI / 6);
          const lineLength = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));

          let lineEndX = endPoint.x;
          let lineEndY = endPoint.y;

          if (lineLength > arrowheadProjectionLength && lineLength > 1) { 
            const shorteningAmount = arrowheadProjectionLength;
             lineEndX = endPoint.x - shorteningAmount * Math.cos(angle);
             lineEndY = endPoint.y - shorteningAmount * Math.sin(angle);
          } else if (lineLength <= 1) { 
            lineEndX = startPoint.x;
            lineEndY = startPoint.y;
          }

          const d = `M ${startPoint.x} ${startPoint.y} L ${lineEndX} ${lineEndY}`;
          
          const ax1 = endPoint.x - ARROW_LENGTH * Math.cos(angle - Math.PI / 6);
          const ay1 = endPoint.y - ARROW_LENGTH * Math.sin(angle - Math.PI / 6);
          const ax2 = endPoint.x - ARROW_LENGTH * Math.cos(angle + Math.PI / 6);
          const ay2 = endPoint.y - ARROW_LENGTH * Math.sin(angle + Math.PI / 6);

          return (
            <g key={edge.id} className="pointer-events-auto cursor-pointer" onClick={(e) => handleEdgeClick(e, edge.id)}>
              <path
                d={d}
                stroke={isSelected ? selectedEdgeColor : defaultEdgeColor}
                strokeWidth={isSelected ? SELECTED_EDGE_STROKE_WIDTH : DEFAULT_EDGE_STROKE_WIDTH}
                fill="none"
              />
              <polygon
                points={`${endPoint.x},${endPoint.y} ${ax1},${ay1} ${ax2},${ay2}`}
                fill={isSelected ? selectedEdgeColor : defaultEdgeColor}
              />
               {isSelected && ( 
                <text
                    x={(startPoint.x + endPoint.x) / 2 - 6} 
                    y={(startPoint.y + endPoint.y) / 2 + 6} 
                    fill="#EF4444" 
                    className="text-xl font-bold cursor-pointer hover:fill-red-700 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onDeleteEdge(edge.id); setSelectedEdgeId(null);}}
                    style={{pointerEvents: 'all'}} 
                >
                    &#x2715; 
                </text>
              )}
            </g>
          );
        })}
        {pendingEdge && (() => {
            const sourceNode = nodes.find(n => n.id === pendingEdge.sourceId);
            if (!sourceNode) return null;
            
            const dynamicSourcePoint = calculateIntersectionPointWithNodeBoundary(sourceNode, {x: pendingEdge.mouseX, y: pendingEdge.mouseY});

            return (
                <line
                    x1={dynamicSourcePoint.x}
                    y1={dynamicSourcePoint.y}
                    x2={pendingEdge.mouseX}
                    y2={pendingEdge.mouseY}
                    stroke={selectedEdgeColor}
                    strokeWidth={DEFAULT_EDGE_STROKE_WIDTH}
                    strokeDasharray="4 2"
                    className="pointer-events-none"
                />
            );
        })()}
      </svg>
      {nodes.map(node => (
        <NodeComponent
          key={node.id}
          node={node}
          onDragStart={handleNodeDragStart}
          onDrag={(e, nodeId) => { /* Handled by global event listener */}}
          onDragEnd={(e, nodeId) => { /* Handled by global event listener */}}
          onUpdateText={onUpdateNodeText}
          onUpdateNodeDimensions={onUpdateNodeDimensions}
          onSetDefaultNodeSize={onSetDefaultNodeSize}
          defaultNodeSize={defaultNodeSize}
          onDeleteNode={onDeleteNode}
          onPortMouseDown={handlePortMouseDown}
          onPortMouseUp={handlePortMouseUp}
          onStartConnectFromNode={handleStartConnectFromNode} 
          isSelected={node.id === selectedNodeId} 
          onClick={handleNodeClick} 
          isHotTargetForConnection={potentialTargetNodeId === node.id && !!pendingEdge && pendingEdge.sourceId !== node.id}
        />
      ))}
    </div>
  );
};

export default CurrentRealityTree;
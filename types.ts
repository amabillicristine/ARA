export enum NodeType {
  UDE = 'UDE', // Efeito Indesejável
  CAUSE = 'CAUSE', // Causa
}

export interface Node {
  id: string;
  text: string;
  x: number;
  y: number;
  type: NodeType;
  width: number;
  height: number;
}

export interface Edge {
  id:string;
  sourceId: string; // Cause node ID
  targetId: string; // Effect node ID
}

export interface PendingEdge {
  sourceId: string;
  sourceX: number;
  sourceY: number;
  mouseX: number;
  mouseY: number;
}
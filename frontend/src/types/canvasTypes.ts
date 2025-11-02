import { Point, Dimensions } from '@/utils/canvasCoordinates';
import { CanvasTool, ElementType, BrushType, ResizeHandle } from '@/utils/canvasConstants';

// Plant interface
export interface Plant {
  id: string;
  name: string;
  icon: string;
  spacing: string;
  season?: string;
  category: string;
  color?: string;
  description?: string;
  difficulty?: string;
  waterNeeds?: string;
  [key: string]: unknown;
}

// Terrain interface
export interface Terrain {
  id: string;
  name: string;
  icon?: string;
  color: string;
  pattern?: string;
  category: string;
  description?: string;
  selectedBrushMode?: 'rectangle' | 'circle' | 'brush';
  brushThickness?: number;
  brushType?: BrushType;
  [key: string]: unknown;
}

// Structure interface
export interface Structure {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  size: { width: number; height: number };
  description: string;
  [key: string]: unknown;
}

// Drawing element interface
export interface DrawingElement {
  id: number;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  plant?: Plant;
  terrain?: Terrain;
  structure?: Structure;
  selected?: boolean;
  rotation?: number;
  // Real-world size in meters (for terrain elements)
  realWorldWidth?: number;
  realWorldHeight?: number;
  // Terrain brush properties
  brushType?: BrushType;
  texture?: string;
  // Path points for trail-like terrains
  pathPoints?: Point[];
  // Brush properties
  selectedBrushMode?: 'rectangle' | 'circle' | 'brush';
  brushThickness?: number;
}

// Canvas state interfaces
export interface CanvasState {
  elements: DrawingElement[];
  selectedTool: CanvasTool;
  selectedPlant: Plant | null;
  selectedTerrain: Terrain | null;
  selectedStructure: Structure | null;
  zoom: number;
  panOffset: Point;
  showGrid: boolean;
  canvasDimensions: Dimensions;
  canvasRealSize: Dimensions;
}

export interface InteractionState {
  isDrawing: boolean;
  isDragging: boolean;
  isPanning: boolean;
  isSpacePressed: boolean;
  isResizing: boolean;
  isDrawingTerrain: boolean;
  dragElement: DrawingElement | null;
  currentShape: DrawingElement | null;
  startPos: Point;
  dragOffset: Point;
  lastPanPoint: Point;
  currentTerrainPath: Point[];
  resizeHandle: ResizeHandle | null;
  resizeElement: DrawingElement | null;
  resizeStartPos: Point;
  originalElementBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Canvas props interface
export interface CanvasProps {
  selectedTool: string;
  selectedPlant: Plant | null;
  selectedTerrain: Terrain | null;
  selectedStructure?: Structure | null;
  onPlantUsed: () => void;
  onTerrainUsed: () => void;
  onStructureUsed?: () => void;
  onToolChange: (tool: string) => void;
  canvasSize?: Dimensions;
  onCanvasSizeChange?: (size: Dimensions) => void;
  onUndoRedoActionsChange?: (actions: { canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void } | null) => void;
}

// Event handler types
export type MouseEventHandler = (e: React.MouseEvent) => void;
export type TouchEventHandler = (e: React.TouchEvent) => void;
export type DragEventHandler = (e: React.DragEvent) => void;

// Canvas context interface for state management
export interface CanvasContextType {
  // State
  canvasState: CanvasState;
  interactionState: InteractionState;
  
  // Actions
  updateCanvasState: (updates: Partial<CanvasState>) => void;
  updateInteractionState: (updates: Partial<InteractionState>) => void;
  
  // Element operations
  addElement: (element: DrawingElement) => void;
  updateElement: (id: number, updates: Partial<DrawingElement>) => void;
  removeElement: (id: number) => void;
  selectElement: (id: number) => void;
  clearSelection: () => void;
  
  // Tool operations
  setTool: (tool: CanvasTool) => void;
  setPlant: (plant: Plant | null) => void;
  setTerrain: (terrain: Terrain | null) => void;
  
  // View operations
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Point) => void;
  toggleGrid: () => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// Utility type for element bounds
export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

// Utility type for collision detection
export interface CollisionBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Canvas tool configuration
export interface ToolConfig {
  cursor: string;
  requiresSelection?: boolean;
  allowsMultiSelect?: boolean;
  showHandles?: boolean;
}

// Export all types for use in other components
export type {
  Point,
  Dimensions,
  CanvasTool,
  ElementType,
  BrushType,
  ResizeHandle
};

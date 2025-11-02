
import React, { useRef, useEffect, useState, useCallback, useMemo, memo, forwardRef, useImperativeHandle } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CanvasElement } from "./canvas/CanvasElement";
import { CanvasWelcome } from "./canvas/CanvasWelcome";
import { useCanvasEvents } from "@/hooks/useCanvasEvents";
import { useCanvasZoom } from "@/hooks/useCanvasZoom";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import { Grid3X3, Download, Square, Target, Move, Plus, Minus, RotateCcw } from "lucide-react";
import { exportCanvasArea, exportSelectedElements } from "@/utils/canvasExport";

import { CANVAS_CONSTANTS } from "../utils/canvasConstants";
import { calculatePixelsPerMeter, metersToPixels, getCanvasMousePosition, snapToGrid } from "../utils/canvasCoordinates";
import { CanvasProps, DrawingElement } from "../types/canvasTypes";
import { parseSpacingToMeters } from "../utils/plantSizes";

// Canvas ref interface
export interface CanvasRef {
  exportFullCanvas: () => Promise<void>;
  exportSelectionAsPNG: () => Promise<void>;
  exportSelectedElementsAsPNG: () => Promise<void>;
}

export const Canvas = memo(forwardRef<CanvasRef, CanvasProps>(({ selectedTool, selectedPlant, selectedTerrain, selectedStructure, onPlantUsed, onTerrainUsed, onStructureUsed, onToolChange, canvasSize = CANVAS_CONSTANTS.DEFAULT_CANVAS_REAL_SIZE, onCanvasSizeChange, onUndoRedoActionsChange }, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [elements, elementsActions] = useUndoRedo<DrawingElement[]>([], {
    maxHistorySize: 50,
    debounceMs: 300,
  });
  
  // Canvas dimensions state for dynamic measurements
  const [canvasDimensions, setCanvasDimensions] = useState(CANVAS_CONSTANTS.DEFAULT_CANVAS_DIMENSIONS);
  
  // Canvas real-world size in meters
  const [canvasRealSize, setCanvasRealSize] = useState(CANVAS_CONSTANTS.DEFAULT_CANVAS_REAL_SIZE);
  
  const { isMobile, isTablet, isDesktop, isLargeDesktop, isUltraWide, screenWidth, screenHeight } = useResponsive();
  const isCompact = isMobile || isTablet;
  const isWideScreen = isLargeDesktop || isUltraWide;

  // Enhanced zoom controls
  const {
    zoom,
    panOffset,
    zoomIn,
    zoomOut,
    zoomToFit,
    resetZoom,
    setPanOffset,
    zoomLevel,
    canZoomIn,
    canZoomOut,
  } = useCanvasZoom({
    minZoom: isCompact ? 25 : 10,
    maxZoom: isWideScreen ? 400 : isCompact ? 200 : 300,
    zoomStep: isWideScreen ? 2 : 3, // Further reduced zoom step for slower zooming
    canvasRef,
    onZoomChange: (newZoom) => {
      toast.info(`Zoom: ${newZoom}%`, { duration: 1000 });
    },
  });

  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [dragElement, setDragElement] = useState<DrawingElement | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [currentShape, setCurrentShape] = useState<DrawingElement | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [isDrawingTerrain, setIsDrawingTerrain] = useState(false);
  const [currentTerrainPath, setCurrentTerrainPath] = useState<{ x: number; y: number }[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeElement, setResizeElement] = useState<DrawingElement | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [originalElementBounds, setOriginalElementBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  // Selection area states
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [selectionArea, setSelectionArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showSelectionTool, setShowSelectionTool] = useState(false);
  
  // Performance optimization states
  const [isDragOptimized, setIsDragOptimized] = useState(false);
  const dragAnimationFrame = useRef<number | null>(null);
  const lastDragUpdate = useRef<number>(0);
  const pendingDragUpdate = useRef<{ elementId: number; x: number; y: number } | null>(null);
  const panAnimationFrame = useRef<number | null>(null);
  const lastPanUpdate = useRef<number>(0);
  const pendingPanUpdate = useRef<{ x: number; y: number } | null>(null);

  // World-to-pixel conversion constants (responsive and based on canvas real size)
  // Use the smaller dimension to ensure consistent scaling

  const PIXELS_PER_METER = useMemo(() => calculatePixelsPerMeter(
    canvasDimensions,
    canvasRealSize
  ), [canvasDimensions, canvasRealSize]);
  const GRID_SIZE_METERS = 2; // Each grid square = 2m x 2m
  const GRID_SIZE_PIXELS = GRID_SIZE_METERS * PIXELS_PER_METER;
  
  // Dynamic grid calculations based on actual canvas size
  const MAX_HORIZONTAL_GRIDS = useMemo(() => {
    const canvasWidth = (canvasSize?.width || canvasRealSize.width);
    const gridCount = Math.floor(canvasWidth / GRID_SIZE_METERS);
    // Ensure we have a reasonable maximum (prevent infinite grids)
    return Math.max(1, Math.min(gridCount, 200)); // Cap at 200 grids maximum
  }, [canvasSize, canvasRealSize, GRID_SIZE_METERS]);
  
  const MAX_VERTICAL_GRIDS = useMemo(() => {
    const canvasHeight = (canvasSize?.height || canvasRealSize.height);
    const gridCount = Math.floor(canvasHeight / GRID_SIZE_METERS);
    // Ensure we have a reasonable maximum (prevent infinite grids)
    return Math.max(1, Math.min(gridCount, 200)); // Cap at 200 grids maximum
  }, [canvasSize, canvasRealSize, GRID_SIZE_METERS]);

  // Utility functions for world-to-pixel conversion
  const metersToPixels = useCallback((meters: number) => meters * PIXELS_PER_METER, [PIXELS_PER_METER]);
  const pixelsToMeters = useCallback((pixels: number) => pixels / PIXELS_PER_METER, [PIXELS_PER_METER]);

  // Enhanced element selection with better hit detection
  const findElementAtPosition = useCallback((x: number, y: number) => {
    const scaleFactor = 1.5; // Increase scale factor for better selection size
    const minClickableSize = 20;
    const maxClickableSize = 150;
    
    // Find elements in reverse order (top to bottom in z-index)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      
      if (element.type === 'plant') {
        const realWorldSize = parseSpacingToMeters(element.plant?.spacing || '1x1m');
        const plantSize = {
          width: realWorldSize.width * PIXELS_PER_METER,
          height: realWorldSize.height * PIXELS_PER_METER
        };
        
        // Adaptive clickable area based on zoom level
        const zoomAdjustedScaleFactor = scaleFactor + (100 / zoom) * 0.5; // Larger hitbox at lower zoom
        
        const clickableSize = {
          width: Math.max(minClickableSize, Math.min(maxClickableSize, plantSize.width * zoomAdjustedScaleFactor)),
          height: Math.max(minClickableSize, Math.min(maxClickableSize, plantSize.height * zoomAdjustedScaleFactor))
        };
        
        const left = element.x - clickableSize.width / 2;
        const right = element.x + clickableSize.width / 2;
        const top = element.y - clickableSize.height / 2;
        const bottom = element.y + clickableSize.height / 2;
        
        if (x >= left && x <= right && y >= top && y <= bottom) {
          return element;
        }
      } else if (element.type === 'terrain') {
        if (element.pathPoints && element.pathPoints.length > 1) {
          // Check if point is near the path
          const strokeWidth = element.brushThickness || 8;
          const threshold = strokeWidth / 2 + 5; // Add some padding for easier selection
          
          for (let j = 0; j < element.pathPoints.length - 1; j++) {
            const p1 = element.pathPoints[j];
            const p2 = element.pathPoints[j + 1];
            
            // Calculate distance from point to line segment
            const A = x - p1.x;
            const B = y - p1.y;
            const C = p2.x - p1.x;
            const D = p2.y - p1.y;
            
            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;
            if (lenSq !== 0) param = dot / lenSq;
            
            let xx, yy;
            if (param < 0) {
              xx = p1.x;
              yy = p1.y;
            } else if (param > 1) {
              xx = p2.x;
              yy = p2.y;
            } else {
              xx = p1.x + param * C;
              yy = p1.y + param * D;
            }
            
            const dx = x - xx;
            const dy = y - yy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= threshold) {
              return element;
            }
          }
        } else {
          // Area-based terrain
          const terrainWidth = element.width || 40;
          const terrainHeight = element.height || 40;
          
          // Adaptive clickable area for terrain based on zoom level
          const zoomAdjustedScaleFactor = scaleFactor + (100 / zoom) * 0.5;
          
          const clickableWidth = Math.max(minClickableSize, Math.min(maxClickableSize, terrainWidth * zoomAdjustedScaleFactor));
          const clickableHeight = Math.max(minClickableSize, Math.min(maxClickableSize, terrainHeight * zoomAdjustedScaleFactor));
          
          const left = element.x - (clickableWidth - terrainWidth) / 2;
          const right = left + clickableWidth;
          const top = element.y - (clickableHeight - terrainHeight) / 2;
          const bottom = top + clickableHeight;
          
          if (element.brushType === 'circle') {
            const centerX = left + clickableWidth / 2;
            const centerY = top + clickableHeight / 2;
            const radius = Math.min(clickableWidth, clickableHeight) / 2;
            const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            if (distance <= radius) return element;
          } else {
            if (x >= left && x <= right && y >= top && y <= bottom) {
              return element;
            }
          }
        }
      } else if (element.type === 'rectangle') {
        if (x >= element.x && x <= element.x + (element.width || 0) &&
            y >= element.y && y <= element.y + (element.height || 0)) {
          return element;
        }
      } else if (element.type === 'circle') {
        const centerX = element.x + (element.radius || 0);
        const centerY = element.y + (element.radius || 0);
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        if (distance <= (element.radius || 0)) {
          return element;
        }
      }
    }
    return null;
  }, [elements, PIXELS_PER_METER, zoom]);

  const { getMousePosition, snapToGrid } = useCanvasEvents();
  
  // Optimized panning function using requestAnimationFrame
  const schedulePanUpdate = useCallback((x: number, y: number) => {
    pendingPanUpdate.current = { x, y };
    
    if (panAnimationFrame.current) {
      return; // Update already scheduled
    }
    
    panAnimationFrame.current = requestAnimationFrame(() => {
      const now = performance.now();
      const timeSinceLastUpdate = now - lastPanUpdate.current;
      
      // Throttle updates to max 60fps (16.67ms)
      if (timeSinceLastUpdate >= 16.67 && pendingPanUpdate.current) {
        const { x, y } = pendingPanUpdate.current;
        setPanOffset({ x, y });
        lastPanUpdate.current = now;
        pendingPanUpdate.current = null;
      }
      
      panAnimationFrame.current = null;
    });
  }, [setPanOffset]);

  // Optimized drag update function using requestAnimationFrame
  const scheduleDragUpdate = useCallback((elementId: number, x: number, y: number) => {
    console.log('Scheduling drag update for element:', elementId, 'to position:', { x, y });
    pendingDragUpdate.current = { elementId, x, y };
    
    if (dragAnimationFrame.current) {
      return; // Update already scheduled
    }
    
    dragAnimationFrame.current = requestAnimationFrame(() => {
      const now = performance.now();
      const timeSinceLastUpdate = now - lastDragUpdate.current;
      
      // Throttle updates to max 60fps (16.67ms)
      if (timeSinceLastUpdate >= 16.67 && pendingDragUpdate.current) {
        const { elementId, x, y } = pendingDragUpdate.current;
        console.log('Applying drag update for element:', elementId, 'to position:', { x, y });
        
        const updatedElements = elements.map(el => {
          if (el.id === elementId) {
            // Handle terrain brush elements with path points
            if (el.type === 'terrain' && el.pathPoints && el.pathPoints.length > 0) {
              const deltaX = x - el.x;
              const deltaY = y - el.y;
              
              // Move all path points along with the element
              const updatedPathPoints = el.pathPoints.map(point => ({
                x: point.x + deltaX,
                y: point.y + deltaY
              }));
              
              return { ...el, x, y, pathPoints: updatedPathPoints };
            }
            // Regular element update
            return { ...el, x, y };
          }
          return el;
        });
        
        elementsActions.set(updatedElements);
        lastDragUpdate.current = now;
        pendingDragUpdate.current = null;
      }
      
      dragAnimationFrame.current = null;
    });
  }, [elements, elementsActions]);
  
  // Enhanced export function for selected area
  const exportSelectionAsPNG = useCallback(async () => {
    if (!selectionArea || !canvasRef.current) {
      toast.error("Nenhuma área selecionada para exportar!");
      return;
    }

    const canvasElement = canvasRef.current.querySelector('[data-canvas="true"]') as HTMLElement;
    if (!canvasElement) {
      toast.error("Área do canvas não encontrada!");
      return;
    }

    await exportCanvasArea(canvasElement, selectionArea, {
      quality: 0.9,
      format: 'png',
      filename: `area-selecionada-${Date.now()}`,
      backgroundColor: '#f9fafb'
    });
  }, [selectionArea]);
  // Export full canvas
  const exportFullCanvas = useCallback(async () => {
    const canvasElement = canvasRef.current?.querySelector('[data-canvas="true"]') as HTMLElement;
    if (!canvasElement) {
      toast.error("Área do canvas não encontrada!");
      return;
    }

    try {
      toast.info('Preparando exportação do canvas...', { duration: 2000 });
      
      const { default: html2canvas } = await import('html2canvas');
      
      const canvas = await html2canvas(canvasElement, {
        backgroundColor: '#f9fafb',
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true,
        removeContainer: true,
        ignoreElements: (element) => {
          return element.classList.contains('ignore-export') ||
                 element.tagName === 'SCRIPT' ||
                 element.tagName === 'STYLE';
        }
      });
      
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Erro ao gerar imagem');
          return;
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `canvas-completo-${Date.now()}.png`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        toast.success('Canvas exportado com sucesso!', {
          description: `Arquivo salvo como canvas-completo-${Date.now()}.png`
        });
      }, 'image/png', 0.9);
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar canvas');
    }
  }, []);

  // Export selected elements
  const exportSelectedElementsAsPNG = useCallback(async () => {
    const selectedElements = elements.filter(el => el.selected);
    if (selectedElements.length === 0) {
      toast.error("Nenhum elemento selecionado para exportar!");
      return;
    }

    const canvasElement = canvasRef.current?.querySelector('[data-canvas="true"]') as HTMLElement;
    if (!canvasElement) {
      toast.error("Área do canvas não encontrada!");
      return;
    }

    await exportSelectedElements(selectedElements, canvasElement, {
      quality: 0.9,
      format: 'png',
      filename: `elementos-selecionados-${Date.now()}`,
      backgroundColor: '#f9fafb'
    });
  }, [elements]);

  // Expose export functions to parent component
  useImperativeHandle(ref, () => ({
    exportFullCanvas,
    exportSelectionAsPNG,
    exportSelectedElementsAsPNG
  }), [exportFullCanvas, exportSelectionAsPNG, exportSelectedElementsAsPNG]);
  
  // Center selection area in canvas
  const centerSelectionArea = useCallback(() => {
    if (selectionArea && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const centerX = (canvasRect.width / 2) - (selectionArea.width / 2);
      const centerY = (canvasRect.height / 2) - (selectionArea.height / 2);
      
      setPanOffset({ x: centerX, y: centerY });
      toast.info("Área selecionada centralizada");
    }
  }, [selectionArea, setPanOffset]);
  
  // Clear selection area
  const clearSelectionArea = useCallback(() => {
    setSelectionArea(null);
    setIsSelecting(false);
    toast.info("Seleção removida");
  }, []);
  
  // Parse terrain size string to get dimensions in meters
  const parseTerrainSize = useCallback((sizeString: string) => {
    if (sizeString === "Variável") {
      return { width: 1, height: 1 }; // Default 1x1m for variable size
    }
    
    const match = sizeString.match(/(\d+)x(\d+)m/);
    if (match) {
      return { width: parseInt(match[1]), height: parseInt(match[2]) };
    }
    
    // Handle single dimension (like "2x2m")
    const singleMatch = sizeString.match(/(\d+)m/);
    if (singleMatch) {
      const size = parseInt(singleMatch[1]);
      return { width: size, height: size };
    }
    
    // Default fallback
    return { width: 1, height: 1 };
  }, []);

  const detectResizeHandle = useCallback((pos: { x: number; y: number }, element: DrawingElement): string | null => {
    if (!element.selected) return null;

    const handleSize = 8; // Size of resize handles
    
    // For plants
    if (element.type === 'plant') {
      const realWorldSize = parseSpacingToMeters(element.plant?.spacing || '1x1m');
      const plantSize = {
        width: realWorldSize.width * PIXELS_PER_METER,
        height: realWorldSize.height * PIXELS_PER_METER
      };
      
      const left = element.x - plantSize.width / 2;
      const top = element.y - plantSize.height / 2;
      const right = left + plantSize.width;
      const bottom = top + plantSize.height;
      
      // Check each handle
      if (Math.abs(pos.x - left) <= handleSize && Math.abs(pos.y - top) <= handleSize) return 'nw';
      if (Math.abs(pos.x - right) <= handleSize && Math.abs(pos.y - top) <= handleSize) return 'ne';
      if (Math.abs(pos.x - left) <= handleSize && Math.abs(pos.y - bottom) <= handleSize) return 'sw';
      if (Math.abs(pos.x - right) <= handleSize && Math.abs(pos.y - bottom) <= handleSize) return 'se';
    } 
    // For terrain with path points (brush/trail elements)
    else if (element.type === 'terrain' && element.pathPoints && element.pathPoints.length > 0) {
      // Calculate bounding box of path points
      const xs = element.pathPoints.map(p => p.x);
      const ys = element.pathPoints.map(p => p.y);
      const left = Math.min(...xs);
      const right = Math.max(...xs);
      const top = Math.min(...ys);
      const bottom = Math.max(...ys);
      
      // Check resize handles around the bounding box
      if (Math.abs(pos.x - left) <= handleSize && Math.abs(pos.y - top) <= handleSize) return 'nw';
      if (Math.abs(pos.x - right) <= handleSize && Math.abs(pos.y - top) <= handleSize) return 'ne';
      if (Math.abs(pos.x - left) <= handleSize && Math.abs(pos.y - bottom) <= handleSize) return 'sw';
      if (Math.abs(pos.x - right) <= handleSize && Math.abs(pos.y - bottom) <= handleSize) return 'se';
    }
    // For rectangles and terrain rectangles
    else if (element.type === 'rectangle' || (element.type === 'terrain' && element.brushType !== 'circle' && !element.pathPoints)) {
      const left = element.x;
      const top = element.y;
      const right = left + (element.width || 0);
      const bottom = top + (element.height || 0);
      
      if (Math.abs(pos.x - left) <= handleSize && Math.abs(pos.y - top) <= handleSize) return 'nw';
      if (Math.abs(pos.x - right) <= handleSize && Math.abs(pos.y - top) <= handleSize) return 'ne';
      if (Math.abs(pos.x - left) <= handleSize && Math.abs(pos.y - bottom) <= handleSize) return 'sw';
      if (Math.abs(pos.x - right) <= handleSize && Math.abs(pos.y - bottom) <= handleSize) return 'se';
    }
    // For circles
    else if (element.type === 'circle' || (element.type === 'terrain' && element.brushType === 'circle')) {
      const radius = element.radius || 0;
      const left = element.x;
      const top = element.y;
      const right = left + radius * 2;
      const bottom = top + radius * 2;
      
      if (Math.abs(pos.x - left) <= handleSize && Math.abs(pos.y - top) <= handleSize) return 'nw';
      if (Math.abs(pos.x - right) <= handleSize && Math.abs(pos.y - top) <= handleSize) return 'ne';
      if (Math.abs(pos.x - left) <= handleSize && Math.abs(pos.y - bottom) <= handleSize) return 'sw';
      if (Math.abs(pos.x - right) <= handleSize && Math.abs(pos.y - bottom) <= handleSize) return 'se';
    }
    
    return null;
  }, [PIXELS_PER_METER]);

  const selectElement = useCallback((elementId: number) => {
    const updatedElements = elements.map(el => ({
      ...el,
      selected: el.id === elementId
    }));
    elementsActions.set(updatedElements);
  }, [elements, elementsActions]);

  // Auto-select when clicking on any element
  const handleElementClick = useCallback((elementId: number) => {
    // Switch to select tool automatically
    if (selectedTool !== 'select') {
      onToolChange('select');
    }
    selectElement(elementId);
  }, [selectedTool, onToolChange, selectElement]);

  const clearSelection = useCallback(() => {
    const updatedElements = elements.map(el => ({ ...el, selected: false }));
    elementsActions.set(updatedElements);
  }, [elements, elementsActions]);

  const copySelectedElements = useCallback(() => {
    const selectedElements = elements.filter(el => el.selected);
    if (selectedElements.length > 0) {
      const copiedElements = selectedElements.map(el => ({
        ...el,
        id: Date.now() + Math.random(),
        x: el.x + 50, // Offset copies slightly
        y: el.y + 50,
        selected: false
      }));
      elementsActions.set([...elements, ...copiedElements]);
      clearSelection();
      toast.success(`${selectedElements.length} elemento(s) copiado(s)`);
    } else {
      toast.error("Selecione elementos para copiar");
    }
  }, [elements, elementsActions, clearSelection]);

  const rotateSelectedElements = useCallback(() => {
    const selectedElements = elements.filter(el => el.selected);
    if (selectedElements.length > 0) {
      const updatedElements = elements.map(el => 
        el.selected 
          ? { ...el, rotation: (el.rotation || 0) + 90 }
          : el
      );
      elementsActions.set(updatedElements);
      toast.success(`${selectedElements.length} elemento(s) rotacionado(s)`);
    } else {
      toast.error("Selecione elementos para rotacionar");
    }
  }, [elements, elementsActions]);

  const deleteSelectedElements = useCallback(() => {
    const selectedCount = elements.filter(el => el.selected).length;
    if (selectedCount > 0) {
      const filteredElements = elements.filter(el => !el.selected);
      elementsActions.set(filteredElements);
      toast.success(`${selectedCount} elemento(s) removido(s)`);
    }
  }, [elements, elementsActions]);

  const deleteElementAtPosition = useCallback((pos: { x: number; y: number }) => {
    const clickedElement = findElementAtPosition(pos, elements);
    if (clickedElement) {
      const filteredElements = elements.filter(el => el.id !== clickedElement.id);
      elementsActions.set(filteredElements);
      toast.success("Elemento removido");
      return true;
    }
    return false;
  }, [elements, elementsActions, findElementAtPosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // Calculate mouse position relative to the canvas viewport
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Convert to world coordinates (account for pan and zoom)
    const worldX = (canvasX - panOffset.x) / (zoom / 100);
    const worldY = (canvasY - panOffset.y) / (zoom / 100);
    
    const rawPos = { x: worldX, y: worldY };
    const pos = snapToGrid(rawPos, showGrid);
    
    console.log('Mouse down at:', pos, 'Elements count:', elements.length);
    
    // Handle panning with space key
    if (isSpacePressed) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handle selection tool
    if (selectedTool === 'selectArea') {
      setIsSelecting(true);
      setSelectionStart(pos);
      setSelectionEnd(pos);
      setSelectionArea({ x: pos.x, y: pos.y, width: 0, height: 0 });
      return;
    }
    
    // Handle delete tool
    if (selectedTool === 'delete') {
      deleteElementAtPosition(pos);
      return;
    }

    // Check if clicking on an existing element for selection or interaction
    const clickedElement = findElementAtPosition(pos.x, pos.y);
    console.log('Clicked element:', clickedElement ? `ID: ${clickedElement.id}, Type: ${clickedElement.type}` : 'none');
    
    if (clickedElement && selectedTool !== 'delete') {
      // Check if clicking on a resize handle first
      const handle = detectResizeHandle(pos, clickedElement);
      
      if (handle && clickedElement.selected) {
        // Start resizing
        setIsResizing(true);
        setResizeHandle(handle);
        setResizeElement(clickedElement);
        setResizeStartPos(pos);
        
        // Store original bounds for calculation
        if (clickedElement.type === 'plant') {
          const realWorldSize = parseSpacingToMeters(clickedElement.plant?.spacing || '1x1m');
          const plantSize = {
            width: realWorldSize.width * PIXELS_PER_METER,
            height: realWorldSize.height * PIXELS_PER_METER
          };
          setOriginalElementBounds({
            x: clickedElement.x - plantSize.width / 2,
            y: clickedElement.y - plantSize.height / 2,
            width: plantSize.width,
            height: plantSize.height
          });
        } else if (clickedElement.type === 'terrain' && clickedElement.pathPoints && clickedElement.pathPoints.length > 0) {
          // For terrain path elements, calculate bounding box from path points
          const xs = clickedElement.pathPoints.map(p => p.x);
          const ys = clickedElement.pathPoints.map(p => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          
          setOriginalElementBounds({
            x: minX,
            y: minY,
            width: maxX - minX || 10,
            height: maxY - minY || 10
          });
        } else {
          setOriginalElementBounds({
            x: clickedElement.x,
            y: clickedElement.y,
            width: clickedElement.width || 0,
            height: clickedElement.height || 0
          });
        }
        return;
      }
      
      // Element selection and dragging for any tool (except delete)
      console.log('Selecting and starting drag for element:', clickedElement.id);
      console.log('Element position:', { x: clickedElement.x, y: clickedElement.y });
      console.log('Click position:', pos);
      
      // Select the element
      selectElement(clickedElement.id);
      
      // Start dragging
      console.log('Setting isDragging to true');
      setIsDragging(true);
      setDragElement(clickedElement);
      const offset = {
        x: pos.x - clickedElement.x,
        y: pos.y - clickedElement.y
      };
      console.log('Setting drag offset:', offset);
      setDragOffset(offset);
      
      // Switch to select tool if not already selected and not placing elements
      if (selectedTool !== 'select' && !selectedPlant && !selectedTerrain) {
        onToolChange('select');
      }
      
      return;
    }

    // Clear selection if clicking empty space with select tool
    if (selectedTool === 'select') {
      clearSelection();
      return;
    }

    // Add plant
    if (selectedPlant && (selectedTool === 'select' || !selectedTool)) {
      const newElement: DrawingElement = {
        id: Date.now() + Math.random(), // Better unique ID generation
        type: 'plant',
        x: pos.x,
        y: pos.y,
        plant: selectedPlant,
      };
      
      // Add to existing elements instead of replacing
      elementsActions.set([...elements, newElement]);
      toast.success(`${selectedPlant.name} adicionada ao mapa!`);
      return;
    }

    // Add terrain element with brush system
    if (selectedTerrain && selectedTool === 'terrain') {
      const terrainSize = parseTerrainSize(selectedTerrain.size);
      const brushMode = selectedTerrain.selectedBrushMode || 'rectangle';
      const brushThickness = selectedTerrain.brushThickness || 20;
      
      if (brushMode === 'brush') {
        // For brush mode, start freehand drawing
        setIsDrawingTerrain(true);
        setCurrentTerrainPath([pos]);
        return;
      } else if (brushMode === 'path' || selectedTerrain.brushType === 'path') {
        // For path terrain, create immediately as single click creates a simple path
        const pathLength = terrainSize.width > 1 ? terrainSize.width : 5; // Default path length
        const pathPoints = [
          pos,
          { x: pos.x + metersToPixels(pathLength), y: pos.y }
        ];
        
        const newTerrain: DrawingElement = {
          id: Date.now(),
          type: 'terrain',
          x: pos.x,
          y: pos.y,
          pathPoints: pathPoints,
          terrain: selectedTerrain,
          brushType: 'path',
          texture: selectedTerrain.texture,
          realWorldWidth: brushThickness / 10, // Convert to meters
          realWorldHeight: pathLength,
        };
        
        elementsActions.set([...elements, newTerrain]);
        onTerrainUsed();
        toast.success(`${selectedTerrain.name} (caminho) adicionado ao mapa!`);
        return;
      } else {
        // Start drawing rectangle or circle terrain
        setIsDrawing(true);
        setStartPos(pos);
        
        const terrainWidthPixels = metersToPixels(terrainSize.width);
        const terrainHeightPixels = metersToPixels(terrainSize.height);
        
        const newTerrain: DrawingElement = {
          id: Date.now() + Math.random(),
          type: 'terrain',
          x: pos.x,
          y: pos.y,
          width: brushMode === 'circle' ? terrainWidthPixels : terrainWidthPixels,
          height: brushMode === 'circle' ? terrainHeightPixels : terrainHeightPixels,
          radius: brushMode === 'circle' ? Math.min(terrainWidthPixels, terrainHeightPixels) / 2 : undefined,
          realWorldWidth: terrainSize.width,
          realWorldHeight: terrainSize.height,
          terrain: selectedTerrain,
          brushType: brushMode as 'rectangle' | 'circle',
          texture: selectedTerrain.texture,
        };
        
        setCurrentShape(newTerrain);
        return;
      }
    }

    // Start drawing shapes
    if (selectedTool === 'rectangle' || selectedTool === 'circle') {
      setIsDrawing(true);
      setStartPos(pos);
      
      const newShape: DrawingElement = {
        id: Date.now(),
        type: selectedTool as 'rectangle' | 'circle',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        radius: 0,
      };
      
      setCurrentShape(newShape);
    }
  }, [selectedTool, selectedPlant, selectedTerrain, elements, snapToGrid, selectElement, clearSelection, onTerrainUsed, deleteElementAtPosition, findElementAtPosition, zoom, showGrid, isSpacePressed, panOffset, metersToPixels, parseTerrainSize, elementsActions, PIXELS_PER_METER, detectResizeHandle, onToolChange]);

const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Calculate mouse position relative to the canvas viewport
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Convert to world coordinates (account for pan and zoom)
    const worldX = (canvasX - panOffset.x) / (zoom / 100);
    const worldY = (canvasY - panOffset.y) / (zoom / 100);
    
    const rawPos = { x: worldX, y: worldY };
    const pos = snapToGrid(rawPos, showGrid);

    // Handle panning with optimized performance
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      const newOffset = {
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY
      };
      schedulePanUpdate(newOffset.x, newOffset.y);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handle selection area
    if (isSelecting && selectionArea) {
      const newSelectionEnd = pos;
      setSelectionEnd(newSelectionEnd);

      const newSelectionArea = {
        x: Math.min(selectionStart.x, newSelectionEnd.x),
        y: Math.min(selectionStart.y, newSelectionEnd.y),
        width: Math.abs(newSelectionEnd.x - selectionStart.x),
        height: Math.abs(newSelectionEnd.y - selectionStart.y),
      };

      setSelectionArea(newSelectionArea);
      return;
    }

    // Handle resizing elements
    if (isResizing && resizeElement && resizeHandle) {
      const deltaX = pos.x - resizeStartPos.x;
      const deltaY = pos.y - resizeStartPos.y;
      
      const newBounds = { ...originalElementBounds };
      
      // Calculate new bounds based on resize handle
      switch (resizeHandle) {
        case 'nw':
          newBounds.x = originalElementBounds.x + deltaX;
          newBounds.y = originalElementBounds.y + deltaY;
          newBounds.width = originalElementBounds.width - deltaX;
          newBounds.height = originalElementBounds.height - deltaY;
          break;
        case 'ne':
          newBounds.y = originalElementBounds.y + deltaY;
          newBounds.width = originalElementBounds.width + deltaX;
          newBounds.height = originalElementBounds.height - deltaY;
          break;
        case 'sw':
          newBounds.x = originalElementBounds.x + deltaX;
          newBounds.width = originalElementBounds.width - deltaX;
          newBounds.height = originalElementBounds.height + deltaY;
          break;
        case 'se':
          newBounds.width = originalElementBounds.width + deltaX;
          newBounds.height = originalElementBounds.height + deltaY;
          break;
      }
      
      // Ensure minimum size
      const minSize = 20;
      newBounds.width = Math.max(newBounds.width, minSize);
      newBounds.height = Math.max(newBounds.height, minSize);
      
      // Update the element
      const updatedElements = elements.map(el => {
        if (el.id === resizeElement.id) {
          if (el.type === 'plant') {
            // For plants, update the center position and scale the spacing
            const newCenterX = newBounds.x + newBounds.width / 2;
            const newCenterY = newBounds.y + newBounds.height / 2;
            return { ...el, x: newCenterX, y: newCenterY };
          } else if (el.type === 'terrain' && el.pathPoints && el.pathPoints.length > 0) {
            // For terrain brush elements with path points
            const originalBounds = originalElementBounds;
            const scaleX = newBounds.width / originalBounds.width;
            const scaleY = newBounds.height / originalBounds.height;
            
            // Scale and translate all path points
            const updatedPathPoints = el.pathPoints.map(point => ({
              x: newBounds.x + (point.x - originalBounds.x) * scaleX,
              y: newBounds.y + (point.y - originalBounds.y) * scaleY
            }));
            
            return {
              ...el,
              x: newBounds.x,
              y: newBounds.y,
              pathPoints: updatedPathPoints,
              brushThickness: Math.max(2, (el.brushThickness || 8) * Math.min(scaleX, scaleY))
            };
          } else if (el.type === 'circle' || (el.type === 'terrain' && el.brushType === 'circle')) {
            // For circles, update radius
            const newRadius = Math.min(newBounds.width, newBounds.height) / 2;
            return {
              ...el,
              x: newBounds.x,
              y: newBounds.y,
              radius: newRadius,
              width: newRadius * 2,
              height: newRadius * 2
            };
          } else {
            // For rectangles and other terrain elements
            return {
              ...el,
              x: newBounds.x,
              y: newBounds.y,
              width: newBounds.width,
              height: newBounds.height
            };
          }
        }
        return el;
      });
      elementsActions.set(updatedElements);
      return;
    }

    // Handle dragging elements with optimized performance
    if (isDragging && dragElement) {
      console.log('Dragging element:', dragElement.id, 'isDragging:', isDragging);
      const newPos = snapToGrid({
        x: pos.x - dragOffset.x,
        y: pos.y - dragOffset.y
      }, showGrid);
      
      console.log('New position calculated:', newPos, 'Original pos:', pos, 'Drag offset:', dragOffset);
      
      // Use optimized drag update for better performance
      scheduleDragUpdate(dragElement.id, newPos.x, newPos.y);
      return;
    }

    // Handle drawing terrain paths (trails, streams) and freehand brush
    if (isDrawingTerrain && selectedTerrain) {
      const brushThickness = selectedTerrain.brushThickness || 20;
      
      // Add point to current path with some distance threshold to avoid too many points
      if (currentTerrainPath.length === 0 || 
          Math.sqrt(Math.pow(pos.x - currentTerrainPath[currentTerrainPath.length - 1].x, 2) + 
                   Math.pow(pos.y - currentTerrainPath[currentTerrainPath.length - 1].y, 2)) > 5) {
        setCurrentTerrainPath(prev => [...prev, pos]);
      }
      return;
    }

    // Handle drawing new shapes (rectangles, circles, terrain areas)
    if (!isDrawing || !currentShape) return;

    const width = Math.abs(pos.x - startPos.x);
    const height = Math.abs(pos.y - startPos.y);
    
    if (currentShape.brushType === 'circle' || currentShape.type === 'circle') {
      const radius = Math.min(width, height) / 2;
      const centerX = (startPos.x + pos.x) / 2;
      const centerY = (startPos.y + pos.y) / 2;
      const updatedShape: DrawingElement = {
        ...currentShape,
        x: centerX - radius,
        y: centerY - radius,
        radius: radius,
        width: radius * 2,
        height: radius * 2,
      };
      setCurrentShape(updatedShape);
    } else {
      const updatedShape: DrawingElement = {
        ...currentShape,
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: width,
        height: height,
      };
      setCurrentShape(updatedShape);
    }
  }, [isDragging, dragElement, dragOffset, isDrawing, currentShape, startPos, snapToGrid, zoom, showGrid, isPanning, lastPanPoint, panOffset, isDrawingTerrain, selectedTerrain, elements, elementsActions, isSelecting, selectionStart, selectionArea, isResizing, resizeElement, resizeHandle, resizeStartPos, originalElementBounds, currentTerrainPath, scheduleDragUpdate, schedulePanUpdate]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      // Cancel any pending pan updates
      if (panAnimationFrame.current) {
        cancelAnimationFrame(panAnimationFrame.current);
        panAnimationFrame.current = null;
      }
      
      // Apply final pending update if any
      if (pendingPanUpdate.current) {
        const { x, y } = pendingPanUpdate.current;
        setPanOffset({ x, y });
        pendingPanUpdate.current = null;
      }
      
      setIsPanning(false);
    }

    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setResizeElement(null);
      setResizeStartPos({ x: 0, y: 0 });
      setOriginalElementBounds({ x: 0, y: 0, width: 0, height: 0 });
    }

    if (isSelecting) {
      setIsSelecting(false);
      if (selectionArea) {
        toast.success('Área selecionada: ' + JSON.stringify(selectionArea));
      }
    }

    if (isDragging) {
      // Cancel any pending drag updates
      if (dragAnimationFrame.current) {
        cancelAnimationFrame(dragAnimationFrame.current);
        dragAnimationFrame.current = null;
      }
      
      // Apply final pending update if any
      if (pendingDragUpdate.current) {
        const { elementId, x, y } = pendingDragUpdate.current;
        const updatedElements = elements.map(el =>
          el.id === elementId ? { ...el, x, y } : el
        );
        elementsActions.set(updatedElements);
        pendingDragUpdate.current = null;
      }
      
      setIsDragging(false);
      setDragElement(null);
      setDragOffset({ x: 0, y: 0 });
    }

    // Finish drawing terrain path or freehand brush
    if (isDrawingTerrain && currentTerrainPath.length > 1 && selectedTerrain) {
      const brushThickness = selectedTerrain.brushThickness || 20;
      
      const newTerrain: DrawingElement = {
        id: Date.now(),
        type: 'terrain',
        x: currentTerrainPath[0].x,
        y: currentTerrainPath[0].y,
        pathPoints: currentTerrainPath,
        terrain: selectedTerrain,
        brushType: 'path',
        texture: selectedTerrain.texture,
        realWorldWidth: brushThickness / 10, // Convert to meters
        realWorldHeight: currentTerrainPath.length / 10, // Approximate length
        brushThickness: brushThickness,
      };
      
      elementsActions.set([...elements, newTerrain]);
      onTerrainUsed();
      setIsDrawingTerrain(false);
      setCurrentTerrainPath([]);
      
      const brushMode = selectedTerrain.selectedBrushMode || 'brush';
      toast.success(`${selectedTerrain.name} (${brushMode === 'brush' ? 'pincel' : 'trilha'}) adicionado ao mapa!`);
    }

    // Finish drawing terrain area
    if (isDrawing && currentShape) {
      const minSize = 10;
      const isValidSize = (currentShape.width && currentShape.width > minSize) ||
                         (currentShape.radius && currentShape.radius > minSize);
      
      if (isValidSize) {
        elementsActions.set([...elements, currentShape]);
        
        if (currentShape.type === 'terrain') {
          onTerrainUsed();
          const realArea = (currentShape.realWorldWidth || 1) * (currentShape.realWorldHeight || 1);
          toast.success(`${currentShape.terrain?.name} adicionado! (${realArea}m²)`);
        } else {
          toast.success(`${currentShape.type === 'rectangle' ? 'Retângulo' : 'Círculo'} criado!`);
        }
      }
      setCurrentShape(null);
    }
    
    setIsDrawing(false);
  }, [isDragging, isDrawing, currentShape, isPanning, isDrawingTerrain, currentTerrainPath, selectedTerrain, onTerrainUsed, elements, elementsActions, isResizing, isSelecting, selectionArea, setPanOffset]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;

    try {
      const plantData = JSON.parse(data);
      const rawPos = getMousePosition(e, canvasRef, zoom, panOffset);
      const pos = snapToGrid(rawPos, showGrid);
      
      const newElement: DrawingElement = {
        id: Date.now() + Math.random(),
        type: 'plant',
        x: pos.x,
        y: pos.y,
        plant: plantData,
      };
      
      elementsActions.set([...elements, newElement]);
      toast.success(`${plantData.name} adicionada via drag & drop!`);
    } catch (error) {
      console.error('Error parsing dropped data:', error);
    }
  }, [getMousePosition, snapToGrid, zoom, showGrid, panOffset, elements, elementsActions]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Touch events for mobile pan/zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPanning(true);
      const touch = e.touches[0];
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPanning) {
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastPanPoint.x;
      const deltaY = touch.clientY - lastPanPoint.y;
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
    }
  }, [isPanning, lastPanPoint, setPanOffset]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);
  
  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      // Get mouse position relative to canvas
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate zoom with much slower speed
      const delta = e.deltaY * -0.001; // Made 10x slower
      const newZoom = Math.max(10, Math.min(400, zoom + delta * 2)); // Reduced multiplier
      
      if (newZoom !== zoom) {
        // Calculate the world position under the mouse before and after zoom
        const worldXBefore = (mouseX - panOffset.x) / (zoom / 100);
        const worldYBefore = (mouseY - panOffset.y) / (zoom / 100);
        
        const worldXAfter = (mouseX - panOffset.x) / (newZoom / 100);
        const worldYAfter = (mouseY - panOffset.y) / (newZoom / 100);
        
        // Adjust pan to keep the same world position under the mouse
        setPanOffset({
          x: panOffset.x + (worldXAfter - worldXBefore) * (newZoom / 100),
          y: panOffset.y + (worldYAfter - worldYBefore) * (newZoom / 100),
        });
        
        // Update zoom through the hook
        if (delta > 0) {
          zoomIn();
        } else {
          zoomOut();
        }
      }
    }
  }, [zoom, panOffset, zoomIn, zoomOut, setPanOffset]);

  // Update canvas dimensions when the container resizes
  useEffect(() => {
    const updateCanvasDimensions = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasDimensions({ width: rect.width, height: rect.height });
      }
    };
    
    updateCanvasDimensions();
    
    const resizeObserver = new ResizeObserver(updateCanvasDimensions);
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Update canvas real size when canvasSize prop changes
  useEffect(() => {
    if (canvasSize) {
      setCanvasRealSize(canvasSize);
    }
  }, [canvasSize]);
  
  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      
      // Delete/Backspace - delete selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedElements();
      }
      
      // Escape - clear selection and cancel operations
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
        setCurrentShape(null);
        setIsDrawing(false);
        setIsDragging(false);
        setIsPanning(false);
        setIsDrawingTerrain(false);
        setCurrentTerrainPath([]);
        setIsResizing(false);
        setResizeHandle(null);
        setResizeElement(null);
        onToolChange('select'); // Switch to select tool
      }
      
      // G - toggle grid
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setShowGrid(prev => {
          const newState = !prev;
          toast.success(newState ? "Grade ativada" : "Grade desativada");
          return newState;
        });
      }
      
      // S - select tool
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        onToolChange('select');
        toast.info("Ferramenta Selecionar ativada");
      }
      
      // A - select area tool
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (!(e.ctrlKey || e.metaKey)) { // Only if not Ctrl+A
          onToolChange('selectArea');
          toast.info("Ferramenta de Seleção de Área ativada");
        }
      }
      
      // R - rectangle tool
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onToolChange('rectangle');
        toast.info("Ferramenta Retângulo ativada");
      }
      
      // C - circle tool or copy
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+C - copy
          copySelectedElements();
        } else {
          // C - circle tool
          onToolChange('circle');
          toast.info("Ferramenta Círculo ativada");
        }
      }
      
      // T - terrain tool
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        onToolChange('terrain');
        toast.info("Ferramenta Terreno ativada");
      }
      
      // D - delete tool
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        onToolChange('delete');
        toast.info("Ferramenta Excluir ativada");
      }
      
      // Ctrl+A - select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const selectedElements = elements.map(el => ({ ...el, selected: true }));
        elementsActions.set(selectedElements);
        toast.success("Todos os elementos selecionados");
      }
      
      // Ctrl+Z - undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (elementsActions.canUndo) {
          elementsActions.undo();
          toast.success("Ação desfeita");
        } else {
          toast.info("Nada para desfazer");
        }
      }
      
      // Ctrl+Y or Ctrl+Shift+Z - redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (elementsActions.canRedo) {
          elementsActions.redo();
          toast.success("Ação refeita");
        } else {
          toast.info("Nada para refazer");
        }
      }
      
      // Number keys for zoom
      if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const zoomLevel = parseInt(e.key) * 25; // 1=25%, 2=50%, etc.
        if (zoomLevel >= 25 && zoomLevel <= 300) {
          zoomToFit(); // Use zoom to fit for better UX
          toast.info(`Zoom: ${zoomLevel}%`);
        }
      }
      
      // 0 - reset zoom
      if (e.key === '0' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        resetZoom();
        toast.info("Zoom resetado para 100%");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [deleteSelectedElements, clearSelection, copySelectedElements, onToolChange, elementsActions, resetZoom, zoomToFit, elements]);

  const handleReset = useCallback(() => {
    resetZoom();
    elementsActions.reset([]);
    setCurrentShape(null);
    setIsDrawing(false);
    setIsDragging(false);
    setIsPanning(false);
    clearSelection();
    toast.success("Canvas resetado");
  }, [resetZoom, elementsActions, clearSelection]);

  const getCursorStyle = () => {
    if (isSpacePressed || isPanning) return 'cursor-grab';
    if (selectedTool === 'select') return 'cursor-default';
    if (selectedTool === 'selectArea') return 'cursor-crosshair';
    if (selectedTool === 'delete') return 'cursor-pointer';
    if (selectedPlant || selectedTerrain) return 'cursor-copy';
    return 'cursor-crosshair';
  };

  return (
    <div className="w-full h-full relative bg-gray-50 dark:bg-gray-950 overflow-hidden canvas-container">
      {/* Modern Floating Controls - Top Left */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-white/95 dark:bg-gray-900/95 backdrop-blur-efficient rounded-lg p-1 shadow-sm">
        <div className="px-2 py-1">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {Math.round(-panOffset.x / (zoom / 100))}, {Math.round(-panOffset.y / (zoom / 100))}
          </div>
        </div>
      </div>
      
      {/* Modern Floating Controls - Top Right */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/95 dark:bg-gray-900/95 backdrop-blur-efficient rounded-lg p-1 shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomOut}
          disabled={!canZoomOut}
          className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
          title="Zoom Out"
        >
          <Minus className="h-4 w-4" />
        </Button>
        
        <div className="px-2 text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[2.5rem] text-center">
          {Math.round(zoom)}%
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomIn}
          disabled={!canZoomIn}
          className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
          title="Zoom In"
        >
          <Plus className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const newState = !showGrid;
            setShowGrid(newState);
            toast.success(newState ? "Grade ativada" : "Grade desativada");
          }}
          className={cn(
            "h-7 w-7 p-0 transition-colors duration-150",
            showGrid 
              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400" 
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          title="Alternar Grade (G)"
        >
          <Grid3X3 className="h-3.5 w-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={resetZoom}
          className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
          title="Resetar Visualização"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        
        {selectionArea && (
          <>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={centerSelectionArea}
              className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
              title="Centralizar Seleção"
            >
              <Target className="h-3.5 w-3.5" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={exportSelectionAsPNG}
              className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
              title="Exportar Seleção"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelectionArea}
              className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 transition-colors duration-150"
              title="Limpar Seleção"
            >
              <span className="text-sm font-bold">×</span>
            </Button>
          </>
        )}
      </div>

      {/* Canvas Area */}
      <div
        ref={canvasRef}
        className={cn(
          "w-full h-full relative overflow-hidden",
          getCursorStyle()
        )}
        style={{
          backgroundColor: showGrid ? 'transparent' : '#f9fafb',
          backgroundImage: showGrid ? `
            linear-gradient(rgba(107, 114, 128, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(107, 114, 128, 0.08) 1px, transparent 1px),
            linear-gradient(rgba(107, 114, 128, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(107, 114, 128, 0.04) 1px, transparent 1px)
          ` : 'none',
          backgroundSize: showGrid ? `
            ${GRID_SIZE_PIXELS * zoom / 100}px ${GRID_SIZE_PIXELS * zoom / 100}px,
            ${GRID_SIZE_PIXELS * zoom / 100}px ${GRID_SIZE_PIXELS * zoom / 100}px,
            ${GRID_SIZE_PIXELS * zoom / 200}px ${GRID_SIZE_PIXELS * zoom / 200}px,
            ${GRID_SIZE_PIXELS * zoom / 200}px ${GRID_SIZE_PIXELS * zoom / 200}px
          ` : 'none',
          backgroundPosition: `
            ${panOffset.x}px ${panOffset.y}px,
            ${panOffset.x}px ${panOffset.y}px,
            ${panOffset.x}px ${panOffset.y}px,
            ${panOffset.x}px ${panOffset.y}px
          `,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-canvas="true"
      >
        {/* Infinite Canvas Content Layer */}
        <div 
          className="absolute" 
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            willChange: 'transform',
          }}
        >
          {/* Modern Working Area Indicator */}
          <div 
            className="absolute border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/20 dark:bg-blue-950/20 rounded-lg pointer-events-none"
            style={{
              width: `${(canvasSize?.width || canvasRealSize.width) * PIXELS_PER_METER}px`,
              height: `${(canvasSize?.height || canvasRealSize.height) * PIXELS_PER_METER}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Clean corner indicators */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full"></div>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full"></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full"></div>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full"></div>
            
            {/* Clean working area info */}
            <div className="absolute -top-6 left-0 bg-blue-500 dark:bg-blue-600 text-white text-xs px-2 py-1 rounded font-medium">
              {(canvasSize?.width || canvasRealSize.width)} × {(canvasSize?.height || canvasRealSize.height)}m
            </div>
            
            {/* Simple center indicator */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-blue-400 dark:bg-blue-500 rounded-full"></div>
          </div>
        
        {/* Selection Area Visualization */}
        {selectionArea && (
          <div
            className="absolute border-4 border-blue-500 bg-blue-300/30 dark:bg-blue-700/30 pointer-events-none z-20"
            style={{
              left: selectionArea.x,
              top: selectionArea.y,
              width: selectionArea.width,
              height: selectionArea.height,
              boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
            }}
          >
            {/* Selection area corners */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
            
            {/* Selection info */}
            <div className="absolute -top-8 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {Math.round(selectionArea.width)} × {Math.round(selectionArea.height)} px
            </div>
          </div>
        )}
        
          {/* Canvas Elements */}
          {elements.map(element => (
            <CanvasElement key={element.id} element={element} pixelsPerMeter={PIXELS_PER_METER} />
          ))}
          
          {/* Current shape being drawn */}
          {currentShape && <CanvasElement element={currentShape} pixelsPerMeter={PIXELS_PER_METER} />}
        </div>

        {/* Welcome message for empty canvas */}
        {elements.length === 0 && !currentShape && <CanvasWelcome />}
        
        {/* Modern Scale Ruler */}
        <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-efficient rounded-lg p-2 shadow-sm z-20">
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Escala:</div>
            <div 
              className="h-0.5 bg-blue-500 rounded"
              style={{ width: `${GRID_SIZE_PIXELS * zoom / 100}px` }}
            />
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {GRID_SIZE_METERS}m
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}));

Canvas.displayName = "Canvas";

import { toast } from 'sonner';
import { DrawingElement, Plant, Terrain, Structure } from '@/types/canvasTypes';

export interface ExportData {
  version: string;
  timestamp: number;
  projectInfo: {
    name?: string;
    description?: string;
    canvasSize: { width: number; height: number };
    totalElements: number;
    categories: {
      plants: number;
      terrain: number;
      structures: number;
      shapes: number;
    };
  };
  elements: ExportElement[];
  metadata: {
    exportDate: string;
    exportedBy: string;
    coordinates: {
      system: 'meters';
      origin: { x: number; y: number };
    };
  };
}

export interface ExportElement {
  id: number;
  type: 'plant' | 'terrain' | 'structure' | 'rectangle' | 'circle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  rotation?: number;
  plant?: Plant;
  terrain?: Terrain;
  structure?: Structure;
  realWorldWidth?: number;
  realWorldHeight?: number;
  brushType?: 'rectangle' | 'circle' | 'path' | 'brush';
  texture?: string;
  pathPoints?: { x: number; y: number }[];
  selectedBrushMode?: 'rectangle' | 'circle' | 'brush';
  brushThickness?: number;
}

/**
 * Create exportable data structure from canvas elements
 */
export function createExportData(
  elements: DrawingElement[],
  canvasSize: { width: number; height: number },
  projectName?: string
): ExportData {
  const timestamp = Date.now();

  // Count elements by type
  const categories = {
    plants: elements.filter(el => el.type === 'plant').length,
    terrain: elements.filter(el => el.type === 'terrain').length,
    structures: elements.filter(el => el.type === 'structure').length,
    shapes: elements.filter(el => el.type === 'rectangle' || el.type === 'circle').length
  };

  // Create export-friendly elements
  const exportElements: ExportElement[] = elements.map(el => ({
    id: el.id,
    type: el.type,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    radius: el.radius,
    rotation: el.rotation,
    plant: el.plant,
    terrain: el.terrain,
    structure: el.structure,
    realWorldWidth: el.realWorldWidth,
    realWorldHeight: el.realWorldHeight,
    brushType: el.brushType,
    texture: el.texture,
    pathPoints: el.pathPoints,
    selectedBrushMode: el.selectedBrushMode,
    brushThickness: el.brushThickness
  }));

  return {
    version: '1.0',
    timestamp,
    projectInfo: {
      name: projectName || `Projeto Agroecológico ${new Date().toLocaleDateString('pt-BR')}`,
      description: `Projeto com ${elements.length} elementos em área de ${canvasSize.width}x${canvasSize.height} metros`,
      canvasSize,
      totalElements: elements.length,
      categories
    },
    elements: exportElements,
    metadata: {
      exportDate: new Date().toISOString(),
      exportedBy: 'Agroecologia Desenhada v1.0',
      coordinates: {
        system: 'meters',
        origin: { x: 0, y: 0 }
      }
    }
  };
}

/**
 * Export project data as JSON file
 */
export function exportProjectAsJSON(
  elements: DrawingElement[],
  canvasSize: { width: number; height: number },
  projectName?: string
): void {
  try {
    const exportData = createExportData(elements, canvasSize, projectName);

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName || 'agroecologia-project'}-${timestamp}.json`;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    toast.success('Projeto exportado como JSON!', {
      description: `${elements.length} elementos salvos`
    });
  } catch (error) {
    console.error('Error exporting project:', error);
    toast.error('Erro ao exportar projeto');
  }
}

/**
 * Calculate project statistics
 */
export function calculateProjectStatistics(elements: DrawingElement[]) {
  const stats = {
    total: elements.length,
    plants: 0,
    terrain: 0,
    structures: 0,
    shapes: 0,
    selected: 0,
    totalArea: 0,
    averageSpacing: 0
  };

  for (const element of elements) {
    // Count by type
    switch (element.type) {
      case 'plant':
        stats.plants++;
        break;
      case 'terrain':
        stats.terrain++;
        // Calculate area for terrain
        if (element.realWorldWidth && element.realWorldHeight) {
          stats.totalArea += element.realWorldWidth * element.realWorldHeight;
        }
        break;
      case 'structure':
        stats.structures++;
        break;
      case 'rectangle':
      case 'circle':
        stats.shapes++;
        break;
    }

    // Count selected elements
    if (element.selected) {
      stats.selected++;
    }

    // Calculate plant spacing average
    if (element.plant?.spacing) {
      const spacingMatch = element.plant.spacing.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(cm|m)/);
      if (spacingMatch) {
        const width = parseFloat(spacingMatch[1]);
        const height = parseFloat(spacingMatch[2]);
        const unit = spacingMatch[3] || 'm';
        const metersWidth = unit === 'cm' ? width / 100 : width;
        const metersHeight = unit === 'cm' ? height / 100 : height;
        stats.averageSpacing += (metersWidth + metersHeight) / 2;
      }
    }
  }

  // Calculate average spacing
  if (stats.plants > 0) {
    stats.averageSpacing = stats.averageSpacing / stats.plants;
  }

  return stats;
}

/**
 * Validate export data
 */
export function validateExportData(data: any): data is ExportData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check required fields
  const requiredFields = ['version', 'timestamp', 'projectInfo', 'elements', 'metadata'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      return false;
    }
  }

  // Validate project info
  if (!data.projectInfo.canvasSize || typeof data.projectInfo.canvasSize !== 'object') {
    return false;
  }

  // Validate elements
  if (!Array.isArray(data.elements)) {
    return false;
  }

  // Validate each element
  for (const element of data.elements) {
    if (!validateExportElement(element)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate individual export element
 */
function validateExportElement(element: any): boolean {
  if (!element || typeof element !== 'object') {
    return false;
  }

  // Required fields
  const requiredFields = ['id', 'type', 'x', 'y'];
  for (const field of requiredFields) {
    if (!(field in element)) {
      return false;
    }
  }

  // Validate type
  const validTypes = ['plant', 'terrain', 'structure', 'rectangle', 'circle'];
  if (!validTypes.includes(element.type)) {
    return false;
  }

  // Validate coordinates
  if (typeof element.x !== 'number' || typeof element.y !== 'number') {
    return false;
  }

  // Validate dimensions based on type
  if (element.type === 'circle' && element.radius !== undefined) {
    if (typeof element.radius !== 'number' || element.radius < 0) {
      return false;
    }
  }

  if ((element.type === 'rectangle' || element.type === 'terrain') &&
      (element.width !== undefined || element.height !== undefined)) {
    if (typeof element.width !== 'number' || element.width < 0 ||
        typeof element.height !== 'number' || element.height < 0) {
      return false;
    }
  }

  return true;
}

/**
 * Import project from JSON data
 */
export function importProjectFromJSON(jsonData: string): ExportData | null {
  try {
    const data = JSON.parse(jsonData);

    if (!validateExportData(data)) {
      toast.error('Formato de arquivo inválido');
      return null;
    }

    toast.success('Projeto importado com sucesso!');
    return data as ExportData;
  } catch (error) {
    console.error('Error importing project:', error);
    toast.error('Erro ao importar projeto');
    return null;
  }
}

/**
 * Generate project summary
 */
export function generateProjectSummary(data: ExportData): string {
  const { projectInfo, elements } = data;

  const summary = `
Projeto: ${projectInfo.name}
Descrição: ${projectInfo.description}
Tamanho: ${projectInfo.canvasSize.width}x${projectInfo.canvasSize.height}m
Total de Elementos: ${projectInfo.totalElements}

Distribuição:
- Plantas: ${projectInfo.categories.plants}
- Terrenos: ${projectInfo.categories.terrain}
- Estruturas: ${projectInfo.categories.structures}
- Formas: ${projectInfo.categories.shapes}

Exportado em: ${data.metadata.exportDate}
Versão: ${data.version}
  `.trim();

  return summary;
}
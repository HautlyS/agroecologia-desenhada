import { toast } from 'sonner';
import { Plant, Terrain, Structure, DrawingElement } from '@/types/canvasTypes';

// Validation types
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export interface CanvasValidationOptions {
  maxElements?: number;
  maxCanvasSize?: { width: number; height: number };
  minCanvasSize?: { width: number; height: number };
  allowedFileTypes?: string[];
  maxFileSize?: number; // in bytes
}

// Default validation options
const DEFAULT_VALIDATION_OPTIONS: CanvasValidationOptions = {
  maxElements: 1000,
  maxCanvasSize: { width: 200, height: 200 },
  minCanvasSize: { width: 1, height: 1 },
  allowedFileTypes: ['image/png', 'image/jpeg', 'image/webp'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
};

/**
 * Validate plant data
 */
export function validatePlant(plant: Plant): ValidationResult {
  if (!plant || typeof plant !== 'object') {
    return { isValid: false, error: 'Invalid plant data' };
  }

  if (!plant.id || typeof plant.id !== 'string') {
    return { isValid: false, error: 'Plant ID is required and must be a string' };
  }

  if (!plant.name || typeof plant.name !== 'string') {
    return { isValid: false, error: 'Plant name is required and must be a string' };
  }

  if (plant.name.length > 100) {
    return { isValid: false, error: 'Plant name must be less than 100 characters' };
  }

  if (!plant.spacing || typeof plant.spacing !== 'string') {
    return { isValid: false, error: 'Plant spacing is required' };
  }

  // Validate spacing format (e.g., "1x1m", "30x30cm", "50cm", "2m")
  const spacingPattern = /^(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?(cm|m)$/;
  if (!spacingPattern.test(plant.spacing)) {
    return { isValid: false, error: 'Invalid spacing format. Use formats like "1x1m", "30x30cm", "50cm", or "2m"' };
  }

  if (!plant.category || typeof plant.category !== 'string') {
    return { isValid: false, error: 'Plant category is required' };
  }

  if (!plant.color || typeof plant.color !== 'string') {
    return { isValid: false, error: 'Plant color is required' };
  }

  // Validate color format (hex color)
  const colorPattern = /^#[0-9A-Fa-f]{6}$/;
  if (!colorPattern.test(plant.color)) {
    return { isValid: false, error: 'Plant color must be a valid hex color (e.g., #FF6B6B)' };
  }

  return { isValid: true };
}

/**
 * Validate terrain data
 */
export function validateTerrain(terrain: Terrain): ValidationResult {
  if (!terrain || typeof terrain !== 'object') {
    return { isValid: false, error: 'Invalid terrain data' };
  }

  if (!terrain.id || typeof terrain.id !== 'string') {
    return { isValid: false, error: 'Terrain ID is required and must be a string' };
  }

  if (!terrain.name || typeof terrain.name !== 'string') {
    return { isValid: false, error: 'Terrain name is required and must be a string' };
  }

  if (terrain.name.length > 100) {
    return { isValid: false, error: 'Terrain name must be less than 100 characters' };
  }

  if (!terrain.category || typeof terrain.category !== 'string') {
    return { isValid: false, error: 'Terrain category is required' };
  }

  if (!terrain.color || typeof terrain.color !== 'string') {
    return { isValid: false, error: 'Terrain color is required' };
  }

  // Validate color format (hex color)
  const colorPattern = /^#[0-9A-Fa-f]{6}$/;
  if (!colorPattern.test(terrain.color)) {
    return { isValid: false, error: 'Terrain color must be a valid hex color (e.g., #8B4513)' };
  }

  // Validate brush thickness if provided
  if (terrain.brushThickness !== undefined) {
    if (typeof terrain.brushThickness !== 'number' || terrain.brushThickness < 1 || terrain.brushThickness > 100) {
      return { isValid: false, error: 'Brush thickness must be between 1 and 100 pixels' };
    }
  }

  return { isValid: true };
}

/**
 * Validate structure data
 */
export function validateStructure(structure: Structure): ValidationResult {
  if (!structure || typeof structure !== 'object') {
    return { isValid: false, error: 'Invalid structure data' };
  }

  if (!structure.id || typeof structure.id !== 'string') {
    return { isValid: false, error: 'Structure ID is required and must be a string' };
  }

  if (!structure.name || typeof structure.name !== 'string') {
    return { isValid: false, error: 'Structure name is required and must be a string' };
  }

  if (structure.name.length > 100) {
    return { isValid: false, error: 'Structure name must be less than 100 characters' };
  }

  if (!structure.category || typeof structure.category !== 'string') {
    return { isValid: false, error: 'Structure category is required' };
  }

  if (!structure.size || typeof structure.size !== 'object') {
    return { isValid: false, error: 'Structure size is required' };
  }

  if (typeof structure.size.width !== 'number' || structure.size.width < 0.1 || structure.size.width > 100) {
    return { isValid: false, error: 'Structure width must be between 0.1 and 100 meters' };
  }

  if (typeof structure.size.height !== 'number' || structure.size.height < 0.1 || structure.size.height > 100) {
    return { isValid: false, error: 'Structure height must be between 0.1 and 100 meters' };
  }

  if (!structure.color || typeof structure.color !== 'string') {
    return { isValid: false, error: 'Structure color is required' };
  }

  // Validate color format (hex color)
  const colorPattern = /^#[0-9A-Fa-f]{6}$/;
  if (!colorPattern.test(structure.color)) {
    return { isValid: false, error: 'Structure color must be a valid hex color (e.g., #696969)' };
  }

  return { isValid: true };
}

/**
 * Validate drawing element
 */
export function validateDrawingElement(element: DrawingElement): ValidationResult {
  if (!element || typeof element !== 'object') {
    return { isValid: false, error: 'Invalid element data' };
  }

  if (!element.id || typeof element.id !== 'number') {
    return { isValid: false, error: 'Element ID is required and must be a number' };
  }

  if (!element.type || typeof element.type !== 'string') {
    return { isValid: false, error: 'Element type is required' };
  }

  const validTypes = ['plant', 'terrain', 'rectangle', 'circle'];
  if (!validTypes.includes(element.type)) {
    return { isValid: false, error: `Element type must be one of: ${validTypes.join(', ')}` };
  }

  if (typeof element.x !== 'number' || !isFinite(element.x)) {
    return { isValid: false, error: 'Element x position must be a valid number' };
  }

  if (typeof element.y !== 'number' || !isFinite(element.y)) {
    return { isValid: false, error: 'Element y position must be a valid number' };
  }

  // Check for extremely large coordinates (might indicate a bug)
  if (Math.abs(element.x) > 100000 || Math.abs(element.y) > 100000) {
    return { isValid: false, error: 'Element coordinates are out of reasonable bounds' };
  }

  // Validate type-specific properties
  if (element.type === 'plant' && element.plant) {
    const plantValidation = validatePlant(element.plant);
    if (!plantValidation.isValid) {
      return plantValidation;
    }
  }

  if (element.type === 'terrain' && element.terrain) {
    const terrainValidation = validateTerrain(element.terrain);
    if (!terrainValidation.isValid) {
      return terrainValidation;
    }
  }

  // Validate dimensions for shapes and terrain
  if (element.type === 'rectangle' || element.type === 'circle' || element.type === 'terrain') {
    if (element.width !== undefined) {
      if (typeof element.width !== 'number' || element.width < 0 || !isFinite(element.width)) {
        return { isValid: false, error: 'Element width must be a valid positive number' };
      }
    }

    if (element.height !== undefined) {
      if (typeof element.height !== 'number' || element.height < 0 || !isFinite(element.height)) {
        return { isValid: false, error: 'Element height must be a valid positive number' };
      }
    }

    if (element.radius !== undefined) {
      if (typeof element.radius !== 'number' || element.radius < 0 || !isFinite(element.radius)) {
        return { isValid: false, error: 'Element radius must be a valid positive number' };
      }
    }
  }

  // Validate rotation if provided
  if (element.rotation !== undefined) {
    if (typeof element.rotation !== 'number' || !isFinite(element.rotation)) {
      return { isValid: false, error: 'Element rotation must be a valid number' };
    }
  }

  return { isValid: true };
}

/**
 * Validate canvas size
 */
export function validateCanvasSize(
  size: { width: number; height: number },
  options: CanvasValidationOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };

  if (!size || typeof size !== 'object') {
    return { isValid: false, error: 'Invalid canvas size data' };
  }

  if (typeof size.width !== 'number' || !isFinite(size.width)) {
    return { isValid: false, error: 'Canvas width must be a valid number' };
  }

  if (typeof size.height !== 'number' || !isFinite(size.height)) {
    return { isValid: false, error: 'Canvas height must be a valid number' };
  }

  if (size.width < opts.minCanvasSize!.width || size.width > opts.maxCanvasSize!.width) {
    return {
      isValid: false,
      error: `Canvas width must be between ${opts.minCanvasSize!.width} and ${opts.maxCanvasSize!.width} meters`
    };
  }

  if (size.height < opts.minCanvasSize!.height || size.height > opts.maxCanvasSize!.height) {
    return {
      isValid: false,
      error: `Canvas height must be between ${opts.minCanvasSize!.height} and ${opts.maxCanvasSize!.height} meters`
    };
  }

  return { isValid: true };
}

/**
 * Validate elements array
 */
export function validateElementsArray(
  elements: DrawingElement[],
  options: CanvasValidationOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };

  if (!Array.isArray(elements)) {
    return { isValid: false, error: 'Elements must be an array' };
  }

  if (elements.length > opts.maxElements!) {
    return {
      isValid: false,
      error: `Maximum ${opts.maxElements} elements allowed`
    };
  }

  // Validate each element
  for (let i = 0; i < elements.length; i++) {
    const elementValidation = validateDrawingElement(elements[i]);
    if (!elementValidation.isValid) {
      return {
        isValid: false,
        error: `Element at index ${i}: ${elementValidation.error}`
      };
    }
  }

  return { isValid: true };
}

/**
 * Safe JSON parsing with validation
 */
export function safeJsonParse<T>(
  jsonString: string,
  validator?: (data: any) => data is T
): { data: T | null; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);

    if (validator && !validator(parsed)) {
      return { data: null, error: 'Invalid data structure' };
    }

    return { data: parsed };
  } catch (error) {
    return { data: null, error: 'Invalid JSON format' };
  }
}

/**
 * Validate file for upload
 */
export function validateFile(
  file: File,
  options: CanvasValidationOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };

  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  if (!opts.allowedFileTypes!.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${opts.allowedFileTypes!.join(', ')}`
    };
  }

  if (file.size > opts.maxFileSize!) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${Math.round(opts.maxFileSize! / 1024 / 1024)}MB`
    };
  }

  return { isValid: true };
}

/**
 * Show validation error as toast
 */
export function showValidationError(validation: ValidationResult): void {
  if (validation.isValid) return;

  if (validation.error) {
    toast.error(validation.error);
  } else if (validation.warning) {
    toast.warning(validation.warning);
  }
}

/**
 * Comprehensive validation for canvas state
 */
export function validateCanvasState(
  elements: DrawingElement[],
  canvasSize: { width: number; height: number },
  options: CanvasValidationOptions = {}
): ValidationResult {
  // Validate canvas size
  const sizeValidation = validateCanvasSize(canvasSize, options);
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }

  // Validate elements
  const elementsValidation = validateElementsArray(elements, options);
  if (!elementsValidation.isValid) {
    return elementsValidation;
  }

  return { isValid: true };
}
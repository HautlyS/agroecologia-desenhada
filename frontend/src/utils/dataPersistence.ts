import { toast } from 'sonner';
import { DrawingElement, Plant, Terrain, Structure } from '@/types/canvasTypes';

// Storage keys
const STORAGE_KEYS = {
  CURRENT_PROJECT: 'agroecologia-current-project',
  PROJECT_HISTORY: 'agroecolia-project-history',
  USER_PREFERENCES: 'agroecolia-user-preferences',
  LAST_SAVE: 'agroecologia-last-save',
  APP_VERSION: 'agroecolia-app-version'
} as const;

// Project data structure
export interface ProjectData {
  version: string;
  timestamp: number;
  lastModified: string;
  canvasSize: { width: number; height: number };
  elements: DrawingElement[];
  selectedTool: string;
  selectedPlant?: Plant | null;
  selectedTerrain?: Terrain | null;
  selectedStructure?: Structure | null;
  metadata: {
    elementsCount: number;
    totalArea?: number;
    projectInfo?: string;
    tags?: string[];
  };
}

// User preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  gridSize: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // in minutes
  defaultCanvasSize: { width: number; height: number };
  showTooltips: boolean;
  enableSounds: boolean;
  language: 'pt-BR' | 'en';
}

// Project history entry
export interface ProjectHistoryEntry {
  id: string;
  name: string;
  timestamp: number;
  lastModified: string;
  canvasSize: { width: number; height: number };
  elementsCount: number;
  thumbnail?: string; // base64 encoded thumbnail
  tags?: string[];
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  gridSize: true,
  autoSave: true,
  autoSaveInterval: 5,
  defaultCanvasSize: { width: 50, height: 30 },
  showTooltips: true,
  enableSounds: false,
  language: 'pt-BR'
};

/**
 * Get current project data from localStorage
 */
export function getCurrentProject(): ProjectData | null {
  try {
    const projectJson = localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT);
    if (!projectJson) return null;

    const project = JSON.parse(projectJson) as ProjectData;

    // Validate project structure
    if (!validateProjectData(project)) {
      console.warn('Invalid project data found in localStorage');
      return null;
    }

    return project;
  } catch (error) {
    console.error('Error loading current project:', error);
    return null;
  }
}

/**
 * Save current project to localStorage
 */
export function saveCurrentProject(project: ProjectData): boolean {
  try {
    // Validate project before saving
    if (!validateProjectData(project)) {
      toast.error('Dados do projeto inválidos');
      return false;
    }

    // Update metadata
    project.lastModified = new Date().toISOString();
    project.metadata.elementsCount = project.elements.length;

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, JSON.stringify(project));
    localStorage.setItem(STORAGE_KEYS.LAST_SAVE, Date.now().toString());

    // Add to project history
    addToProjectHistory(project);

    return true;
  } catch (error) {
    console.error('Error saving project:', error);
    toast.error('Erro ao salvar projeto');
    return false;
  }
}

/**
 * Validate project data structure
 */
function validateProjectData(project: any): project is ProjectData {
  if (!project || typeof project !== 'object') return false;

  const requiredFields = ['version', 'timestamp', 'canvasSize', 'elements', 'selectedTool'];
  for (const field of requiredFields) {
    if (!(field in project)) {
      console.warn(`Missing required field: ${field}`);
      return false;
    }
  }

  // Validate canvas size
  if (!project.canvasSize || typeof project.canvasSize !== 'object') return false;
  if (typeof project.canvasSize.width !== 'number' || typeof project.canvasSize.height !== 'number') return false;

  // Validate elements array
  if (!Array.isArray(project.elements)) return false;

  // Validate timestamp
  if (typeof project.timestamp !== 'number' || project.timestamp <= 0) return false;

  return true;
}

/**
 * Add project to history
 */
function addToProjectHistory(project: ProjectData): void {
  try {
    const history = getProjectHistory();

    const historyEntry: ProjectHistoryEntry = {
      id: generateProjectId(),
      name: generateProjectName(project),
      timestamp: project.timestamp,
      lastModified: project.lastModified,
      canvasSize: project.canvasSize,
      elementsCount: project.elements.length,
      tags: project.metadata.tags
    };

    // Add to beginning of history
    history.unshift(historyEntry);

    // Keep only last 50 projects
    if (history.length > 50) {
      history.splice(50);
    }

    localStorage.setItem(STORAGE_KEYS.PROJECT_HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('Error adding to project history:', error);
  }
}

/**
 * Get project history
 */
export function getProjectHistory(): ProjectHistoryEntry[] {
  try {
    const historyJson = localStorage.getItem(STORAGE_KEYS.PROJECT_HISTORY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('Error loading project history:', error);
    return [];
  }
}

/**
 * Delete project from history
 */
export function deleteProjectFromHistory(projectId: string): boolean {
  try {
    const history = getProjectHistory();
    const filteredHistory = history.filter(entry => entry.id !== projectId);

    if (filteredHistory.length === history.length) {
      return false; // Project not found
    }

    localStorage.setItem(STORAGE_KEYS.PROJECT_HISTORY, JSON.stringify(filteredHistory));
    return true;
  } catch (error) {
    console.error('Error deleting project from history:', error);
    return false;
  }
}

/**
 * Load project from history
 */
export function loadProjectFromHistory(projectId: string): ProjectData | null {
  try {
    // For now, we only have the current project in localStorage
    // In a full implementation, you'd save multiple projects
    const currentProject = getCurrentProject();

    if (currentProject && generateProjectId(currentProject) === projectId) {
      return currentProject;
    }

    toast.error('Projeto não encontrado no histórico');
    return null;
  } catch (error) {
    console.error('Error loading project from history:', error);
    toast.error('Erro ao carregar projeto');
    return null;
  }
}

/**
 * Get user preferences
 */
export function getUserPreferences(): UserPreferences {
  try {
    const prefsJson = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    if (!prefsJson) return DEFAULT_PREFERENCES;

    const prefs = JSON.parse(prefsJson) as UserPreferences;
    return { ...DEFAULT_PREFERENCES, ...prefs };
  } catch (error) {
    console.error('Error loading user preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save user preferences
 */
export function saveUserPreferences(preferences: Partial<UserPreferences>): boolean {
  try {
    const currentPrefs = getUserPreferences();
    const updatedPrefs = { ...currentPrefs, ...preferences };

    localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updatedPrefs));
    return true;
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return false;
  }
}

/**
 * Export project data as JSON file
 */
export function exportProjectAsJson(project: ProjectData): void {
  try {
    const exportData = {
      ...project,
      exportedAt: new Date().toISOString(),
      exportedBy: 'Agroecologia Desenhada v1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agroecologia-project-${Date.now()}.json`;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    toast.success('Projeto exportado com sucesso!');
  } catch (error) {
    console.error('Error exporting project:', error);
    toast.error('Erro ao exportar projeto');
  }
}

/**
 * Import project from JSON file
 */
export async function importProjectFromJson(file: File): Promise<ProjectData | null> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Validate imported data
    if (!validateProjectData(data)) {
      toast.error('Formato de arquivo inválido');
      return null;
    }

    // Update imported data
    data.timestamp = Date.now();
    data.lastModified = new Date().toISOString();

    toast.success('Projeto importado com sucesso!');
    return data as ProjectData;
  } catch (error) {
    console.error('Error importing project:', error);
    toast.error('Erro ao importar projeto');
    return null;
  }
}

/**
 * Clear all data from localStorage
 */
export function clearAllData(): boolean {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    toast.success('Todos os dados foram limpos');
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    toast.error('Erro ao limpar dados');
    return false;
  }
}

/**
 * Get storage usage information
 */
export function getStorageInfo(): {
  used: number;
  available: number;
  total: number;
  usagePercentage: number;
} {
  try {
    let used = 0;

    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        used += new Blob([item]).size;
      }
    });

    // Estimate localStorage limit (usually 5-10MB)
    const total = 5 * 1024 * 1024; // 5MB
    const available = total - used;
    const usagePercentage = (used / total) * 100;

    return { used, available, total, usagePercentage };
  } catch (error) {
    console.error('Error calculating storage info:', error);
    return { used: 0, available: 0, total: 0, usagePercentage: 0 };
  }
}

/**
 * Auto-save functionality
 */
export class AutoSave {
  private interval: NodeJS.Timeout | null = null;
  private projectData: ProjectData | null = null;

  constructor(private intervalMinutes: number = 5) {}

  start(projectData: ProjectData): void {
    this.projectData = projectData;

    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(() => {
      if (this.projectData) {
        saveCurrentProject(this.projectData);
      }
    }, this.intervalMinutes * 60 * 1000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  updateProject(projectData: ProjectData): void {
    this.projectData = projectData;
  }
}

/**
 * Generate unique project ID
 */
function generateProjectId(project: ProjectData): string {
  // Create a simple hash from project data
  const dataString = JSON.stringify({
    timestamp: project.timestamp,
    canvasSize: project.canvasSize,
    elementsCount: project.elements.length
  });

  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * Generate project name
 */
function generateProjectName(project: ProjectData): string {
  const date = new Date(project.timestamp);
  const dateStr = date.toLocaleDateString('pt-BR');
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return `Projeto ${dateStr} ${timeStr}`;
}

/**
 * Check if auto-save is enabled
 */
export function isAutoSaveEnabled(): boolean {
  const prefs = getUserPreferences();
  return prefs.autoSave;
}

/**
 * Get auto-save interval
 */
export function getAutoSaveInterval(): number {
  const prefs = getUserPreferences();
  return prefs.autoSaveInterval;
}

/**
 * Get last save time
 */
export function getLastSaveTime(): number | null {
  try {
    const lastSave = localStorage.getItem(STORAGE_KEYS.LAST_SAVE);
    return lastSave ? parseInt(lastSave, 10) : null;
  } catch (error) {
    return null;
  }
}
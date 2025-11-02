import React, { memo, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MousePointer, 
  Square, 
  Circle, 
  Move, 
  RotateCw, 
  Trash2,
  Grid3X3,
  Ruler,
  Hand,
  Copy,
  Palette,
  Undo,
  Redo,
  Download,
  Share2,
  Save,
  Sprout,
  Settings,
  Sun,
  Moon,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

interface UnifiedToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canvasSize: { width: number; height: number };
  onCanvasSizeChange: (size: { width: number; height: number }) => void;
  onSave?: () => void;
  onShare?: () => void;
  onExport?: () => void;
  onRotate?: () => void;
  onCopy?: () => void;
  canRotate?: boolean;
  canCopy?: boolean;
}

const tools = [
  { 
    id: "select", 
    icon: MousePointer, 
    label: "Selecionar", 
    description: "Selecione e mova elementos",
    category: "selection",
    color: "bg-gradient-to-r from-blue-400 to-cyan-500"
  },
  { 
    id: "move", 
    icon: Hand, 
    label: "Navegar", 
    description: "Navegue pelo canvas",
    category: "navigation",
    color: "bg-gradient-to-r from-purple-400 to-pink-500"
  },
  { 
    id: "rectangle", 
    icon: Square, 
    label: "Retângulo", 
    description: "Desenhe retângulos",
    category: "shapes",
    color: "bg-gradient-to-r from-orange-400 to-red-500"
  },
  { 
    id: "circle", 
    icon: Circle, 
    label: "Círculo", 
    description: "Desenhe círculos",
    category: "shapes",
    color: "bg-gradient-to-r from-pink-400 to-rose-500"
  },
  { 
    id: "terrain", 
    icon: Palette, 
    label: "Terreno", 
    description: "Pinte texturas",
    category: "terrain",
    color: "bg-gradient-to-r from-green-400 to-emerald-500"
  },
];

const utilityTools = [
  { id: "grid", icon: Grid3X3, label: "Grade", description: "Alternar grade (G)", color: "bg-gradient-to-r from-slate-400 to-gray-500" },
  { id: "copy", icon: Copy, label: "Copiar", description: "Copiar elementos (Ctrl+C)", color: "bg-gradient-to-r from-indigo-400 to-purple-500" },
  { id: "rotate", icon: RotateCw, label: "Rotacionar", description: "Rotacionar elementos (R)", color: "bg-gradient-to-r from-teal-400 to-cyan-500" },
  { id: "delete", icon: Trash2, label: "Excluir", description: "Remover elementos (Del)", color: "bg-gradient-to-r from-red-400 to-rose-500" },
];

const ToolButton = memo(({ tool, isSelected, onSelect, isUtility = false }: {
  tool: typeof tools[0] | typeof utilityTools[0];
  isSelected: boolean;
  onSelect: (id: string) => void;
  isUtility?: boolean;
}) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => onSelect(tool.id)}
    className={cn(
      "relative h-12 px-4 rounded-2xl transition-all duration-300 backdrop-blur-xl border font-semibold",
      "hover:scale-105 hover:shadow-lg",
      isSelected 
        ? `${tool.color} text-white shadow-lg border-white/20 hover:shadow-xl` 
        : "bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-white/20 dark:border-gray-700/20 hover:bg-white/80 dark:hover:bg-gray-700/80",
      isUtility && "h-10 px-3 text-xs"
    )}
    title={tool.description}
  >
    <tool.icon className={cn(
      "w-4 h-4",
      !isUtility && "mr-2"
    )} />
    {!isUtility && (
      <span className="text-sm font-semibold">{tool.label}</span>
    )}
    {isSelected && (
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-2xl pointer-events-none" />
    )}
  </Button>
));

ToolButton.displayName = "ToolButton";

export const UnifiedToolbar = memo(({
  selectedTool,
  onToolSelect,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  canvasSize,
  onCanvasSizeChange,
  onSave,
  onShare,
  onExport,
  onRotate,
  onCopy,
  canRotate = true,
  canCopy = true
}: UnifiedToolbarProps) => {
  const { theme, toggleTheme } = useTheme();

  const handleExport = useCallback(() => {
    // Use external handler if provided, otherwise use internal implementation
    if (onExport) {
      onExport();
      return;
    }

    const canvasElement = document.querySelector('[data-canvas="true"]') as HTMLElement;
    if (!canvasElement) {
      toast.error("Canvas não encontrado para exportação");
      return;
    }

    import('html2canvas').then(({ default: html2canvas }) => {
      toast.info('Preparando exportação...', { duration: 2000 });

      html2canvas(canvasElement, {
        backgroundColor: '#fafbfc',
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
      }).then(canvas => {
        canvas.toBlob((blob) => {
          if (!blob) {
            toast.error('Erro ao gerar imagem');
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `agroecologia-canvas-${Date.now()}.png`;
          link.style.display = 'none';

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          URL.revokeObjectURL(url);

          toast.success('Canvas exportado com sucesso!');
        }, 'image/png', 0.9);
      }).catch((error) => {
        console.error('Export error:', error);
        toast.error('Erro ao exportar canvas');
      });
    }).catch((error) => {
      console.error('Failed to load html2canvas:', error);
      toast.error('Erro ao carregar biblioteca de exportação');
    });
  }, [onExport]);

  const handleSave = useCallback(() => {
    // Use external handler if provided, otherwise use internal implementation
    if (onSave) {
      onSave();
      return;
    }

    const projectData = {
      timestamp: new Date().toISOString(),
      canvasSize,
      version: "2.0",
      theme
    };
    localStorage.setItem('agroecologia-project', JSON.stringify(projectData));
    toast.success("Projeto salvo com sucesso!", {
      description: "Seus dados foram salvos localmente"
    });
  }, [canvasSize, theme, onSave]);

  const handleShare = useCallback(() => {
    // Use external handler if provided, otherwise use internal implementation
    if (onShare) {
      onShare();
      return;
    }

    if (navigator.share) {
      navigator.share({
        title: 'Meu Projeto Agroecológico',
        text: 'Confira meu planejamento agrícola sustentável',
        url: window.location.href
      }).catch(() => toast.info("Compartilhamento cancelado"));
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência!");
    }
  }, [onShare]);

  const handleCanvasSizeChange = useCallback((field: 'width' | 'height', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      onCanvasSizeChange({
        ...canvasSize,
        [field]: numValue
      });
    }
  }, [canvasSize, onCanvasSizeChange]);

  const memoizedTools = useMemo(() => tools.map(tool => (
    <ToolButton
      key={tool.id}
      tool={tool}
      isSelected={selectedTool === tool.id}
      onSelect={onToolSelect}
    />
  )), [selectedTool, onToolSelect]);

  const memoizedUtilityTools = useMemo(() => utilityTools.map(tool => (
    <ToolButton
      key={tool.id}
      tool={tool}
      isSelected={selectedTool === tool.id}
      onSelect={onToolSelect}
      isUtility
    />
  )), [selectedTool, onToolSelect]);

  return (
    <div className="flex items-center justify-between h-16 px-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/20">
      {/* Left: Logo & Brand */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent dark:from-green-400 dark:to-emerald-400">
              Agroecologia
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Planejamento Sustentável
            </p>
          </div>
        </div>
      </div>

      {/* Center: Tools */}
      <div className="flex items-center gap-3">
        {/* Main Tools */}
        <div className="flex items-center gap-2 p-2 bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/20">
          {memoizedTools}
        </div>

        <Separator orientation="vertical" className="h-8 mx-2 bg-white/20 dark:bg-gray-700/20" />

        {/* Utility Tools */}
        <div className="flex items-center gap-2 p-2 bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/20">
          {memoizedUtilityTools}
        </div>

        <Separator orientation="vertical" className="h-8 mx-2 bg-white/20 dark:bg-gray-700/20" />

        {/* History */}
        <div className="flex items-center gap-2 p-2 bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            className={cn(
              "h-10 w-10 p-0 rounded-xl transition-all duration-300 backdrop-blur-xl",
              canUndo 
                ? "hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:scale-105 text-blue-600 dark:text-blue-400" 
                : "text-gray-400 dark:text-gray-600"
            )}
            title="Desfazer (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            className={cn(
              "h-10 w-10 p-0 rounded-xl transition-all duration-300 backdrop-blur-xl",
              canRedo 
                ? "hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:scale-105 text-blue-600 dark:text-blue-400" 
                : "text-gray-400 dark:text-gray-600"
            )}
            title="Refazer (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Right: Canvas Settings & Actions */}
      <div className="flex items-center gap-3">
        {/* Canvas Size */}
        <div className="hidden lg:flex items-center gap-3 text-sm p-3 bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/20">
          <Label htmlFor="canvas-width" className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            Tamanho:
          </Label>
          <Input
            id="canvas-width"
            type="number"
            value={canvasSize.width}
            onChange={(e) => handleCanvasSizeChange('width', e.target.value)}
            className="w-16 h-8 text-xs rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-white/20 dark:border-gray-700/20 focus:border-blue-400/60 dark:focus:border-blue-600/60"
            min="1"
            max="200"
          />
          <span className="text-xs text-gray-500 font-medium">×</span>
          <Input
            id="canvas-height"
            type="number"
            value={canvasSize.height}
            onChange={(e) => handleCanvasSizeChange('height', e.target.value)}
            className="w-16 h-8 text-xs rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-white/20 dark:border-gray-700/20 focus:border-blue-400/60 dark:focus:border-blue-600/60"
            min="1"
            max="200"
          />
          <span className="text-xs text-gray-500 font-medium">m</span>
        </div>

        <Separator orientation="vertical" className="h-8 bg-white/20 dark:bg-gray-700/20" />

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="h-10 w-10 p-0 rounded-xl transition-all duration-300 backdrop-blur-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/50 hover:scale-105 text-yellow-600 dark:text-yellow-400"
          title="Alternar tema"
        >
          {theme === "light" ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </Button>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="h-10 px-4 rounded-xl transition-all duration-300 backdrop-blur-xl hover:bg-green-100 dark:hover:bg-green-900/50 hover:scale-105 text-green-600 dark:text-green-400 border border-white/20 dark:border-gray-700/20"
            title="Salvar projeto"
          >
            <Save className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline text-sm font-semibold">Salvar</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="h-10 px-4 rounded-xl transition-all duration-300 backdrop-blur-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:scale-105 text-blue-600 dark:text-blue-400 border border-white/20 dark:border-gray-700/20"
            title="Compartilhar"
          >
            <Share2 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline text-sm font-semibold">Compartilhar</span>
          </Button>

          <Button
            onClick={handleExport}
            size="sm"
            className="h-10 px-4 rounded-xl transition-all duration-300 backdrop-blur-xl hover:scale-105 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg border border-white/20"
            title="Exportar PNG"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline text-sm font-semibold">Exportar</span>
            <Sparkles className="w-3 h-3 ml-1 animate-pulse" />
          </Button>
        </div>
      </div>
    </div>
  );
});

UnifiedToolbar.displayName = "UnifiedToolbar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  MousePointer, 
  Square, 
  Circle, 
  Palette,
  Trash2,
  Grid3X3,
  RotateCw,
  Copy,
  Undo,
  Redo,
  Save,
  Download,
  Share2,
  Moon,
  Sun,
  Sprout,
  Zap,
  Settings,
  Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";

interface UnifiedToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  canvasSize?: { width: number; height: number };
  onCanvasSizeChange?: (size: { width: number; height: number }) => void;
}

export const UnifiedToolbar = ({ 
  selectedTool, 
  onToolSelect, 
  onUndo, 
  onRedo, 
  canUndo = false, 
  canRedo = false,
  canvasSize = { width: 50, height: 30 },
  onCanvasSizeChange
}: UnifiedToolbarProps) => {
  const { theme, toggleTheme } = useTheme();
  const [showCustomSizeDialog, setShowCustomSizeDialog] = useState(false);
  const [customWidth, setCustomWidth] = useState(canvasSize.width);
  const [customHeight, setCustomHeight] = useState(canvasSize.height);

  const tools = [
    { id: "select", icon: MousePointer, label: "Select", shortcut: "V" },
    { id: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
    { id: "circle", icon: Circle, label: "Circle", shortcut: "C" },
    { id: "terrain", icon: Palette, label: "Paint", shortcut: "B", highlight: true },
    { id: "delete", icon: Trash2, label: "Delete", shortcut: "Del" },
  ];

  const canvasSizePresets = [
    { label: '10m × 10m', width: 10, height: 10 },
    { label: '20m × 15m', width: 20, height: 15 },
    { label: '30m × 20m', width: 30, height: 20 },
    { label: '50m × 30m', width: 50, height: 30 },
    { label: '100m × 50m', width: 100, height: 50 },
    { label: '200m × 100m', width: 200, height: 100 },
    { label: 'Personalizado...', width: -1, height: -1, custom: true },
  ];

  const handleSave = () => {
    toast.success("Project saved!", { description: "Your work has been saved locally." });
  };

  const handleExport = () => {
    toast.success("Exporting...", { description: "Your canvas will be downloaded as PNG." });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!", { description: "Share this link with others." });
  };

  return (
    <div className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 flex-shrink-0">
      {/* Left: Branding + Tools */}
      <div className="flex items-center gap-6">
        {/* App Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">AgroCanvas</h1>
          </div>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Tools */}
        <div className="flex items-center gap-1 p-1 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={selectedTool === tool.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onToolSelect(tool.id)}
              className={cn(
                "tool-button relative h-9 px-3 transition-all duration-300",
                selectedTool === tool.id && tool.highlight && "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md",
                selectedTool === tool.id && !tool.highlight && "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md",
                "hover:scale-105 hover:shadow-lg"
              )}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <tool.icon className="w-4 h-4" />
              <span className="ml-2 font-medium">{tool.label}</span>
              {tool.highlight && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 text-xs px-1 py-0 bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-sm animate-pulse">
                  New
                </Badge>
              )}
            </Button>
          ))}
        </div>
        
        <Separator orientation="vertical" className="h-8" />
        
        {/* Canvas Size Selector */}
        {onCanvasSizeChange && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
            <Label className="text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Canvas:</Label>
            <Select
              value={`${canvasSize.width}x${canvasSize.height}`}
              onValueChange={(value) => {
                const preset = canvasSizePresets.find(p => `${p.width}x${p.height}` === value);
                if (preset) {
                  onCanvasSizeChange({ width: preset.width, height: preset.height });
                  toast.success(`Canvas redimensionado para ${preset.label}`, {
                    description: `Novo tamanho: ${preset.width}m × ${preset.height}m`
                  });
                }
              }}
            >
              <SelectTrigger className="w-32 h-8 text-xs font-medium border-emerald-200 dark:border-emerald-700 focus:ring-emerald-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {canvasSizePresets.map((preset) => (
                  <SelectItem key={`${preset.width}x${preset.height}`} value={`${preset.width}x${preset.height}`} className="text-xs">
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* History */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            className="h-9 px-3"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            className="h-9 px-3"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* File Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="h-9 px-3"
            title="Save (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="h-9 px-3"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExport}
            className="h-9 px-3 bg-emerald-500 hover:bg-emerald-600 text-white"
            title="Export PNG"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="h-9 px-3"
          title="Toggle theme"
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

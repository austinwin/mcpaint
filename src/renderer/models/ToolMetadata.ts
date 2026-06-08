// McPaint — Tool Metadata (names, shortcuts, descriptions, status help)
import { ToolType } from './ToolType';

export interface ToolMeta {
  type: ToolType; name: string; shortcut: string;
  description: string; category: string; icon: string;
  implemented: boolean; statusHelp: string; options: string[];
}

const SEL='Selection',DRW='Drawing',UTL='Utility',SHP='Shapes',NAV='Navigation';

export const TOOL_META: ToolMeta[] = [
  { type: ToolType.RectSelect, name: 'Rectangle Select', shortcut: 'S', description: 'Select a rectangular region', category: SEL, icon: 'rectSelect', implemented: true, statusHelp: 'Rectangle Select (S): Select a rectangular region of the image.', options: ['selMode'] },
  { type: ToolType.Move, name: 'Move', shortcut: 'M', description: 'Move selected pixels or layer', category: SEL, icon: 'move', implemented: true, statusHelp: 'Move (M): Move the selected pixels or active layer.', options: [] },
  { type: ToolType.Lasso, name: 'Lasso Select', shortcut: 'L', description: 'Select a freeform region', category: SEL, icon: 'lasso', implemented: true, statusHelp: 'Lasso Select (L): Draw a freeform selection outline.', options: ['selMode'] },
  { type: ToolType.EllipseSelect, name: 'Ellipse Select', shortcut: '', description: 'Select an elliptical region', category: SEL, icon: 'ellipseSelect', implemented: true, statusHelp: 'Ellipse Select: Select an elliptical or circular region.', options: ['selMode'] },
  { type: ToolType.MagicWand, name: 'Magic Wand', shortcut: 'W', description: 'Select areas of similar color', category: SEL, icon: 'magicWand', implemented: true, statusHelp: 'Magic Wand (W): Select connected areas of similar color. Adjust tolerance for range.', options: ['tolerance', 'selMode'] },
  { type: ToolType.Bucket, name: 'Paint Bucket', shortcut: 'F', description: 'Fill an area with color', category: DRW, icon: 'bucket', implemented: true, statusHelp: 'Paint Bucket (F): Fill a contiguous area with the primary color.', options: ['tolerance'] },
  { type: ToolType.Brush, name: 'Paintbrush', shortcut: 'B', description: 'Draw smooth brush strokes', category: DRW, icon: 'brush', implemented: true, statusHelp: 'Paintbrush (B): Draw smooth, anti-aliased strokes. Adjust size and hardness.', options: ['size', 'hardness'] },
  { type: ToolType.Eraser, name: 'Eraser', shortcut: 'E', description: 'Erase pixels from the layer', category: DRW, icon: 'eraser', implemented: true, statusHelp: 'Eraser (E): Erase pixels from the active layer. Adjust size for larger area.', options: ['size'] },
  { type: ToolType.Pencil, name: 'Pencil', shortcut: 'P', description: 'Draw pixel-hard lines', category: DRW, icon: 'pencil', implemented: true, statusHelp: 'Pencil (P): Draw sharp, pixel-precise lines with no anti-aliasing.', options: ['size'] },
  { type: ToolType.Picker, name: 'Color Picker', shortcut: 'K', description: 'Pick a color from the canvas', category: UTL, icon: 'picker', implemented: true, statusHelp: 'Color Picker (K): Click the canvas to set the primary color from any pixel.', options: [] },
  { type: ToolType.Clone, name: 'Clone Stamp', shortcut: 'C', description: 'Copy pixels from one area to another', category: UTL, icon: 'clone', implemented: true, statusHelp: 'Clone Stamp (C): Click to set source, then paint to copy pixels. Use size to adjust brush.', options: ['size', 'hardness'] },
  { type: ToolType.Recolor, name: 'Recolor', shortcut: 'R', description: 'Replace one color with another', category: UTL, icon: 'recolor', implemented: true, statusHelp: 'Recolor (R): Paint over pixels to replace their color with the primary color.', options: ['size'] },
  { type: ToolType.Text, name: 'Text', shortcut: 'T', description: 'Add text to the image', category: UTL, icon: 'text', implemented: true, statusHelp: 'Text (T): Click to place text. Type and press Enter to commit. Press Esc to cancel.', options: ['font', 'fontStyle', 'alignment', 'size'] },
  { type: ToolType.Line, name: 'Line / Curve', shortcut: 'O', description: 'Draw a straight line', category: SHP, icon: 'line', implemented: true, statusHelp: 'Line / Curve (O): Click and drag to draw a straight line.', options: ['size', 'antiAlias'] },
  { type: ToolType.Curve, name: 'Curve', shortcut: '', description: 'Draw a bezier curve', category: SHP, icon: 'curve', implemented: false, statusHelp: 'Curve: Coming soon.', options: [] },
  { type: ToolType.Rect, name: 'Rectangle', shortcut: '', description: 'Draw a rectangle', category: SHP, icon: 'rect', implemented: true, statusHelp: 'Rectangle: Click and drag to draw a rectangle. Use fill mode to change style.', options: ['size', 'fillMode', 'antiAlias'] },
  { type: ToolType.RoundRect, name: 'Rounded Rect', shortcut: '', description: 'Draw a rounded rectangle', category: SHP, icon: 'roundRect', implemented: true, statusHelp: 'Rounded Rectangle: Draw a rectangle with rounded corners. Adjust corner radius.', options: ['size', 'fillMode', 'radius', 'antiAlias'] },
  { type: ToolType.Ellipse, name: 'Ellipse', shortcut: '', description: 'Draw an ellipse or circle', category: SHP, icon: 'ellipse', implemented: true, statusHelp: 'Ellipse: Click and drag to draw an ellipse. Hold Shift for a circle.', options: ['size', 'fillMode', 'antiAlias'] },
  { type: ToolType.Freeform, name: 'Freeform Shape', shortcut: '', description: 'Draw a freehand shape', category: SHP, icon: 'freeform', implemented: false, statusHelp: 'Freeform Shape: Coming soon.', options: [] },
  { type: ToolType.Gradient, name: 'Gradient', shortcut: 'G', description: 'Draw a color gradient', category: DRW, icon: 'gradient', implemented: true, statusHelp: 'Gradient (G): Click and drag to create a blend between primary and secondary colors.', options: ['gradientType'] },
  { type: ToolType.Pan, name: 'Pan', shortcut: 'H', description: 'Move the canvas view', category: NAV, icon: 'pan', implemented: true, statusHelp: 'Pan (H): Click and drag to move the canvas view. Does not modify the image.', options: [] },
  { type: ToolType.Zoom, name: 'Zoom', shortcut: 'Z', description: 'Zoom in or out', category: NAV, icon: 'zoomIcon', implemented: true, statusHelp: 'Zoom (Z): Left-click to zoom in, right-click to zoom out. Use scroll wheel with ⌘/Ctrl.', options: [] },
];

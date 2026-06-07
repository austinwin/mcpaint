// McPaint - Tool Types & Definitions
export enum ToolType {
  RectSelect='rectselect',Move='move',Lasso='lasso',EllipseSelect='ellipsesel',
  MagicWand='magicwand',Bucket='bucket',Brush='brush',Eraser='eraser',
  Pencil='pencil',Picker='picker',Clone='clone',Recolor='recolor',
  Text='text',Line='line',Curve='curve',Rect='rect',RoundRect='roundrect',
  Ellipse='ellipse',Freeform='freeform',Gradient='gradient',Pan='pan',Zoom='zoom',
}
export enum BlendMode {Normal='normal',Multiply='multiply',Additive='additive',ColorBurn='colorBurn',ColorDodge='colorDodge',Reflect='reflect',Glow='glow',Overlay='overlay',Difference='difference',Negation='negation',Lighten='lighten',Darken='darken',Screen='screen',Xor='xor'}
export enum ShapeFill {Outline='Outline',Filled='Filled',FilledOutline='FilledOutline'}
export interface ToolInfo {type:ToolType;name:string;icon:string;shortcut?:string}
export const TOOLS:ToolInfo[]=[
  {type:ToolType.RectSelect,name:'Rectangle Select',icon:'▭',shortcut:'S'},
  {type:ToolType.Move,name:'Move',icon:'✥',shortcut:'M'},
  {type:ToolType.Lasso,name:'Lasso Select',icon:'◌',shortcut:'L'},
  {type:ToolType.EllipseSelect,name:'Ellipse Select',icon:'◯'},
  {type:ToolType.MagicWand,name:'Magic Wand',icon:'✦',shortcut:'W'},
  {type:ToolType.Bucket,name:'Paint Bucket',icon:'▣',shortcut:'F'},
  {type:ToolType.Brush,name:'Paintbrush',icon:'🖌',shortcut:'B'},
  {type:ToolType.Eraser,name:'Eraser',icon:'◻',shortcut:'E'},
  {type:ToolType.Pencil,name:'Pencil',icon:'✎',shortcut:'P'},
  {type:ToolType.Picker,name:'Color Picker',icon:'💧',shortcut:'K'},
  {type:ToolType.Clone,name:'Clone Stamp',icon:'◈',shortcut:'C'},
  {type:ToolType.Recolor,name:'Recolor',icon:'◉',shortcut:'R'},
  {type:ToolType.Text,name:'Text',icon:'T',shortcut:'T'},
  {type:ToolType.Line,name:'Line / Curve',icon:'╱',shortcut:'O'},
  {type:ToolType.Curve,name:'Curve',icon:'∿'},
  {type:ToolType.Rect,name:'Rectangle',icon:'□'},
  {type:ToolType.RoundRect,name:'Rounded Rect',icon:'▢'},
  {type:ToolType.Ellipse,name:'Ellipse',icon:'○'},
  {type:ToolType.Freeform,name:'Freeform',icon:'✒'},
  {type:ToolType.Gradient,name:'Gradient',icon:'◧',shortcut:'G'},
  {type:ToolType.Pan,name:'Pan',icon:'✋',shortcut:'H'},
  {type:ToolType.Zoom,name:'Zoom',icon:'◉',shortcut:'Z'},
];
export function b2co(m:BlendMode):GlobalCompositeOperation{const t:Record<string,GlobalCompositeOperation>={normal:'source-over',multiply:'multiply',screen:'screen',overlay:'overlay',darken:'darken',lighten:'lighten',colorBurn:'color-burn',colorDodge:'color-dodge',difference:'difference',xor:'xor',additive:'lighter'};return t[m]||'source-over';}

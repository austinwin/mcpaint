// McPaint — Tools Panel with metadata, tooltips, status help, separators
import { FloatingPanel } from './FloatingPanel';
import { TOOL_META, ToolMeta } from '../models/ToolMetadata';
import { ToolType } from '../models/ToolType';
import { Icons, toolIcon } from './editorIcons';
import { TooltipService } from '../services/TooltipService';

const CATEGORIES = ['Selection', 'Drawing', 'Utility', 'Shapes', 'Navigation'];

export class ToolsPanel extends FloatingPanel {
  private buttons: Map<ToolType, HTMLElement> = new Map();
  private onSelect: (t: ToolType) => void;
  private tooltip: TooltipService;

  constructor(onSelect: (t: ToolType) => void, tooltip: TooltipService) {
    super('tools-panel', 'Tools', 9, 140, 56);
    this.onSelect = onSelect;
    this.tooltip = tooltip;
    this.build();
  }

  private build(): void {
    const grid = document.createElement('div');
    grid.id = 'tools-grid';

    let lastCat = '';
    for (const meta of TOOL_META) {
      // Add category separator
      if (meta.category !== lastCat) {
        lastCat = meta.category;
        const sep = document.createElement('div');
        sep.className = 'tools-sep';
        grid.appendChild(sep);
      }

      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.setAttribute('aria-label', `${meta.name} (${meta.shortcut})`);
      const iconKey = toolIcon(meta.type);
      btn.innerHTML = Icons[iconKey] || meta.icon;

      if (!meta.implemented) {
        btn.classList.add('disabled');
        btn.title = `${meta.name} — Coming soon`;
      } else {
        btn.addEventListener('click', () => this.onSelect(meta.type));
        btn.title = `${meta.name} (${meta.shortcut})\n${meta.description}`;
      }

      // Tooltip + status with 400ms delay
      this.tooltip.bind(btn,
        `${meta.name} (${meta.shortcut})\n${meta.description}`,
        meta.statusHelp
      );

      this.buttons.set(meta.type, btn);
      grid.appendChild(btn);
    }
    this.body.appendChild(grid);
  }

  setActive(tool: ToolType): void {
    this.buttons.forEach((btn, t) => {
      btn.classList.toggle('active', t === tool);
    });
  }
}

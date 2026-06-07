// McPaint — Tools Panel
import { FloatingPanel } from './FloatingPanel';
import { TOOLS, ToolType } from '../models/ToolType';
import { Icons, toolIcon } from './editorIcons';

export class ToolsPanel extends FloatingPanel {
  private onToolSelect: (t: ToolType) => void;
  private buttons: Map<ToolType, HTMLElement> = new Map();

  constructor(onToolSelect: (t: ToolType) => void) {
    super('tools-panel', 'Tools', 9, 140, 48);
    this.onToolSelect = onToolSelect;
    this.build();
  }

  private build(): void {
    const grid = document.createElement('div');
    grid.id = 'tools-grid';
    for (const tool of TOOLS) {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.title = `${tool.name}${tool.shortcut ? ` (${tool.shortcut})` : ''}`;
      const iconKey = toolIcon(tool.type);
      btn.innerHTML = Icons[iconKey];
      btn.addEventListener('click', () => this.onToolSelect(tool.type));
      this.buttons.set(tool.type, btn);
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

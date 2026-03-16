import type { ReactNode } from 'react';
import type { UiMode } from '../../store/uiStore';
import type { ViewportCommandInput } from '../studio/Viewport';

type WorkspaceTopBarProps = {
  title: string;
  subtitle: string;
  currentMode: UiMode;
  onModeChange: (mode: UiMode) => void;
  showGrid: boolean;
  issueCommand: (command: ViewportCommandInput) => void;
  toggleGrid: () => void;
  rightSlot?: ReactNode;
};

export default function WorkspaceTopBar({
  title,
  subtitle,
  currentMode,
  onModeChange,
  showGrid,
  issueCommand,
  toggleGrid,
  rightSlot,
}: WorkspaceTopBarProps) {
  return (
    <header className="workspace-topbar panel">
      <div className="workspace-topbar__section workspace-topbar__section--left">
        <div className="toolbar-group">
          <span className="toolbar-group__label">Mode</span>
          <div className="toolbar-cluster">
            {(['gallery', 'studio', 'export'] as const).map((mode) => (
              <button
                key={mode}
                className={`toolbar-button ${currentMode === mode ? 'toolbar-button--active' : ''}`}
                onClick={() => onModeChange(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="workspace-title">
          <div className="workspace-title__eyebrow">{subtitle}</div>
          <div className="workspace-title__text">{title}</div>
        </div>
      </div>

      <div className="workspace-topbar__section workspace-topbar__section--center">
        <div className="toolbar-group">
          <span className="toolbar-group__label">View</span>
          <div className="toolbar-cluster">
            <button className="toolbar-button" onClick={() => issueCommand({ type: 'frame' })}>
              Frame
            </button>
            <button className="toolbar-button" onClick={() => issueCommand({ type: 'reset' })}>
              Reset
            </button>
            <button className="toolbar-button" onClick={() => issueCommand({ type: 'view', preset: 'iso' })}>
              Iso
            </button>
            <button className="toolbar-button" onClick={() => issueCommand({ type: 'view', preset: 'front' })}>
              Front
            </button>
            <button className="toolbar-button" onClick={() => issueCommand({ type: 'view', preset: 'right' })}>
              Right
            </button>
            <button className="toolbar-button" onClick={() => issueCommand({ type: 'view', preset: 'top' })}>
              Top
            </button>
            <button
              className={`toolbar-button ${showGrid ? 'toolbar-button--active' : ''}`}
              onClick={toggleGrid}
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      <div className="workspace-topbar__section workspace-topbar__section--right">
        {rightSlot ? <div className="toolbar-cluster">{rightSlot}</div> : null}
      </div>
    </header>
  );
}

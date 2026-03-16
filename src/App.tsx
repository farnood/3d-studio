import { useUiStore } from './store/uiStore';
import Gallery from './components/gallery/Gallery';
import Studio from './components/studio/Studio';
import ExportView from './components/export/ExportView';

function App() {
  const currentMode = useUiStore((state) => state.currentMode);

  return (
    <div className="app-container">
      {currentMode === 'gallery' && <Gallery />}
      {currentMode === 'studio' && <Studio />}
      {currentMode === 'export' && <ExportView />}
    </div>
  );
}

export default App;

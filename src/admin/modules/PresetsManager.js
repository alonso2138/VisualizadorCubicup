// presetManager.js

// ---------------------------
// Clase principal
// ---------------------------
export class PresetsManager {
  constructor() {
    // UUIDs de los objetos seleccionados actualmente
    this.SeleccionObjetos = [];

    // Array de presets guardados. Cada preset = [{ uuid, sku }, …]
    this.Presets = [];

    // Vínculos actuales (array de { uuid, sku })
    this.VinculosActuales = [];

    // Referencias DOM internas
    this._modal = null;
    this._listaContainer = null;
    this._vinculosContainer = null;
    this._presetsContainer = null;
    this.eventListeners = [];
  }

  // Método público para añadir o reemplazar un vínculo
  addVinculo(uuid, sku) {
    // Reemplazar si ya existe vínculo para ese uuid
    const idx = this.VinculosActuales.findIndex(v => v.uuid === uuid);
    if (idx !== -1) {
      this.VinculosActuales[idx].sku = sku;
      this.mostrarMensaje('Vínculo actualizado', 'info');
    } else {
      this.VinculosActuales.push({ uuid, sku });
      this.mostrarMensaje('Vínculo añadido', 'success');
    }

    this._renderVinculos();
    window.adminInterface.experienceManager.modelViewer.applyTextureToMeshByUUID(uuid, sku)
  }

  // Método para eliminar un vínculo
  removeVinculo(uuid) {
    this.VinculosActuales = this.VinculosActuales.filter(v => v.uuid !== uuid);
    this._renderVinculos();
    this.mostrarMensaje('Vínculo eliminado', 'info');
  }

  // Método para limpiar todos los vínculos
  limpiarVinculos() {
    this.VinculosActuales = [];
    this._renderVinculos();
    this.mostrarMensaje('Todos los vínculos eliminados', 'info');
    // Llamar a la función que limpia los materiales de la escena
    window.adminInterface.experienceManager.modelViewer.cleanModel();
  }

  setupPresetsModal() {
    this.inyectarCss();
    const showPresetsBtn = document.getElementById('showPresetsBtn');
    if (showPresetsBtn) {
        showPresetsBtn.addEventListener('click', () => {
            this.cargarUi();
        });
    }
  }

  // ----------------------------
  // UI: crear y mostrar el drawer
  // ----------------------------
  cargarUi() {
    if (this._modal) return;  // ya abierto
    // Crear contenedor
    const modal = document.createElement('div');
    modal.classList.add('pm-modal');
    modal.id = "showPresetsBtn";
    modal.innerHTML = `
      <div class="pm-header">
        <h3>🎨 Finalizar configuración</h3>
        <button class="pm-close-btn">&times;</button>
      </div>
      <div class="pm-body">
        <p class="pm-info">💡 Debes guardar al menos una preconfiguración antes de finalizar.</p>
        <div class="pm-vinculos-block">
          <div class="pm-vinculos-header">
            <span>🔗 Vínculos actuales</span>
            <div class="pm-action-buttons">
              <button class="pm-clear-vinculos-btn" title="Limpiar vínculos">🧹 Limpiar</button>
              <button class="pm-save-preset-btn" title="Guardar preset">💾 Guardar</button>
            </div>
          </div>
          <div class="pm-vinculos-list"></div>
        </div>
        <div class="pm-presets-block">
          <span>📚 Presets guardados</span>
          <div class="pm-presets-list"></div>
        </div>
      </div>
    `;

    // Append to modal overlay instead of body
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.appendChild(modal);
    } else {
        document.body.appendChild(modal);
    }

    // Guardamos referencias
    this._modal = modal;
    this._listaContainer = null; // Ya no se usa
    this._vinculosContainer = modal.querySelector('.pm-vinculos-list');
    this._presetsContainer = modal.querySelector('.pm-presets-list');

    // Eventos
    modal.querySelector('.pm-close-btn')
         .addEventListener('click', () => this.borrarUi());
    modal.querySelector('.pm-clear-vinculos-btn')
         .addEventListener('click', () => this.limpiarVinculos());
    modal.querySelector('.pm-save-preset-btn')
         .addEventListener('click', () => this._guardarPreset());

    // Entrada animada
    requestAnimationFrame(() => modal.classList.add('visible'));

    // Render inicial
    this._renderVinculos();
    this._renderPresets();
  }

  // --------------------------------
  // UI: esconder y destruir el drawer
  // --------------------------------
  borrarUi() {
    if (!this._modal) return;
    const modal = this._modal;
    modal.classList.remove('visible');
    modal.addEventListener('transitionend', () => modal.remove(), { once: true });
    this._modal = null;
    this._vinculosContainer = null;
    this._presetsContainer = null;
  }

  // Renderiza la lista de vínculos actuales
  _renderVinculos() {
    if (!this._vinculosContainer) return;
    this._vinculosContainer.innerHTML = '';
    if (this.VinculosActuales.length === 0) {
      this._vinculosContainer.innerHTML = `<p class="pm-empty">– Sin vínculos –</p>`;
      return;
    }
    this.VinculosActuales.forEach(v => {
      const item = document.createElement('div');
      item.classList.add('pm-vinculo-item');
      item.innerHTML = `
        <div class="pm-vinculo-label">
          <div>UUID: <code>${v.uuid}</code></div>
          <div><span class="pm-vinculo-arrow">→</span> SKU: <b>${v.sku}</b></div>
        </div>
        <button class="pm-remove-vinculo-btn" title="Eliminar vínculo">❌ Eliminar</button>
      `;
      item.querySelector('.pm-remove-vinculo-btn')
          .addEventListener('click', () => this.removeVinculo(v.uuid));
      this._vinculosContainer.appendChild(item);
    });
  }

  // Renderiza la lista de presets guardados
  _renderPresets() {
    if (!this._presetsContainer) return;
    this._presetsContainer.innerHTML = '';
    if (this.Presets.length === 0) {
      this._presetsContainer.innerHTML = `<p class="pm-empty">– Ningún preset guardado aún –</p>`;
      document.querySelector('#nextStep').disabled = true;
      return;
    }
    this.Presets.forEach((preset, i) => {
      const item = document.createElement('div');
      item.classList.add('pm-preset-item');
      item.innerHTML = `
        <span class="pm-preset-label">Preset ${i + 1} (${preset.length} vínculos)</span>
        <div class="pm-preset-actions">
          <button class="pm-load-preset-btn" title="Cargar preset">🔄 Cargar</button>
          <button class="pm-delete-preset-btn" title="Borrar preset">🗑️ Borrar</button>
        </div>
      `;
      item.querySelector('.pm-load-preset-btn')
          .addEventListener('click', () => this._cargarPreset(i));
      item.querySelector('.pm-delete-preset-btn')
          .addEventListener('click', () => this._borrarPreset(i));
      this._presetsContainer.appendChild(item);
    });
    document.querySelector('#nextStep').disabled = false;
  }

  // --------------------------
  // Interno: guardar un preset
  // --------------------------
  _guardarPreset() {
    if (!this.VinculosActuales.length) {
      this.mostrarMensaje('No hay vínculos para guardar', 'error');
      return;
    }
    // Guardar copia profunda
    const nuevo = this.VinculosActuales.map(v => ({ uuid: v.uuid, sku: v.sku }));
    this.Presets.push(nuevo);
    this.mostrarMensaje('Preset guardado', 'success');
    this.VinculosActuales = [];
    this._renderVinculos();
    this._renderPresets();  
    window.adminInterface.experienceManager.modelViewer.cleanModel();    // Deshabilitar botón si no hay presets
    if (this.Presets.length === 0) {
      document.querySelector('#nextStep').disabled = true;
    }
  }

  // Cargar un preset en la lista de vínculos actuales
  _cargarPreset(idx) {
    if (!this.Presets[idx]) return;
    this.VinculosActuales = this.Presets[idx].map(v => ({ uuid: v.uuid, sku: v.sku }));
    window.adminInterface.experienceManager.modelViewer.cargarVinculos(this.VinculosActuales);
    this._renderVinculos();
    this.mostrarMensaje('Preset cargado', 'info');
  }

  // Borrar un preset con confirmación
  _borrarPreset(idx) {
    if (!this.Presets[idx]) return;
    this.mostrarMensaje('Haz clic de nuevo para confirmar el borrado', 'error', 2000);
    // Confirmación doble clic
    const item = this._presetsContainer.children[idx];
    const btn = item.querySelector('.pm-delete-preset-btn');
    const confirmHandler = () => {
      this.Presets.splice(idx, 1);
      this._renderPresets();
      this.mostrarMensaje('Preset eliminado', 'info');
      btn.removeEventListener('click', confirmHandler);
    };
    btn.addEventListener('click', confirmHandler);
  }

  // -------------------------------------
  // API pública: actualizar selección actual
  // -------------------------------------
  setSeleccionActual(arrayDeObjetos) {
    this.SeleccionObjetos = arrayDeObjetos;
  }

  // --------------------------------------------------
  // Toast: mensaje temporal flotante (éxito/error/info)
  // --------------------------------------------------
  mostrarMensaje(text, tipo = 'info', duracion = 3000) {
    const toast = document.createElement('div');
    toast.classList.add('pm-toast', `pm-toast--${tipo}`);
    toast.textContent = text;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));

    setTimeout(() => {
      toast.classList.remove('visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duracion);
  }

  inyectarCss() {
    if (document.getElementById('pm-styles')) return;

    const style = document.createElement('style');
    style.id = 'pm-styles';
    style.textContent = `
  /* Presets Manager Modal - Modern Material Design Style */
  .pm-modal {
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    background: white;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    border-radius: 12px 0 0 12px;
    z-index: 2001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .pm-modal.visible {
    transform: translateX(0);
  }
  
  /* Header */
  .pm-header {
    padding: 1.5rem 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-bottom: none;
    border-radius: 12px 0 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .pm-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: white;
  }
  
  .pm-close-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    font-size: 1.5rem;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .pm-close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  /* Body */
  .pm-body {
    flex: 1;
    padding: 1.5rem 2rem;
    overflow-y: auto;
    background: #f8fafc;
  }
  
  .pm-info {
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #e0f2fe;
    border-radius: 8px;
    border-left: 4px solid #0ea5e9;
  }
  
  /* Vinculos Section */
  .pm-vinculos-block {
    margin-bottom: 2rem;
    background: white;
    border-radius: 12px;
    padding: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }
  
  .pm-vinculos-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    background: #f1f5f9;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 600;
    color: #1e293b;
  }
  
  .pm-vinculos-header span {
    font-size: 0.875rem;
  }
  
  .pm-vinculos-header .pm-action-buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  .pm-clear-vinculos-btn, .pm-save-preset-btn {
    background: #3b82f6;
    border: none;
    color: white;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .pm-clear-vinculos-btn {
    background: #ef4444;
  }
  
  .pm-clear-vinculos-btn:hover {
    background: #dc2626;
    transform: translateY(-1px);
  }
  
  .pm-save-preset-btn:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }
  
  .pm-vinculos-list {
    padding: 0;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .pm-vinculo-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
    font-size: 0.8rem;
    background: white;
    transition: background 0.2s ease;
  }
  
  .pm-vinculo-item:hover {
    background: #f8fafc;
  }
  
  .pm-vinculo-item:last-child {
    border-bottom: none;
  }
  
  .pm-vinculo-label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }
  
  .pm-vinculo-label code {
    background: #f1f5f9;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #475569;
    font-family: 'SF Mono', Monaco, monospace;
  }
  
  .pm-vinculo-arrow {
    color: #3b82f6;
    font-weight: bold;
    margin: 0 0.5rem;
  }
  
  .pm-remove-vinculo-btn {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .pm-remove-vinculo-btn:hover {
    background: #dc2626;
    color: white;
    transform: translateY(-1px);
  }
  
  /* Presets Section */
  .pm-presets-block {
    background: white;
    border-radius: 12px;
    padding: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }
  
  .pm-presets-block > span {
    display: block;
    padding: 1rem 1.5rem;
    background: #f1f5f9;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 600;
    color: #1e293b;
    font-size: 0.875rem;
  }
  
  .pm-presets-list {
    padding: 0;
    max-height: 300px;
    overflow-y: auto;
  }
  
  .pm-preset-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
    background: white;
    transition: background 0.2s ease;
  }
  
  .pm-preset-item:hover {
    background: #f8fafc;
  }
  
  .pm-preset-item:last-child {
    border-bottom: none;
  }
  
  .pm-preset-label {
    font-weight: 600;
    color: #1e293b;
    font-size: 0.875rem;
  }
  
  .pm-preset-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .pm-preset-actions button {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #475569;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .pm-load-preset-btn:hover {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
    transform: translateY(-1px);
  }
  
  .pm-delete-preset-btn:hover {
    background: #dc2626;
    color: white;
    border-color: #dc2626;
    transform: translateY(-1px);
  }
  
  /* Toast Messages */
  .pm-toast {
    position: fixed;
    top: 20px;
    right: 50%;
    transform: translateX(50%);
    padding: 0.75rem 1.25rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .pm-toast.visible {
    opacity: 1;
    transform: translateX(50%) translateY(10px);
  }
  
  .pm-toast--success {
    background: #10b981;
    color: white;
  }
  
  .pm-toast--error {
    background: #ef4444;
    color: white;
  }
  
  .pm-toast--info {
    background: #3b82f6;
    color: white;
  }
  
  /* Empty States */
  .pm-empty {
    color: #94a3b8;
    font-style: italic;
    text-align: center;
    padding: 2rem 1rem;
    font-size: 0.875rem;
  }
  
  /* Scrollbars */
  .pm-vinculos-list::-webkit-scrollbar,
  .pm-presets-list::-webkit-scrollbar {
    width: 6px;
  }
  
  .pm-vinculos-list::-webkit-scrollbar-track,
  .pm-presets-list::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  
  .pm-vinculos-list::-webkit-scrollbar-thumb,
  .pm-presets-list::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  
  .pm-vinculos-list::-webkit-scrollbar-thumb:hover,
  .pm-presets-list::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .pm-modal {
      width: 100%;
      border-radius: 0;
    }
    
    .pm-header {
      border-radius: 0;
    }
  }
  `;

    document.head.appendChild(style);
  }
}

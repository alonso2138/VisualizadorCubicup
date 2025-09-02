# Sistema de Envío de Datos del Proyecto

## Descripción

El sistema permite enviar los datos del proyecto actual (materiales aplicados) a través de un modal con interfaz de usuario. Se compone de:

1. **Botón flotante**: "📤 Enviar Proyecto" en la interfaz principal
2. **Modal**: Formulario con campos para código del proyecto y nombre de estancia
3. **API endpoint**: `/api/project-data` para procesar los datos enviados

## Componentes

### SendProjectData Class

**Ubicación**: `src/ui/components/SendProjectData.js`

**Funcionalidades**:
- Crea botón flotante en la interfaz
- Gestiona modal con formulario
- Maneja validación de datos
- Envía datos al backend
- Integra con sistema de notificaciones existente

**Métodos principales**:
- `actualizarDatos(datos)`: Actualiza el array de elementos cuando se modifica la escena
- `mandarDatos()`: Envía los datos al servidor
- `showModal()` / `hideModal()`: Controla la visibilidad del modal

### Integración con ClientInterface

El componente se inicializa automáticamente en `ClientInterface.js` y se actualiza cada vez que se aplican materiales a la escena.

## Datos Enviados

### Formato JSON:
```json
{
  "code": "ES-V-25-281",
  "siteName": "Baño 1",
  "items": [
    { "sku": "material_001" },
    { "sku": "material_002" }
  ]
}
```

### Campos:
- **code**: Código del proyecto (introducido manualmente)
- **siteName**: Nombre de la estancia (introducido manualmente)
- **items**: Array de objetos con SKU de materiales aplicados (actualizado automáticamente)

## API Endpoint

### POST `/api/project-data`

**Archivo**: `routes/projectData.js`

**Funcionalidad**:
- Valida datos requeridos
- Registra información en logs
- Retorna confirmación de éxito

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Datos del proyecto recibidos correctamente",
  "data": {
    "code": "ES-V-25-281",
    "siteName": "Baño 1", 
    "itemsCount": 5,
    "timestamp": "2025-01-01T12:00:00.000Z"
  }
}
```

## Estilos CSS

Los estilos del modal están definidos en `public/estilo_config.css` con:
- Diseño responsivo
- Efectos de transición
- Glassmorphism y blur effects
- Compatibilidad móvil

## Uso

1. **Aplicar materiales**: Los materiales se aplican normalmente en la escena
2. **Abrir modal**: Hacer clic en el botón "📤 Enviar Proyecto"
3. **Completar formulario**: 
   - Código del proyecto: Ej. "ES-V-25-281"
   - Nombre de estancia: Ej. "Baño 1", "Cocina Principal"
4. **Enviar**: Los datos se envían automáticamente al backend

## Integración con otros sistemas

El endpoint `/api/project-data` puede ser fácilmente modificado para:
- Guardar en base de datos
- Enviar a API externa
- Generar informes
- Triggear workflows
- Integrar con sistemas ERP/CRM

## Funcionalidades adicionales

- **Validación**: Campos requeridos con mensajes de error
- **Loading states**: Indicadores visuales durante envío
- **Undo system**: Integrado con sistema de deshacer existente
- **Responsive**: Compatible con dispositivos móviles
- **Cleanup**: Destrucción automática al cerrar la aplicación

## Logging

Los datos enviados se registran en la consola del servidor para debugging:
```
Datos del proyecto recibidos: {
  code: 'ES-V-25-281',
  siteName: 'Baño 1',
  itemsCount: 5,
  timestamp: '2025-01-01T12:00:00.000Z'
}
```

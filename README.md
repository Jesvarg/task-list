# 📝 Lista de Tareas

Una aplicación web moderna para gestionar tareas con prioridades, construida con HTML, CSS, JavaScript (frontend) y Flask con SQLAlchemy (backend).

## ✨ Características

- ✅ **Gestión completa de tareas**: Agregar, editar y eliminar tareas
- 🎯 **Sistema de prioridades**: Baja (🟢), Media (🟡), Alta (🔴)
- 🔍 **Búsqueda en tiempo real**: Encuentra tareas rápidamente
- 📄 **Paginación**: Navegación eficiente con 6 tareas por página
- 🎨 **Interfaz responsive**: Diseño adaptable con CSS Grid
- 📊 **Estadísticas**: Contador de tareas por prioridad
- ✅ **Validaciones**: Frontend y backend con prevención de duplicados
- 🔔 **Notificaciones**: Alertas elegantes con SweetAlert2 y Toastr
- 💾 **Base de datos**: SQLite con SQLAlchemy ORM
- 🚀 **API REST**: Endpoints completos para todas las operaciones

## 🏗️ Estructura del Proyecto
task-list/
├── index.html
├── style.css
├── script.js
├── backend/
    ├── app.py
    └── requirements.txt
├── README.md
└── .gitignore


## Instalación y Uso


### Configuración del Backend

1. Navega al directorio del backend:
   ```bash
   cd backend
   ```

2. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```

### Ejecución del Backend

1. Asegúrate de que el servidor Flask esté en ejecución. Puedes hacerlo ejecutando:
   ```bash
   python app.py
   ```

### Uso de la Aplicación

1. Abre `index.html` en tu navegador web.
2. Agrega tareas con título y prioridad.

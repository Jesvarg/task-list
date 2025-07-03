// Configuración de toastr
toastr.options = {
    "closeButton": true,
    "progressBar": true,
    "positionClass": "toast-top-right",
    "timeOut": "3000",
    "preventDuplicates": true,
    "showMethod": "slideDown",
    "hideMethod": "slideUp"
};

class TaskManager {
    constructor() {
        this.baseUrl = 'http://localhost:5000/api';
        this.currentFilter = 'all';
        this.currentPage = 1;
        this.perPage = 6;
        this.searchQuery = '';
        this.searchTimeout = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTasks();
        this.loadStats();
    }

    bindEvents() {
        // Evento del formulario
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Contador de caracteres
        const titleInput = document.getElementById('title');
        titleInput.addEventListener('input', (e) => {
            const count = e.target.value.length;
            document.getElementById('charCount').textContent = count;
            
            if (count > 100) {
                e.target.value = e.target.value.substring(0, 100);
                document.getElementById('charCount').textContent = 100;
            }
        });

        // Eventos de filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveFilter(e.target);
                const priority = e.target.dataset.priority || 'all';
                this.currentFilter = priority;
                this.currentPage = 1;
                this.loadTasks();
            });
        });

        // Evento de búsqueda
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.searchQuery = e.target.value.trim();
                this.currentPage = 1;
                this.loadTasks();
            }, 500);
        });

        // Eventos de paginación
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadTasks();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            this.currentPage++;
            this.loadTasks();
        });
    }

    setActiveFilter(activeBtn) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    async loadTasks() {
        try {
            this.showLoading(true);
            
            let url = `${this.baseUrl}/tasks?page=${this.currentPage}&per_page=${this.perPage}`;
            
            if (this.currentFilter !== 'all') {
                url += `&priority=${this.currentFilter}`;
            }
            
            if (this.searchQuery) {
                url += `&search=${encodeURIComponent(this.searchQuery)}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Error al cargar las tareas');
            }

            const data = await response.json();
            this.renderTasks(data.tasks);
            this.renderPagination(data.pagination);
            this.loadStats();
        } catch (error) {
            console.error('Error:', error);
            this.showErrorToast('Error al cargar las tareas');
        } finally {
            this.showLoading(false);
        }
    }

    async loadStats() {
        try {
            const response = await fetch(`${this.baseUrl}/tasks/stats`);
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('totalTasks').textContent = stats.total;
                document.getElementById('altaTasks').textContent = stats.alta;
                document.getElementById('mediaTasks').textContent = stats.media;
                document.getElementById('bajaTasks').textContent = stats.baja;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async addTask() {
        const titleInput = document.getElementById('title');
        const prioritySelect = document.getElementById('priority');
        const errorDiv = document.getElementById('errorMessage');

        // Limpiar mensaje de error previo
        errorDiv.classList.add('hidden');
        errorDiv.textContent = '';

        const title = titleInput.value.trim();
        const priority = prioritySelect.value;

        // Validación frontend
        if (!title) {
            this.showError('El título es obligatorio');
            return;
        }

        if (title.length < 3) {
            this.showError('El título debe tener al menos 3 caracteres');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, priority })
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || 'Error al agregar la tarea');
            }

            // Mostrar mensaje de éxito
            toastr.success('¡Tarea agregada exitosamente!', 'Éxito');
            
            // Limpiar formulario
            titleInput.value = '';
            prioritySelect.value = 'baja';
            document.getElementById('charCount').textContent = '0';
            
            // Recargar tareas
            this.currentPage = 1;
            this.loadTasks();
        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
        }
    }

    async deleteTask(taskId) {
        // Usar SweetAlert2 para confirmación bonita
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'No podrás recuperarla',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Error al eliminar la tarea');
            }

            // Mostrar mensaje de éxito
            toastr.success('¡Tarea eliminada exitosamente!', 'Eliminada');
            this.loadTasks();
        } catch (error) {
            console.error('Error:', error);
            this.showErrorToast('Error al eliminar la tarea');
        }
    }

    // Agregar después del método deleteTask
    async editTask(taskId, currentTitle, currentPriority) {
        const { value: formValues } = await Swal.fire({
            title: 'Editar Tarea',
            html: `
                <div class="text-left">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Título:</label>
                    <input id="swal-input1" class="swal2-input" value="${this.escapeHtml(currentTitle)}" maxlength="100">
                    <label class="block text-sm font-medium text-gray-700 mb-2 mt-4">Prioridad:</label>
                    <select id="swal-input2" class="swal2-select">
                        <option value="baja" ${currentPriority === 'baja' ? 'selected' : ''}>🟢 Baja</option>
                        <option value="media" ${currentPriority === 'media' ? 'selected' : ''}>🟡 Media</option>
                        <option value="alta" ${currentPriority === 'alta' ? 'selected' : ''}>🔴 Alta</option>
                    </select>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3b82f6',
            preConfirm: () => {
                const title = document.getElementById('swal-input1').value.trim();
                const priority = document.getElementById('swal-input2').value;
                
                if (!title) {
                    Swal.showValidationMessage('El título es obligatorio');
                    return false;
                }
                
                if (title.length < 3) {
                    Swal.showValidationMessage('El título debe tener al menos 3 caracteres');
                    return false;
                }
                
                return { title, priority };
            }
        });
    
        if (formValues) {
            try {
                const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formValues)
                });
    
                const responseData = await response.json();
    
                if (!response.ok) {
                    throw new Error(responseData.error || 'Error al actualizar la tarea');
                }
    
                toastr.success('¡Tarea actualizada exitosamente!', 'Actualizada');
                this.loadTasks();
            } catch (error) {
                console.error('Error:', error);
                this.showErrorToast(error.message);
            }
        }
    }
    
    // Actualizar el método renderTasks para incluir botón de editar
    renderTasks(tasks) {
        const taskList = document.getElementById('taskList');
        const emptyState = document.getElementById('emptyState');
    
        if (tasks.length === 0) {
            taskList.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
    
        emptyState.classList.add('hidden');
        taskList.innerHTML = tasks.map(task => `
            <li class="task-item">
                <div class="task-content">
                    <div class="task-info">
                        <div class="task-title">
                            <span class="icon">
                                ${task.priority === 'alta' ? '🔴' : task.priority === 'media' ? '🟡' : '🟢'}
                            </span>
                            ${this.escapeHtml(task.title)}
                        </div>
                        <div class="task-meta">
                            <span class="task-priority ${task.priority}">
                                ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Prioridad
                            </span>
                            <span class="task-date">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                ${this.formatDate(task.created_at)}
                            </span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button onclick="taskManager.editTask(${task.id}, '${this.escapeHtml(task.title)}', '${task.priority}')" 
                                class="btn-edit" title="Editar tarea">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="taskManager.deleteTask(${task.id})" 
                                class="btn-delete" title="Eliminar tarea">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </li>
        `).join('');
    }

    renderPagination(pagination) {
        const paginationDiv = document.getElementById('pagination');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const currentPageSpan = document.getElementById('currentPage');
        const totalPagesSpan = document.getElementById('totalPages');

        if (pagination.total_pages <= 1) {
            paginationDiv.classList.add('hidden');
            return;
        }

        paginationDiv.classList.remove('hidden');
        currentPageSpan.textContent = pagination.current_page;
        totalPagesSpan.textContent = pagination.total_pages;

        prevBtn.disabled = !pagination.has_prev;
        nextBtn.disabled = !pagination.has_next;

        if (pagination.has_prev) {
            prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }

        if (pagination.has_next) {
            nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        const taskContainer = document.getElementById('taskList');
        
        if (show) {
            loadingState.classList.remove('hidden');
            taskContainer.classList.add('hidden');
        } else {
            loadingState.classList.add('hidden');
            taskContainer.classList.remove('hidden');
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        this.showErrorToast(message);
    }

    showErrorToast(message) {
        toastr.error(message, 'Error');
    }

    showSuccessToast(message, title = 'Éxito') {
        toastr.success(message, title);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar la aplicación cuando el DOM esté listo
$(document).ready(function() {
    window.taskManager = new TaskManager();
});
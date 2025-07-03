from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from datetime import datetime
import math
import os

app = Flask(__name__)
CORS(app)  # Permitir CORS para todas las rutas

# Configuración de la base de datos
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "tasks.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'tu-clave-secreta-aqui'

# Inicializar extensiones
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Modelo de Tarea
class Task(db.Model):
    __tablename__ = 'tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    priority = db.Column(db.String(10), nullable=False, default='baja')
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'priority': self.priority,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Task {self.id}: {self.title} ({self.priority}))>'

# Crear tablas al iniciar la aplicación (reemplaza @app.before_first_request)
with app.app_context():
    db.create_all()

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Obtener tareas con filtros, búsqueda y paginado usando SQLAlchemy"""
    try:
        # Parámetros de consulta
        priority_filter = request.args.get('priority')
        search_query = request.args.get('search', '').strip()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 6))
        
        # Construir la consulta base
        query = Task.query
        
        # Filtro por prioridad
        if priority_filter and priority_filter in ['baja', 'media', 'alta']:
            query = query.filter(Task.priority == priority_filter)
        
        # Filtro por búsqueda (case-insensitive)
        if search_query:
            query = query.filter(Task.title.ilike(f'%{search_query}%'))
        
        # Ordenar por fecha de creación (más recientes primero)
        query = query.order_by(Task.created_at.desc())
        
        # Aplicar paginación
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Convertir tareas a diccionarios
        tasks_list = [task.to_dict() for task in pagination.items]
        
        return jsonify({
            'tasks': tasks_list,
            'pagination': {
                'current_page': pagination.page,
                'per_page': pagination.per_page,
                'total_pages': pagination.pages,
                'total_count': pagination.total,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
    
    except ValueError:
        return jsonify({'error': 'Parámetros de paginación inválidos'}), 400
    except Exception as e:
        app.logger.error(f'Error en get_tasks: {str(e)}')
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/api/tasks', methods=['POST'])
def create_task():
    """Crear una nueva tarea con validación de duplicados usando SQLAlchemy"""
    try:
        data = request.get_json()
        
        # Validación de datos
        if not data or 'title' not in data or not data['title'].strip():
            return jsonify({'error': 'El título es obligatorio'}), 400
        
        title = data['title'].strip()
        priority = data.get('priority', 'baja')
        
        # Validar longitud del título
        if len(title) < 3:
            return jsonify({'error': 'El título debe tener al menos 3 caracteres'}), 400
        
        if len(title) > 100:
            return jsonify({'error': 'El título no puede exceder 100 caracteres'}), 400
        
        # Validar prioridad
        if priority not in ['baja', 'media', 'alta']:
            return jsonify({'error': 'Prioridad inválida'}), 400
        
        # Verificar si ya existe una tarea con el mismo título (case-insensitive)
        existing_task = Task.query.filter(Task.title.ilike(title)).first()
        if existing_task:
            return jsonify({'error': 'Ya existe una tarea con este título'}), 409
        
        # Crear nueva tarea
        new_task = Task(
            title=title,
            priority=priority
        )
        
        # Guardar en la base de datos
        db.session.add(new_task)
        db.session.commit()
        
        return jsonify(new_task.to_dict()), 201
    
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Error en create_task: {str(e)}')
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Actualizar una tarea existente"""
    try:
        task = Task.query.get_or_404(task_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        # Actualizar título si se proporciona
        if 'title' in data:
            title = data['title'].strip()
            
            if not title:
                return jsonify({'error': 'El título es obligatorio'}), 400
            
            if len(title) < 3:
                return jsonify({'error': 'El título debe tener al menos 3 caracteres'}), 400
            
            if len(title) > 100:
                return jsonify({'error': 'El título no puede exceder 100 caracteres'}), 400
            
            # Verificar duplicados (excluyendo la tarea actual)
            existing_task = Task.query.filter(
                Task.title.ilike(title),
                Task.id != task_id
            ).first()
            
            if existing_task:
                return jsonify({'error': 'Ya existe una tarea con este título'}), 409
            
            task.title = title
        
        # Actualizar prioridad si se proporciona
        if 'priority' in data:
            priority = data['priority']
            if priority not in ['baja', 'media', 'alta']:
                return jsonify({'error': 'Prioridad inválida'}), 400
            task.priority = priority
        
        # Actualizar timestamp
        task.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify(task.to_dict())
    
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Error en update_task: {str(e)}')
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Eliminar una tarea usando SQLAlchemy"""
    try:
        task = Task.query.get_or_404(task_id)
        
        db.session.delete(task)
        db.session.commit()
        
        return jsonify({'message': 'Tarea eliminada exitosamente'}), 200
    
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Error en delete_task: {str(e)}')
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/api/tasks/stats', methods=['GET'])
def get_stats():
    """Obtener estadísticas de las tareas usando SQLAlchemy"""
    try:
        stats = {
            'total': Task.query.count(),
            'alta': Task.query.filter(Task.priority == 'alta').count(),
            'media': Task.query.filter(Task.priority == 'media').count(),
            'baja': Task.query.filter(Task.priority == 'baja').count()
        }
        
        return jsonify(stats)
    
    except Exception as e:
        app.logger.error(f'Error en get_stats: {str(e)}')
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint de verificación de salud"""
    try:
        # Verificar conexión a la base de datos
        db.session.execute(db.text('SELECT 1'))
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

# Manejadores de errores
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Recurso no encontrado'}), 404

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Solicitud incorrecta'}), 400

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Error interno del servidor'}), 500

if __name__ == '__main__':
    # Configurar logging
    import logging
    logging.basicConfig(level=logging.INFO)
    
    # Ejecutar la aplicación
    app.run(debug=True, host='0.0.0.0', port=5000)
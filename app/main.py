"""
Sistema de Tránsito de Medellín - Aplicación Web
Backend Flask con PostgreSQL
"""
import os
from datetime import datetime, date, time
from decimal import Decimal
from flask import Flask, render_template, request, jsonify, send_from_directory
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool

app = Flask(__name__)
app.config['SECRET_KEY'] = 'transito-medellin-2025'

# Pool de conexiones a PostgreSQL
db_pool = SimpleConnectionPool(
    1, 20,
    host=os.getenv('DB_HOST', 'postgres'),
    port=os.getenv('DB_PORT', '5432'),
    database=os.getenv('DB_NAME', 'transito_db'),
    user=os.getenv('DB_USER', 'transito_user'),
    password=os.getenv('DB_PASSWORD', 'transito_pass')
)


def get_db():
    """Obtiene una conexión del pool"""
    return db_pool.getconn()


def release_db(conn):
    """Devuelve la conexión al pool"""
    db_pool.putconn(conn)


def serialize_value(value):
    """Convierte tipos no-JSON a serializables"""
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, time):
        return value.strftime('%H:%M:%S')
    if isinstance(value, Decimal):
        return float(value)
    return value


def serialize_row(row):
    """Serializa una fila de resultados"""
    if not row:
        return None
    return {k: serialize_value(v) for k, v in row.items()}


@app.route('/')
def index():
    """Página principal"""
    return render_template('index.html')


@app.route('/static/<path:filename>')
def static_files(filename):
    """Sirve archivos estáticos"""
    return send_from_directory('static', filename)


# ============================================================================
# ENDPOINTS DE CONSULTA
# ============================================================================

@app.route('/api/vehiculos', methods=['GET'])
def get_vehiculos():
    """Lista todos los vehículos con información de oficina"""
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT v.num_placa, v.serie_motor, v.marca, v.modelo, 
                       v.anio_fabricacion, v.valor_vehiculo, v.numero_seguro,
                       v.cod_oficina, o.nombre AS nombre_oficina,
                       COUNT(DISTINCT vp.cedula) AS num_propietarios,
                       COUNT(DISTINCT i.cod_infraccion) AS num_infracciones,
                       COUNT(DISTINCT va.nro_acta) AS num_accidentes
                FROM transito.vehiculo v
                JOIN transito.oficina_transito o USING (cod_oficina)
                LEFT JOIN transito.vehiculo_propietario vp USING (num_placa)
                LEFT JOIN transito.infraccion i USING (num_placa)
                LEFT JOIN transito.vehiculo_accidente va USING (num_placa)
                GROUP BY v.num_placa, v.serie_motor, v.marca, v.modelo,
                         v.anio_fabricacion, v.valor_vehiculo, v.numero_seguro,
                         v.cod_oficina, o.nombre
                ORDER BY v.num_placa
            """)
            vehiculos = [serialize_row(row) for row in cur.fetchall()]
        return jsonify({'success': True, 'data': vehiculos})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        release_db(conn)


@app.route('/api/vehiculos/<placa>', methods=['GET'])
def get_vehiculo(placa):
    """Obtiene información detallada de un vehículo"""
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Información básica
            cur.execute("""
                SELECT v.*, o.nombre AS nombre_oficina
                FROM transito.vehiculo v
                JOIN transito.oficina_transito o USING (cod_oficina)
                WHERE v.num_placa = %s
            """, (placa,))
            vehiculo = serialize_row(cur.fetchone())
            
            if not vehiculo:
                return jsonify({'success': False, 'error': 'Vehículo no encontrado'}), 404
            
            # Propietarios
            cur.execute("""
                SELECT p.cedula, p.nombre, p.direccion, p.telefono,
                       vp.fecha_inicio, vp.es_propietario_principal
                FROM transito.propietario p
                JOIN transito.vehiculo_propietario vp USING (cedula)
                WHERE vp.num_placa = %s
                ORDER BY vp.es_propietario_principal DESC, vp.fecha_inicio DESC
            """, (placa,))
            vehiculo['propietarios'] = [serialize_row(row) for row in cur.fetchall()]
            
            # Infracciones
            cur.execute("""
                SELECT i.cod_infraccion, i.fecha_infraccion, i.hora_infraccion,
                       i.cod_agente, a.nombre AS nombre_agente,
                       array_agg(n.nombre) AS normas_violadas,
                       SUM(n.valor_multa) AS total_multa
                FROM transito.infraccion i
                JOIN transito.agente_transito a USING (cod_agente)
                LEFT JOIN transito.infraccion_norma ino ON i.cod_infraccion = ino.cod_infraccion
                LEFT JOIN transito.norma_transito n ON ino.cod_norma = n.cod_norma
                WHERE i.num_placa = %s
                GROUP BY i.cod_infraccion, i.fecha_infraccion, i.hora_infraccion,
                         i.cod_agente, a.nombre
                ORDER BY i.fecha_infraccion DESC, i.hora_infraccion DESC
            """, (placa,))
            vehiculo['infracciones'] = [serialize_row(row) for row in cur.fetchall()]
            
            # Accidentes
            cur.execute("""
                SELECT ac.nro_acta, ac.fecha_accidente, ac.hora_accidente,
                       ac.descripcion, ac.cod_zona, z.sector,
                       ac.cod_agente, ag.nombre AS nombre_agente
                FROM transito.accidente ac
                JOIN transito.zona z USING (cod_zona)
                JOIN transito.agente_transito ag ON ac.cod_agente = ag.cod_agente
                JOIN transito.vehiculo_accidente va ON ac.nro_acta = va.nro_acta
                WHERE va.num_placa = %s
                ORDER BY ac.fecha_accidente DESC, ac.hora_accidente DESC
            """, (placa,))
            vehiculo['accidentes'] = [serialize_row(row) for row in cur.fetchall()]
            
        return jsonify({'success': True, 'data': vehiculo})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        release_db(conn)


@app.route('/api/propietarios', methods=['GET'])
def get_propietarios():
    """Lista todos los propietarios"""
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT p.cedula, p.nombre, p.direccion, p.telefono,
                       COUNT(DISTINCT vp.num_placa) AS num_vehiculos,
                       COUNT(DISTINCT au.nro_audiencia) AS num_audiencias
                FROM transito.propietario p
                LEFT JOIN transito.vehiculo_propietario vp USING (cedula)
                LEFT JOIN transito.audiencia au USING (cedula)
                GROUP BY p.cedula, p.nombre, p.direccion, p.telefono
                ORDER BY p.nombre
            """)
            propietarios = [serialize_row(row) for row in cur.fetchall()]
        return jsonify({'success': True, 'data': propietarios})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        release_db(conn)


@app.route('/api/infracciones', methods=['GET'])
def get_infracciones():
    """Lista todas las infracciones"""
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT i.cod_infraccion, i.fecha_infraccion, i.hora_infraccion,
                       i.num_placa, v.marca, v.modelo,
                       i.cod_agente, a.nombre AS nombre_agente,
                       array_agg(n.nombre ORDER BY n.nombre) AS normas_violadas,
                       SUM(n.valor_multa) AS total_multa
                FROM transito.infraccion i
                JOIN transito.vehiculo v USING (num_placa)
                JOIN transito.agente_transito a USING (cod_agente)
                LEFT JOIN transito.infraccion_norma ino ON i.cod_infraccion = ino.cod_infraccion
                LEFT JOIN transito.norma_transito n ON ino.cod_norma = n.cod_norma
                GROUP BY i.cod_infraccion, i.fecha_infraccion, i.hora_infraccion,
                         i.num_placa, v.marca, v.modelo, i.cod_agente, a.nombre
                ORDER BY i.fecha_infraccion DESC, i.hora_infraccion DESC
            """)
            infracciones = [serialize_row(row) for row in cur.fetchall()]
        return jsonify({'success': True, 'data': infracciones})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        release_db(conn)


@app.route('/api/accidentes', methods=['GET'])
def get_accidentes():
    """Lista todos los accidentes"""
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT a.nro_acta, a.fecha_accidente, a.hora_accidente,
                       a.descripcion, a.cod_zona, z.sector,
                       a.cod_agente, ag.nombre AS nombre_agente,
                       array_agg(DISTINCT va.num_placa ORDER BY va.num_placa) AS vehiculos,
                       COUNT(DISTINCT va.num_placa) AS num_vehiculos,
                       COUNT(DISTINCT au.nro_audiencia) AS num_audiencias
                FROM transito.accidente a
                JOIN transito.zona z USING (cod_zona)
                JOIN transito.agente_transito ag ON a.cod_agente = ag.cod_agente
                LEFT JOIN transito.vehiculo_accidente va ON a.nro_acta = va.nro_acta
                LEFT JOIN transito.audiencia au ON a.nro_acta = au.nro_acta
                GROUP BY a.nro_acta, a.fecha_accidente, a.hora_accidente,
                         a.descripcion, a.cod_zona, z.sector, a.cod_agente, ag.nombre
                ORDER BY a.fecha_accidente DESC, a.hora_accidente DESC
            """)
            accidentes = [serialize_row(row) for row in cur.fetchall()]
        return jsonify({'success': True, 'data': accidentes})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        release_db(conn)


@app.route('/api/estadisticas', methods=['GET'])
def get_estadisticas():
    """Obtiene estadísticas del sistema"""
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Conteos generales
            cur.execute("""
                SELECT
                    (SELECT COUNT(*) FROM transito.vehiculo) AS total_vehiculos,
                    (SELECT COUNT(*) FROM transito.propietario) AS total_propietarios,
                    (SELECT COUNT(*) FROM transito.infraccion) AS total_infracciones,
                    (SELECT COUNT(*) FROM transito.accidente) AS total_accidentes,
                    (SELECT COUNT(*) FROM transito.agente_transito) AS total_agentes,
                    (SELECT SUM(valor_multa) FROM transito.norma_transito n
                     JOIN transito.infraccion_norma ino USING (cod_norma)) AS total_multas
            """)
            estadisticas = serialize_row(cur.fetchone())
            
            # Infracciones por mes
            cur.execute("""
                SELECT TO_CHAR(fecha_infraccion, 'YYYY-MM') AS mes,
                       COUNT(*) AS total
                FROM transito.infraccion
                GROUP BY TO_CHAR(fecha_infraccion, 'YYYY-MM')
                ORDER BY mes DESC
                LIMIT 12
            """)
            estadisticas['infracciones_por_mes'] = [serialize_row(row) for row in cur.fetchall()]
            
            # Accidentes por zona
            cur.execute("""
                SELECT z.sector, COUNT(*) AS total
                FROM transito.accidente a
                JOIN transito.zona z USING (cod_zona)
                GROUP BY z.sector
                ORDER BY total DESC
            """)
            estadisticas['accidentes_por_zona'] = [serialize_row(row) for row in cur.fetchall()]
            
            # Top infracciones
            cur.execute("""
                SELECT n.nombre, COUNT(*) AS total, SUM(n.valor_multa) AS total_multas
                FROM transito.infraccion_norma ino
                JOIN transito.norma_transito n USING (cod_norma)
                GROUP BY n.nombre, n.cod_norma
                ORDER BY total DESC
                LIMIT 5
            """)
            estadisticas['top_infracciones'] = [serialize_row(row) for row in cur.fetchall()]
            
            # Vehículos con más infracciones
            cur.execute("""
                SELECT v.num_placa, v.marca, v.modelo, COUNT(*) AS total_infracciones
                FROM transito.infraccion i
                JOIN transito.vehiculo v USING (num_placa)
                GROUP BY v.num_placa, v.marca, v.modelo
                ORDER BY total_infracciones DESC
                LIMIT 5
            """)
            estadisticas['vehiculos_problematicos'] = [serialize_row(row) for row in cur.fetchall()]
            
        return jsonify({'success': True, 'data': estadisticas})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        release_db(conn)


# ============================================================================
# ENDPOINTS DE CREACIÓN
# ============================================================================

@app.route('/api/vehiculos', methods=['POST'])
def create_vehiculo():
    """Crea un nuevo vehículo"""
    conn = get_db()
    try:
        data = request.get_json()
        with conn.cursor() as cur:
            cur.execute("""
                CALL transito.sp_vehiculo_insert(%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                data['num_placa'],
                data['serie_motor'],
                data['marca'],
                data['modelo'],
                data.get('anio_fabricacion'),
                data.get('valor_vehiculo'),
                data.get('numero_seguro'),
                data['cod_oficina']
            ))
            conn.commit()
        return jsonify({'success': True, 'message': 'Vehículo creado exitosamente'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400
    finally:
        release_db(conn)


@app.route('/api/propietarios', methods=['POST'])
def create_propietario():
    """Crea un nuevo propietario"""
    conn = get_db()
    try:
        data = request.get_json()
        with conn.cursor() as cur:
            cur.execute("""
                CALL transito.sp_propietario_insert(%s, %s, %s, %s)
            """, (
                data['cedula'],
                data['nombre'],
                data['direccion'],
                data.get('telefono')
            ))
            conn.commit()
        return jsonify({'success': True, 'message': 'Propietario creado exitosamente'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400
    finally:
        release_db(conn)


@app.route('/api/infracciones', methods=['POST'])
def create_infraccion():
    """Crea una nueva infracción"""
    conn = get_db()
    try:
        data = request.get_json()
        with conn.cursor() as cur:
            cur.execute("""
                CALL transito.sp_infraccion_insert(%s, %s, %s, %s, %s)
            """, (
                data['cod_infraccion'],
                data['fecha_infraccion'],
                data['hora_infraccion'],
                data['num_placa'],
                data['cod_agente']
            ))
            
            # Agregar normas violadas
            if 'normas' in data and data['normas']:
                for cod_norma in data['normas']:
                    cur.execute("""
                        INSERT INTO transito.infraccion_norma (cod_infraccion, cod_norma)
                        VALUES (%s, %s)
                    """, (data['cod_infraccion'], cod_norma))
            
            conn.commit()
        return jsonify({'success': True, 'message': 'Infracción creada exitosamente'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400
    finally:
        release_db(conn)


@app.route('/api/accidentes', methods=['POST'])
def create_accidente():
    """Crea un nuevo accidente"""
    conn = get_db()
    try:
        data = request.get_json()
        with conn.cursor() as cur:
            cur.execute("""
                CALL transito.sp_accidente_insert(%s, %s, %s, %s, %s, %s)
            """, (
                data['nro_acta'],
                data['fecha_accidente'],
                data['hora_accidente'],
                data['descripcion'],
                data['cod_zona'],
                data['cod_agente']
            ))
            
            # Agregar vehículos involucrados
            if 'vehiculos' in data and data['vehiculos']:
                for num_placa in data['vehiculos']:
                    cur.execute("""
                        INSERT INTO transito.vehiculo_accidente (nro_acta, num_placa)
                        VALUES (%s, %s)
                    """, (data['nro_acta'], num_placa))
            
            conn.commit()
        return jsonify({'success': True, 'message': 'Accidente registrado exitosamente'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400
    finally:
        release_db(conn)


# ============================================================================
# ENDPOINTS DE ACTUALIZACIÓN
# ============================================================================

@app.route('/api/vehiculos/<placa>', methods=['PUT'])
def update_vehiculo(placa):
    """Actualiza un vehículo"""
    conn = get_db()
    try:
        data = request.get_json()
        with conn.cursor() as cur:
            cur.execute("""
                CALL transito.sp_vehiculo_update(%s, %s, %s, %s, %s, %s, %s)
            """, (
                placa,
                data.get('marca'),
                data.get('modelo'),
                data.get('anio_fabricacion'),
                data.get('valor_vehiculo'),
                data.get('numero_seguro'),
                data.get('cod_oficina')
            ))
            conn.commit()
        return jsonify({'success': True, 'message': 'Vehículo actualizado exitosamente'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400
    finally:
        release_db(conn)


@app.route('/api/propietarios/<cedula>', methods=['PUT'])
def update_propietario(cedula):
    """Actualiza un propietario"""
    conn = get_db()
    try:
        data = request.get_json()
        with conn.cursor() as cur:
            cur.execute("""
                CALL transito.sp_propietario_update(%s, %s, %s, %s)
            """, (
                cedula,
                data.get('nombre'),
                data.get('direccion'),
                data.get('telefono')
            ))
            conn.commit()
        return jsonify({'success': True, 'message': 'Propietario actualizado exitosamente'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400
    finally:
        release_db(conn)


# ============================================================================
# ENDPOINTS DE ELIMINACIÓN
# ============================================================================

@app.route('/api/vehiculos/<placa>', methods=['DELETE'])
def delete_vehiculo(placa):
    """Elimina un vehículo"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("CALL transito.sp_vehiculo_delete(%s)", (placa,))
            conn.commit()
        return jsonify({'success': True, 'message': 'Vehículo eliminado exitosamente'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400
    finally:
        release_db(conn)


@app.route('/api/propietarios/<cedula>', methods=['DELETE'])
def delete_propietario(cedula):
    """Elimina un propietario"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("CALL transito.sp_propietario_delete(%s)", (cedula,))
            conn.commit()
        return jsonify({'success': True, 'message': 'Propietario eliminado exitosamente'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400
    finally:
        release_db(conn)


# ============================================================================
# DATOS DE REFERENCIA
# ============================================================================

@app.route('/api/referencias/oficinas', methods=['GET'])
def get_oficinas():
    """Lista todas las oficinas de tránsito"""
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM transito.oficina_transito ORDER BY nombre")
            oficinas = [serialize_row(row) for row in cur.fetchall()]
        return jsonify({'success': True, 'data': oficinas})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        release_db(conn)


@app.route('/api/referencias/zonas', methods=['GET'])
def get_zonas():
    """Lista todas las zonas"""
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM transito.zona ORDER BY sector")
            zonas = [serialize_row(row) for row in cur.fetchall()]
        return jsonify({'success': True, 'data': zonas})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        release_db(conn)


@app.route('/api/referencias/agentes', methods=['GET'])
def get_agentes():
    """Lista todos los agentes"""
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT a.*, p.nombre AS nombre_puesto
                FROM transito.agente_transito a
                LEFT JOIN transito.puesto_control p ON a.cod_puesto_actual = p.cod_puesto
                ORDER BY a.nombre
            """)
            agentes = [serialize_row(row) for row in cur.fetchall()]
        return jsonify({'success': True, 'data': agentes})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        release_db(conn)


@app.route('/api/referencias/normas', methods=['GET'])
def get_normas():
    """Lista todas las normas de tránsito"""
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM transito.norma_transito ORDER BY nombre")
            normas = [serialize_row(row) for row in cur.fetchall()]
        return jsonify({'success': True, 'data': normas})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        release_db(conn)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

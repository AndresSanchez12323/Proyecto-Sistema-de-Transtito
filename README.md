
# Proyecto-Sistema-de-Transtito
🚗 Plataforma integral de gestión de tránsito con PostgreSQL + Flask + Docker. CRUD completo, dashboard y datos de ejemplo.
=======
# Sistema de Tránsito de Medellín - Aplicación Web Completa# Sistema de Tránsito - Taller Bases de Datos II



<div align="center">Este repositorio contiene la solución del taller "Sistema de Tránsito" resolviendo las actividades finales con PostgreSQL y Docker. Incluye:



🚦 **Sistema integral de gestión de tránsito con PostgreSQL, Flask y Docker** 🚦- Modelo relacional normalizado que elimina las relaciones muchos a muchos mediante tablas puente dedicadas.

- Script `sql/init.sql` con la creación completa del esquema `transito`, población de la data de ejemplo del taller y procedimientos almacenados CRUD para vehículos, propietarios, infracciones y accidentes.

</div>- Archivo `docker-compose.yml` para orquestar PostgreSQL 16 y ejecutar automáticamente el script de inicialización.



## 📋 Descripción## Requisitos



Sistema web completo para la administración del tránsito de Medellín que incluye:- Docker Engine y Docker Compose Plugin

- (Opcional) Cliente `psql` para pruebas manuales.

- ✅ **Base de datos PostgreSQL normalizada** con esquema completo y procedimientos almacenados

- ✅ **API REST con Flask** para todas las operaciones CRUD## Puesta en marcha

- ✅ **Interfaz web moderna** con dashboard interactivo y gestión completa

- ✅ **pgAdmin** para administración de base de datos1. Levanta la base de datos y pgAdmin:

- ✅ **Docker Compose** para orquestación de todos los servicios   ```powershell

   docker compose up -d

### Características principales   ```

2. Verifica que los contenedores estén arriba:

- 📊 Dashboard con estadísticas en tiempo real   ```powershell

- 🚗 Gestión completa de vehículos, propietarios, infracciones y accidentes   docker ps --filter "name=transito-postgres" --filter "name=transito-pgadmin"

- 🔍 Búsqueda y filtrado en todas las secciones   ```

- 📈 Visualización de datos con gráficos y métricas3. Conéctate a la base (`transito_db`) con las credenciales `transito_user / transito_pass`:

- 🎨 Interfaz moderna con diseño responsive   ```powershell

- 🔐 Conexión segura a PostgreSQL con pool de conexiones   docker exec -it transito-postgres psql -U transito_user -d transito_db

   ```

## 🚀 Inicio Rápido

### Acceso vía pgAdmin

### Requisitos

- Navega a `http://localhost:5050`.

- Docker Desktop (Windows) o Docker Engine + Docker Compose- Inicia sesión con `admin@transito.example.com / transito_pgadmin`.

- Navegador web moderno (Chrome, Firefox, Edge)- Crea un registro de servidor usando:

   - **Name**: PostgreSQL Transito (cualquiera)

### Instalación y Ejecución   - **Host name/address**: `postgres`

   - **Port**: `5432`

1. **Clonar o ubicarse en el directorio del proyecto**   - **Maintenance database**: `transito_db`

   - **Username**: `transito_user`

2. **Levantar todos los servicios**   - **Password**: `transito_pass`

   ```powershell      - Marca "Save password" si deseas conservar la configuración.

   docker compose up -d --build

   ```   Si quieres ejecutar nuevamente `sql/init.sql` desde pgAdmin, abre el Query Tool, presiona el ícono de carpeta y navega a `storage/admin_transito.example.com/sql`. Allí encontrarás el archivo montado en solo lectura; selecciónalo y ejecútalo. También puedes copiar y pegar el contenido directamente en el editor o usar `docker exec -i transito-postgres psql -U transito_user -d transito_db -f /docker-entrypoint-initdb.d/01-init.sql` desde PowerShell.



3. **Verificar que los contenedores estén activos**Al crear el contenedor se ejecutará automáticamente `sql/init.sql`, creando tablas, vistas, datos de ejemplo y procedimientos.

   ```powershell

   docker compose ps## Procedimientos almacenados disponibles

   ```

Todos los procedimientos usan el esquema `transito`. Ejemplo para consultar vehículos:

   Deberías ver 3 contenedores corriendo:

   - `transito-postgres` (Puerto 5432)```sql

   - `transito-webapp` (Puerto 5000)CALL transito.sp_vehiculo_consultar(NULL, 'vehiculos');

   - `transito-pgadmin` (Puerto 5050)FETCH ALL FROM vehiculos;

```

4. **Acceder a la aplicación web**

   Disponible para las entidades indicadas:

   Abre tu navegador en: **http://localhost:5000**

- `sp_vehiculo_insert | update | delete | consultar`

## 🌐 Acceso a los Servicios- `sp_propietario_insert | update | delete | consultar`

- `sp_infraccion_insert | update | delete | consultar`

### Aplicación Web Principal- `sp_accidente_insert | update | delete | consultar`

- **URL**: http://localhost:5000

- **Descripción**: Interfaz completa para gestión del sistemaLos procedimientos `consultar` devuelven un `REFCURSOR` que debe ser leído con `FETCH`.



### pgAdmin (Administración de Base de Datos)## Próximos pasos sugeridos

- **URL**: http://localhost:5050

- **Usuario**: admin@transito.example.com- Agregar procedimientos CRUD para las tablas restantes (audiencias, normas, agentes) si se necesitan operaciones directas.

- **Contraseña**: transito_pgadmin- Construir pruebas automatizadas o scripts `psql` que ejerciten las operaciones críticas del flujo de tránsito.

- Exponer reportes adicionales (por ejemplo, totales de multas por propietario) mediante vistas o materializaciones según carga de trabajo.

#### Configurar conexión en pgAdmin:
1. Click derecho en "Servers" → "Register" → "Server"
2. **Pestaña General**:
   - Name: `Transito Medellin`
3. **Pestaña Connection**:
   - Host name/address: `postgres`
   - Port: `5432`
   - Maintenance database: `transito_db`
   - Username: `transito_user`
   - Password: `transito_pass`
   - Save password: ✓

### PostgreSQL (Acceso Directo)
```powershell
docker exec -it transito-postgres psql -U transito_user -d transito_db
```

## 📂 Estructura del Proyecto

```
Quiz Base de Datos II/
├── app/
│   ├── main.py                 # Backend Flask con API REST
│   ├── requirements.txt        # Dependencias Python
│   ├── Dockerfile             # Imagen Docker de la app
│   ├── templates/
│   │   └── index.html         # Interfaz HTML principal
│   └── static/
│       ├── css/
│       │   └── styles.css     # Estilos modernos
│       └── js/
│           └── main.js        # Lógica frontend
├── sql/
│   └── init.sql              # Script de inicialización DB
├── docker-compose.yml        # Orquestación de servicios
└── README.md                # Este archivo
```

## 🎯 Funcionalidades de la Aplicación Web

### 📊 Dashboard
- Tarjetas con estadísticas generales (vehículos, propietarios, infracciones, accidentes)
- Top 5 infracciones más comunes con gráficos de barras
- Accidentes por zona geográfica
- Vehículos con más infracciones

### 🚗 Gestión de Vehículos
- Listado completo con información detallada
- Crear nuevos vehículos
- Ver detalles (propietarios, infracciones, accidentes)
- Eliminar vehículos
- Búsqueda por placa, marca o modelo

### 👥 Gestión de Propietarios
- Listado de propietarios con estadísticas
- Registrar nuevos propietarios
- Eliminar propietarios
- Búsqueda por cédula o nombre

### 🎫 Gestión de Infracciones
- Listado con información completa
- Registrar nuevas infracciones
- Asignar múltiples normas violadas
- Cálculo automático de multas
- Ver detalles completos
- Búsqueda por placa o agente

### 🚨 Gestión de Accidentes
- Listado de accidentes por zona
- Registrar nuevos accidentes
- Múltiples vehículos involucrados
- Ver detalles y descripción
- Búsqueda por acta o zona

## 🔧 API REST Endpoints

### Consultas (GET)
- `/api/vehiculos` - Lista todos los vehículos
- `/api/vehiculos/<placa>` - Detalles de un vehículo
- `/api/propietarios` - Lista todos los propietarios
- `/api/infracciones` - Lista todas las infracciones
- `/api/accidentes` - Lista todos los accidentes
- `/api/estadisticas` - Dashboard con métricas
- `/api/referencias/oficinas` - Oficinas de tránsito
- `/api/referencias/zonas` - Zonas geográficas
- `/api/referencias/agentes` - Agentes de tránsito
- `/api/referencias/normas` - Normas de tránsito

### Crear (POST)
- `/api/vehiculos` - Crear vehículo
- `/api/propietarios` - Crear propietario
- `/api/infracciones` - Crear infracción
- `/api/accidentes` - Crear accidente

### Actualizar (PUT)
- `/api/vehiculos/<placa>` - Actualizar vehículo
- `/api/propietarios/<cedula>` - Actualizar propietario

### Eliminar (DELETE)
- `/api/vehiculos/<placa>` - Eliminar vehículo
- `/api/propietarios/<cedula>` - Eliminar propietario

## 🗄️ Base de Datos

### Esquema `transito`

**Tablas principales:**
- `oficina_transito` - Oficinas de tránsito
- `zona` - Zonas geográficas de la ciudad
- `puesto_control` - Puestos de vigilancia
- `agente_transito` - Agentes de tránsito
- `norma_transito` - Normas de tránsito con valores de multa
- `vehiculo` - Vehículos matriculados
- `propietario` - Propietarios de vehículos
- `infraccion` - Infracciones registradas
- `accidente` - Accidentes de tránsito
- `audiencia` - Audiencias por accidentes

**Tablas de relación (muchos a muchos resueltas):**
- `vehiculo_propietario` - Vehículos y sus propietarios
- `infraccion_norma` - Infracciones y normas violadas
- `vehiculo_accidente` - Vehículos involucrados en accidentes
- `programacion_puesto` - Asignación de agentes a puestos

### Procedimientos Almacenados

```sql
-- Vehículos
CALL transito.sp_vehiculo_insert(...);
CALL transito.sp_vehiculo_update(...);
CALL transito.sp_vehiculo_delete(...);
CALL transito.sp_vehiculo_consultar(...);

-- Propietarios
CALL transito.sp_propietario_insert(...);
CALL transito.sp_propietario_update(...);
CALL transito.sp_propietario_delete(...);
CALL transito.sp_propietario_consultar(...);

-- Infracciones
CALL transito.sp_infraccion_insert(...);
CALL transito.sp_infraccion_update(...);
CALL transito.sp_infraccion_delete(...);
CALL transito.sp_infraccion_consultar(...);

-- Accidentes
CALL transito.sp_accidente_insert(...);
CALL transito.sp_accidente_update(...);
CALL transito.sp_accidente_delete(...);
CALL transito.sp_accidente_consultar(...);
```

## 🛠️ Comandos Útiles

### Gestión de contenedores
```powershell
# Iniciar servicios
docker compose up -d

# Reconstruir e iniciar
docker compose up -d --build

# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f webapp

# Detener servicios
docker compose stop

# Detener y eliminar contenedores
docker compose down

# Eliminar todo (incluyendo volúmenes)
docker compose down -v
```

### Acceso directo a PostgreSQL
```powershell
# Entrar a psql
docker exec -it transito-postgres psql -U transito_user -d transito_db

# Ejecutar comando SQL
docker exec -it transito-postgres psql -U transito_user -d transito_db -c "SELECT COUNT(*) FROM transito.vehiculo;"

# Re-ejecutar script de inicialización
docker exec -i transito-postgres psql -U transito_user -d transito_db -f /docker-entrypoint-initdb.d/01-init.sql
```

## 🎨 Tecnologías Utilizadas

- **Backend**: Python 3.11 + Flask
- **Base de Datos**: PostgreSQL 16
- **Frontend**: HTML5, CSS3 (Variables CSS, Grid, Flexbox), JavaScript (ES6+)
- **Iconos**: Font Awesome 6
- **Containerización**: Docker + Docker Compose
- **Administración DB**: pgAdmin 4

## 📝 Datos de Prueba

La base de datos incluye datos de ejemplo del taller original:
- 5 oficinas de tránsito
- 5 zonas geográficas
- 5 puestos de control
- 5 agentes de tránsito
- 4 normas de tránsito
- 5 vehículos registrados
- 5 propietarios
- 5 infracciones
- 5 accidentes

## 🔒 Seguridad

- Pool de conexiones para PostgreSQL (1-20 conexiones)
- Variables de entorno para credenciales
- Validación de datos en backend
- Transacciones con rollback automático
- Prevención de SQL injection mediante prepared statements

## 📌 Notas Importantes

- La aplicación web usa el pool de conexiones para mejor rendimiento
- Los procedimientos almacenados están en el esquema `transito`
- Las relaciones muchos-a-muchos están resueltas con tablas puente
- Los datos se cargan automáticamente al iniciar PostgreSQL por primera vez
- La interfaz es completamente responsive (mobile-friendly)

## 👨‍💻 Autor

Taller de Bases de Datos II - Sistema de Tránsito de Medellín

---

<div align="center">

**¡Sistema completamente funcional y listo para usar!** 🎉

</div>
>>>>>>> f8ea316 (Versión inicial del Sistema de Tránsito de Medellín)


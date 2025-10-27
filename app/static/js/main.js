// API Base URL
const API_BASE = '/api';

// State Management
const state = {
    currentSection: 'dashboard',
    vehiculos: [],
    propietarios: [],
    infracciones: [],
    accidentes: [],
    referencias: {
        oficinas: [],
        zonas: [],
        agentes: [],
        normas: []
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeRefreshButton();
    loadReferenceData();
    loadDashboard();
    
    // Load initial section data
    loadVehiculos();
    loadPropietarios();
    loadInfracciones();
    loadAccidentes();
});

// Navigation
function initializeNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            navigateTo(section);
        });
    });
}

function navigateTo(section) {
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });
    
    // Update content sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `${section}-section`);
    });
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        vehiculos: 'Vehículos',
        propietarios: 'Propietarios',
        infracciones: 'Infracciones',
        accidentes: 'Accidentes'
    };
    document.getElementById('page-title').textContent = titles[section];
    
    state.currentSection = section;
}

// Refresh Button
function initializeRefreshButton() {
    document.getElementById('btn-refresh').addEventListener('click', () => {
        switch (state.currentSection) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'vehiculos':
                loadVehiculos();
                break;
            case 'propietarios':
                loadPropietarios();
                break;
            case 'infracciones':
                loadInfracciones();
                break;
            case 'accidentes':
                loadAccidentes();
                break;
        }
    });
}

// Load Reference Data
async function loadReferenceData() {
    try {
        const [oficinas, zonas, agentes, normas] = await Promise.all([
            fetchAPI('/referencias/oficinas'),
            fetchAPI('/referencias/zonas'),
            fetchAPI('/referencias/agentes'),
            fetchAPI('/referencias/normas')
        ]);
        
        state.referencias = { oficinas, zonas, agentes, normas };
    } catch (error) {
        showNotification('Error cargando datos de referencia', 'error');
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const data = await fetchAPI('/estadisticas');
        
        // Update stats
        document.getElementById('stat-vehiculos').textContent = data.total_vehiculos;
        document.getElementById('stat-propietarios').textContent = data.total_propietarios;
        document.getElementById('stat-infracciones').textContent = data.total_infracciones;
        document.getElementById('stat-accidentes').textContent = data.total_accidentes;
        
        // Render charts
        renderInfraccionesChart(data.top_infracciones);
        renderZonasChart(data.accidentes_por_zona);
        renderVehiculosChart(data.vehiculos_problematicos);
    } catch (error) {
        showNotification('Error cargando dashboard', 'error');
    }
}

function renderInfraccionesChart(data) {
    const container = document.getElementById('chart-infracciones');
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-bar"></i><p>No hay datos disponibles</p></div>';
        return;
    }
    
    const maxTotal = Math.max(...data.map(d => d.total));
    
    container.innerHTML = data.map(item => `
        <div style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span style="font-size: 0.9rem;">${item.nombre}</span>
                <span style="color: var(--primary-color); font-weight: 600;">${item.total}</span>
            </div>
            <div style="background: var(--darker-bg); height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, var(--primary-color), var(--secondary-color)); 
                            height: 100%; width: ${(item.total / maxTotal) * 100}%; transition: width 0.5s;"></div>
            </div>
        </div>
    `).join('');
}

function renderZonasChart(data) {
    const container = document.getElementById('chart-zonas');
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-map-marked-alt"></i><p>No hay datos disponibles</p></div>';
        return;
    }
    
    const maxTotal = Math.max(...data.map(d => d.total));
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];
    
    container.innerHTML = data.map((item, i) => `
        <div style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span style="font-size: 0.9rem;">${item.sector}</span>
                <span style="color: ${colors[i % colors.length]}; font-weight: 600;">${item.total}</span>
            </div>
            <div style="background: var(--darker-bg); height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background: ${colors[i % colors.length]}; 
                            height: 100%; width: ${(item.total / maxTotal) * 100}%; transition: width 0.5s;"></div>
            </div>
        </div>
    `).join('');
}

function renderVehiculosChart(data) {
    const container = document.getElementById('chart-vehiculos');
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-car"></i><p>No hay datos disponibles</p></div>';
        return;
    }
    
    container.innerHTML = `
        <table style="width: 100%; font-size: 0.9rem;">
            <thead>
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <th style="padding: 0.5rem; text-align: left;">Placa</th>
                    <th style="padding: 0.5rem; text-align: left;">Vehículo</th>
                    <th style="padding: 0.5rem; text-align: right;">Infracciones</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.75rem; color: var(--primary-color); font-weight: 600;">${item.num_placa}</td>
                        <td style="padding: 0.75rem; color: var(--text-secondary);">${item.marca} ${item.modelo}</td>
                        <td style="padding: 0.75rem; text-align: right;">
                            <span class="badge badge-danger">${item.total_infracciones}</span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Vehiculos
async function loadVehiculos() {
    try {
        const data = await fetchAPI('/vehiculos');
        state.vehiculos = data;
        renderVehiculos(data);
        initializeVehiculosEvents();
    } catch (error) {
        showNotification('Error cargando vehículos', 'error');
    }
}

function renderVehiculos(vehiculos) {
    const tbody = document.getElementById('tbody-vehiculos');
    
    if (vehiculos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10">
                    <div class="empty-state">
                        <i class="fas fa-car"></i>
                        <p>No hay vehículos registrados</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = vehiculos.map(v => `
        <tr>
            <td><strong style="color: var(--primary-color);">${v.num_placa}</strong></td>
            <td>${v.marca}</td>
            <td>${v.modelo}</td>
            <td>${v.anio_fabricacion || '-'}</td>
            <td>$${formatNumber(v.valor_vehiculo)}</td>
            <td>${v.nombre_oficina}</td>
            <td><span class="badge badge-info">${v.num_propietarios}</span></td>
            <td>${v.num_infracciones > 0 ? `<span class="badge badge-warning">${v.num_infracciones}</span>` : '-'}</td>
            <td>${v.num_accidentes > 0 ? `<span class="badge badge-danger">${v.num_accidentes}</span>` : '-'}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewVehiculo('${v.num_placa}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteVehiculo('${v.num_placa}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function initializeVehiculosEvents() {
    document.getElementById('btn-nuevo-vehiculo').onclick = () => showVehiculoModal();
    
    document.getElementById('search-vehiculos').oninput = (e) => {
        const search = e.target.value.toLowerCase();
        const filtered = state.vehiculos.filter(v => 
            v.num_placa.toLowerCase().includes(search) ||
            v.marca.toLowerCase().includes(search) ||
            v.modelo.toLowerCase().includes(search)
        );
        renderVehiculos(filtered);
    };
}

async function viewVehiculo(placa) {
    try {
        const data = await fetchAPI(`/vehiculos/${placa}`);
        showVehiculoDetailModal(data);
    } catch (error) {
        showNotification('Error cargando detalles del vehículo', 'error');
    }
}

function showVehiculoModal(vehiculo = null) {
    const isEdit = !!vehiculo;
    
    const modal = createModal(
        isEdit ? 'Editar Vehículo' : 'Nuevo Vehículo',
        `
        <form id="form-vehiculo">
            <div class="form-group">
                <label>Placa *</label>
                <input type="text" name="num_placa" class="form-control" 
                       value="${vehiculo?.num_placa || ''}" 
                       ${isEdit ? 'readonly' : ''} required>
            </div>
            <div class="form-group">
                <label>Serie Motor *</label>
                <input type="text" name="serie_motor" class="form-control" 
                       value="${vehiculo?.serie_motor || ''}" required>
            </div>
            <div class="form-group">
                <label>Marca *</label>
                <input type="text" name="marca" class="form-control" 
                       value="${vehiculo?.marca || ''}" required>
            </div>
            <div class="form-group">
                <label>Modelo *</label>
                <input type="text" name="modelo" class="form-control" 
                       value="${vehiculo?.modelo || ''}" required>
            </div>
            <div class="form-group">
                <label>Año de Fabricación</label>
                <input type="number" name="anio_fabricacion" class="form-control" 
                       value="${vehiculo?.anio_fabricacion || ''}" min="1900" max="2030">
            </div>
            <div class="form-group">
                <label>Valor del Vehículo</label>
                <input type="number" name="valor_vehiculo" class="form-control" 
                       value="${vehiculo?.valor_vehiculo || ''}" step="0.01">
            </div>
            <div class="form-group">
                <label>Número de Seguro</label>
                <input type="text" name="numero_seguro" class="form-control" 
                       value="${vehiculo?.numero_seguro || ''}">
            </div>
            <div class="form-group">
                <label>Oficina de Tránsito *</label>
                <select name="cod_oficina" class="form-control" required>
                    <option value="">Seleccione una oficina</option>
                    ${state.referencias.oficinas.map(o => `
                        <option value="${o.cod_oficina}" ${vehiculo?.cod_oficina === o.cod_oficina ? 'selected' : ''}>
                            ${o.nombre}
                        </option>
                    `).join('')}
                </select>
            </div>
        </form>
        `,
        [
            { text: 'Cancelar', class: 'btn', onClick: closeModal },
            { text: isEdit ? 'Actualizar' : 'Crear', class: 'btn btn-primary', onClick: () => submitVehiculo(isEdit) }
        ]
    );
    
    showModal(modal);
}

async function submitVehiculo(isEdit) {
    const form = document.getElementById('form-vehiculo');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    try {
        if (isEdit) {
            await fetchAPI(`/vehiculos/${data.num_placa}`, 'PUT', data);
            showNotification('Vehículo actualizado exitosamente', 'success');
        } else {
            await fetchAPI('/vehiculos', 'POST', data);
            showNotification('Vehículo creado exitosamente', 'success');
        }
        closeModal();
        loadVehiculos();
    } catch (error) {
        showNotification(error.message || 'Error al guardar vehículo', 'error');
    }
}

async function deleteVehiculo(placa) {
    if (!confirm(`¿Está seguro de eliminar el vehículo ${placa}?`)) return;
    
    try {
        await fetchAPI(`/vehiculos/${placa}`, 'DELETE');
        showNotification('Vehículo eliminado exitosamente', 'success');
        loadVehiculos();
    } catch (error) {
        showNotification(error.message || 'Error al eliminar vehículo', 'error');
    }
}

function showVehiculoDetailModal(vehiculo) {
    const modal = createModal(
        `Detalles del Vehículo: ${vehiculo.num_placa}`,
        `
        <div style="margin-bottom: 1.5rem;">
            <h3 style="margin-bottom: 1rem; color: var(--primary-color);">Información General</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div><strong>Placa:</strong> ${vehiculo.num_placa}</div>
                <div><strong>Serie Motor:</strong> ${vehiculo.serie_motor}</div>
                <div><strong>Marca:</strong> ${vehiculo.marca}</div>
                <div><strong>Modelo:</strong> ${vehiculo.modelo}</div>
                <div><strong>Año:</strong> ${vehiculo.anio_fabricacion || '-'}</div>
                <div><strong>Valor:</strong> $${formatNumber(vehiculo.valor_vehiculo)}</div>
                <div><strong>Seguro:</strong> ${vehiculo.numero_seguro || '-'}</div>
                <div><strong>Oficina:</strong> ${vehiculo.nombre_oficina}</div>
            </div>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
            <h3 style="margin-bottom: 1rem; color: var(--success-color);">Propietarios (${vehiculo.propietarios.length})</h3>
            ${vehiculo.propietarios.length > 0 ? `
                <table style="width: 100%; font-size: 0.9rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <th style="padding: 0.5rem;">Nombre</th>
                            <th style="padding: 0.5rem;">Cédula</th>
                            <th style="padding: 0.5rem;">Principal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vehiculo.propietarios.map(p => `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <td style="padding: 0.5rem;">${p.nombre}</td>
                                <td style="padding: 0.5rem;">${p.cedula}</td>
                                <td style="padding: 0.5rem;">
                                    ${p.es_propietario_principal ? '<span class="badge badge-success">Sí</span>' : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p style="color: var(--text-secondary);">Sin propietarios registrados</p>'}
        </div>
        
        <div style="margin-bottom: 1.5rem;">
            <h3 style="margin-bottom: 1rem; color: var(--warning-color);">Infracciones (${vehiculo.infracciones.length})</h3>
            ${vehiculo.infracciones.length > 0 ? `
                <div style="max-height: 200px; overflow-y: auto;">
                    ${vehiculo.infracciones.map(i => `
                        <div style="background: var(--darker-bg); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;">
                            <div><strong>Fecha:</strong> ${i.fecha_infraccion} ${i.hora_infraccion}</div>
                            <div><strong>Agente:</strong> ${i.nombre_agente}</div>
                            <div><strong>Normas:</strong> ${i.normas_violadas?.join(', ') || '-'}</div>
                            <div><strong>Multa:</strong> $${formatNumber(i.total_multa)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: var(--text-secondary);">Sin infracciones registradas</p>'}
        </div>
        
        <div>
            <h3 style="margin-bottom: 1rem; color: var(--danger-color);">Accidentes (${vehiculo.accidentes.length})</h3>
            ${vehiculo.accidentes.length > 0 ? `
                <div style="max-height: 200px; overflow-y: auto;">
                    ${vehiculo.accidentes.map(a => `
                        <div style="background: var(--darker-bg); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;">
                            <div><strong>Acta:</strong> ${a.nro_acta}</div>
                            <div><strong>Fecha:</strong> ${a.fecha_accidente} ${a.hora_accidente}</div>
                            <div><strong>Zona:</strong> ${a.sector}</div>
                            <div><strong>Descripción:</strong> ${a.descripcion}</div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: var(--text-secondary);">Sin accidentes registrados</p>'}
        </div>
        `,
        [{ text: 'Cerrar', class: 'btn btn-primary', onClick: closeModal }]
    );
    
    showModal(modal);
}

// Propietarios
async function loadPropietarios() {
    try {
        const data = await fetchAPI('/propietarios');
        state.propietarios = data;
        renderPropietarios(data);
        initializePropietariosEvents();
    } catch (error) {
        showNotification('Error cargando propietarios', 'error');
    }
}

function renderPropietarios(propietarios) {
    const tbody = document.getElementById('tbody-propietarios');
    
    if (propietarios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>No hay propietarios registrados</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = propietarios.map(p => `
        <tr>
            <td><strong style="color: var(--primary-color);">${p.cedula}</strong></td>
            <td>${p.nombre}</td>
            <td>${p.direccion}</td>
            <td>${p.telefono || '-'}</td>
            <td><span class="badge badge-info">${p.num_vehiculos}</span></td>
            <td>${p.num_audiencias > 0 ? `<span class="badge badge-warning">${p.num_audiencias}</span>` : '-'}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deletePropietario('${p.cedula}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function initializePropietariosEvents() {
    document.getElementById('btn-nuevo-propietario').onclick = () => showPropietarioModal();
    
    document.getElementById('search-propietarios').oninput = (e) => {
        const search = e.target.value.toLowerCase();
        const filtered = state.propietarios.filter(p => 
            p.cedula.toLowerCase().includes(search) ||
            p.nombre.toLowerCase().includes(search)
        );
        renderPropietarios(filtered);
    };
}

function showPropietarioModal(propietario = null) {
    const isEdit = !!propietario;
    
    const modal = createModal(
        isEdit ? 'Editar Propietario' : 'Nuevo Propietario',
        `
        <form id="form-propietario">
            <div class="form-group">
                <label>Cédula *</label>
                <input type="text" name="cedula" class="form-control" 
                       value="${propietario?.cedula || ''}" 
                       ${isEdit ? 'readonly' : ''} required>
            </div>
            <div class="form-group">
                <label>Nombre Completo *</label>
                <input type="text" name="nombre" class="form-control" 
                       value="${propietario?.nombre || ''}" required>
            </div>
            <div class="form-group">
                <label>Dirección *</label>
                <input type="text" name="direccion" class="form-control" 
                       value="${propietario?.direccion || ''}" required>
            </div>
            <div class="form-group">
                <label>Teléfono</label>
                <input type="text" name="telefono" class="form-control" 
                       value="${propietario?.telefono || ''}">
            </div>
        </form>
        `,
        [
            { text: 'Cancelar', class: 'btn', onClick: closeModal },
            { text: isEdit ? 'Actualizar' : 'Crear', class: 'btn btn-primary', onClick: () => submitPropietario(isEdit) }
        ]
    );
    
    showModal(modal);
}

async function submitPropietario(isEdit) {
    const form = document.getElementById('form-propietario');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    try {
        if (isEdit) {
            await fetchAPI(`/propietarios/${data.cedula}`, 'PUT', data);
            showNotification('Propietario actualizado exitosamente', 'success');
        } else {
            await fetchAPI('/propietarios', 'POST', data);
            showNotification('Propietario creado exitosamente', 'success');
        }
        closeModal();
        loadPropietarios();
    } catch (error) {
        showNotification(error.message || 'Error al guardar propietario', 'error');
    }
}

async function deletePropietario(cedula) {
    if (!confirm(`¿Está seguro de eliminar el propietario con cédula ${cedula}?`)) return;
    
    try {
        await fetchAPI(`/propietarios/${cedula}`, 'DELETE');
        showNotification('Propietario eliminado exitosamente', 'success');
        loadPropietarios();
    } catch (error) {
        showNotification(error.message || 'Error al eliminar propietario', 'error');
    }
}

// Infracciones
async function loadInfracciones() {
    try {
        const data = await fetchAPI('/infracciones');
        state.infracciones = data;
        renderInfracciones(data);
        initializeInfraccionesEvents();
    } catch (error) {
        showNotification('Error cargando infracciones', 'error');
    }
}

function renderInfracciones(infracciones) {
    const tbody = document.getElementById('tbody-infracciones');
    
    if (infracciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <i class="fas fa-ticket-alt"></i>
                        <p>No hay infracciones registradas</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = infracciones.map(i => `
        <tr>
            <td><strong style="color: var(--primary-color);">${i.cod_infraccion}</strong></td>
            <td>${i.fecha_infraccion}</td>
            <td>${i.hora_infraccion}</td>
            <td>${i.num_placa} - ${i.marca} ${i.modelo}</td>
            <td>${i.nombre_agente}</td>
            <td>${i.normas_violadas?.join(', ') || '-'}</td>
            <td><strong style="color: var(--danger-color);">$${formatNumber(i.total_multa)}</strong></td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewInfraccion(${i.cod_infraccion})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function initializeInfraccionesEvents() {
    document.getElementById('btn-nueva-infraccion').onclick = () => showInfraccionModal();
    
    document.getElementById('search-infracciones').oninput = (e) => {
        const search = e.target.value.toLowerCase();
        const filtered = state.infracciones.filter(i => 
            i.num_placa.toLowerCase().includes(search) ||
            i.nombre_agente.toLowerCase().includes(search)
        );
        renderInfracciones(filtered);
    };
}

function showInfraccionModal() {
    const modal = createModal(
        'Nueva Infracción',
        `
        <form id="form-infraccion">
            <div class="form-group">
                <label>Código de Infracción *</label>
                <input type="number" name="cod_infraccion" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Fecha *</label>
                <input type="date" name="fecha_infraccion" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Hora *</label>
                <input type="time" name="hora_infraccion" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Placa del Vehículo *</label>
                <input type="text" name="num_placa" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Agente *</label>
                <select name="cod_agente" class="form-control" required>
                    <option value="">Seleccione un agente</option>
                    ${state.referencias.agentes.map(a => `
                        <option value="${a.cod_agente}">${a.nombre}</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Normas Violadas *</label>
                ${state.referencias.normas.map(n => `
                    <div style="margin-bottom: 0.5rem;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" name="normas" value="${n.cod_norma}" 
                                   style="margin-right: 0.5rem;">
                            ${n.nombre} - $${formatNumber(n.valor_multa)}
                        </label>
                    </div>
                `).join('')}
            </div>
        </form>
        `,
        [
            { text: 'Cancelar', class: 'btn', onClick: closeModal },
            { text: 'Crear', class: 'btn btn-primary', onClick: submitInfraccion }
        ]
    );
    
    showModal(modal);
}

async function submitInfraccion() {
    const form = document.getElementById('form-infraccion');
    const formData = new FormData(form);
    const data = {
        cod_infraccion: parseInt(formData.get('cod_infraccion')),
        fecha_infraccion: formData.get('fecha_infraccion'),
        hora_infraccion: formData.get('hora_infraccion'),
        num_placa: formData.get('num_placa'),
        cod_agente: formData.get('cod_agente'),
        normas: formData.getAll('normas').map(n => parseInt(n))
    };
    
    try {
        await fetchAPI('/infracciones', 'POST', data);
        showNotification('Infracción creada exitosamente', 'success');
        closeModal();
        loadInfracciones();
    } catch (error) {
        showNotification(error.message || 'Error al crear infracción', 'error');
    }
}

function viewInfraccion(cod) {
    const infraccion = state.infracciones.find(i => i.cod_infraccion === cod);
    if (!infraccion) return;
    
    const modal = createModal(
        `Infracción #${cod}`,
        `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div><strong>Código:</strong> ${infraccion.cod_infraccion}</div>
            <div><strong>Fecha:</strong> ${infraccion.fecha_infraccion}</div>
            <div><strong>Hora:</strong> ${infraccion.hora_infraccion}</div>
            <div><strong>Vehículo:</strong> ${infraccion.num_placa}</div>
            <div><strong>Marca:</strong> ${infraccion.marca}</div>
            <div><strong>Modelo:</strong> ${infraccion.modelo}</div>
            <div><strong>Agente:</strong> ${infraccion.nombre_agente}</div>
            <div><strong>Total Multa:</strong> <span style="color: var(--danger-color); font-size: 1.2rem;">$${formatNumber(infraccion.total_multa)}</span></div>
        </div>
        <div style="margin-top: 1rem;">
            <strong>Normas Violadas:</strong>
            <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                ${infraccion.normas_violadas?.map(n => `<li>${n}</li>`).join('') || '<li>Sin normas registradas</li>'}
            </ul>
        </div>
        `,
        [{ text: 'Cerrar', class: 'btn btn-primary', onClick: closeModal }]
    );
    
    showModal(modal);
}

// Accidentes
async function loadAccidentes() {
    try {
        const data = await fetchAPI('/accidentes');
        state.accidentes = data;
        renderAccidentes(data);
        initializeAccidentesEvents();
    } catch (error) {
        showNotification('Error cargando accidentes', 'error');
    }
}

function renderAccidentes(accidentes) {
    const tbody = document.getElementById('tbody-accidentes');
    
    if (accidentes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <i class="fas fa-car-crash"></i>
                        <p>No hay accidentes registrados</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = accidentes.map(a => `
        <tr>
            <td><strong style="color: var(--primary-color);">${a.nro_acta}</strong></td>
            <td>${a.fecha_accidente}</td>
            <td>${a.hora_accidente}</td>
            <td>${a.sector}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${a.descripcion}</td>
            <td>${a.nombre_agente}</td>
            <td><span class="badge badge-danger">${a.num_vehiculos}</span></td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewAccidente(${a.nro_acta})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function initializeAccidentesEvents() {
    document.getElementById('btn-nuevo-accidente').onclick = () => showAccidenteModal();
    
    document.getElementById('search-accidentes').oninput = (e) => {
        const search = e.target.value.toLowerCase();
        const filtered = state.accidentes.filter(a => 
            a.nro_acta.toString().includes(search) ||
            a.sector.toLowerCase().includes(search)
        );
        renderAccidentes(filtered);
    };
}

function showAccidenteModal() {
    const modal = createModal(
        'Nuevo Accidente',
        `
        <form id="form-accidente">
            <div class="form-group">
                <label>Número de Acta *</label>
                <input type="number" name="nro_acta" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Fecha *</label>
                <input type="date" name="fecha_accidente" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Hora *</label>
                <input type="time" name="hora_accidente" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Descripción *</label>
                <textarea name="descripcion" class="form-control" rows="3" required></textarea>
            </div>
            <div class="form-group">
                <label>Zona *</label>
                <select name="cod_zona" class="form-control" required>
                    <option value="">Seleccione una zona</option>
                    ${state.referencias.zonas.map(z => `
                        <option value="${z.cod_zona}">${z.sector}</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Agente *</label>
                <select name="cod_agente" class="form-control" required>
                    <option value="">Seleccione un agente</option>
                    ${state.referencias.agentes.map(a => `
                        <option value="${a.cod_agente}">${a.nombre}</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Vehículos Involucrados (placas separadas por coma) *</label>
                <input type="text" name="vehiculos" class="form-control" 
                       placeholder="Ej: ABC123, XYZ789" required>
            </div>
        </form>
        `,
        [
            { text: 'Cancelar', class: 'btn', onClick: closeModal },
            { text: 'Crear', class: 'btn btn-primary', onClick: submitAccidente }
        ]
    );
    
    showModal(modal);
}

async function submitAccidente() {
    const form = document.getElementById('form-accidente');
    const formData = new FormData(form);
    const vehiculosRaw = formData.get('vehiculos');
    
    const data = {
        nro_acta: parseInt(formData.get('nro_acta')),
        fecha_accidente: formData.get('fecha_accidente'),
        hora_accidente: formData.get('hora_accidente'),
        descripcion: formData.get('descripcion'),
        cod_zona: formData.get('cod_zona'),
        cod_agente: formData.get('cod_agente'),
        vehiculos: vehiculosRaw.split(',').map(v => v.trim()).filter(v => v)
    };
    
    try {
        await fetchAPI('/accidentes', 'POST', data);
        showNotification('Accidente registrado exitosamente', 'success');
        closeModal();
        loadAccidentes();
    } catch (error) {
        showNotification(error.message || 'Error al registrar accidente', 'error');
    }
}

function viewAccidente(nro) {
    const accidente = state.accidentes.find(a => a.nro_acta === nro);
    if (!accidente) return;
    
    const modal = createModal(
        `Accidente Acta #${nro}`,
        `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
            <div><strong>Nro. Acta:</strong> ${accidente.nro_acta}</div>
            <div><strong>Fecha:</strong> ${accidente.fecha_accidente}</div>
            <div><strong>Hora:</strong> ${accidente.hora_accidente}</div>
            <div><strong>Zona:</strong> ${accidente.sector}</div>
            <div><strong>Agente:</strong> ${accidente.nombre_agente}</div>
            <div><strong>Vehículos:</strong> <span class="badge badge-danger">${accidente.num_vehiculos}</span></div>
        </div>
        <div style="margin-bottom: 1rem;">
            <strong>Descripción:</strong>
            <p style="margin-top: 0.5rem; padding: 1rem; background: var(--darker-bg); border-radius: 8px;">
                ${accidente.descripcion}
            </p>
        </div>
        <div>
            <strong>Vehículos Involucrados:</strong>
            <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
                ${accidente.vehiculos?.map(v => `
                    <span class="badge badge-info" style="font-size: 0.9rem; padding: 0.5rem 1rem;">${v}</span>
                `).join('') || '<span style="color: var(--text-secondary);">Sin vehículos registrados</span>'}
            </div>
        </div>
        `,
        [{ text: 'Cerrar', class: 'btn btn-primary', onClick: closeModal }]
    );
    
    showModal(modal);
}

// Utility Functions
async function fetchAPI(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(API_BASE + endpoint, options);
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.error || 'Error en la solicitud');
    }
    
    return data.data;
}

function formatNumber(num) {
    if (!num) return '0';
    return new Intl.NumberFormat('es-CO').format(num);
}

function createModal(title, bodyHTML, buttons = []) {
    return `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${bodyHTML}
            </div>
            ${buttons.length > 0 ? `
                <div class="modal-footer">
                    ${buttons.map(btn => `
                        <button class="${btn.class}" onclick="(${btn.onClick.toString()})()">${btn.text}</button>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

function showModal(html) {
    const container = document.getElementById('modal-container');
    container.innerHTML = html;
    container.classList.add('active');
}

function closeModal() {
    const container = document.getElementById('modal-container');
    container.classList.remove('active');
    setTimeout(() => container.innerHTML = '', 300);
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

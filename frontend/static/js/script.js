// =====================
// MÓDULO PRINCIPAL
// =====================
// static/js/script.js - Versión Optimizada

document.addEventListener('DOMContentLoaded', function() {
    // Configuración global
    const API_BASE_URL = window.location.origin + '/api';
    let currentAdminToken = localStorage.getItem('adminToken');
    
    // Cache de elementos del DOM
    const DOM = {
        // Elementos principales
        body: document.body,
        contenedorProductos: document.getElementById('productos-container'),
        sliderOfertas: document.getElementById('ofertas'),
        
        // Navegación
        menuToggle: document.querySelector('.menu-toggle'),
        nav: document.getElementById('nav'),
        navUl: document.querySelector('#nav ul'),
        
        // Admin
        adminBtn: document.getElementById('adminBtn'),
        adminModal: document.getElementById('adminModal'),
        adminLoginForm: document.getElementById('loginForm'),
        adminPanel: document.getElementById('adminPanel'),
        
        // Tabs admin
        productosTab: document.getElementById('productosTab'),
        ofertasTab: document.getElementById('ofertasTab'),
        
        // Botones admin
        addProductBtn: document.getElementById('addProductBtn'),
        addOfertaBtn: document.getElementById('addOfertaBtn'),
        
        // Modals
        modalCompra: document.getElementById('modalCompra'),
        productModal: document.getElementById('productModal'),
        ofertaModal: document.getElementById('ofertaModal'),
        
        // Formularios
        formCompra: document.getElementById('formCompra'),
        confirmarCompraBtn: document.getElementById('confirmarCompra'),
        
        // Filtros
        botonesCategorias: document.querySelectorAll('.btn-filtro'),
        
        // Notificaciones
        toastContainer: document.getElementById('toastContainer')
    };

    // Sistema de notificaciones toast
    const Toast = {
        show: function(type, title, message, duration = 5000) {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle',
                info: 'fas fa-info-circle'
            };
            
            toast.innerHTML = `
                <i class="toast-icon ${icons[type]}"></i>
                <div class="toast-content">
                    <div class="toast-title">${title}</div>
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            DOM.toastContainer.appendChild(toast);
            
            // Animación de entrada
            setTimeout(() => {
                toast.classList.add('show');
            }, 100);
            
            // Auto-remover después del tiempo especificado
            if (duration > 0) {
                setTimeout(() => {
                    this.hide(toast);
                }, duration);
            }
            
            return toast;
        },
        
        hide: function(toast) {
            toast.classList.remove('show');
            toast.classList.add('slide-out');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        },
        
        success: function(title, message, duration) {
            return this.show('success', title, message, duration);
        },
        
        error: function(title, message, duration) {
            return this.show('error', title, message, duration);
        },
        
        warning: function(title, message, duration) {
            return this.show('warning', title, message, duration);
        },
        
        info: function(title, message, duration) {
            return this.show('info', title, message, duration);
        }
    };

    // Inicialización de módulos
    const App = {
        init: function() {
            this.initAdminPanel();
            this.initProductos();
            this.initOfertas();
            this.initCompraModal();
            this.checkAdminStatus();
        },
        
        // Módulo de autenticación
        checkAdminStatus: function() {
            if (!DOM.adminBtn) {
                console.error('Elemento adminBtn no encontrado');
                return;
            }
            
            // Configurar el botón de admin
            DOM.adminBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Mostrar el modal de login
                if (DOM.adminModal) {
                    DOM.adminModal.style.display = 'block';
                }
            });
            
            if (currentAdminToken) {
                document.body.classList.add('admin-visible');
                this.verifyToken().then(isValid => {
                    if (!isValid) {
                        this.logoutAdmin();
                    } else {
                        // El botón siempre está visible, solo cambia su comportamiento
                        DOM.adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Panel Admin';
                        DOM.adminBtn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Abrir el panel de administración
                            this.toggleAdminPanel();
                        };
                    }
                }).catch(error => {
                    console.error('Error al verificar token:', error);
                    this.logoutAdmin();
                });
            } else {
                document.body.classList.remove('admin-visible');
                // El botón siempre está visible para login
                DOM.adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Admin';
                DOM.adminBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Mostrar el modal de login
                    if (DOM.adminModal) {
                        DOM.adminModal.style.display = 'block';
                    }
                };
            }
        },
        
        verifyToken: async function() {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/verify`, {
                    headers: {
                        'Authorization': `Bearer ${currentAdminToken}`
                    }
                });
                return response.ok;
            } catch (error) {
                console.error('Error verifying token:', error);
                return false;
            }
        },
        
        logoutAdmin: function() {
            localStorage.removeItem('adminToken');
            currentAdminToken = null;
            DOM.adminBtn.style.display = 'none';
            if (DOM.adminPanel.style.display === 'block') {
                DOM.adminPanel.style.display = 'none';
            }
            document.body.classList.remove('admin-visible');
        },

        // Módulo de productos
        initProductos: function() {
            this.loadProductos();
            this.initFiltros();
        },

        async loadProductos() {
            try {
                const response = await fetch(`${API_BASE_URL}/productos`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const productos = await response.json();
                this.renderProductos(productos);
            } catch (error) {
                console.error('Error cargando productos:', error);
                Toast.error('Error', 'No se pudieron cargar los productos', 5000);
            }
        },

        renderProductos(productos) {
            if (!DOM.contenedorProductos) return;
            DOM.contenedorProductos.innerHTML = productos.map(producto => {
                let imagenSrc = producto.imagen_base64 || producto.imagen || '/static/img/placeholder.jpg';
                return `
                <div class="producto" data-categoria="${producto.categoria}">
                    <div class="producto-imagen-container">
                        <img src="${imagenSrc}" 
                             alt="${producto.nombre}" 
                             class="producto-imagen"
                             onclick="window.openProductDetail(${producto.id})"
                             onerror="this.src='/static/img/placeholder.jpg'">
                        ${producto.badge ? `<div class='producto-badge'><i class='fas fa-tag'></i> ${producto.badge}</div>` : ''}
                    </div>
                    <div class="producto-info">
                        <h3>${producto.nombre}</h3>
                        <p class="producto-desc">${producto.descripcion || ''}</p>
                        <div class="producto-precios">
                            <span class="precio-con">Con instalación: <b>$${producto.precio_montura ? producto.precio_montura.toLocaleString() : '-'}</b></span>
                            <span class="precio-sin">Sin instalación: <b>$${producto.precio_sin_montura ? producto.precio_sin_montura.toLocaleString() : '-'}</b></span>
                        </div>
                        <div class="producto-dimensiones">
                            <small><i class="fas fa-ruler-combined"></i> ${producto.ancho ? producto.ancho + 'cm' : '-'} x ${producto.largo ? producto.largo + 'cm' : '-'}</small>
                        </div>
                        <div class="botones-producto">
                            <button class="btn-comprar" onclick="comprarProducto(${producto.id})">
                                <i class="fas fa-shopping-cart"></i> Comprar
                            </button>
                            <button class="btn-compartir-producto" onclick="compartirProducto('${producto.nombre}', '${window.location.origin}/detalle.html?id=${producto.id}')">
                                <i class="fas fa-share-alt"></i> Compartir
                            </button>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        },

        initFiltros() {
            DOM.botonesCategorias.forEach(boton => {
                boton.addEventListener('click', function() {
                    const categoria = this.dataset.categoria;
                    
                    // Actualizar botones activos
                    DOM.botonesCategorias.forEach(b => b.classList.remove('activo'));
                    this.classList.add('activo');
                    
                    // Filtrar productos
                    const productos = document.querySelectorAll('.producto');
                    productos.forEach(producto => {
                        if (categoria === 'todos' || producto.dataset.categoria === categoria) {
                            producto.style.display = 'block';
                        } else {
                            producto.style.display = 'none';
                        }
                    });
                });
            });
        },

        // Módulo de ofertas
        initOfertas() {
            this.loadOfertas();
        },

        async loadOfertas() {
            try {
                const response = await fetch(`${API_BASE_URL}/ofertas`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const ofertas = await response.json();
                this.renderOfertas(ofertas);
            } catch (error) {
                console.error('Error cargando ofertas:', error);
                Toast.error('Error', 'No se pudieron cargar las ofertas', 5000);
            }
        },

        renderOfertas(ofertas) {
            if (!DOM.sliderOfertas) return;
            if (!ofertas.length) {
                DOM.sliderOfertas.innerHTML = '<p class="no-ofertas">No hay ofertas disponibles</p>';
                return;
            }
            let current = 0;
            function showOferta(idx) {
                const oferta = ofertas[idx];
                DOM.sliderOfertas.innerHTML = `
                    <div class="oferta-item-slider">
                        <div class="oferta-icono"><i class="${oferta.icono || 'fas fa-tag'}"></i></div>
                        <div class="oferta-texto">${oferta.texto || oferta.titulo || ''}</div>
                        ${oferta.descuento ? `<div class='oferta-descuento'>${oferta.descuento}% OFF</div>` : ''}
                        ${oferta.fecha_fin ? `<div class='oferta-fecha'>Hasta: ${oferta.fecha_fin}</div>` : ''}
                    </div>
                `;
            }
            showOferta(current);
            if (window.ofertaInterval) clearInterval(window.ofertaInterval);
            window.ofertaInterval = setInterval(() => {
                current = (current + 1) % ofertas.length;
                showOferta(current);
            }, 3000);
        },

        // Módulo de compra
        initCompraModal() {
            if (DOM.formCompra) {
                DOM.formCompra.addEventListener('submit', this.handleCompra.bind(this));
            }
        },

        handleCompra: async function(e) {
            e.preventDefault();
            const formData = new FormData(DOM.formCompra);
            formData.append('nombre_espejo', document.getElementById('producto').value);
            formData.append('enlace_espejo', enlaceEspejoSeleccionado);
            try {
                const response = await fetch(`${API_BASE_URL}/compras/enviar`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.whatsapp_url) {
                    window.location.href = data.whatsapp_url;
                } else {
                    Toast.error('Error', 'No se pudo generar el enlace de WhatsApp', 5000);
                }
            } catch (error) {
                console.error('Error en compra:', error);
                Toast.error('Error', 'Error al procesar la compra', 5000);
            }
        },

        // Módulo de administración
        initAdminPanel() {
            if (DOM.adminLoginForm) {
                DOM.adminLoginForm.addEventListener('submit', this.handleAdminLogin.bind(this));
            }
            
            if (DOM.adminBtn) {
                DOM.adminBtn.addEventListener('click', this.toggleAdminPanel.bind(this));
            }
            
            this.initAdminTabs();
            this.initAdminButtons();
        },

        async handleAdminLogin(e) {
            e.preventDefault();
            // Usar el campo de email como username para el backend
            const username = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);
            try {
                const response = await fetch(`${API_BASE_URL}/auth/token`, {
                    method: 'POST',
                    body: formData
                });
                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('adminToken', data.access_token);
                    currentAdminToken = data.access_token;
                    DOM.adminModal.style.display = 'none';
                    DOM.adminPanel.style.display = 'block';
                    document.body.classList.add('admin-visible');
                    this.loadAdminData();
                    Toast.success('¡Bienvenido!', 'Sesión iniciada correctamente', 3000);
                } else {
                    Toast.error('Error', 'Credenciales incorrectas', 5000);
                }
            } catch (error) {
                console.error('Error en login:', error);
                Toast.error('Error', 'Error al iniciar sesión', 5000);
            }
        },

        toggleAdminPanel() {
            if (currentAdminToken) {
                DOM.adminPanel.style.display = 'block';
                this.loadAdminData();
            } else {
                DOM.adminModal.style.display = 'block';
            }
        },

        initAdminTabs() {
            if (DOM.productosTab && DOM.ofertasTab) {
                DOM.productosTab.addEventListener('click', () => {
                    DOM.productosTab.classList.add('active');
                    DOM.ofertasTab.classList.remove('active');
                    document.getElementById('productosTabContent').classList.add('active');
                    document.getElementById('ofertasTabContent').classList.remove('active');
                });

                DOM.ofertasTab.addEventListener('click', () => {
                    DOM.ofertasTab.classList.add('active');
                    DOM.productosTab.classList.remove('active');
                    document.getElementById('ofertasTabContent').classList.add('active');
                    document.getElementById('productosTabContent').classList.remove('active');
                });
            }
        },

        initAdminButtons() {
            const addProductBtn = document.getElementById('addProductBtn');
            if (addProductBtn) {
                addProductBtn.addEventListener('click', window.abrirNuevoProducto);
            }
            
            const addOfertaBtn = document.getElementById('addOfertaBtn');
            if (addOfertaBtn) {
                addOfertaBtn.addEventListener('click', function() {
                    document.getElementById('ofertaModalTitle').innerText = 'Nueva Oferta';
                    DOM.ofertaModal.style.display = 'block';
                    editandoOfertaId = null;
                });
            }
        },

        async loadAdminData() {
            await this.loadAdminProductos();
            await this.loadAdminOfertas();
        },

        async loadAdminProductos() {
            try {
                const response = await fetch(`${API_BASE_URL}/productos`, {
                    headers: {
                        'Authorization': `Bearer ${currentAdminToken}`
                    }
                });
                const productos = await response.json();
                this.renderAdminProductos(productos);
            } catch (error) {
                console.error('Error cargando productos admin:', error);
                Toast.error('Error', 'No se pudieron cargar los productos', 5000);
            }
        },

        renderAdminProductos(productos) {
            console.log('Productos recibidos para admin:', productos);
            // Si los productos vienen como [{data: {...}}, ...], desanidar:
            if (productos.length && productos[0].data) {
                productos = productos.map(p => p.data);
            }
            const tbody = document.querySelector('#productosTabContent tbody');
            if (!tbody) return;
            
            tbody.innerHTML = productos.map(producto => `
                <tr>
                    <td>
                        <img src="${producto.imagen_base64 || '/static/img/placeholder.jpg'}" 
                             alt="${producto.nombre}" 
                             class="admin-thumbnail"
                             onerror="this.src='/static/img/placeholder.jpg'">
                    </td>
                    <td>${producto.nombre}</td>
                    <td>${producto.categoria}</td>
                    <td class="actions">
                        <button class="btn-editar" onclick="editarProducto(${producto.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-eliminar" onclick="eliminarProducto(${producto.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        },

        async loadAdminOfertas() {
            try {
                const response = await fetch(`${API_BASE_URL}/ofertas`, {
                    headers: {
                        'Authorization': `Bearer ${currentAdminToken}`
                    }
                });
                const ofertas = await response.json();
                this.renderAdminOfertas(ofertas);
            } catch (error) {
                console.error('Error cargando ofertas admin:', error);
                Toast.error('Error', 'No se pudieron cargar las ofertas', 5000);
            }
        },

        renderAdminOfertas(ofertas) {
            const tbody = document.querySelector('#ofertasTabContent tbody');
            if (!tbody) return;
            
            tbody.innerHTML = ofertas.map(oferta => `
                <tr>
                    <td>${oferta.texto || '-'}</td>
                    <td>${oferta.icono || '-'}</td>
                    <td class="actions">
                        <button class="btn-editar" onclick="editarOferta(${oferta.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-eliminar" onclick="eliminarOferta(${oferta.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    };

    // Cerrar modales
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('cerrar-modal') || e.target.classList.contains('cerrar-panel-admin')) {
            e.target.closest('.modal, .admin-panel').style.display = 'none';
        }
    });

    // Modal de compra
    let enlaceEspejoSeleccionado = '';

    window.comprarProducto = function(productoId) {
        fetch(`${API_BASE_URL}/productos/${productoId}`)
            .then(res => res.json())
            .then(producto => {
                document.getElementById('producto').value = producto.nombre;
                enlaceEspejoSeleccionado = `${window.location.origin}/detalle.html?id=${productoId}`;
                DOM.modalCompra.style.display = 'block';
            });
    };

    // Función para compartir productos
    window.compartirProducto = function(nombre, url) {
        if (navigator.share) {
            navigator.share({ title: nombre, url });
        } else {
            window.open(`https://wa.me/?text=Mira este espejo: ${nombre} ${url}`, '_blank');
        }
    };

    // Función para abrir detalle del producto
    window.openProductDetail = function(productoId) {
        window.location.href = `/detalle.html?id=${productoId}`;
    };

    // =====================
    // FUNCIONES ADMIN: PRODUCTOS Y OFERTAS
    // =====================

    // --- PRODUCTOS ---

    let editandoProductoId = null;
    const productForm = document.getElementById('productForm');
    
    // Función para abrir modal de nuevo producto
    window.abrirNuevoProducto = function() {
        // Limpiar formulario
        productForm.reset();
        document.getElementById('productId').value = '';
        document.getElementById('productImagesPreview').innerHTML = '';
        
        // Cambiar título del modal
        const modalTitle = document.querySelector('#productModal .modal-header h2');
        if (modalTitle) {
            modalTitle.innerText = 'Nuevo Espejo';
        }
        
        // Mostrar modal y resetear ID de edición
        DOM.productModal.style.display = 'block';
        editandoProductoId = null;
    };
    
    if (productForm) {
        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(productForm);
            let url = `${API_BASE_URL}/productos`;
            let method = 'POST';
            if (editandoProductoId) {
                url = `${API_BASE_URL}/productos/${editandoProductoId}`;
                method = 'PUT';
            }
            try {
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${currentAdminToken}`
                    },
                    body: formData
                });
                if (response.ok) {
                    Toast.success('¡Éxito!', editandoProductoId ? 'Producto editado correctamente' : 'Producto creado correctamente', 4000);
                    App.loadAdminProductos();
                    productForm.reset();
                    DOM.productModal.style.display = 'none';
                    editandoProductoId = null;
                } else {
                    const errorData = await response.json();
                    Toast.error('Error', errorData.detail || 'No se pudo guardar el producto', 5000);
                }
            } catch (error) {
                console.error('Error guardando producto:', error);
                Toast.error('Error', 'No se pudo guardar el producto', 5000);
            }
        });
    }

    const cerrarProductModal = document.querySelector('.cerrar-modal');
    if (cerrarProductModal) {
        cerrarProductModal.addEventListener('click', function() {
            DOM.productModal.style.display = 'none';
            productForm.reset();
            editandoProductoId = null;
        });
    }

    window.editarProducto = async function(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/productos/${id}`, {
                headers: {
                    'Authorization': `Bearer ${currentAdminToken}`
                }
            });
            if (!response.ok) throw new Error('No se pudo cargar el producto');
            const producto = await response.json();
            
            // Llenar el formulario con los datos del producto
            document.getElementById('productId').value = producto.id;
            document.getElementById('productName').value = producto.nombre || '';
            document.getElementById('productDesc').value = producto.descripcion || '';
            document.getElementById('productPriceWith').value = producto.precio_montura || '';
            document.getElementById('productPriceWithout').value = producto.precio_sin_montura || '';
            document.getElementById('productWidth').value = producto.ancho || '';
            document.getElementById('productHeight').value = producto.largo || '';
            document.getElementById('productCategory').value = producto.categoria || '';
            document.getElementById('productBadge').value = producto.badge || '';
            
            // Mostrar preview de imagen si existe
            const preview = document.getElementById('productImagesPreview');
            if (preview) {
                if (producto.imagen_base64) {
                    preview.innerHTML = `<img src="${producto.imagen_base64}" style="max-width:100px; border-radius: 4px;">`;
                } else {
                    preview.innerHTML = '';
                }
            }
            
            // Cambiar título del modal
            const modalTitle = document.querySelector('#productModal .modal-header h2');
            if (modalTitle) {
                modalTitle.innerText = 'Editar Espejo';
            }
            
            // Mostrar modal y establecer ID de edición
            DOM.productModal.style.display = 'block';
            editandoProductoId = id;
            
        } catch (error) {
            console.error('Error cargando producto:', error);
            Toast.error('Error', 'No se pudo cargar el producto', 4000);
        }
    };

    window.eliminarProducto = async function(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
        try {
            const response = await fetch(`${API_BASE_URL}/productos/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${currentAdminToken}`
                }
            });
            if (response.ok) {
                Toast.success('Eliminado', 'Producto eliminado correctamente', 3000);
                App.loadAdminProductos();
            } else {
                const errorData = await response.json();
                Toast.error('Error', errorData.detail || 'No se pudo eliminar el producto', 5000);
            }
        } catch (error) {
            console.error('Error eliminando producto:', error);
            Toast.error('Error', 'No se pudo eliminar el producto', 5000);
        }
    };

    // --- OFERTAS ---
    let editandoOfertaId = null;
    const ofertaForm = document.getElementById('ofertaForm');
    if (ofertaForm) {
        ofertaForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(ofertaForm);
            let url = `${API_BASE_URL}/ofertas`;
            let method = 'POST';
            if (editandoOfertaId) {
                url = `${API_BASE_URL}/ofertas/${editandoOfertaId}`;
                method = 'PUT';
            }
            try {
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${currentAdminToken}`
                    },
                    body: formData
                });
                if (response.ok) {
                    Toast.success('¡Éxito!', editandoOfertaId ? 'Oferta editada correctamente' : 'Oferta creada correctamente', 4000);
                    App.loadAdminOfertas();
                    ofertaForm.reset();
                    DOM.ofertaModal.style.display = 'none';
                    editandoOfertaId = null;
                } else {
                    const errorData = await response.json();
                    Toast.error('Error', errorData.detail || 'No se pudo guardar la oferta', 5000);
                }
            } catch (error) {
                Toast.error('Error', 'No se pudo guardar la oferta', 5000);
            }
        });
    }

    const cerrarOfertaModal = document.querySelector('.cerrar-oferta-modal');
    if (cerrarOfertaModal) {
        cerrarOfertaModal.addEventListener('click', function() {
            DOM.ofertaModal.style.display = 'none';
            ofertaForm.reset();
            editandoOfertaId = null;
        });
    }

    window.editarOferta = async function(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/ofertas/${id}`, {
                headers: {
                    'Authorization': `Bearer ${currentAdminToken}`
                }
            });
            if (!response.ok) throw new Error('No se pudo cargar la oferta');
            const oferta = await response.json();
            
            // Llenar el formulario con los datos de la oferta
            document.getElementById('ofertaId').value = oferta.id;
            document.getElementById('ofertaTexto').value = oferta.texto || '';
            document.getElementById('ofertaIcono').value = oferta.icono || '';
            
            // Cambiar título del modal
            const modalTitle = document.getElementById('ofertaModalTitle');
            if (modalTitle) {
                modalTitle.innerText = 'Editar Oferta';
            }
            
            // Mostrar modal y establecer ID de edición
            DOM.ofertaModal.style.display = 'block';
            editandoOfertaId = id;
            
        } catch (error) {
            console.error('Error cargando oferta:', error);
            Toast.error('Error', 'No se pudo cargar la oferta', 4000);
        }
    };

    window.eliminarOferta = async function(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta oferta?')) return;
        try {
            const response = await fetch(`${API_BASE_URL}/ofertas/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${currentAdminToken}`
                }
            });
            if (response.ok) {
                Toast.success('Eliminado', 'Oferta eliminada correctamente', 3000);
                App.loadAdminOfertas();
            } else {
                const errorData = await response.json();
                Toast.error('Error', errorData.detail || 'No se pudo eliminar la oferta', 5000);
            }
        } catch (error) {
            console.error('Error eliminando oferta:', error);
            Toast.error('Error', 'No se pudo eliminar la oferta', 5000);
        }
    };

    // Menú hamburguesa
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function() {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('open');
            // Accesibilidad
            menuToggle.setAttribute('aria-expanded', navMenu.classList.contains('open'));
            // Prevenir scroll del body cuando el menú está abierto
            if (navMenu.classList.contains('open')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        // Cerrar menú al hacer clic en un enlace (solo móvil)
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    navMenu.classList.remove('open');
                    menuToggle.classList.remove('active');
                    menuToggle.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                }
            });
        });
    }

    // Inicialización
    App.init();
}); 
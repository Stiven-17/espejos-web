// Funcionalidad del menú móvil
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('nav');
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', function() {
            nav.querySelector('ul').classList.toggle('active');
        });
        
        // Cerrar menú al hacer clic en un enlace
        const navLinks = nav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                nav.querySelector('ul').classList.remove('active');
            });
        });
        
        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
                nav.querySelector('ul').classList.remove('active');
            }
        });
    }
});

function getIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function cargarOfertas() {
    try {
        const response = await fetch('/api/ofertas/');
        if (!response.ok) throw new Error('Error al cargar ofertas');
        const ofertas = await response.json();
        renderOfertasSlider(ofertas);
    } catch (error) {
        console.error('Error al cargar ofertas:', error);
    }
}

function renderOfertasSlider(ofertas) {
    const slider = document.getElementById('ofertas');
    if (!slider) return;
    if (!ofertas.length) {
        slider.innerHTML = '<p class="no-ofertas">No hay ofertas disponibles</p>';
        return;
    }
    let current = 0;
    function showOferta(idx) {
        const oferta = ofertas[idx];
        slider.innerHTML = `
            <div class="oferta-item-slider">
                <div class="oferta-icono"><i class="${oferta.icono || 'fas fa-tag'}"></i></div>
                <div class="oferta-texto">${oferta.texto}</div>
            </div>
        `;
    }
    showOferta(current);
    if (window.ofertaIntervalDetalle) clearInterval(window.ofertaIntervalDetalle);
    window.ofertaIntervalDetalle = setInterval(() => {
        current = (current + 1) % ofertas.length;
        showOferta(current);
    }, 3000);
}

async function cargarDetalleProducto() {
    try {
        const id = getIdFromUrl();
        if (!id) return;
        const response = await fetch(`/api/productos/${id}`);
        if (!response.ok) throw new Error('Error al cargar el producto');
        const producto = await response.json();
        renderTarjetaProducto(producto);
        configurarBotones(producto);
    } catch (error) {
        console.error('Error:', error);
        document.querySelector('.detalle-producto').innerHTML = '<p style="color:red;">No se pudo cargar el producto.</p>';
    }
}

function renderTarjetaProducto(producto) {
    const detalle = document.querySelector('.detalle-producto');
    if (!detalle) return;
    detalle.innerHTML = `
        <div class="tarjeta-producto-moderna">
            <div class="img-badge-container">
                <div class="img-wrapper">
                    ${producto.imagen_base64 ? `<img src="${producto.imagen_base64}" alt="${producto.nombre}" class="producto-imagen-moderna" id="img-ampliable">` : '<div class="producto-imagen-placeholder"><i class="fas fa-image"></i></div>'}
                </div>
                ${producto.badge ? `<span class="badge-moderna">${producto.badge}</span>` : ''}
            </div>
            <div class="info-wrapper">
                <h1 class="nombre-producto-moderna">${producto.nombre}</h1>
                <p class="desc-moderna">${producto.descripcion || 'Sin descripción'}</p>
                <div class="dimensiones-moderna">
                    <i class="fas fa-ruler-combined"></i> ${producto.ancho ? producto.ancho + 'cm' : '-'} x ${producto.largo ? producto.largo + 'cm' : '-'}
                </div>
                <div class="precios-moderna">
                    <span class="precio-con-moderna">Con instalación: <b>$${producto.precio_montura.toLocaleString()}</b></span>
                    <span class="precio-sin-moderna">Sin instalación: <b>$${producto.precio_sin_montura.toLocaleString()}</b></span>
                </div>
                <div class="botones-moderna">
                    <button class="btn-moderna comprar" id="btn-comprar"><i class="fas fa-shopping-cart"></i> Comprar</button>
                    <button class="btn-moderna compartir" id="btn-compartir"><i class="fas fa-share"></i> Compartir</button>
                </div>
            </div>
        </div>
        <div id="lightbox" class="lightbox" style="display:none;">
            <span class="close-lightbox">&times;</span>
            <img id="lightbox-img" class="lightbox-content" src="" alt="Imagen ampliada">
        </div>
    `;
    // Evento para ampliar imagen
    const img = document.getElementById('img-ampliable');
    if (img) {
        img.onclick = function() {
            const lightbox = document.getElementById('lightbox');
            const lightboxImg = document.getElementById('lightbox-img');
            if (lightbox && lightboxImg) {
                lightboxImg.src = img.src;
                lightbox.style.display = 'flex';
            }
        };
    }
    // Evento para cerrar lightbox
    const closeBtn = document.querySelector('.close-lightbox');
    if (closeBtn) {
        closeBtn.onclick = function() {
            const lightbox = document.getElementById('lightbox');
            if (lightbox) lightbox.style.display = 'none';
        };
    }
}

function cargarImagenProducto(producto) {
    const imgProducto = document.getElementById('imagen-producto');
    if (!imgProducto) return;

    let imagen = '/static/img/placeholder.jpg';
    
    try {
        let imagenes = typeof producto.imagenes === 'string' ? 
            JSON.parse(producto.imagenes) : producto.imagenes || [];
        
        if (imagenes.length > 0) {
            imagen = corregirRutaImagen(imagenes[0]);
        }
        console.log('Ruta de imagen:', imagen); // Debug
    } catch (e) {
        console.error('Error procesando imagen:', e);
    }

    imgProducto.src = imagen;
    imgProducto.alt = producto.nombre;
}

let enlaceEspejoSeleccionado = '';

function configurarBotones(producto) {
    // Botón comprar
    const btnComprar = document.getElementById('btn-comprar');
    if (btnComprar) {
        btnComprar.onclick = () => {
            const modalCompra = document.getElementById('modal-compra');
            if (modalCompra) {
                document.getElementById('producto').value = producto.nombre;
                enlaceEspejoSeleccionado = `${window.location.origin}/detalle.html?id=${producto.id}`;
                modalCompra.style.display = 'block';
            }
        };
    }

    // Botón compartir
    const btnCompartir = document.getElementById('btn-compartir');
    if (btnCompartir) {
        btnCompartir.onclick = async () => {
            const url = window.location.href;
            try {
                if (navigator.share) {
                    await navigator.share({
                        title: producto.nombre,
                        text: `¡Mira este espejo: ${producto.nombre}!`,
                        url: url
                    });
                } else {
                    compartirPorWhatsApp(producto.nombre, url);
                }
            } catch (error) {
                console.error('Error al compartir:', error);
                compartirPorWhatsApp(producto.nombre, url);
            }
        };
    }

    // Configurar formulario de compra
    setupFormularioCompra();
}

function setupFormularioCompra() {
    const formCompra = document.getElementById('form-compra');
    const modalCompra = document.getElementById('modal-compra');

    if (formCompra) {
        formCompra.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(formCompra);
            formData.append('nombre_espejo', document.getElementById('producto').value);
            formData.append('enlace_espejo', enlaceEspejoSeleccionado);
            try {
                const response = await fetch('/api/compras/enviar', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.whatsapp_url) {
                    window.location.href = data.whatsapp_url;
                } else {
                    alert('No se pudo generar el enlace de WhatsApp');
                }
            } catch (error) {
                alert('Error al procesar la compra');
            }
        };
    }

    // Configurar cierre del modal
    const cerrarModal = document.querySelector('.cerrar-modal-compra');
    if (cerrarModal) {
        cerrarModal.onclick = () => {
            modalCompra.style.display = 'none';
        };
    }
}

function mostrarLightbox(src) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    if (lightbox && lightboxImg) {
        lightboxImg.src = src;
        lightbox.style.display = 'block';
    }
}

function corregirRutaImagen(ruta) {
    if (!ruta) return '/static/img/placeholder.jpg';
    if (ruta.startsWith('http')) return ruta;
    if (ruta.startsWith('/frontend/')) return ruta.replace('/frontend/', '/static/');
    if (!ruta.startsWith('/')) return `/static/img/${ruta}`;
    return ruta;
}

function compartirPorWhatsApp(nombre, url) {
    const mensaje = `¡Mira este espejo: ${nombre}! ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
}

// Funcionalidad del botón de admin
document.addEventListener('DOMContentLoaded', function() {
    const adminBtn = document.getElementById('adminBtn');
    
    if (adminBtn) {
        adminBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Redirigir a la página principal para el login de admin
            window.location.href = '/?admin=true';
        });
    }
});

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    cargarOfertas();
    cargarDetalleProducto();
});

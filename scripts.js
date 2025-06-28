document.addEventListener('DOMContentLoaded', () => {

    // Obtenemos el contenedor donde se mostrarán los productos
    const productosContainer = document.getElementById('productos-container');

    let productos = [];

    fetch('servicios.json')
        .then(res => res.json())
        .then(data => {
            productos = data;
            mostrarProductos('Todos');
        });

    // Variables para guardar la fecha y hora seleccionadas
    let fechaSeleccionada = null;
    let horaSeleccionada = null;

    // Manejo del filtrado por categoría a través de botones o enlaces con data-categoria
    document.querySelectorAll('[data-categoria]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const categoria = e.target.getAttribute('data-categoria');
            mostrarProductos(categoria);
        });
    });

    // Función para mostrar los productos en base a la categoría seleccionada
    function mostrarProductos(categoriaSeleccionada) {
        productosContainer.innerHTML = ''; // Limpiamos el contenedor

        // Filtramos productos si se selecciona una categoría específica
        const productosFiltrados = categoriaSeleccionada === 'Todos'
            ? productos
            : productos.filter(p => p.categoria === categoriaSeleccionada);

        // Mostramos mensaje si no hay productos
        if (productosFiltrados.length === 0) {
            productosContainer.innerHTML = "<p>No hay productos en esta categoría.</p>";
            return;
        }

        // Renderizamos cada producto
        productosFiltrados.forEach(producto => {
            const div = document.createElement('div');
            div.classList.add('producto');
            div.innerHTML = `
                <h3>${producto.nombre}</h3>
                <p>${producto.descripcion}</p>
                <p class="precio">${producto.precio}</p>
                <p class="duracion">Duración: ${producto.duracion} min</p>
                <button class="btn-carrito" data-nombre="${producto.nombre}">Reservar</button>
            `;
            productosContainer.appendChild(div);
        });
    }

    // Mostramos todos los productos por defecto al cargar la página
    mostrarProductos('Todos');

    // Carrito en memoria
    let carrito = [];

    // Agregar producto al carrito
    function agregarAlCarrito(nombreProducto) {
        const producto = productos.find(p => p.nombre === nombreProducto);
        const productoExistente = carrito.find(item => item.nombre === nombreProducto);
        if (productoExistente) {
            productoExistente.cantidad += 1;
        } else {
            carrito.push({ nombre: nombreProducto, cantidad: 1, duracion: producto.duracion });
        }
        actualizarContadorCarrito();
    }

    // Actualizar el contador del carrito
    function actualizarContadorCarrito() {
        const contador = document.querySelector(".carrito .cantidad");
        if (contador) {
            const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
            contador.textContent = total;
        }
    }

    // Mostrar el carrito en un modal
    function mostrarCarrito() {
        let html = '<h2>Carrito de compras</h2>';
        if (carrito.length === 0) {
            html += '<p>El carrito está vacío.</p>';
        } else {
            html += '<ul>';
            let total = 0;
            carrito.forEach((item, idx) => {
                // Extraer el valor numérico del precio
                const producto = productos.find(p => p.nombre === item.nombre);
                let precioUnitario = 0;
                if (producto) {
                    precioUnitario = parseInt(producto.precio.replace(/\D/g, ''));
                }
                const subtotal = precioUnitario * item.cantidad;
                total += subtotal;
                html += `<li>${item.nombre} x${item.cantidad} <span style="font-weight:400;">($${subtotal.toLocaleString('es-CO')})</span> <button data-idx="${idx}" class="eliminar-item">Eliminar</button></li>`;
            });
            html += '</ul>';
            html += `<p style="font-weight:bold;font-size:18px;margin-top:10px;">Total: $${total.toLocaleString('es-CO')}</p>`;

            // Mostramos el calendario directamente (sin botón)
            html += `<div id="calendario-turnos" style="margin-top:15px;"></div>`;

            // Formulario de datos del cliente
            html += `
                <form id="form-datos-cliente" style="margin-top:15px;">
                    <label>Nombre:<br><input type="text" name="nombre" required style="width:100%;margin-bottom:8px;"></label><br>
                    <label>WhatsApp:<br><input type="tel" name="whatsapp" required style="width:100%;margin-bottom:8px;"></label><br>
                    <label>Correo:<br><input type="email" name="correo" required style="width:100%;margin-bottom:8px;"></label><br>
                    <button type="submit" style="padding:10px 20px;background:#000;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:16px;">Finalizar reserva</button>
                </form>
            `;
        }
        const modal = document.createElement('div');
        modal.id = 'modal-carrito';
        modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:2000;';
        modal.innerHTML = `<div style="background:#fff;padding:20px;border-radius:8px;max-width:90vw;max-height:90vh;position:relative;">
            <button id="cerrar-carrito" style="position:absolute;top:10px;right:10px;font-size:1.5em;background:none;border:none;cursor:pointer;">&times;</button>
            ${html}
        </div>`;
        document.body.appendChild(modal);

        document.getElementById('cerrar-carrito').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        modal.querySelectorAll('.eliminar-item').forEach(btn => {
            btn.onclick = function () {
                const idx = parseInt(this.getAttribute('data-idx'));
                carrito.splice(idx, 1);
                modal.remove();
                mostrarCarrito();
                actualizarContadorCarrito();
            };
        });

        // Mostrar el calendario automáticamente si hay productos en el carrito
        if (carrito.length > 0) {
            const duracionTotal = carrito.reduce((sum, item) => sum + (item.duracion * item.cantidad), 0);
            mostrarCalendarioTurnos(modal.querySelector('#calendario-turnos'), duracionTotal);
        }

        // Acción del formulario de datos del cliente
        const formDatos = modal.querySelector('#form-datos-cliente');
        if (formDatos) {
            formDatos.onsubmit = function (e) {
                e.preventDefault();
                const nombre = formDatos.nombre.value.trim();
                const whatsapp = formDatos.whatsapp.value.trim();
                const correo = formDatos.correo.value.trim();
                const servicios = carrito.map(item => `${item.nombre} x${item.cantidad}`).join(', ');

                // Formatear fecha y hora seleccionadas
                let fechaHoraTexto = '';
                if (fechaSeleccionada && horaSeleccionada) {
                    const meses = [
                        "enero", "febrero", "marzo", "abril", "mayo", "junio",
                        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
                    ];
                    fechaHoraTexto = `\nFecha: ${fechaSeleccionada.dia} de ${meses[fechaSeleccionada.mes]} de ${fechaSeleccionada.año}\nHora: ${horaSeleccionada}`;
                } else {
                    fechaHoraTexto = "\nFecha y hora: No seleccionadas";
                }

                // Mensaje para WhatsApp
                const mensaje = encodeURIComponent(
                    `¡Hola! Quiero reservar los siguientes servicios: ${servicios}${fechaHoraTexto}\nNombre: ${nombre}\nWhatsApp: ${whatsapp}\nCorreo: ${correo}`
                );
                // Número de WhatsApp de destino (cámbialo por el tuyo)
                const numeroDestino = "573135048789";
                const url = `https://wa.me/${numeroDestino}?text=${mensaje}`;

                window.open(url, '_blank');
                modal.remove();
                carrito = [];
                actualizarContadorCarrito();
                mostrarNotificacion(`¡Reserva enviada por WhatsApp! Gracias, ${nombre}.`);
            };
        }
    }

    // Función para mostrar el calendario y reservar turno
    function mostrarCalendarioTurnos(contenedor, duracionTotal) {
        // Fecha actual
        const hoy = new Date();
        let año = hoy.getFullYear();
        let mes = hoy.getMonth();

        render();

        function render() {
            const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
            const meses = [
                "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
            ];
            let html = `
            <div style="margin-bottom:10px;display:flex;align-items:center;gap:10px;justify-content:center;">
                <select id="select-mes" style="padding:6px 10px;font-size:15px;">
                    ${meses.map((m, i) => `<option value="${i}" ${i === mes ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
                <input type="number" id="select-anio" value="${año}" min="2024" max="2100" style="width:70px;padding:6px 5px;font-size:15px;">
            </div>
            <h3>Selecciona un día para tu turno</h3>
            <table class="calendario-modal">
                <thead>
                    <tr>${diasSemana.map(d => `<th>${d}</th>`).join('')}</tr>
                </thead>
                <tbody>
        `;

            const primerDia = new Date(año, mes, 1);
            const primerDiaSemana = (primerDia.getDay() + 6) % 7; // Lunes=0, Domingo=6
            const diasEnMes = new Date(año, mes + 1, 0).getDate();

            let dia = 1;
            for (let fila = 0; dia <= diasEnMes; fila++) {
                html += '<tr>';
                for (let col = 0; col < 7; col++) {
                    if ((fila === 0 && col < primerDiaSemana) || dia > diasEnMes) {
                        html += '<td></td>';
                    } else {
                        html += `<td><button class="btn-dia-turno" data-dia="${dia}" style="width:36px;height:36px;">${dia}</button></td>`;
                        dia++;
                    }
                }
                html += '</tr>';
            }
            html += `</tbody></table><div id="horas-turno" style="margin-top:10px;"></div>`;

            contenedor.innerHTML = html;

            // Cambiar mes
            contenedor.querySelector('#select-mes').onchange = function () {
                mes = parseInt(this.value);
                render();
            };
            // Cambiar año
            contenedor.querySelector('#select-anio').onchange = function () {
                año = parseInt(this.value);
                render();
            };

            // Evento para seleccionar día con resaltado
            contenedor.querySelectorAll('.btn-dia-turno').forEach(btn => {
                btn.onclick = function () {
                    contenedor.querySelectorAll('.btn-dia-turno').forEach(b => b.classList.remove('seleccionado'));
                    this.classList.add('seleccionado');
                    const diaSeleccionado = this.getAttribute('data-dia');
                    fechaSeleccionada = {
                        año: año,
                        mes: mes,
                        dia: parseInt(diaSeleccionado)
                    };
                    if (duracionTotal > 180) {
                        horaSeleccionada = null;
                        contenedor.querySelector('#horas-turno').innerHTML = `<p style="color:#c00;font-weight:bold;">Este servicio requiere coordinación especial. Solo selecciona día y mes, nos pondremos en contacto para agendar la hora.</p>`;
                    } else {
                        mostrarHorasTurno(contenedor.querySelector('#horas-turno'), año, mes, diaSeleccionado, duracionTotal);
                    }
                };
            });
        }
    }

    // Horarios según bloques de atención y duración total
    function mostrarHorasTurno(contenedor, _año, _mes, _dia, duracionTotal) {
        let html = `<h4>Selecciona una hora:</h4>
        <select id="select-hora-turno" style="width:100%;padding:8px;font-size:16px;">
            <option value="">-- Selecciona una hora --</option>`;

        const bloques = [
            { inicio: 9, fin: 12 },   // 9:00 a 12:00
            { inicio: 14, fin: 19 }   // 14:00 a 19:00
        ];

        bloques.forEach(bloque => {
            let bloqueInicioMin = bloque.inicio * 60;
            let bloqueFinMin = bloque.fin * 60;

            for (let min = bloqueInicioMin; min + duracionTotal <= bloqueFinMin; min += duracionTotal) {
                let hora = Math.floor(min / 60);
                let minutos = min % 60;
                let ampm = hora >= 12 ? 'PM' : 'AM';
                let hora12 = hora % 12;
                if (hora12 === 0) hora12 = 12;
                let horaStr = `${hora12}:${minutos.toString().padStart(2, '0')} ${ampm}`;
                html += `<option value="${horaStr}">${horaStr}</option>`;
            }
        });

        html += `</select>`;

        contenedor.innerHTML = html;

        // Evento para seleccionar hora
        const selectHora = contenedor.querySelector('#select-hora-turno');
        selectHora.onchange = function () {
            horaSeleccionada = this.value;
        };
    }

    // Modificar el mensaje de WhatsApp para el caso de servicios largos (>180min)
    // Sobrescribe la función mostrarCarrito para ajustar el mensaje según corresponda
    mostrarCarrito = function () {
        let html = '<h2>Carrito de compras</h2>';
        if (carrito.length === 0) {
            html += '<p>El carrito está vacío.</p>';
        } else {
            html += '<ul>';
            let total = 0;
            carrito.forEach((item, idx) => {
                // Extraer el valor numérico del precio
                const producto = productos.find(p => p.nombre === item.nombre);
                let precioUnitario = 0;
                if (producto) {
                    precioUnitario = parseInt(producto.precio.replace(/\D/g, ''));
                }
                const subtotal = precioUnitario * item.cantidad;
                total += subtotal;
                html += `<li>${item.nombre} x${item.cantidad} <span style="font-weight:400;">($${subtotal.toLocaleString('es-CO')})</span> <button data-idx="${idx}" class="eliminar-item">Eliminar</button></li>`;
            });
            html += '</ul>';
            html += `<p style="font-weight:bold;font-size:18px;margin-top:10px;">Total: $${total.toLocaleString('es-CO')}</p>`;

            // Mostramos el calendario directamente (sin botón)
            html += `<div id="calendario-turnos" style="margin-top:15px;"></div>`;

            // Formulario de datos del cliente
            html += `
                <form id="form-datos-cliente" style="margin-top:15px;">
                    <label>Nombre:<br><input type="text" name="nombre" required style="width:100%;margin-bottom:8px;"></label><br>
                    <label>WhatsApp:<br><input type="tel" name="whatsapp" required style="width:100%;margin-bottom:8px;"></label><br>
                    <label>Correo:<br><input type="email" name="correo" required style="width:100%;margin-bottom:8px;"></label><br>
                    <button type="submit" style="padding:10px 20px;background:#000;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:16px;">Finalizar reserva</button>
                </form>
            `;
        }
        const modal = document.createElement('div');
        modal.id = 'modal-carrito';
        modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:2000;';
        modal.innerHTML = `<div style="background:#fff;padding:20px;border-radius:8px;max-width:90vw;max-height:90vh;position:relative;">
            <button id="cerrar-carrito" style="position:absolute;top:10px;right:10px;font-size:1.5em;background:none;border:none;cursor:pointer;">&times;</button>
            ${html}
        </div>`;
        document.body.appendChild(modal);

        document.getElementById('cerrar-carrito').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        modal.querySelectorAll('.eliminar-item').forEach(btn => {
            btn.onclick = function () {
                const idx = parseInt(this.getAttribute('data-idx'));
                carrito.splice(idx, 1);
                modal.remove();
                mostrarCarrito();
                actualizarContadorCarrito();
            };
        });

        // Mostrar el calendario automáticamente si hay productos en el carrito
        if (carrito.length > 0) {
            const duracionTotal = carrito.reduce((sum, item) => sum + (item.duracion * item.cantidad), 0);
            mostrarCalendarioTurnos(modal.querySelector('#calendario-turnos'), duracionTotal);
        }

        // Acción del formulario de datos del cliente
        const formDatos = modal.querySelector('#form-datos-cliente');
        if (formDatos) {
            formDatos.onsubmit = function (e) {
                e.preventDefault();
                const nombre = formDatos.nombre.value.trim();
                const whatsapp = formDatos.whatsapp.value.trim();
                const correo = formDatos.correo.value.trim();
                const servicios = carrito.map(item => `${item.nombre} x${item.cantidad}`).join(', ');

                // Formatear fecha y hora seleccionadas
                let fechaHoraTexto = '';
                const meses = [
                    "enero", "febrero", "marzo", "abril", "mayo", "junio",
                    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
                ];
                const duracionTotal = carrito.reduce((sum, item) => sum + (item.duracion * item.cantidad), 0);

                if (fechaSeleccionada) {
                    fechaHoraTexto = `\nFecha: ${fechaSeleccionada.dia} de ${meses[fechaSeleccionada.mes]} de ${fechaSeleccionada.año}`;
                    if (duracionTotal > 180) {
                        fechaHoraTexto += `\nHora: a convenir`;
                    } else if (horaSeleccionada) {
                        fechaHoraTexto += `\nHora: ${horaSeleccionada}`;
                    } else {
                        fechaHoraTexto += `\nHora: No seleccionada`;
                    }
                } else {
                    fechaHoraTexto = "\nFecha y hora: No seleccionadas";
                }

                // Mensaje para WhatsApp
                const mensaje = encodeURIComponent(
                    `¡Hola! Quiero reservar los siguientes servicios: ${servicios}${fechaHoraTexto}\nNombre: ${nombre}\nWhatsApp: ${whatsapp}\nCorreo: ${correo}`
                );
                // Número de WhatsApp de destino (cámbialo por el tuyo)
                const numeroDestino = "573135048789";
                const url = `https://wa.me/${numeroDestino}?text=${mensaje}`;

                window.open(url, '_blank');
                modal.remove();
                carrito = [];
                actualizarContadorCarrito();
                mostrarNotificacion(`¡Reserva enviada por WhatsApp! Gracias, ${nombre}.`);
            };
        }
    };

    // Evento para botones "Reservar servicio" y mostrar carrito
    document.addEventListener("click", function (e) {
        if (e.target.classList.contains("btn-carrito")) {
            const nombreProducto = e.target.getAttribute("data-nombre");
            agregarAlCarrito(nombreProducto);
            mostrarNotificacion(`"${nombreProducto}" fue agregado al carrito 🛍️`);
        }
        if (e.target.classList.contains("carrito")) {
            e.preventDefault();
            mostrarCarrito();
        }
    });

    // Función para mostrar notificaciones temporales
    function mostrarNotificacion(mensaje) {
        const notificacion = document.getElementById('notificacion');
        notificacion.textContent = mensaje;
        notificacion.classList.add('mostrar');

        // Ocultamos la notificación después de 3 segundos
        setTimeout(() => {
            notificacion.classList.remove('mostrar');
        }, 1000);
    }

    // Mostrar el modal con indicaciones al hacer clic en el enlace
    const enlaceIndicaciones = document.getElementById('enlace-indicaciones');
    if (enlaceIndicaciones) {
        enlaceIndicaciones.onclick = function (e) {
            e.preventDefault();
            document.getElementById('modal-indicaciones').style.display = 'flex';
        };
    }

    // Cerrar el modal al hacer clic en el botón "cerrar"
    const cerrarIndicaciones = document.getElementById('cerrar-indicaciones');
    if (cerrarIndicaciones) {
        cerrarIndicaciones.onclick = function () {
            document.getElementById('modal-indicaciones').style.display = 'none';
        };
    }

    // También cerrar el modal si se hace clic fuera del contenido
    const modalIndicaciones = document.getElementById('modal-indicaciones');
    if (modalIndicaciones) {
        modalIndicaciones.onclick = function (e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        };
    }

});
// Permitir arrastrar el banner de categorías manualmente
const menuCategorias = document.querySelector('.menu-categorias');
let isDown = false;
let startX;
let scrollLeft;

if (menuCategorias) {
    menuCategorias.addEventListener('mousedown', (e) => {
        isDown = true;
        menuCategorias.classList.add('dragging');
        startX = e.pageX - menuCategorias.offsetLeft;
        scrollLeft = menuCategorias.scrollLeft;
    });
    menuCategorias.addEventListener('mouseleave', () => {
        isDown = false;
        menuCategorias.classList.remove('dragging');
    });
    menuCategorias.addEventListener('mouseup', () => {
        isDown = false;
        menuCategorias.classList.remove('dragging');
    });
    menuCategorias.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - menuCategorias.offsetLeft;
        const walk = (x - startX) * 1.5; // Ajusta la sensibilidad
        menuCategorias.scrollLeft = scrollLeft - walk;
    });
    // Soporte para touch en móviles
    menuCategorias.addEventListener('touchstart', (e) => {
        isDown = true;
        startX = e.touches[0].pageX - menuCategorias.offsetLeft;
        scrollLeft = menuCategorias.scrollLeft;
    });
    menuCategorias.addEventListener('touchend', () => {
        isDown = false;
    });
    menuCategorias.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        const x = e.touches[0].pageX - menuCategorias.offsetLeft;
        const walk = (x - startX) * 1.5;
        menuCategorias.scrollLeft = scrollLeft - walk;
    });
}

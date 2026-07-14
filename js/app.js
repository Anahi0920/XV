"use strict";

/*
==================================================
CONFIGURACIÓN
==================================================
*/

// Pega aquí la URL que termina en /exec
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbwXdjWYMlq8m23Ws7pWCcfp6FkvjmaoHZzijCPyj5qIgo-QLQ72TzaRCywWCVMQCww7uA/exec";

// Fecha del evento.
// Formato: año, mes-1, día, hora, minuto.
const FECHA_EVENTO = new Date(2026, 06, 31, 19, 0, 0);


/*
==================================================
ELEMENTOS DEL HTML
==================================================
*/

const pantallaCarga = document.getElementById("pantallaCarga");
const invitacion = document.getElementById("invitacion");
const seccionError = document.getElementById("seccionError");
const mensajeError = document.getElementById("mensajeError");

const nombreInvitado = document.getElementById("nombreInvitado");
const numeroLugares = document.getElementById("numeroLugares");
const textoLugares = document.getElementById("textoLugares");
const mensajeLimite = document.getElementById("mensajeLimite");

const opcionesAsistentes = document.getElementById(
    "opcionesAsistentes"
);

const botonConfirmar = document.getElementById(
    "botonConfirmar"
);

const mensajeConfirmacion = document.getElementById(
    "mensajeConfirmacion"
);

const musicaFondo = document.getElementById("musicaFondo");
const botonMusica = document.getElementById("botonMusica");


/*
==================================================
ESTADO
==================================================
*/

let idInvitado = "";
let limiteInvitados = 0;
let numeroSeleccionado = 0;
let yaConfirmado = false;


/*
==================================================
INICIO
==================================================
*/

document.addEventListener("DOMContentLoaded", iniciarAplicacion);

async function iniciarAplicacion() {
    try {
        idInvitado = obtenerIdInvitado();

        if (!idInvitado) {
            mostrarError(
                "El enlace no contiene un identificador de invitado."
            );

            return;
        }

        const datos = await consultarInvitado(idInvitado);

        if (datos.estado !== "ok") {
            mostrarError(
                "El código de esta invitación no fue encontrado."
            );

            return;
        }

        cargarDatosInvitado(datos);
        iniciarCuentaRegresiva();
        configurarMusica();

        pantallaCarga.classList.add("oculto");
        invitacion.classList.remove("oculto");
    } catch (error) {
        console.error(error);

        mostrarError(
            "No fue posible cargar la invitación. Revisa tu conexión e intenta nuevamente."
        );
    }
}


/*
==================================================
IDENTIFICACIÓN DEL INVITADO
==================================================
*/

function obtenerIdInvitado() {
    const parametros = new URLSearchParams(window.location.search);

    return (parametros.get("id") || "")
        .trim()
        .toUpperCase();
}

async function consultarInvitado(id) {
    validarUrlApi();

    const url =
        `${URL_APPS_SCRIPT}?id=${encodeURIComponent(id)}`;

    const respuesta = await fetch(url);

    if (!respuesta.ok) {
        throw new Error(
            `Error HTTP al consultar invitado: ${respuesta.status}`
        );
    }

    return await respuesta.json();
}

function cargarDatosInvitado(datos) {
    const nombre = datos.nombre || "invitado";
    const limite = Number(datos.limite);

    if (!Number.isInteger(limite) || limite < 1) {
        throw new Error("El límite de invitados no es válido.");
    }

    nombreInvitado.textContent = nombre;
    numeroLugares.textContent = limite;
    textoLugares.textContent = limite === 1
        ? "lugar"
        : "lugares";

    limiteInvitados = limite;

    const estadoConfirmacion = String(
        datos.confirmado || ""
    )
        .trim()
        .toUpperCase();

    yaConfirmado = estadoConfirmacion === "SI";

    if (yaConfirmado) {
        mostrarConfirmacionExistente();
        return;
    }

    mensajeLimite.textContent =
        limite === 1
            ? "Puedes confirmar 1 persona."
            : `Puedes confirmar de 1 a ${limite} personas.`;

    crearOpcionesAsistentes(limite);
}


/*
==================================================
SELECTOR DE ASISTENTES
==================================================
*/

function crearOpcionesAsistentes(limite) {
    opcionesAsistentes.innerHTML = "";

    for (let numero = 1; numero <= limite; numero++) {
        const contenedor = document.createElement("div");
        contenedor.className = "opcion-asistente";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "asistentes";
        input.id = `asistentes-${numero}`;
        input.value = String(numero);

        const label = document.createElement("label");
        label.htmlFor = input.id;
        label.textContent = String(numero);

        input.addEventListener("change", () => {
            numeroSeleccionado = numero;
            botonConfirmar.disabled = false;
            mensajeConfirmacion.textContent = "";
        });

        contenedor.append(input, label);
        opcionesAsistentes.appendChild(contenedor);
    }
}


/*
==================================================
CONFIRMACIÓN
==================================================
*/

botonConfirmar.addEventListener(
    "click",
    confirmarAsistencia
);

async function confirmarAsistencia() {
    if (yaConfirmado) {
        return;
    }

    if (
        numeroSeleccionado < 1 ||
        numeroSeleccionado > limiteInvitados
    ) {
        mensajeConfirmacion.textContent =
            "Selecciona una cantidad válida.";

        return;
    }

    botonConfirmar.disabled = true;
    botonConfirmar.textContent = "Confirmando...";
    mensajeConfirmacion.textContent = "";

    try {
        const resultado = await guardarConfirmacion(
            idInvitado,
            numeroSeleccionado
        );

        procesarResultadoConfirmacion(resultado);
    } catch (error) {
        console.error(error);

        mensajeConfirmacion.textContent =
            "No fue posible guardar la confirmación. Intenta nuevamente.";

        botonConfirmar.disabled = false;
        botonConfirmar.textContent =
            "Confirmar asistencia";
    }
}

async function guardarConfirmacion(id, asistentes) {
    validarUrlApi();

    /*
    Se utiliza text/plain para evitar la solicitud previa
    CORS conocida como preflight.
    El Apps Script puede seguir leyendo el contenido como JSON.
    */

    const respuesta = await fetch(URL_APPS_SCRIPT, {
        method: "POST",

        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },

        body: JSON.stringify({
            id,
            asistentes
        })
    });

    if (!respuesta.ok) {
        throw new Error(
            `Error HTTP al confirmar: ${respuesta.status}`
        );
    }

    return await respuesta.json();
}

function procesarResultadoConfirmacion(resultado) {
    switch (resultado.estado) {
        case "ok":
            yaConfirmado = true;

            opcionesAsistentes.innerHTML = "";

            mensajeLimite.textContent = "";

            botonConfirmar.classList.add("oculto");

            mensajeConfirmacion.textContent =
                `¡Gracias! Registramos la asistencia de ${numeroSeleccionado} ${
                    numeroSeleccionado === 1
                        ? "persona"
                        : "personas"
                }.`;

            break;

        case "ya_confirmado":
            mostrarConfirmacionExistente();
            break;

        case "limite_superado":
            mensajeConfirmacion.textContent =
                `La invitación permite un máximo de ${resultado.limite} personas.`;

            botonConfirmar.disabled = false;
            botonConfirmar.textContent =
                "Confirmar asistencia";

            break;

        case "no_encontrado":
            mensajeConfirmacion.textContent =
                "El código de invitación no fue encontrado.";

            break;

        default:
            throw new Error(
                "El servidor devolvió una respuesta desconocida."
            );
    }
}

function mostrarConfirmacionExistente() {
    opcionesAsistentes.innerHTML = "";

    mensajeLimite.textContent = "";

    botonConfirmar.classList.add("oculto");

    mensajeConfirmacion.textContent =
        "Tu asistencia ya había sido confirmada. ¡Gracias!";
}


/*
==================================================
CUENTA REGRESIVA
==================================================
*/

function iniciarCuentaRegresiva() {
    actualizarCuentaRegresiva();

    window.setInterval(actualizarCuentaRegresiva, 1000);
}

function actualizarCuentaRegresiva() {
    const ahora = new Date();
    const diferencia = FECHA_EVENTO.getTime() - ahora.getTime();

    if (diferencia <= 0) {
        asignarContador(0, 0, 0, 0);
        return;
    }

    const dias = Math.floor(
        diferencia / (1000 * 60 * 60 * 24)
    );

    const horas = Math.floor(
        (diferencia / (1000 * 60 * 60)) % 24
    );

    const minutos = Math.floor(
        (diferencia / (1000 * 60)) % 60
    );

    const segundos = Math.floor(
        (diferencia / 1000) % 60
    );

    asignarContador(dias, horas, minutos, segundos);
}

function asignarContador(dias, horas, minutos, segundos) {
    document.getElementById("dias").textContent =
        formatearNumero(dias);

    document.getElementById("horas").textContent =
        formatearNumero(horas);

    document.getElementById("minutos").textContent =
        formatearNumero(minutos);

    document.getElementById("segundos").textContent =
        formatearNumero(segundos);
}

function formatearNumero(numero) {
    return String(numero).padStart(2, "0");
}


/*
==================================================
MÚSICA
==================================================
*/

function configurarMusica() {
    botonMusica.addEventListener("click", async () => {
        try {
            if (musicaFondo.paused) {
                await musicaFondo.play();

                botonMusica.textContent = "❚❚";
                botonMusica.classList.add("reproduciendo");
                botonMusica.setAttribute(
                    "aria-label",
                    "Pausar música"
                );
            } else {
                musicaFondo.pause();

                botonMusica.textContent = "♫";
                botonMusica.classList.remove("reproduciendo");
                botonMusica.setAttribute(
                    "aria-label",
                    "Reproducir música"
                );
            }
        } catch (error) {
            console.error(
                "El navegador bloqueó la reproducción:",
                error
            );
        }
    });
}


/*
==================================================
ERRORES
==================================================
*/

function mostrarError(mensaje) {
    pantallaCarga.classList.add("oculto");
    invitacion.classList.add("oculto");

    mensajeError.textContent = mensaje;
    seccionError.classList.remove("oculto");
}

function validarUrlApi() {
    if (
        !URL_APPS_SCRIPT ||
        URL_APPS_SCRIPT.includes("PEGA_AQUI")
    ) {
        throw new Error(
            "Debes configurar la URL del Apps Script."
        );
    }
}

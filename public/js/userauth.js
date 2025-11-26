// authuser.js
// Controla login, registro y localStorage mejorado

/*************************************************
 *        ENCRIPTAR / DESENCRIPTAR
 *************************************************/
function hashValue(value) {
    return btoa(JSON.stringify(value)).split("").reverse().join("");
}

function unhashValue(value) {
    try {
        return JSON.parse(atob(value.split("").reverse().join("")));
    } catch {
        return null;
    }
}

/*************************************************
 *                REGISTRO
 *************************************************/
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nombre = registerForm.nombre.value.trim();
        const email = registerForm.email.value.trim();
        const password = registerForm.password.value.trim();
        const confirmPasswordInput = registerForm.querySelector('input[name="confirmPassword"]');
        const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value.trim() : "";

        if (!nombre || !email || !password || !confirmPassword) {
            alert("Por favor completa todos los campos.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        try {
            const res = await fetch(`/api/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, email, password, confirmPassword })
            });

            const data = await res.json();
            if (res.ok) {
                alert("Se ha registrado exitosamente");
                registerForm.reset();
                window.location.href = "index.html";
            } else {
                alert(data.message || "Error al registrarse");
            }
        } catch (error) {
            console.error("Error en registro:", error);
            alert("Error al registrar: " + error.message);
        }
    });
}

/*************************************************
 *                LOGIN
 *************************************************/
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = loginForm.email.value.trim();
        const password = loginForm.password.value.trim();

        if (!email || !password) {
            alert("Por favor ingresa tus credenciales.");
            return;
        }

        try {
            const res = await fetch(`/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.message || "Error al iniciar sesión");
                return;
            }

            // Guardar datos en localStorage (hash)
            localStorage.setItem("uid", hashValue(data.usuario.id));
            localStorage.setItem("usuarioNombre", hashValue(data.usuario.nombre));
            localStorage.setItem("usuarioRol", hashValue(data.usuario.rol));
            if (data.token) localStorage.setItem("token", data.token);

            // Redirección
            if (data.usuario.rol === "admin") {
                window.location.href = "admin.html";
                return;
            }

            // Verificar si el paciente ya existe
            try {
                const pacienteRes = await fetch(`/api/patients/${data.usuario.id}`);
                const pacienteData = await pacienteRes.json();

                // Guardar datos hasheados para offline
                localStorage.setItem(
                    `pacienteCache_${hashValue(data.usuario.id)}`,
                    hashValue(pacienteData)
                );

                if (pacienteData.exists) {
                    window.location.href = "dashboard.html";
                } else {
                    window.location.href = "survey.html";
                }
            } catch {
                // Si fetch falla, usar offline
                const cache = unhashValue(localStorage.getItem(`pacienteCache_${hashValue(data.usuario.id)}`));
                if (cache && cache.exists) {
                    window.location.href = "dashboard.html";
                } else {
                    window.location.href = "survey.html";
                }
            }

        } catch (error) {
            alert("Error al iniciar sesión: " + error.message);
        }
    });
}

/*************************************************
 *        RECUPERAR SESIÓN (MODO OFFLINE)
 *************************************************/
window.addEventListener("DOMContentLoaded", async () => {
    const hashedUid = localStorage.getItem("uid");
    const hashedRol = localStorage.getItem("usuarioRol");

    if (!hashedUid || !hashedRol) return;

    const sessionId = unhashValue(hashedUid);
    const sessionRol = unhashValue(hashedRol);
    if (!sessionId || !sessionRol) {
        localStorage.clear();
        return;
    }

    const path = window.location.pathname;

    if (sessionRol === "admin" && path.endsWith("index.html")) {
        window.location.href = "admin.html";
        return;
    }

    if (sessionRol === "user" && path.endsWith("index.html")) {
        try {
            const pacienteRes = await fetch(`/api/patients/${sessionId}`);
            const pacienteData = await pacienteRes.json();

            localStorage.setItem(`pacienteCache_${hashValue(sessionId)}`, hashValue(pacienteData));

            if (pacienteData.exists) {
                window.location.href = "dashboard.html";
            } else {
                window.location.href = "survey.html";
            }
        } catch {
            const cache = unhashValue(localStorage.getItem(`pacienteCache_${hashValue(sessionId)}`));
            if (cache && cache.exists) {
                window.location.href = "dashboard.html";
            } else {
                window.location.href = "survey.html";
            }
        }
    }
});
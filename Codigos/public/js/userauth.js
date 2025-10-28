// authuser.js
// Controla rutas, login, registro y localStorage

// Registro
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombre = registerForm.nombre.value.trim();
        const email = registerForm.email.value.trim();
        const password = registerForm.password.value.trim();

        if (!nombre || !email || !password) {
            alert("Por favor completa todos los campos.");
            return;
        }

        try {
            const res = await fetch("http://localhost:3000/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, email, password })
            });

            const data = await res.json();

            if (res.ok) {
                alert("Se ha registrado exitosamente");
                window.location.href = "index.html";
            } else {
                alert(data.message || "Error al registrarse");
            }
        } catch (error) {
            console.error(error);
            alert("Error al registrar: " + error.message);
        }
    });
}

// Login
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
            const res = await fetch("http://localhost:3000/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.message || "Error al iniciar sesión");
                return;
            }

            // LocalStorage
            localStorage.setItem("usuarioNombre", data.usuario.nombre);
            localStorage.setItem("usuarioId", data.usuario.id);
            localStorage.setItem("usuarioRol", data.usuario.rol);

            // Redireccion por rol
            if (data.usuario.rol === "admin") {
                window.location.href = "admin.html";
            } else if (data.usuario.rol === "user") {
                // checa si se completo la encuesta
                const pacienteRes = await fetch(`http://localhost:3000/api/patients/${data.usuario.id}`);
                const pacienteData = await pacienteRes.json();

                if (pacienteData.exists) {
                    window.location.href = "dashboard.html";
                } else {
                    window.location.href = "survey.html";
                }
            } else {
                alert("Rol de usuario no reconocido.");
            }
        } catch (error) {
            alert("Error al iniciar sesión: " + error.message);
        }
    });
}

// Mantener la sesion activa
window.addEventListener("DOMContentLoaded", async () => {
    const usuarioId = localStorage.getItem("usuarioId");
    const usuarioRol = localStorage.getItem("usuarioRol");

    if (!usuarioId || !usuarioRol) return;

    const path = window.location.pathname;

    try {
        if (usuarioRol === "admin" && path.endsWith("index.html")) {
            window.location.href = "admin.html";
        } else if (usuarioRol === "user" && path.endsWith("index.html")) {
            // cerifica encuesta
            const pacienteRes = await fetch(`http://localhost:3000/api/patients/${usuarioId}`);
            const pacienteData = await pacienteRes.json();

            if (pacienteData.exists) {
                window.location.href = "dashboard.html";
            } else {
                window.location.href = "survey.html";
            }
        }
    } catch (err) {
        console.error("Error verificando encuesta:", err);
    }
});

// cerrar sesion
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = "index.html";
    });
}
document.addEventListener("DOMContentLoaded", () => {
    function hash(value) {
        return btoa(JSON.stringify(value)).split("").reverse().join("");
    }

    function unhash(value) {
        try {
            return JSON.parse(atob(value.split("").reverse().join("")));
        } catch {
            return null;
        }
    }

    // Registro
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nombre = registerForm.nombre.value.trim();
            const email = registerForm.email.value.trim();
            const password = registerForm.password.value.trim();
            const confirmPassword = registerForm.confirmPassword?.value.trim() || "";

            if (!nombre || !email || !password || !confirmPassword) {
                alert("Por favor completa todos los campos.");
                return;
            }

            if (password !== confirmPassword) {
                alert("Las contraseñas no coinciden.");
                return;
            }

            try {
                const res = await fetch("/api/register", {
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
            } catch (err) {
                console.error("Error en registro:", err);
                alert("Error al registrar: " + err.message);
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
                const res = await fetch("/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) {
                    alert(data.message || "Error al iniciar sesión");
                    return;
                }

                // Guardar datos en localStorage usando hash
                localStorage.setItem("uid", hash(data.usuario.id));
                localStorage.setItem("usuarioNombre", hash(data.usuario.nombre));
                localStorage.setItem("usuarioRol", hash(data.usuario.rol));
                if (data.token) localStorage.setItem("token", data.token);

                // Redirección según rol
                if (data.usuario.rol === "admin") {
                    window.location.href = "admin.html";
                    return;
                }

                // Usuario normal: verificar paciente
                try {
                    const pacienteRes = await fetch(`/api/patients/${data.usuario.id}`);
                    const pacienteData = await pacienteRes.json();

                    localStorage.setItem(
                        `pacienteCache_${hash(data.usuario.id)}`,
                        hash(pacienteData)
                    );

                    if (pacienteData.exists) {
                        window.location.href = "dashboard.html";
                    } else {
                        window.location.href = "survey.html";
                    }
                } catch {
                    const cache = unhash(localStorage.getItem(`pacienteCache_${hash(data.usuario.id)}`));
                    if (cache && cache.exists) {
                        window.location.href = "dashboard.html";
                    } else {
                        window.location.href = "survey.html";
                    }
                }

            } catch (err) {
                alert("Error al iniciar sesión: " + err.message);
            }
        });
    }

    // Validación de sesión al cargar la página
    const hashedUid = localStorage.getItem("uid");
    const hashedNombre = localStorage.getItem("usuarioNombre");
    const hashedRol = localStorage.getItem("usuarioRol");

    if (!hashedUid || !hashedNombre || !hashedRol) return;

    const usuarioId = unhash(hashedUid);
    const usuarioNombre = unhash(hashedNombre);
    const usuarioRol = unhash(hashedRol);

    if (!usuarioId || !usuarioNombre || !usuarioRol) {
        localStorage.clear();
        return;
    }

    const path = window.location.pathname;

    if (usuarioRol === "admin" && path.endsWith("index.html")) {
        window.location.href = "admin.html";
    } else if (usuarioRol === "user" && path.endsWith("index.html")) {
        // Intentar obtener datos del paciente
        fetch(`/api/patients/${usuarioId}`)
            .then(res => res.json())
            .then(pacienteData => {
                localStorage.setItem(`pacienteCache_${hashedUid}`, hash(pacienteData));
                if (pacienteData.exists) {
                    window.location.href = "dashboard.html";
                } else {
                    window.location.href = "survey.html";
                }
            })
            .catch(() => {
                const cache = unhash(localStorage.getItem(`pacienteCache_${hashedUid}`));
                if (cache && cache.exists) {
                    window.location.href = "dashboard.html";
                } else {
                    window.location.href = "survey.html";
                }
            });
    }
});
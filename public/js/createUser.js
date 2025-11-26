window.addEventListener("DOMContentLoaded", () => {
    // =============================
    // FUNCIONES HASH UTF-8
    // =============================
    function hashValue(value) {
        return btoa(unescape(encodeURIComponent(JSON.stringify(value)))).split("").reverse().join("");
    }

    function unhashValue(value) {
        try {
            return JSON.parse(decodeURIComponent(escape(atob(value.split("").reverse().join("")))));
        } catch {
            return null;
        }
    }

    // =============================
    // SESIÓN PERSISTENTE Y VALIDACIÓN
    // =============================
    const hashedUid = localStorage.getItem("uid");
    const hashedRol = localStorage.getItem("usuarioRol");
    const hashedNombre = localStorage.getItem("usuarioNombre");

    const usuarioId = unhashValue(hashedUid);
    const usuarioRol = unhashValue(hashedRol);
    const usuarioNombre = unhashValue(hashedNombre);

    if (!usuarioId || !usuarioRol || !usuarioNombre) {
        if (!window.location.pathname.endsWith("index.html")) {
            window.location.href = "index.html";
        }
    } else {
        // Redirección según rol y página
        if (window.location.pathname.endsWith("admin.html") && usuarioRol !== "admin") {
            window.location.href = "dashboard.html";
        }
        if (window.location.pathname.endsWith("dashboard.html") && usuarioRol === "admin") {
            window.location.href = "admin.html";
        }
    }

    // =============================
    // CREAR USUARIO (solo admin)
    // =============================
    const createUserForm = document.getElementById("createUserForm");
    if (createUserForm && usuarioRol === "admin") {
        createUserForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nombre = document.getElementById("nombre").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();
            const rol = document.getElementById("rol").value;

            if (!nombre || !email || !password || !rol) {
                return alert("Todos los campos son obligatorios.");
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) return alert("Ingresa un correo válido.");
            if (password.length < 8) return alert("La contraseña debe tener al menos 8 caracteres.");

            const payload = { nombre, email, password, rol };

            try {
                const res = await fetch("/api/admin/create-user", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    throw new Error("El servidor devolvió una respuesta no válida (no es JSON).");
                }

                if (!res.ok) throw new Error(data.message || "Error creando usuario");

                alert("Usuario creado correctamente");
                createUserForm.reset();

            } catch (err) {
                console.error("Error creando usuario:", err);
                alert(err.message);
            }
        });
    }

    // =============================
    // CERRAR SESIÓN
    // =============================
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = "index.html";
        });
    }
});
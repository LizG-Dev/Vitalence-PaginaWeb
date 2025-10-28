window.addEventListener("DOMContentLoaded", () => {
    const createUserForm = document.getElementById("createUserForm");
    const statusMessage = document.getElementById("statusMessage");
    const logoutBtn = document.getElementById("logout-btn");

    // LocalStorage
    const usuarioId = localStorage.getItem("usuarioId");
    const usuarioNombre = localStorage.getItem("usuarioNombre");
    const usuarioRol = localStorage.getItem("usuarioRol");

    if (usuarioId && usuarioNombre && usuarioRol) {
        // Redireccion por rol
        if (window.location.pathname.endsWith("admin.html") && usuarioRol !== "admin") {
            window.location.href = "dashboard.html";
        }
        if (window.location.pathname.endsWith("dashboard.html") && usuarioRol === "admin") {
            window.location.href = "admin.html";
        }

        // Bienvenida
        const welcomeEl = document.getElementById("welcomeUser");
        if (welcomeEl) welcomeEl.textContent = `¡Bienvenido, ${usuarioNombre}!`;
    } else {
        // redirecciona a login
        if (!window.location.pathname.endsWith("index.html")) {
            window.location.href = "index.html";
        }
    }

    // Crear usuario
    if (createUserForm) {
        createUserForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nombre = document.getElementById("nombre").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();
            const rol = document.getElementById("rol").value;

            if (!nombre || !email || !password) {
                statusMessage.textContent = "Todos los campos son obligatorios.";
                statusMessage.style.color = "red";
                return;
            }

            const payload = { nombre, email, password, rol };
            try {
                const res = await fetch("http://localhost:3000/api/admin/create-user", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || "Error creando usuario");
                }

                statusMessage.textContent = "Usuario creado correctamente";
                statusMessage.style.color = "green";
                createUserForm.reset();
            } catch (err) {
                console.error("Error creando usuario:", err);
                statusMessage.textContent = `Error: ${err.message}`;
                statusMessage.style.color = "red";
            }
        });
    }

    // cerrar sesion
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = "index.html";
        });
    }
});

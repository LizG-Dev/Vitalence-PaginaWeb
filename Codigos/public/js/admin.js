// --- SESIÓN PERSISTENTE CON HASH UTF-8 ---
window.addEventListener("DOMContentLoaded", async () => {

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
    // OBTENER SESIÓN ADMIN
    // =============================
    const hashedUid = localStorage.getItem("uid");
    const hashedRol = localStorage.getItem("usuarioRol");
    const hashedNombre = localStorage.getItem("usuarioNombre");

    if (!hashedUid || !hashedRol || !hashedNombre || unhashValue(hashedRol) !== "admin") {
        window.location.href = "index.html";
        return;
    }

    const usuarioId = unhashValue(hashedUid);
    const usuarioNombre = unhashValue(hashedNombre);

    // --- Mostrar nombre del admin ---
    const nameSpan = document.getElementById("adminName");
    if (nameSpan) nameSpan.textContent = usuarioNombre;

    const welcomeEl = document.getElementById("welcomeUser");
    if (welcomeEl) welcomeEl.style.visibility = "visible";

    // --- Cerrar sesión ---
    const logoutBtns = document.querySelectorAll("#logout-btn, .fa-right-from-bracket");
    logoutBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = "index.html";
        });
    });

    // --- CARGA DE DATOS + SOPORTE OFFLINE ---
    async function loadDashboardData() {
        try {
            const [statsRes, usersRes] = await Promise.all([
                fetch("/api/admin/stats"),
                fetch("/api/admin/users")
            ]);

            if (!statsRes.ok || !usersRes.ok) throw new Error("Fallo en API");

            const stats = await statsRes.json();
            const users = await usersRes.json();

            // Guardar en localStorage para modo offline
            localStorage.setItem("dashboardStats", hashValue(stats));
            localStorage.setItem("dashboardUsers", hashValue(users));

            renderDashboard(stats, users);

        } catch (error) {
            console.warn("No se pudo conectar al servidor. Cargando datos almacenados…");

            const savedStats = unhashValue(localStorage.getItem("dashboardStats"));
            const savedUsers = unhashValue(localStorage.getItem("dashboardUsers"));

            if (savedStats && savedUsers) {
                renderDashboard(savedStats, savedUsers);
            } else {
                alert("No hay datos locales guardados para mostrar sin conexión.");
            }
        }
    }

    // --- FUNCIÓN PARA RENDERIZAR DATOS ---
    function renderDashboard(stats, users) {
        document.getElementById("totalUsers").textContent = stats.totalUsers || 0;
        document.getElementById("activeUsers").textContent = stats.activeUsers || 0;
        document.getElementById("adminCount").textContent = stats.adminCount || 0;
        document.getElementById("recentUsers").textContent = stats.recentUsers || 0;

        const tbody = document.querySelector("#userTable tbody");
        if (tbody) {
            tbody.innerHTML = "";
            users.forEach(u => {
                const row = `
                    <tr>
                        <td>${u.nombre || "N/A"}</td>
                        <td>${u.email || "N/A"}</td>
                        <td>${u.rol || "N/A"}</td>
                        <td>${u.fecha_registro ? new Date(u.fecha_registro).toLocaleDateString() : "N/A"}</td>
                    </tr>
                `;
                tbody.insertAdjacentHTML("beforeend", row);
            });
        }
    }

    await loadDashboardData();
});
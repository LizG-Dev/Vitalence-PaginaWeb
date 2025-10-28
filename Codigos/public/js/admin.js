window.addEventListener("DOMContentLoaded", async () => {
    // LocalSotorage
    const usuarioId = localStorage.getItem("usuarioId");
    const usuarioNombre = localStorage.getItem("usuarioNombre");
    const usuarioRol = localStorage.getItem("usuarioRol");

    if (!usuarioId || !usuarioNombre || !usuarioRol) {
        window.location.href = "index.html";
        return;
    }

    // Redirección por rol
    if (usuarioRol !== "admin") {
        window.location.href = "dashboard.html";
        return;
    }

    const welcomeEl = document.getElementById("welcomeUser") || document.getElementById("adminName");
    if (welcomeEl) welcomeEl.textContent = `¡Bienvenido, ${usuarioNombre}!`;

    // Cerrar sesion
    const logoutBtns = document.querySelectorAll("#logout-btn, .fa-right-from-bracket");
    logoutBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = "index.html";
        });
    });

    // Nav
    const list = document.querySelectorAll(".navigation li");
    function activeLink() {
        list.forEach(item => item.classList.remove("hovered"));
        this.classList.add("hovered");
    }
    list.forEach(item => item.addEventListener("mouseover", activeLink));

    const toggle = document.querySelector(".toggle");
    const navigation = document.querySelector(".navigation");
    toggle?.addEventListener("click", () => navigation.classList.toggle("active"));

    //  Datos
    async function loadDashboardData() {
        try {
            const [statsRes, usersRes] = await Promise.all([
                fetch("http://localhost:3000/api/admin/stats"),
                fetch("http://localhost:3000/api/admin/users")
            ]);

            const stats = statsRes.ok ? await statsRes.json() : {};
            const users = usersRes.ok ? await usersRes.json() : [];

            // Tarjetas
            document.getElementById("totalUsers").textContent = stats.totalUsers || 0;
            document.getElementById("activeUsers").textContent = stats.activeUsers || 0;
            document.getElementById("adminCount").textContent = stats.adminCount || 0;
            document.getElementById("recentUsers").textContent = stats.recentUsers || 0;

            // Usuarios
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

        } catch (error) {
            console.error("Error cargando datos del panel:", error);
            alert("Error al cargar los datos del panel. Intenta recargar la página.");
        }
    }

    await loadDashboardData();
});
window.addEventListener("DOMContentLoaded", async () => {
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
    const hashedUid = localStorage.getItem("uid");
    const hashedRol = localStorage.getItem("usuarioRol");
    const hashedNombre = localStorage.getItem("usuarioNombre");

    if (!hashedUid || !hashedRol || !hashedNombre || unhashValue(hashedRol) !== "admin") {
        alert("Sesión inválida o no admin");
        window.location.href = "index.html";
        return;
    }

    const usuarioId = unhashValue(hashedUid);

    function logout() {
        localStorage.clear();
        alert("Sesión cerrada");
        window.location.href = "index.html";
    }
    document.getElementById("logout-btn")?.addEventListener("click", logout);

    let currentUser = null;

    function openEditModal(user) {
        currentUser = user; 
        localStorage.setItem("editUserId", user.id);

        document.getElementById("nombre").value = user.nombres || user.nombre || "";
        document.getElementById("email").value = user.email || "";
        document.getElementById("password").value = "";

        if (user.rol === "user") {
            document.getElementById("edad").value = user.edad || "";
            document.getElementById("sexo").value = user.sexo || "";
            document.getElementById("peso").value = user.peso || "";
            document.getElementById("estatura").value = user.estatura || "";

            document.querySelectorAll("#edad, #sexo, #peso, #estatura").forEach(el => {
                el.disabled = false;
                el.closest("label")?.classList.remove("hidden");
            });
        } else {
            document.querySelectorAll("#edad, #sexo, #peso, #estatura").forEach(el => {
                el.value = "";
                el.disabled = true;
                el.closest("label")?.classList.add("hidden");
            });
        }

        document.getElementById("editModal").classList.add("show");
    }

    document.getElementById("closeModal")?.addEventListener("click", () => {
        document.getElementById("editModal").classList.remove("show");
        currentUser = null;
    });

    async function loadUsers() {
        try {
            const res = await fetch("/api/management");
            if (!res.ok) throw new Error("Error al obtener los usuarios");
            const users = await res.json();
            renderUserTable(users);
            return users;
        } catch (err) {
            alert("No se pudieron cargar los usuarios");
            return [];
        }
    }

    async function updateUser(userId, updatedData) {
        try {
            const res = await fetch(`/api/management/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || "Error al actualizar");
            }

            alert("Usuario actualizado correctamente");
            await loadUsers();
        } catch (err) {
            alert(`Error al actualizar el usuario: ${err.message}`);
        }
    }

    async function deleteUser(userId) {
        if (!confirm("¿Seguro que quieres eliminar este usuario?")) return;
        try {
            const res = await fetch(`/api/management/${userId}`, { method: "DELETE" });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || "Error al eliminar");
            }
            alert("Usuario eliminado correctamente");
            await loadUsers();
        } catch (err) {
            alert(`Error al eliminar el usuario: ${err.message}`);
        }
    }

    function renderUserTable(users) {
    const tbody = document.querySelector("#userTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    users.forEach(user => {
        const nombre = user.nombres || user.nombre || "";
        const email = user.email || "";
        const password = user.password ? "••••••••" : "";
        const edad = user.edad || "";
        const sexo = user.sexo || "";
        const peso = user.peso || "";
        const estatura = user.estatura || "";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td data-label="Nombre">${nombre}</td>
            <td data-label="Email">${email}</td>
            <td data-label="Contraseña">${password}</td>
            <td data-label="Edad">${edad}</td>
            <td data-label="Sexo">${sexo}</td>
            <td data-label="Peso (kg)">${peso}</td>
            <td data-label="Estatura (cm)">${estatura}</td>
            <td data-label="Acciones">
                <button class="editBtn">Editar</button>
                <button class="deleteBtn">Eliminar</button>
            </td>
        `;

        tbody.appendChild(row);

        // Listeners
        row.querySelector(".editBtn").addEventListener("click", () => openEditModal(user));
        row.querySelector(".deleteBtn").addEventListener("click", () => deleteUser(user.id));
    });
}

    document.getElementById("editForm")?.addEventListener("submit", async e => {
        e.preventDefault();

        const userId = localStorage.getItem("editUserId");
        if (!userId || !currentUser) return;

        const updatedUser = {
            nombre: document.getElementById("nombre").value.trim(),
            email: document.getElementById("email").value.trim(),
            rol: currentUser.rol
        };

        const passwordInput = document.getElementById("password").value.trim();
        if (passwordInput !== "") {
            updatedUser.password = passwordInput;
        }

        if (currentUser.rol === "user") {
            updatedUser.edad = parseInt(document.getElementById("edad").value) || null;
            updatedUser.sexo = document.getElementById("sexo").value.trim();
            updatedUser.peso = parseFloat(document.getElementById("peso").value) || null;
            updatedUser.estatura = parseFloat(document.getElementById("estatura").value) || null;
        }

        await updateUser(userId, updatedUser);
        document.getElementById("editModal").classList.remove("show");
        currentUser = null;
    });

    await loadUsers();
});
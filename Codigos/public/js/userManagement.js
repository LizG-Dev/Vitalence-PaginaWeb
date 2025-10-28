import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDi_TsjlOdJzzqvtA192jrWI58QZJqRblI",
    authDomain: "vitalencedb.firebaseapp.com",
    projectId: "vitalencedb",
    storageBucket: "vitalencedb.firebasestorage.app",
    messagingSenderId: "493881358893",
    appId: "1:493881358893:web:5991e1b7e4a18a6ed496a4",
    measurementId: "G-RH3E5CMLBC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.addEventListener("DOMContentLoaded", async () => {

    // LocalStorage
    const usuarioId = localStorage.getItem("usuarioId");
    const usuarioNombre = localStorage.getItem("usuarioNombre");
    const usuarioRol = localStorage.getItem("usuarioRol");

    if (!usuarioId || !usuarioNombre || !usuarioRol) {
        window.location.href = "index.html";
        return;
    }

    if (usuarioRol !== "admin") {
        window.location.href = "dashboard.html";
        return;
    }

    document.getElementById("welcomeUser")?.textContent = `¡Bienvenido, ${usuarioNombre}!`;

    // cerrar sesion
    document.getElementById("logout-btn")?.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "index.html";
    });

    //detecta localstorage
    window.addEventListener("storage", (event) => {
        if ((event.key === "usuarioId" || event.key === "usuarioRol") && !event.newValue) {
            alert("Sesión finalizada.");
            window.location.href = "index.html";
        }
    });

    // modal
    function openEditModal(user) {
        const form = document.getElementById("editForm");
        form.dataset.userId = user.id;
        form.nombre.value = user.nombre || "";
        form.email.value = user.email || "";
        form.password.value = "";
        form.edad.value = user.edad || "";
        form.sexo.value = user.sexo || "";
        form.peso.value = user.peso || "";
        form.estatura.value = user.estatura || "";
        form.diagnostico.value = user.diagnostico || "";
        document.getElementById("editModal").style.display = "block";
    }

    document.getElementById("closeModal")?.addEventListener("click", () => {
        document.getElementById("editModal").style.display = "none";
    });

    // Carga de usuarios
    async function loadUsers() {
        try {
            const snapshot = await getDocs(collection(db, "usuarios"));
            const users = [];
            snapshot.forEach(docItem => {
                const data = docItem.data();
                users.push({
                    id: docItem.id,
                    nombre: data.nombre,
                    email: data.email || "",
                    password: data.password || "",
                    edad: data.edad || "",
                    sexo: data.sexo || "",
                    peso: data.peso || "",
                    estatura: data.estatura || "",
                    diagnostico: data.diagnostico || "",
                    rol: data.rol || "user"
                });
            });
            renderUserTable(users);
        } catch (err) {
            console.error("Error cargando usuarios:", err);
        }
    }

    //Actualzar usuario
    async function updateUser(userId, updatedData) {
        try {
            const userRef = doc(db, "usuarios", userId);
            const payload = {
                ...updatedData,
                edad: Number(updatedData.edad) || null,
                peso: Number(updatedData.peso) || null,
                estatura: Number(updatedData.estatura) || null
            };
            await updateDoc(userRef, payload);
            await loadUsers();
        } catch (err) {
            console.error("Error actualizando usuario:", err);
        }
    }

    // Eliminar usuario
    async function deleteUser(userId) {
        if (!confirm("¿Seguro que quieres eliminar este usuario?")) return;
        try {
            const userRef = doc(db, "usuarios", userId);
            await deleteDoc(userRef);
            await loadUsers();
        } catch (err) {
            console.error("Error eliminando usuario:", err);
        }
    }

    // Render
    function renderUserTable(users) {
        const tbody = document.querySelector("#userTable tbody");
        tbody.innerHTML = "";

        if (!users.length) {
            const row = document.createElement("tr");
            row.innerHTML = `<td colspan="9">No hay usuarios registrados</td>`;
            tbody.appendChild(row);
            return;
        }

        users.forEach(user => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.nombre}</td>
                <td>${user.email}</td>
                <td>${user.password}</td>
                <td>${user.edad}</td>
                <td>${user.sexo}</td>
                <td>${user.peso}</td>
                <td>${user.estatura}</td>
                <td>${user.diagnostico}</td>
                <td>
                    <button class="editBtn">Editar</button>
                    <button class="deleteBtn">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
            row.querySelector(".editBtn").addEventListener("click", () => openEditModal(user));
            row.querySelector(".deleteBtn").addEventListener("click", () => deleteUser(user.id));
        });
    }

    // Guarda en modal
    document.getElementById("editForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const form = e.target;
        const userId = form.dataset.userId;
        if (!userId) return alert("Usuario no seleccionado");

        const updatedUser = {
            nombre: form.nombre.value,
            email: form.email.value,
            password: form.password.value,
            edad: form.edad.value,
            sexo: form.sexo.value,
            peso: form.peso.value,
            estatura: form.estatura.value,
            diagnostico: form.diagnostico.value
        };

        await updateUser(userId, updatedUser);
        form.reset();
        form.dataset.userId = "";
        document.getElementById("editModal").style.display = "none";
    });

    await loadUsers();
});
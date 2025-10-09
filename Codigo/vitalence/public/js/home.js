window.addEventListener("DOMContentLoaded", () => {
    const nombreUsuario = localStorage.getItem("usuarioNombre");
    const welcomeDiv = document.getElementById("welcomeMessage");

    if (nombreUsuario) {
        welcomeDiv.textContent = `¡Bienvenido, ${nombreUsuario}!`;
    } else {
        welcomeDiv.textContent = "¡Bienvenido!";
    }
});

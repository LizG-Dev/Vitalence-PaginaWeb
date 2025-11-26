//Animación del index

const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

document.addEventListener("DOMContentLoaded", () => {
  const passwordFields = document.querySelectorAll('input[type="password"]');

  passwordFields.forEach((input) => {
    // Crear contenedor y mover input dentro
    const wrapper = document.createElement("div");
    wrapper.classList.add("password-container");
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    // Crear ícono 👁️
    const icon = document.createElement("i");
    icon.classList.add("fas", "fa-eye", "password-toggle");
    wrapper.appendChild(icon);

    // Evento para mostrar/ocultar contraseña
    icon.addEventListener("click", () => {
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      icon.classList.toggle("fa-eye");
      icon.classList.toggle("fa-eye-slash");
    });
  });
});

//cambiar nombre a index
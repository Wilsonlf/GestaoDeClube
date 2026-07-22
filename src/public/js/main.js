document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  const toggleSenha = document.querySelector("[data-toggle-senha]");
  if (toggleSenha) {
    toggleSenha.addEventListener("click", () => {
      const input = document.querySelector("#senha");
      const isText = input.type === "text";
      input.type = isText ? "password" : "text";
      toggleSenha.textContent = isText ? "Mostrar" : "Ocultar";
    });
  }

  document.querySelectorAll("[data-comprar-ingresso]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".ticket-card");
      const status = card.querySelector(".ticket-status");
      btn.disabled = true;
      btn.textContent = "Processando...";
      setTimeout(() => {
        btn.textContent = "Ingresso reservado";
        if (status) status.textContent = "Reservado — finalize o pagamento no e-mail enviado.";
      }, 700);
    });
  });

  const loginForm = document.querySelector("#login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const feedback = document.querySelector("#login-feedback");
      if (feedback) {
        feedback.textContent = "Conectando com o servidor...";
        feedback.hidden = false;
      }
    });
  }
});
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

  // A compra de ingresso de verdade (fetch + Mercado Pago) está no <script>
  // inline de src/views/ingressos.ejs, porque só é montada quando há um
  // usuário logado (mesmo padrão usado em planos.ejs para os planos).

  const loginForm = document.querySelector("#login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const feedback = document.querySelector("#login-feedback");
      const email = document.querySelector("#email").value;
      const senha = document.querySelector("#senha").value;
      const botao = loginForm.querySelector("button[type=submit]");

      if (feedback) {
        feedback.textContent = "Entrando...";
        feedback.hidden = false;
      }
      if (botao) botao.disabled = true;

      try {
        const resposta = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, senha })
        });
        const dados = await resposta.json();

        if (!resposta.ok) {
          if (feedback) feedback.textContent = dados.erro || "Não foi possível entrar.";
          if (botao) botao.disabled = false;
          return;
        }

        window.location.href = dados.redirecionarPara || "/admin/dashboard";
      } catch (erro) {
        if (feedback) feedback.textContent = "Erro de conexão. Tente novamente.";
        if (botao) botao.disabled = false;
      }
    });
  }

  const cadastroForm = document.querySelector("#cadastro-form");
  if (cadastroForm) {
    cadastroForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const feedback = document.querySelector("#cadastro-feedback");
      const nome = document.querySelector("#nome").value;
      const email = document.querySelector("#email").value;
      const cpf = document.querySelector("#cpf").value;
      const telefone = document.querySelector("#telefone").value;
      const senha = document.querySelector("#senha").value;
      const botao = cadastroForm.querySelector("button[type=submit]");

      if (feedback) {
        feedback.textContent = "Criando conta...";
        feedback.hidden = false;
      }
      if (botao) botao.disabled = true;

      try {
        const resposta = await fetch("/cadastro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, email, cpf, telefone, senha })
        });
        const dados = await resposta.json();

        if (!resposta.ok) {
          if (feedback) feedback.textContent = dados.erro || "Não foi possível criar a conta.";
          if (botao) botao.disabled = false;
          return;
        }

        if (feedback) feedback.textContent = "Conta criada! Redirecionando para o login...";
        setTimeout(() => {
          window.location.href = "/login";
        }, 800);
      } catch (erro) {
        if (feedback) feedback.textContent = "Erro de conexão. Tente novamente.";
        if (botao) botao.disabled = false;
      }
    });
  }
});
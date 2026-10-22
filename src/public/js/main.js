document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-menu");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  document.querySelectorAll("[data-carousel-target]").forEach((botao) => {
    botao.addEventListener("click", () => {
      const trilha = document.getElementById(botao.dataset.carouselTarget);
      if (!trilha) return;
      const card = trilha.querySelector(":scope > *");
      const passo = card ? card.getBoundingClientRect().width + 18 : trilha.clientWidth * 0.8;
      trilha.scrollBy({ left: passo * Number(botao.dataset.dir), behavior: "smooth" });
    });
  });

  const toggleSenha = document.querySelector("[data-toggle-senha]");
  if (toggleSenha) {
    toggleSenha.addEventListener("click", () => {
      const input = document.querySelector("#senha");
      const isText = input.type === "text";
      input.type = isText ? "password" : "text";
      toggleSenha.textContent = isText ? "Mostrar" : "Ocultar";
    });
  }


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

  const esqueciForm = document.querySelector("#esqueci-form");
  if (esqueciForm) {
    esqueciForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const feedback = document.querySelector("#esqueci-feedback");
      const email = document.querySelector("#email").value;
      const botao = esqueciForm.querySelector("button[type=submit]");

      feedback.textContent = "Enviando...";
      feedback.hidden = false;
      botao.disabled = true;

      try {
        const resposta = await fetch("/esqueci-senha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const dados = await resposta.json();

        if (!resposta.ok) {
          feedback.textContent = dados.erro || "Não foi possível enviar o link.";
          botao.disabled = false;
          return;
        }

        feedback.textContent = dados.mensagem;
      } catch (erro) {
        feedback.textContent = "Erro de conexão. Tente novamente.";
        botao.disabled = false;
      }
    });
  }

  const redefinirForm = document.querySelector("#redefinir-form");
  if (redefinirForm) {
    redefinirForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const feedback = document.querySelector("#redefinir-feedback");
      const senha = document.querySelector("#senha").value;
      const confirmacao = document.querySelector("#senha-confirmacao").value;
      const botao = redefinirForm.querySelector("button[type=submit]");

      feedback.hidden = false;
      if (senha !== confirmacao) {
        feedback.textContent = "As senhas não conferem.";
        return;
      }

      feedback.textContent = "Salvando...";
      botao.disabled = true;

      try {
        const resposta = await fetch("/redefinir-senha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: redefinirForm.dataset.token, senha })
        });
        const dados = await resposta.json();

        if (!resposta.ok) {
          feedback.textContent = dados.erro || "Não foi possível redefinir a senha.";
          botao.disabled = false;
          return;
        }

        feedback.textContent = "Senha alterada! Redirecionando para o login...";
        setTimeout(() => {
          window.location.href = dados.redirecionarPara || "/login";
        }, 1200);
      } catch (erro) {
        feedback.textContent = "Erro de conexão. Tente novamente.";
        botao.disabled = false;
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
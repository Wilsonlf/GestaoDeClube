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

  async function enviarFormJson({ form, url, feedback, textoEnviando, montarCorpo, validar, aoSucesso }) {
    const botao = form.querySelector("button[type=submit]");
    const mostrar = (texto) => {
      if (!feedback) return;
      feedback.textContent = texto;
      feedback.hidden = false;
    };

    const erroLocal = validar ? validar() : null;
    if (erroLocal) {
      mostrar(erroLocal);
      return;
    }

    mostrar(textoEnviando);
    if (botao) botao.disabled = true;

    try {
      const resposta = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(montarCorpo())
      });
      const tipo = resposta.headers.get("content-type") || "";
      const dados = tipo.includes("application/json") ? await resposta.json() : {};

      if (!resposta.ok) {
        mostrar(dados.erro || "Não foi possível concluir. Tente novamente.");
        if (botao) botao.disabled = false;
        return;
      }

      aoSucesso(dados, mostrar);
    } catch (erro) {
      mostrar("Erro de conexão. Tente novamente.");
      if (botao) botao.disabled = false;
    }
  }

  const valor = (seletor) => document.querySelector(seletor).value;

  const loginForm = document.querySelector("#login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      enviarFormJson({
        form: loginForm,
        url: "/login",
        feedback: document.querySelector("#login-feedback"),
        textoEnviando: "Entrando...",
        montarCorpo: () => ({ email: valor("#email"), senha: valor("#senha") }),
        aoSucesso: (dados) => {
          window.location.href = dados.redirecionarPara || "/";
        }
      });
    });
  }

  const esqueciForm = document.querySelector("#esqueci-form");
  if (esqueciForm) {
    esqueciForm.addEventListener("submit", (e) => {
      e.preventDefault();
      enviarFormJson({
        form: esqueciForm,
        url: "/esqueci-senha",
        feedback: document.querySelector("#esqueci-feedback"),
        textoEnviando: "Enviando...",
        montarCorpo: () => ({ email: valor("#email") }),
        aoSucesso: (dados, mostrar) => {
          mostrar(dados.mensagem);
          esqueciForm.querySelector("button[type=submit]").disabled = false;
        }
      });
    });
  }

  const redefinirForm = document.querySelector("#redefinir-form");
  if (redefinirForm) {
    redefinirForm.addEventListener("submit", (e) => {
      e.preventDefault();
      enviarFormJson({
        form: redefinirForm,
        url: "/redefinir-senha",
        feedback: document.querySelector("#redefinir-feedback"),
        textoEnviando: "Salvando...",
        validar: () => (valor("#senha") !== valor("#senha-confirmacao") ? "As senhas não conferem." : null),
        montarCorpo: () => ({ token: redefinirForm.dataset.token, senha: valor("#senha") }),
        aoSucesso: (dados, mostrar) => {
          mostrar("Senha alterada! Redirecionando para o login...");
          setTimeout(() => {
            window.location.href = dados.redirecionarPara || "/login";
          }, 1200);
        }
      });
    });
  }

  const cadastroForm = document.querySelector("#cadastro-form");
  if (cadastroForm) {
    cadastroForm.addEventListener("submit", (e) => {
      e.preventDefault();
      enviarFormJson({
        form: cadastroForm,
        url: "/cadastro",
        feedback: document.querySelector("#cadastro-feedback"),
        textoEnviando: "Criando conta...",
        montarCorpo: () => ({
          nome: valor("#nome"),
          email: valor("#email"),
          cpf: valor("#cpf"),
          telefone: valor("#telefone"),
          senha: valor("#senha")
        }),
        aoSucesso: (dados, mostrar) => {
          mostrar("Conta criada! Redirecionando para o login...");
          setTimeout(() => {
            window.location.href = "/login";
          }, 800);
        }
      });
    });
  }
});

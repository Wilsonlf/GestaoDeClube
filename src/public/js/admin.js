document.addEventListener('submit', (evento) => {
  const form = evento.target;
  if (!(form instanceof HTMLFormElement) || (form.method || '').toLowerCase() !== 'post') return;

  setTimeout(() => {
    if (evento.defaultPrevented) return;
    form.querySelectorAll('button[type="submit"], button:not([type])').forEach((botao) => {
      botao.disabled = true;
      botao.dataset.textoOriginal = botao.textContent;
      botao.textContent = 'Enviando...';
    });
  }, 0);
});

window.addEventListener('pageshow', (evento) => {
  if (evento.persisted && document.querySelector('form[method="POST"], form[method="post"]')) {
    window.location.reload();
    return;
  }
  document.querySelectorAll('button[data-texto-original]').forEach((botao) => {
    botao.disabled = false;
    botao.textContent = botao.dataset.textoOriginal;
    delete botao.dataset.textoOriginal;
  });
});

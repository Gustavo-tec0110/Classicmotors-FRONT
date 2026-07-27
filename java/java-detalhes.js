/* =========================
   0. CONFIGURAÇÃO GLOBAL
========================== */
const API = window.WebMotorAPI;
const getBaseUrl = () =>
  API?.BASE_URL || "https://webmotors-clone-back.onrender.com";

/* =========================
   1. DARK MODE
========================== */
const btnTema = document.getElementById("toggle-dark");

function aplicarTema(tema) {
  document.documentElement.setAttribute("data-theme", tema);

  if (btnTema) {
    btnTema.innerHTML =
      tema === "dark"
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
  }

  localStorage.setItem("theme", tema);
}

btnTema?.addEventListener("click", () => {
  const novoTema =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  aplicarTema(novoTema);
});

aplicarTema(localStorage.getItem("theme") || "dark");

/* =========================
   2. CARREGAR DETALHES DO CARRO
========================== */
async function carregarCarro() {
  try {
    const params = new URLSearchParams(window.location.search);
    const carroId = params.get("id");

    if (!carroId) {
      preencherTexto(".detalhes-titulo", "Veículo não encontrado.");
      return;
    }

    const carro = API ? await API.fetchCarroById(carroId) : null;

    if (!carro) {
      preencherTexto(".detalhes-titulo", "Veículo não encontrado.");
      return;
    }

    document.title = `${carro.marca} ${carro.modelo} — Classic Motors`;
    preencherDetalhes(carro);
    montarGaleria(carro);
  } catch (err) {
    console.error(err);
    preencherTexto(
      ".detalhes-titulo",
      "Não foi possível carregar este veículo. Tente novamente.",
    );
  } finally {
    document.body.classList.add("loaded");
    document.querySelector(".pagina-detalhes")?.classList.add("animar-entrada");
  }
}

/* =========================
   3. PREENCHER DETALHES
========================== */
function preencherTexto(seletor, valor, padrao = "Não informado") {
  const el = document.querySelector(seletor);
  if (el) el.textContent = valor || padrao;
}

function preencherDetalhes(dados) {
  preencherTexto(
    ".detalhes-titulo",
    `${dados.marca || ""} ${dados.modelo || ""}`,
  );
  preencherTexto("#descricao-curta", dados.descricaoCurta);
  preencherTexto("#descricao-longa", dados.descricao);
  preencherTexto(".detalhes-preco", formatarPreco(dados.preco));
  preencherTexto(
    ".detalhes-preco-antigo",
    dados.precoAntigo ? formatarPreco(dados.precoAntigo) : "",
    "",
  );
  preencherTexto("#detalhes-cidade", dados.cidade);
  preencherTexto("#detalhes-ano", dados.ano);
  preencherTexto("#detalhes-combustivel", dados.combustivel);

  const km = Number(dados.km);
  preencherTexto(
    "#detalhes-km",
    Number.isFinite(km) ? `${km.toLocaleString("pt-BR")} km` : null,
  );

  preencherTexto("#detalhes-placa", dados.finalPlaca);
  preencherTexto("#detalhes-cambio", dados.cambio);
  preencherTexto("#detalhes-cor", dados.cor);
  preencherTexto(
    "#detalhes-troca",
    dados.aceitaTroca === true || dados.aceitaTroca === "Sim" ? "Sim" : "Não",
  );
}

function formatarPreco(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return "Consulte o preço";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(price);
}

/* =========================
   4. GALERIA DE IMAGENS
========================== */
function montarGaleria(dados) {
  const galeria = document.querySelector(".galeria-detalhes");
  const modal = document.getElementById("modal-img");
  const modalImg = document.getElementById("imgModal");
  const fecharModal = document.querySelector(".fechar");
  const setaEsq = document.querySelector(".seta-esquerda");
  const setaDir = document.querySelector(".seta-direita");

  if (!galeria) return;

  let imagens = [];

  try {
    imagens = Array.isArray(dados.imagens)
      ? dados.imagens
      : JSON.parse(dados.imagens || "[]");
  } catch {
    imagens = [];
  }

  if (imagens.length === 0 && dados.imagem) imagens = [dados.imagem];
  if (imagens.length === 0) imagens = ["assets/sem-imagem.svg"];

  const imagensCorrigidas = imagens
    .map((img) => {
      if (!img) return null;
      if (/^https?:\/\//i.test(img)) return img;
      if (img.startsWith("assets/")) return img;
      if (img.startsWith("/")) return getBaseUrl() + img;
      return `${getBaseUrl()}/imagens/${img}`;
    })
    .filter(Boolean);

  galeria.replaceChildren();
  imagensCorrigidas.forEach((src, index) => {
    const image = document.createElement("img");
    image.src = src;
    image.alt = `Foto ${index + 1} de ${dados.marca || ""} ${dados.modelo || ""}`;
    image.loading = index === 0 ? "eager" : "lazy";
    image.addEventListener(
      "error",
      () => {
        image.src = "assets/sem-imagem.svg";
      },
      { once: true },
    );
    galeria.appendChild(image);
  });

  const fotos = [...galeria.querySelectorAll("img")];
  let indiceAtual = 0;

  fotos.forEach((img, index) => {
    img.addEventListener("click", () => {
      indiceAtual = index;
      modalImg.src = img.src;
      modal.style.display = "flex";
    });
  });

  setaEsq?.addEventListener("click", () => {
    indiceAtual = (indiceAtual - 1 + fotos.length) % fotos.length;
    modalImg.src = fotos[indiceAtual].src;
  });

  setaDir?.addEventListener("click", () => {
    indiceAtual = (indiceAtual + 1) % fotos.length;
    modalImg.src = fotos[indiceAtual].src;
  });

  fecharModal?.addEventListener("click", () => {
    modal.style.display = "none";
  });
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) modal.style.display = "none";
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") modal.style.display = "none";
  });
}

/* =========================
   5. FORMULÁRIO
========================== */
function configurarFormulario() {
  const form = document.getElementById("formContato");
  const btnEnviar = document.querySelector(".btn-enviar");
  const checkbox = document.getElementById("aceita");

  if (!form || !btnEnviar || !checkbox) return;

  const validar = () => {
    const ok = [...form.querySelectorAll("[required]")].every((el) =>
      el.value.trim(),
    );
    btnEnviar.disabled = !(ok && checkbox.checked);
    btnEnviar.classList.toggle("ativo", ok && checkbox.checked);
  };

  form.addEventListener("input", validar);
  checkbox.addEventListener("change", validar);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Mensagem enviada com sucesso!");
    form.reset();
    validar();
  });

  validar();
}

/* =========================
   6. INIT
========================== */
document.addEventListener("DOMContentLoaded", () => {
  carregarCarro();
  configurarFormulario();
});

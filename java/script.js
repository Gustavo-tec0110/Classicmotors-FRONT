const API = window.WebMotorAPI;
const getBaseUrl = () => API?.BASE_URL || "https://webmotors-clone-back.onrender.com";
const MIN_CARDS = 8;
const CARROS_CACHE_KEY = "webmotor_carros_cache_v1";
let carrosData = []; // Variável global para armazenar os dados do back-end

document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    carregarCarros();
    configurarBusca(); // Inicializa os ouvintes da busca
});
/* =========================
    1. CARREGAR CARROS
========================== */
async function carregarCarros() {
    try {
        carrosData = API ? await API.fetchCarrosJson() : [];

        if (Array.isArray(carrosData) && carrosData.length > 0) {
            localStorage.setItem(CARROS_CACHE_KEY, JSON.stringify(carrosData));
        }

        console.log("Carros recebidos:", carrosData);

        renderizarCarros(carrosData);
        configurarSetas();
    } catch (err) {
        try {
            const cache = localStorage.getItem(CARROS_CACHE_KEY);
            const carrosCache = cache ? JSON.parse(cache) : [];

            if (Array.isArray(carrosCache) && carrosCache.length > 0) {
                carrosData = carrosCache;
                renderizarCarros(carrosData);
                configurarSetas();
                console.warn("Backend offline. Exibindo dados em cache.");
                return;
            }
        } catch {}

        console.error("Erro ao buscar carros:", err);
    }
}

/* =========================
    2. RENDERIZAR CARDS
========================== */
function renderizarCarros(carros) {
    const secoes = {
        ofertas: document.querySelector('.carrossel[data-secao="ofertas"]'),
        classicos: document.querySelector('.carrossel[data-secao="classicos"]'),
        modernos: document.querySelector('.carrossel[data-secao="modernos"]')
    };

    // limpa tudo
    Object.values(secoes).forEach(secao => {
        if (secao) secao.innerHTML = "";
    });

    // Função pra ordenar por prioridade (1 a 5) e manter ordem original se empate
    const ordenarPorPrioridade = (arr) => {
  return arr.slice().sort((a, b) => {
    const pa = Number(a.prioridade) || 5;
    const pb = Number(b.prioridade) || 5;

    if (pb !== pa) return pb - pa;
    return 0; // mantém ordem original
  });
};

    const carrosOfertas = [];
    const carrosClassicos = [];
    const carrosModernos = [];

    carros.forEach(carro => {
    const ano = Number(carro.ano);

    // PROMOÇÃO (sempre entra se true)
    if (carro.emPromocao === true) {
        carrosOfertas.push(carro);
        return; // aqui impede que entre em outras seções
    }

    // SEÇÃO manual (se existir)
    if (carro.secao === "ofertas") carrosOfertas.push(carro);
    if (carro.secao === "classicos") carrosClassicos.push(carro);
    if (carro.secao === "modernos") carrosModernos.push(carro);

    // IF só pra novos ou antigos (quando não tem secao manual)
    if (!carro.secao) {
        if (!isNaN(ano) && ano <= 1995) carrosClassicos.push(carro);
        else if (!isNaN(ano) && ano >= 2016) carrosModernos.push(carro);
    }
});


    // ordena por prioridade
    ordenarPorPrioridade(carrosOfertas).forEach(carro => secoes.ofertas?.appendChild(criarCard(carro)));
    ordenarPorPrioridade(carrosClassicos).forEach(carro => secoes.classicos?.appendChild(criarCard(carro)));
    ordenarPorPrioridade(carrosModernos).forEach(carro => secoes.modernos?.appendChild(criarCard(carro)));

    clonarCardsVisiveis();
    configurarInteracoes();
}

/* =========================
    3. LÓGICA DE BUSCA
========================== */
function configurarBusca() {
    const inputBusca = document.getElementById('input-busca');
    const btnBuscar = document.querySelector('.btn-buscar');
    const carrosselResultados = document.getElementById('resultado-busca');
    const secaoResultados = document.getElementById('secao-resultados');
    const contador = document.getElementById('contador-resultados');
    const secoesOriginais = document.querySelectorAll('.secao-carrossel:not(#secao-resultados)');

    // Verifica se os elementos existem para não dar erro no console
    if (!inputBusca || !btnBuscar || !carrosselResultados) return;

    const realizarBusca = () => {
        const termo = inputBusca.value.toLowerCase().trim();

        // Se a busca estiver vazia, volta ao estado original
        if (termo === "") {
            secaoResultados.classList.add('hidden');
            secoesOriginais.forEach(s => s.classList.remove('hidden'));
            return;
        }

        // --- LÓGICA PROFISSIONAL DE FILTRO ---
        const filtrados = (typeof carrosData !== 'undefined' ? carrosData : []).filter(carro => {
            const buscaDinamica = `
                ${carro.marca} ${carro.modelo} ${carro.descricao}
                ${carro.cor} ${carro.cidade} ${carro.combustivel}
                ${carro.badge} ${carro.ano}
            `.toLowerCase();

            let termoAjustado = termo;
            if (termo === "wols" || termo === "vw" || termo === "volks") termoAjustado = "volkswagen";
            if (termo === "chevy") termoAjustado = "chevrolet";

            return buscaDinamica.includes(termoAjustado) || buscaDinamica.includes(termo);
        });

        // 1. Esconde as seções de Ofertas/Clássicos e mostra a de resultados
        secoesOriginais.forEach(s => s.classList.add('hidden'));
        secaoResultados.classList.remove('hidden');

        // 2. Limpa o carrossel de resultados antes de inserir novos
        carrosselResultados.innerHTML = "";

        if (filtrados.length === 0) {
            if (contador) contador.innerText = "Nenhum veículo encontrado.";
            carrosselResultados.innerHTML = `<p class="sem-resultado" style="padding: 60px; text-align: center; width: 100%; color: var(--text-secondary);">Não encontramos resultados para "<strong>${termo}</strong>".<br><small>Dica: Tente buscar por marca, cor ou termos como 'Turbo' ou 'Automático'.</small></p>`;
        } else {
            if (contador) contador.innerHTML = `Encontramos <strong>${filtrados.length}</strong> veículos para você.`;
            
            // 3. Renderiza os cards encontrados
            filtrados.forEach(carro => {
                carrosselResultados.appendChild(criarCard(carro));
            });

            // 4. Preenchimento (Clonagem): Se houver poucos resultados, clona para o carrossel não ficar vazio
            if (filtrados.length > 0 && filtrados.length < MIN_CARDS) {
                let i = 0;
                while (carrosselResultados.children.length < MIN_CARDS) {
                    const original = carrosselResultados.children[i % filtrados.length];
                    if (original) {
                        const clone = original.cloneNode(true);
                        clone.classList.add('clone');
                        carrosselResultados.appendChild(clone);
                    }
                    i++;
                }
            }
        }

        // 5. Reativa as trocas de imagem no hover e cliques nos botões
        configurarInteracoes();
        
        // 6. Reativa as setas de scroll especificamente para este novo conteúdo
        configurarSetas();
        
        // 7. Scroll suave para o início da seção de resultados
        const offset = secaoResultados.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: offset, behavior: 'smooth' });
    };

    // Listeners
    btnBuscar.onclick = realizarBusca;
    inputBusca.onkeyup = (e) => { 
        if (e.key === 'Enter') realizarBusca(); 
    };
}

/* =========================
    4. CRIAR CARD
========================== */
function criarCard(carro) {
    const card = document.createElement('div');
    card.className = 'carro';
    card.style.position = 'relative';

    const getBaseUrl = () => API?.BASE_URL || "https://webmotors-clone-back.onrender.com";

    // placeholder SVG embutido
    const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
        <rect fill="#f3f3f3" width="100%" height="100%"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              fill="#9aa0a6" font-family="Arial" font-size="20">
            Sem imagem
        </text>
    </svg>`;
    const PLACEHOLDER = 'data:image/svg+xml;base64,' + btoa(placeholderSvg);
    card.dataset.id = String(carro.id ?? carro._id ?? '');

    /* ===== IMAGENS ===== */
    let imagensArray = [];

    try {
        if (Array.isArray(carro.imagens)) {
            imagensArray = carro.imagens;
        } else if (typeof carro.imagens === "string") {
            try {
                imagensArray = JSON.parse(carro.imagens);
            } catch {
                imagensArray = carro.imagens ? [carro.imagens] : [];
            }
        }
    } catch {
        imagensArray = [];
    }

    const imagensCorrigidas = imagensArray
        .map(img => {
            if (!img) return null;
            if (img.startsWith("http")) return img;
            if (img.startsWith("/")) return getBaseUrl() + img;
            return `${getBaseUrl()}/imagens/${img}`;
        })
        .filter(Boolean);

    const imagemPrincipal = imagensCorrigidas[0] || PLACEHOLDER;

    /* ===== DATASETS ===== */
    card.dataset.descricao = carro.descricao || '';
    card.dataset.ano = carro.ano || '';
    card.dataset.km = carro.km || '';
    card.dataset.combustivel = carro.combustivel || '';
    card.dataset.finalPlaca = carro.finalPlaca || '';
    card.dataset.cambio = carro.cambio || '';
    card.dataset.cor = carro.cor || '';
    card.dataset.cidade = carro.cidade || '';
    card.dataset.troca = carro.aceitaTroca || '';
    card.dataset.prioridade = carro.prioridade || '';

    /* ===== BADGE ===== */
    const badgeHTML = carro.badge
        ? `<span class="badge">${carro.badge}</span>`
        : '';

    /* ===== PREÇOS (SEM BUG, SEM NaN) ===== */
    const precoNormal = Number(carro.preco);
    const precoAntigo = Number(carro.precoAntigo);

    let precoHTML = '';
    let precoAntigoHTML = '';

    if (!isNaN(precoAntigo) && precoAntigo > 0) {
        precoAntigoHTML = `
            <span class="preco-antigo">
                R$ ${precoAntigo.toLocaleString('pt-BR')}
            </span>`;
    }

    if (!isNaN(precoNormal) && precoNormal > 0) {
        precoHTML = `
            <span class="preco">
                R$ ${precoNormal.toLocaleString('pt-BR')}
            </span>`;
    } else {
        precoHTML = `<span class="preco consultar">Consultar preço</span>`;
    }

    /* ===== THUMBS ===== */
    const thumbsHTML = imagensCorrigidas.length
        ? imagensCorrigidas
            .map(img => `<img src="${img}" loading="lazy" alt="thumbnail"
                 onerror="this.src='${PLACEHOLDER}'">`)
            .join('')
        : '';

    /* ===== HTML FINAL ===== */
    card.innerHTML = `
        ${badgeHTML}
        <img class="principal"
             src="${imagemPrincipal}"
             alt="${carro.marca || ''} ${carro.modelo || ''}"
             onerror="this.src='${PLACEHOLDER}'">

        <div class="thumbs">${thumbsHTML}</div>

        <h2>${carro.marca || ''} ${carro.modelo || ''}</h2>
        <p>${carro.descricaoCurta || ''}</p>

        <p class="precos">
            ${precoAntigoHTML}
            ${precoHTML}
        </p>

        <button class="detalhes">Ver detalhes</button>
    `;

    return card;
}


/* =========================
    5. CLONAR CARDS (Para o Carrossel Infinito)
========================== */
function clonarCardsVisiveis() {
    document.querySelectorAll('.carrossel').forEach(carrossel => {
        // Não clona se estivermos visualizando resultados de busca
        if (carrossel.closest('.hidden')) return;

        const cards = [...carrossel.children].filter(c => !c.classList.contains('clone'));
        if (cards.length === 0) return;

        let i = 0;
        while (carrossel.children.length < MIN_CARDS) {
            const clone = cards[i % cards.length].cloneNode(true);
            clone.classList.add('clone');
            carrossel.appendChild(clone);
            i++;
        }
    });
}

/* =========================
    6. INTERAÇÕES E IMAGENS
========================== */
function configurarInteracoes() {
    document.querySelectorAll('.carro').forEach(carro => {
        const principal = carro.querySelector('.principal');
        const thumbs = carro.querySelectorAll('.thumbs img');

        thumbs.forEach(t => {
            t.addEventListener('mouseenter', () => trocarImagem(principal, t.src));
            t.addEventListener('click', () => trocarImagem(principal, t.src));
        });
    });

    // Removi o ouvinte anterior para não duplicar ao re-configurar interações
    document.removeEventListener('click', tratarCliqueDetalhes);
    document.addEventListener('click', tratarCliqueDetalhes);
}

function tratarCliqueDetalhes(e) {
    if (!e.target.classList.contains('detalhes')) return;

    const card = e.target.closest('.carro');
    if (!card) return;

    // pega o ID real vindo do back
    const carroId = card.dataset.id;

    if (!carroId) {
        alert('ID do veículo não encontrado.');
        return;
    }

    // passa o ID pela URL
    window.location.href = `detalhes.html?id=${carroId}`;
}


function trocarImagem(img, src) {
    img.style.opacity = '0.4';
    setTimeout(() => {
        img.src = src;
        img.style.opacity = '1';
    }, 200);
}

/* =========================
    7. SETAS
========================== */
function configurarSetas() {
    document.querySelectorAll('.secao-carrossel').forEach(secao => {
        const carrossel = secao.querySelector('.carrossel');
        // Usando cloneNode para limpar eventos antigos se a função for chamada de novo
        const setaDir = secao.querySelector('.seta-dir');
        const setaEsq = secao.querySelector('.seta-esq');

        setaDir?.addEventListener('click', () => {
            carrossel.scrollBy({ left: 700, behavior: 'smooth' });
        });
        setaEsq?.addEventListener('click', () => {
            carrossel.scrollBy({ left: -700, behavior: 'smooth' });
        });
    });
}

/* =========================
    8. DARK MODE
========================== */
function initDarkMode() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const temaSalvo = localStorage.getItem('theme') || 'dark';
    document.documentElement.dataset.theme = temaSalvo;

    const atualizarBotaoUI = (tema) => {
        themeToggle.innerHTML = tema === 'light' 
            ? '<i class="fas fa-sun"></i> Light Mode' 
            : '<i class="fas fa-moon"></i> Dark Mode';
    };

    atualizarBotaoUI(temaSalvo);

    themeToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const novoTema = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = novoTema;
        localStorage.setItem('theme', novoTema);
        atualizarBotaoUI(novoTema);
    });
}

/* =========================
   9. Validação do Token
========================== */

const token = localStorage.getItem("token");

if (token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.role === "admin") {
      document.getElementById("btn-admin").style.display = "block";
    }
  } catch {}
}

const adminBtn = document.getElementById("btn-admin");
if (adminBtn) {
  adminBtn.addEventListener("click", () => {
    window.location.href = "admin/admin.html";
  });
}

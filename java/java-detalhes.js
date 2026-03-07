/* =========================
   0. CONFIGURAÇÃO GLOBAL
========================== */
const API = window.WebMotorAPI;
const getBaseUrl = () => API?.BASE_URL || 'https://webmotors-clone-back.onrender.com';

/* =========================
   1. DARK MODE
========================== */
const btnTema = document.getElementById('toggle-dark');

function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);

    if (btnTema) {
        btnTema.innerHTML =
            tema === 'dark'
                ? '<i class="fas fa-sun"></i>'
                : '<i class="fas fa-moon"></i>';
    }

    localStorage.setItem('theme', tema);
}

btnTema?.addEventListener('click', () => {
    const novoTema =
        document.documentElement.dataset.theme === 'dark'
            ? 'light'
            : 'dark';
    aplicarTema(novoTema);
});

aplicarTema(localStorage.getItem('theme') || 'dark');

/* =========================
   2. CARREGAR DETALHES DO CARRO
========================== */
async function carregarCarro() {
    try {
        const params = new URLSearchParams(window.location.search);
        const carroId = params.get('id');

        if (!carroId) {
            alert('Veículo não encontrado.');
            window.location.href = 'index.html';
            return;
        }

        let carros = API ? await API.fetchCarrosJson() : [];
        const carro = carros.find(c => String(c.id ?? c._id) === String(carroId));

        if (!carro) {
            alert('Carro não encontrado.');
            window.location.href = 'index.html';
            return;
        }

        preencherDetalhes(carro);
        montarGaleria(carro);

    } catch (err) {
        console.error(err);
        alert('Erro ao carregar os dados do veículo.');
        window.location.href = 'index.html';
    } finally {
        document.body.classList.add('loaded');
        document.querySelector('.pagina-detalhes')?.classList.add('animar-entrada');
    }
}


/* =========================
   3. PREENCHER DETALHES
========================== */
function preencherTexto(seletor, valor, padrao = 'Não informado') {
    const el = document.querySelector(seletor);
    if (el) el.textContent = valor || padrao;
}

function preencherDetalhes(dados) {
    preencherTexto('.detalhes-titulo', `${dados.marca || ''} ${dados.modelo || ''}`);
    preencherTexto('#descricao-curta', dados.descricaoCurta);
    preencherTexto('#descricao-longa', dados.descricao);
   preencherTexto('.detalhes-preco', Number(dados.preco).toLocaleString("pt-BR"));
   preencherTexto('.detalhes-preco-antigo', dados.precoAntigo ? Number(dados.precoAntigo).toLocaleString("pt-BR") : '');
    preencherTexto('#detalhes-cidade', dados.cidade);
    preencherTexto('#detalhes-ano', dados.ano);
    preencherTexto('#detalhes-combustivel', dados.combustivel);

    let km = dados.km || '0';
    if (!km.toString().includes('km')) km += ' km';
    preencherTexto('#detalhes-km', km);

    preencherTexto('#detalhes-placa', dados.finalPlaca);
    preencherTexto('#detalhes-cambio', dados.cambio);
    preencherTexto('#detalhes-cor', dados.cor);
    preencherTexto(
        '#detalhes-troca',
        dados.aceitaTroca === true || dados.aceitaTroca === 'Sim'
            ? 'Sim'
            : 'Não'
    );
}

/* =========================
   4. GALERIA DE IMAGENS
========================== */
function montarGaleria(dados) {
    const galeria = document.querySelector('.galeria-detalhes');
    const modal = document.getElementById('modal-img');
    const modalImg = document.getElementById('imgModal');
    const fecharModal = document.querySelector('.fechar');
    const setaEsq = document.querySelector('.seta-esquerda');
    const setaDir = document.querySelector('.seta-direita');

    if (!galeria) return;

    let imagens = [];

    try {
        imagens = Array.isArray(dados.imagens)
            ? dados.imagens
            : JSON.parse(dados.imagens || '[]');
    } catch {
        imagens = [];
    }

    if (imagens.length === 0) {
        galeria.innerHTML = '<p>Nenhuma imagem disponível.</p>';
        return;
    }

    const imagensCorrigidas = imagens
        .map(img => {
            if (!img) return null;
            if (img.startsWith('http')) return img;
            if (img.startsWith('/')) return getBaseUrl() + img;
            return `${getBaseUrl()}/imagens/${img}`;
        })
        .filter(Boolean);

    galeria.innerHTML = imagensCorrigidas
        .map(src => `<img src="${src}" alt="Foto do veículo">`)
        .join('');

    const fotos = [...galeria.querySelectorAll('img')];
    let indiceAtual = 0;

    fotos.forEach((img, index) => {
        img.addEventListener('click', () => {
            indiceAtual = index;
            modalImg.src = img.src;
            modal.style.display = 'flex';
        });
    });

    setaEsq?.addEventListener('click', () => {
        indiceAtual = (indiceAtual - 1 + fotos.length) % fotos.length;
        modalImg.src = fotos[indiceAtual].src;
    });

    setaDir?.addEventListener('click', () => {
        indiceAtual = (indiceAtual + 1) % fotos.length;
        modalImg.src = fotos[indiceAtual].src;
    });

    fecharModal?.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

/* =========================
   5. FORMULÁRIO
========================== */
function configurarFormulario() {
    const form = document.getElementById('formContato');
    const btnEnviar = document.querySelector('.btn-enviar');
    const checkbox = document.getElementById('aceita');

    if (!form || !btnEnviar || !checkbox) return;

    const validar = () => {
        const ok = [...form.querySelectorAll('[required]')]
            .every(el => el.value.trim());
        btnEnviar.disabled = !(ok && checkbox.checked);
        btnEnviar.classList.toggle('ativo', ok && checkbox.checked);
    };

    form.addEventListener('input', validar);
    checkbox.addEventListener('change', validar);

    form.addEventListener('submit', e => {
        e.preventDefault();
        alert('Mensagem enviada com sucesso!');
        form.reset();
        validar();
    });

    validar();
}

/* =========================
   6. INIT
========================== */
document.addEventListener('DOMContentLoaded', () => {
    carregarCarro();
    configurarFormulario();
});








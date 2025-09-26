// --- CONFIGURAÇÕES GLOBAIS ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game states
const GAME_STATE = {
    ID_SCREEN: 'id_screen',
    START_SCREEN: 'start_screen',
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
    RANKING_SCREEN: 'ranking_screen'
};
let currentState = GAME_STATE.ID_SCREEN;

// Bird properties
const BIRD_WIDTH = 30;
const BIRD_HEIGHT = 20;
const BIRD_FLAP_STRENGTH = -5; // Impulso para cima
let birdX = 50;
let birdY = canvas.height / 2 - BIRD_HEIGHT / 2;
let birdVelocity = 0;
const GRAVITY = 0.2;

// Pipe properties
const PIPE_WIDTH = 50;
const PIPE_GAP = 120; // Espaço entre o cano superior e inferior
const PIPE_SPEED = 2;
const PIPE_SPAWN_INTERVAL = 150; // Quantos frames para gerar um novo cano
let pipes = [];
let frames = 0;

// Game stats
let score = 0;
let gameOver = false;
let ID_USUARIO = null; // ID do usuário logado

// --- FUNÇÕES DE ARMAZENAMENTO (LocalStorage) ---
const RANKING_KEY = 'flappyBirdRankingUsuarios';

function carregarRanking() {
    const rankingString = localStorage.getItem(RANKING_KEY);
    return rankingString ? JSON.parse(rankingString) : [];
}

function salvarRanking(ranking) {
    localStorage.setItem(RANKING_KEY, JSON.stringify(ranking));
}

function atualizarPontuacaoNoRanking() {
    if (!ID_USUARIO) return;

    let ranking = carregarRanking();
    let usuarioExistente = ranking.find(user => user.id === ID_USUARIO);

    if (usuarioExistente) {
        if (score > usuarioExistente.score) {
            usuarioExistente.score = score;
        }
    } else {
        ranking.push({ id: ID_USUARIO, score: score });
    }
    salvarRanking(ranking);
}

function getRecordeUsuario(id) {
    const ranking = carregarRanking();
    const usuario = ranking.find(user => user.id === id);
    return usuario ? usuario.score : 0;
}

// --- FUNÇÕES DE TELA ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function validarIDParaJogo() {
    const input = document.getElementById('inputId');
    const id = input.value.toUpperCase().trim();
    const mensagem = document.getElementById('mensagemId');

    if (id.length !== 3) {
        mensagem.textContent = 'O ID deve ter exatamente 3 caracteres.';
        return;
    }
    if (!/^[A-Z0-9]+$/.test(id)) {
        mensagem.textContent = 'O ID deve conter apenas letras e números.';
        return;
    }

    ID_USUARIO = id;
    mensagem.textContent = '';
    
    // Atualiza o ID na tela de início
    document.getElementById('idUsuarioDisplayInicio').textContent = ID_USUARIO;
    
    // Inicia a sessão na tela de início do jogo Flappy Bird
    currentState = GAME_STATE.START_SCREEN;
    showScreen('tela-inicio');
}

function iniciarJogoFlappy() {
    // Resetar o estado do jogo
    birdY = canvas.height / 2 - BIRD_HEIGHT / 2;
    birdVelocity = 0;
    pipes = [];
    score = 0;
    frames = 0;
    gameOver = false;
    document.getElementById('pontuacaoFlappy').textContent = score;

    currentState = GAME_STATE.PLAYING;
    showScreen('tela-jogo');
    gameLoop(); // Começa o loop do jogo
}

function reiniciarJogoFlappy() {
    iniciarJogoFlappy(); // Apenas reinicia o jogo
}

function sairDoJogoFlappy() {
    atualizarPontuacaoNoRanking(); // Salva a pontuação antes de sair
    ID_USUARIO = null;
    document.getElementById('inputId').value = '';
    currentState = GAME_STATE.ID_SCREEN;
    showScreen('tela-id');
}

function mostrarRanking() {
    const rankingContainer = document.getElementById('ranking-lista');
    let ranking = carregarRanking();
    ranking.sort((a, b) => b.score - a.score); // Ordena por pontuação

    let htmlTabela = '<table><thead><tr><th>#</th><th>ID</th><th>Pontuação</th></tr></thead><tbody>';
    ranking.forEach((user, index) => {
        htmlTabela += `
            <tr>
                <td>${index + 1}</td>
                <td>${user.id}</td>
                <td>${user.score}</td>
            </tr>
        `;
    });
    htmlTabela += '</tbody></table>';
    rankingContainer.innerHTML = htmlTabela;

    currentState = GAME_STATE.RANKING_SCREEN;
    showScreen('tela-ranking');
}

function voltarParaIDFlappy() {
    // Dependendo de onde veio, pode voltar para a tela de ID ou de Início
    if (ID_USUARIO) { // Se o usuário já fez login
        document.getElementById('idUsuarioDisplayInicio').textContent = ID_USUARIO;
        currentState = GAME_STATE.START_SCREEN;
        showScreen('tela-inicio');
    } else { // Se não fez login ainda
        currentState = GAME_STATE.ID_SCREEN;
        showScreen('tela-id');
    }
}


// --- LÓGICA DO JOGO ---

function drawBird() {
    ctx.fillStyle = 'yellow';
    ctx.fillRect(birdX, birdY, BIRD_WIDTH, BIRD_HEIGHT);
}

function drawPipes() {
    ctx.fillStyle = 'green';
    pipes.forEach(pipe => {
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, canvas.height - pipe.bottomY);
    });
}

function updateGame() {
    if (gameOver) return;

    // Bird physics
    birdVelocity += GRAVITY;
    birdY += birdVelocity;

    // Ground collision
    if (birdY + BIRD_HEIGHT > canvas.height) {
        birdY = canvas.height - BIRD_HEIGHT;
        gameOver = true;
    }
    // Ceiling collision
    if (birdY < 0) {
        birdY = 0;
        birdVelocity = 0; // Impede que voe para fora da tela indefinidamente
    }

    // Pipe generation
    if (frames % PIPE_SPAWN_INTERVAL === 0) {
        const topHeight = Math.random() * (canvas.height - PIPE_GAP - 50) + 20; // Altura aleatória do cano superior
        pipes.push({
            x: canvas.width,
            topHeight: topHeight,
            bottomY: topHeight + PIPE_GAP,
            passed: false // Para pontuação
        });
    }

    // Move and remove pipes
    for (let i = 0; i < pipes.length; i++) {
        let pipe = pipes[i];
        pipe.x -= PIPE_SPEED;

        // Collision detection
        if (birdX < pipe.x + PIPE_WIDTH &&
            birdX + BIRD_WIDTH > pipe.x &&
            (birdY < pipe.topHeight || birdY + BIRD_HEIGHT > pipe.bottomY)) {
            gameOver = true;
        }

        // Score
        if (pipe.x + PIPE_WIDTH < birdX && !pipe.passed) {
            score++;
            document.getElementById('pontuacaoFlappy').textContent = score;
            pipe.passed = true;
        }

        // Remove pipes off-screen
        if (pipe.x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
            i--; // Ajusta o índice após remover um elemento
        }
    }

    frames++;

    if (gameOver) {
        // Atualiza o ranking e mostra a tela de Game Over
        atualizarPontuacaoNoRanking();
        
        document.getElementById('idUsuarioDisplayGameOver').textContent = ID_USUARIO;
        document.getElementById('idUsuarioDisplayRecorde').textContent = ID_USUARIO;
        document.getElementById('pontuacaoFinal').textContent = score;
        document.getElementById('recordeUsuario').textContent = getRecordeUsuario(ID_USUARIO);
        currentState = GAME_STATE.GAME_OVER;
        showScreen('tela-gameover');
    }
}

function gameLoop() {
    if (currentState !== GAME_STATE.PLAYING) return; // Só roda o loop se estiver jogando

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa o canvas
    drawBird();
    drawPipes();
    updateGame();

    requestAnimationFrame(gameLoop); // Loop contínuo
}

// --- CONTROLES DE ENTRADA ---
function flap() {
    if (currentState === GAME_STATE.PLAYING && !gameOver) {
        birdVelocity = BIRD_FLAP_STRENGTH;
    }
}

// Event Listeners for controls
canvas.addEventListener('mousedown', flap); // Click do mouse
canvas.addEventListener('touchstart', (e) => { // Toque na tela (mobile)
    e.preventDefault(); // Impede rolagem da página ao tocar
    flap();
});
document.addEventListener('keydown', (e) => { // Teclado (espaço)
    if (e.code === 'Space') {
        flap();
    }
});

// Inicializa a tela de ID ao carregar
window.onload = () => {
    showScreen('tela-id');
};

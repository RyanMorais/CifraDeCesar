// --- CONFIGURAÇÃO ---
const ADMIN_PASSWORD = "123"; // <--- SUA SENHA DE ADMIN AQUI
// -------------------

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
let currentPuzzles = [];
let puzzleIdx = 0;
let isAdminLoggedIn = false;

// Audio Context (Sintetizador)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Elementos
const outerRing = document.getElementById('outer-ring');
const innerRing = document.getElementById('inner-ring');
const wrapper = document.getElementById('disk-wrapper');

let rotationOuter = 0;
let rotationInner = 0;
const stepAngle = 360 / 26;

document.addEventListener('DOMContentLoaded', () => {
    initGame();
    setupInteraction();
    window.addEventListener('resize', () => setTimeout(initRings, 100));
});

// --- CORE DO JOGO ---
function initGame() {
    loadPuzzles();
    initRings();
    loadLevel();
}

function initRings() {
    outerRing.innerHTML = '<div class="ring-decoration"></div>';
    innerRing.innerHTML = '<div class="center-knob"><i class="ph-fill ph-fingerprint"></i></div>';
    
    // Calcula raios baseado no tamanho da tela
    const rOuter = outerRing.offsetWidth / 2 - 18;
    const rInner = innerRing.offsetWidth / 2 - 18;

    createLetters(outerRing, rOuter);
    createLetters(innerRing, rInner);
    updateRingVisuals();
}

function createLetters(container, radius) {
    alphabet.forEach((char, index) => {
        const el = document.createElement('div');
        el.className = 'char';
        el.innerText = char;
        const angle = (index * stepAngle) - 90;
        // Salva variáveis CSS para o efeito "Roda Gigante"
        el.style.setProperty('--initial-angle', angle + 'deg');
        el.style.setProperty('--radius', radius + 'px');
        container.appendChild(el);
    });
}

// --- INTERAÇÃO (Discos) ---
function setupInteraction() {
    let activeRing = null;
    let startAngle = 0;
    let initialRot = 0;

    const getAngle = (x, y) => {
        const rect = wrapper.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        return Math.atan2(y - cy, x - cx) * (180 / Math.PI);
    };

    const getDist = (x, y) => {
        const rect = wrapper.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        return Math.hypot(x - cx, y - cy);
    };

    const onStart = (e) => {
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        const rTotal = wrapper.offsetWidth / 2;

        if (getDist(x, y) < (rTotal * 0.62)) {
            activeRing = 'inner';
            initialRot = rotationInner;
            innerRing.style.transition = 'none';
        } else {
            activeRing = 'outer';
            initialRot = rotationOuter;
            outerRing.style.transition = 'none';
        }
        startAngle = getAngle(x, y);
    };

    const onMove = (e) => {
        if (!activeRing) return;
        e.preventDefault();
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        const delta = getAngle(x, y) - startAngle;

        if (activeRing === 'inner') rotationInner = initialRot + delta;
        else rotationOuter = initialRot + delta;
        updateRingVisuals();
    };

    const onEnd = () => {
        if (!activeRing) return;
        const snap = (rot) => Math.round(rot / stepAngle) * stepAngle;
        
        if (activeRing === 'inner') {
            innerRing.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            rotationInner = snap(rotationInner);
        } else {
            outerRing.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            rotationOuter = snap(rotationOuter);
        }
        activeRing = null;
        updateRingVisuals();
        calculateOffset();
    };

    wrapper.addEventListener('mousedown', onStart);
    wrapper.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
}

function updateRingVisuals() {
    innerRing.style.setProperty('--rot', rotationInner + 'deg');
    outerRing.style.setProperty('--rot', rotationOuter + 'deg');
}

function calculateOffset() {
    const normalize = (deg) => {
        let idx = Math.round(deg / stepAngle) % 26;
        return idx < 0 ? idx + 26 : idx;
    };
    let diff = normalize(rotationInner) - normalize(rotationOuter);
    if (diff < 0) diff += 26;
    document.getElementById('offset-val').innerText = diff;
}

// --- LÓGICA DO JOGO ---
function loadPuzzles() {
    const saved = localStorage.getItem('cryptex_v7_db');
    if (saved) currentPuzzles = JSON.parse(saved);
    else {
        currentPuzzles = [{ text: "FUTURO", shift: 3, hint: "Ainda não aconteceu" }];
        saveData();
    }
}

function loadLevel() {
    if(!currentPuzzles.length) return;
    if(puzzleIdx >= currentPuzzles.length) puzzleIdx = 0;
    
    const p = currentPuzzles[puzzleIdx];
    document.getElementById('level-num').innerText = puzzleIdx + 1;
    document.getElementById('puzzle-hint').innerText = p.hint;
    document.getElementById('puzzle-code').innerText = encrypt(p.text, p.shift);
    document.getElementById('answer-input').value = '';
    document.getElementById('feedback').innerText = '';
}

function checkAnswer() {
    const ans = document.getElementById('answer-input').value.toUpperCase().trim();
    const correct = currentPuzzles[puzzleIdx].text;
    const fb = document.getElementById('feedback');

    if (ans === correct) {
        playSound('success');
        document.getElementById('success-overlay').classList.remove('hidden');
    } else {
        playSound('error');
        const glitch = document.getElementById('error-overlay');
        glitch.classList.remove('hidden');
        document.body.classList.add('shake-screen');
        fb.innerText = "ERRO DE CRIPTOGRAFIA";
        fb.style.color = "var(--error)";
        setTimeout(() => {
            glitch.classList.add('hidden');
            document.body.classList.remove('shake-screen');
        }, 500);
    }
}

function nextLevel() {
    document.getElementById('success-overlay').classList.add('hidden');
    puzzleIdx = (puzzleIdx + 1) % currentPuzzles.length;
    loadLevel();
}

function encrypt(txt, shift) {
    return txt.replace(/[A-Z]/g, c => String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65));
}

// --- AUDIO SFX ---
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
    } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    }
}

// --- ADMIN SYSTEM ---
function toggleModal(id) { document.getElementById(id).classList.toggle('hidden'); }

function openAdmin() {
    toggleModal('admin-modal');
    if(isAdminLoggedIn) showDashboard();
    else {
        document.getElementById('adm-login-view').classList.remove('hidden');
        document.getElementById('adm-dashboard-view').classList.add('hidden');
    }
}

function verifyAdminLogin() {
    if(document.getElementById('adm-pass-input').value === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        document.getElementById('login-error').innerText = "";
        document.getElementById('adm-pass-input').value = "";
        showDashboard();
    } else document.getElementById('login-error').innerText = "Senha Incorreta";
}

function showDashboard() {
    document.getElementById('adm-login-view').classList.add('hidden');
    document.getElementById('adm-dashboard-view').classList.remove('hidden');
    renderList();
    updateCount();
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-'+tab).classList.remove('hidden');
    event.target.classList.add('active');
    if(tab === 'list') renderList();
}

function renderList() {
    const list = document.getElementById('puzzle-list-container');
    list.innerHTML = '';
    currentPuzzles.forEach((p, i) => {
        const d = document.createElement('div');
        d.className = 'puzzle-item';
        d.innerHTML = `<span>#${i+1} <b>${p.text}</b> (Chave: ${p.shift})</span>
        <button class="btn-delete" onclick="deletePuzzle(${i})"><i class="ph ph-trash"></i></button>`;
        list.appendChild(d);
    });
}

function deletePuzzle(i) {
    if(confirm("Apagar?")) {
        currentPuzzles.splice(i, 1);
        saveData();
        renderList(); updateCount();
        if(puzzleIdx >= currentPuzzles.length) puzzleIdx = 0;
        loadLevel();
    }
}

function savePuzzle() {
    const t = document.getElementById('adm-ans').value.toUpperCase().trim();
    const s = parseInt(document.getElementById('adm-shift').value);
    const h = document.getElementById('adm-hint').value;
    if(t && h) {
        currentPuzzles.push({text:t, shift:s, hint:h});
        saveData(); alert("Salvo!");
        document.getElementById('adm-ans').value = '';
        document.getElementById('adm-hint').value = '';
        updateCount();
    } else alert("Preencha tudo");
}

function updateCount() { document.getElementById('total-puzzles').innerText = currentPuzzles.length; }
function saveData() { localStorage.setItem('cryptex_v7_db', JSON.stringify(currentPuzzles)); }
function clearStorage() { if(confirm("Apagar TUDO?")) { localStorage.removeItem('cryptex_v7_db'); location.reload(); } }

// Preview Admin
const updatePreview = () => {
    const t = document.getElementById('adm-ans').value.toUpperCase();
    const s = parseInt(document.getElementById('adm-shift').value)||0;
    document.getElementById('adm-preview').innerText = encrypt(t, s);
};
document.getElementById('adm-ans').addEventListener('input', updatePreview);
document.getElementById('adm-shift').addEventListener('input', updatePreview);
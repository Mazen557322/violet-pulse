
let currentUser = null;
let walletCoins = 3000;
let currentScore = 0;
let personalBest = 0;
let unlockedAchievements = [];

let betAmount = 300;
let matchTimeLeft = 60;
let puzzleTimeLeft = 5;
let maxPuzzleTime = 5;

let matchInterval = null;
let puzzleInterval = null;
let leaderboardInterval = null;
let isPaused = false;
let isSandbox = false;
let overclockAvailable = true;

let currentTarget = '';
let targetScore = 0;
let penaltyMultiplier = 3; 
let winStreak = 0;

let isMuted = false;
let isBgmOn = true;
let bgmInterval = null;
let bgmStep = 0;

const allSymbols = ['🔮', '⚡', '💎', '👾', '⏳', '🔥', '👑', '🌀', '🧿', '🛸', '🎯', '🚀', '🔑', '🌌', '🧪'];
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const canvas = document.getElementById('fx-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let floatingTexts = [];

// توليد 45 وساماً برمجياً بأسماء وأيقونات فريدة
const badgeIcons = ['🔥', '💎', '⚡', '🛡️', '👑', '🚀', '🔮', '👾', '🌀', '🧿', '🎯', '🔑', '🌌', '🧪', '⭐'];
const ACHIEVEMENTS_LIST = [];
for (let i = 1; i <= 45; i++) {
    ACHIEVEMENTS_LIST.push({
        id: `ach_${i}`,
        icon: badgeIcons[(i - 1) % badgeIcons.length],
        title: `بروتوكول تدمير ${i * 5}`,
        desc: `الوصول إلى مستويات أمان متقدمة وإنجاز عمليات اختراق ناجحة رقم ${i}.`
    });
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function addParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            radius: Math.random() * 4 + 2,
            color: color,
            alpha: 1
        });
    }
}

function addFloatingText(text, x, y, color) {
    floatingTexts.push({ text: text, x: x, y: y, vy: -1.5, alpha: 1, color: color });
}

function updateAndDrawFX() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.alpha -= 0.03;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let f = floatingTexts[i];
        f.y += f.vy; f.alpha -= 0.025;
        if (f.alpha <= 0) { floatingTexts.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = f.alpha;
        ctx.font = 'bold 18px Cairo';
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
    }
    requestAnimationFrame(updateAndDrawFX);
}
updateAndDrawFX();

function triggerGlitch() {
    const overlay = document.getElementById('glitch-overlay');
    overlay.style.opacity = '0.7';
    setTimeout(() => overlay.style.opacity = '0', 250);
}

function speakSuccess() {
    if (isMuted) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance("تم الاختراق بنجاح");
    msg.lang = 'ar-SA';
    msg.pitch = 0.8;
    window.speechSynthesis.speak(msg);
}

function triggerShake() {
    const el = document.getElementById('main-wrapper');
    el.classList.add('shake-anim');
    setTimeout(() => el.classList.remove('shake-anim'), 300);
}

function playSound(type) {
    if (isMuted) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'win') {
        osc.type = 'triangle';
        let pitchMod = 587.33 + (winStreak * 25);
        osc.frequency.setValueAtTime(pitchMod, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'fail') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'victory') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.35);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.start(now); osc.stop(now + 0.35);
    }
}

function startBGM() {
    if (bgmInterval || !isBgmOn) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const bassline = [65.41, 77.78, 65.41, 87.31];
    bgmInterval = setInterval(() => {
        if (!isBgmOn || isPaused) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassline[bgmStep % bassline.length], now);
        osc.connect(gain); gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
        bgmStep++;
    }, 200);
}

function stopBGM() {
    if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
}

function toggleSound() {
    isMuted = !isMuted;
    document.getElementById('sound-toggle').innerText = isMuted ? "🔇 الصوت: مكتوم" : "🔊 الصوت: مفعل";
}

function toggleBGM() {
    isBgmOn = !isBgmOn;
    document.getElementById('bgm-toggle').innerText = isBgmOn ? "🎵 الموسيقى: مفعلة" : "🔇 الموسيقى: متوقفة";
    if (!isBgmOn) stopBGM(); else if (currentUser) startBGM();
}

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

function checkNameInput() {
    document.getElementById('login-btn').disabled = document.getElementById('username').value.trim().length === 0;
}

function setBet(type) {
    if (type === 'all') document.getElementById('bet-amount').value = walletCoins;
}

function openHelpModal() { document.getElementById('help-modal').style.display = 'flex'; }
function closeHelpModal() { document.getElementById('help-modal').style.display = 'none'; }

function openAllBadgesModal() {
    const grid = document.getElementById('all-badges-grid');
    grid.innerHTML = '';
    ACHIEVEMENTS_LIST.forEach(ach => {
        let isUnlocked = unlockedAchievements.includes(ach.id);
        grid.innerHTML += `
            <div class="badge-card-item ${isUnlocked ? '' : 'locked'}">
                <span>${ach.icon}</span>
                <h4>${ach.title}</h4>
                <p>${ach.desc}</p>
            </div>
        `;
    });
    document.getElementById('all-badges-modal').style.display = 'flex';
}
function closeAllBadgesModal() { document.getElementById('all-badges-modal').style.display = 'none'; }

async function login() {
    startBGM();
    const username = document.getElementById('username').value.trim();
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });
    const data = await res.json();
    if (data.status === 'success') {
        currentUser = data.username;
        walletCoins = data.coins;
        currentScore = data.score;
        personalBest = data.score;
        unlockedAchievements = data.achievements || [];

        document.getElementById('wallet-coins').innerText = formatNumber(walletCoins);
        document.getElementById('best-score-val').innerText = formatNumber(personalBest);
        document.getElementById('personal-best-banner').style.display = 'block';
        document.getElementById('start-round-btn').disabled = false;
        document.getElementById('username').disabled = true;
        document.getElementById('login-btn').style.display = 'none';

        updateBadgesUI();
    }
}

function startSandbox() {
    isSandbox = true;
    startRoundCore();
}

function startRound() {
    isSandbox = false;
    betAmount = parseInt(document.getElementById('bet-amount').value);
    if (isNaN(betAmount) || betAmount < 300) return alert('الحد الأدنى للدخول 300 نقطة!');
    if (betAmount > walletCoins) return alert('رصيدك لا يكفي لهذه الجولة!');

    walletCoins -= betAmount;
    document.getElementById('wallet-coins').innerText = formatNumber(walletCoins);
    startRoundCore();
}

function startRoundCore() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    startBGM();

    clearInterval(matchInterval);
    clearInterval(puzzleInterval);

    targetScore = Math.floor(betAmount * (1.8 + Math.random() * 0.7));
    document.getElementById('target-score-val').innerText = formatNumber(targetScore);
    document.getElementById('setup-section').style.display = 'none';
    document.getElementById('game-section').style.display = 'block';
    document.getElementById('player-name-display').innerText = currentUser || 'مدرب حر';

    matchTimeLeft = 60;
    penaltyMultiplier = 3;
    winStreak = 0;
    overclockAvailable = true;
    document.getElementById('overclock-btn').disabled = false;

    updateStreakDisplay();
    startMatchTimer();
    resetPuzzleTimer();
    generateGridAndTarget();
}

function startMatchTimer() {
    clearInterval(matchInterval);
    matchInterval = setInterval(() => {
        if (isPaused) return;
        matchTimeLeft--;
        let mins = Math.floor(matchTimeLeft / 60);
        let secs = matchTimeLeft % 60;
        document.getElementById('match-timer').innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        if (matchTimeLeft <= 0) {
            triggerShake();
            triggerGlitch();
            endRound(false, "💥 انهار النظام! انتهى وقت الجولة.");
        }
    }, 1000);
}

function resetPuzzleTimer() {
    clearInterval(puzzleInterval);
    maxPuzzleTime = Math.max(2.0, 5 - (winStreak * 0.15));
    puzzleTimeLeft = maxPuzzleTime;
    document.getElementById('puzzle-timer').innerText = puzzleTimeLeft.toFixed(1);

    puzzleInterval = setInterval(() => {
        if (isPaused) return;
        puzzleTimeLeft -= 0.1;
        document.getElementById('puzzle-timer').innerText = Math.max(0, puzzleTimeLeft).toFixed(1);
        if (puzzleTimeLeft <= 0) handlePuzzleFail("انتهى وقت اللغز!");
    }, 100);
}

function triggerOverclock() {
    if (!overclockAvailable || isPaused) return;
    overclockAvailable = false;
    document.getElementById('overclock-btn').disabled = true;
    clearInterval(puzzleInterval);
    setTimeout(() => { resetPuzzleTimer(); }, 3000);
}

function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pause-modal').style.display = isPaused ? 'flex' : 'none';
}

function handlePuzzleFail(reason) {
    playSound('fail');
    triggerShake();
    triggerGlitch();
    winStreak = 0;
    updateStreakDisplay();

    if (!isSandbox) betAmount = Math.floor(betAmount * 0.85);
    matchTimeLeft = Math.max(0, matchTimeLeft - penaltyMultiplier);
    penaltyMultiplier += 2;

    updateProgressBar();
    resetPuzzleTimer();
    generateGridAndTarget();
}

function generateGridAndTarget() {
    currentTarget = allSymbols[Math.floor(Math.random() * allSymbols.length)];
    document.getElementById('target-icon').innerText = currentTarget;

    let targetPos = Math.floor(Math.random() * 9);
    const grid = document.getElementById('grid');
    if (grid.children.length !== 9) {
        grid.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const item = document.createElement('div');
            item.className = 'card-item';
            grid.appendChild(item);
        }
    }

    for (let i = 0; i < 9; i++) {
        const item = grid.children[i];
        item.className = 'card-item';
        if (i === targetPos) {
            item.innerText = currentTarget;
            item.onclick = (e) => handleClick(currentTarget, 'target', e);
        } else {
            let randomSymbol;
            do { randomSymbol = allSymbols[Math.floor(Math.random() * allSymbols.length)]; } while (randomSymbol === currentTarget);
            item.innerText = randomSymbol;
            item.onclick = (e) => handleClick(randomSymbol, 'normal', e);
        }
    }
    document.getElementById('round-score').innerText = formatNumber(betAmount);
    updateProgressBar();
}

function handleClick(symbol, type, event) {
    if (isPaused) return;
    const rect = event.target.getBoundingClientRect();
    const fxX = rect.left + rect.width / 2;
    const fxY = rect.top + rect.height / 2;

    if (symbol === currentTarget) {
        winStreak++;
        playSound('win');
        addParticles(fxX, fxY, '#00f5d4');
        betAmount = Math.floor(betAmount * (1 + (winStreak * 0.04)));
        addFloatingText(`+${formatNumber(betAmount)}`, fxX, fxY - 20, '#00f5d4');

        penaltyMultiplier = 3;
        checkAchievements();
        updateStreakDisplay();
        resetPuzzleTimer();
        generateGridAndTarget();
    } else {
        handlePuzzleFail("اختيار خاطئ!");
    }
}

function updateProgressBar() {
    let progress = Math.min(100, (betAmount / targetScore) * 100);
    document.getElementById('target-progress-fill').style.width = `${progress}%`;
}

function updateStreakDisplay() {
    let mult = (1 + (winStreak * 0.04)).toFixed(2);
    document.getElementById('streak-multiplier').innerText = `x${mult} (${winStreak} Combo)`;
}

function checkAchievements() {
    // فتح الأوسمة تلقائياً تدريجياً بناءً على الـ Combo والتقدم (بإجمالي 45 وساماً)
    for (let i = 1; i <= 45; i++) {
        if (winStreak >= (i * 2) && !unlockedAchievements.includes(`ach_${i}`)) {
            unlockedAchievements.push(`ach_${i}`);
        }
    }
    updateBadgesUI();
}

function updateBadgesUI() {
    document.getElementById('unlocked-count').innerText = unlockedAchievements.length;
    const preview = document.getElementById('badges-preview-container');
    preview.innerHTML = '';
    
    ACHIEVEMENTS_LIST.slice(0, 4).forEach(ach => {
        let unlocked = unlockedAchievements.includes(ach.id);
        preview.innerHTML += `<div class="badge-item ${unlocked ? '' : 'locked'}"><span>${ach.icon}</span><p>${ach.title}</p></div>`;
    });
}

function withdrawRound() {
    playSound('victory');
    speakSuccess(); 
    endRound(true, "🛡️ تم السحب وتشفير النقاط بنجاح!");
}

async function endRound(isWithdraw, message) {
    clearInterval(matchInterval);
    clearInterval(puzzleInterval);

    let earned = 0;
    if (isWithdraw) {
        earned = isSandbox ? 0 : betAmount;
        if (!isSandbox) {
            walletCoins += betAmount;
            currentScore = Math.max(currentScore, betAmount);
            personalBest = Math.max(personalBest, betAmount);
        }
    }

    alert(`${message}\nالأرباح المحققة: ${formatNumber(earned)}`);

    if (currentUser && !isSandbox) {
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: currentUser, 
                coins: walletCoins, 
                score: currentScore,
                achievements: unlockedAchievements
            })
        });
    }

    document.getElementById('wallet-coins').innerText = formatNumber(walletCoins);
    document.getElementById('best-score-val').innerText = formatNumber(personalBest);
    document.getElementById('setup-section').style.display = 'block';
    document.getElementById('game-section').style.display = 'none';
    
    loadLeaderboard();
}

// التحديث التلقائي الفوري للوحة الشرف كل 3 ثوانٍ
async function loadLeaderboard() {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    data.forEach(p => { 
        list.innerHTML += `<li><span>${p.username}</span><b class="neon-green">${formatNumber(p.score)}</b></li>`; 
    });
}

if (!leaderboardInterval) {
    leaderboardInterval = setInterval(loadLeaderboard, 3000);
}

loadLeaderboard();
updateBadgesUI();

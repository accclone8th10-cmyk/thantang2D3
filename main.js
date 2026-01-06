const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// --- 1. KHỞI TẠO DỮ LIỆU ---
const WORLD_SIZE = 2500;
const realms = [
    { name: "Luyện Khí", need: 100, absorb: 1.0, color: "#4facfe", atk: 20 },
    { name: "Trúc Cơ", need: 700, absorb: 2.5, color: "#00ff88", atk: 55 },
    { name: "Kim Đan", need: 3000, absorb: 5.0, color: "#f6d365", atk: 130 },
    { name: "Nguyên Anh", need: 10000, absorb: 10.0, color: "#ff4757", atk: 350 }
];

let player = {
    x: WORLD_SIZE / 2, y: WORLD_SIZE / 2,
    size: 45, speed: 320,
    linhKhi: 0, realm: 0,
    hp: 100, maxHp: 100,
    lastShot: 0, shootDelay: 200, // Tốc độ đánh
    mode: "BE_QUAN"
};

let mobs = [];
let bullets = [];
const keys = {};

// Load ảnh (Nếu kh có ảnh sẽ vẽ khối màu thay thế)
const imgMap = new Image(); imgMap.src = 'the-gioi.jpg';

// --- 2. HỆ THỐNG ĐIỀU KHIỂN ---
window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    if (e.code === "Space") tryBreakthrough();
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// Chuyển chế độ
function switchMode(mode) {
    player.mode = mode;
    document.getElementById('tab-be-quan').classList.toggle('active', mode === 'BE_QUAN');
    document.getElementById('tab-hanh-tau').classList.toggle('active', mode === 'HANH_TAU');
    document.getElementById('display-state').innerText = (mode === 'BE_QUAN' ? "Đang tọa thiền" : "Đang hành tẩu");
    
    if (mode === "HANH_TAU") {
        spawnMobs(15);
    } else {
        mobs = []; // Xóa quái khi bế quan cho nhẹ
    }
}

// Bắn vệt sáng
canvas.addEventListener("mousedown", (e) => {
    const now = Date.now();
    if (player.mode === "HANH_TAU" && now - player.lastShot > player.shootDelay) {
        // Tính toán tọa độ chuột so với camera
        const camX = Math.max(0, Math.min(player.x - canvas.width/2, WORLD_SIZE - canvas.width));
        const camY = Math.max(0, Math.min(player.y - canvas.height/2, WORLD_SIZE - canvas.height));
        const targetX = e.clientX + camX;
        const targetY = e.clientY + camY;

        const angle = Math.atan2(targetY - player.y, targetX - player.x);
        bullets.push({
            x: player.x, y: player.y,
            vx: Math.cos(angle) * 900, vy: Math.sin(angle) * 900,
            life: 60, color: realms[player.realm].color
        });
        player.lastShot = now;
    }
});

// --- 3. LOGIC XỬ LÝ ---
function spawnMobs(count) {
    mobs = [];
    for(let i=0; i<count; i++) {
        mobs.push({
            x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE,
            hp: 40 + player.realm * 100, maxHp: 40 + player.realm * 100,
            size: 30, speed: 70 + Math.random() * 60
        });
    }
}

function update(dt) {
    // Di chuyển & Giới hạn biên map
    if (player.mode === "HANH_TAU") {
        let dx = 0, dy = 0;
        if (keys["w"]) dy--; if (keys["s"]) dy++;
        if (keys["a"]) dx--; if (keys["d"]) dx++;
        if (dx !== 0 || dy !== 0) {
            const mag = Math.hypot(dx, dy);
            player.x = Math.max(0, Math.min(WORLD_SIZE, player.x + (dx/mag) * player.speed * dt));
            player.y = Math.max(0, Math.min(WORLD_SIZE, player.y + (dy/mag) * player.speed * dt));
        }
    }

    // Xử lý đạn (Vệt sáng)
    bullets.forEach((b, i) => {
        b.x += b.vx * dt; b.y += b.vy * dt; b.life--;
        if (b.life <= 0) bullets.splice(i, 1);

        // Va chạm quái
        mobs.forEach((m, mi) => {
            if (Math.hypot(b.x - m.x, b.y - m.y) < m.size + 10) {
                m.hp -= realms[player.realm].atk;
                bullets.splice(i, 1);
                if (m.hp <= 0) {
                    mobs.splice(mi, 1);
                    player.linhKhi += 25; 
                    setTimeout(() => { if(player.mode === "HANH_TAU") spawnMobs(mobs.length + 1); }, 2000);
                }
            }
        });
    });

    // Linh khí & Hồi phục
    const currentRealm = realms[player.realm];
    let gain = currentRealm.absorb * (player.mode === "BE_QUAN" ? 15 : 1.5);
    player.linhKhi += gain * dt;
    
    if (player.mode === "BE_QUAN" && player.hp < player.maxHp) player.hp += 8 * dt;

    // Cập nhật UI
    updateUI(gain, currentRealm);
}

function updateUI(gain, realm) {
    document.getElementById("display-realm").innerText = realm.name;
    document.getElementById("progress-bar").style.width = Math.min(100, (player.linhKhi / realm.need) * 100) + "%";
    document.getElementById("hp-bar").style.width = (player.hp / player.maxHp) * 100 + "%";
    document.getElementById("speed-tag").innerText = `Tốc độ nạp: +${gain.toFixed(1)}/s`;
}

function tryBreakthrough() {
    const need = realms[player.realm].need;
    if (player.linhKhi >= need) {
        player.linhKhi = 0;
        player.realm = Math.min(player.realm + 1, realms.length - 1);
        player.maxHp += 150;
        player.hp = player.maxHp;
        // Hiệu ứng flash
        canvas.style.filter = "brightness(3)";
        setTimeout(() => canvas.style.filter = "brightness(1)", 150);
    }
}

// --- 4. HỆ THỐNG VẼ (RENDER) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Camera
    if (player.mode === "HANH_TAU") {
        const camX = Math.max(0, Math.min(player.x - canvas.width/2, WORLD_SIZE - canvas.width));
        const camY = Math.max(0, Math.min(player.y - canvas.height/2, WORLD_SIZE - canvas.height));
        ctx.translate(-camX, -camY);

        // Vẽ Map
        if (imgMap.complete) ctx.drawImage(imgMap, 0, 0, WORLD_SIZE, WORLD_SIZE);
        else { ctx.fillStyle = "#0d1117"; ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE); }

        // Vẽ Quái
        mobs.forEach(m => {
            ctx.fillStyle = "rgba(255, 71, 87, 0.7)";
            ctx.beginPath(); ctx.arc(m.x, m.y, m.size, 0, Math.PI*2); ctx.fill();
            // Thanh máu quái nhỏ
            ctx.fillStyle = "#444"; ctx.fillRect(m.x - 20, m.y - 40, 40, 4);
            ctx.fillStyle = "#ff4757"; ctx.fillRect(m.x - 20, m.y - 40, (m.hp/m.maxHp)*40, 4);
        });
    } else {
        // Nền bế quan
        ctx.fillStyle = "#010409"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Trận pháp xoay
        ctx.strokeStyle = realms[player.realm].color; ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.arc(canvas.width/2, canvas.height/2, 100 + Math.sin(Date.now()/300)*10, 0, Math.PI*2); 
        ctx.stroke();
    }

    // Vẽ Đạn
    bullets.forEach(b => {
        ctx.shadowBlur = 15; ctx.shadowColor = b.color;
        ctx.strokeStyle = "white"; ctx.lineWidth = 4; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx*0.06, b.y - b.vy*0.06); ctx.stroke();
        ctx.shadowBlur = 0;
    });

    // Vẽ Nhân vật (Hình vuông đại diện)
    ctx.shadowBlur = 20; ctx.shadowColor = realms[player.realm].color;
    ctx.fillStyle = "white";
    const pSize = 40;
    if (player.mode === "BE_QUAN") {
        ctx.fillRect(canvas.width/2 - pSize/2, canvas.height/2 - pSize/2, pSize, pSize);
    } else {
        ctx.fillRect(player.x - pSize/2, player.y - pSize/2, pSize, pSize);
    }

    ctx.restore();
    requestAnimationFrame(draw);
}

// Chạy Game
window.addEventListener("resize", () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
switchMode("BE_QUAN");
setInterval(() => update(1/60), 1000/60);
draw();

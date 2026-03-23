(function () {
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const moneyText = document.getElementById("moneyText");
    const fuelText = document.getElementById("fuelText");
    const depthText = document.getElementById("depthText");
    const machineText = document.getElementById("machineText");
    const capText = document.getElementById("capText");
    const bestOreText = document.getElementById("bestOreText");
    const healthText = document.getElementById("healthText");
    const excavatorBtn = document.getElementById("excavatorBtn");
    const serviceBtn = document.getElementById("serviceBtn");
    const rescueBtn = document.getElementById("rescueBtn");

    const GRID_W = 46;
    const GRID_H = 265;
    const CELL = 28;
    const VIEW_COLS = 16;
    const VIEW_ROWS = 11;
    const SURFACE_ROW = 3;

    const MACHINES = [
        { name: "ZX17", price: 0, maxDepth: 16, fuelMax: 110, moveSpeed: 1.0, digRadius: 0.68, oreBoost: 1.0, fuelBurn: 1.08, size: 0.82, minOreTier: 0 },
        { name: "ZX26U", price: 350, maxDepth: 28, fuelMax: 130, moveSpeed: 1.08, digRadius: 0.82, oreBoost: 1.05, fuelBurn: 1.03, size: 0.9, minOreTier: 0 },
        { name: "ZX85USB", price: 800, maxDepth: 42, fuelMax: 170, moveSpeed: 1.15, digRadius: 0.98, oreBoost: 1.12, fuelBurn: 0.98, size: 1.0, minOreTier: 2 },
        { name: "ZX135US", price: 1450, maxDepth: 60, fuelMax: 220, moveSpeed: 1.23, digRadius: 1.08, oreBoost: 1.2, fuelBurn: 0.95, size: 1.08, minOreTier: 3 },
        { name: "ZX350LC", price: 2500, maxDepth: 83, fuelMax: 280, moveSpeed: 1.32, digRadius: 1.24, oreBoost: 1.34, fuelBurn: 0.9, size: 1.18, minOreTier: 4 },
        { name: "ZX490LC", price: 4100, maxDepth: 108, fuelMax: 350, moveSpeed: 1.42, digRadius: 1.4, oreBoost: 1.5, fuelBurn: 0.85, size: 1.3, minOreTier: 5 },
        { name: "ZX890LCH", price: 6500, maxDepth: 145, fuelMax: 440, moveSpeed: 1.55, digRadius: 1.65, oreBoost: 1.72, fuelBurn: 0.8, size: 1.45, minOreTier: 6 }
    ];

    const ORES = [
        { id: "dirt", label: "Dirt", color: "#6e5c49", value: 0, minDepth: 0, tier: 0, weight: 0.46 },
        { id: "coal", label: "Coal", color: "#3a404a", value: 10, minDepth: 5, tier: 0, weight: 0.2 },
        { id: "copper", label: "Copper", color: "#b76f3e", value: 20, minDepth: 9, tier: 0, weight: 0.15 },
        { id: "iron", label: "Iron", color: "#8a93a0", value: 34, minDepth: 18, tier: 2, weight: 0.11 },
        { id: "silver", label: "Silver", color: "#d0d5dd", value: 58, minDepth: 30, tier: 3, weight: 0.07 },
        { id: "gold", label: "Gold", color: "#efbf41", value: 95, minDepth: 45, tier: 4, weight: 0.045 },
        { id: "emerald", label: "Emerald", color: "#2ac789", value: 165, minDepth: 64, tier: 5, weight: 0.03 },
        { id: "diamond", label: "Diamond", color: "#58d7ff", value: 275, minDepth: 84, tier: 6, weight: 0.02 }
    ];

    const HAZARDS = {
        power_line: { label: "Power Line", color: "#ffd84a", damage: 22, fuel: 14, notice: "Power line strike" },
        utility_water: { label: "Water Line", color: "#5db5ff", damage: 8, fuel: 18, notice: "Hit a water line" },
        water_pocket: { label: "Water Pocket", color: "#3f8fd4", damage: 10, fuel: 10, notice: "Water pocket burst" },
        lava_pocket: { label: "Lava Pocket", color: "#ff5a2e", damage: 32, fuel: 5, notice: "Lava pocket erupted" }
    };

    const game = {
        world: [],
        oreStats: {},
        hazardHits: {},
        player: {
            x: Math.floor(GRID_W / 2),
            y: SURFACE_ROW - 1,
            moveCooldown: 0,
            fallCooldown: 0,
            fallDistance: 0
        },
        machineTier: 0,
        money: 0,
        fuel: MACHINES[0].fuelMax,
        health: 100,
        maxDepth: 0,
        bestOreId: null,
        particles: [],
        swingT: 0,
        notice: { text: "", timer: 0 }
    };

    const keys = new Set();
    let rafId = 0;
    let lastTime = performance.now();

    const machine = function () { return MACHINES[game.machineTier]; };
    const nextMachine = function () { return MACHINES[game.machineTier + 1] || null; };
    const oreById = function (id) { return ORES.find((ore) => ore.id === id) || ORES[0]; };
    const canMove = function (x, y) { return x >= 0 && y >= 0 && x < GRID_W && y < GRID_H; };
    const title = function (txt) { return txt ? txt[0].toUpperCase() + txt.slice(1) : ""; };

    function setNotice(text, sec) {
        game.notice.text = text;
        game.notice.timer = sec || 1.4;
    }

    function damagePlayer(amount, reason) {
        game.health = Math.max(0, game.health - amount);
        setNotice(reason + " (-" + amount + " HP)", 1.6);
        if (game.health <= 0) {
            game.money = Math.max(0, game.money - 120);
            game.player.x = Math.floor(GRID_W / 2);
            game.player.y = SURFACE_ROW - 1;
            game.player.fallDistance = 0;
            game.fuel = machine().fuelMax;
            game.health = 100;
            setNotice("Machine down. Recovered at surface.", 2);
        }
    }

    function canMineOre(ore) {
        return machine().minOreTier >= ore.tier;
    }

    function chooseOre(depth) {
        const active = ORES.filter((ore) => depth >= ore.minDepth).map((ore) => ({
            ore,
            w: ore.weight + Math.max(0, depth - ore.minDepth) * 0.0007
        }));
        const sum = active.reduce((acc, item) => acc + item.w, 0);
        const pick = Math.random() * sum;
        let total = 0;
        for (let i = 0; i < active.length; i += 1) {
            total += active[i].w;
            if (pick <= total) return active[i].ore.id;
        }
        return "dirt";
    }

    function chooseCellType(depth) {
        const shallow = depth <= SURFACE_ROW + 6;
        if (shallow && Math.random() < 0.032) return "power_line";
        if (shallow && Math.random() < 0.038) return "utility_water";
        if (depth > SURFACE_ROW + 10 && Math.random() < 0.013) return "water_pocket";
        if (depth > SURFACE_ROW + 34 && Math.random() < 0.009) return "lava_pocket";
        return chooseOre(depth);
    }

    function makeWorld() {
        game.world = [];
        for (let y = 0; y < GRID_H; y += 1) {
            const row = [];
            for (let x = 0; x < GRID_W; x += 1) {
                if (y < SURFACE_ROW) {
                    row.push({ type: "air", dug: true, seed: Math.random() });
                } else {
                    row.push({ type: chooseCellType(y), dug: false, seed: Math.random() });
                }
            }
            game.world.push(row);
        }
        game.world[SURFACE_ROW - 1][game.player.x] = { type: "air", dug: true, seed: Math.random() };
    }

    function spawnParticles(x, y, color, count) {
        const amount = count || 8;
        for (let i = 0; i < amount; i += 1) {
            game.particles.push({
                x: x * CELL + CELL * 0.5,
                y: y * CELL + CELL * 0.5,
                vx: (Math.random() - 0.5) * 85,
                vy: -35 - Math.random() * 85,
                life: 0.35 + Math.random() * 0.5,
                color
            });
        }
    }

    function triggerHazard(type, x, y) {
        const hz = HAZARDS[type];
        if (!hz) return;
        game.hazardHits[type] = (game.hazardHits[type] || 0) + 1;
        game.fuel = Math.max(0, game.fuel - hz.fuel);
        damagePlayer(hz.damage, hz.notice);
        spawnParticles(x, y, hz.color, 14);
    }

    function mineAround(nx, ny) {
        const m = machine();
        const radius = m.digRadius;
        let minedCells = 0;
        let lockedTouches = 0;
        for (let y = Math.floor(ny - radius - 1); y <= Math.ceil(ny + radius + 1); y += 1) {
            for (let x = Math.floor(nx - radius - 1); x <= Math.ceil(nx + radius + 1); x += 1) {
                if (!canMove(x, y) || y < SURFACE_ROW) continue;
                const cell = game.world[y][x];
                if (cell.dug) continue;
                const dist = Math.hypot(x - nx, y - ny) + (cell.seed - 0.5) * 0.3;
                if (dist > radius) continue;

                if (HAZARDS[cell.type]) {
                    cell.dug = true;
                    triggerHazard(cell.type, x, y);
                    minedCells += 1;
                    continue;
                }

                const ore = oreById(cell.type);
                if (!canMineOre(ore) && ore.id !== "dirt") {
                    lockedTouches += 1;
                    continue;
                }

                cell.dug = true;
                if (ore.value > 0) {
                    game.money += Math.round(ore.value * m.oreBoost);
                    game.oreStats[ore.id] = (game.oreStats[ore.id] || 0) + 1;
                    if (!game.bestOreId || ore.value > oreById(game.bestOreId).value) game.bestOreId = ore.id;
                }
                spawnParticles(x, y, ore.color);
                minedCells += 1;
            }
        }
        return { minedCells, lockedTouches };
    }

    function tryCollapse() {
        const depth = Math.max(0, game.player.y - SURFACE_ROW);
        if (depth === 0) return;
        const chance = depth < 12 ? 0.045 : 0.018;
        if (Math.random() > chance) return;
        const damage = 6 + Math.floor(Math.random() * 12);
        damagePlayer(damage, "Dirt collapse");
        spawnParticles(game.player.x, game.player.y - 1, "#8f6f4f", 18);
    }

    function applyGravity(dt) {
        game.player.fallCooldown -= dt;
        if (game.player.fallCooldown > 0) return;
        const belowY = game.player.y + 1;
        if (!canMove(game.player.x, belowY)) {
            if (game.player.fallDistance > 2) damagePlayer((game.player.fallDistance - 2) * 6, "Fall damage");
            game.player.fallDistance = 0;
            return;
        }
        const below = game.world[belowY][game.player.x];
        if (below && below.dug && belowY >= SURFACE_ROW) {
            game.player.y = belowY;
            game.player.fallDistance += 1;
            game.player.fallCooldown = 0.085;
            game.fuel = Math.max(0, game.fuel - 0.3);
            game.maxDepth = Math.max(game.maxDepth, Math.max(0, game.player.y - SURFACE_ROW));
            return;
        }
        if (game.player.fallDistance > 2) damagePlayer((game.player.fallDistance - 2) * 6, "Fall damage");
        game.player.fallDistance = 0;
    }

    function movePlayer(dx, dy) {
        const m = machine();
        if (game.fuel <= 0 && game.player.y >= SURFACE_ROW) {
            setNotice("Out of fuel. Service or rescue.", 1.5);
            return;
        }
        const nx = game.player.x + dx;
        const ny = game.player.y + dy;
        if (!canMove(nx, ny)) return;

        const depth = Math.max(0, ny - SURFACE_ROW);
        if (depth > m.maxDepth) {
            setNotice(m.name + " depth limit reached.", 1.4);
            return;
        }

        if (ny >= SURFACE_ROW) {
            const frontCell = game.world[ny][nx];
            if (frontCell && !frontCell.dug && !HAZARDS[frontCell.type]) {
                const ore = oreById(frontCell.type);
                if (!canMineOre(ore) && ore.id !== "dirt") {
                    setNotice(ore.label + " is too hard for " + m.name + ".", 1.5);
                    return;
                }
            }
            const mined = mineAround(nx, ny);
            if (mined.lockedTouches > 0 && mined.minedCells === 0) setNotice("Need a larger excavator for this ore.", 1.4);
            if (!game.world[ny][nx].dug) return;
            game.fuel = Math.max(0, game.fuel - (m.fuelBurn + mined.minedCells * 0.13));
            tryCollapse();
        } else {
            game.fuel = m.fuelMax;
        }

        game.player.x = nx;
        game.player.y = ny;
        game.player.fallDistance = 0;
        game.maxDepth = Math.max(game.maxDepth, depth);
        game.swingT += 0.32;
    }

    function updateButtons() {
        const m = machine();
        const next = nextMachine();
        if (next) {
            excavatorBtn.textContent = "Upgrade to " + next.name + " ($" + next.price + ")";
            excavatorBtn.disabled = game.money < next.price;
        } else {
            excavatorBtn.textContent = "Max Excavator Reached (" + m.name + ")";
            excavatorBtn.disabled = true;
        }
        serviceBtn.disabled = game.money < 60 && game.fuel >= m.fuelMax && game.health >= 100;
    }

    function updateHud() {
        const m = machine();
        moneyText.textContent = "$" + game.money.toLocaleString();
        fuelText.textContent = Math.round(game.fuel) + " / " + m.fuelMax;
        depthText.textContent = Math.max(0, game.player.y - SURFACE_ROW) + "m";
        machineText.textContent = m.name;
        capText.textContent = m.maxDepth + "m";
        bestOreText.textContent = game.bestOreId ? title(game.bestOreId) : "None";
        if (healthText) healthText.textContent = game.health + "%";
        updateButtons();
    }

    function update(dt) {
        const m = machine();
        const moveDelay = Math.max(0.08, 0.22 - m.moveSpeed * 0.07);
        game.player.moveCooldown -= dt;
        game.notice.timer = Math.max(0, game.notice.timer - dt);

        if (game.player.moveCooldown <= 0) {
            if (keys.has("arrowleft") || keys.has("a")) { movePlayer(-1, 0); game.player.moveCooldown = moveDelay; }
            else if (keys.has("arrowright") || keys.has("d")) { movePlayer(1, 0); game.player.moveCooldown = moveDelay; }
            else if (keys.has("arrowdown") || keys.has("s")) { movePlayer(0, 1); game.player.moveCooldown = moveDelay; }
            else if (keys.has("arrowup") || keys.has("w")) { movePlayer(0, -1); game.player.moveCooldown = moveDelay; }
        }

        applyGravity(dt);

        for (let i = game.particles.length - 1; i >= 0; i -= 1) {
            const p = game.particles[i];
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 165 * dt;
            if (p.life <= 0) game.particles.splice(i, 1);
        }
        updateHud();
    }

    function hexToRgba(hex, alpha) {
        const n = parseInt(hex.replace("#", ""), 16);
        const r = (n >> 16) & 255;
        const g = (n >> 8) & 255;
        const b = n & 255;
        return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
    }

    function brighten(hex, amt) {
        const n = parseInt(hex.replace("#", ""), 16);
        const cap = function (v) { return Math.max(0, Math.min(255, v)); };
        const r = cap(((n >> 16) & 255) + amt);
        const g = cap(((n >> 8) & 255) + amt);
        const b = cap((n & 255) + amt);
        return "rgb(" + r + "," + g + "," + b + ")";
    }

    function drawSky() {
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, "#9ad9ff");
        grad.addColorStop(0.35, "#68b5ea");
        grad.addColorStop(1, "#25435d");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#5cae52";
        ctx.fillRect(0, canvas.height * 0.2, canvas.width, canvas.height * 0.035);
    }

    function drawVoxelBlock(x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = brighten(color, 24);
        ctx.fillRect(x + 1, y + 1, w - 2, h * 0.22);
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(x, y + h * 0.76, w, h * 0.24);
        ctx.strokeStyle = "rgba(0,0,0,0.18)";
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    function drawCellContent(x, y, w, h, cell) {
        const hz = HAZARDS[cell.type];
        if (hz) {
            drawVoxelBlock(x, y, w, h, hz.color);
            ctx.strokeStyle = "rgba(18,22,28,0.85)";
            ctx.lineWidth = Math.max(1, w * 0.05);
            if (cell.type === "power_line") {
                ctx.beginPath();
                ctx.moveTo(x + w * 0.2, y + h * 0.72);
                ctx.lineTo(x + w * 0.45, y + h * 0.25);
                ctx.lineTo(x + w * 0.35, y + h * 0.25);
                ctx.lineTo(x + w * 0.65, y + h * 0.12);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(x + w * 0.52, y + h * 0.52, Math.min(w, h) * 0.2, 0, Math.PI * 2);
                ctx.stroke();
            }
            return;
        }
        const ore = oreById(cell.type);
        drawVoxelBlock(x, y, w, h, ore.color);
        if (!canMineOre(ore) && ore.id !== "dirt") {
            ctx.fillStyle = "rgba(9,13,20,0.55)";
            ctx.fillRect(x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.6);
            ctx.strokeStyle = "rgba(255,102,0,0.85)";
            ctx.lineWidth = Math.max(1, w * 0.04);
            ctx.strokeRect(x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.6);
        }
    }

    function drawExcavator(px, py) {
        const m = machine();
        const scale = m.size * 0.85;
        const swing = Math.sin(game.swingT) * 0.34;
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(scale, scale);

        ctx.fillStyle = "#242b38";
        ctx.beginPath();
        ctx.roundRect(-33, 12, 66, 14, 8);
        ctx.fill();
        ctx.fillStyle = "#111722";
        for (let i = -24; i <= 24; i += 12) {
            ctx.beginPath();
            ctx.arc(i, 19, 3.6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = "#ff6600";
        ctx.strokeStyle = "#a84300";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(-18, -10, 36, 20, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#e2efff";
        ctx.beginPath();
        ctx.roundRect(-4, -8, 11, 9, 2);
        ctx.fill();

        ctx.strokeStyle = "#ff7a1f";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(13, -6);
        ctx.lineTo(30, -5 + swing * 4);
        ctx.lineTo(38, 7 + swing * 7);
        ctx.stroke();

        ctx.strokeStyle = "#db5a00";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(27, -2 + swing * 2);
        ctx.lineTo(43, 4 + swing * 6);
        ctx.stroke();

        ctx.fillStyle = "#be4b00";
        ctx.beginPath();
        ctx.moveTo(40, 4 + swing * 6);
        ctx.lineTo(51, 8 + swing * 7);
        ctx.lineTo(40, 16 + swing * 8);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#1a202b";
        ctx.font = "700 7px Segoe UI";
        ctx.fillText(m.name, -15, 1);
        ctx.restore();
    }

    function drawNotice() {
        if (game.notice.timer <= 0 || !game.notice.text) return;
        const alpha = Math.min(1, game.notice.timer);
        const w = canvas.width * 0.58;
        const h = 36;
        const x = (canvas.width - w) / 2;
        const y = 14;
        ctx.fillStyle = "rgba(7,12,19," + (0.55 * alpha) + ")";
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 11);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,102,0," + (0.8 * alpha) + ")";
        ctx.stroke();
        ctx.fillStyle = "rgba(255,245,235," + alpha + ")";
        ctx.textAlign = "center";
        ctx.font = "700 15px Segoe UI";
        ctx.fillText(game.notice.text, x + w / 2, y + 23);
    }

    function render() {
        const tileW = canvas.width / VIEW_COLS;
        const tileH = canvas.height / VIEW_ROWS;
        const camX = Math.max(0, Math.min(GRID_W - VIEW_COLS, game.player.x - Math.floor(VIEW_COLS / 2)));
        const camY = Math.max(0, Math.min(GRID_H - VIEW_ROWS, game.player.y - Math.floor(VIEW_ROWS / 2)));
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawSky();

        for (let vy = 0; vy < VIEW_ROWS; vy += 1) {
            for (let vx = 0; vx < VIEW_COLS; vx += 1) {
                const wx = camX + vx;
                const wy = camY + vy;
                const x = vx * tileW;
                const y = vy * tileH;
                if (wy < SURFACE_ROW) continue;
                const cell = game.world[wy][wx];
                if (cell.dug) {
                    ctx.fillStyle = "#111722";
                    ctx.fillRect(x, y, tileW, tileH);
                    ctx.fillStyle = "rgba(255,255,255,0.03)";
                    ctx.fillRect(x, y, tileW, tileH * 0.2);
                    continue;
                }
                drawCellContent(x, y, tileW, tileH, cell);
            }
        }

        const px = (game.player.x - camX + 0.5) * tileW;
        const py = (game.player.y - camY + 0.5) * tileH;
        drawExcavator(px, py);

        game.particles.forEach((p) => {
            const sx = (p.x / CELL - camX) * tileW;
            const sy = (p.y / CELL - camY) * tileH;
            ctx.fillStyle = hexToRgba(p.color, Math.max(0, p.life).toFixed(2));
            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(2, tileW * 0.07), 0, Math.PI * 2);
            ctx.fill();
        });

        if (game.fuel <= 0 && game.player.y >= SURFACE_ROW) {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.font = "700 25px Segoe UI";
            ctx.fillText("No fuel. Service or rescue to continue.", canvas.width / 2, canvas.height * 0.52);
        }
        drawNotice();
    }

    function stepFrame(now) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        update(dt);
        render();
        rafId = requestAnimationFrame(stepFrame);
    }

    function advanceTime(ms) {
        const frame = 1000 / 60;
        const loops = Math.max(1, Math.round(ms / frame));
        for (let i = 0; i < loops; i += 1) update(1 / 60);
        render();
    }

    function renderGameToText() {
        const m = machine();
        const topOre = Object.entries(game.oreStats).sort((a, b) => b[1] - a[1])[0];
        return JSON.stringify({
            mode: "play",
            coordinateSystem: "grid origin top-left; x right+, y down+",
            machine: { name: m.name, tier: game.machineTier, maxDepth: m.maxDepth, minOreTier: m.minOreTier },
            player: { x: game.player.x, y: game.player.y, health: game.health },
            fuel: { current: Math.round(game.fuel), max: m.fuelMax },
            hazards: game.hazardHits,
            economy: { money: game.money },
            progress: {
                depthMeters: Math.max(0, game.player.y - SURFACE_ROW),
                maxDepthMeters: game.maxDepth,
                bestOre: game.bestOreId || "none",
                mostMined: topOre ? { ore: topOre[0], count: topOre[1] } : null
            },
            nextMachine: nextMachine() ? { name: nextMachine().name, price: nextMachine().price } : null
        });
    }

    function setupInput() {
        window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
        window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
        document.querySelectorAll(".pad-btn").forEach((btn) => {
            const act = btn.dataset.act;
            const map = { left: "arrowleft", right: "arrowright", up: "arrowup", down: "arrowdown" };
            const key = map[act];
            if (!key) return;
            const on = function () { keys.add(key); };
            const off = function () { keys.delete(key); };
            btn.addEventListener("touchstart", function (event) { event.preventDefault(); on(); }, { passive: false });
            btn.addEventListener("touchend", function (event) { event.preventDefault(); off(); }, { passive: false });
            btn.addEventListener("mousedown", on);
            btn.addEventListener("mouseup", off);
            btn.addEventListener("mouseleave", off);
        });
    }

    function setupButtons() {
        excavatorBtn.addEventListener("click", function () {
            const next = nextMachine();
            if (!next) return;
            if (game.money < next.price) {
                setNotice("Need $" + next.price + " for " + next.name + ".", 1.5);
                return;
            }
            game.money -= next.price;
            game.machineTier += 1;
            game.fuel = machine().fuelMax;
            setNotice("Upgraded to " + machine().name + ".", 1.6);
        });

        serviceBtn.addEventListener("click", function () {
            const m = machine();
            if (game.fuel >= m.fuelMax && game.health >= 100) { setNotice("Machine already stable.", 1.1); return; }
            if (game.money < 60) { setNotice("Need $60 for service.", 1.1); return; }
            game.money -= 60;
            game.fuel = m.fuelMax;
            game.health = Math.min(100, game.health + 20);
            setNotice("Service complete. Fuel and health improved.", 1.4);
        });

        rescueBtn.addEventListener("click", function () {
            game.money = Math.max(0, game.money - 80);
            game.player.x = Math.floor(GRID_W / 2);
            game.player.y = SURFACE_ROW - 1;
            game.player.fallDistance = 0;
            game.fuel = machine().fuelMax;
            setNotice("Rescued to surface.", 1.2);
        });
    }

    function resizeCanvas() {
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(320, rect.width);
        const height = Math.max(180, rect.height);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function init() {
        makeWorld();
        setupInput();
        setupButtons();
        resizeCanvas();
        updateHud();
        window.addEventListener("resize", resizeCanvas);
        window.advanceTime = advanceTime;
        window.render_game_to_text = renderGameToText;
        cancelAnimationFrame(rafId);
        lastTime = performance.now();
        rafId = requestAnimationFrame(stepFrame);
    }

    init();
})();

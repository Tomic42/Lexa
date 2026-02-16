 // Globalne promenljive
window.isMusicOn = true;
window.currentUser = localStorage.getItem('hoop_username') || null;

// --- LEADERBOARD LOGIKA ---
function getLeaderboard() {
    let data = JSON.parse(localStorage.getItem('hoop_leaderboard'));
    if (!data || (data.length > 0 && data[0].score > 6000)) {
        data = [];
        const botNames = ["Peasant", "Goblin", "Rat", "Wolf", "Bandit", "Guard", "Squire", "Novice", "Rookie", "Scout"];
        for (let i = 0; i < 50; i++) { 
            let name = botNames[Math.floor(Math.random() * botNames.length)] + Math.floor(Math.random() * 999);
            let score = Math.floor(Math.random() * 500); 
            data.push({ name: name, score: score });
        }
        data.sort((a, b) => b.score - a.score);
        localStorage.setItem('hoop_leaderboard', JSON.stringify(data));
    }
    return data;
}

function savePlayerScore(score) {
    if (!window.currentUser) return;
    let board = getLeaderboard();
    let playerIndex = board.findIndex(p => p.name === window.currentUser);
    
    if (playerIndex !== -1) {
        if (score > board[playerIndex].score) { board[playerIndex].score = score; }
    } else {
        board.push({ name: window.currentUser, score: score });
    }

    board.sort((a, b) => b.score - a.score);
    if (board.length > 1000) board = board.slice(0, 1000);
    localStorage.setItem('hoop_leaderboard', JSON.stringify(board));
}

// --- 1. BOOT SCENE (TELEGRAM AUTO-LOGIN) ---
class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }
    preload() { this.load.image('logo', 'assets/tower_rapid.webp'); }
    
    create() {
        this.add.text(400, 300, "HOOP DYNASTY\nConnecting...", { fontSize: '20px', fill: '#fff', align: 'center' }).setOrigin(0.5);
        
        this.time.delayedCall(500, () => {
            // 1. Provera da li smo na Telegramu
            const tg = window.Telegram?.WebApp;
            
            if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
                // TELEGRAM DETKTOVAN!
                tg.ready(); // Javljamo Telegramu da je aplikacija spremna
                tg.expand(); // Širimo aplikaciju na ceo ekran
                
                // Uzimamo ime sa Telegrama
                let tgUser = tg.initDataUnsafe.user;
                // Koristimo username ako postoji, inace first_name
                let finalName = tgUser.username || tgUser.first_name;
                
                window.currentUser = finalName;
                localStorage.setItem('hoop_username', finalName);
                
                // Osiguramo da je igrač u bazi
                savePlayerScore(0);
                
                this.scene.start('MainMenuScene');
            } else {
                // NISMO NA TELEGRAMU (Browser testiranje)
                if (window.currentUser) { 
                    this.scene.start('MainMenuScene'); 
                } else { 
                    this.scene.start('LoginScene'); 
                }
            }
        });
    }
}

// --- 2. LOGIN SCENE (FALLBACK ZA BROWSER) ---
class LoginScene extends Phaser.Scene {
    constructor() { super('LoginScene'); }
    create() {
        this.add.text(400, 200, "WELCOME WARRIOR", { fontSize: '32px', fill: '#FFD700', fontWeight: 'bold' }).setOrigin(0.5);
        this.add.text(400, 300, "Enter your name to begin:", { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

        let btn = this.add.graphics().fillStyle(0x00ff00, 1).fillRoundedRect(300, 350, 200, 50, 10);
        this.add.text(400, 375, "ENTER NAME", { fontSize: '20px', fill: '#000', fontWeight: 'bold' }).setOrigin(0.5);
        
        this.add.zone(400, 375, 200, 50).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.handleLogin());
    }

    handleLogin() {
        let name = "";
        let valid = false;
        let board = getLeaderboard();

        while (!valid) {
            name = prompt("Username (3-12 chars):");
            if (!name) return;
            name = name.trim();
            if (name.length < 3 || name.length > 12) { alert("Invalid length."); continue; }
            let exists = board.some(p => p.name.toLowerCase() === name.toLowerCase());
            if (exists) { alert("Username taken."); } else { valid = true; }
        }

        window.currentUser = name;
        localStorage.setItem('hoop_username', name);
        savePlayerScore(0);
        this.scene.start('MainMenuScene');
    }
}

// --- 3. LEADERBOARD SCENE ---
class LeaderboardScene extends Phaser.Scene {
    constructor() { super('LeaderboardScene'); }
    create() {
        this.add.graphics().fillStyle(0x1a1a1a, 1).fillRect(0, 0, 800, 600);
        this.add.text(400, 50, "GLOBAL RANKING", { fontSize: '32px', fill: '#FFD700', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);

        let board = getLeaderboard();
        let myRank = board.findIndex(p => p.name === window.currentUser) + 1;

        let startY = 120;
        this.add.text(200, startY, "RANK", { fontSize: '20px', fill: '#00ffff' });
        this.add.text(350, startY, "PLAYER", { fontSize: '20px', fill: '#00ffff' });
        this.add.text(550, startY, "SCORE", { fontSize: '20px', fill: '#00ffff' });

        for (let i = 0; i < 10; i++) {
            if (i >= board.length) break;
            let player = board[i];
            let color = (player.name === window.currentUser) ? '#00ff00' : '#ffffff';
            this.add.text(200, startY + 30 + (i * 30), `#${i + 1}`, { fontSize: '18px', fill: color });
            this.add.text(350, startY + 30 + (i * 30), player.name, { fontSize: '18px', fill: color });
            this.add.text(550, startY + 30 + (i * 30), player.score, { fontSize: '18px', fill: '#FFD700' });
        }

        if (myRank > 0) {
            this.add.graphics().lineStyle(2, 0x00ff00).strokeRect(150, 480, 500, 50);
            this.add.text(400, 505, `YOUR RANK: #${myRank}   |   SCORE: ${board[myRank-1].score}`, { fontSize: '22px', fill: '#00ff00' }).setOrigin(0.5);
        }

        this.add.text(400, 560, "🔙 BACK TO MENU", { fontSize: '24px', fill: '#fff', backgroundColor: '#333', padding: 10 })
            .setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('MainMenuScene'));
    }
}

// --- 4. MAIN MENU SCENE ---
class MainMenuScene extends Phaser.Scene {
    constructor() { super('MainMenuScene'); }
    
    preload() {
        this.load.image('map_bg', 'assets/map_bg.webp'); 
        this.load.image('base_building', 'assets/base_building.webp');
        this.load.image('tower_basic', 'assets/tower.webp');
        this.load.image('tower_sniper', 'assets/tower_sniper.webp');
        this.load.image('tower_rapid', 'assets/tower_rapid.webp');
        this.load.image('monster', 'assets/monster.webp');
        this.load.image('monster_fast', 'assets/monster_fast.webp');
        this.load.image('monster_heavy', 'assets/monster_heavy.webp');
        this.load.image('bullet_std', 'assets/bullet.webp');
        this.load.image('bullet_rapid', 'assets/bullet_rapid.webp');
        this.load.image('bullet_sniper', 'assets/bullet_sniper.webp');
        this.load.audio('explosion_snd', 'assets/explosion.mp3');
    }

    create() {
        this.checkDailyLimit(); 
        this.add.image(400, 300, 'map_bg').setDisplaySize(800, 600).setAlpha(0.3);
        
        let title = this.add.text(400, 80, "HOOP DYNASTY", { fontSize: '64px', fill: '#FFD700', stroke: '#000', strokeThickness: 8, fontWeight: 'bold' }).setOrigin(0.5).setInteractive();
        this.add.text(400, 130, `PLAYER: ${window.currentUser}`, { fontSize: '20px', fill: '#00ff00' }).setOrigin(0.5);

        // Debug reset
        title.on('pointerdown', () => {
            if(confirm("Dev: Reset Data?")) {
                localStorage.clear();
                window.location.reload();
            }
        });

        let gamesPlayed = parseInt(localStorage.getItem('hoop_daily_games') || 0);
        this.add.text(400, 160, `DAILY LIMIT: ${gamesPlayed}/3`, { fontSize: '18px', fill: '#00ffff' }).setOrigin(0.5);

        let startY = 220, gap = 65;
        this.createMenuButton(400, startY, "🎮 START GAME", () => this.tryStartGame());
        this.createMenuButton(400, startY + gap, "🏆 BEST SCORE", () => this.showBestScore());
        this.createMenuButton(400, startY + gap * 2, "📊 LEADERBOARD", () => this.scene.start('LeaderboardScene'));
        this.musicBtnText = this.createMenuButton(400, startY + gap * 3, this.getMusicText(), () => this.toggleMusic());
        this.createMenuButton(400, startY + gap * 4, "🎁 BONUS", () => alert("Ads integration required!"));

        this.add.text(400, 580, "v2.1 Mobile Ready", { fontSize: '14px', fill: '#888' }).setOrigin(0.5);
    }

    createMenuButton(x, y, text, callback) {
        let bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.8);
        bg.fillRoundedRect(x - 150, y - 25, 300, 50, 10);
        bg.lineStyle(2, 0x00ffff, 1);
        bg.strokeRoundedRect(x - 150, y - 25, 300, 50, 10);
        let btnText = this.add.text(x, y, text, { fontSize: '24px', fill: '#fff', fontWeight: 'bold' }).setOrigin(0.5);
        let zone = this.add.zone(x, y, 300, 50).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
            this.tweens.add({ targets: [bg, btnText], scale: 0.95, duration: 100, yoyo: true });
            callback();
        });
        return btnText;
    }

    checkDailyLimit() {
        let now = Date.now();
        let firstGameTs = parseInt(localStorage.getItem('hoop_first_game_ts') || 0);
        if (now - firstGameTs > 86400000) {
            localStorage.setItem('hoop_daily_games', 0);
            localStorage.removeItem('hoop_first_game_ts');
        }
    }

    tryStartGame() {
        let gamesPlayed = parseInt(localStorage.getItem('hoop_daily_games') || 0);
        let now = Date.now();
        if (gamesPlayed >= 3) {
            let firstGameTs = parseInt(localStorage.getItem('hoop_first_game_ts') || 0);
            let hoursLeft = Math.ceil((86400000 - (now - firstGameTs)) / (1000 * 60 * 60));
            alert(`⛔ LIMIT REACHED!\nWait ${hoursLeft} hours or click Title to reset.`);
        } else {
            if (gamesPlayed === 0) localStorage.setItem('hoop_first_game_ts', now);
            localStorage.setItem('hoop_daily_games', gamesPlayed + 1);
            this.scene.start('GameScene');
        }
    }

    showBestScore() {
        let board = getLeaderboard();
        let myData = board.find(p => p.name === window.currentUser);
        alert(`🎖️ BEST SCORE: ${myData ? myData.score : 0}`);
    }
    toggleMusic() { window.isMusicOn = !window.isMusicOn; this.musicBtnText.setText(this.getMusicText()); }
    getMusicText() { return window.isMusicOn ? "🎵 MUSIC: ON" : "🔇 MUSIC: OFF"; }
}

// --- 5. GAME SCENE ---
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.wave = 1; this.gold = 100; this.lives = 3; 
        this.score = 0; this.maxGold = 150; this.nukesAvailable = 1; this.monstersSpawned = 0;
    }

    create() {
        this.lives = 3; this.isGameOver = false; this.wave = 1; 
        this.gold = 100; this.score = 0; 
        this.monstersSpawned = 0; this.nukesAvailable = 1; this.slotsArray = [];

        this.mapImage = this.add.image(400, 300, 'map_bg').setDisplaySize(800, 600).setDepth(0);
        
        this.towers = this.physics.add.staticGroup();
        this.monsters = this.physics.add.group();
        this.bullets = this.physics.add.group();
        
        this.baseImage = this.add.image(750, 500, 'base_building').setScale(0.45).setDepth(5);

        this.waveText = this.add.text(20, 20, "WAVE: 1/15", { fontSize: '22px', fill: '#fff', stroke: '#000', strokeThickness: 5 }).setDepth(101);
        this.goldText = this.add.text(20, 50, `GOLD: ${this.gold}/150`, { fontSize: '20px', fill: '#FFD700', stroke: '#000', strokeThickness: 5 }).setDepth(101);
        this.livesText = this.add.text(20, 80, "LIVES: ❤️❤️❤️", { fontSize: '18px', fill: '#ff0000', stroke: '#000', strokeThickness: 5 }).setDepth(101);
        this.scoreText = this.add.text(20, 110, "SCORE: 0", { fontSize: '20px', fill: '#ffffff', stroke: '#000', strokeThickness: 5 }).setDepth(101);

        this.nukeBtn = this.add.text(20, 150, "☢️ NUKE", { fontSize: '18px', fill: '#ff0', backgroundColor: '#800', padding: 5, stroke: '#000', strokeThickness: 2 })
            .setInteractive({ useHandCursor: true }).setDepth(101).on('pointerdown', () => this.launchNuke());

        this.setupSlots();
        this.createBottomUI();

        this.input.on('pointerdown', (p) => { if (!this.isGameOver && p.y < 530) this.handleInput(p); });
        this.physics.add.overlap(this.bullets, this.monsters, this.damageMonster, null, this);
        this.startWave();
    }

    createBottomUI() {
        this.uiPanel = this.add.graphics().setDepth(100);
        this.uiPanel.fillStyle(0x1a1a1a, 0.95);
        this.uiPanel.fillRect(0, 530, 800, 70);
        this.uiPanel.lineStyle(3, 0xFFD700, 1);
        this.uiPanel.lineBetween(0, 530, 800, 530);
        
        this.uiElements = [];

        const uiConfig = [
            { x: 50, color: 0x00ffff, label: "🏹 ARCHER", price: "25g" },
            { x: 300, color: 0xff00ff, label: "🎯 SNIPER", price: "60g" },
            { x: 550, color: 0xffaa00, label: "⚡ RAPID", price: "50g" }
        ];

        uiConfig.forEach(conf => {
            let box = this.add.graphics().setDepth(101);
            box.lineStyle(2, conf.color, 0.6);
            box.strokeRoundedRect(conf.x, 540, 200, 50, 8);
            let t1 = this.add.text(conf.x + 100, 552, conf.label, { fontSize: '18px', fill: Phaser.Display.Color.IntegerToColor(conf.color).rgba, fontWeight: 'bold' }).setOrigin(0.5).setDepth(102);
            let t2 = this.add.text(conf.x + 100, 572, `Cost: ${conf.price}`, { fontSize: '14px', fill: '#ffffff' }).setOrigin(0.5).setDepth(102);
            
            this.uiElements.push(box, t1, t2);
        });
    }

    setupSlots() {
        const slots = [
            {x:100, y:230, t:'basic'}, {x:290, y:170, t:'basic'}, {x:500, y:170, t:'basic'},
            {x:260, y:430, t:'basic'}, {x:500, y:430, t:'basic'}, {x:700, y:430, t:'basic'},
            {x:100, y:370, t:'sniper'}, {x:300, y:250, t:'sniper'}, {x:650, y:100, t:'sniper'}, {x:750, y:250, t:'sniper'},
            {x:50, y:380, t:'rapid'}, {x:400, y:170, t:'rapid'}, {x:510, y:310, t:'rapid'}
        ];
        slots.forEach(s => this.createSlot(s.x, s.y, s.t));
    }

    createSlot(x, y, type) {
        let color = type === 'basic' ? 0x00ffff : (type === 'sniper' ? 0xff00ff : 0xffaa00);
        let g = this.add.graphics().lineStyle(3, color, 0.8).strokeCircle(x, y, 25).setDepth(2);
        this.tweens.add({ targets: g, alpha: 0.3, duration: 1000, yoyo: true, repeat: -1 });
        this.slotsArray.push({ x, y, type, isOccupied: false, towerRef: null, ringGraphics: g });
    }

    startWave() {
        if (this.isGameOver) return;
        this.monstersSpawned = 0;
        let baseCount = 3 + this.wave;
        this.maxMonstersPerWave = (this.wave >= 10) ? baseCount * 2 : baseCount;
        this.waveText.setText(`WAVE: ${this.wave}/15`);
        this.time.addEvent({ delay: 1800, callback: this.spawn, callbackScope: this, repeat: this.maxMonstersPerWave - 1 });
    }

    spawn() {
        if (this.isGameOver) return;
        let baseHp = 60 + (this.wave * 20); 
        let type = 'monster', speed = 90, reward = 5, scoreReward = 5, scale = 0.22;
        let rnd = Phaser.Math.Between(1, 100);

        if (this.wave >= 2 && rnd > 70) { 
            type = 'monster_fast'; speed = 160; baseHp *= 0.8; scale = 0.18; reward = 8; scoreReward = 20;
        } else if (this.wave >= 3 && rnd < 25) { 
            type = 'monster_heavy'; speed = 45; baseHp *= 3.5; scale = 0.35; reward = 12; scoreReward = 15;
        }

        let finalHp = (this.wave >= 8) ? baseHp * 1.5 : baseHp;
        let finalSpeed = (this.wave >= 8) ? speed * 1.2 : speed;

        const m = this.monsters.create(-30, 300, type).setScale(scale).setDepth(4);
        m.setOrigin(0.5, 0.5);
        if (type === 'monster_heavy') { m.setFlipX(true); }

        m.hp = finalHp; m.maxHp = finalHp; m.moveSpeed = finalSpeed; m.reward = reward; m.scoreReward = scoreReward;
        
        m.shadow = this.add.ellipse(m.x, m.y + 10, 40 * scale * 4, 15 * scale * 4, 0x000000, 0.3).setDepth(3);
        this.tweens.add({ targets: m, scaleY: scale * 0.85, duration: 300, yoyo: true, repeat: -1 });
        m.healthBar = this.add.graphics().setDepth(5);
        m.path = [{x:200,y:300}, {x:200,y:85}, {x:600,y:85}, {x:600,y:500}, {x:800,y:500}];
        m.pathIndex = 0; this.monstersSpawned++; this.moveMonster(m);
    }

    moveMonster(m) {
        if (!m.active) return;
        if (m.pathIndex < m.path.length) {
            this.physics.moveTo(m, m.path[m.pathIndex].x, m.path[m.pathIndex].y, m.moveSpeed);
            m.pathIndex++;
        } else { this.loseLife(); this.cleanupMonster(m); }
    }

    update(time) {
        if (this.isGameOver) return;
        this.monsters.getChildren().forEach(m => {
            if (!m.active) return;
            if (m.shadow) { m.shadow.x = m.x; m.shadow.y = m.y + (m.displayHeight / 3); }
            m.rotation = Math.atan2(m.body.velocity.y, m.body.velocity.x);
            m.healthBar.clear().fillStyle(0xff0000).fillRect(m.x-20, m.y-35, 40, 4).fillStyle(0x00ff00).fillRect(m.x-20, m.y-35, (m.hp/m.maxHp)*40, 4);
            let target = m.path[m.pathIndex - 1];
            if (target) {
                let detectionRange = Math.max(15, m.moveSpeed / 15);
                if (Phaser.Math.Distance.Between(m.x, m.y, target.x, target.y) < detectionRange) this.moveMonster(m);
            }
        });

        this.towers.getChildren().forEach(t => {
            let target = this.monsters.getChildren().find(m => m.active && Phaser.Math.Distance.Between(t.x, t.y, m.x, m.y) < t.stats.range);
            if (target) {
                t.rotation = Phaser.Math.Angle.Between(t.x, t.y, target.x, target.y) + (Math.PI / 2);
                if (time > t.nextFire) { this.fire(t, target); t.nextFire = time + t.stats.rate; }
            }
        });
    }

    fire(tower, target) {
        let b = this.bullets.create(tower.x, tower.y, tower.stats.bTex).setScale(0.18).setDepth(4);
        if (b) { 
            b.targetMonster = target; b.damage = tower.stats.dmg; 
            b.rotation = Phaser.Math.Angle.Between(tower.x, tower.y, target.x, target.y) + (Math.PI / 2);
            this.physics.moveToObject(b, target, 500); 
        }
    }

    damageMonster(bullet, monster) {
        if (bullet.targetMonster !== monster) return;
        if (window.isMusicOn) { this.sound.play('explosion_snd', { volume: 0.1 }); }
        bullet.destroy(); monster.hp -= bullet.damage;
        if (monster.hp <= 0) { 
            this.earnGold(Math.floor(monster.reward), monster.x, monster.y); 
            this.score += monster.scoreReward;
            this.scoreText.setText("SCORE: " + this.score);
            this.cleanupMonster(monster); 
        }
    }

    cleanupMonster(m) {
        if (m.shadow) m.shadow.destroy(); if (m.healthBar) m.healthBar.destroy();
        m.destroy(); this.checkWaveStatus();
    }

    checkWaveStatus() {
        if (this.monstersSpawned >= this.maxMonstersPerWave && this.monsters.countActive() === 0) {
            if (this.wave === 15) this.victory();
            else { this.wave++; this.time.delayedCall(2000, () => this.startWave()); }
        }
    }

    loseLife() {
        this.lives--; 
        this.score = Math.max(0, this.score - 100);
        this.scoreText.setText("SCORE: " + this.score);
        let h = ""; for(let i=0; i<this.lives; i++) h += "❤️";
        this.livesText.setText("LIVES: " + h); this.cameras.main.shake(200, 0.01);
        if (this.lives <= 0) this.gameOver();
    }

    saveScore() { savePlayerScore(this.score); }

    createEndGameButtons(msg, isVictory) {
        // 1. SAKRIJ SAMO GAMEPLAY ELEMENTE
        this.baseImage.setVisible(false);
        this.towers.setVisible(false);
        this.monsters.setVisible(false);
        this.bullets.setVisible(false);
        
        this.waveText.setVisible(false);
        this.goldText.setVisible(false);
        this.livesText.setVisible(false);
        this.scoreText.setVisible(false);
        this.nukeBtn.setVisible(false);
        
        this.uiPanel.setVisible(false);
        this.uiElements.forEach(el => el.setVisible(false));
        this.slotsArray.forEach(s => s.ringGraphics.setVisible(false));

        // 2. POTAMNI MAPU (DA LIČI NA MENI)
        this.mapImage.setAlpha(0.3); // Ne sakrivamo je, samo potamnjujemo

        // 3. TEKST I DUGMIĆI
        let color = isVictory ? '#FFD700' : '#ff0000'; 

        this.add.text(400, 150, msg, { fontSize: '72px', fill: color, stroke: '#000', strokeThickness: 6, fontWeight: 'bold' }).setOrigin(0.5).setDepth(2001);
        this.add.text(400, 250, 'FINAL SCORE: ' + this.score, { fontSize: '42px', fill: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(2001);

        let btn1 = this.add.graphics().setDepth(2001).fillStyle(0x00ff00, 1).fillRoundedRect(250, 350, 300, 60, 15);
        let t1 = this.add.text(400, 380, "🔄 PLAY AGAIN", { fontSize: '28px', fill: '#000', fontWeight: 'bold' }).setOrigin(0.5).setDepth(2002);
        let z1 = this.add.zone(400, 380, 300, 60).setInteractive({ useHandCursor: true }).setDepth(2002).on('pointerdown', () => this.scene.start('GameScene'));
        z1.on('pointerdown', () => { this.tweens.add({ targets: [btn1, t1], scale: 0.95, duration: 100, yoyo: true }); this.scene.start('GameScene'); });

        let btn2 = this.add.graphics().setDepth(2001).fillStyle(0xffffff, 1).fillRoundedRect(250, 430, 300, 60, 15);
        let t2 = this.add.text(400, 460, "🏠 MAIN MENU", { fontSize: '28px', fill: '#000', fontWeight: 'bold' }).setOrigin(0.5).setDepth(2002);
        let z2 = this.add.zone(400, 460, 300, 60).setInteractive({ useHandCursor: true }).setDepth(2002).on('pointerdown', () => this.scene.start('MainMenuScene'));
        z2.on('pointerdown', () => { this.tweens.add({ targets: [btn2, t2], scale: 0.95, duration: 100, yoyo: true }); this.scene.start('MainMenuScene'); });
    }

    gameOver() {
        this.saveScore(); 
        this.isGameOver = true; this.physics.pause();
        this.createEndGameButtons('GAME OVER', false);
    }

    victory() {
        this.saveScore();
        this.isGameOver = true; this.physics.pause();
        this.createEndGameButtons('🏆 VICTORY!', true);
    }

    earnGold(n, x, y) {
        this.gold = Math.min(this.maxGold, this.gold + n); this.updateGoldUI();
        let f = this.add.text(x, y, `+${n}`, { fontSize: '18px', fill: '#FFD700' }).setDepth(10);
        this.tweens.add({ targets: f, y: y-50, alpha: 0, duration: 800, onComplete: () => f.destroy() });
    }

    updateGoldUI() { this.goldText.setText(`GOLD: ${this.gold}/${this.maxGold}`); }

    launchNuke() {
        if (this.nukesAvailable <= 0) return;
        this.score = Math.max(0, this.score - 75);
        this.scoreText.setText("SCORE: " + this.score);
        this.nukesAvailable = 0; this.nukeBtn.setAlpha(0.3);
        for (let i = 0; i < 10; i++) {
            this.time.delayedCall(i * 200, () => {
                let x = Phaser.Math.Between(50, 750); let y = Phaser.Math.Between(50, 500);
                let boom = this.add.circle(x, y, 80, 0xff0000, 0.6).setDepth(10);
                this.cameras.main.shake(100, 0.01);
                this.monsters.getChildren().forEach(m => {
                    if (m.active && Phaser.Math.Distance.Between(x, y, m.x, m.y) < 80) { m.hp -= 350; if (m.hp <= 0) this.cleanupMonster(m); }
                });
                this.tweens.add({ targets: boom, alpha: 0, scale: 2, duration: 600, onComplete: () => boom.destroy() });
            });
        }
    }

    handleInput(pointer) {
        let slot = this.slotsArray.find(s => Phaser.Math.Distance.Between(pointer.x, pointer.y, s.x, s.y) < 40);
        if (slot) {
            if (!slot.isOccupied) this.placeTower(slot);
            else this.upgradeTower(slot.towerRef);
        }
    }

    placeTower(slot) {
        const statsMap = {
            'basic': { cost: 25, range: 180, rate: 1000, dmg: 20, tex: 'tower_basic', bTex: 'bullet_std' },
            'sniper': { cost: 60, range: 450, rate: 2500, dmg: 130, tex: 'tower_sniper', bTex: 'bullet_sniper' },
            'rapid': { cost: 50, range: 160, rate: 300, dmg: 12, tex: 'tower_rapid', bTex: 'bullet_rapid' }
        };
        let s = statsMap[slot.type];
        if (this.gold >= s.cost) {
            this.gold -= s.cost;
            let tower = this.towers.create(slot.x, slot.y, s.tex).setScale(0.2).setOrigin(0.5, 0.7).refreshBody().setDepth(3);
            tower.stats = { ...s, lvl: 1 }; tower.nextFire = 0; tower.slotRef = slot;
            slot.isOccupied = true; slot.towerRef = tower;
            this.tweens.killTweensOf(slot.ringGraphics); slot.ringGraphics.setAlpha(1);
            this.updateGoldUI();
        }
    }

    upgradeTower(tower) {
        if (tower.stats.lvl >= 3) return;
        let cost = Math.floor(tower.stats.cost * 1.5);
        if (this.gold >= cost) {
            this.gold -= cost; tower.stats.lvl++;
            let newColor = tower.stats.lvl === 2 ? 0xffff00 : 0xffffff;
            tower.slotRef.ringGraphics.clear().lineStyle(4, newColor, 1).strokeCircle(tower.x, tower.y, 28);
            tower.stats.dmg *= 1.8; tower.stats.rate *= 0.85; 
            this.updateGoldUI();
        }
    }
}

// SCALING SETTINGS (Za Telefon)
const config = { 
    type: Phaser.AUTO, 
    width: 800, 
    height: 600, 
    backgroundColor: '#1a1a1a', 
    physics: { default: 'arcade' }, 
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, LoginScene, LeaderboardScene, MainMenuScene, GameScene] 
};

new Phaser.Game(config);
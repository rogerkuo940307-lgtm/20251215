let imgs = [];
let chars = [];
let selected = null;
// 問答系統狀態
let qaActive = false;
let qaAnswered = false;
let qaQuestion = null;
let qaInput = null;
let qaSubmitBtn = null;
let qaNewBtn = null;
let qaCancelBtn = null;
let qaMessage = '';
let qaTargetIndex = null;
let qaIgnoreUntil = 0; // millis() until which triggers are ignored
// 每側是否允許觸發（索引為 0 與 2）
let triggerEnabled = { 0: true, 2: true };
// 背景資源（已恢復為單色背景）
let particles = [];

function preload() {
  // 請確認資料夾 1,2,3 底下分別有 all-1.png, all-2.png, all-3.png
  imgs[0] = loadImage('1/all-1.png', () => {}, () => { console.warn('無法載入 1/all-1.png'); });
  imgs[1] = loadImage('2/all-2.png', () => {}, () => { console.warn('無法載入 2/all-2.png'); });
  imgs[2] = loadImage('3/all-3.png', () => {}, () => { console.warn('無法載入 3/all-3.png'); });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  createWarBackground();
  // 三個角色平均站在螢幕中間（水平等距，垂直置中）
  const centerY = height / 2;
  const spacing = width / 4;
  const centerX = width / 2;
  // 傳入對應的 sprite sheet 與設定（皆為 10 幀）
  // 注意：只有中間角色 controllable: true（可用鍵盤/滑鼠移動）
  chars.push(new Character(imgs[0], createVector(centerX - spacing, centerY), { frames: 10, size: 220, frameSpeed: 0.18, controllable: false }));
  chars.push(new Character(imgs[1], createVector(centerX, centerY), { frames: 10, size: 220, frameSpeed: 0.14, controllable: true, speed: 3.5 }));
  chars.push(new Character(imgs[2], createVector(centerX + spacing, centerY), { frames: 10, size: 220, frameSpeed: 0.12, controllable: false }));

  // 建立 QA DOM 元件（預設隱藏）
  qaInput = createInput('');
  qaInput.position(width / 2 - 120, height - 140);
  qaInput.size(240, 28);
  qaInput.hide();
  qaInput.style('z-index', '9999');

  qaSubmitBtn = createButton('送出');
  qaSubmitBtn.position(width / 2 + 130, height - 140);
  qaSubmitBtn.mousePressed(handleSubmit);
  qaSubmitBtn.hide();
    qaSubmitBtn.size(80, 34);
    qaSubmitBtn.style('font-size', '14px');
  qaSubmitBtn.style('z-index', '9999');

  qaNewBtn = createButton('新題目');
  qaNewBtn.position(width / 2 + 10, height - 90);
  qaNewBtn.mousePressed(handleNewQuestion);
  qaNewBtn.hide();
    qaNewBtn.size(100, 36);
    qaNewBtn.style('font-size', '14px');
  qaNewBtn.style('z-index', '9999');

  qaCancelBtn = createButton('退出');
  qaCancelBtn.position(width / 2 - 240, height - 140);
  qaCancelBtn.mousePressed(handleCancel);
  qaCancelBtn.hide();
    // 使退出按鈕更顯眼
    qaCancelBtn.size(140, 44);
    qaCancelBtn.style('background-color', '#e63946');
    qaCancelBtn.style('color', '#ffffff');
    qaCancelBtn.style('font-weight', '700');
    qaCancelBtn.style('font-size', '16px');
    qaCancelBtn.style('border-radius', '8px');
    qaCancelBtn.style('border', 'none');
    qaCancelBtn.style('z-index', '9999');
}

function draw() {
  drawWarBackground();
  // 只有中間角色支援鍵盤持續移動
  handleContinuousKeys();

  // 檢查中間角色是否接近左右角色以觸發招式與對話
  checkTriggers();

  for (let c of chars) {
    c.update();
    c.draw();
  }
  // 若問答介面啟動，繪製遮罩與題目文字
  if (qaActive || qaAnswered) {
    // 將 QA DOM 元件位置更新到題目框下方
    updateQAPositions();
    push();
    noStroke();
    fill(0, 150);
    rect(0, 0, width, height);

    const boxW = min(640, width - 80);
    const boxH = 120;
    const bx = width / 2 - boxW / 2;
    const by = height / 2 - boxH / 2 - 60;

    fill(255);
    rect(bx, by, boxW, boxH, 12);

    fill(10);
    textSize(22);
    textAlign(LEFT, TOP);
    if (qaQuestion) text(qaQuestion.text, bx + 18, by + 16);
    textSize(16);
    text(qaMessage, bx + 18, by + 56);
    pop();
  }
  // 簡短提示（可移除）
  noStroke();
  fill(255, 200);
  textSize(14);
  textAlign(LEFT, TOP);
  text('412730730郭睿濬', 30, 30);
}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // 重新排列三個角色（保留相對位置）
  const centerY = height / 2;
  const spacing = width / 4;
  const centerX = width / 2;
  if (chars.length >= 3) {
    chars[0].pos.set(centerX - spacing, centerY);
    chars[1].pos.set(centerX, centerY);
    chars[2].pos.set(centerX + spacing, centerY);
  }
  // 重新定位 QA DOM（若顯示中）
  if (qaActive) updateQAPositions();
  // 不需重新產生自訂背景
}
// 建立戰爭感背景
function createWarBackground() {
  particles = []; // 清空舊的粒子
  for (let i = 0; i < 400; i++) {
    particles.push({
      x: random(width),
      y: random(height),
      size: random(1, 4),
      alpha: random(80, 200),
      vy: random(-0.1, -0.5) // 讓粒子緩慢向上飄，像餘燼
    });
  }
}

// 繪製戰爭感背景
function drawWarBackground() {
  background('#2c1d12'); // 深棕色背景
  drawArena(); // 繪製擂台
  noStroke();
  for (const p of particles) {
    // 橘紅色調的粒子，像火星
    fill(255, random(50, 150), 0, p.alpha);
    ellipse(p.x, p.y, p.size);
    p.y += p.vy;
    // 如果飄出頂部，重新回到下方
    if (p.y < 0) p.y = height;
  }
}

// 繪製擂台
function drawArena() {
  const arenaY = height / 2 + 150; // 擂台地板的 Y 軸位置
  const arenaRadiusX = width * 0.4; // 擂台的 X 半徑
  const arenaRadiusY = 80; // 擂台的 Y 半徑（透視感）

  push();
  noStroke();

  // 擂台平台 (深色橢圓)
  fill(40, 35, 30);
  ellipse(width / 2, arenaY, arenaRadiusX * 2, arenaRadiusY * 2);

  // 平台內圈 (較亮)
  fill(65, 60, 55);
  ellipse(width / 2, arenaY, arenaRadiusX * 1.8, arenaRadiusY * 1.8);

  // 繪製柱子和繩索
  const numPosts = 8;
  const postHeight = 280;
  let postPositions = [];

  for (let i = 0; i < numPosts; i++) {
    const angle = TWO_PI / numPosts * i;
    const x = width / 2 + cos(angle) * arenaRadiusX;
    // 根據角度微調 Y，模擬橢圓透視
    const y = arenaY + sin(angle) * arenaRadiusY;
    postPositions.push({ x, y });

    // 繪製柱子
    fill(80);
    rect(x - 5, y - postHeight, 10, postHeight);
  }

  // 繪製繩索 (連接柱子)
  stroke(200, 50, 50); // 紅色繩索
  strokeWeight(4);
  for (let i = 0; i < postPositions.length; i++) {
    const p1 = postPositions[i];
    const p2 = postPositions[(i + 1) % postPositions.length]; // 連接到下一根柱子
    // 畫兩層繩索
    line(p1.x, p1.y - postHeight * 0.6, p2.x, p2.y - postHeight * 0.6);
    line(p1.x, p1.y - postHeight * 0.9, p2.x, p2.y - postHeight * 0.9);
  }

  pop();
}

class Character {
  constructor(img, pos, opts = {}) {
    this.img = img;
    this.pos = pos.copy();
    this.vel = createVector(0, 0);
    this.speed = opts.speed || 3;
    this.size = opts.size || 120;
    this.autonomous = opts.autonomous || false;
    this.controllable = opts.controllable || false; // 新增：是否可被玩家控制
    this.dragging = false;
    this.noiseOffset = random(1000);

    // sprite 帧數與動畫
    this.frameCount = opts.frames || 10;
    this.frameIndex = 0;
    this.frameSpeed = opts.frameSpeed || 0.16; // 每 draw 增加的帧數（小數允許平滑）
    // 計算單帧寬高（假設水平排列）
    this.frameW = this.img ? (this.img.width / this.frameCount) : 0;
    this.frameH = this.img ? this.img.height : 0;

    // 招式相關
    this.attackTimer = 0; // 正在發動招式的計時（frame）
    this.attackDuration = 60; // 招式持續時間（frame）
    this.cooldownTimer = 0; // 冷卻計時（frame）
    this.cooldownDuration = 150; // 冷卻總長（frame）

    // 對話相關（conversation 物件會被放在參與者共用）
    this.conversation = null;
  }

  triggerAttack(partner = null) {
    // 若在冷卻或正在發動，忽略
    if (this.cooldownTimer > 0 || this.attackTimer > 0) return;
    this.attackTimer = this.attackDuration;
    this.cooldownTimer = this.cooldownDuration;
    // 同時可啟動對話
    if (partner) {
      this.startConversation(partner);
    }
  }

  startConversation(partner) {
    // 若已有 conversation 則忽略
    if (this.conversation || (partner && partner.conversation)) return;

    // 簡單對話片段庫（可擴充或替換）
    const linesA = [ // 挑釁的台詞
      "站住！你是誰？",
      "這裡不歡迎你。",
      "準備受死吧！",
      "又一個來送死的。"
    ];
    const linesB = [ // 回應的台詞
      "你管不著！",
      "這條路是我的。",
      "放馬過來！",
      "廢話少說！"
    ];
    // 建立交替對話內容（隨機抽取幾句）
    const rounds = 4; // 交談交換次數（句數）
    const lines = [];
    for (let i = 0; i < rounds; i++) {
      // 偶數由 this（被觸發者）先說，奇數由 partner 回應
      lines.push(random(linesA));
      lines.push(random(linesB));
    }

    const conv = {
      lines: lines,
      index: 0,
      perLine: 90, // 每句顯示時間（frame）
      timer: 90,
      participants: [this, partner],
      active: true
    };
    // 將 conversation 物件 reference 放到雙方，便於顯示與同步
    this.conversation = conv;
    partner.conversation = conv;
  }

  update() {
    // 動畫更新（不依賴於是否被拖曳）
    this.frameIndex = (this.frameIndex + this.frameSpeed) % this.frameCount;

    if (this.dragging && this.controllable) {
      // 由滑鼠拖曳控制位置，平滑跟隨（僅中間角色會觸發）
      const target = createVector(mouseX, mouseY);
      this.pos.lerp(target, 0.25);
      this.vel.mult(0.5);
    } else if (this.autonomous && !this.controllable) {
      // 若設定為自漫遊且非 controllable（可選）
      const t = millis() * 0.0005 + this.noiseOffset;
      const angle = noise(t) * TWO_PI * 2;
      const v = p5.Vector.fromAngle(angle).mult(this.speed * 0.6);
      this.vel.lerp(v, 0.05);
      this.pos.add(this.vel);
    } else {
      // 若為玩家可控制但非拖曳（會被外部鍵盤邏輯改變 vel），或純靜止的 AI
      this.pos.add(this.vel);
      // 輕微摩擦
      this.vel.mult(0.85);
    }

    // 招式計時器
    if (this.attackTimer > 0) {
      this.attackTimer--;
    }
    if (this.cooldownTimer > 0) {
      this.cooldownTimer--;
    }

    // 對話計時器（共享 conversation 物件處理）
    if (this.conversation && this.conversation.active) {
      // 僅由 participants[0] 或 participants[1] 任何一方更新（每個 frame 都會跑到，但只在 index 滾動時同步）
      const conv = this.conversation;
      conv.timer--;
      if (conv.timer <= 0) {
        conv.index++;
        if (conv.index >= conv.lines.length) {
          // 結束對話，移除雙方 reference
          conv.active = false;
          for (let p of conv.participants) {
            if (p) p.conversation = null;
          }
        } else {
          conv.timer = conv.perLine;
        }
      }
    }

    // 邊界約束（停在畫面內）
    this.pos.x = constrain(this.pos.x, this.size * 0.4, width - this.size * 0.4);
    this.pos.y = constrain(this.pos.y, this.size * 0.4, height - this.size * 0.4);
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);

    // 招式視覺效果（若正在發動：放大與光暈）
    if (this.attackTimer > 0) {
      const p = 1 - (this.attackTimer / this.attackDuration); // 0 -> 1
      // 光暈
      // 模擬爆炸效果，使用多層、顏色不同的圓形
      noStroke();
      const baseGlow = this.size * (1 + p * 2.5);
      // 外層紅色
      fill(255, 0, 0, 150 * (1 - p));
      ellipse(0, 0, baseGlow, baseGlow * 0.7);
      // 內層橘黃色
      fill(255, 180, 0, 200 * (1 - p));
      ellipse(0, 0, baseGlow * 0.6, baseGlow * 0.4);
    }

    // 如果圖片還沒載入，畫一個佔位圓
    if (this.img && this.frameW > 0) {
      // 計算顯示寬高以符合 this.size 並維持帧比例
      const asp = this.frameW / this.frameH;
      let w = this.size;
      let h = this.size;
      if (asp > 1) h = w / asp;
      else w = h * asp;

      // 若正在發動招式，稍微放大 sprite
      if (this.attackTimer > 0) {
        const scaleFactor = 1 + 0.35 * (1 - (this.attackTimer / this.attackDuration));
        w *= scaleFactor;
        h *= scaleFactor;
      }

      // 計算來源 x（整數）
      const srcX = floor(this.frameIndex) * this.frameW;
      image(this.img, 0, 0, w, h, srcX, 0, this.frameW, this.frameH);
    } else {
      noStroke();
      fill(200);
      ellipse(0, 0, this.size * 0.8);
    }

    // 若冷卻中，畫出冷卻條
    if (this.cooldownTimer > 0 && this.cooldownTimer < this.cooldownDuration) {
      const cw = this.size;
      const ch = 6;
      push();
      translate(-cw / 2, this.size * 0.6);
      noStroke();
      fill(60);
      rect(0, 0, cw, ch, 3);
      fill(210, 210, 210); // 將冷卻條改為灰色
      const pct = 1 - (this.cooldownTimer / this.cooldownDuration);
      rect(0, 0, cw * pct, ch, 3);
      pop();
    }

    // 對話泡泡繪製：只有當 conversation active 且此刻輪到自己發言時顯示
    if (this.conversation && this.conversation.active) {
      const conv = this.conversation;
      const speaker = conv.participants[conv.index % 2];
      if (speaker === this) {
        const textStr = conv.lines[conv.index] || '';
        drawSpeechBubble(0, -this.size * 0.75, textStr, this.size * 0.9);
      }
    }

    pop();
  }

  isHit(x, y) {
    return dist(x, y, this.pos.x, this.pos.y) < this.size * 0.5;
  }
}

// 按鍵一次性事件（保留） — 僅對中間角色（chars[1]）生效
function keyPressed() {
  // 支援 Esc 退出問答
  if (keyCode === 27) {
    handleCancel();
    return;
  }
  const s = 3;
  const mid = chars[1];
  if (!mid || !mid.controllable) return;

  // 支援 WASD 與 箭頭鍵
  if (key === 'w' || key === 'W' || keyCode === UP_ARROW) mid.vel.add(0, -s);
  if (key === 's' || key === 'S' || keyCode === DOWN_ARROW) mid.vel.add(0, s);
  if (key === 'a' || key === 'A' || keyCode === LEFT_ARROW) mid.vel.add(-s, 0);
  if (key === 'd' || key === 'D' || keyCode === RIGHT_ARROW) mid.vel.add(s, 0);
}

// 支援持續按鍵控制（使移動更靈活） — 僅控制中間角色
function handleContinuousKeys() {
  const s = 0.5; // 每 frame 加速度
  const mid = chars[1];
  if (!mid || !mid.controllable) return;

  // WASD 或 箭頭
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) mid.vel.add(0, -s); // W / up
  if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) mid.vel.add(0, s); // S / down
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) mid.vel.add(-s, 0); // A / left
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) mid.vel.add(s, 0); // D / right
}

function mousePressed() {
  // 只允許中間角色被點擊拖曳
  const mid = chars[1];
  if (mid && mid.isHit(mouseX, mouseY) && mid.controllable) {
    mid.dragging = true;
    selected = mid;
  } else {
    selected = null;
  }
}

function mouseReleased() {
  for (let c of chars) c.dragging = false;
  selected = null;
}

// 檢查中間角色是否接近左右角色並觸發招式與對話
function checkTriggers() {
  if (chars.length < 3) return;
  const mid = chars[1];
  if (!mid) return;

  // 若在短暫免觸發期間，略過
  if (millis() < qaIgnoreUntil) return;

  // 判定距離門檻（水平接近或整體距離）
  for (let i of [0, 2]) {
    const other = chars[i];
    const dx = abs(mid.pos.x - other.pos.x);
    const dy = abs(mid.pos.y - other.pos.y);
    // 門檻可調：以角色寬度為基準
    const thresholdX = (mid.size + other.size) * 0.6;
    const thresholdY = (mid.size + other.size) * 0.6;
    // 如果此側暫時被禁止觸發，檢查玩家是否已離開來重新啟用
    if (!triggerEnabled[i]) {
      if (dx > thresholdX * 1.2 || dy > thresholdY * 1.2) {
        triggerEnabled[i] = true;
      }
      continue;
    }

    if (dx < thresholdX && dy < thresholdY) {
      other.triggerAttack(mid); // 傳入 mid 作為對話夥伴
      // 啟動數學問答（若尚未進行中）
      if (!qaActive) {
        startMathChallenge(i);
      }
    }
  }
}

// 產生簡單數學題（加、減、乘）
function generateQuestion() {
  const ops = ['+', '-', '×'];
  const op = random(ops);
  let a, b, ans;
  if (op === '+') {
    a = floor(random(1, 50));
    b = floor(random(1, 50));
    ans = a + b;
  } else if (op === '-') {
    a = floor(random(1, 50));
    b = floor(random(1, a + 1));
    ans = a - b;
  } else {
    a = floor(random(1, 12));
    b = floor(random(1, 12));
    ans = a * b;
  }
  return { a, b, op, answer: String(ans), text: `${a} ${op} ${b} = ?` };
}

function startMathChallenge(sideIndex) {
  qaActive = true;
  qaAnswered = false;
  qaQuestion = generateQuestion();
  qaTargetIndex = sideIndex;
  // 禁止此側在未離開前再次觸發
  if (sideIndex === 0 || sideIndex === 2) triggerEnabled[sideIndex] = false;
  // 設定短暫免觸發，避免馬上被重新觸發
  qaIgnoreUntil = millis() + 1200;
  // 顯示輸入元件
  qaInput.value('');
  qaInput.show();
  qaSubmitBtn.show();
  qaCancelBtn.show();
  qaNewBtn.hide();
  qaMessage = '';
  // 暫停玩家移動
  if (chars[1]) {
    chars[1].controllable = false;
    chars[1].vel.set(0, 0);
  }
}

function handleSubmit() {
  if (!qaActive || !qaQuestion) return;
  const v = qaInput.value().trim();
  if (v === qaQuestion.answer) {
    qaAnswered = true;
    qaMessage = '答對了！';
    qaSubmitBtn.hide();
    qaNewBtn.show();
    // 回復玩家控制
    if (chars[1]) chars[1].controllable = true;
  } else {
    qaMessage = '答錯了，請再試一次。';
  }
}

function handleNewQuestion() {
  // 產生新題目並重新啟動問答狀態（再次鎖定玩家）
  qaQuestion = generateQuestion();
  qaAnswered = false;
  qaMessage = '';
  qaInput.value('');
  qaInput.show();
  qaSubmitBtn.show();
  qaNewBtn.hide();
  if (chars[1]) chars[1].controllable = false;
}

function handleCancel() {
  // 關閉問答介面並恢復遊戲控制
  qaActive = false;
  qaAnswered = false;
  qaQuestion = null;
  qaMessage = '';
  qaTargetIndex = null;
  // 設定較長的免觸發時間，避免立即再次觸發
  qaIgnoreUntil = millis() + 1500;
  if (qaInput) qaInput.hide();
  if (qaSubmitBtn) qaSubmitBtn.hide();
  if (qaNewBtn) qaNewBtn.hide();
  if (qaCancelBtn) qaCancelBtn.hide();
  // 回復玩家控制
  if (chars[1]) chars[1].controllable = true;
}

// 根據題目框位置把 DOM 元件靠近題目框下方排列
function updateQAPositions() {
  const boxW = min(640, width - 80);
  const boxH = 120;
  const bx = width / 2 - boxW / 2;
  const by = height / 2 - boxH / 2 - 60;
  if (qaInput) qaInput.position(bx + 18, by + boxH + 12);
  if (qaSubmitBtn) qaSubmitBtn.position(bx + boxW - 120, by + boxH + 12);
  // 將退出按鈕置中並放大以顯眼
  if (qaCancelBtn) qaCancelBtn.position(bx + boxW / 2 - 70, by + boxH + 12 + 36);
  if (qaNewBtn) qaNewBtn.position(bx + boxW - 110, by + boxH + 12 + 36);
}

// 繪製對話泡泡的輔助函式
function drawSpeechBubble(x, y, txt, maxWidth) {
  push();
  textFont('Arial');
  textSize(14);
  textAlign(CENTER, TOP);
  // 計算文字與泡泡大小
  const padding = 12;
  const lines = wrapTextToLines(txt, maxWidth - padding * 2);
  let bw = 0;
  for (let l of lines) {
    bw = max(bw, textWidth(l));
  }
  bw += padding * 2;
  const bh = lines.length * (textAscent() + textDescent()) + padding * 2;

  // 位置偏移讓泡泡在角色頭上方
  const bx = x - bw / 2;
  const by = y - bh - 8;

  // 泡泡矩形
  noStroke();
  fill(255, 245);
  rect(bx, by, bw, bh, 8);

  // 三角尾巴
  fill(255, 245);
  triangle(x - 8, by + bh, x + 8, by + bh, x, by + bh + 10);

  // 文字
  fill(10);
  let ty = by + padding;
  for (let l of lines) {
    text(l, x, ty);
    ty += (textAscent() + textDescent());
  }
  pop();
}

// 簡單把長字串根據寬度斷行（回傳陣列）
function wrapTextToLines(txt, maxW) {
  const words = txt.split(' ');
  const lines = [];
  let cur = '';
  for (let w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (textWidth(test) > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

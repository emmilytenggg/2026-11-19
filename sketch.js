let idleSprite; // 儲存角色待機精靈圖
let runSprite; // 儲存角色跑步精靈圖
let backgroundSprite; // 儲存可水平重複的背景圖片
let lightningSprite; // 儲存右側場景端點的閃電特效精靈圖
let explosionSprite; // 儲存閃電擊中地面後的爆炸特效精靈圖
let idleFrame = 0; // 記錄目前播放的待機影格
let runFrame = 0; // 記錄目前播放的跑步影格
let facing = 1; // 記錄角色朝向，1 為右、-1 為左
let backgroundOffset = 0; // 記錄相機在三張背景場景中的水平位置
let characterX = 0; // 記錄角色在畫面上的水平位置
let previousAnimationTime = 0; // 記錄上次切換動畫影格的時間
let wasRunning = false; // 記錄上一幀是否正在播放跑步動畫
let rightEffectStartedAt = null; // 記錄背景抵達最右端時特效循環的起始時間
let wasAtRightBackgroundEdge = false; // 記錄上一幀背景是否位於最右端
let thunderAudioContext = null; // 儲存合成雷鳴使用的 Web Audio 音訊環境
let lastThunderStrikeIndex = -1; // 記錄上次播放雷鳴的閃電序號
const IDLE_FRAME_COUNT = 14; // 設定待機精靈圖的影格總數
const RUN_FRAME_COUNT = 12; // 設定跑步精靈圖的影格總數
const LIGHTNING_FRAME_COUNT = 14; // 設定閃電特效精靈圖的影格總數
const EXPLOSION_FRAME_COUNT = 10; // 設定爆炸特效精靈圖的影格總數
const ANIMATION_INTERVAL = 100; // 設定動畫每 100 毫秒切換一次影格
const MOVEMENT_SPEED = 6; // 設定角色與背景每幀移動的像素數
const LIGHTNING_DURATION = 1000; // 設定每次閃電特效播放一秒
const EXPLOSION_DURATION = 1000; // 設定爆炸特效播放一秒

function preload() { // 在畫布建立前載入所有圖片
  idleSprite = loadImage("金髮男/stop.png"); // 載入 14 格待機精靈圖
  runSprite = loadImage("金髮男/RUN.png"); // 載入 12 格跑步精靈圖
  backgroundSprite = loadImage("background.png"); // 載入背景圖片
  lightningSprite = loadImage("閃電最新.png"); // 載入 14 格閃電特效精靈圖
  explosionSprite = loadImage("爆炸.png"); // 載入現有 10 格爆炸特效精靈圖
} // 結束圖片載入函式

function setup() { // 初始化畫布與動畫計時
  createCanvas(windowWidth, windowHeight); // 建立符合視窗大小的畫布
  imageMode(CORNER); // 使用圖片左上角作為繪製座標
  const backgroundWidth = backgroundSprite.width * height / backgroundSprite.height; // 依畫布高度計算單張背景寬度
  backgroundOffset = Math.max(0, (backgroundWidth * 3 - width) / 2); // 將三張相連背景置中作為起點
  characterX = width / 2; // 將角色初始位置設在畫面中央
  thunderAudioContext = getAudioContext(); // 取得 p5.sound 使用的音訊環境
  previousAnimationTime = millis(); // 初始化動畫計時基準
} // 結束初始化函式

function draw() { // 每幀更新並繪製遊戲畫面
  const movingRight = keyIsDown(RIGHT_ARROW); // 檢查右方向鍵是否按住
  const movingLeft = keyIsDown(LEFT_ARROW); // 檢查左方向鍵是否按住
  const movementDirection = movingRight === movingLeft ? 0 : movingRight ? 1 : -1; // 計算目前移動方向並讓同時按鍵時停止
  const now = millis(); // 取得目前時間以控制動畫速度
  const backgroundWidth = backgroundSprite.width * height / backgroundSprite.height; // 依畫布高度計算背景顯示寬度
  const worldWidth = backgroundWidth * 3; // 設定背景本體與左右各一張複製圖的總寬度
  const maxCameraOffset = Math.max(0, worldWidth - width); // 計算相機可移動的最右位置
  const displayHeight = height / 3; // 將角色顯示高度設定為畫布高度的三分之一
  const runFrameWidth = runSprite.width / RUN_FRAME_COUNT; // 計算跑步精靈圖單格原始寬度
  const runDisplayWidth = runFrameWidth * displayHeight / runSprite.height; // 依跑步影格原始比例計算顯示寬度
  const minWorldX = runDisplayWidth / 2; // 限制角色不超出背景場景左端
  const maxWorldX = worldWidth - runDisplayWidth / 2; // 限制角色不超出背景場景右端
  const previousWorldX = characterX + backgroundOffset; // 將角色畫面位置換算為場景座標
  const nextWorldX = constrain(previousWorldX + movementDirection * MOVEMENT_SPEED, minWorldX, maxWorldX); // 依按鍵移動角色並限制在場景範圍內
  const isRunning = Math.abs(nextWorldX - previousWorldX) > 0.001; // 只有角色實際移動時才播放跑步動畫

  if (movementDirection !== 0) { // 按下任一方向鍵時
    facing = movementDirection; // 更新角色朝向
  } // 結束角色朝向更新
  backgroundOffset = constrain(nextWorldX - width / 2, 0, maxCameraOffset); // 讓相機跟隨角色直到背景抵達視窗邊緣
  characterX = nextWorldX - backgroundOffset; // 計算角色在視窗中的實際水平位置

  background(0); // 清除畫布並避免場景邊界出現殘留畫面
  for (let backgroundIndex = 0; backgroundIndex < 3; backgroundIndex++) { // 只繪製背景本體與左右各一張複製圖
    image(backgroundSprite, backgroundIndex * backgroundWidth - backgroundOffset, 0, backgroundWidth, height); // 連續繪製三張背景圖片
  } // 結束背景繪製迴圈

  const isAtRightBackgroundEdge = maxCameraOffset > 0 && backgroundOffset >= maxCameraOffset - 0.001; // 判斷背景是否已移至最右端
  const rightmostBackgroundLeft = backgroundWidth * 2 - backgroundOffset; // 計算最右張背景目前在視窗中的左緣
  const lightningCenterX = width * 0.75; // 取得閃電中心在視窗中的水平位置
  const isLightningOverRightQuarter = lightningCenterX >= rightmostBackgroundLeft + backgroundWidth * 0.75 && lightningCenterX <= rightmostBackgroundLeft + backgroundWidth; // 判斷閃電是否仍位於最右張背景的最右四分之一
  if (isAtRightBackgroundEdge && !wasAtRightBackgroundEdge) { // 偵測背景剛抵達最右端
    rightEffectStartedAt = now; // 從此刻開始播放閃電與爆炸循環
    lastThunderStrikeIndex = -1; // 重設雷鳴序號以便播放新的特效循環
  } else if (rightEffectStartedAt !== null && !isLightningOverRightQuarter) { // 閃電中心離開背景最右四分之一時
    rightEffectStartedAt = null; // 停止特效並清除循環起始時間
    lastThunderStrikeIndex = -1; // 清除雷鳴序號以便下次重新進入時播放
  } // 結束右側特效啟動與停止判斷
  wasAtRightBackgroundEdge = isAtRightBackgroundEdge; // 記錄目前背景端點狀態供下一幀使用

  if (isRunning && !wasRunning) { // 偵測跑步動畫剛開始播放
    runFrame = 0; // 每次開始跑步時從第 1 格重新播放
    previousAnimationTime = now; // 重設跑步動畫計時
  } // 結束跑步啟動判斷
  if (!isRunning && wasRunning) { // 偵測方向鍵放開並結束跑步動畫
    idleFrame = 0; // 立即切回 stop.png 的第 1 格
    previousAnimationTime = now; // 從待機第 1 格重新計算動畫時間
  } // 結束跑步停止判斷
  if (isRunning && now - previousAnimationTime >= ANIMATION_INTERVAL) { // 到達切換時間時更新跑步影格
    runFrame = runFrame < RUN_FRAME_COUNT - 1 ? runFrame + 1 : 4; // 首輪播放 1 至 12 格，之後循環第 5 至 12 格
    previousAnimationTime = now; // 記錄本次影格切換時間
  } // 結束跑步影格更新
  if (!isRunning && now - previousAnimationTime >= ANIMATION_INTERVAL) { // 未按方向鍵時更新待機影格
    idleFrame = (idleFrame + 1) % IDLE_FRAME_COUNT; // 循環播放全部 14 格待機動畫
    previousAnimationTime = now; // 記錄本次影格切換時間
  } // 結束待機影格更新
  if (movingLeft && !movingRight) { // 單獨按左方向鍵時
    facing = -1; // 將角色朝向設定為左方
  } else if (movingRight) { // 按右方向鍵或同時按下兩個方向鍵時
    facing = 1; // 將角色朝向設定為右方
  } // 結束角色朝向判斷

  const sprite = isRunning ? runSprite : idleSprite; // 依是否按住方向鍵選擇精靈圖
  const frameIndex = isRunning ? runFrame : idleFrame; // 取得目前動畫影格索引
  const frameCount = isRunning ? RUN_FRAME_COUNT : IDLE_FRAME_COUNT; // 取得目前精靈圖影格總數
  const frameWidth = sprite.width / frameCount; // 根據精靈圖總寬計算單格寬度
  const displayWidth = frameWidth * displayHeight / sprite.height; // 依目前影格的原始寬高比計算顯示寬度
  let drawCharacterX = characterX; // 預設使用角色目前的畫面座標
  if (!isRunning && backgroundOffset >= maxCameraOffset && characterX > width / 2) { // 角色在場景右端停止時
    drawCharacterX = width - displayWidth / 2; // 讓待機影格貼齊視窗右側
  } else if (!isRunning && backgroundOffset <= 0 && characterX < width / 2) { // 角色在場景左端停止時
    drawCharacterX = displayWidth / 2; // 讓待機影格貼齊視窗左側
  } // 結束待機影格邊界對齊

  push(); // 儲存目前畫布座標狀態
  translate(drawCharacterX, height - displayHeight / 2); // 將角色繪製於目前位置並貼齊畫布底部
  scale(facing, 1); // 依目前朝向水平翻轉角色
  image(sprite, -displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight, frameIndex * frameWidth, 0, frameWidth, sprite.height); // 等比例裁切並繪製目前精靈影格
  pop(); // 還原畫布座標狀態

  if (rightEffectStartedAt !== null) { // 背景停在最右端時持續播放特效
    drawRightEdgeEffect(now - rightEffectStartedAt); // 依循環經過時間繪製閃電或爆炸
  } // 結束右側特效繪製判斷

  wasRunning = isRunning; // 記錄目前跑步狀態供下一幀判斷
} // 結束畫面繪製函式

function drawRightEdgeEffect(elapsedTime) { // 播放右側背景端點的閃電與爆炸循環
  const lightningFrameWidth = lightningSprite.width / LIGHTNING_FRAME_COUNT; // 計算閃電精靈圖單格寬度
  const explosionFrameWidth = explosionSprite.width / EXPLOSION_FRAME_COUNT; // 計算爆炸精靈圖單格寬度
  const cycleDuration = LIGHTNING_DURATION * 3 + EXPLOSION_DURATION; // 設定三次閃電加一次爆炸的循環總長度
  const cycleTime = elapsedTime % cycleDuration; // 取得目前位於循環中的時間位置
  const effectCenterX = width * 0.75; // 將特效中心放在距視窗右側四分之一寬的位置

  if (cycleTime < LIGHTNING_DURATION * 3) { // 前三秒連續播放三次閃電
    const lightningTime = cycleTime % LIGHTNING_DURATION; // 取得目前這次閃電內的播放時間
    const lightningFrame = Math.min(LIGHTNING_FRAME_COUNT - 1, Math.floor(lightningTime / LIGHTNING_DURATION * LIGHTNING_FRAME_COUNT)); // 計算目前閃電影格
    const strikeIndex = Math.floor(elapsedTime / cycleDuration) * 3 + Math.floor(cycleTime / LIGHTNING_DURATION); // 計算目前閃電在循環中的序號
    if (strikeIndex !== lastThunderStrikeIndex) { // 每次閃電開始時只合成一次雷鳴
      playSynthesizedThunder(); // 播放一次自行合成的雷鳴聲
      lastThunderStrikeIndex = strikeIndex; // 記錄已播放聲音的閃電序號
    } // 結束雷鳴觸發判斷
    const lightningDisplayWidth = lightningFrameWidth * height / lightningSprite.height; // 將閃電高度等比例放大至畫布全高
    image(lightningSprite, effectCenterX - lightningDisplayWidth / 2, 0, lightningDisplayWidth, height, lightningFrame * lightningFrameWidth, 0, lightningFrameWidth, lightningSprite.height); // 從視窗頂端向下繪製目前閃電影格
  } else { // 三次閃電完成後播放一次地面爆炸
    const explosionTime = cycleTime - LIGHTNING_DURATION * 3; // 取得目前爆炸動畫內的播放時間
    const explosionFrame = Math.min(EXPLOSION_FRAME_COUNT - 1, Math.floor(explosionTime / EXPLOSION_DURATION * EXPLOSION_FRAME_COUNT)); // 計算目前爆炸影格
    const explosionDisplayHeight = height / 5; // 設定爆炸顯示高度為畫布高度的五分之一
    const explosionDisplayWidth = explosionFrameWidth * explosionDisplayHeight / explosionSprite.height; // 依爆炸影格原始比例計算顯示寬度
    image(explosionSprite, effectCenterX - explosionDisplayWidth / 2, height - explosionDisplayHeight, explosionDisplayWidth, explosionDisplayHeight, explosionFrame * explosionFrameWidth, 0, explosionFrameWidth, explosionSprite.height); // 在閃電落點的畫面底端繪製藍色爆炸影格
  } // 結束閃電與爆炸影格選擇
} // 結束右側特效播放函式

function playSynthesizedThunder() { // 使用 Web Audio 合成低沉雷鳴而不載入音效檔案
  if (!thunderAudioContext || thunderAudioContext.state !== "running") { // 音訊尚未由使用者操作啟用時
    return; // 等待使用者按鍵啟用音訊後再播放
  } // 結束音訊狀態檢查
  const duration = 1.2; // 設定每次雷鳴音效長度
  const sampleRate = thunderAudioContext.sampleRate; // 取得音訊取樣率
  const sampleCount = Math.floor(sampleRate * duration); // 計算雷鳴音訊的取樣數量
  const noiseBuffer = thunderAudioContext.createBuffer(1, sampleCount, sampleRate); // 建立單聲道雷鳴雜訊緩衝區
  const noiseSamples = noiseBuffer.getChannelData(0); // 取得雜訊緩衝區的取樣資料
  let brownNoise = 0; // 初始化低頻棕色雜訊狀態
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) { // 逐一合成雷鳴雜訊取樣
    brownNoise = (brownNoise + (Math.random() * 2 - 1) * 0.025) / 1.025; // 平滑白雜訊以產生低頻雷聲質感
    const sampleTime = sampleIndex / sampleRate; // 計算目前取樣時間
    const fade = Math.min(1, sampleTime / 0.04) * Math.exp(-sampleTime * 2.8); // 加上快速起音與緩慢衰減包絡
    noiseSamples[sampleIndex] = Math.max(-1, Math.min(1, brownNoise * 30 * fade)); // 限制振幅並寫入雷鳴取樣
  } // 結束雷鳴雜訊合成迴圈
  const startTime = thunderAudioContext.currentTime; // 取得雷鳴音效的開始時間
  const noiseSource = thunderAudioContext.createBufferSource(); // 建立播放低頻雜訊的音源
  const lowPassFilter = thunderAudioContext.createBiquadFilter(); // 建立低通濾波器讓聲音更低沉
  const noiseGain = thunderAudioContext.createGain(); // 建立雜訊音量控制節點
  noiseSource.buffer = noiseBuffer; // 將合成好的雷鳴雜訊設定為音源
  lowPassFilter.type = "lowpass"; // 設定濾波器為低通模式
  lowPassFilter.frequency.setValueAtTime(220, startTime); // 限制雜訊高頻以模擬遠雷
  noiseGain.gain.setValueAtTime(0.0001, startTime); // 設定雜訊起始音量接近靜音
  noiseGain.gain.linearRampToValueAtTime(0.75, startTime + 0.04); // 快速提高雜訊音量形成雷聲起音
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // 逐漸衰減雜訊形成雷聲尾音
  noiseSource.connect(lowPassFilter); // 將雜訊音源連接至低通濾波器
  lowPassFilter.connect(noiseGain); // 將濾波後的雜訊連接至音量控制
  noiseGain.connect(thunderAudioContext.destination); // 將雜訊音量控制連接至喇叭輸出
  noiseSource.start(startTime); // 開始播放合成的低頻雷鳴雜訊
  const rumbleOscillator = thunderAudioContext.createOscillator(); // 建立深沉的低頻雷鳴振盪器
  const rumbleGain = thunderAudioContext.createGain(); // 建立低頻雷鳴音量控制節點
  rumbleOscillator.type = "sine"; // 使用正弦波產生平滑低頻轟鳴
  rumbleOscillator.frequency.setValueAtTime(54, startTime); // 設定低頻雷鳴起始音高
  rumbleOscillator.frequency.exponentialRampToValueAtTime(36, startTime + duration); // 讓低頻音高逐漸下降
  rumbleGain.gain.setValueAtTime(0.0001, startTime); // 設定低頻雷鳴起始音量接近靜音
  rumbleGain.gain.linearRampToValueAtTime(0.18, startTime + 0.05); // 快速提高低頻音量
  rumbleGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // 逐漸衰減低頻音量
  rumbleOscillator.connect(rumbleGain); // 將低頻振盪器連接至音量控制
  rumbleGain.connect(thunderAudioContext.destination); // 將低頻雷鳴連接至喇叭輸出
  rumbleOscillator.start(startTime); // 開始播放低頻雷鳴
  rumbleOscillator.stop(startTime + duration); // 在音效結束時停止低頻振盪器
} // 結束合成雷鳴音效函式

function keyPressed() { // 使用者按鍵時解除瀏覽器對音訊播放的限制
  if (thunderAudioContext && thunderAudioContext.state !== "running") { // 音訊環境尚未啟動時
    thunderAudioContext.resume(); // 在使用者按鍵手勢中明確啟動音訊環境
  } // 結束音訊環境恢復判斷
  userStartAudio(); // 啟用 p5.sound 音訊環境以播放合成雷鳴
} // 結束音訊啟用函式

function windowResized() { // 視窗尺寸改變時重新調整畫布
  resizeCanvas(windowWidth, windowHeight); // 將畫布調整為最新視窗大小
} // 結束視窗尺寸調整函式

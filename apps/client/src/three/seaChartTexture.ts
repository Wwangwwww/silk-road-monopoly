/**
 * 复古海图纹理生成器
 *
 * 用 Canvas 程序化绘制一张"羊皮纸"风格的历史航海图，
 * 作为棋盘中心海面的背景纹理：
 *   - 泛黄羊皮纸底色 + 斑驳渍痕
 *   - 手绘波浪花纹
 *   - 帆船 / 章鱼海怪 / 鲸鱼等复古装饰图案
 *   - 各海域名称与趣味标注
 *   - 边缘暗角（vignette）
 *
 * 无需任何外部图片资源，离线可用，风格统一。
 */
import * as THREE from 'three';

const SIZE = 1024;
/** 世界坐标 → 画布坐标（圆环棋盘覆盖约 ±12.5） */
function toCanvas(x: number, z: number): [number, number] {
  const scale = SIZE / 25;
  return [x * scale + SIZE / 2, z * scale + SIZE / 2];
}

/** 简笔帆船 */
function drawShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string,
  sail = 'rgba(250,246,232,0.92)'
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(0.32);

  // 船身
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-42, 4);
  ctx.quadraticCurveTo(-32, 22, -4, 24);
  ctx.lineTo(38, 12);
  ctx.quadraticCurveTo(42, 5, 18, 3);
  ctx.closePath();
  ctx.fill();

  // 桅杆
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-2, 18);
  ctx.lineTo(-2, -42);
  ctx.stroke();

  // 主帆
  ctx.fillStyle = sail;
  ctx.beginPath();
  ctx.moveTo(0, -38);
  ctx.quadraticCurveTo(28, -24, 4, -4);
  ctx.closePath();
  ctx.fill();

  // 三角帆
  ctx.beginPath();
  ctx.moveTo(-2, -36);
  ctx.quadraticCurveTo(-26, -18, -6, 0);
  ctx.closePath();
  ctx.fill();

  // 旗
  ctx.fillStyle = '#b03a2e';
  ctx.beginPath();
  ctx.moveTo(-2, -42);
  ctx.lineTo(14, -37);
  ctx.lineTo(-2, -33);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 章鱼海怪（触手从海面伸出） */
function drawKraken(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.35;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    ctx.strokeStyle = 'rgba(88,68,58,0.5)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(dx * 10, dy * 10);
    ctx.bezierCurveTo(dx * 30, dy * 32, dx * 48, dy * 40, dx * 56, dy * 60);
    ctx.stroke();
    ctx.fillStyle = 'rgba(88,68,58,0.5)';
    ctx.beginPath();
    ctx.arc(dx * 60, dy * 62, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // 身体
  ctx.fillStyle = 'rgba(100,78,68,0.6)';
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();
  // 眼睛
  ctx.fillStyle = 'rgba(25,18,12,0.75)';
  ctx.beginPath();
  ctx.arc(-5.5, -4, 3, 0, Math.PI * 2);
  ctx.arc(5.5, -4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 鲸鱼（露出水面 + 喷水） */
function drawWhale(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(66,98,118,0.5)';
  // 背脊（用 arc + scale 模拟椭圆，兼容所有环境）
  ctx.beginPath();
  ctx.scale(1, 0.42);
  ctx.arc(0, 0, 36, 0, Math.PI);
  ctx.scale(1, 1 / 0.42);
  ctx.closePath();
  ctx.fill();
  // 尾鳍
  ctx.beginPath();
  ctx.moveTo(32, -5);
  ctx.quadraticCurveTo(46, -18, 56, -8);
  ctx.quadraticCurveTo(47, -3, 33, -2);
  ctx.closePath();
  ctx.fill();
  // 喷水
  ctx.strokeStyle = 'rgba(205,228,238,0.75)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-16, -14);
  ctx.quadraticCurveTo(-14, -32, -20, -44);
  ctx.moveTo(-16, -14);
  ctx.quadraticCurveTo(-6, -30, -4, -46);
  ctx.moveTo(-16, -14);
  ctx.quadraticCurveTo(-22, -30, -34, -40);
  ctx.stroke();
  ctx.restore();
}

/** 手写体标注文字 */
function drawChartText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  rotateDeg: number,
  color = 'rgba(92,62,28,0.68)'
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotateDeg * Math.PI) / 180);
  ctx.fillStyle = color;
  ctx.font = `${size}px "KaiTi","STKaiti","楷体","Kaiti SC",serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** 圆角矩形路径 */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 卷轴横幅式大标题 */
function drawBannerTitle(ctx: CanvasRenderingContext2D, cx: number, cy: number, title: string, subtitle: string) {
  const w = 440;
  const h = 84;
  ctx.save();
  ctx.translate(cx, cy);
  // 半透明底板
  ctx.fillStyle = 'rgba(120,88,44,0.18)';
  roundRectPath(ctx, -w / 2, -h / 2, w, h, 12);
  ctx.fill();
  // 上下装饰边线
  ctx.strokeStyle = 'rgba(120,88,44,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 12, -h / 2 + 10);
  ctx.lineTo(w / 2 - 12, -h / 2 + 10);
  ctx.moveTo(-w / 2 + 12, h / 2 - 10);
  ctx.lineTo(w / 2 - 12, h / 2 - 10);
  ctx.stroke();
  // 中文标题
  ctx.fillStyle = 'rgba(80,50,18,0.82)';
  ctx.font = '46px "KaiTi","STKaiti","楷体","Kaiti SC",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 0, -4);
  // 英文小字
  ctx.fillStyle = 'rgba(120,88,44,0.6)';
  ctx.font = '12px Georgia, "Times New Roman", serif';
  ctx.fillText(subtitle, 0, h / 2 - 22);
  ctx.restore();
}

/** 港口标记：外圈 + 红点 + 港名 */
function drawPortMark(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, size = 16) {
  ctx.save();
  ctx.strokeStyle = 'rgba(92,62,28,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(160,45,30,0.75)';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(70,45,20,0.78)';
  ctx.font = '13px "KaiTi","STKaiti","楷体",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, x, y + size + 10);
  ctx.restore();
}

/** 郑和宝船（多桅大帆船） */
function drawTreasureShip(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // 船身
  ctx.fillStyle = 'rgba(110,60,30,0.8)';
  ctx.beginPath();
  ctx.moveTo(-56, 4);
  ctx.quadraticCurveTo(-40, 26, -5, 30);
  ctx.lineTo(50, 14);
  ctx.quadraticCurveTo(56, 4, 24, 2);
  ctx.closePath();
  ctx.fill();
  // 甲板线
  ctx.strokeStyle = 'rgba(80,40,20,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-44, 8);
  ctx.lineTo(48, 8);
  ctx.moveTo(-36, 14);
  ctx.lineTo(44, 14);
  ctx.stroke();
  // 三根桅杆
  ctx.strokeStyle = 'rgba(80,40,20,0.8)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-30, 14);
  ctx.lineTo(-30, -52);
  ctx.moveTo(0, 14);
  ctx.lineTo(0, -60);
  ctx.moveTo(30, 14);
  ctx.lineTo(30, -48);
  ctx.stroke();
  // 三面帆
  ctx.fillStyle = 'rgba(250,246,232,0.85)';
  for (const [sx, sw, sh] of [
    [-30, 26, 40],
    [0, 32, 48],
    [30, 24, 36],
  ]) {
    ctx.beginPath();
    ctx.moveTo(sx, -sh + 6);
    ctx.quadraticCurveTo(sx + sw * 0.6, -sh / 2, sx + 4, 8);
    ctx.closePath();
    ctx.fill();
  }
  // 船尾旗
  ctx.fillStyle = 'rgba(170,51,51,0.85)';
  ctx.beginPath();
  ctx.moveTo(-30, -52);
  ctx.lineTo(-16, -47);
  ctx.lineTo(-30, -43);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 海豚（跃出海面） */
function drawDolphin(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = 'rgba(80,110,130,0.6)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.quadraticCurveTo(0, -24, 26, -10);
  ctx.quadraticCurveTo(38, -4, 44, -6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.lineTo(-42, -8);
  ctx.moveTo(-30, 0);
  ctx.lineTo(-42, 6);
  ctx.stroke();
  // 水花
  ctx.strokeStyle = 'rgba(120,160,180,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-42, 8);
  ctx.quadraticCurveTo(-36, 16, -42, 22);
  ctx.moveTo(-50, 6);
  ctx.quadraticCurveTo(-44, 14, -50, 20);
  ctx.stroke();
  ctx.restore();
}

/** 海蛇（S 形蜿蜒） */
function drawSeaSerpent(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = 'rgba(60,100,90,0.65)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-42, 8);
  ctx.bezierCurveTo(-20, -20, 0, -20, 20, 8);
  ctx.bezierCurveTo(32, 22, 42, 22, 52, 8);
  ctx.stroke();
  // 头
  ctx.fillStyle = 'rgba(60,100,90,0.65)';
  ctx.beginPath();
  ctx.arc(52, 8, 5.5, 0, Math.PI * 2);
  ctx.fill();
  // 分叉舌
  ctx.strokeStyle = 'rgba(200,80,60,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(57, 6);
  ctx.lineTo(64, 3);
  ctx.moveTo(57, 10);
  ctx.lineTo(64, 13);
  ctx.stroke();
  ctx.restore();
}

/** 灯塔图案 */
function drawLighthouseMark(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // 塔身
  ctx.fillStyle = 'rgba(210,190,150,0.8)';
  ctx.beginPath();
  ctx.moveTo(-10, 30);
  ctx.lineTo(-7, -22);
  ctx.lineTo(7, -22);
  ctx.lineTo(10, 30);
  ctx.closePath();
  ctx.fill();
  // 红条纹
  ctx.fillStyle = 'rgba(170,60,50,0.7)';
  ctx.fillRect(-8.2, -6, 16.4, 9);
  // 灯室
  ctx.fillStyle = 'rgba(255,220,130,0.9)';
  ctx.fillRect(-7, -31, 14, 9);
  // 光晕
  ctx.fillStyle = 'rgba(255,220,130,0.22)';
  ctx.beginPath();
  ctx.arc(0, -26, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 罗经花（小罗盘图标） */
function drawCompassMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(92,62,28,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    const main = i % 4 === 0;
    ctx.fillStyle = main ? 'rgba(180,40,30,0.7)' : 'rgba(92,62,28,0.55)';
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * size * 0.9, Math.sin(ang) * size * 0.9);
    ctx.lineTo(Math.cos(ang + Math.PI / 2) * size * 0.2, Math.sin(ang + Math.PI / 2) * size * 0.2);
    ctx.lineTo(-Math.cos(ang) * size * 0.2, -Math.sin(ang) * size * 0.2);
    ctx.lineTo(Math.cos(ang - Math.PI / 2) * size * 0.2, Math.sin(ang - Math.PI / 2) * size * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** 四角涡旋花饰 */
function drawCornerOrnament(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(92,62,28,0.4)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, size - i * 6, i * 0.6, i * 0.6 + Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(92,62,28,0.45)';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 季风箭头 */
function drawWindArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo((x1 + x2) / 2, y1 + (y2 - y1) * 0.3, x2, y2);
  ctx.stroke();
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 12 * Math.cos(ang - 0.5), y2 - 12 * Math.sin(ang - 0.5));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 12 * Math.cos(ang + 0.5), y2 - 12 * Math.sin(ang + 0.5));
  ctx.stroke();
  ctx.restore();
}

/** 中心蓝色海洋区域（开放海域：深蓝渐变 + 手绘波纹），供古代商船队停泊 */
function drawOceanCenter(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  // 深蓝渐变底色
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  grad.addColorStop(0, 'rgba(18,74,112,0.62)');
  grad.addColorStop(0.65, 'rgba(28,96,136,0.5)');
  grad.addColorStop(1, 'rgba(44,116,156,0.32)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  // 手绘波纹圈
  for (let i = 0; i < 4; i++) {
    const baseR = (rx / 4.2) * (i + 1);
    ctx.strokeStyle = `rgba(160,214,238,${0.3 - i * 0.05})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2; a += 0.12) {
      const rr = baseR + Math.sin(a * 3 + i * 1.7) * (6 - i);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** 海上丝绸之路主要停靠港（圆环棋盘上的世界坐标 → 用于背景航线与港口标注） */
const SILK_PORTS: { x: number; z: number; name: string }[] = [
  { x: 0, z: -11, name: '泉州' },
  { x: 7.78, z: -7.78, name: '广州' },
  { x: 10.86, z: 1.72, name: '占城' },
  { x: 6.47, z: 8.9, name: '满剌加' },
  { x: -3.4, z: 10.46, name: '锡兰' },
  { x: -7.78, z: 7.78, name: '古里' },
  { x: -10.86, z: -1.72, name: '忽鲁谟斯' },
  { x: -8.9, z: -6.47, name: '亚丁' },
  { x: -6.47, z: -8.9, name: '亚历山大' },
  { x: -1.72, z: -10.87, name: '威尼斯' },
];

/** 生成复古海图纹理 */
export function createSeaChartTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  // ============ 羊皮纸底色 ============
  const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  bg.addColorStop(0, '#ecdcc2');
  bg.addColorStop(0.5, '#dec9a0');
  bg.addColorStop(1, '#d2bb90');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 斑驳颗粒
  for (let i = 0; i < 2800; i++) {
    const a = Math.random() * 0.05 + 0.02;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(122,90,50,${a})` : `rgba(255,252,238,${a})`;
    ctx.beginPath();
    ctx.arc(Math.random() * SIZE, Math.random() * SIZE, Math.random() * 4 + 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // 大块渍痕
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `rgba(112,84,46,${Math.random() * 0.045})`;
    ctx.beginPath();
    ctx.arc(Math.random() * SIZE, Math.random() * SIZE, Math.random() * 70 + 26, 0, Math.PI * 2);
    ctx.fill();
  }

  // ============ 手绘波浪花纹 ============
  ctx.lineCap = 'round';
  for (let i = 0; i < 34; i++) {
    const y = Math.random() * SIZE;
    ctx.strokeStyle = `rgba(64,104,132,${Math.random() * 0.17 + 0.08})`;
    ctx.lineWidth = Math.random() * 2 + 1;
    ctx.beginPath();
    ctx.moveTo(-50, y);
    const amp = Math.random() * 11 + 4;
    const freq = Math.random() * 0.05 + 0.028;
    const phase = Math.random() * Math.PI * 2;
    for (let x = -50; x <= SIZE + 50; x += 9) {
      ctx.lineTo(x, y + Math.sin(x * freq + phase) * amp);
    }
    ctx.stroke();
  }

  // ============ 区域分隔虚线（内海边界） ============
  ctx.setLineDash([14, 12]);
  ctx.strokeStyle = 'rgba(92,62,28,0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(96, 96, SIZE - 192, SIZE - 192);
  ctx.setLineDash([]);

  // ============ 四角涡旋花饰（古地图装饰） ============
  for (const [ox, oy] of [
    [64, 64],
    [SIZE - 64, 64],
    [64, SIZE - 64],
    [SIZE - 64, SIZE - 64],
  ] as [number, number][]) {
    drawCornerOrnament(ctx, ox, oy, 30);
  }

  // ============ 丝绸之路航线（背景虚线航道）与停靠港标记 ============
  const portCanvas = SILK_PORTS.map((p) => {
    const [cx, cy] = toCanvas(p.x, p.z);
    return { x: cx, y: cy, name: p.name };
  });
  // 航线：按航线顺序连接各港口
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = 'rgba(130,70,40,0.45)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  portCanvas.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  // 港口标记
  for (const p of portCanvas) {
    drawPortMark(ctx, p.x, p.y, p.name);
  }

  // ============ 季风箭头（海上航行关键风向） ============
  drawWindArrow(ctx, 300, 300, 500, 260, 'rgba(60,90,110,0.5)'); // 东北季风
  drawWindArrow(ctx, 620, 780, 780, 720, 'rgba(60,90,110,0.5)'); // 西南季风

  // ============ 装饰图案 ============
  // 中心蓝色海洋 + 古代商船队（开放海域）
  drawOceanCenter(ctx, SIZE / 2, SIZE / 2, 235, 190);
  drawTreasureShip(ctx, SIZE / 2 - 115, SIZE / 2 - 55, 0.5);
  drawShip(ctx, SIZE / 2 + 120, SIZE / 2 + 30, 0.48, 'rgba(92,66,38,0.8)');
  drawShip(ctx, SIZE / 2 + 20, SIZE / 2 + 115, 0.42, 'rgba(78,56,30,0.75)');

  // 外海航行帆船
  const [ship1x, ship1z] = toCanvas(6.2, -5.4); // 南海
  drawShip(ctx, ship1x, ship1z, 0.5, 'rgba(92,66,38,0.75)');
  const [ship2x, ship2z] = toCanvas(-5.6, 2.6); // 阿拉伯海
  drawShip(ctx, ship2x, ship2z, 0.4, 'rgba(78,56,30,0.7)');

  // 海豚（阿拉伯海一侧）
  const [dolphinX, dolphinZ] = toCanvas(-5.2, 4.4);
  drawDolphin(ctx, dolphinX, dolphinZ, 1.1);

  // 海蛇（印度洋东部）
  const [serpentX, serpentZ] = toCanvas(4.6, 3.4);
  drawSeaSerpent(ctx, serpentX, serpentZ, 1.0);

  // 灯塔图案（地中海方向）
  const [lighthouseX, lighthouseZ] = toCanvas(-6.2, -3.4);
  drawLighthouseMark(ctx, lighthouseX, lighthouseZ, 0.9);

  // 小罗经花（地图右上角空白区）
  drawCompassMark(ctx, SIZE - 150, 150, 34);

  // ============ 海域与趣味标注 ============
  const [n1x, n1z] = toCanvas(0, 7.2);
  drawChartText(ctx, '印 度 洋', n1x, n1z, 44, 0);
  const [n2x, n2z] = toCanvas(0, -7.6);
  drawChartText(ctx, '南 海', n2x, n2z, 40, 0);
  const [n3x, n3z] = toCanvas(7.2, 0);
  drawChartText(ctx, '东 南 亚', n3x, n3z, 36, 90);
  const [n4x, n4z] = toCanvas(-7.6, 0);
  drawChartText(ctx, '阿 拉 伯', n4x, n4z, 36, -90);
  const [k1x, k1z] = toCanvas(-0.6, 0.6);
  drawChartText(ctx, '一帆风顺 · 顺风顺水', k1x, k1z, 24, 8, 'rgba(70,95,120,0.55)');
  const [k2x, k2z] = toCanvas(5.2, -1.6);
  drawChartText(ctx, '险礁', k2x, k2z, 30, 14, 'rgba(150,60,30,0.6)');
  const [k3x, k3z] = toCanvas(2.2, 3.6);
  drawChartText(ctx, '季风洋流 →', k3x, k3z, 28, 0, 'rgba(70,95,120,0.6)');
  const [k4x, k4z] = toCanvas(-3.4, -4.4);
  drawChartText(ctx, '帆影点点', k4x, k4z, 28, -12, 'rgba(92,62,28,0.55)');

  // ============ 地图大标题（卷轴横幅，浮于中心蓝色海洋上方） ============
  drawBannerTitle(ctx, SIZE / 2, 358, '海 上 丝 绸 之 路', 'MARITIME SILK ROAD · 郑和七下西洋 · 香料 瓷器 丝绸 宝石');

  // ============ 暗角 ============
  const vg = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.32, SIZE / 2, SIZE / 2, SIZE * 0.74);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(88,58,22,0.3)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

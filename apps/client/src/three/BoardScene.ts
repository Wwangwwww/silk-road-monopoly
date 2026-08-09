/** 海上丝绸之路大富翁 - Three.js 3D 棋盘场景 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { getCellPosition, getTotalCells, CELL_SIZE, CELL_HEIGHT, HALF_WIDTH, BOARD_RADIUS } from './boardLayout';
import { createSeaChartTexture } from './seaChartTexture';

export interface CellData {
  id: string;
  name: string;
  type: string;
  index: number;
  colorGroup?: string;
  basePrice?: number;
  /** 地区文化主题（决定特色建筑风格） */
  theme?: string;
  /** 特色地标建筑类型 */
  landmark?: string;
  /** 港口特产 */
  specialty?: string;
  /** 所属海域/地区 */
  region?: string;
  /** 港口描述 */
  description?: string;
}
export interface BoardPlayer {
  id: string;
  name: string;
  position: number;
  isAI?: boolean;
}
export interface BoardProperty {
  id: string;
  ownerId?: string;
  level?: number;
}

const GROUP_COLOR: Record<string, number> = {
  blue: 0x1e88e5,
  green: 0x43a047,
  orange: 0xfb8c00,
  red: 0xe53935,
  purple: 0x8e24aa,
};
const TYPE_COLOR: Record<string, number> = {
  start_port: 0x00838f,
  port: 0x4fc3f7,
  chance: 0x26a69a,
  fate: 0x26a69a,
  tax: 0x78909c,
  jail: 0x6d4c41,
  go_to_jail: 0x5d4037,
  free_port: 0x7cb342,
};
const TYPE_ICON: Record<string, string> = {
  start_port: '⚓',
  port: '🏛️',
  chance: '🌊',
  fate: '🌀',
  tax: '🧾',
  jail: '⛓️',
  go_to_jail: '🏴‍☠️',
  free_port: '⛵',
};
const SHIP_COLORS = [0xff7043, 0xffca28, 0x66bb6a, 0x29b6f6, 0xab47bc, 0xff5252];

/** 丝绸之路主要停靠港（下标顺序即航线走向），用于绘制中心航线 */
const SILK_ROAD_STOPS = [0, 5, 11, 16, 22, 25, 31, 34, 36, 39];

export class BoardScene {
  private renderer!: THREE.WebGLRenderer;
  private cssRenderer!: CSS2DRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private container: HTMLElement;
  private rafId = 0;
  private clock = new THREE.Clock();
  private cellMeshes: THREE.Mesh[] = [];
  private cellLabels: CSS2DObject[] = [];
  private portMarkers = new Map<string, THREE.Group>();
  private ships = new Map<string, THREE.Group>();
  /** 帆船逐格游走的剩余路线（每个元素为要到达的格子下标） */
  private shipPaths = new Map<string, number[]>();
  /** 相机跟随移动船只的状态与恢复视角 */
  private followDir = {
    active: false,
    restorePos: new THREE.Vector3(),
    restoreTarget: new THREE.Vector3(),
  };
  /** 当所有帆船移动结束时的回调 */
  private moveEndCb?: () => void;
  private playerColors = new Map<string, number>();
  private seaMesh!: THREE.Mesh;
  private waveMesh!: THREE.Mesh;
  /** 羊皮纸海图背景平面（棋盘格子下方的地图） */
  private parchmentMesh?: THREE.Mesh;
  private highlightRing!: THREE.Mesh;
  private currentCells: CellData[] = [];
  /** 航海装饰组（罗盘玫瑰、经纬网格、小岛、灯塔） */
  private seaDecor = new THREE.Group();
  /** 丝绸之路航线 */
  private tradeRoute?: THREE.Line;
  /** 灯塔顶部的火光（动画闪烁） */
  private lighthouseLights: THREE.Mesh[] = [];
  /** 罗盘玫瑰（轻微旋转动画） */
  private compassGroup?: THREE.Group;
  /** 沿航线巡航的装饰帆船 */
  private decorativeShips: THREE.Group[] = [];
  private shipRoute?: THREE.CatmullRomCurve3;
  /** 每个格子上的"风景"装饰（海港码头 / 事件图标等，独立于港口建筑） */
  private cellScenery = new Map<string, THREE.Group>();

  constructor(container: HTMLElement) {
    if (!container) throw new Error('BoardScene 需要挂载容器');
    this.container = container;
    this.initRenderer();
    this.initScene();
    // 所有场景元素按"核心→装饰"分层构建；装饰/纹理失败仅降级，绝不导致棋盘消失
    this.safeBuild(() => this.buildSeaAndBoard(), 'buildSeaAndBoard');
    this.safeBuild(() => this.buildSeaDecor(), 'buildSeaDecor');
    this.safeBuild(() => this.buildTradeRoute(), 'buildTradeRoute');
    this.safeBuild(() => this.buildDecorativeShips(), 'buildDecorativeShips');
    this.buildHighlight();
    this.animate();
  }

  /** 安全执行装饰构建：失败仅打印警告，不影响棋盘主体 */
  private safeBuild(fn: () => void, name: string) {
    try {
      fn();
    } catch (e) {
      console.warn(`[BoardScene] ${name} 构建失败（已降级，不影响棋盘）`, e);
    }
  }

  private initRenderer() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x0e7c86, 1);
    this.container.appendChild(this.renderer.domElement);

    this.cssRenderer = new CSS2DRenderer();
    this.cssRenderer.setSize(w, h);
    this.cssRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    this.container.appendChild(this.cssRenderer.domElement);
  }

  private initScene() {
    this.scene = new THREE.Scene();
    const aspect = (this.container.clientWidth || 800) / (this.container.clientHeight || 600);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 200);
    this.camera.position.set(0, 20, 24);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 60;
    this.controls.target.set(0, 0, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(8, 14, 6);
    sun.castShadow = true;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x88ccff, 0.4);
    fill.position.set(-6, 8, -8);
    this.scene.add(fill);
  }

  private buildSeaAndBoard() {
    const inner = HALF_WIDTH + CELL_SIZE * 0.5;

    // ---- 深蓝海面（底座，覆盖整个圆环棋盘及外围）----
    const seaGeom = new THREE.PlaneGeometry(inner * 2.5, inner * 2.5);
    this.seaMesh = new THREE.Mesh(
      seaGeom,
      new THREE.MeshStandardMaterial({ color: 0x0288d1, transparent: true, opacity: 0.82, roughness: 0.35 })
    );
    this.seaMesh.rotation.x = -Math.PI / 2;
    this.seaMesh.position.y = -0.06;
    this.seaMesh.receiveShadow = true;
    this.scene.add(this.seaMesh);

    // ---- 羊皮纸海图背景：覆盖整个圆环棋盘（位于格子下方），
    //      地图纹理创建失败时自动回退为羊皮纸纯色，保证棋盘始终可见 ----
    const chartSize = BOARD_RADIUS * 2 + CELL_SIZE * 2.2;
    let chartMat: THREE.MeshStandardMaterial;
    try {
      chartMat = new THREE.MeshStandardMaterial({
        map: createSeaChartTexture(),
        color: 0xffffff,
        transparent: true,
        opacity: 0.96,
        roughness: 0.85,
      });
    } catch (e) {
      console.warn('[BoardScene] 羊皮纸海图纹理生成失败，使用纯色回退', e);
      chartMat = new THREE.MeshStandardMaterial({ color: 0xe8d9b8, roughness: 0.85 });
    }
    const chart = new THREE.Mesh(new THREE.PlaneGeometry(chartSize, chartSize), chartMat);
    chart.rotation.x = -Math.PI / 2;
    chart.position.y = -0.02;
    this.scene.add(chart);
    this.parchmentMesh = chart;

    // ---- 浅色浪花：叠在羊皮纸上，模拟波光 ----
    this.waveMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(inner * 2.2, inner * 2.2),
      new THREE.MeshStandardMaterial({
        color: 0x6ec8e8,
        transparent: true,
        opacity: 0.15,
        roughness: 0.15,
      })
    );
    this.waveMesh.rotation.x = -Math.PI / 2;
    this.waveMesh.position.y = -0.012;
    this.scene.add(this.waveMesh);

    // ---- 底部平台（深色海水衬托羊皮纸边缘；顶面 y=-0.05，让羊皮纸可见）----
    const size = chartSize + 1;
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(size, 0.4, size),
      new THREE.MeshStandardMaterial({ color: 0x063d4f, roughness: 0.95 })
    );
    platform.position.y = -0.25;
    platform.receiveShadow = true;
    this.scene.add(platform);
  }

  /** 中心海域航海图装饰：经纬网格、罗盘玫瑰、小岛、灯塔 */
  private buildSeaDecor() {
    this.buildLatLongGrid();
    this.buildCompassRose();
    this.buildIslands();
    this.buildCenterLighthouse();
    this.scene.add(this.seaDecor);
  }

  /** 经纬网格线（海图质感） */
  private buildLatLongGrid() {
    const inner = HALF_WIDTH - CELL_SIZE * 0.5;
    const points: number[] = [];
    for (let x = -inner; x <= inner + 0.001; x += CELL_SIZE) {
      points.push(x, 0.02, -inner, x, 0.02, inner);
    }
    for (let z = -inner; z <= inner + 0.001; z += CELL_SIZE) {
      points.push(-inner, 0.02, z, inner, 0.02, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const lines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0xbfe9f5, transparent: true, opacity: 0.14 })
    );
    this.seaDecor.add(lines);
  }

  /** 罗盘玫瑰（经典海图元素） */
  private buildCompassRose() {
    const group = new THREE.Group();
    const R = 2.1;

    // 底座圆盘
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(R, 48),
      new THREE.MeshStandardMaterial({
        color: 0x0a3d5c,
        transparent: true,
        opacity: 0.88,
        roughness: 0.55,
      })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.055;
    group.add(disc);

    // 外圈金环
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(R * 0.9, R * 0.97, 48),
      new THREE.MeshBasicMaterial({ color: 0xc9a227, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    group.add(ring);

    // 八角星花瓣：每 45° 一片菱形花瓣
    for (let i = 0; i < 8; i++) {
      const shape = new THREE.Shape();
      shape.moveTo(0, R * 0.88);
      shape.lineTo(R * 0.1, 0);
      shape.lineTo(0, -R * 0.88);
      shape.lineTo(-R * 0.1, 0);
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateY((i * Math.PI) / 4);
      // 主针（北/南）用金色，其余用蓝白
      const isMain = i === 0 || i === 4;
      const mat = new THREE.MeshBasicMaterial({
        color: isMain ? 0xf2b705 : 0xbfe3f2,
        transparent: true,
        opacity: isMain ? 0.95 : 0.7,
        side: THREE.DoubleSide,
      });
      const petal = new THREE.Mesh(geo, mat);
      petal.rotation.x = -Math.PI / 2;
      petal.position.y = 0.065;
      group.add(petal);
    }

    // 中心圆钮
    const hub = new THREE.Mesh(
      new THREE.CircleGeometry(R * 0.09, 24),
      new THREE.MeshBasicMaterial({ color: 0xf2b705 })
    );
    hub.rotation.x = -Math.PI / 2;
    hub.position.y = 0.07;
    group.add(hub);

    // 方位文字 N / E / S / W
    const dirs = [
      { label: 'N', angle: 0 },
      { label: 'E', angle: Math.PI / 2 },
      { label: 'S', angle: Math.PI },
      { label: 'W', angle: -Math.PI / 2 },
    ];
    for (const d of dirs) {
      const div = document.createElement('div');
      div.className = 'sr-compass-label';
      div.textContent = d.label;
      const label = new CSS2DObject(div);
      const radius = R + 0.55;
      label.position.set(Math.sin(d.angle) * radius, 0.2, -Math.cos(d.angle) * radius);
      group.add(label);
    }

    group.position.y = 0.04;
    this.compassGroup = group;
    this.seaDecor.add(group);
  }

  /** 海域小岛装饰（棕榈岛） */
  private buildIslands() {
    const islands: [number, number, number][] = [
      [-4.6, -3.4, 1.0],
      [3.8, -4.6, 0.8],
      [4.9, 4.2, 1.05],
      [-5.2, 3.9, 0.85],
    ];
    for (const [x, z, s] of islands) {
      const isle = new THREE.Group();

      // 沙丘
      const dune = new THREE.Mesh(
        new THREE.ConeGeometry(1.0, 0.5, 10),
        new THREE.MeshStandardMaterial({ color: 0x8dab5e, roughness: 0.9 })
      );
      dune.position.y = 0.16;
      dune.scale.set(s, 0.55, s);
      isle.add(dune);

      // 棕榈树（树干 + 树冠）
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.09, 0.9, 6),
        new THREE.MeshStandardMaterial({ color: 0x795548 })
      );
      trunk.position.y = 0.35;
      trunk.rotation.z = 0.25;
      isle.add(trunk);

      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
      );
      crown.position.set(0.18, 0.9, 0);
      isle.add(crown);

      isle.position.set(x, 0.02, z);
      isle.scale.setScalar(s);
      this.seaDecor.add(isle);
    }
  }

  /** 中心海域的灯塔（装饰性地标，火光动画） */
  private buildCenterLighthouse() {
    const group = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, 1.0, 10),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5 })
    );
    base.position.y = 0.5;
    group.add(base);

    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.34, 0.28, 10),
      new THREE.MeshStandardMaterial({ color: 0xc62828 })
    );
    stripe.position.y = 0.62;
    group.add(stripe);

    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.32, 0.26, 10),
      new THREE.MeshBasicMaterial({ color: 0xffe082 })
    );
    lantern.position.y = 1.05;
    group.add(lantern);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.34, 10),
      new THREE.MeshStandardMaterial({ color: 0xc62828 })
    );
    roof.position.y = 1.35;
    group.add(roof);

    // 灯塔火光（动画闪烁用）
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.95 })
    );
    light.position.y = 1.06;
    group.add(light);
    this.lighthouseLights.push(light);

    group.position.set(0, 0.02, 4.8);
    this.seaDecor.add(group);
  }

  /** 丝绸之路航线（虚线连接主要停靠港） */
  private buildTradeRoute() {
    const points: THREE.Vector3[] = [];
    for (const idx of SILK_ROAD_STOPS) {
      const { x, z } = getCellPosition(idx);
      // 向棋盘中心方向收拢一点，让航线从格子内侧穿过
      const dirX = x === 0 ? 0 : x > 0 ? -1 : 1;
      const dirZ = z === 0 ? 0 : z > 0 ? -1 : 1;
      points.push(new THREE.Vector3(x + dirX * 0.85, 0.06, z + dirZ * 0.85));
    }
    // 回到起点，形成完整的丝路环线
    points.push(points[0].clone());

    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(220));
    const mat = new THREE.LineDashedMaterial({
      color: 0xf6d365,
      dashSize: 0.42,
      gapSize: 0.3,
      transparent: true,
      opacity: 0.85,
    });
    this.tradeRoute = new THREE.Line(geo, mat);
    this.tradeRoute.computeLineDistances();
    this.scene.add(this.tradeRoute);
  }

  /** 沿丝绸之路航线巡航的装饰小帆船 */
  private buildDecorativeShips() {
    // 构建与航线条相同的闭合曲线
    const points: THREE.Vector3[] = [];
    for (const idx of SILK_ROAD_STOPS) {
      const { x, z } = getCellPosition(idx);
      const dirX = x === 0 ? 0 : x > 0 ? -1 : 1;
      const dirZ = z === 0 ? 0 : z > 0 ? -1 : 1;
      points.push(new THREE.Vector3(x + dirX * 0.85, 0.08, z + dirZ * 0.85));
    }
    if (points.length < 2) return;
    this.shipRoute = new THREE.CatmullRomCurve3(points, false, 'centripetal');

    for (let i = 0; i < 2; i++) {
      const ship = this.buildMiniShip(SHIP_COLORS[i] ?? 0xff7043);
      // 使用参数化 t（0~1）巡航，避免 getLength/getPointAt 的弧长数值问题
      ship.userData.routeT = i * 0.5;
      ship.userData.speed = 0.012 + i * 0.005;
      this.decorativeShips.push(ship);
      this.scene.add(ship);
    }
  }

  /** 小帆船模型（用于装饰巡航） */
  private buildMiniShip(sailColor: number): THREE.Group {
    const g = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7 });
    const sailMat = new THREE.MeshStandardMaterial({ color: sailColor, side: THREE.DoubleSide, roughness: 0.6 });

    // 船身
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.22), hullMat);
    hull.position.y = 0.06;
    g.add(hull);
    const prow = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 4), hullMat);
    prow.rotation.z = -Math.PI / 2;
    prow.position.set(0.36, 0.06, 0);
    g.add(prow);

    // 桅杆
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), hullMat);
    mast.position.set(0, 0.3, 0);
    g.add(mast);

    // 主帆
    const main = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.3), sailMat);
    main.position.set(0.06, 0.34, 0);
    g.add(main);

    // 侧帆
    const side = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), sailMat);
    side.position.set(-0.08, 0.28, 0.12);
    side.rotation.x = 0.5;
    g.add(side);

    // 顶部小旗
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.07),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    flag.position.set(0.03, 0.52, 0);
    g.add(flag);

    return g;
  }

  buildBoard(cells: CellData[]) {
    this.clearCells();
    this.currentCells = cells;
    for (let i = 0; i < getTotalCells(); i++) {
      const { x, z } = getCellPosition(i);
      const cell = cells.find((c) => c.index === i);
      const color = this.resolveCellColor(cell);

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(CELL_SIZE * 0.96, CELL_HEIGHT, CELL_SIZE * 0.96),
        new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05 })
      );
      mesh.position.set(x, CELL_HEIGHT / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.cellMeshes[i] = mesh;

      const top = new THREE.Mesh(
        new THREE.BoxGeometry(CELL_SIZE * 0.9, 0.02, CELL_SIZE * 0.9),
        new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.06 })
      );
      top.position.y = CELL_HEIGHT / 2 + 0.012;
      top.receiveShadow = true;
      mesh.add(top);

      // 顶面边框色带：沿格子边缘的浅色窄条，让格子更有"面板"感
      const barMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
      });
      const edge = (CELL_SIZE * 0.94) / 2;
      const barLen = CELL_SIZE * 0.94;
      const bars = [
        new THREE.Mesh(new THREE.BoxGeometry(barLen, 0.02, 0.05), barMat),
        new THREE.Mesh(new THREE.BoxGeometry(barLen, 0.02, 0.05), barMat),
        new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, barLen), barMat),
        new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, barLen), barMat),
      ];
      const barY = CELL_HEIGHT / 2 + 0.025;
      bars[0].position.set(0, barY, edge);
      bars[1].position.set(0, barY, -edge);
      bars[2].position.set(edge, barY, 0);
      bars[3].position.set(-edge, barY, 0);
      bars.forEach((b) => mesh.add(b));

      const div = document.createElement('div');
      div.className = 'sr-cell-label';
      const icon = cell ? (TYPE_ICON[cell.type] ?? '') : '';
      const price = cell?.basePrice ? `<div class="sr-cell-price">${cell.basePrice}</div>` : '';
      div.innerHTML =
        `<div class="sr-cell-icon">${icon}</div>` + `<div class="sr-cell-name">${cell?.name ?? i}</div>` + price;
      const label = new CSS2DObject(div);
      label.position.set(x, CELL_HEIGHT + 0.35, z);
      this.scene.add(label);
      this.cellLabels.push(label);

      // 港口 / 起点格：摆放特色地标（无主时的灰色轮廓预览）
      if (cell && (cell.type === 'port' || cell.type === 'start_port')) {
        const landmark = this.buildPortLandmark(cell, undefined, 0);
        landmark.position.set(x, CELL_HEIGHT, z);
        this.scene.add(landmark);
        this.portMarkers.set(cell.id, landmark);
      } else if (cell) {
        // 特殊格装饰（自由停泊浮标 / 海盗岛骷髅 / 海盗伏击旗）
        const decor = this.buildSpecialCellDecor(cell);
        if (decor) {
          decor.position.set(x, CELL_HEIGHT, z);
          this.scene.add(decor);
          this.portMarkers.set(cell.id, decor);
        }
      }

      // 每个格子的"风景"装饰（海港码头 / 事件图标等）
      if (cell) {
        this.buildCellScenery(cell, x, z);
      }
    }
  }

  /** 特殊格的主题装饰：公海浮标、海盗岛骷髅、海盗伏击骷髅旗 */
  private buildSpecialCellDecor(cell: CellData): THREE.Group | null {
    const g = new THREE.Group();
    if (cell.type === 'free_port') {
      // 红白浮标
      const buoy = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.6 })
      );
      buoy.scale.y = 0.85;
      buoy.position.y = 0.22;
      g.add(buoy);
      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.14, 12),
        new THREE.MeshStandardMaterial({ color: 0xf5f5f5 })
      );
      stripe.position.y = 0.2;
      g.add(stripe);
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.95 })
      );
      light.position.y = 0.4;
      g.add(light);
      this.lighthouseLights.push(light);
      return g;
    }
    if (cell.type === 'jail') {
      // 海盗黑屋 + 骷髅头
      const hut = this.buildBox(0.55, 0.4, 0.5, 0x3e2723, 0, 0.22, 0);
      g.add(hut);
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 0.26, 4),
        new THREE.MeshStandardMaterial({ color: 0x1b1b1b })
      );
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 0.52;
      g.add(roof);
      const skull = this.buildSphere(0.12, 0xf5f5f5, 0, 0.68, 0);
      g.add(skull);
      return g;
    }
    if (cell.type === 'go_to_jail') {
      // 骷髅旗杆
      const pole = this.buildCylinder(0.04, 0.05, 0.85, 0x5d4037, 0, 0.5, 0);
      g.add(pole);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.32),
        new THREE.MeshStandardMaterial({ color: 0x1b1b1b, side: THREE.DoubleSide })
      );
      flag.position.set(0.24, 0.85, 0);
      flag.rotation.y = Math.PI / 2.4;
      g.add(flag);
      const skull = this.buildSphere(0.06, 0xf5f5f5, 0.24, 0.85, 0.01);
      g.add(skull);
      return g;
    }
    return null;
  }

  // ==================== 格子"风景"装饰（独立于港口建筑） ====================

  /** 为每个格子添加风景装饰（海港码头 / 事件图标等），构建一次，升级重建港口建筑时不受影响 */
  private buildCellScenery(cell: CellData, x: number, z: number) {
    const g = new THREE.Group();
    if (cell.type === 'port' || cell.type === 'start_port') {
      this.buildHarborScenery(g);
    } else if (cell.type === 'chance') {
      this.buildChanceScenery(g);
    } else if (cell.type === 'fate') {
      this.buildFateScenery(g);
    } else if (cell.type === 'tax') {
      this.buildTaxScenery(g);
    } else {
      return; // jail / go_to_jail / free_port 已由 buildSpecialCellDecor 提供装饰
    }
    g.position.set(x, CELL_HEIGHT, z);
    this.scene.add(g);
    this.cellScenery.set(cell.id, g);
  }

  /** 海港码头风景：木栈桥 + 木桩 + 停靠小船 + 货箱 + 系缆柱（位于格子边缘，不遮挡中心地标） */
  private buildHarborScenery(g: THREE.Group) {
    const wood = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.85 });
    const woodLight = new THREE.MeshStandardMaterial({ color: 0xa1887f, roughness: 0.8 });

    // 木栈桥（延伸向格子一角）
    const pier = this.buildBox(0.56, 0.05, 0.2, 0x8d6e63, 0.5, 0.025, 0.55);
    g.add(pier);
    for (let i = -1; i <= 1; i++) {
      g.add(this.buildBox(0.56, 0.025, 0.045, 0xa1887f, 0.5, 0.065, 0.55 + i * 0.055));
    }
    // 栈桥木桩
    for (const [px, pz] of [
      [0.32, 0.55],
      [0.68, 0.55],
      [0.5, 0.42],
    ] as [number, number][]) {
      g.add(this.buildCylinder(0.04, 0.05, 0.18, 0x8d6e63, px, 0.09, pz));
    }
    // 系缆柱
    g.add(this.buildCylinder(0.05, 0.06, 0.13, 0xa1887f, 0.12, 0.065, 0.72));

    // 停靠小帆船（格子角落）
    const boat = this.buildMiniShip(0xff7043);
    boat.scale.setScalar(0.55);
    boat.position.set(0.68, 0.02, -0.55);
    boat.rotation.y = 1.1;
    g.add(boat);

    // 货箱堆
    g.add(this.buildBox(0.16, 0.14, 0.16, 0x6d4c41, -0.62, 0.07, -0.58));
    const crate2 = this.buildBox(0.14, 0.12, 0.14, 0x8d3b24, -0.7, 0.06, -0.66);
    crate2.rotation.y = 0.4;
    g.add(crate2);

    // 渔桶
    g.add(this.buildCylinder(0.07, 0.07, 0.14, 0xa1887f, -0.55, 0.07, -0.72));
  }

  /** 航海事件格：小漩涡 + 指南针图标 */
  private buildChanceScenery(g: THREE.Group) {
    // 漩涡（扁平锥 + 半透明）
    const whirl = this.buildCone(0.34, 0.18, 0x0288d1, 0, 0.09, 0);
    (whirl.material as THREE.MeshStandardMaterial).transparent = true;
    (whirl.material as THREE.MeshStandardMaterial).opacity = 0.55;
    (whirl.material as THREE.MeshStandardMaterial).needsUpdate = true;
    g.add(whirl);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.23, 20),
      new THREE.MeshBasicMaterial({ color: 0x80deea, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    g.add(ring);

    // 指南针小图标（格子一角）
    g.add(this.buildCylinder(0.12, 0.12, 0.03, 0xc9a227, -0.46, 0.04, -0.46));
    g.add(this.buildCone(0.035, 0.18, 0xb03a2e, -0.46, 0.13, -0.46));
  }

  /** 贸易事件格：货箱堆 + 金币堆 */
  private buildFateScenery(g: THREE.Group) {
    g.add(this.buildBox(0.16, 0.14, 0.16, 0x795548, -0.42, 0.07, -0.42));
    const c2 = this.buildBox(0.15, 0.13, 0.15, 0x6d4c41, -0.56, 0.065, -0.54);
    c2.rotation.y = 0.5;
    g.add(c2);
    // 金币堆
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const coin = this.buildCylinder(
        0.05,
        0.05,
        0.018,
        0xffd54f,
        0.46 + Math.cos(a) * 0.07,
        0.03 + Math.floor(i / 2) * 0.026,
        0.46 + Math.sin(a) * 0.07
      );
      g.add(coin);
    }
  }

  /** 税格：税关棚屋 + 木桌天秤 */
  private buildTaxScenery(g: THREE.Group) {
    // 小棚屋
    g.add(this.buildBox(0.4, 0.26, 0.34, 0xa1887f, -0.35, 0.15, -0.35));
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.2, 4),
      new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.8 })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.set(-0.35, 0.36, -0.35);
    g.add(roof);
    // 木桌 + 天秤
    g.add(this.buildBox(0.26, 0.12, 0.2, 0xa1887f, 0.42, 0.06, 0.42));
    g.add(this.buildCylinder(0.06, 0.06, 0.02, 0xc9a227, 0.42, 0.15, 0.42));
  }

  private resolveCellColor(cell: CellData | undefined): number {
    if (!cell) return 0x37474f;
    if (cell.type === 'port' && cell.colorGroup && GROUP_COLOR[cell.colorGroup]) {
      return GROUP_COLOR[cell.colorGroup];
    }
    return TYPE_COLOR[cell.type] ?? 0x37474f;
  }

  // ==================== 港口特色建筑（海上丝绸之路沿线各地风格） ====================

  /** 构建港口地标：码头石台 + 主题建筑 + 可选所有者旗帜 */
  private buildPortLandmark(cell: CellData, ownerColor: number | undefined, level: number): THREE.Group {
    const grp = new THREE.Group();

    // 码头石台
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.1, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.85 })
    );
    platform.position.y = 0.05;
    platform.castShadow = true;
    grp.add(platform);

    // 主题建筑本体
    const building = this.buildStyleBuilding(cell.landmark, cell.theme, level, ownerColor);
    if (building) grp.add(building);

    // 所有者旗帜
    if (ownerColor) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x8d6e63 })
      );
      pole.position.set(0.42, 0.36, -0.28);
      grp.add(pole);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, 0.17),
        new THREE.MeshStandardMaterial({ color: ownerColor, side: THREE.DoubleSide })
      );
      flag.position.set(0.55, 0.52, -0.28);
      grp.add(flag);
    }

    return grp;
  }

  /** 按地标类型分发到各风格构建器 */
  private buildStyleBuilding(
    landmark: string | undefined,
    theme: string | undefined,
    level: number,
    owner: number | undefined
  ): THREE.Group | null {
    switch (landmark) {
      case 'chinese_pagoda':
        return this.buildChinesePagoda(level);
      case 'chinese_minaret':
        return this.buildChineseMinaret(level);
      case 'cham_tower':
        return this.buildChamTower(level);
      case 'malay_mosque':
        return this.buildMalayMosque(level);
      case 'stupa':
        return this.buildStupa(level);
      case 'palace_dome':
        return this.buildPalaceDome(level);
      case 'arabian_minaret':
        return this.buildArabianMinaret(level);
      case 'volcano_lighthouse':
      case 'pharos':
        return this.buildLighthouse(level);
      case 'campanile':
        return this.buildCampanile(level);
      default:
        return this.buildGenericMarket(level);
    }
  }

  /** 中式宝塔（泉州开元寺东西塔风格） */
  private buildChinesePagoda(level: number): THREE.Group {
    const g = new THREE.Group();
    const floors = 2 + Math.min(level, 3); // 2~5 层
    const floorH = 0.28;
    for (let f = 0; f < floors; f++) {
      const w = 0.56 - f * 0.08;
      const y0 = f * floorH;
      g.add(this.buildBox(w, floorH * 0.66, w, 0xb71c1c, 0, y0 + floorH * 0.33, 0));
      // 金色飞檐
      const eave = new THREE.Mesh(
        new THREE.CylinderGeometry(w * 0.8, w * 0.88, 0.05, 8),
        new THREE.MeshStandardMaterial({ color: 0xf9a825, roughness: 0.4 })
      );
      eave.position.set(0, y0 + floorH * 0.72, 0);
      g.add(eave);
    }
    // 塔刹
    g.add(this.buildCone(0.09, 0.34, 0xffd54f, 0, floors * floorH + 0.08, 0));
    g.add(this.buildSphere(0.06, 0xffd54f, 0, floors * floorH + 0.3, 0));
    return g;
  }

  /** 中式光塔（广州怀圣寺光塔风格） */
  private buildChineseMinaret(level: number): THREE.Group {
    const g = new THREE.Group();
    const h = 0.85 + level * 0.13;
    g.add(this.buildCylinder(0.2, 0.28, h, 0xeceff1, 0, h / 2, 0));
    g.add(this.buildCylinder(0.16, 0.2, 0.22, 0xffe082, 0, h + 0.1, 0));
    g.add(this.buildCone(0.2, 0.22, 0xc62828, 0, h + 0.3, 0));
    return g;
  }

  /** 占婆塔（占城）—— 砖红阶梯塔 */
  private buildChamTower(level: number): THREE.Group {
    const g = new THREE.Group();
    const tiers = 2 + Math.min(level, 2);
    for (let t = 0; t < tiers; t++) {
      const w = 0.5 - t * 0.11;
      g.add(this.buildBox(w, 0.2, w, 0xb5533a, 0, t * 0.22 + 0.1, 0));
    }
    g.add(this.buildCone(0.22, 0.3, 0x8d3b24, 0, tiers * 0.22 + 0.1, 0));
    if (level >= 3) g.add(this.buildSphere(0.08, 0xffd54f, 0, tiers * 0.22 + 0.3, 0));
    return g;
  }

  /** 马来清真寺（满剌加）—— 白墙绿顶洋葱穹顶 */
  private buildMalayMosque(level: number): THREE.Group {
    const g = new THREE.Group();
    g.add(this.buildBox(0.6, 0.42, 0.5, 0xf5f5f5, 0, 0.26, 0));
    const dome = this.buildSphere(0.3, 0x2e7d32, 0, 0.62, 0);
    dome.scale.y = 0.85;
    g.add(dome);
    g.add(this.buildCone(0.06, 0.18, 0xffd54f, 0, 0.92, 0));
    if (level >= 1) {
      g.add(this.buildCylinder(0.05, 0.07, 0.5, 0xf5f5f5, 0.3, 0.5, -0.32));
      g.add(this.buildCone(0.07, 0.14, 0x2e7d32, 0.3, 0.84, -0.32));
    }
    return g;
  }

  /** 佛塔（锡兰佛牙寺）—— 白塔金尖 */
  private buildStupa(level: number): THREE.Group {
    const g = new THREE.Group();
    g.add(this.buildCylinder(0.34, 0.44, 0.18, 0xf5f5f5, 0, 0.1, 0));
    const dome = this.buildSphere(0.3, 0xf5f5f5, 0, 0.38, 0);
    dome.scale.y = 0.8;
    g.add(dome);
    g.add(this.buildCone(0.07, 0.4, 0xffd54f, 0, 0.72, 0));
    g.add(this.buildSphere(0.07, 0xffd54f, 0, 0.95, 0));
    return g;
  }

  /** 印度宫殿（古里卡利卡特）—— 米色殿 + 金穹顶 + 四角亭 */
  private buildPalaceDome(level: number): THREE.Group {
    const g = new THREE.Group();
    g.add(this.buildBox(0.72, 0.34, 0.5, 0xfaf3e0, 0, 0.18, 0));
    const dome = this.buildSphere(0.36, 0xffe082, 0, 0.52, 0);
    dome.scale.y = 0.9;
    g.add(dome);
    g.add(this.buildCone(0.08, 0.22, 0xc62828, 0, 0.86, 0));
    if (level >= 1) {
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const px = Math.cos(a) * 0.34;
        const pz = Math.sin(a) * 0.34;
        g.add(this.buildCylinder(0.07, 0.09, 0.3, 0xfaf3e0, px, 0.24, pz));
        g.add(this.buildCone(0.09, 0.16, 0xffe082, px, 0.46, pz));
      }
    }
    return g;
  }

  /** 阿拉伯宣礼塔（忽鲁谟斯）—— 高塔 + 阳台 + 绿顶 */
  private buildArabianMinaret(level: number): THREE.Group {
    const g = new THREE.Group();
    const h = 1.0 + level * 0.14;
    g.add(this.buildCylinder(0.14, 0.22, h, 0xe0d7c6, 0, h / 2, 0));
    g.add(this.buildCylinder(0.22, 0.24, 0.08, 0x2e7d32, 0, h - 0.12, 0));
    const dome = this.buildSphere(0.16, 0x2e7d32, 0, h + 0.1, 0);
    dome.scale.y = 0.8;
    g.add(dome);
    g.add(this.buildCone(0.03, 0.2, 0xffd54f, 0, h + 0.26, 0));
    return g;
  }

  /** 灯塔（亚历山大法罗斯 / 亚丁火山灯塔）—— 白塔红灯 */
  private buildLighthouse(level: number): THREE.Group {
    const g = new THREE.Group();
    const h = 0.8 + level * 0.14;
    g.add(this.buildCylinder(0.2, 0.3, h, 0xf5f5f5, 0, h / 2, 0));
    g.add(this.buildCylinder(0.2, 0.22, 0.18, 0xc62828, 0, h * 0.55, 0));
    g.add(this.buildCylinder(0.2, 0.22, 0.2, 0xffe082, 0, h + 0.08, 0));
    const light = this.buildSphere(0.09, 0xffd54f, 0, h + 0.18, 0);
    g.add(light);
    this.lighthouseLights.push(light);
    g.add(this.buildCone(0.22, 0.24, 0xc62828, 0, h + 0.22, 0));
    return g;
  }

  /** 欧式钟楼（威尼斯圣马可钟楼） */
  private buildCampanile(level: number): THREE.Group {
    const g = new THREE.Group();
    const h = 0.8 + level * 0.15;
    g.add(this.buildBox(0.42, h, 0.42, 0xf5e6c8, 0, h / 2, 0));
    g.add(this.buildSphere(0.1, 0xc9a227, 0, h - 0.16, 0));
    g.add(this.buildCone(0.16, 0.5, 0xc62828, 0, h + 0.2, 0));
    g.add(this.buildSphere(0.06, 0xffd54f, 0, h + 0.52, 0));
    return g;
  }

  /** 通用商馆（默认风格） */
  private buildGenericMarket(level: number): THREE.Group {
    const g = new THREE.Group();
    g.add(this.buildBox(0.5, 0.34, 0.4, 0x8d9aa5, 0, 0.22, 0));
    g.add(this.buildBox(0.56, 0.1, 0.46, 0x6d4c41, 0, 0.42, 0));
    g.add(this.buildBox(0.18, 0.14, 0.18, 0xa1887f, 0.24, 0.1, 0.18));
    return g;
  }

  // ==================== 几何体便捷构建 ====================

  private buildBox(w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  }

  private buildCylinder(
    rTop: number,
    rBottom: number,
    h: number,
    color: number,
    x: number,
    y: number,
    z: number
  ): THREE.Mesh {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBottom, h, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  }

  private buildCone(r: number, h: number, color: number, x: number, y: number, z: number): THREE.Mesh {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 10),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  }

  private buildSphere(r: number, color: number, x: number, y: number, z: number): THREE.Mesh {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 14, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4 })
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  }

  updateProperties(properties: BoardProperty[]) {
    // 仅移除旧的有主港口建筑（起点泉州的地标在 buildBoard 中创建，保留到 clearCells）
    this.portMarkers.forEach((g, id) => {
      const cell = this.currentCells.find((c) => c.id === id);
      if (cell && cell.type === 'port') {
        this.scene.remove(g);
        this.portMarkers.delete(id);
      }
    });
    // 重建所有港口格建筑：有主 → 所有者旗帜 + 升级规模；无主 → 灰色地标轮廓
    for (const cell of this.currentCells) {
      if (cell.type !== 'port') continue;
      const prop = properties.find((p) => p.id === cell.id);
      const ownerColor = prop?.ownerId ? this.playerColors.get(prop.ownerId) : undefined;
      const level = Math.max(0, Math.min(prop?.level ?? 0, 5));
      const { x, z } = getCellPosition(cell.index);
      const landmark = this.buildPortLandmark(cell, ownerColor, level);
      landmark.position.set(x, CELL_HEIGHT, z);
      this.scene.add(landmark);
      this.portMarkers.set(cell.id, landmark);
    }
  }

  updatePlayers(players: BoardPlayer[]) {
    const alive = new Set(players.map((p) => p.id));
    this.ships.forEach((_, id) => {
      if (!alive.has(id)) {
        this.scene.remove(this.ships.get(id)!);
        this.ships.delete(id);
        this.playerColors.delete(id);
        this.shipPaths.delete(id);
      }
    });

    const occupancy = new Map<number, number>();
    players.forEach((p) => occupancy.set(p.position, (occupancy.get(p.position) ?? 0) + 1));
    const offsetAt = new Map<number, number>();

    players.forEach((p, idx) => {
      if (!this.ships.has(p.id)) {
        const color = SHIP_COLORS[idx % SHIP_COLORS.length];
        const group = this.buildShip(color);
        this.ships.set(p.id, group);
        this.playerColors.set(p.id, color);
        this.scene.add(group);
      }
      const { x, z } = getCellPosition(p.position);
      const slot = offsetAt.get(p.position) ?? 0;
      offsetAt.set(p.position, slot + 1);
      const total = occupancy.get(p.position) ?? 1;
      const spread = (CELL_SIZE * 0.24) / Math.max(total, 1);
      const dx = (slot - (total - 1) / 2) * spread;
      const dz = (slot - (total - 1) / 2) * spread;
      const group = this.ships.get(p.id)!;
      group.userData.targetPos = new THREE.Vector3(x + dx, CELL_HEIGHT + 0.02, z + dz);
    });
  }

  /** 让指定玩家沿下标路径逐格移动（纯视觉，不动逻辑状态） */
  moveShipAlongPath(playerId: string, path: number[]) {
    if (!this.ships.has(playerId)) return;
    // 首次开始移动时快照当前视角，供结束后恢复
    if (!this.followDir.active) {
      this.followDir.restorePos.copy(this.camera.position);
      this.followDir.restoreTarget.copy(this.controls.target);
      this.followDir.active = true;
    }
    this.shipPaths.set(playerId, [...path]);
  }

  /** 注册"全部帆船移动结束"回调 */
  onMoveEnd(cb: () => void) {
    this.moveEndCb = cb;
  }

  /** 移动时让相机跟随并放大，移动结束后恢复到原视角 */
  private updateCameraFollow(dt: number) {
    // 找到当前正在移动的船（第一条仍有路线的）
    let movingShip: THREE.Group | undefined;
    for (const [id, route] of this.shipPaths) {
      if (route.length) {
        const ship = this.ships.get(id);
        if (ship) {
          movingShip = ship;
          break;
        }
      }
    }

    if (!this.followDir.active) return;

    if (movingShip) {
      // 跟随：目标点俯视船顶，相机贴近船的侧后方（放大）
      const pos = movingShip.position;
      const followTarget = pos.clone();
      followTarget.y = 0.2;
      const camGoal = followTarget.clone().add(new THREE.Vector3(0, 3.2, 3.8));
      const k = Math.min(1, dt * 6);
      this.controls.target.lerp(followTarget, k);
      this.camera.position.lerp(camGoal, k);
    } else {
      // 恢复原视角
      const k = Math.min(1, dt * 3);
      this.camera.position.lerp(this.followDir.restorePos, k);
      this.controls.target.lerp(this.followDir.restoreTarget, k);
      if (
        this.camera.position.distanceTo(this.followDir.restorePos) < 0.1 &&
        this.controls.target.distanceTo(this.followDir.restoreTarget) < 0.1
      ) {
        this.followDir.active = false;
        this.camera.position.copy(this.followDir.restorePos);
        this.controls.target.copy(this.followDir.restoreTarget);
      }
    }
  }

  private buildShip(color: number): THREE.Group {
    const group = new THREE.Group();

    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), new THREE.MeshStandardMaterial({ color }));
    hull.position.y = 0.08;
    hull.castShadow = true;
    group.add(hull);

    const bow = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.3, 4),
      new THREE.MeshStandardMaterial({ color: 0x8d6e63 })
    );
    bow.rotation.z = Math.PI;
    bow.position.set(0.34, 0.08, 0);
    group.add(bow);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x8d6e63 })
    );
    mast.position.y = 0.4;
    group.add(mast);

    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    sail.position.set(0, 0.5, 0);
    group.add(sail);

    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.02), new THREE.MeshStandardMaterial({ color }));
    flag.position.set(0.12, 0.72, 0);
    group.add(flag);

    return group;
  }

  private buildHighlight() {
    this.highlightRing = new THREE.Mesh(
      new THREE.RingGeometry(0.68, 0.82, 32),
      new THREE.MeshBasicMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    this.highlightRing.rotation.x = -Math.PI / 2;
    this.highlightRing.visible = false;
    this.scene.add(this.highlightRing);
  }

  highlightCell(index: number | null, pulse = true) {
    if (index == null || index < 0) {
      this.highlightRing.visible = false;
      return;
    }
    const { x, z } = getCellPosition(index);
    this.highlightRing.position.set(x, CELL_HEIGHT + 0.03, z);
    this.highlightRing.visible = true;
    if (pulse) this.highlightRing.userData.pulse = true;
  }

  private animate() {
    this.rafId = requestAnimationFrame(() => this.animate());
    const dt = this.clock.getDelta();
    const t = this.clock.elapsedTime;

    if (this.seaMesh) {
      const wave = (this.seaMesh.userData.waveT ?? 0) + dt;
      this.seaMesh.userData.waveT = wave;
      this.seaMesh.position.y = -0.05 + Math.sin(wave * 1.5) * 0.015;
    }
    // 第二层浪花：轻微旋转，模拟波光流动
    if (this.waveMesh) {
      const wave = (this.waveMesh.userData.waveT ?? 0) + dt;
      this.waveMesh.userData.waveT = wave;
      this.waveMesh.rotation.z = Math.sin(wave * 0.7) * 0.02;
    }

    // 灯塔火光闪烁
    if (this.lighthouseLights.length) {
      const blink = 0.5 + Math.sin(t * 3) * 0.35;
      this.lighthouseLights.forEach((light) => {
        (light.material as THREE.MeshBasicMaterial).opacity = 0.45 + blink * 0.55;
      });
    }
    // 罗盘玫瑰缓慢摆动
    if (this.compassGroup) {
      this.compassGroup.rotation.y = Math.sin(t * 0.15) * 0.08;
    }

    // 装饰帆船沿丝绸之路航线巡航（参数化 t，防御弧长计算异常）
    if (this.shipRoute && this.decorativeShips.length) {
      const route = this.shipRoute;
      this.decorativeShips.forEach((ship, i) => {
        const t0 = ship.userData.routeT as number | undefined;
        const speed = ship.userData.speed as number | undefined;
        const u = ((t0 ?? 0) + (speed ?? 0.01) * dt) % 1;
        ship.userData.routeT = u;
        const pos = route.getPoint(u);
        const tan = route.getTangent(u);
        if (!pos || !tan) return;
        ship.position.set(pos.x, 0.1 + Math.sin(t * 1.8 + i * 2.4) * 0.035, pos.z);
        ship.rotation.y = Math.atan2(tan.x, tan.z);
      });
    }

    // 海怪 / 鲸鱼已移除，中心海洋由背景海图 + 巡航帆船点缀
    if (this.highlightRing.visible && this.highlightRing.userData.pulse) {
      this.highlightRing.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
      (this.highlightRing.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 4) * 0.25;
    }

    const hadMoving = this.shipPaths.size > 0;
    this.ships.forEach((group, id) => {
      const route = this.shipPaths.get(id);
      if (route && route.length) {
        // 正沿线逐格游走
        const { x, z } = getCellPosition(route[0]);
        const target = new THREE.Vector3(x, CELL_HEIGHT + 0.02, z);
        group.position.lerp(target, Math.min(1, dt * 4));
        if (group.position.distanceTo(target) < 0.03) {
          group.position.copy(target);
          route.shift();
          if (!route.length) this.shipPaths.delete(id);
        }
      } else {
        // 普通平滑移动到目标位置
        const target = group.userData.targetPos as THREE.Vector3 | undefined;
        if (target) group.position.lerp(target, Math.min(1, dt * 6));
      }
    });
    // 从"有船在移动"变为"全部到达"时，通知移动结束
    if (hadMoving && this.shipPaths.size === 0) {
      this.moveEndCb?.();
    }

    this.updateCameraFollow(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.cssRenderer.render(this.scene, this.camera);
  }

  resize() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    this.renderer.setSize(w, h);
    this.cssRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private clearCells() {
    this.cellMeshes.forEach((m) => this.scene.remove(m));
    this.cellMeshes = [];
    this.cellLabels.forEach((l) => this.scene.remove(l));
    this.cellLabels = [];
    this.portMarkers.forEach((g) => this.scene.remove(g));
    this.portMarkers.clear();
    this.cellScenery.forEach((g) => this.scene.remove(g));
    this.cellScenery.clear();
    this.currentCells = [];
  }

  dispose() {
    cancelAnimationFrame(this.rafId);
    this.followDir.active = false;
    this.controls.dispose();
    // 释放羊皮纸海图纹理
    if (this.parchmentMesh?.material) {
      const mat = this.parchmentMesh.material as THREE.MeshStandardMaterial;
      mat.map?.dispose();
    }
    // 释放装饰（线框）资源
    if (this.tradeRoute) {
      this.tradeRoute.geometry.dispose();
      (this.tradeRoute.material as THREE.Material).dispose();
      this.scene.remove(this.tradeRoute);
    }
    this.scene.remove(this.seaDecor);
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m?.dispose());
      }
      if (obj instanceof THREE.LineSegments || obj instanceof THREE.Line) {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m?.dispose());
      }
    });
    this.renderer.dispose();
    this.cssRenderer.domElement.remove();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

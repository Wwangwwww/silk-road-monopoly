/** 海上丝绸之路大富翁 - Three.js 3D 棋盘场景 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { getCellPosition, getTotalCells, CELL_SIZE, CELL_HEIGHT, HALF_WIDTH } from './boardLayout';

export interface CellData {
  id: string;
  name: string;
  type: string;
  index: number;
  colorGroup?: string;
  basePrice?: number;
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
  blue: 0x1e88e5, green: 0x43a047, orange: 0xfb8c00, red: 0xe53935, purple: 0x8e24aa,
};
const TYPE_COLOR: Record<string, number> = {
  start_port: 0x00838f, port: 0x4fc3f7, chance: 0x26a69a, fate: 0x26a69a,
  tax: 0x78909c, jail: 0x6d4c41, go_to_jail: 0x5d4037, free_port: 0x7cb342,
};
const TYPE_ICON: Record<string, string> = {
  start_port: '⚓', port: '🏯', chance: '🌊', fate: '🌀',
  tax: '⚖️', jail: '⛓️', go_to_jail: '🏴‍☠️', free_port: '⛵',
};
const SHIP_COLORS = [0xff7043, 0xffca28, 0x66bb6a, 0x29b6f6, 0xab47bc, 0xff5252];

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
  private highlightRing!: THREE.Mesh;
  private currentCells: CellData[] = [];

  constructor(container: HTMLElement) {
    if (!container) throw new Error('BoardScene 需要挂载容器');
    this.container = container;
    this.initRenderer();
    this.initScene();
    this.buildSeaAndBoard();
    this.buildHighlight();
    this.animate();
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
    this.camera.position.set(0, 16, 16);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 40;
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
    const seaGeom = new THREE.PlaneGeometry(inner * 2.4, inner * 2.4);
    this.seaMesh = new THREE.Mesh(
      seaGeom,
      new THREE.MeshStandardMaterial({ color: 0x0288d1, transparent: true, opacity: 0.82, roughness: 0.25 })
    );
    this.seaMesh.rotation.x = -Math.PI / 2;
    this.seaMesh.position.y = -0.05;
    this.seaMesh.receiveShadow = true;
    this.scene.add(this.seaMesh);

    const size = (HALF_WIDTH + CELL_SIZE) * 2 + 1;
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(size, 0.4, size),
      new THREE.MeshStandardMaterial({ color: 0x0b5e66, roughness: 0.9 })
    );
    platform.position.y = -0.2;
    platform.receiveShadow = true;
    this.scene.add(platform);

    const border = new THREE.Mesh(
      seaGeom.clone(),
      new THREE.MeshStandardMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.15 })
    );
    border.rotation.x = -Math.PI / 2;
    border.position.y = -0.02;
    this.scene.add(border);
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
        new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 })
      );
      top.position.y = CELL_HEIGHT / 2 + 0.012;
      top.receiveShadow = true;
      mesh.add(top);

      const div = document.createElement('div');
      div.className = 'sr-cell-label';
      const icon = cell ? TYPE_ICON[cell.type] ?? '' : '';
      const price = cell?.basePrice ? `<div class="sr-cell-price">${cell.basePrice}</div>` : '';
      div.innerHTML =
        `<div class="sr-cell-icon">${icon}</div>` +
        `<div class="sr-cell-name">${cell?.name ?? i}</div>` + price;
      const label = new CSS2DObject(div);
      label.position.set(x, CELL_HEIGHT + 0.35, z);
      this.scene.add(label);
      this.cellLabels.push(label);
    }
  }

  private resolveCellColor(cell: CellData | undefined): number {
    if (!cell) return 0x37474f;
    if (cell.type === 'port' && cell.colorGroup && GROUP_COLOR[cell.colorGroup]) {
      return GROUP_COLOR[cell.colorGroup];
    }
    return TYPE_COLOR[cell.type] ?? 0x37474f;
  }

    updateProperties(properties: BoardProperty[]) {
    this.portMarkers.forEach((g) => this.scene.remove(g));
    this.portMarkers.clear();
    for (const prop of properties) {
      const cell = this.currentCells.find((c) => c.id === prop.id);
      if (!cell) continue;
      const { x, z } = getCellPosition(cell.index);
      const group = new THREE.Group();
      group.position.set(x, CELL_HEIGHT, z);
      const level = Math.max(0, Math.min(prop.level ?? 0, 5));
      const ownerColor = this.playerColors.get(prop.ownerId ?? '') ?? 0x9e9e9e;
      const bodyHeight = 0.25 + level * 0.18;

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, bodyHeight, 0.45),
        new THREE.MeshStandardMaterial({ color: ownerColor })
      );
      base.position.y = 0.12 + bodyHeight / 2;
      base.castShadow = true;
      group.add(base);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(0.34, 0.3, 4),
        new THREE.MeshStandardMaterial({ color: 0xffd54f })
      );
      roof.position.y = 0.12 + bodyHeight + 0.15;
      group.add(roof);

      for (let b = 0; b < Math.min(level, 4); b++) {
        const flag = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.3, 0.03),
          new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        flag.position.set(-0.15 + b * 0.1, 0.12 + bodyHeight + 0.15, 0);
        group.add(flag);
      }

      this.scene.add(group);
      this.portMarkers.set(prop.id, group);
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

    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.14, 0.3),
      new THREE.MeshStandardMaterial({ color })
    );
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

    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.06, 0.02),
      new THREE.MeshStandardMaterial({ color })
    );
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

    if (this.highlightRing.visible && this.highlightRing.userData.pulse) {
      this.highlightRing.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
      (this.highlightRing.material as THREE.MeshBasicMaterial).opacity =
        0.55 + Math.sin(t * 4) * 0.25;
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
    this.currentCells = [];
  }

  dispose() {
    cancelAnimationFrame(this.rafId);
    this.followDir.active = false;
    this.controls.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
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


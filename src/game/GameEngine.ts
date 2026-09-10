import * as THREE from 'three';
import { CharacterModel } from './CharacterModel';
import { OfficeScene } from './OfficeScene';
import { HackerModel } from './HackerModel';
import { ComputerData, HackerInfo, HackerState } from '../types';
import { soundManager } from '../audio/soundManager';

export interface GameEngineCallbacks {
  onNearComputerChange: (computer: ComputerData | null) => void;
  onOpenMiniGame: (computer: ComputerData) => void;
  onOpenMalwareBattle: (computer: ComputerData) => void;
  onComputerBrokenAlert: (computer: ComputerData) => void;
  onComputersUpdate: (computers: ComputerData[]) => void;
  onHackerAlert?: (message: string) => void;
  onHackerWhacked?: (count: number) => void;
  onHackerStateChange?: (hackerInfo: HackerInfo | null) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private office: OfficeScene;
  public character: CharacterModel;

  // Hacker Entity
  public hacker: HackerModel | null = null;
  private hackerPos: THREE.Vector3 = new THREE.Vector3(0, 0, 11);
  private hackerTargetPc: ComputerData | null = null;
  private hackerSpawnCooldown: number = 16; // First hacker arrives in 16s
  private hackerHackingTimer: number = 0;
  private hackerStunTimer: number = 0;
  public hackerWhackCount: number = 0;
  private hackLaserBeam: THREE.Line | null = null;

  private clock: THREE.Clock;
  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false; // When mini-game is active

  // Input states
  private keys: { [key: string]: boolean } = {};
  public joystickVector: { x: number; y: number } = { x: 0, y: 0 };
  private cameraAngleYaw: number = 0;
  private isDraggingMouse: boolean = false;
  private lastMouseX: number = 0;
  private mouseDownPos: { x: number; y: number } = { x: 0, y: 0 };

  // Collision & Physics
  private playerPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0); // Start in central hallway
  private playerVelocity: THREE.Vector3 = new THREE.Vector3();
  private playerRadius: number = 0.45;

  // Interaction
  public nearComputer: ComputerData | null = null;
  private callbacks: GameEngineCallbacks;

  // Spawner timer
  private breakSpawnCooldown: number = 6;
  private footstepTimer: number = 0;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Deep modern slate background
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.018);

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 9, 10);
    this.camera.lookAt(0, 1, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 4. Office Environment
    this.office = new OfficeScene(this.scene);

    // 5. Character
    this.character = new CharacterModel();
    this.character.group.position.copy(this.playerPos);
    this.scene.add(this.character.group);

    // Event listeners
    this.setupInputs();
    this.setupResize();
  }

  private setupInputs() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    // Mouse camera orbit and left-click to whack
    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', (e) => {
      this.isDraggingMouse = true;
      this.lastMouseX = e.clientX;
      this.mouseDownPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDraggingMouse) return;
      const deltaX = e.clientX - this.lastMouseX;
      this.cameraAngleYaw -= deltaX * 0.006;
      this.lastMouseX = e.clientX;
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isDraggingMouse) {
        // If mouse barely moved, count as left click whack!
        const dx = Math.abs(e.clientX - this.mouseDownPos.x);
        const dy = Math.abs(e.clientY - this.mouseDownPos.y);
        if (dx < 6 && dy < 6 && e.button === 0) {
          this.triggerWhackBat();
        }
      }
      this.isDraggingMouse = false;
    });
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;

    // Attack / Whack with Bat: KeyF or KeyQ
    if (e.code === 'KeyF' || e.code === 'KeyQ') {
      this.triggerWhackBat();
      return;
    }

    // Interaction key E or Space or Enter
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
      this.triggerInteract();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private setupResize() {
    const handleResize = () => {
      if (!this.container) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
  }

  public triggerWhackBat() {
    if (this.isPaused) return;
    soundManager.playSwoosh();
    this.character.triggerAttack();

    // Check hit on Hacker
    if (this.hacker) {
      const distToHacker = this.playerPos.distanceTo(this.hackerPos);
      if (distToHacker < 2.8) {
        // Hit successfully!
        soundManager.playBonk();
        this.hacker.setHackerState('stunned');
        this.hackerStunTimer = 2.4;
        this.hackerWhackCount++;

        // Remove laser beam if hacking
        this.removeLaserBeam();
        this.hackerTargetPc = null;

        if (this.callbacks.onHackerWhacked) {
          this.callbacks.onHackerWhacked(this.hackerWhackCount);
        }
        if (this.callbacks.onHackerAlert) {
          this.callbacks.onHackerAlert('💥 ฟาดแฮกเกอร์สำเร็จ! แฮกเกอร์มึนตึ้บกำลังหนี!');
        }
      }
    }
  }

  public triggerInteract() {
    if (!this.nearComputer || this.isPaused) return;

    if (this.nearComputer.status === 'broken') {
      this.callbacks.onOpenMiniGame(this.nearComputer);
    } else if (this.nearComputer.status === 'malware') {
      this.callbacks.onOpenMalwareBattle(this.nearComputer);
    }
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      this.character.setAnimationState('repair');
    } else {
      this.character.setAnimationState('idle');
    }
  }

  public markComputerRepaired(id: string) {
    this.office.setComputerStatus(id, 'normal');
    this.character.setAnimationState('success');
    setTimeout(() => {
      if (!this.isPaused) {
        this.character.setAnimationState('idle');
      }
    }, 1200);

    this.notifyComputersChange();

    // Check if broken computers are low, schedule another
    const brokenCount = this.getBrokenComputersCount();
    if (brokenCount === 0) {
      setTimeout(() => this.breakRandomComputer(), 1500);
    }
  }

  public markComputerFailed(id: string) {
    this.character.setAnimationState('fail');
    setTimeout(() => {
      if (!this.isPaused) {
        this.character.setAnimationState('idle');
      }
    }, 1200);
  }

  public breakRandomComputer(): ComputerData | null {
    const normals: ComputerData[] = [];
    this.office.computerVisuals.forEach((vis) => {
      if (vis.data.status === 'normal') {
        normals.push(vis.data);
      }
    });

    if (normals.length === 0) return null;

    const chosen = normals[Math.floor(Math.random() * normals.length)];
    this.office.setComputerStatus(chosen.id, 'broken');
    soundManager.playAlert();
    this.callbacks.onComputerBrokenAlert(chosen);
    this.notifyComputersChange();
    return chosen;
  }

  public getBrokenComputersCount(): number {
    let count = 0;
    this.office.computerVisuals.forEach((vis) => {
      if (vis.data.status === 'broken' || vis.data.status === 'repairing') count++;
    });
    return count;
  }

  public getAllComputers(): ComputerData[] {
    const list: ComputerData[] = [];
    this.office.computerVisuals.forEach((vis) => list.push(vis.data));
    return list;
  }

  private notifyComputersChange() {
    this.callbacks.onComputersUpdate(this.getAllComputers());
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();

    // Start with 2 broken computers if none are broken
    if (this.getBrokenComputersCount() === 0) {
      this.breakRandomComputer();
      this.breakRandomComputer();
    }

    this.loop();
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }

  private loop = () => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (!this.isPaused) {
      this.updateMovement(delta);
      this.updateComputerSpawning(delta);
      this.checkNearComputer();
      this.updateHacker(delta);
    }

    // Always update office animations (lights, sparks, screen indicators)
    this.office.update(delta);

    // Update character animation frame
    this.character.update(delta);

    // Update smooth camera follow
    this.updateCamera(delta);

    // Render
    this.renderer.render(this.scene, this.camera);
  };

  private updateMovement(delta: number) {
    let inputX = 0;
    let inputZ = 0;

    // Keyboard controls
    if (this.keys['KeyW'] || this.keys['ArrowUp']) inputZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) inputZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) inputX += 1;

    // Mobile virtual joystick input override
    if (Math.abs(this.joystickVector.x) > 0.05 || Math.abs(this.joystickVector.y) > 0.05) {
      inputX = this.joystickVector.x;
      inputZ = -this.joystickVector.y; // invert Y for standard forward/back
    }

    const moveMag = Math.sqrt(inputX * inputX + inputZ * inputZ);

    if (moveMag > 0.05) {
      // Normalize
      const dirX = inputX / moveMag;
      const dirZ = inputZ / moveMag;

      // Rotate movement vector according to current camera yaw angle for natural third-person direction
      const cosY = Math.cos(this.cameraAngleYaw);
      const sinY = Math.sin(this.cameraAngleYaw);
      const worldX = dirX * cosY - dirZ * sinY;
      const worldZ = dirX * sinY + dirZ * cosY;

      // Target character yaw angle
      const targetAngle = Math.atan2(worldX, worldZ);
      this.character.updateFacing(targetAngle, delta, 16);

      // Speed (5.5 units/sec - brisk agile technician pace)
      const speed = 5.5 * Math.min(moveMag, 1.0);
      const moveStepX = worldX * speed * delta;
      const moveStepZ = worldZ * speed * delta;

      // Collision detection with office furniture
      const newX = this.playerPos.x + moveStepX;
      const newZ = this.playerPos.z + moveStepZ;

      if (!this.checkCollision(newX, this.playerPos.z)) {
        this.playerPos.x = newX;
      }
      if (!this.checkCollision(this.playerPos.x, newZ)) {
        this.playerPos.z = newZ;
      }

      // Keep within office walls
      this.playerPos.x = THREE.MathUtils.clamp(
        this.playerPos.x,
        this.office.officeBounds.minX + 0.8,
        this.office.officeBounds.maxX - 0.8
      );
      this.playerPos.z = THREE.MathUtils.clamp(
        this.playerPos.z,
        this.office.officeBounds.minZ + 0.8,
        this.office.officeBounds.maxZ - 0.8
      );

      this.character.group.position.copy(this.playerPos);
      this.character.setAnimationState('run');

      // Footstep audio
      this.footstepTimer += delta;
      if (this.footstepTimer > 0.28) {
        soundManager.playFootstep();
        this.footstepTimer = 0;
      }
    } else {
      if (
        this.character.getAnimationState() !== 'success' &&
        this.character.getAnimationState() !== 'fail' &&
        this.character.getAnimationState() !== 'repair'
      ) {
        this.character.setAnimationState('idle');
      }
    }
  }

  private checkCollision(x: number, z: number): boolean {
    const testCenter = new THREE.Vector3(x, 0.9, z);
    const testBox = new THREE.Box3();
    testBox.setFromCenterAndSize(
      testCenter,
      new THREE.Vector3(this.playerRadius * 2, 1.8, this.playerRadius * 2)
    );

    for (const box of this.office.colliders) {
      if (box.intersectsBox(testBox)) {
        return true;
      }
    }
    return false;
  }

  private checkNearComputer() {
    let closestComp: ComputerData | null = null;
    let closestDist = 2.4; // Max interaction distance in meters

    this.office.computerVisuals.forEach((vis) => {
      const dist = this.playerPos.distanceTo(
        new THREE.Vector3(vis.data.position[0], 0, vis.data.position[2])
      );
      if (dist < closestDist) {
        closestDist = dist;
        closestComp = vis.data;
      }
    });

    if (this.nearComputer?.id !== closestComp?.id) {
      this.nearComputer = closestComp;
      this.callbacks.onNearComputerChange(this.nearComputer);
    }
  }

  private updateComputerSpawning(delta: number) {
    this.breakSpawnCooldown -= delta;

    const brokenCount = this.getBrokenComputersCount();

    // Keep between 1 and 3 computers broken
    if (this.breakSpawnCooldown <= 0) {
      if (brokenCount < 3) {
        this.breakRandomComputer();
      }
      // Reset cooldown between 12 to 20 seconds
      this.breakSpawnCooldown = 12 + Math.random() * 8;
    }
  }

  private spawnHacker() {
    // Find normal computers to target
    const normalComputers: ComputerData[] = [];
    this.office.computerVisuals.forEach((vis) => {
      if (vis.data.status === 'normal') {
        normalComputers.push(vis.data);
      }
    });

    if (normalComputers.length === 0) {
      this.hackerSpawnCooldown = 8;
      return;
    }

    // Pick target PC
    this.hackerTargetPc = normalComputers[Math.floor(Math.random() * normalComputers.length)];

    // Instantiate Hacker Model
    this.hacker = new HackerModel();
    // Spawn near entrance / backdoor
    this.hackerPos.set(0, 0, 11);
    this.hacker.group.position.copy(this.hackerPos);
    this.scene.add(this.hacker.group);

    soundManager.playHackerAlert();

    if (this.callbacks.onHackerAlert) {
      this.callbacks.onHackerAlert('⚠️ มี Hacker บุกเข้ามาในออฟฟิศ! ใช้ไม้ทุบด่วน [F]!');
    }
  }

  private removeLaserBeam() {
    if (this.hackLaserBeam) {
      this.scene.remove(this.hackLaserBeam);
      this.hackLaserBeam.geometry.dispose();
      (this.hackLaserBeam.material as THREE.Material).dispose();
      this.hackLaserBeam = null;
    }
  }

  private updateHacker(delta: number) {
    if (!this.hacker) {
      this.hackerSpawnCooldown -= delta;
      if (this.hackerSpawnCooldown <= 0) {
        this.spawnHacker();
      }
      if (this.callbacks.onHackerStateChange) {
        this.callbacks.onHackerStateChange(null);
      }
      return;
    }

    const distToPlayer = this.playerPos.distanceTo(this.hackerPos);
    const isNearPlayer = distToPlayer < 3.2;

    if (this.hacker.state === 'sneaking') {
      if (!this.hackerTargetPc) {
        this.hacker.setHackerState('fleeing');
        return;
      }

      // Move toward target PC desk position
      const targetPos = new THREE.Vector3(
        this.hackerTargetPc.position[0],
        0,
        this.hackerTargetPc.position[2]
      );
      const toTarget = targetPos.clone().sub(this.hackerPos);
      const dist = toTarget.length();

      if (dist > 1.6) {
        // Walk smoothly towards PC
        toTarget.normalize();
        const sneakSpeed = 2.7; // m/s
        this.hackerPos.add(toTarget.multiplyScalar(sneakSpeed * delta));
        this.hacker.group.position.copy(this.hackerPos);

        const targetAngle = Math.atan2(toTarget.x, toTarget.z);
        this.hacker.updateFacing(targetAngle, delta, 10);
      } else {
        // Arrived at PC: Start Hacking!
        this.hacker.setHackerState('hacking');
        this.hackerHackingTimer = 8.5;
        soundManager.playHackerAlert();

        if (this.callbacks.onHackerAlert) {
          this.callbacks.onHackerAlert(`🚨 แฮกเกอร์เริ่มแฮก [${this.hackerTargetPc.name}]! รีบวิ่งไปฟาดไม้ใส่!`);
        }

        // Create cyber laser beam from hacker to PC monitor
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 1.2, 0.3),
          targetPos.clone().sub(this.hackerPos).add(new THREE.Vector3(0, 1.2, 0)),
        ]);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xa855f7,
          linewidth: 2,
        });
        this.hackLaserBeam = new THREE.Line(lineGeo, lineMat);
        this.hacker.group.add(this.hackLaserBeam);
      }

    } else if (this.hacker.state === 'hacking') {
      this.hackerHackingTimer -= delta;
      const progress = Math.max(0, Math.min(100, (1 - this.hackerHackingTimer / 8.5) * 100));
      this.hacker.hackingProgress = progress;

      // Pulse cyber laser beam
      if (this.hackLaserBeam) {
        (this.hackLaserBeam.material as THREE.LineBasicMaterial).color.setHex(
          Math.sin(this.hackerHackingTimer * 16) > 0 ? 0xef4444 : 0xa855f7
        );
      }

      if (this.hackerHackingTimer <= 0) {
        // HACK SUCCEEDED: Computer becomes malware!
        if (this.hackerTargetPc) {
          this.office.setComputerStatus(this.hackerTargetPc.id, 'malware');
          this.notifyComputersChange();
          soundManager.playAlarm();

          if (this.callbacks.onHackerAlert) {
            this.callbacks.onHackerAlert(`⚠️ มัลแวร์แพร่กระจายสำเร็จที่ [${this.hackerTargetPc.name}]!`);
          }
        }

        this.removeLaserBeam();
        this.hackerTargetPc = null;
        this.hacker.setHackerState('fleeing');
      }

    } else if (this.hacker.state === 'stunned') {
      this.hackerStunTimer -= delta;
      if (this.hackerStunTimer <= 0) {
        this.hacker.setHackerState('fleeing');
      }

    } else if (this.hacker.state === 'fleeing') {
      // Flee towards entrance door at (0, 0, 12)
      const exitPos = new THREE.Vector3(0, 0, 12);
      const toExit = exitPos.clone().sub(this.hackerPos);
      const dist = toExit.length();

      if (dist > 1.2) {
        toExit.normalize();
        const fleeSpeed = 5.8; // m/s panic sprint
        this.hackerPos.add(toExit.multiplyScalar(fleeSpeed * delta));
        this.hacker.group.position.copy(this.hackerPos);

        const targetAngle = Math.atan2(toExit.x, toExit.z);
        this.hacker.updateFacing(targetAngle, delta, 14);
      } else {
        // Despawn hacker
        this.scene.remove(this.hacker.group);
        this.removeLaserBeam();
        this.hacker = null;
        this.hackerSpawnCooldown = 22 + Math.random() * 12; // Next invasion in 22-34s
        return;
      }
    }

    this.hacker.update(delta);

    // Notify state to HUD
    if (this.callbacks.onHackerStateChange) {
      this.callbacks.onHackerStateChange({
        position: [this.hackerPos.x, this.hackerPos.y, this.hackerPos.z],
        state: this.hacker.state,
        targetPcName: this.hackerTargetPc?.name,
        hackingProgress: this.hacker.hackingProgress,
        isNearPlayer,
      });
    }
  }

  private updateCamera(delta: number) {
    // Third person camera following player with smooth damping
    const camDist = 8.5;
    const camHeight = 7.8;

    const targetCamX = this.playerPos.x - Math.sin(this.cameraAngleYaw) * camDist;
    const targetCamZ = this.playerPos.z + Math.cos(this.cameraAngleYaw) * camDist;
    const targetCamY = this.playerPos.y + camHeight;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 6, delta);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 6, delta);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 6, delta);

    // Look slightly above character's chest
    const lookTarget = new THREE.Vector3(this.playerPos.x, 1.2, this.playerPos.z);
    this.camera.lookAt(lookTarget);
  }
}

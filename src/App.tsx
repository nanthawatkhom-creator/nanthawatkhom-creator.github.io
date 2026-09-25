/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import {
  CameraPerspective,
  ComputerData,
  GamePhase,
  GameOverReason,
  HackerInfo,
  MalwareSavedProgress,
  RadioDispatch,
  ShiftObjective,
} from './types';
import { MainMenu } from './components/MainMenu';
import { GameHUD } from './components/GameHUD';
import { MiniGameModal } from './components/MiniGameModal';
import { MalwareBattleModal } from './components/MalwareBattleModal';
import { GameOverModal } from './components/GameOverModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { OfficeMapModal } from './components/OfficeMapModal';
import { SettingsModal } from './components/SettingsModal';
import { PauseModal } from './components/PauseModal';
import { MobileControls } from './components/MobileControls';
import { soundManager } from './audio/soundManager';

const TOTAL_GAME_TIME = 180; // 3 minutes in seconds

// Colleague Persona Dispatch Mapping (Grounds the player in an authentic IT hero narrative)
const COLLEAGUE_TICKETS: Record<
  string,
  { senderName: string; role: string; department: 'marketing' | 'dev' | 'finance' | 'system'; message: string }
> = {
  pc_1: {
    senderName: 'คุณวินัย',
    role: 'การตลาด (โต๊ะ A-1)',
    department: 'marketing',
    message: 'ช่างไอทีครับ ช่วยด้วย! สไลด์ปิดดีลลูกค้ารายใหญ่ดับกลางอากาศ!',
  },
  pc_2: {
    senderName: 'คุณแพร',
    role: 'ฝ่ายขาย (โต๊ะ A-2)',
    department: 'marketing',
    message: 'สายแลนหลุด ดึงใบเสนอราคาจากระบบไม่ได้ ลูกค้ารอสายอยู่ค่ะ!',
  },
  pc_3: {
    senderName: 'คุณกอล์ฟ',
    role: 'บริการลูกค้า (โต๊ะ A-3)',
    department: 'marketing',
    message: 'ระบบโทรศัพท์ Voip หลุดจากสายแลน ช่วยเช็คสายไฟให้ทีครับ!',
  },
  pc_4: {
    senderName: 'ผู้จัดการสมศักดิ์',
    role: 'หัวหน้าฝ่าย (โต๊ะ A-4)',
    department: 'marketing',
    message: 'คอมฯ ดับระหว่างประชุมออนไลน์ ฝากช่างไอทีตรวจสอบด่วน!',
  },
  pc_5: {
    senderName: 'น้องน็อต',
    role: 'โปรแกรมเมอร์ (โต๊ะ B-1)',
    department: 'dev',
    message: 'พี่ช่างครับ เซิร์ฟเวอร์ Local ดับ เขียนโค้ดต่อไม่ได้เลย!',
  },
  pc_6: {
    senderName: 'คุณมิ้นท์',
    role: 'กราฟิกดีไซน์ (โต๊ะ B-2)',
    department: 'dev',
    message: 'หน้าจอ 4K สัญญาณภาพหาย เรนเดอร์งานแอนิเมชันค้างอยู่ค่ะ!',
  },
  pc_7: {
    senderName: 'พี่วันเพ็ญ',
    role: 'ฝ่ายบัญชี (โต๊ะ B-3)',
    department: 'finance',
    message: 'แย่แล้ว! หน้าจอขึ้นหัวกะโหลกสีแดง ไวรัสเรียกค่าไถ่ช่วยด่วน!',
  },
  pc_8: {
    senderName: 'คุณอารีย์',
    role: 'ฝ่ายบุคคล HR (โต๊ะ B-4)',
    department: 'finance',
    message: 'สายไฟหลังเครื่องหลุด กำลังจะออกเอกสารเงินเดือนพนักงานค่ะ!',
  },
  pc_9: {
    senderName: 'แอดมินเอก',
    role: 'ห้องเซิร์ฟเวอร์ (โต๊ะ C-1)',
    department: 'system',
    message: 'โหนดมอนิเตอร์เซิร์ฟเวอร์แจ้งเตือน มีคอมสายแลนหลุด!',
  },
  pc_10: {
    senderName: 'ช่างฝึกหัด',
    role: 'โต๊ะทดสอบระบบ (โต๊ะ C-2)',
    department: 'system',
    message: 'เครื่องทดสอบส่งสัญญาณ error รบกวนรุ่นพี่ช่วยเช็คสายทีครับ!',
  },
};

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Game Phases: 'menu' (Cinematic Title Screen) | 'playing' | 'minigame' | 'malware_battle' | 'gameover'
  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>('time');
  const [timeRemaining, setTimeRemaining] = useState<number>(TOTAL_GAME_TIME);
  const [repairedCount, setRepairedCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [brokenCount, setBrokenCount] = useState<number>(2);
  const [malwareCount, setMalwareCount] = useState<number>(0);
  const [hackerWhackedCount, setHackerWhackedCount] = useState<number>(0);
  const [allComputers, setAllComputers] = useState<ComputerData[]>([]);

  // Meta UI: Colleague Walkie-Talkie Radio Dispatch Pager
  const [radioDispatch, setRadioDispatch] = useState<RadioDispatch | null>(null);

  // Combo & Speed Boost Skill
  const [comboCount, setComboCount] = useState<number>(0);
  const [comboTimer, setComboTimer] = useState<number>(0);
  const [isSpeedBoosted, setIsSpeedBoosted] = useState<boolean>(false);
  const [speedBoostTimeLeft, setSpeedBoostTimeLeft] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [nearComputer, setNearComputer] = useState<ComputerData | null>(null);
  const [activeMiniGameComp, setActiveMiniGameComp] = useState<ComputerData | null>(null);
  const [activeMalwareComp, setActiveMalwareComp] = useState<ComputerData | null>(null);

  const [hackerInfo, setHackerInfo] = useState<HackerInfo | null>(null);
  const [hackerAlertMsg, setHackerAlertMsg] = useState<string | null>(null);

  // Camera Perspective (Third Person vs First Person)
  const [cameraPerspective, setCameraPerspective] = useState<CameraPerspective>('third_person');
  const [isInvertCamera, setIsInvertCamera] = useState<boolean>(false);

  // Modal dialog states
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showMapModal, setShowMapModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showPauseModal, setShowPauseModal] = useState<boolean>(false);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBgmActive, setIsBgmActive] = useState<boolean>(false);

  // Initialize 3D Game Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current, {
      onNearComputerChange: (comp) => {
        setNearComputer(comp);
      },
      onOpenMiniGame: (comp) => {
        setActiveMiniGameComp(comp);
        setGamePhase('minigame');
        engineRef.current?.setPaused(true);
      },
      onOpenMalwareBattle: (comp) => {
        setActiveMalwareComp(comp);
        setGamePhase('malware_battle');
        engineRef.current?.setPaused(true);
      },
      onHackerAlert: (msg) => {
        setHackerAlertMsg(msg);
        setTimeout(() => {
          setHackerAlertMsg((curr) => (curr === msg ? null : curr));
        }, 4500);
      },
      onHackerWhacked: (count) => {
        setHackerWhackedCount(count);
      },
      onHackerStateChange: (info) => {
        setHackerInfo(info);
      },
      onComboChange: (combo, timeLeft) => {
        setComboCount(combo);
        setComboTimer(timeLeft);
      },
      onSpeedBoostChange: (active, timeLeft) => {
        setIsSpeedBoosted(active);
        setSpeedBoostTimeLeft(timeLeft);
      },
      onCameraPerspectiveChange: (perspective) => {
        setCameraPerspective(perspective);
        setToastMessage(
          perspective === 'first_person'
            ? '🎥 สลับเป็นมุมมอง: บุคคลที่ 1 (First Person)'
            : '🎥 สลับเป็นมุมมอง: บุคคลที่ 3 (Third Person)'
        );
        setTimeout(() => setToastMessage(null), 2500);
      },
      onComputerBrokenAlert: (comp) => {
        if (engineRef.current) {
          setBrokenCount(engineRef.current.getBrokenComputersCount());
        }
        const persona = COLLEAGUE_TICKETS[comp.id] || {
          senderName: 'พนักงานในออฟฟิศ',
          role: comp.name,
          department: 'system' as const,
          message: `แจ้งปัญหาขัดข้องที่ ${comp.name} ฝากช่างไอทีตรวจสอบด้วยครับ!`,
        };
        setRadioDispatch({
          id: 'alert_' + Date.now(),
          senderName: persona.senderName,
          role: persona.role,
          department: persona.department,
          message: persona.message,
          type: comp.status === 'malware' ? 'incident_malware' : 'incident_broken',
          timestamp: Date.now(),
        });
        soundManager.playRadioDispatch();
        setTimeout(() => {
          setRadioDispatch((curr) => (curr?.id.startsWith('alert_') ? null : curr));
        }, 6500);
      },
      onComputersUpdate: (computers) => {
        setAllComputers(computers);
        const broken = computers.filter(
          (c) => c.status === 'broken' || c.status === 'repairing' || c.status === 'malware'
        ).length;
        const malwares = computers.filter((c) => c.status === 'malware').length;
        setBrokenCount(broken);
        setMalwareCount(malwares);

        // Immediate Game Over if 2 computers become infected with malware
        if (malwares >= 2) {
          handleGameOver('malware');
        }
      },
      onMalwareGameOver: () => {
        handleGameOver('malware');
      },
    });

    engineRef.current = engine;
    // Set engine to cinematic menu mode initially
    engine.setMenuMode(true);
    engine.start();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Main 3-Minute Countdown Timer Loop
  useEffect(() => {
    if (gamePhase !== 'playing' || showPauseModal) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleGameOver('time');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase, showPauseModal]);

  // Global keyboard listener for Pause menu, Map, and modal dismissals
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Toggle Tactical IT Tablet Map
      if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (gamePhase === 'playing') {
          setShowMapModal((prev) => !prev);
          return;
        }
      }

      if (e.key === 'Escape') {
        if (showMapModal) {
          setShowMapModal(false);
          return;
        }
        if (showSettingsModal) {
          setShowSettingsModal(false);
          return;
        }
        if (showHelpModal) {
          setShowHelpModal(false);
          return;
        }
        if (gamePhase === 'playing') {
          if (showPauseModal) {
            handleResume();
          } else {
            handleOpenPause();
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showMapModal, showSettingsModal, showHelpModal, showPauseModal, gamePhase]);

  const handleGameOver = (reason: GameOverReason = 'time') => {
    setGameOverReason(reason);
    setGamePhase('gameover');
    setActiveMiniGameComp(null);
    setActiveMalwareComp(null);
    setIsSpeedBoosted(false);
    setSpeedBoostTimeLeft(0);
    setComboCount(0);
    setComboTimer(0);
    setShowPauseModal(false);
    if (reason === 'malware') {
      soundManager.playSystemBreach();
    }
    if (engineRef.current) {
      engineRef.current.deactivateSpeedBoost();
      engineRef.current.resetCombo();
      engineRef.current.setPaused(true);
    }
  };

  const handleStartGame = () => {
    setGamePhase('playing');
    setShowPauseModal(false);
    setShowHelpModal(false);
    setShowMapModal(false);
    setShowSettingsModal(false);
    if (engineRef.current) {
      engineRef.current.setMenuMode(false);
      engineRef.current.setPaused(false);
    }
    if (!isMuted && !isBgmActive) {
      const active = soundManager.toggleBgm();
      setIsBgmActive(active);
    }
  };

  const handleOpenPause = () => {
    setShowPauseModal(true);
    if (engineRef.current) {
      engineRef.current.setPaused(true);
    }
  };

  const handleResume = () => {
    setShowPauseModal(false);
    if (engineRef.current) {
      engineRef.current.setPaused(false);
    }
  };

  const handleExitToMenu = () => {
    setShowPauseModal(false);
    setShowHelpModal(false);
    setShowMapModal(false);
    setShowSettingsModal(false);
    setActiveMiniGameComp(null);
    setActiveMalwareComp(null);
    setGamePhase('menu');
    if (engineRef.current) {
      engineRef.current.setMenuMode(true);
      engineRef.current.setPaused(false);
    }
  };

  const handleRestart = () => {
    setTimeRemaining(TOTAL_GAME_TIME);
    setRepairedCount(0);
    setFailedCount(0);
    setHackerWhackedCount(0);
    setMalwareCount(0);
    setGameOverReason('time');
    setActiveMiniGameComp(null);
    setActiveMalwareComp(null);
    setHackerAlertMsg(null);
    setIsSpeedBoosted(false);
    setSpeedBoostTimeLeft(0);
    setComboCount(0);
    setComboTimer(0);
    setShowPauseModal(false);

    if (engineRef.current) {
      engineRef.current.setMenuMode(false);
      const all = engineRef.current.getAllComputers();
      all.forEach((comp) => {
        engineRef.current?.markComputerRepaired(comp.id);
      });
      engineRef.current.deactivateSpeedBoost();
      engineRef.current.resetCombo();

      engineRef.current.breakRandomComputer();
      engineRef.current.breakRandomComputer();
      engineRef.current.setPaused(false);
      setBrokenCount(engineRef.current.getBrokenComputersCount());
      setMalwareCount(engineRef.current.getMalwareComputersCount());
    }

    setGamePhase('playing');
  };

  // Mini-Game Callbacks (Hardware Cable Repair)
  const handleMiniGameSuccess = (computer: ComputerData) => {
    setRepairedCount((prev) => prev + 1);
    if (engineRef.current) {
      engineRef.current.markComputerRepaired(computer.id);
      engineRef.current.setPaused(false);
    }
    soundManager.playRestoredWave();
    setRadioDispatch({
      id: 'res_' + Date.now(),
      senderName: 'หัวหน้าฝ่าย IT',
      role: 'ผู้อำนวยการฝ่ายสารสนเทศ',
      department: 'management',
      message: `ยอดเยี่ยมมาก! กู้คืน [${computer.name}] เรียบร้อยแล้ว ระบบเครือข่ายบริษัทกลับมาเสถียร!`,
      type: 'resolved',
      timestamp: Date.now(),
    });
    setTimeout(() => {
      setRadioDispatch((curr) => (curr?.id.startsWith('res_') ? null : curr));
    }, 5500);

    setActiveMiniGameComp(null);
    setGamePhase('playing');
  };

  const handleMiniGameFail = (computer: ComputerData, reason: string) => {
    setFailedCount((prev) => prev + 1);
    // Deduct 10s time penalty as specified
    setTimeRemaining((prev) => Math.max(0, prev - 10));

    if (engineRef.current) {
      engineRef.current.markComputerFailed(computer.id);
      engineRef.current.setPaused(false);
    }
    setActiveMiniGameComp(null);
    setGamePhase('playing');
  };

  // Malware Battle Callbacks (Typing Code vs Hacker)
  const handleMalwareBattleSuccess = (computer: ComputerData) => {
    setRepairedCount((prev) => prev + 1);
    if (engineRef.current) {
      engineRef.current.markComputerRepaired(computer.id);
      engineRef.current.setPaused(false);
    }
    soundManager.playRestoredWave();
    setRadioDispatch({
      id: 'res_' + Date.now(),
      senderName: 'หัวหน้าฝ่าย IT',
      role: 'ผู้อำนวยการฝ่ายสารสนเทศ',
      department: 'management',
      message: `สุดยอดฝีมือ! ถอนรากถอนโคนมัลแวร์จาก [${computer.name}] สำเร็จแล้ว วิกฤตคลี่คลาย!`,
      type: 'resolved',
      timestamp: Date.now(),
    });
    setTimeout(() => {
      setRadioDispatch((curr) => (curr?.id.startsWith('res_') ? null : curr));
    }, 5500);

    setActiveMalwareComp(null);
    setGamePhase('playing');
  };

  const handleMalwareBattlePause = (computer: ComputerData, progress: MalwareSavedProgress) => {
    if (engineRef.current) {
      engineRef.current.saveComputerMalwareProgress(computer.id, progress);
      engineRef.current.setPaused(false);
    }
    setActiveMalwareComp(null);
    setGamePhase('playing');
    setToastMessage(`💾 บันทึกความคืบหน้าของ ${computer.name} แล้ว! สามารถกลับมาซ่อมต่อได้ตลอดเวลา`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleMalwareBattleFail = (computer: ComputerData, reason: string) => {
    setFailedCount((prev) => prev + 1);
    setTimeRemaining((prev) => Math.max(0, prev - 10));

    if (engineRef.current) {
      engineRef.current.markComputerFailed(computer.id);
      engineRef.current.setPaused(false);
    }
    setActiveMalwareComp(null);
    setGamePhase('playing');
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    soundManager.setMuted(nextMute);
    if (nextMute) {
      setIsBgmActive(false);
    }
  };

  const handleToggleBgm = () => {
    const active = soundManager.toggleBgm();
    setIsBgmActive(active);
  };

  const handleJoystickMove = (vector: { x: number; y: number }) => {
    if (engineRef.current) {
      engineRef.current.joystickVector = vector;
    }
  };

  const handleInteract = () => {
    if (engineRef.current) {
      engineRef.current.triggerInteract();
    }
  };

  const handleWhackBat = () => {
    if (engineRef.current) {
      engineRef.current.triggerWhackBat();
    }
  };

  const handleToggleCameraPerspective = () => {
    if (engineRef.current) {
      engineRef.current.toggleCameraPerspective();
    }
  };

  const handleToggleInvertCamera = () => {
    if (engineRef.current) {
      const nextInvert = engineRef.current.toggleInvertCamera();
      setIsInvertCamera(nextInvert);
      setToastMessage(nextInvert ? '🔄 ทิศทางหันหน้าจอ: กลับด้าน (Invert)' : '✅ ทิศทางหันหน้าจอ: ปกติ ไม่สลับ (Normal)');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  // Enterprise Network Integrity Calculation (0-100%)
  const networkIntegrity = Math.max(
    0,
    Math.min(100, Math.round(100 - Math.max(0, brokenCount - malwareCount) * 8 - malwareCount * 35))
  );

  // Bartle Achiever: Shift Objectives
  const shiftObjectives: ShiftObjective[] = [
    {
      id: 'obj_repair',
      title: 'กู้คืนคอมพิวเตอร์ในออฟฟิศ',
      desc: 'ซ่อมแซมสายไฟหรือกู้มัลแวร์ให้สำเร็จอย่างน้อย 4 เครื่อง',
      current: Math.min(4, repairedCount),
      target: 4,
      completed: repairedCount >= 4,
    },
    {
      id: 'obj_hacker',
      title: 'สกัดกั้นแฮกเกอร์ด้วยไม้ไอที',
      desc: 'ฟาดไม้ใส่แฮกเกอร์ก่อนปล่อยมัลแวร์สำเร็จ 2 ครั้ง',
      current: Math.min(2, hackerWhackedCount),
      target: 2,
      completed: hackerWhackedCount >= 2,
    },
    {
      id: 'obj_integrity',
      title: 'รักษาความเสถียรของระบบ (Network)',
      desc: 'ดูแลไม่ให้เครือข่ายบริษัทตกลงต่ำกว่า 70%',
      current: networkIntegrity,
      target: 70,
      completed: networkIntegrity >= 70,
    },
    {
      id: 'obj_combo',
      title: 'คอมโบความเร็ว Turbo x2',
      desc: 'สะสมการซ่อมต่อเนื่องเพื่อรับโบนัสสปีดติดไฟ',
      current: Math.min(2, comboCount),
      target: 2,
      completed: comboCount >= 2,
    },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-['Prompt',sans-serif]">
      {/* 3D WebGL Canvas Viewport */}
      <div
        id="canvas-container"
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Main Menu Screen (Cinematic Title Screen) */}
      {gamePhase === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
          onOpenHowToPlay={() => setShowHelpModal(true)}
          onOpenMap={() => setShowMapModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* In-Game HUD (Clean, Unified Header Strip) */}
      {(gamePhase === 'playing' || gamePhase === 'minigame' || gamePhase === 'malware_battle') && (
        <GameHUD
          timeRemaining={timeRemaining}
          repairedCount={repairedCount}
          failedCount={failedCount}
          brokenCount={brokenCount}
          malwareCount={malwareCount}
          networkIntegrity={networkIntegrity}
          hackerWhackedCount={hackerWhackedCount}
          hackerInfo={hackerInfo}
          hackerAlertMsg={hackerAlertMsg}
          radioDispatch={radioDispatch}
          onDismissRadioDispatch={() => setRadioDispatch(null)}
          nearComputer={nearComputer}
          onInteract={handleInteract}
          onWhackBat={handleWhackBat}
          onRestart={handleRestart}
          onOpenHelp={() => setShowHelpModal(true)}
          onOpenMap={() => setShowMapModal(true)}
          onOpenPause={handleOpenPause}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isBgmActive={isBgmActive}
          onToggleBgm={handleToggleBgm}
          comboCount={comboCount}
          comboTimer={comboTimer}
          isSpeedBoosted={isSpeedBoosted}
          speedBoostTimeLeft={speedBoostTimeLeft}
          toastMessage={toastMessage}
          cameraPerspective={cameraPerspective}
          onToggleCameraPerspective={handleToggleCameraPerspective}
          isInvertCamera={isInvertCamera}
          onToggleInvertCamera={handleToggleInvertCamera}
          shiftObjectives={shiftObjectives}
        />
      )}

      {/* Mobile/Touch Virtual Joystick and Action Key */}
      {gamePhase === 'playing' && (
        <MobileControls
          onMove={handleJoystickMove}
          onInteract={handleInteract}
          onWhackBat={handleWhackBat}
          canInteract={Boolean(nearComputer && (nearComputer.status === 'broken' || nearComputer.status === 'malware'))}
          isHackerNear={Boolean(hackerInfo?.isNearPlayer)}
          cameraPerspective={cameraPerspective}
          onToggleCamera={handleToggleCameraPerspective}
        />
      )}

      {/* Mini-Game Overlay: Hardware Cable Repair */}
      {gamePhase === 'minigame' && activeMiniGameComp && (
        <MiniGameModal
          computer={activeMiniGameComp}
          onSuccess={handleMiniGameSuccess}
          onFail={handleMiniGameFail}
          onClose={() => {
            handleMiniGameFail(activeMiniGameComp, 'ยกเลิก');
          }}
        />
      )}

      {/* Malware Battle Overlay: Typing Terminal Code vs Hacker */}
      {gamePhase === 'malware_battle' && activeMalwareComp && (
        <MalwareBattleModal
          computer={activeMalwareComp}
          onSuccess={handleMalwareBattleSuccess}
          onFail={handleMalwareBattleFail}
          onPauseSession={handleMalwareBattlePause}
          onClose={() => {
            if (activeMalwareComp.malwareSavedProgress) {
              handleMalwareBattlePause(activeMalwareComp, activeMalwareComp.malwareSavedProgress);
            } else {
              if (engineRef.current) {
                engineRef.current.setPaused(false);
              }
              setActiveMalwareComp(null);
              setGamePhase('playing');
            }
          }}
        />
      )}

      {/* In-Game Pause Modal */}
      {showPauseModal && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onOpenHelp={() => setShowHelpModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onExitToMenu={handleExitToMenu}
          timeRemaining={timeRemaining}
          repairedCount={repairedCount}
          malwareCount={malwareCount}
        />
      )}

      {/* Game Over Modal */}
      {gamePhase === 'gameover' && (
        <GameOverModal
          reason={gameOverReason}
          repairedCount={repairedCount}
          failedCount={failedCount}
          hackerWhackedCount={hackerWhackedCount}
          onRestart={handleRestart}
          onExitToMenu={handleExitToMenu}
        />
      )}

      {/* Help Modal (Field Manual) */}
      {showHelpModal && (
        <HowToPlayModal
          isInitial={false}
          onClose={() => setShowHelpModal(false)}
        />
      )}

      {/* Facility Blueprint / Office Map Modal (Diegetic Toughpad) */}
      {showMapModal && (
        <OfficeMapModal
          computers={allComputers}
          onClose={() => setShowMapModal(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isBgmActive={isBgmActive}
          onToggleBgm={handleToggleBgm}
          cameraPerspective={cameraPerspective}
          onToggleCameraPerspective={handleToggleCameraPerspective}
          isInvertCamera={isInvertCamera}
          onToggleInvertCamera={handleToggleInvertCamera}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
}

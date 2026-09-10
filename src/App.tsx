/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { ComputerData, GamePhase, HackerInfo } from './types';
import { GameHUD } from './components/GameHUD';
import { MiniGameModal } from './components/MiniGameModal';
import { MalwareBattleModal } from './components/MalwareBattleModal';
import { GameOverModal } from './components/GameOverModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { MobileControls } from './components/MobileControls';
import { soundManager } from './audio/soundManager';

const TOTAL_GAME_TIME = 180; // 3 minutes in seconds

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gamePhase, setGamePhase] = useState<GamePhase>('intro');
  const [timeRemaining, setTimeRemaining] = useState<number>(TOTAL_GAME_TIME);
  const [repairedCount, setRepairedCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [brokenCount, setBrokenCount] = useState<number>(2);
  const [hackerWhackedCount, setHackerWhackedCount] = useState<number>(0);

  const [nearComputer, setNearComputer] = useState<ComputerData | null>(null);
  const [activeMiniGameComp, setActiveMiniGameComp] = useState<ComputerData | null>(null);
  const [activeMalwareComp, setActiveMalwareComp] = useState<ComputerData | null>(null);

  const [hackerInfo, setHackerInfo] = useState<HackerInfo | null>(null);
  const [hackerAlertMsg, setHackerAlertMsg] = useState<string | null>(null);

  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
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
      onComputerBrokenAlert: () => {
        if (engineRef.current) {
          setBrokenCount(engineRef.current.getBrokenComputersCount());
        }
      },
      onComputersUpdate: (computers) => {
        const broken = computers.filter(
          (c) => c.status === 'broken' || c.status === 'repairing' || c.status === 'malware'
        ).length;
        setBrokenCount(broken);
      },
    });

    engineRef.current = engine;
    engine.start();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Main 3-Minute Countdown Timer Loop
  useEffect(() => {
    if (gamePhase !== 'playing' && gamePhase !== 'minigame' && gamePhase !== 'malware_battle') return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase]);

  const handleGameOver = () => {
    setGamePhase('gameover');
    if (engineRef.current) {
      engineRef.current.setPaused(true);
    }
  };

  const handleStartGame = () => {
    setGamePhase('playing');
    if (!isMuted && !isBgmActive) {
      const active = soundManager.toggleBgm();
      setIsBgmActive(active);
    }
  };

  const handleRestart = () => {
    setTimeRemaining(TOTAL_GAME_TIME);
    setRepairedCount(0);
    setFailedCount(0);
    setHackerWhackedCount(0);
    setActiveMiniGameComp(null);
    setActiveMalwareComp(null);

    if (engineRef.current) {
      // Repair all computers first, then break 2 fresh ones
      const all = engineRef.current.getAllComputers();
      all.forEach((comp) => {
        engineRef.current?.markComputerRepaired(comp.id);
      });
      engineRef.current.breakRandomComputer();
      engineRef.current.breakRandomComputer();
      engineRef.current.setPaused(false);
      setBrokenCount(engineRef.current.getBrokenComputersCount());
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
    setActiveMiniGameComp(null);
    setGamePhase('playing');
  };

  const handleMiniGameFail = (computer: ComputerData, reason: string) => {
    setFailedCount((prev) => prev + 1);
    // Deduct 10s time penalty as specified: "The player loses some time"
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
    setActiveMalwareComp(null);
    setGamePhase('playing');
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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-['Prompt',sans-serif]">
      {/* 3D WebGL Canvas Viewport */}
      <div
        id="canvas-container"
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* In-Game HUD */}
      {(gamePhase === 'playing' || gamePhase === 'minigame' || gamePhase === 'malware_battle') && (
        <GameHUD
          timeRemaining={timeRemaining}
          repairedCount={repairedCount}
          failedCount={failedCount}
          brokenCount={brokenCount}
          hackerWhackedCount={hackerWhackedCount}
          hackerInfo={hackerInfo}
          hackerAlertMsg={hackerAlertMsg}
          nearComputer={nearComputer}
          onInteract={handleInteract}
          onWhackBat={handleWhackBat}
          onRestart={handleRestart}
          onOpenHelp={() => setShowHelpModal(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isBgmActive={isBgmActive}
          onToggleBgm={handleToggleBgm}
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
          onClose={() => {
            handleMalwareBattleFail(activeMalwareComp, 'ยกเลิก');
          }}
        />
      )}

      {/* Game Over Modal */}
      {gamePhase === 'gameover' && (
        <GameOverModal
          repairedCount={repairedCount}
          failedCount={failedCount}
          hackerWhackedCount={hackerWhackedCount}
          onRestart={handleRestart}
        />
      )}

      {/* How To Play / Intro Modal */}
      {gamePhase === 'intro' && (
        <HowToPlayModal
          isInitial={true}
          onClose={handleStartGame}
        />
      )}

      {/* Help Modal when opened during gameplay */}
      {showHelpModal && (
        <HowToPlayModal
          isInitial={false}
          onClose={() => setShowHelpModal(false)}
        />
      )}
    </div>
  );
}


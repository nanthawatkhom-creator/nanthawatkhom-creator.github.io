import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ComputerData, CableConnection } from '../types';
import { soundManager } from '../audio/soundManager';
import confetti from 'canvas-confetti';
import { RotateCw, CheckCircle2, AlertTriangle, Zap, Check, X, ShieldAlert } from 'lucide-react';

interface MiniGameModalProps {
  computer: ComputerData;
  onSuccess: (computer: ComputerData) => void;
  onFail: (computer: ComputerData, reason: string) => void;
  onClose: () => void;
}

const CABLE_CONFIGS = [
  { name: 'สายไฟหลัก Main Power', color: '#f59e0b', bgGlow: 'rgba(245, 158, 11, 0.25)', label: '220V AC' },
  { name: 'สายสัญญาณภาพ HDMI Display', color: '#3b82f6', bgGlow: 'rgba(59, 130, 246, 0.25)', label: '4K 144Hz' },
  { name: 'สายแลนเน็ตเวิร์ก LAN / Ethernet', color: '#10b981', bgGlow: 'rgba(16, 185, 129, 0.25)', label: '10 Gbps' },
  { name: 'สายบัสข้อมูล SSD / SATA Data', color: '#8b5cf6', bgGlow: 'rgba(139, 92, 246, 0.25)', label: 'NVMe Gen4' },
];

export const MiniGameModal: React.FC<MiniGameModalProps> = ({
  computer,
  onSuccess,
  onFail,
  onClose,
}) => {
  // Generate cable connection channels
  const [cables, setCables] = useState<CableConnection[]>(() => {
    const numCables = Math.min(2 + computer.repairDifficulty, 3);
    const chosen = CABLE_CONFIGS.slice(0, numCables);

    return chosen.map((cfg, idx) => {
      // Pick random initial rotation from [90, 180, 270] so it's not solved initially
      const wrongRotations = [90, 180, 270];
      const initialRot = wrongRotations[Math.floor(Math.random() * wrongRotations.length)];
      return {
        id: `cable_${idx}`,
        name: cfg.name,
        color: cfg.color,
        startPin: idx,
        targetPin: idx,
        currentRotation: initialRot,
        requiredRotation: 0, // 0 deg is aligned horizontal
        isConnected: false,
      };
    });
  });

  const [timeLeft, setTimeLeft] = useState<number>(12); // 12 seconds per mini-game
  const maxTime = 12;
  const [gameState, setGameState] = useState<'playing' | 'success' | 'fail'>('playing');
  const timerRef = useRef<number | null>(null);

  // Timer loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleFail('หมดเวลาซ่อมสายสัญญาณ!');
          return 0;
        }
        if (prev <= 4) {
          soundManager.playSpark();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Rotate a connection piece by 90 degrees
  const handleRotatePiece = (index: number) => {
    if (gameState !== 'playing') return;

    soundManager.playRotate();
    setCables((prev) => {
      const updated = [...prev];
      const cable = { ...updated[index] };
      cable.currentRotation = (cable.currentRotation + 90) % 360;
      cable.isConnected = cable.currentRotation === cable.requiredRotation;
      updated[index] = cable;

      if (cable.isConnected) {
        soundManager.playConnect();
      }

      // Check if all connected
      const allDone = updated.every((c) => c.isConnected);
      if (allDone) {
        setTimeout(() => {
          handleSuccess();
        }, 300);
      }

      return updated;
    });
  };

  const handleSuccess = () => {
    if (gameState !== 'playing') return;
    setGameState('success');
    if (timerRef.current) clearInterval(timerRef.current);
    soundManager.playSuccess();

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    setTimeout(() => {
      onSuccess(computer);
    }, 1200);
  };

  const handleFail = (reason: string) => {
    if (gameState !== 'playing') return;
    setGameState('fail');
    if (timerRef.current) clearInterval(timerRef.current);
    soundManager.playFail();

    setTimeout(() => {
      onFail(computer, reason);
    }, 1400);
  };

  const progressPercent = (cables.filter((c) => c.isConnected).length / cables.length) * 100;
  const timePercent = (timeLeft / maxTime) * 100;

  return (
    <div
      id="mini-game-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6 text-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                ซ่อมคอมพิวเตอร์ (REPAIR COMPUTER)
              </h2>
              <p className="text-sm text-slate-400">
                {computer.name} &bull; {computer.sectionName}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">เวลาซ่อมที่เหลือ</div>
            <div
              className={`font-mono text-2xl font-bold ${
                timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-amber-400'
              }`}
            >
              00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </div>
          </div>
        </div>

        {/* Instructions banner */}
        <div className="flex items-center space-x-2 rounded-lg bg-blue-950/40 border border-blue-800/40 px-3 py-2 text-xs text-blue-300 mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0 text-blue-400" />
          <span>คลิกที่หัวต่อสายเพื่อหมุนจัดแนวสัญญาณให้ตรงขั้ว (แนวนอน 180° เชื่อมต่อสมบูรณ์)</span>
        </div>

        {/* Time Progress Bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-6">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              timeLeft <= 4 ? 'bg-red-500' : 'bg-amber-400'
            }`}
            style={{ width: `${timePercent}%` }}
          />
        </div>

        {/* Cable Alignment Board */}
        <div className="space-y-4 mb-6">
          {cables.map((cable, idx) => (
            <div
              key={cable.id}
              className={`relative rounded-xl border p-4 transition-all ${
                cable.isConnected
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: cable.color }}
                  />
                  {cable.name}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-medium flex items-center gap-1 ${
                    cable.isConnected
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {cable.isConnected ? (
                    <>
                      <Check className="w-3 h-3" /> เชื่อมต่อแล้ว
                    </>
                  ) : (
                    'สายหลุด/ทิศทางผิด'
                  )}
                </span>
              </div>

              {/* Visual Cable Interactive Path */}
              <div className="flex items-center justify-between gap-3 py-2">
                {/* Left Source Port */}
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                  พอร์ตส่ง
                </div>

                {/* Left Wire Segment */}
                <div
                  className="flex-1 h-2 rounded transition-all"
                  style={{
                    backgroundColor: cable.color,
                    boxShadow: cable.isConnected ? `0 0 10px ${cable.color}` : 'none',
                    opacity: cable.isConnected ? 1 : 0.6,
                  }}
                />

                {/* Rotatable Connector Junction */}
                <button
                  id={`rotate-cable-${idx}`}
                  onClick={() => handleRotatePiece(idx)}
                  className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer select-none active:scale-95 ${
                    cable.isConnected
                      ? 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/20'
                      : 'border-amber-500/70 bg-amber-500/10 hover:border-amber-400'
                  }`}
                  title="คลิกเพื่อหมุนหัวต่อ"
                >
                  {/* Rotating Connector Graphic */}
                  <div
                    className="w-10 h-10 flex items-center justify-center transition-transform duration-200"
                    style={{ transform: `rotate(${cable.currentRotation}deg)` }}
                  >
                    {/* The Cable Plug Shape */}
                    <div className="relative w-8 h-4 bg-slate-800 border-2 rounded flex items-center justify-center"
                      style={{ borderColor: cable.color }}>
                      <div className="w-3 h-1 bg-white rounded-full" />
                      {/* Direction pin indicator */}
                      <div className="absolute -right-1 w-1.5 h-2.5 bg-amber-400 rounded-r" />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300 mt-1">
                    <RotateCw className="w-3 h-3 transition-transform group-hover:rotate-90" />
                    <span>{cable.currentRotation}°</span>
                  </div>
                </button>

                {/* Right Wire Segment */}
                <div
                  className="flex-1 h-2 rounded transition-all"
                  style={{
                    backgroundColor: cable.color,
                    boxShadow: cable.isConnected ? `0 0 10px ${cable.color}` : 'none',
                    opacity: cable.isConnected ? 1 : 0.4,
                  }}
                />

                {/* Right Target Port */}
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                  พอร์ตรับ
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      cable.isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Overall Progress Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>ความคืบหน้าการเชื่อมต่อสัญญาณ</span>
          <span className="font-mono text-slate-200">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 rounded-full shadow-sm shadow-emerald-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            id="abort-repair-btn"
            onClick={() => handleFail('ผู้เล่นยกเลิกการซ่อม')}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            ยกเลิก (เสียเวลา)
          </button>
          <div className="text-xs text-slate-400">
            แตะหรือคลิกที่ปุ่มวงเวียนเพื่อปรับหัวต่อให้เข้าล็อก
          </div>
        </div>

        {/* Success Overlay */}
        <AnimatePresence>
          {gameState === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-emerald-950/95 backdrop-blur-md text-center p-6"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-400 flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/30 animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-extrabold text-emerald-300 tracking-tight mb-2">
                SUCCESS! (ซ่อมสำเร็จ!)
              </h3>
              <p className="text-emerald-100 text-sm max-w-xs">
                เชื่อมต่อสายสัญญาณครบถ้วน คอมพิวเตอร์กลับมาใช้งานได้ตามปกติ (+1 แต้ม)
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fail Overlay */}
        <AnimatePresence>
          {gameState === 'fail' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-950/95 backdrop-blur-md text-center p-6"
            >
              <div className="w-20 h-20 rounded-full bg-red-500/20 text-red-400 border-2 border-red-500 flex items-center justify-center mb-4 shadow-xl shadow-red-500/30">
                <X className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-extrabold text-red-400 tracking-tight mb-2">
                FAIL! (ซ่อมล้มเหลว!)
              </h3>
              <p className="text-red-200 text-sm max-w-xs mb-1">
                การต่อสายผิดพลาด คอมพิวเตอร์ยังคงเสียและถูกหักเวลา
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

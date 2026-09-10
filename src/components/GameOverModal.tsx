import React from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Trophy, Award, CheckCircle, XCircle, Zap, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameOverModalProps {
  repairedCount: number;
  failedCount: number;
  hackerWhackedCount?: number;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  repairedCount,
  failedCount,
  hackerWhackedCount = 0,
  onRestart,
}) => {
  // Fire confetti on high score
  React.useEffect(() => {
    if (repairedCount >= 5) {
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.5 },
        });
      } catch {
        // ignore
      }
    }
  }, [repairedCount]);

  // Determine Grade and Title
  let grade = 'C';
  let title = 'ช่างไอทีฝึกหัด (Junior IT Intern)';
  let gradeColor = 'text-amber-400 border-amber-400 bg-amber-500/10';

  if (repairedCount >= 12) {
    grade = 'S+';
    title = 'ตำนานเทพกู้ชีพเซิร์ฟเวอร์ (Legendary Senior IT Architect)';
    gradeColor = 'text-purple-400 border-purple-400 bg-purple-500/10';
  } else if (repairedCount >= 9) {
    grade = 'S';
    title = 'ยอดช่างสปีดรันประจำตึก (Elite IT Specialist)';
    gradeColor = 'text-emerald-400 border-emerald-400 bg-emerald-500/10';
  } else if (repairedCount >= 6) {
    grade = 'A';
    title = 'ผู้เชี่ยวชาญการแก้ปัญหาด่วน (Pro Support Engineer)';
    gradeColor = 'text-blue-400 border-blue-400 bg-blue-500/10';
  } else if (repairedCount >= 3) {
    grade = 'B';
    title = 'ช่างไอทีประจำแผนก (Helpdesk Technician)';
    gradeColor = 'text-cyan-400 border-cyan-400 bg-cyan-500/10';
  }

  const total = repairedCount + failedCount;
  const accuracy = total > 0 ? Math.round((repairedCount / total) * 100) : 0;

  return (
    <div
      id="game-over-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6 md:p-8 text-slate-100"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-3">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white">
            หมดเวลาปฏิบัติหน้าที่!
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            สรุปรายงานผลงานช่างไอทีกู้ชีพคอมพิวเตอร์ในเวลา 3 นาที
          </p>
        </div>

        {/* Grade Badge */}
        <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-950/60 border border-slate-800 mb-6 text-center">
          <div
            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-4xl font-black font-mono shadow-xl mb-3 ${gradeColor}`}
          >
            {grade}
          </div>
          <div className="text-lg font-bold text-white tracking-tight">{title}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            อัตราความแม่นยำในการซ่อม: <span className="font-mono text-emerald-400">{accuracy}%</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-[11px] font-semibold mb-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>ซ่อมสำเร็จ</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">{repairedCount} เครื่อง</div>
          </div>

          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-rose-400 text-[11px] font-semibold mb-1">
              <XCircle className="w-3.5 h-3.5" />
              <span>ซ่อมล้มเหลว</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">{failedCount} เครื่อง</div>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-amber-400 text-[11px] font-semibold mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span>ฟาดแฮกเกอร์</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">{hackerWhackedCount} ครั้ง</div>
          </div>
        </div>

        {/* Action Button */}
        <button
          id="play-again-btn"
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-lg shadow-blue-600/30 transition-all active:scale-98 cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          <span>เริ่มกะใหม่ (เล่นอีกครั้ง)</span>
        </button>
      </motion.div>
    </div>
  );
};

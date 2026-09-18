import React from 'react';
import { ComputerData, HackerInfo } from '../types';
import { Wrench, Volume2, VolumeX, Music, HelpCircle, RotateCcw, AlertTriangle, Monitor, Skull, Zap, ShieldAlert } from 'lucide-react';

interface GameHUDProps {
  timeRemaining: number; // in seconds
  repairedCount: number;
  failedCount: number;
  brokenCount: number;
  malwareCount?: number;
  hackerWhackedCount?: number;
  hackerInfo?: HackerInfo | null;
  hackerAlertMsg?: string | null;
  nearComputer: ComputerData | null;
  onInteract: () => void;
  onWhackBat?: () => void;
  onRestart: () => void;
  onOpenHelp: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isBgmActive: boolean;
  onToggleBgm: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  timeRemaining,
  repairedCount,
  failedCount,
  brokenCount,
  malwareCount = 0,
  hackerWhackedCount = 0,
  hackerInfo,
  hackerAlertMsg,
  nearComputer,
  onInteract,
  onWhackBat,
  onRestart,
  onOpenHelp,
  isMuted,
  onToggleMute,
  isBgmActive,
  onToggleBgm,
}) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeFormatted = `${minutes < 10 ? `0${minutes}` : minutes}:${
    seconds < 10 ? `0${seconds}` : seconds
  }`;

  const isLowTime = timeRemaining <= 30;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 md:p-6 select-none">
      {/* Red/Purple vignette emergency border when 1 computer is infected with malware */}
      {malwareCount >= 1 && (
        <div className="pointer-events-none fixed inset-0 ring-4 ring-inset ring-rose-500/60 shadow-[inset_0_0_80px_rgba(244,63,94,0.35)] animate-pulse z-20" />
      )}

      {/* Top Header Row */}
      <div className="relative z-30 flex items-start justify-between w-full gap-2">
        {/* Top Left: REPAIRED & HACKER STAT */}
        <div className="flex flex-col gap-2">
          <div
            id="hud-repaired"
            className="pointer-events-auto flex items-center space-x-3 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-emerald-500/30 px-4 py-2 shadow-lg"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                ซ่อมสำเร็จ (REPAIRED)
              </div>
              <div className="text-2xl font-black text-white font-mono leading-none mt-0.5">
                {repairedCount}
              </div>
            </div>
          </div>

          {/* Hacker Whacked Counter */}
          <div
            id="hud-whacked"
            className="pointer-events-auto flex items-center space-x-2.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-amber-500/40 px-3 py-1.5 shadow"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-semibold text-amber-300">
                ฟาดแฮกเกอร์:
              </span>
              <span className="text-lg font-black text-white font-mono">
                {hackerWhackedCount}
              </span>
            </div>
          </div>
        </div>

        {/* Top Center: TIME, MALWARE THREAT GAUGE & ACTIVE ALERTS */}
        <div className="flex flex-col items-center">
          <div
            id="hud-timer"
            className={`pointer-events-auto flex items-center space-x-3 rounded-2xl bg-slate-900/90 backdrop-blur-md px-6 py-2.5 border shadow-xl transition-all ${
              isLowTime
                ? 'border-red-500/60 shadow-red-500/20 animate-pulse text-red-400'
                : 'border-slate-700 text-white'
            }`}
          >
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                เวลาปฏิบัติหน้าที่ (TIME)
              </div>
              <div
                className={`font-mono text-3xl md:text-4xl font-black tracking-tight ${
                  isLowTime ? 'text-red-400' : 'text-amber-400'
                }`}
              >
                {timeFormatted}
              </div>
            </div>
          </div>

          {/* Hardcore Malware Threat Meter (Max 2 Allowed: 2 = GAME OVER) */}
          <div
            id="hud-malware-threat"
            className={`mt-2 pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-lg transition-all ${
              malwareCount >= 1
                ? 'bg-rose-950/95 border-rose-500 text-rose-300 shadow-rose-900/60 animate-pulse'
                : 'bg-slate-900/85 border-slate-700 text-slate-300'
            }`}
          >
            <Skull
              className={`w-4 h-4 ${
                malwareCount >= 1 ? 'text-rose-400 animate-bounce' : 'text-slate-400'
              }`}
            />
            <span>มัลแวร์ในระบบ:</span>
            <div className="flex items-center gap-1 font-mono font-black">
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${
                  malwareCount >= 1 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200'
                }`}
              >
                {malwareCount}
              </span>
              <span className="text-slate-400">/ 2 เครื่อง</span>
            </div>
            {malwareCount === 1 ? (
              <span className="text-[11px] text-rose-400 font-bold tracking-tight">
                ⚠️ หากครบ 2 เครื่อง GAME OVER ทันที!
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-medium">
                (ปลอดภัย)
              </span>
            )}
          </div>

          {/* Active Broken / Hardware Issues Pill */}
          <div className="mt-1.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-sm border border-amber-500/40 text-xs text-amber-400 shadow">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>คอมสายไฟหลุด: <strong className="font-mono text-white">{Math.max(0, brokenCount - malwareCount)}</strong> เครื่อง</span>
          </div>
        </div>

        {/* Top Right: FAILED & Controls */}
        <div className="flex flex-col items-end gap-2">
          <div
            id="hud-failed"
            className="pointer-events-auto flex items-center space-x-3 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-rose-500/30 px-4 py-2 shadow-lg"
          >
            <div className="text-right">
              <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                ซ่อมล้มเหลว (FAILED)
              </div>
              <div className="text-2xl font-black text-white font-mono leading-none mt-0.5">
                {failedCount}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          {/* Utilities Button Bar */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow">
            <button
              onClick={onToggleBgm}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isBgmActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="ดนตรีประกอบ (BGM)"
            >
              <Music className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleMute}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onOpenHelp}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="คู่มือการเล่น"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onRestart}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="เริ่มรอบใหม่"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Center Hacker Urgency Banner */}
      {hackerAlertMsg && (
        <div className="flex justify-center -mt-8">
          <div className="pointer-events-auto flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-purple-950/90 border-2 border-purple-500 text-white shadow-2xl shadow-purple-900/50 animate-bounce">
            <ShieldAlert className="w-6 h-6 text-purple-400 animate-spin" />
            <span className="font-bold text-sm tracking-wide">{hackerAlertMsg}</span>
            {onWhackBat && (
              <button
                onClick={onWhackBat}
                className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer active:scale-95"
              >
                ฟาดไม้ [F]
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interaction Prompt (When Near Broken or Malware Computer) */}
      <div className="flex justify-center mb-6">
        {nearComputer && nearComputer.status === 'broken' && (
          <div
            id="interaction-prompt"
            className="pointer-events-auto animate-bounce flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-1 shadow-2xl shadow-orange-500/30"
          >
            <button
              onClick={onInteract}
              className="flex items-center gap-3 bg-slate-950 px-5 py-3 rounded-xl hover:bg-slate-900 transition-all text-white font-bold text-base cursor-pointer active:scale-95"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-slate-950 font-black text-sm">
                E
              </div>
              <Wrench className="w-5 h-5 text-amber-400 animate-spin" />
              <span>กด [E] เพื่อซ่อมสายไฟ {nearComputer.name}</span>
            </button>
          </div>
        )}

        {nearComputer && nearComputer.status === 'malware' && (
          <div
            id="interaction-prompt-malware"
            className="pointer-events-auto animate-bounce flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 p-1 shadow-2xl shadow-purple-500/40"
          >
            <button
              onClick={onInteract}
              className="flex items-center gap-3 bg-slate-950 px-5 py-3 rounded-xl hover:bg-slate-900 transition-all text-white font-bold text-base cursor-pointer active:scale-95"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500 text-white font-black text-sm">
                E
              </div>
              <Skull className="w-5 h-5 text-purple-400 animate-pulse" />
              <span>กด [E] ล้างมัลแวร์ • พิมพ์โค้ดสู้ Hacker บน {nearComputer.name}!</span>
            </button>
          </div>
        )}

        {nearComputer && nearComputer.status === 'normal' && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 px-4 py-2 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{nearComputer.name} ทำงานปกติเรียบร้อย</span>
          </div>
        )}
      </div>

      {/* Bottom Information Row */}
      <div className="flex items-end justify-between text-xs text-slate-400">
        <div className="pointer-events-auto rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3.5 py-2.5 space-y-1">
          <div className="font-semibold text-slate-200">คู่มือปุ่มควบคุม IT Technician:</div>
          <div>เดิน: <strong className="text-white font-mono">W / A / S / D</strong> หรือ <strong className="text-white font-mono">ลูกศร</strong></div>
          <div>ทุบแฮกเกอร์ด้วยไม้: <strong className="text-amber-400 font-mono">[F]</strong> หรือ <strong className="text-amber-400 font-mono">คลิกซ้าย</strong></div>
          <div>ซ่อมคอม / สู้มัลแวร์: <strong className="text-emerald-400 font-mono">[E]</strong> หรือ <strong className="text-emerald-400 font-mono">[Space]</strong></div>
          <div>หมุนมุมกล้อง: <strong className="text-white">คลิกเมาส์ลาก</strong></div>
        </div>

        <div className="pointer-events-auto text-right rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3.5 py-2.5">
          <div className="flex items-center justify-end gap-1.5 text-amber-400 font-bold">
            <Zap className="w-4 h-4" />
            <span>IT Anti-Hacker Bat Equipped</span>
          </div>
          <div className="text-[11px] text-slate-400">ไม้ทุบแฮกเกอร์ + เทอร์มินัลกู้มัลแวร์พร้อมใช้งาน</div>
        </div>
      </div>
    </div>
  );
};


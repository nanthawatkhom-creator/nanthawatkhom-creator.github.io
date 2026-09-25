import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  MapPin,
  ShieldAlert,
  Monitor,
  Server,
  AlertTriangle,
  Wifi,
  BatteryCharging,
  Cpu,
  Activity,
  CheckCircle2,
  Skull,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { ComputerData } from '../types';

interface OfficeMapModalProps {
  onClose: () => void;
  computers?: ComputerData[];
}

export const OfficeMapModal: React.FC<OfficeMapModalProps> = ({ onClose, computers = [] }) => {
  const [activeTab, setActiveTab] = useState<'map' | 'telemetry'>('map');

  const handleClose = () => {
    soundManager.playUiClick();
    onClose();
  };

  const brokenCount = computers.filter(
    (c) => c.status === 'broken' || c.status === 'repairing'
  ).length;
  const malwareCount = computers.filter((c) => c.status === 'malware').length;
  const normalCount = computers.filter((c) => c.status === 'normal').length;

  return (
    <div
      id="office-map-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 select-none"
    >
      {/* Diegetic Rugged Field Tablet Chassis */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl border-4 border-slate-700 bg-slate-950 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] ring-1 ring-slate-800"
      >
        {/* Tablet Top Bumper & Diagnostic Hardware Status Bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>IT-TOUGHPAD PRO // UNIT-04</span>
            </div>
            <span className="text-slate-700">|</span>
            <span className="hidden sm:inline">IP: 192.168.1.44</span>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <div className="flex items-center gap-1 text-emerald-400">
              <Wifi className="w-3.5 h-3.5" />
              <span>LAN 10Gbps</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-amber-400">
              <BatteryCharging className="w-3.5 h-3.5" />
              <span>96%</span>
            </div>
            <button
              onClick={handleClose}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="ปิดแท็บเล็ตตรวจการ"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Diegetic Sub-Header & Navigation Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-inner">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>แผนผังอาคาร & เรดาร์สถานะโหนด (HQ Tactical Map)</span>
              </h2>
              <p className="text-xs text-slate-400">
                ระบบตรวจจับความผิดปกติฮาร์ดแวร์และมัลแวร์แบบเรียลไทม์
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                soundManager.playUiClick();
                setActiveTab('map');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              แผนผังอาคาร (Layout)
            </button>
            <button
              onClick={() => {
                soundManager.playUiClick();
                setActiveTab('telemetry');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'telemetry'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>สถานะโหนดสด (Live Nodes)</span>
              {brokenCount + malwareCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {brokenCount + malwareCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'map' ? (
            <>
              {/* Tactical Schematic Image with Diegetic Radar Overlay */}
              <div className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-slate-950 shadow-inner group">
                <img
                  src="/src/assets/images/office_tactical_map_1790298629063.jpg"
                  alt="Office Tactical Blueprint"
                  referrerPolicy="no-referrer"
                  className="w-full h-56 sm:h-64 object-cover object-center opacity-90 transition-transform duration-500 group-hover:scale-102"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

                {/* Radar Grid Indicators */}
                <div className="absolute top-3 left-4 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-mono text-cyan-300">
                    SECTOR 14 · NOC LINK ONLINE
                  </span>
                </div>

                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-cyan-300 font-mono font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>
                      ACTIVE TELEMETRY: {normalCount} ปลอดภัย · {brokenCount} สายหลุด · {malwareCount} มัลแวร์
                    </span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">
                    SCALE 1:50 · LEVEL 14
                  </span>
                </div>
              </div>

              {/* Zones Tactical Intel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Zone A */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                    <Monitor className="w-4 h-4" />
                    <span>โซน A: การตลาด & การขาย</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    โต๊ะ A-1 ถึง A-4 ฝั่งซ้ายโถงกลาง จุดที่ต้องซ่อมสายไฟบ่อยเพราะพนักงานชอบขยับจอพรีเซนต์
                  </p>
                </div>

                {/* Zone B */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
                    <Monitor className="w-4 h-4" />
                    <span>โซน B: โปรแกรมเมอร์ & บัญชี</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    โต๊ะ B-1 ถึง B-4 ฝั่งขวาโถงกลาง สเปกเครื่องสูง เป็นเป้าหมายหลักที่แฮกเกอร์ชอบมาปล่อยโทรจัน
                  </p>
                </div>

                {/* Zone C */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                    <Server className="w-4 h-4" />
                    <span>โซน C: ห้องไอที & เซิร์ฟเวอร์</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    โต๊ะ C-1 และ C-2 ติดตู้แร็คเซิร์ฟเวอร์หลัก มีจอแสดงสถานะใหญ่ NOC คอยรายงานความเสถียร
                  </p>
                </div>
              </div>

              {/* Hacker Warning */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-purple-500/40 bg-purple-950/20 text-purple-200">
                <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-purple-300">
                    วงแหวนระวังภัย Spatial Threat Ring (กลไกการสกัดกั้น):
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    เมื่อแฮกเกอร์แอบเข้ามา จะมีวงแหวนสีแดง/ม่วงบนพื้นรอบตัวแฮกเกอร์ เมื่อคุณเดินเข้าไปในระยะ 2.8 เมตร วงแหวนจะเปลี่ยนเป็นสีทอง ให้กด <strong className="text-amber-300 font-mono">[F]</strong> หรือคลิกซ้ายเพื่อฟาดไม้สกัดกั้นทันที!
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Telemetry Live Nodes View */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>WORKSTATION REAL-TIME SUBNET PING (10 NODES)</span>
                <span>STATUS PROTOCOL: ICMP ACTIVE</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {computers.map((comp) => {
                  const isBroken = comp.status === 'broken' || comp.status === 'repairing';
                  const isMalware = comp.status === 'malware';
                  const isNormal = comp.status === 'normal';

                  return (
                    <div
                      key={comp.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isMalware
                          ? 'border-purple-500 bg-purple-950/30'
                          : isBroken
                          ? 'border-amber-500 bg-amber-950/30'
                          : 'border-slate-800 bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                              isMalware
                                ? 'bg-purple-500/20 text-purple-400'
                                : isBroken
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {isMalware ? (
                              <Skull className="w-4 h-4 animate-bounce" />
                            ) : isBroken ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{comp.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {comp.sectionName}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isMalware
                                ? 'bg-purple-900/80 text-purple-200 border border-purple-500'
                                : isBroken
                                ? 'bg-amber-900/80 text-amber-200 border border-amber-500'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            }`}
                          >
                            {isMalware ? 'CRITICAL MALWARE' : isBroken ? 'FAULT DETECTED' : 'ONLINE'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/80">
          <div className="text-xs font-mono text-slate-400">
            กดปุ่ม <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px]">[M]</kbd> หรือ <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px]">[ESC]</kbd> เพื่อปิด
          </div>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            ปิดแท็บเล็ตตรวจการ
          </button>
        </div>
      </motion.div>
    </div>
  );
};

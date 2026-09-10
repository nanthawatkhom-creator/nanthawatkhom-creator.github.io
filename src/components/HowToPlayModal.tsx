import React from 'react';
import { motion } from 'motion/react';
import { Play, Wrench, Clock, ShieldAlert, Monitor, ArrowRight, UserCheck } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
  isInitial?: boolean;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose, isInitial = false }) => {
  return (
    <div
      id="how-to-play-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl p-6 md:p-8 text-slate-100 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Wrench className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              ภารกิจช่างไอทีกู้ชีพคอมพิวเตอร์
            </h2>
            <p className="text-xs text-slate-400">IT Support Technician Office Rush - Prototype</p>
          </div>
        </div>

        {/* Story Intro */}
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 mb-5 text-sm text-slate-300 leading-relaxed">
          ยินดีต้อนรับสู่สำนักงานสุดวุ่นวาย! คุณคือช่างไอทีประจำออฟฟิศที่ต้องคอยรับมือกับคอมพิวเตอร์พัง และศัตรูตัวฉกาจที่คอยป่วนสำนักงาน!
        </div>

        {/* Steps & Obstacles */}
        <div className="space-y-3 mb-6 text-xs md:text-sm">
          <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-400 font-bold">
              1
            </div>
            <div>
              <strong className="text-white">คอมเสียสายไฟชำรุด:</strong> หน้าจอกระพริบสีแดง มีประกายไฟ เข้าใกล้แล้วกด <strong className="text-amber-400 font-mono">[E]</strong> หมุนหัวต่อสายให้ตรงสีเพื่อกู้ระบบ
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800/50">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 font-bold">
              2
            </div>
            <div>
              <strong className="text-purple-300">🦹 มี HACKER แอบย่องเข้ามาแฮกคอม:</strong> แฮกเกอร์จะใส่ฮู้ดดำย่องมาแฮกเครื่อง รีบวิ่งไปฟาดด้วยไม้ไอที <strong className="text-amber-400 font-mono">[F]</strong> หรือคลิกซ้าย เพื่อสกัดกั้นก่อนเครื่องติดเชื้อ!
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-xl bg-pink-950/30 border border-pink-800/50">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400 font-bold">
              3
            </div>
            <div>
              <strong className="text-pink-300">👾 คอมติดมัลแวร์ (Malware Battle):</strong> จอคอมจะกลายเป็นสีม่วงกระพริบหัวกะโหลก กด <strong className="text-pink-400 font-mono">[E]</strong> เพื่อเปิดเทอร์มินัล พิมพ์คีย์บอร์ดตามตัวอักษรเพื่อรันโค้ดสู้ Hacker และกู้คืนระบบ!
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-xl bg-blue-500/10 border border-blue-800/40">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-bold">
              4
            </div>
            <div>
              <strong className="text-white">เวลา 3 นาที:</strong> ซ่อมคอมพิวเตอร์และป้องกันออฟฟิศให้ได้คะแนนสูงสุดก่อนหมดเวลา!
            </div>
          </div>
        </div>

        {/* Features highlight */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-6 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
          <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>โมเดลตัวละคร 3 มิติ สมจริงทุกสัดส่วนพร้อมชุดช่างไอที ป้ายชื่อ แว่นตา ท่าทางอนิเมชั่น และการหันตัวที่นุ่มนวล</span>
        </div>

        {/* Play Button */}
        <button
          id="start-shift-btn"
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-98"
        >
          <span>{isInitial ? 'เริ่มเข้ากะปฏิบัติหน้าที่!' : 'เข้าใจแล้ว กลับสู่เกม'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  );
};

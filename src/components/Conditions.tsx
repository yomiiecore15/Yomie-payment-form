import React from 'react';
import { 
  Sparkles, Clock, HelpCircle, AlertCircle, ShieldAlert, BadgeInfo,
  DollarSign, RefreshCw, MessageCircle, AlertOctagon, HeartHandshake, CheckCircle2,
  ShoppingBag
} from 'lucide-react';

interface ConditionsProps {
  onGoToChecker?: () => void;
  onGoToOrder?: () => void;
}

export const Conditions: React.FC<ConditionsProps> = ({ onGoToChecker, onGoToOrder }) => {
  return (
    <div className="w-full max-w-2xl mx-auto" id="conditions-container">
      <div className="cute-card-frame bg-white p-5 sm:p-7 relative overflow-hidden text-left shadow-xl">
        
        {/* Cute top corner badge */}
        <div className="absolute top-5 left-6 text-[#eb5e45] font-mono text-[10px] font-black uppercase tracking-widest pointer-events-none">
          ✨ pre-order conditions
        </div>
        
        {/* Decorative sparkle */}
        <div className="absolute top-4 right-6 animate-sparkle pointer-events-none">
          <svg className="w-8 h-8 text-[#db5984] fill-[#fbc3d0] opacity-80" viewBox="0 0 24 24">
            <path d="M12 2l2.4 7.2L22 11.6l-5.6 5.4 1.8 7.5L12 20.2l-6.2 4.3 1.8-7.5-5.6-5.4 7.6-2.4z" />
          </svg>
        </div>

        <div className="space-y-6 pt-5">
          
          {/* Header Title Grid Greeting */}
          <div className="text-center space-y-1 mt-1 pb-3 border-b-2 border-dashed border-pink-100">
            <AlertCircle className="w-7 h-7 text-[#db5984] mx-auto text-heartbeat" />
            <h2 className="text-[#152033] text-xl sm:text-2xl font-extrabold tracking-wide font-sans">
              เงื่อนไขการพรีออเดอร์
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm font-medium font-sans">
              สินค้าทุกชิ้นเป็นพรีออเดอร์นะคะ รบกวนคุณลูกค้าอ่านเงื่อนไขให้ครบถ้วนน้า 💖🥰
            </p>
          </div>

          <div className="space-y-3.5">
            
            {/* 1. มัดจำและค่าส่ง */}
            <div className="bg-[#fef9f7] rounded-2xl border border-[#fcceca] p-4.5 space-y-3 shadow-xs">
              <ul className="space-y-2 text-xs leading-relaxed font-medium text-gray-700 font-sans">
                <li className="flex items-start gap-1.5">
                  <span className="text-[#eb5e45]">•</span>
                  <span className="font-normal"><strong>💰รับมัดจำ 50%</strong> (ชำระที่เหลือตอนถึงไทย)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#eb5e45]">•</span>
                  <span className="font-normal"><strong>📮ค่าส่งเริ่มต้น 45.-</strong> (พื้นที่ห่างไกล +20.-)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#eb5e45]">•</span>
                  <span className="font-normal">กดเว็บทุกวันศุกร์ (ตัดรอบ 15:00)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#eb5e45]">•</span>
                  <span className="font-normal">หากมีการเปลี่ยนแปลงจะแจ้งหน้าทวิตนะคะ</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#eb5e45]">•</span>
                  <span className="font-normal">ฝากของได้ 2 ล็อต (2 รอบเรือ) เพื่อรวมส่ง</span>
                </li>
                <li className="flex items-start gap-1.5 text-amber-700 font-bold bg-amber-50/50 p-2 rounded-lg border border-amber-200/50">
                  <span className="text-amber-600">⚠️</span>
                  <span className="font-normal underline">หากสินค้าที่รอรวมมีน้ำหนักมากจะขอเก็บค่าส่งในไทยเพิ่มภายหลังนะคะ</span>
                </li>
              </ul>
            </div>

            {/* 2. เขตพื้นที่ห่างไกล */}
            <div className="bg-amber-50/40 rounded-2xl border border-amber-200 p-4.5 space-y-2.5">
              <h3 className="text-xs sm:text-sm font-black text-amber-800 tracking-wide flex items-center gap-1.5 font-sans">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                เขตพื้นที่ห่างไกล
              </h3>
              <div className="text-xs font-semibold text-gray-700 leading-normal pl-5.5 flex flex-col items-start gap-1">
                {onGoToChecker ? (
                  <button 
                    type="button" 
                    onClick={onGoToChecker} 
                    className="px-2.5 py-1 bg-white border border-amber-200 text-amber-750 rounded-lg hover:bg-amber-50 font-bold transition-all shadow-xs cursor-pointer inline-flex items-center"
                  >
                    <span>กดเพื่อเช็คได้ในนี้เลยค่า</span>
                  </button>
                ) : (
                  <strong className="text-[#db5984]"> 'เช็คพื้นที่ส่ง' </strong>
                )} 
              </div>
            </div>

            {/* 3. รอสินค้านานแค่ไหน */}
            <div className="bg-sky-50/30 rounded-2xl border border-sky-100 p-4.5 space-y-3">
              <h3 className="text-xs sm:text-sm font-black text-sky-900 tracking-wide flex items-center gap-1.5 font-sans border-b border-dashed border-sky-200/80 pb-1.5">
                <Clock className="w-4 h-4 text-sky-600" />
                ระยะเวลารอสินค้า
              </h3>
              <ul className="space-y-2 text-xs leading-relaxed font-semibold text-gray-750 font-sans">
                <li className="flex items-start gap-1.5">
                  <span className="text-sky-500 font-bold">•</span>
                  <span className="font-normal font-sans">ตามรอบปกติ สินค้าจะเดินทางถึงโกดังจีนไม่เกิน 1 สัปดาห์หลังร้านกดสั่งค่ะ</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-sky-500 font-bold">•</span>
                  <span className="font-normal font-sans"><strong>รอบส่งกลับไทยจัดส่งทุกวันเสาร์</strong> (โดยตัดรอบศุกร์ เวลา 18:00 น.)</span>
                </li>
                <li className="flex items-start gap-1.5 text-gray-800">
                  <span className="text-sky-500 font-bold">•</span>
                  <span className="font-normal font-sans"><strong>หลังปิดรอบเรือ:</strong> ใช้เวลาเดินทางประมาณ <strong>30± วัน</strong> กว่าจะถึงไทยนะคะ</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-600">•</span>
                  <span className="text-amber-800 font-bold underline font-sans">เรือขนส่งอาจมีความล่าช้าในช่วงเทศกาลวันหยุดของจีน หรือสถานการณ์ไม่คาดคิด (หากมีจะแจ้งหน้าทวิตค่ะ)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-sky-500 font-bold">•</span>
                  <span className="font-normal font-sans">เมื่อสินค้าถึงแอดมินที่ไทย จะแพ็คและจัดส่งให้ภายใน 1–3 วันค่ะ</span>
                </li>
                <li className="flex items-center gap-1.5 bg-sky-50 p-2.5 rounded-xl border border-sky-100 text-sky-900 text-[11px] font-black">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-600" />
                  <span className="font-bold text-xs font-sans">สรุปโดยรวม: ใช้เวลาประมาณ 35± วัน กว่าพัสดุจะส่งถึงมือลูกค้าค่ะ</span>
                </li>
              </ul>
            </div>

            {/* 4. ชำระสินค้า */}
            <div className="bg-pink-50/20 rounded-2xl border border-[#fbc3d0]/60 p-4.5 space-y-2.5">
              <h3 className="text-xs sm:text-sm font-black text-[#db5984] tracking-wide flex items-center gap-1.5 font-sans">
                <DollarSign className="w-4 h-4" />
                ชำระกี่รอบ? รับมัดจำไหม?
              </h3>
              <ul className="space-y-2 text-xs leading-relaxed font-semibold text-gray-700 font-sans pl-2">
                <li className="font-normal">• <strong>ชำระรอบเดียวจบ</strong> (ราคารวมนำเข้าและภาษีแล้ว ไม่มีเก็บเพิ่มภายหลังค่ะ)</li>
                <li className="font-normal">• <strong>รับมัดจำ 50%</strong> (จ่ายส่วนที่เหลือเมื่อสินค้าถึงไทย ทางร้านจะแท็กแจ้งทางทวิตค่ะ)</li>
              </ul>
            </div>

            {/* 5. อัพเดทสินค้า */}
            <div className="bg-purple-50/40 rounded-2xl border border-purple-200/60 p-4.5 space-y-2.5">
              <h3 className="text-xs sm:text-sm font-black text-purple-900 tracking-wide flex items-center gap-1.5 font-sans">
                <MessageCircle className="w-4 h-4 text-purple-600" />
                อัพเดทสินค้า/เช็คสถานะทางไหน?
              </h3>
              <ul className="space-y-1.5 text-xs leading-relaxed font-medium text-purple-950 font-sans pl-1">
                <li className="font-normal">• ติดตามสถานะผ่านแท็ก <strong>#yomieupdate</strong> หรือเช็คจากลิงก์ใน bio ทวิตได้เลยค่ะ</li>
                <li className="font-normal">• ร้านจะแท็กแจ้งเมื่อ <strong>สินค้าส่งรอบเรือ / ถึงไทย / ได้เลขแทรคพัสดุ</strong> ค่ะ</li>
                <li className="font-normal">• สำหรับแอคที่มียอดค้าง ทางร้านจะ DM แจ้งยอดหลังสินค้าถึงไทยค่ะ</li>
              </ul>
            </div>

            {/* 6. การยึดสินค้า */}
            <div className="bg-red-50/40 rounded-2xl border border-red-200 p-4.5 space-y-2.5">
              <h3 className="text-xs sm:text-sm font-black text-red-800 tracking-wide flex items-center gap-1.5 font-sans">
                <AlertOctagon className="w-4 h-4 text-red-500" />
                การยึดสินค้า
              </h3>
              <ul className="space-y-1.5 text-xs leading-relaxed font-bold text-red-900 font-sans pl-1.5">
                <li className="font-normal">• ยกเลิกสินค้าในภายหลัง ขอสงวนสิทธิ์ไม่คืนมัดจำทุกกรณีนะคะ</li>
                <li className="font-normal">• หากแจ้งยอดแล้วไม่ได้รับการโอนภายในเวลาที่กำหนด หรือตามที่ตกลงไว้ ขอสงวนสิทธิ์ไม่รับออเดอร์ค่ะ</li>
                <li className="font-normal">• หากไม่ชำระยอดค้างภายในเวลาที่กำหนด หรือตามที่ตกลงไว้ ขอสงวนสิทธิ์ยึดสินค้า + blacklist ค่า</li>
              </ul>
            </div>

            {/* 7. การเคลมสินค้า */}
            <div className="bg-emerald-50/30 rounded-2xl border border-emerald-200/80 p-4.5 space-y-2.5">
              <h3 className="text-xs sm:text-sm font-black text-emerald-800 tracking-wide flex items-center gap-1.5 font-sans">
                <BadgeInfo className="w-4 h-4 text-emerald-600" />
                การเคลมสินค้า
              </h3>
              <ul className="space-y-2 text-xs leading-relaxed font-semibold text-gray-750 font-sans pl-1">
                <li className="text-emerald-900 font-normal underline">
                  📸 ⚠️ รบกวนถ่ายคลิปแกะกล่องพัสดุเพื่อใช้เป็นหลักฐานกรณีสินค้าเสียหายนะคะ
                </li>
                <li className="font-normal">
                  • หากสินค้าชำรุดทางร้านยินดีคืนเงิน 100% (รบกวนส่งสินค้าเสียหายคืน โดยทางร้านรับผิดชอบค่าส่งให้ค่ะ)
                </li>
                <li className="font-normal">
                  • หากมีสินค้าสำรอง แอดมินจะรีบจัดส่งให้ทันทีค่ะ
                </li>
              </ul>
            </div>

          </div>

          {/* Action button to create preorder right away */}
          <div className="pt-2">
            <p className="text-center text-[11px] font-bold text-[#db5984] animate-pulse">
              อ่านครบถ้วนแล้ว กรอกฟอร์มสั่งสินค้าได้เลยค่า
            </p>
          </div>

          {/* Go to Order Tab button section */}
          {onGoToOrder && (
            <div className="pt-4 border-t-2 border-dashed border-pink-100 flex flex-col items-center">
              <button
                type="button"
                onClick={onGoToOrder}
                className="w-full bg-[#db5984] hover:bg-[#c4406a] text-white font-extrabold py-3.5 px-6 rounded-2xl transition duration-200 border-2 border-[#db5984] shadow-[0_4px_0_#b23c60] hover:translate-y-[1px] active:translate-y-[3px] cursor-pointer flex items-center justify-center gap-2 text-sm sm:text-base font-sans"
              >
                <ShoppingBag className="w-5 h-5 shrink-0" />
                <span className="font-normal text-[15px]">เข้าสู่หน้าฟอร์มสั่งซื้อ</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

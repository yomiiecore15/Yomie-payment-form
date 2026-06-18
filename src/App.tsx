import { useState, useEffect } from 'react';
import { SheetConfig, PostalCodeData, PreorderData } from './types';
import { Header } from './components/Header';
import { SearchBox } from './components/SearchBox';
import { StatusCard } from './components/StatusCard';
import { PreorderForm } from './components/PreorderForm';
import { AdminPanel } from './components/AdminPanel';
import { PasscodeModal } from './components/PasscodeModal';
import { 
  INITIAL_CONFIG, SAMPLE_POSTAL_CODES, buildQueryUrl, parsePostalCodeGvizData 
} from './sampleData';
import { 
  AlertCircle, ShieldAlert, Sparkles, CheckCircle2, 
  MapPin, ShoppingBag, Plus, Calendar, ArrowLeft, Send, FileText, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Conditions } from './components/Conditions';

export default function App() {
  const [activeTab, setActiveTab] = useState<'order' | 'checker' | 'conditions'>('conditions');
  const [config, setConfig] = useState<SheetConfig>(INITIAL_CONFIG);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('yomie_admin_authenticated') === 'true';
  });
  const [isPasscodeOpen, setIsPasscodeOpen] = useState(false);
  
  // Postal Checker states
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckerLoading, setIsCheckerLoading] = useState(false);
  const [checkerError, setCheckerError] = useState<string | null>(null);
  const [matchedRows, setMatchedRows] = useState<PostalCodeData[]>([]);
  
  // Preorder State
  const [submittedOrder, setSubmittedOrder] = useState<PreorderData | null>(null);
  const [lastUpdated, setLastUpdated] = useState("00:00:00");

  // Keep clocks refreshed
  const refreshUpdateTime = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setLastUpdated(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
  };

  useEffect(() => {
    refreshUpdateTime();
  }, []);

  // Load configuration from local storage on startup
  useEffect(() => {
    const saved = localStorage.getItem('yomie_postal_config_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Automatically default/migrate empty Apps Script Web Hook URL to user's deployment
        if (!parsed.appsScriptUrl || parsed.appsScriptUrl.trim() === "") {
          parsed.appsScriptUrl = INITIAL_CONFIG.appsScriptUrl;
          parsed.isConfigured = true;
        }
        // Save the migrated config
        localStorage.setItem('yomie_postal_config_v2', JSON.stringify(parsed));
        setConfig(parsed);
      } catch (e) {
        console.error('Failed to parse saved config.', e);
        setConfig(INITIAL_CONFIG);
      }
    } else {
      setConfig(INITIAL_CONFIG);
      localStorage.setItem('yomie_postal_config_v2', JSON.stringify(INITIAL_CONFIG));
    }
  }, []);

  const handleSaveConfig = (newConfig: SheetConfig) => {
    setConfig(newConfig);
    localStorage.setItem('yomie_postal_config_v2', JSON.stringify(newConfig));
    handleClearChecker();
  };

  const handleResetToDemo = () => {
    setConfig(INITIAL_CONFIG);
    localStorage.removeItem('yomie_postal_config_v2');
    handleClearChecker();
    setSubmittedOrder(null);
  };

  const handleClearChecker = () => {
    setSearchQuery('');
    setMatchedRows([]);
    setCheckerError(null);
  };

  const handleOpenSettings = () => {
    if (isAdminAuthenticated) {
      setIsSettingsOpen(true);
    } else {
      setIsPasscodeOpen(true);
    }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('yomie_admin_authenticated');
    setIsSettingsOpen(false);
  };

  const handleRefresh = () => {
    refreshUpdateTime();
    if (activeTab === 'checker' && searchQuery) {
      handleSearch(searchQuery);
    } else {
      // Gentle bounce on logo text
      const logo = document.getElementById("brand-yomie-text");
      if (logo) {
        logo.classList.add("scale-105");
        setTimeout(() => logo.classList.remove("scale-105"), 300);
      }
    }
  };

  // ZIP remote or mock query lookup
  const handleSearch = async (query: string) => {
    const cleanQuery = query.trim();
    if (cleanQuery.length !== 5) return;

    setSearchQuery(cleanQuery);
    setCheckerError(null);
    setMatchedRows([]);
    setIsCheckerLoading(true);
    refreshUpdateTime();

    if (config.useFallbackSample) {
      setTimeout(() => {
        const matches = SAMPLE_POSTAL_CODES.filter(item => item.postalCode === cleanQuery);
        setMatchedRows(matches);
        setIsCheckerLoading(false);
      }, 700);
    } else {
      try {
        const queryUrl = buildQueryUrl(config.spreadsheetId, config.sheetName, config.spreadsheetUrl);
        const res = await fetch(queryUrl);
        if (!res.ok) {
          throw new Error(`Google Sheets endpoint error. Status Code: ${res.status}`);
        }
        const text = await res.text();
        const allRows = parsePostalCodeGvizData(text);
        const matches = allRows.filter(item => item.postalCode === cleanQuery);
        setMatchedRows(matches);
      } catch (err: any) {
        console.error(err);
        setCheckerError(
          "ไม่สามารถดึงข้อมูลจาก Google Sheets ได้ กรุณาตรวจสอบให้แน่ใจว่าได้เปิดสิทธิ์การแชร์ไฟล์เป็น 'ทุกคนที่มีลิงก์ดูได้' และตั้งชื่อชีตถูกต้องในหน้าตั้งค่าข้อมูลของร้านนะคะ"
        );
      } finally {
        setIsCheckerLoading(false);
      }
    }
  };

  // Preorder Order Complete Success handler
  const handleOrderSubmitted = (order: PreorderData) => {
    setSubmittedOrder(order);
    
    // Concurrently save to local storage order history log (so admin can view inside settings!)
    const savedOrdersHistory = localStorage.getItem('yomie_orders_history_v2');
    let historyList: PreorderData[] = [];
    if (savedOrdersHistory) {
      try {
        historyList = JSON.parse(savedOrdersHistory);
      } catch (e) {
        console.error(e);
      }
    }
    historyList.unshift(order); // Put new order at the front
    localStorage.setItem('yomie_orders_history_v2', JSON.stringify(historyList));
  };

  return (
    <div className="min-h-screen stripes-bg flex flex-col font-sans text-gray-900 selection:bg-pink-100 selection:text-pink-900 pb-16" id="app-root-layout">
      
      {/* Decorative stars background */}
      <div className="absolute top-[180px] left-[8%] animate-sparkle text-[#ebd57d] opacity-50 hidden lg:block pointer-events-none">
        <svg className="w-9 h-9 fill-[#eedd9a]" viewBox="0 0 24 24">
          <path d="M12 2l2.4 7.2L22 11.6l-5.6 5.4 1.8 7.5L12 20.2l-6.2 4.3 1.8-7.5-5.6-5.4 7.6-2.4z" />
        </svg>
      </div>
      <div className="absolute top-[320px] right-[7%] animate-sparkle text-yellow-300 opacity-65 hidden lg:block pointer-events-none" style={{ animationDelay: "2s" }}>
        <svg className="w-10 h-10 fill-[#faca44]" viewBox="0 0 24 24">
          <path d="M12 2l2.4 7.2L22 11.6l-5.6 5.4 1.8 7.5L12 20.2l-6.2 4.3 1.8-7.5-5.6-5.4 7.6-2.4z" />
        </svg>
      </div>

      {/* Header bar component */}
      <Header 
        isConfigured={config.isConfigured} 
        onOpenSettings={handleOpenSettings} 
        onRefresh={handleRefresh}
      />

      {/* Tabs navigation switch */}
      <div className="max-w-xl w-full mx-auto px-4 mt-6 flex justify-center z-10" id="tabs-switcher-bar">
        <div className="bg-white/80 backdrop-blur-xs border-2 border-pink-100 p-1 bg-white rounded-2xl flex items-center justify-center w-full shadow-sm">
          <button
            onClick={() => {
              setActiveTab('conditions');
              setSubmittedOrder(null);
            }}
            className={`flex-1 py-2.5 text-[11px] sm:text-xs md:text-sm font-black tracking-wide transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'conditions' 
                ? 'bg-[#db5984] text-white shadow-md shadow-pink-250' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="font-normal text-[12px]">เงื่อนไข</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('order');
              setSubmittedOrder(null);
            }}
            className={`flex-1 py-2.5 text-[11px] sm:text-xs md:text-sm font-black tracking-wide transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'order' 
                ? 'bg-[#db5984] text-white shadow-md shadow-pink-250' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="font-normal text-[12px]">สั่งสินค้า</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('checker');
              handleClearChecker();
            }}
            className={`flex-1 py-2.5 text-[11px] sm:text-xs md:text-sm font-black tracking-wide transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'checker' 
                ? 'bg-[#db5984] text-white shadow-md shadow-pink-250' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="font-normal text-[12px] no-underline not-italic">เช็คพื้นที่ส่ง</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-12 flex flex-col justify-center">
        
        {/* TAB 1: PREORDER FORM SHEET */}
        {activeTab === 'order' && (
          <div className="animate-fade-in space-y-6">
            {!submittedOrder ? (
              <PreorderForm config={config} onSuccess={handleOrderSubmitted} />
            ) : (
              /* ORDER COMPLETION CELEBRATION COMPONENT */
              <div className="max-w-xl mx-auto" id="order-success-screen">
                <div className="cute-card-frame bg-white p-6 sm:p-8 relative text-left shadow-xl">
                  
                  {/* Absolute cute labels */}
                  <div className="absolute top-5 left-6 text-[#eb5e45] font-mono text-[9px] font-black uppercase tracking-widest pointer-events-none">
                    💌 order submitted success
                  </div>
                  
                  <div className="absolute top-4 right-6 animate-sparkle pointer-events-none">
                    <svg className="w-9 h-9 text-green-400 fill-green-200" viewBox="0 0 24 24">
                      <path d="M12 2l2.4 7.2L22 11.6l-5.6 5.4 1.8 7.5L12 20.2l-6.2 4.3 1.8-7.5-5.6-5.4 7.6-2.4z" />
                    </svg>
                  </div>

                  {/* Icon Status */}
                  <div className="text-center space-y-2.5 pb-5 border-b border-dashed border-gray-150 pt-3">
                    <div className="w-14 h-14 bg-transparent border-2 border-green-200 rounded-full mx-auto flex items-center justify-center text-green-500">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-[#152033] text-xl sm:text-2xl font-extrabold tracking-wide font-sans">
                      บันทึกรายการสำเร็จ ♡
                    </h2>
                    <p className="text-gray-550 text-xs sm:text-sm font-medium font-sans max-w-sm mx-auto">
                      บันทึกข้อมูล และส่งใบสรุปรายการช่องทางเมลเรียบร้อยค่า จะทำการอัพเดทสถานะในเว็บภายใน 1-3 วันนะคะ
                    </p>
                  </div>

                  {/* Summary order details list */}
                  <div className="py-5 space-y-4 text-xs font-sans text-left">
                    <h4 className="text-sm font-black text-gray-850 flex items-center gap-1">
                      <FileText className="w-4 h-4 text-[#eb5e45]" />
                      สรุปออเดอร์
                    </h4>

                    <div className="bg-gray-50/75 p-4 rounded-2xl border border-gray-150 space-y-3">
                      <div className="grid grid-cols-2 gap-2 border-b border-dashed border-gray-250 pb-2">
                        <div>
                          <p className="text-gray-400 font-medium text-[10px] uppercase">วัน-เวลา</p>
                          <p className="font-bold text-gray-805 font-mono">{submittedOrder.timestamp}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium text-[10px] uppercase">Account</p>
                          <p className="font-bold text-gray-805">{submittedOrder.customerAccount || submittedOrder.name}</p>
                        </div>
                      </div>

                      <div className="border-b border-dashed border-gray-250 pb-2">
                        <p className="text-gray-400 font-medium text-[10px] uppercase">รายการสั่งซื้อ</p>
                        <div className="font-bold text-[#db5984] pt-1">
                          {submittedOrder.items && Array.isArray(submittedOrder.items) ? (
                            submittedOrder.items.map((it, i) => (
                              <p key={i} className="whitespace-pre-wrap leading-relaxed">
                                {it.itemName}
                                {it.quantity > 1 ? ` x${it.quantity}` : ''}
                                {it.notes ? ` [${it.notes}]` : ''}
                              </p>
                            ))
                          ) : (
                            <p>พรีออเดอร์สินค้าของร้าน</p>
                          )}
                        </div>
                      </div>

                      <div className="border-b border-dashed border-gray-250 pb-2">
                        <p className="text-gray-400 font-medium text-[10px] uppercase">ที่อยู่ผู้รับปลายทาง</p>
                        <p className="font-bold text-gray-700 leading-relaxed pt-1 whitespace-pre-wrap">
                          {submittedOrder.shippingInfo || `${submittedOrder.detailAddress} ต. ${submittedOrder.subdistrict} อ. {submittedOrder.district} จ. ${submittedOrder.province} ${submittedOrder.postalCode}`}
                        </p>
                      </div>

                      <div className="flex justify-between items-center bg-pink-50/50 p-2.5 rounded-xl border border-pink-100">
                        <span className="font-bold text-gray-750">ยอดชำระที่โอนแล้ว:</span>
                        <span className="text-base font-black text-[#db5984] font-mono">
                          {isNaN(Number(submittedOrder.transferAmount)) 
                            ? submittedOrder.transferAmount 
                            : Number(submittedOrder.transferAmount).toLocaleString()} บาท
                        </span>
                      </div>


                    </div>
                  </div>

                  <button
                    onClick={() => setSubmittedOrder(null)}
                    className="w-full bg-[#db5984] hover:bg-[#c4406a] text-white font-extrabold py-3.5 px-4 rounded-2xl transition duration-200 border-2 border-[#db5984] shadow-[0_4px_0_#b23c60] hover:translate-y-[1px] active:translate-y-[4px] cursor-pointer"
                  >
                    BACK
                  </button>

                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: POSTAL CODE REMOTE CHECKER */}
        {activeTab === 'checker' && (
          <div className="animate-fade-in space-y-6">
            
            {/* Search inputs if quiet */}
            {!searchQuery && !isCheckerLoading && (
              <div className="space-y-6 pt-5 animate-fade-in" id="search-view-panel">
                <SearchBox 
                  onSearch={handleSearch} 
                  isLoading={isCheckerLoading} 
                  onClear={handleClearChecker}
                />
              </div>
            )}

            {/* Loading panel */}
            {isCheckerLoading && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-fade-in" id="loading-panel">
                <div className="relative">
                  <div className="w-14 h-14 border-4 border-pink-100 rounded-full"></div>
                  <div className="absolute top-0 w-14 h-14 border-4 border-[#eb5e45] border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-sm text-gray-500 font-bold font-sans">กำลังเปิดสแกนรหัสไปรษณีย์ในระบบฐานข้อมูลร้าน...</p>
              </div>
            )}

            {/* Fetch error banners */}
            {!isCheckerLoading && checkerError && (
              <div className="max-w-2xl mx-auto bg-red-50 border-2 border-red-200 text-red-800 p-5 rounded-3xl flex items-start space-x-3.5 shadow-sm mt-5 text-left animate-fade-in" id="error-box">
                <AlertCircle className="w-6 h-6 text-[#eb5e45] flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">ตรวจสอบล้มเหลว</h4>
                  <p className="text-xs text-red-700 leading-relaxed font-sans">{checkerError}</p>
                  {isAdminAuthenticated && (
                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="mt-2 text-xs text-[#eb5e45] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      เปิดหน้าร้านค้ารวมควบคุม เพื่อแก้ไขสิทธิ์แชร์ชีต →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Result summary */}
            {!isCheckerLoading && !checkerError && searchQuery && (
              <div className="pt-2">
                <StatusCard 
                  postalCode={searchQuery}
                  matches={matchedRows}
                  onBack={handleClearChecker}
                  lastUpdatedTime={lastUpdated}
                  isRealTimeActive={!config.useFallbackSample}
                />
              </div>
            )}

          </div>
        )}

        {/* TAB 3: PREORDER CONDITIONS */}
        {activeTab === 'conditions' && (
          <div className="animate-fade-in space-y-6">
            <Conditions 
              onGoToChecker={() => {
                setActiveTab('checker');
                handleClearChecker();
              }} 
              onGoToOrder={() => {
                setActiveTab('order');
                setSubmittedOrder(null);
                window.scrollTo({ top: 0, behavior: 'auto' });
              }}
            />
          </div>
        )}

      </main>

      {/* Admin settings Sliding controls pane */}
      <AdminPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        config={config} 
        onSaveConfig={handleSaveConfig} 
        onResetToDemo={handleResetToDemo} 
        onLogout={handleLogout}
      />

      {/* Admin verification password modal */}
      <PasscodeModal
        isOpen={isPasscodeOpen}
        onClose={() => setIsPasscodeOpen(false)}
        onSuccess={() => {
          setIsPasscodeOpen(false);
          setIsAdminAuthenticated(true);
          sessionStorage.setItem('yomie_admin_authenticated', 'true');
          setIsSettingsOpen(true);
        }}
      />

    </div>
  );
}

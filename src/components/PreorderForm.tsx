import React, { useState, useEffect } from 'react';
import { SheetConfig, PreorderItem, PreorderData, PostalCodeData } from '../types';
import { 
  ShoppingBag, User, Phone, MessageSquare, MapPin, 
  Plus, Trash2, CreditCard, Calendar, Upload, 
  CheckCircle, AlertCircle, RefreshCw, Send, HelpCircle, FileText, Wallet,
  Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractSpreadsheetId, buildQueryUrl, parsePostalCodeGvizData, SAMPLE_POSTAL_CODES } from '../sampleData';

const parseShippingText = (text: string) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // 1. Extract Name (Take first line and discard trailing punctuation or phones)
  let parsedName = '';
  if (lines.length > 0) {
    let firstLine = lines[0];
    firstLine = firstLine
      .replace(/0[2345689]\d{8}/g, '')
      .replace(/02\d{7}/g, '')
      .replace(/\+?66\d{8,9}/g, '')
      .replace(/โทร\.?[:\s]*/gi, '')
      .replace(/tel\.?[:\s]*/gi, '')
      .replace(/[\(\):,-]/g, '')
      .trim();
    parsedName = firstLine;
  }

  // 2. Extract Phone
  let parsedPhone = '';
  const cleanDigits = text.replace(/[-\s\(\)]/g, '');
  const directMatches = cleanDigits.match(/(0[345689]\d{8}|02\d{7})/);
  if (directMatches) {
    parsedPhone = directMatches[0];
  } else {
    const altMatch = text.replace(/[^0-9]/g, '').match(/(0\d{8,9})/);
    if (altMatch) {
      parsedPhone = altMatch[0];
    }
  }

  // 3. Extract 5-digit postal code
  const zipMatch = text.match(/\b\d{5}\b/);
  const parsedZip = zipMatch ? zipMatch[0] : '';

  return { parsedName, parsedPhone, parsedZip };
};

interface PreorderFormProps {
  config: SheetConfig;
  onSuccess: (order: PreorderData) => void;
}

interface PreorderFormDraft {
  name?: string;
  phone?: string;
  contact?: string;
  customerAccount?: string;
  customerGmail?: string;
  shippingInfo?: string;
  postalCode?: string;
  detailAddress?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  isRemoteArea?: boolean;
  remoteAreaSelection?: string;
  items?: PreorderItem[];
  totalAmount?: string;
  paymentMethod?: string;
  paymentMethodOther?: string;
  shippingPaymentStatus?: string;
  transferAmount?: string;
  transferDate?: string;
  transferTime?: string;
  agreeTerms?: boolean;
  customAnswers?: Record<string, string>;
  additionalNotes?: string;
}

export const PreorderForm: React.FC<PreorderFormProps> = ({ config, onSuccess }) => {
  // Load draft from localStorage safely
  const [draft] = useState<PreorderFormDraft>(() => {
    try {
      const saved = localStorage.getItem('yomie_preorder_form_draft');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Customer Details states
  const [name, setName] = useState(draft.name || '');
  const [phone, setPhone] = useState(draft.phone || '');
  const [contact, setContact] = useState(draft.contact || '');
  const [customerAccount, setCustomerAccount] = useState(draft.customerAccount || '');
  const [customerGmail, setCustomerGmail] = useState(draft.customerGmail || '');
  
  // Shipping Address states
  const [shippingInfo, setShippingInfo] = useState(draft.shippingInfo || '');
  const [postalCode, setPostalCode] = useState(draft.postalCode || '');
  const [detailAddress, setDetailAddress] = useState(draft.detailAddress || '');
  const [subdistrict, setSubdistrict] = useState(draft.subdistrict || '');
  const [district, setDistrict] = useState(draft.district || '');
  const [province, setProvince] = useState(draft.province || '');
  const [isRemoteArea, setIsRemoteArea] = useState(draft.isRemoteArea || false);
  const [isSearchingZip, setIsSearchingZip] = useState(false);
  const [zipMessage, setZipMessage] = useState<{ type: 'success' | 'warn' | 'error', text: string } | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const handleShippingInfoChange = (val: string) => {
    setShippingInfo(val);
    const { parsedName, parsedPhone, parsedZip } = parseShippingText(val);
    if (parsedName) setName(parsedName);
    if (parsedPhone) setPhone(parsedPhone);
    if (parsedZip) setPostalCode(parsedZip);
    setDetailAddress(val.trim());
  };

  // Preorder Items
  const [items, setItems] = useState<PreorderItem[]>(
    draft.items || [{ id: '1', itemName: '', quantity: 1, notes: '' }]
  );

  // Payment states
  const [totalAmount, setTotalAmount] = useState<string>(draft.totalAmount || '');
  const [remoteAreaSelection, setRemoteAreaSelection] = useState<string>(draft.remoteAreaSelection || '');
  const [paymentMethod, setPaymentMethod] = useState<string>(draft.paymentMethod || '');
  const [paymentMethodOther, setPaymentMethodOther] = useState<string>(draft.paymentMethodOther || '');
  const [shippingPaymentStatus, setShippingPaymentStatus] = useState<string>(draft.shippingPaymentStatus || '');
  const [transferAmount, setTransferAmount] = useState<string>(() => {
    if (draft.transferAmount !== undefined && draft.transferAmount !== null) {
      const clean = String(draft.transferAmount).replace(/\D/g, '');
      return clean ? Number(clean).toLocaleString('en-US') : '';
    }
    return '';
  });
  const [transferDate, setTransferDate] = useState(draft.transferDate || '');
  const [transferTime, setTransferTime] = useState(draft.transferTime || '');
  const [slipImage, setSlipImage] = useState<string | null>(null); // Keep slipImage local storage-free to avoid overflow / quota errors
  const [slipName, setSlipName] = useState<string>('');
  const [agreeTerms, setAgreeTerms] = useState(draft.agreeTerms || false);
  const [additionalNotes, setAdditionalNotes] = useState(draft.additionalNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Custom answers state
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>(draft.customAnswers || {});

  const handleAnswerChange = (qId: string, val: string) => {
    setCustomAnswers(prev => ({ ...prev, [qId]: val }));
  };

  // Safe effect to save state developments as design draft in LocalStorage
  useEffect(() => {
    try {
      const currentDraft: PreorderFormDraft = {
        name,
        phone,
        contact,
        customerAccount,
        customerGmail,
        shippingInfo,
        postalCode,
        detailAddress,
        subdistrict,
        district,
        province,
        isRemoteArea,
        remoteAreaSelection,
        items,
        totalAmount,
        paymentMethod,
        paymentMethodOther,
        shippingPaymentStatus,
        transferAmount,
        transferDate,
        transferTime,
        agreeTerms,
        customAnswers,
        additionalNotes
      };
      localStorage.setItem('yomie_preorder_form_draft', JSON.stringify(currentDraft));
    } catch (e) {
      console.error("Failed to write preorder form draft", e);
    }
  }, [
    name, phone, contact, customerAccount, customerGmail,
    shippingInfo, postalCode, detailAddress, subdistrict, district, province,
    isRemoteArea, remoteAreaSelection, items, totalAmount,
    paymentMethod, paymentMethodOther, shippingPaymentStatus,
    transferAmount, transferDate, transferTime, agreeTerms, customAnswers, additionalNotes
  ]);

  // Fetch full postal codes database to support auto-completions & surcharges
  const [postalDatabase, setPostalDatabase] = useState<PostalCodeData[]>(SAMPLE_POSTAL_CODES);

  useEffect(() => {
    const fetchRemoteDatabase = async () => {
      if (!config.useFallbackSample && config.spreadsheetId) {
        try {
          const queryUrl = buildQueryUrl(config.spreadsheetId, config.sheetName, config.spreadsheetUrl);
          const response = await fetch(queryUrl);
          if (response.ok) {
            const text = await response.text();
            const parsed = parsePostalCodeGvizData(text);
            if (parsed.length > 0) {
              setPostalDatabase(parsed);
            }
          }
        } catch (e) {
          console.error("Postal DB fetch failed. Falling back to default codes.", e);
        }
      }
    };
    fetchRemoteDatabase();
  }, [config]);

  // Handle 5-digit postal code lookup
  useEffect(() => {
    const cleanZip = postalCode.trim().replace(/[^0-9]/g, '');
    if (cleanZip.length !== 5) {
      setZipMessage(null);
      setIsRemoteArea(false);
      setRemoteAreaSelection('');
      return;
    }

    setIsSearchingZip(true);
    setZipMessage(null);

    // Simulate small delay for premium UX feel
    setTimeout(() => {
      const matches = postalDatabase.filter(p => p.postalCode === cleanZip);
      
      if (matches.length > 0) {
        // Look for any match representing remote area
        const remoteMatch = matches.find(p => {
          const areaL = (p.area || "").toLowerCase();
          if (config.useFallbackSample) {
            return areaL.includes("ห่างไกล") || areaL.includes("พิเศษ") || areaL.includes("เกาะ") || areaL.includes("ดอย") || areaL.includes("ชายแดน") || areaL.includes("remote") || areaL.includes("20") || !areaL.includes("ปกติ");
          }
          return true; // All rows in the configured Google Sheets are remote areas
        });

        const activeMatch = remoteMatch || matches[0];
        
        // Auto-populate
        setSubdistrict(activeMatch.subdistrict || "");
        setProvince(activeMatch.province || "");
        
        // Fallback district lookup by subdistrict or defaults
        if (activeMatch.province === "เชียงใหม่" && activeMatch.subdistrict === "อมก๋อย") {
          setDistrict("อมก๋อย");
        } else if (activeMatch.province === "แม่ฮ่องสอน") {
          setDistrict("ปางมะผ้า");
        } else if (activeMatch.province === "กระบี่") {
          setDistrict("เกาะลันตา");
        } else {
          setDistrict(""); // Let user fill
        }

        if (remoteMatch) {
          setIsRemoteArea(true);
          setRemoteAreaSelection('อยู่ค่า');
          setZipMessage({
            type: 'warn',
            text: `บวกค่าส่งเพิ่ม +20.- สำหรับพื้นที่ห่างไกล: ${activeMatch.area || 'พื้นที่ห่างไกล/พิเศษของระบบ'}`
          });
        } else {
          setIsRemoteArea(false);
          setRemoteAreaSelection('ไม่อยู่ค่ะ');
          setZipMessage({
            type: 'success',
            text: 'ตรวจพบรหัสไปรษณีย์พื้นที่ปกติ ไม่มีการบวกค่าส่งเพิ่มค่ะ'
          });
        }
      } else {
        setIsRemoteArea(false);
        setRemoteAreaSelection('ไม่อยู่ค่ะ');
        setZipMessage({
          type: 'success',
          text: 'ตรวจพบรหัสไปรษณีย์พื้นที่ปกติ ไม่มีการบวกค่าส่งเพิ่มค่ะ'
        });
      }
      setIsSearchingZip(false);
    }, 500);

  }, [postalCode, postalDatabase, config.useFallbackSample]);

  // Handle Items changes
  const handleAddItem = () => {
    const newId = String(Date.now());
    setItems([...items, { id: newId, itemName: '', quantity: 1, notes: '' }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const updateItemDetails = (id: string, field: keyof PreorderItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Drag and Drop & Slip Upload handles with Canvas Image Compression
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("กรุณาเลือกไฟล์รูปภาพที่ถูกต้องนะคะ 📸");
      return;
    }

    setSlipName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress using Canvas for robust Google Sheets handling (Limit max width/height to 600px)
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 500;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // High compression output quality (0.6) to keep sheets cells from breaking
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
          setSlipImage(compressedBase64);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  // Submit Order Details to server
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Form Validations
    if (!customerAccount.trim()) return setFormError("กรุณากรอกชื่อ Account ของคุณลูกค้าในส่วนข้อมูลลูกค้าด้วยนะคะ");
    if (!customerAccount.trim().startsWith('@')) {
      return setFormError("ชื่อ Account ต้องเริ่มต้นด้วย @ เสมอค่ะ (เช่น @yomiie_core)");
    }
    if (!customerGmail.trim()) return setFormError("กรุณากรอก Gmail ของคุณลูกค้าเพื่อรับใบสรุปรายการด้วยนะคะ");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerGmail.trim())) {
      return setFormError("กรุณากรอกที่อยู่ Gmail/อีเมล ให้ถูกต้องด้วยนะคะ (เช่น name@gmail.com)");
    }

    if (!shippingInfo.trim()) return setFormError("กรุณากรอกหรือวางข้อมูล ชื่อ / ที่อยู่ / เบอร์โทรศัพท์ ในการจัดส่งด้วยนะคะ");

    // Robust extraction fallback if name, phone, postalCode are empty
    const { parsedName, parsedPhone, parsedZip } = parseShippingText(shippingInfo);
    const finalName = name.trim() || parsedName.trim() || (shippingInfo.split('\n')[0] || "คุณลูกค้า").substring(0, 40).trim();
    const finalPhone = (phone.trim() || parsedPhone.trim() || "0000000000").replace(/[^0-9]/g, '');
    const finalPostalCode = postalCode.trim() || parsedZip.trim();

    if (!finalName) {
      return setFormError("กรุณาระบุชื่อผู้รับด้วยนะคะ");
    }
    if (finalPhone.length < 9) {
      return setFormError("กรุณาระบุเบอร์โทรศัพท์ที่ติดต่อได้ในข้อมูลที่อยู่ด้วยนะคะ");
    }
    if (!finalPostalCode || finalPostalCode.length !== 5) {
      return setFormError("กรุณากรอกหรือระบุรหัสไปรษณีย์ 5 หลักให้ถูกต้องในข้อมูลที่อยู่ด้วยนะคะ");
    }

    if (items.some(item => !item.itemName.trim())) return setFormError("กรุณากรอกรายละเอียดรายการสินค้าที่ต้องการสั่งซื้อด้วยนะคะ");
    
    // Validate custom questions
    if (config.customQuestions) {
      for (const q of config.customQuestions) {
        if (q.required && !customAnswers[q.id]?.trim()) {
          return setFormError(`กรุณากรอกหรือระบุคำตอบสำหรับ "${q.label}" ด้วยนะคะ`);
        }
      }
    }

    if (!totalAmount.trim()) return setFormError("กรุณากรอกยอดรวม (ราคาสินค้า + ค่าส่ง) ด้วยนะคะ");
    if (!remoteAreaSelection) return setFormError("กรุณาเลือกคำตอบ 'ที่อยู่จัดส่งอยู่ในเขตพื้นที่ห่างไกลไหมคะ?' ด้วยนะคะ");
    if (!paymentMethod) return setFormError("กรุณาเลือกวิธีการชำระเงินด้วยนะคะ");
    if (paymentMethod === 'อื่นๆ' && !paymentMethodOther.trim()) return setFormError("กรุณากรอกรายละเอียดวิธีการชำระเงินเพิ่มเติมด้วยนะคะ");
    if (!shippingPaymentStatus) return setFormError("กรุณาเลือกคำตอบสำหรับ 'ชำระค่าส่งเลยไหมคะ?' ด้วยนะคะ");
    if (transferAmount === '') return setFormError("กรุณาระบุจำนวนเงินโอนที่ถูกต้องค่ะ");
    if (!transferDate.trim()) return setFormError("กรุณาระบุวันที่โอนในสลิปด้วยนะคะ");
    const dateDigits = transferDate.replace(/\D/g, '');
    if (dateDigits.length < 6) return setFormError("กรุณากรอกวันที่โอนในสลิปให้ครบ 6 หลักนะคะ (เช่น 24/09/26)");

    if (!transferTime.trim()) return setFormError("กรุณาระบุเวลาที่โอนในสลิปด้วยนะคะ");
    const timeDigits = transferTime.replace(/\D/g, '');
    if (timeDigits.length < 4) return setFormError("กรุณากรอกเวลาที่โอนในสลิปให้ครบ 4 หลักนะคะ (เช่น 14:32)");
    if (!slipImage) return setFormError("กรุณาแนบภาพสลิปชำระเงินด้วยนะคะ");
    if (!agreeTerms) return setFormError("กรุณาทำเครื่องหมายยินยอมกรณี 'รับทราบค่า ♡' ด้วยนะคะ");

    setIsSubmitting(true);

    const customAnswersArray = config.customQuestions
      ?.map(q => ({
        label: q.label,
        value: customAnswers[q.id] || ''
      }))
      .filter(ans => ans.value !== '') || [];

    const customFieldsSummary = customAnswersArray
      .map(ans => `${ans.label}: ${ans.value}`)
      .join("\n");

    const submissionPayload = {
      name: finalName,
      phone: finalPhone,
      contact: contact.trim() || "(ไม่ได้ระบุ)",
      customerAccount: customerAccount.trim(),
      customerGmail: customerGmail.trim(),
      postalCode: finalPostalCode,
      subdistrict: subdistrict.trim() || "ไม่พบตำบล",
      district: district.trim() || "ไม่พบอำเภอ",
      province: province.trim() || "ไม่พบจังหวัด",
      detailAddress: detailAddress.trim(),
      items: items.map(({ id, ...rest }) => rest), // exclude react-specific id
      totalAmount: Number(totalAmount.replace(/,/g, '')),
      paymentMethod,
      paymentMethodOther: paymentMethod === 'อื่นๆ' ? paymentMethodOther.trim() : undefined,
      shippingPaymentStatus,
      transferAmount: Number(transferAmount.replace(/,/g, '')),
      transferTime: transferDate.trim() && transferTime.trim() ? `${transferDate.trim()} (${transferTime.trim()})` : new Date().toLocaleString('th-TH'),
      transferDateInSlip: transferDate.trim(),
      transferTimeInSlip: transferTime.trim(),
      additionalNotes: additionalNotes.trim(),
      remoteAreaSelection: remoteAreaSelection,
      slipBase64: slipImage || undefined,
      isRemoteArea,
      shippingInfo: shippingInfo.trim(),
      customAnswers: customAnswersArray,
      customFieldsSummary: customFieldsSummary || undefined,
      originUrl: window.location.origin,
      // Pass config webhooks to let full-stack proxy forward real-time + smtp details
      appsScriptUrl: config.appsScriptUrl,
      lineToken: config.lineToken,
      lineChannelAccessToken: config.lineChannelAccessToken,
      lineGroupId: config.lineGroupId,
      senderEmail: config.senderEmail,
      senderAppPass: config.senderAppPass,
      shopName: config.shopName
    };

    try {
      const response = await fetch("/api/submit-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(submissionPayload)
      });

      if (!response.ok) {
        throw new Error(`Server returned error status code: ${response.status}`);
      }

      const resJson = await response.json();
      
      if (resJson.success) {
        // Clear saved draft from localStorage
        try {
          localStorage.removeItem('yomie_preorder_form_draft');
        } catch (e) {
          console.error(e);
        }

        // Complete state trigger onSuccess
        const d = new Date();
        const timestamp = `${d.getDate()}:${d.getMonth() + 1}:${d.getFullYear()} (${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')})`;
        onSuccess({
          id: String(Date.now()),
          timestamp,
          sku: items.map(i => `${i.itemName} (x${i.quantity})`).join(', '),
          ...submissionPayload,
          district: submissionPayload.district,
          submitLogs: resJson.logs
        } as any);

        // Reset fields
        setName('');
        setPhone('');
        setContact('');
        setCustomerAccount('');
        setCustomerGmail('');
        setShippingInfo('');
        setPostalCode('');
        setDetailAddress('');
        setSubdistrict('');
        setDistrict('');
        setProvince('');
        setItems([{ id: '1', itemName: '', quantity: 1, notes: '' }]);
        setTotalAmount('');
        setRemoteAreaSelection('');
        setPaymentMethod('');
        setPaymentMethodOther('');
        setShippingPaymentStatus('');
        setTransferAmount('');
        setTransferDate('');
        setTransferTime('');
        setSlipImage(null);
        setSlipName('');
        setCustomAnswers({});
      } else {
        setFormError(resJson.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้งค่ะ");
      }
    } catch (err: any) {
      console.error(err);
      // Even if network or API details fail, let's gracefully save locally if they are in full demo fallback mode
      if (!config.appsScriptUrl) {
        // Clear saved draft from localStorage
        try {
          localStorage.removeItem('yomie_preorder_form_draft');
        } catch (e) {
          console.error(e);
        }

        // Simulation mode for gorgeous preview
        const dSim = new Date();
        const timestamp = `${dSim.getDate()}:${dSim.getMonth() + 1}:${dSim.getFullYear()} (${String(dSim.getHours()).padStart(2, '0')}:${String(dSim.getMinutes()).padStart(2, '0')}:${String(dSim.getSeconds()).padStart(2, '0')})`;
        onSuccess({
          id: String(Date.now()),
          timestamp,
          ...submissionPayload,
          district: submissionPayload.district || "อำเภอเมือง"
        } as any);
      } else {
        setFormError("ขออภัยค่ะ! ไม่สามารถเชื่อมต่อระบบหลังบ้านเพื่อบันทึกชีตออเดอร์ได้ กรุณาตรวจสอบการแชร์ชีตหรือตั้งค่า Google Webhook ในหลังบ้านร้านค้าให้ถูกต้องนะคะ");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto" id="preorder-form-container">
      <div className="cute-card-frame bg-white p-5 sm:p-7 relative overflow-hidden text-left shadow-xl">
        
        {/* Banner Headers */}
        <div className="absolute top-5 left-6 text-[#eb5e45] font-mono text-[10px] font-black uppercase tracking-widest pointer-events-none">
          📝 pre-order form sheet
        </div>
        
        {/* Sparkly star */}
        <div className="absolute top-4 right-6 animate-sparkle pointer-events-none">
          <svg className="w-9 h-9 text-[#faca44] fill-[#faca44]" viewBox="0 0 24 24">
            <path d="M12 2l2.4 7.2L22 11.6l-5.6 5.4 1.8 7.5L12 20.2l-6.2 4.3 1.8-7.5-5.6-5.4 7.6-2.4z" />
          </svg>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pt-5">
          
          {/* Header Title Greeting */}
          <div className="text-center space-y-1 mt-1 pb-3 border-b-2 border-dashed border-pink-100">
            <ShoppingBag className="w-7 h-7 text-[#eb5e45] mx-auto text-heartbeat" />
            <h2 className="text-[#152033] text-xl sm:text-2xl font-extrabold tracking-wide font-sans">
              ฟอร์มสั่งซื้อ
            </h2>
            <p className="text-[#8492a6] text-xs sm:text-sm font-medium font-sans">
              รบกวนอ่านเงื่อนไขของร้านก่อนกรอกฟอร์มสั่งซื้อนะคะ 💖
            </p>
          </div>

          {/* Section 1: Customer Contact Info */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-[#db5984] border-l-4 border-[#db5984] pl-2 font-sans flex items-center gap-1.5">
              <User className="w-4 h-4 shrink-0" />
              1. ข้อมูลลูกค้า
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block text-left">
                  ชื่อ Account (มี@) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น @yomiie_core"
                  value={customerAccount}
                  onChange={(e) => setCustomerAccount(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb] rounded-xl text-gray-950 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block text-left">
                  Gmail ปัจจุบัน <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder=""
                  value={customerGmail}
                  onChange={(e) => setCustomerGmail(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb] rounded-xl text-gray-950 font-sans font-mono"
                />
                <p className="text-[10px] text-gray-400 font-sans italic pt-0.5">
                  *ระบบจะส่งอีเมลใบสรุปรายการคำสั่งซื้อเข้าเมลนี้ทันทีค่ะ
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Items list details (Single long text answer) */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-[#db5984] border-l-4 border-[#db5984] pl-2 font-sans flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 shrink-0" />
              2. รายการสั่งซื้อ <span className="text-red-500">*</span>
            </h3>

            <div className="space-y-2">
              <label className="text-[11px] font-normal text-gray-700 block text-left">
                คัดลอกจากยอดสรุปได้เลยค่า
              </label>
              <textarea
                required
                rows={5}
                placeholder={"เช่น:\n- กระโปรง 1 (150)\n- กางเกงสีเทา 2 (200*2 =800)"}
                value={items[0]?.itemName || ''}
                onChange={(e) => updateItemDetails(items[0]?.id || '1', 'itemName', e.target.value)}
                className="w-full text-xs p-3.5 border border-gray-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb] rounded-2xl text-gray-950 font-sans leading-relaxed bg-[#fdfdfd]"
              />
            </div>
          </div>

          {/* Section 3: Shipping Info (Long Answer Text / Paste Here) */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-[#db5984] border-l-4 border-[#db5984] pl-2 font-sans flex items-center gap-1.5">
              <MapPin className="w-4 h-4 shrink-0" />
              3. ชื่อ / ที่อยู่ / เบอร์โทร ในการจัดส่ง <span className="text-red-500">*</span>
            </h3>

            <div className="space-y-2">
              <label className="text-[11.5px] font-bold text-gray-900 block text-left">
                <div className="text-[11px] font-medium text-gray-700 space-y-1 pl-1">
                  <p>• หากยังไม่แน่ใจใส่ขีด (-) ได้ค่ะ ร้านทักขออีกทีตอนของถึงไทยค่า</p>
                  <p>• หากเคยสั่งซื้อแล้ว รบกวนกรอกที่อยู่อีกครั้งเพื่อความถูกต้องนะคะ</p>
                </div>
              </label>
              <textarea
                required
                rows={5}
                placeholder=""
                value={shippingInfo}
                onChange={(e) => handleShippingInfoChange(e.target.value)}
                className="w-full text-xs p-3.5 border-2 border-dashed border-pink-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb] rounded-2xl text-gray-950 font-sans leading-relaxed bg-[#fdfdfd]"
              />
            </div>

            {/* Smart detection block removed at user's request */}

            {/* Postal remote area indicator banner */}
            <AnimatePresence>
              {zipMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`p-3.5 rounded-xl border text-[11px] leading-relaxed font-sans text-left transition-all ${
                    zipMessage.type === 'warn' 
                      ? 'bg-amber-50 border-amber-250 text-amber-850' 
                      : 'bg-green-50 border-green-200 text-green-800'
                  }`}
                >
                  <p className="flex items-center gap-1.5">
                    {zipMessage.type === 'warn' ? <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" /> : <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                    <span>
                      {zipMessage.text.includes(':') ? (
                        <>
                          {zipMessage.text.split(':')[0]}: <span className="font-bold">{zipMessage.text.split(':').slice(1).join(':')}</span>
                        </>
                      ) : (
                        zipMessage.text
                      )}
                    </span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section: Remote Area Dropdown */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-[#db5984] border-l-4 border-[#db5984] pl-2 font-sans flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 shrink-0" />
              ที่อยู่จัดส่งอยู่ในเขตพื้นที่ห่างไกลไหมคะ? <span className="text-red-500">*</span>
            </h3>

            <div className="space-y-3 bg-[#fcfbfa] p-4 border border-[#f5efec] rounded-2xl text-left">
              <ul className="text-[11px] text-gray-500 space-y-1 pl-1 list-disc list-inside font-sans leading-relaxed">
                <li className="text-gray-600 font-normal">หากที่อยู่จัดส่งเป็นพื้นที่ห่างไกล จะมีการบวกค่าส่งเพิ่ม 20.-</li>
                <li className="text-gray-600 font-medium">สามารถบวกเพิ่มเองจากยอดรวมได้เลยค่า</li>
              </ul>
              <div className="space-y-1">
                <select
                  required
                  value={remoteAreaSelection}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRemoteAreaSelection(val);
                    setIsRemoteArea(val === 'อยู่ค่า');
                  }}
                  className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb] rounded-xl text-gray-950 font-sans font-bold bg-white"
                >
                  <option value="" disabled>--- เลือกคำตอบ ---</option>
                  <option value="อยู่ค่า">อยู่ค่า</option>
                  <option value="ไม่อยู่ค่ะ">ไม่อยู่ค่ะ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Total Amount */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-[#db5984] border-l-4 border-[#db5984] pl-2 font-sans flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 shrink-0" />
              ยอดรวม <span className="text-red-500">*</span>
            </h3>

            <div className="space-y-3 bg-[#fcfbfa] p-4 border border-[#f5efec] rounded-2xl text-left">
              <ul className="text-[11px] text-gray-500 space-y-1 pl-1 list-disc list-inside font-sans leading-relaxed">
                <li className="text-gray-600 font-medium">สินค้า + ค่าส่ง = ยอดรวม</li>
                <li className="text-gray-600 font-medium">ค่าส่งเริ่มต้น 45.- (พื้นที่ห่างไกล +20.-)</li>
              </ul>
              <div className="space-y-1">
                <input
                  type="text"
                  required
                  placeholder="ระบุตัวเลข เช่น 350"
                  value={totalAmount}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    if (!clean) {
                      setTotalAmount('');
                    } else {
                      setTotalAmount(Number(clean).toLocaleString('en-US'));
                    }
                  }}
                  className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb] rounded-xl text-gray-950 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section: Payment Method */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-[#db5984] border-l-4 border-[#db5984] pl-2 font-sans flex items-center gap-1.5">
              <Wallet className="w-4 h-4 shrink-0" />
              วิธีการชำระ <span className="text-red-500">*</span>
            </h3>

            <div className="space-y-3 bg-[#fcfbfa] p-4 border border-[#f5efec] rounded-2xl text-left">
              <ul className="text-[11px] text-gray-500 space-y-1 pl-1 list-disc list-inside font-sans leading-relaxed">
                <li className="text-gray-650 font-medium">ใส่ตามที่ตกลงกับร้านไว้นะคะ</li>
              </ul>
              <div className="space-y-2">
                <select
                  required
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (e.target.value !== 'อื่นๆ') {
                      setPaymentMethodOther('');
                    }
                  }}
                  className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb] rounded-xl text-gray-950 font-sans font-bold bg-white"
                >
                  <option value="" disabled>--- เลือกวิธีการชำระเงิน ---</option>
                  <option value="ชำระเต็ม">ชำระเต็ม</option>
                  <option value="มัดจำ 50%">มัดจำ 50%</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>

                <AnimatePresence>
                  {paymentMethod === 'อื่นๆ' && (
                    <motion.div
                      key="payment-method-other"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <input
                        type="text"
                        required
                        placeholder="ระบุรายละเอียด"
                        value={paymentMethodOther}
                        onChange={(e) => setPaymentMethodOther(e.target.value)}
                        className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb] rounded-xl text-gray-950 font-sans font-medium mt-1"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Section: Shipping Payment Status Dropdown */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-[#db5984] border-l-4 border-[#db5984] pl-2 font-sans flex items-center gap-1.5">
              <Calendar className="w-4 h-4 shrink-0" />
              ชำระค่าส่งเลยไหมคะ? <span className="text-red-500">*</span>
            </h3>

            <div className="space-y-3 bg-[#fcfbfa] p-4 border border-[#f5efec] rounded-2xl text-left">
              <ul className="text-[11px] text-gray-500 space-y-1 pl-1 list-disc list-inside font-sans leading-relaxed">
                <li className="text-gray-600 font-medium">ค่าส่งเริ่มต้น 45.- (พื้นที่ห่างไกล +20.-)</li>
              </ul>
              <div className="space-y-1">
                <select
                  required
                  value={shippingPaymentStatus}
                  onChange={(e) => setShippingPaymentStatus(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb] rounded-xl text-gray-950 font-sans font-bold bg-white"
                >
                  <option value="" disabled>--- เลือกตัวเลือกการชำระค่าส่ง ---</option>
                  <option value="ชำระเลยค่า">ชำระเลยค่า</option>
                  <option value="ชำระตอนถึงไทย">ชำระตอนถึงไทย</option>
                  <option value="ยังค่า ต้องการรวมกับสินค้าก่อนหน้าค่า">ยังค่า ต้องการรวมกับสินค้าก่อนหน้าค่า</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Custom Questions (Only if configured) */}
          {config.customQuestions && config.customQuestions.length > 0 && (
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-black text-[#db5984] border-l-4 border-[#db5984] pl-2 font-sans flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 shrink-0" />
                4. ข้อมูลเพิ่มเติม
              </h3>
              <div className="space-y-4 bg-[#fcfbfa] p-4 border border-[#f5efec] rounded-2xl">
                {config.customQuestions.map((q) => {
                  const answer = customAnswers[q.id] || '';
                  return (
                    <div key={q.id} className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 block text-left">
                        {q.label} {q.required && <span className="text-red-500">*</span>}
                      </label>
                      {q.type === 'textarea' ? (
                        <textarea
                          required={q.required}
                          placeholder="พิมพ์รายละเอียดเพิ่มเติมตรงนี้..."
                          value={answer}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb] rounded-xl text-gray-950 font-sans min-h-[80px]"
                        />
                      ) : q.type === 'select' ? (
                        <select
                          required={q.required}
                          value={answer}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb] rounded-xl text-gray-950 font-sans bg-white"
                        >
                          <option value="">-- โปรดคลิกเลือกตัวเลือก --</option>
                          {q.options
                            ?.split(',')
                            .map((opt) => opt.trim())
                            .filter(Boolean)
                            .map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required={q.required}
                          placeholder="กรอกข้อมูลที่ถูกต้องตรงนี้..."
                          value={answer}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb] rounded-xl text-gray-950 font-sans"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 5: Bank Transfers & Receipt Slip uploads */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-[#db5984] border-l-4 border-[#db5984] pl-2 font-sans flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 shrink-0" />
              {config.customQuestions && config.customQuestions.length > 0 ? '5' : '4'}. โอนเงินและแนบหลักฐานชำระเงิน
            </h3>

            {/* Shop bank accounts display details */}
            <div className="max-w-md w-full">
              {/* Account Card 1 */}
              <div className="p-4 bg-gradient-to-br from-[#fef5f4] to-white border-2 border-[#fff0ee] rounded-2xl text-left space-y-1 relative">
                <p className="text-[13px] font-bold text-gray-850 font-sans">
                  ธนาคาร{config.bankName}
                </p>
                <div className="flex items-center gap-2 py-0.5">
                  <p className="text-base font-black font-mono text-[#eb5e45] tracking-medium">
                    {config.bankAccount}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(config.bankAccount);
                        } else {
                          throw new Error("Clipboard API not available");
                        }
                      } catch (err) {
                        const textArea = document.createElement("textarea");
                        textArea.value = config.bankAccount;
                        textArea.style.position = "fixed";
                        textArea.style.left = "-99999px";
                        textArea.style.top = "-99999px";
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        try {
                          document.execCommand("copy");
                        } catch (e) {
                          console.error("Fallback bank copy failed", e);
                        }
                        document.body.removeChild(textArea);
                      }
                      setCopiedAccount(true);
                      setTimeout(() => setCopiedAccount(false), 2000);
                    }}
                    className="p-1 px-1.5 inline-flex items-center gap-1 rounded bg-[#fff0ee] hover:bg-[#ffe2df] text-[#eb5e45] text-[10px] font-bold font-sans transition-colors cursor-pointer"
                    title="คัดลอกเลขบัญชี"
                  >
                    {copiedAccount ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-green-600 text-[9px]">คัดลอกสำเร็จ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[9px]">คัดลอก</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 font-normal font-sans">
                  ชื่อบัญชี: {config.bankOwner}
                </p>
              </div>
            </div>

            {/* Receipt detail entries */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 block">ยอดเงินโอนที่แท้จริง <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="ระบุตัวเลข เช่น 350"
                  value={transferAmount}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    if (!clean) {
                      setTransferAmount('');
                    } else {
                      setTransferAmount(Number(clean).toLocaleString('en-US'));
                    }
                  }}
                  className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] rounded-xl text-gray-950 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 block">วันที่โอนในสลิป <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 24/09/26"
                  maxLength={8}
                  value={transferDate}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    let formatted = '';
                    if (clean.length <= 2) {
                      formatted = clean;
                    } else if (clean.length <= 4) {
                      formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`;
                    } else {
                      formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 6)}`;
                    }
                    setTransferDate(formatted);
                  }}
                  className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] rounded-xl text-gray-900 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 block">เวลาที่โอนในสลิป <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 14:32"
                  maxLength={5}
                  value={transferTime}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    let formatted = '';
                    if (clean.length <= 2) {
                      formatted = clean;
                    } else {
                      formatted = `${clean.slice(0, 2)}:${clean.slice(2, 4)}`;
                    }
                    setTransferTime(formatted);
                  }}
                  className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] rounded-xl text-gray-900 font-mono"
                />
              </div>
            </div>

            {/* Receipt slip file droparea wrapper */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-600 block">แนบภาพสลิปชำระเงิน <span className="text-red-500">*</span></label>
              
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-200 hover:border-[#db5984]/50 focus:border-[#db5984] transition rounded-2xl p-4 sm:p-6 text-center cursor-pointer bg-gray-50/30 font-sans hover:bg-pink-50/10"
                onClick={() => {
                  const input = document.getElementById('slip-upload-input');
                  if (input) input.click();
                }}
              >
                <input
                  type="file"
                  id="slip-upload-input"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleImageUpload(e.target.files[0]);
                    }
                  }}
                />

                {!slipImage ? (
                  <div className="space-y-2 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-[#fdf5f3] flex items-center justify-center border border-dashed border-[#fcceca]">
                      <Upload className="w-5 h-5 text-[#eb5e45]" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium block">
                      ลากไฟล์รูปภาพมาวางที่นี่ หรือ<strong>คลิกเพื่อเลือกรูป หรือไฟล์</strong>
                    </span>
                    <span className="text-[10px] text-gray-400 block">
                      รูปจะถูกย่อขนาดให้อย่างเหมาะสมโดยอัตโนมัติ
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="relative inline-block max-w-[140px] max-h-[140px] border rounded-lg overflow-hidden bg-white p-1">
                      <img 
                        src={slipImage} 
                        alt="Slip transfer upload preview" 
                        className="object-contain max-h-[120px] rounded"
                      />
                    </div>
                    <span className="text-xs font-black text-green-700 font-sans flex items-center gap-1 justify-center">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      แนบภาพสลิปเรียบร้อย: {slipName || 'slip.jpg'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSlipImage(null);
                        setSlipName('');
                      }}
                      className="text-[10px] text-red-500 hover:underline hover:text-red-700 font-bold"
                    >
                      ลบภาพและเลือกรูปใหม่
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info Section */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-black text-[#db5984] border-l-4 border-[#db5984] pl-2 font-sans flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 shrink-0" />
                เพิ่มเติม
              </h3>
              <textarea
                rows={3}
                placeholder="หากมีรายละเอียดหรือคำแนะนำเพิ่มเติมถึงร้านค้า สามารถระบุได้ที่นี่เลยนะคะ..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] rounded-xl text-gray-950 font-sans focus:ring-1 focus:ring-[#eb5e45] outline-none"
              />
            </div>

            {/* Notes & Checkbox */}
            <div className="bg-pink-50/20 border border-[#db5984]/15 rounded-2xl p-4 space-y-3 font-sans">
              <div className="text-xs text-gray-650 space-y-1.5 leading-relaxed">
                <span className="font-bold text-[#db5984] block mb-1">📢 ข้อแนะนำและเงื่อนไขเพิ่มเติม:</span>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] sm:text-xs font-medium">
                  <li>อย่าลืมอ่านเงื่อนไขร้านร้านน้า</li>
                  <li>อัพเดทสถานะในเว็บหน้า bio ภายใน 1-3 วัน หลังสั่งซื้อนะคะ</li>
                  <li>ตรวจพบข้อผิดพลาด หรือมีข้อสงสัยสามารถทักมาได้ตลอดเลยค่า</li>
                </ul>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none pt-2.5 border-t border-[#db5984]/10">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded text-[#db5984] border-gray-300 focus:ring-[#db5984] focus:ring-opacity-25 cursor-pointer accent-[#db5984]"
                />
                <span className="text-[11px] sm:text-xs font-bold text-gray-700 flex items-center gap-1">
                  รับทราบค่า ♡ <span className="text-red-500 font-bold">*</span>
                </span>
              </label>
            </div>
          </div>

          {/* Form Action Buttons & Submissions */}
          <div className="pt-4 border-t-2 border-dashed border-[#f0f2f5] space-y-4">
            {formError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2 text-left font-sans animate-shake">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="font-semibold leading-tight">{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 px-6 rounded-2xl font-bold transition-all select-none text-base border-2 tracking-wide flex items-center justify-center gap-2 ${
                isSubmitting 
                  ? 'bg-gray-100 border-gray-250 text-gray-400 cursor-not-allowed' 
                  : 'bg-[#db5984] hover:bg-[#c4406a] text-white border-[#db5984] shadow-[0_6px_0_#b23c60] hover:shadow-[0_4px_0_#b23c60] hover:translate-y-[2px] active:translate-y-[6px] active:shadow-none cursor-pointer'
              }`}
              id="submit-preorder-action"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                  <span>ระบบกำลังบันทึกข้อมูลค่ะ</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 text-white" />
                  <span>ส่งรายการสั่งซื้อ</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

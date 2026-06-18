import { PostalCodeData, SheetConfig } from './types';

export const DEFAULT_MESSAGES = {
  welcomeTh: "เช็คเขตพื้นที่ห่างไกล",
  subtitleTh: "กรอกรหัสไปรษณีย์ 5 หลัก เพื่อตรวจสอบค่าบริการจัดส่งเพิ่มเติม",
  searchPlaceholderTh: "เช่น 50240, 81150, 10110",
  searchingTh: "กำลังตรวจสอบพื้นที่...",
  notFoundTh: "ไม่พบรหัสไปรษณีย์นี้ในเขตพื้นที่ห่างไกล",
  notFoundSubTh: "รหัสไปรษณีย์นี้ จัดส่งราคาปกติ ไม่มีเก็บส่วนต่าง 20 บาทเพิ่มเติมค่ะ",
  foundTh: "รหัสไปรษณีย์นี้อยู่ใน 'เขตพื้นที่ห่างไกล'",
};

export const INITIAL_CONFIG: SheetConfig = {
  spreadsheetUrl: "",
  spreadsheetId: "",
  sheetName: "พื้นที่จัดส่งห่างไกล",
  isConfigured: true,
  useFallbackSample: true,
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbyU8E4L9SeIJ52rRxHBTzkAQWVpMlI3Ohh8JV4K90XHyM463R6TeTHrTiyPiarX_imoIA/exec",
  lineToken: "",
  lineChannelAccessToken: "",
  lineGroupId: "",
  shopName: "YOMIE Pre-Order Hub",
  bankName: "กสิกรไทย (KBANK)",
  bankAccount: "123-4-56789-0",
  bankOwner: "Preorder Shop Account",
  promptPay: "0991234567",
  customQuestions: [],
  senderEmail: "",
  senderAppPass: "",
};

// Rich Thai Postal Codes Mocking Database for flawless demo/fallback
export const SAMPLE_POSTAL_CODES: PostalCodeData[] = [
  { postalCode: "50240", subdistrict: "อมก๋อย", province: "เชียงใหม่", area: "พื้นที่ห่างไกล" },
  { postalCode: "50240", subdistrict: "แม่ตื่น", province: "เชียงใหม่", area: "พื้นที่ห่างไกล" },
  { postalCode: "50310", subdistrict: "บ่อหลวง", province: "เชียงใหม่", area: "พื้นที่ห่างไกล" },
  { postalCode: "50350", subdistrict: "กัลยาณิวัฒนา", province: "เชียงใหม่", area: "พื้นที่ห่างไกล" },
  { postalCode: "58130", subdistrict: "ปางมะผ้า", province: "แม่ฮ่องสอน", area: "พื้นที่ห่างไกล" },
  { postalCode: "81150", subdistrict: "เกาะลันตาใหญ่", province: "กระบี่", area: "พื้นที่ห่างไกล" },
  { postalCode: "82160", subdistrict: "เกาะยาวน้อย", province: "พังงา", area: "พื้นที่ห่างไกล" },
  { postalCode: "23170", subdistrict: "เกาะกูด", province: "ตราด", area: "พื้นที่ห่างไกล" },
  { postalCode: "95110", subdistrict: "เบตง", province: "ยะลา", area: "พื้นที่ห่างไกล" },
  { postalCode: "96110", subdistrict: "แว้ง", province: "นราธิวาส", area: "พื้นที่ห่างไกล" }
];

export const APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script Webhook for @yomiie_core Preorder App
 * 
 * 1. Open your Google Spreadsheet.
 * 2. Click "Extensions" (ส่วนขยาย) > "Apps Script".
 * 3. Delete any default code. Paste this code.
 * 4. Click "Deploy" (การทำให้ใช้งานได้) > "New deployment" (การทำให้ใช้งานได้ใหม่).
 * 5. Choose "Web app" (เว็บแอป).
 * 6. Set Description: "Yomie Preorder Hub"
 * 7. Set Execute as: "Me" (ตัวฉัน)
 * 8. Set Who has access: "Anyone" (ทุกคน) *CRITICAL*
 * 9. Click "Deploy". Authorize any permissions requested.
 * 10. Copy the Web App URL and paste it in Yomie Admin Settings!
 */

function doPost(e) {
  try {
    var rawData = e.postData.getDataAsString();
    var data = JSON.parse(rawData);
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Auto initialize headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "วันที่",
        "เวลา",
        "Gmail ",
        "Account",
        "รายการสั่งซื้อ",
        "ที่อยู่จัดส่ง",
        "ที่อยู่จัดส่งอยู่ในเขตพื้นที่ห่างไกลไหมคะ?",
        "ยอดรวม",
        "วิธีการชำระ",
        "จ่ายค่าส่งเลยไหม",
        "ยอดโอน",
        "วันที่โอน",
        "เวลาที่โอน",
        "สลิป",
        "เพิ่มเติม"
      ]);
      
      // Style header
      sheet.getRange(1, 1, 1, 15).setBackground("#eb5e45").setFontColor("#ffffff").setFontWeight("bold");
    }
    
    var now = new Date();
    // Format date as DD/MM/YYYY and Time as HH:mm:ss for GMT+7 (Thailand)
    var submissionDate = Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy");
    var submissionTime = Utilities.formatDate(now, "GMT+7", "HH:mm:ss");
    
    // รายการสั่งซื้อ (คัดลอกตามที่กรอกเป๊ะๆ ไม่ต้องมี 1. นำหน้า)
    var itemsStr = "";
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      itemsStr = data.items.map(function(it) {
        return it.itemName || "";
      }).join("\\n");
    } else {
      itemsStr = data.itemsText || "";
    }
    
    var shippingInfoStr = data.shippingInfo || "";
    var paymentMethodStr = data.paymentMethod || "-";
    if (data.paymentMethod === "อื่นๆ" && data.paymentMethodOther) {
      paymentMethodStr = "อื่นๆ (" + data.paymentMethodOther + ")";
    }
    
    var remoteAreaStr = data.remoteAreaSelection || (data.isRemoteArea ? "อยู่ค่า" : "ไม่อยู่ค่ะ");
    
    var finalSlipUrl = data.slipUrl || "";
    var slipBlob = null;
    
    // Decodes base64 slip to insert directly and quietly upload to user's Google Drive
    if (data.slipBase64 && typeof data.slipBase64 === "string" && data.slipBase64.includes("base64,")) {
      try {
        var parts = data.slipBase64.split("base64,");
        var header = parts[0];
        var base64Data = parts[1];
        var contentType = "image/jpeg";
        var mimeMatch = header.match(/data:([^;]+);/);
        if (mimeMatch && mimeMatch[1]) {
          contentType = mimeMatch[1];
        }
        
        var ext = "jpg";
        if (contentType.includes("png")) ext = "png";
        else if (contentType.includes("gif")) ext = "gif";
        else if (contentType.includes("webp")) ext = "webp";
        
        var decoded = Utilities.base64Decode(base64Data);
        slipBlob = Utilities.newBlob(decoded, contentType, "slip_" + Date.now() + "." + ext);
        
        // Auto Upload Slip directly to User's own Google Drive as a cloud backup
        try {
          var folderName = "Yomie Slips";
          var folders = DriveApp.getFoldersByName(folderName);
          var folder;
          if (folders.hasNext()) {
            folder = folders.next();
          } else {
            folder = DriveApp.createFolder(folderName);
          }
          
          var file = folder.createFile(slipBlob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          
          // Direct Google Drive Image Url for full-screen fallback click
          finalSlipUrl = "https://docs.google.com/uc?export=view&id=" + file.getId();
        } catch (driveErr) {
          // Safe fall back to public image url if Drive creation has restricted permissions
        }
      } catch (err) {
        // Safe skip processing
      }
    }
    
    var cellValueForSlip = "ไม่มีสลิป";
    if (data.slipBase64) {
      if (finalSlipUrl) {
        cellValueForSlip = '=HYPERLINK("' + finalSlipUrl + '", IMAGE("' + finalSlipUrl + '"))';
      } else {
        cellValueForSlip = "แนบสลิปเรียบร้อย";
      }
    }
    
    sheet.appendRow([
      submissionDate,                            // A: วันที่
      submissionTime,                            // B: เวลา
      data.customerGmail || "",                 // C: Gmail 
      data.customerAccount || "",                // D: Account
      itemsStr,                                  // E: รายการสั่งซื้อ
      shippingInfoStr,                           // F: ที่อยู่จัดส่ง
      remoteAreaStr,                             // G: ที่อยู่จัดส่งอยู่ในเขตพื้นที่ห่างไกลไหมคะ?
      data.totalAmount || 0,                     // H: ยอดรวม
      paymentMethodStr,                          // I: วิธีการชำระ
      data.shippingPaymentStatus || "-",         // J: จ่ายค่าส่งเลยไหม
      data.transferAmount || 0,                  // K: ยอดโอน
      data.transferDateInSlip || "",             // L: วันที่โอน
      data.transferTimeInSlip || "",             // M: เวลาที่โอน
      cellValueForSlip,                          // N: สลิป
      data.additionalNotes || ""                 // O: เพิ่มเติม
    ]);
    
    // Adjust row height & alignment so that the slip image in the cell is beautifully visible
    try {
      var lastRow = sheet.getLastRow();
      sheet.setRowHeight(lastRow, 90);
      sheet.getRange(lastRow, 1, 1, 15).setWrap(true).setVerticalAlignment("middle");
      sheet.setColumnWidth(14, 90); // Set slip column width to 90px for perfect aspect ratio display
    } catch (styleErr) {
      // Ignore styling errors safely
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "message": "บันทึกข้อมูลสำเร็จ!"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

/**
 * Extract Spreadsheet ID from Google Sheets URL
 */
export function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : url;
}

/**
 * Generate Google Sheets Visualization API Query URL
 */
export function buildQueryUrl(spreadsheetId: string, sheetName: string, spreadsheetUrl?: string): string {
  let gid: string | null = null;
  if (spreadsheetUrl) {
    const match = spreadsheetUrl.match(/[?&#]gid=([0-9]+)/);
    if (match) {
      gid = match[1];
    }
  }

  if (sheetName) {
    const encSheet = encodeURIComponent(sheetName);
    let url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?sheet=${encSheet}&tqx=out:json`;
    if (gid) {
      url += `&gid=${gid}`;
    }
    return url;
  }

  let url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
  if (gid) {
    url += `&gid=${gid}`;
  }
  return url;
}

/**
 * Parses Google Sheets visualization API JSON text cleanly for Postal Code columns A to D
 */
export function parsePostalCodeGvizData(text: string): PostalCodeData[] {
  const startMarker = "google.visualization.Query.setResponse(";
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) {
    throw new Error("รูปแบบไฟล์ดึงค่าจาก Google Sheets ขัดข้อง ตรวจเช็คว่าเปิดแชร์สิทธิ์ 'ทุกคนที่มีลิงก์ดูได้' เสมอค่ะ");
  }
  
  const endMarker = ");";
  const endIndex = text.lastIndexOf(endMarker);
  if (endIndex === -1) {
    throw new Error("โครงสร้างตอบรับของ Google Sheets ผิดพลาด");
  }

  const jsonStr = text.substring(startIndex + startMarker.length, endIndex);
  const data = JSON.parse(jsonStr);
  
  if (!data?.table?.rows) {
    throw new Error("ไม่พบข้อมูลแผ่นงานใน Google Sheet นี้");
  }

  const rows = data.table.rows || [];

  return rows.map((row: any) => {
    const cells = row.c || [];
    
    const getCellValue = (idx: number): string => {
      if (idx === undefined || idx < 0 || idx >= cells.length) return "";
      const cell = cells[idx];
      if (!cell) return "";
      
      if (cell.f !== undefined) return String(cell.f).trim();
      if (cell.v !== undefined) {
        if (cell.v === null) return "";
        return String(cell.v).trim();
      }
      return "";
    };

    return {
      postalCode: getCellValue(0),   // Column A: รหัสไปรษณีย์
      subdistrict: getCellValue(1),  // Column B: ตำบล
      province: getCellValue(2),     // Column C: จังหวัด
      area: getCellValue(3),         // Column D: พื้นที่ (เช่น "พื้นที่ห่างไกล")
    };
  }).filter(item => item.postalCode && item.postalCode.length > 0);
}

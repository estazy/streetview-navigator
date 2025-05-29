
export const th = {
  // App.tsx
  appTitle: "Street View Navigator", 
  loadingGoogleMaps: "กำลังโหลด Google Maps API...",
  googleMapsApiNotLoaded: "Google Maps API ยังไม่ได้โหลด กรุณารอสักครู่",
  enterStartEnd: "กรุณากรอกทั้งสถานที่เริ่มต้นและสิ้นสุด",
  routeSearchErrorDefault: "ไม่สามารถค้นหาเส้นทางได้ กรุณาตรวจสอบสถานที่และลองอีกครั้ง",
  routeSearchErrorNotFound: "ไม่พบสถานที่อย่างน้อยหนึ่งแห่ง กรุณาตรวจสอบที่อยู่",
  routeSearchErrorZeroResults: "ไม่พบเส้นทางระหว่างสถานที่ที่ระบุ",
  routeSearchErrorRequestDenied: "คำขอเส้นทางถูกปฏิเสธ ตรวจสอบ API key และสิทธิ์การใช้งาน Google Maps",
  routeSearchErrorOverQueryLimit: "เกินโควต้าคำขอเส้นทาง กรุณาลองอีกครั้งในภายหลัง",
  initialPrompt: "กรุณากรอกสถานที่เริ่มต้นและสิ้นสุดเพื่อวางแผนการเดินทางของคุณ",
  noOverviewPath: "ไม่พบภาพรวมเส้นทางสำหรับเส้นทางนี้",
  criticalApiKeyError: "ข้อผิดพลาดร้ายแรง: ไม่ได้กำหนดค่า Google Maps API Key กรุณาแทนที่ 'YOUR_GOOGLE_MAPS_API_KEY_HERE' ใน index.html ด้วย API key ของคุณ",
  geminiApiKeyWarning: "คำเตือน: ไม่ได้ตั้งค่า Gemini API key (process.env.API_KEY) คุณสมบัติของ Gemini จะถูกปิดใช้งาน",
  geolocationError: "ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณากรอกสถานที่เริ่มต้นด้วยตนเอง",
  geolocationDisabled: "ตำแหน่งทางภูมิศาสตร์ถูกปิดใช้งานหรือถูกปฏิเสธ กรุณากรอกจุดเริ่มต้นด้วยตนเอง",


  // RouteInput.tsx
  startPlaceholder: "สถานที่เริ่มต้น (เช่น, หอไอเฟล, ปารีส)",
  endPlaceholder: "สถานที่สิ้นสุด (เช่น, พิพิธภัณฑ์ลูฟวร์, ปารีส)",
  searchButtonLoadingApi: "กำลังโหลด API...",
  searchButtonSearching: "กำลังค้นหา...",
  searchButtonGetRide: "ดูเส้นทาง", 

  // StreetViewPlayer.tsx
  streetViewRouteLoaded: "โหลดเส้นทางแล้ว กดเล่นเพื่อเริ่ม",
  streetViewRideFinished: "การเดินทางสิ้นสุดแล้ว!",
  streetViewSegment: (current: number, total: number) => `ส่วนที่ ${current} จาก ${total}`,
  streetViewUnavailable: "Street View ไม่พร้อมใช้งานสำหรับส่วนนี้",
  streetViewTryingNext: "Street View ไม่พร้อมใช้งาน กำลังลองจุดถัดไป...",
  streetViewFrom: (description: string) => `มุมมองจาก: ${description}`,
  streetViewNearRoute: "ใกล้เส้นทางของคุณ",
  noStreetViewOnRoute: "ไม่พบ Street View สำหรับเส้นทางที่สร้างขึ้นนี้เลย ลองเปลี่ยนเส้นทางอื่น",
  findingStreetView: "กำลังค้นหา Street View ที่ใกล้ที่สุด...",


  // RouteDetails.tsx
  noRoutePlanned: "ยังไม่มีการวางแผนเส้นทาง กรอกสถานที่เริ่มต้นและสิ้นสุดเพื่อดูรายละเอียด",
  currentViewTitle: "มุมมองปัจจุบัน",
  geminiNarrativeTitle: "เรื่องเล่าการเดินทาง (โดย Gemini)",
  turnByTurnTitle: "เส้นทางแบบเลี้ยวต่อเลี้ยว",
  totalDistance: "ระยะทางรวม",
  totalDuration: "ระยะเวลารวม",
  routeDetailsNotLoaded: "ไม่สามารถโหลดรายละเอียดเส้นทางได้",
  readAloudLabel: "อ่านออกเสียงเรื่องเล่าเส้นทาง",
  pauseNarrationLabel: "หยุดเรื่องเล่าชั่วคราว",
  resumeNarrationLabel: "เล่นเรื่องเล่าต่อ",
  speechNotSupported: "เบราว์เซอร์ของคุณไม่รองรับการอ่านออกเสียง",


  // ControlPanel.tsx
  playLabel: "เล่น",
  pauseLabel: "หยุดชั่วคราว",
  stopLabel: "หยุด",
  speedLabel: "ความเร็ว:",
  progressLabel: "ความคืบหน้า",
  stepDistanceLabel: "ปรับระยะก้าว:",
  stepDistanceCoarse: "หยาบ", 
  stepDistanceFine: "ละเอียด", 


  // LoadingSpinner.tsx
  loadingRoute: "กำลังโหลดเส้นทาง...",

  // ErrorDisplay.tsx
  errorTitle: "ข้อผิดพลาด",
  closeErrorLabel: "ปิดข้อความข้อผิดพลาด",

  // Attribution.tsx
  poweredBy: "สนับสนุนโดย",
  and: "และ",
  simulationDisclaimer: "นี่คือการจำลองและอาจไม่สะท้อนสภาพการณ์จริง",

  // MapDisplay.tsx
  mapPaneTitle: "แผนที่ภาพรวม",

  // LanguageSwitcher.tsx
  languageSwitcherLabel: "ภาษา:",
};

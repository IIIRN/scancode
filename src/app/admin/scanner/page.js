'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode'; // 👈 เปลี่ยนมาใช้ตัวหลักเพื่อควบคุมได้มากขึ้น
import { db } from '../../../lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

// Component ไอคอนกล้อง
const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

export default function AdminScannerPageV2() {
  // 🔻 State หลักสำหรับควบคุมหน้าจอ: 'idle', 'scanning', 'found', 'submitting'
  const [scannerState, setScannerState] = useState('idle'); 

  const [registrationData, setRegistrationData] = useState(null);
  const [activityName, setActivityName] = useState('');
  const [seatNumberInput, setSeatNumberInput] = useState('');
  const [message, setMessage] = useState('');
  
  // Ref สำหรับเก็บ instance ของ html5QrCode
  const qrScannerRef = useRef(null);

  // สร้าง instance ของ qrcode scanner แค่ครั้งเดียว
  useEffect(() => {
    // สร้าง instance แต่ยังไม่เริ่มสแกน
    qrScannerRef.current = new Html5Qrcode("reader");

    // Cleanup function: จะทำงานเมื่อออกจากหน้านี้
    return () => {
      if (qrScannerRef.current?.isScanning) {
        qrScannerRef.current.stop().catch(err => console.error("Cleanup stop failed", err));
      }
    };
  }, []);

  // ฟังก์ชันเริ่มการทำงานของกล้อง
  const handleStartScanner = async () => {
    if (!qrScannerRef.current) return;
    resetState();
    setScannerState('scanning');
    try {
      await qrScannerRef.current.start(
        { facingMode: "environment" }, // เลือกกล้องหลัง
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScanSuccess, // callback เมื่อสแกนสำเร็จ
        (errorMessage) => { /* console.log("QR Code no match.", errorMessage); */ }
      );
    } catch (err) {
      console.error("Failed to start scanner", err);
      setMessage("ไม่สามารถเปิดกล้องได้");
      setScannerState('idle');
    }
  };

  // ฟังก์ชันเมื่อสแกน QR Code สำเร็จ
  const handleScanSuccess = async (decodedText) => {
    if (scannerState === 'found') return; // ป้องกันการสแกนซ้ำ
    
    // หยุดการทำงานของกล้องทันที
    if (qrScannerRef.current?.isScanning) {
      await qrScannerRef.current.stop();
    }
    
    setScannerState('submitting'); // เปลี่ยนสถานะเป็นกำลังโหลดข้อมูล
    setMessage(`กำลังตรวจสอบ ID: ${decodedText}`);

    try {
      const regRef = doc(db, 'registrations', decodedText);
      const regSnap = await getDoc(regRef);
      if (regSnap.exists()) {
        const regData = { id: regSnap.id, ...regSnap.data() };
        setRegistrationData(regData);
        // ดึงชื่อกิจกรรม
        const actRef = doc(db, 'activities', regData.activityId);
        const actSnap = await getDoc(actRef);
        if (actSnap.exists()) setActivityName(actSnap.data().name);
        
        setScannerState('found'); // เปลี่ยนสถานะเป็นเจอข้อมูลแล้ว
        setMessage('');
      } else {
        throw new Error('ไม่พบข้อมูลการลงทะเบียน');
      }
    } catch (err) {
      setMessage(`❌ ${err.message}`);
      setTimeout(() => setScannerState('idle'), 3000);
    }
  };
  
  // ฟังก์ชันยืนยันการเข้าเรียน
  const handleConfirmCheckIn = async (e) => {
    e.preventDefault();
    if (!registrationData || !seatNumberInput.trim()) {
      setMessage("กรุณากำหนดเลขที่นั่ง"); return;
    }
    setScannerState('submitting');
    setMessage('กำลังบันทึกข้อมูล...');
    try {
      // อัปเดต, บันทึก Log, ส่งแจ้งเตือน (Logic เดิม)
      const regRef = doc(db, 'registrations', registrationData.id);
      await updateDoc(regRef, { status: 'checked-in', seatNumber: seatNumberInput.trim() });
      
      await addDoc(collection(db, 'checkInLogs'), { /* ... log data ... */ });
      
      if (registrationData.lineUserId) {
          const notificationMessage = `เช็คอินกิจกรรม "${activityName}" สำเร็จ!\nคุณได้รับที่นั่งหมายเลข: ${seatNumberInput.trim()}`;
          await fetch('/api/send-notification', { /* ... fetch options ... */ });
      }

      setMessage(`✅ เช็คอินสำเร็จ! ที่นั่ง ${seatNumberInput.trim()}`);
      setTimeout(() => {
        resetState();
        setScannerState('idle'); // กลับสู่สถานะเริ่มต้น
      }, 2000);
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
      setScannerState('found'); // กลับไปหน้ากรอกข้อมูล
    }
  };
  
  // ฟังก์ชันสำหรับเคลียร์ State
  const resetState = () => {
    setRegistrationData(null);
    setActivityName('');
    setSeatNumberInput('');
    setMessage('');
  };

  // Component ย่อย (เหมือนเดิม)
  const StatusBadge = ({ status }) => { /* ... */ };

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 font-sans">
      <div className="bg-white p-6 rounded-lg shadow-2xl min-h-[500px] flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">เช็คอินนักเรียน</h1>

        {/* --- UI เริ่มต้น: ปุ่มเปิดกล้อง --- */}
        {scannerState === 'idle' && (
          <button onClick={handleStartScanner} className="flex flex-col items-center text-blue-600 hover:text-blue-800 transition-colors">
            <CameraIcon />
            <span className="text-xl font-semibold">เริ่มสแกน</span>
          </button>
        )}

        {/* --- UI ขณะสแกน: แสดงวิดีโอจากกล้อง --- */}
        <div id="reader" className={`${scannerState === 'scanning' ? 'block' : 'hidden'} w-full max-w-sm border-2 border-gray-300 rounded-lg overflow-hidden`}></div>
        {scannerState === 'scanning' && <p className="mt-4 text-gray-500">กรุณาหันกล้องไปที่ QR Code</p>}
        
        {/* --- UI เมื่อเจอข้อมูล/กำลังยืนยัน --- */}
        {(scannerState === 'found' || scannerState === 'submitting') && registrationData && (
          <div className="w-full animate-fade-in">
            <h2 className="text-2xl font-bold mb-4">ข้อมูลผู้ลงทะเบียน</h2>
            <div className="space-y-2 text-gray-700 bg-gray-50 p-4 rounded-lg border">
              <p><strong>ชื่อ-สกุล:</strong> {registrationData.fullName}</p>
              <p><strong>กิจกรรม:</strong> {activityName}</p>
              <p className="flex items-center gap-2"><strong>สถานะ:</strong> <StatusBadge status={registrationData.status} /></p>
            </div>
            <hr className="my-4"/>
            
            {registrationData.status !== 'checked-in' ? (
              <form onSubmit={handleConfirmCheckIn} className="space-y-3">
                <label htmlFor="seatNumber" className="block text-sm font-medium text-gray-700">กำหนดเลขที่นั่ง</label>
                <input type="text" id="seatNumber" value={seatNumberInput} onChange={(e) => setSeatNumberInput(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md" />
                <button type="submit" disabled={scannerState === 'submitting'} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-300">
                  {scannerState === 'submitting' ? 'กำลังดำเนินการ...' : 'ยืนยันการเข้าเรียน'}
                </button>
              </form>
            ) : (
              <p className="text-center font-semibold text-green-600">นักเรียนคนนี้ได้เช็คอินเรียบร้อยแล้ว (ที่นั่ง: {registrationData.seatNumber})</p>
            )}
          </div>
        )}

        {/* --- ส่วนแสดงข้อความตอบกลับ --- */}
        {message && <p className="mt-4 text-center font-bold text-lg text-red-600">{message}</p>}
      </div>
    </div>
  );
}
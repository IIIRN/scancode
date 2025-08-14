// src/app/admin/scanner/page.js

'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode'; // 👈 1. Import library ใหม่
import { db } from '../../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
  let minEdge = Math.min(viewfinderWidth, viewfinderHeight);
  let qrboxSize = Math.floor(minEdge * 0.7); // ขนาดของกรอบสแกน 70% ของด้านที่เล็กที่สุด
  return {
    width: qrboxSize,
    height: qrboxSize,
  };
};

export default function AdminScannerPage() {
  const [scanResult, setScanResult] = useState(null);
  const [registrationData, setRegistrationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // 👈 2. ใช้ useRef เพื่ออ้างอิงถึง scanner instance
  const scannerRef = useRef(null);

  useEffect(() => {
    // 👈 3. สร้างและจัดการ Scanner ด้วย useEffect
    if (!scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "reader", // ID ของ div ที่จะให้กล้องไปแสดง
        {
          fps: 10, // อัตราการสแกน (frame per second)
          qrbox: qrboxFunction, // ฟังก์ชันกำหนดขนาดกรอบสแกน
          rememberLastUsedCamera: true,
          supportedScanTypes: [0] // 0 for camera
        },
        false // verbose
      );

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    }
    
    // Cleanup function: จะทำงานเมื่อ component ถูกปิด
    // เพื่อปิดกล้องและคืนทรัพยากร
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5-qrcode-scanner.", error);
        });
        scannerRef.current = null;
      }
    };
  }, []);

  // ฟังก์ชันที่จะทำงานเมื่อสแกน QR Code สำเร็จ
  const onScanSuccess = async (decodedText, decodedResult) => {
    if (decodedText && decodedText !== scanResult) {
      setIsLoading(true);
      setMessage(`กำลังตรวจสอบ ID: ${decodedText}`);
      setScanResult(decodedText);
      await handleVerification(decodedText);
    }
  };

  // ฟังก์ชันที่จะทำงานเมื่อสแกนไม่สำเร็จ (เราจะปล่อยว่างไว้)
  const onScanFailure = (error) => {
    // console.warn(`Code scan error = ${error}`);
  };

  const handleVerification = async (registrationId) => {
    try {
      const docRef = doc(db, 'registrations', registrationId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setRegistrationData(data);
        if (data.status === 'checked-in') {
            setMessage(`⚠️ เช็คอินไปแล้ว (ที่นั่ง: ${data.seatNumber})`);
        } else {
            setMessage(''); // เคลียร์ข้อความรอการกดยืนยัน
        }
      } else {
        setMessage('❌ ไม่พบข้อมูลการลงทะเบียนนี้');
        setRegistrationData(null);
      }
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    // ... (ส่วนนี้ใช้โค้ดเดิมได้เลย) ...
    if (!registrationData) return;
    
    const seat = `A${Math.floor(Math.random() * 50) + 1}`; 
    setIsLoading(true);
    setMessage('');
    try {
      const docRef = doc(db, 'registrations', registrationData.id);
      await updateDoc(docRef, { status: 'checked-in', seatNumber: seat });

      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: registrationData.userId, seatNumber: seat }),
      });

      if (!response.ok) throw new Error('Failed to send notification');
      
      setMessage(`✅ ยืนยันสำเร็จ! ที่นั่ง ${seat} (ส่งแจ้งเตือนแล้ว)`);
      setRegistrationData(null);
      setScanResult(null);

    } catch (err) {
      setMessage('เกิดข้อผิดพลาดในการยืนยัน: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>ADMIN - QR CODE SCANNER</h1>
      {/* 👈 4. สร้าง div ให้ library ใช้แสดงผลกล้อง */}
      <div id="reader" style={{ width: '100%', border: '2px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}></div>

      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
        <h3>ผลการสแกน</h3>
        {isLoading && <p>กำลังประมวลผล...</p>}
        {message && <p style={{ fontWeight: 'bold' }}>{message}</p>}
        
        {registrationData && (
          <div>
            <p><strong>ID:</strong> {registrationData.id}</p>
            <p><strong>ชื่อ:</strong> {registrationData.userName}</p>
            <p><strong>สถานะ:</strong> {registrationData.status}</p>
            <button onClick={handleConfirm} disabled={isLoading || registrationData.status === 'checked-in'}>
              {registrationData.status === 'checked-in' ? 'เช็คอินแล้ว' : 'ยืนยันการเข้าเรียน'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
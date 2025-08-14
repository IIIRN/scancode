'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { db } from '../../../lib/firebase';
import { 
  doc, getDoc, updateDoc, 
  collection, query, where, getDocs, 
  addDoc, serverTimestamp 
} from 'firebase/firestore';

// ฟังก์ชันสำหรับกำหนดขนาดกรอบสแกน
const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
  let minEdge = Math.min(viewfinderWidth, viewfinderHeight);
  return { width: Math.floor(minEdge * 0.7), height: Math.floor(minEdge * 0.7) };
};

export default function AdminScannerPage() {
  // State สำหรับสลับโหมด 'scan' หรือ 'manual'
  const [mode, setMode] = useState('scan'); 

  // State สำหรับโหมดค้นหาด้วยตนเอง
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [nationalIdInput, setNationalIdInput] = useState('');

  // State ที่ใช้ร่วมกันทั้ง 2 โหมด
  const [registrationData, setRegistrationData] = useState(null);
  const [activityName, setActivityName] = useState('');
  const [seatNumberInput, setSeatNumberInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const scannerRef = useRef(null);

  // Effect สำหรับจัดการการสร้างและทำลาย object ของ Scanner ตามโหมด
  useEffect(() => {
    if (mode === 'scan' && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: qrboxFunction }, false);
      scanner.render(handleScanSuccess, () => {});
      scannerRef.current = scanner;
    } else if (mode === 'manual' && scannerRef.current) {
      scannerRef.current.clear().catch(err => console.error("Scanner clear failed", err));
      scannerRef.current = null;
    }
  }, [mode]);

  // Effect สำหรับดึงข้อมูลกิจกรรมมาใส่ Dropdown ของโหมดค้นหา
  useEffect(() => {
    const fetchActivities = async () => {
      const activitiesSnapshot = await getDocs(collection(db, 'activities'));
      const activitiesList = activitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActivities(activitiesList);
    };
    fetchActivities();
  }, []);

  // ฟังก์ชันสำหรับเคลียร์ State ทั้งหมดเพื่อรอรับคนถัดไป
  const resetState = () => {
    setRegistrationData(null);
    setActivityName('');
    setSeatNumberInput('');
    setMessage('');
    setNationalIdInput('');
  };
  
  // ฟังก์ชันทำงานเมื่อสแกน QR Code สำเร็จ
  const handleScanSuccess = async (decodedText) => {
    if (isLoading || registrationData) return;
    setIsLoading(true);
    setMessage(`กำลังตรวจสอบ ID: ${decodedText}`);
    try {
      const regRef = doc(db, 'registrations', decodedText);
      const regSnap = await getDoc(regRef);
      if (regSnap.exists()) {
        await processFoundRegistration({ id: regSnap.id, ...regSnap.data() });
      } else {
        throw new Error('ไม่พบข้อมูลการลงทะเบียนจาก QR Code นี้');
      }
    } catch (err) {
      setMessage(`❌ ${err.message}`);
      setTimeout(resetState, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันสำหรับค้นหาด้วยเลขบัตรประชาชน
  const handleSearchById = async (e) => {
    e.preventDefault();
    if (!selectedActivity || !nationalIdInput) {
      setMessage("กรุณาเลือกกิจกรรมและกรอกเลขบัตรประชาชน");
      return;
    }
    setIsLoading(true);
    resetState();
    setMessage('กำลังค้นหา...');
    try {
      const q = query(
        collection(db, 'registrations'),
        where("activityId", "==", selectedActivity),
        where("nationalId", "==", nationalIdInput.trim())
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) throw new Error('ไม่พบข้อมูลนักเรียนในกิจกรรมนี้');
      
      const regSnap = snapshot.docs[0];
      await processFoundRegistration({ id: regSnap.id, ...regSnap.data() });
    } catch (err) {
      setMessage(`❌ ${err.message}`);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันกลางสำหรับจัดการข้อมูลที่พบ (ใช้ทั้งสองโหมด)
  const processFoundRegistration = async (regData) => {
    setRegistrationData(regData);
    const actRef = doc(db, 'activities', regData.activityId);
    const actSnap = await getDoc(actRef);
    if (actSnap.exists()) {
      setActivityName(actSnap.data().name);
    }
    setMessage('');
  };
  
  // ฟังก์ชันสำหรับยืนยันการเข้าเรียน, กำหนดที่นั่ง, ส่งแจ้งเตือน, และบันทึกประวัติ
  const handleConfirmCheckIn = async (e) => {
    e.preventDefault();
    if (!registrationData || !seatNumberInput.trim()) {
      setMessage("กรุณากำหนดเลขที่นั่งก่อนยืนยัน");
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      const regRef = doc(db, 'registrations', registrationData.id);
      await updateDoc(regRef, {
        status: 'checked-in',
        seatNumber: seatNumberInput.trim()
      });

      const logData = {
        adminId: 'Admin_01',
        registrationId: registrationData.id,
        studentName: registrationData.fullName,
        activityName: activityName,
        assignedSeat: seatNumberInput.trim(),
        timestamp: serverTimestamp()
      };
      await addDoc(collection(db, 'checkInLogs'), logData);

      if (registrationData.lineUserId) {
        const notificationMessage = `เช็คอินกิจกรรม "${activityName}" สำเร็จ!\nคุณได้รับที่นั่งหมายเลข: ${seatNumberInput.trim()}`;
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: registrationData.lineUserId, message: notificationMessage }),
        });
      }
      
      setMessage(`✅ เช็คอินสำเร็จ! ที่นั่ง ${seatNumberInput.trim()}`);
      setTimeout(resetState, 3000);
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Component ย่อยสำหรับแสดงป้ายสถานะ
  const StatusBadge = ({ status }) => {
    const isCheckedIn = status === 'checked-in';
    const bgColor = isCheckedIn ? 'bg-green-500' : 'bg-yellow-500';
    return <span className={`px-3 py-1 text-sm text-white rounded-full ${bgColor}`}>{isCheckedIn ? 'เช็คอินแล้ว' : 'ลงทะเบียน'}</span>;
  };

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 font-sans">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">เช็คอินนักเรียน</h1>
      
      <div className="flex justify-center border border-gray-300 rounded-lg p-1 bg-gray-100 mb-6">
        <button onClick={() => { setMode('scan'); resetState(); }} className={`w-1/2 py-2 rounded-md transition-colors ${mode === 'scan' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}>
          สแกน QR Code
        </button>
        <button onClick={() => { setMode('manual'); resetState(); }} className={`w-1/2 py-2 rounded-md transition-colors ${mode === 'manual' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}>
          ค้นหาด้วยตนเอง
        </button>
      </div>

      {mode === 'scan' && (
        <div id="reader" className="w-full border-2 border-gray-300 rounded-lg overflow-hidden"></div>
      )}

      {mode === 'manual' && (
        <form onSubmit={handleSearchById} className="space-y-4 bg-white p-5 rounded-lg shadow-md animate-fade-in">
          <div>
            <label htmlFor="activity-select" className="block text-sm font-medium text-gray-700">1. เลือกกิจกรรม</label>
            <select id="activity-select" value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
              <option value="">-- กรุณาเลือกกิจกรรม --</option>
              {activities.map(act => <option key={act.id} value={act.id}>{act.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700">2. กรอกเลขบัตรประชาชน</label>
            <input type="tel" id="nationalId" value={nationalIdInput} onChange={(e) => setNationalIdInput(e.target.value)} required pattern="\d{13}" placeholder="กรอกเลข 13 หลัก" className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
          </div>
          <button type="submit" disabled={isLoading} className="w-full py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 disabled:bg-purple-300">
            {isLoading ? 'กำลังค้นหา...' : 'ค้นหา'}
          </button>
        </form>
      )}

      {!isLoading && registrationData && (
        <div className="mt-6 bg-white p-5 rounded-lg shadow-md animate-fade-in">
          <h2 className="text-2xl font-bold mb-4">ข้อมูลผู้ลงทะเบียน</h2>
          <div className="space-y-2 text-gray-700">
            <p><strong>ชื่อ-สกุล:</strong> {registrationData.fullName}</p>
            <p><strong>รหัสนักศึกษา:</strong> {registrationData.studentId}</p>
            <p><strong>กิจกรรม:</strong> {activityName}</p>
            <p className="flex items-center gap-2"><strong>สถานะ:</strong> <StatusBadge status={registrationData.status} /></p>
          </div>
          <hr className="my-4"/>
          {registrationData.status !== 'checked-in' ? (
            <form onSubmit={handleConfirmCheckIn} className="space-y-3">
              <label htmlFor="seatNumber" className="block text-sm font-medium text-gray-700">กำหนดเลขที่นั่ง</label>
              <input type="text" id="seatNumber" value={seatNumberInput} onChange={(e) => setSeatNumberInput(e.target.value)} placeholder="เช่น A1, B12" required className="w-full p-2 border border-gray-300 rounded-md" />
              <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-300">
                {isLoading ? 'กำลังดำเนินการ...' : 'ยืนยันการเข้าเรียน'}
              </button>
            </form>
          ) : (
            <p className="text-center font-semibold text-green-600">นักเรียนคนนี้ได้เช็คอินเรียบร้อยแล้ว (ที่นั่ง: {registrationData.seatNumber})</p>
          )}
        </div>
      )}
      
      {message && <p className="mt-4 text-center font-bold text-red-600">{message}</p>}
    </div>
  );
}
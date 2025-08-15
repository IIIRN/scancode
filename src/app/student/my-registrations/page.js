'use client';

import { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import useLiff from '../../../hooks/useLiff';
import { QRCodeSVG } from 'qrcode.react';

// --- Component ย่อยสำหรับฟอร์มสร้างโปรไฟล์ ---
// ถูกเรียกใช้เมื่อ useLiff hook คืนค่า studentDbProfile เป็น null
function ProfileSetupForm({ liffProfile, onProfileCreated }) {
  const [fullName, setFullName] = useState(liffProfile.displayName || '');
  const [studentId, setStudentId] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    const profileData = { fullName, studentId, nationalId, createdAt: serverTimestamp() };

    try {
      // ใช้ lineUserId เป็น ID ของ document เพื่อให้เชื่อมโยงกัน
      const studentDocRef = doc(db, 'studentProfiles', liffProfile.userId);
      await setDoc(studentDocRef, profileData);
      onProfileCreated(profileData); // ส่งข้อมูลกลับไปให้หน้าหลักเพื่ออัปเดต UI ทันที
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการบันทึกโปรไฟล์");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 md:p-8">
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-2">ตั้งค่าโปรไฟล์นักเรียน</h1>
        <p className="text-gray-600 mb-6">กรุณากรอกข้อมูลของท่านเพื่อใช้งานระบบ</p>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <input type="text" placeholder="ชื่อ-สกุล" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-md"/>
          <input type="text" placeholder="รหัสนักศึกษา" value={studentId} onChange={(e) => setStudentId(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-md"/>
          <input type="tel" placeholder="เลขบัตรประชาชน (13 หลัก)" value={nationalId} onChange={(e) => setNationalId(e.target.value)} required pattern="\d{13}" className="w-full p-3 border border-gray-300 rounded-md"/>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:bg-green-300">
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
          </button>
        </form>
      </div>
    </div>
  );
}


// --- Component หลักของหน้า ---
export default function MyRegistrationsPage() {
  const { liffProfile, studentDbProfile, isLoading, error, setStudentDbProfile } = useLiff();
  
  const [registrations, setRegistrations] = useState([]);
  const [activities, setActivities] = useState({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [visibleQrCodeId, setVisibleQrCodeId] = useState(null);

  useEffect(() => {
    // ถ้ายังไม่มีโปรไฟล์ใน Firestore ก็ไม่ต้องทำอะไร
    if (!studentDbProfile) {
        setIsLoadingData(false);
        return;
    };
    // liffProfile ต้องพร้อมใช้งานด้วย
    if (!liffProfile) return;

    setIsLoadingData(true);
    
    // ดึงข้อมูล Activities (ส่วนนี้ดึงครั้งเดียว เพราะไม่ค่อยเปลี่ยน)
    const fetchActivities = async () => {
      const actSnapshot = await getDocs(collection(db, 'activities'));
      const actMap = {};
      actSnapshot.forEach(doc => { actMap[doc.id] = doc.data(); });
      setActivities(actMap);
    };
    fetchActivities();

    // ส่วนสำคัญ: ใช้ onSnapshot เพื่อ "ฟัง" การเปลี่ยนแปลงข้อมูล Registrations แบบ Real-time
    const regQuery = query(collection(db, 'registrations'), where('lineUserId', '==', liffProfile.userId));

    const unsubscribe = onSnapshot(regQuery, (querySnapshot) => {
      const regList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegistrations(regList);
      setIsLoadingData(false);
    }, (err) => {
      console.error("Error listening to registrations:", err);
      setIsLoadingData(false);
    });

    // Cleanup function: หยุดการ "ฟัง" เมื่อออกจากหน้านี้
    return () => unsubscribe();

  }, [studentDbProfile, liffProfile]);

  // Component ย่อยสำหรับ Modal และ Icon
  const QRModal = ({ registrationId, onClose }) => (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50" onClick={onClose}>
        <div className="bg-white p-6 rounded-lg text-center" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">QR Code สำหรับเช็คอิน</h3>
            <QRCodeSVG value={registrationId} size={256} />
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-300 rounded-lg">ปิด</button>
        </div>
    </div>
  );

  const CheckmarkIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
  );

  // --- ส่วนแสดงผลหลัก ---
  if (isLoading) return <div className="text-center p-10 font-sans">กำลังโหลดข้อมูลผู้ใช้...</div>;
  if (error) return <div className="p-4 text-center text-red-500 bg-red-100 font-sans">{error}</div>;

  // เงื่อนไขหลัก: ถ้าไม่มีโปรไฟล์ใน DB ให้แสดงฟอร์มตั้งค่า
  if (!studentDbProfile) {
    // liffProfile ต้องพร้อมก่อนแสดงฟอร์ม เพื่อให้ส่ง userId ไปได้
    if (liffProfile) {
        return <ProfileSetupForm liffProfile={liffProfile} onProfileCreated={setStudentDbProfile} />;
    }
    // กันกรณีที่ liffProfile ยังไม่มา
    return <div className="text-center p-10 font-sans">กำลังเตรียมตั้งค่าโปรไฟล์...</div>;
  }

  // ถ้ามีโปรไฟล์แล้ว ให้แสดงรายการลงทะเบียน
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {visibleQrCodeId && <QRModal registrationId={visibleQrCodeId} onClose={() => setVisibleQrCodeId(null)} />}
      
      {isLoadingData ? (
        <p className="text-center text-gray-500">กำลังโหลดรายการลงทะเบียน...</p>
      ) : registrations.length === 0 ? (
        <div className="text-center py-10 px-4 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">ไม่พบการลงทะเบียน</h2>
            <p className="text-gray-500 mt-2">คุณยังไม่ได้ลงทะเบียนกิจกรรมใดๆ</p>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map(reg => {
            const activity = activities[reg.activityId];
            if (!activity) return null;
            const activityDate = activity.activityDate.toDate();
            return (
              <div key={reg.id} className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold">{activity.name}</h2>
                  <p className="text-sm text-gray-600">{activityDate.toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
                  <p className="text-sm text-gray-500">
                    สถานะ: <span className="font-semibold">{reg.status === 'checked-in' ? 'เช็คอินแล้ว' : 'ลงทะเบียนแล้ว'}</span>
                  </p>
                  {reg.seatNumber && <p className="text-sm text-gray-500">ที่นั่ง: <span className="font-semibold">{reg.seatNumber}</span></p>}
                </div>
                <div className="flex-shrink-0">
                  {reg.status === 'checked-in' ? (
                    <div className="flex items-center gap-2 text-green-600 px-4 py-2">
                      <CheckmarkIcon />
                      <span className="font-semibold">เช็คอินแล้ว</span>
                    </div>
                  ) : (
                    <button onClick={() => setVisibleQrCodeId(reg.id)} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">
                      แสดง QR
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
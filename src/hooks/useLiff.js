'use client';

import { useState, useEffect } from 'react';
import { db } from '../lib/firebase'; // ปรับ path ให้ถูกต้อง
import { doc, getDoc } from 'firebase/firestore';

const MOCK_PROFILE = {
    liffProfile: {
        userId: 'U_PC_USER_001',
        displayName: 'คุณทดสอบ (PC Mode)',
        pictureUrl: 'https://via.placeholder.com/150'
    },
    // จำลองว่าผู้ใช้ใหม่บน PC ยังไม่มีโปรไฟล์ใน DB
    studentDbProfile: null 
};

export default function useLiff() {
  const [liffProfile, setLiffProfile] = useState(null);
  const [studentDbProfile, setStudentDbProfile] = useState(null); // 👈 State ใหม่สำหรับโปรไฟล์ใน DB
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [liffObject, setLiffObject] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const liff = (await import('@line/liff')).default;
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) throw new Error("LIFF ID is not defined");
        
        await liff.init({ liffId });
        setLiffObject(liff);

        if (!liff.isInClient()) {
          console.warn("Running on PC. Using MOCK_PROFILE.");
          setLiffProfile(MOCK_PROFILE.liffProfile);
          setStudentDbProfile(MOCK_PROFILE.studentDbProfile);
          setIsLoading(false);
          return;
        }

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLiffProfile(profile);
          
          // --- 👈 ส่วนที่เพิ่มเข้ามา ---
          // หลังจากได้โปรไฟล์ LINE แล้ว ให้ไปค้นหาโปรไฟล์ใน Firestore ทันที
          const studentDocRef = doc(db, 'studentProfiles', profile.userId);
          const studentDocSnap = await getDoc(studentDocRef);

          if (studentDocSnap.exists()) {
            setStudentDbProfile(studentDocSnap.data());
          } else {
            setStudentDbProfile(null); // คืนค่า null ถ้าไม่เจอ
          }
          // --- สิ้นสุดส่วนที่เพิ่มเข้ามา ---

        } else {
          liff.login();
        }
      } catch (err) {
        setError(`LIFF Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, []);

  // คืนค่า state ทั้งหมด รวมถึงโปรไฟล์จาก DB
  return { liffObject, liffProfile, studentDbProfile, isLoading, error, setStudentDbProfile };
};
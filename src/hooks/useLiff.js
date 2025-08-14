'use client';

import { useState, useEffect } from 'react';

// ข้อมูลจำลองสำหรับใช้เมื่อเปิดบน PC
const MOCK_PROFILE = {
    userId: 'U_PC_USER_001',
    displayName: 'คุณทดสอบ (PC Mode)',
    pictureUrl: 'https://via.placeholder.com/150'
};

/**
 * Custom Hook สำหรับ LIFF ที่ตรวจจับสภาพแวดล้อมอัตโนมัติ
 * - ถ้าเปิดในแอป LINE: ใช้ข้อมูลจริง
 * - ถ้าเปิดบน PC/เบราว์เซอร์อื่น: ใช้ข้อมูลจำลอง (Mock)
 */
export default function useLiff() {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [liffObject, setLiffObject] = useState(null);

  useEffect(() => {
    const initializeLiff = async () => {
      try {
        const liff = (await import('@line/liff')).default;
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        
        if (!liffId) {
          throw new Error("LIFF ID is not defined in .env.local (NEXT_PUBLIC_LIFF_ID)");
        }
        
        // 1. สั่ง init LIFF ก่อนเสมอ เพื่อให้เราสามารถใช้ฟังก์ชันอื่นๆ ของมันได้
        await liff.init({ liffId });
        setLiffObject(liff);

        // 2. ใช้ liff.isInClient() เพื่อตัดสินใจ
        if (liff.isInClient()) {
          // --- กรณีเปิดในแอป LINE ---
          console.log("Running in LIFF client. Using real profile.");
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            setUserProfile(profile);
          } else {
            // ถ้าอยู่ในแอป LINE แต่ยังไม่ล็อกอิน ให้บังคับล็อกอิน
            liff.login();
            return; // ไม่ต้องทำอะไรต่อ รอ redirect
          }
        } else {
          // --- กรณีเปิดบน PC หรือเบราว์เซอร์ภายนอก ---
          console.warn("Running outside of LIFF client (e.g., on PC). Using MOCK_PROFILE.");
          setUserProfile(MOCK_PROFILE);
        }

      } catch (err) {
        console.error("LIFF initialization failed:", err);
        setError(`LIFF Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    initializeLiff();
  }, []); // ทำงานแค่ครั้งเดียว

  return { liffObject, userProfile, isLoading, error };
};
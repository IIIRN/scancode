'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useLiff from '../hooks/useLiff'; // ตรวจสอบว่า path ถูกต้อง

export default function StudentHeader() {
  // ดึงโปรไฟล์ทั้ง 2 แบบ (จาก LINE และจาก Firestore DB) ออกมาจาก Hook
  const { liffProfile, studentDbProfile, isLoading } = useLiff();
  const pathname = usePathname();

  const navLinks = [
    { name: 'ค้นหากิจกรรม', href: '/student/activities' },
    { name: 'การลงทะเบียนของฉัน', href: '/student/my-registrations' },
  ];

  if (isLoading || !liffProfile) {
    // UI ชั่วคราวระหว่างรอโหลดข้อมูลโปรไฟล์ทั้งหมด
    return (
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 shadow-md text-white animate-pulse">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-white/30"></div>
                <div>
                    <div className="h-4 bg-white/30 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-white/20 rounded w-32"></div>
                </div>
            </div>
            <div className="flex justify-center bg-black/20 rounded-lg p-1 h-10"></div>
        </div>
      </header>
    );
  }

  // เลือกว่าจะแสดงชื่อและข้อมูลจากไหนเป็นหลัก
  const displayName = studentDbProfile?.fullName || liffProfile?.displayName;
  const displaySubText = studentDbProfile?.studentId ? `รหัส: ${studentDbProfile.studentId}` : "กรุณาตั้งค่าโปรไฟล์";

  return (
    <header className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 shadow-md text-white sticky top-0 z-40 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* ส่วนโปรไฟล์ */}
        <div className="flex items-center gap-4 mb-4">
          <img 
            src={liffProfile?.pictureUrl} 
            alt={displayName || 'Profile'}
            className="w-14 h-14 rounded-full border-2 border-white/80 bg-gray-400"
          />
          <div>
            <h1 className="font-bold text-lg">{displayName}</h1>
            <p className="text-xs text-white/80">{displaySubText}</p>
          </div>
        </div>
        
        {/* ส่วนเมนูนำทาง */}
        <div className="flex justify-center bg-black/20 rounded-lg p-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`w-1/2 text-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
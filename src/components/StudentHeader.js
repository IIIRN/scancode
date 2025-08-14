'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useLiff from '../hooks/useLiff'; // อัปเดต path ตามตำแหน่งไฟล์

export default function StudentHeader() {
  const { userProfile, isLoading } = useLiff();
  const pathname = usePathname();

  const navLinks = [
    { name: 'ค้นหากิจกรรม', href: '/student/activities' },
    { name: 'การลงทะเบียนของฉัน', href: '/student/my-registrations' },
  ];

  if (isLoading) {
    // แสดง UI ชั่วคราวระหว่างรอโหลดโปรไฟล์
    return (
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 shadow-md text-white animate-pulse">
        <div className="h-8 bg-white/20 rounded w-3/4"></div>
      </header>
    );
  }

  return (
    <header className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 shadow-md text-white sticky top-0 z-40">
      <div className="max-w-4xl mx-auto">
        {/* ส่วนโปรไฟล์ */}
        <div className="flex items-center gap-4 mb-4">
          <img 
            src={userProfile?.pictureUrl} 
            alt={userProfile?.displayName}
            className="w-14 h-14 rounded-full border-2 border-white/80"
          />
          <div>
            <p className="text-sm">สวัสดี,</p>
            <h1 className="font-bold text-lg">{userProfile?.displayName}</h1>
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
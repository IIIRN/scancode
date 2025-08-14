'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNavbar() {
  const pathname = usePathname();

  // รายการลิงก์สำหรับ Navbar เพื่อง่ายต่อการจัดการ
 const navLinks = [
    { name: 'แดชบอร์ดกิจกรรม', href: '/admin/activity' },
    { name: 'ลงทะเบียนให้นักเรียน', href: '/admin/activity/register-student' },
    { name: 'สแกน & ค้นหา', href: '/admin/scanner' }, // 👈 เปลี่ยนชื่อให้ชัดเจนขึ้น
    { name: 'ประวัติ', href: '/admin/history' },      // 👈 ลิงก์ใหม่
  ];

  return (
    <nav className="bg-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ส่วนของโลโก้หรือชื่อระบบ */}
          <div className="flex-shrink-0">
            <Link href="/admin/activity" className="text-white font-bold text-xl">
              Admin Panel
            </Link>
          </div>
          
          {/* ส่วนของลิงก์นำทาง */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-gray-900 text-white' // สไตล์ของลิงก์ที่กำลังใช้งาน
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white' // สไตล์ของลิงก์ปกติ
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
'use client';

import StudentHeader from '../../components/StudentHeader';

export default function StudentLayout({ children }) {
  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      <StudentHeader />
      <main>
        {/* children คือเนื้อหาของแต่ละหน้าที่จะถูกส่งเข้ามา */}
        {children}
      </main>
    </div>
  );
}
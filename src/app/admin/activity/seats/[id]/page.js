'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '../../../../../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function SeatAssignmentPage({ params }) {
  const { id: activityId } = use(params);
  const router = useRouter();

  const [activity, setActivity] = useState(null);
  const [registrants, setRegistrants] = useState([]);
  const [seatInputs, setSeatInputs] = useState({}); // State สำหรับเก็บค่า input ของแต่ละคน
  const [isLoading, setIsLoading] = useState(true);
  const [savingStates, setSavingStates] = useState({}); // State สำหรับสถานะการบันทึกของแต่ละแถว

  useEffect(() => {
    if (!activityId) return;

    const fetchAndSetData = async () => {
      try {
        // ดึงข้อมูลกิจกรรม
        const activityDoc = await getDoc(doc(db, 'activities', activityId));
        if (activityDoc.exists()) {
          setActivity({ id: activityDoc.id, ...activityDoc.data() });
        }

        // ดึงข้อมูลผู้ลงทะเบียนทั้งหมดสำหรับกิจกรรมนี้
        const q = query(
          collection(db, 'registrations'),
          where('activityId', '==', activityId),
          orderBy('registeredAt', 'asc') // เรียงตามเวลาที่ลงทะเบียน
        );
        const snapshot = await getDocs(q);
        const registrantsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setRegistrants(registrantsData);

        // ตั้งค่าเริ่มต้นสำหรับ seatInputs
        const initialInputs = {};
        registrantsData.forEach(r => {
          initialInputs[r.id] = r.seatNumber || '';
        });
        setSeatInputs(initialInputs);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAndSetData();
  }, [activityId]);

  // จัดการการเปลี่ยนแปลงของ input
  const handleSeatInputChange = (registrantId, value) => {
    setSeatInputs(prev => ({ ...prev, [registrantId]: value }));
  };

  // บันทึกเลขที่นั่ง
  const handleAssignSeat = async (registrantId) => {
    setSavingStates(prev => ({ ...prev, [registrantId]: true }));
    const seatToAssign = seatInputs[registrantId] || null;

    try {
      const registrantDocRef = doc(db, 'registrations', registrantId);
      await updateDoc(registrantDocRef, {
        seatNumber: seatToAssign
      });
      // อัปเดตข้อมูลใน State ทันทีเพื่อเปลี่ยน UI
      setRegistrants(prev => prev.map(r => 
        r.id === registrantId ? { ...r, seatNumber: seatToAssign } : r
      ));
    } catch (error) {
      console.error("Error assigning seat:", error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSavingStates(prev => ({ ...prev, [registrantId]: false }));
    }
  };

  if (isLoading) return <div className="text-center p-10">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-8">
      <main className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">จัดการที่นั่ง</h1>
            <p className="text-gray-600">{activity?.name}</p>
          </div>
          <Link href="/admin/activity" className="text-sm text-blue-600 hover:underline">
            &larr; กลับไปหน้าหลัก
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <ul className="divide-y divide-gray-200">
            {registrants.map((registrant) => (
              <li key={registrant.id} className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{registrant.fullName}</p>
                  <p className="text-sm text-gray-500">รหัสนักศึกษา: {registrant.studentId}</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder="เลขที่นั่ง"
                    value={seatInputs[registrant.id] || ''}
                    onChange={(e) => handleSeatInputChange(registrant.id, e.target.value)}
                    className="p-2 border border-gray-300 rounded-md w-full md:w-32"
                  />
                  <button
                    onClick={() => handleAssignSeat(registrant.id)}
                    disabled={savingStates[registrant.id]}
                    className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {savingStates[registrant.id] ? '...' : 'บันทึก'}
                  </button>
                </div>
              </li>
            ))}
            {registrants.length === 0 && (
              <p className="p-6 text-center text-gray-500">ยังไม่มีผู้ลงทะเบียนสำหรับกิจกรรมนี้</p>
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}
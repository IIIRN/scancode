'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '../../../lib/firebase';
import { collection, getDocs, orderBy } from 'firebase/firestore';

export default function ActivityDashboardPage() {
  const [activities, setActivities] = useState([]);
  const [courses, setCourses] = useState({});
  const [registrationsCount, setRegistrationsCount] = useState({}); // 🔻 State ใหม่สำหรับนับจำนวน
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 🔻 ดึงข้อมูล 3 Collections พร้อมกัน
        const [activitiesSnapshot, coursesSnapshot, registrationsSnapshot] = await Promise.all([
          getDocs(collection(db, 'activities')),
          getDocs(collection(db, 'courses')),
          getDocs(collection(db, 'registrations'))
        ]);

        // --- จัดการข้อมูล Courses (เหมือนเดิม) ---
        const coursesMap = {};
        coursesSnapshot.forEach(doc => {
          coursesMap[doc.id] = doc.data().name;
        });
        setCourses(coursesMap);

        // --- 🔻 จัดการข้อมูล Registrations เพื่อนับจำนวน ---
        const counts = {};
        registrationsSnapshot.forEach(doc => {
          const activityId = doc.data().activityId;
          if (counts[activityId]) {
            counts[activityId]++;
          } else {
            counts[activityId] = 1;
          }
        });
        setRegistrationsCount(counts);

        // --- จัดการข้อมูล Activities (เหมือนเดิม) ---
        const activitiesData = activitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        activitiesData.sort((a, b) => b.activityDate.seconds - a.activityDate.seconds);
        setActivities(activitiesData);

      } catch (error) {
        console.error("Error fetching data: ", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // ... (ฟังก์ชัน getActivityStatus เหมือนเดิม) ...
  const getActivityStatus = (activityTimestamp) => {
    if (!activityTimestamp) return { text: 'ไม่มีข้อมูล', color: 'bg-gray-400' };
    const now = new Date();
    const activityDate = activityTimestamp.toDate();
    const activityEndDate = new Date(activityDate.getTime() + 3 * 60 * 60 * 1000);
    if (now > activityEndDate) return { text: 'จบกิจกรรมแล้ว', color: 'bg-red-500' };
    if (now >= activityDate && now <= activityEndDate) return { text: 'เริ่มกิจกรรม', color: 'bg-green-500 animate-pulse' };
    return { text: 'กำลังจะมา', color: 'bg-blue-500' };
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="bg-gray-100 min-h-screen p-4 md:p-8">
      <main className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">จัดการกิจกรรม</h1>
          <Link href="/admin/activity/add" className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">
            + สร้างกิจกรรมใหม่
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-4 font-semibold">ชื่อกิจกรรม</th>
                <th className="p-4 font-semibold">หลักสูตร</th>
                <th className="p-4 font-semibold">วันที่ / เวลา</th>
                <th className="p-4 font-semibold">สถานะ</th>
                <th className="p-4 font-semibold text-center">ผู้ลงทะเบียน</th>
                <th className="p-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {activities.map(activity => {
                const status = getActivityStatus(activity.activityDate);
                const count = registrationsCount[activity.id] || 0;
                const capacity = activity.capacity;
                const isFull = count >= capacity;
                const activityDate = activity.activityDate ? activity.activityDate.toDate() : null;

                return (
                  <tr key={activity.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{activity.name}</td>
                    <td className="p-4 text-gray-600">{courses[activity.courseId] || 'ไม่พบหลักสูตร'}</td>
                    <td className="p-4 text-gray-600">
                      {activityDate ? activityDate.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      <span className="text-gray-400">, {activityDate ? activityDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 'N/A'} น.</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 text-sm text-white rounded-full ${status.color}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className={`p-4 text-center font-mono ${isFull ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                      {count} / {capacity}
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <Link href={`/admin/activity/seats/${activity.id}`} className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700">
                        ที่นั่ง
                      </Link>
                      <Link href={`/admin/activity/edit/${activity.id}`} className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600">
                        แก้ไข
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {activities.length === 0 && (
            <p className="p-6 text-center text-gray-500">ยังไม่มีกิจกรรมที่สร้างไว้</p>
          )}
        </div>

      </main>
    </div>
  );
}
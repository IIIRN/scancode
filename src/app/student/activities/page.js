'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '../../../lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

export default function ActivitiesListPage() {
  const [activities, setActivities] = useState([]);
  const [courses, setCourses] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ดึงข้อมูล Courses มาเก็บไว้เพื่อแสดงชื่อ
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        const coursesMap = {};
        coursesSnapshot.forEach(doc => {
          coursesMap[doc.id] = doc.data().name;
        });
        setCourses(coursesMap);

        // ดึงข้อมูล Activities ที่ยังไม่ถึงวันจัดกิจกรรม (กิจกรรมในอนาคต)
        const now = Timestamp.now();
        const q = query(collection(db, 'activities'), where("activityDate", ">=", now));
        const activitiesSnapshot = await getDocs(q);
        const activitiesList = activitiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setActivities(activitiesList);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return <div className="text-center p-10 font-sans">กำลังโหลดรายการกิจกรรม...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {activities.length === 0 ? (
        <div className="text-center py-10 px-4 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">ไม่มีกิจกรรม</h2>
            <p className="text-gray-500 mt-2">ยังไม่มีกิจกรรมที่เปิดรับสมัครในขณะนี้</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map(activity => {
            const activityDate = activity.activityDate.toDate();
            return (
              <div key={activity.id} className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col transition-transform hover:scale-105">
                <div className="p-6 flex-grow">
                  <p className="text-sm font-semibold text-indigo-600">{courses[activity.courseId] || 'หลักสูตรทั่วไป'}</p>
                  <h2 className="text-xl font-bold text-gray-900 mt-1 mb-2">{activity.name}</h2>
             <p className="text-gray-600 text-sm mb-1">
  <strong>วันที่:</strong> {activityDate.toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })} น.
</p>
                  <p className="text-gray-600 text-sm">
                    <strong>สถานที่:</strong> {activity.location}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 mt-auto">
                  <Link 
                    href={`/student/register?activityId=${activity.id}`} 
                    className="w-full text-center block px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    ลงทะเบียน
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
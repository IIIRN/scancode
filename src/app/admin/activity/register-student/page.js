'use client';

import { useState, useEffect } from 'react';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';

export default function AdminRegisterStudentPage() {
  // State สำหรับ Dropdowns
  const [activities, setActivities] = useState([]);
  const [courses, setCourses] = useState({});
  const [selectedActivity, setSelectedActivity] = useState('');

  // State สำหรับข้อมูลในฟอร์ม
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [nationalId, setNationalId] = useState('');

  // State สำหรับการทำงานของ UI
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // ดึงข้อมูลกิจกรรมและหลักสูตรมาแสดงใน Dropdown
  useEffect(() => {
    const fetchData = async () => {
      const [activitiesSnapshot, coursesSnapshot] = await Promise.all([
        getDocs(collection(db, 'activities')),
        getDocs(collection(db, 'courses'))
      ]);
      
      const coursesMap = {};
      coursesSnapshot.forEach(doc => {
        coursesMap[doc.id] = doc.data().name;
      });
      setCourses(coursesMap);

      const activitiesList = activitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActivities(activitiesList);
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedActivity) {
      setMessage({ type: 'error', text: 'กรุณาเลือกกิจกรรมก่อน' });
      return;
    }
    
    setIsLoading(true);
    setMessage('');

    try {
      // ตรวจสอบการลงทะเบียนซ้ำ
      const registrationsRef = collection(db, 'registrations');
      const q = query(registrationsRef, 
        where("activityId", "==", selectedActivity),
        where("nationalId", "==", nationalId)
      );
      if (!(await getDocs(q)).empty) {
        throw new Error('นักเรียนคนนี้ได้ลงทะเบียนกิจกรรมนี้แล้ว');
      }

      // เตรียมข้อมูล (ไม่มี lineUserId เพราะแอดมินเป็นคนลงทะเบียนให้)
      const registrationData = {
        fullName, studentId, nationalId,
        activityId: selectedActivity,
        courseId: activities.find(act => act.id === selectedActivity)?.courseId || null,
        status: 'registered',
        seatNumber: null,
        registeredAt: serverTimestamp(),
        registeredBy: 'admin' // เพิ่ม field เพื่อให้รู้ว่าใครเป็นคนลงทะเบียน
      };
      
      await addDoc(registrationsRef, registrationData);
      setMessage({ type: 'success', text: `ลงทะเบียนให้ ${fullName} สำเร็จ!` });
      // เคลียร์ฟอร์ม
      setFullName(''); setStudentId(''); setNationalId('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-8">
      <main className="max-w-2xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">ลงทะเบียนให้นักเรียน (โดย Admin)</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="activity" className="block text-sm font-medium text-gray-700">เลือกกิจกรรมที่จะลงทะเบียน</label>
              <select id="activity" value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)} required className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm">
                <option value="">-- กรุณาเลือกกิจกรรม --</option>
                {activities.map(act => (
                  <option key={act.id} value={act.id}>
                    {courses[act.courseId] || 'ไม่มีหลักสูตร'} - {act.name}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedActivity && (
              <div className="border-t pt-6 space-y-4">
                 <h2 className="text-xl font-semibold text-gray-700">กรอกข้อมูลนักเรียน</h2>
                <input type="text" placeholder="ชื่อ-สกุล" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-md"/>
                <input type="text" placeholder="รหัสนักศึกษา" value={studentId} onChange={(e) => setStudentId(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-md"/>
                <input type="tel" placeholder="เลขบัตรประชาชน (13 หลัก)" value={nationalId} onChange={(e) => setNationalId(e.target.value)} required pattern="\d{13}" className="w-full p-3 border border-gray-300 rounded-md"/>
                
                {message && (
                  <div className={`p-4 rounded-md text-center ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                  </div>
                )}

                <button type="submit" disabled={isLoading} className="w-full py-3 px-4 bg-purple-600 text-white font-bold rounded-md hover:bg-purple-700 disabled:bg-purple-300 transition-colors">
                  {isLoading ? 'กำลังบันทึก...' : 'ลงทะเบียนให้นักเรียน'}
                </button>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
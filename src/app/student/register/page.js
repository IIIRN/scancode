'use client';

// Import ที่จำเป็น รวมถึง Suspense
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '../../../lib/firebase';
import { collection, getDocs, addDoc, query, where, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import useLiff from '../../../hooks/useLiff';

/**
 * Component หลักที่บรรจุ Logic ทั้งหมดของหน้า
 * เราแยกส่วนนี้ออกมาเพื่อให้สามารถครอบด้วย <Suspense> ได้
 */
function RegistrationComponent() {
  const { userProfile, isLoading: isLiffLoading, error: liffError } = useLiff();
  const searchParams = useSearchParams();
  const activityIdFromUrl = searchParams.get('activityId');

  // State สำหรับฟอร์มและข้อมูล
  const [courses, setCourses] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(activityIdFromUrl || '');
  const [studentId, setStudentId] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [registration, setRegistration] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Effect: ดึงข้อมูลตั้งต้น (หลักสูตร) และ pre-select กิจกรรมถ้ามี ID มาใน URL
  useEffect(() => {
    const fetchInitialData = async () => {
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesList = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(coursesList);

      if (activityIdFromUrl && coursesList.length > 0) {
        try {
          const activityDoc = await getDoc(doc(db, 'activities', activityIdFromUrl));
          if (activityDoc.exists()) {
            const courseId = activityDoc.data().courseId;
            setSelectedCourse(courseId);
          }
        } catch (e) { console.error("Failed to pre-select course:", e); }
      }
    };
    fetchInitialData();
  }, [activityIdFromUrl]);

  // Effect: ดึงกิจกรรมที่เกี่ยวข้องเมื่อมีการเลือกหลักสูตร
  useEffect(() => {
    if (!selectedCourse) {
      setActivities([]);
      if (!activityIdFromUrl) setSelectedActivity('');
      return;
    }
    const fetchActivities = async () => {
      const q = query(collection(db, 'activities'), where("courseId", "==", selectedCourse));
      const activitiesSnapshot = await getDocs(q);
      setActivities(activitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchActivities();
  }, [selectedCourse, activityIdFromUrl]);
  
  // Effect: ตรวจสอบสถานะการลงทะเบียนทันทีที่ผู้ใช้เลือกกิจกรรม
  useEffect(() => {
    if (!userProfile || !selectedActivity) return;
    const checkExistingRegistration = async () => {
      const q = query(collection(db, 'registrations'), where('lineUserId', '==', userProfile.userId), where('activityId', '==', selectedActivity));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setRegistration({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setRegistration(null);
      }
    };
    checkExistingRegistration();
  }, [userProfile, selectedActivity]);

  // ฟังก์ชันจัดการการส่งฟอร์ม
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    const registrationData = {
      fullName: userProfile.displayName, studentId, nationalId,
      courseId: selectedCourse, activityId: selectedActivity,
      lineUserId: userProfile.userId, status: 'registered',
      seatNumber: null, registeredAt: serverTimestamp(),
    };
    try {
      const docRef = await addDoc(collection(db, 'registrations'), registrationData);
      const activity = activities.find(act => act.id === selectedActivity);
      const activityName = activity ? activity.name : "กิจกรรม";
      const notificationMessage = `คุณได้ลงทะเบียนเข้าร่วมกิจกรรม "${activityName}" สำเร็จแล้ว! 🚀\n\nสามารถตรวจสอบสถานะและ QR Code ได้ที่เมนู "การลงทะเบียนของฉัน"`;
      await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.userId, message: notificationMessage }),
      });
      setRegistration({ id: docRef.id, ...registrationData }); 
    } catch (error) {
      console.error("Error submitting:", error);
      setMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ส่วนแสดงผล ---
  if (isLiffLoading) return <div className="flex justify-center items-center h-screen font-sans">กำลังเชื่อมต่อกับ LINE...</div>;
  if (liffError) return <div className="p-4 text-center text-red-600 bg-red-100 font-sans">{liffError}</div>;
  if (!userProfile) return <div className="flex justify-center items-center h-screen font-sans">ไม่สามารถโหลดข้อมูลโปรไฟล์ LINE ได้</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        {registration ? (
          <div className="text-center animate-fade-in">
            <h2 className="text-2xl font-bold text-green-600 mb-2">ลงทะเบียนเรียบร้อย!</h2>
            <p className="text-gray-600 mb-6">กรุณาแสดง QR Code นี้ให้เจ้าหน้าที่เพื่อเช็คอิน</p>
            <div className="p-4 bg-white border inline-block rounded-lg shadow">
              <QRCodeSVG value={registration.id} size={240} />
            </div>
            <div className="mt-6 text-left bg-gray-50 p-4 rounded-lg border">
              <p className="mb-2"><strong>ชื่อ-สกุล:</strong> {registration.fullName}</p>
              <p><strong>รหัสนักศึกษา:</strong> {registration.studentId}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800">ลงทะเบียนเข้าร่วมกิจกรรม</h2>
            <div>
              <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">เลือกหลักสูตร</label>
              <select id="course" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                <option value="">-- กรุณาเลือก --</option>
                {courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="activity" className="block text-sm font-medium text-gray-700 mb-1">เลือกกิจกรรม</label>
              <select id="activity" value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)} required disabled={!selectedCourse} className="mt-1 block w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-200">
                <option value="">-- กรุณาเลือก --</option>
                {activities.map(activity => <option key={activity.id} value={activity.id}>{activity.name}</option>)}
              </select>
            </div>
            {selectedActivity && (
              <div className="border-t pt-5 space-y-4">
                <input type="text" placeholder="รหัสนักศึกษา" value={studentId} onChange={(e) => setStudentId(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-md"/>
                <input type="tel" placeholder="เลขบัตรประชาชน (13 หลัก)" value={nationalId} onChange={(e) => setNationalId(e.target.value)} required pattern="\d{13}" className="w-full p-3 border border-gray-300 rounded-md"/>
                {message && <p className="text-red-500 text-sm text-center">{message}</p>}
                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors">
                  {isSubmitting ? 'กำลังลงทะเบียน...' : 'ยืนยันการลงทะเบียน'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}


/**
 * Component หลักของหน้าเพจ ทำหน้าที่ครอบ Component ด้านบนด้วย Suspense
 * เพื่อแก้ไขปัญหา Build Error ที่เกี่ยวกับ useSearchParams
 */
export default function LiffStudentRegistrationPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen font-sans">กำลังโหลดหน้าลงทะเบียน...</div>}>
      <RegistrationComponent />
    </Suspense>
  );
}

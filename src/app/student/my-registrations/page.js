'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import useLiff from '../../../hooks/useLiff';
import { QRCodeSVG } from 'qrcode.react';

export default function MyRegistrationsPage() {
  const { userProfile, isLoading: isLiffLoading, error: liffError } = useLiff();
  const [registrations, setRegistrations] = useState([]);
  const [activities, setActivities] = useState({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [visibleQrCodeId, setVisibleQrCodeId] = useState(null);

  useEffect(() => {
    if (!userProfile) return;

    const fetchData = async () => {
      try {
        const regQuery = query(collection(db, 'registrations'), where('lineUserId', '==', userProfile.userId));
        const regSnapshot = await getDocs(regQuery);
        const regList = regSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRegistrations(regList);

        const actSnapshot = await getDocs(collection(db, 'activities'));
        const actMap = {};
        actSnapshot.forEach(doc => {
          actMap[doc.id] = doc.data();
        });
        setActivities(actMap);
      } catch (error) {
        console.error("Error fetching user registrations:", error);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [userProfile]);

  const QRModal = ({ registrationId, onClose }) => (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white p-6 rounded-lg text-center" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold mb-4">QR Code สำหรับเช็คอิน</h3>
        <QRCodeSVG value={registrationId} size={256} />
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-300 rounded-lg">ปิด</button>
      </div>
    </div>
  );

  const CheckmarkIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
  );

  if (isLiffLoading || isLoadingData) return <div className="text-center p-10 font-sans">กำลังโหลดข้อมูลการลงทะเบียน...</div>;
  if (liffError) return <div className="p-4 text-center text-red-500 bg-red-100 font-sans">{liffError}</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {visibleQrCodeId && <QRModal registrationId={visibleQrCodeId} onClose={() => setVisibleQrCodeId(null)} />}
      
      {registrations.length === 0 ? (
        <div className="text-center py-10 px-4 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">ไม่พบการลงทะเบียน</h2>
            <p className="text-gray-500 mt-2">คุณยังไม่ได้ลงทะเบียนกิจกรรมใดๆ</p>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map(reg => {
            const activity = activities[reg.activityId];
            if (!activity) return null;
            const activityDate = activity.activityDate.toDate();
            return (
              <div key={reg.id} className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold">{activity.name}</h2>
                  <p className="text-sm text-gray-600">{activityDate.toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
                  <p className="text-sm text-gray-500">
                    สถานะ: <span className="font-semibold">{reg.status === 'checked-in' ? 'เช็คอินแล้ว' : 'ลงทะเบียนแล้ว'}</span>
                  </p>
                  {reg.seatNumber && <p className="text-sm text-gray-500">ที่นั่ง: <span className="font-semibold">{reg.seatNumber}</span></p>}
                </div>

                <div className="flex-shrink-0">
                  {reg.status === 'checked-in' ? (
                    <div className="flex items-center gap-2 text-green-600 px-4 py-2">
                      <CheckmarkIcon />
                      <span className="font-semibold">เช็คอินแล้ว</span>
                    </div>
                  ) : (
                    <button onClick={() => setVisibleQrCodeId(reg.id)} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">
                      แสดง QR
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
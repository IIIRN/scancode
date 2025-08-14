import { NextResponse } from 'next/server';

/**
 * API Route สำหรับรับคำขอ POST เพื่อส่งข้อความ Push ผ่าน LINE Messaging API
 * @param {Request} request - The incoming request object from Next.js.
 */
export async function POST(request) {
  // ดึงค่า Channel Access Token จาก Environment Variables
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  try {
    // 1. ดึงข้อมูล userId และ seatNumber จาก body ของ request
    const { userId, seatNumber } = await request.json();

    // 2. ตรวจสอบว่ามีข้อมูลที่จำเป็นครบถ้วนหรือไม่
    if (!userId || !seatNumber || !accessToken) {
      return NextResponse.json(
        { message: 'Missing required parameters: userId, seatNumber, or Access Token' },
        { status: 400 } // Bad Request
      );
    }

    // 3. เตรียมข้อมูลสำหรับส่งไปยัง LINE API
    const body = {
      to: userId,
      messages: [
        {
          type: 'text',
          text: `ยืนยันการเข้าเรียนสำเร็จ!\nคุณได้รับที่นั่งหมายเลข: ${seatNumber}\nขอให้มีความสุขกับกิจกรรมครับ 😊`,
        },
      ],
    };

    // 4. ส่ง Request ไปยัง LINE Messaging API
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`, // ยืนยันตัวตนด้วย Access Token
      },
      body: JSON.stringify(body),
    });

    // 5. ตรวจสอบผลลัพธ์จาก LINE API
    if (!response.ok) {
      const result = await response.json();
      console.error('LINE API Error:', result);
      throw new Error(result.message || 'Failed to send message to LINE API');
    }

    // 6. หากสำเร็จ ส่งสถานะ 200 กลับไป
    return NextResponse.json({ message: 'Notification sent successfully!' });

  } catch (error) {
    // 7. หากเกิดข้อผิดพลาดใดๆ ในกระบวนการ ส่งสถานะ 500 กลับไป
    console.error('Internal Server Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
}

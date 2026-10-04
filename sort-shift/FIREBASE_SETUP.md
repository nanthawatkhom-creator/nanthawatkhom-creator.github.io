# เชื่อม Leaderboard ออนไลน์ด้วย Firebase Firestore

เกมทำงานได้ทันทีในโหมดเครื่องเดียวด้วย localStorage แต่ถ้าต้องการให้ทุกเครื่องในงานเห็น Leaderboard ชุดเดียวกัน ให้ทำดังนี้

1. สร้าง Firebase Project และเพิ่ม Web App
2. เปิด Cloud Firestore
3. คัดลอก Firebase config ของ Web App
4. เปิด `js/firebase-config.js`
5. เปลี่ยน `FIREBASE_ENABLED` เป็น `true`
6. วางค่า `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`
7. นำ rules ใน `firestore.rules` ไปวางใน Firestore Rules แล้ว Publish
8. Deploy โฟลเดอร์นี้บน HTTPS เช่น GitHub Pages, Firebase Hosting, Vercel หรือ Netlify
9. เปิด `index.html` บนอุปกรณ์เล่น คะแนนจากทุกเครื่องจะถูกรวมและแสดงในหน้าอันดับหลังจบเกม

หมายเหตุ: Firebase Web config ไม่ใช่รหัสผ่าน แต่ความปลอดภัยต้องควบคุมด้วย Firestore Security Rules เสมอ สำหรับงานจริงที่มีผู้ใช้จำนวนมาก ควรเพิ่ม App Check หรือ backend validation เพิ่มเติม

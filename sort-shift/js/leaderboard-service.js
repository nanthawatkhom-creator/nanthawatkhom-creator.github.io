import { FIREBASE_ENABLED, FIREBASE_CONFIG, SCORE_COLLECTION, META_COLLECTION, META_DOC } from './firebase-config.js';

const LOCAL_SCORES = 'sortshift_th_scores_v2';
const LOCAL_META = 'sortshift_th_meta_v2';
let fb = null;

function validFirebaseConfig(){
  return FIREBASE_ENABLED && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId;
}

async function ensureFirebase(){
  if (!validFirebaseConfig()) return null;
  if (fb) return fb;
  try {
    const appMod = await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js');
    const fsMod = await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js');
    const app = appMod.initializeApp(FIREBASE_CONFIG);
    const db = fsMod.getFirestore(app);
    fb = { db, fs: fsMod };
    return fb;
  } catch (err) {
    console.warn('Firebase ใช้งานไม่ได้ กำลังใช้โหมดเครื่องเดียว', err);
    return null;
  }
}

function getLocalScores(){
  try { return JSON.parse(localStorage.getItem(LOCAL_SCORES) || '[]'); } catch { return []; }
}
function setLocalScores(rows){ localStorage.setItem(LOCAL_SCORES, JSON.stringify(rows)); }
function getLocalMeta(){
  try { return JSON.parse(localStorage.getItem(LOCAL_META) || '{"plays":0,"co2e":0,"items":0}'); }
  catch { return { plays:0, co2e:0, items:0 }; }
}
function setLocalMeta(meta){ localStorage.setItem(LOCAL_META, JSON.stringify(meta)); }

export async function getConnectionMode(){
  const cloud = await ensureFirebase();
  return cloud ? 'online' : 'local';
}

export async function submitScore(entry){
  const payload = {
    name: String(entry.name || 'ผู้เล่น').slice(0, 12),
    score: Math.max(0, Math.round(Number(entry.score || 0))),
    co2e: Math.max(0, Number(entry.co2e || 0)),
    accuracy: Math.max(0, Math.min(100, Number(entry.accuracy || 0))),
    combo: Math.max(0, Math.round(Number(entry.combo || 0))),
    items: Math.max(0, Math.round(Number(entry.items || 0))),
    createdAtMs: Date.now(),
  };
  const cloud = await ensureFirebase();
  if (cloud) {
    const { db, fs } = cloud;
    await fs.addDoc(fs.collection(db, SCORE_COLLECTION), {
      ...payload,
      createdAt: fs.serverTimestamp(),
    });
    const metaRef = fs.doc(db, META_COLLECTION, META_DOC);
    await fs.setDoc(metaRef, {
      plays: fs.increment(1),
      co2e: fs.increment(payload.co2e),
      items: fs.increment(payload.items),
      updatedAt: fs.serverTimestamp(),
    }, { merge:true });
    return { mode:'online' };
  }
  const rows = getLocalScores();
  rows.push(payload);
  rows.sort((a,b)=>b.score-a.score || b.co2e-a.co2e);
  setLocalScores(rows.slice(0,50));
  const meta = getLocalMeta();
  meta.plays += 1; meta.co2e += payload.co2e; meta.items += payload.items;
  setLocalMeta(meta);
  return { mode:'local' };
}

export async function loadTopScores(limitCount=10){
  const cloud = await ensureFirebase();
  if (cloud) {
    const { db, fs } = cloud;
    const q = fs.query(fs.collection(db, SCORE_COLLECTION), fs.orderBy('score','desc'), fs.limit(limitCount));
    const snap = await fs.getDocs(q);
    return snap.docs.map(d=>({ id:d.id, ...d.data() }));
  }
  return getLocalScores().slice(0, limitCount);
}

export async function loadCommunityMeta(){
  const cloud = await ensureFirebase();
  if (cloud) {
    const { db, fs } = cloud;
    const snap = await fs.getDoc(fs.doc(db, META_COLLECTION, META_DOC));
    return snap.exists() ? snap.data() : { plays:0,co2e:0,items:0 };
  }
  return getLocalMeta();
}

export async function subscribeLeaderboard({ onScores, onMeta, limitCount=10 }){
  const cloud = await ensureFirebase();
  if (cloud) {
    const { db, fs } = cloud;
    const q = fs.query(fs.collection(db, SCORE_COLLECTION), fs.orderBy('score','desc'), fs.limit(limitCount));
    const stopScores = fs.onSnapshot(q, snap => onScores(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const stopMeta = fs.onSnapshot(fs.doc(db, META_COLLECTION, META_DOC), snap => onMeta(snap.exists()?snap.data():{plays:0,co2e:0,items:0}));
    return { mode:'online', stop:()=>{stopScores();stopMeta();} };
  }
  let last='';
  const tick=()=>{
    const rows=getLocalScores().slice(0,limitCount), meta=getLocalMeta();
    const sig=JSON.stringify([rows,meta]);
    if(sig!==last){ last=sig; onScores(rows); onMeta(meta); }
  };
  tick(); const timer=setInterval(tick,1500);
  return { mode:'local', stop:()=>clearInterval(timer) };
}

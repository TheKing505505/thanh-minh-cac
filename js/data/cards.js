// ============================================================
// ===== FIREBASE CARDS =====
// Khách chỉ xem được thẻ của mình; admin xem tất cả (mã thẻ là dữ liệu nhạy cảm).
// ============================================================
async function getCardsFromDB(){
    if(!db) return [];
    try{
        let q = db.collection('cards');
        if(!isAdminSession()){
            const uid = currentUid();
            if(!uid) return [];
            q = q.where('uid','==',uid);
        }
        const snap = await q.get();
        return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
    }catch(e){ console.warn('getCardsFromDB:',e.code||e.message); return []; }
}
async function saveCardToDB(c){if(!db)throw new Error('DB not ready');await db.collection('cards').doc(c.id).set(c);}
async function updateCardInDB(id,data){if(!db)throw new Error('DB not ready');await db.collection('cards').doc(id).update(data);}

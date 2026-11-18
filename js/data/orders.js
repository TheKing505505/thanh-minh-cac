// ============================================================
// ===== FIREBASE ORDERS =====
// Khách chỉ truy vấn được đơn của mình (where uid == auth.uid); admin xem tất cả.
// ============================================================
async function getOrdersFromDB(){
    if(!db) return [];
    try{
        let q = db.collection('orders');
        if(!isAdminSession()){
            const uid = currentUid();
            if(!uid) return [];
            q = q.where('uid','==',uid);
        }
        const snap = await q.get();
        return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
    }catch(e){ console.warn('getOrdersFromDB:',e.code||e.message); return []; }
}
async function saveOrderToDB(o){if(!db)throw new Error('DB not ready');await db.collection('orders').doc(o.id).set(o);}
async function updateOrderInDB(id,data){if(!db)throw new Error('DB not ready');await db.collection('orders').doc(id).update(data);}

// ============================================================
// ===== FIREBASE ORDERS =====
// ============================================================
async function getOrdersFromDB(){
    if(!db) return [];
    try{const snap=await db.collection('orders').orderBy('timestamp','desc').get();return snap.docs.map(d=>({id:d.id,...d.data()}));}catch(e){return[];}
}
async function saveOrderToDB(o){if(!db)throw new Error('DB not ready');await db.collection('orders').doc(o.id).set(o);}
async function updateOrderInDB(id,data){if(!db)throw new Error('DB not ready');await db.collection('orders').doc(id).update(data);}

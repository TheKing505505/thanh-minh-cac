/* Data access cho cards. */
async function getCardsFromDB(){
    if(!db) return [];
    try{const snap=await db.collection('cards').orderBy('timestamp','desc').get();return snap.docs.map(d=>({id:d.id,...d.data()}));}catch(e){return[];}
}
async function saveCardToDB(c){if(!db)throw new Error('DB not ready');await db.collection('cards').doc(c.id).set(c);}
async function updateCardInDB(id,data){if(!db)throw new Error('DB not ready');await db.collection('cards').doc(id).update(data);}

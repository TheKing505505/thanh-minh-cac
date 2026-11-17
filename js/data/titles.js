/* Data access cho giao dịch mua/cấp danh hiệu. */
async function getTitlePurchasesFromDB() {
    if (!db) throw new Error('DB not ready');
    const snap = await db.collection('titlepurchases').orderBy('timestamp', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function createTitlePurchase(data) {
    if (!db) throw new Error('DB not ready');
    return db.collection('titlepurchases').add(data);
}

async function updateTitlePurchaseInDB(id, data) {
    if (!db) throw new Error('DB not ready');
    await db.collection('titlepurchases').doc(id).update(data);
}

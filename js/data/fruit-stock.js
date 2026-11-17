/* Cache và data access cho tồn kho trái ác quỷ. */
let _fruitStockCache = {}; // { svcId: { qty: number, updatedAt: number } }
let _fruitStockListener = null;

// Danh sách trái từ services (category='fruit')
function getFruitServices(){
    return getServices().filter(s=>s.category==='fruit').sort((a,b)=>(a.order||a.id)-(b.order||b.id));
}

// Lấy trạng thái tồn kho cho 1 trái
function getFruitStock(svcId){
    const d = _fruitStockCache[String(svcId)];
    if(!d) return { qty: 0, inStock: false };
    return { qty: d.qty||0, inStock: (d.qty||0) > 0 };
}

// Start realtime listener cho fruit stock
function startFruitStockListener(){
    if(_fruitStockListener) return;
    if(!db) return; // db chưa sẵn sàng, INIT sẽ gọi lại sau
    try {
        _fruitStockListener = db.collection('fruitstock').onSnapshot(snap=>{
            snap.forEach(doc=>{ _fruitStockCache[doc.id] = doc.data(); });
            snap.docChanges().forEach(change=>{
                if(change.type==='removed') delete _fruitStockCache[change.doc.id];
            });
            applyFruitStockToUI();
        }, err=>{ console.warn('FruitStock listener error:',err.code||err.message); });
    } catch(e){ console.warn('Cannot start fruitstock listener:',e.message); }
}

function stopFruitStockListener(){
    if(_fruitStockListener){ _fruitStockListener(); _fruitStockListener=null; }
}


async function getFruitStockFromDB() {
    if (!db) throw new Error('DB not ready');
    const snap = await db.collection('fruitstock').get();
    const result = {};
    snap.forEach(doc => { result[doc.id] = doc.data(); });
    return result;
}

async function saveFruitStockToDB(id, data) {
    if (!db) throw new Error('DB not ready');
    await db.collection('fruitstock').doc(String(id)).set(data, { merge: true });
}

async function saveFruitStocksToDB(entries) {
    if (!db) throw new Error('DB not ready');
    const batch = typeof db.batch === 'function' ? db.batch() : null;
    if (batch) {
        entries.forEach(([id, data]) => {
            batch.set(db.collection('fruitstock').doc(String(id)), data, { merge: true });
        });
        await batch.commit();
        return;
    }
    for (const [id, data] of entries) await saveFruitStockToDB(id, data);
}

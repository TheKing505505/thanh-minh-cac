// ============================================================
// ===== THỐNG KÊ CÔNG KHAI (public_stats/summary) =====
// Trang chủ cần số liệu + bảng xếp hạng, nhưng KHÔNG được mở quyền đọc
// toàn bộ đơn hàng/thẻ nạp. Giải pháp: admin tổng hợp sẵn vào 1 document nhỏ.
// ============================================================
function _monthKey(ts){const d=new Date(ts||Date.now());return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}

async function getPublicStats(){
    if(!db) return {};
    try{
        const d = await db.collection('public_stats').doc('summary').get();
        return d.exists ? d.data() : {};
    }catch(e){ return {}; }
}

// ADMIN: tính lại và ghi (gọi khi mở trang quản trị / sau khi xong đơn / duyệt thẻ)
async function recomputePublicStats(){
    if(!isAdminSession() || !db) return;
    try{
        const [usersSnap, ordersSnap, cardsSnap] = await Promise.all([
            db.collection('users').get(), db.collection('orders').get(), db.collection('cards').get()
        ]);
        const users = usersSnap.docs.map(d=>d.data()).filter(u=>u.uid);
        const nameOf = {}; users.forEach(u=>{ nameOf[u.uid]=u.username; });
        const orders = ordersSnap.docs.map(d=>d.data());
        const cards = cardsSnap.docs.map(d=>d.data());
        const done = orders.filter(o=>o.status==='done');
        const cnt = {};
        done.forEach(o=>{ const n=nameOf[o.uid]; if(n) cnt[n]=(cnt[n]||0)+1; });
        const topCustomers = Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name,count}));
        const mk = _monthKey();
        const nap = {};
        cards.filter(c=>c.status==='done' && _monthKey(c.timestamp)===mk).forEach(c=>{ const n=nameOf[c.uid]; if(n) nap[n]=(nap[n]||0)+(c.denom||0); });
        const topNap = Object.entries(nap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,total])=>({name,total}));
        await db.collection('public_stats').doc('summary').set({
            doneOrders: done.length, users: users.length, topCustomers, topNap, monthKey: mk, updatedAt: Date.now()
        });
    }catch(e){ console.warn('recomputePublicStats:', e.code||e.message); }
}

/* Điều phối các tab quản trị, tải dữ liệu tổng quan và thống kê. */
function switchAdminTab(tab,btn){
    document.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('show'));
    btn.classList.add('active');
    const el=document.getElementById('admin'+tab.charAt(0).toUpperCase()+tab.slice(1));
    if(el)el.classList.add('show');
    if(tab==='services')showAdminSvcView('categories');
    if(tab==='users'){ _usersCache=null; getUsersFromDB().then(users=>renderAdminUsers(users)); }
    if(tab==='orders') getOrdersFromDB().then(orders=>renderAdminOrders(orders));
    if(tab==='cards')loadAdminCards();
    if(tab==='analytics')startAnalyticsTimer();
    if(tab==='codes')renderAdminCodes();
    if(tab==='titlepurchases')loadAdminTitlePurchases();
    if(tab==='fruitstock')loadFruitStockAdmin();
    if(tab==='settings'){const s=getShopSettings();document.getElementById('settingsVideoUrl').value=s.videoUrl||'';document.getElementById('settingsAnnounce').value=s.announce||'';}
}

async function loadAdminData(){
    // Force đọc từ Firestore, không dùng cache
    _useLocalStorage=false;
    _usersCache=null;
    console.log('loadAdminData: db=',!!db,'_useLocalStorage=',_useLocalStorage);
    const [orders,users]=await Promise.all([getOrdersFromDB(),getUsersFromDB()]);
    console.log('loadAdminData result: orders=',orders.length,'users=',users.length);
    renderAdminOrders(orders);
    renderAdminUsers(users);
    renderAdminServices();
}

let _anTimer=null;
async function loadAnalytics(){
    try{
        const [users,cards,orders]=await Promise.all([getUsersFromDB(),getCardsFromDB(),getOrdersFromDB()]);
        const now=new Date();
        const isMth=ts=>{const d=new Date(ts);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();};
        const done=cards.filter(c=>c.status==='done');
        const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
        set('an-users-all',users.length);
        set('an-users-month',users.filter(u=>{
            if(u.createdAtTs) return isMth(u.createdAtTs);
            if(u.createdAt){
                // parse "14/3/2026, 9:14:35 CH" → DD/MM/YYYY
                const m=u.createdAt.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if(m){const d=new Date(+m[3],+m[2]-1,+m[1]);return isMth(d.getTime());}
                const d2=new Date(u.createdAt);if(!isNaN(d2))return isMth(d2.getTime());
            }
            return false;
        }).length);
        const usersMonth=users.filter(u=>{
            if(u.createdAtTs) return isMth(u.createdAtTs);
            if(u.createdAt){const m=u.createdAt.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m){const d=new Date(+m[3],+m[2]-1,+m[1]);return isMth(d.getTime());}const d2=new Date(u.createdAt);if(!isNaN(d2))return isMth(d2.getTime());}return false;
        }).length;
        const cardMonthAmt=done.filter(c=>isMth(c.timestamp)).reduce((s,c)=>s+c.denom,0);
        const ordersMonth=orders.filter(o=>isMth(o.timestamp)).length;
        const doneMonth=orders.filter(o=>o.status==='done'&&isMth(o.timestamp)).length;
        set('an-card-all',formatPrice(done.reduce((s,c)=>s+c.denom,0)));
        set('an-card-month',formatPrice(cardMonthAmt));
        set('an-orders-all',orders.length);
        set('an-orders-month',ordersMonth);
        set('an-done-all',orders.filter(o=>o.status==='done').length);
        set('an-done-month',doneMonth);
        // Inline ids cho layout 2 cột
        set('an-users-month-inline',usersMonth);
        set('an-card-month-inline',formatPrice(cardMonthAmt));
        set('an-orders-month-inline',ordersMonth);
        set('an-done-month-inline',doneMonth);
        const totals={};
        done.filter(c=>isMth(c.timestamp)).forEach(card=>{totals[card.username]=(totals[card.username]||0)+card.denom;});
        const sorted=Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,10);
        const topEl=document.getElementById('analyticsTopNap');
        if(topEl)topEl.innerHTML=sorted.length?sorted.map(([name,total],i)=>`
            <div style="background:var(--bg-card);border:1px solid rgba(255,215,0,0.1);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <span style="font-size:1.2rem">${['👑','🥈','🥉'][i]||'🎖️'}</span>
                <div style="flex:1;font-weight:700">${name}</div>
                <span style="font-family:'Orbitron',sans-serif;font-size:0.85rem;color:var(--gold)">${formatPrice(total)}</span>
            </div>`).join(''):'<div class="no-data"><p>Chưa có dữ liệu tháng này</p></div>';
    }catch(e){console.error(e);}
}
function startAnalyticsTimer(){loadAnalytics();if(_anTimer)clearInterval(_anTimer);_anTimer=setInterval(loadAnalytics,60000);}

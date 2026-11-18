// ============================================================
// ===== ORDER — CHỐNG SPAM =====
// ============================================================
function openOrderModal(svcId){
    if(!currentUser||currentUser.role!=='user'){showNotif('Đăng nhập để đặt dịch vụ!','error');openModal('loginModal');return;}
    const svc=getServices().find(s=>s.id===svcId);if(!svc) return;
    // Kiểm tra tồn kho nếu là trái ác quỷ
    if(svc.category==='fruit'){
        const {inStock} = getFruitStock(svc.id);
        if(!inStock){showNotif('❌ Trái này đang hết hàng!','error');return;}
    }
    currentOrderService=svc;
    selectedSubOption=null;
    document.getElementById('orderServiceName').textContent=svc.name;
    document.getElementById('orderServiceCode').textContent=svc.code;
    document.getElementById('orderServicePrice').textContent=formatPrice(svc.price);
    document.getElementById('orderAccount').value='';
    document.getElementById('orderPassword').value='';
    document.getElementById('orderNote').value='';
    const subWrap=document.getElementById('orderSubOptions');
    const opts=svc.slug?SERVICE_OPTIONS[svc.slug]:null;
    if(opts){
        subWrap.innerHTML=`<label class="sub-option-label">${esc(opts.label)}:</label>
            <div class="sub-option-grid">${opts.options.map(o=>`<button class="sub-option-btn" data-val="${esc(o)}" onclick="selectSubOption(this,this.dataset.val)">${esc(o)}</button>`).join('')}</div>`;
        subWrap.style.display='block';
    } else{subWrap.innerHTML='';subWrap.style.display='none';}
    openModal('orderModal');
}

function selectSubOption(btn,value){
    document.querySelectorAll('#orderSubOptions .sub-option-btn').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedSubOption=value;
}

// Số tiền đang bị "giữ" bởi các đơn/yêu cầu mua danh hiệu chưa được chủ shop xử lý
async function getMyHold(){
    const uid=currentUid(); if(!uid||!db) return 0;
    let hold=0;
    const [os,ts]=await Promise.all([
        db.collection('orders').where('uid','==',uid).get(),
        db.collection('titlepurchases').where('uid','==',uid).get()
    ]);
    os.forEach(d=>{const o=d.data();if(o.status==='pending')hold+=(o.price||0);});
    ts.forEach(d=>{const t=d.data();if(t.status==='pending')hold+=(t.price||0);});
    return hold;
}

async function submitOrder(){
    if(!currentUser||currentUser.role!=='user'||!currentOrderService) return;
    const btn=document.getElementById('orderSubmitBtn');
    if(btn.disabled) return;
    const account=document.getElementById('orderAccount').value.trim();
    const password=document.getElementById('orderPassword').value.trim();
    const note=document.getElementById('orderNote').value.trim();
    if(!account){showNotif('Nhập tài khoản Roblox!','error');return;}
    if(!password){showNotif('Nhập mật khẩu Roblox!','error');return;}
    if(account.length>60){showNotif('Tên tài khoản quá dài!','error');return;}
    if(password.length>100){showNotif('Mật khẩu quá dài!','error');return;}
    if(note.length>300){showNotif('Ghi chú tối đa 300 ký tự!','error');return;}
    const opts=currentOrderService.slug?SERVICE_OPTIONS[currentOrderService.slug]:null;
    if(opts&&!selectedSubOption){showNotif('Vui lòng chọn '+opts.label.toLowerCase()+'!','error');return;}

    btn.disabled=true; btn.textContent='⏳ Đang đặt...';
    try{
        const me=await getMyUser();
        if(!me){showNotif('Không đọc được tài khoản, hãy đăng nhập lại!','error');return;}
        const myOrders=await getOrdersFromDB();

        // ── TÍNH GIÁ (chỉ để hiển thị/kiểm tra sơ bộ — chủ shop sẽ tính lại giá chuẩn khi xử lý đơn) ──
        const q=computeServicePrice(currentOrderService,me,myOrders.length,Date.now());
        if(q.expired) showNotif(`⚠️ Danh hiệu ${q.expired.name} đã hết hạn! Vào Hồ Sơ để gia hạn.`,'info');
        const finalPrice=q.price, discountInfo=q.discountInfo;

        // ── KIỂM TRA SỐ DƯ KHẢ DỤNG (trừ phần đang giữ cho các đơn chờ xử lý) ──
        const hold=await getMyHold();
        const available=(me.balance||0)-hold;
        if(available<finalPrice){showNotif(`❌ Số dư khả dụng không đủ! Cần ${formatPrice(finalPrice)}, khả dụng ${formatPrice(Math.max(0,available))}.`,'error');return;}

        // ── CHỐNG SPAM: đặt trùng gói+tài khoản trong 5 phút ──
        const dup=myOrders.find(o=>o.serviceId===currentOrderService.id&&o.account===account&&o.timestamp>Date.now()-5*60*1000);
        if(dup){
            const waitSec=Math.ceil((dup.timestamp+5*60*1000-Date.now())/1000);
            showNotif(`⏳ Bạn vừa đặt gói này! Chờ ${waitSec}s rồi thử lại.`,'error');
            return;
        }

        const orderId=generateOrderId();
        const order={
            id:orderId,uid:currentUser.uid,username:currentUser.username,
            serviceId:currentOrderService.id,serviceName:currentOrderService.name,
            serviceCode:currentOrderService.code,price:finalPrice,origPrice:currentOrderService.price,discountInfo:discountInfo||null,
            subOption:selectedSubOption||null,account,note,
            time:new Date().toLocaleString('vi-VN'),
            timestamp:Date.now(),status:'pending',
            doneTime:null,doneMessage:null
        };
        // Mật khẩu Roblox: mã hoá bằng khoá công khai của shop (chỉ chủ shop giải mã được)
        const enc=await encryptForAdmin(password);
        if(enc) order.passwordEnc=enc; else order.password=password;
        await saveOrderToDB(order);
        closeModal('orderModal');
        document.getElementById('orderPassword').value='';
        showNotif(`🎉 Đặt đơn thành công! Mã: ${orderId}${discountInfo?' · '+discountInfo:''}. Tiền sẽ được trừ khi chủ shop hoàn thành đơn.`,'success');
    } catch(e){
        console.error('submitOrder:',e.code||e.message);
        showNotif('Lỗi khi đặt đơn, thử lại!','error');
    }
    finally{btn.disabled=false;btn.textContent='🎯 Đặt Đơn';}
}

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
        subWrap.innerHTML=`<label class="sub-option-label">${opts.label}:</label>
            <div class="sub-option-grid">${opts.options.map(o=>`<button class="sub-option-btn" onclick="selectSubOption(this,'${o}')">${o}</button>`).join('')}</div>`;
        subWrap.style.display='block';
    } else{subWrap.innerHTML='';subWrap.style.display='none';}
    openModal('orderModal');
}

function selectSubOption(btn,value){
    document.querySelectorAll('#orderSubOptions .sub-option-btn').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedSubOption=value;
}

async function submitOrder(){
    if(!currentUser||currentUser.role!=='user') return;
    const account=document.getElementById('orderAccount').value.trim();
    const password=document.getElementById('orderPassword').value.trim();
    const note=document.getElementById('orderNote').value.trim();
    if(!account){showNotif('Nhập tài khoản Roblox!','error');return;}
    if(!password){showNotif('Nhập mật khẩu Roblox!','error');return;}
    const opts=currentOrderService.slug?SERVICE_OPTIONS[currentOrderService.slug]:null;
    if(opts&&!selectedSubOption){showNotif('Vui lòng chọn '+opts.label.toLowerCase()+'!','error');return;}

    // ── TÍNH GIẢM GIÁ ──
    let finalPrice=currentOrderService.price; let discountInfo='';
    try{
        const ud0=await findUserInDB(currentUser.username);
        const dInfo=getTitleDiscount(ud0);
        if(dInfo.title && dInfo.discount>0 && finalPrice>=dInfo.title.minOrder){
            if(dInfo.discount===100){
                // Đại Đế Cảnh: miễn 100% mọi dịch vụ
                finalPrice=0; discountInfo=`👑 Đại Đế Cảnh — Miễn phí 100%`;
            } else {
                finalPrice=Math.round(finalPrice*(1-dInfo.discount/100));
                discountInfo=`${dInfo.title.name} giảm ${dInfo.discount}%`;
            }
        } else if(dInfo.expired && dInfo.title){
            showNotif(`⚠️ Danh hiệu ${dInfo.title.name} đã hết hạn! Vào Hồ Sơ để gia hạn.`,'info');
        }
        if(!discountInfo&&finalPrice>80000&&currentOrderService.category!=='fruit'){
            const allOrd=await getOrdersFromDB();
            if(allOrd.filter(o=>o.username===currentUser.username).length===0){finalPrice=Math.round(finalPrice*0.85);discountInfo='Giảm 15% đơn đầu tiên';}
        }
    }catch(e){}
    // ── KIỂM TRA SỐ DƯ ──
    try{
        const userData=await findUserInDB(currentUser.username);
        const balance=userData?(userData.balance||0):0;
        if(balance<finalPrice){showNotif(`❌ Số dư không đủ! Cần ${formatPrice(finalPrice)}, bạn có ${formatPrice(balance)}.`,'error');return;}
    }catch(e){showNotif('Không kiểm tra được số dư!','error');return;}

    // ── CHỐNG SPAM: kiểm tra đặt trùng gói+tài khoản trong 5 phút ──
    try{
        const recent=await getOrdersFromDB();
        const fiveMinAgo=Date.now()-5*60*1000;
        const dup=recent.find(o=>
            o.username===currentUser.username&&
            o.serviceId===currentOrderService.id&&
            o.account===account&&
            o.timestamp>fiveMinAgo
        );
        if(dup){
            const waitSec=Math.ceil((dup.timestamp+5*60*1000-Date.now())/1000);
            showNotif(`⏳ Bạn vừa đặt gói này! Chờ ${waitSec}s rồi thử lại.`,'error');
            return;
        }
    } catch(e){}

    const orderId=generateOrderId();
    const order={
        id:orderId,username:currentUser.username,
        serviceId:currentOrderService.id,serviceName:currentOrderService.name,
        serviceCode:currentOrderService.code,price:finalPrice,origPrice:currentOrderService.price,discountInfo:discountInfo||null,
        subOption:selectedSubOption||null,account,password,note,
        time:new Date().toLocaleString('vi-VN'),
        timestamp:Date.now(),status:'pending',
        doneTime:null,doneMessage:null
    };
    try{
        document.getElementById('orderSubmitBtn').disabled=true;
        document.getElementById('orderSubmitBtn').textContent='⏳ Đang đặt...';
        await saveOrderToDB(order);
        // Trừ tiền khỏi số dư
        try{
            const ud = await findUserInDB(currentUser.username);
            const newBal = Math.max(0,(ud?ud.balance||0:0) - finalPrice);
            await updateUserInDB(currentUser.username, { balance: newBal });
        } catch(e){}
        closeModal('orderModal');
        showNotif(`🎉 Đặt đơn thành công! Mã: ${orderId}${discountInfo?' · '+discountInfo:''}`,'success');
    } catch(e){showNotif('Lỗi khi đặt đơn, thử lại!','error');}
    finally{document.getElementById('orderSubmitBtn').disabled=false;document.getElementById('orderSubmitBtn').textContent='🎯 Đặt Đơn';}
}


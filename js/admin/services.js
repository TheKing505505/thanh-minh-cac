// ADMIN SERVICES
function showAdminSvcView(view){
    document.getElementById('adminSvcViewCat').style.display=view==='categories'?'block':'none';
    document.getElementById('adminSvcViewItems').style.display=view==='items'?'block':'none';
    if(view==='categories') renderAdminCategories();
    if(view==='items'){populateCatFilter();renderAdminItems();}
}
function renderAdminServices(){showAdminSvcView('categories');}

function renderAdminCategories(){
    const c=document.getElementById('adminCatList');if(!c) return;
    const cats=getCustomCategories();
    const services=getServices();
    c.innerHTML=cats.map(cat=>{
        const count=services.filter(s=>s.category===cat.key).length;
        return `<div class="admin-cat-item">
            <img src="${cat.image||FALLBACK_IMG}" onerror="this.src='${FALLBACK_IMG}'" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0">
            <div class="admin-svc-info">
                <div class="admin-svc-name">${cat.name}</div>
                <div class="admin-svc-code">${count} gói bên trong</div>
            </div>
            <button class="btn-edit-svc" onclick="openEditCat('${cat.key}')">✏️ Sửa ảnh</button>
        </div>`;
    }).join('')||'<div class="no-data"><p>Chưa có danh mục</p></div>';
}

function populateCatFilter(){
    const sel=document.getElementById('filterItemCat');if(!sel) return;
    const cats=getCustomCategories();
    sel.innerHTML=cats.map(c=>`<option value="${c.key}">${c.name}</option>`).join('');
    renderAdminItems();
}

function renderAdminItems(){
    const catKey=document.getElementById('filterItemCat')?.value;
    const c=document.getElementById('adminItemList');
    if(!catKey||!c) return;
    const services=getServices().filter(s=>s.category===catKey).sort((a,b)=>(a.order||a.id)-(b.order||b.id));
    c.innerHTML=services.map(svc=>`
        <div class="admin-svc-item svc-drag-row" draggable="true" data-id="${svc.id}" data-cat="${svc.category}"
             ondragstart="dragStart(event,${svc.id})" ondragover="dragOver(event)" ondrop="dragDrop(event,'${svc.category}')" ondragleave="dragLeave(event)">
            <span class="drag-handle">⠿</span>
            <div class="admin-svc-info">
                <div class="admin-svc-name">${svc.name} ${svc.badge!=='normal'?`<span class="svc-row-badge ${svc.badge==='svip'?'badge-svip':'badge-vip'}">${svc.badge.toUpperCase()}</span>`:''}</div>
                <div class="admin-svc-code">${formatPrice(svc.price)} · ${svc.desc}</div>
            </div>
            <div style="display:flex;gap:6px">
                <button class="btn-edit-svc" onclick="openEditSvc(${svc.id})">✏️</button>
                <button class="btn-delete" onclick="deleteSvc(${svc.id})">🗑️</button>
            </div>
        </div>`).join('')||'<div class="no-data"><p>Chưa có gói nào</p></div>';
}

function addNewService(){
    const name=document.getElementById('newSvcName').value.trim();
    const price=parseInt(document.getElementById('newSvcPrice').value);
    const cat=document.getElementById('filterItemCat')?.value||'other';
    const badge=document.getElementById('newSvcBadge').value;
    const desc=document.getElementById('newSvcDesc').value.trim();
    if(!name){showNotif('Nhập tên gói!','error');return;}
    if(!price||price<=0){showNotif('Nhập giá hợp lệ!','error');return;}
    const services=getServices();
    const newId=services.reduce((m,s)=>Math.max(m,s.id),0)+1;
    const catSvcs=services.filter(s=>s.category===cat);
    const maxOrder=catSvcs.reduce((m,s)=>Math.max(m,s.order||s.id),0);
    services.push({id:newId,name,price,category:cat,badge,desc:desc||name,image:'',slug:null,order:maxOrder+1,
        code:(badge==='svip'?'SSVIP-':badge==='vip'?'S-':'')+'TMC-'+String(newId).padStart(3,'0')});
    saveServices(services);
    ['newSvcName','newSvcPrice','newSvcDesc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    renderAdminItems();renderServices();
    showNotif(`✅ Đã thêm: ${name}`,'success');
}

function openEditSvc(id){
    const svc=getServices().find(s=>s.id===id);if(!svc) return;
    document.getElementById('editSvcId').value=svc.id;
    document.getElementById('editSvcName').value=svc.name;
    document.getElementById('editSvcPrice').value=svc.price;
    document.getElementById('editSvcDesc').value=svc.desc;
    document.getElementById('editSvcCategory').value=svc.category;
    document.getElementById('editSvcBadge').value=svc.badge;
    openModal('editSvcModal');
}

function saveEditService(){
    const id=parseInt(document.getElementById('editSvcId').value);
    const name=document.getElementById('editSvcName').value.trim();
    const price=parseInt(document.getElementById('editSvcPrice').value);
    const desc=document.getElementById('editSvcDesc').value.trim();
    const cat=document.getElementById('editSvcCategory').value;
    const badge=document.getElementById('editSvcBadge').value;
    if(!name||!price){showNotif('Điền đầy đủ!','error');return;}
    const services=getServices();
    const svc=services.find(s=>s.id===id);
    if(svc){
        svc.name=name;svc.price=price;svc.desc=desc||name;svc.category=cat;svc.badge=badge;
        svc.code=(badge==='svip'?'SSVIP-':badge==='vip'?'S-':'')+'TMC-'+String(id).padStart(3,'0');
        saveServices(services);renderAdminServices();renderServices();
        closeModal('editSvcModal');showNotif(`Đã cập nhật: ${name}`,'success');
    }
}

function deleteSvc(id){
    if(!confirm('Xóa dịch vụ?')) return;
    const services=getServices();const svc=services.find(s=>s.id===id);
    saveServices(services.filter(s=>s.id!==id));
    renderAdminServices();renderServices();
    showNotif(`Đã xóa${svc?': '+svc.name:''}`,'info');
}

function openEditCat(catKey){
    const cats=getCustomCategories();
    const cat=cats.find(c=>c.key===catKey);if(!cat) return;
    document.getElementById('editCatKey').value=catKey;
    document.getElementById('editCatName').value=cat.name.replace(/^\S+\s*/,'');
    document.getElementById('editCatImageVal').value=cat.image||'';
    const prev=document.getElementById('editCatPreview');
    if(cat.image){prev.src=cat.image;prev.style.display='block';}else prev.style.display='none';
    openModal('editCatModal');
}

function saveEditCat(){
    const catKey=document.getElementById('editCatKey').value;
    const newName=document.getElementById('editCatName').value.trim();
    const newImg=document.getElementById('editCatImageVal').value.trim();
    if(!newName){showNotif('Nhập tên gói lớn!','error');return;}
    const cats=getCustomCategories();
    const idx=cats.findIndex(c=>c.key===catKey);if(idx===-1) return;
    cats[idx].name=cats[idx].icon+' '+newName;
    if(newImg){cats[idx].image=newImg;DEFAULT_IMAGES[catKey]=newImg;}
    saveCustomCategories(cats);
    CATEGORIES[catKey]=cats[idx].name;
    closeModal('editCatModal');
    renderAdminCategories();renderServices();
    showNotif('✅ Đã cập nhật gói lớn!','success');
}

// ============================================================
// ===== DRAG & DROP =====
// ============================================================
function dragStart(e,id){dragSrcId=id;e.target.classList.add('dragging');e.dataTransfer.effectAllowed='move';}
function dragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move';const row=e.target.closest('.svc-drag-row');if(row)row.classList.add('drag-over');}
function dragLeave(e){const row=e.target.closest('.svc-drag-row');if(row)row.classList.remove('drag-over');}
function dragDrop(e,catKey){
    e.preventDefault();
    document.querySelectorAll('.svc-drag-row').forEach(r=>{r.classList.remove('dragging');r.classList.remove('drag-over');});
    const targetRow=e.target.closest('.svc-drag-row');
    if(!targetRow||!dragSrcId) return;
    const targetId=parseInt(targetRow.dataset.id);
    if(dragSrcId===targetId) return;
    let services=getServices();
    const catSvcs=services.filter(s=>s.category===catKey).sort((a,b)=>(a.order||a.id)-(b.order||b.id));
    const srcCatIdx=catSvcs.findIndex(s=>s.id===dragSrcId);
    const tgtCatIdx=catSvcs.findIndex(s=>s.id===targetId);
    if(srcCatIdx===-1||tgtCatIdx===-1) return;
    catSvcs.splice(tgtCatIdx,0,catSvcs.splice(srcCatIdx,1)[0]);
    catSvcs.forEach((s,i)=>{const si=services.findIndex(x=>x.id===s.id);if(si!==-1)services[si].order=i+1;});
    saveServices(services);renderAdminItems();renderServices();
    showNotif('✅ Đã di chuyển','success');
}

// ============================================================
// ===== IMAGE UPLOAD =====
// ============================================================
function handleImgUpload(fileInputId,urlInputId,previewId){
    const file=document.getElementById(fileInputId).files[0];if(!file)return;
    if(file.size>5000000){showNotif('Ảnh quá lớn! Chọn ảnh dưới 5MB','error');return;}
    const reader=new FileReader();
    reader.onload=function(e){
        const img=new Image();
        img.onload=function(){
            // Tự cân chỉnh về tỉ lệ 4:3 (800x600) — lấy phần giữa ảnh
            const TARGET_W=800,TARGET_H=600;
            const srcRatio=img.width/img.height;
            const tgtRatio=TARGET_W/TARGET_H;
            let sx,sy,sw,sh;
            if(srcRatio>tgtRatio){
                // Ảnh rộng hơn → cắt 2 bên, giữ chiều cao
                sh=img.height; sw=sh*tgtRatio;
                sx=(img.width-sw)/2; sy=0;
            } else {
                // Ảnh cao hơn → cắt trên dưới, giữ chiều rộng
                sw=img.width; sh=sw/tgtRatio;
                sx=0; sy=(img.height-sh)/2;
            }
            const canvas=document.createElement('canvas');
            canvas.width=TARGET_W; canvas.height=TARGET_H;
            const ctx=canvas.getContext('2d');
            ctx.drawImage(img,sx,sy,sw,sh,0,0,TARGET_W,TARGET_H);
            const base64=canvas.toDataURL('image/jpeg',0.88);
            document.getElementById(urlInputId).value=base64;
            const preview=document.getElementById(previewId);
            preview.src=base64;
            preview.style.display='block';
            preview.style.height='120px';
            preview.style.objectFit='cover';
            showNotif('✅ Ảnh đã được cân chỉnh tự động 4:3','success');
        };
        img.src=e.target.result;
    };
    reader.readAsDataURL(file);
}
function previewFromUrl(urlInputId,previewId){
    const url=document.getElementById(urlInputId).value.trim();
    const preview=document.getElementById(previewId);
    if(url&&url.startsWith('http')){preview.src=url;preview.style.display='block';preview.onerror=()=>{preview.style.display='none';};}
    else preview.style.display='none';
}


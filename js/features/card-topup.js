function selectCardType(type, btn) {
    selectedCardType = type;
    document.querySelectorAll('.card-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('cardType').value = type;
}

async function submitCard() {
    if (!currentUser || currentUser.role !== 'user') { showNotif('Đăng nhập để nạp thẻ!', 'error'); return; }
    if (!db || !auth || !auth.currentUser) { showNotif('Firebase chưa kết nối hoặc phiên đăng nhập hết hạn.', 'error'); return; }
    const serial = document.getElementById('cardSerial').value.trim();
    const code = document.getElementById('cardCode').value.trim();
    const denom = parseInt(document.getElementById('cardDenom').value, 10);
    if (!serial) { showNotif('Nhập số seri thẻ!', 'error'); return; }
    if (!code) { showNotif('Nhập mã số thẻ!', 'error'); return; }
    if (!denom || !Number.isFinite(denom)) { showNotif('Chọn mệnh giá thẻ!', 'error'); return; }
    const btn = document.getElementById('cardSubmitBtn');
    btn.disabled = true; btn.textContent = '⏳ Đang gửi...';
    try {
        const id = 'CARD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
        await saveCardToDB({ id, username: currentUser.username, type: selectedCardType, denom, serial, code,
            time: new Date().toLocaleString('vi-VN'), timestamp: Date.now(), status: 'pending', note: '' });
        document.getElementById('cardSerial').value = '';
        document.getElementById('cardCode').value = '';
        showNotif('✅ Đã gửi thẻ lên Firestore! Chờ admin duyệt.', 'success');
        await loadCardHistory();
    } catch (error) {
        console.error('submitCard error:', error);
        showNotif('Không gửi được thẻ: ' + (error.message || 'Lỗi Firestore'), 'error');
    } finally {
        btn.disabled = false; btn.textContent = '💳 Gửi Thẻ Nạp';
    }
}

async function loadCardHistory() {
    const container = document.getElementById('cardHistoryList');
    if (!container || !currentUser || currentUser.role !== 'user') return;
    container.innerHTML = '<div class="no-data"><p>⏳ Đang tải...</p></div>';
    try {
        const cards = await getCardsFromDB();
        if (!cards.length) { container.innerHTML = '<div class="no-data"><p>Chưa có lịch sử nạp thẻ</p></div>'; return; }
        container.innerHTML = cards.map(card => `
            <div class="card-history-item">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <strong>${escapeHTML(card.type)} — ${new Intl.NumberFormat('vi-VN').format(Number(card.denom)||0)}đ</strong>
                    <span class="card-status-badge card-status-${['done','failed','pending'].includes(card.status)?card.status:'pending'}">${card.status==='done'?'✅ Đã duyệt':card.status==='failed'?'❌ Thất bại':'⏳ Chờ duyệt'}</span>
                </div>
                <div style="font-size:0.75rem;color:rgba(240,230,255,0.4)">${escapeHTML(card.time)}</div>
                ${card.note?`<div style="font-size:0.75rem;color:var(--accent);margin-top:4px">${escapeHTML(card.note)}</div>`:''}
            </div>`).join('');
    } catch (error) {
        console.error('loadCardHistory:', error);
        container.innerHTML = '<div class="no-data"><p>Không tải được lịch sử. Hãy tải lại hoặc liên hệ shop.</p></div>';
    }
}

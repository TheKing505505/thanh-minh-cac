/* Wallet data helpers. Mọi thay đổi số dư hiện vẫn đi qua user document cũ. */
function getWalletBalance(user) {
    return Math.max(0, Number(user && user.balance) || 0);
}

async function setWalletBalance(username, balance) {
    const amount = Number(balance);
    if (!Number.isFinite(amount) || amount < 0) {
        throw new Error('Số dư ví không hợp lệ');
    }
    await updateUserInDB(username, { balance: amount });
    return amount;
}

async function writeWalletLog(entry) {
    if (!db) throw new Error('DB not ready');
    await db.collection('coinlogs').add(entry);
}

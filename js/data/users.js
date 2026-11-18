async function getUsersFromDB() {
    if(!_useLocalStorage && db){
        try {
            const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),8000));
            const snap=await Promise.race([db.collection('users').get(), timeout]);
            _usersCache=snap.docs.map(d=>({id:d.id,...d.data()}));
            const local=_getLSUsers();
            _usersCache.forEach(u=>{ if(u.username) local[u.username]=u; });
            _saveLSUsers(local);
            return _usersCache;
        } catch(e){
            if(e.code==='permission-denied'||e.message.includes('permissions')){
                _useLocalStorage=true;
            }
            // timeout/mạng: không set flag, fallback localStorage
        }
    }
    const users=_getLSUsers();
    _usersCache=Object.values(users);
    return _usersCache;
}

async function saveUserToDB(u) {
    _saveLSUser(u);
    if(!_useLocalStorage && db){
        try {
            await db.collection('users').doc(u.username).set(u);
        } catch(e){
            if(e.code==='permission-denied'||e.message.includes('permissions')){
                _useLocalStorage=true;
                // Đã lưu local rồi, OK
            } else { throw e; }
        }
    }
    _usersCache=null;
}

async function updateUserInDB(un, data) {
    _updateLSUser(un, data); // luôn update local
    if(!_useLocalStorage && db){
        try {
            await db.collection('users').doc(un).update(data);
        } catch(e){
            if(e.code==='permission-denied'||e.message.includes('permissions')){
                _useLocalStorage=true;
            } else { throw e; }
        }
    }
    _usersCache=null;
}

async function deleteUserFromDB(un) {
    _deleteLSUser(un);
    if(!_useLocalStorage && db){
        try { await db.collection('users').doc(un).delete(); } catch(e){
            if(e.code==='permission-denied'||e.message.includes('permissions')) _useLocalStorage=true;
            else throw e;
        }
    }
    _usersCache=null;
}

async function findUserInDB(un) {
    if(!_useLocalStorage && db){
        try {
            const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),6000));
            const doc=await Promise.race([db.collection('users').doc(un).get(), timeout]);
            if(doc.exists){
                const u={id:doc.id,...doc.data()};
                _saveLSUser(u);
                return u;
            }
            const snap=await db.collection('users').get();
            const f=snap.docs.find(d=>d.id.toLowerCase()===un.toLowerCase());
            if(f){ const u={id:f.id,...f.data()}; _saveLSUser(u); return u; }
            return _getLSUser(un);
        } catch(e){
            // Chỉ set flag khi bị chặn quyền — timeout/mạng thì không set
            if(e.code==='permission-denied'||e.message.includes('permissions')){
                _useLocalStorage=true;
            }
        }
    }
    return _getLSUser(un);
}

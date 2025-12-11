// Твоя конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBTwGTrPVPJQOGwOaFJwYUdZxQUpyAdGeo",
    authDomain: "bipbupweb.firebaseapp.com",
    projectId: "bipbupweb",
    storageBucket: "bipbupweb.firebasestorage.app",
    messagingSenderId: "1059922568826",
    appId: "1:1059922568826:web:5bbf46006f29d96a273dc3"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const storage = firebase.storage();
const db = firebase.firestore(); // ← добавили Firestore

const avatarImg = document.getElementById("avatar-img");
const avatarPlaceholder = document.getElementById("avatar-placeholder");
const usernameEl = document.getElementById("username");
const userEmailEl = document.getElementById("user-email");
const photoInput = document.getElementById("photo-input");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");

// ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
// СПИСОК АДМИНОВ — ЗАМЕНИ НА СВОИ UID (можно посмотреть в Firebase Console → Authentication)
const ADMINS = [
    "HGomVSGIRhWiy2o6RkkWheuEraF2"
];
// ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        alert("Сначала войдите в систему!");
        window.location.href = "login.html";
        return;
    }

    userEmailEl.textContent = user.email;

    const displayName = user.displayName || user.email.split('@')[0] || "Пользователь";
    usernameEl.textContent = displayName;

    if (user.photoURL) {
        avatarImg.src = user.photoURL;
        avatarImg.style.display = "block";
        avatarPlaceholder.style.display = "none";
    } else {
        avatarPlaceholder.textContent = displayName.charAt(0).toUpperCase();
        avatarImg.style.display = "none";
        avatarPlaceholder.style.display = "flex";
    }

    // Показываем кнопку модерации только админам
    if (ADMINS.includes(user.uid)) {
        document.getElementById("admin-pamyatki-btn").style.display = "block";
        updatePendingCount();
    }
});

// === ЗАГРУЗКА АВАТАРКИ ===
photoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) return alert("Ошибка авторизации");

    photoInput.value = "";

    try {
        const uniqueName = `avatars/${user.uid}_${Date.now()}.jpg`;
        const storageRef = firebase.storage().ref(uniqueName);
        const snapshot = await storageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();

        await user.updateProfile({ photoURL: downloadURL });

        avatarImg.src = downloadURL + "?t=" + Date.now();
        avatarImg.style.display = "block";
        avatarPlaceholder.style.display = "none";

        alert("Аватарка обновлена!");
        location.reload();
    } catch (error) {
        console.error(error);
        alert("Ошибка: " + error.message);
    }
});

// === ДОБАВЛЕНИЕ ПАМЯТКИ ===
function openAddPamyatkaModal() {
    modal.style.display = "flex";
    modalTitle.textContent = "Добавить свою памятку";
    modalBody.innerHTML = `
        <input type="text" id="pamyatka-title" placeholder="Название локации (например: Murrieta)" style="width:100%; padding:10px; margin:8px 0;">
        <input type="file" id="pamyatka-file" accept="image/*" style="width:100%; padding:10px; margin:8px 0;">
        <button onclick="submitPamyatka()" style="background:#9b59b6; padding:12px 20px;">Отправить на модерацию</button>
    `;
}

async function submitPamyatka() {
    const user = auth.currentUser;
    const title = document.getElementById("pamyatka-title").value.trim();
    const fileInput = document.getElementById("pamyatka-file");
    const file = fileInput.files[0];

    if (!title || !file) return alert("Заполните все поля!");

    try {
        const fileName = `pamyatki/pending_${user.uid}_${Date.now()}.jpg`;
        const storageRef = firebase.storage().ref(fileName);
        const snapshot = await storageRef.put(file);
        const imageUrl = await snapshot.ref.getDownloadURL();

        await db.collection("pamyatki").add({
            uid: user.uid,
            displayName: user.displayName || user.email.split('@')[0],
            email: user.email,
            title: title,
            imageUrl: imageUrl,
            status: "pending",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Памятка отправлена на модерацию! ❤️\nМы проверим и добавим её в ближайшее время.");
        closeModal();
    } catch (err) {
        console.error(err);
        alert("Ошибка: " + err.message);
    }
}

// === МОДЕРАЦИЯ (только для админов) ===
async function updatePendingCount() {
    const snap = await db.collection("pamyatki").where("status", "==", "pending").get();
    document.getElementById("pending-count").textContent = snap.size;
}

async function openModerationModal() {
    modal.style.display = "flex";
    modalTitle.textContent = "Памятки на модерации";

    const snapshot = await db.collection("pamyatki")
        .where("status", "==", "pending")
        .orderBy("createdAt", "asc")
        .get();

    if (snapshot.empty) {
        modalBody.innerHTML = "<p style='text-align:center; color:#aaa;'>Нет памяток на модерации</p>";
        return;
    }

    let html = "";
    snapshot.forEach(doc => {
        const d = doc.data();
        html += `
            <div style="background:#1e1e1e; border:1px solid #444; border-radius:12px; padding:15px; margin:15px 0;">
                <p><strong>${d.title}</strong><br>
                   от ${d.displayName} (${d.email})<br>
                   ${new Date(d.createdAt?.toDate()).toLocaleString('ru-RU')}</p>
                <img src="${d.imageUrl}" style="max-width:100%; border-radius:8px; margin:10px 0;">
                <div style="margin-top:10px;">
                    <button onclick="approvePamyatka('${doc.id}')" style="background:#27ae60; padding:10px 15px;">Принять</button>
                    <button onclick="rejectPamyatka('${doc.id}')" style="background:#c0392b; margin-left:10px; padding:10px 15px;">Отклонить</button>
                </div>
            </div>
        `;
    });
    modalBody.innerHTML = html;
}

async function approvePamyatka(docId) {
    if (!confirm("Принять эту памятку?")) return;
    await db.collection("pamyatki").doc(docId).update({
        status: "approved",
        moderatedBy: auth.currentUser.uid,
        moderatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Памятка принята!");
    updatePendingCount();
    openModerationModal();
}

async function rejectPamyatka(docId) {
    if (!confirm("Отклонить и удалить навсегда?")) return;
    await db.collection("pamyatki").doc(docId).delete();
    alert("Памятка отклонена.");
    updatePendingCount();
    openModerationModal();
}

// === Остальные модалки (ник, email, пароль) — без изменений ===
function openModal(type) {
    modal.style.display = "flex";
    if (type === "nickname") {
        modalTitle.textContent = "Изменить никнейм";
        modalBody.innerHTML = `
            <input type="text" id="new-nickname" placeholder="Новый никнейм" value="${usernameEl.textContent}">
            <button onclick="changeNickname()">Сохранить</button>
        `;
    } else if (type === "email") {
        modalTitle.textContent = "Сменить email";
        modalBody.innerHTML = `
            <input type="email" id="new-email" placeholder="Новый email">
            <input type="password" id="current-password-email" placeholder="Текущий пароль" required>
            <button onclick="changeEmail()">Сохранить</button>
        `;
    } else if (type === "password") {
        modalTitle.textContent = "Сменить пароль";
        modalBody.innerHTML = `
            <input type="password" id="current-password" placeholder="Текущий пароль" required>
            <input type="password" id="new-password" placeholder="Новый пароль" required>
            <input type="password" id="new-password-confirm" placeholder="Повторите новый пароль" required>
            <button onclick="changePassword()">Сохранить</button>
        `;
    }
}

function closeModal() {
    modal.style.display = "none";
}
window.onclick = (e) => { if (e.target === modal) closeModal(); };

function changeNickname() {
    const newName = document.getElementById("new-nickname").value.trim();
    if (!newName) return alert("Введите никнейм!");
    auth.currentUser.updateProfile({ displayName: newName }).then(() => {
        usernameEl.textContent = newName;
        avatarPlaceholder.textContent = newName.charAt(0).toUpperCase();
        closeModal();
        alert("Никнейм обновлён!");
    });
}

async function changeEmail() {
    const newEmail = document.getElementById("new-email").value.trim().toLowerCase();
    const password = document.getElementById("current-password-email").value;
    if (!newEmail || !password) return alert("Заполните все поля!");
    const user = auth.currentUser;
    try {
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);
        await user.verifyBeforeUpdateEmail(newEmail);
        alert("Проверьте новый email! Перейдите по ссылке в письме.");
        closeModal();
    } catch (e) {
        alert(e.message);
    }
}

function changePassword() {
    const cur = document.getElementById("current-password").value;
    const np = document.getElementById("new-password").value;
    const npc = document.getElementById("new-password-confirm").value;
    if (np !== npc) return alert("Пароли не совпадают!");
    if (np.length < 6) return alert("Пароль должен быть не менее 6 символов!");
    const user = auth.currentUser;
    const cred = firebase.auth.EmailAuthProvider.credential(user.email, cur);
    user.reauthenticateWithCredential(cred).then(() => user.updatePassword(np))
        .then(() => { closeModal(); alert("Пароль изменён!"); })
        .catch(e => alert(e.message));
}

function logout() {
    if (confirm("Выйти из аккаунта?")) auth.signOut().then(() => location.href = "login.html");
}
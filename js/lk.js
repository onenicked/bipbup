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
const db = firebase.firestore();

const avatarImg = document.getElementById("avatar-img");
const avatarPlaceholder = document.getElementById("avatar-placeholder");
const usernameEl = document.getElementById("username");
const userEmailEl = document.getElementById("user-email");
const photoInput = document.getElementById("photo-input");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");

const ADMINS = [
    "HGomVSGIRhWiy2o6RkkWheuEraF2",
];

let unsubscribePendingCount = null;
let unsubscribeModeration = null;

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

    if (ADMINS.includes(user.uid)) {
        document.getElementById("admin-pamyatki-btn").style.display = "block";
        setupPendingCountListener();
    }
});

function setupPendingCountListener() {
    if (unsubscribePendingCount) unsubscribePendingCount();
    unsubscribePendingCount = db.collection("pamyatki")
        .where("status", "==", "pending")
        .onSnapshot(snap => {
            console.log("Realtime count update:", snap.size);
            document.getElementById("pending-count").textContent = snap.size;
        }, err => {
            console.error("Count listener error:", err);
        });
}

photoInput.addEventListener("change", async (e) => {
});

function openAddPamyatkaModal() {
    modal.style.display = "flex";
    modalTitle.textContent = "Добавить свою памятку";
    modalBody.innerHTML = `
        <input type="text" id="pamyatka-title" placeholder="Название локации (например: Murrieta)" 
               style="width:100%; padding:13px; margin:8px 0; border-radius:10px; border:1px solid #555; font-size:16px; background:#1e1e1e; color:white;">

        <input type="url" id="pamyatka-url" placeholder="Прямая ссылка на памятку (фото)" 
               style="width:100%; padding:13px; margin:8px 0; border-radius:10px; border:1px solid #555; font-size:16px; background:#1e1e1e; color:white;">

        <div style="background:#2d2d2d; padding:15px; border-radius:12px; margin:12px 0; font-size:14px; line-height:1.6;">
            <strong>Как получить прямую ссылку:</strong><br>
            1. Открой <a href="https://imgbb.com" target="_blank" style="color:#9b59b6; font-weight:bold;">imgbb.com</a><br>
            2. Перетащи или загрузи скриншот<br>
            3. Перейди по полученной ссылку → Правой кнопкой мыши на изображение → Скопировать адрес изображения<br>
            4. Вставь в нужное поле
        </div>

        <div id="image-preview" style="margin:20px 0; text-align:center; display:none;">
            <p style="color:#aaa; margin-bottom:10px;">Превью:</p>
            <img id="preview-img" src="" style="max-width:100%; max-height:500px; border-radius:14px; box-shadow:0 10px 40px rgba(0,0,0,0.7);">
        </div>

        <button id="submit-pamyatka-btn" style="background: #ff0000ff; color:white; padding:16px; width:100%; border:none; border-radius:12px; font-size:16px; font-weight:bold; cursor:pointer;">
            Отправить на модерацию
        </button>
        <br>
        <br>
        <br>
        <br>
    `;

    const urlInput = document.getElementById("pamyatka-url");
    const preview = document.getElementById("image-preview");
    const img = document.getElementById("preview-img");

    urlInput.addEventListener("input", function() {
        const url = this.value.trim();
        if (url && (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp') || url.includes('ibb.co'))) {
            img.src = url + "?t=" + Date.now();
            preview.style.display = "block";
        } else if (url === "") {
            preview.style.display = "none";
        }
    });

    document.getElementById("submit-pamyatka-btn").addEventListener("click", submitPamyatka);
}

async function submitPamyatka() {
    const user = auth.currentUser;
    if (!user) return alert("Ошибка авторизации");

    const title = document.getElementById("pamyatka-title").value.trim();
    const imageUrl = document.getElementById("pamyatka-url").value.trim();

    if (!title) return alert("Введите название локации!");
    if (!imageUrl) return alert("Вставьте прямую ссылку на картинку!");
    if (!imageUrl.match(/\.(jpg|jpeg|png|webp)$/i) && !imageUrl.includes('ibb.co')) {
        return alert("Ссылка должна вести прямо на картинку (заканчиваться на .jpg, .png и т.д.)\nИспользуй imgbb.com → Direct link");
    }

    const test = new Image();
    test.onload = async () => {
        try {
            await db.collection("pamyatki").add({
                uid: user.uid,
                displayName: user.displayName || user.email.split('@')[0],
                email: user.email,
                title: title,
                imageUrl: imageUrl,
                status: "pending",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("Памятка успешно отправлена на модерацию! Спасибо ❤️");
            closeModal();
        } catch (err) {
            console.error(err);
            alert("Ошибка сохранения: " + err.message);
        }
    };
    test.onerror = () => {
        alert("Картинка не загружается по этой ссылке.\nПроверь, что ты скопировал именно Direct link с imgbb.com");
    };
    test.src = imageUrl + "?t=" + Date.now();
}

async function openModerationModal() {
    console.log("Opening moderation modal");
    modal.style.display = "flex";
    modalTitle.textContent = "Памятки на модерации";
    modalBody.innerHTML = "<p>Загрузка...</p>";

    if (unsubscribeModeration) unsubscribeModeration();
    unsubscribeModeration = db.collection("pamyatki")
        .where("status", "==", "pending")
        .orderBy("createdAt", "asc")
        .onSnapshot(snapshot => {
            console.log("Realtime moderation update:", snapshot.size);
            if (snapshot.empty) {
                modalBody.innerHTML = "<p style='text-align:center; color:#aaa;'>Нет памяток</p>";
                return;
            }

            let html = "";
            snapshot.forEach(doc => {
                const d = doc.data();
                html += `
                    <div style="background:#1e1e1e; border:1px solid #444; border-radius:12px; padding:15px; margin:15px 0;">
                        <p><strong>${d.title}</strong><br>
                           от ${d.displayName} (${d.email})<br>
                           ${d.createdAt ? new Date(d.createdAt.toDate()).toLocaleString('ru-RU') : 'Неизвестно'}</p>
                        <img src="${d.imageUrl}" style="max-width:100%; border-radius:8px; margin:10px 0;">
                        <div style="margin-top:10px;">
                            <button onclick="approvePamyatka('${doc.id}')" style="background:#27ae60; padding:10px 15px;">Принять</button>
                            <button onclick="rejectPamyatka('${doc.id}')" style="background:#c0392b; margin-left:10px; padding:10px 15px;">Отклонить</button>
                        </div>
                    </div>
                `;
            });
            modalBody.innerHTML = html;
        }, err => {
            console.error("Moderation listener error:", err);
            modalBody.innerHTML = "<p style='color:red;'>Ошибка: " + err.message + "</p>";
        });
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

async function uploadAvatarToImgbb(file) {
    const apiKey = "fac7e04a7bdbc05013b7483b33eae743";
    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: "POST",
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            return data.data.url;
        } else {
            throw new Error("Ошибка загрузки на imgbb");
        }
    } catch (err) {
        console.error(err);
        throw err;
    }
}

function openAvatarModal() {
    modal.style.display = "flex";
    modalTitle.textContent = "Изменить аватарку";
    modalBody.innerHTML = `
        <div style="text-align:center;">
            <img id="current-avatar-preview" src="${auth.currentUser.photoURL || 'images/default-avatar.png'}" 
                 style="width:120px; height:120px; border-radius:50%; object-fit:cover; border:4px solid #9b59b6; margin-bottom:15px;">
            <br>
            <input type="file" id="new-avatar-input" accept="image/*" style="margin:15px 0;">
            <div id="avatar-upload-preview" style="display:none; margin:15px 0;">
                <p style="color:#aaa;">Превью:</p>
                <img id="avatar-preview-img" src="" style="width:150px; height:150px; border-radius:50%; object-fit:cover; border:4px solid #27ae60;">
            </div>
            <button id="save-avatar-btn" style="background:#9b59b6; color:white; padding:14px 30px; border:none; border-radius:10px; font-size:16px; margin-top:10px;">
                Сохранить аватарку
            </button>
        </div>
    `;

    const fileInput = document.getElementById("new-avatar-input");
    const previewImg = document.getElementById("avatar-preview-img");
    const previewBlock = document.getElementById("avatar-upload-preview");

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewBlock.style.display = "block";
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById("save-avatar-btn").addEventListener("click", async () => {
        const file = fileInput.files[0];
        if (!file) return alert("Выбери фото!");

        document.getElementById("save-avatar-btn").textContent = "Загружается...";
        document.getElementById("save-avatar-btn").disabled = true;

        try {
            const imageUrl = await uploadAvatarToImgbb(file);

            await auth.currentUser.updateProfile({
                photoURL: imageUrl
            });

            avatarImg.src = imageUrl + "?t=" + Date.now();
            avatarImg.style.display = "block";
            avatarPlaceholder.style.display = "none";

            alert("Аватарка успешно обновлена! ❤️");
            closeModal();
        } catch (err) {
            alert("Ошибка загрузки аватарки. Попробуй ещё раз.");
        } finally {
            document.getElementById("save-avatar-btn").textContent = "Сохранить аватарку";
            document.getElementById("save-avatar-btn").disabled = false;
        }
    });
}

function logout() {
    if (confirm("Выйти из аккаунта?")) auth.signOut().then(() => location.href = "login.html");
}
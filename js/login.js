// Твоя конфигурация Firebase (оставляем как есть)
const firebaseConfig = {
    apiKey: "AIzaSyBTwGTrPVPJQOGwOaFJwYUdZxQUpyAdGeo",
    authDomain: "bipbupweb.firebaseapp.com",
    projectId: "bipbupweb",
    storageBucket: "bipbupweb.firebasestorage.app",
    messagingSenderId: "1059922568826",
    appId: "1:1059922568826:web:5bbf46006f29d96a273dc3",
    measurementId: "G-K8B9EENE50"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// === Показать нужные блоки ===
function showLogin() {
    document.getElementById("loginBlock").style.display = "block";
    document.getElementById("registerBlock").style.display = "none";
    document.getElementById("resetBlock").style.display = "none";
    document.getElementById("error-message").textContent = "";
}

function showRegister() {
    document.getElementById("loginBlock").style.display = "none";
    document.getElementById("registerBlock").style.display = "block";
    document.getElementById("resetBlock").style.display = "none";
}

function showReset() {
    document.getElementById("loginBlock").style.display = "none";
    document.getElementById("registerBlock").style.display = "none";
    document.getElementById("resetBlock").style.display = "block";
}

// === ВХОД ===
document.getElementById("loginForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const login = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!login || !password) {
        document.getElementById("error-message").textContent = "Заполните все поля!";
        return;
    }

    const email = login.includes("@") ? login : login + "@fake-domain.com";

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // Не перенаправляем вручную — ждём onAuthStateChanged
        })
        .catch((error) => {
            document.getElementById("error-message").textContent = 
                error.code === "auth/user-not-found" || error.code === "auth/wrong-password"
                ? "Неверный логин или пароль!"
                : "Ошибка: " + error.message;
        });
});

// === РЕГИСТРАЦИЯ ===
document.getElementById("registerForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const username = document.getElementById("reg-username").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;

    if (!username || !email || !password) {
        alert("Заполните все поля!");
        return;
    }
    if (password.length < 6) {
        alert("Пароль должен быть не менее 6 символов");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((cred) => {
            // Сразу обновляем профиль (логин)
            return cred.user.updateProfile({
                displayName: username
            });
        })
        .then(() => {
            console.log("Регистрация успешна, пользователь авторизован");
            // Ничего не делаем — onAuthStateChanged сам перенаправит
        })
        .catch((error) => {
            if (error.code === "auth/email-already-in-use") {
                alert("Этот email уже используется!");
            } else if (error.code === "auth/weak-password") {
                alert("Пароль слишком слабый");
            } else {
                alert("Ошибка: " + error.message);
            }
        });
});

// === СБРОС ПАРОЛЯ ===
document.getElementById("resetForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const email = document.getElementById("reset-email").value.trim();

    auth.sendPasswordResetEmail(email)
        .then(() => {
            document.getElementById("reset-message").innerHTML = 
                `<span style="color:green">Письмо отправлено на ${email}</span>`;
        })
        .catch((error) => {
            document.getElementById("reset-message").innerHTML = 
                `<span style="color:red">Ошибка: ${error.code === "auth/user-not-found" ? "Email не найден" : error.message}</span>`;
        });
});

// ГЛАВНЫЙ ФИКС: умный обработчик авторизации
auth.onAuthStateChanged((user) => {
    const isLoginPage = window.location.pathname.includes("login.html") || 
                        window.location.pathname === "/" || 
                        window.location.pathname.endsWith("/");

    if (user) {
        // Пользователь авторизован
        console.log("Пользователь авторизован:", user.displayName || user.email);

        if (isLoginPage) {
            // Только если мы на странице входа — перенаправляем в ЛК
            window.location.href = "lk.html";
        }
    } else {
        // Пользователь НЕ авторизован
        if (!isLoginPage) {
            // Если мы НЕ на странице логина — кидаем туда
            window.location.href = "login.html";
        }
    }
});

// По умолчанию — показываем вход
showLogin();
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
        })
        .catch((error) => {
            document.getElementById("error-message").textContent = 
                error.code === "auth/user-not-found" || error.code === "auth/wrong-password"
                ? "Неверный логин или пароль!"
                : "Ошибка: " + error.message;
        });
});

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
            return cred.user.updateProfile({
                displayName: username
            });
        })
        .then(() => {
            console.log("Регистрация успешна, пользователь авторизован");
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

auth.onAuthStateChanged((user) => {
    const isLoginPage = window.location.pathname.includes("login.html") || 
                        window.location.pathname === "/" || 
                        window.location.pathname.endsWith("/");

    if (user) {
        console.log("Пользователь авторизован:", user.displayName || user.email);

        if (isLoginPage) {
            window.location.href = "lk.html";
        }
    } else {
        if (!isLoginPage) {
            window.location.href = "login.html";
        }
    }
});

showLogin();
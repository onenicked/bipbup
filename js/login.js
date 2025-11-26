const users = [
    { username: "bipbup", password: "burton" }
];

document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        localStorage.setItem("loggedUser", JSON.stringify(user));
        window.location.href = "lk.html";
    } else {
        document.getElementById("error-message").textContent = "Неверное имя пользователя или пароль!";
    }
});

function logEvent(event) {
    const logs = JSON.parse(localStorage.getItem("logs")) || [];
    logs.push({ event, time: new Date().toISOString() });
    localStorage.setItem("logs", JSON.stringify(logs));
}

function register() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (!username || !password) {
        alert("Введите все данные!");
        return;
    }

    const users = JSON.parse(localStorage.getItem("users")) || {};

    if (users[username]) {
        alert("Пользователь уже существует!");
        return;
    }

    users[username] = { password, balance: 0, transactions: [] };
    localStorage.setItem("users", JSON.stringify(users));
    logEvent(`Пользователь зарегистрирован: ${username}`);
    alert("Регистрация успешна!");
}

 const resetForm = document.getElementById('resetForm');
 resetForm.addEventListener('submit', function(event) {
     event.preventDefault();
     
     const email = document.getElementById('email').value;

     if (!email) {
         alert("Введите ваш адрес электронной почты.");
         return;
     }

     alert(`На адрес ${email} отправлены инструкции для сброса пароля.`);
     resetForm.reset();
 });
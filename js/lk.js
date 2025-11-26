const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));

if (!loggedUser) {
    alert("Сначала войдите в систему!");
    window.location.href = "login.html";
} else {
    document.getElementById("username").textContent = loggedUser.username;

    saveUserData();
}

function saveUserData() {
    localStorage.setItem("loggedUser", JSON.stringify(loggedUser));
}

function logout() {
    localStorage.removeItem("loggedUser");
    window.location.href = "login.html";
}

function editProfile() {
    alert("Редактирование профиля пока недоступно. Эта функция в разработке.");
}

function logout() {
    const confirmLogout = confirm("Вы действительно хотите выйти?");
    console.log("Logout function called");
    localStorage.removeItem("loggedUser");
    if (confirmLogout) {
        window.location.href = "start.html";
    }
}

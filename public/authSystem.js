// authSystem.js
// Модуль авторизации для Cyberpunk Survival

const authContainer = document.getElementById("authContainer");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const toRegister = document.getElementById("toRegister");
const toLogin = document.getElementById("toLogin");
const loginError = document.getElementById("loginError");
const registerError = document.getElementById("registerError");

function showLogin() {
  registerForm.style.display = "none";
  loginForm.style.display = "block";
  loginError.textContent = "";
  registerError.textContent = "";
}

function showRegister() {
  loginForm.style.display = "none";
  registerForm.style.display = "block";
  loginError.textContent = "";
  registerError.textContent = "";
}

toRegister.addEventListener("click", showRegister);
toLogin.addEventListener("click", showLogin);

window.authSystem = {
  showLogin,
  showRegister,
  authContainer,
  loginForm,
  registerForm,
  loginBtn,
  registerBtn,
  loginError,
  registerError,
};
// authSystem.js
// Модуль авторизации и регистрации для Cyberpunk Survival

const authContainer = document.getElementById("authContainer");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const toRegister = document.getElementById("toRegister");
const toLogin = document.getElementById("toLogin");
const loginError = document.getElementById("loginError");
const registerError = document.getElementById("registerError");

// Здесь должны быть все функции работы с авторизацией, регистрацией, обработкой форм, переключением между формами, обработкой ошибок
// Например:
// function showLoginForm() { ... }
// function showRegisterForm() { ... }
// function handleLogin() { ... }
// function handleRegister() { ... }
// ... и другие связанные функции ...

window.authSystem = {
  // showLoginForm,
  // showRegisterForm,
  // handleLogin,
  // handleRegister,
  // ...
};

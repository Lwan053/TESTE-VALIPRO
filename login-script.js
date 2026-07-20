import { auth } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm       = document.getElementById('login-form');
    const emailInput      = document.getElementById('email');
    const passwordInput   = document.getElementById('password');
    const rememberInput   = document.getElementById('remember');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const eyeIcon         = document.getElementById('eye-icon');
    const btnSubmit       = document.getElementById('btn-submit');
    const alertBox        = document.getElementById('alert-box');
    const alertMessage    = document.getElementById('alert-message');

    // Se já está logado, pula direto para o painel
    onAuthStateChanged(auth, (user) => {
        if (user) redirectToPainel();
    });

    // Toggle olho
    if (togglePasswordBtn && eyeIcon) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            eyeIcon.innerHTML = isPassword
                ? `<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" x2="22" y1="2" y2="22"></line>`
                : `<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>`;
        });
    }

    function showAlert(message, type = 'error') {
        if (!alertBox || !alertMessage) return;
        alertBox.className = `alert ${type}`;
        alertMessage.textContent = message;
        alertBox.classList.remove('hidden');
    }

    function redirectToPainel() {
        const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        window.location.replace(window.location.origin + basePath + 'painel.html');
    }

    function setLoading(loading) {
        const btnText   = btnSubmit.querySelector('.btn-text');
        const btnLoader = btnSubmit.querySelector('.btn-loader');
        btnSubmit.disabled = loading;
        if (btnText)   btnText.classList.toggle('hidden', loading);
        if (btnLoader) btnLoader.classList.toggle('hidden', !loading);
    }

    function translateAuthError(code) {
        switch (code) {
            case 'auth/invalid-email':        return 'E-mail inválido.';
            case 'auth/user-disabled':        return 'Usuário desativado.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':   return 'E-mail ou senha incorretos.';
            case 'auth/too-many-requests':    return 'Muitas tentativas. Tente novamente em alguns minutos.';
            case 'auth/network-request-failed': return 'Falha de conexão. Verifique sua internet.';
            default: return 'Não foi possível entrar. Tente novamente.';
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if (!email || !password) { showAlert('Preencha e-mail e senha.'); return; }

        setLoading(true);
        try {
            const persistence = rememberInput?.checked ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistence);
            await signInWithEmailAndPassword(auth, email, password);
            showAlert('Acesso autorizado! Entrando...', 'success');
            setTimeout(redirectToPainel, 500);
        } catch (err) {
            showAlert(translateAuthError(err.code));
            setLoading(false);
        }
    });
});

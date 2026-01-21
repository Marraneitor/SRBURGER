(function () {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
  }

  function show(el) {
    if (!el) return;
    el.classList.remove('hidden');
  }

  function hide(el) {
    if (!el) return;
    el.classList.add('hidden');
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = String(text || '');
  }

  function mapAuthError(e, defaultMsg) {
    const code = e && e.code ? String(e.code) : '';
    switch (code) {
      case 'EMAIL_ALREADY_REGISTERED':
      case 'auth/email-already-in-use':
        return 'Este correo ya está registrado. Intenta iniciar sesión.';
      case 'PHONE_ALREADY_REGISTERED':
        return 'Este teléfono ya está registrado. Intenta iniciar sesión.';
      case 'auth/missing-email':
        return 'Escribe tu correo para continuar.';
      case 'auth/invalid-email':
        return 'El correo no es válido. Revisa el formato.';
      case 'auth/weak-password':
        return 'La contraseña es muy débil. Usa al menos 6 caracteres.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta de nuevo más tarde.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Correo o contraseña incorrectos.';
      case 'auth/configuration-not-found':
        return 'El inicio de sesión por correo/contraseña no está habilitado en Firebase. El administrador debe activarlo en Authentication > Métodos de acceso.';
      default:
        return defaultMsg || 'Ocurrió un error inesperado. Intenta de nuevo.';
    }
  }

  function toast(msg) {
    const message = String(msg || '').trim();
    if (!message) return;
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.className = 'fixed bottom-24 right-4 z-[90] bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold opacity-0 translate-y-2 transition-all duration-300';
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.classList.remove('opacity-0', 'translate-y-2');
    });
    setTimeout(() => {
      el.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => {
        try { el.remove(); } catch (_) {}
      }, 350);
    }, 2300);
  }

  function waitForClientManager(cb) {
    const maxTries = 80;
    let tries = 0;
    (function check() {
      if (window.firebaseClientManager && window.firebaseAuth) {
        cb(window.firebaseClientManager);
      } else if (tries++ < maxTries) {
        setTimeout(check, 100);
      } else {
        cb(null);
      }
    })();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const modal = byId('sr-auth-modal');
    const panel = byId('sr-auth-panel');
    const closeBtn = byId('sr-auth-close');

    const tabLoginBtn = byId('sr-auth-tab-login');
    const tabRegisterBtn = byId('sr-auth-tab-register');
    const viewLogin = byId('sr-auth-view-login');
    const viewRegister = byId('sr-auth-view-register');
    const viewLoggedIn = byId('sr-auth-view-loggedin');

    const loginForm = byId('sr-auth-login-form');
    const loginBtn = byId('sr-auth-login-submit');
    const loginSpinner = byId('sr-auth-login-spinner');
    const loginError = byId('sr-auth-login-error');

    const regForm = byId('sr-auth-reg-form');
    const regBtn = byId('sr-auth-reg-submit');
    const regSpinner = byId('sr-auth-reg-spinner');
    const regError = byId('sr-auth-reg-error');
    const regSuccess = byId('sr-auth-reg-success');

    const forgotBtn = byId('sr-auth-forgot-btn');
    const forgotSpinner = byId('sr-auth-forgot-spinner');
    const forgotSuccess = byId('sr-auth-forgot-success');

    const loggedInName = byId('sr-auth-loggedin-name');
    const logoutBtn = byId('sr-auth-logout-btn');

    if (!modal || !panel) {
      // Página sin modal.
      return;
    }

    let manager = null;
    let currentUser = null;

    function setTab(tab) {
      const t = tab === 'register' ? 'register' : 'login';
      if (tabLoginBtn) {
        tabLoginBtn.classList.toggle('bg-white/10', t === 'login');
        tabLoginBtn.classList.toggle('bg-white/5', t !== 'login');
      }
      if (tabRegisterBtn) {
        tabRegisterBtn.classList.toggle('bg-white/10', t === 'register');
        tabRegisterBtn.classList.toggle('bg-white/5', t !== 'register');
      }
      if (viewLogin) viewLogin.classList.toggle('hidden', t !== 'login');
      if (viewRegister) viewRegister.classList.toggle('hidden', t !== 'register');
    }

    function open(tab) {
      // Si ya hay sesión, mostrar vista simple de "sesión iniciada".
      if (currentUser && viewLoggedIn) {
        hide(viewLogin);
        hide(viewRegister);
        show(viewLoggedIn);
        setText(loggedInName, currentUser.displayName || currentUser.email || 'Sesión iniciada');
      } else {
        hide(viewLoggedIn);
        setTab(tab || 'login');
      }

      // Reset mensajes
      loginError && hide(loginError);
      regError && hide(regError);
      regSuccess && hide(regSuccess);
      forgotSuccess && hide(forgotSuccess);

      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.classList.add('overflow-hidden');

      // Focus
      const first = (tab === 'register') ? byId('sr-auth-reg-correo') : byId('sr-auth-login-correo');
      try { first && first.focus(); } catch (_) {}
    }

    function close() {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    }

    function openFromLink(ev) {
      try { ev.preventDefault(); } catch (_) {}
      open('login');
    }

    // Exponer para que script.js.backup lo use en checkout
    window.srOpenAuthModal = function (opts) {
      const tab = opts && opts.tab ? String(opts.tab) : 'login';
      open(tab);
    };

    // Close handlers
    if (closeBtn) closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) close();
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && !modal.classList.contains('hidden')) close();
    });

    // Prevent panel click from closing
    panel.addEventListener('click', (ev) => {
      ev.stopPropagation();
    });

    // Tab buttons
    tabLoginBtn && tabLoginBtn.addEventListener('click', () => {
      hide(viewLoggedIn);
      setTab('login');
    });
    tabRegisterBtn && tabRegisterBtn.addEventListener('click', () => {
      hide(viewLoggedIn);
      setTab('register');
    });

    // Attach to any link/button requesting auth modal
    document.querySelectorAll('[data-sr-auth-open="1"]').forEach((el) => {
      el.addEventListener('click', openFromLink);
    });

    // Wait for firebase manager
    waitForClientManager((m) => {
      manager = m;
      if (!manager) return;

      try {
        manager.onAuthChange((u) => {
          currentUser = u || null;
          if (currentUser) {
            // Si modal está abierto en login/register, cerrarlo automáticamente.
            if (!modal.classList.contains('hidden')) {
              close();
              toast('Sesión iniciada');
            }
          }
        });
      } catch (_) {}

      // Login
      if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          loginError && hide(loginError);
          forgotSuccess && hide(forgotSuccess);

          const correo = (byId('sr-auth-login-correo') && byId('sr-auth-login-correo').value || '').trim();
          const pass = (byId('sr-auth-login-pass') && byId('sr-auth-login-pass').value) || '';

          if (!correo || !pass) {
            if (loginError) {
              setText(loginError, 'Escribe tu correo y contraseña.');
              show(loginError);
            }
            return;
          }

          loginBtn && (loginBtn.disabled = true);
          loginSpinner && show(loginSpinner);
          try {
            await manager.login(correo, pass);
            // onAuthChange cierra el modal
          } catch (err) {
            if (loginError) {
              setText(loginError, mapAuthError(err, 'No se pudo iniciar sesión.'));
              show(loginError);
            }
          } finally {
            loginBtn && (loginBtn.disabled = false);
            loginSpinner && hide(loginSpinner);
          }
        });
      }

      // Register
      if (regForm) {
        regForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          regError && hide(regError);
          regSuccess && hide(regSuccess);

          const nombre = (byId('sr-auth-reg-nombre') && byId('sr-auth-reg-nombre').value || '').trim();
          const correo = (byId('sr-auth-reg-correo') && byId('sr-auth-reg-correo').value || '').trim();
          const telefono = (byId('sr-auth-reg-telefono') && byId('sr-auth-reg-telefono').value || '').trim();
          const pass = (byId('sr-auth-reg-pass') && byId('sr-auth-reg-pass').value) || '';
          const pass2 = (byId('sr-auth-reg-pass2') && byId('sr-auth-reg-pass2').value) || '';

          if (!nombre || !correo || !telefono || !pass || !pass2) {
            if (regError) {
              setText(regError, 'Completa todos los campos para crear tu cuenta.');
              show(regError);
            }
            return;
          }

          if (pass !== pass2) {
            if (regError) {
              setText(regError, 'Las contraseñas no coinciden.');
              show(regError);
            }
            return;
          }

          regBtn && (regBtn.disabled = true);
          regSpinner && show(regSpinner);

          try {
            await manager.registerClient({ nombre, correo, telefono, password: pass });
            if (regSuccess) {
              setText(regSuccess, 'Cuenta creada correctamente.');
              show(regSuccess);
            }
            try { regForm.reset(); } catch (_) {}
            // onAuthChange cierra el modal si quedó autenticado
          } catch (err) {
            if (regError) {
              setText(regError, mapAuthError(err, 'Ocurrió un error al registrar la cuenta.'));
              show(regError);
            }
          } finally {
            regBtn && (regBtn.disabled = false);
            regSpinner && hide(regSpinner);
          }
        });
      }

      // Forgot password
      if (forgotBtn) {
        forgotBtn.addEventListener('click', async () => {
          loginError && hide(loginError);
          forgotSuccess && hide(forgotSuccess);

          const correoEl = byId('sr-auth-login-correo');
          const correo = (correoEl && correoEl.value || '').trim();
          if (!correo) {
            if (loginError) {
              setText(loginError, 'Escribe tu correo para enviarte el enlace de recuperación.');
              show(loginError);
            }
            try { correoEl && correoEl.focus(); } catch (_) {}
            return;
          }

          if (correoEl && typeof correoEl.checkValidity === 'function' && !correoEl.checkValidity()) {
            if (loginError) {
              setText(loginError, 'Ingresa un correo válido.');
              show(loginError);
            }
            try { correoEl.focus(); } catch (_) {}
            return;
          }

          forgotBtn.disabled = true;
          forgotSpinner && show(forgotSpinner);
          try {
            if (typeof manager.sendPasswordReset !== 'function') {
              throw new Error('La recuperación de contraseña no está disponible.');
            }
            await manager.sendPasswordReset(correo);
            if (forgotSuccess) {
              setText(forgotSuccess, 'Te enviamos un enlace de recuperación. Revisa tu correo (también Spam).');
              show(forgotSuccess);
            }
            toast('Enlace enviado');
          } catch (err) {
            if (loginError) {
              const code = err && err.code ? String(err.code) : '';
              if (code === 'auth/user-not-found') {
                if (forgotSuccess) {
                  setText(forgotSuccess, 'Si el correo está registrado, recibirás un enlace de recuperación. Revisa tu bandeja (y Spam).');
                  show(forgotSuccess);
                }
                toast('Revisa tu correo');
              } else {
                setText(loginError, mapAuthError(err, 'No se pudo enviar el enlace.'));
                show(loginError);
              }
            }
          } finally {
            forgotBtn.disabled = false;
            forgotSpinner && hide(forgotSpinner);
          }
        });
      }

      // Logout
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          try {
            logoutBtn.disabled = true;
            await manager.logout();
            close();
            toast('Sesión cerrada');
          } catch (_) {
          } finally {
            logoutBtn.disabled = false;
          }
        });
      }
    });
  });
})();

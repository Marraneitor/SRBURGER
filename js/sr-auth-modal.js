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
      case 'auth/operation-not-allowed':
        return 'El inicio de sesión por correo/contraseña no está habilitado en Firebase. El administrador debe activarlo en Authentication > Métodos de acceso.';
      case 'PHONE_REQUIRED':
        return 'El teléfono es obligatorio. Ingresa un número válido.';
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

    const verifyModal = byId('sr-auth-verify-modal');
    const verifyCloseBtn = byId('sr-auth-verify-close');
    const verifyCodeInput = byId('sr-auth-verify-code');
    const verifyError = byId('sr-auth-verify-error');
    const verifySuccess = byId('sr-auth-verify-success');
    const verifySubmitBtn = byId('sr-auth-verify-submit');
    const verifySpinner = byId('sr-auth-verify-spinner');
    const verifyResendBtn = byId('sr-auth-verify-resend');

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
    let pendingRegister = null;

    function getLocalSession() {
      try {
        const raw = localStorage.getItem('sr_verified_customer_session');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.uid) return null;
        return parsed;
      } catch (_) {
        return null;
      }
    }

    // Notificar al resto de la página que el estado de sesión cambió
    // (login, registro, verificación de código, logout).
    function emitAuthChanged(reason) {
      try {
        window.dispatchEvent(new CustomEvent('sr-auth-changed', {
          detail: { reason: reason || 'change', loggedIn: !!getLocalSession() }
        }));
      } catch (_) {}
    }

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
      const localSession = getLocalSession();
      if (!currentUser && localSession) {
        currentUser = {
          uid: localSession.uid,
          displayName: localSession.nombre || '',
          phoneNumber: localSession.telefono || ''
        };
      }

      // Si ya hay sesión, mostrar vista simple de "sesión iniciada".
      if (currentUser && viewLoggedIn) {
        hide(viewLogin);
        hide(viewRegister);
        show(viewLoggedIn);
        setText(loggedInName, currentUser.displayName || currentUser.phoneNumber || currentUser.email || 'Sesión iniciada');
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
      const first = (tab === 'register') ? byId('sr-auth-reg-telefono') : byId('sr-auth-login-correo');
      try { first && first.focus(); } catch (_) {}
    }

    function close() {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
      if (verifyModal) {
        verifyModal.classList.add('hidden');
        verifyModal.classList.remove('flex');
      }
    }

    function openVerifyModal() {
      if (!verifyModal) return;
      verifyError && hide(verifyError);
      verifySuccess && hide(verifySuccess);
      if (verifyCodeInput) verifyCodeInput.value = '';
      verifyModal.classList.remove('hidden');
      verifyModal.classList.add('flex');
      setTimeout(() => { try { verifyCodeInput && verifyCodeInput.focus(); } catch (_) {} }, 60);
    }

    function closeVerifyModal() {
      if (!verifyModal) return;
      verifyModal.classList.add('hidden');
      verifyModal.classList.remove('flex');
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

    if (verifyCloseBtn) verifyCloseBtn.addEventListener('click', closeVerifyModal);
    if (verifyModal) {
      verifyModal.addEventListener('click', (ev) => {
        if (ev.target === verifyModal) closeVerifyModal();
      });
    }

    // Tab buttons
    tabLoginBtn && tabLoginBtn.addEventListener('click', () => {
      hide(viewLoggedIn);
      setTab('login');
    });
    tabRegisterBtn && tabRegisterBtn.addEventListener('click', () => {
      hide(viewLoggedIn);
      setTab('register');
    });

    // Login siempre por correo + contraseña
    const loginMode = 'email';
    const loginCorreoInput = byId('sr-auth-login-correo');

    // Registro siempre por correo + contraseña
    const regMode = 'email';
    const regCorreoRow = byId('sr-auth-reg-correo-row');
    const regCorreoInput = byId('sr-auth-reg-correo');

    // Attach to any link/button requesting auth modal
    document.querySelectorAll('[data-sr-auth-open="1"]').forEach((el) => {
      el.addEventListener('click', openFromLink);
    });

    // Wait for firebase manager
    waitForClientManager((m) => {
      manager = m;

      if (manager) {
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
      }

      // Login
      if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          loginError && hide(loginError);

          const rawId = String((byId('sr-auth-login-correo') && byId('sr-auth-login-correo').value) || '').trim();
          const pass = (byId('sr-auth-login-pass') && byId('sr-auth-login-pass').value) || '';

          if (!rawId || !pass) {
            if (loginError) {
              setText(loginError, 'Escribe tu correo y contraseña.');
              show(loginError);
            }
            return;
          }

          // Modo según toggle
          const isEmail = (loginMode === 'email');
          const telefono = rawId.replace(/\D/g, '');

          if (isEmail && !/@/.test(rawId)) {
            if (loginError) {
              setText(loginError, 'Ingresa un correo válido (ej: tucorreo@ejemplo.com).');
              show(loginError);
            }
            return;
          }
          if (!isEmail && telefono.length < 10) {
            if (loginError) {
              setText(loginError, 'Ingresa un teléfono válido (mínimo 10 dígitos).');
              show(loginError);
            }
            return;
          }

          loginBtn && (loginBtn.disabled = true);
          loginSpinner && show(loginSpinner);
          try {
            let session = null;

            if (isEmail) {
              // Login con correo + contraseña vía Firebase Auth
              if (!manager || typeof manager.login !== 'function') {
                throw new Error('El inicio de sesión con correo aún no está disponible. Recarga la página.');
              }
              const fbUser = await manager.login(rawId, pass);
              if (!fbUser) throw new Error('No se pudo iniciar sesión con ese correo.');
              // Intentar leer datos del cliente para obtener nombre/telefono
              let nombre = fbUser.displayName || '';
              let tel = fbUser.phoneNumber || '';
              try {
                if (typeof manager.getClient === 'function') {
                  const data = await manager.getClient(fbUser.uid);
                  if (data) {
                    nombre = data.nombre || nombre;
                    tel = data.telefono || tel;
                  }
                }
              } catch (_) {}
              session = {
                uid: fbUser.uid,
                nombre,
                telefono: tel,
                correo: fbUser.email || rawId,
                authType: 'email_password'
              };
            } else {
              // Login con teléfono + contraseña vía endpoint local
              const resp = await fetch('/api/auth/login-phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefono, password: pass })
              });
              const data = await resp.json().catch(() => ({}));
              if (!resp.ok || !data || !data.ok || !data.session) {
                throw new Error((data && data.error) ? String(data.error) : 'No se pudo iniciar sesión.');
              }
              session = data.session;
            }

            try {
              localStorage.setItem('sr_verified_customer_session', JSON.stringify(session));
              localStorage.setItem('customerName', session.nombre || '');
              localStorage.setItem('customerPhone', session.telefono || telefono || '');
            } catch (_) {}
            emitAuthChanged('login');

            currentUser = {
              uid: session.uid,
              displayName: session.nombre || '',
              phoneNumber: session.telefono || telefono || '',
              email: session.correo || (isEmail ? rawId : '')
            };

            // Mostrar vista "Sesión iniciada como ..." dentro del modal
            if (viewLoggedIn) {
              hide(viewLogin);
              hide(viewRegister);
              show(viewLoggedIn);
              setText(loggedInName, currentUser.displayName || currentUser.phoneNumber || currentUser.email || 'Sesión iniciada');
            }
            loginError && hide(loginError);
            toast('Sesión iniciada');
          } catch (err) {
            if (loginError) {
              setText(loginError, err && err.message ? String(err.message) : mapAuthError(err, 'No se pudo iniciar sesión.'));
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
          const telefono = (byId('sr-auth-reg-telefono') && byId('sr-auth-reg-telefono').value || '').trim();
          const pass = (byId('sr-auth-reg-pass') && byId('sr-auth-reg-pass').value) || '';
          const pass2 = (byId('sr-auth-reg-pass2') && byId('sr-auth-reg-pass2').value) || '';
          const phoneDigits = String(telefono || '').replace(/\D/g, '');
          const correo = (regCorreoInput && regCorreoInput.value || '').trim();

          if (!nombre || !correo || !phoneDigits || !pass || !pass2) {
            if (regError) {
              setText(regError, 'Completa todos los campos.');
              show(regError);
            }
            return;
          }

          if (phoneDigits.length < 10) {
            if (regError) {
              setText(regError, 'Tu teléfono debe tener al menos 10 dígitos.');
              show(regError);
            }
            return;
          }

          if (pass.length < 6) {
            if (regError) {
              setText(regError, 'La contraseña debe tener al menos 6 caracteres.');
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
            // Registro siempre vía correo + contraseña (Firebase Auth)
            const correo = (regCorreoInput && regCorreoInput.value || '').trim();
            if (!correo || !/@/.test(correo)) {
              throw new Error('Ingresa un correo válido.');
            }
            if (!manager || typeof manager.registerClient !== 'function') {
              throw new Error('El registro no está disponible. Recarga la página.');
            }
            const uid = await manager.registerClient({
              nombre,
              correo,
              telefono,
              password: pass
            });
            const session = {
              uid,
              nombre,
              telefono: phoneDigits,
              correo,
              authType: 'email_password'
            };
            try {
              localStorage.setItem('sr_verified_customer_session', JSON.stringify(session));
              localStorage.setItem('customerName', nombre);
              localStorage.setItem('customerPhone', phoneDigits);
            } catch (_) {}
            emitAuthChanged('register');
            currentUser = { uid, displayName: nombre, phoneNumber: phoneDigits, email: correo };
            if (viewLoggedIn) {
              hide(viewLogin);
              hide(viewRegister);
              show(viewLoggedIn);
              setText(loggedInName, nombre || correo);
            }
            toast('Cuenta creada');
            return;
          } catch (err) {
            console.error('[registro] error:', err && err.code, err);
            if (regError) {
              setText(regError, mapAuthError(err, err && err.message ? String(err.message) : 'Ocurrió un error al crear la cuenta.'));
              show(regError);
            }
          } finally {
            regBtn && (regBtn.disabled = false);
            regSpinner && hide(regSpinner);
          }
        });
      }

      if (verifySubmitBtn) {
        verifySubmitBtn.addEventListener('click', async () => {
          if (!pendingRegister) return;
          verifyError && hide(verifyError);
          verifySuccess && hide(verifySuccess);

          const codigo = String((verifyCodeInput && verifyCodeInput.value) || '').replace(/\D/g, '');
          if (!codigo) {
            if (verifyError) {
              setText(verifyError, 'Ingresa el código que recibiste por WhatsApp.');
              show(verifyError);
            }
            return;
          }

          verifySubmitBtn.disabled = true;
          verifySpinner && show(verifySpinner);
          try {
            const resp = await fetch('/api/auth/verify-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nombre: pendingRegister.nombre,
                telefono: pendingRegister.telefono,
                codigo
              })
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok || !data || !data.ok || !data.session) {
              throw new Error((data && data.error) ? String(data.error) : 'Código inválido.');
            }

            localStorage.setItem('sr_verified_customer_session', JSON.stringify(data.session));
            localStorage.setItem('customerName', data.session.nombre || pendingRegister.nombre);
            localStorage.setItem('customerPhone', data.session.telefono || pendingRegister.telefono);
            emitAuthChanged('verify');
            currentUser = {
              uid: data.session.uid,
              displayName: data.session.nombre || pendingRegister.nombre,
              phoneNumber: data.session.telefono || pendingRegister.telefono
            };

            if (verifySuccess) {
              setText(verifySuccess, 'Cuenta verificada correctamente.');
              show(verifySuccess);
            }
            pendingRegister = null;
            closeVerifyModal();
            // Mostrar vista "Sesión iniciada como ..." dentro del modal
            if (viewLoggedIn) {
              hide(viewLogin);
              hide(viewRegister);
              show(viewLoggedIn);
              setText(loggedInName, currentUser.displayName || currentUser.phoneNumber || 'Sesión iniciada');
            }
            toast('Cuenta verificada');
          } catch (err) {
            if (verifyError) {
              setText(verifyError, err && err.message ? String(err.message) : 'No se pudo validar el código.');
              show(verifyError);
            }
          } finally {
            verifySubmitBtn.disabled = false;
            verifySpinner && hide(verifySpinner);
          }
        });
      }

      if (verifyResendBtn) {
        verifyResendBtn.addEventListener('click', async () => {
          if (!pendingRegister) return;
          verifyError && hide(verifyError);
          verifySuccess && hide(verifySuccess);
          verifyResendBtn.disabled = true;
          try {
            const resp = await fetch('/api/auth/send-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nombre: pendingRegister.nombre,
                telefono: pendingRegister.telefono,
                password: pendingRegister.password
              })
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok || !data || !data.ok) {
              throw new Error((data && data.error) ? String(data.error) : 'No se pudo reenviar el código.');
            }
            if (verifySuccess) {
              setText(verifySuccess, 'Código reenviado por WhatsApp.');
              show(verifySuccess);
            }
          } catch (err) {
            if (verifyError) {
              setText(verifyError, err && err.message ? String(err.message) : 'No se pudo reenviar el código.');
              show(verifyError);
            }
          } finally {
            verifyResendBtn.disabled = false;
          }
        });
      }

      // Logout
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          try {
            logoutBtn.disabled = true;
            try { localStorage.removeItem('sr_verified_customer_session'); } catch (_) {}
            emitAuthChanged('logout');
            currentUser = null;
            if (manager && typeof manager.logout === 'function') {
              await manager.logout();
            }
            close();
            toast('Sesión cerrada');
          } catch (_) {
          } finally {
            logoutBtn.disabled = false;
          }
        });
      }

      // ── Olvidé contraseña (Firebase email reset) ───────────────────────
      const forgotModal = byId('sr-auth-forgot-modal');
      const forgotCloseBtn = byId('sr-auth-forgot-close');
      const forgotStep1 = byId('sr-auth-forgot-step1');
      const forgotStep2 = byId('sr-auth-forgot-step2');
      const forgotEmailInput = byId('sr-auth-forgot-email');
      const forgotErr = byId('sr-auth-forgot-error');
      const forgotSendBtn2 = byId('sr-auth-forgot-send');
      const forgotSendSpin = byId('sr-auth-forgot-send-spin');
      const forgotDoneBtn = byId('sr-auth-forgot-done');

      function openForgot() {
        if (!forgotModal) return;
        if (forgotEmailInput) forgotEmailInput.value = '';
        if (forgotErr) hide(forgotErr);
        if (forgotStep1) forgotStep1.classList.remove('hidden');
        if (forgotStep2) forgotStep2.classList.add('hidden');
        forgotModal.classList.remove('hidden');
        forgotModal.classList.add('flex');
      }
      function closeForgot() {
        if (!forgotModal) return;
        forgotModal.classList.add('hidden');
        forgotModal.classList.remove('flex');
      }

      if (forgotBtn) forgotBtn.addEventListener('click', openForgot);
      if (forgotCloseBtn) forgotCloseBtn.addEventListener('click', closeForgot);
      if (forgotDoneBtn) forgotDoneBtn.addEventListener('click', closeForgot);

      if (forgotSendBtn2) {
        forgotSendBtn2.addEventListener('click', async () => {
          const email = String(forgotEmailInput && forgotEmailInput.value || '').trim();
          if (forgotErr) hide(forgotErr);
          if (!email || !/@/.test(email)) {
            if (forgotErr) { forgotErr.textContent = 'Ingresa un correo válido.'; show(forgotErr); }
            return;
          }
          forgotSendBtn2.disabled = true;
          if (forgotSendSpin) show(forgotSendSpin);
          try {
            if (!manager || typeof manager.sendPasswordReset !== 'function') throw new Error('No disponible.');
            await manager.sendPasswordReset(email);
            if (forgotStep1) forgotStep1.classList.add('hidden');
            if (forgotStep2) forgotStep2.classList.remove('hidden');
          } catch (e) {
            if (forgotErr) { forgotErr.textContent = e.message || 'Error al enviar correo.'; show(forgotErr); }
          } finally {
            forgotSendBtn2.disabled = false;
            if (forgotSendSpin) hide(forgotSendSpin);
          }
        });
      }
    });
  });
})();

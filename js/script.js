// SR & SRA BURGER - Script Loader (hotfix)
// Importante: `fetch()` falla en muchos casos con `file://`.
// Usamos `document.write` para inyectar el script core de forma síncrona
// mientras el HTML todavía se está parseando (así no se pierde DOMContentLoaded).
(function() {
    try {
        // Evitar doble inyección
        if (window.__SR_SRA_CORE_LOADED__) return;
        window.__SR_SRA_CORE_LOADED__ = true;

        // Script core estable
        document.write('<script src="js/script.js.backup?v=core"><\/script>');
    } catch (e) {
        console.error('❌ Error cargando script core:', e);
    }
})();

if (false) {
// SR & SRA BURGER - Script Principal v4.2.1
    // Enhanced renderMenu with mobile-first responsive design (Bento-like cards)
    function renderMenu() {
        // Record open categories and scroll position to restore after re-render
        const openCategories = Array.from(document.querySelectorAll('.category-section'))
            .map(sec => ({
                category: sec.getAttribute('data-category'),
                isOpen: !sec.querySelector('.menu-grid, .menu-grid-mobile')?.classList.contains('hidden')
            }))
            .filter(x => x.isOpen)
            .map(x => x.category);
        const prevScrollY = window.scrollY;

        const menuCategoriesEl = document.getElementById('menu-categories');
        if (!menuCategoriesEl) return;

        menuCategoriesEl.innerHTML = '';

        // Detect if user is on mobile
        const isMobile = window.innerWidth <= 640;

        for (const category in menuData) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-section';
            categoryDiv.dataset.category = category;

            const categoryIcons = {
                'Hamburguesas': '🍔',
                'Hot Dogs': '🌭',
                'Combos': '🍽️',
                'Extras': '🍟',
                'Bebidas': '🥤'
            };

            const categoryDescriptions = {
                'Hamburguesas': 'Nuestras hamburguesas artesanales hechas con amor',
                'Hot Dogs': 'Hotdogs gourmet con ingredientes premium',
                'Combos': 'Combos diseñados para compartir y ahorrar',
                'Extras': 'Acompañamientos perfectos para tu pedido',
                'Bebidas': 'Refrescos helados para completar tu experiencia'
            };

            // Count visible items safely
            const safeCount = (() => {
                try {
                    const arr = Array.isArray(menuData[category]) ? menuData[category] : [];
                    return arr.filter(i => i && !i.hidden && !isProductHidden(i.id)).length;
                } catch (_) {
                    const arr = Array.isArray(menuData[category]) ? menuData[category] : [];
                    return arr.filter(i => i && !i.hidden).length;
                }
            })();

            categoryDiv.innerHTML = `
                <div class="text-center mb-5 sm:mb-8 category-header-mobile">
                    <div data-category-header="${category}" class="glass-effect inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-3xl mb-2 sm:mb-3 cursor-pointer select-none shadow-lg hover:shadow-xl transition-all duration-300 group">
                        <span class="text-2xl sm:text-3xl">${categoryIcons[category] || '🍔'}</span>
                        <h3 class="text-xl sm:text-3xl font-bold font-poppins text-gray-900 tracking-tight">${category}</h3>
                        <span class="ml-1 inline-flex items-center justify-center text-xs sm:text-sm font-bold text-gray-700 bg-black/5 px-2.5 py-1 rounded-full">${safeCount}</span>
                        <i class="fas fa-chevron-down text-gray-600 ml-1 transition-transform duration-300"></i>
                    </div>
                    <p class="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">${categoryDescriptions[category] || ''}</p>
                </div>
            `;

            const grid = document.createElement('div');
            if (isMobile) {
                grid.className = 'grid grid-cols-2 gap-3 sm:gap-4 menu-grid-mobile container-mobile';
            } else {
                grid.className = 'grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 auto-rows-fr menu-grid';
            }
            grid.classList.add('hidden');

            (Array.isArray(menuData[category]) ? menuData[category] : []).forEach((originalItem, index) => {
                if (!originalItem || originalItem.hidden) return;
                if (isProductHidden(originalItem.id)) return;

                const item = applyDailyPromotion(originalItem, category);
                const looksLikeCombo = /\bcombo\b/i.test(item.name || '');

                const isFeatured = !isMobile && index === 0;
                const bentoSpanClass = isMobile
                    ? ''
                    : (isFeatured
                        ? 'col-span-12 sm:col-span-6 lg:col-span-8 xl:col-span-6 lg:row-span-2'
                        : 'col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3');

                let buttonHtml;
                if (item.isCombo || looksLikeCombo) {
                    buttonHtml = `
                        <button data-id="${item.id}" class="choose-combo-btn w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-3 sm:px-6 py-2 sm:py-4 rounded-2xl font-bold text-xs sm:text-base hover:from-green-600 hover:to-green-700 transform hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl">
                            <i class="fas fa-cogs mr-1 sm:mr-2"></i>Personalizar
                        </button>
                    `;
                } else if (item.customizable) {
                    buttonHtml = `
                        <button data-id="${item.id}" class="customize-btn w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-3 sm:px-6 py-2 sm:py-4 rounded-2xl font-bold text-xs sm:text-base hover:from-green-600 hover:to-green-700 transform hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl">
                            <i class="fas fa-magic mr-1 sm:mr-2"></i>Personalizar
                        </button>
                    `;
                } else {
                    buttonHtml = `
                        <button data-id="${item.id}" class="add-to-cart-btn w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-3 sm:px-6 py-2 sm:py-4 rounded-2xl font-bold text-xs sm:text-base hover:from-green-600 hover:to-green-700 transform hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95">
                            Personalizar
                        </button>
                    `;
                }

                let priceHtml;
                if (item.isCombo) {
                    const realPrice = calculateComboRealPrice(item);
                    const savings = realPrice - item.price;
                    priceHtml = `
                        <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-2xl border border-green-200">
                            <div class="text-center">
                                <div class="text-sm text-gray-500 line-through mb-1">Original: $${realPrice.toFixed(0)}</div>
                                <div class="text-2xl font-bold text-green-600 mb-1">Combo: $${item.price.toFixed(0)}</div>
                                <div class="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">¡Ahorras $${savings.toFixed(0)}!</div>
                            </div>
                        </div>
                    `;
                } else if (item.originalPrice && item.originalPrice > item.price) {
                    const savings = item.originalPrice - item.price;
                    priceHtml = `
                        <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-2xl border border-green-200">
                            <div class="text-center">
                                <div class="text-lg text-gray-500 line-through mb-1">$${item.originalPrice.toFixed(0)}</div>
                                <div class="text-3xl font-bold text-green-700 mb-1">$${item.price.toFixed(0)}</div>
                                <div class="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">¡Ahorras $${savings.toFixed(0)}!</div>
                            </div>
                        </div>
                    `;
                } else {
                    priceHtml = `
                        <div class="text-center p-3">
                            <div class="text-3xl font-bold text-gray-800">$${item.price.toFixed(0)}</div>
                            <div class="text-sm text-gray-500">Precio regular</div>
                        </div>
                    `;
                }

                let processedDescription = item.description;
                if (item.description && item.description.includes('ENVÍO GRATIS')) {
                    processedDescription = item.description.replace(
                        'ENVÍO GRATIS',
                        '<span class="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse inline-block mt-2">🚚 ENVÍO GRATIS</span>'
                    );
                }

                let badges = '';
                let mobileInlineBadges = '';
                if (item.hasPromotion) {
                    badges += `<div class="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse z-10 shadow-lg">🎉 OFERTA</div>`;
                    mobileInlineBadges += `<span class="inline-block bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse mr-1 mb-1">🎉 OFERTA</span>`;
                }
                if ([1, 2, 6, 15].includes(item.id)) {
                    mobileInlineBadges += `<span class="inline-block bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold mr-1 mb-1 animate-pulse">🔥 POPULAR</span>`;
                }
                if (item.isCombo || (item.originalPrice && item.originalPrice > item.price)) {
                    badges += `<div class="absolute top-8 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold z-10 shadow-lg">💰 AHORRO</div>`;
                    mobileInlineBadges += `<span class="inline-block bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold mr-1 mb-1">💰 AHORRO</span>`;
                }

                let cardHtml;
                if (isMobile) {
                    const mobileBtn = (item.isCombo || looksLikeCombo)
                        ? `<button data-id="${item.id}" class="choose-combo-btn w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 rounded-2xl font-bold text-xs active:scale-95 transition">Personalizar</button>`
                        : item.customizable
                            ? `<button data-id="${item.id}" class="customize-btn w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 rounded-2xl font-bold text-xs active:scale-95 transition">Personalizar</button>`
                            : `<button data-id="${item.id}" class="add-to-cart-btn w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 rounded-2xl font-bold text-xs active:scale-95 transition">Personalizar</button>`;

                    cardHtml = `
                        <article class="group bg-white rounded-3xl shadow-md overflow-hidden relative border border-gray-100 hover:shadow-xl hover:border-yellow-300 menu-card menu-card-mobile transition-all duration-300 hover:-translate-y-0.5" style="animation-delay: ${index * 50}ms;">
                            <div class="relative overflow-hidden bg-gray-100 ${item.image ? 'sr-skeleton' : ''}">
                                ${item.image ? `<img src="${item.image}" alt="[Imagen de ${item.name}]" class="w-full h-36 object-cover transition-transform duration-500 group-hover:scale-105 sr-img-init" data-sr-img="1" data-item-id="${item.id}" loading="lazy" decoding="async" fetchpriority="low" referrerpolicy="no-referrer" onerror="this.onerror=null;this.style.display='none';">` : ''}
                                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"></div>
                                <div class="absolute bottom-2 left-2 right-2">
                                    ${mobileInlineBadges ? `<div class=\"mb-1\">${mobileInlineBadges}</div>` : ''}
                                    <div class="flex items-end justify-between gap-2">
                                        <h4 class="font-bold font-poppins text-white text-sm leading-snug line-clamp-2 drop-shadow">${item.name}</h4>
                                        <div class="shrink-0 bg-white/90 text-gray-900 font-black text-sm px-2.5 py-1 rounded-full">$${item.price.toFixed(0)}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="p-3 space-y-2">
                                ${item.hasPromotion ? `<div class=\"text-[11px] text-red-600 font-bold\">${item.promotionText}</div>` : ''}
                                <p class="text-xs text-gray-600 leading-snug line-clamp-2">${processedDescription}</p>
                                ${mobileBtn}
                            </div>
                        </article>
                    `;
                } else {
                    cardHtml = `
                        <article class="${bentoSpanClass} group bg-white rounded-3xl shadow-lg overflow-hidden flex flex-col border border-gray-100 hover:border-yellow-300 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2" style="animation-delay: ${index * 90}ms;">
                            <div class="relative overflow-hidden bg-gray-100 ${isFeatured ? 'h-64 sm:h-72 md:h-80 lg:h-full' : 'h-52 sm:h-56 md:h-60'} ${item.image ? 'sr-skeleton' : ''}">
                                ${badges}
                                ${item.image ? `<img src="${item.image}" alt="[Imagen de ${item.name}]" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 sr-img-init" data-sr-img="1" data-item-id="${item.id}" loading="lazy" decoding="async" fetchpriority="low" referrerpolicy="no-referrer" onerror="this.onerror=null;this.style.display='none';">` : ''}
                                <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>
                                <div class="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                                    <div class="flex items-end justify-between gap-3">
                                        <h4 class="font-poppins font-extrabold text-white ${isFeatured ? 'text-2xl sm:text-3xl' : 'text-xl'} leading-tight drop-shadow">${item.name}</h4>
                                        <div class="shrink-0 bg-white/90 text-gray-900 font-black ${isFeatured ? 'text-xl' : 'text-lg'} px-3 py-1.5 rounded-full">$${item.price.toFixed(0)}</div>
                                    </div>
                                    <div class="mt-2 flex items-center gap-2 text-white/90 text-xs">
                                        <span class="bg-white/15 border border-white/20 backdrop-blur-md px-2.5 py-1 rounded-full">Ver imagen</span>
                                        ${(item.isCombo || looksLikeCombo) ? '<span class="bg-green-500/80 px-2.5 py-1 rounded-full font-bold">Combo</span>' : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="p-4 sm:p-5 flex flex-col gap-3">
                                <p class="text-gray-600 text-sm leading-relaxed ${isFeatured ? 'line-clamp-4' : 'line-clamp-3'}">${processedDescription}</p>
                                ${item.hasPromotion ? `
                                    <div class="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-2 rounded-2xl text-center shadow-lg">
                                        <div class="font-bold text-sm animate-pulse">${item.promotionText}</div>
                                    </div>
                                ` : ''}
                                ${isFeatured ? priceHtml : ''}
                                <div class="pt-1">${buttonHtml}</div>
                            </div>
                        </article>
                    `;
                }

                grid.innerHTML += cardHtml;
            });

            categoryDiv.appendChild(grid);
            menuCategoriesEl.appendChild(categoryDiv);
        }

        // Initialize enhancements after rendering
        setTimeout(() => {
            addUrgencyIndicators();
            addSocialProof();
            initializeEnhancements();
            attachImagePreviewListeners();
            if (openCategories.length) {
                openCategories.forEach(cat => {
                    const section = document.querySelector(`.category-section[data-category="${cat}"]`);
                    const grid = section?.querySelector('.menu-grid, .menu-grid-mobile');
                    const chevron = section?.querySelector('.fa-chevron-down');
                    if (grid) grid.classList.remove('hidden');
                    if (chevron) chevron.style.transform = 'rotate(180deg)';
                });
                window.scrollTo({ top: prevScrollY, behavior: 'instant' });
            }
        }, 500);
    }

    // Add window resize listener for responsive updates (stable on mobile)
    (function() {
        let lastIsMobile = window.innerWidth <= 640;
        window.addEventListener('resize', () => {
            clearTimeout(window.resizeTimeout);
            window.resizeTimeout = setTimeout(() => {
                const isMobileNow = window.innerWidth <= 640;
                if (isMobileNow !== lastIsMobile) {
                    lastIsMobile = isMobileNow;
                    renderMenu();
                }
            }, 250);
        });
    })();

    // Configurar event listeners
                        }
                    }

                    // Handle custom products changes
                    if (newSettings.customProducts) {
                        const oldCustom = JSON.stringify(customProductsFromFirebase || {});
                        const newCustom = JSON.stringify(newSettings.customProducts || {});
                        if (oldCustom !== newCustom) {
                            customProductsFromFirebase = newSettings.customProducts || {};
                            applyCustomProducts(customProductsFromFirebase);
                            // Reaplicar overrides para que afecten a los nuevos productos
                            if (priceOverridesFromFirebase && Object.keys(priceOverridesFromFirebase).length > 0) {
                                applyPriceOverrides(priceOverridesFromFirebase);
                            }
                            if (imageOverridesFromFirebase && Object.keys(imageOverridesFromFirebase).length > 0) {
                                applyImageOverrides(imageOverridesFromFirebase);
                            }
                            console.log('Productos personalizados actualizados, re-renderizando menú...');
                            isUpdating = true;
                            renderMenu();
                            setTimeout(() => { isUpdating = false; }, 500);
                        }
                    }

                    // Handle service status changes (without reload loop)
                    if (newSettings.serviceActive !== undefined) {
                        const serviceClosedModal = document.querySelector('[class*="bg-black/80"], [class*="inset-0"]');
                        const isCurrentlyActive = !serviceClosedModal;
                        
                        if (!newSettings.serviceActive && isCurrentlyActive) {
                            console.log('Servicio desactivado desde panel de admin');
                            showServiceClosedModal();
                        }
                        // Removed the reload logic to prevent infinite reloads
                    }
                }
            });
        }
    }
    
    // --- ADVANCED UX ENHANCEMENTS ---
    
    // Enhanced loading states and micro-interactions with better visibility
    function showLoading(element) {
        element.classList.add('loading');
        element.innerHTML = '<div class="loading-spinner"></div><span class="ml-2">Agregando...</span>';
        element.disabled = true;
        element.style.pointerEvents = 'none';
    }
    
    function hideLoading(element, originalText) {
        element.classList.remove('loading');
        element.classList.add('success-state', 'btn-bounce');
        element.innerHTML = '<i class="fas fa-check mr-2"></i>¡Agregado!';
        element.disabled = false;
        element.style.pointerEvents = 'auto';
        
        // Reset to original state after success animation
        setTimeout(() => {
            element.classList.remove('success-state', 'btn-bounce');
            element.innerHTML = originalText;
        }, 1500);
    }
    
    // Enhanced success notifications with better visibility
    function showSuccessNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl z-[100] transform translate-x-full transition-all duration-500 notification-enter border-l-4 border-green-300';
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <i class="fas fa-check text-lg"></i>
                </div>
                <div>
                    <div class="font-bold text-lg">${message}</div>
                    <div class="text-green-100 text-sm">Se ha agregado a tu carrito</div>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
        
        // Slide in with enhanced animation
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
            notification.classList.add('shadow-glow');
        }, 100);
        
        // Slide out and remove with better timing
        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 500);
        }, 3500);
    }
    
    // Add cart bounce animation when items are added
    function bounceCart() {
        const cartBtn = document.getElementById('open-cart-btn');
        cartBtn.classList.add('animate-bounce');
        setTimeout(() => cartBtn.classList.remove('animate-bounce'), 1000);
    }
    
    // Add urgency indicators for popular items
    function addUrgencyIndicators() {
        // Función deshabilitada - no agregar badges POPULAR adicionales
        // const popularItems = [1, 2, 6, 15]; // IDs of popular items
        // popularItems.forEach(itemId => {
        //     const itemElement = document.querySelector(`[data-id="${itemId}"]`)?.closest('.bg-white');
        //     if (itemElement) {
        //         const badge = document.createElement('div');
        //         badge.className = 'absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold z-10';
        //         badge.innerHTML = '🔥 POPULAR';
        //         itemElement.style.position = 'relative';
        //         itemElement.appendChild(badge);
        //     }
        // });
    }
    
    // Add estimated delivery time
    function addDeliveryTimeEstimate() {
        const currentHour = new Date().getHours();
        let estimatedTime = '25-35 min';
        
        if (currentHour >= 18 && currentHour <= 21) { // Peak hours
            estimatedTime = '35-45 min';
        } else if (currentHour >= 14 && currentHour <= 16) { // Lunch hours
            estimatedTime = '30-40 min';
        }
        
        const deliveryBadge = document.createElement('div');
        deliveryBadge.className = 'fixed top-20 left-4 bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-2 rounded-full shadow-lg z-40 animate-bounce';
        deliveryBadge.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-clock"></i>
                <span class="font-bold text-sm">Entrega: ${estimatedTime}</span>
            </div>
        `;
        document.body.appendChild(deliveryBadge);
    }
    
    // Add progressive disclosure for combo customization
    function enhanceComboModals() {
        // Add step indicator for combo configuration
        const addStepIndicator = (currentStep, totalSteps) => {
            return `
                <div class="flex justify-center mb-6">
                    <div class="flex space-x-2">
                        ${Array.from({length: totalSteps}, (_, i) => `
                            <div class="w-3 h-3 rounded-full ${i <= currentStep ? 'bg-yellow-500' : 'bg-gray-300'} transition-colors duration-300"></div>
                        `).join('')}
                    </div>
                    <div class="text-sm text-gray-600 mt-2">Paso ${currentStep + 1} de ${totalSteps}</div>
                </div>
            `;
        };
    }
    
    // Add social proof indicators
    function addSocialProof() {
        const socialProofItems = [
            { id: 1, reviews: 127, rating: 4.8 },
            { id: 2, reviews: 93, rating: 4.9 },
            { id: 6, reviews: 156, rating: 4.7 },
            { id: 15, reviews: 89, rating: 4.6 }
        ];
        
        socialProofItems.forEach(item => {
            const itemElement = document.querySelector(`[data-id="${item.id}"]`)?.closest('.bg-white');
            if (itemElement) {
                const socialProof = document.createElement('div');
                socialProof.className = 'absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs shadow-lg';
                socialProof.innerHTML = `
                    <div class="flex items-center space-x-1">
                        <div class="flex">
                            ${Array.from({length: 5}, (_, i) => `
                                <i class="fas fa-star ${i < Math.floor(item.rating) ? 'text-yellow-400' : 'text-gray-300'}" style="font-size: 10px;"></i>
                            `).join('')}
                        </div>
                        <span class="font-semibold text-gray-700">${item.rating}</span>
                        <span class="text-gray-500">(${item.reviews})</span>
                    </div>
                `;
                itemElement.style.position = 'relative';
                itemElement.appendChild(socialProof);
            }
        });
    }
    
    // Add cart abandonment prevention
    let cartAbandonmentTimer;
    function startCartAbandonmentTimer() {
        clearTimeout(cartAbandonmentTimer);
        if (cart.length > 0) {
            cartAbandonmentTimer = setTimeout(() => {
                const abandonmentModal = document.createElement('div');
                abandonmentModal.className = 'fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4';
                abandonmentModal.innerHTML = `
                    <div class="bg-white rounded-lg shadow-xl max-w-md mx-auto p-6 text-center">
                        <div class="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-shopping-cart text-yellow-500 text-3xl"></i>
                        </div>
                        <h3 class="text-2xl font-bold mb-2">¡No te vayas con hambre! 🍔</h3>
                        <p class="text-gray-600 mb-6">Tienes ${cart.length} deliciosos productos en tu carrito esperándote.</p>
                        <div class="flex space-x-3">
                            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                                    class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                Seguir explorando
                            </button>
                            <button onclick="openCart(); this.parentElement.parentElement.parentElement.remove()" 
                                    class="flex-1 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600">
                                Finalizar pedido
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(abandonmentModal);
            }, 120000); // 2 minutes
        }
    }
    
    // Add visual feedback for form validation
    function enhanceFormValidation() {
        const inputs = ['customer-name', 'customer-phone', 'address-input'];
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                // Asegurar que el campo de dirección siempre permita escritura
                if (inputId === 'address-input') {
                    input.addEventListener('focus', function() {
                        // Remover cualquier bloqueo que pueda haber
                        this.removeAttribute('readonly');
                        this.removeAttribute('disabled');
                        this.style.pointerEvents = 'auto';
                        console.log('Campo de dirección enfocado - escritura habilitada');
                    });
                    
                    input.addEventListener('click', function() {
                        // Asegurar que siempre se pueda escribir al hacer clic
                        this.removeAttribute('readonly');
                        this.removeAttribute('disabled');
                        this.style.pointerEvents = 'auto';
                    });
                }
                
                input.addEventListener('blur', (e) => {
                    const value = e.target.value.trim();
                    const isValid = value.length > 0;
                    
                    if (isValid) {
                        e.target.classList.remove('border-red-300');
                        e.target.classList.add('border-green-300');
                        const checkIcon = e.target.parentElement.querySelector('.validation-icon');
                        if (checkIcon) checkIcon.remove();
                        
                        const icon = document.createElement('i');
                        icon.className = 'fas fa-check-circle text-green-500 absolute right-3 top-1/2 transform -translate-y-1/2 validation-icon';
                        e.target.parentElement.style.position = 'relative';
                        e.target.parentElement.appendChild(icon);
                    } else if (value.length === 0 && e.target.hasAttribute('required')) {
                        e.target.classList.remove('border-green-300');
                        e.target.classList.add('border-red-300');
                    }
                });
            }
        });
    }
    
    // Add smart recommendations
    function addSmartRecommendations(addedItemId) {
        const recommendations = {
            1: [8, 21], // Clásica -> Papas Gajo + Coca Cola
            2: [16, 22], // BBQ -> Papas Gajo Grandes + Coca Cola 1.75L
            11: [8, 21], // Alohawai -> Papas Gajo + Coca Cola
            12: [16, 23], // CheesseTorra -> Papas Gajo Grandes + Coca Cola 3L
        };
        
        const recommended = recommendations[addedItemId];
        if (recommended && !document.getElementById('recommendation-popup')) {
            const popup = document.createElement('div');
            popup.id = 'recommendation-popup';
            popup.className = 'fixed bottom-4 left-4 bg-white rounded-lg shadow-xl p-4 max-w-sm z-50 border-l-4 border-yellow-500';
            popup.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <h4 class="font-bold text-gray-800">🤖 Sugerencia Smart</h4>
                    <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <p class="text-sm text-gray-600 mb-3">¡Otros clientes también pidieron:</p>
                <div class="space-y-2">
                    ${recommended.map(id => {
                        const item = findItemById(id);
                        return `
                            <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div class="flex items-center space-x-2">
                                    ${item.image ? `<img src="${item.image}" alt="${item.name}" class="w-8 h-8 rounded object-cover sr-img-init" data-sr-img="1" loading="lazy" decoding="async" fetchpriority="low" referrerpolicy="no-referrer" onerror="this.onerror=null;this.style.display='none';">` : ''}
                                    <div>
                                        <div class="text-sm font-semibold">${item.name}</div>
                                        <div class="text-xs text-gray-500">$${item.price}</div>
                                    </div>
                                </div>
                                <button onclick="addToCart(${id})" class="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600">
                                    Agregar
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            document.body.appendChild(popup);
            
            // Auto remove after 10 seconds
            setTimeout(() => {
                if (document.getElementById('recommendation-popup')) {
                    document.getElementById('recommendation-popup').remove();
                }
            }, 10000);
        }
    }
    
    // Add real-time order total preview
    function addOrderTotalPreview() {
        let totalPreview = null;
        
        function createTotalPreview() {
            if (!totalPreview) {
                totalPreview = document.createElement('div');
                totalPreview.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-full shadow-xl z-40 transition-all duration-300';
                totalPreview.style.display = 'none';
                document.body.appendChild(totalPreview);
            }
        }
        
        function updateTotalPreview() {
            createTotalPreview();
            
            if (cart.length > 0) {
                const total = calculateCartTotal();
                totalPreview.innerHTML = `
                    <div class="flex items-center space-x-3 cursor-pointer" onclick="openCart()">
                        <i class="fas fa-shopping-cart"></i>
                        <span class="font-bold">${cart.length} items • $${total.toFixed(0)}</span>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                `;
                totalPreview.style.display = 'block';
            } else {
                totalPreview.style.display = 'none';
            }
        }
        
        return updateTotalPreview;
    }

    // --- DATA ---
    const toppingsData = [
        { id: 't6', name: 'Doble Carne', price: 30, description: '¿La quieres con doble carne jugosa?', image: '' },
        { id: 't1', name: 'Tocino Extra', price: 15, description: '¿Te gusta el tocino crujiente?', image: '' },
        { id: 't7', name: 'Chezzy (Queso Cheddar liquido)', price: 10, description: '¿Un toque cremoso extra?', image: '' },
        { id: 't5', name: 'Chiles en rodajas', price: 0, description: 'Chiles en rodajas (gratis)', image: '' }
    ];
    const menuData = {
        "Hamburguesas": [
            { id: 1, name: "Clásica PREMIUM", price: 100, description: "Carne premium jugosa con la mezcla perfecta de queso manchego y americano, vegetales frescos y pan esponjoso. Un clásico que nunca falla.", image: "", customizable: true },
            { id: 2, name: "BBQ BEACON CRUNCH", price: 110, description: "Carne premium con queso americano, tocino crujiente, aros de cebolla empanizados, salsa BBQ de miel ahumada y vegetales frescos. Una mezcla dulce, ahumada y crocante.", image: "", customizable: true },
            { id: 11, name: "Alohawai Burger", price: 120, description: "Carne premium con quesos manchego y americano, piña asada que aporta un dulzor irresistible, vegetales frescos y pan suave. Un viaje tropical en cada mordida.", image: "", customizable: true },
            { id: 12, name: "CheesseTorraBurger", price: 120, description: "Carne premium con trocitos de chistorra bien fritos, queso manchego fundido y pan esponjoso. Una hamburguesa intensa y llena de carácter, sin vegetales.", image: "", customizable: true },
            { id: 13, name: "Choriargentina Burger", price: 120, description: "Carne premium con chorizo argentino sellado en la plancha, queso manchego derretido y pan suave. Potente, jugosa y sin vegetales: puro sabor argentino.", image: "", customizable: true }
        ],
        "Hot Dogs": [
            { id: 5, name: "Hotdog Jumbo", price: 60, description: "🌭 Salchicha jumbo jugosa en pan artesanal tostado, tocino crujiente, tomate fresco, cebolla y nuestros aderezos especiales. ¡Preparado al momento para ti!", image: "", customizable: true },
            { id: 27, name: "Jalapeño Dog", price: 60, description: "🌶️ Salchicha roja premium con queso manchego derretido, tocino crujiente, cebolla caramelizada y jalapeños frescos.", image: "", customizable: true }
        ],
        "Combos": [
            { id: 26, name: "DOBLES DOBLES", price: 220, originalPrice: 300, description: "🔥 2 hamburguesas a tu elección a precio especial. La Doble Doble cuesta $300, aquí en combo te la llevas por $220. ¡Ahorras $80!", image: "", isCombo: true, burgerChoices: 2, availableBurgers: [1, 2, 11, 12, 13] },
            { id: 6, name: "Combo Pareja", price: 250, originalPrice: 305, description: "💕 Perfecto para compartir: 2 hamburguesas deliciosas a tu elección, papas medianas doradas y 7 aros de cebolla crujientes. ¡Ideal para una cita perfecta!", image: "", isCombo: true, burgerChoices: 2, availableBurgers: [1, 2, 11, 12, 13] },
            { id: 15, name: "Combo Dúo", price: 180, originalPrice: 220, description: "🤝 Lo mejor de dos mundos: 1 hamburguesa jugosa, 1 hotdog delicioso y papas medianas. ¡Para los que no pueden decidirse y quieren probarlo todo!", image: "", isCombo: true, burgerChoices: 1, availableBurgers: [1, 2, 11, 12, 13], hotdogChoices: 1, availableHotdogs: [5, 27] },
            { id: 7, name: "Combo Amigos", price: 360, originalPrice: 400, description: "👥 Para compartir con tus mejores amigos: 3 hamburguesas espectaculares y papas medianas. ¡Momento perfecto para crear recuerdos!", image: "", isCombo: true, burgerChoices: 3, availableBurgers: [1, 2, 11, 12, 13] },
            { id: 14, name: "Combo Familiar", price: 650, originalPrice: 730, description: "👨‍👩‍👧‍👦 La experiencia familiar completa: 5 hamburguesas increíbles, papas XL (a elegir: gajo o francesas), aros de cebolla medianos y Coca-Cola 3L + ENVÍO GRATIS. ¡Todos felices en casa!", image: "", isCombo: true, burgerChoices: 5, availableBurgers: [1, 2, 11, 12, 13] }
        ],
        "Extras": [
            { id: 8, name: "Papas Gajo Medianas", price: 60, description: "🍟 Papas gajo doradas y crujientes por fuera, suaves por dentro, sazonadas con nuestra mezcla especial de especias.", image: "" },
            { id: 16, name: "Papas Gajo Grandes", price: 120, description: "🍟 Porción generosa de nuestras famosas papas gajo, perfectas para compartir. ¡Irresistiblemente adictivas!", image: "" },
            { id: 28, name: "Papas Francesas Medianas", price: 60, description: "🍟 Papas francesas clásicas, doradas y crujientes, cortadas en bastones perfectos. ¡El acompañamiento tradicional que nunca pasa de moda!", image: "" },
            { id: 29, name: "Papas Francesas Grandes", price: 120, description: "🍟 Porción grande de nuestras deliciosas papas francesas, cortadas al estilo tradicional y fritas hasta el punto perfecto.", image: "" },
            { id: 17, name: "Salchipapas Medianas", price: 80, description: "🌭🍟 La combinación perfecta: papas doradas con trozos jugosos de salchicha premium. ¡Un clásico que nunca falla!", image: "https://i.imgur.com/YgEDfx3.jpeg" },
            { id: 18, name: "Salchipapas Grandes", price: 120, description: "🌭🍟 Porción familiar de salchipapas con salchicha premium y papas doradas. ¡Para los que aman los sabores intensos!", image: "https://i.imgur.com/YgEDfx3.jpeg" },
            { id: 19, name: "Aros de Cebolla (8 pz)", price: 45, description: "🧅 Aros de cebolla empanizados y fritos hasta la perfección, crujientes por fuera y tiernos por dentro.", image: "https://i.imgur.com/rK8wjox.jpeg" },
            { id: 20, name: "Aros de Cebolla Grande (15 pz)", price: 80, description: "🧅 Porción generosa de aros de cebolla dorados. ¡El acompañamiento perfecto que complementa cualquier orden!", image: "https://i.imgur.com/rK8wjox.jpeg" }
        ],
       "Bebidas": [
           { id: 21, name: "Coca-Cola 600ml", price: 30, description: "🥤 Coca-Cola helada y refrescante, el acompañante perfecto para tu comida. ¡Nada como la chispa de la vida!", image: "" },
           { id: 22, name: "Coca-Cola 1.75L", price: 40, description: "🥤 Coca-Cola familiar perfecta para compartir, siempre fría y burbujeante. ¡Momentos especiales merecen la Coca-Cola!", image: "" },
           { id: 23, name: "Coca-Cola 3L", price: 60, description: "🥤 La Coca-Cola grande para toda la familia, helada y con esa burbuja inconfundible que todos amamos. ¡Alegría para todos!", image: "" },
           { id: 24, name: "Agua Natural 600ml", price: 20, description: "💧 Agua natural pura y refrescante para hidratarte mientras disfrutas de tu comida favorita.", image: "" }
       ]
    };
    // Orden explícito de secciones en la web
    const MENU_CATEGORY_ORDER = [
        'Hamburguesas',
        'Hot Dogs',
        'Combos',
        'Extras', // Extras debe ir arriba de Bebidas
        'Bebidas'
    ];
    const WHATSAPP_NUMBER = '5219221593688';
    // API base: override via window.__API_BASE.
    // Default:
    // - http/https (Vercel): same-origin (relative)
    // - file:// (double click): fallback to local server
    const DEFAULT_API_BASE = (typeof location !== 'undefined' && (location.protocol === 'http:' || location.protocol === 'https:'))
        ? ''
        : 'http://localhost:3000';
    const API_BASE_RAW = (typeof window !== 'undefined' && window.__API_BASE != null)
        ? String(window.__API_BASE)
        : DEFAULT_API_BASE;
    const API_BASE = String(API_BASE_RAW || '').replace(/\/$/, '');
    // Multiple base options for local dev
    const API_BASES = (() => {
        if (typeof window !== 'undefined' && window.__API_BASE) return [String(window.__API_BASE).replace(/\/$/, '')];
        return [API_BASE];
    })();

    // Helper: POST order with fallback endpoints and timeout
    async function postOrderToApi(orderData) {
        const url = `${API_BASE}/api/send-order`;
        console.log('Enviando pedido a:', url);
        
        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (!resp.ok) {
                let errorText = '';
                try {
                    const errorData = await resp.json();
                    errorText = errorData.error || await resp.text();
                } catch (e) {
                    errorText = await resp.text();
                }
                throw new Error(`Error ${resp.status}: ${errorText}`);
            }

            return await resp.json();
        } catch (err) {
            console.error('Error al enviar pedido:', err);
            throw err;
        }
    }
    let cart = [];
    let tempComboConfig = {};
    let userAddress = null;

    // --- PROMOCIONES DIARIAS ---
    const dailyPromotions = {
        2: { // Martes - HOTDOG MANIA (antes lunes)
            type: 'hotdog_discount',
            discount: 0.20, // 20% descuento
            description: '20% DESCUENTO EN HOTDOGS',
            categories: ['Hot Dogs']
        },
        3: { // Miércoles - BBQ BEACON CRUNCH a $100 (antes martes)
            type: 'specific_item',
            targetItem: 2, // BBQ BEACON CRUNCH
            specialPrice: 100,
            description: 'BBQ BEACON CRUNCH A $100',
            categories: ['Hamburguesas']
        },
        4: { // Jueves - Papas gratis complemento (antes miércoles)
            type: 'free_fries',
            description: 'PAPAS GRATIS CON HAMBURGUESA O HOTDOG',
            categories: ['Hamburguesas', 'Hot Dogs']
        },
        5: { // Viernes - Carne & tocino 50% (antes jueves)
            type: 'meat_supreme',
            extraMeatDiscount: 20, // Doble carne a 10 en lugar de 30
            description: 'DOBLE CARNE POR SOLO 10',
            categories: ['Hamburguesas']
        }
    };

    // Función para obtener el día actual y aplicar promociones
    function getCurrentDayPromotion() {
        const today = new Date().getDay(); // 0 = Domingo, 1 = Lunes, etc.
        return dailyPromotions[today] || null;
    }

    // Función para aplicar promociones a un item
    function applyDailyPromotion(item, category) {
        const promotion = getCurrentDayPromotion();
        if (!promotion) return { ...item };

        const promotedItem = { ...item, originalPrice: item.price };

        // Aplicar promoción según el tipo
        switch (promotion.type) {
            case 'hotdog_discount':
                if (category === 'Hot Dogs') {
                    promotedItem.price = Math.round(item.price * (1 - promotion.discount));
                    promotedItem.hasPromotion = true;
                    promotedItem.promotionText = promotion.description;
                }
                break;
            
            case 'specific_item':
                if (item.id === promotion.targetItem) {
                    promotedItem.price = promotion.specialPrice;
                    promotedItem.hasPromotion = true;
                    promotedItem.promotionText = promotion.description;
                }
                break;
            
            case 'free_fries':
                if (category === 'Hamburguesas' || category === 'Hot Dogs') {
                    promotedItem.hasPromotion = true;
                    promotedItem.promotionText = promotion.description;
                    promotedItem.freeFries = true;
                }
                break;
            
            case 'meat_supreme':
                if (category === 'Hamburguesas') {
                    promotedItem.hasPromotion = true;
                    promotedItem.promotionText = promotion.description;
                    promotedItem.meatSupreme = true;
                }
                break;
        }

        return promotedItem;
    }

    // Función para verificar si las promociones del día afectan a los combos
    function doesDailyPromotionAffectCombos() {
        const promotion = getCurrentDayPromotion();
        if (!promotion) return false;
        
        // Las promociones que afectan a hamburguesas o hotdogs afectan a los combos
        // porque los combos incluyen estos productos
        switch (promotion.type) {
            case 'hotdog_discount':
                // Lunes: descuento en hotdogs - afecta Combo Dúo
                return true;
            case 'specific_item':
                // Martes: BBQ BEACON CRUNCH a precio especial - afecta todos los combos que incluyan hamburguesas
                return true;
            case 'free_fries':
                // Miércoles: papas gratis con hamburguesas - afecta todos los combos
                return true;
            case 'meat_supreme':
                // Jueves: carne extra barata - afecta todos los combos que incluyan hamburguesas
                return true;
            default:
                return false;
        }
    }

    // --- ELEMENTS ---
    const menuContainer = document.getElementById('menu-categories');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const openCartBtn = document.getElementById('open-cart-btn');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartEmptyMsg = document.getElementById('cart-empty-msg');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutModal = document.getElementById('checkout-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const orderSummaryContainer = document.getElementById('order-summary');
    const sendWhatsappBtn = document.getElementById('send-whatsapp-btn');
    const customerNameInput = document.getElementById('customer-name');
    const customerPhoneInput = document.getElementById('customer-phone');
    const customModal = document.getElementById('customization-modal');
    const customModalTitle = document.getElementById('custom-modal-title');
    const toppingsContainer = document.getElementById('toppings-container');
    const customModalTotal = document.getElementById('custom-modal-total');
    const addCustomToCartBtn = document.getElementById('add-custom-to-cart-btn');
    const closeCustomModalBtn = document.getElementById('close-custom-modal-btn');
    const addFriesCheckbox = document.getElementById('add-fries-checkbox');
    const friesChoiceContainer = document.getElementById('fries-choice-container');
    const comboModal = document.getElementById('combo-modal');
    const comboModalTitle = document.getElementById('combo-modal-title');
    const comboModalBody = document.getElementById('combo-modal-body');
    const comboModalTotal = document.getElementById('combo-modal-total');
    const addComboToCartBtn = document.getElementById('add-combo-to-cart-btn');
    const closeComboModalBtn = document.getElementById('close-combo-modal-btn');
    const promotionsBtn = document.getElementById('promotions-btn');
    const promotionsModal = document.getElementById('promotions-modal');
    const closePromotionsModalBtn = document.getElementById('close-promotions-modal-btn');

    // --- DELIVERY DISTANCE CALCULATION ---
    
    // Función para calcular la distancia entre dos puntos usando la fórmula de Haversine
    function calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radio de la Tierra en kilómetros
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distancia en kilómetros
        return distance;
    }
    
    // Función para calcular el precio de envío basado en la distancia
    function calculateDeliveryPrice(distance) {
        if (distance <= 4) {
            return DELIVERY_PRICE; // $40 para distancias hasta 4 km
        } else if (distance <= MAX_DELIVERY_DISTANCE) {
            const extraKm = Math.ceil(distance - 4); // Redondear hacia arriba los km extra
            return DELIVERY_PRICE + (extraKm * EXTRA_KM_PRICE);
        } else {
            return null; // Fuera del rango de entrega
        }
    }
    
    // Función para obtener la zona de entrega y precio
    function getDeliveryZone(distance) {
        if (distance <= 4) {
            return {
                zone: 'Zona 1 (0-4 km)',
                price: DELIVERY_PRICE,
                color: 'green',
                description: 'Zona de entrega estándar'
            };
        } else if (distance <= MAX_DELIVERY_DISTANCE) {
            const extraKm = Math.ceil(distance - 4);
            const totalPrice = DELIVERY_PRICE + (extraKm * EXTRA_KM_PRICE);
            return {
                zone: `Zona 2 (${distance.toFixed(1)} km)`,
                price: totalPrice,
                color: 'orange',
                description: `Zona extendida (+$${extraKm * EXTRA_KM_PRICE} por ${extraKm} km extra)`
            };
        } else {
            return {
                zone: 'Fuera de cobertura',
                price: null,
                color: 'red',
                description: `Lo sentimos, no llegamos a ${distance.toFixed(1)} km de distancia`
            };
        }
    }

    // --- FUNCTIONS ---
    function findItemById(itemId) {
        const orderedCategories = MENU_CATEGORY_ORDER.filter(cat => menuData[cat])
            .concat(Object.keys(menuData).filter(cat => !MENU_CATEGORY_ORDER.includes(cat)));

        for (const category of orderedCategories) {
            const item = menuData[category].find(i => i.id === itemId);
            if (item) return item;
        }
        return null;
    }

    function getCategoryForItemId(itemId) {
        for (const cat in menuData) {
            if (Array.isArray(menuData[cat]) && menuData[cat].some(i => i.id === itemId)) {
                return cat;
            }
        }
        return '';
    }

    function isFreeFriesPromotionActiveForCategory(category) {
        const promotion = getCurrentDayPromotion();
        if (!promotion || promotion.type !== 'free_fries') return false;
        return category === 'Hamburguesas' || category === 'Hot Dogs';
    }

    function getFreeFriesDisplayNameByType(friesType) {
        const normalized = String(friesType || '').toLowerCase();
        if (normalized.includes('frances')) return 'Papas Francesas Medianas';
        return 'Papas Gajo Medianas';
    }
    
    // Enhanced addToCart with better visual feedback
    function addToCart(itemId) {
        const originalItem = findItemById(itemId);
        if (!originalItem) return;
        
        // Add loading state to button with better visual feedback
        const button = document.querySelector(`[data-id="${itemId}"].add-to-cart-btn`);
        if (button) {
            const originalText = button.innerHTML;
            showLoading(button);
            
            // Add vibration for mobile devices
            if (navigator.vibrate) {
                navigator.vibrate([50, 30, 50]);
            }
            
            setTimeout(() => {
                // Determinar la categoría del item para aplicar la promoción diaria
                let category = '';
                for (const cat in menuData) {
                    if (menuData[cat].some(i => i.id === itemId)) {
                        category = cat;
                        break;
                    }
                }

                const item = applyDailyPromotion(originalItem, category);

                const cartItem = {
                    id: Date.now(),
                    baseItem: item,
                    customizations: [],
                    fries: null,
                    onionRings: null,
                    menuExtras: [],
                    price: item.price,
                    quantity: 1,
                    hasPromotion: item.hasPromotion || false,
                    promotionText: item.promotionText || '',
                    freeFries: item.freeFries || false,
                    meatSupreme: item.meatSupreme || false
                };

                // Si la promo de papas aplica y es hamburguesa u hotdog, agregar papas gratis
                if (item.freeFries && (category === 'Hamburguesas' || category === 'Hot Dogs')) {
                    cartItem.freeFriesIncluded = {
                        name: 'Papas Gajo Medianas',
                        price: 0
                    };
                }
                
                cart.push(cartItem);
                updateCart();
                hideLoading(button, originalText);
                
                // Enhanced feedback with better timing
                setTimeout(() => {
                    showSuccessNotification(`${item.name} agregado al carrito 🎉`);
                    bounceCart();
                    addSmartRecommendations(itemId);
                    startCartAbandonmentTimer();
                }, 200);
                
            }, 800); // Longer loading time for better visual feedback
        }
    }
    
    // Enhanced cart calculation
    function calculateCartTotal() {
        let total = 0;
        cart.forEach(item => {
            total += item.price * item.quantity;
        });
        
        // Add delivery fee if applicable
        const deliveryType = document.querySelector('input[name="delivery-type"]:checked')?.value;
        if (deliveryType === 'delivery') {
            // Si hay una dirección seleccionada, usar el precio calculado
            if (userAddress && userAddress.deliveryPrice !== undefined) {
                total += userAddress.deliveryPrice;
            } else {
                // Usar precio base si no hay dirección específica
                total += DELIVERY_PRICE;
            }
        }
        
        return total;
    }
    
    // Enhanced updateCart with better animations
    function updateCart() {
        const cartItemsContainer = document.getElementById('cart-items');
        const cartEmptyMsg = document.getElementById('cart-empty-msg');
        const cartCount = document.getElementById('cart-count');
        const cartTotal = document.getElementById('cart-total');
        const checkoutBtn = document.getElementById('checkout-btn');
        
        // Update cart count with enhanced animation
        const oldCount = cartCount.textContent;
        cartCount.textContent = cart.length;
        if (cart.length > oldCount) {
            cartCount.classList.add('animate-pulse', 'bg-red-500', 'scale-110');
            setTimeout(() => {
                cartCount.classList.remove('animate-pulse', 'bg-red-500', 'scale-110');
            }, 1000);
        }
        
        if (cart.length === 0) {
            cartEmptyMsg.style.display = 'block';
            cartItemsContainer.innerHTML = '';
            cartTotal.textContent = '$0.00';
            checkoutBtn.disabled = true;
            checkoutBtn.classList.add('opacity-50');
            return;
        }
        
        cartEmptyMsg.style.display = 'none';
        checkoutBtn.disabled = false;
        checkoutBtn.classList.remove('opacity-50');
        
        // Enhanced cart items rendering with better UX
        cartItemsContainer.innerHTML = cart.map((item, index) => `
            <div class="cart-item-enter bg-gradient-to-r from-white to-gray-50 p-4 rounded-lg shadow-sm border border-gray-100 mb-3 hover:shadow-md transition-all duration-300">
                <div class="flex items-start space-x-3">
                ${item.baseItem && item.baseItem.image ? `<img src="${item.baseItem.image}" alt="${item.baseItem.name}" class="w-16 h-16 object-cover rounded-lg shadow-sm" referrerpolicy="no-referrer" onerror="this.onerror=null;this.style.display='none';">` : `<div class="w-16 h-16 rounded-lg bg-gray-100"></div>`}
                    <div class="flex-grow">
                        <h4 class="font-bold text-gray-800 text-lg">${item.baseItem.name}</h4>
                        
                        ${item.isCombo ? `
                            <div class="text-sm text-gray-600 mb-2">
                                <div class="bg-blue-50 p-2 rounded mb-2">
                                    <strong class="text-blue-800">Combo incluye:</strong>
                                    <ul class="mt-1 space-y-1">
                                        ${item.choices.map(choice => `
                                            <li class="flex items-center text-xs">
                                                <i class="fas fa-hamburger text-blue-600 mr-1"></i>
                                                ${choice.burger.name}
                                                ${choice.customizations.length > 0 ? 
                                                    `<span class="ml-2 bg-yellow-100 text-yellow-800 px-1 rounded text-xs">
                                                        +${choice.customizations.length} extras
                                                    </span>` : ''}
                                            </li>
                                        `).join('')}
                                        ${item.hotdogs ? item.hotdogs.map(hotdog => `
                                            <li class="flex items-center text-xs">
                                                <i class="fas fa-hotdog text-red-600 mr-1"></i>
                                                ${hotdog.hotdog.name}
                                            </li>
                                        `).join('') : ''}
                                        <li class="flex items-center text-xs">
                                            <i class="fas fa-fries text-yellow-600 mr-1"></i>
                                            Papas ${item.includedFries.type} ${item.includedFries.size}
                                        </li>
                                        ${item.baseItem.name.includes('Coca-Cola') ? 
                                            `<li class="flex items-center text-xs">
                                                <i class="fas fa-glass text-blue-600 mr-1"></i>
                                                Bebida incluida
                                            </li>` : ''}
                                    </ul>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${(item.customizations && item.customizations.length > 0) || item.fries || item.onionRings || (item.menuExtras && item.menuExtras.length > 0) || item.freeFriesIncluded ? `
                            <div class="text-sm text-gray-600 bg-green-50 p-2 rounded mb-2">
                                <strong class="text-green-800">Personalizaciones:</strong>
                                <ul class="mt-1 space-y-1">
                                    ${item.customizations ? item.customizations.map(custom => `
                                        <li class="flex justify-between text-xs">
                                            <span>• ${custom.name}</span>
                                            <span class="font-semibold text-green-700">+$${custom.price}</span>
                                        </li>
                                    `).join('') : ''}
                                    ${item.fries ? `
                                        <li class="flex justify-between text-xs">
                                            <span>• Papas ${item.fries.type}</span>
                                            <span class="font-semibold text-green-700">+$${item.fries.price}</span>
                                        </li>
                                    ` : ''}
                                    ${item.onionRings ? `
                                        <li class="flex justify-between text-xs">
                                            <span>• Aros de Cebolla</span>
                                            <span class="font-semibold text-green-700">+$${item.onionRings.price}</span>
                                        </li>
                                    ` : ''}
                                    ${item.menuExtras ? item.menuExtras.map(extra => `
                                        <li class="flex justify-between text-xs">
                                            <span>• ${extra.name} ${extra.quantity > 1 ? `(${extra.quantity})` : ''}</span>
                                            <span class="font-semibold text-green-700">+$${(extra.price * extra.quantity)}</span>
                                        </li>
                                    `).join('') : ''}
                                    ${item.freeFriesIncluded ? `
                                        <li class="flex justify-between text-xs">
                                            <span>• ${item.freeFriesIncluded.name}</span>
                                            <span class="font-semibold text-green-700">GRATIS</span>
                                        </li>
                                    ` : ''}
                                </ul>
                            </div>
                        ` : ''}
                        
                        <div class="flex justify-between items-center mt-3">
                            <div class="flex items-center space-x-3 bg-gray-100 rounded-full p-1">
                                <button onclick="changeQuantity(${index}, -1)" 
                                        class="w-8 h-8 bg-white text-gray-600 rounded-full hover:bg-gray-200 hover:text-gray-800 transition-colors duration-200 flex items-center justify-center shadow-sm">
                                    <i class="fas fa-minus text-sm"></i>
                                </button>
                                <span class="font-bold text-lg min-w-[2rem] text-center">${item.quantity}</span>
                                <button onclick="changeQuantity(${index}, 1)" 
                                        class="w-8 h-8 bg-white text-gray-600 rounded-full hover:bg-gray-200 hover:text-gray-800 transition-colors duration-200 flex items-center justify-center shadow-sm">
                                    <i class="fas fa-plus text-sm"></i>
                                </button>
                            </div>
                            <div class="text-right">
                                <div class="text-xl font-bold text-[#FFB300]">$${(item.price * item.quantity).toFixed(0)}</div>
                                ${item.quantity > 1 ? `<div class="text-xs text-gray-500">$${item.price.toFixed(0)} c/u</div>` : ''}
                            </div>
                        </div>
                    </div>
                    <button onclick="removeFromCart(${index})" 
                            class="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors duration-200">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Update total with animation
        const total = calculateCartTotal();
        cartTotal.textContent = `$${total.toFixed(0)}`;
        
        // Update floating total preview
        if (window.updateTotalPreview) {
            window.updateTotalPreview();
        }
        
        // Add progress bar for free delivery
        addFreeDeliveryProgress(total);
    }
    
    // Add free delivery progress indicator
    function addFreeDeliveryProgress(currentTotal) {
        const freeDeliveryThreshold = 500;
        let progressContainer = document.getElementById('free-delivery-progress');
        
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'free-delivery-progress';
            progressContainer.className = 'bg-gradient-to-r from-green-50 to-emerald-50 p-4 mb-4 rounded-lg border border-green-200';
            
            const cartItems = document.getElementById('cart-items');
            cartItems.parentNode.insertBefore(progressContainer, cartItems);
        }
        
        const remaining = Math.max(0, freeDeliveryThreshold - currentTotal);
        const progress = Math.min(100, (currentTotal / freeDeliveryThreshold) * 100);
        
        if (currentTotal >= freeDeliveryThreshold) {
            progressContainer.innerHTML = `
                <div class="text-center">
                    <div class="flex items-center justify-center space-x-2 text-green-700 font-bold">
                        <i class="fas fa-check-circle text-xl"></i>
                        <span>¡ENVÍO GRATIS desbloqueado! 🚚</span>
                    </div>
                    <p class="text-sm text-green-600 mt-1">Tu pedido califica para envío gratuito</p>
                </div>
            `;
        } else {
            progressContainer.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-semibold text-gray-700">Progreso para ENVÍO GRATIS:</span>
                        <span class="text-sm font-bold text-green-600">$${remaining} restantes</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div class="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-500 relative" 
                             style="width: ${progress}%">
                            <div class="absolute inset-0 bg-white/30 animate-pulse"></div>
                        </div>
                    </div>
                    <p class="text-xs text-gray-600">
                        <i class="fas fa-truck mr-1"></i>
                        Agrega $${remaining} más para obtener envío gratuito
                    </p>
                </div>
            `;
        }
    }
    
    // Enhanced quantity change with animations
    function changeQuantity(index, change) {
        if (cart[index]) {
            const newQuantity = cart[index].quantity + change;
            if (newQuantity <= 0) {
                removeFromCart(index);
                return;
            }
            
            cart[index].quantity = newQuantity;
            updateCart();
            
            // Add subtle animation feedback
            const quantityElement = document.querySelector(`[onclick="changeQuantity(${index}, ${change})"]`);
            if (quantityElement) {
                quantityElement.classList.add('scale-110');
                setTimeout(() => quantityElement.classList.remove('scale-110'), 150);
            }
            
            showSuccessNotification(`Cantidad actualizada 📊`);
        }
    }
    
    // Enhanced remove from cart with confirmation
    function removeFromCart(index) {
        if (cart[index]) {
            const itemName = cart[index].baseItem.name;
            
            // Add confirmation for expensive items
            if (cart[index].price > 100) {
                const confirmModal = document.createElement('div');
                confirmModal.className = 'fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4';
                confirmModal.innerHTML = `
                    <div class="bg-white rounded-lg shadow-xl max-w-sm mx-auto p-6 text-center">
                        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-trash-alt text-red-500 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">¿Remover del carrito?</h3>
                        <p class="text-gray-600 mb-6">¿Estás seguro que quieres remover "${itemName}" de tu pedido?</p>
                        <div class="flex space-x-3">
                            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                                    class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                Cancelar
                            </button>
                            <button onclick="confirmRemove(${index}); this.parentElement.parentElement.parentElement.remove()" 
                                    class="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
                                Remover
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(confirmModal);
            } else {
                confirmRemove(index);
            }
        }
    }
    
    function confirmRemove(index) {
        const itemName = cart[index].baseItem.name;
        cart.splice(index, 1);
        updateCart();
        showSuccessNotification(`${itemName} removido del carrito 🗑️`);
    }
    
    // Initialize all enhancements
    function initializeEnhancements() {
        addDeliveryTimeEstimate();
        enhanceFormValidation();
        window.updateTotalPreview = addOrderTotalPreview();
        // One-time attention nudge for delivery selection
        try {
            if (!sessionStorage.getItem('deliverySelectorHintShown')) {
                const sel = document.getElementById('hero-delivery-selector');
                if (sel) {
                    const hint = document.createElement('div');
                    hint.className = 'absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full shadow-lg';
                    hint.textContent = 'Elige: Recoger en local o Envío a domicilio';
                    sel.style.position = 'relative';
                    sel.appendChild(hint);
                    setTimeout(() => hint.remove(), 3500);
                    sessionStorage.setItem('deliverySelectorHintShown', '1');
                }
            }
        } catch {}
        
        // Monitor admin changes
        monitorAdminChanges();
        
    // Monitor admin changes
    function monitorAdminChanges() {
        // Check for changes in localStorage every 2 seconds
        let lastHiddenProducts = localStorage.getItem('hiddenProducts') || '[]';
        let lastServiceStatus = localStorage.getItem('restaurantServiceActive') || 'true';
        
        setInterval(() => {
            const currentHiddenProducts = localStorage.getItem('hiddenProducts') || '[]';
            const currentServiceStatus = localStorage.getItem('restaurantServiceActive') || 'true';
            
            // Check if service status changed
            if (currentServiceStatus !== lastServiceStatus) {
                if (currentServiceStatus === 'false') {
                    showServiceClosedModal();
                } else {
                    // Reload page if service was reactivated
                    window.location.reload();
                }
                lastServiceStatus = currentServiceStatus;
            }
            
            // Check if hidden products changed
            if (currentHiddenProducts !== lastHiddenProducts) {
                // Reload menu to reflect changes
                renderMenu();
                
                const hiddenCount = JSON.parse(currentHiddenProducts).length;
                if (hiddenCount > 0) {
                    showSuccessNotification(`⚠️ Algunos productos han sido actualizados por el administrador`);
                }
                
                lastHiddenProducts = currentHiddenProducts;
            }
        }, 2000);
    }
    
    // Add intersection observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in-up');
                }
            });
        }, observerOptions);
        
        // Observe menu items for scroll animations
        setTimeout(() => {
            document.querySelectorAll('.bg-white.rounded-lg.shadow-lg').forEach(el => {
                observer.observe(el);
            });
        }, 1000);
    }
    
    // --- Mobile hold-to-preview helpers ---
    function stripHtml(html) {
        return html ? String(html).replace(/<[^>]+>/g, '') : '';
    }

    function findItemById(id) {
        const n = Number(id);
        for (const cat in menuData) {
            const arr = menuData[cat] || [];
            const it = arr.find(i => Number(i.id) === n);
            if (it) return it;
        }
        return null;
    }

    function ensureHoldPreviewOverlay() {
        let overlay = document.getElementById('hold-preview-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'hold-preview-overlay';
            overlay.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center z-50';
            overlay.style.display = 'none';
            overlay.style.overscrollBehavior = 'contain'; // evitar scroll chaining en móvil
            overlay.innerHTML = `
                <div class="relative max-w-sm w-11/12 bg-white rounded-2xl shadow-2xl overflow-hidden" role="dialog" aria-modal="true">
                    <button id="hold-preview-close" aria-label="Cerrar" class="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/70 text-white hover:bg-black focus:outline-none focus:ring-2 focus:ring-white">
                        <span class="text-xl leading-none">×</span>
                    </button>
                    <img id="hold-preview-image" class="w-full h-64 object-cover" alt="Preview">
                    <div class="p-4">
                        <h3 id="hold-preview-title" class="text-lg font-bold mb-1 text-gray-900"></h3>
                        <p id="hold-preview-desc" class="text-gray-600 text-sm"></p>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            // Close on backdrop click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    api.hide();
                }
            });

            // Evitar scroll del body cuando se interactúa con el overlay en móvil
            overlay.addEventListener('touchmove', (e) => {
                // Permitimos scroll interno si el contenido lo requiere más adelante
                // pero prevenimos que burbujee al body
                e.stopPropagation();
            }, { passive: true });
        }
        const imgEl = overlay.querySelector('#hold-preview-image');
        const titleEl = overlay.querySelector('#hold-preview-title');
        const descEl = overlay.querySelector('#hold-preview-desc');
        const closeBtn = overlay.querySelector('#hold-preview-close');

        const api = {
            show(item) {
                if (!item) return;
                const url = (item.image || '').trim();
                if (url) {
                    imgEl.style.display = '';
                    imgEl.src = url;
                } else {
                    imgEl.style.display = 'none';
                    imgEl.removeAttribute('src');
                }
                titleEl.textContent = item.name || '';
                descEl.textContent = stripHtml(item.description || '');
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
                // Bloquear scroll de fondo
                try {
                    overlay.dataset.prevOverflowBody = document.body.style.overflow || '';
                    overlay.dataset.prevOverflowHtml = document.documentElement.style.overflow || '';
                    document.body.style.overflow = 'hidden';
                    document.documentElement.style.overflow = 'hidden';
                    document.body.style.touchAction = 'none';
                } catch (_) {}
                // Trap simple focus to the close button
                try { closeBtn.focus(); } catch(_) {}
            },
            hide() {
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
                // Restaurar scroll de fondo
                try {
                    document.body.style.overflow = overlay.dataset.prevOverflowBody || '';
                    document.documentElement.style.overflow = overlay.dataset.prevOverflowHtml || '';
                    document.body.style.touchAction = '';
                } catch (_) {}
            }
        };

        if (closeBtn && !closeBtn._bound) {
            closeBtn.addEventListener('click', () => api.hide());
            closeBtn._bound = true;
            // ESC to close
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') api.hide();
            });
        }

        return api;
    }

    function attachImagePreviewListeners() {
        // Use event delegation to handle dynamic content
        if (window.__imagePreviewBound) return;
        window.__imagePreviewBound = true;
        const overlay = ensureHoldPreviewOverlay();
        document.addEventListener('click', (e) => {
            const img = e.target.closest('img[data-item-id]');
            if (!img) return;
            // Ignore if clicking on buttons inside the card
            if (e.target.closest('button')) return;
            const id = img.getAttribute('data-item-id');
            const item = findItemById(id);
            if (item) {
                overlay.show(item);
            }
        });
    }

    // Enhanced renderMenu with mobile-first responsive design
    function renderMenu() {
        // Record open categories and scroll position to restore after re-render
        const openCategories = Array.from(document.querySelectorAll('.category-section'))
            .map(sec => ({
                category: sec.getAttribute('data-category'),
                isOpen: !sec.querySelector('.menu-grid, .menu-grid-mobile')?.classList.contains('hidden')
            }))
            .filter(x => x.isOpen)
            .map(x => x.category);
        const prevScrollY = window.scrollY;
        // Usar el nodo real para evitar depender del orden de inicialización de variables (TDZ)
        const menuCategoriesEl = document.getElementById('menu-categories');
        if (!menuCategoriesEl) return;
        // Si el contenedor está oculto por el gate, no renderizamos para evitar trabajo innecesario
        if (menuCategoriesEl.classList.contains('hidden')) return;
        menuCategoriesEl.innerHTML = '';
        
        // Detect if user is on mobile
        const isMobile = window.innerWidth <= 640;
        
        const orderedCategories = MENU_CATEGORY_ORDER.filter(cat => menuData[cat])
            .concat(Object.keys(menuData).filter(cat => !MENU_CATEGORY_ORDER.includes(cat)));

        for (const category of orderedCategories) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-section';
            categoryDiv.dataset.category = category;
            
            // Enhanced category header with icons and descriptions
            const categoryIcons = {
                'Hamburguesas': '🍔',
                'Hot Dogs': '🌭',
                'Combos': '🍽️',
                'Extras': '🍟',
                'Bebidas': '🥤'
            };
            
            const categoryDescriptions = {
                'Hamburguesas': 'Nuestras hamburguesas artesanales hechas con amor',
                'Hot Dogs': 'Hotdogs gourmet con ingredientes premium',
                'Combos': 'Combos diseñados para compartir y ahorrar',
                'Extras': 'Acompañamientos perfectos para tu pedido',
                'Bebidas': 'Refrescos helados para completar tu experiencia'
            };
            
            categoryDiv.innerHTML = `
                <div class="text-center mb-5 sm:mb-8 category-header-mobile">
                    <div data-category-header="${category}" class="glass-effect inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-3xl mb-2 sm:mb-3 cursor-pointer select-none shadow-lg hover:shadow-xl transition-all duration-300 group">
                        <span class="text-2xl sm:text-3xl">${categoryIcons[category] || '🍔'}</span>
                        <h3 class="text-xl sm:text-3xl font-bold font-poppins text-gray-900 tracking-tight">${category}</h3>
                        <span class="ml-1 inline-flex items-center justify-center text-xs sm:text-sm font-bold text-gray-700 bg-black/5 px-2.5 py-1 rounded-full">
                            ${(Array.isArray(menuData[category]) ? menuData[category].filter(i => i && !i.hidden && !isProductHidden(i.id)).length : 0)}
                        </span>
                        <i class="fas fa-chevron-down text-gray-600 ml-1 transition-transform duration-300"></i>
                    </div>
                    <p class="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">${categoryDescriptions[category] || ''}</p>
                </div>
            `;
            
            const grid = document.createElement('div');
            // Different layout for mobile vs desktop
            if (isMobile) {
                // Bento-like compact grid on mobile (2 columns)
                grid.className = 'grid grid-cols-2 gap-3 sm:gap-4 menu-grid-mobile container-mobile';
            } else {
                // Bento grid (12 columns) on desktop for a premium app-like layout
                grid.className = 'grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 auto-rows-fr menu-grid';
            }
            // Inicialmente oculto: se mostrará al hacer clic en el encabezado de la categoría
            grid.classList.add('hidden');
            
            menuData[category].forEach((originalItem, index) => {
                if(originalItem.hidden) return;
                
                // Check if product is hidden by admin
                if(isProductHidden(originalItem.id)) return;
                
                // Apply daily promotion
                const item = applyDailyPromotion(originalItem, category);

                // One featured card per category on desktop to create a bento feel
                const isFeatured = !isMobile && index === 0;
                const bentoSpanClass = isMobile
                    ? ''
                    : (isFeatured
                        ? 'col-span-12 sm:col-span-6 lg:col-span-8 xl:col-span-6 lg:row-span-2'
                        : 'col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3');
                
                // Enhanced button logic with better responsive design
                let buttonHtml;
                // Consider items named like combos as combos too
                const looksLikeCombo = /\bcombo\b/i.test(item.name || '');
                if (item.isCombo || looksLikeCombo) {
                    buttonHtml = `
                        <button data-id="${item.id}" class="choose-combo-btn w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-3 sm:px-6 py-2 sm:py-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-base hover:from-green-600 hover:to-green-700 transform hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl">
                            <i class="fas fa-cogs mr-1 sm:mr-2"></i>Personalizar
                        </button>
                    `;
                } else if (item.customizable) {
                    buttonHtml = `
                        <button data-id="${item.id}" class="customize-btn w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-3 sm:px-6 py-2 sm:py-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-base hover:from-green-600 hover:to-green-700 transform hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl">
                            <i class="fas fa-magic mr-1 sm:mr-2"></i>Personalizar
                        </button>
                    `;
                } else {
                    buttonHtml = `
                        <button data-id="${item.id}" class="add-to-cart-btn w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-3 sm:px-6 py-2 sm:py-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-base hover:from-green-600 hover:to-green-700 transform hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95">
                            Personalizar
                        </button>
                    `;
                }
                
                // Enhanced price display with better visual hierarchy
                let priceHtml;
                
                if (item.isCombo) {
                    const realPrice = calculateComboRealPrice(item);
                    const savings = realPrice - item.price;
                    priceHtml = `
                        <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                            <div class="text-center">
                                <div class="text-sm text-gray-500 line-through mb-1">Original: $${realPrice.toFixed(0)}</div>
                                <div class="text-2xl font-bold text-green-600 mb-1">Combo: $${item.price.toFixed(0)}</div>
                                <div class="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                                    ¡Ahorras $${savings.toFixed(0)}!
                                </div>
                            </div>
                        </div>
                    `;
                } else if (item.originalPrice && item.originalPrice > item.price) {
                    const savings = item.originalPrice - item.price;
                    priceHtml = `
                        <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                            <div class="text-center">
                                <div class="text-lg text-gray-500 line-through mb-1">$${item.originalPrice.toFixed(0)}</div>
                                <div class="text-3xl font-bold text-green-700 mb-1">$${item.price.toFixed(0)}</div>
                                <div class="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                                    ¡Ahorras $${savings.toFixed(0)}!
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    priceHtml = `
                        <div class="text-center p-3">
                            <div class="text-3xl font-bold text-gray-800">$${item.price.toFixed(0)}</div>
                            <div class="text-sm text-gray-500">Precio regular</div>
                        </div>
                    `;
                }
                
                // Enhanced description processing
                let processedDescription = item.description;
                if (item.description.includes('ENVÍO GRATIS')) {
                    processedDescription = item.description.replace(
                        'ENVÍO GRATIS',
                        '<span class="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse inline-block mt-2">🚚 ENVÍO GRATIS</span>'
                    );
                }
                
                // Multiple badge system - Mobile responsive
                let badges = '';
                let mobileInlineBadges = '';
                
                if (item.hasPromotion) {
                    badges += `<div class="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse z-10 shadow-lg">🎉 OFERTA</div>`;
                    mobileInlineBadges += `<span class="inline-block bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse mr-1 mb-1">🎉 OFERTA</span>`;
                }
                if ([1, 2, 6, 15].includes(item.id)) {
                    // Solo mantenemos el badge inline que SÍ parpadea (el que encerraste)
                    mobileInlineBadges += `<span class="inline-block bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold mr-1 mb-1 animate-pulse">🔥 POPULAR</span>`;
                }
                if (item.isCombo || (item.originalPrice && item.originalPrice > item.price)) {
                    badges += `<div class="absolute top-8 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold z-10 shadow-lg">💰 AHORRO</div>`;
                    mobileInlineBadges += `<span class="inline-block bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold mr-1 mb-1">💰 AHORRO</span>`;
                }
                
                // Create different card layouts for mobile vs desktop
                let cardHtml;
                
                if (isMobile) {
                    // Mobile layout - vertical tile (grid 2-3 cols)
                    const mobileBtn = (item.isCombo || looksLikeCombo)
                        ? `<button data-id="${item.id}" class="choose-combo-btn w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 rounded-lg font-bold text-xs">Personalizar</button>`
                        : item.customizable
                            ? `<button data-id="${item.id}" class="customize-btn w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 rounded-lg font-bold text-xs">Personalizar</button>`
                            : `<button data-id="${item.id}" class="add-to-cart-btn w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 rounded-lg font-bold text-xs">Personalizar</button>`;

                    cardHtml = `
                        <div class="group bg-white rounded-xl shadow-md overflow-hidden relative border border-gray-100 hover:shadow-lg hover:border-yellow-300 menu-card menu-card-mobile transition-all duration-300" 
                             style="animation-delay: ${index * 50}ms;">
                            
                            <!-- Image -->
                                                        <div class="menu-card-image-mobile relative overflow-hidden bg-gray-100 ${item.image ? 'sr-skeleton' : ''}">
                                                                                                                                    ${item.image ? `<img src="${item.image}" alt="[Imagen de ${item.name}]" class="w-full h-full object-cover sr-img-init" data-sr-img="1" data-item-id="${item.id}" loading="lazy" decoding="async" fetchpriority="low" referrerpolicy="no-referrer" onerror="this.onerror=null;this.style.display='none';">` : ''}
                            </div>
                            
                            <!-- Content -->
                            <div class="menu-card-content-mobile">
                                ${mobileInlineBadges ? `<div class=\"mb-1\">${mobileInlineBadges}</div>` : ''}
                                <h4 class="font-bold text-gray-900 text-sm leading-snug line-clamp-2">${item.name}</h4>
                                <div class="text-yellow-600 font-extrabold text-base">$${item.price.toFixed(0)}</div>
                                ${item.hasPromotion ? `<div class=\"text-[10px] text-red-600 font-bold\">${item.promotionText}</div>` : ''}
                                ${mobileBtn}
                            </div>
                        </div>
                    `;
                } else {
                    // Desktop layout - vertical card
                    cardHtml = `
                        <div class="group bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col transform hover:-translate-y-3 transition-all duration-500 relative border border-gray-100 hover:shadow-2xl hover:border-yellow-300 menu-card" 
                             style="animation-delay: ${index * 100}ms;">
                            ${badges}
                            
                            <!-- Image container with hover effects -->
                            <div class="relative overflow-hidden bg-gray-100 h-48 sm:h-56 md:h-64 ${item.image ? 'sr-skeleton' : ''}">
                                                    ${item.image ? `<img src="${item.image}" alt="[Imagen de ${item.name}]" class="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 sr-img-init" data-sr-img="1" data-item-id="${item.id}" loading="lazy" decoding="async" fetchpriority="low" referrerpolicy="no-referrer" onerror="this.onerror=null;this.style.display='none';">` : ''}
                                
                                <!-- Overlay on hover -->
                                <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <div class="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                        <i class="fas fa-eye text-white text-2xl"></i>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Content -->
                            <div class="p-4 sm:p-6 flex flex-col flex-grow space-y-3 sm:space-y-4">
                                <!-- Title and description -->
                                <div class="flex-grow">
                                    <h4 class="text-lg sm:text-xl font-bold mb-2 text-gray-900 group-hover:text-yellow-600 transition-colors duration-300">
                                        ${item.name}
                                    </h4>
                                    <p class="text-gray-600 text-sm leading-relaxed line-clamp-3">
                                        ${processedDescription}
                                    </p>
                                </div>
                                
                                <!-- Promotion banner -->
                                ${item.hasPromotion ? `
                                    <div class="bg-gradient-to-r from-red-500 to-pink-500 text-white p-2 sm:p-3 rounded-lg text-center shadow-lg">
                                        <div class="font-bold text-xs sm:text-sm animate-pulse">${item.promotionText}</div>
                                    </div>
                                ` : ''}
                                
                                <!-- Price section -->
                                ${priceHtml}
                                
                                <!-- Action button -->
                                <div class="pt-2">
                                    ${buttonHtml}
                                </div>
                            </div>
                        </div>
                    `;
                }
                
                grid.innerHTML += cardHtml;
            });
            
            categoryDiv.appendChild(grid);
            menuCategoriesEl.appendChild(categoryDiv);
        }
        
    // Initialize enhancements after rendering
        setTimeout(() => {
            addUrgencyIndicators();
            addSocialProof();
            initializeEnhancements();
            attachImagePreviewListeners();
            // Restore previously open categories
            if (openCategories.length) {
                openCategories.forEach(cat => {
                    const section = document.querySelector(`.category-section[data-category="${cat}"]`);
                    const grid = section?.querySelector('.menu-grid, .menu-grid-mobile');
                    const chevron = section?.querySelector('.fa-chevron-down');
                    if (grid) grid.classList.remove('hidden');
                    if (chevron) chevron.style.transform = 'rotate(180deg)';
                });
                // Restore scroll to reduce perceived jumps
                window.scrollTo({ top: prevScrollY, behavior: 'instant' });
            }
        }, 500);
    }
    
    // Add window resize listener for responsive updates (stable on mobile)
    (function() {
        let lastIsMobile = window.innerWidth <= 640;
        window.addEventListener('resize', () => {
            clearTimeout(window.resizeTimeout);
                    // Mobile layout - compact bento tile (2 cols)
                const isMobileNow = window.innerWidth <= 640;
                // Solo re-render si cambiamos de modo móvil a desktop o viceversa
                if (isMobileNow !== lastIsMobile) {
                    lastIsMobile = isMobileNow;
                    renderMenu();
                }
            }, 250);
                        <article class="group bg-white rounded-3xl shadow-md overflow-hidden relative border border-gray-100 hover:shadow-xl hover:border-yellow-300 menu-card menu-card-mobile transition-all duration-300 hover:-translate-y-0.5"
                             style="animation-delay: ${index * 50}ms;">
                            <div class="relative overflow-hidden bg-gray-100">
                                  ${item.image ? `<img src="${item.image}"
                                      alt="[Imagen de ${item.name}]"
                                      class="w-full h-36 object-cover transition-transform duration-500 group-hover:scale-105"
                                      data-item-id="${item.id}"
                                      loading="lazy" referrerpolicy="no-referrer"
                                      onerror="this.onerror=null;this.style.display='none';">` : ''}
                                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"></div>
                                <div class="absolute bottom-2 left-2 right-2">
                                    ${mobileInlineBadges ? `<div class=\"mb-1\">${mobileInlineBadges}</div>` : ''}
                                    <div class="flex items-end justify-between gap-2">
                                        <h4 class="font-bold font-poppins text-white text-sm leading-snug line-clamp-2 drop-shadow">${item.name}</h4>
                                        <div class="shrink-0 bg-white/90 text-gray-900 font-black text-sm px-2.5 py-1 rounded-full">$${item.price.toFixed(0)}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="p-3 space-y-2">
                                ${item.hasPromotion ? `<div class=\"text-[11px] text-red-600 font-bold\">${item.promotionText}</div>` : ''}
                                <p class="text-xs text-gray-600 leading-snug line-clamp-2">${processedDescription}</p>
                                ${mobileBtn}
                            </div>
                        </article>
                        if (g !== grid) g.classList.add('hidden');
                    });
                    // Desktop layout - bento card
                    if (chevron) chevron.style.transform = 'rotate(180deg)';
                        <article class="${bentoSpanClass} group bg-white rounded-3xl shadow-lg overflow-hidden flex flex-col border border-gray-100 hover:border-yellow-300 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                             style="animation-delay: ${index * 90}ms;">
                            <div class="relative overflow-hidden bg-gray-100 ${isFeatured ? 'h-64 sm:h-72 md:h-80 lg:h-full' : 'h-52 sm:h-56 md:h-60'}">
                                ${badges}
                                  ${item.image ? `<img src="${item.image}"
                                      alt="[Imagen de ${item.name}]"
                                      class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                      data-item-id="${item.id}"
                                      loading="lazy" referrerpolicy="no-referrer"
                                      onerror="this.onerror=null;this.style.display='none';">` : ''}
                                <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>

                                <div class="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                                    <div class="flex items-end justify-between gap-3">
                                        <h4 class="font-poppins font-extrabold text-white ${isFeatured ? 'text-2xl sm:text-3xl' : 'text-xl'} leading-tight drop-shadow">
                                            ${item.name}
                                        </h4>
                                        <div class="shrink-0 bg-white/90 text-gray-900 font-black ${isFeatured ? 'text-xl' : 'text-lg'} px-3 py-1.5 rounded-full">
                                            $${item.price.toFixed(0)}
                                        </div>
                                    </div>
                                    <div class="mt-2 flex items-center gap-2 text-white/90 text-xs">
                                        <span class="bg-white/15 border border-white/20 backdrop-blur-md px-2.5 py-1 rounded-full">Toca para ver imagen</span>
                                        ${(item.isCombo || looksLikeCombo) ? '<span class="bg-green-500/80 px-2.5 py-1 rounded-full font-bold">Combo</span>' : ''}
                                    </div>
                                </div>
                            </div>

                            <div class="p-4 sm:p-5 flex flex-col gap-3">
                                <p class="text-gray-600 text-sm leading-relaxed ${isFeatured ? 'line-clamp-4' : 'line-clamp-3'}">
                                    ${processedDescription}
                                </p>

                                ${item.hasPromotion ? `
                                    <div class="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-2 rounded-2xl text-center shadow-lg">
                                        <div class="font-bold text-sm animate-pulse">${item.promotionText}</div>
                                    </div>
                                ` : ''}

                                ${isFeatured ? priceHtml : ''}

                                <div class="pt-1">
                                    ${buttonHtml}
                                </div>
                            </div>
                        </article>

                    const checkoutPickup = document.querySelector('input[name="delivery-type"][value="pickup"]');
                    const checkoutDelivery = document.querySelector('input[name="delivery-type"][value="delivery"]');
                    if (val === 'pickup' && checkoutPickup) checkoutPickup.checked = true;
                    if (val === 'delivery' && checkoutDelivery) checkoutDelivery.checked = true;
                    const evt = new Event('change', { bubbles: true });
                    const targetRadio = val === 'delivery' ? checkoutDelivery : checkoutPickup;
                    if (targetRadio) targetRadio.dispatchEvent(evt);
                }
            });
        }
        // Event listener para los botones de añadir al carrito
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart-btn')) {
                const itemId = parseInt(e.target.dataset.id);
                addToCart(itemId);
            }
        });
        
        // Event listener para los botones de personalizar
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('customize-btn')) {
                const itemId = parseInt(e.target.dataset.id);
                openCustomizationModal({ isCombo: false, itemId });
            }
        });
        
        // Event listener para los botones de elegir combo
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('choose-combo-btn')) {
                const comboId = parseInt(e.target.dataset.id);
                openComboModal(comboId);
            }
        });

        // Skeleton/fade-in para imágenes (capturing porque load/error no bubbean)
        const __srMarkImgLoaded = (img) => {
            if (!img) return;
            img.classList.remove('sr-img-init');
            img.classList.add('sr-img-loaded');
            const shell = img.closest('.sr-skeleton');
            if (shell) shell.classList.remove('sr-skeleton');
        };
        document.addEventListener('load', (e) => {
            const img = e.target;
            if (!img || img.tagName !== 'IMG') return;
            if (img.dataset && img.dataset.srImg === '1') {
                __srMarkImgLoaded(img);
            }
        }, true);
        document.addEventListener('error', (e) => {
            const img = e.target;
            if (!img || img.tagName !== 'IMG') return;
            if (img.dataset && img.dataset.srImg === '1') {
                const shell = img.closest('.sr-skeleton');
                if (shell) shell.classList.remove('sr-skeleton');
            }
        }, true);

        // Si alguna imagen ya estaba en caché y cargó antes del listener
        try {
            document.querySelectorAll('img[data-sr-img="1"]').forEach((img) => {
                if (img && img.complete && img.naturalWidth > 0) __srMarkImgLoaded(img);
            });
        } catch (_) {}

        // Event listener para los botones de combo en el modal de promociones
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('promo-combo-btn')) {
                const comboId = parseInt(e.target.dataset.comboId);
                // Cerrar modal de promociones primero
                document.getElementById('promotions-modal').classList.add('hidden');
                // Abrir modal de configuración del combo
                openComboModal(comboId);
            }
        });

        // Event listener para el botón "Ver Todos los Combos"
        document.addEventListener('click', (e) => {
            if (e.target.id === 'scroll-to-combos') {
                // Cerrar modal de promociones
                document.getElementById('promotions-modal').classList.add('hidden');
                // Hacer scroll a la sección de combos
                const combosSection = document.querySelector('[data-category="Combos"]');
                if (combosSection) {
                    combosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
        
        // Abrir carrito
        openCartBtn.addEventListener('click', openCart);
        
        // Cerrar carrito
        closeCartBtn.addEventListener('click', () => {
            cartSidebar.classList.add('translate-x-full');
            cartOverlay.classList.add('hidden');
        });
        
        // Cerrar carrito al hacer clic en el overlay
        cartOverlay.addEventListener('click', () => {
            cartSidebar.classList.add('translate-x-full');
            cartOverlay.classList.add('hidden');
        });
        
        // Cerrar modal de combo
        closeComboModalBtn.addEventListener('click', closeComboModal);
        
        // Event listener para navegar entre hamburguesas del combo
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.prev-burger-btn, .next-burger-btn');
            if (!btn) return;

            const choiceIndex = parseInt(btn.dataset.choiceIndex, 10);
            if (!Number.isFinite(choiceIndex)) return;

            const direction = btn.classList.contains('next-burger-btn') ? 'next' : 'prev';
            navigateBurger(choiceIndex, direction);
        });
        
        // Event listener para navegar entre hotdogs del combo
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.prev-hotdog-btn, .next-hotdog-btn');
            if (!btn) return;

            const hotdogIndex = parseInt(btn.dataset.hotdogIndex, 10);
            if (!Number.isFinite(hotdogIndex)) return;

            const direction = btn.classList.contains('next-hotdog-btn') ? 'next' : 'prev';
            navigateHotdog(hotdogIndex, direction);
        });
        
        // Event listener para personalizar hamburguesa dentro de combo
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('combo-customize-btn')) {
                const choiceIndex = parseInt(e.target.closest('[data-choice-index]').dataset.choiceIndex);
                openCustomizationModal({ isCombo: true, choiceIndex });
            }
        });
        
        // Event listener para personalizar hotdog dentro de combo
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('hotdog-customize-btn')) {
                const hotdogIndex = parseInt(e.target.dataset.hotdogIndex);
                openCustomizationModal({ isCombo: true, isHotdog: true, hotdogIndex });
            }
        });
        
        // Event listener para cambio de tipo de papas en combos
        document.addEventListener('change', (e) => {
            if (e.target.name === 'combo-fries-type') {
                tempComboConfig.includedFries.type = e.target.value;
                
                // Actualizar estilos visuales
                document.querySelectorAll('input[name="combo-fries-type"]').forEach(radio => {
                    const label = radio.closest('label');
                    if (radio.checked) {
                        label.classList.add('bg-[#FFB300]/10', 'border-[#FFB300]');
                    } else {
                        label.classList.remove('bg-[#FFB300]/10', 'border-[#FFB300]');
                    }
                });
            }
        });
        
        // Cerrar modal de personalización
        closeCustomModalBtn.addEventListener('click', closeCustomizationModal);
        
        // Event listeners para modal de promociones
        promotionsBtn.addEventListener('click', () => {
            promotionsModal.classList.remove('hidden');
            promotionsModal.classList.add('flex');
            // Inicializar las tabs móviles al abrir el modal
            setTimeout(() => {
                updateDailyPromotions(); // Actualizar promociones antes de mostrar
                showMobilePromo('daily');
            }, 100);
        });
        
        closePromotionsModalBtn.addEventListener('click', () => {
            promotionsModal.classList.add('hidden');
            promotionsModal.classList.remove('flex');
        });
        
        // Cerrar modal de promociones al hacer clic fuera
        promotionsModal.addEventListener('click', (e) => {
            if (e.target === promotionsModal) {
                promotionsModal.classList.add('hidden');
                promotionsModal.classList.remove('flex');
            }
        });

        // Event listeners para menú móvil
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        const closeMobileMenuBtn = document.getElementById('close-mobile-menu');
        const mobilePromotionsBtn = document.getElementById('mobile-promotions-btn');

        // Abrir menú móvil
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.remove('-translate-x-full');
            mobileMenu.classList.add('translate-x-0');
            mobileMenuOverlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });

        // Cerrar menú móvil
        function closeMobileMenu() {
            mobileMenu.classList.add('-translate-x-full');
            mobileMenu.classList.remove('translate-x-0');
            mobileMenuOverlay.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }

        closeMobileMenuBtn.addEventListener('click', closeMobileMenu);
        mobileMenuOverlay.addEventListener('click', closeMobileMenu);

        // Botón de promociones en menú móvil
        mobilePromotionsBtn.addEventListener('click', () => {
            closeMobileMenu(); // Cerrar menú móvil primero
            setTimeout(() => {
                promotionsModal.classList.remove('hidden');
                promotionsModal.classList.add('flex');
                // Inicializar las tabs móviles al abrir el modal
                setTimeout(() => {
                    updateDailyPromotions(); // Actualizar promociones antes de mostrar
                    showMobilePromo('daily');
                }, 100);
            }, 300); // Esperar a que se cierre el menú móvil
        });

        // Cerrar menú móvil al hacer clic en enlaces de navegación
        document.querySelectorAll('#mobile-menu a[href^="#"]').forEach(link => {
            link.addEventListener('click', () => {
                closeMobileMenu();
            });
        });
        
        // Event listeners para los checkboxes y controles en el modal de personalización
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('topping-checkbox') || 
                e.target.id === 'add-fries-checkbox' || 
                e.target.id === 'add-onion-rings-checkbox' ||
                e.target.classList.contains('menu-extra-checkbox')) {
                
                // Actualizar estados visuales
                if (e.target.classList.contains('topping-checkbox')) {
                    updateToppingsVisualState();
                } else if (e.target.id === 'add-fries-checkbox') {
                    updateFriesVisualState();
                } else if (e.target.classList.contains('menu-extra-checkbox')) {
                    updateMenuExtrasVisualState();
                }
                
                // Actualizar precio
                updateCustomModalPrice();
            }
        });
        
        // Event listeners para los botones de cantidad en extras del menú
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quantity-plus') || e.target.classList.contains('quantity-minus')) {
                const itemId = e.target.dataset.id;
                const displayElement = document.querySelector(`.quantity-display[data-id="${itemId}"]`);
                let quantity = parseInt(displayElement.textContent);
                
                if (e.target.classList.contains('quantity-plus')) {
                    quantity++;
                } else if (quantity > 1) {
                    quantity--;
                }
                
                displayElement.textContent = quantity;
                updateCustomModalPrice();
            }
        });
        
        // Event listener para añadir al carrito desde el modal de personalización
        addCustomToCartBtn.addEventListener('click', () => {
            const context = JSON.parse(addCustomToCartBtn.dataset.context || '{}');
            const { isCombo, itemId, choiceIndex, isHotdog, hotdogIndex } = context;
            
            // Recopilar personalizaciones seleccionadas
            const customizations = [];
            document.querySelectorAll('.topping-checkbox:checked').forEach(checkbox => {
                customizations.push({
                    name: checkbox.dataset.name,
                    price: parseFloat(checkbox.dataset.price)
                });
            });
            
            // Recopilar acompañamientos
            const friesRequested = Boolean(addFriesCheckbox.checked);
            const selectedFriesType = friesRequested
                ? document.querySelector('input[name="fries-type"]:checked')?.value
                : null;

            let fries = null;
            let freeFriesIncluded = null;
            
            let onionRings = null;
            if (document.getElementById('add-onion-rings-checkbox').checked) {
                onionRings = {
                    price: ONION_RINGS_PRICE
                };
            }
            
            // Recopilar extras del menú
            const menuExtras = [];
            document.querySelectorAll('.menu-extra-checkbox:checked').forEach(checkbox => {
                const extraId = parseInt(checkbox.dataset.id);
                const quantity = parseInt(document.querySelector(`.quantity-display[data-id="${extraId}"]`)?.textContent || '1');
                
                menuExtras.push({
                    id: extraId,
                    name: checkbox.dataset.name,
                    price: parseFloat(checkbox.dataset.price),
                    quantity: quantity
                });
            });
            
            if (isCombo) {
                fries = friesRequested ? { type: selectedFriesType, price: FRIES_PRICE } : null;
                if (isHotdog) {
                    // Actualizar configuración del hotdog en el combo
                    tempComboConfig.hotdogs[hotdogIndex].customizations = customizations;
                    tempComboConfig.hotdogs[hotdogIndex].fries = fries;
                    tempComboConfig.hotdogs[hotdogIndex].onionRings = onionRings;
                    tempComboConfig.hotdogs[hotdogIndex].menuExtras = menuExtras;
                    
                    // Actualizar el resumen de personalización en el modal de combo
                    const summaryEl = document.querySelector(`[data-hotdog-index="${hotdogIndex}"] .customizations-summary`);
                    let summaryText = [];
                    
                    if (customizations.length > 0) {
                        summaryText.push(`${customizations.length} ingredientes extra`);
                    }
                    
                    if (fries) {
                        summaryText.push(`Papas ${fries.type}`);
                    }
                    
                    if (onionRings) {
                        summaryText.push('Aros de Cebolla');
                    }
                    
                    if (menuExtras.length > 0) {
                        summaryText.push(`${menuExtras.length} extras del menú`);
                    }
                    
                    summaryEl.textContent = summaryText.length > 0 ? summaryText.join(', ') : 'Sin personalización.';
                } else {
                    // Actualizar configuración de la hamburguesa en el combo
                    tempComboConfig.choices[choiceIndex].customizations = customizations;
                    tempComboConfig.choices[choiceIndex].fries = fries;
                    tempComboConfig.choices[choiceIndex].onionRings = onionRings;
                    tempComboConfig.choices[choiceIndex].menuExtras = menuExtras;
                    
                    // Actualizar el resumen de personalización en el modal de combo
                    const summaryEl = document.querySelector(`[data-choice-index="${choiceIndex}"] .customizations-summary`);
                    let summaryText = [];
                    
                    if (customizations.length > 0) {
                        summaryText.push(`${customizations.length} ingredientes extra`);
                    }
                    
                    if (fries) {
                        summaryText.push(`Papas ${fries.type}`);
                    }
                    
                    if (onionRings) {
                        summaryText.push('Aros de Cebolla');
                    }
                    
                    if (menuExtras.length > 0) {
                        summaryText.push(`${menuExtras.length} extras del menú`);
                    }
                    
                    summaryEl.textContent = summaryText.length > 0 ? summaryText.join(', ') : 'Sin personalización.';
                }
                
                // Actualizar el precio total del combo
                updateComboModalTotal();
            } else {
                // Añadir el producto personalizado al carrito
                const originalItem = findItemById(itemId);
                if (!originalItem) return;

                // Determinar categoría y aplicar promoción diaria también al item personalizado
                const category = getCategoryForItemId(itemId);
                const item = applyDailyPromotion(originalItem, category);

                if (friesRequested) {
                    const isFreeFriesEligible = Boolean(item.freeFries) && isFreeFriesPromotionActiveForCategory(category);
                    if (isFreeFriesEligible) {
                        freeFriesIncluded = {
                            name: getFreeFriesDisplayNameByType(selectedFriesType),
                            price: 0
                        };
                        fries = null;
                    } else {
                        fries = {
                            type: selectedFriesType,
                            price: FRIES_PRICE
                        };
                    }
                }
                
                const cartItem = {
                    id: Date.now(), // ID único para el carrito
                    baseItem: item,
                    customizations,
                    fries,
                    onionRings,
                    menuExtras,
                    freeFriesIncluded,
                    price: parseFloat(customModalTotal.textContent.replace('$', '')),
                    quantity: 1,
                    hasPromotion: item.hasPromotion || false,
                    promotionText: item.promotionText || '',
                    freeFries: item.freeFries || false
                };
                
                cart.push(cartItem);
                updateCart();
                openCart();
            }
            
            closeCustomizationModal();
        });
        
        // Event listener para añadir combo al carrito
        addComboToCartBtn.addEventListener('click', () => {
            const comboItem = {
                id: Date.now(), // ID único para el carrito
                baseItem: tempComboConfig.baseCombo,
                choices: JSON.parse(JSON.stringify(tempComboConfig.choices)), // Deep copy
                hotdogs: tempComboConfig.hotdogs ? JSON.parse(JSON.stringify(tempComboConfig.hotdogs)) : null, // Deep copy de hotdogs si existen
                includedFries: JSON.parse(JSON.stringify(tempComboConfig.includedFries)), // Deep copy de las papas incluidas
                price: parseFloat(comboModalTotal.textContent.replace('$', '')),
                quantity: 1,
                isCombo: true
            };
            
            cart.push(comboItem);
            updateCart();
            closeComboModal();
            openCart();
        });

        // Event listener para tipo de entrega
        document.addEventListener('change', (e) => {
            if (e.target.name === 'delivery-type') {
                const locationSection = document.getElementById('location-section');
                
                if (e.target.value === 'delivery') {
                    locationSection.classList.remove('hidden');
                } else {
                    locationSection.classList.add('hidden');
                    userAddress = null;
                }
                
                validateCheckoutForm();
            }
        });

        // Checkout
        checkoutBtn.addEventListener('click', () => {
            checkoutModal.classList.add('flex');
            checkoutModal.classList.remove('hidden');
            renderOrderSummary();
            updateCheckoutTotals(); // Nueva función para actualizar totales
            handlePaymentMethodChange(); // Configurar método de pago inicial
            validateCheckoutForm();
        });

        // Cerrar modal de checkout
        closeModalBtn.addEventListener('click', () => {
            checkoutModal.classList.add('hidden');
            checkoutModal.classList.remove('flex');
        });

        // Validación en tiempo real para los campos del formulario
        customerNameInput.addEventListener('input', validateCheckoutForm);
        customerNameInput.addEventListener('blur', validateCheckoutForm);
        
        const phoneInput = document.getElementById('customer-phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', validateCheckoutForm);
            phoneInput.addEventListener('blur', validateCheckoutForm);
        }
        
        const addressInput = document.getElementById('address-input');
        if (addressInput) {
            addressInput.addEventListener('input', validateCheckoutForm);
            addressInput.addEventListener('blur', validateCheckoutForm);
        }
        
        const cashAmountInput = document.getElementById('cash-amount');
        if (cashAmountInput) {
            cashAmountInput.addEventListener('input', () => {
                calculateChange();
                validateCheckoutForm();
            });
            cashAmountInput.addEventListener('blur', () => {
                calculateChange();
                validateCheckoutForm();
            });
        }
        
        // Validación cuando cambian los radio buttons
        document.addEventListener('change', (e) => {
            if (e.target.name === 'payment') {
                handlePaymentMethodChange();
                validateCheckoutForm();
            }
            if (e.target.name === 'delivery-type') {
                updateCheckoutTotals(); // Actualizar totales cuando cambie el tipo de entrega
                calculateChange(); // Recalcular cambio con el nuevo total
                validateCheckoutForm();
            }
        });

        // Confirmación de pedido: enviar a backend (Twilio) y mostrar confirmación
        sendWhatsappBtn.addEventListener('click', async () => {
            // Bloquear botón y mostrar loading
            const originalHtml = sendWhatsappBtn.innerHTML;
            sendWhatsappBtn.disabled = true;
            sendWhatsappBtn.classList.add('loading');
            sendWhatsappBtn.innerHTML = '<span class="loading-spinner mr-2"></span> Enviando...';

            try {
                // Construir payload igual que addToOrderControl
                const deliveryTypeElement = document.querySelector('input[name="delivery-type"]:checked');
                const paymentMethodElement = document.querySelector('input[name="payment"]:checked');
                const customerName = customerNameInput ? customerNameInput.value.trim() : '';
                const customerPhone = customerPhoneInput ? customerPhoneInput.value.trim() : '';
                if (!customerName || !customerPhone || !deliveryTypeElement || !paymentMethodElement) {
                    throw new Error('Faltan datos requeridos');
                }

                const deliveryTypeValue = deliveryTypeElement.value;
                const paymentMethod = paymentMethodElement.value;

                let address = '';
                if (deliveryTypeValue === 'delivery') {
                    const addrInput = document.getElementById('address-input');
                    if (addrInput) address = addrInput.value.trim();
                    if (window.selectedPlace && window.selectedPlace.formatted_address) {
                        address = window.selectedPlace.formatted_address;
                    }
                } else {
                    address = 'Recoger en local - SR & SRA BURGER';
                }

                let cashAmount = '';
                if (paymentMethod === 'Efectivo') {
                    const cashAmountInput = document.getElementById('cash-amount');
                    if (cashAmountInput && cashAmountInput.value.trim()) {
                        cashAmount = parseFloat(cashAmountInput.value.trim()).toFixed(2);
                    }
                }

                const orderItems = cart.map(item => {
                    let customizations = '';
                    if (item.isCombo) {
                        const choiceDetails = item.choices.map(choice => {
                            let text = choice.burger.name;
                            if (choice.customizations && choice.customizations.length > 0) {
                                text += ` (+ ${choice.customizations.map(c => c.name).join(', ')})`;
                            }
                            if (choice.fries) text += `, Papas ${choice.fries.type}`;
                            if (choice.onionRings) text += `, Aros de Cebolla`;
                            return text;
                        }).join(' | ');
                        // Anexar información de acompañamientos incluidos del combo (para Control de Envíos)
                        const extraInfo = [];
                        if (item.includedFries && item.includedFries.type && item.includedFries.size) {
                            extraInfo.push(`Papas ${item.includedFries.type} ${item.includedFries.size}`);
                        }
                        // Detalles específicos por combo
                        if (item.baseItem && Number(item.baseItem.id) === 14) {
                            // Combo Familiar incluye Aros Medianos y Coca-Cola 3L
                            extraInfo.push('Aros de Cebolla Medianos', 'Coca-Cola 3L');
                        } else if (item.baseItem && Number(item.baseItem.id) === 6) {
                            // Combo Pareja incluye aros (7 pz)
                            extraInfo.push('Aros de Cebolla (7 pz)');
                        }

                        customizations = choiceDetails + (extraInfo.length ? ` | Incluye: ${extraInfo.join(', ')}` : '');
                    } else {
                        const details = [];
                        if (item.customizations && item.customizations.length > 0) {
                            details.push(`+ ${item.customizations.map(c => c.name).join(', ')}`);
                        }
                        if (item.fries) details.push(`Papas ${item.fries.type}`);
                        if (item.onionRings) details.push('Aros de Cebolla');
                        if (item.menuExtras && item.menuExtras.length > 0) {
                            item.menuExtras.forEach(extra => details.push(`${extra.quantity}x ${extra.name}`));
                        }
                        customizations = details.join(', ');
                    }
                    return {
                        name: item.baseItem.name,
                        quantity: item.quantity,
                        price: parseFloat((item.price * item.quantity).toFixed(2)),
                        customizations: customizations || ''
                    };
                });

                const subtotal = getCartTotal();
                const deliveryCost = deliveryTypeValue === 'delivery' ? DELIVERY_PRICE : 0;
                const total = subtotal + deliveryCost;

                let notes = '';
                if (paymentMethod === 'Efectivo' && cashAmount) {
                    const change = parseFloat(cashAmount) - total;
                    notes += `Pago: $${cashAmount} | Cambio: $${change.toFixed(2)}`;
                }
                if (paymentMethod !== 'Efectivo') {
                    notes += `Pago: ${paymentMethod}`;
                }

                const orderData = {
                    customer: { name: customerName, phone: customerPhone, address },
                    items: orderItems,
                    total: parseFloat(total.toFixed(2)),
                    notes: notes || '',
                    deliveryType: deliveryTypeValue,
                    paymentMethod: paymentMethod
                };

                // 1) Crear la orden y obtener el número (Firebase o respaldo local)
                let createdOrderNumber = null;

                // Esperar un poco a que Firebase se inicialice (si está cargando)
                await waitForFirebaseOrderManager(4000);

                if (window.firebaseOrderManager && window.firebaseOrderManager.addOrder) {
                    try {
                        const res = await window.firebaseOrderManager.addOrder(orderData);
                        createdOrderNumber = res && res.orderNumber ? res.orderNumber : null;
                        console.log('✅ Orden creada en Firebase. No. Orden:', createdOrderNumber);
                    } catch (e) {
                        console.warn('⚠️ Error guardando en Firebase, usando respaldo local:', e);
                    }
                }

                if (!createdOrderNumber) {
                    createdOrderNumber = saveToLocalStorageBackup(orderData);
                    console.log('💾 Orden guardada localmente. No. Orden:', createdOrderNumber);
                }

                // Mostrar el número en el modal de éxito
                setLastOrderNumber(createdOrderNumber);

                // 2) Enviar al backend (Twilio) incluyendo el número de orden
                await postOrderToApi({ ...orderData, orderNumber: createdOrderNumber });

                // 3) Guardar datos del cliente
                saveCustomerData();

                // Cerrar checkout y limpiar carrito
                checkoutModal.classList.add('hidden');
                checkoutModal.classList.remove('flex');
                cart = [];
                updateCart();

                // Mostrar modal de éxito
                const successModal = document.getElementById('order-success-modal');
                if (successModal) {
                    successModal.classList.add('flex');
                    successModal.classList.remove('hidden');
                    const closeBtn = document.getElementById('close-order-success');
                    if (closeBtn) {
                        closeBtn.onclick = () => {
                            successModal.classList.add('hidden');
                            successModal.classList.remove('flex');
                        };
                    }
                } else {
                    showNotification('¡Orden recibida! Te confirmaremos por WhatsApp en breve.', 'success');
                }

            } catch (err) {
                console.error(err);
                showNotification('No se pudo enviar el pedido. Inténtalo de nuevo.', 'error');
            } finally {
                // Restaurar botón
                sendWhatsappBtn.disabled = false;
                sendWhatsappBtn.classList.remove('loading');
                sendWhatsappBtn.innerHTML = originalHtml;
            }
        });

        // Help modal
        document.getElementById('help-btn').addEventListener('click', () => {
            document.getElementById('help-modal').classList.add('flex');
            document.getElementById('help-modal').classList.remove('hidden');
        });
        
        document.getElementById('close-help-modal-btn').addEventListener('click', () => {
            document.getElementById('help-modal').classList.add('hidden');
            document.getElementById('help-modal').classList.remove('flex');
        });
    }

    // Funciones para el modal de personalización
    function openCustomizationModal(context) {
        const { isCombo, choiceIndex, isHotdog, hotdogIndex } = context;
        let item, currentCustomizations, currentFries, currentMenuExtras;
        
        if (isCombo) {
            if (isHotdog) {
                const hotdogChoice = tempComboConfig.hotdogs[hotdogIndex];
                item = hotdogChoice.hotdog;
                currentCustomizations = hotdogChoice.customizations || [];
                currentFries = hotdogChoice.fries;
                currentMenuExtras = hotdogChoice.menuExtras || [];
                customModalTitle.textContent = `Personaliza tu ${item.name} (Combo)`;
            } else {
                const choice = tempComboConfig.choices[choiceIndex];
                item = choice.burger;
                currentCustomizations = choice.customizations;
                currentFries = choice.fries;
                currentMenuExtras = choice.menuExtras || [];
                customModalTitle.textContent = `Personaliza tu ${item.name} (Combo)`;
            }
        } else {
            item = findItemById(context.itemId);
            currentCustomizations = [];
            currentFries = null;
            currentMenuExtras = [];
            customModalTitle.textContent = `Personaliza tu ${item.name}`;

            // Ajustar el pill de papas según promo del día (jueves: papas gratis)
            const friesPill = document.getElementById('fries-price-pill');
            if (friesPill) {
                const category = getCategoryForItemId(context.itemId);
                const isFreeFries = isFreeFriesPromotionActiveForCategory(category);
                friesPill.textContent = isFreeFries ? 'GRATIS' : `+${FRIES_PRICE.toFixed(0)}`;
                friesPill.classList.toggle('bg-green-100', isFreeFries);
                friesPill.classList.toggle('text-green-700', isFreeFries);
                friesPill.classList.toggle('bg-yellow-100', !isFreeFries);
                friesPill.classList.toggle('text-yellow-800', !isFreeFries);
            }
        }
        
        addCustomToCartBtn.dataset.context = JSON.stringify(context);
        toppingsContainer.innerHTML = '';
        const currentToppingNames = currentCustomizations.map(c => c.name);
        
        // Determinar si es hotdog para filtrar toppings
        let isHotdogItem = false;
        if (isCombo && isHotdog) {
            isHotdogItem = true;
        } else if (!isCombo) {
            // Verificar si el item está en la categoría Hot Dogs
            for (const category in menuData) {
                if (category === 'Hot Dogs' && menuData[category].some(i => i.id === item.id)) {
                    isHotdogItem = true;
                    break;
                }
            }
        }
        
        // Filtrar toppings según el tipo de producto
        let availableToppings = toppingsData;
        if (isHotdogItem) {
            // Para hotdogs: mismo menú que hamburguesas, pero sin Doble Carne
            availableToppings = toppingsData.filter(topping => topping.id !== 't6');
        }
        
        availableToppings.forEach(topping => {
            const isChecked = currentToppingNames.includes(topping.name) ? 'checked' : '';
            
            // Aplicar promoción de jueves para Carne Extra (ahora Doble Carne)
            let toppingPrice = topping.price;
            let promotionText = '';
            const todayPromotion = getCurrentDayPromotion();
            
            if (todayPromotion && todayPromotion.type === 'meat_supreme' && topping.name === 'Doble Carne') {
                toppingPrice = 10; // Precio especial de jueves
                promotionText = '<span class="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">HOY</span>';
            }
            
            const displayTitle = topping.price === 0 ? topping.description : topping.name;
            const pricePill = topping.price === 0 
                ? '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Gratis</span>'
                : `<span class=\"px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold\">+${toppingPrice.toFixed(0)}</span>`;
            const oldPrice = (toppingPrice !== topping.price)
                ? `<span class=\"ml-2 text-xs text-gray-400 line-through\">+${topping.price.toFixed(0)}</span>`
                : '';
            
            toppingsContainer.innerHTML += `
                <label class="flex items-center p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-all duration-200 ${isChecked ? 'bg-[#FFB300]/10 border-[#FFB300]' : 'border-gray-200'}">
                    <input type="checkbox" data-price="${toppingPrice}" data-name="${topping.name}" class="topping-checkbox form-checkbox h-5 w-5 text-[#FFB300] rounded focus:ring-[#FFA000]" ${isChecked}>
                    <div class="ml-3 mr-3">
                        <img src="${topping.image}" alt="${topping.name}" class="w-20 h-16 object-cover rounded-md shadow-sm" referrerpolicy="no-referrer" onerror="this.onerror=null;">
                    </div>
                    <div class="flex-grow">
                        <div class="flex items-center flex-wrap gap-2">
                            <span class="font-semibold text-gray-800">${displayTitle}</span>
                            ${promotionText}
                        </div>
                        <div class="mt-1 flex items-center gap-2 text-sm text-gray-600">
                            ${pricePill}
                            ${oldPrice}
                        </div>
                    </div>
                </label>
            `;
        });
        
        // Poblar extras del menú
        const menuExtrasContainer = document.getElementById('menu-extras-container');
        menuExtrasContainer.innerHTML = '';
        const menuExtras = [...menuData.Extras, ...menuData.Bebidas];
        menuExtras.forEach(extra => {
            const isChecked = currentMenuExtras.some(e => e.id === extra.id) ? 'checked' : '';
            const quantity = currentMenuExtras.find(e => e.id === extra.id)?.quantity || 1;
            menuExtrasContainer.innerHTML += `
                <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-all duration-200 ${isChecked ? 'bg-[#FFB300]/10 border-[#FFB300]' : ''}">
                    <input type="checkbox" data-price="${extra.price}" data-name="${extra.name}" data-id="${extra.id}" class="menu-extra-checkbox form-checkbox h-5 w-5 text-[#FFB300] rounded focus:ring-[#FFA000]" ${isChecked}>
                    <div class="ml-3 mr-3">
                        <img src="${extra.image}" alt="${extra.name}" class="w-20 h-16 object-cover rounded-md shadow-sm" referrerpolicy="no-referrer" onerror="this.onerror=null;">
                    </div>
                    <div class="flex-grow">
                        <span class="font-semibold text-gray-800">${extra.name}</span>
                        <div class="text-sm text-gray-600">+${extra.price.toFixed(0)}</div>
                    </div>
                    <div class="ml-2 ${isChecked ? '' : 'hidden'}" data-quantity-controls="${extra.id}">
                        <div class="flex items-center space-x-2">
                            <button type="button" class="quantity-minus bg-gray-200 hover:bg-gray-300 rounded-full w-6 h-6 flex items-center justify-center text-sm" data-id="${extra.id}">-</button>
                            <span class="quantity-display w-8 text-center text-sm font-semibold" data-id="${extra.id}">${quantity}</span>
                            <button type="button" class="quantity-plus bg-gray-200 hover:bg-gray-300 rounded-full w-6 h-6 flex items-center justify-center text-sm" data-id="${extra.id}">+</button>
                        </div>
                    </div>
                </label>
            `;
        });
            
        // Actualizar selección de acompañamientos
        if (currentFries) {
            addFriesCheckbox.checked = true;
            friesChoiceContainer.classList.remove('hidden');
            
            // Seleccionar el tipo de papas correcto
            document.querySelector(`input[name="fries-type"][value="${currentFries.type}"]`).checked = true;
        } else {
            addFriesCheckbox.checked = false;
            friesChoiceContainer.classList.add('hidden');
        }
        
        if (currentFries || currentCustomizations.length > 0 || (currentMenuExtras && currentMenuExtras.length > 0)) {
            updateToppingsVisualState();
            updateFriesVisualState();
            updateMenuExtrasVisualState();
        }
        
        // Mostrar modal y calcular precio
        updateCustomModalPrice();
        
        // Mostrar el modal
        customModal.classList.add('flex');
        customModal.classList.remove('hidden');
    }

    async function waitForFirebaseOrderManager(timeoutMs = 4000) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (window.firebaseOrderManager && typeof window.firebaseOrderManager.addOrder === 'function') {
                return true;
            }
            await new Promise(r => setTimeout(r, 200));
        }
        return false;
    }

    function closeCustomizationModal() {
        customModal.classList.add('hidden');
        customModal.classList.remove('flex');
    }

    // Funciones para actualizar estados visuales
    function updateToppingsVisualState() {
        const checkboxes = toppingsContainer.querySelectorAll('.topping-checkbox');
        checkboxes.forEach(checkbox => {
            const label = checkbox.closest('label');
            if (checkbox.checked) {
                label.classList.add('bg-[#FFB300]/10', 'border-[#FFB300]');
            } else {
                label.classList.remove('bg-[#FFB300]/10', 'border-[#FFB300]');
            }
        });
    }
    
    function updateFriesVisualState() {
        const label = addFriesCheckbox.closest('label');
        if (addFriesCheckbox.checked) {
            label.classList.add('bg-[#FFB300]/10', 'border-[#FFB300]');
            friesChoiceContainer.classList.remove('hidden');
        } else {
            label.classList.remove('bg-[#FFB300]/10', 'border-[#FFB300]');
            friesChoiceContainer.classList.add('hidden');
        }
    }
    
    function updateMenuExtrasVisualState() {
        const checkboxes = document.querySelectorAll('.menu-extra-checkbox');
        checkboxes.forEach(checkbox => {
            const label = checkbox.closest('label');
            const controls = label.querySelector(`[data-quantity-controls="${checkbox.dataset.id}"]`);
            
            if (checkbox.checked) {
                label.classList.add('bg-[#FFB300]/10', 'border-[#FFB300]');
                if (controls) controls.classList.remove('hidden');
            } else {
                label.classList.remove('bg-[#FFB300]/10', 'border-[#FFB300]');
                if (controls) controls.classList.add('hidden');
            }
        });
    }
    
    // Función para actualizar el precio total en el modal de personalización
    function updateCustomModalPrice() {
        const context = JSON.parse(addCustomToCartBtn.dataset.context || '{}');
        const { isCombo, itemId, choiceIndex } = context;
        
        let basePrice = 0;
        
        let isFreeFriesEligible = false;

        if (isCombo) {
            // Para combos, usamos el precio base de la hamburguesa
            const burger = tempComboConfig.choices[choiceIndex].burger;
            basePrice = burger.price;
        } else if (itemId) {
            // Para ítems individuales, usamos el precio del ítem
            // aplicando la promoción diaria si corresponde (ej. HOTDOG MANIA)
            const originalItem = findItemById(itemId);
            const category = getCategoryForItemId(itemId);
            const promotedItem = applyDailyPromotion(originalItem, category);
            basePrice = promotedItem.price;
            isFreeFriesEligible = Boolean(promotedItem.freeFries) && isFreeFriesPromotionActiveForCategory(category);
        }
        
        // Sumar precio de los toppings seleccionados
        let total = basePrice;
        
        document.querySelectorAll('.topping-checkbox:checked').forEach(checkbox => {
            total += parseFloat(checkbox.dataset.price);
        });
        
        // Sumar precio de papas si están seleccionadas
        if (addFriesCheckbox.checked) {
            total += isFreeFriesEligible ? 0 : FRIES_PRICE;
        }
        
        // Sumar precio de aros de cebolla si están seleccionados
        if (document.getElementById('add-onion-rings-checkbox').checked) {
            total += ONION_RINGS_PRICE;
        }
        
        // Sumar precio de extras del menú seleccionados
        document.querySelectorAll('.menu-extra-checkbox:checked').forEach(checkbox => {
            const itemId = checkbox.dataset.id;
            const quantity = parseInt(document.querySelector(`.quantity-display[data-id="${itemId}"]`)?.textContent || '1');
            total += parseFloat(checkbox.dataset.price) * quantity;
        });
        
        // Mostrar el precio total
        customModalTotal.textContent = `${total.toFixed(0)}`;
    }

    // Funciones para combos
    function getPremiumBurgerPrice() {
        const premium = findItemById(1);
        if (premium && typeof premium.price === 'number' && !Number.isNaN(premium.price)) return premium.price;

        const burgers = (menuData && Array.isArray(menuData['Hamburguesas'])) ? menuData['Hamburguesas'] : [];
        const first = burgers[0];
        if (first && typeof first.price === 'number' && !Number.isNaN(first.price)) return first.price;
        return 0;
    }

    function getBurgerPriceDiffText(burger) {
        const premiumPrice = getPremiumBurgerPrice();
        const burgerPrice = (burger && typeof burger.price === 'number') ? burger.price : premiumPrice;
        const diff = burgerPrice - premiumPrice;
        if (diff === 0) return 'Precio base';
        if (diff > 0) return `(+ ${diff.toFixed(0)})`;
        return `(- ${Math.abs(diff).toFixed(0)})`;
    }

    function getComboAvailableBurgerIds(combo) {
        const burgers = (menuData && Array.isArray(menuData['Hamburguesas'])) ? menuData['Hamburguesas'] : [];
        const ids = burgers
            .map(b => Number(b?.id))
            .filter(id => Number.isFinite(id));

        const filtered = (typeof isProductHidden === 'function')
            ? ids.filter(id => !isProductHidden(id))
            : ids;

        if (filtered.length > 0) return filtered;

        const fallback = Array.isArray(combo?.availableBurgers) ? combo.availableBurgers.map(Number).filter(Number.isFinite) : [];
        return fallback;
    }

    function openComboModal(comboId) {
        const combo = findItemById(comboId);
        if (!combo) return;
        
        tempComboConfig = {
            baseCombo: combo,
            choices: [],
            includedFries: {
                type: 'Gajo', // Tipo por defecto
                size: (combo && Number(combo.id) === 14) ? 'Grandes' : 'Medianas'
            }
        };
        
        comboModalTitle.textContent = `Configura tu ${combo.name}`;
        comboModalBody.innerHTML = '';

        // Guardar opciones disponibles (incluye hamburguesas agregadas desde Admin)
        tempComboConfig.availableBurgers = getComboAvailableBurgerIds(combo);
        const premiumPrice = getPremiumBurgerPrice();
        
        // Añadir hamburguesas al combo
        for (let i = 0; i < combo.burgerChoices; i++) {
            const preferredDefaultId = tempComboConfig.availableBurgers.includes(1)
                ? 1
                : (tempComboConfig.availableBurgers[0] ?? (combo.availableBurgers ? combo.availableBurgers[0] : 1));
            const defaultBurger = findItemById(preferredDefaultId)
                || findItemById(tempComboConfig.availableBurgers[0])
                || findItemById(combo.availableBurgers ? combo.availableBurgers[0] : preferredDefaultId)
                || ((Array.isArray(menuData?.['Hamburguesas']) ? menuData['Hamburguesas'] : [])[0])
                || { id: preferredDefaultId, name: 'Hamburguesa', price: premiumPrice, image: '' };
            
            tempComboConfig.choices[i] = {
                burger: defaultBurger,
                customizations: [],
                fries: null
            };
            
            const choiceHtml = `
                <div class="border rounded-lg p-4" data-choice-index="${i}">
                    <h4 class="font-bold text-lg mb-3">Hamburguesa ${i + 1}</h4>
                    <div class="burger-selector mb-4">
                        <div class="relative bg-gray-100 rounded-lg overflow-hidden">
                            <img id="burger-img-${i}" src="${defaultBurger.image}" alt="${defaultBurger.name}" class="w-full h-40 sm:h-48 md:h-52 object-contain bg-white rounded-lg" referrerpolicy="no-referrer" onerror="this.onerror=null;">
                            <div class="absolute inset-0 flex items-center justify-between px-3">
                                <button class="prev-burger-btn bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 shadow-lg backdrop-blur-sm" data-choice-index="${i}">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <button class="next-burger-btn bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 shadow-lg backdrop-blur-sm" data-choice-index="${i}">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                        <div class="text-center mt-3">
                            <h5 id="burger-name-${i}" class="font-semibold text-lg text-gray-800">${defaultBurger.name}</h5>
                            <p id="burger-price-${i}" class="text-sm text-gray-600 font-medium">${getBurgerPriceDiffText(defaultBurger)}</p>
                        </div>
                    </div>
                    <div class="customizations-summary text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded">Sin personalización.</div>
                    <button class="combo-customize-btn w-full text-sm bg-gray-200 hover:bg-gray-300 text-black py-2 px-4 rounded-md transition-colors duration-200">Personalizar</button>
                </div>
            `;
            
            comboModalBody.innerHTML += choiceHtml;
        }
        
        // Añadir hotdogs al combo (si aplica)
        if (combo.hotdogChoices && combo.availableHotdogs) {
            for (let i = 0; i < combo.hotdogChoices; i++) {
                const baseHotdogItem = findItemById(5);
                const baseHotdogPrice = baseHotdogItem && typeof baseHotdogItem.price === 'number' ? baseHotdogItem.price : 0;
                const defaultHotdog = findItemById(combo.availableHotdogs[0])
                    || findItemById(5)
                    || { id: combo.availableHotdogs[0], name: 'Hot Dog', price: baseHotdogPrice, image: '' };
                
                tempComboConfig.hotdogs = tempComboConfig.hotdogs || [];
                tempComboConfig.hotdogs[i] = {
                    hotdog: defaultHotdog,
                    customizations: [],
                    fries: null
                };
                
                const hotdogIndex = i;
                const choiceHtml = `
                    <div class="border rounded-lg p-4 mt-6" data-hotdog-index="${hotdogIndex}">
                        <h4 class="font-bold text-lg mb-3">Hot Dog ${hotdogIndex + 1}</h4>
                        <div class="hotdog-selector mb-4">
                            <div class="relative bg-gray-100 rounded-lg overflow-hidden">
                                <img id="hotdog-img-${hotdogIndex}" src="${defaultHotdog.image}" alt="${defaultHotdog.name}" class="w-full h-40 sm:h-48 md:h-52 object-contain bg-white rounded-lg" referrerpolicy="no-referrer" onerror="this.onerror=null;">
                                <div class="absolute inset-0 flex items-center justify-between px-3">
                                    <button class="prev-hotdog-btn bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 shadow-lg backdrop-blur-sm" data-hotdog-index="${hotdogIndex}">
                                        <i class="fas fa-chevron-left"></i>
                                    </button>
                                    <button class="next-hotdog-btn bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 shadow-lg backdrop-blur-sm" data-hotdog-index="${hotdogIndex}">
                                        <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="text-center mt-3">
                                <h5 id="hotdog-name-${hotdogIndex}" class="font-semibold text-lg text-gray-800">${defaultHotdog.name}</h5>
                                <p id="hotdog-price-${hotdogIndex}" class="text-sm text-gray-600 font-medium">Precio base</p>
                            </div>
                        </div>
                        <div class="customizations-summary text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded">Sin personalización.</div>
                        <button class="hotdog-customize-btn w-full text-sm bg-gray-200 hover:bg-gray-300 text-black py-2 px-4 rounded-md transition-colors duration-200" data-hotdog-index="${hotdogIndex}">Personalizar</button>
                    </div>
                `;
                
                comboModalBody.innerHTML += choiceHtml;
            }
        }
        
        // Añadir selección de papas incluidas en el combo
        const isComboFamiliar = !!(tempComboConfig && tempComboConfig.baseCombo && tempComboConfig.baseCombo.id === 14);
        const friesTitle = isComboFamiliar
            ? 'Incluye: Papas Grandes, Aros de Cebolla Medianos y Coca-Cola 3L'
            : 'Papas Medianas Incluidas';
        const friesGajoLabel = isComboFamiliar ? 'Papas Gajo Grandes' : 'Papas Gajo Medianas';
        const friesFrancesasLabel = isComboFamiliar ? 'Papas a la Francesa Grandes' : 'Papas a la Francesa Medianas';

        const friesSelectionHtml = `
            <div class="border rounded-lg p-4 mt-6">
                <h4 class="font-bold text-lg mb-3">${friesTitle}</h4>
                <p class="text-sm text-gray-600 mb-3">Elige qué tipo de papas quieres en tu combo:</p>
                <div class="space-y-3">
                    <label class="flex items-center cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-all duration-200 bg-[#FFB300]/10 border-[#FFB300]">
                        <input type="radio" name="combo-fries-type" value="Gajo" class="form-radio text-[#FFB300]" checked>
                        <span class="font-medium">${friesGajoLabel}</span>
                    </label>
                    <label class="flex items-center cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-all duration-200">
                        <input type="radio" name="combo-fries-type" value="Francesas" class="form-radio text-[#FFB300]">
                        <span class="font-medium">${friesFrancesasLabel}</span>
                    </label>
                </div>
            </div>
        `;
        
        comboModalBody.innerHTML += friesSelectionHtml;
        
        updateComboModalTotal();
        
        comboModal.classList.add('flex');
        comboModal.classList.remove('hidden');
    }

    function closeComboModal() {
        comboModal.classList.add('hidden');
        comboModal.classList.remove('flex');
    }

    function updateComboModalTotal() {
        let total = tempComboConfig.baseCombo.price;
        const clasicaPrice = getPremiumBurgerPrice();
        const baseHotdogItem = findItemById(5);
        const baseHotdogPrice = baseHotdogItem && typeof baseHotdogItem.price === 'number' ? baseHotdogItem.price : 0; // Precio base del Hotdog Jumbo
        
        // Calcular precio de las hamburguesas
        tempComboConfig.choices.forEach(choice => {
            const upgradeCost = choice.burger.price - clasicaPrice;
            total += upgradeCost;
            
            if (choice.customizations) {
                choice.customizations.forEach(cust => total += cust.price);
            }
            
            if (choice.fries) total += choice.fries.price;
            if (choice.onionRings) total += choice.onionRings.price;
            
            if (choice.menuExtras && choice.menuExtras.length > 0) {
                choice.menuExtras.forEach(extra => total += extra.price * extra.quantity);
            }
        });
        
        // Calcular precio de los hotdogs (si existen)
        if (tempComboConfig.hotdogs) {
            tempComboConfig.hotdogs.forEach(hotdogChoice => {
                const upgradeCost = hotdogChoice.hotdog.price - baseHotdogPrice;
                total += upgradeCost;
                
                if (hotdogChoice.customizations) {
                    hotdogChoice.customizations.forEach(cust => total += cust.price);
                }
                
                if (hotdogChoice.fries) total += hotdogChoice.fries.price;
                if (hotdogChoice.onionRings) total += hotdogChoice.onionRings.price;
                
                if (hotdogChoice.menuExtras && hotdogChoice.menuExtras.length > 0) {
                    hotdogChoice.menuExtras.forEach(extra => total += extra.price * extra.quantity);
                }
            });
        }
        
        comboModalTotal.textContent = `${total.toFixed(0)}`;
    }

    // Función para calcular el precio real de un combo basado en sus componentes
    function calculateComboRealPrice(combo) {
        let realPrice = 0;
        
        switch (combo.id) {
            case 26: // Combo Dobles Dobles: referencia de precio individual $300
                realPrice = 300;
                break;
            case 6: // Combo Pareja: 2 Hamburguesas + 1 Papas Medianas + 7 Aros de Cebolla
                realPrice = (100 * 2) + 60 + 45; // 2 Clásicas + Papas Medianas + Aros (7pz)
                break;
                
            case 15: // Combo Dúo: 1 Hamburguesa + 1 Hotdog + 1 Papas Medianas
                realPrice = 100 + 60 + 60; // Clásica + Hotdog + Papas Medianas
                break;
                
            case 7: // Combo Amigos: baseline de comparación anterior (ahorro visible)
                realPrice = 400; // Antes: 3 Clásicas + Papas Medianas + Coca 1.75L
                break;
                
            case 14: // Combo Familiar: 5 Hamburguesas + 1 Papas Grandes (Gajo o Francesas) + 1 Aros Grande + 1 Coca 3L
                realPrice = (100 * 5) + 120 + 80 + 60; // 5 Clásicas + Papas Grandes (120) + Aros Grandes + Coca 3L
                break;
                
            default:
                realPrice = combo.originalPrice || combo.price;
        }
        
        return realPrice;
    }

    function navigateBurger(choiceIndex, direction) {
        const combo = tempComboConfig.baseCombo;
        const availableBurgerIds = Array.isArray(tempComboConfig.availableBurgers) && tempComboConfig.availableBurgers.length
            ? tempComboConfig.availableBurgers
            : (Array.isArray(combo.availableBurgers) ? combo.availableBurgers : []);

        if (!Array.isArray(availableBurgerIds) || availableBurgerIds.length === 0) return;

        const currentId = Number(tempComboConfig.choices[choiceIndex].burger.id);
        const currentBurgerIndex = availableBurgerIds.map(Number).indexOf(currentId);
        
        let newIndex;
        if (direction === 'next') {
            const safeIndex = currentBurgerIndex >= 0 ? currentBurgerIndex : 0;
            newIndex = (safeIndex + 1) % availableBurgerIds.length;
        } else {
            const safeIndex = currentBurgerIndex >= 0 ? currentBurgerIndex : 0;
            newIndex = safeIndex === 0 ? availableBurgerIds.length - 1 : safeIndex - 1;
        }

        const newBurgerId = availableBurgerIds[newIndex];
        const newBurger = findItemById(newBurgerId);
        if (!newBurger) return;
        
        tempComboConfig.choices[choiceIndex].burger = newBurger;
        tempComboConfig.choices[choiceIndex].customizations = [];
        tempComboConfig.choices[choiceIndex].fries = null;
        tempComboConfig.choices[choiceIndex].onionRings = null;
        
        updateBurgerDisplay(choiceIndex, newBurger);
        
        const summaryEl = document.querySelector(`[data-choice-index="${choiceIndex}"] .customizations-summary`);
        summaryEl.textContent = 'Sin personalización.';
        
        updateComboModalTotal();
    }

    function updateBurgerDisplay(choiceIndex, burger) {
        const priceText = getBurgerPriceDiffText(burger);
        
        document.getElementById(`burger-img-${choiceIndex}`).src = burger.image;
        document.getElementById(`burger-img-${choiceIndex}`).alt = burger.name;
        document.getElementById(`burger-name-${choiceIndex}`).textContent = burger.name;
        document.getElementById(`burger-price-${choiceIndex}`).textContent = priceText;
    }
    
    function navigateHotdog(hotdogIndex, direction) {
        const combo = tempComboConfig.baseCombo;
        const availableHotdogIds = Array.isArray(combo.availableHotdogs) ? combo.availableHotdogs : [];
        if (availableHotdogIds.length === 0) return;

        const currentId = Number(tempComboConfig.hotdogs?.[hotdogIndex]?.hotdog?.id);
        const currentHotdogIndex = availableHotdogIds.map(Number).indexOf(currentId);
        
        let newIndex;
        if (direction === 'next') {
            const safeIndex = currentHotdogIndex >= 0 ? currentHotdogIndex : 0;
            newIndex = (safeIndex + 1) % availableHotdogIds.length;
        } else {
            const safeIndex = currentHotdogIndex >= 0 ? currentHotdogIndex : 0;
            newIndex = safeIndex === 0 ? availableHotdogIds.length - 1 : safeIndex - 1;
        }
        
        const newHotdogId = availableHotdogIds[newIndex];
        const newHotdog = findItemById(newHotdogId);
        if (!newHotdog) return;
        
        tempComboConfig.hotdogs[hotdogIndex].hotdog = newHotdog;
        tempComboConfig.hotdogs[hotdogIndex].customizations = [];
        tempComboConfig.hotdogs[hotdogIndex].fries = null;
        tempComboConfig.hotdogs[hotdogIndex].onionRings = null;
        
        updateHotdogDisplay(hotdogIndex, newHotdog);
        
        const summaryEl = document.querySelector(`[data-hotdog-index="${hotdogIndex}"] .customizations-summary`);
        summaryEl.textContent = 'Sin personalización.';
        
        updateComboModalTotal();
    }
    
    function updateHotdogDisplay(hotdogIndex, hotdog) {
        const baseHotdogPrice = findItemById(5).price; // Precio base del Hotdog Jumbo
        const priceDiff = hotdog.price - baseHotdogPrice;
        const priceText = priceDiff === 0
            ? 'Precio base'
            : (priceDiff > 0 ? `(+ ${priceDiff.toFixed(0)})` : `(- ${Math.abs(priceDiff).toFixed(0)})`);
        
        document.getElementById(`hotdog-img-${hotdogIndex}`).src = hotdog.image;
        document.getElementById(`hotdog-img-${hotdogIndex}`).alt = hotdog.name;
        document.getElementById(`hotdog-name-${hotdogIndex}`).textContent = hotdog.name;
        document.getElementById(`hotdog-price-${hotdogIndex}`).textContent = priceText;
    }

    // Funciones de carrito
    function addToCart(itemId) {
        const originalItem = findItemById(itemId);
        if (!originalItem) return;
        
        // Determinar la categoría del item
        let category = '';
        for (const cat in menuData) {
            if (menuData[cat].some(i => i.id === itemId)) {
                category = cat;
                break;
            }
        }
        
        // Aplicar promoción diaria
        const item = applyDailyPromotion(originalItem, category);
        
        const cartItem = {
            id: Date.now(), // ID único para el carrito
            baseItem: item,
            price: item.price,
            quantity: 1,
            hasPromotion: item.hasPromotion || false,
            promotionText: item.promotionText || '',
            freeFries: item.freeFries || false,
            meatSupreme: item.meatSupreme || false
        };
        
        // Si la promo de papas aplica y es hamburguesa u hotdog, agregar papas gratis
        if (item.freeFries && (category === 'Hamburguesas' || category === 'Hot Dogs')) {
            cartItem.freeFriesIncluded = {
                name: 'Papas Gajo Medianas',
                price: 0 // Gratis
            };
        }
        
        cart.push(cartItem);
        updateCart();
        openCart();
    }

    function openCart() {
        if (cartSidebar && cartOverlay) {
            cartSidebar.classList.remove('translate-x-full');
            cartOverlay.classList.remove('hidden');
        }
    }

    function updateCart() {
        cartCount.textContent = cart.length;
        cartTotal.textContent = `${getCartTotal().toFixed(0)}`;
        
        // Guardar carrito en localStorage
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Actualizar vista del carrito
        updateCartView();
    }

    function getCartTotal() {
        return cart.reduce((total, item) => total + item.price * item.quantity, 0);
    }

    function updateCartView() {
        cartItemsContainer.innerHTML = '';
        
        if (cart.length === 0) {
            cartEmptyMsg.classList.remove('hidden');
            checkoutBtn.disabled = true;
            checkoutBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
        } else {
            cartEmptyMsg.classList.add('hidden');
            checkoutBtn.disabled = false;
            checkoutBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
            
            cart.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'flex items-start p-3 bg-white rounded-xl border border-gray-100 shadow-sm mb-3';
                
                let itemName = item.baseItem.name;
                let customizationsText = '';
                
                if (item.isCombo) {
                    // Para combos, listar hamburguesas seleccionadas y papas incluidas
                    const burgerNames = item.choices.map(choice => choice.burger.name);
                    let comboDetails = burgerNames.join(', ');
                    
                    // Añadir hotdogs si existen
                    if (item.hotdogs && item.hotdogs.length > 0) {
                        const hotdogNames = item.hotdogs.map(hotdog => hotdog.hotdog.name);
                        comboDetails += ', ' + hotdogNames.join(', ');
                    }
                    
                    // Añadir información de papas incluidas
                    if (item.includedFries) {
                        comboDetails += `, Papas ${item.includedFries.type} ${item.includedFries.size}`;
                    }
                    
                    // Añadir extras específicos por combo
                    if (item.baseItem && Number(item.baseItem.id) === 14) {
                        // Combo Familiar incluye Aros Medianos y Coca-Cola 3L
                        comboDetails += `, Aros de Cebolla Medianos, Coca-Cola 3L`;
                    } else if (item.baseItem && Number(item.baseItem.id) === 6) {
                        // Combo Pareja incluye aros (7 pz)
                        comboDetails += `, Aros de Cebolla (7 pz)`;
                    }
                    
                    customizationsText = comboDetails;
                } else if (item.customizations && item.customizations.length > 0) {
                    // Para items personalizados, listar extras
                    const customizationNames = item.customizations.map(c => c.name);
                    customizationsText = `+ ${customizationNames.join(', ')}`;
                    
                    if (item.fries) {
                        customizationsText += `, Papas ${item.fries.type}`;
                    }
                    
                    if (item.onionRings) {
                        customizationsText += ', Aros de Cebolla';
                    }
                }
                
                // Añadir papas gratis si aplica
                if (item.freeFriesIncluded) {
                    if (customizationsText) customizationsText += ', ';
                    customizationsText += `🎉 ${item.freeFriesIncluded.name} (GRATIS)`;
                }
                
                // Mostrar badge de promoción si aplica
                let promotionBadge = '';
                if (item.hasPromotion) {
                    promotionBadge = '<span class="inline-block bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-2 animate-pulse">🎉 PROMO</span>';
                }
                
                itemDiv.innerHTML = `
                    <div class="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden ring-1 ring-gray-200">
                        ${item.baseItem && item.baseItem.image ? `<img src="${item.baseItem.image}" alt="${itemName}" class="w-full h-full object-cover" referrerpolicy="no-referrer" onerror="this.onerror=null;this.style.display='none';">` : ''}
                    </div>
                    <div class="ml-4 flex-grow">
                        <div class="flex justify-between items-start">
                            <h4 class="font-semibold text-gray-800 leading-tight">${itemName}${promotionBadge}</h4>
                            <button class="remove-item-btn text-gray-400 hover:text-red-500" data-id="${item.id}" aria-label="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        ${customizationsText ? `<p class=\"text-xs text-gray-500 mt-1\">${customizationsText}</p>` : ''}
                        <div class="mt-2 flex items-center justify-between">
                            <div class="inline-flex items-center bg-gray-100 rounded-full overflow-hidden">
                                <button class="cart-qty-btn w-8 h-8 grid place-items-center text-gray-700 hover:bg-gray-200" data-id="${item.id}" data-action="decrease" aria-label="Disminuir">−</button>
                                <span class="min-w-[2rem] text-center text-sm font-semibold">${item.quantity}</span>
                                <button class="cart-qty-btn w-8 h-8 grid place-items-center text-gray-700 hover:bg-gray-200" data-id="${item.id}" data-action="increase" aria-label="Aumentar">＋</button>
                            </div>
                            <span class="font-bold text-[#FFB300] text-lg">$${(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                    </div>
                `;
                
                cartItemsContainer.appendChild(itemDiv);
            });
            
            // Event listeners para botones de cantidad y eliminar
            document.querySelectorAll('.cart-qty-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.currentTarget.dataset.id);
                    const action = e.currentTarget.dataset.action;
                    const itemIndex = cart.findIndex(item => item.id === id);
                    
                    if (itemIndex !== -1) {
                        if (action === 'increase') {
                            cart[itemIndex].quantity++;
                        } else if (action === 'decrease') {
                            if (cart[itemIndex].quantity > 1) {
                                cart[itemIndex].quantity--;
                            }
                        }
                        updateCart();
                    }
                });
            });
            
            document.querySelectorAll('.remove-item-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.currentTarget.dataset.id);
                    cart = cart.filter(item => item.id !== id);
                    updateCart();
                });
            });
        }
    }

    // Exponer funciones clave al ámbito global para los onclick inline
    window.openCart = openCart;
    window.getCartTotal = getCartTotal;
    window.updateCart = updateCart;

    // Funciones de checkout
    function renderOrderSummary() {
        orderSummaryContainer.innerHTML = '<h4 class="font-semibold text-lg mb-3 flex items-center"><i class="fas fa-receipt mr-2 text-yellow-600"></i>Resumen de tu pedido:</h4>';

        const list = document.createElement('div');
        list.className = 'space-y-2';

        cart.forEach(item => {
            let customizationsText = '';
            if (item.isCombo) {
                const burgerList = item.choices.map(choice => {
                    let text = `${choice.burger.name}`;
                    if (choice.customizations && choice.customizations.length > 0) {
                        text += ` (+ ${choice.customizations.map(c => c.name).join(', ')})`;
                    }
                    return text;
                });
                if (item.hotdogs && item.hotdogs.length > 0) {
                    const hotdogList = item.hotdogs.map(hotdog => {
                        let text = `${hotdog.hotdog.name}`;
                        if (hotdog.customizations && hotdog.customizations.length > 0) {
                            text += ` (+ ${hotdog.customizations.map(c => c.name).join(', ')})`;
                        }
                        return text;
                    });
                    burgerList.push(...hotdogList);
                }
                // Añadir información de papas incluidas
                if (item.includedFries) {
                    burgerList.push(`Papas ${item.includedFries.type} ${item.includedFries.size}`);
                }
                
                // Añadir extras específicos por combo
                if (item.baseItem && Number(item.baseItem.id) === 14) {
                    // Combo Familiar incluye Aros Medianos y Coca-Cola 3L
                    burgerList.push(`Aros de Cebolla Medianos`);
                    burgerList.push(`Coca-Cola 3L`);
                } else if (item.baseItem && Number(item.baseItem.id) === 6) {
                    // Combo Pareja incluye aros (7 pz)
                    burgerList.push(`Aros de Cebolla (7 pz)`);
                }
                customizationsText = burgerList.join(' • ');
            } else {
                const extras = [];
                if (item.customizations && item.customizations.length > 0) extras.push(`${item.customizations.map(c => c.name).join(', ')}`);
                if (item.fries) extras.push(`Papas ${item.fries.type}`);
                if (item.onionRings) extras.push('Aros de Cebolla');
                if (item.freeFriesIncluded) extras.push(`${item.freeFriesIncluded.name} (GRATIS)`);
                customizationsText = extras.join(' • ');
            }

            const priceHTML = item.isCombo
                ? (() => {
                    const realPrice = calculateComboRealPrice(item.baseItem);
                    const savings = realPrice - item.baseItem.price;
                    return `
                        <div class=\"text-right\">
                            <div class=\"text-[11px] text-gray-400 line-through\">$${realPrice.toFixed(0)}</div>
                            <div class=\"font-bold\">$${(item.price * item.quantity).toFixed(0)}</div>
                            <div class=\"text-[11px] text-green-600\">Ahorras $${(savings * item.quantity).toFixed(0)}</div>
                        </div>
                    `;
                })()
                : `<div class=\"font-bold text-right\">$${(item.price * item.quantity).toFixed(0)}</div>`;

            const itemRow = document.createElement('div');
            itemRow.className = 'order-summary-item flex items-start justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm';
            itemRow.innerHTML = `
                <div class=\"flex items-start\">
                    ${item.baseItem && item.baseItem.image ? `<img src=\"${item.baseItem.image}\" alt=\"${item.baseItem.name}\" class=\"w-10 h-10 rounded-md object-cover mr-3\" referrerpolicy=\"no-referrer\" onerror=\"this.onerror=null;this.style.display='none';\">` : ''}
                    <div>
                        <div class=\"order-summary-title font-semibold text-sm\">${item.quantity}x ${item.baseItem.name}</div>
                        ${customizationsText ? `<div class=\"order-summary-meta mt-0.5 text-[12px]\">${customizationsText}</div>` : ''}
                    </div>
                </div>
                ${priceHTML}
            `;
            list.appendChild(itemRow);
        });

        // Totales
        const deliveryTypeValue = document.querySelector('input[name="delivery-type"]:checked').value;
        const subtotal = getCartTotal();
        const deliveryCost = deliveryTypeValue === 'delivery' ? DELIVERY_PRICE : 0;
        const total = subtotal + deliveryCost;

        const totals = document.createElement('div');
        totals.className = 'order-summary-totals mt-3 p-3 bg-gray-50 rounded-lg border';
        totals.innerHTML = `
            <div class=\"flex items-center justify-between text-sm text-gray-600\"><span>Subtotal:</span><span>$${subtotal.toFixed(0)}</span></div>
            <div class=\"flex items-center justify-between text-sm text-gray-600\"><span>Envío:</span><span>${deliveryTypeValue === 'delivery' ? `+$${DELIVERY_PRICE.toFixed(0)}` : 'Gratis'}</span></div>
            <div class=\"flex items-center justify-between font-bold text-lg mt-2 pt-2 border-t\"><span>Total:</span><span class=\"text-[#FFB300]\">$${total.toFixed(0)}</span></div>
        `;

        orderSummaryContainer.appendChild(list);
        orderSummaryContainer.appendChild(totals);
    }

    // Validación del formulario de checkout
    function validateCheckoutForm() {
        // Obtener los valores relevantes
        const name = customerNameInput ? customerNameInput.value.trim() : '';
        const phone = customerPhoneInput ? customerPhoneInput.value.trim() : '';
        const deliveryTypeElement = document.querySelector('input[name="delivery-type"]:checked');
        const paymentMethodElement = document.querySelector('input[name="payment"]:checked');
        
        if (!deliveryTypeElement || !paymentMethodElement) {
            return; // No se han seleccionado todas las opciones necesarias
        }
        
        const deliveryTypeValue = deliveryTypeElement.value;
        const paymentMethod = paymentMethodElement.value;

        // Validación del nombre y teléfono
        const nameValid = name.length > 0;
        // Validar teléfono: eliminar espacios, guiones y paréntesis, y verificar que tenga al menos 8 dígitos
        const phoneDigits = phone.replace(/[\s\-\(\)]/g, '');
        const phoneValid = phoneDigits.length >= 8;
        
        // Validación de dirección sólo para entrega a domicilio
        let locationValid = true;
        if (deliveryTypeValue === 'delivery') {
            // Validar que se haya ingresado una dirección
            const addressInput = document.getElementById('address-input');
            if (!addressInput || !addressInput.value.trim()) {
                locationValid = false;
                userAddress = null;
            } else {
                userAddress = addressInput.value.trim();
                // Mejor validación: la dirección debe tener al menos una longitud mínima
                // y preferiblemente estar validada por Google Maps
                locationValid = userAddress.length >= 10;
                
                // Bonus: si hay un lugar seleccionado de Google Maps, es más confiable
                if (window.selectedPlace && window.selectedPlace.formatted_address) {
                    locationValid = true;
                    userAddress = window.selectedPlace.formatted_address;
                }
            }
        }
        
        // Validación de pago efectivo
        let paymentValid = true;
        if (paymentMethod === 'Efectivo') {
            const cashAmountInput = document.getElementById('cash-amount');
            const cashAmountValue = cashAmountInput.value.trim();
            
            // Si hay un valor ingresado y el campo NO está en foco (usuario terminó de escribir),
            // validar que sea suficiente
            if (cashAmountValue) {
                const cashAmount = parseFloat(cashAmountValue);
                const total = getCartTotal() + (document.querySelector('input[name="delivery-type"]:checked').value === 'delivery' ? DELIVERY_PRICE : 0);
                // Usar una pequeña tolerancia para evitar problemas de precisión con números flotantes
                paymentValid = !isNaN(cashAmount) && (cashAmount >= total || Math.abs(cashAmount - total) < 0.01);
            } else {
                // Si no hay valor y el campo no está en foco, marcar como inválido
                paymentValid = document.activeElement !== cashAmountInput;
            }
        }
        
        // Mostrar mensajes de error relevantes
        const errorMsgId = 'checkout-validation-msg';
        let errorMsg = document.getElementById(errorMsgId);
        
        if (!errorMsg) {
            errorMsg = document.createElement('div');
            errorMsg.id = errorMsgId;
            errorMsg.className = 'bg-red-50 text-red-700 p-3 rounded-md mt-3 text-sm hidden';
            sendWhatsappBtn.parentNode.insertBefore(errorMsg, sendWhatsappBtn);
        }
        
        // Determinar qué mensaje mostrar
        if (!nameValid) {
            errorMsg.textContent = "Por favor ingresa tu nombre";
            errorMsg.classList.remove('hidden');
        } else if (!phoneValid) {
            errorMsg.textContent = "Por favor ingresa un número de teléfono válido";
            errorMsg.classList.remove('hidden');
        } else if (deliveryTypeValue === 'delivery' && !locationValid) {
           
            errorMsg.textContent = "Por favor ingresa una dirección de entrega";
            errorMsg.classList.remove('hidden');
        } else if (paymentMethod === 'Efectivo' && !paymentValid && document.activeElement !== document.getElementById('cash-amount')) {
            errorMsg.textContent = "El monto de efectivo es insuficiente";
            errorMsg.classList.remove('hidden');
        } else {
            errorMsg.classList.add('hidden');
        }
        
        // Habilitar o deshabilitar botón de WhatsApp
        const isFormValid = nameValid && phoneValid && locationValid && paymentValid;
        sendWhatsappBtn.disabled = !isFormValid;
    }

    // Nueva función para actualizar los totales del checkout
    function updateCheckoutTotals() {
        const subtotalElement = document.getElementById('checkout-subtotal');
        const deliveryFeeElement = document.getElementById('checkout-delivery-fee');
        const totalElement = document.getElementById('checkout-total');
        
        if (!subtotalElement || !totalElement) return;
        
        // Calcular subtotal del carrito
        const subtotal = getCartTotal();
        
        // Verificar si es entrega a domicilio
        const deliveryType = document.querySelector('input[name="delivery-type"]:checked');
        const isDelivery = deliveryType && deliveryType.value === 'delivery';
        
        // Calcular fee de delivery
        let deliveryFee = 0;
        let deliveryText = '';
        
        if (isDelivery) {
            if (userAddress && userAddress.deliveryPrice !== undefined) {
                deliveryFee = userAddress.deliveryPrice;
                if (userAddress.distance <= 4) {
                    deliveryText = `Envío (${userAddress.distance.toFixed(1)} km):`;
                } else {
                    const extraKm = Math.ceil(userAddress.distance - 4);
                    deliveryText = `Envío (${userAddress.distance.toFixed(1)} km, +$${extraKm * EXTRA_KM_PRICE}):`;
                }
            } else {
                deliveryFee = DELIVERY_PRICE;
                deliveryText = 'Envío a domicilio:';
            }
        }
        
        const total = subtotal + deliveryFee;
        
        // Actualizar elementos
        subtotalElement.textContent = `$${subtotal.toFixed(0)}`;
        totalElement.textContent = `$${total.toFixed(0)}`;
        
        // Mostrar/ocultar fee de delivery
        if (deliveryFeeElement) {
            if (isDelivery) {
                const deliverySpan = deliveryFeeElement.querySelector('span:first-child');
                const priceSpan = deliveryFeeElement.querySelector('span:last-child');
                
                if (deliverySpan) deliverySpan.textContent = deliveryText;
                if (priceSpan) priceSpan.textContent = `+$${deliveryFee.toFixed(0)}`;
                
                deliveryFeeElement.classList.remove('hidden');
            } else {
                deliveryFeeElement.classList.add('hidden');
            }
        }
        
        // Recalcular cambio si está en modo efectivo
        calculateChange();
    }

    // Nueva función para calcular el cambio
    function calculateChange() {
        const cashAmountInput = document.getElementById('cash-amount');
        const changeDisplay = document.getElementById('change-display');
        const changeAmount = document.getElementById('change-amount');
        const insufficientCash = document.getElementById('insufficient-cash');
        
        if (!cashAmountInput || !changeDisplay || !changeAmount) return;
        
        // Solo calcular si el método de pago es efectivo
        const paymentMethod = document.querySelector('input[name="payment"]:checked');
        if (!paymentMethod || paymentMethod.value !== 'Efectivo') {
            changeDisplay.classList.add('hidden');
            if (insufficientCash) insufficientCash.classList.add('hidden');
            return;
        }
        
        const cashValue = parseFloat(cashAmountInput.value) || 0;
        
        if (cashValue <= 0) {
            changeDisplay.classList.add('hidden');
            if (insufficientCash) insufficientCash.classList.add('hidden');
            return;
        }
        
        // Calcular total actual
        const subtotal = getCartTotal();
        const deliveryType = document.querySelector('input[name="delivery-type"]:checked');
        const isDelivery = deliveryType && deliveryType.value === 'delivery';
        const total = subtotal + (isDelivery ? DELIVERY_PRICE : 0);
        
        if (cashValue >= total) {
            // Suficiente dinero - mostrar cambio
            const change = cashValue - total;
            changeAmount.textContent = `$${change.toFixed(0)}`;
            changeDisplay.classList.remove('hidden');
            if (insufficientCash) insufficientCash.classList.add('hidden');
        } else {
            // Dinero insuficiente - mostrar advertencia
            changeDisplay.classList.add('hidden');
            if (insufficientCash) insufficientCash.classList.remove('hidden');
        }
    }

    // Nueva función para manejar cambio de método de pago
    function handlePaymentMethodChange() {
        const cashContainer = document.getElementById('cash-amount-container');
        const paymentMethod = document.querySelector('input[name="payment"]:checked');
        
        if (!cashContainer || !paymentMethod) return;
        
        if (paymentMethod.value === 'Efectivo') {
            cashContainer.style.display = 'block';
            calculateChange();
        } else {
            cashContainer.style.display = 'none';
            // Limpiar displays de cambio
            const changeDisplay = document.getElementById('change-display');
            const insufficientCash = document.getElementById('insufficient-cash');
            if (changeDisplay) changeDisplay.classList.add('hidden');
            if (insufficientCash) insufficientCash.classList.add('hidden');
        }
    }

    function generateWhatsAppMessage() {
        const customerName = customerNameInput ? customerNameInput.value.trim() : '';
        const customerPhone = customerPhoneInput ? customerPhoneInput.value.trim() : '';
        const deliveryTypeElement = document.querySelector('input[name="delivery-type"]:checked');
        const paymentMethodElement = document.querySelector('input[name="payment"]:checked');
        
        if (!deliveryTypeElement || !paymentMethodElement) {
            return 'Error: Faltan datos del formulario';
        }
        
        const deliveryTypeValue = deliveryTypeElement.value;
        const paymentMethod = paymentMethodElement.value;
        
        let address = '';
        let addressDetails = '';
        if (deliveryTypeValue === 'delivery') {
            const addressInput = document.getElementById('address-input').value.trim();
            
            // Use Google Maps validated address if available
            if (window.selectedPlace && window.selectedPlace.formatted_address) {
                address = window.selectedPlace.formatted_address;
                addressDetails = '\n📍 *Dirección verificada con Google Maps*';
                
                // Add coordinates for delivery precision
                if (window.selectedPlace.geometry) {
                    const lat = window.selectedPlace.geometry.location.lat();
                    const lng = window.selectedPlace.geometry.location.lng();
                    addressDetails += `\n📐 Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                }
            } else {
                address = addressInput;
                addressDetails = '\n⚠️ *Dirección sin verificar - confirmar con cliente*';
            }
        }
        
        let cashAmount = '';
        if (paymentMethod === 'Efectivo') {
            const cashAmountInput = document.getElementById('cash-amount').value.trim();
            if (cashAmountInput) {
                cashAmount = parseFloat(cashAmountInput).toFixed(2);
            }
        }
        
        // Construir el mensaje
        let message = `*NUEVO PEDIDO*\n\n`;
        message += `*Nombre:* ${customerName}\n`;
        message += `*Teléfono:* ${customerPhone}\n\n`;
        
        message += `*Tipo de entrega:* ${deliveryTypeValue === 'delivery' ? 'A domicilio' : 'Recoger en local'}\n`;
        
        if (deliveryTypeValue === 'delivery') {
            message += `*Dirección:* ${address}${addressDetails}\n`;
        }
        
        message += `*Método de pago:* ${paymentMethod}\n`;
        
        if (paymentMethod === 'Efectivo' && cashAmount) {
            const total = getCartTotal() + (deliveryTypeValue === 'delivery' ? DELIVERY_PRICE : 0);
            const change = parseFloat(cashAmount) - total;
            
            message += `*Pagará con:* ${cashAmount}\n`;
            message += `*Cambio:* ${change.toFixed(0)}\n`;
        }
        
        message += `\n*DETALLE DEL PEDIDO:*\n`;
        
        cart.forEach(item => {
            message += `\n• ${item.quantity}x ${ item.baseItem.name} - $${(item.price * item.quantity).toFixed(2)}\n`;
            
            if (item.isCombo) {
                // Detalles de hamburguesas en combo
                message += item.choices.map(choice => {
                    let text = `  ↳ ${choice.burger.name}`;
                    if (choice.customizations && choice.customizations.length > 0) {
                        text += ` (+ ${choice.customizations.map(c => c.name).join(', ')})`;
                    }
                    if (choice.fries) {
                        text += `, Papas ${choice.fries.type}`;
                    }
                    if (choice.onionRings) {
                        text += `, Aros de Cebolla`;
                    }
                    return text;
                }).join('\n');
                message += '\n';
            } else if (item.customizations && item.customizations.length > 0) {
                // Detalles de personalizaciones
                message += `  ↳ Con: ${item.customizations.map(c => c.name).join(', ')}\n`;
            }
            
            if (!item.isCombo && item.fries) {
                message += `  ↳ Con Papas ${item.fries.type}\n`;
            }
            
            if (!item.isCombo && item.onionRings) {
                message += `  ↳ Con Aros de Cebolla\n`;
            }
            
            if (item.menuExtras && item.menuExtras.length > 0) {
                item.menuExtras.forEach(extra => {
                    message += `  ↳ ${extra.quantity}x ${extra.name}\n`;
                });
            }
        });
        
        // Totales
        const subtotal = getCartTotal();
        const deliveryCost = deliveryTypeValue === 'delivery' ? DELIVERY_PRICE : 0;
        const total = subtotal + deliveryCost;
        
        message += `\n*Subtotal:* ${subtotal.toFixed(0)}`;
        message += `\n*Envío:* ${deliveryTypeValue === 'delivery' ? `${DELIVERY_PRICE.toFixed(0)}` : 'Gratis'}`;
        message += `\n*TOTAL:* ${total.toFixed(0)}`;
        
        return message;
    }

    // Guardar y cargar datos
    function loadCustomerData() {
        const savedPhone = localStorage.getItem('customerPhone');
        if (savedPhone) {
            customerPhoneInput.value = savedPhone;
        }
    }
    
    function saveCustomerData() {
        localStorage.setItem('customerPhone', customerPhoneInput.value.trim());
    }
    
    function loadCart() {
        try {
            const savedCart = JSON.parse(localStorage.getItem('cart'));
            if (savedCart && Array.isArray(savedCart)) {
                cart = savedCart;
            }
        } catch (e) {
            console.error('Error loading cart:', e);
            localStorage.removeItem('cart');
        }
    }
    
    // Initialize everything when page loads
    function initialize() {
        renderMenu();
        setupEventListeners();
        initializeEnhancements();
        loadCustomerData();
        loadCart();
        updateCart();
        
        // Set current year in footer
        document.getElementById('year').textContent = '2024';
        
        // Add smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Add progressive web app features
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                // Service worker registration failed, but that's ok
            });
        }
        
        // Add performance monitoring
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'largest-contentful-paint') {
                        // Log LCP for optimization
                        console.log('LCP:', entry.startTime);
                    }
                }
            });
            observer.observe({entryTypes: ['largest-contentful-paint']});
        }
        
        // Initialize theme preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        function handleThemeChange(e) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
        handleThemeChange(prefersDark);
        prefersDark.addEventListener('change', handleThemeChange);
        
        // Add error boundary for JavaScript errors
        window.addEventListener('error', (e) => {
            console.error('JavaScript Error:', e.error);
            // Could send to analytics service
        });
        
        // Add visibility change handler for performance
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is hidden, pause expensive operations
                clearTimeout(cartAbandonmentTimer);
            } else {
                // Page is visible, resume operations
                startCartAbandonmentTimer();
            }
        });
        
        console.log('🍔 SR & SRA BURGER - Sistema inicializado correctamente!');
        console.log('💡 Todas las mejoras UX/UI están activas');
        console.log('🚀 Experiencia de usuario optimizada para conversiones');
    }
    
    // Start the application
    initialize();

    // --- GOOGLE MAPS INTEGRATION ---
    
    let autocomplete;
    let map;
    let marker;
    let selectedPlace = null;
    // Hero map (ubicación en el hero)
    let heroMap = null;
    let heroMarker = null;
    let heroGeocoder = null;
    let heroSelectedLatLng = null; // Última posición elegida en el hero
    
    // Initialize Google Maps when API is loaded (ACTIVADO CON API REAL)
    window.initializeGoogleMaps = function() {
        console.log('🗺️ Inicializando sistema de mapas...');
        
        // Verificar si Google Maps está realmente disponible
        if (window.google && window.google.maps && window.google.maps.places) {
            console.log('✅ Google Maps API disponible - configurando autocompletado avanzado');
            try {
                initializeAddressAutocomplete();
                console.log('🎯 Autocompletado de Google Maps configurado exitosamente');
            } catch (error) {
                console.warn('⚠️ Error configurando autocompletado, usando entrada manual:', error);
                const addressInput = document.getElementById('address-input');
                if (addressInput) {
                    setupFreeTextInput(addressInput);
                }
            }
        } else {
            console.log('⚠️ Google Maps no disponible - configurando entrada manual');
            const addressInput = document.getElementById('address-input');
            if (addressInput) {
                setupFreeTextInput(addressInput);
            }
        }
        
        // Si el bloque de ubicación del hero está visible, inicializar el mapa ahí también
        const heroSection = document.getElementById('hero-location');
        if (heroSection && !heroSection.classList.contains('hidden')) {
            setTimeout(() => {
                if (window.google && window.google.maps) {
                    console.log('🗺️ Inicializando mapa del hero...');
                    try {
                        initializeHeroMap();
                        console.log('✅ Mapa del hero inicializado');
                    } catch (error) {
                        console.warn('⚠️ Error inicializando mapa del hero:', error);
                        setupHeroLocationFallback();
                    }
                } else {
                    console.log('📍 Hero map no disponible - usando entrada manual');
                    setupHeroLocationFallback();
                }
            }, 100);
        }
    };
    
    // Intentar inicializar inmediatamente si Google Maps ya está disponible
    if (window.google && window.google.maps && window.google.maps.places) {
        console.log('✅ Google Maps ya disponible - inicializando ahora');
        initializeAddressAutocomplete();
    } else {
        // No hay Google Maps disponible, inicializar sin maps
        console.log('🔄 Google Maps no disponible - inicializando sin mapas');
        setTimeout(() => {
            if (typeof window.initializeGoogleMaps === 'function') {
                window.initializeGoogleMaps();
            }
        }, 1000);
    }
    
    // Fallback mejorado: esperar un poco más para la carga de Google Maps
    setTimeout(() => {
        const addressInput = document.getElementById('address-input');
        if (addressInput && !autocomplete) {
            console.log('⚠️ Activando autocompletado simulado como respaldo');
            setupFreeTextInput(addressInput);
        }
    }, 3000); // Aumentado a 3 segundos para mejor carga
    
    function initializeAddressAutocomplete() {
        const addressInput = document.getElementById('address-input');
        
        if (!addressInput) {
            console.log('⚠️ Elemento address-input no encontrado');
            return;
        }

        // Primero, asegurar que el campo siempre permita escribir libremente
        addressInput.removeAttribute('readonly');
        addressInput.removeAttribute('disabled');
        addressInput.style.pointerEvents = 'auto';
        
        console.log('🔍 Verificando disponibilidad de Google Maps...');
        
        // Si Google Maps no está disponible, usar entrada libre inmediatamente
        if (!window.google || !window.google.maps || !window.google.maps.places) {
            console.log('⚠️ Google Maps no disponible - usando autocompletado simulado');
            setupFreeTextInput(addressInput);
            return;
        }
        
        try {
            console.log('✅ Google Maps disponible - configurando autocompletado para Coahuila 36, Minatitlán');
            
            // Configure autocomplete options - Optimizado para área de entrega de 4km desde Coahuila 36
            const options = {
                types: ['address'], // Enfocado en direcciones
                componentRestrictions: { country: 'mx' }, // Restringir a México
                bounds: {
                    // Área de entrega: 4 km radio desde Coahuila 36, Emiliano Zapata, Minatitlán
                    // Coordenadas aproximadas: 17.9950, -94.5370
                    north: 18.0310,  // +4km Norte
                    south: 17.9590,  // -4km Sur  
                    east: -94.4910,  // +4km Este
                    west: -94.5830   // -4km Oeste
                },
                strictBounds: false, // Permitir sugerencias cercanas también
                fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id']
            };
            
            // Initialize autocomplete
            autocomplete = new google.maps.places.Autocomplete(addressInput, options);
            
            // Configurar preferencias adicionales
            autocomplete.setOptions({
                strictBounds: false,
                placeIdOnly: false
            });
            
            // Add place changed listener
            autocomplete.addListener('place_changed', onPlaceChanged);
            
            // Mejorar la experiencia de usuario
            addressInput.addEventListener('focus', function() {
                console.log('🎯 Campo de dirección enfocado - Google Maps listo');
                // Dar una pista al usuario con área de cobertura específica
                if (this.value === '') {
                    this.placeholder = 'Escribe tu dirección... (Cobertura: 4 km desde Coahuila 36, Minatitlán)';
                }
            });
            
            addressInput.addEventListener('input', function(e) {
                console.log('📝 Escribiendo con Google Maps activo:', e.target.value.length + ' caracteres');
                
                // Verificar que las sugerencias aparezcan
                setTimeout(() => {
                    const pacContainer = document.querySelector('.pac-container');
                    if (pacContainer && e.target.value.length > 2) {
                        console.log('💡 Sugerencias de Google Maps disponibles');
                    }
                }, 500);
            });
            
            console.log('✅ Autocompletado de Google Maps inicializado para área de entrega (4km desde Coahuila 36)');
            
        } catch (error) {
            console.error('❌ Error al inicializar Google Maps:', error);
            console.log('🔄 Activando autocompletado simulado como respaldo');
            setupFreeTextInput(addressInput);
        }
        
        // Initialize map view button
        const showMapBtn = document.getElementById('show-map-btn');
        if (showMapBtn) {
            showMapBtn.addEventListener('click', toggleMapView);
        }
    }

    // --- HERO MAP: Selección de ubicación en el hero ---
    function initializeHeroMap() {
        const mapDiv = document.getElementById('hero-map');
        if (!mapDiv) return;

        if (!window.google || !window.google.maps) {
            const preview = document.getElementById('hero-address-preview');
            if (preview) preview.textContent = 'Escribe tu dirección en el buscador y confirma para validar cobertura.';
            // Fallback: permitir búsqueda por texto y confirmación sin Google Maps
            const inputA = document.getElementById('hero-search-input');
            const btnA = document.getElementById('hero-search-btn');
            const geoBtn = document.getElementById('hero-use-geolocation');
            const confirmBtn = document.getElementById('hero-confirm-location');
            let lastResult = null; // {formatted_address, location:{lat,lng}}

            const updatePreviewFromResult = (res) => {
                if (!res || !preview) return;
                const { lat, lng } = res.location;
                const distance = calculateDistance(RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng, lat, lng);
                const zone = getDeliveryZone(distance);
                const feeText = zone && zone.price !== null ? `$${zone.price}` : 'Lo sentimos estas demasiado lejos';
                preview.innerHTML = `
                    <div><strong>Dirección:</strong> ${res.formatted_address}</div>
                    <div class="text-sm text-gray-700">Distancia: ${distance.toFixed(1)} km • Envío: ${feeText}</div>
                `;
            };

            const doSearch = async (el) => {
                if (!el) return;
                const q = el.value.trim();
                if (!q) return;
                try {
                    const r = await fallbackGeocodeAddress(q);
                    lastResult = r;
                    updatePreviewFromResult(r);
                } catch (_) { /* ignore */ }
            };

            if (inputA) inputA.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(inputA); } });
            if (btnA) btnA.addEventListener('click', () => doSearch(inputA));
            if (geoBtn && navigator.geolocation) {
                geoBtn.addEventListener('click', () => {
                    geoBtn.disabled = true; geoBtn.textContent = 'Localizando…';
                    navigator.geolocation.getCurrentPosition((pos) => {
                        const { latitude, longitude } = pos.coords;
                        lastResult = {
                            formatted_address: `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`,
                            location: { lat: latitude, lng: longitude }
                        };
                        updatePreviewFromResult(lastResult);
                        geoBtn.disabled = false; geoBtn.textContent = 'Usar mi ubicación';
                    }, () => { geoBtn.disabled = false; geoBtn.textContent = 'Usar mi ubicación'; }, { enableHighAccuracy: true, timeout: 8000 });
                });
            }
            if (confirmBtn) {
                console.log('✅ Botón hero-confirm-location encontrado, agregando event listener');
                
                // Asegurar que el botón sea clickeable
                confirmBtn.style.pointerEvents = 'auto';
                confirmBtn.style.cursor = 'pointer';
                confirmBtn.style.touchAction = 'manipulation';
                
                confirmBtn.addEventListener('click', async (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    
                    console.log('🔘 ¡CLICK! Botón "Confirmar ubicación" clickeado');
                    console.log('📱 Tipo de evento:', event.type);
                    console.log('🖱️ Origen:', event.target);
                    
                    // Feedback visual inmediato
                    confirmBtn.style.opacity = '0.7';
                    setTimeout(() => { confirmBtn.style.opacity = '1'; }, 200);
                    
                    // Si no hay resultado previo, intentar con texto
                    if (!lastResult) {
                        console.log('⚠️ No hay lastResult, intentando obtener de input');
                        const q = (inputA && inputA.value.trim()) || '';
                        if (q) {
                            console.log('🔍 Buscando dirección:', q);
                            try { 
                                lastResult = await fallbackGeocodeAddress(q);
                                console.log('✅ Dirección encontrada:', lastResult);
                            } catch (err) {
                                console.error('❌ Error geocoding:', err);
                            }
                        } else {
                            console.log('⚠️ No hay dirección en el input');
                        }
                    }
                    
                    console.log('📍 LastResult:', lastResult);
                    
                    // Remover mensajes anteriores
                    const noticeId = 'hero-confirm-notice';
                    const old = document.getElementById(noticeId);
                    if (old) old.remove();
                    
                    if (lastResult) {
                        const { lat, lng } = lastResult.location;
                        const d = calculateDistance(RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng, lat, lng);
                        const zone = getDeliveryZone(d);
                        
                        console.log('📏 Distancia:', d.toFixed(2), 'km');
                        console.log('🗺️ Zona:', zone);
                        
                        if (zone && zone.price !== null) {
                            console.log('✅ SÍ ENTREGAMOS - Mostrando modal grande');
                            
                            // ✅ SÍ ENTREGAMOS - Mensaje grande y llamativo
                            
                            // Guardar la ubicación confirmada para el checkout
                            userAddress = {
                                formatted_address: lastResult.formatted_address,
                                distance: d,
                                deliveryPrice: zone.price,
                                zone: zone.zone,
                                coordinates: { lat, lng }
                            };
                            
                            // Crear mensaje compacto y visible
                            const bigMessage = document.createElement('div');
                            bigMessage.id = noticeId;
                            bigMessage.className = 'fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-fade-in';
                            bigMessage.innerHTML = `
                                <div class="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-2xl p-4 sm:p-5 transform animate-scale-in">
                                    <!-- Header compacto -->
                                    <div class="flex items-start justify-between mb-3">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                                                <i class="fas fa-check-circle text-white text-xl"></i>
                                            </div>
                                            <h3 class="text-lg font-bold text-white leading-tight">
                                                ¡Sí entregamos! 🎉
                                            </h3>
                                        </div>
                                        <button id="hero-close-message-btn" class="text-white/70 hover:text-white transition-colors">
                                            <i class="fas fa-times text-xl"></i>
                                        </button>
                                    </div>
                                    
                                    <!-- Info compacta -->
                                    <div class="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-3">
                                        <div class="flex items-center justify-between text-white text-sm mb-2">
                                            <span><i class="fas fa-route mr-1"></i> ${d.toFixed(1)} km</span>
                                            <span><i class="fas fa-dollar-sign mr-1"></i> $${zone.price}</span>
                                            <span><i class="fas fa-clock mr-1"></i> ${d <= 4 ? '25-35' : '35-45'} min</span>
                                        </div>
                                        <p class="text-white/90 text-xs truncate">
                                            <i class="fas fa-map-marker-alt mr-1"></i>
                                            ${lastResult.formatted_address}
                                        </p>
                                    </div>
                                    
                                    <!-- Botón compacto -->
                                    <button id="hero-go-to-menu-btn" class="w-full bg-white text-green-600 px-4 py-3 rounded-xl font-bold text-sm hover:bg-green-50 transform hover:scale-105 transition-all duration-300 shadow-lg">
                                        <i class="fas fa-utensils mr-2"></i>
                                        VER MENÚ Y ORDENAR
                                    </button>
                                </div>
                            `;
                            document.body.appendChild(bigMessage);
                            
                            // Event listener para ir al menú
                            const goToMenuBtn = document.getElementById('hero-go-to-menu-btn');
                            if (goToMenuBtn) {
                                goToMenuBtn.addEventListener('click', () => {
                                    // Cerrar el modal
                                    bigMessage.style.opacity = '0';
                                    setTimeout(() => bigMessage.remove(), 300);
                                    
                                    // Ir al menú con scroll suave
                                    setTimeout(() => {
                                        const menuSection = document.getElementById('menu');
                                        if (menuSection) {
                                            menuSection.scrollIntoView({ 
                                                behavior: 'smooth', 
                                                block: 'start' 
                                            });
                                            
                                            // Mostrar mensaje de bienvenida flotante
                                            const welcomeMsg = document.createElement('div');
                                            welcomeMsg.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-bounce';
                                            welcomeMsg.innerHTML = '🍔 ¡Elige tus hamburguesas favoritas!';
                                            document.body.appendChild(welcomeMsg);
                                            
                                            setTimeout(() => {
                                                welcomeMsg.style.opacity = '0';
                                                welcomeMsg.style.transition = 'opacity 0.5s';
                                                setTimeout(() => welcomeMsg.remove(), 500);
                                            }, 3000);
                                        }
                                    }, 100);
                                });
                            }
                            
                            // Event listener para cerrar
                            const closeBtn = document.getElementById('hero-close-message-btn');
                            if (closeBtn) {
                                closeBtn.addEventListener('click', () => {
                                    bigMessage.style.opacity = '0';
                                    setTimeout(() => bigMessage.remove(), 300);
                                });
                            }
                            
                            // Cerrar al hacer clic fuera del modal
                            bigMessage.addEventListener('click', (e) => {
                                if (e.target === bigMessage) {
                                    bigMessage.style.opacity = '0';
                                    setTimeout(() => bigMessage.remove(), 300);
                                }
                            });
                            
                        } else {
                            // ❌ NO ENTREGAMOS - Mensaje de error compacto
                            const errorMessage = document.createElement('div');
                            errorMessage.id = noticeId;
                            errorMessage.className = 'fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-fade-in';
                            errorMessage.innerHTML = `
                                <div class="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-2xl p-4 sm:p-5 transform animate-scale-in">
                                    <!-- Header compacto -->
                                    <div class="flex items-start justify-between mb-3">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                                                <i class="fas fa-exclamation-triangle text-white text-xl"></i>
                                            </div>
                                            <h3 class="text-lg font-bold text-white leading-tight">
                                                Demasiado lejos 😔
                                            </h3>
                                        </div>
                                        <button id="hero-close-error-btn" class="text-white/70 hover:text-white transition-colors">
                                            <i class="fas fa-times text-xl"></i>
                                        </button>
                                    </div>
                                    
                                    <!-- Info compacta -->
                                    <div class="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-3">
                                        <p class="text-white text-sm mb-2">
                                            <i class="fas fa-route mr-1"></i> 
                                            Distancia: <strong>${d.toFixed(1)} km</strong>
                                        </p>
                                        <p class="text-white/80 text-xs">
                                            Cobertura máxima: ${MAX_DELIVERY_DISTANCE} km
                                        </p>
                                    </div>
                                    
                                    <!-- Alternativa -->
                                    <div class="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-3">
                                        <p class="text-white text-xs">
                                            <i class="fas fa-store mr-1"></i>
                                            <strong>Recoge en local:</strong><br>
                                            Coahuila 36, Minatitlán
                                        </p>
                                    </div>
                                    
                                    <!-- Botón compacto -->
                                    <button id="hero-close-error-btn-main" class="w-full bg-white text-red-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-50 transition-all shadow-lg">
                                        Entendido
                                    </button>
                                </div>
                            `;
                            document.body.appendChild(errorMessage);
                            
                            // Event listeners para cerrar (ambos botones)
                            const closeErrorBtn = document.getElementById('hero-close-error-btn');
                            const closeErrorBtnMain = document.getElementById('hero-close-error-btn-main');
                            
                            const closeError = () => {
                                errorMessage.style.opacity = '0';
                                setTimeout(() => errorMessage.remove(), 300);
                            };
                            
                            if (closeErrorBtn) closeErrorBtn.addEventListener('click', closeError);
                            if (closeErrorBtnMain) closeErrorBtnMain.addEventListener('click', closeError);
                        }
                    } else {
                        // ⚠️ NO HAY DIRECCIÓN - Pedir que escriba una
                        const warningMessage = document.createElement('div');
                        warningMessage.id = noticeId;
                        warningMessage.className = 'bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg mt-3 animate-fade-in';
                        warningMessage.innerHTML = `
                            <div class="flex items-center">
                                <i class="fas fa-exclamation-circle text-orange-500 text-xl mr-3"></i>
                                <p class="text-orange-800 font-medium">
                                    ⚠️ Por favor, escribe tu dirección arriba y haz clic en "Buscar" primero.
                                </p>
                            </div>
                        `;
                        if (preview) preview.appendChild(warningMessage);
                        
                        // Auto-eliminar después de 5 segundos
                        setTimeout(() => {
                            warningMessage.style.opacity = '0';
                            setTimeout(() => warningMessage.remove(), 300);
                        }, 5000);
                    }
                });
            }
            return;
        }

        try {
            if (!heroGeocoder) heroGeocoder = new google.maps.Geocoder();
            // Centro: ubicación del restaurante por defecto o la última posición elegida
            const center = heroSelectedLatLng || new google.maps.LatLng(RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng);
            heroMap = new google.maps.Map(mapDiv, {
                center,
                zoom: 15,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false
            });
            heroMarker = new google.maps.Marker({
                map: heroMap,
                position: center,
                draggable: true,
                icon: {
                    url: 'data:image/svg+xml;base64,' + btoa(`
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
                            <path fill="#FFB300" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(36, 36)
                }
            });

            heroSelectedLatLng = center;
            // Actualizar preview inicial
            updateHeroLocation(center);

            // Drag para ajustar ubicación
            heroMarker.addListener('dragend', () => {
                const pos = heroMarker.getPosition();
                heroSelectedLatLng = pos;
                updateHeroLocation(pos);
            });

            // Botones del hero
            const geoBtn = document.getElementById('hero-use-geolocation');
            if (geoBtn) {
                geoBtn.addEventListener('click', () => {
                    if (!navigator.geolocation) return;
                    geoBtn.disabled = true;
                    geoBtn.textContent = 'Localizando…';
                    navigator.geolocation.getCurrentPosition((res) => {
                        const { latitude, longitude } = res.coords;
                        const pos = new google.maps.LatLng(latitude, longitude);
                        heroSelectedLatLng = pos;
                        heroMap.setCenter(pos);
                        heroMarker.setPosition(pos);
                        updateHeroLocation(pos);
                        geoBtn.disabled = false;
                        geoBtn.textContent = 'Usar mi ubicación';
                    }, () => {
                        geoBtn.disabled = false;
                        geoBtn.textContent = 'Usar mi ubicación';
                    }, { enableHighAccuracy: true, timeout: 8000 });
                });
            }

            // NOTA: Event listener para hero-confirm-location ya está definido arriba
            // con el modal grande y llamativo. Este código está comentado para evitar duplicados.
            /*
            const confirmBtn = document.getElementById('hero-confirm-location');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', async () => {
                    if (!heroSelectedLatLng) return;
                    const preview = document.getElementById('hero-address-preview');
                    let formatted = '';
                    if (heroGeocoder) {
                        try {
                            const geoRes = await heroGeocoder.geocode({ location: heroSelectedLatLng });
                            if (geoRes && geoRes.results && geoRes.results[0]) {
                                formatted = geoRes.results[0].formatted_address;
                            }
                        } catch (e) { }
                    }
                    if (!formatted) formatted = `Lat ${heroSelectedLatLng.lat().toFixed(5)}, Lng ${heroSelectedLatLng.lng().toFixed(5)}`;

                    // Calcular distancia y zona
                    const distance = calculateDistance(RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng, heroSelectedLatLng.lat(), heroSelectedLatLng.lng());
                    const zone = getDeliveryZone(distance);

                    // Establecer como dirección seleccionada global
                    if (window.google && window.google.maps) {
                        selectedPlace = {
                            formatted_address: formatted,
                            geometry: { location: heroSelectedLatLng }
                        };
                    }

                    if (zone && zone.price !== null) {
                        userAddress = {
                            formatted_address: formatted,
                            distance: distance,
                            deliveryPrice: zone.price,
                            zone: zone.zone,
                            coordinates: { lat: heroSelectedLatLng.lat(), lng: heroSelectedLatLng.lng() }
                        };
                    } else {
                        userAddress = null;
                    }

                    // Escribir en el input de dirección del checkout si existe
                    const checkoutInput = document.getElementById('address-input');
                    if (checkoutInput) checkoutInput.value = formatted;

                    updateCheckoutTotals();
                    if (preview) {
                        // Quitar aviso anterior
                        const noticeId = 'hero-confirm-notice';
                        const old = document.getElementById(noticeId);
                        if (old) old.remove();
                        const msg = document.createElement('div');
                        msg.id = noticeId;
                        msg.className = 'mt-2 text-sm';
                        if (zone && zone.price !== null) {
                            msg.classList.add('text-green-700');
                            msg.textContent = 'Sí, entregamos en tu zona ✔';
                        } else {
                            msg.classList.add('text-red-700');
                            msg.textContent = 'Lo sentimos estas demasiado lejos';
                        }
                        preview.appendChild(msg);
                    }
                });
            }
            */

            // Hero search: Places if available, else Enter/click to fallback geocode
    const heroSearch = document.getElementById('hero-search-input');
    const heroSearchBtn = document.getElementById('hero-search-btn');
        const runHeroSearch = async (el) => {
            if (!el) return;
            const q = el.value.trim();
            if (!q) return;
            try {
                const r = await fallbackGeocodeAddress(q);
                if (r && r.location && window.google && window.google.maps) {
                    const loc = new google.maps.LatLng(r.location.lat, r.location.lng);
                    heroMap.panTo(loc);
                    heroMap.setZoom(15);
                    heroMarker.setPosition(loc);
                    heroSelectedLatLng = loc;
                    updateHeroLocation(loc);
                }
            } catch (err) {
                console.warn('No se pudo geocodificar la búsqueda del héroe', err);
            }
        };
        const hookSearch = (el) => {
        if (!el) return;
                if (google.maps.places) {
                    try {
            const heroAutocomplete = new google.maps.places.Autocomplete(el, {
                            fields: ['geometry','formatted_address'],
                            componentRestrictions: { country: ['mx'] }
                        });
                        heroAutocomplete.addListener('place_changed', () => {
                            const p = heroAutocomplete.getPlace();
                            if (p && p.geometry && p.geometry.location) {
                                const loc = p.geometry.location;
                                heroMap.panTo(loc);
                                heroMap.setZoom(15);
                                heroMarker.setPosition(loc);
                                heroSelectedLatLng = loc;
                                updateHeroLocation(loc);
                            }
                        });
                    } catch (_) { /* ignore */ }
                }
        // Fallback Enter handling (works with or without Places)
        el.addEventListener('keydown', async (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
            runHeroSearch(el);
                    }
        });
        };
    hookSearch(heroSearch);
    if (heroSearchBtn) heroSearchBtn.addEventListener('click', () => runHeroSearch(heroSearch));
        } catch (err) {
            console.error('Error inicializando hero map', err);
        }
    }

    async function updateHeroLocation(latLng) {
        const preview = document.getElementById('hero-address-preview');
        if (!preview) return;
        if (!window.google || !window.google.maps) {
            preview.textContent = 'Google Maps no está cargado.';
            return;
        }
        try {
            if (!heroGeocoder) heroGeocoder = new google.maps.Geocoder();
            const res = await heroGeocoder.geocode({ location: latLng });
            const formatted = res && res.results && res.results[0] ? res.results[0].formatted_address : null;
            const distance = calculateDistance(RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng, latLng.lat(), latLng.lng());
            const zone = getDeliveryZone(distance);
            if (formatted) {
                const feeText = zone && zone.price !== null ? `$${zone.price}` : 'Lo sentimos estas demasiado lejos';
                preview.innerHTML = `
                    <div><strong>Dirección:</strong> ${formatted}</div>
                    <div class="text-sm text-gray-700">Distancia: ${distance.toFixed(1)} km • Envío: ${feeText}</div>
                `;
            } else {
                preview.textContent = `Lat ${latLng.lat().toFixed(5)}, Lng ${latLng.lng().toFixed(5)}`;
            }
        } catch (e) {
            preview.textContent = `Lat ${latLng.lat().toFixed(5)}, Lng ${latLng.lng().toFixed(5)}`;
        }
    }
    
    // Función para configurar entrada libre de texto con simulación de autocompletado
    function setupFreeTextInput(addressInput) {
        // Asegurar que el campo permita escritura libre
        addressInput.style.backgroundColor = 'white';
        addressInput.removeAttribute('readonly');
        addressInput.removeAttribute('disabled');
        
        console.log('✅ Configurando entrada libre de texto con autocompletado simulado');
        
        // Crear contenedor de sugerencias
        let suggestionsContainer = document.getElementById('address-suggestions');
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'address-suggestions';
            suggestionsContainer.className = 'absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden';
            addressInput.parentElement.appendChild(suggestionsContainer);
        }
        
        // Direcciones de ejemplo para área de cobertura (4km desde Coahuila 36, Emiliano Zapata)
        const sampleAddresses = [
            'Coahuila 36, Emiliano Zapata, Minatitlán, Veracruz (SEDE)',
            'Calle Zaragoza 123, Col. Centro, Minatitlán, Veracruz',
            'Av. Hidalgo 456, Col. Deportiva, Minatitlán, Veracruz',
            'Calle Morelos 789, Col. Petrolera, Minatitlán, Veracruz',
            'Av. Universidad 321, Col. Universitaria, Minatitlán, Veracruz',
            'Calle Juárez 654, Col. Centro, Minatitlán, Veracruz',
            'Av. Insurgentes 987, Col. Las Flores, Minatitlán, Veracruz',
            'Calle Galeana 147, Col. Emiliano Zapata, Minatitlán, Veracruz',
            'Av. 20 de Noviembre 258, Col. Benito Juárez, Minatitlán, Veracruz',
            'Calle Aldama 369, Col. La Cangrejera, Minatitlán, Veracruz',
            'Av. Obregón 741, Col. Insurgentes, Minatitlán, Veracruz',
            'Calle Victoria 852, Col. Francisco Villa, Minatitlán, Veracruz',
            'Av. Reforma 963, Col. 10 de Mayo, Minatitlán, Veracruz'
        ];
        
        // Event listener para mostrar sugerencias
        addressInput.addEventListener('input', function(e) {
            const value = e.target.value.trim();
            console.log('Dirección escrita:', value, 'Longitud:', value.length);
            
            if (value.length >= 3) {
                // Filtrar direcciones que coincidan
                const matches = sampleAddresses.filter(addr => 
                    addr.toLowerCase().includes(value.toLowerCase())
                );
                
                if (matches.length > 0) {
                    showSuggestions(matches, value);
                } else {
                    hideSuggestions();
                }
                
                // Simular validación después de ciertos caracteres
                if (value.length > 10) {
                    showAddressConfirmation(value);
                }
            } else {
                hideSuggestions();
            }
        });

        // Validar de inmediato al presionar Enter
        addressInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = addressInput.value.trim();
                if (value.length >= 3) {
                    showAddressConfirmation(value);
                }
            }
        });
        
        // Función para mostrar sugerencias
        function showSuggestions(suggestions, query) {
            suggestionsContainer.innerHTML = suggestions.slice(0, 5).map(addr => {
                const isSede = addr.includes('SEDE');
                return `
                <div class="suggestion-item p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${isSede ? 'bg-blue-50 border-blue-200' : ''}"
                     onclick="selectSuggestion('${addr}')">
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-map-marker-alt ${isSede ? 'text-blue-600' : 'text-blue-500'}"></i>
                        <div class="flex-grow">
                            <div class="font-medium text-gray-800">${highlightMatch(addr, query)}</div>
                            <div class="text-xs ${isSede ? 'text-blue-600 font-semibold' : 'text-gray-500'}">
                                ${isSede ? '🏪 Nuestra ubicación principal' : 'Área de cobertura de entrega'}
                            </div>
                        </div>
                        ${isSede ? '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">SEDE</span>' : ''}
                    </div>
                </div>
            `}).join('');
            
            suggestionsContainer.classList.remove('hidden');
        }
        
        // Función para resaltar coincidencias
        function highlightMatch(text, query) {
            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
        }
        
        // Función para ocultar sugerencias
        function hideSuggestions() {
            suggestionsContainer.classList.add('hidden');
        }
        
        // Función global para seleccionar sugerencia
        window.selectSuggestion = function(address) {
            addressInput.value = address;
            hideSuggestions();
            showAddressConfirmation(address);
        };
        
        // Confirmación y validación con geocoding de respaldo
        async function showAddressConfirmation(address) {
            const mapContainer = document.getElementById('map-container');
            const selectedAddressDiv = document.getElementById('selected-address');
            if (!mapContainer || !selectedAddressDiv) return;

            mapContainer.classList.remove('hidden');
            selectedAddressDiv.innerHTML = `
                <div class="flex items-start space-x-2">
                    <i class="fas fa-map-marker-alt text-green-600 mt-1"></i>
                    <div>
                        <div class="font-medium text-gray-800">${address}</div>
                        <div class="text-xs text-gray-500 mt-1">Validando distancia...</div>
                    </div>
                </div>
            `;

            try {
                const result = await fallbackGeocodeAddress(address);
                if (!result) {
                    showAddressError('No se pudo localizar esa dirección. Intenta ser más específico.');
                    return;
                }
                const lat = result.location.lat;
                const lng = result.location.lng;
                const distance = calculateDistance(RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng, lat, lng);
                const zone = getDeliveryZone(distance);

                if (zone.price !== null) {
                    userAddress = {
                        formatted_address: result.formatted_address,
                        distance,
                        deliveryPrice: zone.price,
                        zone: zone.zone,
                        coordinates: { lat, lng }
                    };

                    selectedAddressDiv.innerHTML = `
                        <div class="flex items-start space-x-2">
                            <i class="fas fa-map-marker-alt text-green-600 mt-1"></i>
                            <div>
                                <div class="font-medium text-gray-800">${result.formatted_address}</div>
                                <div class="text-xs text-blue-600 mt-1">
                                    <i class="fas fa-route mr-1"></i>
                                    Aproximadamente ${distance.toFixed(1)} km desde SR & SRA BURGER
                                </div>
                            </div>
                        </div>
                    `;

                    showDeliveryZoneInfo({
                        name: zone.zone,
                        distance,
                        fee: zone.price,
                        time: distance <= 4 ? '25-35 min' : '35-45 min',
                        description: zone.description,
                        color: zone.color
                    });
                    updateCheckoutTotals();
                } else {
                    userAddress = null;
                    // Mostrar mensaje exacto solicitado
                    const existingInfo = mapContainer.querySelector('.zone-info');
                    if (existingInfo) existingInfo.remove();
                    const warning = document.createElement('div');
                    warning.className = 'zone-info bg-red-50 border border-red-200 rounded-lg p-3 mt-2';
                    warning.innerHTML = `
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-exclamation-triangle text-red-600"></i>
                            <div>
                                <div class="font-medium text-red-800">Lo sentimos estas demasiado lejos</div>
                                <div class="text-sm text-red-700">Tu dirección está a ${distance.toFixed(1)} km. Solo entregamos dentro de ${MAX_DELIVERY_DISTANCE} km.</div>
                            </div>
                        </div>
                    `;
                    mapContainer.appendChild(warning);
                }
            } catch (e) {
                console.error('Fallback geocoding failed', e);
                showAddressError('No se pudo validar la dirección en este momento.');
            }
        }
        
        // Ocultar sugerencias al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (!addressInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                hideSuggestions();
            }
        });
        
    console.log('✅ Entrada libre de texto con autocompletado simulado configurada');
    }
    
    function onPlaceChanged() {
        const place = autocomplete.getPlace();
        
        if (!place.geometry) {
            console.log('❌ No se encontraron detalles para esta dirección');
            showAddressError('No se encontraron detalles para esta dirección');
            return;
        }
        
        selectedPlace = place;
        displaySelectedAddress(place);
        validateAddressZone(place);
        
        console.log('📍 Dirección seleccionada:', place.formatted_address);
    }
    
    function displaySelectedAddress(place) {
        const mapContainer = document.getElementById('map-container');
        const selectedAddressDiv = document.getElementById('selected-address');
        
        if (!mapContainer || !selectedAddressDiv) return;
        
        // Show confirmation container
        mapContainer.classList.remove('hidden');
        
        // Display formatted address
        selectedAddressDiv.innerHTML = `
            <div class="flex items-start space-x-2">
                <i class="fas fa-map-marker-alt text-green-600 mt-1"></i>
                <div>
                    <div class="font-medium text-gray-800">${place.formatted_address}</div>
                    <div class="text-xs text-gray-500 mt-1">
                        <i class="fas fa-check-circle text-green-500 mr-1"></i>
                        Dirección verificada con Google Maps
                    </div>
                </div>
            </div>
        `;
        
        // Show distance estimate
        estimateDeliveryDistance(place);
    }
    
    function validateAddressZone(place) {
        // Get coordinates
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        // Calcular distancia desde el restaurante usando las nuevas coordenadas
        const distance = calculateDistance(
            RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng,
            lat, lng
        );
        
        // Obtener información de la zona de entrega
        const deliveryZone = getDeliveryZone(distance);
        
        if (deliveryZone.price !== null) {
            // Guardar información de la dirección con precio de envío
            userAddress = {
                formatted_address: place.formatted_address,
                distance: distance,
                deliveryPrice: deliveryZone.price,
                zone: deliveryZone.zone,
                coordinates: { lat: lat, lng: lng }
            };
            
            showDeliveryZoneInfo({
                name: deliveryZone.zone,
                distance: distance,
                fee: deliveryZone.price,
                time: distance <= 4 ? '25-35 min' : '35-45 min',
                description: deliveryZone.description,
                color: deliveryZone.color
            });
            
            // Actualizar el total del carrito con el nuevo precio de envío
            updateCheckoutTotals();
        } else {
            // Fuera del rango de entrega
            userAddress = null;
            showDeliveryZoneWarning(distance);
        }
    }
    
    function estimateDeliveryDistance(place) {
        // Ubicación del restaurante: Coahuila 36, Emiliano Zapata, Minatitlán, Veracruz
        const restaurantLocation = { lat: 17.9950, lng: -94.5370 };
        const customerLocation = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
        };
        
    const distance = calculateDistance(restaurantLocation.lat, restaurantLocation.lng, customerLocation.lat, customerLocation.lng);
        
        const selectedAddressDiv = document.getElementById('selected-address');
        if (selectedAddressDiv && distance) {
            const distanceInfo = document.createElement('div');
            distanceInfo.className = 'text-xs text-blue-600 mt-1';
            distanceInfo.innerHTML = `
                <i class="fas fa-route mr-1"></i>
                Aproximadamente ${distance.toFixed(1)} km desde SR & SRA BURGER
            `;
            selectedAddressDiv.appendChild(distanceInfo);
        }
    }
    
    function showDeliveryZoneInfo(zone) {
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;
        
        // Limpiar información anterior
        const existingInfo = mapContainer.querySelector('.zone-info');
        if (existingInfo) existingInfo.remove();
        
        const colorClass = zone.color === 'green' ? 'green' : 'orange';
        const bgClass = `bg-${colorClass}-50`;
        const borderClass = `border-${colorClass}-200`;
        const textClass = `text-${colorClass}-800`;
        const iconClass = `text-${colorClass}-600`;
        
        const zoneInfo = document.createElement('div');
        zoneInfo.className = `zone-info ${bgClass} border ${borderClass} rounded-lg p-3 mt-2`;
        zoneInfo.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-check-circle ${iconClass}"></i>
                <div class="flex-1">
                    <div class="font-medium ${textClass}">${zone.name} - ${zone.distance.toFixed(1)} km</div>
                    <div class="text-xs ${textClass}/70">${zone.description}</div>
                </div>
                <div class="text-right">
                    <div class="font-bold ${textClass}">$${zone.fee}</div>
                    <div class="text-xs ${textClass}/70">${zone.time}</div>
                </div>
            </div>
        `;
        mapContainer.appendChild(zoneInfo);
    }
    
    // Función fallback para cuando Google Maps no está disponible en el hero
    function setupHeroLocationFallback() {
        console.log('📍 Configurando ubicación del hero sin Google Maps');
        
        const heroMapElement = document.getElementById('hero-map');
        if (heroMapElement) {
            heroMapElement.innerHTML = `
                <div class="flex items-center justify-center h-full bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border-2 border-dashed border-yellow-300">
                    <div class="text-center p-6">
                        <i class="fas fa-map-marker-alt text-yellow-600 text-4xl mb-3"></i>
                        <h3 class="font-bold text-gray-800 mb-2">SR & SRA BURGER</h3>
                        <p class="text-sm text-gray-600 mb-1">Coahuila 36, Emiliano Zapata</p>
                        <p class="text-sm text-gray-600 mb-3">Minatitlán, Veracruz</p>
                        <div class="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full inline-block">
                            <i class="fas fa-clock mr-1"></i>
                            Entrega disponible 4-12 km
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Configurar botón "Usar mi ubicación" sin GPS real
        const useLocationBtn = document.getElementById('use-location-btn');
        if (useLocationBtn) {
            useLocationBtn.onclick = function() {
                // Simular que se está obteniendo la ubicación
                useLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Obteniendo ubicación...';
                useLocationBtn.disabled = true;
                
                setTimeout(() => {
                    useLocationBtn.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i>Ubicación no disponible';
                    useLocationBtn.disabled = true;
                    
                    // Mostrar mensaje alternativo
                    const heroSection = document.getElementById('hero-location');
                    if (heroSection) {
                        const infoDiv = document.createElement('div');
                        infoDiv.className = 'mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3';
                        infoDiv.innerHTML = `
                            <div class="flex items-start space-x-2">
                                <i class="fas fa-info-circle text-blue-600 mt-0.5"></i>
                                <div class="text-sm text-blue-800">
                                    <strong>Tip:</strong> Puedes escribir tu dirección manualmente en el formulario de pedido para calcular el costo de envío.
                                </div>
                            </div>
                        `;
                        heroSection.appendChild(infoDiv);
                    }
                }, 2000);
            };
        }
    }
    
    // Función para mostrar información de zona de entrega
    function showDeliveryZoneInfo(zone, distance) {
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;
        
        // Limpiar información anterior
        const existingInfo = mapContainer.querySelector('.zone-info');
        if (existingInfo) existingInfo.remove();
        
        const zoneInfo = document.createElement('div');
        const bgClass = zone.price === 0 ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200';
        const textClass = zone.price === 0 ? 'text-green-800' : 'text-blue-800';
        
        zoneInfo.className = `zone-info ${bgClass} border rounded-lg p-3 mt-2`;
        zoneInfo.innerHTML = `
            <div class="flex items-start space-x-2">
                <i class="fas fa-check-circle ${zone.price === 0 ? 'text-green-600' : 'text-blue-600'} mt-0.5"></i>
                <div>
                    <div class="font-medium ${textClass}">
                        ${zone.name} - Tu dirección está a ${distance.toFixed(1)} km
                    </div>
                    <div class="text-sm ${textClass.replace('800', '700')}">
                        Costo de envío: $${zone.fee} • Tiempo estimado: ${zone.time}
                    </div>
                    <div class="text-xs ${textClass.replace('800', '600')} mt-1">
                        ${zone.description}
                    </div>
                </div>
            </div>
            ${zone.fee > DELIVERY_PRICE ? `
                <div class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    <i class="fas fa-info-circle mr-1"></i>
                    Zona extendida: $${DELIVERY_PRICE} base + $${zone.fee - DELIVERY_PRICE} por distancia adicional
                </div>
            ` : ''}
        `;
        mapContainer.appendChild(zoneInfo);
        mapContainer.classList.remove('hidden');
    }
    
    function showDeliveryZoneWarning(distance) {
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;
        
        // Limpiar información anterior
        const existingInfo = mapContainer.querySelector('.zone-info');
        if (existingInfo) existingInfo.remove();
        
        const warning = document.createElement('div');
        warning.className = 'zone-info bg-red-50 border border-red-200 rounded-lg p-3 mt-2';
        warning.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-exclamation-triangle text-red-600"></i>
                <div>
                    <div class="font-medium text-red-800">Lo sentimos estas demasiado lejos</div>
                    <div class="text-sm text-red-700">
                        Tu dirección está a ${distance.toFixed(1)} km. Solo entregamos dentro de un radio de ${MAX_DELIVERY_DISTANCE} km desde nuestro restaurante en Coahuila 36, Emiliano Zapata, Minatitlán.
                    </div>
                    <div class="text-xs text-red-600 mt-2">
                        <strong>Zonas de entrega:</strong><br>
                        • Zona 1 (0-4 km): $${DELIVERY_PRICE}<br>
                        • Zona 2 (4-12 km): $${DELIVERY_PRICE} + $${EXTRA_KM_PRICE}/km adicional
                    </div>
                </div>
            </div>
        `;
        mapContainer.appendChild(warning);
        mapContainer.classList.remove('hidden');
    }
    
    function showAddressError(message) {
        const addressInput = document.getElementById('address-input');
        if (!addressInput) return;
        
        addressInput.classList.add('border-red-500');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-red-600 text-sm mt-1';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle mr-1"></i>${message}`;
        
        addressInput.parentNode.appendChild(errorDiv);
        
        setTimeout(() => {
            addressInput.classList.remove('border-red-500');
            errorDiv.remove();
        }, 5000);
    }
    
    function toggleMapView() {
        const miniMap = document.getElementById('mini-map');
        const showMapBtn = document.getElementById('show-map-btn');
        
        if (!miniMap || !selectedPlace) return;
        
        if (miniMap.classList.contains('hidden')) {
            // Show map
            miniMap.classList.remove('hidden');
            showMapBtn.innerHTML = '<i class="fas fa-eye-slash mr-1"></i>Ocultar mapa';
            initializeMiniMap();
        } else {
            // Hide map
            miniMap.classList.add('hidden');
            showMapBtn.innerHTML = '<i class="fas fa-eye mr-1"></i>Ver mapa';
        }
    }
    
    function initializeMiniMap() {
        if (!selectedPlace || !window.google) return;
        
        const miniMapDiv = document.getElementById('mini-map');
        if (!miniMapDiv) return;
        
        const mapOptions = {
            zoom: 16,
            center: selectedPlace.geometry.location,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        };
        
        map = new google.maps.Map(miniMapDiv, mapOptions);
        
        // Add marker for selected address
        marker = new google.maps.Marker({
            position: selectedPlace.geometry.location,
            map: map,
            title: selectedPlace.formatted_address,
            icon: {
                url: 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
                        <path fill="#FFB300" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                `),
                scaledSize: new google.maps.Size(32, 32)
            }
        });
        
        // Add info window
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div class="p-2">
                    <div class="font-bold text-sm">Dirección de entrega</div>
                    <div class="text-xs text-gray-600 mt-1">${selectedPlace.formatted_address}</div>
                </div>
            `
        });
        
        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });
        
        console.log('🗺️ Mini mapa inicializado');
    }
    
    // Fallback if Google Maps fails to load
    setTimeout(() => {
        if (!window.google) {
            console.log('⚠️ Google Maps no se cargó; funcionará la validación con dirección escrita.');
            
            // Asegurar que el campo de dirección funcione sin Google Maps
            const addressInput = document.getElementById('address-input');
            if (addressInput && !autocomplete) {
                console.log('🔧 Configurando autocompletado simulado...');
                setupFreeTextInput(addressInput);
                
                // Mostrar mensaje informativo al usuario
                showGoogleMapsInfo();
            }
        } else {
            console.log('✅ Google Maps cargado correctamente');
        }
    }, 3500);
    
    // Función para mostrar información sobre Google Maps
    function showGoogleMapsInfo() {
        const helpText = document.getElementById('maps-help-text') || document.querySelector('.text-xs.text-gray-500');
        if (helpText) {
            helpText.innerHTML = `
                <i class="fas fa-info-circle text-blue-500 mr-1"></i>
                Escribe tu dirección completa y validaremos la distancia desde Coahuila 36. Si estás a más de 12 km verás: "Lo sentimos estas demasiado lejos".
            `;
            helpText.classList.remove('text-gray-500');
            helpText.classList.add('text-blue-600');
        }
    }

    // Fallback geocoding with OpenStreetMap Nominatim (no API key required)
    async function fallbackGeocodeAddress(query) {
        // Prefer local proxy to avoid CORS and attach headers; try both 3000 and 3001
        const bases = API_BASES || [''];
        let best = null;
        let lastErr;
        for (const base of bases) {
            try {
                const url = `${base}/api/geocode?q=${encodeURIComponent(query + ', Minatitlán, Veracruz, México')}`;
                const resp = await fetch(url);
                if (!resp.ok) { lastErr = new Error(`HTTP ${resp.status}`); continue; }
                const data = await resp.json();
                const arr = data && data.data;
                if (Array.isArray(arr) && arr.length) { best = arr[0]; break; }
            } catch (e) { lastErr = e; continue; }
        }
        if (!best) throw lastErr || new Error('Geocoding error');
        return {
            formatted_address: best.display_name,
            location: { lat: parseFloat(best.lat), lng: parseFloat(best.lon) }
        };
    }
    
    // Inicialización inmediata del campo de dirección (sin esperar Google Maps)
    const addressInput = document.getElementById('address-input');
    if (addressInput) {
        // Asegurar que el campo esté disponible para escritura desde el inicio
        addressInput.removeAttribute('readonly');
        addressInput.removeAttribute('disabled');
        addressInput.style.backgroundColor = 'white';
        addressInput.style.pointerEvents = 'auto';
        addressInput.style.opacity = '1';
        
        // Agregar event listener para monitorear la escritura
        addressInput.addEventListener('input', function(e) {
            console.log('Dirección actual:', e.target.value, 'Longitud:', e.target.value.length);
        });
        
        // Agregar event listener para asegurar que siempre se pueda escribir
        addressInput.addEventListener('keydown', function(e) {
            // Permitir todas las teclas normales de escritura
            if (e.key.length === 1 || ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                // No bloquear ninguna tecla de escritura
                return true;
            }
        });
        
        console.log('✅ Campo de dirección habilitado para escritura libre desde el inicio');
    }

    // Función para agregar pedido al sistema de control de envíos
    function addToOrderControl() {
        try {
            // Obtener datos del formulario
            const customerName = customerNameInput ? customerNameInput.value.trim() : '';
            const customerPhone = customerPhoneInput ? customerPhoneInput.value.trim() : '';
            const deliveryTypeElement = document.querySelector('input[name="delivery-type"]:checked');
            const paymentMethodElement = document.querySelector('input[name="payment"]:checked');
            
            if (!customerName || !customerPhone || !deliveryTypeElement || !paymentMethodElement) {
                console.error('Faltan datos requeridos para agregar al control de envíos');
                return;
            }
            
            const deliveryTypeValue = deliveryTypeElement.value;
            const paymentMethod = paymentMethodElement.value;
            
            // Obtener dirección
            let address = '';
            if (deliveryTypeValue === 'delivery') {
                const addressInput = document.getElementById('address-input');
                if (addressInput) {
                    address = addressInput.value.trim();
                }
                
                // Usar dirección validada por Google Maps si está disponible
                if (window.selectedPlace && window.selectedPlace.formatted_address) {
                    address = window.selectedPlace.formatted_address;
                }
            } else {
                address = 'Recoger en local - SR & SRA BURGER';
            }
            
            // Obtener monto en efectivo si aplica
            let cashAmount = '';
            if (paymentMethod === 'Efectivo') {
                const cashAmountInput = document.getElementById('cash-amount');
                if (cashAmountInput && cashAmountInput.value.trim()) {
                    cashAmount = parseFloat(cashAmountInput.value.trim()).toFixed(2);
                }
            }
            
            // Convertir items del carrito al formato requerido
            const orderItems = cart.map(item => {
                let itemName = item.baseItem.name;
                let customizations = '';
                
                if (item.isCombo) {
                    // Para combos, agregar detalles de las elecciones
                    const choiceDetails = item.choices.map(choice => {
                        let text = choice.burger.name;
                        if (choice.customizations && choice.customizations.length > 0) {
                            text += ` (+ ${choice.customizations.map(c => c.name).join(', ')})`;
                        }
                        if (choice.fries) {
                            text += `, Papas ${choice.fries.type}`;
                        }
                        if (choice.onionRings) {
                            text += `, Aros de Cebolla`;
                        }
                        return text;
                    }).join(' | ');
                    customizations = choiceDetails;
                } else {
                    // Para items individuales
                    const details = [];
                    if (item.customizations && item.customizations.length > 0) {
                        details.push(`+ ${item.customizations.map(c => c.name).join(', ')}`);
                    }
                    if (item.fries) {
                        details.push(`Papas ${item.fries.type}`);
                    }
                    if (item.onionRings) {
                        details.push('Aros de Cebolla');
                    }
                    if (item.menuExtras && item.menuExtras.length > 0) {
                        item.menuExtras.forEach(extra => {
                            details.push(`${extra.quantity}x ${extra.name}`);
                        });
                    }
                    customizations = details.join(', ');
                }
                
                return {
                    name: itemName,
                    quantity: item.quantity,
                    price: parseFloat((item.price * item.quantity).toFixed(2)),
                    customizations: customizations || ''
                };
            });
            
            // Calcular totales
            const subtotal = getCartTotal();
            const deliveryCost = deliveryTypeValue === 'delivery' ? DELIVERY_PRICE : 0;
            const total = subtotal + deliveryCost;
            
            // Crear notas especiales
            let notes = '';
            if (paymentMethod === 'Efectivo' && cashAmount) {
                const change = parseFloat(cashAmount) - total;
                notes += `Pago: $${cashAmount} | Cambio: $${change.toFixed(2)}`;
            }
            if (paymentMethod !== 'Efectivo') {
                notes += `Pago: ${paymentMethod}`;
            }
            
            // Crear objeto de datos del pedido
            const orderData = {
                customer: {
                    name: customerName,
                    phone: customerPhone,
                    address: address
                },
                items: orderItems,
                total: parseFloat(total.toFixed(2)),
                notes: notes || '',
                deliveryType: deliveryTypeValue,
                paymentMethod: paymentMethod
            };
            
            console.log('📝 Enviando pedido a Firebase...', orderData);
            
            // Enviar a Firebase usando el manager global
            if (window.firebaseOrderManager) {
                window.firebaseOrderManager.addOrder(orderData)
                    .then((res) => {
                        const orderId = typeof res === 'object' ? res.id : res;
                        const orderNumber = typeof res === 'object' && res.orderNumber ? res.orderNumber : null;
                        console.log('✅ Pedido guardado en Firebase con ID:', orderId, 'No. Orden:', orderNumber);
                        // Mostrar número de orden en el modal de éxito si existe
                        setLastOrderNumber(orderNumber);
                        showNotification('¡Pedido enviado exitosamente!', 'success');
                    })
                    .catch((error) => {
                        console.error('❌ Error al guardar en Firebase:', error);
                        // Fallback: guardar en localStorage si Firebase falla
                        const localNumber = saveToLocalStorageBackup(orderData);
                        setLastOrderNumber(localNumber);
                        showNotification('Pedido guardado localmente (sin conexión)', 'warning');
                    });
            } else {
                console.warn('⚠️ Firebase no está disponible, guardando en localStorage');
                const localNumber = saveToLocalStorageBackup(orderData);
                setLastOrderNumber(localNumber);
                showNotification('Pedido guardado localmente', 'warning');
            }
            
        } catch (error) {
            console.error('Error al procesar pedido:', error);
            showNotification('Error al procesar el pedido', 'error');
        }
    }

    // Función de respaldo para localStorage
    function saveToLocalStorageBackup(orderData) {
        try {
            const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
            // Generar número de orden local: YYYYMMDD-XYZ
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const rand = Math.floor(Math.random() * 900) + 100;
            const orderNumber = `${yyyy}${mm}${dd}-${rand}`;
            const newOrder = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                status: 'pending',
                orderNumber,
                customer: orderData.customer,
                items: orderData.items,
                total: orderData.total,
                notes: orderData.notes || '',
                deliveryType: orderData.deliveryType,
                paymentMethod: orderData.paymentMethod,
                estimatedTime: calculateEstimatedTime(orderData.items),
                confirmed: false,
                onWaySent: false,
                arrivedSent: false
            };
            
            existingOrders.unshift(newOrder);
            localStorage.setItem('orders', JSON.stringify(existingOrders));
            console.log('💾 Pedido guardado en localStorage como respaldo');
            return orderNumber;
        } catch (error) {
            console.error('Error al guardar en localStorage:', error);
            return null;
        }
    }

    // Guardar y pintar el último número de orden en el modal
    function setLastOrderNumber(orderNumber) {
        const span = document.getElementById('order-number-display');
        const link = document.getElementById('track-order-link');
        const copyBtn = document.getElementById('copy-order-number');
        if (span && orderNumber) span.textContent = orderNumber;
        if (link && orderNumber) link.href = `tuenvio.html?order=${encodeURIComponent(orderNumber)}`;
        if (copyBtn && orderNumber) {
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(orderNumber).then(() => {
                    showNotification('Número de orden copiado', 'success');
                }).catch(() => {});
            };
        }
    }

    // Función para mostrar notificaciones
    function showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 transform translate-x-full`;
        
        // Estilos según tipo
        const styles = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        notification.className += ` ${styles[type] || styles.info}`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Mostrar con animación
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Función auxiliar para calcular tiempo estimado
    function calculateEstimatedTime(items) {
        // Tiempo base + tiempo por item
        const baseTime = 15;
        const timePerItem = 5;
        return baseTime + (items.length * timePerItem);
    }

});

// Función global para controlar las pestañas móviles de promociones
function showMobilePromo(category) {
    console.log('Cambiando a pestaña:', category);
    
    // Remover clase activa de todas las pestañas y resetear estilos
    const tabs = document.querySelectorAll('.mobile-promo-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        // Resetear estilos de tab inactiva
        tab.className = 'mobile-promo-tab flex-shrink-0 bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-bold';
    });
    
    // Ocultar todo el contenido
    const contents = document.querySelectorAll('.mobile-promo-content');
    contents.forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('active');
    });
    
    // Activar la pestaña seleccionada
    const activeTab = document.querySelector(`[onclick="showMobilePromo('${category}')"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        // Aplicar estilos de tab activa
        activeTab.className = 'mobile-promo-tab active flex-shrink-0 bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold';
    }
    
    // Mapear categorías a IDs correctos
    const contentIdMap = {
        'daily': 'mobile-daily-promos',
        'weekend': 'mobile-weekend-promos'
    };
    
    // Mostrar el contenido correspondiente
    const contentId = contentIdMap[category];
    const activeContent = document.getElementById(contentId);
    if (activeContent) {
        activeContent.classList.remove('hidden');
        activeContent.classList.add('active');
        console.log('Mostrando contenido:', contentId);
    } else {
        console.error('No se encontró el contenido:', contentId);
    }
}

// Función para actualizar promociones según el día actual
function updateDailyPromotions() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    
    // Solo promociones de lunes a jueves (NO aplican a combos)
    const dailyPromotions = {
        1: { // Lunes - HOTDOG MANIA
            day: 'LUNES',
            title: 'HOTDOG MANIA',
            discount: '20% OFF',
            description: 'En todos los hotdogs',
            color: 'from-blue-600 to-blue-800',
            hasPromo: true
        },
        2: { // Martes - BBQ por $100
            day: 'MARTES',
            title: 'BBQ BEACON CRUNCH',
            discount: 'Precio único',
            description: '$100 pesos',
            color: 'from-green-600 to-green-800',
            hasPromo: true
        },
        3: { // Miércoles - Papas complemento gratis
            day: 'MIÉRCOLES',
            title: 'PAPAS GRATIS',
            discount: 'Papas gratis',
            description: 'Compra hamburguesa',
            color: 'from-purple-600 to-purple-800',
            hasPromo: true
        },
        4: { // Jueves - Carne extra y tocino 50% descuento
            day: 'JUEVES',
            title: 'CARNE & TOCINO',
            discount: '50% OFF',
            description: 'Carne extra + tocino',
            color: 'from-red-600 to-red-800',
            hasPromo: true
        }
        // Viernes, sábado y domingo: SIN PROMOCIONES (no se muestran)
    };
    
    const currentPromo = dailyPromotions[dayOfWeek];
    
    // Solo actualizar si hay promoción para el día actual
    if (currentPromo && currentPromo.hasPromo) {
        // Actualizar versión móvil
        const mobileCard = document.getElementById('mobile-daily-promo-card');
        const mobileTodayBadge = document.getElementById('mobile-today-badge');
        const mobileDay = document.getElementById('mobile-current-day');
        const mobileTitle = document.getElementById('mobile-current-promo-title');
        const mobileDiscount = document.getElementById('mobile-current-promo-discount');
        const mobileDesc = document.getElementById('mobile-current-promo-desc');
        
        if (mobileCard && mobileDay && mobileTitle && mobileDiscount && mobileDesc) {
            // Mostrar la card de promoción
            mobileCard.style.display = 'block';
            mobileCard.className = `bg-gradient-to-r ${currentPromo.color} rounded-2xl p-4 text-white relative overflow-hidden`;
            mobileDay.textContent = currentPromo.day;
            mobileTitle.textContent = currentPromo.title;
            mobileDiscount.textContent = currentPromo.discount;
            mobileDesc.textContent = currentPromo.description;
            
            // Mostrar badge "HOY"
            if (mobileTodayBadge) {
                mobileTodayBadge.style.display = 'block';
            }
        }
        
        // Actualizar versión desktop
        const desktopCard = document.getElementById('desktop-daily-promo-card');
        const desktopTodayBadge = document.getElementById('desktop-today-badge');
        const desktopDay = document.getElementById('desktop-current-day');
        const desktopTitle = document.getElementById('desktop-current-promo-title');
        const desktopDiscount = document.getElementById('desktop-current-promo-discount');
        const desktopDesc = document.getElementById('desktop-current-promo-desc');
        
        if (desktopCard && desktopDay && desktopTitle && desktopDiscount && desktopDesc) {
            // Mostrar la card de promoción
            desktopCard.style.display = 'block';
            desktopCard.className = `group relative overflow-hidden rounded-2xl bg-gradient-to-br ${currentPromo.color} text-white shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105`;
            desktopDay.textContent = currentPromo.day;
            desktopTitle.textContent = currentPromo.title;
            desktopDiscount.textContent = currentPromo.discount;
            desktopDesc.textContent = currentPromo.description;
            
            // Mostrar badge "HOY"
            if (desktopTodayBadge) {
                desktopTodayBadge.style.display = 'block';
            }
        }
        
        console.log(`✅ Promoción activa para ${currentPromo.day}: ${currentPromo.title}`);
    } else {
        // No hay promoción para hoy - ocultar las cards de promoción diaria
        const mobileCard = document.getElementById('mobile-daily-promo-card');
        const desktopCard = document.getElementById('desktop-daily-promo-card');
        
        if (mobileCard) {
            mobileCard.style.display = 'none';
        }
        if (desktopCard) {
            desktopCard.style.display = 'none';
        }
        
        console.log(`ℹ️ Sin promociones para hoy (día ${dayOfWeek})`);
    }
}

// Inicializar promociones del día cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Esperar un poco para asegurar que todos los elementos estén cargados
    setTimeout(() => {
        updateDailyPromotions();
    }, 500);
    
    // Inicializar mejoras de responsividad móvil - VERSION SIMPLIFICADA
    initMobileEnhancements();
    
    // Inicializar modal de mapa grande
    initMapModal();
});

// ============================================
// MODAL DE MAPA GRANDE
// ============================================

function initMapModal() {
    console.log('🗺️ Inicializando modal de mapa grande...');
    
    const openBtn = document.getElementById('open-map-modal');
    const openCheckoutBtn = document.getElementById('open-checkout-map');
    const changeAddressBtn = document.getElementById('change-checkout-address');
    const modal = document.getElementById('map-modal');
    const closeBtn = document.getElementById('close-map-modal');
    const cancelBtn = document.getElementById('modal-cancel');
    const confirmBtn = document.getElementById('modal-confirm-location');
    const searchInput = document.getElementById('modal-search-input');
    const geoBtn = document.getElementById('modal-use-geolocation');
    const preview = document.getElementById('modal-address-preview');
    
    // Diagnóstico
    console.log('🔍 Diagnóstico de elementos del modal:');
    console.log('  - openBtn:', openBtn ? '✅' : '❌');
    console.log('  - modal:', modal ? '✅' : '❌');
    console.log('  - geoBtn:', geoBtn ? '✅' : '❌');
    console.log('  - searchInput:', searchInput ? '✅' : '❌');
    console.log('  - confirmBtn:', confirmBtn ? '✅' : '❌');
    
    // Variables compartidas en el scope de initMapModal
    let modalMap = null;
    let modalMarker = null;
    let modalSelectedLocation = null;
    let modalAutocomplete = null;
    let openedFrom = 'hero'; // 'hero' o 'checkout'
    
    // Función para configurar geolocalización
    const setupGeolocation = () => {
        const btn = document.getElementById('modal-use-geolocation');
        if (!btn) {
            console.error('❌ Botón GPS no encontrado en el DOM');
            console.error('  Buscando ID: modal-use-geolocation');
            return;
        }
        
        console.log('✅ Botón GPS encontrado, agregando event listener...');
        
        // Remover event listeners previos (si existen)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 Botón GPS clickeado');
            
            // Verificar soporte de geolocalización
            if (!navigator.geolocation) {
                console.error('❌ Geolocalización no soportada');
                alert('❌ Tu navegador no soporta geolocalización.\n\nPor favor, busca tu ubicación manualmente en el campo de arriba.');
                return;
            }
            
            console.log('✅ Geolocalización soportada, solicitando ubicación...');
            
            // Deshabilitar botón y mostrar loading
            newBtn.disabled = true;
            const originalHTML = newBtn.innerHTML;
            newBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Obteniendo GPS...';
            newBtn.classList.add('opacity-75');
            
            // Configuración optimizada para móvil
            const options = {
                enableHighAccuracy: true,    // Usa GPS en lugar de WiFi/celular
                timeout: 30000,               // 30 segundos para móviles lentos
                maximumAge: 0                 // No usar caché, ubicación fresh
            };
            
            console.log('⏳ Esperando respuesta del GPS (máximo 30s)...');
            
            navigator.geolocation.getCurrentPosition(
                // SUCCESS
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const accuracy = position.coords.accuracy;
                    
                    console.log(`✅ Ubicación obtenida: ${lat.toFixed(6)}, ${lng.toFixed(6)} (precisión: ${accuracy.toFixed(0)}m)`);
                    
                    if (!window.google || !window.google.maps) {
                        console.error('❌ Google Maps no disponible');
                        alert('Google Maps no está disponible. Por favor recarga la página.');
                        newBtn.disabled = false;
                        newBtn.innerHTML = originalHTML;
                        newBtn.classList.remove('opacity-75');
                        return;
                    }
                    
                    const location = new google.maps.LatLng(lat, lng);
                    
                    if (modalMap) {
                        // Centrar mapa en ubicación con animación
                        modalMap.panTo(location);
                        modalMap.setZoom(17);
                        
                        // Guardar ubicación seleccionada
                        modalSelectedLocation = location;
                        
                        // Actualizar preview
                        updateModalPreview(location);
                        
                        console.log('✅ Mapa actualizado con ubicación GPS');
                    } else {
                        console.error('❌ modalMap no está inicializado');
                    }
                    
                    // Restaurar botón con mensaje de éxito temporal
                    newBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>¡Ubicación obtenida!';
                    newBtn.classList.remove('opacity-75');
                    
                    setTimeout(() => {
                        newBtn.innerHTML = originalHTML;
                        newBtn.disabled = false;
                    }, 2000);
                },
                // ERROR
                (error) => {
                    console.error('❌ Error de geolocalización:', error);
                    
                    let errorMessage = '';
                    let errorDetail = '';
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = '❌ Permiso de ubicación denegado';
                            errorDetail = 'Por favor, activa los permisos de ubicación en la configuración de tu navegador o dispositivo.';
                            console.error('🚫 Usuario denegó permiso de ubicación');
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = '❌ Ubicación no disponible';
                            errorDetail = 'No se pudo determinar tu ubicación. Verifica que el GPS esté activado.';
                            console.error('📡 GPS no disponible o señal débil');
                            break;
                        case error.TIMEOUT:
                            errorMessage = '⏱️ Tiempo de espera agotado';
                            errorDetail = 'La búsqueda de GPS tardó demasiado. Intenta de nuevo o busca manualmente.';
                            console.error('⏰ Timeout después de 30 segundos');
                            break;
                        default:
                            errorMessage = '❌ Error desconocido';
                            errorDetail = 'Ocurrió un error inesperado. Intenta buscar manualmente.';
                            console.error('⚠️ Error desconocido:', error.message);
                    }
                    
                    alert(`${errorMessage}\n\n${errorDetail}\n\n💡 Consejo: Puedes escribir tu dirección en el campo de búsqueda arriba.`);
                    
                    // Restaurar botón
                    newBtn.disabled = false;
                    newBtn.innerHTML = originalHTML;
                    newBtn.classList.remove('opacity-75');
                },
                options
            );
        });
    };
    
    // Función para abrir el modal
    const openModal = (source = 'hero') => {
        console.log(`📍 Abriendo modal de mapa desde: ${source}`);
        openedFrom = source;
        modal.classList.add('show');
        modal.classList.remove('hidden');
        
        // Inicializar mapa si no existe (con delay para que el modal esté visible)
        setTimeout(() => {
            if (!modalMap && window.google && window.google.maps) {
                console.log('🗺️ Inicializando mapa por primera vez...');
                initModalMap();
            } else if (modalMap) {
                console.log('🗺️ Mapa ya existe, actualizando...');
                // Trigger resize para actualizar el mapa
                google.maps.event.trigger(modalMap, 'resize');
                // Si hay ubicación previa, centrar ahí
                if (modalSelectedLocation) {
                    modalMap.setCenter(modalSelectedLocation);
                } else {
                    const center = new google.maps.LatLng(RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng);
                    modalMap.setCenter(center);
                }
                
                // Re-inicializar autocomplete si no existe
                if (!modalAutocomplete && searchInput && window.google && window.google.maps && window.google.maps.places) {
                    console.log('🔍 Re-inicializando autocomplete...');
                    initAutocomplete();
                }
            } else if (!window.google || !window.google.maps) {
                console.error('⚠️ Google Maps no está disponible');
                alert('Error: Google Maps no se cargó correctamente. Por favor recarga la página.');
            }
            
            // Re-configurar geolocalización cada vez que se abre el modal
            try {
                setupGeolocation();
            } catch(e) {
                console.error('Error en setupGeolocation:', e);
            }
        }, 250);
    };
    
    // Event listeners para abrir modal
    if (openBtn) {
        openBtn.addEventListener('click', () => openModal('hero'));
    }
    
    if (openCheckoutBtn) {
        openCheckoutBtn.addEventListener('click', () => openModal('checkout'));
    }
    
    if (changeAddressBtn) {
        changeAddressBtn.addEventListener('click', () => openModal('checkout'));
    }
    
    // Cerrar modal
    const closeModal = () => {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });
    
    // Cerrar al hacer click fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Inicializar mapa del modal - OPTIMIZADO MÓVIL v6.0
    function initModalMap() {
        const mapDiv = document.getElementById('hero-map');
        if (!mapDiv) {
            console.error('❌ Div del mapa no encontrado');
            return;
        }
        
        const center = new google.maps.LatLng(RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng);
        
        console.log('📱 Inicializando mapa optimizado para móvil...');
        console.log('📍 Centro inicial:', center.lat(), center.lng());
        
        // Mapa optimizado para touch
        modalMap = new google.maps.Map(mapDiv, {
            center: center,
            zoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_CENTER
            },
            gestureHandling: 'greedy', // Permite scroll sin ctrl
            clickableIcons: false, // No distraer con POIs
            disableDefaultUI: false,
            styles: [
                {
                    featureType: 'poi.business',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });
        
        console.log('✅ Mapa creado exitosamente');
        
        // Marcador del restaurante
        const restaurantMarker = new google.maps.Marker({
            map: modalMap,
            position: center,
            icon: {
                url: 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
                        <defs>
                            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                                <feOffset dx="0" dy="2" result="offsetblur"/>
                                <feComponentTransfer>
                                    <feFuncA type="linear" slope="0.3"/>
                                </feComponentTransfer>
                                <feMerge>
                                    <feMergeNode/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        <circle cx="24" cy="24" r="18" fill="#FFB300" filter="url(#shadow)"/>
                        <circle cx="24" cy="24" r="16" fill="#FF8F00" stroke="#FFF" stroke-width="2"/>
                        <text x="24" y="30" text-anchor="middle" font-size="20" font-weight="bold">🍔</text>
                    </svg>
                `),
                scaledSize: new google.maps.Size(48, 48),
                anchor: new google.maps.Point(24, 48)
            },
            title: 'SR & SRA BURGER',
            zIndex: 1000,
            animation: google.maps.Animation.DROP
        });
        
        console.log('✅ Marcador del restaurante agregado');
        
        // Sistema de actualización OPTIMIZADO PARA MÓVIL
        let updateTimeout;
        let lastUpdate = 0;
        const UPDATE_DELAY = 500; // Reducido para móvil
        
        // Elementos para feedback visual - USAR ID DEL NUEVO MARCADOR
        const mapContainer = document.querySelector('#hero-map').parentElement;
        const centerMarker = document.getElementById('map-center-marker'); // Nuevo marcador tipo mira
        const instructionElement = mapContainer.querySelector('.absolute.top-2');
        
        // FUNCIÓN SIMPLE: Actualizar cuando el mapa se mueve
        const handleMapMove = () => {
            const center = modalMap.getCenter();
            if (!center) return;
            
            modalSelectedLocation = center;
            
            // Debounce para no saturar
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                console.log('📍 Ubicación actualizada:', center.lat().toFixed(6), center.lng().toFixed(6));
                updateModalPreview(center).then(() => {
                    // Restaurar instrucción
                    if (instructionElement) {
                        const span = instructionElement.querySelector('span');
                        if (span) span.textContent = 'Mueve el mapa con el dedo';
                        instructionElement.classList.remove('bg-blue-50', 'border-blue-400');
                        instructionElement.classList.add('bg-white', 'border-yellow-400');
                    }
                }).catch(err => {
                    console.error('Error actualizando preview:', err);
                });
            }, UPDATE_DELAY);
        };
        
        // Evento principal: cuando el mapa se detiene (funciona en móvil y desktop)
        google.maps.event.addListener(modalMap, 'idle', () => {
            console.log('�️ Mapa detenido, actualizando...');
            handleMapMove();
        });
        
        // Feedback visual al empezar a mover (SOLO VISUAL, no actualiza)
        let moveStartTimeout;
        google.maps.event.addListener(modalMap, 'dragstart', () => {
            console.log('👆 Usuario moviendo mapa...');
            
            // Cambiar instrucción inmediatamente
            if (instructionElement) {
                const span = instructionElement.querySelector('span');
                if (span) span.textContent = 'Buscando ubicación...';
                instructionElement.classList.remove('bg-white', 'border-yellow-400');
                instructionElement.classList.add('bg-blue-50', 'border-blue-400');
            }
            
            // Pin sube levemente
            if (centerMarker) {
                centerMarker.style.transform = 'translate(-50%, -50%) scale(1.15)';
                centerMarker.style.transition = 'transform 0.15s ease-out';
            }
        });
        
        // Cuando suelta el dedo
        google.maps.event.addListener(modalMap, 'dragend', () => {
            console.log('✋ Usuario soltó el mapa');
            
            // Pin baja a posición normal
            if (centerMarker) {
                centerMarker.style.transform = 'translate(-50%, -50%) scale(1)';
            }
            
            // La actualización la hace 'idle' automáticamente
        });
        
        // Inicializar autocomplete
        initAutocomplete();
        
        // Actualizar preview inicial
        modalSelectedLocation = center;
        updateModalPreview(center);
        
        // FORZAR resize del mapa después de crearlo
        setTimeout(() => {
            google.maps.event.trigger(modalMap, 'resize');
            modalMap.setCenter(center);
            console.log('🔄 Mapa redimensionado');
        }, 100);
        
        console.log('✅ Mapa móvil optimizado inicializado correctamente');
        console.log('📱 Listo para usar en smartphones');
    }
    
    // Función separada para inicializar autocomplete - MEJORADO
    function initAutocomplete() {
        if (!searchInput) {
            console.log('⚠️ Input de búsqueda no encontrado');
            return;
        }
        
        if (modalAutocomplete) {
            console.log('ℹ️ Autocomplete ya está inicializado');
            return;
        }
        
        console.log('🔍 Inicializando autocomplete en modal...');
        
        // Agregar sugerencias locales mientras se escribe
        const suggestionsDiv = document.getElementById('modal-suggestions');
        const localSuggestions = [
            'Av Miguel Hidalgo, Minatitlán',
            'Av Francisco I Madero, Minatitlán',
            'Av Benito Juárez, Minatitlán',
            'Col Emiliano Zapata, Minatitlán',
            'Col Petrolera, Minatitlán',
            'Col Insurgentes, Minatitlán',
            'Centro, Minatitlán',
            'Av José María Morelos, Minatitlán',
            'Coahuila, Minatitlán',
            'Veracruz, Minatitlán'
        ];
        
        // Event listener para mostrar sugerencias mientras se escribe
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.trim().toLowerCase();
            
            if (query.length < 2) {
                suggestionsDiv.classList.add('hidden');
                return;
            }
            
            // Filtrar sugerencias locales
            const matches = localSuggestions.filter(s => s.toLowerCase().includes(query));
            
            if (matches.length > 0) {
                suggestionsDiv.classList.remove('hidden');
                suggestionsDiv.innerHTML = `
                    <div class="p-2">
                        <div class="text-xs font-semibold text-gray-500 px-3 py-2">💡 Sugerencias rápidas:</div>
                        ${matches.map(suggestion => `
                            <button type="button" class="suggestion-item w-full text-left px-4 py-3 hover:bg-yellow-50 rounded-lg transition-colors flex items-center gap-3 group" data-suggestion="${suggestion}">
                                <i class="fas fa-location-dot text-yellow-600 group-hover:text-yellow-700"></i>
                                <span class="text-sm text-gray-700 group-hover:text-gray-900 font-medium">${suggestion}</span>
                            </button>
                        `).join('')}
                    </div>
                `;
                
                // Event listeners para las sugerencias
                document.querySelectorAll('.suggestion-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const suggestion = this.getAttribute('data-suggestion');
                        searchInput.value = suggestion;
                        suggestionsDiv.classList.add('hidden');
                        
                        // Trigger autocomplete si está disponible
                        if (modalAutocomplete) {
                            google.maps.event.trigger(searchInput, 'focus');
                            google.maps.event.trigger(searchInput, 'keydown', {
                                keyCode: 13,
                                key: 'Enter'
                            });
                        }
                    });
                });
            } else {
                suggestionsDiv.classList.add('hidden');
            }
        });
        
        // Ocultar sugerencias al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                suggestionsDiv.classList.add('hidden');
            }
        });
        
        // Verificar que Places API esté cargada
        if (!window.google || !window.google.maps || !window.google.maps.places) {
            console.error('❌ Google Maps Places API no está cargada');
            console.log('💡 Asegúrate de que la API key tenga Places habilitado');
            console.log('💡 URL debe incluir: &libraries=places');
            
            // Mostrar mensaje en el input
            searchInput.placeholder = '🔍 Busca tu dirección (ejemplo: Av Miguel Hidalgo...)';
            return;
        }
        
        try {
            // Crear autocomplete con configuración optimizada para Minatitlán
            modalAutocomplete = new google.maps.places.Autocomplete(searchInput, {
                componentRestrictions: { country: 'mx' },
                fields: ['formatted_address', 'geometry', 'name', 'address_components'],
                types: ['address', 'street_address', 'route', 'locality'],
                // Área de búsqueda centrada en Minatitlán, Veracruz
                bounds: new google.maps.LatLngBounds(
                    new google.maps.LatLng(17.9, -94.6),  // Suroeste
                    new google.maps.LatLng(18.1, -94.4)   // Noreste
                ),
                strictBounds: false
            });
            
            // Listener para cuando se selecciona un lugar
            modalAutocomplete.addListener('place_changed', () => {
                console.log('📍 Lugar seleccionado del autocomplete');
                const place = modalAutocomplete.getPlace();
                
                if (!place.geometry || !place.geometry.location) {
                    console.log('⚠️ No se encontró geometría para:', place.name);
                    alert('⚠️ No se encontraron coordenadas para esa dirección.\n\nPor favor:\n• Selecciona una opción de la lista de sugerencias\n• Escribe una dirección más específica\n• O arrastra el mapa al lugar correcto');
                    return;
                }
                
                console.log('✅ Lugar válido:', place.formatted_address);
                console.log('📊 Coordenadas:', place.geometry.location.lat(), place.geometry.location.lng());
                
                // Ocultar sugerencias locales
                suggestionsDiv.classList.add('hidden');
                
                // Centrar mapa en la ubicación seleccionada
                if (modalMap) {
                    modalMap.panTo(place.geometry.location);
                    modalMap.setZoom(17);
                }
                
                // Guardar ubicación seleccionada
                modalSelectedLocation = place.geometry.location;
                
                // Actualizar preview
                updateModalPreview(place.geometry.location);
            });
            
            console.log('✅ Autocomplete inicializado correctamente para Minatitlán');
            searchInput.placeholder = '🔍 Ejemplo: Av Miguel Hidalgo 123...';
            
        } catch (error) {
            console.error('❌ Error al inicializar autocomplete:', error);
            searchInput.placeholder = '🔍 Busca tu dirección manualmente';
        }
    }
    
    // Actualizar preview de dirección - MEJORADO
    async function updateModalPreview(location) {
        if (!location) {
            console.log('⚠️ updateModalPreview: location es null/undefined');
            return;
        }
        
        console.log('🔄 updateModalPreview llamada con location:', location);
        
        const previewEl = document.getElementById('modal-address-preview');
        const addressTextEl = document.getElementById('modal-address-text');
        const availabilityEl = document.getElementById('modal-availability');
        const loadingSpinner = document.getElementById('modal-loading-spinner');
        const confirmTextEl = document.getElementById('modal-confirm-text');
        
        const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
        const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
        
        // Mostrar loading
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');
        if (addressTextEl) addressTextEl.textContent = 'Buscando dirección...';
        
        // Calcular distancia y zona
        const distance = calculateDistance(RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng, lat, lng);
        const zone = getDeliveryZone(distance);
        const hasService = zone && zone.price !== null;
        
        // Geocoding reverso para obtener dirección legible
        let address = `📍 Ubicación: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        if (window.google && window.google.maps && window.google.maps.Geocoder) {
            try {
                const geocoder = new google.maps.Geocoder();
                const result = await geocoder.geocode({ location: { lat, lng } });
                if (result && result.results && result.results[0]) {
                    address = result.results[0].formatted_address;
                }
            } catch (e) {
                console.log('Error geocoding:', e);
            }
        }
        
        // Ocultar loading
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
        
        // Actualizar texto de dirección
        if (addressTextEl) {
            addressTextEl.innerHTML = `
                <span class="font-medium text-gray-900">${address}</span>
                <div class="mt-2 flex flex-wrap gap-2">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-xs border border-gray-300">
                        <i class="fas fa-route text-blue-600"></i>
                        <strong>${distance.toFixed(1)} km</strong> del restaurante
                    </span>
                    ${hasService ? `
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-xs border border-gray-300">
                            <i class="fas fa-truck text-green-600"></i>
                            Envío: <strong>$${zone.price}</strong>
                        </span>
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-xs border border-gray-300">
                            <i class="fas fa-clock text-orange-600"></i>
                            ${zone.time || '25-35 min'}
                        </span>
                    ` : ''}
                </div>
            `;
        }
        
        // Actualizar estilo del preview
        if (previewEl) {
            if (hasService) {
                previewEl.className = 'mb-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 min-h-[100px] animate-fade-in';
            } else {
                previewEl.className = 'mb-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border-2 border-red-300 min-h-[100px] animate-fade-in';
            }
        }
        
        // Actualizar indicador de disponibilidad
        if (availabilityEl) {
            availabilityEl.classList.remove('hidden');
            
            if (hasService) {
                availabilityEl.className = 'mb-3 p-4 bg-gradient-to-r from-green-600 to-green-700 rounded-xl text-white text-center animate-scale-in';
                availabilityEl.innerHTML = `
                    <div class="flex items-center justify-center gap-3">
                        <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-check text-green-600 text-lg"></i>
                        </div>
                        <div class="text-left">
                            <p class="font-bold text-lg">✅ ¡SÍ ENTREGAMOS A TU ZONA!</p>
                            <p class="text-sm text-green-100 mt-0.5">
                                ${zone.name} • Costo: $${zone.price} • ${zone.time || 'Tiempo estimado: 25-35 min'}
                            </p>
                        </div>
                    </div>
                `;
            } else {
                availabilityEl.className = 'mb-3 p-4 bg-gradient-to-r from-red-600 to-red-700 rounded-xl text-white text-center animate-scale-in';
                availabilityEl.innerHTML = `
                    <div class="flex items-center justify-center gap-3">
                        <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-times text-red-600 text-lg"></i>
                        </div>
                        <div class="text-left">
                            <p class="font-bold text-lg">❌ LO SENTIMOS, ESTÁS MUY LEJOS</p>
                            <p class="text-sm text-red-100 mt-0.5">
                                Tu ubicación está a ${distance.toFixed(1)} km. Solo entregamos hasta ${MAX_DELIVERY_DISTANCE} km de distancia.
                            </p>
                        </div>
                    </div>
                    <div class="mt-3 p-3 bg-white/10 rounded-lg">
                        <p class="text-xs text-white/90 text-left">
                            <strong>📍 Zonas de entrega:</strong><br>
                            • Zona 1 (0-4 km): $${DELIVERY_PRICE}<br>
                            • Zona 2 (4-12 km): $${DELIVERY_PRICE} + $${EXTRA_KM_PRICE}/km adicional
                        </p>
                    </div>
                `;
            }
        }
        
        // Actualizar botón de confirmar
        if (confirmBtn) {
            if (hasService) {
                confirmBtn.disabled = false;
                confirmBtn.className = 'flex-1 min-h-[56px] px-6 py-3.5 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 font-bold text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200';
                if (confirmTextEl) {
                    confirmTextEl.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Confirmar y continuar';
                }
            } else {
                confirmBtn.disabled = true;
                confirmBtn.className = 'flex-1 min-h-[56px] px-6 py-3.5 rounded-xl bg-gray-400 text-gray-700 font-bold text-base cursor-not-allowed opacity-60';
                if (confirmTextEl) {
                    confirmTextEl.innerHTML = '<i class="fas fa-ban mr-2"></i>Fuera de zona de entrega';
                }
            }
        }
    }
    
    // Geolocalización con mejor soporte móvil - usando event delegation
    
    // Confirmar ubicación
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            if (!modalSelectedLocation) return;
            
            const lat = typeof modalSelectedLocation.lat === 'function' ? modalSelectedLocation.lat() : modalSelectedLocation.lat;
            const lng = typeof modalSelectedLocation.lng === 'function' ? modalSelectedLocation.lng() : modalSelectedLocation.lng;
            
            const distance = calculateDistance(RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng, lat, lng);
            const zone = getDeliveryZone(distance);
            
            if (zone && zone.price !== null) {
                // Obtener dirección formateada
                let formattedAddress = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
                if (window.google && window.google.maps && window.google.maps.Geocoder) {
                    try {
                        const geocoder = new google.maps.Geocoder();
                        const result = await geocoder.geocode({ location: { lat, lng } });
                        if (result && result.results && result.results[0]) {
                            formattedAddress = result.results[0].formatted_address;
                        }
                    } catch (e) {
                        console.log('Error geocoding:', e);
                    }
                }
                
                // Guardar dirección global
                userAddress = {
                    formatted_address: formattedAddress,
                    coordinates: { lat, lng },
                    distance: distance,
                    deliveryPrice: zone.price,
                    zone: zone.zone
                };
                
                // Actualizar preview en hero
                const heroPreview = document.getElementById('hero-address-preview');
                if (heroPreview && openedFrom === 'hero') {
                    heroPreview.innerHTML = `<i class="fas fa-map-marker-alt mr-2"></i>${formattedAddress.substring(0, 50)}...`;
                }
                
                // Actualizar preview en checkout
                const checkoutPreview = document.getElementById('checkout-address-preview');
                const checkoutAddressText = document.getElementById('checkout-address-text');
                const checkoutDeliveryInfo = document.getElementById('checkout-delivery-info');
                
                if (checkoutPreview && checkoutAddressText && openedFrom === 'checkout') {
                    checkoutPreview.classList.remove('hidden');
                    checkoutAddressText.textContent = formattedAddress;
                    checkoutDeliveryInfo.innerHTML = `
                        <i class="fas fa-route mr-1"></i>${distance.toFixed(1)} km • 
                        <i class="fas fa-dollar-sign mr-1"></i>Envío: $${zone.price} • 
                        <i class="fas fa-clock mr-1"></i>${zone.time || '25-35 min'}
                    `;
                    
                    // Ocultar botón de abrir mapa, mostrar el preview
                    const openCheckoutBtn = document.getElementById('open-checkout-map');
                    if (openCheckoutBtn) {
                        openCheckoutBtn.classList.add('hidden');
                    }
                    
                    // Actualizar costo de envío en el resumen
                    updateDeliveryFee(zone.price);
                }
                
                // Mostrar modal de éxito solo si viene del hero
                if (openedFrom === 'hero') {
                    showDeliveryZoneInfo(distance, zone);
                }
                
                // Cerrar modal
                closeModal();
            }
        });
    }
    
    // Configurar geolocalización inicial
    setupGeolocation();
    
    console.log('✅ Modal de mapa inicializado');
}

// Función helper para actualizar el costo de envío en checkout
function updateDeliveryFee(price) {
    const deliveryFeeElement = document.getElementById('checkout-delivery-fee');
    if (deliveryFeeElement) {
        deliveryFeeElement.classList.remove('hidden');
        const feeSpan = deliveryFeeElement.querySelector('span:last-child');
        if (feeSpan) {
            feeSpan.textContent = `+$${price.toFixed(2)}`;
        }
        
        // Recalcular total
        const subtotalElement = document.getElementById('checkout-subtotal');
        const totalElement = document.getElementById('checkout-total');
        
        if (subtotalElement && totalElement) {
            const subtotal = parseFloat(subtotalElement.textContent.replace('$', '')) || 0;
            const total = subtotal + price;
            totalElement.textContent = `$${total.toFixed(2)}`;
        }
    }
}

// Función debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// MEJORAS DE RESPONSIVIDAD MÓVIL - SIMPLIFICADO
// ============================================

function initMobileEnhancements() {
    console.log('🔧 Inicializando mejoras móviles simplificadas...');
    
    // Detectar tipo de dispositivo
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    
    if (isMobile || isTouchDevice) {
        document.body.classList.add('touch-device', 'mobile-device');
        console.log('📱 Dispositivo móvil táctil detectado');
        
        // Agregar clase CSS para feedback visual
        addTouchFeedbackClass();
        
        // Mejorar scrolling
        document.body.style.webkitOverflowScrolling = 'touch';
        document.body.style.overflowX = 'hidden';
    } else {
        document.body.classList.add('non-touch-device');
        console.log('🖱️ Dispositivo no táctil detectado');
    }
    
    // Manejar orientación
    handleOrientation();
    window.addEventListener('orientationchange', handleOrientation);
    window.addEventListener('resize', handleOrientation);
    
    console.log('✅ Mejoras móviles inicializadas correctamente');
}

// Agregar feedback visual simple con CSS
function addTouchFeedbackClass() {
    // Solo agregar clase al body, el CSS hará el resto
    document.body.classList.add('enable-touch-feedback');
}

// Manejar orientación del dispositivo
function handleOrientation() {
    const isPortrait = window.innerHeight > window.innerWidth;
    document.body.classList.toggle('portrait-mode', isPortrait);
    document.body.classList.toggle('landscape-mode', !isPortrait);
}

}


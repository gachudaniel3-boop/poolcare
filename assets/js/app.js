        // ==========================================
        // Shared browser/API data.
        let PROJECTS = window.PoolcareData.projects;
        let SERVICES_DATA = window.PoolcareData.services;
        let REVIEWS = window.PoolcareData.reviews;
        let PRODUCTS = window.PoolcareData.products;

        // 5. BLOG GUIDES DATA
        const GUIDES = [
            {
                id: 'g1',
                title: 'How to Fix Green Pool Water After Heavy Rains in Kenya',
                snippet: 'Heavy downpours introduce organic debris and alter water pH rapidly. Learn the 3-step chemical shock procedure...',
                body: '<p class="text-sm text-slate-300 space-y-3">During rainy seasons in Ruiru and Nairobi, surface runoff dilutes chlorine levels and brings phosphates into the water. Follow these steps:<br><br>1. <strong>Test pH:</strong> Adjust pH to 7.2 using pH Minus.<br>2. <strong>Super-chlorinate:</strong> Add 1.5kg of 90% Dry Chlorine per 50,000 Liters at sunset.<br>3. <strong>Run Pump continuously:</strong> Keep filtration running for 24 hours and backwash filter sand twice.</p>'
            },
            {
                id: 'g2',
                title: 'Concrete In-Ground vs Fibreglass Shell: Which is Best for Ruiru Soil?',
                snippet: 'Black cotton soil in parts of Kiambu requires specific pool engineering. Compare costs and longevity...',
                body: '<p class="text-sm text-slate-300 space-y-3">Ruiru soils vary between red volcanic and black cotton. Concrete pools with proper double-mat rebar allow infinite custom shapes and handle high water tables smoothly when waterproofed with epoxy membranes. Fibreglass offers faster 5-day installs but requires specialized backfilling gravel.</p>'
            },
            {
                id: 'g3',
                title: 'Essential Weekly Pool Maintenance Checklist for Homeowners',
                snippet: 'Keep your pump motor healthy and extend tile life with this simple 15-minute weekly checklist...',
                body: '<p class="text-sm text-slate-300 space-y-3">1. Empty pump strainer basket and skimmer pots.<br>2. Check pressure gauge on sand filter (Backwash if above 15 PSI).<br>3. Test Free Chlorine (maintain 2.0 - 3.0 PPM) and pH (maintain 7.2 - 7.6).<br>4. Brush tile water line to prevent calcium scale buildup.</p>'
            }
        ];

        // GLOBAL APPLICATION STATE
        let cart = [];
        let orbitIndex = 0;
        let orbitCards = [];
        let orbitInterval = null;

        // CONVEYOR ANIMATION STATE
        let conveyorScroll = 0;
        let conveyorPaused = false;
        let conveyorHoverTimer = null;
        let conveyorHasBeenPaused = false;
        let estimatorConfig = window.PoolcareData.estimatorConfig;
        let maintenancePlans = window.PoolcareData.maintenancePlans;
        let siteBranding = window.PoolcareData.branding;
        let servicesExpanded = false;
        let reviewsExpanded = false;
        let activeServiceFilter = 'all';

        function updateThemeToggle(theme) {
            const button = document.getElementById('themeToggle');
            if (!button) return;
            const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
            button.setAttribute('aria-label', label);
            button.title = label;
        }

        function applyTheme(theme) {
            document.documentElement.dataset.theme = theme;
            updateThemeToggle(theme);
            try {
                localStorage.setItem('poolcare-theme', theme);
            } catch (error) {
                console.warn('Theme preference could not be saved.', error);
            }
        }

        function initThemeToggle() {
            const button = document.getElementById('themeToggle');
            if (!button) return;

            updateThemeToggle(document.documentElement.dataset.theme || 'dark');
            button.addEventListener('click', () => {
                const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
                const bounds = button.getBoundingClientRect();
                const x = bounds.left + bounds.width / 2;
                const y = bounds.top + bounds.height / 2;
                document.documentElement.style.setProperty('--theme-x', `${x}px`);
                document.documentElement.style.setProperty('--theme-y', `${y}px`);

                if (typeof document.startViewTransition === 'function') {
                    document.startViewTransition(() => applyTheme(nextTheme));
                    return;
                }

                const fallback = document.getElementById('themeWashFallback');
                if (!fallback) {
                    applyTheme(nextTheme);
                    return;
                }
                applyTheme(nextTheme);
                fallback.classList.remove('is-active');
                void fallback.offsetWidth;
                fallback.classList.add('is-active');
                fallback.onanimationend = (event) => {
                    if (event.target === fallback && event.animationName === 'fallbackWaterWash') {
                        fallback.classList.remove('is-active');
                        fallback.onanimationend = null;
                    }
                };
            });
        }

        initThemeToggle();

        function escapeHtml(value) {
            return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function getSafeMediaUrl(value) {
            const url = String(value || '').trim();
            return /^(https?:\/\/|data:image\/|data:video\/)/i.test(url) ? url : '';
        }

        function applySiteBranding(branding) {
            if (!branding) return;
            const logo = getSafeMediaUrl(branding.logoUrl) || 'PICTURES/p-assets/flogo.png';
            document.querySelectorAll('[data-brand-logo]').forEach(image => {
                image.src = logo;
                image.alt = `${branding.brandName || 'Poolcare'} ${branding.brandSubtitle || 'Contractors'} logo`;
            });
            document.querySelectorAll('[data-brand-name]').forEach(element => {
                element.textContent = branding.brandName || 'Poolcare';
            });
            document.querySelectorAll('[data-brand-subtitle]').forEach(element => {
                element.textContent = branding.brandSubtitle || 'Contractors';
            });
        }

        function initMobileNavigation() {
            const toggle = document.getElementById('mobileMenuToggle');
            const drawer = document.getElementById('mobileNavDrawer');
            if (!toggle || !drawer) return;
            let menuOpenTimer = null;

            const closeMenu = () => {
                if (toggle.getAttribute('aria-expanded') !== 'true') return;
                window.clearTimeout(menuOpenTimer);
                toggle.setAttribute('aria-expanded', 'false');
                toggle.setAttribute('aria-label', 'Open navigation menu');
                drawer.classList.remove('is-open');
                window.setTimeout(() => {
                    if (!drawer.classList.contains('is-open')) drawer.hidden = true;
                }, 220);
            };
            const openMenu = () => {
                window.clearTimeout(menuOpenTimer);
                drawer.hidden = false;
                menuOpenTimer = window.setTimeout(() => drawer.classList.add('is-open'), 20);
                toggle.setAttribute('aria-expanded', 'true');
                toggle.setAttribute('aria-label', 'Close navigation menu');
            };

            toggle.addEventListener('click', () => {
                toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
            });
            drawer.addEventListener('click', event => {
                if (event.target.closest('a')) closeMenu();
            });
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape') closeMenu();
            });
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) closeMenu();
            });
        }

        function listenForSiteContentUpdates() {
            window.addEventListener('storage', event => {
                if (event.key !== 'poolcare-site-data' || !event.newValue) return;
                try {
                    const data = JSON.parse(event.newValue);
                    PROJECTS = data.projects || PROJECTS;
                    SERVICES_DATA = data.services || SERVICES_DATA;
                    REVIEWS = data.reviews || REVIEWS;
                    PRODUCTS = data.products || PRODUCTS;
                    estimatorConfig = data.estimatorConfig || estimatorConfig;
                    maintenancePlans = data.maintenancePlans || maintenancePlans;
                    siteBranding = data.branding || siteBranding;
                    applySiteBranding(siteBranding);
                    initConveyorBelt();
                    renderServices(activeServiceFilter);
                    renderReviews();
                    renderProducts();
                    renderMaintenancePlans();
                    renderEstimatorConfig();
                    populateQuoteServicesSelect();
                } catch (error) {
                    console.error('Updated site content could not be applied.', error);
                }
            });
        }

        // INITIALIZE ON WINDOW LOAD
        async function initializeSite() {
            document.getElementById('yearSpan').textContent = new Date().getFullYear();

            try {
                const siteData = await PoolcareAPI.initialize(window.PoolcareData);
                PROJECTS = siteData.projects || PROJECTS;
                SERVICES_DATA = siteData.services || SERVICES_DATA;
                REVIEWS = siteData.reviews || REVIEWS;
                PRODUCTS = siteData.products || PRODUCTS;
                estimatorConfig = siteData.estimatorConfig || estimatorConfig;
                maintenancePlans = siteData.maintenancePlans || maintenancePlans;
                siteBranding = siteData.branding || siteBranding;
                applySiteBranding(siteBranding);
            } catch (error) {
                console.error('Site content could not be loaded.', error);
                showToast('Could not load saved site content. Showing the built-in content.');
            }

            // Render Core UI Sections
            initOrbitCarousel();
            initConveyorBelt();
            renderServices('all');
            renderReviews();
            renderProducts();
            renderMaintenancePlans();
            renderGuides();
            populateQuoteServicesSelect();
            renderEstimatorConfig();
            initMobileNavigation();
            listenForSiteContentUpdates();

            // Check URL Hash for Mobile Direct Page Navigation
            handleRouting();
            window.addEventListener('hashchange', handleRouting);

            // Start Animation Loop
            requestAnimationFrame(animateConveyorLoop);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeSite, { once: true });
        } else {
            initializeSite();
        }

        // ==========================================
        // 1. HERO SEMICIRCULAR ORBIT CAROUSEL
        // ==========================================
        function initOrbitCarousel() {
            const stage = document.getElementById('orbitStage');
            const carousel = document.getElementById('orbitCarousel');
            if (!stage || !carousel) return;
            orbitCards = Array.from(stage.querySelectorAll('[data-orbit-card]'));
            const change = (step) => {
                orbitIndex = (orbitIndex + step + orbitCards.length) % orbitCards.length;
                updateOrbitCarousel();
            };
            document.getElementById('nextOrbitBtn').addEventListener('click', () => change(1));
            document.getElementById('prevOrbitBtn').addEventListener('click', () => change(-1));
            let suppressOrbitClick = false;
            orbitCards.forEach((card, i) => {
                card.addEventListener('click', () => {
                    if (suppressOrbitClick) return;
                    orbitIndex = i;
                    updateOrbitCarousel();
                });
                card.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); orbitIndex = i; updateOrbitCarousel(); }
                });
            });

            let startX = 0;
            stage.addEventListener('pointerdown', (event) => { startX = event.clientX; stage.setPointerCapture(event.pointerId); });
            stage.addEventListener('pointerup', (event) => {
                const delta = event.clientX - startX;
                if (Math.abs(delta) > 35) {
                    suppressOrbitClick = true;
                    change(delta < 0 ? 1 : -1);
                    setTimeout(() => { suppressOrbitClick = false; }, 0);
                }
            });
            stage.addEventListener('wheel', (event) => {
                if (Math.abs(event.deltaY) > 12) { event.preventDefault(); change(event.deltaY > 0 ? 1 : -1); }
            }, { passive: false });
            window.addEventListener('resize', () => {
                stage.classList.add('is-resizing');
                updateOrbitCarousel(false);
                clearTimeout(stage.orbitResizeTimer);
                stage.orbitResizeTimer = setTimeout(() => stage.classList.remove('is-resizing'), 120);
            });
            stage.classList.add('is-resizing');
            updateOrbitCarousel(false);
            requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('is-resizing')));
            orbitInterval = setInterval(() => change(1), 5200);
        }

        function updateOrbitCarousel(animate = true) {
            const stage = document.getElementById('orbitStage');
            const counter = document.getElementById('orbitCounter');
            if (!stage || !orbitCards.length) return;
            const mobile = window.matchMedia('(max-width: 768px)').matches;
            const desktopWide = window.matchMedia('(min-width: 1200px)').matches;
            const carousel = document.getElementById('orbitCarousel');
            const radius = parseFloat(getComputedStyle(stage.querySelector('.orbit-track')).width) / 2 || (mobile ? 170 : 270);
            const hero = document.getElementById('hero');
            const column = stage.closest('.hero-orbit-column');
            const viewportBleed = desktopWide ? Math.max(0, hero.getBoundingClientRect().right - column.getBoundingClientRect().right) : 0;
            const edgeGap = mobile || desktopWide ? 0 : Math.max(0, hero.getBoundingClientRect().right - stage.getBoundingClientRect().right);
            carousel.style.setProperty('--orbit-viewport-bleed', `${viewportBleed}px`);
            stage.style.setProperty('--orbit-edge-gap', `${edgeGap}px`);
            const centerX = mobile ? stage.clientWidth / 2 : stage.clientWidth + edgeGap;
            const centerY = mobile ? stage.clientHeight - radius : stage.clientHeight / 2;
            const angles = mobile ? [270, 310, 330, 230] : [180, 220, 250, 140];
            if (counter) counter.textContent = `${orbitIndex + 1} / ${orbitCards.length}`;
            const moves = orbitCards.map((card, i) => {
                const offset = (i - orbitIndex + orbitCards.length) % orbitCards.length;
                const angle = angles[offset];
                const currentAngle = Number(card.dataset.orbitAngle);
                const active = offset === 0;
                card.classList.toggle('is-active', active);
                card.setAttribute('aria-pressed', active ? 'true' : 'false');
                card.style.opacity = active ? '1' : '.62';
                card.style.zIndex = active ? '5' : '2';
                card.style.pointerEvents = 'auto';
                card.style.width = active ? (mobile ? 'min(270px, 72vw)' : '300px') : (mobile ? '145px' : '164px');
                card.style.minHeight = active ? (mobile ? '196px' : '214px') : (mobile ? '68px' : '76px');
                card.style.padding = active ? (mobile ? '1.15rem' : '1.4rem') : (mobile ? '.55rem .65rem' : '.7rem .8rem');
                return { card, from: Number.isFinite(currentAngle) ? currentAngle : angle, to: angle, active };
            });

            const place = (move, angle) => {
                const radians = angle * Math.PI / 180;
                const x = centerX + Math.cos(radians) * radius;
                const y = centerY + Math.sin(radians) * radius;
                const rotation = mobile ? angle - 270 : angle - 180;
                move.card.dataset.orbitAngle = angle;
                move.card.style.left = `${x}px`;
                move.card.style.top = `${y}px`;
                const active = move.card.classList.contains('is-active');
                const scale = active ? 1 : .7;
                move.card.style.transform = `translate(-50%, -50%) rotate(${active ? 0 : rotation}deg) scale(${scale})`;
            };
            // Move cards to their deterministic orbital slots. CSS transitions keep
            // the motion smooth without stale animation frames when a tab is hidden.
            moves.forEach(move => place(move, move.to));
        }

        // ==========================================
        // 2. PROJECT CONVEYOR BELT WITH WAVE MOTION & HOVER RULE
        // ==========================================
        function initConveyorBelt() {
            const track = document.getElementById('conveyorTrack');
            // Duplicate projects array to make a smooth infinite loop
            const items = [...PROJECTS, ...PROJECTS, ...PROJECTS];

            track.innerHTML = items.map((p, idx) => `
                <div class="conveyor-card glass-card glass-card-hover rounded-2xl overflow-hidden p-3 border border-white/10" 
                     data-project-id="${escapeHtml(p.id)}"
                     >
                    <div class="relative h-44 rounded-xl overflow-hidden mb-3 bg-slate-800">
                        ${p.isVideo
                            ? `<video src="${getSafeMediaUrl(p.mainImg)}" class="w-full h-full object-cover" muted loop playsinline></video>`
                            : `<img src="${getSafeMediaUrl(p.mainImg)}" alt="${escapeHtml(p.title)}" class="w-full h-full object-cover">`}
                        ${p.isVideo ? `<span class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-rose-600/90 text-white text-[10px] font-bold uppercase tracking-wide flex items-center gap-1"><i class="fa-solid fa-play text-[8px]"></i> Video</span>` : ''}
                        <span class="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold">${escapeHtml(p.type)}</span>
                    </div>
                    <div class="space-y-1">
                        <span class="text-[10px] font-bold text-brand-cyan uppercase tracking-wider">${escapeHtml(p.category)}</span>
                        <h4 class="text-sm font-bold text-white truncate">${escapeHtml(p.title)}</h4>
                        <p class="text-xs text-slate-400 flex items-center gap-1">
                            <i class="fa-solid fa-location-dot text-brand-teal text-[10px]"></i> ${escapeHtml(p.location)}
                        </p>
                    </div>
                </div>
            `).join('');
            track.onclick = event => {
                const card = event.target.closest('[data-project-id]');
                if (card) handleProjectClick(card.dataset.projectId);
            };

            const viewport = document.getElementById('conveyorViewport');

            // EXACT HOVER RULE FROM SKETCH:
            // "Motion can be halted by hovering the mouse on it for ONLY a second and then motion continues even if mouse is still hovering."
            viewport.onmouseenter = triggerHoverPause;
            viewport.ontouchstart = triggerHoverPause;
            
            viewport.onmouseleave = () => {
                conveyorHasBeenPaused = false;
                clearTimeout(conveyorHoverTimer);
            };
        }

        function triggerHoverPause() {
            if (!conveyorHasBeenPaused) {
                conveyorPaused = true;
                conveyorHasBeenPaused = true;
                
                // Automatically RESUME motion after exactly 1000ms (1 second) even if mouse stays over!
                conveyorHoverTimer = setTimeout(() => {
                    conveyorPaused = false;
                }, 1000);
            }
        }

        // ANIMATION LOOP FOR CONTINUOUS BELT & SINUSOIDAL WAVE BOBBING
        function animateConveyorLoop() {
            if (!conveyorPaused) {
                conveyorScroll += 0.75; // Conveyor speed
            }

            const track = document.getElementById('conveyorTrack');
            const cards = track.querySelectorAll('.conveyor-card');
            const cardWidth = 314; // card flex width + gap
            const totalWidth = PROJECTS.length * cardWidth;

            if (!PROJECTS.length) {
                requestAnimationFrame(animateConveyorLoop);
                return;
            }
            if (conveyorScroll >= totalWidth) {
                conveyorScroll = 0;
            }

            // Apply horizontal transform to track
            track.style.transform = `translateX(-${conveyorScroll}px)`;

            // Apply sinusoidal up-and-down wave motion to individual cards
            cards.forEach((card, index) => {
                // Wave formula: Y offset oscillates like a wave across the conveyor
                const waveY = Math.sin((conveyorScroll * 0.02) + (index * 1.2)) * 12;
                card.style.transform = `translateY(${waveY}px)`;
            });

            requestAnimationFrame(animateConveyorLoop);
        }

        // PROJECT CLICK HANDLER (Desktop Modal vs Mobile New Page View)
        function handleProjectClick(id) {
            const project = PROJECTS.find(p => p.id === id);
            if (!project) return;

            if (window.innerWidth <= 768) {
                // Mobile behavior: Open dedicated mobile page view (Hash router)
                window.location.hash = `project-${project.id}`;
            } else {
                // PC / Desktop behavior: Open Floating Modal Window
                openDesktopModal(project);
            }
        }

        function openDesktopModal(p) {
            const image = document.getElementById('pcModalImg');
            const video = document.getElementById('pcModalVideo');
            const mediaUrl = getSafeMediaUrl(p.mainImg);
            if (p.isVideo) {
                image.classList.add('hidden');
                image.removeAttribute('src');
                video.src = mediaUrl;
                video.classList.remove('hidden');
            } else {
                video.pause();
                video.removeAttribute('src');
                video.classList.add('hidden');
                image.src = mediaUrl;
                image.classList.remove('hidden');
            }
            document.getElementById('pcModalCategory').textContent = p.category;
            document.getElementById('pcModalLocation').textContent = p.location;
            document.getElementById('pcModalTitle').textContent = p.title;
            document.getElementById('pcModalDesc').textContent = p.desc;
            document.getElementById('pcModalType').textContent = p.type;
            document.getElementById('pcModalTime').textContent = p.duration;
            document.getElementById('pcModalWaqLink').href = `https://wa.me/254745410748?text=Hello%20Poolcare%20Contractors,%20I%20am%20interested%20in%20a%20project%20similar%20to%20${encodeURIComponent(p.title)}`;

            const modal = document.getElementById('desktopProjectModal');
            const card = document.getElementById('desktopModalCard');
            modal.classList.add('modal-active');
            card.classList.add('modal-content-active');
        }

        function closeDesktopModal() {
            const modal = document.getElementById('desktopProjectModal');
            const card = document.getElementById('desktopModalCard');
            modal.classList.remove('modal-active');
            card.classList.remove('modal-content-active');
            const video = document.getElementById('pcModalVideo');
            video.pause();
            video.removeAttribute('src');
            video.classList.add('hidden');
            document.getElementById('pcModalImg').classList.remove('hidden');
        }

        // MOBILE PAGE ROUTER (Renders clean dedicated mobile view)
        function handleRouting() {
            const hash = window.location.hash;
            const mainSite = document.getElementById('mainSiteContainer');
            const mobilePage = document.getElementById('mobileProjectPage');
            const mobileContent = document.getElementById('mobileProjectContent');

            if (hash.startsWith('#project-') && window.innerWidth <= 768) {
                const projectId = hash.replace('#project-', '');
                const project = PROJECTS.find(p => p.id === projectId);

                if (project) {
                    mainSite.classList.add('hidden');
                    mobilePage.classList.remove('hidden');

                    mobileContent.innerHTML = `
                        <div class="relative h-64 rounded-2xl overflow-hidden bg-slate-800">
                            ${project.isVideo
                                ? `<video src="${getSafeMediaUrl(project.mainImg)}" class="w-full h-full object-cover" controls playsinline></video>`
                                : `<img src="${getSafeMediaUrl(project.mainImg)}" alt="${escapeHtml(project.title)}" class="w-full h-full object-cover">`}
                            <span class="absolute top-3 left-3 px-3 py-1 rounded-full bg-brand-cyan text-brand-navy font-bold text-xs">${escapeHtml(project.category)}</span>
                        </div>

                        <div class="glass-card p-5 rounded-2xl space-y-3">
                            <h2 class="text-2xl font-extrabold text-white">${escapeHtml(project.title)}</h2>
                            <p class="text-xs font-semibold text-brand-teal flex items-center gap-1">
                                <i class="fa-solid fa-location-dot"></i> ${escapeHtml(project.location)}
                            </p>
                            <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(project.desc)}</p>
                            
                            <div class="grid grid-cols-2 gap-2 pt-2 text-xs">
                                <div class="p-2.5 rounded-lg bg-white/5"><span class="text-slate-400 block">Type:</span> <strong>${escapeHtml(project.type)}</strong></div>
                                <div class="p-2.5 rounded-lg bg-white/5"><span class="text-slate-400 block">Duration:</span> <strong>${escapeHtml(project.duration)}</strong></div>
                            </div>
                        </div>

                        <div class="glass-card p-5 rounded-2xl space-y-3">
                            <h4 class="text-sm font-bold text-white">Interested in a similar pool design?</h4>
                            <p class="text-xs text-slate-400">Contact our Eastern Bypass Ruiru team directly for an on-site estimate.</p>
                            <a href="https://wa.me/254745410748?text=Hello,%20I%20am%20viewing%20${encodeURIComponent(project.title)}%20on%20mobile%20and%20would%20like%20a%20quote." target="_blank" rel="noopener noreferrer" class="w-full py-3 rounded-xl bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                                <i class="fa-brands fa-whatsapp text-base"></i> WhatsApp Inquiry
                            </a>
                        </div>
                    `;
                    window.scrollTo(0, 0);
                    return;
                }
            }

            // Default route view
            mainSite.classList.remove('hidden');
            mobilePage.classList.add('hidden');
        }

        function closeMobileProjectView() {
            window.location.hash = '';
        }

        // ==========================================
        // 3. SERVICES SECTION LOGIC (25 Exact Services)
        // ==========================================
        function renderServices(filter) {
            const grid = document.getElementById('servicesGrid');
            const filtered = filter === 'all' 
                ? SERVICES_DATA 
                : SERVICES_DATA.filter(s => s.cat === filter);
            const allServicesButton = document.querySelector('#serviceFilterPills .svc-pill');
            if (allServicesButton) allServicesButton.textContent = `All Services (${SERVICES_DATA.length})`;
            const visible = servicesExpanded ? filtered : filtered.slice(0, 5);
            const serviceCards = visible.map((s, index) => `
                <div class="glass-card glass-card-hover p-5 rounded-2xl transition duration-200 flex flex-col justify-between">
                    <div>
                        <div class="w-10 h-10 rounded-xl bg-brand-cyan/15 text-brand-cyan flex items-center justify-center text-lg font-bold mb-3">
                            <i class="fa-solid ${escapeHtml(s.icon || 'fa-water')}"></i>
                        </div>
                        <h3 class="text-base font-bold text-white mb-1">${escapeHtml(s.name)}</h3>
                        <p class="text-xs text-slate-300 leading-relaxed mb-4">${escapeHtml(s.desc)}</p>
                    </div>
                    <button type="button" data-service-index="${index}" class="service-book-btn text-xs font-extrabold text-brand-teal hover:text-brand-cyan transition flex items-center gap-1">
                        Book This Service <i class="fa-solid fa-chevron-right text-[10px]"></i>
                    </button>
                </div>
            `).join('');
            const showMore = filtered.length > 5
                ? `<button type="button" class="expand-card glass-card glass-card-hover rounded-2xl" onclick="toggleServices()" aria-expanded="${servicesExpanded}">
                        <i class="fa-solid ${servicesExpanded ? 'fa-minus' : 'fa-plus'}"></i>
                        <span>${servicesExpanded ? 'Show Less' : 'More Services'}</span>
                        <small>${servicesExpanded ? 'Keep the list compact' : `${filtered.length - 5} more services`}</small>
                   </button>`
                : '';
            grid.innerHTML = serviceCards + showMore;
            grid.onclick = event => {
                const button = event.target.closest('[data-service-index]');
                if (!button) return;
                const service = filtered[Number(button.dataset.serviceIndex)];
                if (service) bookSpecificService(service.name);
            };
        }

        function toggleServices() {
            servicesExpanded = !servicesExpanded;
            renderServices(activeServiceFilter);
        }

        function filterServices(category, clickEvent) {
            activeServiceFilter = category;
            servicesExpanded = false;
            document.querySelectorAll('.svc-pill').forEach(btn => {
                btn.classList.remove('bg-brand-cyan', 'text-brand-navy', 'shadow-md');
                btn.classList.add('bg-white/5', 'text-slate-300');
            });
            const activeButton = clickEvent && clickEvent.currentTarget;
            if (activeButton) {
                activeButton.classList.remove('bg-white/5', 'text-slate-300');
                activeButton.classList.add('bg-brand-cyan', 'text-brand-navy', 'shadow-md');
            }

            renderServices(category);
        }

        function populateQuoteServicesSelect() {
            const select = document.getElementById('quoteService');
            select.innerHTML = SERVICES_DATA.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
        }

        function bookSpecificService(serviceName) {
            setActiveToolTab('quote');
            const select = document.getElementById('quoteService');
            select.value = serviceName;
            document.getElementById('tools').scrollIntoView({ behavior: 'smooth' });
            showToast(`Pre-selected "${serviceName}" in request form`);
        }

        // ==========================================
        // 4. REVIEWS LOGIC
        // ==========================================
        function renderReviews() {
            const grid = document.getElementById('reviewsGrid');
            const approvedReviews = REVIEWS.filter(review => review.status !== 'pending');
            const visibleReviews = reviewsExpanded ? approvedReviews : approvedReviews.slice(0, 5);
            const reviewCards = visibleReviews.map(r => `
                <div class="glass-card p-6 rounded-2xl border border-white/10 space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex text-amber-400 text-xs gap-0.5">
                            ${'<i class="fa-solid fa-star"></i>'.repeat(Math.max(1, Math.min(5, Number(r.rating) || 1)))}
                        </div>
                        <span class="text-[10px] text-slate-400 font-mono">${escapeHtml(r.date || 'Recently')}</span>
                    </div>
                    <p class="text-xs text-slate-300 leading-relaxed italic">"${escapeHtml(r.comment)}"</p>
                    <div class="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                        <span class="font-bold text-white">${escapeHtml(r.name)}</span>
                        <span class="text-slate-400 text-[10px]"><i class="fa-solid fa-circle-check text-brand-teal mr-1"></i> ${escapeHtml(r.location)}</span>
                    </div>
                </div>
            `).join('');
            const showMore = approvedReviews.length > 5
                ? `<button type="button" class="expand-card glass-card glass-card-hover rounded-2xl" onclick="toggleReviews()" aria-expanded="${reviewsExpanded}">
                        <i class="fa-solid ${reviewsExpanded ? 'fa-minus' : 'fa-plus'}"></i>
                        <span>${reviewsExpanded ? 'Show Less' : 'More Reviews'}</span>
                        <small>${reviewsExpanded ? 'Keep the list compact' : `${approvedReviews.length - 5} more reviews`}</small>
                   </button>`
                : '';
            grid.innerHTML = reviewCards + showMore;
        }

        function toggleReviews() {
            reviewsExpanded = !reviewsExpanded;
            renderReviews();
        }

        async function submitPublicReview(event) {
            event.preventDefault();
            const form = event.currentTarget;
            const review = {
                id: `r-${Date.now()}`,
                name: form.elements.reviewName.value.trim(),
                location: form.elements.reviewLocation.value.trim(),
                rating: Number(form.elements.reviewRating.value),
                comment: form.elements.reviewComment.value.trim(),
                date: 'Just now',
                status: 'pending'
            };
            try {
                await PoolcareAPI.submitReview(review);
                form.reset();
                showToast('Thanks! Your review is awaiting approval.');
            } catch (error) {
                console.error('Review submission failed.', error);
                showToast(error.message || 'Your review could not be submitted.');
            }
        }

        // ==========================================
        // 5. CLIENT HUB TAB CONTROLLER
        // ==========================================
        function setActiveToolTab(tabKey) {
            document.querySelectorAll('.tool-tab-btn').forEach(btn => {
                btn.classList.remove('bg-brand-cyan', 'text-brand-navy', 'shadow-lg');
                btn.classList.add('bg-white/5', 'text-slate-300');
            });

            const activeBtn = document.getElementById(`tabBtn-${tabKey}`);
            if (activeBtn) {
                activeBtn.classList.remove('bg-white/5', 'text-slate-300');
                activeBtn.classList.add('bg-brand-cyan', 'text-brand-navy', 'shadow-lg');
            }

            document.querySelectorAll('.tool-content').forEach(c => c.classList.add('hidden'));
            const activeContent = document.getElementById(`toolContent-${tabKey}`);
            if (activeContent) activeContent.classList.remove('hidden');
        }

        function renderEstimatorConfig() {
            const buildType = document.getElementById('estBuildType');
            if (!buildType || !estimatorConfig) return;
            const selectedValue = buildType.value || String(estimatorConfig.buildRates[0].value);
            buildType.innerHTML = estimatorConfig.buildRates.map(rate =>
                `<option value="${Number(rate.value)}">${escapeHtml(rate.label)}</option>`
            ).join('');
            buildType.value = estimatorConfig.buildRates.some(rate => String(rate.value) === selectedValue)
                ? selectedValue
                : String(estimatorConfig.buildRates[0].value);
            calculateConstructionCost();
            calculateChemicalDose();
        }

        function renderMaintenancePlans() {
            const grid = document.getElementById('maintenancePlansGrid');
            if (!grid) return;
            grid.innerHTML = maintenancePlans.map(plan => `
                <div class="glass-card p-5 rounded-2xl border-t-4 ${plan.featured ? 'border-t-brand-teal relative shadow-xl' : 'border-t-brand-cyan'} space-y-3">
                    ${plan.featured ? '<span class="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-brand-teal text-brand-navy text-[10px] font-extrabold uppercase">Most Popular</span>' : ''}
                    <h4 class="font-bold text-white text-base">${escapeHtml(plan.name)}</h4>
                    <div class="text-2xl font-extrabold text-brand-cyan">KES ${Number(plan.price).toLocaleString()}<span class="text-xs font-normal text-slate-400">/mo</span></div>
                    <p class="text-xs text-slate-300">${escapeHtml(plan.frequency)}</p>
                    <ul class="text-xs text-slate-300 space-y-2">${plan.services.map(service => `
                        <li><i class="fa-solid fa-check text-brand-teal mr-1"></i> ${escapeHtml(service)}</li>
                    `).join('')}</ul>
                    <button onclick="setActiveToolTab('quote')" class="w-full py-2 rounded-lg bg-white/10 text-white font-bold text-xs hover:bg-brand-cyan hover:text-brand-navy transition">Select Plan</button>
                </div>
            `).join('');
        }

        // CALCULATORS
        function calculateConstructionCost() {
            const rate = parseFloat(document.getElementById('estBuildType').value) || 0;
            const l = readBoundedInput('estLength', 10, 4, 25);
            const w = readBoundedInput('estWidth', 5, 2, 15);
            const area = l * w;
            const includeTiling = document.getElementById('estIncludeTiling');
            const includeFiltration = document.getElementById('estIncludeFiltration');
            const addOns = area
                * (includeTiling && includeTiling.checked ? Number(estimatorConfig.tilingAddonPerSqm) || 0 : 0)
                + area
                * (includeFiltration && includeFiltration.checked ? Number(estimatorConfig.filtrationAddonPerSqm) || 0 : 0);
            const minCost = area * rate + addOns;
            const maxCost = minCost * 1.25;

            document.getElementById('estCostDisplay').textContent = 
                `KES ${Math.round(minCost).toLocaleString()} - ${Math.round(maxCost).toLocaleString()}`;
        }

        function readBoundedInput(id, fallback, min, max) {
            const value = Number(document.getElementById(id).value);
            return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
        }

        function calculateChemicalDose() {
            const enteredVolume = Number(document.getElementById('chemVolume').value);
            const volume = Number.isFinite(enteredVolume) && enteredVolume > 0 ? enteredVolume : 50000;
            const status = document.getElementById('chemStatus').value;

            let factor = 1.0;
            if (status === 'cloudy') factor = 1.8;
            if (status === 'green') factor = 3.5;

            const chlorineKg = ((volume / 50000) * 0.75 * factor).toFixed(2);
            const phMinusKg = ((volume / 50000) * 0.50).toFixed(2);
            const algaecideL = ((volume / 50000) * 0.25 * factor).toFixed(2);

            document.getElementById('doseChlorine').textContent = `${chlorineKg} kg`;
            document.getElementById('dosePh').textContent = `${phMinusKg} kg`;
            document.getElementById('doseAlgaecide').textContent = `${algaecideL} L`;
            const estimatedCost = Number(chlorineKg) * Number(estimatorConfig.chlorinePricePerKg)
                + Number(phMinusKg) * Number(estimatorConfig.phReducerPricePerKg)
                + Number(algaecideL) * Number(estimatorConfig.algaecidePricePerLiter);
            const costDisplay = document.getElementById('doseCost');
            if (costDisplay) costDisplay.textContent = `KES ${Math.round(estimatedCost).toLocaleString()}`;
        }

        // ==========================================
        // 6. E-COMMERCE STORE & CART LOGIC
        // ==========================================
        function renderProducts() {
            const grid = document.getElementById('productsGrid');
            grid.innerHTML = PRODUCTS.map(p => `
                <div class="glass-card glass-card-hover p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
                    <div>
                        <div class="h-36 rounded-xl overflow-hidden mb-3 bg-slate-800">
                            <img src="${getSafeMediaUrl(p.img)}" alt="${escapeHtml(p.name)}" class="w-full h-full object-cover">
                        </div>
                        <h4 class="text-sm font-bold text-white mb-1">${escapeHtml(p.name)}</h4>
                        <p class="text-xs text-slate-400 mb-2">${escapeHtml(p.desc)}</p>
                        <div class="text-base font-extrabold text-brand-cyan mb-3">KES ${Number(p.price).toLocaleString()}</div>
                    </div>
                    <button data-product-id="${escapeHtml(p.id)}" class="w-full py-2 rounded-xl bg-white/10 hover:bg-brand-cyan hover:text-brand-navy font-bold text-xs text-white transition flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-plus"></i> Add to Cart
                    </button>
                </div>
            `).join('');
            grid.onclick = event => {
                const button = event.target.closest('[data-product-id]');
                if (button) addToCart(button.dataset.productId);
            };
        }

        function addToCart(productId) {
            const item = PRODUCTS.find(p => p.id === productId);
            if (!item) return;

            const existing = cart.find(c => c.id === productId);
            if (existing) {
                existing.qty++;
            } else {
                cart.push({ ...item, qty: 1 });
            }

            updateCartUI();
            showToast(`Added ${item.name} to cart`);
        }

        function updateCartUI() {
            const countSpan = document.getElementById('cartCount');
            const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
            countSpan.textContent = totalCount;

            const list = document.getElementById('cartItemsList');
            if (cart.length === 0) {
                list.innerHTML = `<div class="text-center text-xs text-slate-400 py-8">Your shopping cart is empty.</div>`;
                document.getElementById('cartTotalDisplay').textContent = `KES 0`;
                return;
            }

            let totalSum = 0;
            list.innerHTML = cart.map(item => {
                const itemTotal = item.price * item.qty;
                totalSum += itemTotal;
                return `
                    <div class="p-3 rounded-xl bg-white/5 flex items-center justify-between text-xs">
                        <div>
                            <div class="font-bold text-white">${escapeHtml(item.name)}</div>
                            <div class="text-slate-400 font-mono">KES ${item.price.toLocaleString()} x ${item.qty}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <strong class="text-brand-teal font-mono">KES ${itemTotal.toLocaleString()}</strong>
                            <button data-cart-remove="${escapeHtml(item.id)}" class="text-rose-400 hover:text-rose-300 ml-1"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
            }).join('');
            list.onclick = event => {
                const button = event.target.closest('[data-cart-remove]');
                if (button) removeFromCart(button.dataset.cartRemove);
            };

            document.getElementById('cartTotalDisplay').textContent = `KES ${totalSum.toLocaleString()}`;
        }

        function removeFromCart(id) {
            cart = cart.filter(c => c.id !== id);
            updateCartUI();
        }

        function toggleCartDrawer() {
            document.getElementById('cartDrawer').classList.toggle('translate-x-full');
        }

        function checkoutCartViaWhatsApp() {
            if (cart.length === 0) {
                showToast('Your cart is empty!');
                return;
            }

            let text = "Hello Poolcare Contractors, I would like to order the following items:\n\n";
            let total = 0;
            cart.forEach(item => {
                const sub = item.price * item.qty;
                total += sub;
                text += `• ${item.name} x${item.qty} = KES ${sub.toLocaleString()}\n`;
            });
            text += `\nTotal Amount: KES ${total.toLocaleString()}\nPlease advise on delivery to my location.`;

            const orderWindow = window.open(`https://wa.me/254745410748?text=${encodeURIComponent(text)}`, '_blank');
            if (!orderWindow) {
                showToast('Allow pop-ups to continue your order in WhatsApp.');
                return;
            }
            orderWindow.opener = null;
        }

        // ==========================================
        // 7. POOL CARE GUIDES (BLOG)
        // ==========================================
        function renderGuides() {
            const grid = document.getElementById('guidesGrid');
            grid.innerHTML = GUIDES.map(g => `
                <div class="glass-card glass-card-hover p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
                    <div>
                        <span class="text-[10px] font-bold text-brand-teal uppercase tracking-widest block mb-2">Guide</span>
                        <h4 class="text-sm font-bold text-white mb-2 leading-snug">${g.title}</h4>
                        <p class="text-xs text-slate-400 leading-relaxed mb-4">${g.snippet}</p>
                    </div>
                    <button onclick="openGuideModal('${g.id}')" class="text-xs font-bold text-brand-cyan hover:underline text-left">
                        Read Full Article →
                    </button>
                </div>
            `).join('');
        }

        function openGuideModal(id) {
            const guide = GUIDES.find(g => g.id === id);
            if (!guide) return;

            document.getElementById('guideModalContent').innerHTML = `
                <span class="text-xs font-bold text-brand-teal uppercase tracking-wider block mb-1">Poolcare Guide</span>
                <h3 class="text-xl font-bold text-white mb-4">${guide.title}</h3>
                <div class="prose prose-invert max-w-none">${guide.body}</div>
            `;

            const modal = document.getElementById('guideModal');
            modal.classList.add('modal-active');
        }

        function closeGuideModal() {
            document.getElementById('guideModal').classList.remove('modal-active');
        }

        // ==========================================
        // 8. FORM HANDLERS & TOASTS
        // ==========================================
        function handleQuoteSubmit(e) {
            e.preventDefault();
            const name = document.getElementById('quoteName').value;
            const phone = document.getElementById('quotePhone').value;
            const location = document.getElementById('quoteLocation').value;
            const service = document.getElementById('quoteService').value;
            const message = document.getElementById('quoteMessage').value;

            const waMsg = `Hello Poolcare Contractors,\n\nName: ${name}\nPhone: ${phone}\nLocation: ${location}\nService: ${service}\nNotes: ${message}`;
            const requestWindow = window.open(`https://wa.me/254745410748?text=${encodeURIComponent(waMsg)}`, '_blank');
            if (!requestWindow) {
                showToast('Allow pop-ups to continue your request in WhatsApp.');
                return;
            }
            requestWindow.opener = null;

            showToast('WhatsApp opened. Send your request there to complete it.');
            document.getElementById('siteVisitForm').reset();
        }

        function showToast(msg) {
            const toast = document.getElementById('toast');
            document.getElementById('toastMsg').textContent = msg;
            toast.classList.remove('translate-x-96');
            setTimeout(() => {
                toast.classList.add('translate-x-96');
            }, 3000);
        }

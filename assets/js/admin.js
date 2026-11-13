(function() {
    const loginView = document.getElementById('adminLogin');
    const dashboard = document.getElementById('adminDashboard');
    const authMessage = document.getElementById('authMessage');
    const notice = document.getElementById('adminNotice');
    let activeTab = 'branding';
    let noticeTimer;
    let loginRetryTimer;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function safeMediaUrl(value) {
        const url = String(value || '').trim();
        return /^(https?:\/\/|data:image\/|data:video\/)/i.test(url) ? url : '';
    }

    function showNotice(message, type) {
        window.clearTimeout(noticeTimer);
        notice.textContent = message;
        notice.className = `admin-notice is-visible is-${type || 'success'}`;
        noticeTimer = window.setTimeout(() => notice.classList.remove('is-visible'), 4500);
    }

    function showAuthMessage(message) {
        authMessage.textContent = message || '';
    }

    function lockLoginFor(seconds) {
        window.clearInterval(loginRetryTimer);
        const submitButton = document.querySelector('#adminLoginForm button[type="submit"]');
        const retryAt = Date.now() + seconds * 1000;
        const updateCountdown = () => {
            const remaining = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
            if (!remaining) {
                window.clearInterval(loginRetryTimer);
                submitButton.disabled = false;
                showAuthMessage('You can try signing in again.');
                return;
            }
            submitButton.disabled = true;
            const minutes = Math.floor(remaining / 60);
            const secondsLeft = remaining % 60;
            showAuthMessage(`Too many sign-in attempts. Try again in ${minutes}:${String(secondsLeft).padStart(2, '0')}.`);
        };
        updateCountdown();
        loginRetryTimer = window.setInterval(updateCountdown, 1000);
    }

    function displayLogin() {
        dashboard.hidden = true;
        loginView.hidden = false;
    }

    function displayDashboard() {
        loginView.hidden = true;
        dashboard.hidden = false;
    }

    function updateModeBadge(mode) {
        const badge = document.getElementById('connectionMode');
        badge.innerHTML = mode === 'server'
            ? '<i class="fa-solid fa-circle"></i> Secure API'
            : '<i class="fa-solid fa-circle"></i> Local content data';
        badge.classList.toggle('is-connected', mode === 'server');
    }

    function setActiveTab(tab) {
        activeTab = tab;
        document.querySelectorAll('.admin-tab').forEach(button => {
            button.classList.toggle('is-active', button.dataset.tab === tab);
        });
        document.querySelectorAll('.admin-panel').forEach(panel => {
            panel.classList.toggle('is-active', panel.dataset.panel === tab);
        });
        const activeButton = document.querySelector(`.admin-tab[data-tab="${tab}"]`);
        document.getElementById('dashboardTitle').textContent =
            activeButton
                ? Array.from(activeButton.querySelectorAll('span'))
                    .find(span => !span.classList.contains('count-badge')).textContent
                : 'Admin Dashboard';
    }

    async function readUpload(fileInput, urlInput, required, mediaType) {
        const file = fileInput && fileInput.files[0];
        const enteredUrl = urlInput ? urlInput.value.trim() : '';
        if (file) return PoolcareAPI.uploadMedia(file, mediaType);
        if (enteredUrl) {
            const parsed = new URL(enteredUrl);
            if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
                throw new Error('Use a public HTTPS media URL without embedded credentials.');
            }
            return parsed.href;
        }
        if (required) throw new Error('Choose a media file or provide a media URL.');
        return '';
    }

    function requiredNumber(input, label) {
        const value = Number(input.value);
        if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative number.`);
        return value;
    }

    async function reloadData() {
        const [projects, services, reviews, products, estimator, plans, branding] = await Promise.all([
            PoolcareAPI.getProjects(),
            PoolcareAPI.getServices(),
            PoolcareAPI.getReviews(),
            PoolcareAPI.getProducts(),
            PoolcareAPI.getEstimatorConfig(),
            PoolcareAPI.getMaintenancePlans(),
            PoolcareAPI.getBranding()
        ]);
        renderProjects(projects);
        renderServices(services);
        renderReviews(reviews);
        renderProducts(products);
        renderEstimator(estimator);
        renderPlans(plans);
        renderBranding(branding);
    }

    function renderProjects(projects) {
        const list = document.getElementById('projectList');
        list.innerHTML = projects.length ? projects.map(project => `
            <article class="item-row">
                <div class="item-row-main">
                    <img class="item-thumb" src="${safeMediaUrl(project.mainImg)}" alt="">
                    <div class="item-copy"><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.location)} · ${escapeHtml(project.type)}</small></div>
                </div>
                <div class="item-actions"><button class="delete-button" data-action="delete-project" data-id="${escapeHtml(project.id)}"><i class="fa-solid fa-trash"></i> Delete</button></div>
            </article>
        `).join('') : '<p class="empty-state">No project cards yet. Add the first project above.</p>';
    }

    function renderServices(services) {
        const list = document.getElementById('serviceList');
        list.innerHTML = services.length ? services.map(service => `
            <article class="item-row">
                <div class="item-copy"><strong>${escapeHtml(service.name)}</strong><small>${escapeHtml(service.desc)}</small></div>
                <div class="item-actions"><button class="delete-button" data-action="delete-service" data-id="${escapeHtml(service.id)}"><i class="fa-solid fa-trash"></i> Delete</button></div>
            </article>
        `).join('') : '<p class="empty-state">No services yet. Add a service above.</p>';
    }

    function renderReviews(reviews) {
        const list = document.getElementById('reviewList');
        const pending = reviews.filter(review => review.status === 'pending').length;
        document.getElementById('pendingBadge').textContent = pending;
        list.innerHTML = reviews.length ? reviews.map(review => `
            <article class="item-row">
                <div class="item-copy">
                    <strong>${escapeHtml(review.name)} · ${'★'.repeat(Math.max(1, Math.min(5, Number(review.rating) || 1)))}</strong>
                    <small>${escapeHtml(review.location)} · ${escapeHtml(review.comment)}</small>
                </div>
                <div class="item-actions">
                    <span class="item-status ${review.status === 'approved' ? 'approved' : ''}">${review.status === 'approved' ? 'Approved' : 'Pending'}</span>
                    ${review.status === 'pending' ? `<button class="small-button" data-action="approve-review" data-id="${escapeHtml(review.id)}"><i class="fa-solid fa-check"></i> Approve</button>` : ''}
                    <button class="delete-button" data-action="delete-review" data-id="${escapeHtml(review.id)}"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
            </article>
        `).join('') : '<p class="empty-state">No reviews yet.</p>';
    }

    function renderProducts(products) {
        const list = document.getElementById('productList');
        list.innerHTML = products.length ? products.map(product => `
            <article class="item-row">
                <div class="item-row-main">
                    <img class="item-thumb" src="${safeMediaUrl(product.img)}" alt="">
                    <div class="item-copy"><strong>${escapeHtml(product.name)}</strong><small>KES ${Number(product.price).toLocaleString()} · ${escapeHtml(product.desc)}</small></div>
                </div>
                <div class="item-actions"><button class="delete-button" data-action="delete-product" data-id="${escapeHtml(product.id)}"><i class="fa-solid fa-trash"></i> Delete</button></div>
            </article>
        `).join('') : '<p class="empty-state">No store items yet. Add the first item above.</p>';
    }

    function renderBranding(branding) {
        document.getElementById('logoUrl').value = branding.logoUrl || '';
        document.getElementById('brandName').value = branding.brandName || '';
        document.getElementById('brandSubtitle').value = branding.brandSubtitle || '';
        document.getElementById('logoPreview').src = safeMediaUrl(branding.logoUrl) || 'PICTURES/p-assets/flogo.png';
        updateBrandPreview();
    }

    function updateBrandPreview() {
        const brandName = escapeHtml(document.getElementById('brandName').value || 'Poolcare');
        const subtitle = escapeHtml(document.getElementById('brandSubtitle').value || 'Contractors');
        document.getElementById('brandPreview').innerHTML = `${brandName}<br><small>${subtitle}</small>`;
    }

    function renderEstimator(config) {
        const buildRateFields = document.getElementById('buildRateFields');
        buildRateFields.innerHTML = config.buildRates.map((rate, index) => `
            <div class="rate-row">
                <div><label for="buildRateLabel${index}">Pool type</label><input id="buildRateLabel${index}" maxlength="100" value="${escapeHtml(rate.label)}" required></div>
                <div><label for="buildRateValue${index}">Rate (KES / m²)</label><input id="buildRateValue${index}" type="number" min="0" step="1" value="${Number(rate.value)}" required></div>
            </div>
        `).join('');
        document.getElementById('tilingAddon').value = config.tilingAddonPerSqm;
        document.getElementById('filtrationAddon').value = config.filtrationAddonPerSqm;
        document.getElementById('chlorinePrice').value = config.chlorinePricePerKg;
        document.getElementById('phReducerPrice').value = config.phReducerPricePerKg;
        document.getElementById('algaecidePrice').value = config.algaecidePricePerLiter;
    }

    function renderPlans(plans) {
        const container = document.getElementById('planForms');
        container.innerHTML = plans.length ? plans.map(plan => `
            <form class="plan-form admin-form" data-plan-id="${escapeHtml(plan.id)}">
                <h3>${escapeHtml(plan.name)}</h3>
                <div class="form-grid">
                    <div><label>Package name</label><input name="name" maxlength="80" value="${escapeHtml(plan.name)}" required></div>
                    <div><label>Monthly price (KES)</label><input name="price" type="number" min="0" step="1" value="${Number(plan.price)}" required></div>
                    <div><label>Visit frequency</label><input name="frequency" maxlength="120" value="${escapeHtml(plan.frequency)}" required></div>
                    <div><label>Included services (one per line)</label><textarea name="services" rows="3" required>${escapeHtml(plan.services.join('\n'))}</textarea></div>
                </div>
                <button class="primary-button" type="submit">Save ${escapeHtml(plan.name)}</button>
            </form>
        `).join('') : '<p class="empty-state">No maintenance plans are configured.</p>';
    }

    async function runAction(action, successMessage) {
        try {
            await action();
            await reloadData();
            showNotice(successMessage, 'success');
        } catch (error) {
            console.error('Admin operation failed.', error);
            showNotice(error.message || 'The operation could not be completed.', 'error');
        }
    }

    async function handleBranding(event) {
        event.preventDefault();
        const form = event.currentTarget;
        await runAction(async () => {
            const logoUrl = await readUpload(document.getElementById('logoFile'), document.getElementById('logoUrl'), false, 'image');
            await PoolcareAPI.updateBranding({
                logoUrl: logoUrl || 'PICTURES/p-assets/flogo.png',
                brandName: document.getElementById('brandName').value.trim(),
                brandSubtitle: document.getElementById('brandSubtitle').value.trim()
            });
            form.reset();
        }, 'Website identity saved.');
    }

    async function handleProject(event) {
        event.preventDefault();
        const form = event.currentTarget;
        await runAction(async () => {
            const mediaInput = document.getElementById('projectMediaFile');
            const mediaUrlInput = document.getElementById('projectMediaUrl');
            const mainImg = await readUpload(mediaInput, mediaUrlInput, true, 'media');
            const mediaFile = mediaInput.files[0];
            const isVideo = mediaFile ? mediaFile.type.startsWith('video/') : /^data:video\//i.test(mainImg) || /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(mainImg);
            await PoolcareAPI.addProject({
                id: `p-${Date.now()}`,
                title: document.getElementById('projectName').value.trim(),
                location: document.getElementById('projectLocation').value.trim(),
                category: document.getElementById('projectType').value.trim(),
                type: document.getElementById('projectType').value.trim(),
                duration: document.getElementById('projectDuration').value.trim() || 'Completed',
                mainImg,
                isVideo,
                desc: document.getElementById('projectDescription').value.trim()
            });
            form.reset();
        }, 'Project card added.');
    }

    async function handleService(event) {
        event.preventDefault();
        const form = event.currentTarget;
        await runAction(async () => {
            await PoolcareAPI.addService({
                id: `s-${Date.now()}`,
                name: document.getElementById('serviceName').value.trim(),
                desc: document.getElementById('serviceDescription').value.trim(),
                cat: document.getElementById('serviceCategory').value,
                icon: 'fa-water'
            });
            form.reset();
        }, 'Service added.');
    }

    async function handleReview(event) {
        event.preventDefault();
        const form = event.currentTarget;
        await runAction(async () => {
            await PoolcareAPI.addReview({
                id: `r-${Date.now()}`,
                name: document.getElementById('reviewName').value.trim(),
                location: document.getElementById('reviewLocation').value.trim(),
                rating: Number(document.getElementById('reviewRating').value),
                comment: document.getElementById('reviewComment').value.trim(),
                date: 'Added by Poolcare',
                status: 'approved'
            });
            form.reset();
        }, 'Review added and published.');
    }

    async function handleProduct(event) {
        event.preventDefault();
        const form = event.currentTarget;
        await runAction(async () => {
            const img = await readUpload(
                document.getElementById('productMediaFile'),
                document.getElementById('productMediaUrl'),
                false,
                'image'
            );
            await PoolcareAPI.addProduct({
                id: `pr-${Date.now()}`,
                name: document.getElementById('productName').value.trim(),
                desc: document.getElementById('productDescription').value.trim(),
                price: requiredNumber(document.getElementById('productPrice'), 'Item price'),
                img: img || 'https://placehold.co/600x400/e7f5fa/0077b6?text=Poolcare+Product'
            });
            form.reset();
        }, 'Store item added.');
    }

    async function handleEstimator(event) {
        event.preventDefault();
        await runAction(async () => {
            const current = await PoolcareAPI.getEstimatorConfig();
            const updates = {
                buildRates: current.buildRates.map((rate, index) => ({
                    label: document.getElementById(`buildRateLabel${index}`).value.trim(),
                    value: requiredNumber(document.getElementById(`buildRateValue${index}`), 'Construction rate')
                })),
                tilingAddonPerSqm: requiredNumber(document.getElementById('tilingAddon'), 'Tiling add-on'),
                filtrationAddonPerSqm: requiredNumber(document.getElementById('filtrationAddon'), 'Filtration add-on'),
                chlorinePricePerKg: requiredNumber(document.getElementById('chlorinePrice'), 'Chlorine price'),
                phReducerPricePerKg: requiredNumber(document.getElementById('phReducerPrice'), 'pH reducer price'),
                algaecidePricePerLiter: requiredNumber(document.getElementById('algaecidePrice'), 'Algaecide price')
            };
            await PoolcareAPI.updateEstimatorConfig(updates);
        }, 'Estimator values saved.');
    }

    async function handlePlan(event) {
        event.preventDefault();
        const form = event.target;
        await runAction(async () => {
            const fields = new FormData(form);
            const services = fields.get('services').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
            if (!services.length) throw new Error('Add at least one included service.');
            await PoolcareAPI.updateMaintenancePlan(form.dataset.planId, {
                name: fields.get('name').trim(),
                price: requiredNumber(form.elements.price, 'Monthly price'),
                frequency: fields.get('frequency').trim(),
                services
            });
        }, 'Maintenance plan updated.');
    }

    async function handleItemAction(button) {
        const id = button.dataset.id;
        const action = button.dataset.action;
        const actions = {
            'delete-project': () => PoolcareAPI.deleteProject(id),
            'delete-service': () => PoolcareAPI.deleteService(id),
            'approve-review': () => PoolcareAPI.approveReview(id),
            'delete-review': () => PoolcareAPI.deleteReview(id),
            'delete-product': () => PoolcareAPI.deleteProduct(id)
        };
        if (!actions[action]) return;
        if (action.startsWith('delete') && !window.confirm('Delete this item? This cannot be undone.')) return;
        const messages = {
            'delete-project': 'Project deleted.',
            'delete-service': 'Service deleted.',
            'approve-review': 'Review approved and published.',
            'delete-review': 'Review deleted.',
            'delete-product': 'Store item deleted.'
        };
        await runAction(actions[action], messages[action]);
    }

    async function initialize() {
        const loginForm = document.getElementById('adminLoginForm');

        document.querySelectorAll('.admin-tab').forEach(button => {
            button.addEventListener('click', () => setActiveTab(button.dataset.tab));
        });
        loginForm.addEventListener('submit', async event => {
            event.preventDefault();
            showAuthMessage('');
            try {
                const result = await PoolcareAPI.loginAdmin(document.getElementById('adminPassword').value);
                document.getElementById('adminPassword').value = '';
                await openDashboard(result.mode);
            } catch (error) {
                console.error('Admin sign-in failed.', error);
                if (Number.isFinite(error.retryAfterSeconds) && error.retryAfterSeconds > 0) {
                    lockLoginFor(error.retryAfterSeconds);
                } else {
                    showAuthMessage(error.message || 'Sign-in failed.');
                }
            }
        });
        document.getElementById('brandingForm').addEventListener('submit', handleBranding);
        document.getElementById('projectForm').addEventListener('submit', handleProject);
        document.getElementById('serviceForm').addEventListener('submit', handleService);
        document.getElementById('reviewForm').addEventListener('submit', handleReview);
        document.getElementById('productForm').addEventListener('submit', handleProduct);
        document.getElementById('estimatorForm').addEventListener('submit', handleEstimator);
        document.getElementById('planForms').addEventListener('submit', event => {
            if (event.target.matches('.plan-form')) handlePlan(event);
        });
        document.getElementById('logoutButton').addEventListener('click', async () => {
            try {
                await PoolcareAPI.logoutAdmin();
                displayLogin();
                showAuthMessage('You have been logged out.');
            } catch (error) {
                console.error('Admin logout failed.', error);
                displayLogin();
                showAuthMessage(error.message || 'You have been logged out locally, but the server did not confirm the logout.');
            }
        });
        document.addEventListener('click', event => {
            const button = event.target.closest('[data-action][data-id]');
            if (button) handleItemAction(button);
        });
        document.getElementById('brandName').addEventListener('input', updateBrandPreview);
        document.getElementById('brandSubtitle').addEventListener('input', updateBrandPreview);
        document.getElementById('logoUrl').addEventListener('input', event => {
            document.getElementById('logoPreview').src = safeMediaUrl(event.target.value) || '../PICTURES/p-assets/flogo.png';
        });
        document.getElementById('logoFile').addEventListener('change', event => {
            const file = event.target.files[0];
            if (!file) return;
            document.getElementById('logoPreview').src = URL.createObjectURL(file);
        });

        if (await PoolcareAPI.hasAdminSession()) await openDashboard('server');
    }

    async function openDashboard(mode) {
        updateModeBadge(mode || 'server');
        displayDashboard();
        try {
            await PoolcareAPI.initialize(window.PoolcareData);
            await reloadData();
            setActiveTab(activeTab);
        } catch (error) {
            console.error('Admin content could not be loaded.', error);
            showNotice(error.message || 'Dashboard content could not be loaded.', 'error');
        }
    }

    initialize().catch(error => {
        console.error('Admin portal initialization failed.', error);
        showAuthMessage(error.message || 'The admin portal could not be initialized.');
    });
})();

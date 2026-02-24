/* ========================================
   SENTIPULSE REVIEW FORM - DYNAMIC JS
   Handles accordion-style multiple reviews
   with local "Save/Update" functionality
   ======================================== */

// ── Config apply (cosmetic only — no review logic) ─────────
(function applyConfig() {
    function hexToRgb(hex) {
        const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return r
            ? parseInt(r[1], 16) + ', ' + parseInt(r[2], 16) + ', ' + parseInt(r[3], 16)
            : '78, 186, 186';
    }
    if (typeof SENTIPULSE_CONFIG === 'undefined') return;
    const cfg = SENTIPULSE_CONFIG;
    const root = document.documentElement;
    root.style.setProperty('--primary', cfg.primaryColor);
    root.style.setProperty('--primary-rgb', hexToRgb(cfg.primaryColor));
    const logo = document.querySelector('.logo');
    if (logo) { logo.src = cfg.logo; logo.alt = cfg.restaurantName; }
    const nameEl = document.querySelector('.page-restaurant-name');
    if (nameEl) nameEl.textContent = cfg.restaurantName;
    const subEl = document.querySelector('.page-subtext');
    if (subEl) subEl.textContent = cfg.formSubtext;
    document.title = cfg.restaurantName + ' | SentiPulse';
})();
// ── End config apply ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    const reviewsWrapper = document.getElementById('reviewsWrapper');
    const addMoreBtn = document.getElementById('addMoreBtn');
    const submitAllBtn = document.getElementById('submitAllBtn');
    const successModal = document.getElementById('successModal');
    const closeSuccessBtn = document.getElementById('closeSuccess');
    const errorModal = document.getElementById('errorModal');
    const errorModalMessage = document.getElementById('errorModalMessage');
    const closeErrorBtn = document.getElementById('closeError');

    const deleteModal = document.getElementById('deleteModal');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');

    const confirmUploadModal = document.getElementById('confirmUploadModal');
    const confirmUploadBtn = document.getElementById('confirmUpload');
    const cancelUploadBtn = document.getElementById('cancelUpload');

    const confirmExportModal = document.getElementById('confirmExportModal');
    const skipExportBtn = document.getElementById('skipExport');
    const proceedWithExportBtn = document.getElementById('proceedWithExport');

    let reviewCount = 0;
    let cardToDelete = null;
    let dataToSubmit = null; // Temporary storage for validated reviews

    // Modals already have internal close/next logic
    // We remove the old closeSuccessBtn listener here to use the new one below

    closeErrorBtn.addEventListener('click', () => {
        errorModal.classList.remove('show');
    });

    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.classList.remove('show');
        cardToDelete = null;
    });

    confirmDeleteBtn.addEventListener('click', () => {
        if (cardToDelete) {
            cardToDelete.remove();
            reindexCards();
            deleteModal.classList.remove('show');
            cardToDelete = null;
        }
    });

    // Close modal on background click (Disabled for confirmation and success modals)
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            deleteModal.classList.remove('show');
            cardToDelete = null;
        }
    });

    // Upload Confirmation Events
    cancelUploadBtn.addEventListener('click', () => {
        confirmUploadModal.classList.remove('show');
        dataToSubmit = null;
    });

    confirmUploadBtn.addEventListener('click', () => {
        if (dataToSubmit) {
            confirmUploadModal.classList.remove('show');
            performActualUpload(dataToSubmit);
        }
    });

    confirmUploadModal.addEventListener('click', (e) => {
        // Background click logic removed as requested
    });

    // Export Choice Events
    skipExportBtn.addEventListener('click', () => {
        confirmExportModal.classList.remove('show');
        const finalStatus = document.getElementById('finalStatus');
        if (finalStatus) finalStatus.innerText = "Reviews uploaded successfully.";
        successModal.classList.add('show');
    });

    proceedWithExportBtn.addEventListener('click', async () => {
        if (dataToSubmit) {
            await triggerCurrentExport(dataToSubmit);
            confirmExportModal.classList.remove('show');
            const finalStatus = document.getElementById('finalStatus');
            if (finalStatus) finalStatus.innerText = "Reviews uploaded and exported.";
            successModal.classList.add('show');
        }
    });

    confirmExportModal.addEventListener('click', (e) => {
        // Background click logic removed as requested
    });

    // Close Success Logic - Finalizes session and exits
    closeSuccessBtn.addEventListener('click', () => {
        // 1. Wipe the screen content immediately so back navigation shows nothing
        document.body.innerHTML = '<div style="background:#000; height:100vh; width:100vw;"></div>';

        // 2. Attempt to close the tab directly
        window.open('', '_self', '');
        window.close();

        // 3. Final fallback: Redirect to a blank page if closure is blocked
        setTimeout(() => {
            window.location.replace("about:blank");
        }, 100);
    });

    // Initial review card - don't scroll on load
    addReview(false);

    // Event Listeners
    addMoreBtn.addEventListener('click', addReview);
    submitAllBtn.addEventListener('click', submitAll);

    // Event Listeners
    addMoreBtn.addEventListener('click', addReview);
    submitAllBtn.addEventListener('click', submitAll);

    /**
     * Creates and adds a new review card to the wrapper
     */
    function addReview(shouldScroll = true) {
        // Check if there's an unsaved card
        const unsavedCard = document.querySelector('.review-card:not(.locked)');
        if (unsavedCard && shouldScroll) {
            unsavedCard.classList.remove('collapsed');
            unsavedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            unsavedCard.classList.add('shake');
            setTimeout(() => unsavedCard.classList.remove('shake'), 500);
            console.warn("⚠️ Please save the current review before adding a new one.");
            return;
        }

        reviewCount++;

        // Collapse all existing cards
        document.querySelectorAll('.review-card').forEach(card => {
            card.classList.add('collapsed');
        });

        const cardId = `review-${Date.now()}`;
        const card = document.createElement('div');
        card.className = 'review-card';
        card.id = cardId;
        card.innerHTML = `
            <div class="card-header">
                <div class="header-left">
                    <span class="status-indicator"></span>
                    <span class="review-label">REVIEW #${reviewCount}</span>
                </div>
                <div class="review-date-container">
                    <div class="date-display">
                        <span class="date-text"></span>
                        <span class="calendar-icon"></span>
                    </div>
                    <input type="date" class="date-input">
                </div>
                <div class="review-time-container">
                    <div class="time-display">
                        <span class="time-text">00:00</span>
                        <span class="clock-icon"></span>
                    </div>
                    <input type="time" class="time-input" value="00:00">
                </div>
                <div class="header-right">
                    <button type="button" class="btn-delete" title="Delete Review"></button>
                    <span class="toggle-icon">▼</span>
                </div>
            </div>
            <div class="card-body">
                <div class="card-columns">
                    <div class="column-left">
                        <!-- Basic Info -->
                        <div class="form-row">
                            <label>Reviewer Name</label>
                            <input type="text" class="reviewer-name" placeholder="Enter name">
                            <span class="field-error">Name is required</span>
                        </div>
                        <div class="form-row">
                            <label>Phone Number</label>
                            <input type="text" class="phone-input" placeholder="03001234567" inputmode="numeric" oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                            <span class="field-error">Format: 10-15 digits (numeric)</span>
                        </div>
                        <div class="form-row">
                            <label>Email ID</label>
                            <input type="email" class="email-input" placeholder="example@mail.com">
                            <span class="field-error">Invalid Email</span>
                        </div>
                        <div class="form-row">
                            <label>Input Category</label>
                            <div class="category-toggle">
                                <div class="toggle-option" data-value="Manual">Manual</div>
                                <div class="toggle-option" data-value="UAN">UAN</div>
                                <input type="hidden" class="source-input" value="">
                            </div>
                            <span class="field-error">Select Category</span>
                        </div>

                        <div class="section-divider">Overall Experience</div>
                        <div class="emoji-row">
                            <button type="button" class="emoji-btn" data-rating="1">😞</button>
                            <button type="button" class="emoji-btn" data-rating="2">😕</button>
                            <button type="button" class="emoji-btn" data-rating="3">😐</button>
                            <button type="button" class="emoji-btn" data-rating="4">😊</button>
                            <button type="button" class="emoji-btn" data-rating="5">😍</button>
                            <input type="hidden" class="overall-rating-input" value="">
                        </div>
                    </div>

                    <div class="column-right">
                        <div class="form-row">
                            <label>Review Text</label>
                            <textarea class="review-text" placeholder="Share your experience..."></textarea>
                            <span class="field-error">Need rating or comment</span>
                        </div>
                        <div class="section-divider">Detailed Ratings</div>
                        ${['Food', 'Drink', 'Service', 'Ambiance', 'Cleanliness', 'Price'].map(aspect => `
                            <div class="rating-row">
                                <label>${aspect}</label>
                                <div class="star-rating" data-aspect="${aspect.toLowerCase()}">
                                    <span class="star" data-value="1">★</span>
                                    <span class="star" data-value="2">★</span>
                                    <span class="star" data-value="3">★</span>
                                    <span class="star" data-value="4">★</span>
                                    <span class="star" data-value="5">★</span>
                                </div>
                                <input type="hidden" class="aspect-rating-input" data-aspect="${aspect.toLowerCase()}" value="0">
                            </div>
                        `).join('')}

                    </div>
                </div>

                <div class="card-actions">
                    <button type="button" class="btn-action btn-save">Save Review</button>
                </div>
            </div>
        `;

        reviewsWrapper.appendChild(card);
        initializeCardEvents(card);

        // Scroll to the new card
        if (shouldScroll) {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Initializes events for a single card (toggle, emoji, stars, update)
     */
    function initializeCardEvents(card) {
        const header = card.querySelector('.card-header');
        const emojiBtns = card.querySelectorAll('.emoji-btn');
        const starRatings = card.querySelectorAll('.star-rating');
        const btnAction = card.querySelector('.btn-action');
        const dateInput = card.querySelector('.date-input');
        const dateText = card.querySelector('.date-text');
        const toggleOptions = card.querySelectorAll('.toggle-option');
        const sourceInput = card.querySelector('.source-input');

        // Toggle (Manual/UAN) Logic
        toggleOptions.forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const isActive = opt.classList.contains('active');
                toggleOptions.forEach(o => o.classList.remove('active'));

                if (isActive) {
                    sourceInput.value = "";
                } else {
                    opt.classList.add('active');
                    sourceInput.value = opt.dataset.value;
                    // Clear error immediately on selection
                    opt.closest('.form-row').classList.remove('error');
                }
                updateCardStatus(card);
            });
        });

        // Initialize Date
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;
        const displayDate = `${dd}/${mm}/${yyyy.toString().slice(-2)}`;

        dateInput.value = formattedDate;
        dateText.innerText = displayDate;

        // Date Change Logic
        dateInput.addEventListener('change', (e) => {
            const date = new Date(e.target.value);
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const y = date.getFullYear().toString().slice(-2);
            dateText.innerText = `${d}/${m}/${y}`;
        });

        // Prevent header toggle when clicking date picker
        card.querySelector('.review-date-container').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        const timeInput = card.querySelector('.time-input');
        const timeText = card.querySelector('.time-text');

        // Time Change Logic
        timeInput.addEventListener('change', (e) => {
            timeText.innerText = e.target.value;
        });

        // Prevent header toggle when clicking time picker
        card.querySelector('.review-time-container').addEventListener('click', (e) => {
            e.stopPropagation();
        });


        // Toggle Expand/Collapse
        header.addEventListener('click', () => {
            const isCollapsed = card.classList.contains('collapsed');
            const isLocked = card.classList.contains('locked');

            if (isCollapsed) {
                // Check if another card is unsaved before allowing expansion
                const unsavedCard = document.querySelector('.review-card:not(.locked)');
                if (unsavedCard && unsavedCard !== card) {
                    unsavedCard.classList.remove('collapsed');
                    unsavedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    unsavedCard.classList.add('shake');
                    setTimeout(() => unsavedCard.classList.remove('shake'), 500);
                    return;
                }

                document.querySelectorAll('.review-card').forEach(c => c.classList.add('collapsed'));
                card.classList.remove('collapsed');
            } else {
                // Prevent collapse if the card is not saved (locked)
                if (!isLocked) {
                    card.classList.add('shake');
                    setTimeout(() => card.classList.remove('shake'), 500);
                    console.warn("⚠️ Please save this review before minimizing.");
                    return;
                }
                card.classList.add('collapsed');
            }
        });

        // Emoji Logic
        emojiBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (card.classList.contains('locked')) return;
                e.stopPropagation();
                const isSelected = btn.classList.contains('selected');
                emojiBtns.forEach(b => b.classList.remove('selected'));

                if (isSelected) {
                    card.querySelector('.overall-rating-input').value = "";
                } else {
                    btn.classList.add('selected');
                    card.querySelector('.overall-rating-input').value = btn.dataset.rating;
                    // Clear error immediately on selection
                    btn.closest('.column-left').querySelector('.emoji-row').parentElement.classList.remove('error');
                }
                updateCardStatus(card);
            });
        });

        // Star Logic
        starRatings.forEach(container => {
            const stars = container.querySelectorAll('.star');
            const aspect = container.dataset.aspect;
            const input = card.querySelector(`.aspect-rating-input[data-aspect="${aspect}"]`);

            stars.forEach(star => {
                star.addEventListener('click', (e) => {
                    if (card.classList.contains('locked')) return;
                    e.stopPropagation();
                    const val = star.dataset.value;
                    input.value = val;
                    updateStars(stars, val);
                    updateCardStatus(card);
                });
                star.addEventListener('mouseenter', () => {
                    if (!card.classList.contains('locked')) {
                        updateStars(stars, star.dataset.value);
                    }
                });
            });
            container.addEventListener('mouseleave', () => {
                if (!card.classList.contains('locked')) {
                    updateStars(stars, input.value);
                }
            });

            // Clear error when a star is clicked
            stars.forEach(star => {
                star.addEventListener('click', () => {
                    container.closest('.rating-row')?.classList.remove('error');
                    updateCardStatus(card);
                });
            });
        });

        // Function to toggle lock state
        function setCardLocked(locked) {
            if (locked) {
                card.classList.add('locked');
                btnAction.innerText = "Update Review";
                btnAction.classList.remove('btn-save');
                btnAction.classList.add('btn-edit');
                // Grey out/disable all inputs
                card.querySelectorAll('input, textarea').forEach(el => {
                    if (el.type !== 'hidden') el.disabled = true;
                });
                card.querySelectorAll('.emoji-btn, .star, .toggle-option').forEach(el => el.style.pointerEvents = 'none');
            } else {
                card.classList.remove('locked');
                btnAction.innerText = "Save Review";
                btnAction.classList.remove('btn-edit');
                btnAction.classList.add('btn-save');
                // Enable all inputs
                card.querySelectorAll('input, textarea').forEach(el => el.disabled = false);
                card.querySelectorAll('.emoji-btn, .star, .toggle-option').forEach(el => el.style.pointerEvents = 'all');

                // Keep hidden inputs working
                card.querySelectorAll('input[type="hidden"]').forEach(el => el.disabled = false);
            }
        }

        // Single Toggling Button Logic
        btnAction.addEventListener('click', (e) => {
            e.stopPropagation();
            if (card.classList.contains('locked')) {
                // UNLOCK logic
                setCardLocked(false);
                card.classList.remove('completed', 'collapsed');
                console.log("🔄 Card unlocked for editing.");
            } else {
                // SAVE logic
                if (validateSingleCard(card)) {
                    setCardLocked(true);
                    card.classList.add('completed');
                    card.classList.add('collapsed');

                    // Update header label with reviewer name
                    const label = card.querySelector('.review-label');
                    const name = card.querySelector('.reviewer-name').value.trim();
                    const reviewNum = label.innerText.split('(')[0].trim();
                    label.innerText = `${reviewNum} (${name})`;

                    console.log(`✅ Saved reviewer: ${name}`);
                }
            }
        });

        // Phone input: Numbers only, no masking (auto-filtered by HTML oninput)
        const phoneInput = card.querySelector('.phone-input');
        phoneInput.addEventListener('input', () => {
            updateCardStatus(card);
        });

        // Email validation
        const emailInput = card.querySelector('.email-input');
        emailInput.addEventListener('input', () => {
            const email = emailInput.value.trim();
            if (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                emailInput.style.borderColor = "#ff4d4d";
            } else {
                emailInput.style.borderColor = "";
            }
            updateCardStatus(card);
        });

        // Name input also triggers status check
        // Real-time error removal as user corrects values
        card.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', () => {
                if (input.value.trim().length > 0 || (input.type === 'hidden' && input.value !== "0" && input.value !== "")) {
                    input.closest('.form-row')?.classList.remove('error');
                    input.closest('.rating-row')?.classList.remove('error');

                    // Specific check for the "Rating OR Text" rule
                    if (input.classList.contains('overall-rating-input') || input.classList.contains('review-text')) {
                        const overall = card.querySelector('.overall-rating-input').value;
                        const text = card.querySelector('.review-text').value.trim();
                        if (overall !== "" || text.length > 0) {
                            card.querySelector('.emoji-row').parentElement.classList.remove('error');
                            card.querySelector('.review-text').closest('.form-row').classList.remove('error');
                        }
                    }
                }
                updateCardStatus(card);
            });
        });

        // Delete Logic
        card.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            cardToDelete = card;
            deleteModal.classList.add('show');
        });
    }

    function reindexCards() {
        const cards = document.querySelectorAll('.review-card');
        reviewCount = 0;
        cards.forEach((card, index) => {
            reviewCount++;
            const label = card.querySelector('.review-label');
            const currentLabelText = label.innerText;
            const nameMatch = currentLabelText.match(/\(.*\)/);
            label.innerText = `REVIEW #${reviewCount} ${nameMatch ? nameMatch[0] : ''}`;
        });
    }

    function updateStars(stars, val) {
        stars.forEach(s => {
            s.classList.toggle('selected', parseInt(s.dataset.value) <= parseInt(val || 0));
        });
    }

    function updateCardStatus(card) {
        const name = card.querySelector('.reviewer-name').value.trim();
        const overall = card.querySelector('.overall-rating-input').value;
        const text = card.querySelector('.review-text').value.trim();
        const source = card.querySelector('.source-input').value;

        const hasName = (name.length >= 1);
        const hasRating = (overall && overall !== "0");
        const hasText = (text.length >= 1);
        const hasSource = (source !== "");

        const emailValid = text.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(card.querySelector('.email-input').value.trim()); // Wait, simplified check
        const phone = card.querySelector('.phone-input').value.trim();
        const email = card.querySelector('.email-input').value.trim();

        const isPhoneValid = phone === "" || /^\d{10,15}$/.test(phone);
        const isEmailValid = email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (hasName && (hasRating || hasText)) {
            card.classList.add('ready');
        } else {
            card.classList.remove('ready');
            card.classList.remove('completed');
        }
    }

    function clearErrors(card) {
        card.classList.remove('has-error', 'shake');
        card.querySelectorAll('.form-row').forEach(row => row.classList.remove('error'));
    }

    function validateSingleCard(card) {
        clearErrors(card);
        let isValid = true;

        const nameInput = card.querySelector('.reviewer-name');
        const overallInput = card.querySelector('.overall-rating-input');
        const textInput = card.querySelector('.review-text');
        const sourceInput = card.querySelector('.source-input');
        const phoneInput = card.querySelector('.phone-input');
        const emailInput = card.querySelector('.email-input');

        // 1. Name is always required
        if (nameInput.value.trim().length < 1) {
            nameInput.closest('.form-row').classList.add('error');
            isValid = false;
        }

        // 2. Either Rating OR Text must be present
        const hasRating = (overallInput.value && overallInput.value !== "0");
        const hasText = (textInput.value.trim().length >= 1);
        if (!hasRating && !hasText) {
            textInput.closest('.form-row').classList.add('error');
            isValid = false;
        }

        // 3. Phone Number (Optional but must be valid if entered)
        const phone = phoneInput.value.trim();
        // Updated regex to allow 10-15 digits only to match user request and be flexible
        if (phone.length > 0 && !/^\d{10,15}$/.test(phone)) {
            phoneInput.closest('.form-row').classList.add('error');
            isValid = false;
        }

        // 4. Email (Optional but must be valid if entered)
        const email = emailInput.value.trim();
        if (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            emailInput.closest('.form-row').classList.add('error');
            isValid = false;
        }

        // 5. Category (Source) is mandatory
        if (!sourceInput.value) {
            sourceInput.closest('.form-row').classList.add('error');
            isValid = false;
        }

        if (!isValid) {
            card.classList.add('has-error', 'shake');
            setTimeout(() => card.classList.remove('shake'), 500);
        }

        return isValid;
    }

    /**
     * Submits all collected reviews
     */
    async function submitAll() {
        const cards = document.querySelectorAll('.review-card');
        const allData = [];
        let firstInvalidCard = null;

        cards.forEach((card) => {
            if (validateSingleCard(card)) {
                const getRating = (aspect) => {
                    const val = parseInt(card.querySelector(`.aspect-rating-input[data-aspect="${aspect}"]`).value);
                    return val > 0 ? val : null;
                };

                const phoneVal = card.querySelector('.phone-input').value.trim();
                const emailVal = card.querySelector('.email-input').value.trim();

                const dateVal = card.querySelector('.date-input').value;
                const timeVal = card.querySelector('.time-input').value;

                const reviewData = {
                    User: card.querySelector('.reviewer-name').value,
                    INHOUSE_Reviewer_Contact: phoneVal || null,
                    INHOUSE_Reviewer_EmailID: emailVal || null,
                    Rating: parseInt(card.querySelector('.overall-rating-input').value) || null,
                    Date: new Date(`${dateVal}T${timeVal}`).toISOString(),
                    Text: card.querySelector('.review-text').value,
                    Source: card.querySelector('.source-input').value, // Manual or UAN toggle value

                    // Detailed Ratings
                    INHOUSE_Rating_Food: getRating('food'),
                    INHOUSE_Rating_Drinks: getRating('drink'),
                    INHOUSE_Rating_Service: getRating('service'),
                    INHOUSE_Rating_Cleanliness: getRating('cleanliness'),
                    INHOUSE_Rating_Ambiance: getRating('ambiance'),
                    INHOUSE_Rating_Price: getRating('price'),
                    INHOUSE_Rating_Others: null
                };

                allData.push(reviewData);
            } else if (!firstInvalidCard) {
                firstInvalidCard = card;
            }
        });

        if (firstInvalidCard) {
            document.querySelectorAll('.review-card').forEach(c => c.classList.add('collapsed'));
            firstInvalidCard.classList.remove('collapsed');
            firstInvalidCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (allData.length === 0) return;

        // Instead of submitting, show confirmation modal
        dataToSubmit = allData;
        confirmUploadModal.classList.add('show');
    }

    /**
     * The actual API call after user confirms
     */
    async function performActualUpload(allData) {
        console.log('🚀 Finalizing Sync with Database...', allData);

        // UI Feedback
        submitAllBtn.disabled = true;
        const originalText = submitAllBtn.innerText;
        submitAllBtn.innerText = '📡 Syncing with Database...';

        try {
            const response = await fetch('/api/submit-reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(allData)
            });

            if (!response.ok) {
                const err = await response.json();
                let friendlyMsg = "⚠️ Problem saving reviews:\n";

                if (err.detail && Array.isArray(err.detail)) {
                    // Try to map Pydantic errors to something friendly
                    err.detail.forEach(e => {
                        const field = e.loc[e.loc.length - 1];
                        const index = e.loc[1]; // reviews[X]
                        friendlyMsg += `• Review #${index + 1}: ${field} is invalid or missing.\n`;
                    });
                } else {
                    friendlyMsg += (err.detail || 'Connection Error');
                }

                throw new Error(friendlyMsg);
            }

            const result = await response.json();
            console.log('✅ API Response:', result);

            // Instead of immediate success, show the export choice
            submitAllBtn.disabled = false;
            submitAllBtn.innerText = originalText;
            confirmExportModal.classList.add('show');

        } catch (error) {
            console.error('❌ Submission Error:', error);
            errorModalMessage.innerText = error.message;
            errorModal.classList.add('show');
            submitAllBtn.disabled = false;
            submitAllBtn.innerText = originalText;
        }
    }

    /**
     * Triggers the Excel export for CURRENT reviews only
     */
    async function triggerCurrentExport(allData) {
        try {
            const response = await fetch('/api/export-current', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(allData)
            });

            if (!response.ok) throw new Error("Export failed");

            // Handle file download from Blob
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Current_Reviews_Export_${new Date().getTime()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("❌ Export Error:", err);
            alert("Could not generate Excel file, but reviews were saved to database.");
        }
    }
});

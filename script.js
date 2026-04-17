class PhotoBoothPremium {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.filterOverlay = document.getElementById('filterOverlay');
        this.captureBtn = document.getElementById('captureBtn');
        this.photoGrid = document.getElementById('photoGrid');
        this.collageCanvas = document.getElementById('collageCanvas');
        
        // Premium State
        this.stripe = null;
        this.isPremium = false;
        this.remainingCredits = parseInt(localStorage.getItem('trialCredits')) || 3;
        this.premiumExpiry = localStorage.getItem('premiumExpiry');
        this.photos = JSON.parse(localStorage.getItem('premiumPhotos')) || [];
        this.currentFilter = 'vintage';
        this.collageSlots = {};
        this.stream = null;
        
        this.init();
    }

    init() {
        this.checkPremiumStatus();
        this.setupEventListeners();
        this.loadStripe();
        this.renderPhotos();
        this.showAppropriateSection();
    }

    checkPremiumStatus() {
        const now = Date.now();
        if (this.premiumExpiry && now < parseInt(this.premiumExpiry)) {
            this.isPremium = true;
            this.remainingCredits = Infinity;
        } else {
            this.isPremium = false;
            localStorage.removeItem('premiumExpiry');
        }
        this.updateUI();
    }

    setupEventListeners() {
        // Payment
        document.getElementById('buyPremiumBtn')?.addEventListener('click', () => this.handlePayment());
        document.getElementById('useTrialBtn')?.addEventListener('click', () => this.startTrial());
        document.getElementById('continueBtn')?.addEventListener('click', () => this.closeModal());

        // Camera
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.applyFilter(e.target.dataset.filter));
        });

        document.getElementById('captureBtn').addEventListener('click', () => this.capturePhoto());
        
        // Navigation
        document.getElementById('backToPaymentBtn')?.addEventListener('click', () => this.showPayment());
    }

    async loadStripe() {
        if (window.Stripe) {
            this.stripe = Stripe('pk_test_51Pxxx...'); // Ganti dengan Stripe key kamu
        }
    }

    updateUI() {
        const statusEl = document.getElementById('premiumStatus');
        const creditEl = document.getElementById('remainingCredits');
        const creditDisplay = document.getElementById('creditDisplay');
        const captureText = document.getElementById('captureText');
        const userStatus = document.getElementById('userStatus');

        if (creditEl) creditEl.textContent = this.remainingCredits === Infinity ? '∞' : this.remainingCredits;
        
        if (statusEl) {
            statusEl.className = `status-indicator ${this.isPremium ? 'premium' : 'free'}`;
            statusEl.innerHTML = this.isPremium ? 
                '<i class="fas fa-crown"></i><span>PREMIUM AKTIF</span>' : 
                '<i class="fas fa-lock"></i><span>TRIAL MODE</span>';
        }

        if (captureText) {
            captureText.textContent = this.isPremium ? 'Ambil Foto Premium' : 'Ambil Foto Trial';
        }

        if (userStatus) {
            userStatus.className = `user-status ${this.isPremium ? 'status-premium' : 'status-free'}`;
            userStatus.innerHTML = this.isPremium ? 
                '<div class="status-premium"><i class="fas fa-crown"></i> PREMIUM AKTIF - Unlimited Foto!</div>' :
                `<div class="status-free"><i class="fas fa-lock"></i> Sisa: <strong>${this.remainingCredits}</strong> foto trial | <a href="#" onclick="premiumApp.showPayment()">Upgrade Premium</a></div>`;
        }

        if (creditDisplay) {
            creditDisplay.style.display = this.remainingCredits !== Infinity ? 'block' : 'none';
        }
    }

    showPayment() {
        document.getElementById('paymentSection').classList.add('active');
        document.getElementById('cameraSection').classList.remove('active');
    }

    startTrial() {
        this.remainingCredits = 3;
        localStorage.setItem('trialCredits', '3');
        this.showCamera();
    }

    showCamera() {
        document.getElementById('paymentSection').classList.remove('active');
        document.getElementById('cameraSection').classList.add('active');
        this.startCamera();
    }

    showAppropriateSection() {
        if (this.isPremium || this.remainingCredits > 0) {
            this.showCamera();
        }
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            this.video.srcObject = this.stream;
        } catch (err) {
            alert('Kamera tidak bisa diakses. Izinkan akses kamera!');
        }
    }

    applyFilter(filterName) {
        this.currentFilter = filterName;
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        const filters = {
            vintage: 'sepia(0.3) contrast(1.2) brightness(0.9)',
            party: 'hue-rotate(300deg) saturate(2) brightness(1.2)',
            glow: 'brightness(1.3) contrast(1.1) drop-shadow(0 0 10px #ff6b6b)',
            neon: 'contrast(2) saturate(3) hue-rotate(120deg)',
            retro: 'sepia(0.4) hue-rotate(-20deg) contrast(1.3)',
            dreamy: 'blur(1px) brightness(1.1) contrast(0.9)',
            cyber: 'hue-rotate(200deg) contrast(1.5) saturate(1.8)',
            polaroid: 'sepia(0.2) contrast(1.1) brightness(1.05)'
        };

        this.filterOverlay.style.filter = filters[filterName] || '';
    }

    async capturePhoto() {
        if (!this.isPremium && this.remainingCredits <= 0) {
            alert('Trial habis! Upgrade Premium untuk foto unlimited!');
            this.showPayment();
            return;
        }

        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        const ctx = this.canvas.getContext('2d');
        
        ctx.drawImage(this.video, 0, 0);
        
        // Apply filter to canvas
        const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.applyFilterToImageData(imageData.data, this.currentFilter);
        ctx.putImageData(imageData, 0, 0);

        const photoDataUrl = this.canvas.toDataURL('image/jpeg', 0.95);
        this.addPhoto(photoDataUrl);
        
        if (!this.isPremium) {
            this.remainingCredits--;
            localStorage.setItem('trialCredits', this.remainingCredits.toString());
        }

        this.updateUI();
    }

    applyFilterToImageData(data, filter) {
        // Simplified filter application (lebih advanced bisa ditambah)
        const filters = {
            vintage: [1.2, 0.9, 0.8, 1],
            party: [1.5, 1.8, 2.0, 1.2],
            // ... bisa ditambah sesuai kebutuhan
        };
        
        const factor = filters[filter]?.[0] || 1;
        for (let i = 0; i < data.length; i += 4) {
            data[i] *= factor;     // R
            data[i+1] *= factor;   // G  
            data[i+2] *= factor;   // B
        }
    }

    addPhoto(dataUrl) {
        const photo = {
            id: Date.now(),
            dataUrl,
            filter: this.currentFilter,
            timestamp: new Date().toLocaleString('id-ID')
        };
        this.photos.unshift(photo);
        localStorage.setItem('premiumPhotos', JSON.stringify(this.photos.slice(0, 50))); // Max 50 photos
        this.renderPhotos();
    }

    renderPhotos() {
        this.photoGrid.innerHTML = '';
        this.photos.forEach(photo => {
            const div = document.createElement('div');
            div.className = 'photo-item';
            div.innerHTML = `
                <img src="${photo.dataUrl}" alt="Photo">
                <div class="photo-overlay">
                    <span>${photo.filter.toUpperCase()}</span>
                    <span>${photo.timestamp}</span>
                </div>
            `;
            div.onclick = () => this.startCollage([photo]);
            this.photoGrid.appendChild(div);
        });
    }

    // COLLAGE FUNCTION (Sama seperti versi gratis - layout 3 foto keren)
    startCollage(photos) {
        // Implementasi kolase 3 foto dengan layout menarik untuk remaja
        // Layout: 2 foto atas + 1 foto besar tengah bawah
        const ctx = this.collageCanvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, 800, 600);
        
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 600);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#4ecdc4');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 600);
        
        // Draw 3 photos in cool layout
        if (photos[0]) {
            const img1 = new Image();
            img1.src = photos[0].dataUrl;
            img1.onload = () => {
                ctx.drawImage(img1, 50, 50, 300, 380);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 8;
                ctx.strokeRect(50, 50, 300, 380);
            };
        }
        
        if (photos[1]) {
            const img2 = new Image();
            img2.src = photos[1].dataUrl;
            img2.onload = () => {
                ctx.drawImage(img2, 450, 50, 300, 380);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 8;
                ctx.strokeRect(450, 50, 300, 380);
            };
        }
        
        if (photos[2]) {
            const img3 = new Image();
            img3.src = photos[2].dataUrl;
            img3.onload = () => {
                ctx.drawImage(img3, 250, 280, 300, 300);
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 12;
                ctx.strokeRect(250, 280, 300, 300);
            };
        }
        
        // Add text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText('PHOTOBOOTH', 400, 550);
        ctx.font = '24px Poppins';
        ctx.fillText('PREMIUM EDITION', 400, 580);
    }

    downloadCollage() {
        if (!this.isPremium) {
            alert('Premium only! Upgrade untuk download HD!');
            return;
        }
        const link = document.createElement('a');
        link.download = `photobooth-premium-${Date.now()}.png`;
        link.href = this.collageCanvas.toDataURL();
        link.click();
    }

    async handlePayment() {
        if (!this.stripe) {
            // Fallback: Simulasi pembayaran sukses untuk demo
            setTimeout(() => {
                this.activatePremium();
                this.showCamera();
            }, 2000);
            return;
        }

        // Real Stripe payment logic
        const { error, paymentMethod } = await this.stripe.createPaymentMethod('card', this.card);
        if (!error) {
            this.activatePremium();
        }
    }

    activatePremium() {
        this.isPremium = true;
        const expiry = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem('premiumExpiry', expiry);
        this.updateUI();
    }

    closeModal() {
        document.getElementById('successModal').classList.remove('active');
    }
}

// Initialize when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    window.premiumApp = new PhotoBoothPremium();
});

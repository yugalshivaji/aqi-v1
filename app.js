// Backend Service Integration
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbyaMQqfD8YH6dH9KvhFEGahXSFQRP8Xtm3yKuAlguxVvcibqM0FYtR_GVM0TL4iybeB/exec';

class BackendService {
    constructor() {
        this.baseUrl = BACKEND_URL;
    }

    async makeRequest(params) {
        try {
            const queryString = Object.keys(params)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join('&');
            
            const url = `${this.baseUrl}?${queryString}`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Backend request failed:', error);
            return this.getMockData(params.action, params);
        }
    }

    getMockData(action, params) {
        switch(action) {
            case 'login':
                if (params.username === 'demo' && params.password === 'demo123') {
                    return {
                        success: true,
                        userData: {
                            userID: 'USR001',
                            username: 'demo',
                            fullName: 'Demo User',
                            email: 'demo@example.com',
                            mobile: '9876543210',
                            points: 100,
                            badges: 'New User,Active Reporter'
                        }
                    };
                }
                return { success: false, error: 'Invalid credentials' };
            
            case 'register':
                return {
                    success: true,
                    userData: {
                        userID: 'USR' + Math.floor(1000 + Math.random() * 9000),
                        ...params
                    }
                };
            
            case 'getDashboard':
                return {
                    success: true,
                    data: this.getMockAQIData(),
                    weather: this.getMockWeatherData()
                };
            
            default:
                return { success: false, error: 'Action not supported in mock mode' };
        }
    }

    getMockAQIData() {
        return {
            aqi: Math.floor(150 + Math.random() * 200),
            pm25: Math.floor(80 + Math.random() * 100),
            pm10: Math.floor(120 + Math.random() * 150),
            o3: Math.floor(30 + Math.random() * 50),
            no2: Math.floor(20 + Math.random() * 40),
            so2: Math.floor(5 + Math.random() * 15),
            co: (1 + Math.random() * 2).toFixed(1),
            dominantPollutant: 'PM2.5',
            healthMessage: 'Air quality is unhealthy for sensitive groups. Reduce outdoor activities.',
            station: 'Delhi Central Station'
        };
    }

    getMockWeatherData() {
        return {
            temperature: Math.floor(25 + Math.random() * 10),
            humidity: Math.floor(40 + Math.random() * 30),
            windSpeed: (2 + Math.random() * 5).toFixed(1),
            visibility: (5 + Math.random() * 10).toFixed(1),
            description: 'Partly cloudy',
            pressure: 1013
        };
    }

    async register(userData) {
        return await this.makeRequest({
            action: 'register',
            data: JSON.stringify(userData)
        });
    }

    async login(username, password) {
        return await this.makeRequest({
            action: 'login',
            username: username,
            password: password
        });
    }

    async getAQIData() {
        return await this.makeRequest({
            action: 'getDashboard'
        });
    }

    async submitComplaint(complaintData) {
        return await this.makeRequest({
            action: 'submitComplaint',
            data: JSON.stringify(complaintData)
        });
    }

    async getMapData() {
        return await this.makeRequest({
            action: 'getMapData'
        });
    }

    async reportSpot(spotData) {
        return await this.makeRequest({
            action: 'reportSpot',
            data: JSON.stringify(spotData)
        });
    }
}

// Voice Assistant
class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        
        this.initializeVoiceRecognition();
    }
    
    initializeVoiceRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateListeningUI(true);
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                this.updateListeningUI(false);
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                this.processVoiceCommand(transcript);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
                this.updateListeningUI(false);
            };
        }
    }
    
    processVoiceCommand(transcript) {
        if (transcript.includes('aqi') || transcript.includes('air quality')) {
            this.speakAQI();
        } else if (transcript.includes('pollution') || transcript.includes('pollutant')) {
            this.speakPollutantInfo();
        } else if (transcript.includes('health') || transcript.includes('recommendation')) {
            this.speakHealthRecommendations();
        } else if (transcript.includes('report') || transcript.includes('complaint')) {
            this.guideToReporting();
        } else {
            this.speak("I can help with AQI, pollution levels, health recommendations, and reporting issues. Try asking about air quality.");
        }
    }
    
    async speakAQI() {
        try {
            const result = await backendService.getAQIData();
            if (result.success) {
                const aqi = result.data.aqi;
                const category = this.getAQICategory(aqi);
                const message = `Current Air Quality Index is ${aqi}, which is ${category}. ${result.data.healthMessage}`;
                this.speak(message);
            }
        } catch (error) {
            this.speak("Sorry, I couldn't fetch the current air quality data.");
        }
    }
    
    async speakPollutantInfo() {
        try {
            const result = await backendService.getAQIData();
            if (result.success) {
                const dominant = result.data.dominantPollutant;
                const message = `The dominant pollutant is ${dominant}. PM2.5 level is ${result.data.pm25} micrograms per cubic meter.`;
                this.speak(message);
            }
        } catch (error) {
            this.speak("Sorry, I couldn't fetch pollutant information.");
        }
    }
    
    async speakHealthRecommendations() {
        try {
            const result = await backendService.getAQIData();
            if (result.success) {
                const aqi = result.data.aqi;
                const recommendations = this.getHealthRecommendations(aqi);
                this.speak(recommendations);
            }
        } catch (error) {
            this.speak("Sorry, I couldn't fetch health recommendations.");
        }
    }
    
    guideToReporting() {
        this.speak("To report an environmental issue, go to the Report section and fill out the complaint form. You can report illegal construction, stubble burning, industrial pollution, vehicle emissions, or waste burning.");
    }
    
    speak(text) {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        this.synthesis.speak(utterance);
    }
    
    startListening() {
        if (this.recognition && !this.isListening) {
            this.recognition.start();
        } else if (!this.recognition) {
            alert('Speech recognition is not supported in your browser.');
        }
    }
    
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
    
    updateListeningUI(listening) {
        const button = document.getElementById('voiceCommandBtn');
        if (button) {
            if (listening) {
                button.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                button.style.background = 'var(--danger)';
            } else {
                button.innerHTML = '<i class="fas fa-microphone"></i>';
                button.style.background = '';
            }
        }
    }
    
    getAQICategory(aqi) {
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Moderate';
        if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
        if (aqi <= 200) return 'Unhealthy';
        if (aqi <= 300) return 'Very Unhealthy';
        return 'Hazardous';
    }
    
    getHealthRecommendations(aqi) {
        if (aqi <= 50) {
            return "Air quality is good. Enjoy your normal outdoor activities. Perfect day for outdoor exercise and sports.";
        } else if (aqi <= 100) {
            return "Air quality is moderate. Usually sensitive people should consider reducing prolonged outdoor exertion. Generally safe for outdoor activities.";
        } else if (aqi <= 150) {
            return "Air quality is unhealthy for sensitive groups. People with heart or lung disease, older adults, and children should reduce prolonged outdoor exertion.";
        } else if (aqi <= 200) {
            return "Air quality is unhealthy. Everyone may begin to experience health effects. Members of sensitive groups may experience more serious health effects.";
        } else {
            return "Air quality is very unhealthy. Health alert: everyone may experience more serious health effects. Avoid all outdoor physical activities.";
        }
    }
}

// Breathing Exercise Manager
class BreathingExercise {
    constructor() {
        this.isRunning = false;
        this.cycleCount = 0;
        this.currentPhase = 'inhale'; // inhale, hold, exhale
        this.timer = null;
        this.phases = {
            inhale: { duration: 4000, instruction: 'Breathe In', next: 'holdIn' },
            holdIn: { duration: 4000, instruction: 'Hold', next: 'exhale' },
            exhale: { duration: 4000, instruction: 'Breathe Out', next: 'holdOut' },
            holdOut: { duration: 4000, instruction: 'Hold', next: 'inhale' }
        };
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.cycleCount = 0;
        this.startPhase('inhale');
        
        document.getElementById('startBreathing').style.display = 'none';
        document.getElementById('pauseBreathing').style.display = 'block';
    }

    pause() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        clearTimeout(this.timer);
        
        document.getElementById('startBreathing').style.display = 'block';
        document.getElementById('pauseBreathing').style.display = 'none';
        document.getElementById('breathInstruction').textContent = 'Paused';
    }

    startPhase(phase) {
        if (!this.isRunning) return;
        
        const phaseData = this.phases[phase];
        this.currentPhase = phase;
        
        // Update UI
        document.getElementById('breathInstruction').textContent = phaseData.instruction;
        document.getElementById('breathTimer').textContent = (phaseData.duration / 1000) + 's';
        
        // Animate breathing circle
        this.animateBreathing(phase);
        
        // Move to next phase after duration
        this.timer = setTimeout(() => {
            if (phase === 'holdOut') {
                this.cycleCount++;
                this.updateCycleCount();
            }
            this.startPhase(phaseData.next);
        }, phaseData.duration);
    }

    animateBreathing(phase) {
        const circle = document.getElementById('breathingCircle');
        circle.style.animation = 'none';
        
        setTimeout(() => {
            if (phase === 'inhale') {
                circle.style.animation = 'breathe 4s ease-in-out';
            } else if (phase === 'exhale') {
                circle.style.animation = 'breathe 4s ease-in-out reverse';
            } else {
                circle.style.animation = 'none';
            }
        }, 10);
    }

    updateCycleCount() {
        // Update badges or progress based on cycle count
        if (this.cycleCount === 5) {
            this.unlockBadge('beginner');
        } else if (this.cycleCount === 10) {
            this.unlockBadge('intermediate');
        } else if (this.cycleCount === 20) {
            this.unlockBadge('expert');
        }
    }

    unlockBadge(level) {
        const badges = {
            beginner: { name: 'Beginner Breather', icon: 'fas fa-lungs' },
            intermediate: { name: 'Breathing Pro', icon: 'fas fa-wind' },
            expert: { name: 'Zen Master', icon: 'fas fa-spa' }
        };
        
        const badge = badges[level];
        if (badge) {
            // Add badge to UI
            this.showBadgeUnlock(badge);
        }
    }

    showBadgeUnlock(badge) {
        // Create notification for badge unlock
        const notification = document.createElement('div');
        notification.className = 'badge-unlock-notification glassmorphism';
        notification.innerHTML = `
            <i class="${badge.icon}"></i>
            <div>
                <h4>Badge Unlocked!</h4>
                <p>${badge.name}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// AR Scope Manager
class ARScope {
    constructor() {
        this.video = document.getElementById('arVideo');
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        this.stream = null;
        this.isActive = false;
        this.smogOverlay = document.getElementById('smogOverlay');
        this.smogDensity = document.getElementById('smogDensity');
        this.smogValue = document.getElementById('smogValue');
        
        this.initializeAR();
    }

    async initializeAR() {
        // Set up smog density controls
        this.smogDensity.addEventListener('input', (e) => {
            const value = e.target.value;
            this.smogValue.textContent = value + '%';
            this.updateSmogOverlay(value);
        });

        // Start AR button
        document.getElementById('startAR').addEventListener('click', () => {
            this.startCamera();
        });

        // Capture screenshot button
        document.getElementById('captureARScreenshot').addEventListener('click', () => {
            this.captureScreenshot();
        });
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            
            this.video.srcObject = this.stream;
            this.isActive = true;
            
            // Update button text
            document.getElementById('startAR').innerHTML = '<i class="fas fa-stop"></i> Stop AR';
            document.getElementById('startAR').onclick = () => this.stopCamera();
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Unable to access camera. Please check permissions and try again.');
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.isActive = false;
        this.video.srcObject = null;
        
        // Update button text
        document.getElementById('startAR').innerHTML = '<i class="fas fa-play"></i> Start AR';
        document.getElementById('startAR').onclick = () => this.startCamera();
    }

    updateSmogOverlay(density) {
        const opacity = density / 100;
        this.smogOverlay.style.background = `linear-gradient(135deg, 
            rgba(125, 125, 125, ${opacity * 0.6}), 
            rgba(200, 200, 200, ${opacity * 0.4})
        )`;
    }

    captureScreenshot() {
        if (!this.isActive) {
            alert('Please start the AR scope first');
            return;
        }

        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.context.drawImage(this.video, 0, 0);
        
        // Add smog effect to screenshot
        this.context.fillStyle = `rgba(125, 125, 125, ${this.smogDensity.value / 200})`;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Create download link
        const link = document.createElement('a');
        link.download = `aqi-ar-screenshot-${new Date().getTime()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }
}

// Main Application Class
class AQIApplication {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.backendService = new BackendService();
        this.voiceAssistant = new VoiceAssistant();
        this.breathingExercise = new BreathingExercise();
        this.arScope = new ARScope();
        this.aqiMap = null;
        this.complaintMap = null;
        this.capturedPhotos = [];
        this.cameraStream = null;
        
        this.initialize();
    }

    async initialize() {
        // Initialize AOS
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 800,
                once: true,
                offset: 100
            });
        }

        this.setupEventListeners();
        await this.checkAuthentication();
        this.initializeMaps();
    }

    setupEventListeners() {
        // Authentication
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registrationForm').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAuthTab(e.target.dataset.tab));
        });

        // Navigation
        document.getElementById('menuToggle').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('closeSidebar').addEventListener('click', () => this.toggleSidebar());
        
        // Sidebar navigation
        document.querySelectorAll('.sidebar-item').forEach(item => {
            if (item.id !== 'logoutBtn') {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showSection(item.dataset.section);
                    this.toggleSidebar();
                });
            }
        });

        // Bottom navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(item.dataset.section);
            });
        });

        // Voice command
        document.getElementById('voiceCommandBtn').addEventListener('click', () => {
            this.voiceAssistant.startListening();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Complaint form
        document.getElementById('complaintForm').addEventListener('submit', (e) => this.handleComplaintSubmit(e));
        document.getElementById('getCurrentLocation').addEventListener('click', () => this.getCurrentLocation());
        
        // Camera controls
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('capturePhoto').addEventListener('click', () => this.capturePhoto());

        // Breathing exercise
        document.getElementById('startBreathing').addEventListener('click', () => this.breathingExercise.start());
        document.getElementById('pauseBreathing').addEventListener('click', () => this.breathingExercise.pause());

        // Map controls
        document.getElementById('refreshMap').addEventListener('click', () => this.refreshMapData());
        document.getElementById('locateMe').addEventListener('click', () => this.locateUserOnMap());
    }

    async checkAuthentication() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showApp();
            await this.loadDashboardData();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const button = e.target.querySelector('button[type="submit"]');
        
        if (!username || !password) {
            this.showAlert('Please enter username and password', 'error');
            return;
        }

        button.classList.add('loading');
        
        try {
            const result = await this.backendService.login(username, password);
            
            button.classList.remove('loading');
            
            if (result.success) {
                this.currentUser = result.userData;
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                this.showApp();
                await this.loadDashboardData();
                this.showAlert('Login successful!', 'success');
            } else {
                this.showAlert('Login failed: ' + result.error, 'error');
            }
        } catch (error) {
            button.classList.remove('loading');
            this.showAlert('Login error: ' + error.message, 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const formData = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value
        };

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const button = e.target.querySelector('button[type="submit"]');
        
        if (password !== confirmPassword) {
            this.showAlert('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showAlert('Password must be at least 6 characters long', 'error');
            return;
        }

        button.classList.add('loading');

        try {
            const result = await this.backendService.register(formData);
            
            button.classList.remove('loading');

            if (result.success) {
                this.showAlert('Registration successful! Please login.', 'success');
                this.switchAuthTab('login');
                document.getElementById('registrationForm').reset();
            } else {
                this.showAlert('Registration failed: ' + result.error, 'error');
            }
        } catch (error) {
            button.classList.remove('loading');
            this.showAlert('Registration error: ' + error.message, 'error');
        }
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        
        document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-form`).classList.add('active');
    }

    showApp() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('app').style.display = 'block';
    }

    showAuth() {
        document.getElementById('app').style.display = 'none';
        document.getElementById('auth-section').style.display = 'flex';
    }

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
    }

    showSection(section) {
        // Update active states
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected section
        document.getElementById(section).classList.add('active');
        document.querySelector(`.sidebar-item[data-section="${section}"]`).classList.add('active');
        document.querySelector(`.nav-item[data-section="${section}"]`).classList.add('active');

        this.currentSection = section;

        // Section-specific initialization
        switch(section) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'map':
                this.refreshMapData();
                break;
            case 'complaints':
                this.initializeComplaintMap();
                break;
        }
    }

    async loadDashboardData() {
        try {
            this.showLoadingState();
            
            const result = await this.backendService.getAQIData();
            
            if (result.success) {
                this.updateAQIDisplay(result.data);
                this.updateWeatherInfo(result.weather);
                this.updatePollutantLevels(result.data);
                this.updateHealthRecommendations(result.data);
                this.updateHeaderAQI(result.data.aqi);
                
                document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
            } else {
                this.showError('Failed to load AQI data');
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Unable to fetch real-time data');
        }
    }

    showLoadingState() {
        document.getElementById('mainAqiValue').textContent = '--';
        document.getElementById('mainAqiCategory').textContent = 'Loading...';
        document.getElementById('aqiDescription').textContent = 'Fetching real-time data...';
    }

    updateAQIDisplay(aqiData) {
        const aqi = aqiData.aqi;
        const category = this.getAQICategory(aqi);
        const categoryClass = this.getAQIClass(aqi);
        
        document.getElementById('mainAqiValue').textContent = aqi;
        document.getElementById('mainAqiCategory').textContent = category;
        document.getElementById('mainAqiCategory').className = `aqi-category-badge ${categoryClass}`;
        document.getElementById('aqiDescription').textContent = aqiData.healthMessage;
        document.getElementById('dominantPollutant').textContent = `Dominant: ${aqiData.dominantPollutant}`;
        
        // Update progress bar
        const progress = Math.min((aqi / 500) * 100, 100);
        document.getElementById('aqiProgressFill').style.width = `${progress}%`;
        document.getElementById('aqiProgressFill').className = `progress-fill ${categoryClass}`;
        
        // Update health alert
        this.toggleHealthAlert(aqi);
    }

    updateHeaderAQI(aqi) {
        const category = this.getAQICategory(aqi);
        document.getElementById('currentAqi').innerHTML = `
            <span class="aqi-value">${aqi}</span>
            <span class="aqi-category">${category}</span>
        `;
    }

    updateWeatherInfo(weatherData) {
        document.getElementById('temperature').textContent = `${weatherData.temperature}°C`;
        document.getElementById('humidity').textContent = `${weatherData.humidity}%`;
        document.getElementById('windSpeed').textContent = `${weatherData.windSpeed} m/s`;
        document.getElementById('visibility').textContent = `${weatherData.visibility} km`;
    }

    updatePollutantLevels(aqiData) {
        const pollutants = [
            { name: 'PM2.5', value: aqiData.pm25, unit: 'μg/m³' },
            { name: 'PM10', value: aqiData.pm10, unit: 'μg/m³' },
            { name: 'O₃', value: aqiData.o3, unit: 'ppb' },
            { name: 'NO₂', value: aqiData.no2, unit: 'ppb' },
            { name: 'SO₂', value: aqiData.so2, unit: 'ppb' },
            { name: 'CO', value: aqiData.co, unit: 'ppm' }
        ];
        
        const pollutantsHtml = pollutants.map(pollutant => `
            <div class="pollutant-item">
                <div class="pollutant-name">${pollutant.name}</div>
                <div class="pollutant-value">${pollutant.value}</div>
                <div class="pollutant-unit">${pollutant.unit}</div>
            </div>
        `).join('');
        
        document.getElementById('pollutantLevels').innerHTML = pollutantsHtml;
    }

    updateHealthRecommendations(aqiData) {
        const aqi = aqiData.aqi;
        
        let healthHtml = '';
        let activityHtml = '';
        
        if (aqi <= 50) {
            healthHtml = `
                <ul>
                    <li>Air quality is satisfactory with little health risk</li>
                    <li>No special precautions needed</li>
                    <li>Ideal for outdoor activities</li>
                </ul>
            `;
            activityHtml = `
                <ul>
                    <li>Perfect for outdoor sports and exercise</li>
                    <li>Great day for hiking or cycling</li>
                    <li>Ideal for opening windows for ventilation</li>
                </ul>
            `;
        } else if (aqi <= 100) {
            healthHtml = `
                <ul>
                    <li>Air quality is acceptable for most individuals</li>
                    <li>Unusually sensitive people should reduce prolonged outdoor exertion</li>
                    <li>People with asthma should have quick-relief medicine handy</li>
                </ul>
            `;
            activityHtml = `
                <ul>
                    <li>Generally safe for outdoor activities</li>
                    <li>Consider shorter duration for intense exercise</li>
                    <li>Good day for gardening or light outdoor work</li>
                </ul>
            `;
        } else if (aqi <= 150) {
            healthHtml = `
                <ul>
                    <li>Sensitive groups may experience health effects</li>
                    <li>General public is not likely to be affected</li>
                    <li>People with heart or lung disease should reduce outdoor exertion</li>
                </ul>
            `;
            activityHtml = `
                <ul>
                    <li>Sensitive groups should limit outdoor activities</li>
                    <li>Consider indoor exercise options</li>
                    <li>Take more frequent breaks if working outdoors</li>
                </ul>
            `;
        } else {
            healthHtml = `
                <ul>
                    <li>Everyone may begin to experience health effects</li>
                    <li>Sensitive groups should avoid outdoor activities</li>
                    <li>Consider wearing an N95 mask if going outside</li>
                    <li>Use air purifiers indoors</li>
                </ul>
            `;
            activityHtml = `
                <ul>
                    <li>Avoid all outdoor physical activities</li>
                    <li>Reschedule outdoor events if possible</li>
                    <li>Use indoor fitness facilities instead</li>
                    <li>Keep windows and doors closed</li>
                </ul>
            `;
        }
        
        document.getElementById('healthRecommendations').innerHTML = healthHtml;
        document.getElementById('activitySuggestions').innerHTML = activityHtml;
    }

    toggleHealthAlert(aqi) {
        const alertElement = document.getElementById('healthAlert');
        
        if (aqi > 150) {
            let title = 'Health Alert';
            let message = 'Current air quality may affect sensitive individuals. Limit outdoor activities.';
            
            if (aqi > 200) {
                title = 'High Health Alert';
                message = 'Air quality is poor. Everyone may begin to experience health effects. Avoid outdoor activities.';
            }
            
            if (aqi > 300) {
                title = 'Severe Health Alert';
                message = 'Health emergency! Avoid all outdoor activities. Sensitive groups should take extra precautions.';
            }
            
            document.getElementById('alertTitle').textContent = title;
            document.getElementById('alertMessage').textContent = message;
            alertElement.style.display = 'flex';
        } else {
            alertElement.style.display = 'none';
        }
    }

    getAQICategory(aqi) {
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Moderate';
        if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
        if (aqi <= 200) return 'Unhealthy';
        if (aqi <= 300) return 'Very Unhealthy';
        return 'Hazardous';
    }

    getAQIClass(aqi) {
        if (aqi <= 50) return 'aqi-good';
        if (aqi <= 100) return 'aqi-moderate';
        if (aqi <= 150) return 'aqi-unhealthy-sensitive';
        if (aqi <= 200) return 'aqi-unhealthy';
        if (aqi <= 300) return 'aqi-very-unhealthy';
        return 'aqi-hazardous';
    }

    initializeMaps() {
        // Main AQI Map
        this.aqiMap = L.map('aqiMap').setView([28.6139, 77.2090], 10);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.aqiMap);

        // Complaint location map
        this.complaintMap = L.map('locationMap').setView([28.6139, 77.2090], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.complaintMap);
        
        document.getElementById('locationMap').style.display = 'none';
    }

    async refreshMapData() {
        try {
            const result = await this.backendService.getMapData();
            
            if (result.success) {
                this.updateMapWithData(result);
            }
        } catch (error) {
            console.error('Error loading map data:', error);
        }
    }

    updateMapWithData(data) {
        // Clear existing markers
        this.aqiMap.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                this.aqiMap.removeLayer(layer);
            }
        });

        // Add community spots
        data.communitySpots.forEach(spot => {
            const color = this.getSpotColor(spot.type);
            const marker = L.circleMarker([spot.lat, spot.lng], {
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                radius: 8
            }).addTo(this.aqiMap);
            
            marker.bindPopup(`
                <div>
                    <h4>${this.getSpotTypeName(spot.type)}</h4>
                    <p>Reported by: ${spot.reportedBy}</p>
                    <p>${new Date(spot.timestamp).toLocaleString()}</p>
                </div>
            `);
        });

        // Add shelters/hospitals
        data.shelters.forEach(shelter => {
            const icon = L.divIcon({
                className: 'hospital-marker',
                html: `<i class="fas fa-hospital" style="color: ${shelter.status === 'Open' ? 'green' : 'red'};"></i>`,
                iconSize: [20, 20]
            });
            
            const marker = L.marker([shelter.lat, shelter.lng], { icon }).addTo(this.aqiMap);
            
            marker.bindPopup(`
                <div>
                    <h4>${shelter.name}</h4>
                    <p>Type: ${shelter.type}</p>
                    <p>Status: ${shelter.status}</p>
                    <p>Phone: ${shelter.phone}</p>
                </div>
            `);
        });
    }

    getSpotColor(type) {
        const colors = {
            'construction': 'orange',
            'stubble': 'brown',
            'industry': 'red',
            'vehicle': 'blue',
            'waste': 'purple'
        };
        return colors[type] || 'gray';
    }

    getSpotTypeName(type) {
        const names = {
            'construction': 'Illegal Construction',
            'stubble': 'Stubble Burning',
            'industry': 'Illegal Industry',
            'vehicle': 'Vehicle Pollution',
            'waste': 'Waste Burning'
        };
        return names[type] || type;
    }

    locateUserOnMap() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    this.aqiMap.setView([lat, lng], 13);
                    
                    // Add user location marker
                    L.marker([lat, lng])
                        .addTo(this.aqiMap)
                        .bindPopup('Your Location')
                        .openPopup();
                },
                (error) => {
                    alert('Unable to get your location');
                }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    }

    initializeComplaintMap() {
        this.complaintMap.on('click', (e) => {
            const { lat, lng } = e.latlng;
            
            // Clear existing markers
            this.complaintMap.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    this.complaintMap.removeLayer(layer);
                }
            });
            
            // Add marker at clicked location
            L.marker([lat, lng]).addTo(this.complaintMap)
                .bindPopup('Selected Location')
                .openPopup();
            
            // Update form fields
            document.getElementById('complaintLocation').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            document.getElementById('locationCoordinates').textContent = 
                `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
            
            document.getElementById('locationMap').style.display = 'block';
        });
    }

    async getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    document.getElementById('complaintLocation').value = 
                        `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    document.getElementById('locationCoordinates').textContent = 
                        `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
                    
                    // Show map and set view
                    document.getElementById('locationMap').style.display = 'block';
                    this.complaintMap.setView([lat, lng], 15);
                    
                    // Add marker
                    this.complaintMap.eachLayer(layer => {
                        if (layer instanceof L.Marker) {
                            this.complaintMap.removeLayer(layer);
                        }
                    });
                    
                    L.marker([lat, lng]).addTo(this.complaintMap)
                        .bindPopup('Your Location')
                        .openPopup();
                },
                (error) => {
                    alert('Unable to get your location. Please enter manually.');
                }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    }

    async startCamera() {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            
            const cameraPreview = document.getElementById('cameraPreview');
            cameraPreview.innerHTML = '<video autoplay playsinline></video>';
            const video = cameraPreview.querySelector('video');
            video.srcObject = this.cameraStream;
            
            document.getElementById('startCamera').style.display = 'none';
            document.getElementById('capturePhoto').style.display = 'block';
        } catch (error) {
            console.error('Camera error:', error);
            alert('Unable to access camera. Please check permissions.');
        }
    }

    capturePhoto() {
        if (this.capturedPhotos.length >= 5) {
            alert('Maximum 5 photos allowed');
            return;
        }

        const video = document.querySelector('#cameraPreview video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        this.capturedPhotos.push(photoData);
        this.updatePhotoPreview();
    }

    updatePhotoPreview() {
        const preview = document.getElementById('photoPreview');
        preview.innerHTML = '';

        this.capturedPhotos.forEach((photo, index) => {
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';
            photoItem.innerHTML = `
                <img src="${photo}" alt="Captured photo ${index + 1}">
                <button type="button" class="photo-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            preview.appendChild(photoItem);
        });

        // Add remove event listeners
        preview.querySelectorAll('.photo-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.photo-remove').dataset.index);
                this.capturedPhotos.splice(index, 1);
                this.updatePhotoPreview();
            });
        });
    }

    async handleComplaintSubmit(e) {
        e.preventDefault();
        
        const complaintType = document.getElementById('complaintType').value;
        const severity = document.getElementById('complaintSeverity').value;
        const location = document.getElementById('complaintLocation').value;
        const description = document.getElementById('complaintDescription').value;
        const button = e.target.querySelector('.btn-submit');

        if (!complaintType || !location || !description) {
            this.showAlert('Please fill in all required fields', 'error');
            return;
        }

        // Extract coordinates from location string
        const coords = location.split(',').map(coord => parseFloat(coord.trim()));
        if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
            this.showAlert('Please select a valid location on the map', 'error');
            return;
        }

        button.classList.add('loading');

        const complaintData = {
            userID: this.currentUser.userID,
            type: complaintType,
            location: { lat: coords[0], lng: coords[1] },
            description: description,
            photos: this.capturedPhotos,
            severity: severity
        };

        try {
            const result = await this.backendService.submitComplaint(complaintData);

            button.classList.remove('loading');

            if (result.success) {
                this.showAlert(`Complaint submitted successfully! Tracking ID: ${result.complaintID}`, 'success');
                
                // Reset form
                document.getElementById('complaintForm').reset();
                this.capturedPhotos = [];
                this.updatePhotoPreview();
                document.getElementById('locationMap').style.display = 'none';
                
                // Stop camera
                if (this.cameraStream) {
                    this.cameraStream.getTracks().forEach(track => track.stop());
                    this.cameraStream = null;
                }
            } else {
                this.showAlert('Error submitting complaint: ' + result.error, 'error');
            }

        } catch (error) {
            button.classList.remove('loading');
            this.showAlert('Error submitting complaint. Please try again.', 'error');
        }
    }

    showAlert(message, type) {
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert-notification glassmorphism ${type}`;
        alert.innerHTML = `
            <div class="alert-icon">
                <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
            </div>
            <div class="alert-message">${message}</div>
            <button class="alert-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(alert);
        
        // Remove alert after 5 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    showError(message) {
        document.getElementById('mainAqiValue').textContent = 'Error';
        document.getElementById('mainAqiCategory').textContent = 'Data unavailable';
        document.getElementById('aqiDescription').textContent = message;
    }

    logout() {
        localStorage.removeItem('currentUser');
        this.currentUser = null;
        this.showAuth();
        
        // Reset forms
        document.getElementById('loginForm').reset();
        this.switchAuthTab('login');
    }
}

// Utility Functions
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.parentElement.querySelector('.password-toggle i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Initialize application when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new AQIApplication();
});

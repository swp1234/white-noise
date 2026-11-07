// 백색소음 플레이어 - Web Audio API 합성 사운드 버전
// 로컬 합성 사운드만 사용 (외부 API 의존도 없음)
class WhiteNoiseApp {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.audioElements = {};
        this.isPlaying = false;
        this.masterVolume = 0.8;
        this.masterGain = null;
        this.timer = null;
        this.timerMinutes = 0;
        this.timerRemaining = 0;

        // Freesound API는 제거 - 모든 사운드는 브라우저 합성(Web Audio API)으로 처리
        // 서드파티 API 의존도 제거로 보안 및 안정성 향상
        this.soundsLoaded = true;  // 합성 사운드는 항상 로드됨
        this.soundPreviews = {};   // 외부 사운드는 사용하지 않음

        this.init();
    }

    init() {
        try {
            this.initTheme();
            this.loadSavedSettings();
            this.loadSessionStats();
            this.loadFreesoundPreviews();
            this.setupSoundCards();
            this.setupPresets();
            this.setupTimerControls();
            this.setupMasterControls();
            this.setupPremiumButton();
            this.startSessionTracking();
            this.renderUsageStats();
            this.registerServiceWorker();
            this.setupThemeToggle();
            initRelatedFunnels();
        } catch (e) {
            console.error('App initialization error:', e);
        }
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';
        }
    }

    // 저장된 설정 불러오기
    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            try { localStorage.setItem('theme', next); } catch (e) {}
            themeToggle.textContent = next === 'light' ? '\u2600' : '\u263E';
        });
    }

    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('whitenoise_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                if (settings.masterVolume !== undefined) {
                    this.masterVolume = settings.masterVolume;
                }
            }
        } catch (e) {}
    }

    // 설정 저장
    saveSettings() {
        try {
            localStorage.setItem('whitenoise_settings', JSON.stringify({
                masterVolume: this.masterVolume
            }));
        } catch (e) {}
    }

    // 합성 사운드만 사용 (Web Audio API)
    // 보안: 외부 API 의존도 제거, 네트워크 요청 최소화
    async loadFreesoundPreviews() {
        // 합성 사운드는 즉시 로드됨 (네트워크 요청 없음)
        this.soundsLoaded = true;
        this.updateCredits();
    }

    updateCredits() {
        // 모든 사운드가 Web Audio API 합성이므로 외부 저작자 표시 불필요
        this.credits = window.i18n?.t('credits.synthesized') || 'All sounds are browser-synthesized.';
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    setupSoundCards() {
        const cards = document.querySelectorAll('.sound-card');
        cards.forEach(card => {
            const slider = card.querySelector('.volume-slider');
            const soundType = card.dataset.sound;

            slider.addEventListener('input', (e) => {
                this.initAudioContext();
                const volume = parseInt(e.target.value) / 100;
                if (volume > 0) {
                    card.classList.add('active');
                    this.playSound(soundType, volume);
                } else {
                    card.classList.remove('active');
                    this.stopSound(soundType);
                }
            });

            card.addEventListener('click', (e) => {
                if (e.target === slider) return;
                this.initAudioContext();
                const currentValue = parseInt(slider.value);
                slider.value = currentValue > 0 ? 0 : 50;
                slider.dispatchEvent(new Event('input'));
            });
        });
    }

    // 사운드 재생 (모두 합성 사운드)
    playSound(type, volume) {
        // 모든 사운드 타입에 합성 사운드(Web Audio API) 사용
        this.playSynthSound(type, volume);
    }

    playSynthSound(type, volume) {
        if (this.sounds[type] && this.sounds[type].type === 'synth') {
            this.sounds[type].gainNode.gain.setTargetAtTime(
                volume, this.audioContext.currentTime, 0.1
            );
            return;
        }

        // 기존 Freesound 정지
        if (this.sounds[type] && this.sounds[type].type === 'freesound') {
            this.sounds[type].audio.pause();
        }

        const config = this.getSynthConfig(type);
        const synthSound = this.createLayeredSound(config, volume);
        synthSound.type = 'synth';
        this.sounds[type] = synthSound;
    }

    getSynthConfig(type) {
        const configs = {
            // === 순수 노이즈 ===
            white: {
                layers: [
                    { noise: 'white', gain: 1.0, filters: [
                        { type: 'highpass', freq: 20 },
                        { type: 'lowpass', freq: 16000 }
                    ]}
                ]
            },
            pink: {
                layers: [
                    { noise: 'pink', gain: 1.0, filters: [
                        { type: 'lowpass', freq: 8000 }
                    ]}
                ]
            },
            brown: {
                layers: [
                    { noise: 'brown', gain: 1.0, filters: [
                        { type: 'lowpass', freq: 800 }
                    ]}
                ]
            },

            // === 자연 소리 폴백 ===
            rain: {
                layers: [
                    { noise: 'pink', gain: 0.5, filters: [{ type: 'bandpass', freq: 2500, Q: 0.8 }]},
                    { noise: 'brown', gain: 0.3, filters: [{ type: 'lowpass', freq: 400 }], lfo: { freq: 0.1, depth: 0.2 }},
                    { noise: 'white', gain: 0.25, filters: [{ type: 'highpass', freq: 5000 }, { type: 'lowpass', freq: 12000 }], lfo: { freq: 0.3, depth: 0.4 }}
                ]
            },
            thunder: {
                layers: [
                    { noise: 'brown', gain: 0.9, filters: [{ type: 'lowpass', freq: 100, Q: 2 }], lfo: { freq: 0.02, depth: 0.7 }},
                    { noise: 'brown', gain: 0.4, filters: [{ type: 'bandpass', freq: 60, Q: 1 }]}
                ]
            },
            wind: {
                layers: [
                    { noise: 'pink', gain: 0.5, filters: [{ type: 'bandpass', freq: 500, Q: 0.3 }], lfo: { freq: 0.06, depth: 0.5 }},
                    { noise: 'brown', gain: 0.35, filters: [{ type: 'lowpass', freq: 250 }], lfo: { freq: 0.04, depth: 0.4 }}
                ]
            },
            forest: {
                layers: [
                    { noise: 'pink', gain: 0.4, filters: [{ type: 'bandpass', freq: 1200, Q: 0.4 }], lfo: { freq: 0.15, depth: 0.3 }},
                    { noise: 'brown', gain: 0.2, filters: [{ type: 'lowpass', freq: 300 }]}
                ]
            },
            birds: {
                layers: [
                    { noise: 'white', gain: 0.35, filters: [{ type: 'bandpass', freq: 4500, Q: 3 }], lfo: { freq: 0.8, depth: 0.8 }},
                    { noise: 'pink', gain: 0.2, filters: [{ type: 'bandpass', freq: 3000, Q: 1.5 }], lfo: { freq: 0.5, depth: 0.6 }}
                ]
            },
            ocean: {
                layers: [
                    { noise: 'brown', gain: 0.6, filters: [{ type: 'lowpass', freq: 400 }], lfo: { freq: 0.05, depth: 0.6 }},
                    { noise: 'pink', gain: 0.4, filters: [{ type: 'bandpass', freq: 800, Q: 0.5 }], lfo: { freq: 0.07, depth: 0.5 }}
                ]
            },
            fire: {
                layers: [
                    { noise: 'pink', gain: 0.45, filters: [{ type: 'bandpass', freq: 600, Q: 0.6 }], lfo: { freq: 0.5, depth: 0.4 }},
                    { noise: 'brown', gain: 0.35, filters: [{ type: 'lowpass', freq: 200 }]}
                ]
            },
            river: {
                layers: [
                    { noise: 'pink', gain: 0.5, filters: [{ type: 'bandpass', freq: 1800, Q: 0.5 }], lfo: { freq: 0.12, depth: 0.25 }},
                    { noise: 'white', gain: 0.3, filters: [{ type: 'highpass', freq: 3000 }, { type: 'lowpass', freq: 7000 }]}
                ]
            },
            waterfall: {
                layers: [
                    { noise: 'white', gain: 0.5, filters: [{ type: 'bandpass', freq: 2500, Q: 0.4 }]},
                    { noise: 'pink', gain: 0.4, filters: [{ type: 'bandpass', freq: 1200, Q: 0.5 }]}
                ]
            },
            crickets: {
                layers: [
                    { noise: 'white', gain: 0.3, filters: [{ type: 'bandpass', freq: 5500, Q: 8 }], lfo: { freq: 3, depth: 0.85 }}
                ]
            },
            cafe: {
                layers: [
                    { noise: 'pink', gain: 0.4, filters: [{ type: 'bandpass', freq: 800, Q: 0.3 }], lfo: { freq: 0.2, depth: 0.25 }},
                    { noise: 'white', gain: 0.2, filters: [{ type: 'bandpass', freq: 3500, Q: 1 }], lfo: { freq: 0.4, depth: 0.5 }}
                ]
            },
            keyboard: {
                layers: [
                    { noise: 'white', gain: 0.35, filters: [{ type: 'bandpass', freq: 3000, Q: 2 }], lfo: { freq: 4, depth: 0.75 }}
                ]
            },
            train: {
                layers: [
                    { noise: 'brown', gain: 0.6, filters: [{ type: 'lowpass', freq: 150 }], lfo: { freq: 1.5, depth: 0.4 }},
                    { noise: 'pink', gain: 0.3, filters: [{ type: 'bandpass', freq: 300, Q: 0.8 }], lfo: { freq: 1.5, depth: 0.3 }}
                ]
            },
            fan: {
                layers: [
                    { noise: 'pink', gain: 0.6, filters: [{ type: 'bandpass', freq: 180, Q: 0.4 }]},
                    { noise: 'brown', gain: 0.3, filters: [{ type: 'lowpass', freq: 100 }]}
                ]
            },
            aircon: {
                layers: [
                    { noise: 'pink', gain: 0.55, filters: [{ type: 'lowpass', freq: 400 }]},
                    { noise: 'brown', gain: 0.4, filters: [{ type: 'lowpass', freq: 80 }]}
                ]
            }
        };

        return configs[type] || configs.white;
    }

    createLayeredSound(config, volume) {
        const result = { 
            layers: [], 
            gainNode: this.audioContext.createGain()
        };

        result.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        result.gainNode.connect(this.masterGain);

        config.layers.forEach(layerConfig => {
            const layer = this.createSoundLayer(layerConfig);
            layer.output.connect(result.gainNode);
            result.layers.push(layer);
        });

        return result;
    }

    createSoundLayer(config) {
        const layer = { nodes: [] };

        const bufferSize = 4 * this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);

        for (let ch = 0; ch < 2; ch++) {
            const data = buffer.getChannelData(ch);
            this.fillNoiseBuffer(data, config.noise);
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        layer.source = source;

        const layerGain = this.audioContext.createGain();
        layerGain.gain.value = config.gain;

        let lastNode = source;

        if (config.filters) {
            config.filters.forEach(f => {
                const filter = this.audioContext.createBiquadFilter();
                filter.type = f.type;
                filter.frequency.value = f.freq;
                if (f.Q) filter.Q.value = f.Q;
                lastNode.connect(filter);
                lastNode = filter;
                layer.nodes.push(filter);
            });
        }

        if (config.lfo) {
            const lfoGain = this.audioContext.createGain();
            lfoGain.gain.value = 1 - config.lfo.depth / 2;

            const lfo = this.audioContext.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = config.lfo.freq;

            const lfoDepth = this.audioContext.createGain();
            lfoDepth.gain.value = config.lfo.depth / 2;

            lfo.connect(lfoDepth);
            lfoDepth.connect(lfoGain.gain);
            lfo.start();

            lastNode.connect(lfoGain);
            lastNode = lfoGain;
            layer.lfo = lfo;
        }

        lastNode.connect(layerGain);
        layer.output = layerGain;

        source.start();

        return layer;
    }

    fillNoiseBuffer(data, noiseType) {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        let lastOut = 0;

        for (let i = 0; i < data.length; i++) {
            const white = Math.random() * 2 - 1;

            switch (noiseType) {
                case 'white':
                    data[i] = white * 0.5;
                    break;
                case 'pink':
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980;
                    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                    b6 = white * 0.115926;
                    break;
                case 'brown':
                    lastOut = (lastOut + (0.02 * white)) / 1.02;
                    data[i] = lastOut * 3.5;
                    break;
            }
        }
    }

    stopSound(type) {
        const sound = this.sounds[type];
        if (!sound) return;

        // 모든 사운드는 합성 사운드
        if (sound.type === 'synth') {
            sound.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.3);
            setTimeout(() => {
                sound.layers.forEach(layer => {
                    try {
                        layer.source.stop();
                        if (layer.lfo) layer.lfo.stop();
                    } catch (e) {}
                });
            }, 500);
        }

        delete this.sounds[type];
    }

    setupPresets() {
        const presets = {
            sleep: { rain: 40, brown: 25, ocean: 20 },
            focus: { cafe: 30, pink: 20 },
            relax: { ocean: 40, wind: 25, forest: 15 },
            nature: { forest: 35, birds: 25, river: 25 }
        };

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.initAudioContext();
                const preset = presets[btn.dataset.preset];

                document.querySelectorAll('.sound-card').forEach(card => {
                    const slider = card.querySelector('.volume-slider');
                    const soundType = card.dataset.sound;
                    slider.value = preset[soundType] || 0;
                    slider.dispatchEvent(new Event('input'));
                });
            });
        });
    }

    setupTimerControls() {
        document.querySelectorAll('.timer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.timerMinutes = parseInt(btn.dataset.minutes);
                this.timerRemaining = this.timerMinutes * 60;

                if (this.timerMinutes === 0) {
                    document.getElementById('timer-display').textContent = '∞';
                    if (this.timer) clearInterval(this.timer);
                    this.timer = null;
                } else {
                    this.updateTimerDisplay();
                    if (this.isPlaying) this.startTimer();
                }
            });
        });
    }

    startTimer() {
        if (this.timer) clearInterval(this.timer);
        if (this.timerMinutes === 0) return;

        this.timer = setInterval(() => {
            this.timerRemaining--;
            this.updateTimerDisplay();
            if (this.timerRemaining <= 0) {
                this.stopAllSounds();
                clearInterval(this.timer);
                this.timer = null;
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const m = Math.floor(this.timerRemaining / 60);
        const s = this.timerRemaining % 60;
        document.getElementById('timer-display').textContent =
            `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    stopAllSounds() {
        Object.keys(this.sounds).forEach(type => this.stopSound(type));

        document.querySelectorAll('.sound-card').forEach(card => {
            card.classList.remove('active');
            card.querySelector('.volume-slider').value = 0;
        });

        this.isPlaying = false;
        document.getElementById('play-icon').textContent = '▶';
        document.getElementById('play-btn').classList.remove('playing');
    }

    setupMasterControls() {
        const slider = document.getElementById('master-volume');
        const valueDisplay = document.getElementById('volume-value');
        const playBtn = document.getElementById('play-btn');

        // 저장된 볼륨 복원
        const savedVol = Math.round(this.masterVolume * 100);
        slider.value = savedVol;
        valueDisplay.textContent = `${savedVol}%`;

        slider.addEventListener('input', (e) => {
            this.masterVolume = parseInt(e.target.value) / 100;
            valueDisplay.textContent = `${e.target.value}%`;
            this.saveSettings();

            // 합성 오디오 볼륨 조절
            if (this.masterGain) {
                this.masterGain.gain.setTargetAtTime(this.masterVolume, this.audioContext.currentTime, 0.1);
            }
        });

        playBtn.addEventListener('click', () => {
            this.initAudioContext();
            if (this.isPlaying) {
                this.stopAllSounds();
            } else {
                if (Object.keys(this.sounds).length === 0) {
                    document.querySelector('.preset-btn[data-preset="sleep"]').click();
                }
                this.isPlaying = true;
                document.getElementById('play-icon').textContent = '⏹';
                playBtn.classList.add('playing');
                if (this.timerMinutes > 0) this.startTimer();
            }
        });
    }

    setupPremiumButton() {
        document.getElementById('premium-btn')?.addEventListener('click', () => {
            this.showPremiumContent();
        });
    }

        showPremiumContent() {
        const h = new Date().getHours();
        const currentLang = (window.i18n ? window.i18n.currentLang : 'ko') || 'ko';
        const timeStr = new Date().toLocaleTimeString(currentLang);
        const modeText = (h >= 22 || h < 6)
            ? (window.i18n ? window.i18n.t('premium.modeSleep') : '🌙 Night Mode: Rain 40% + Brown 25% + Ocean 20%')
            : (h >= 9 && h < 18)
            ? (window.i18n ? window.i18n.t('premium.modeFocus') : '🎯 Focus Mode: Cafe 30% + Pink 20%')
            : (window.i18n ? window.i18n.t('premium.modeRelax') : '🧘 Relax Mode: Ocean 40% + Wind 25%');

        const container = document.getElementById('premium-content');
        if (container) {
            container.innerHTML = `
                <div class="premium-section-block">
                    <h4>🎵 <span>${window.i18n ? window.i18n.t('premium.soundTechTitle') : 'Sound Technology'}</span></h4>
                    <p>${window.i18n ? window.i18n.t('premium.soundTechDesc') : 'Web Audio API synthesis'}</p>
                </div>
                <div class="premium-section-block">
                    <h4>💤 <span>${window.i18n ? window.i18n.t('premium.environmentTitle') : 'Optimal Sleep Environment'}</span></h4>
                    <p>${window.i18n ? window.i18n.t('premium.envTemp') : '1. Temperature: 18-22°C'}</p>
                    <p>${window.i18n ? window.i18n.t('premium.envLight') : '2. Lighting: Dim 1h before bed'}</p>
                    <p>${window.i18n ? window.i18n.t('premium.envNoise') : '3. Noise: Continuous masking'}</p>
                    <p>${window.i18n ? window.i18n.t('premium.envHumidity') : '4. Humidity: 40-60%'}</p>
                </div>
                <div class="premium-section-block">
                    <h4>🎵 <span>${window.i18n ? window.i18n.t('premium.effectsTitle') : 'Sound Benefits'}</span></h4>
                    <p>${window.i18n ? window.i18n.t('premium.effectBrown') : 'Brown Noise: Deep sleep'}</p>
                    <p>${window.i18n ? window.i18n.t('premium.effectPink') : 'Pink Noise: Memory & focus'}</p>
                    <p>${window.i18n ? window.i18n.t('premium.effectRain') : 'Rain: Stress reduction'}</p>
                    <p>${window.i18n ? window.i18n.t('premium.effectOcean') : 'Ocean: Heart rate relaxation'}</p>
                    <p>${window.i18n ? window.i18n.t('premium.effectFire') : 'Campfire: Cozy grounding'}</p>
                </div>
                <div class="premium-section-block">
                    <h4>🔬 <span>${window.i18n ? window.i18n.t('premium.recommendedTitle') : 'Recommended Blends'}</span></h4>
                    <p>${window.i18n ? window.i18n.t('premium.blendSleep') : 'Sleep: Rain 40% + Brown 25% + Ocean 20%'}</p>
                    <p>${window.i18n ? window.i18n.t('premium.blendFocus') : 'Focus: Cafe 30% + Pink 20%'}</p>
                    <p>${window.i18n ? window.i18n.t('premium.blendMeditate') : 'Meditation: Ocean 40% + Wind 25%'}</p>
                </div>
                <div class="premium-section-block">
                    <h4>📊 <span>${window.i18n ? window.i18n.t('premium.timeTitle') : 'Real-Time Recommendation'}</span></h4>
                    <p class="premium-time-clock">${timeStr}</p>
                    <p class="premium-time-mode"><strong>${modeText}</strong></p>
                </div>
            `;
        }
        const resultCard = document.getElementById('premium-result');
        if (resultCard) {
            resultCard.classList.remove('hidden');
            resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // 세션 통계
    loadSessionStats() {
        try {
            this.sessionStats = JSON.parse(localStorage.getItem('whitenoise_stats') || '{}');
            if (!this.sessionStats.totalSessions) {
                this.sessionStats = {
                    totalSessions: 0,
                    totalMinutes: 0,
                    streak: 0,
                    lastDate: null,
                    favPreset: {}
                };
            }
        } catch (e) {
            this.sessionStats = { totalSessions: 0, totalMinutes: 0, streak: 0, lastDate: null, favPreset: {} };
        }
    }

    saveSessionStats() {
        try {
            localStorage.setItem('whitenoise_stats', JSON.stringify(this.sessionStats));
        } catch (e) {}
    }

    startSessionTracking() {
        this.sessionStartTime = null;

        // 재생 시작/정지 시 세션 추적
        const origPlay = this.isPlaying;
        const self = this;

        // 매분 사용 시간 기록
        setInterval(() => {
            if (Object.keys(self.sounds).length > 0) {
                if (!self.sessionStartTime) {
                    self.sessionStartTime = Date.now();
                    self.sessionStats.totalSessions++;

                    // 연속일 체크
                    const today = new Date().toDateString();
                    if (self.sessionStats.lastDate !== today) {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        if (self.sessionStats.lastDate === yesterday.toDateString()) {
                            self.sessionStats.streak++;
                        } else if (self.sessionStats.lastDate) {
                            self.sessionStats.streak = 1;
                        } else {
                            self.sessionStats.streak = 1;
                        }
                        self.sessionStats.lastDate = today;
                    }
                }
                self.sessionStats.totalMinutes++;
                self.saveSessionStats();
                self.renderUsageStats();
            } else {
                self.sessionStartTime = null;
            }
        }, 60000);
    }

    renderUsageStats() {
        const container = document.getElementById('usage-stats');
        if (!container || !this.sessionStats) return;

        const hours = Math.floor((this.sessionStats?.totalMinutes || 0) / 60);
        const mins = (this.sessionStats?.totalMinutes || 0) % 60;
        const timeStr = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;

        // 안전한 DOM 생성 (innerHTML 대신 createElement 사용)
        container.innerHTML = '';

        const createStat = (value, label) => {
            const div = document.createElement('div');
            div.className = 'usage-stat';

            const valueSpan = document.createElement('span');
            valueSpan.className = 'usage-value';
            valueSpan.textContent = value;

            const labelSpan = document.createElement('span');
            labelSpan.className = 'usage-label';
            labelSpan.textContent = label;

            div.appendChild(valueSpan);
            div.appendChild(labelSpan);
            return div;
        };

        container.appendChild(createStat(this.sessionStats?.totalSessions || 0, '세션'));
        container.appendChild(createStat(timeStr, '총 사용'));
        container.appendChild(createStat(this.sessionStats?.streak || 0, '연속일'));
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WhiteNoiseApp();

    // Hide app loader
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 300);
    }
});


// Funnel bridge & language preservation
function initRelatedFunnels() {
    const urlParams = new URLSearchParams(window.location.search);
    const lang = (window.i18n ? window.i18n.currentLang : null) || urlParams.get('lang') || 'ko';
    const base = (window.location.origin && window.location.origin !== 'null') ? window.location.origin : 'https://dopabrain.com';
    document.querySelectorAll('.related-grid a, a.promo-link').forEach(link => {
        const baseHref = link.getAttribute('data-base-href') || link.getAttribute('href');
        if (!baseHref || baseHref.startsWith('http') || baseHref.startsWith('#')) return;
        try {
            const url = new URL(baseHref, base);
            if (lang) {
                url.searchParams.set('lang', lang);
            }
            if (!url.searchParams.has('source')) {
                url.searchParams.set('source', link.classList.contains('promo-link') ? 'white_noise_cross_promo' : 'white_noise_result');
            }
            link.setAttribute('href', url.pathname + url.search);
        } catch(e) {}
        if (!link.dataset.trackedCta) {
            link.dataset.trackedCta = 'true';
            link.addEventListener('click', () => {
                if (typeof gtag === 'function') {
                    gtag('event', 'content_cta_click', {
                        cta_surface: link.classList.contains('promo-link') ? 'white_noise_cross_promo' : 'white_noise_related',
                        destination: link.getAttribute('href'),
                        source: 'white_noise',
                        lang: lang
                    });
                }
            });
        }
    });
}

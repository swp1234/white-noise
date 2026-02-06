// 백색소음 플레이어 - Freesound API 버전
// CC0/CC-BY 라이선스 사운드 사용 (상업적 사용 가능)
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
        
        // Freesound API 설정
        this.apiKey = 'bq5bEe2KHPGHWIreFsq47s06wzpNNqrbZJheH96t';
        this.soundsLoaded = false;
        this.soundPreviews = {};
        
        this.init();
    }

    init() {
        this.loadSavedSettings();
        this.loadFreesoundPreviews();
        this.setupSoundCards();
        this.setupPresets();
        this.setupTimerControls();
        this.setupMasterControls();
        this.setupPremiumButton();
        this.registerServiceWorker();
    }

    // 저장된 설정 불러오기
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

    // Freesound에서 고품질 CC0/CC-BY 사운드 프리뷰 URL 가져오기
    async loadFreesoundPreviews() {
        // 엄선된 Freesound ID (CC0 또는 CC-BY 라이선스)
        const freesoundIds = {
            rain: 346642,       // Rain on window CC0
            thunder: 501104,    // Thunder storm CC0
            wind: 370723,       // Wind outdoor CC0
            forest: 509070,     // Forest ambience CC0
            birds: 531015,      // Birds singing CC0
            ocean: 527602,      // Ocean waves CC0
            fire: 532281,       // Campfire CC0
            river: 398936,      // Stream water CC0
            waterfall: 370144,  // Waterfall CC0
            crickets: 459285,   // Crickets night CC0
            cafe: 456522,       // Cafe ambience CC0
            keyboard: 417614,   // Mechanical keyboard CC0
            train: 268903,      // Train ambience CC0
            fan: 382928,        // Fan white noise CC0
            aircon: 373188      // Air conditioner CC0
        };

        const loadingEl = document.createElement('div');
        loadingEl.className = 'loading-indicator';
        loadingEl.innerHTML = '<span>🎵 고품질 사운드 로딩 중...</span>';
        document.querySelector('.app-header').appendChild(loadingEl);

        const promises = Object.entries(freesoundIds).map(async ([type, id]) => {
            try {
                const response = await fetch(
                    `https://freesound.org/apiv2/sounds/${id}/?token=${this.apiKey}`
                );
                if (response.ok) {
                    const data = await response.json();
                    
                    if (!data.previews || !data.previews['preview-hq-mp3']) {
                        return;
                    }
                    
                    this.soundPreviews[type] = {
                        url: data.previews['preview-hq-mp3'],
                        name: data.name,
                        username: data.username,
                        license: data.license
                    };
                    
                    // 오디오 엘리먼트 미리 생성
                    const audio = new Audio();
                    audio.crossOrigin = 'anonymous';
                    audio.src = this.soundPreviews[type].url;
                    audio.loop = true;
                    audio.preload = 'auto';
                    audio.volume = 0;
                    this.audioElements[type] = audio;
                }
            } catch (e) {
                console.log(`${type} 로드 실패, 합성 사운드 사용`);
            }
        });

        await Promise.allSettled(promises);
        
        const loadedCount = Object.keys(this.soundPreviews).length;
        
        if (loadedCount === 0) {
            loadingEl.innerHTML = '<span>⚠️ 합성 사운드 사용 중</span>';
        } else {
            loadingEl.innerHTML = `<span>✅ ${loadedCount}개 사운드 로드 완료</span>`;
        }
        setTimeout(() => loadingEl.remove(), 2000);
        
        this.soundsLoaded = true;
        this.updateCredits();
    }

    updateCredits() {
        // CC-BY 저작자 표시 (프리미엄 콘텐츠에 포함)
        this.credits = Object.entries(this.soundPreviews)
            .filter(([_, info]) => info.license && info.license.includes('Attribution'))
            .map(([type, info]) => `${type}: "${info.name}" by ${info.username}`)
            .join('\n');
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

    // 사운드 재생 (Freesound 우선, 합성 폴백)
    playSound(type, volume) {
        // 노이즈 타입은 항상 합성
        if (['white', 'pink', 'brown'].includes(type)) {
            this.playSynthSound(type, volume);
            return;
        }

        // Freesound 오디오가 있으면 사용
        if (this.audioElements[type]) {
            this.playFreesound(type, volume);
        } else {
            // 로딩 중이거나 실패한 경우 합성 사운드
            this.playSynthSound(type, volume);
        }
    }

    playFreesound(type, volume) {
        const audio = this.audioElements[type];
        
        if (!this.sounds[type]) {
            this.sounds[type] = {
                type: 'freesound',
                audio: audio
            };
            audio.play().catch(() => {
                // 재생 실패 시 합성 사운드로 폴백
                delete this.sounds[type];
                this.playSynthSound(type, volume);
            });
        }
        
        audio.volume = volume * this.masterVolume;
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

        if (sound.type === 'freesound') {
            sound.audio.pause();
            sound.audio.currentTime = 0;
        } else if (sound.type === 'synth') {
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
            
            // Freesound 오디오 볼륨 조절
            Object.entries(this.sounds).forEach(([type, sound]) => {
                if (sound.type === 'freesound') {
                    const slider = document.querySelector(`[data-sound="${type}"] .volume-slider`);
                    const vol = parseInt(slider.value) / 100;
                    sound.audio.volume = vol * this.masterVolume;
                }
            });
            
            // Synth 오디오 볼륨 조절
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
        document.getElementById('premium-btn').addEventListener('click', () => {
            this.showAd(() => this.showPremiumContent());
        });
    }

    showAd(callback) {
        const modal = document.getElementById('interstitial-ad');
        const btn = document.getElementById('close-ad');
        const countdown = document.getElementById('countdown');

        modal.classList.remove('hidden');
        btn.disabled = true;
        let sec = 5;
        countdown.textContent = sec;

        const timer = setInterval(() => {
            sec--;
            countdown.textContent = sec;
            if (sec <= 0) {
                clearInterval(timer);
                btn.disabled = false;
                btn.textContent = '닫기';
                btn.onclick = () => {
                    modal.classList.add('hidden');
                    btn.textContent = '닫기 (5)';
                    callback();
                };
            }
        }, 1000);
    }

    showPremiumContent() {
        const loadedCount = Object.keys(this.soundPreviews).length;
        
        const tips = `🌙 수면 전문가 팁

━━━━━━━━━━━━━━━━━━━━
🎵 사운드 소스 정보

Freesound.org에서 제공하는 고품질 사운드
로드된 사운드: ${loadedCount}개
라이선스: CC0 (퍼블릭 도메인) / CC-BY

━━━━━━━━━━━━━━━━━━━━
💤 최적의 수면 환경

1. 온도: 18-22°C
2. 조명: 취침 1시간 전 조도 낮추기
3. 소음: 일정한 배경음으로 돌발 소음 차단
4. 습도: 40-60% 유지

━━━━━━━━━━━━━━━━━━━━
🎵 소리별 효과

🟫 브라운노이즈: 깊은 수면에 최적
🩷 핑크노이즈: 기억력 향상, 얕은 수면 개선
🌧️ 비: 스트레스 감소
🌊 파도: 명상, 심박수 안정
🔥 모닥불: 원초적 안정감

━━━━━━━━━━━━━━━━━━━━
🔬 권장 조합

😴 수면: 비 40% + 브라운 25% + 파도 20%
🎯 집중: 카페 30% + 핑크 20%
🧘 명상: 파도 40% + 바람 25%

━━━━━━━━━━━━━━━━━━━━
📊 현재 시간 기준 추천

${new Date().toLocaleTimeString('ko-KR')}

${new Date().getHours() >= 22 || new Date().getHours() < 6
    ? "🌙 수면 모드: 비 40% + 브라운 25% + 파도 20%"
    : new Date().getHours() >= 9 && new Date().getHours() < 18
    ? "🎯 집중 모드: 카페 30% + 핑크 20%"
    : "🧘 휴식 모드: 파도 40% + 바람 25%"}

━━━━━━━━━━━━━━━━━━━━
📜 저작자 표시 (CC-BY)

${this.credits || '모든 사운드가 CC0 라이선스입니다.'}`;

        document.getElementById('premium-content').textContent = tips;
        document.getElementById('premium-result').classList.remove('hidden');
        document.getElementById('premium-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new WhiteNoiseApp());

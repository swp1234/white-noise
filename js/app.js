// 백색소음 플레이어 - 안전한 합성 사운드 버전 (API Key 없음, 상업 사용 가능)
class WhiteNoiseApp {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.isPlaying = false;
        this.masterVolume = 0.8;
        this.masterGain = null;
        this.timer = null;
        this.timerMinutes = 0;
        this.timerRemaining = 0;
        this.init();
    }

    init() {
        this.setupSoundCards();
        this.setupPresets();
        this.setupTimerControls();
        this.setupMasterControls();
        this.setupPremiumButton();
        this.registerServiceWorker();
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

    // ========================================
    // 고급 합성 사운드 시스템 (100% 로열티 프리)
    // ========================================

    playSound(type, volume) {
        if (this.sounds[type]) {
            this.sounds[type].gainNode.gain.setTargetAtTime(
                volume, this.audioContext.currentTime, 0.1
            );
            return;
        }

        const config = this.getSoundConfig(type);
        this.sounds[type] = this.createLayeredSound(config, volume);
    }

    getSoundConfig(type) {
        // 모든 사운드는 100% 합성 - 상업적 사용 완전 허용
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

            // === 자연 소리 (고급 합성) ===
            rain: {
                layers: [
                    // 빗방울 떨어지는 소리
                    { noise: 'pink', gain: 0.5, filters: [
                        { type: 'bandpass', freq: 2500, Q: 0.8 }
                    ]},
                    // 배경 물소리
                    { noise: 'brown', gain: 0.3, filters: [
                        { type: 'lowpass', freq: 400 }
                    ], lfo: { freq: 0.1, depth: 0.2 }},
                    // 빗방울 디테일
                    { noise: 'white', gain: 0.25, filters: [
                        { type: 'highpass', freq: 5000 },
                        { type: 'lowpass', freq: 12000 }
                    ], lfo: { freq: 0.3, depth: 0.4 }}
                ]
            },
            thunder: {
                layers: [
                    // 깊은 울림
                    { noise: 'brown', gain: 0.9, filters: [
                        { type: 'lowpass', freq: 100, Q: 2 }
                    ], lfo: { freq: 0.02, depth: 0.7 }},
                    // 중저음
                    { noise: 'brown', gain: 0.4, filters: [
                        { type: 'bandpass', freq: 60, Q: 1 }
                    ]}
                ]
            },
            wind: {
                layers: [
                    // 바람 휘파람
                    { noise: 'pink', gain: 0.5, filters: [
                        { type: 'bandpass', freq: 500, Q: 0.3 }
                    ], lfo: { freq: 0.06, depth: 0.5 }},
                    // 저음 바람
                    { noise: 'brown', gain: 0.35, filters: [
                        { type: 'lowpass', freq: 250 }
                    ], lfo: { freq: 0.04, depth: 0.4 }},
                    // 고음 바람
                    { noise: 'white', gain: 0.15, filters: [
                        { type: 'bandpass', freq: 3000, Q: 0.5 }
                    ], lfo: { freq: 0.1, depth: 0.6 }}
                ]
            },
            forest: {
                layers: [
                    // 잎사귀 소리
                    { noise: 'pink', gain: 0.4, filters: [
                        { type: 'bandpass', freq: 1200, Q: 0.4 }
                    ], lfo: { freq: 0.15, depth: 0.3 }},
                    // 배경 ambient
                    { noise: 'brown', gain: 0.2, filters: [
                        { type: 'lowpass', freq: 300 }
                    ]},
                    // 공기 소리
                    { noise: 'white', gain: 0.15, filters: [
                        { type: 'highpass', freq: 4000 },
                        { type: 'lowpass', freq: 8000 }
                    ], lfo: { freq: 0.2, depth: 0.35 }}
                ]
            },
            birds: {
                layers: [
                    // 새소리 시뮬레이션 (고음)
                    { noise: 'white', gain: 0.35, filters: [
                        { type: 'bandpass', freq: 4500, Q: 3 }
                    ], lfo: { freq: 0.8, depth: 0.8 }},
                    // 배경
                    { noise: 'pink', gain: 0.2, filters: [
                        { type: 'bandpass', freq: 3000, Q: 1.5 }
                    ], lfo: { freq: 0.5, depth: 0.6 }}
                ]
            },
            ocean: {
                layers: [
                    // 파도 (저음)
                    { noise: 'brown', gain: 0.6, filters: [
                        { type: 'lowpass', freq: 400 }
                    ], lfo: { freq: 0.05, depth: 0.6 }},
                    // 파도 (중음)
                    { noise: 'pink', gain: 0.4, filters: [
                        { type: 'bandpass', freq: 800, Q: 0.5 }
                    ], lfo: { freq: 0.07, depth: 0.5 }},
                    // 물거품
                    { noise: 'white', gain: 0.2, filters: [
                        { type: 'highpass', freq: 3000 },
                        { type: 'lowpass', freq: 8000 }
                    ], lfo: { freq: 0.1, depth: 0.5 }}
                ]
            },
            fire: {
                layers: [
                    // 불꽃 터지는 소리
                    { noise: 'pink', gain: 0.45, filters: [
                        { type: 'bandpass', freq: 600, Q: 0.6 }
                    ], lfo: { freq: 0.5, depth: 0.4 }},
                    // 저음 울림
                    { noise: 'brown', gain: 0.35, filters: [
                        { type: 'lowpass', freq: 200 }
                    ]},
                    // 불꽃 디테일
                    { noise: 'white', gain: 0.25, filters: [
                        { type: 'bandpass', freq: 2000, Q: 0.8 }
                    ], lfo: { freq: 0.7, depth: 0.5 }}
                ]
            },
            river: {
                layers: [
                    // 물 흐르는 소리
                    { noise: 'pink', gain: 0.5, filters: [
                        { type: 'bandpass', freq: 1800, Q: 0.5 }
                    ], lfo: { freq: 0.12, depth: 0.25 }},
                    // 물 튀기는 소리
                    { noise: 'white', gain: 0.3, filters: [
                        { type: 'highpass', freq: 3000 },
                        { type: 'lowpass', freq: 7000 }
                    ], lfo: { freq: 0.18, depth: 0.35 }},
                    // 저음 물소리
                    { noise: 'brown', gain: 0.25, filters: [
                        { type: 'lowpass', freq: 500 }
                    ]}
                ]
            },
            waterfall: {
                layers: [
                    // 폭포 메인
                    { noise: 'white', gain: 0.5, filters: [
                        { type: 'bandpass', freq: 2500, Q: 0.4 }
                    ]},
                    // 물 충돌
                    { noise: 'pink', gain: 0.4, filters: [
                        { type: 'bandpass', freq: 1200, Q: 0.5 }
                    ]},
                    // 저음 울림
                    { noise: 'brown', gain: 0.35, filters: [
                        { type: 'lowpass', freq: 300 }
                    ], lfo: { freq: 0.08, depth: 0.2 }}
                ]
            },
            crickets: {
                layers: [
                    // 귀뚜라미 울음 시뮬레이션
                    { noise: 'white', gain: 0.3, filters: [
                        { type: 'bandpass', freq: 5500, Q: 8 }
                    ], lfo: { freq: 3, depth: 0.85 }},
                    // 배경
                    { noise: 'pink', gain: 0.15, filters: [
                        { type: 'highpass', freq: 3000 },
                        { type: 'lowpass', freq: 6000 }
                    ], lfo: { freq: 2, depth: 0.7 }}
                ]
            },

            // === 생활 소리 ===
            cafe: {
                layers: [
                    // 사람들 웅성거림
                    { noise: 'pink', gain: 0.4, filters: [
                        { type: 'bandpass', freq: 800, Q: 0.3 }
                    ], lfo: { freq: 0.2, depth: 0.25 }},
                    // 컵/접시 소리
                    { noise: 'white', gain: 0.2, filters: [
                        { type: 'bandpass', freq: 3500, Q: 1 }
                    ], lfo: { freq: 0.4, depth: 0.5 }},
                    // 배경
                    { noise: 'brown', gain: 0.2, filters: [
                        { type: 'lowpass', freq: 400 }
                    ]}
                ]
            },
            keyboard: {
                layers: [
                    // 타이핑 클릭
                    { noise: 'white', gain: 0.35, filters: [
                        { type: 'bandpass', freq: 3000, Q: 2 }
                    ], lfo: { freq: 4, depth: 0.75 }},
                    // 키보드 저음
                    { noise: 'pink', gain: 0.2, filters: [
                        { type: 'bandpass', freq: 800, Q: 1 }
                    ], lfo: { freq: 3, depth: 0.6 }}
                ]
            },
            train: {
                layers: [
                    // 레일 리듬
                    { noise: 'brown', gain: 0.6, filters: [
                        { type: 'lowpass', freq: 150 }
                    ], lfo: { freq: 1.5, depth: 0.4 }},
                    // 철로 마찰
                    { noise: 'pink', gain: 0.3, filters: [
                        { type: 'bandpass', freq: 300, Q: 0.8 }
                    ], lfo: { freq: 1.5, depth: 0.3 }}
                ]
            },
            fan: {
                layers: [
                    // 선풍기 바람
                    { noise: 'pink', gain: 0.6, filters: [
                        { type: 'bandpass', freq: 180, Q: 0.4 }
                    ], lfo: { freq: 0.02, depth: 0.1 }},
                    // 모터 소리
                    { noise: 'brown', gain: 0.3, filters: [
                        { type: 'lowpass', freq: 100 }
                    ]}
                ]
            },
            aircon: {
                layers: [
                    // 에어컨 바람
                    { noise: 'pink', gain: 0.55, filters: [
                        { type: 'lowpass', freq: 400 }
                    ]},
                    // 콤프레서 저음
                    { noise: 'brown', gain: 0.4, filters: [
                        { type: 'lowpass', freq: 80 }
                    ]}
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

        // 노이즈 버퍼 생성
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

        // 레이어 게인
        const layerGain = this.audioContext.createGain();
        layerGain.gain.value = config.gain;

        let lastNode = source;

        // 필터 체인
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

        // LFO (진폭 변조)
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

        sound.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.3);

        setTimeout(() => {
            sound.layers.forEach(layer => {
                try { 
                    layer.source.stop(); 
                    if (layer.lfo) layer.lfo.stop();
                } catch (e) {}
            });
            delete this.sounds[type];
        }, 500);
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

        slider.addEventListener('input', (e) => {
            this.masterVolume = parseInt(e.target.value) / 100;
            valueDisplay.textContent = `${e.target.value}%`;
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
        const tips = `🌙 수면 전문가 팁

━━━━━━━━━━━━━━━━━━━━
✅ 라이선스 정보

모든 사운드는 Web Audio API로 합성됩니다.
100% 로열티 프리 - 상업적 사용 가능
외부 API 의존성 없음

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
    : "🧘 휴식 모드: 파도 40% + 바람 25%"}`;

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

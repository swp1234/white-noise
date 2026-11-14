class I18n {
    constructor() {
        this.translations = {};
        this.supportedLanguages = ['ko', 'en', 'ja', 'es', 'pt', 'zh', 'id', 'tr', 'de', 'fr', 'hi', 'ru'];
        this.currentLang = this.detectLanguage();
        document.documentElement.lang = this.currentLang;
    }

    detectLanguage() {
        try {
            const params = new URLSearchParams(window.location.search || '');
            const urlLang = params.get('lang');
            if (urlLang && this.supportedLanguages.includes(urlLang)) return urlLang;
        } catch (e) {}
        const savedLang = localStorage.getItem('app_language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) return savedLang;
        const browserLang = (navigator.language || navigator.userLanguage).split('-')[0];
        if (this.supportedLanguages.includes(browserLang)) return browserLang;
        return 'en';
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`js/locales/${lang}.json`);
            if (!response.ok) throw new Error('Not found');
            this.translations[lang] = await response.json();
            return true;
        } catch (e) {
            if (lang !== 'en') return this.loadTranslations('en');
            return false;
        }
    }

    t(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];
        for (const k of keys) {
            if (value && value[k]) value = value[k];
            else return key;
        }
        return value;
    }

    getSeoHref(lang) {
        if (!lang || lang === 'x-default' || lang === 'en') {
            return 'https://dopabrain.com/white-noise/';
        }
        return `https://dopabrain.com/white-noise/?lang=${lang}`;
    }

    syncSeoState(lang, updateHistory = false) {
        const canonicalHref = this.getSeoHref(lang);
        const canonicalEl = document.querySelector('link[rel="canonical"]');
        if (canonicalEl) canonicalEl.href = canonicalHref;

        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.content = canonicalHref;

        document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => {
            const hreflang = link.getAttribute('hreflang');
            link.href = this.getSeoHref(hreflang === 'x-default' ? 'x-default' : hreflang);
        });

        if (updateHistory) {
            const nextUrl = new URL(window.location.href);
            if (lang === 'en') {
                nextUrl.searchParams.delete('lang');
            } else {
                nextUrl.searchParams.set('lang', lang);
            }
            if (window.location.search !== nextUrl.search) {
                window.history.replaceState({}, '', nextUrl.pathname + nextUrl.search + nextUrl.hash);
            }
        }
    }

    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) return false;
        if (!this.translations[lang]) await this.loadTranslations(lang);
        this.currentLang = lang;
        try { localStorage.setItem('app_language', lang); } catch (e) {}
        document.documentElement.lang = lang;
        this.syncSeoState(lang, true);
        this.updateUI();
        return true;
    }

    updateUI() {
        document.documentElement.lang = this.currentLang;
        this.syncSeoState(this.currentLang, false);
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const val = this.t(key);
            if (val && val !== key) el.textContent = val;
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const val = this.t(key);
            if (val && val !== key) el.placeholder = val;
        });
        const title = this.t('app.title');
        if (title && title !== 'app.title') document.title = title;
        const meta = document.querySelector('meta[name="description"]');
        const desc = this.t('app.description');
        if (meta && desc && desc !== 'app.description') meta.content = desc;
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    getLanguageName(lang) {
        const names = {
            'ko': '한국어',
            'en': 'English',
            'ja': '日本語',
            'es': 'Español',
            'pt': 'Português',
            'zh': '简体中文',
            'id': 'Bahasa Indonesia',
            'tr': 'Türkçe',
            'de': 'Deutsch',
            'fr': 'Français',
            'hi': 'हिन्दी',
            'ru': 'Русский'
        };
        return names[lang] || lang;
    }
}

const i18n = new I18n();
window.i18n = i18n;

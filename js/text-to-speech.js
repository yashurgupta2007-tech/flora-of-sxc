window.FloraSpeech = (() => {
    let currentUtterances = [];
    let isPaused = false;

    function isSupported() {
        return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    }

    function createController() {
        if (document.getElementById('speech-controller')) return;

        const controller = document.createElement('div');
        controller.id = 'speech-controller';
        controller.className = 'speech-controller';
        controller.hidden = true;

        controller.innerHTML = `
        <span class="speech-status" aria-live="polite">Reading plant information...</span>
        <button type="button" id="speech-pause" aria-label="Pause narration">
        <i class="fa-solid fa-pause"></i></button>
        <button type="button" id="speech-stop" aria-label="Stop narration">
        <i class="fa-solid fa-stop"></i></button>`;

        document.body.appendChild(controller);

        document.getElementById('speech-pause').addEventListener('click', togglePause);
        document.getElementById('speech-stop').addEventListener('click', stop);
    }

    function chooseVoice() {
        const voices = speechSynthesis.getVoices();

        return voices.find(voice => voice.lang.toLowerCase() === 'en-in') || voices.find(voice => voice.lang.toLowerCase().startsWith('en-gb')) || voices.find(voice => voice.lang.toLowerCase().startsWith('en')) || null;
    }

    function speakFields(fields) {
        if (!isSupported()) {
            alert('Text-to-speech is not supported by this browser.');
            return;
        }

        const validFields = fields.filter(field => 
            field.text !== null && field.text !== undefined && String(field.text).trim() !== ''
        );

        if (!validFields.length) return;

        stop();
        createController();

        const controller = document.getElementById('speech-controller');
        const status = controller.querySelector('.speech-status');
        controller.hidden = false;

        currentUtterances = validFields.map(field=> {
            const utterance = new SpeechSynthesisUtterance(`${field.label}. ${field.text}`);
            const voice = chooseVoice();
            if (voice) utterance.voice = voice;
            utterance.lang = voice?.lang || 'en-IN';
            utterance.rate = 0.95;
            utterance.pitch = 1;
            utterance.onstart = () => {
                status.textContent = `Reading: ${field.label}`;
            };
            utterance.onend = () => {
                if (utterance === currentUtterances.at(-1)) {
                    controller.hidden = true;
                    currentUtterances = [];
                    isPaused = false;
                }
            };
            return utterance;
        });

        currentUtterances.forEach(utterance => {
            speechSynthesis.speak(utterance);
        });
    }

    function speakText(text, label = 'Plant information') {
        speakFields([{ label, text }]);
    }

    function togglePause() {
        if (!isSupported()) return;
        const button = document.getElementById('speech-pause');
        const icon = button?.querySelector('i');

        if (speechSynthesis.paused) {
            speechSynthesis.resume();
            isPaused = false;
            if (icon) icon.className = 'fa-solid fa-pause';
            button?.setAttribute('aria-label', 'Pause narration');
        } else if (speechSynthesis.speaking) {
            speechSynthesis.pause();
            isPaused = true;
            if (icon) icon.className = 'fa-solid fa-play';
            button?.setAttribute('aria-label', 'Resume narration');
        }
    }

    function stop() {
        if (isSupported()) {
            speechSynthesis.cancel();
        }
        currentUtterances = [];
        isPaused = false;
        const controller = document.getElementById('speech-controller');
        if (controller) controller.hidden = true;
    }

    return {
        speakText, speakFields, 
        pause: () => speechSynthesis.pause(),
        resume: () => speechSynthesis.resume(),
        stop
    };
})();
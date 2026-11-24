// Configuración global, constantes, logros, etapas de carrera y utilidades base

const USERS_KEY = 'harmonicBlockProUsers';
const USER_DATA_PREFIX = 'harmonicBlockProData_';

const ACHIEVEMENTS_DEF = [
    { id: 'first_blood', name: 'Primeros Pasos', desc: 'Completa tu primer ejercicio con éxito.', condition: (stats) => stats.totalExercises >= 1, icon: '🌟' },
    { id: 'streak_3', name: 'Constancia', desc: 'Alcanza una racha de 3 días practicando.', condition: (stats) => stats.maxStreak >= 3, icon: '🔥' },
    { id: 'streak_7', name: 'Imparable', desc: 'Alcanza una racha de 7 días practicando.', condition: (stats) => stats.maxStreak >= 7, icon: '🚀' },
    { id: 'notes_100', name: 'Buen Oído', desc: 'Acierta 100 notas con tu instrumento.', condition: (stats) => stats.totalCorrect >= 100, icon: '🎵' },
    { id: 'notes_500', name: 'Maestro Lector', desc: 'Acierta 500 notas con tu instrumento.', condition: (stats) => stats.totalCorrect >= 500, icon: '🎸' },
    { id: 'daily_hero', name: 'Héroe Diario', desc: 'Completa un Reto Diario.', condition: (stats) => stats.dailyChallengesCompleted >= 1, icon: '⭐' },
    { id: 'night_owl', name: 'Noctámbulo', desc: 'Completa un ejercicio después de las 10:00 PM.', condition: (stats) => stats.nightOwlUnlocked === true, icon: '🦉' },
    { id: 'mastermind', name: 'Mente Maestra', desc: 'Logra 100% de precisión en nivel Avanzado.', condition: (stats) => stats.mastermindUnlocked === true, icon: '🧠' },
    { id: 'harmonist', name: 'Armonista', desc: 'Acierta 50 acordes en modo Armonía.', condition: (stats) => (stats.harmonyCorrect || 0) >= 50, icon: '🎹' },
    { id: 'career_grad', name: 'Graduado', desc: 'Supera una etapa del Modo Carrera.', condition: (stats) => (stats.completedCampaignStages || []).length >= 1, icon: '🎓' }
];

const CAMPAIGN_STAGES = [
    { id: 'stage_1', title: 'Etapa 1: Cuerdas y Posición Abierta', desc: 'Melodía • Nivel Básico • Trastes 0-IV • Solo Negras (60 BPM)', type: 'melodia', diff: 'basico', fret: '0-4', rhythm: 'quarters', bpm: 60, measures: '5' },
    { id: 'stage_2', title: 'Etapa 2: Control de Duración', desc: 'Melodía • Nivel Básico • Blancas y Negras (70 BPM)', type: 'melodia', diff: 'basico', fret: '0-4', rhythm: 'halves_quarters', bpm: 70, measures: '10' },
    { id: 'stage_3', title: 'Etapa 3: Explorando Posición V y Silencios', desc: 'Melodía • Nivel Medio • Trastes V-VIII • Negras y Silencios (75 BPM)', type: 'melodia', diff: 'medium', fret: '5-8', rhythm: 'with_rests', bpm: 75, measures: '10' },
    { id: 'stage_4', title: 'Etapa 4: Subdivisión con Corcheas', desc: 'Melodía • Nivel Medio • Negras y Corcheas (80 BPM)', type: 'melodia', diff: 'medium', fret: '1-4', rhythm: 'eighths_quarters', bpm: 80, measures: '10' },
    { id: 'stage_5', title: 'Etapa 5: Lectura Armónica Dual', desc: 'Armonía (2 voces - Intervalos) • Nivel Medio (70 BPM)', type: 'armonia', notesPerChord: 2, diff: 'medium', fret: 'all', rhythm: 'quarters', bpm: 70, measures: '10' },
    { id: 'stage_6', title: 'Etapa 6: Maestro de Cadencias (II-V-I)', desc: 'Armonía (4 voces - Jazz II-V-I) • Nivel Avanzado (80 BPM)', type: 'armonia', notesPerChord: 4, progression: '2-5-1', diff: 'advanced', fret: 'all', rhythm: 'quarters', bpm: 80, measures: '10' }
];

let ui, state, audio, notesData, currentUser, userData;
let seededRNG = null;

function randomFloat() {
    if (seededRNG !== null) {
        let t = seededRNG += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    return Math.random();
}

function getLocalISODate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const FORBIDDEN_ENHARMONICS = new Set(['Fb', 'B#', 'E#', 'Cb']);

// Referencias DOM, estado de la aplicación y datos musicales/diapasón

function initializeElements() {
    const get = (id) => { 
        const el = document.getElementById(id); 
        if (!el) {
            const placeholder = document.createElement('div');
            placeholder.id = id; placeholder.style.display = 'none';
            document.body.appendChild(placeholder);
            return placeholder;
        }
        return el; 
    };
    ui = {
        loadingMessage: get('loading-message'), mainContent: get('main-content'), startStopButton: get('startStopButton'),
        pauseResumeButton: get('pauseResumeButton'), displayArea: get('displayArea'), tempoInput: get('tempo'), metronomeCount: get('metronomeCount'),
        staveContainer: get('stave-container'), clefSelect: get('clef-select'), timeSigSelect: get('time-signature-select'),
        measuresSelect: get('measures-select'), measuresCount: get('measuresCount'), customMeasuresContainer: get('custom-measures-input-container'),
        customMeasuresInput: get('custom-measures-input'), preRollMessage: get('pre-roll-message'), difficultySelect: get('difficulty-select'),
        optMedium: get('opt-medium'), optAdvanced: get('opt-advanced'),
        changeBeatSelect: get('change-beat-select'), showTutorialBtn: get('show-tutorial'), tutorialModal: get('tutorial-modal'),
        closeModalBtn: get('close-modal'), tutorialStepsContainer: get('tutorial-steps-container'), nextTutorialStepBtn: get('next-tutorial-step'),
        prevTutorialStepBtn: get('prev-tutorial-step'), tutorialStepCounter: get('tutorial-step-counter'),
        tutorialHighlight: get('tutorial-highlight-overlay'), preRollCount: get('preRollCount'), showNoteNamesToggle: get('show-note-names'),
        exerciseTypeRadios: document.querySelectorAll('input[name="exerciseType"]'), harmonyOptionsContainer: get('harmony-options-container'),
        notesPerChordSelect: get('notes-per-chord'), changeBeatContainer: get('change-beat-control'), intervalOptionsContainer: get('interval-options-container'),
        intervalSelect: get('interval-select'), triadOptionsContainer: get('triad-options-container'), triadSelect: get('triad-select'),
        triadPositionContainer: get('triad-position-container'), triadPositionSelect: get('triad-position-select'),
        quadOptionsContainer: get('quad-options-container'), quadVoicingSelect: get('quad-voicing-select'),
        quadInversionContainer: get('quad-inversion-container'), quadInversionSelect: get('quad-inversion-select'),
        quadChordTypeContainer: get('quad-chord-type-container'), quadChordTypeSelect: get('quad-chord-type-select'),
        keySigSelect: get('key-signature-select'), cipherTypeContainer: get('cipher-type-container'), cipherTypeSelect: get('cipher-type-select'),
        keySigContainer: get('key-signature-container'), melodyNoteNameOptionsContainer: get('melody-note-name-options-container'),
        melodyNoteNameStyleSelect: get('melody-note-name-style-select'), showGuideToggle: get('show-guide'),
        timeSigContainer: get('time-signature-container'), mainDisplayArea: get('main-display-area'), 
        staveViewer: get('stave-viewer'), fullscreenToggle: get('fullscreen-toggle'), enterFullscreenIcon: get('enter-fullscreen-icon'), exitFullscreenIcon: get('exit-fullscreen-icon'),
        toggleInfoBtn: get('toggle-info-btn'), infoVisibleIcon: get('info-visible-icon'), infoHiddenIcon: get('info-hidden-icon'),
        customIntervalModal: get('custom-interval-modal'), closeIntervalModalBtn: get('close-interval-modal'), intervalCheckboxes: get('interval-checkboxes'), cancelIntervalSelectionBtn: get('cancel-interval-selection'), saveIntervalSelectionBtn: get('save-interval-selection'),
        customTriadModal: get('custom-triad-modal'), closeTriadModalBtn: get('close-triad-modal'), triadCheckboxes: get('triad-checkboxes'), cancelTriadSelectionBtn: get('cancel-triad-selection'), saveTriadSelectionBtn: get('save-triad-selection'),
        customVoicingModal: get('custom-voicing-modal'), closeVoicingModalBtn: get('close-voicing-modal'), voicingCheckboxes: get('voicing-checkboxes'), cancelVoicingSelectionBtn: get('cancel-voicing-selection'), saveVoicingSelectionBtn: get('save-voicing-selection'),
        customQuadChordTypeModal: get('custom-quad-chord-type-modal'), closeQuadChordTypeModalBtn: get('close-quad-chord-type-modal'), quadChordTypeCheckboxes: get('quad-chord-type-checkboxes'), cancelQuadChordTypeSelectionBtn: get('cancel-quad-chord-type-selection'), saveQuadChordTypeSelectionBtn: get('save-quad-chord-type-selection'),
        customQuadInversionModal: get('custom-quad-inversion-modal'), closeQuadInversionModalBtn: get('close-quad-inversion-modal'), quadInversionCheckboxes: get('quad-inversion-checkboxes'), cancelQuadInversionSelectionBtn: get('cancel-quad-inversion-selection'), saveQuadInversionSelectionBtn: get('save-quad-inversion-selection'),
        showFretboardToggle: get('show-fretboard'), enableSoundToggle: get('enable-sound'), fretboardContainer: get('fretboard-container'), soundControlContainer: get('sound-control-container'), fretboardControlContainer: get('fretboard-control-container'),
        enharmonicSelect: get('enharmonic-select'), enharmonicControlContainer: get('enharmonic-control-container'), enableMetronome: get('enable-metronome'), noteVolume: get('note-volume'), metronomeVolume: get('metronome-volume'), metronomeSoundSelect: get('metronome-sound-select'), audioControlsContainer: get('audio-controls-container'), userDisplay: get('user-display'), streakDisplay: get('streak-display'), changeUserButton: get('change-user-button'), historyButton: get('history-button'), historyModal: get('history-modal'), closeHistoryModal: get('close-history-modal'), historyTableBody: get('history-table-body'), noHistoryMessage: get('no-history-message'),
        exportBtn: get('export-button'), importBtn: get('import-button'), importInput: get('import-file'), exportImportMsg: get('export-import-msg'),
        enableMicToggle: get('enable-mic'), micControlContainer: get('mic-control-container'), 
        resultsModal: get('results-modal'), closeResultsBtn: get('close-results-btn'), resultsTotal: get('results-total'), resultsCorrect: get('results-correct'), resultsMissed: get('results-missed'), resultsPercentage: get('results-score-percentage'),
        resultsXpEarned: get('results-xp-earned'), resultsTitle: get('results-title'), resultsSubtitle: get('results-subtitle'),
        micDetectedNote: get('mic-detected-note'), showTunerBtn: get('show-tuner-btn'), tunerModal: get('tuner-modal'), closeTunerBtn: get('close-tuner-btn'), tunerNoteDisplay: get('tuner-note-display'), tunerCentsDisplay: get('tuner-cents-display'), tunerNeedleGroup: get('tuner-needle-group'), tunerHzDisplay: get('tuner-hz-display'),
        missedNotesFilter: get('missed-notes-filter'), themeToggleBtn: get('theme-toggle-btn'), 
        achievementsButton: get('achievements-button'), achievementsModal: get('achievements-modal'), closeAchievementsModal: get('close-achievements-modal'), achievementsList: get('achievements-list'),
        dailyChallengeBtn: get('daily-challenge-btn'), currentXp: get('current-xp'), nextLevelXp: get('next-level-xp'), xpProgressBar: get('xp-progress-bar'),
        survivalModeBtn: get('survival-mode-btn'), survivalHeartsContainer: get('survival-hearts'), heatmapButton: get('heatmap-button'), heatmapModal: get('heatmap-modal'), closeHeatmapModal: get('close-heatmap-modal'), heatmapGrid: get('heatmap-grid'),
        fretPositionSelect: get('fret-position-select'), fretPositionContainer: get('fret-position-container'),
        rhythmOptionsContainer: get('rhythm-options-container'), rhythmSelect: get('rhythm-select'),
        chromaticOptionsContainer: get('chromatic-options-container'), chromaticSelect: get('chromatic-select'),
        chromaticAccidentalContainer: get('chromatic-accidental-container'), chromaticAccidentalSelect: get('chromatic-accidental-select'),
        tapTempoBtn: get('tap-tempo-btn'), beatLedsContainer: get('beat-leds-container'),
        kpiTotalSessions: get('kpi-total-sessions'), kpiTotalCorrect: get('kpi-total-correct'),
        kpiAvgAccuracy: get('kpi-avg-accuracy'), kpiCareerProgress: get('kpi-career-progress'),
        harmonyProgressionContainer: get('harmony-progression-container'), harmonyProgressionSelect: get('harmony-progression-select'),
        synthTypeSelect: get('synth-type-select'), enableMidiToggle: get('enable-midi'),
        speedTrainerToggle: get('speed-trainer-toggle'), waitModeToggle: get('wait-mode-toggle'),
        micSettingsPanel: get('mic-settings-panel'), micSettingsBody: get('mic-settings-body'),
        micPanelToggleBtn: get('mic-panel-toggle-btn'), micDeviceSelect: get('mic-device-select'),
        micSensitivitySlider: get('mic-sensitivity-slider'), micSensitivityVal: get('mic-sensitivity-val'),
        micToleranceSelect: get('mic-tolerance-select'), micLatencySlider: get('mic-latency-slider'),
        micLatencyVal: get('mic-latency-val'), micCalibrateBtn: get('mic-calibrate-btn'),
        micLevelBar: get('mic-level-bar'), micLevelStatus: get('mic-level-status'),
        micLiveCents: get('mic-live-cents'), micHeadphonesWarning: get('mic-headphones-warning'),
        micBassModeBadge: get('mic-bass-mode-badge'), micRequintoBadge: get('mic-requinto-badge'),
        micEchoCancelToggle: get('mic-echo-cancel-toggle'), waitHearNoteBtn: get('wait-hear-note-btn'),
        instrumentSelect: get('instrument-select'), notationSystemSelect: get('notation-system-select'),
        tunerTuningHint: get('tuner-tuning-hint'),
        configPanelBody: get('config-panel-body'), toggleConfigPanelBtn: get('toggle-config-panel-btn'),
        configSummaryPill: get('config-summary-pill'),
        weaknessesModeBtn: get('weaknesses-mode-btn'), sessionRecordingContainer: get('session-recording-container'), sessionAudioPlayer: get('session-audio-player'),
        campaignModeBtn: get('campaign-mode-btn'), campaignModal: get('campaign-modal'), closeCampaignModal: get('close-campaign-modal'), campaignStagesList: get('campaign-stages-list')
    };
}

function initializeAppState() {
    state = { 
        exerciseStartTime: null, exerciseType: 'melodia', notesPerChord: 3, selectedInterval: 0, selectedTriad: 'all', triadPosition: 'all',
        selectedQuadVoicing: 'all', selectedQuadChordType: 'all', selectedQuadInversion: 'all', cipherType: 'todos', melodyNoteNameStyle: 'con-alteracion',
        exerciseStarted: false, isPlaying: false, isPaused: false, metronomeTimer: null, exerciseMeasures: [], 
        timeSignatureBeats: 4, measuresChangeBeat: 4, measuresPerExercise: 10, showNoteNames: false, keySignature: 'C',
        showGuide: false, notePositionsX: [], lastScale: 1, spacebarPressCount: 0, spacebarTimeout: null,
        selectedCustomIntervals: new Set(['2', '3', '4', '5', '6', '7']), selectedCustomTriads: new Set(['triad_fundamental', 'triad_inv1', 'triad_inv2', 'shell_voicing']), selectedCustomVoicings: new Set(['drop2', 'drop3']), selectedCustomQuadChordTypes: new Set(['maj7', 'm7', 'dom7']), selectedCustomQuadInversions: new Set(['0', '1', '2', '3']),
        lastMelodicNote: null, showFretboard: false, soundEnabled: false, metronomeEnabled: true, noteVolume: 0.3, metronomeVolume: 0.6, metronomeSound: 'classic', displayedMeasureContent: [], enharmonicPreference: 'auto',
        manualNotesToDisplay: null,
        logicalMetronomeCount: 0, logicalSubBeat: 0, logicalMeasureIndex: -1, logicalIsPreRoll: false, visualIsPreRoll: false,
        visualQueue: [], activeVisualEvent: null, currentDisplayedContent: null, drawFrameId: null,
        currentVisualBeat: 1, totalPausedTime: 0, pauseStartTimeReal: null, showDisplayInfo: true,
        micEnabled: false, scheduledSynthNotes: [], tunerSoundPlayed: false, tunerLastNote: null,
        tunerSilenceFrames: 0, tunerStableFrames: 0, tunerSmoothedCents: 0, tunerSmoothedHz: 0,
        lastHitPitchClass: null, lastHitKey: null, micSilenceSinceLastHit: true,
        silenceFramesCount: 0, lastEvaluatedPitchClass: null,
        score: { total: 0, hits: new Set(), status: {}, reason: {}, expectedNotes: {} },
        isDailyChallenge: false, isSurvivalMode: false, survivalHearts: 3,
        fretPosition: 'all', rhythmMode: 'quarters', chromaticMode: 'none', chromaticAccidentalType: 'both', tapTimes: [],
        harmonyProgression: 'random', synthType: 'guitar',
        midiEnabled: false, activeMidiNotes: new Set(),
        speedTrainer: false, waitMode: false, waitModeFrozen: false, isWeaknessMode: false,
        consecutivePerfectMeasures: 0, mediaRecorder: null, recordedChunks: [],
        activeCampaignStage: null, currentRenderKey: null, pitchHistory: [],
        micDeviceId: '', micSensitivity: 1.2, micToleranceCents: 40, micLatencyMs: 0, micEchoCancel: false,
        instrumentType: 'guitar', instrumentTranspose: 0, notationSystem: 'american',
        isCalibratingMic: false, micMonitorRafId: null, micPanelCollapsed: false, configPanelCollapsed: false,
        waitStepMeasure: 0, waitStepIndex: 0, waitStepHitMs: 0, waitStepCooldownUntil: 0,
        waitStepMuteUntil: 0, waitStepNeedsFreshAttack: false,
        waitStepTransitioning: false, waitStepTimer: null,
        lastFramePerfTime: 0, lastAudioFrameTime: 0, lastHitChordClasses: null
    };
    audio = { context: null, micContext: null, noteGain: null, metronomeGain: null, lookahead: 25.0, scheduleAheadTime: 0.15, nextNoteTime: 0.0, pauseStartTime: 0.0, micStream: null, micAnalyser: null, micDataArray: null, micFreqArray: null, micSource: null, micInputGain: null, micFilterHP: null, micFilterMid: null, micFilterLP: null, micSilentSink: null, noiseFloorRms: 0.004, lastPitchCalcMs: 0, cachedPitch: -1 };
    notesData = {
        all: [], natural: [], noteToLatin: {'C':'Do','D':'Re','E':'Mi','F':'Fa','G':'Sol','A':'La','B':'Si'}, letterToDiatonic: {'C':0,'D':1,'E':2,'F':3,'G':4,'A':5,'B':6},
        diatonicTriads: { 'C': ['C', 'E', 'G'], 'D': ['D', 'F', 'A'], 'E': ['E', 'G', 'B'], 'F': ['F', 'A', 'C'], 'G': ['G', 'B', 'D'], 'A': ['A', 'C', 'E'], 'B': ['B', 'D', 'F'] },
        diatonicShellVoicings: { 'C': ['C', 'E', 'B'], 'D': ['D', 'F', 'C'], 'E': ['E', 'G', 'D'], 'F': ['F', 'A', 'E'], 'G': ['G', 'B', 'F'], 'A': ['A', 'C', 'G'], 'B': ['B', 'D', 'A'] },
        allowedFourNoteChords: {
          "C": [ { "name": "Cmaj7", "notes": ["C", "E", "G", "B"] }, { "name": "Cm7", "notes": ["C", "Eb", "G", "Bb"] }, { "name": "C7", "notes": ["C", "E", "G", "Bb"] }, { "name": "Cm7b5", "notes": ["C", "Eb", "Gb", "Bb"] }, { "name": "C°7", "notes": ["C", "Eb", "Gb", "A"] } ],
          "C#": [ { "name": "C#maj7", "notes": ["C#", "E#", "G#", "B#"] }, { "name": "C#m7", "notes": ["C#", "E", "G#", "B"] }, { "name": "C#7", "notes": ["C#", "E#", "G#", "B"] }, { "name": "C#m7b5", "notes": ["C#", "E", "G", "B"] }, { "name": "C#°7", "notes": ["C#", "E", "G", "Bb"] } ],
          "Db": [ { "name": "Dbmaj7", "notes": ["Db", "F", "Ab", "C"] }, { "name": "Dbm7", "notes": ["Db", "Fb", "Ab", "Cb"] }, { "name": "Db7", "notes": ["Db", "F", "Ab", "Cb"] }, { "name": "Db°7", "notes": ["Db", "E", "F", "A"] } ],
          "D": [ { "name": "Dmaj7", "notes": ["D", "F#", "A", "C#"] }, { "name": "Dm7", "notes": ["D", "F", "A", "C"] }, { "name": "D7", "notes": ["D", "F#", "A", "C"] }, { "name": "Dm7b5", "notes": ["D", "F", "Ab", "C"] }, { "name": "D°7", "notes": ["D", "F", "Ab", "B"] } ],
          "Eb": [ { "name": "Ebmaj7", "notes": ["Eb", "G", "Bb", "D"] }, { "name": "Ebm7", "notes": ["Eb", "Gb", "Bb", "Db"] }, { "name": "Eb7", "notes": ["Eb", "G", "Bb", "Db"] }, { "name": "Eb°7", "notes": ["Eb", "Gb", "A", "C"] } ],
          "E": [ { "name": "Emaj7", "notes": ["E", "G#", "B", "D#"] }, { "name": "Em7", "notes": ["E", "G", "B", "D"] }, { "name": "E7", "notes": ["E", "G#", "B", "D"] }, { "name": "Em7b5", "notes": ["E", "G", "Bb", "D"] }, { "name": "E°7", "notes": ["E", "G", "Bb", "Db"] } ],
          "F": [ { "name": "Fmaj7", "notes": ["F", "A", "C", "E"] }, { "name": "Fm7", "notes": ["F", "Ab", "C", "Eb"] }, { "name": "F7", "notes": ["F", "A", "C", "Eb"] }, { "name": "Fm7b5", "notes": ["F", "Ab", "B", "Eb"] }, { "name": "F°7", "notes": ["F", "Ab", "B", "D"] } ],
          "F#": [ { "name": "F#maj7", "notes": ["F#", "A#", "C#", "E#"] }, { "name": "F#m7", "notes": ["F#", "A", "C#", "E"] }, { "name": "F#7", "notes": ["F#", "A#", "C#", "E"] }, { "name": "F#m7b5", "notes": ["F#", "A", "C", "E"] }, { "name": "F#°7", "notes": ["F#", "A", "C", "Eb"] } ],
          "Gb": [ { "name": "Gbmaj7", "notes": ["Gb", "Bb", "Db", "F"] }, { "name": "Gb7", "notes": ["Gb", "Bb", "Db", "Fb"] }, { "name": "Gb°7", "notes": ["Gb", "A", "C", "Eb"] } ],
          "G": [ { "name": "Gmaj7", "notes": ["G", "B", "D", "F#"] }, { "name": "Gm7", "notes": ["G", "Bb", "D", "F"] }, { "name": "G7", "notes": ["G", "B", "D", "F"] }, { "name": "Gm7b5", "notes": ["G", "Bb", "Db", "F"] }, { "name": "G°7", "notes": ["G", "Bb", "Db", "E"] } ],
          "Ab": [ { "name": "Abmaj7", "notes": ["Ab", "C", "Eb", "G"] }, { "name": "Abm7", "notes": ["Ab", "Cb", "Eb", "Gb"] }, { "name": "Ab7", "notes": ["Ab", "C", "Eb", "Gb"] }, { "name": "Ab°7", "notes": ["Ab", "B", "D", "F"] } ],
          "A": [ { "name": "Amaj7", "notes": ["A", "C#", "E", "G#"] }, { "name": "Am7", "notes": ["A", "C", "E", "G"] }, { "name": "A7", "notes": ["A", "C#", "E", "G"] }, { "name": "Am7b5", "notes": ["A", "C", "Eb", "G"] }, { "name": "A°7", "notes": ["A", "C", "Eb", "Gb"] } ],
          "Bb": [ { "name": "Bbmaj7", "notes": ["Bb", "D", "F", "A"] }, { "name": "Bbm7", "notes": ["Bb", "Db", "F", "Ab"] }, { "name": "Bb7", "notes": ["Bb", "D", "F", "Ab"] }, { "name": "Bbm7b5", "notes": ["Bb", "Db", "Fb", "Ab"] }, { "name": "Bb°7", "notes": ["Bb", "Db", "E", "G"] } ],
          "B": [ { "name": "Bmaj7", "notes": ["B", "D#", "F#", "A#"] }, { "name": "Bm7", "notes": ["B", "D", "F#", "A"] }, { "name": "B7", "notes": ["B", "D#", "F#", "A"] }, { "name": "Bm7b5", "notes": ["B", "D", "F", "A"] }, { "name": "B°7", "notes": ["B", "D", "F", "Ab"] } ]
        },
        voicingsByDifficulty: { medium: { 'drop2': 'Drops 2', 'drop3': 'Drops 3' }, advanced: { 'all': 'Todos', 'drop2': 'Drops 2', 'drop3': 'Drops 3', 'drop24': 'Drops 2&4', 'drop23': 'Drops 2&3', 'doubleDrop23': 'Doble Drops 2 & Drops 3'}},
        voicingAbbreviations: { 'all': '', 'drop2': 'D2', 'drop3': 'D3', 'drop24': 'D2&4', 'drop23': 'D2&3', 'doubleDrop23': 'Dd2&D3' },
        keySignatures: {
            'C': { notes: ['C','D','E','F','G','A','B'] }, 'G': { notes: ['G','A','B','C','D','E','F#'] },
            'D': { notes: ['D','E','F#','G','A','B','C#'] }, 'A': { notes: ['A','B','C#','D','E','F#','G#'] },
            'E': { notes: ['E','F#','G#','A','B','C#','D#'] }, 'B': { notes: ['B','C#','D#','E','F#','G#','A#'] },
            'F#':{ notes: ['F#','G#','A#','B','C#','D#','E#'] }, 'C#':{ notes: ['C#','D#','E#','F#','G#','A#','B#'] },
            'F': { notes: ['F','G','A','Bb','C','D','E'] }, 'Bb':{ notes: ['Bb','C','D','Eb','F','G','A'] },
            'Eb':{ notes: ['Eb','F','G','Ab','Bb','C','D'] }, 'Ab':{ notes: ['Ab','Bb','C','Db','Eb','F','G'] },
            'Db':{ notes: ['Db','Eb','F','Gb','Ab','Bb','C'] }, 'Gb':{ notes: ['Gb','Ab','Bb','Cb','Db','Eb','F'] },
            'Cb':{ notes: ['Cb','Db','Eb','Fb','Gb','Ab','Bb'] }
        },
        chromaticMap: {}, intervalAbbreviations: {}, noteToFrequency: {}, guitarFretboard: {}, midiToEnharmonicName: {},
        voicingInversionMap: {
            'drop2': { '0': '2', '1': '3', '2': '0', '3': '1' }, 'drop3': { '0': '3', '1': '0', '2': '1', '3': '2' },
            'drop24': { '0': '0', '1': '1', '2': '2', '3': '3' }, 'drop23': { '0': '3', '1': '0', '2': '1', '3': '2' },
            'doubleDrop23': { '0': '2', '1': '3', '2': '0', '3': '1' }
        }
    };
}

function initializeAudioAndFretboardData() {
    const noteLetters = ['C','D','E','F','G','A','B'];
    for(let octave = 1; octave <= 8; octave++){
        for(const letter of noteLetters) { notesData.all.push(`${letter}bb/${octave}`, `${letter}b/${octave}`, `${letter}/${octave}`, `${letter}#/${octave}`, `${letter}##/${octave}`); }
    }
    notesData.all = notesData.all.filter(n => !n.startsWith('E##') && !n.startsWith('B##') && !n.startsWith('Fbb') && !n.startsWith('Cbb'));
    Object.keys(notesData.keySignatures).forEach((key, index) => {
        if (index < 8) { notesData.keySignatures[key].type = index === 0 ? null : 'sharp'; notesData.keySignatures[key].count = index; } 
        else { notesData.keySignatures[key].type = 'flat'; notesData.keySignatures[key].count = index - 7; }
    });
    notesData.natural = notesData.all.filter(n => !n.includes('#') && !n.includes('b'));
    
    const baseValues = {'C':0, 'D':2, 'E':4, 'F':5, 'G':7, 'A':9, 'B':11};
    notesData.midiToEnharmonicName = { 0: { sharp: 'C', flat: 'C' }, 1: { sharp: 'C♯', flat: 'D♭' }, 2: { sharp: 'D', flat: 'D' }, 3: { sharp: 'D♯', flat: 'E♭' }, 4: { sharp: 'E', flat: 'E' }, 5: { sharp: 'F', flat: 'F' }, 6: { sharp: 'F♯', flat: 'G♭' }, 7: { sharp: 'G', flat: 'G' }, 8: { sharp: 'G♯', flat: 'A♭' }, 9: { sharp: 'A', flat: 'A' }, 10: { sharp: 'A♯', flat: 'B♭' }, 11: { sharp: 'B', flat: 'B' } };
    notesData.all.forEach(note => {
        const [name, octaveStr] = note.split('/'); const octave = parseInt(octaveStr, 10); const letter = name[0]; const accidentals = name.substring(1);
        let value = baseValues[letter];
        for (const char of accidentals) { if (char === '#') value++; else if (char === 'b') value--; }
        const midiValue = 12 * (octave + 1) + (value % 12);
        notesData.chromaticMap[note] = midiValue; notesData.noteToFrequency[note] = 440 * (2 ** ((midiValue - 69) / 12));
    });
    notesData.intervalAbbreviations = { '1-0': '1', '2-1': 'b2', '2-2': '2', '3-3': 'b3', '3-4': '3', '4-5': '4', '4-6': '#4', '5-6': 'b5', '5-7': '5', '5-8': '#5', '6-8': 'b6', '6-9': '6', '7-10': 'b7', '7-11': '7', '8-12': '8', '9-13': 'b9', '9-14': '9', '10-15': 'b10', '10-16': '10', '11-17': '11', '11-18': '#11', '12-18': 'b12', '12-19': '12', '13-20': 'b13', '13-21': '13'};
    const tuning = ['E/5', 'B/4', 'G/4', 'D/4', 'A/3', 'E/3'];
    const MAX_FRETS = 20;
    tuning.forEach((openNote, stringIndex) => {
        const openNoteValue = notesData.chromaticMap[openNote];
        for (let fret = 0; fret <= MAX_FRETS; fret++) {
            const noteValue = openNoteValue + fret;
            const matchingNotes = Object.keys(notesData.chromaticMap).filter(key => notesData.chromaticMap[key] === noteValue);
            if (matchingNotes.length > 0) {
                for (const note of matchingNotes) {
                    if (!notesData.guitarFretboard[note]) notesData.guitarFretboard[note] = [];
                    notesData.guitarFretboard[note].push({ string: stringIndex, fret: fret });
                }
            }
        }
    });
}

// Persistencia de perfiles, progreso, rachas, XP, logros e inicio de sesión

function getInitialUserData() {
    return {
        stats: {
            totalExercises: 0, totalCorrect: 0, totalIncorrect: 0, currentStreak: 0, maxStreak: 0,
            lastPracticeDate: null, hintsUsed: 0, answersUsed: 0, missedNotes: {}, missedNotesByExercise: {},
            dailyChallengesCompleted: 0,
            xp: 0, globalNoteStats: {}, harmonyCorrect: 0,
            nightOwlUnlocked: false, mastermindUnlocked: false, completedCampaignStages: []
        },
        achievements: [],
        customPractice: {
            basic: { isActive: false, allowedChords: [] },
            intermediate: { isActive: false, allowedChords: [] },
            advanced: { isActive: false, allowedChords: [], allowedLeads: [] }
        },
        practiceHistory: []
    };
}

function loadUserData(username) {
    if (username === 'Invitado') {
        userData = getInitialUserData(); return;
    }
    const dataString = localStorage.getItem(`${USER_DATA_PREFIX}${username}`);
    if (dataString) {
        userData = JSON.parse(dataString);
        if (!userData.stats) userData.stats = getInitialUserData().stats;
        if (!userData.stats.missedNotes) userData.stats.missedNotes = {};
        if (!userData.stats.missedNotesByExercise) userData.stats.missedNotesByExercise = {};
        if (userData.stats.maxStreak === undefined) userData.stats.maxStreak = userData.stats.currentStreak || 0;
        if (userData.stats.dailyChallengesCompleted === undefined) userData.stats.dailyChallengesCompleted = 0;
        if (userData.stats.xp === undefined) userData.stats.xp = 0;
        if (!userData.stats.globalNoteStats) userData.stats.globalNoteStats = {};
        if (userData.stats.harmonyCorrect === undefined) userData.stats.harmonyCorrect = 0;
        if (!userData.stats.completedCampaignStages) userData.stats.completedCampaignStages = [];
        if (!userData.achievements) userData.achievements = [];
        if (!userData.customPractice) userData.customPractice = getInitialUserData().customPractice;
        if (!userData.practiceHistory) userData.practiceHistory = [];
    } else {
        userData = getInitialUserData(); saveUserData();
    }
    checkStreak();
    checkAchievements();
    updateXPDisplay();
}

function saveUserData() {
    if (currentUser && currentUser !== 'Invitado') {
        localStorage.setItem(`${USER_DATA_PREFIX}${currentUser}`, JSON.stringify(userData));
    }
}

function exportUserData() {
    if (!currentUser || currentUser === 'Invitado') {
        showTemporaryMessage('No puedes exportar una sesión de invitado.', true);
        return;
    }
    const dataStr = JSON.stringify(userData);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lectura_Primera_Vista_${currentUser}_${getLocalISODate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showTemporaryMessage('Datos exportados con éxito.', false);
}

function importUserData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            if (importedData.stats && importedData.practiceHistory) {
                userData = importedData;
                if (userData.stats.maxStreak === undefined) userData.stats.maxStreak = userData.stats.currentStreak || 0;
                if (!userData.stats.missedNotes) userData.stats.missedNotes = {};
                if (!userData.stats.missedNotesByExercise) userData.stats.missedNotesByExercise = {};
                if (!userData.achievements) userData.achievements = [];
                if (userData.stats.dailyChallengesCompleted === undefined) userData.stats.dailyChallengesCompleted = 0;
                if (userData.stats.xp === undefined) userData.stats.xp = 0;
                if (!userData.stats.globalNoteStats) userData.stats.globalNoteStats = {};
                saveUserData();
                updateStreakDisplay();
                updateXPDisplay();
                checkAchievements();
                showTemporaryMessage('Datos importados correctamente.', false);
            } else {
                showTemporaryMessage('Archivo JSON no válido.', true);
            }
        } catch (err) {
            showTemporaryMessage('Error al leer el archivo.', true);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function showTemporaryMessage(msg, isError) {
    const msgEl = ui.exportImportMsg;
    if (!msgEl) return;
    msgEl.textContent = msg;
    msgEl.className = `text-xs mt-2 font-semibold ${isError ? 'text-red-400' : 'text-emerald-400'}`;
    msgEl.classList.remove('hidden');
    setTimeout(() => msgEl.classList.add('hidden'), 3500);
}

function deleteUser(username) {
    let users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    users = users.filter(u => u !== username);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.removeItem(`${USER_DATA_PREFIX}${username}`);
}

function checkStreak() {
    if (!userData || !userData.stats) return;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = getLocalISODate(today);
    const yesterdayStr = getLocalISODate(yesterday);

    const lastPractice = userData.stats.lastPracticeDate;
    if (lastPractice && lastPractice !== todayStr && lastPractice !== yesterdayStr) {
        userData.stats.currentStreak = 0;
    }
    updateStreakDisplay();
}

function updateStreakDisplay() {
    if (ui && ui.streakDisplay) {
        const streak = userData?.stats?.currentStreak || 0;
        const maxStreak = userData?.stats?.maxStreak || 0;
         ui.streakDisplay.textContent = `Racha: ${streak} 🔥 | Récord: ${maxStreak} 🏆`;
    }
}

function updateXPDisplay() {
    if (!userData || !userData.stats || !ui || !ui.currentXp) return;
    const xp = userData.stats.xp || 0;
    ui.currentXp.textContent = xp;
    
    let nextTarget = 1000;
    let progress = 0;
    
    if (xp < 1000) {
        nextTarget = 1000;
        progress = (xp / 1000) * 100;
    } else if (xp < 3000) {
        nextTarget = 3000;
        progress = ((xp - 1000) / 2000) * 100;
    } else {
        nextTarget = "Max";
        progress = 100;
    }
    
    ui.nextLevelXp.textContent = nextTarget;
    ui.xpProgressBar.style.width = `${progress}%`;
}

function checkAchievements() {
    if (!userData || !userData.stats) return;
    let unlockedNew = false;
    
    ACHIEVEMENTS_DEF.forEach(ach => {
        if (!userData.achievements.includes(ach.id) && ach.condition(userData.stats)) {
            userData.achievements.push(ach.id);
            unlockedNew = true;
            const notif = document.createElement('div');
            notif.className = 'fixed bottom-4 right-4 bg-yellow-600 text-white p-4 rounded-lg shadow-2xl z-[9999] flex items-center gap-4 transform translate-y-20 opacity-0 transition-all duration-500';
            notif.innerHTML = `<span class="text-3xl">${ach.icon}</span><div><p class="text-xs font-bold uppercase tracking-wider text-yellow-200">¡Logro Desbloqueado!</p><p class="font-bold">${ach.name}</p></div>`;
            document.body.appendChild(notif);
            setTimeout(() => { notif.classList.remove('translate-y-20', 'opacity-0'); }, 100);
            setTimeout(() => { 
                notif.classList.add('translate-y-20', 'opacity-0'); 
                setTimeout(() => notif.remove(), 500);
            }, 4000);
        }
    });

    if (unlockedNew) saveUserData();
}

function initializeLogin() {
    const profileSelect = document.getElementById('profile-select');
    const newProfileInput = document.getElementById('new-profile-name');
    const loginButton = document.getElementById('login-button');
    const guestButton = document.getElementById('guest-button');
    const loginError = document.getElementById('login-error');
    const welcomeModal = document.getElementById('welcome-modal');
    const deleteProfileButton = document.getElementById('delete-profile-button');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const cancelDeleteButton = document.getElementById('cancel-delete-button');
    const confirmDeleteButton = document.getElementById('confirm-delete-button');
    const profileToDeleteSpan = document.getElementById('profile-to-delete');

    function populateProfiles() {
        const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
        profileSelect.innerHTML = '<option value="">-- Cargar Perfil --</option>';
        if (users.length > 0) {
            profileSelect.disabled = false;
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user; option.textContent = user;
                profileSelect.appendChild(option);
            });
        } else { profileSelect.disabled = true; }
         deleteProfileButton.disabled = true;
    }

    populateProfiles();
    profileSelect.addEventListener('change', () => { deleteProfileButton.disabled = !profileSelect.value; });

    const startApp = (user) => {
        currentUser = user;
        loadUserData(user);
        welcomeModal.style.opacity = '0';
        setTimeout(() => { welcomeModal.classList.add('hidden'); initializeApp(); }, 300);
    };
    
    loginButton.addEventListener('click', () => {
        loginError.textContent = '';
        const newProfileName = newProfileInput.value.trim();
        const selectedProfile = profileSelect.value;
        const existingUsers = JSON.parse(localStorage.getItem(USERS_KEY)) || [];

        if (newProfileName) {
            if (existingUsers.includes(newProfileName)) {
                loginError.textContent = 'Ese nombre de perfil ya existe.'; return;
            }
            existingUsers.push(newProfileName);
            localStorage.setItem(USERS_KEY, JSON.stringify(existingUsers));
            startApp(newProfileName);
        } else if (selectedProfile) { startApp(selectedProfile); } 
        else { loginError.textContent = 'Por favor, selecciona un perfil o crea uno nuevo.'; }
    });

    guestButton.addEventListener('click', () => startApp('Invitado'));

    deleteProfileButton.addEventListener('click', () => {
        const selectedProfile = profileSelect.value;
        if (selectedProfile) { profileToDeleteSpan.textContent = selectedProfile; deleteConfirmModal.classList.remove('hidden'); }
    });
    cancelDeleteButton.addEventListener('click', () => { deleteConfirmModal.classList.add('hidden'); });
    confirmDeleteButton.addEventListener('click', () => {
        const profileToDelete = profileToDeleteSpan.textContent;
        deleteUser(profileToDelete); populateProfiles(); deleteConfirmModal.classList.add('hidden');
    });
}

function initializeApp() {
    try {
        initializeElements(); 
        initializeAppState(); 
        initializeAudioAndFretboardData(); 
        attachEventListeners();
        updateChangeBeatOptions(); 
        updateDropVoicingOptions(); 
        updateHarmonyControlsVisibility(); 
        populateAllModals();

        ui.loadingMessage.classList.add('hidden'); 
        ui.mainContent.classList.remove('hidden');

        drawFretboard(); 
        renderStave();
        
        if (currentUser) { 
            ui.userDisplay.textContent = `Usuario: ${currentUser}`; 
        }
        updateStreakDisplay();
        updateXPDisplay();
        window.addEventListener('beforeunload', saveUserData);
    } catch (e) {
        console.error('Fatal error during initialization:', e);
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) {
            loadingMsg.textContent = "Error al cargar. Refresca la página. Detalles: " + e.message;
            loadingMsg.style.color = "red";
            loadingMsg.classList.remove('hidden');
        }
    }
};

// Motor de audio Web Audio API, micrófono, MIDI, grabación, detección de tono y síntesis

function isAppleMobileDevice() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    // iPadOS moderno (incluyendo iPad A16 / iPadOS 26) se identifica como "Macintosh" con pantalla táctil
    const isIPadOSDesktopUA = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return isIOS || isIPadOSDesktopUA;
}

function isMobileOrAndroidApp() {
    if (window.AndroidApp) return true;
    const ua = navigator.userAgent || '';
    return isAppleMobileDevice() || /Android|Mobile/i.test(ua);
}

async function initAudioEngine() {
    if (!audio.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        // 'playback' usa un buffer de salida estable en Android/iOS para evitar cortes y chasquidos ("ripeo")
        audio.context = new AudioContext({ latencyHint: 'playback' });
        audio.noteGain = audio.context.createGain();
        audio.metronomeGain = audio.context.createGain();
        audio.noteGain.connect(audio.context.destination);
        audio.metronomeGain.connect(audio.context.destination);

        // En iOS/iPadOS, el AudioContext puede pasar a 'interrupted' o 'suspended' al activar el micrófono
        audio.context.onstatechange = () => {
            if (audio.context && (audio.context.state === 'suspended' || audio.context.state === 'interrupted') && (state.micEnabled || state.exerciseStarted)) {
                audio.context.resume().catch(() => {});
            }
        };
    }
    if (audio.context.state !== 'running') {
        try { await audio.context.resume(); } catch (e) {}
    }
    return true;
}

async function getMicStream(deviceId = '') {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Permiso denegado o conexión no segura. En iPad/Safari debes abrir la app por HTTPS (ej. GitHub Pages).");
    }
    const isApple = isAppleMobileDevice();
    const audioConstraints = {
        echoCancellation: !!state.micEchoCancel,
        autoGainControl: isApple ? true : false,
        noiseSuppression: false
    };
    if (deviceId) {
        // Usar 'ideal' en lugar de 'exact' evita OverconstrainedError en iPadOS cuando WebKit rota IDs
        audioConstraints.deviceId = { ideal: deviceId };
    }
    try {
        return await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    } catch (err) {
        console.warn("Reintentando getUserMedia con configuración básica compatible con iPadOS/Safari:", err);
        return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
}

async function populateMicDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices || !ui.micDeviceSelect) return;
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(d => d.kind === 'audioinput');
        const currentVal = state.micDeviceId || ui.micDeviceSelect.value || '';
        ui.micDeviceSelect.innerHTML = '<option value="">Micrófono predeterminado</option>';
        inputs.forEach((dev, idx) => {
            const opt = document.createElement('option');
            opt.value = dev.deviceId;
            opt.textContent = dev.label || `Entrada de audio ${idx + 1}`;
            if (dev.deviceId === currentVal) opt.selected = true;
            ui.micDeviceSelect.appendChild(opt);
        });
    } catch (e) {
        console.warn("No se pudieron enumerar dispositivos de audio:", e);
    }
}

function updateMicFilterForClef() {
    const isBassClef = ui.clefSelect && ui.clefSelect.value === 'F';
    const micCtx = audio.micContext || audio.context;
    if (audio.micFilterHP && micCtx) {
        audio.micFilterHP.frequency.setValueAtTime(isBassClef ? 34 : 62, micCtx.currentTime);
    }
    if (ui.micBassModeBadge) {
        ui.micBassModeBadge.classList.toggle('hidden', !isBassClef);
    }
}

function updateHeadphonesWarning() {
    if (!ui.micHeadphonesWarning) return;
    const showWarning = state.micEnabled && (state.soundEnabled || state.metronomeEnabled);
    ui.micHeadphonesWarning.classList.toggle('hidden', !showWarning);
}

function updateMicLevelMeter(rms, detectedPitch = -1) {
    if (!ui.micLevelBar || !ui.micLevelStatus) return;
    const normLevel = Math.min(100, Math.round(Math.sqrt(Math.min(rms / 0.18, 1)) * 100));
    ui.micLevelBar.style.width = `${normLevel}%`;

    const sensitivityFactor = state.micSensitivity || 1.0;
    const gateThreshold = Math.max(0.0035, (audio.noiseFloorRms * 2.1) / sensitivityFactor);

    if (rms >= 0.22) {
        ui.micLevelBar.className = 'h-full bg-red-500 transition-all duration-75';
        ui.micLevelStatus.textContent = 'Saturado (baja volumen)';
        ui.micLevelStatus.className = 'text-xs px-2 py-0.5 rounded-full bg-red-900/70 text-red-300 font-semibold';
    } else if (rms >= gateThreshold * 1.4) {
        ui.micLevelBar.className = 'h-full bg-emerald-500 transition-all duration-75';
        ui.micLevelStatus.textContent = 'Señal óptima';
        ui.micLevelStatus.className = 'text-xs px-2 py-0.5 rounded-full bg-emerald-900/70 text-emerald-300 font-semibold';
    } else if (rms >= gateThreshold * 0.75) {
        ui.micLevelBar.className = 'h-full bg-amber-400 transition-all duration-75';
        ui.micLevelStatus.textContent = 'Señal baja';
        ui.micLevelStatus.className = 'text-xs px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 font-semibold';
    } else {
        ui.micLevelBar.className = 'h-full bg-zinc-500 transition-all duration-75';
        ui.micLevelStatus.textContent = 'Silencio';
        ui.micLevelStatus.className = 'text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-semibold';
    }

    if (ui.micLiveCents) {
        if (detectedPitch > 0) {
            const exactNoteFloat = 12 * Math.log2(detectedPitch / 440) + 69;
            const nearestMidi = Math.round(exactNoteFloat);
            const cents = Math.round((exactNoteFloat - nearestMidi) * 100);
            const sign = cents >= 0 ? '+' : '';
            const transposeSt = state.instrumentTranspose || 0;
            if (transposeSt !== 0) {
                const writtenName = getEnharmonicName(nearestMidi - transposeSt);
                const realName = getEnharmonicName(nearestMidi);
                ui.micLiveCents.textContent = `Tocado: ${writtenName} → Suena: ${realName} (${sign}${cents}c • ${detectedPitch.toFixed(1)} Hz)`;
            } else {
                ui.micLiveCents.textContent = `${getEnharmonicName(nearestMidi)} (${sign}${cents}c • ${detectedPitch.toFixed(1)} Hz)`;
            }
        } else {
            ui.micLiveCents.textContent = '--';
        }
    }
}

function getInstrumentSoundingOffset() {
    const isTreble = !ui.clefSelect || ui.clefSelect.value === 'G';
    // En clave de Sol, la guitarra y el requinto se escriben 1 octava arriba de su sonido real (-12 st).
    // El requinto puntero suena una 4ª justa arriba de la guitarra (-12 + 5 = -7 st respecto a lo escrito).
    return (isTreble ? -12 : 0) + (state.instrumentTranspose || 0);
}

function updateInstrumentSettings() {
    const isRequinto = state.instrumentType === 'requinto';
    const isLatin = state.notationSystem === 'latin';
    state.instrumentTranspose = isRequinto ? 5 : 0; // Requinto puntero: 4ª justa arriba (+5 semitonos)
    document.body.classList.toggle('latin-notation', isLatin);
    if (ui.micRequintoBadge) {
        ui.micRequintoBadge.classList.toggle('hidden', !isRequinto);
    }
    if (ui.tunerTuningHint) {
        if (isRequinto) {
            ui.tunerTuningHint.textContent = isLatin
                ? 'Requinto Puntero (6ª→1ª): La2 - Re3 - Sol3 - Do4 - Mi4 - La4'
                : 'Requinto Puntero (6ª→1ª): A2 - D3 - G3 - C4 - E4 - A4';
        } else {
            ui.tunerTuningHint.textContent = isLatin
                ? 'Guitarra (6ª→1ª): Mi2 - La2 - Re3 - Sol3 - Si3 - Mi4'
                : 'Guitarra (6ª→1ª): E2 - A2 - D3 - G3 - B3 - E4';
        }
    }
    updateConfigSummaryPill();
    if (state.showFretboard) {
        drawFretboardWithCurrentSettings();
    }
    renderStave(state.exerciseStarted ? state.currentDisplayedContent : state.manualNotesToDisplay);
}

function updateConfigSummaryPill() {
    if (!ui.configSummaryPill) return;
    const inst = state.instrumentType === 'requinto' ? '🎸 Requinto' : '🎸 Guitarra';
    const mode = state.exerciseType === 'melodia' ? 'Melodía' : `Armonía (${state.notesPerChord}v)`;
    const bpm = ui.tempoInput ? (ui.tempoInput.value || 60) : 60;
    const waitTxt = state.waitMode ? ' • ⏸️ Espera' : ` • ${bpm} BPM`;
    ui.configSummaryPill.textContent = `${inst} • ${mode}${waitTxt}`;
}

function setConfigPanelCollapsed(collapsed) {
    state.configPanelCollapsed = !!collapsed;
    if (ui.configPanelBody) ui.configPanelBody.classList.toggle('hidden', state.configPanelCollapsed);
    if (ui.configSummaryPill) ui.configSummaryPill.classList.toggle('hidden', !state.configPanelCollapsed);
    if (ui.toggleConfigPanelBtn) {
        ui.toggleConfigPanelBtn.textContent = state.configPanelCollapsed ? '▸ Mostrar Opciones' : '▾ Ocultar Opciones';
    }
    updateConfigSummaryPill();
}

function startMicIdleMonitor() {
    if (state.micMonitorRafId) return;
    const loop = () => {
        if (!state.micEnabled || !audio.micAnalyser) {
            state.micMonitorRafId = null;
            return;
        }
        // Solo corre análisis en reposo cuando no hay ejercicio ni afinador corriendo
        const tunerOpen = ui.tunerModal && !ui.tunerModal.classList.contains('hidden');
        if (!state.exerciseStarted && !tunerOpen && !state.isCalibratingMic) {
            const pitch = detectPitch();
            updateMicLevelMeter(audio.lastRms || 0, pitch);
            if (ui.micDetectedNote) {
                if (pitch > 0) {
                    const midi = Math.round(12 * Math.log2(pitch / 440) + 69);
                    const displayMidi = midi - (state.instrumentTranspose || 0);
                    ui.micDetectedNote.textContent = getEnharmonicName(displayMidi);
                    ui.micDetectedNote.className = 'ml-1 text-xs font-bold text-sky-400 w-10 truncate text-center';
                } else {
                    ui.micDetectedNote.textContent = '';
                }
            }
        }
        state.micMonitorRafId = requestAnimationFrame(loop);
    };
    state.micMonitorRafId = requestAnimationFrame(loop);
}

function stopMicIdleMonitor() {
    if (state.micMonitorRafId) {
        cancelAnimationFrame(state.micMonitorRafId);
        state.micMonitorRafId = null;
    }
}

async function calibrateMicNoiseFloor() {
    if (!state.micEnabled || !audio.micAnalyser || !audio.micDataArray) {
        showTemporaryMessage("Activa el micrófono primero para calibrar.", true);
        return;
    }
    if (state.isCalibratingMic) return;
    state.isCalibratingMic = true;
    const btn = ui.micCalibrateBtn;
    const origText = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Guarda silencio (2s)...';
    }
    const samples = [];
    const startMs = performance.now();
    await new Promise(resolve => {
        const sampleLoop = () => {
            if (!audio.micAnalyser || !audio.micDataArray) { resolve(); return; }
            audio.micAnalyser.getFloatTimeDomainData(audio.micDataArray);
            const buf = audio.micDataArray;
            const len = Math.min(buf.length, 2048);
            const off = buf.length - len;
            let mean = 0;
            for (let i = off; i < buf.length; i++) mean += buf[i];
            mean /= len;
            let sumSq = 0;
            for (let i = off; i < buf.length; i++) {
                const v = buf[i] - mean;
                sumSq += v * v;
            }
            const rms = Math.sqrt(sumSq / len);
            samples.push(rms);
            updateMicLevelMeter(rms, -1);
            if (performance.now() - startMs < 1800) {
                requestAnimationFrame(sampleLoop);
            } else {
                resolve();
            }
        };
        requestAnimationFrame(sampleLoop);
    });
    if (samples.length > 0) {
        samples.sort((a, b) => a - b);
        // Usar percentil 75 del ruido ambiental medido
        const p75 = samples[Math.floor(samples.length * 0.75)];
        audio.noiseFloorRms = Math.max(0.002, Math.min(0.035, p75 * 1.15));
        showTemporaryMessage(`Ruido calibrado correctamente (piso: ${(audio.noiseFloorRms * 1000).toFixed(1)} mV).`, false);
    }
    if (btn) {
        btn.disabled = false;
        btn.textContent = origText;
    }
    state.isCalibratingMic = false;
}

function stopMicStream() {
    stopMicIdleMonitor();
    if (audio.micStream) {
        audio.micStream.getTracks().forEach(t => t.stop());
        audio.micStream = null;
    }
    if (audio.micSource) {
        try { audio.micSource.disconnect(); } catch (e) {}
        audio.micSource = null;
    }
}

async function ensureMicAnalyser(forceRestart = false) {
    // 1. Mantener el AudioContext de reproducción (metrónomo y sintetizador) totalmente aislado y con buffer estable
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!audio.context) {
        audio.context = new AudioContextClass({ latencyHint: 'playback' });
        audio.noteGain = audio.context.createGain();
        audio.metronomeGain = audio.context.createGain();
        audio.noteGain.connect(audio.context.destination);
        audio.metronomeGain.connect(audio.context.destination);
    }
    // 2. Usar un AudioContext dedicado SOLO para el micrófono con buffer balanceado (cero cortes en Android WebView)
    if (!audio.micContext) {
        audio.micContext = new AudioContextClass({ latencyHint: 'balanced' });
        audio.micContext.onstatechange = () => {
            if (audio.micContext && (audio.micContext.state === 'suspended' || audio.micContext.state === 'interrupted') && state.micEnabled) {
                audio.micContext.resume().catch(() => {});
            }
        };
    }
    if (forceRestart) {
        if (audio.micStream) {
            audio.micStream.getTracks().forEach(t => t.stop());
            audio.micStream = null;
        }
        if (audio.micSource) {
            try { audio.micSource.disconnect(); } catch (e) {}
            audio.micSource = null;
        }
    }
    const hasActiveStream = audio.micStream && audio.micStream.getTracks().some(t => t.readyState === 'live');
    if (!hasActiveStream) {
        const stream = await getMicStream(state.micDeviceId || '');
        audio.micStream = stream;
        if (audio.micSource) {
            try { audio.micSource.disconnect(); } catch (e) {}
        }
        audio.micSource = null;
    }

    // Reanudar AMBOS contextos tras getUserMedia (crítico en Android WebView e iPadOS)
    if (audio.context.state !== 'running') {
        try { await audio.context.resume(); } catch (e) {}
    }
    if (audio.micContext.state !== 'running') {
        try { await audio.micContext.resume(); } catch (e) {}
    }
    if (window.AndroidApp && typeof window.AndroidApp.ensureSpeakerAudio === 'function') {
        try { window.AndroidApp.ensureSpeakerAudio(); } catch (e) {}
    }

    const micCtx = audio.micContext;
    const isApple = isAppleMobileDevice();
    const isMobile = isMobileOrAndroidApp();
    if (!audio.micAnalyser) {
        audio.micAnalyser = micCtx.createAnalyser();
    }
    // En móviles (Android e iPadOS), fftSize 4096 evita sobrecarga del hilo de audio y cortes del sonido
    audio.micAnalyser.fftSize = isMobile ? 4096 : 8192;
    audio.micAnalyser.smoothingTimeConstant = 0.12;
    audio.micAnalyser.minDecibels = -100;
    audio.micAnalyser.maxDecibels = -10;

    // Cadena de filtros DSP + preamplificador de entrada + sumidero silencioso (WebKit) en micContext aislado
    const isBassClef = ui.clefSelect && ui.clefSelect.value === 'F';
    if (!audio.micFilterHP) {
        audio.micInputGain = micCtx.createGain();
        audio.micInputGain.gain.value = isApple ? 2.2 : 1.0;

        audio.micFilterHP = micCtx.createBiquadFilter();
        audio.micFilterHP.type = 'highpass';
        audio.micFilterHP.frequency.value = isBassClef ? 34 : 62;
        audio.micFilterHP.Q.value = 0.707;

        audio.micFilterMid = micCtx.createBiquadFilter();
        audio.micFilterMid.type = 'peaking';
        audio.micFilterMid.frequency.value = 240;
        audio.micFilterMid.Q.value = 0.8;
        audio.micFilterMid.gain.value = 3.5;

        audio.micFilterLP = micCtx.createBiquadFilter();
        audio.micFilterLP.type = 'lowpass';
        audio.micFilterLP.frequency.value = 2800;
        audio.micFilterLP.Q.value = 0.707;

        audio.micSilentSink = micCtx.createGain();
        audio.micSilentSink.gain.value = 0;

        audio.micInputGain.connect(audio.micFilterHP);
        audio.micFilterHP.connect(audio.micFilterMid);
        audio.micFilterMid.connect(audio.micFilterLP);
        audio.micFilterLP.connect(audio.micAnalyser);
        audio.micAnalyser.connect(audio.micSilentSink);
        audio.micSilentSink.connect(micCtx.destination);
    } else {
        updateMicFilterForClef();
    }

    if (!audio.micDataArray || audio.micDataArray.length !== audio.micAnalyser.fftSize) {
        audio.micDataArray = new Float32Array(audio.micAnalyser.fftSize);
    }
    if (!audio.micFreqArray || audio.micFreqArray.length !== audio.micAnalyser.frequencyBinCount) {
        audio.micFreqArray = new Float32Array(audio.micAnalyser.frequencyBinCount);
    }
    if (!audio.micSource && audio.micStream) {
        audio.micSource = micCtx.createMediaStreamSource(audio.micStream);
        audio.micSource.connect(audio.micInputGain || audio.micFilterHP);
    }
    audio.prevRms = 0;
}

async function toggleMicrophone(enable) {
    if (enable) {
        try {
            await ensureMicAnalyser();
            state.micEnabled = true;
            await populateMicDevices();
            updateMicFilterForClef();
            updateInstrumentSettings();
            if (ui.micSettingsPanel) ui.micSettingsPanel.classList.remove('hidden');
            updateHeadphonesWarning();
            startMicIdleMonitor();
            showTemporaryMessage("Micrófono activado. ¡Toca algo!", false);
        } catch (err) {
            console.error("Error accessing mic:", err);
            ui.enableMicToggle.checked = false;
            state.micEnabled = false;
            if (ui.micSettingsPanel) ui.micSettingsPanel.classList.add('hidden');
            showTemporaryMessage("Error de micrófono: " + err.message, true);
        }
    } else {
        state.micEnabled = false;
        stopMicIdleMonitor();
        if (ui.micDetectedNote) ui.micDetectedNote.textContent = '';
        if (ui.micSettingsPanel) ui.micSettingsPanel.classList.add('hidden');
        updateHeadphonesWarning();
        if (ui.tunerModal && ui.tunerModal.classList.contains('hidden')) {
            stopMicStream();
        }
    }
}

async function toggleMidi(enable) {
    if (enable) {
        if (!navigator.requestMIDIAccess) {
            ui.enableMidiToggle.checked = false;
            state.midiEnabled = false;
            showTemporaryMessage("Tu navegador no soporta Web MIDI API.", true);
            return;
        }
        try {
            await initAudioEngine();
            const midiAccess = await navigator.requestMIDIAccess();
            state.midiEnabled = true;
            state.activeMidiNotes.clear();
            const onMidiMessage = (event) => {
                const [command, note, velocity] = event.data;
                const cmd = command & 0xf0;
                if (cmd === 0x90 && velocity > 0) {
                    state.activeMidiNotes.add(note);
                    if (ui.micDetectedNote) ui.micDetectedNote.textContent = getEnharmonicName(note);
                } else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
                    state.activeMidiNotes.delete(note);
                }
            };
            for (let input of midiAccess.inputs.values()) {
                input.onmidimessage = onMidiMessage;
            }
            midiAccess.onstatechange = (e) => {
                if (e.port.type === 'input' && e.port.state === 'connected') {
                    e.port.onmidimessage = onMidiMessage;
                }
            };
            showTemporaryMessage("MIDI conectado. ¡Listo para tocar!", false);
        } catch (err) {
            ui.enableMidiToggle.checked = false;
            state.midiEnabled = false;
            showTemporaryMessage("No se pudo acceder a dispositivos MIDI.", true);
        }
    } else {
        state.midiEnabled = false;
        state.activeMidiNotes.clear();
        if (ui.micDetectedNote) ui.micDetectedNote.textContent = '';
    }
}

function startSessionRecording() {
    state.recordedChunks = [];
    if (ui.sessionAudioPlayer) {
        ui.sessionAudioPlayer.pause();
        ui.sessionAudioPlayer.currentTime = 0;
    }
    if (state.micEnabled && audio.micStream && typeof MediaRecorder !== 'undefined') {
        try {
            state.mediaRecorder = new MediaRecorder(audio.micStream);
            state.mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) state.recordedChunks.push(e.data);
            };
            state.mediaRecorder.onstop = () => {
                if (state.recordedChunks.length > 0 && ui.sessionAudioPlayer) {
                    const blob = new Blob(state.recordedChunks, { type: 'audio/webm' });
                    const url = URL.createObjectURL(blob);
                    ui.sessionAudioPlayer.src = url;
                    ui.sessionRecordingContainer.classList.remove('hidden');
                }
            };
            state.mediaRecorder.start();
        } catch (e) {
            console.warn("MediaRecorder no disponible:", e);
        }
    } else if (ui.sessionRecordingContainer) {
        ui.sessionRecordingContainer.classList.add('hidden');
    }
}

function stopSessionRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        try { state.mediaRecorder.stop(); } catch (e) {}
    }
}

function verifyChord(expectedMidis) {
    const micCtx = audio.micContext || audio.context;
    if (!audio.micAnalyser || !micCtx || !audio.micFreqArray) {
        return { hit: false, wrong: false, dominantMidi: -1, detectedClasses: [] };
    }
    audio.micAnalyser.getFloatFrequencyData(audio.micFreqArray);
    const sampleRate = micCtx.sampleRate;
    const binCount = audio.micAnalyser.frequencyBinCount;
    const nyquist = sampleRate / 2;
    const isBassClef = ui.clefSelect && ui.clefSelect.value === 'F';
    const minFreq = isBassClef ? 38 : 75;
    const minMidi = isBassClef ? 28 : 40;
    const sensitivityFactor = state.micSensitivity || 1.0;
    const minMaxDb = -48 - (sensitivityFactor - 1.0) * 10; // Más sensible permite señales más suaves
    const toleranceCents = Math.max(25, state.micToleranceCents || 30);

    let maxDb = -Infinity;
    let sumDb = 0;
    let validBins = 0;
    const minBin = Math.max(2, Math.floor((minFreq / nyquist) * binCount));
    const maxBin = Math.min(binCount - 2, Math.ceil((1750 / nyquist) * binCount));

    for (let i = minBin; i <= maxBin; i++) {
        const val = audio.micFreqArray[i];
        if (val > maxDb) maxDb = val;
        if (isFinite(val)) { sumDb += val; validBins++; }
    }
    const avgDb = validBins > 0 ? (sumDb / validBins) : -100;
    if (maxDb < minMaxDb || (maxDb - avgDb) < 13) {
        return { hit: false, wrong: false, dominantMidi: -1, detectedClasses: [] };
    }

    const threshold = Math.max(avgDb + 11, maxDb - 16);
    const chroma = new Float32Array(12);
    let dominantMidi = -1;
    let dominantDb = -Infinity;

    for (let i = minBin; i <= maxBin; i++) {
        const v = audio.micFreqArray[i];
        if (v >= threshold && v >= audio.micFreqArray[i - 1] && v >= audio.micFreqArray[i + 1]) {
            const y1 = audio.micFreqArray[i - 1];
            const y2 = v;
            const y3 = audio.micFreqArray[i + 1];
            const denom = y1 + y3 - 2 * y2;
            let refinedBin = i;
            if (denom !== 0) {
                const delta = (y1 - y3) / (2 * denom);
                if (Math.abs(delta) < 1) refinedBin += delta;
            }
            const freq = (refinedBin / binCount) * nyquist;
            const midiFloat = 12 * Math.log2(freq / 440) + 69;
            const nearestMidi = Math.round(midiFloat);
            const centsDiff = Math.abs(midiFloat - nearestMidi) * 100;

            if (centsDiff <= toleranceCents && nearestMidi >= minMidi && nearestMidi <= 93) {
                const harmonic2Bin = Math.round(refinedBin * 2);
                // Para notas agudas (>650 Hz), no exigir 2º armónico para evitar pérdida por atenuación de filtro/micrófono
                const hasHarmonicSupport = (freq > 650 || harmonic2Bin >= binCount)
                    ? true
                    : (audio.micFreqArray[harmonic2Bin] > avgDb + 4);
                if (hasHarmonicSupport) {
                    const linearMag = Math.pow(10, (v - maxDb) / 20);
                    const pc = ((nearestMidi % 12) + 12) % 12;
                    chroma[pc] = Math.max(chroma[pc], linearMag);
                    if (v > dominantDb) {
                        dominantDb = v;
                        dominantMidi = nearestMidi;
                    }
                }
            }
        }
    }

    const expectedClasses = Array.from(new Set(expectedMidis.map(m => ((m % 12) + 12) % 12)));
    const detectedClasses = [];
    let matchedClasses = 0;
    let chordEnergy = 0;
    let nonChordEnergy = 0;

    for (let pc = 0; pc < 12; pc++) {
        if (chroma[pc] >= 0.25) detectedClasses.push(pc);
        if (expectedClasses.includes(pc)) {
            chordEnergy += chroma[pc];
            if (chroma[pc] >= 0.25) matchedClasses++;
        } else {
            nonChordEnergy += chroma[pc];
        }
    }

    const requiredCount = expectedClasses.length <= 2 ? expectedClasses.length : (expectedClasses.length - 1);
    const isHit = matchedClasses >= requiredCount && chordEnergy >= nonChordEnergy * 1.1;
    const isWrong = !isHit && dominantMidi > 0 && nonChordEnergy > chordEnergy * 1.35;

    return { hit: isHit, wrong: isWrong, dominantMidi, detectedClasses };
}

function detectPitch() {
    const micCtx = audio.micContext || audio.context;
    if (!audio.micAnalyser || !audio.micDataArray || !micCtx) return -1;
    // En móviles (pantallas 60-120 Hz), limitar el análisis a ~35 Hz evita saturar la CPU/audio y elimina el "ripeo"
    if (isMobileOrAndroidApp()) {
        const nowMs = performance.now();
        if (nowMs - (audio.lastPitchCalcMs || 0) < 28) {
            return audio.cachedPitch !== undefined ? audio.cachedPitch : -1;
        }
        audio.lastPitchCalcMs = nowMs;
    }
    audio.cachedPitch = -1;
    audio.micAnalyser.getFloatTimeDomainData(audio.micDataArray);
    const buf = audio.micDataArray;
    const SIZE = buf.length;
    const sampleRate = micCtx.sampleRate;
    const isBassClef = ui.clefSelect && ui.clefSelect.value === 'F';
    const minFreq = isBassClef ? 38 : 72;
    const maxFreq = 1650;

    // Para clave de Fa (bajo desde 38 Hz), usar ventana más larga para cubrir al menos 2 ciclos completos
    const analysisLen = Math.min(SIZE, isBassClef ? 4096 : 2048);
    const offset = SIZE - analysisLen;

    let mean = 0;
    for (let i = offset; i < SIZE; i++) mean += buf[i];
    mean /= analysisLen;

    let rms = 0;
    let zeroCrossings = 0;
    for (let i = offset; i < SIZE; i++) {
        const v = buf[i] - mean;
        rms += v * v;
        if (i > offset) {
            const prevV = buf[i - 1] - mean;
            if ((v >= 0 && prevV < 0) || (v < 0 && prevV >= 0)) zeroCrossings++;
        }
    }
    rms = Math.sqrt(rms / analysisLen);

    // Descartar ruido blanco/fricción de alta frecuencia por exceso de cruces por cero
    const zcrFreqApprox = (zeroCrossings * sampleRate) / (2 * analysisLen);
    if (zcrFreqApprox > 3400) {
        state.pitchHistory = [];
        audio.lastRms = rms;
        return -1;
    }

    // Seguimiento adaptativo del piso de ruido ambiental (no alterar durante calibración manual)
    if (!state.isCalibratingMic) {
        if (rms < audio.noiseFloorRms * 1.35) {
            audio.noiseFloorRms = (0.95 * audio.noiseFloorRms) + (0.05 * rms);
        } else {
            audio.noiseFloorRms = (0.996 * audio.noiseFloorRms) + (0.004 * rms);
        }
        audio.noiseFloorRms = Math.max(0.0018, Math.min(0.035, audio.noiseFloorRms));
    }

    const sensitivityFactor = state.micSensitivity || 1.2;
    const dynamicRmsThreshold = Math.max(0.0028, (audio.noiseFloorRms * 1.85) / sensitivityFactor);
    const prevRms = audio.prevRms || 0;
    audio.prevRms = rms;
    audio.lastRms = rms;

    if (rms > dynamicRmsThreshold * 1.45 && rms > prevRms * 1.32) {
        state.lastOnsetTime = audio.context.currentTime;
        state.micSilenceSinceLastHit = true;
        state.silenceFramesCount = 0;
    }

    if (rms < dynamicRmsThreshold) {
        state.pitchHistory = [];
        state.silenceFramesCount = (state.silenceFramesCount || 0) + 1;
        if (state.silenceFramesCount >= 5) {
            state.micSilenceSinceLastHit = true;
            state.lastEvaluatedPitchClass = null;
        }
        return -1;
    }

    // Optimización CPU (6x-8x más rápido): submuestreo 2x + suma acumulada de cuadrados O(1)
    const decimate = sampleRate >= 40000 ? 2 : 1;
    const effSampleRate = sampleRate / decimate;
    const dsLen = Math.floor(analysisLen / decimate);
    if (!audio.dsBuf || audio.dsBuf.length !== dsLen) {
        audio.dsBuf = new Float32Array(dsLen);
        audio.prefixSq = new Float32Array(dsLen + 1);
    }
    const dsBuf = audio.dsBuf;
    const prefixSq = audio.prefixSq;
    prefixSq[0] = 0;
    if (decimate === 2) {
        for (let i = 0; i < dsLen; i++) {
            const idx = offset + (i << 1);
            const v = ((buf[idx] + buf[idx + 1]) * 0.5) - mean;
            dsBuf[i] = v;
            prefixSq[i + 1] = prefixSq[i] + v * v;
        }
    } else {
        for (let i = 0; i < dsLen; i++) {
            const v = buf[offset + i] - mean;
            dsBuf[i] = v;
            prefixSq[i + 1] = prefixSq[i] + v * v;
        }
    }

    const minLag = Math.max(6, Math.floor(effSampleRate / maxFreq));
    const maxLag = Math.min(Math.floor(dsLen * 0.65), Math.ceil(effSampleRate / minFreq));
    const windowSize = dsLen - maxLag - 2;
    if (windowSize < 16) return -1;

    if (!audio.nsdfBuf || audio.nsdfBuf.length < maxLag + 2) {
        audio.nsdfBuf = new Float32Array(maxLag + 2);
    }
    const nsdf = audio.nsdfBuf;
    const baseEnergy = prefixSq[windowSize];

    for (let lag = 0; lag <= maxLag + 1; lag++) {
        let acf = 0;
        for (let j = 0; j < windowSize; j++) {
            acf += dsBuf[j] * dsBuf[j + lag];
        }
        const norm = baseEnergy + (prefixSq[windowSize + lag] - prefixSq[lag]);
        nsdf[lag] = norm > 0 ? (2 * acf) / norm : 0;
    }

    let startLag = 1;
    while (startLag < maxLag && nsdf[startLag] > 0) {
        startLag++;
    }
    startLag = Math.max(startLag, minLag);

    const peaks = [];
    let inPositiveRegion = false;
    let curMaxVal = -1;
    let curMaxLag = -1;

    for (let lag = startLag; lag <= maxLag; lag++) {
        const val = nsdf[lag];
        if (val > 0) {
            if (!inPositiveRegion) {
                inPositiveRegion = true;
                curMaxVal = val;
                curMaxLag = lag;
            } else if (val > curMaxVal) {
                curMaxVal = val;
                curMaxLag = lag;
            }
        } else if (inPositiveRegion) {
            if (curMaxLag >= minLag && curMaxVal > 0) {
                peaks.push({ lag: curMaxLag, val: curMaxVal });
            }
            inPositiveRegion = false;
        }
    }
    if (inPositiveRegion && curMaxLag >= minLag && curMaxVal > 0) {
        peaks.push({ lag: curMaxLag, val: curMaxVal });
    }

    if (peaks.length === 0) {
        state.pitchHistory = [];
        return -1;
    }

    let highestPeak = 0;
    for (let i = 0; i < peaks.length; i++) {
        if (peaks[i].val > highestPeak) highestPeak = peaks[i].val;
    }

    // Puerta de claridad armónica calibrada para cuerdas pulsadas (guitarra/requinto)
    if (highestPeak < 0.55) {
        state.pitchHistory = [];
        return -1;
    }

    const clarityThreshold = Math.max(0.52, 0.85 * highestPeak);
    let chosenPeak = peaks[0];
    for (let i = 0; i < peaks.length; i++) {
        if (peaks[i].val >= clarityThreshold) {
            chosenPeak = peaks[i];
            break;
        }
    }

    let chosenLag = chosenPeak.lag;
    const y1 = nsdf[chosenLag - 1];
    const y2 = nsdf[chosenLag];
    const y3 = nsdf[chosenLag + 1];
    let refinedLag = chosenLag;
    const denom = y1 + y3 - 2 * y2;
    if (denom !== 0) {
        const delta = (y1 - y3) / (2 * denom);
        if (Math.abs(delta) < 1) refinedLag += delta;
    }

    let pitch = effSampleRate / refinedLag;
    if (pitch < minFreq || pitch > maxFreq) {
        state.pitchHistory = [];
        return -1;
    }

    // Validación espectral y corrección de octava si el 2º armónico dominó en el dominio del tiempo
    if (audio.micFreqArray) {
        audio.micAnalyser.getFloatFrequencyData(audio.micFreqArray);
        const binCount = audio.micAnalyser.frequencyBinCount;
        const nyquist = sampleRate / 2;
        const f1Bin = Math.round((pitch / nyquist) * binCount);
        const f2Bin = Math.round(((pitch * 2) / nyquist) * binCount);
        if (f1Bin > 1 && f1Bin < binCount - 1) {
            const f1Db = Math.max(audio.micFreqArray[f1Bin - 1], audio.micFreqArray[f1Bin], audio.micFreqArray[f1Bin + 1]);
            const f2Db = (f2Bin < binCount - 1) ? Math.max(audio.micFreqArray[f2Bin - 1], audio.micFreqArray[f2Bin], audio.micFreqArray[f2Bin + 1]) : -100;
            if (f1Db < -72 && f2Db < -72) {
                state.pitchHistory = [];
                return -1;
            }
            const halfPitch = pitch * 0.5;
            const halfLag = refinedLag * 2;
            if (halfPitch >= minFreq && halfLag <= maxLag) {
                const fHalfBin = Math.round((halfPitch / nyquist) * binCount);
                if (fHalfBin > 1 && fHalfBin < binCount - 1) {
                    const fHalfDb = Math.max(audio.micFreqArray[fHalfBin - 1], audio.micFreqArray[fHalfBin], audio.micFreqArray[fHalfBin + 1]);
                    const nsdfAtHalf = nsdf[Math.round(halfLag)] || 0;
                    if (fHalfDb > f1Db - 6 && fHalfDb > -64 && nsdfAtHalf > chosenPeak.val * 1.02) {
                        pitch = halfPitch;
                    }
                }
            }
        }
    }

    state.silenceFramesCount = 0;

    // Estabilidad tonal en 2 muestras consecutivas (tolera ataque de cuerda pulsada y vibrato ligero)
    if (!state.pitchHistory) state.pitchHistory = [];
    state.pitchHistory.push(pitch);
    if (state.pitchHistory.length > 2) state.pitchHistory.shift();

    if (state.pitchHistory.length < 2) {
        return -1;
    }

    const p0 = state.pitchHistory[0];
    const p1 = state.pitchHistory[1];
    const jump = Math.abs(12 * Math.log2(p1 / p0));
    if (jump > 0.48) {
        return -1;
    }

    const resultPitch = (p0 + p1) * 0.5;
    audio.cachedPitch = resultPitch;
    return resultPitch;
}

function noteFromPitch(frequency) {
    let noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
}

function playNoteSound(note, time, customDuration = 0.85) {
    if (!audio.context || !note) return;
    if (audio.context.state !== 'running') { audio.context.resume().catch(() => {}); }
    const baseFreq = notesData.noteToFrequency[note];
    if (!baseFreq) return;
    const soundingOffset = getInstrumentSoundingOffset();
    const freq = soundingOffset !== 0 ? baseFreq * Math.pow(2, soundingOffset / 12) : baseFreq;
    const dur = Math.max(0.08, customDuration);
    const vol = Math.max(0.001, state.noteVolume);
    audio.noteGain.gain.setValueAtTime(1, time);

    if (state.synthType === 'guitar') {
        // Síntesis de cuerda pulsada con sostenimiento real durante toda la figura escrita
        const osc1 = audio.context.createOscillator();
        const osc2 = audio.context.createOscillator();
        const filter = audio.context.createBiquadFilter();
        const env = audio.context.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq, time);
        osc2.detune.setValueAtTime(3, time);

        const attackTime = Math.min(0.008, dur * 0.15);
        const pluckDecayTime = Math.min(0.10, dur * 0.30);
        const sustainEndTime = Math.max(pluckDecayTime + 0.01, dur * 0.90);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 6, time);
        filter.frequency.exponentialRampToValueAtTime(freq * 2.8, time + pluckDecayTime);
        filter.frequency.exponentialRampToValueAtTime(freq * 2.0, time + sustainEndTime);
        filter.Q.setValueAtTime(1.8, time);

        env.gain.setValueAtTime(0.0001, time);
        env.gain.linearRampToValueAtTime(vol * 0.95, time + attackTime);
        env.gain.exponentialRampToValueAtTime(vol * 0.62, time + pluckDecayTime);
        env.gain.exponentialRampToValueAtTime(vol * 0.45, time + sustainEndTime);
        env.gain.linearRampToValueAtTime(0.0001, time + dur);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(env);
        env.connect(audio.noteGain);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + dur + 0.015);
        osc2.stop(time + dur + 0.015);
        return;
    }

    const osc = audio.context.createOscillator();
    const env = audio.context.createGain();
    osc.frequency.setValueAtTime(freq, time);
    const currentClef = ui.clefSelect.value;
    const peakVol = (currentClef === 'F' || currentClef === 'C') ? vol * 0.85 : vol;
    osc.type = (currentClef === 'F' || currentClef === 'C') ? 'triangle' : 'sine';

    const attackTime = Math.min(0.012, dur * 0.15);
    const sustainEndTime = Math.max(attackTime + 0.01, dur * 0.90);

    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(peakVol, time + attackTime);
    env.gain.exponentialRampToValueAtTime(peakVol * 0.75, time + sustainEndTime);
    env.gain.linearRampToValueAtTime(0.0001, time + dur);

    osc.connect(env);
    env.connect(audio.noteGain);
    osc.start(time);
    osc.stop(time + dur + 0.015);
}

function playTunerDing() {
    if (!audio.context) return;
    const time = audio.context.currentTime;
    const osc = audio.context.createOscillator();
    const gain = audio.context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, time); // A5 chord confirmation ding
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.2, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    osc.connect(gain);
    gain.connect(audio.noteGain);
    osc.start(time);
    osc.stop(time + 0.35);
}

function playMetronomeSound(time, isAccent, beatNumber = 1) {
    if (!audio.context || !state.metronomeEnabled) return;
    if (audio.context.state !== 'running') { audio.context.resume().catch(() => {}); }

    if (state.metronomeSound === 'drums') {
        if (isAccent || beatNumber === 3) {
            const kickOsc = audio.context.createOscillator();
            const kickGain = audio.context.createGain();
            kickOsc.type = 'sine';
            kickOsc.frequency.setValueAtTime(130, time);
            kickOsc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
            kickGain.gain.setValueAtTime(state.metronomeVolume, time);
            kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
            kickOsc.connect(kickGain);
            kickGain.connect(audio.metronomeGain);
            audio.metronomeGain.gain.setValueAtTime(1, time);
            kickOsc.start(time);
            kickOsc.stop(time + 0.16);
        } else {
            const snareOsc = audio.context.createOscillator();
            const snareGain = audio.context.createGain();
            snareOsc.type = 'triangle';
            snareOsc.frequency.setValueAtTime(220, time);
            snareOsc.frequency.exponentialRampToValueAtTime(110, time + 0.08);
            snareGain.gain.setValueAtTime(state.metronomeVolume * 0.8, time);
            snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
            snareOsc.connect(snareGain);
            snareGain.connect(audio.metronomeGain);
            audio.metronomeGain.gain.setValueAtTime(1, time);
            snareOsc.start(time);
            snareOsc.stop(time + 0.11);
        }
        audio.lastMetronomeClickEnd = Math.max(audio.lastMetronomeClickEnd || 0, time + 0.085);
        return;
    }

    if ((state.metronomeSound === 'voice-es' || state.metronomeSound === 'voice-en') && 'speechSynthesis' in window) {
        audio.lastMetronomeClickEnd = Math.max(audio.lastMetronomeClickEnd || 0, time + 0.18);
        const delayMs = Math.max(0, (time - audio.context.currentTime) * 1000);
        setTimeout(() => {
            if (!state.exerciseStarted || state.isPaused || !state.metronomeEnabled) return;
            window.speechSynthesis.cancel();
            const wordsEs = ['Uno', 'Dos', 'Tres', 'Cuatro'];
            const wordsEn = ['One', 'Two', 'Three', 'Four'];
            const wordList = state.metronomeSound === 'voice-es' ? wordsEs : wordsEn;
            const utter = new SpeechSynthesisUtterance(wordList[(beatNumber - 1) % 4] || String(beatNumber));
            utter.lang = state.metronomeSound === 'voice-es' ? 'es-ES' : 'en-US';
            utter.rate = 1.6;
            utter.volume = Math.min(1, Math.max(0, state.metronomeVolume));
            window.speechSynthesis.speak(utter);
        }, delayMs);
        return;
    }

    const osc = audio.context.createOscillator();
    const clickGain = audio.context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 1000 : 800, time);
    clickGain.gain.setValueAtTime(0.001, time);
    clickGain.gain.linearRampToValueAtTime(state.metronomeVolume, time + 0.005);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(clickGain);
    clickGain.connect(audio.metronomeGain);
    audio.metronomeGain.gain.setValueAtTime(1, time);
    audio.lastMetronomeClickEnd = time + 0.075;
    osc.start(time);
    osc.stop(time + 0.06);
}

// Teoría musical, generación de melodías, armonía, inversiones, voicings y cifrado

function getNoteRangeForDifficulty() {
    const clef = ui.clefSelect.value;
    const difficulty = ui.difficultySelect.value;
    let minNote = 'E/4', maxNote = 'F/5';

    if (clef === 'G') {
        if (difficulty === 'basico') { minNote = 'E/4'; maxNote = 'F/5'; }
        else if (difficulty === 'medium') { minNote = 'E/3'; maxNote = 'A/5'; }
        else { minNote = 'E/3'; maxNote = 'E/6'; }
    } else if (clef === 'F') {
        if (difficulty === 'basico') { minNote = 'G/2'; maxNote = 'A/3'; }
        else if (difficulty === 'medium') { minNote = 'E/2'; maxNote = 'C/4'; }
        else { minNote = 'C/2'; maxNote = 'E/4'; }
    } else if (clef === 'C') {
        if (difficulty === 'basico') { minNote = 'F/3'; maxNote = 'G/4'; }
        else if (difficulty === 'medium') { minNote = 'C/3'; maxNote = 'C/5'; }
        else { minNote = 'G/2'; maxNote = 'E/5'; }
    }

    const minMidi = notesData.chromaticMap[minNote];
    const maxMidi = notesData.chromaticMap[maxNote];
    let pool = notesData.all.filter(n => {
        const midi = notesData.chromaticMap[n];
        return midi >= minMidi && midi <= maxMidi;
    });

    if (clef === 'G' && state.fretPosition && state.fretPosition !== 'all') {
        const [minFret, maxFret] = state.fretPosition.split('-').map(Number);
        const positionFiltered = pool.filter(n => {
            const positions = notesData.guitarFretboard[n];
            return positions && positions.some(pos => pos.fret >= minFret && pos.fret <= maxFret);
        });
        if (positionFiltered.length > 0) pool = positionFiltered;
    }

    return pool;
}

function alterNote(note, semitones) {
    if (!note || typeof note !== 'string' || !note.includes('/')) return null;
    const [name, octStr] = note.split('/');
    const octave = parseInt(octStr, 10);
    if (isNaN(octave)) return null;
    if (semitones % 12 === 0) {
        const newOctave = octave + (semitones / 12);
        const candidate = `${name}/${newOctave}`;
        return notesData.all.includes(candidate) ? candidate : null;
    }
    const currentMidi = notesData.chromaticMap[note];
    if (currentMidi === undefined) return null;
    const targetMidi = currentMidi + semitones;
    return notesData.all.find(n => notesData.chromaticMap[n] === targetMidi) || null;
}

function generateMelodicNote(notePool, lastNote, previousNote) {
    if (!notePool || notePool.length === 0) return 'C/4';
    const lastIndex = lastNote ? notePool.indexOf(lastNote) : -1;
    if (lastIndex === -1) {
        return notePool[Math.floor(randomFloat() * notePool.length)];
    }

    const maxLeap = ui.difficultySelect.value === 'basico' ? 2 : (ui.difficultySelect.value === 'medium' ? 4 : 6);
    const candidates = [];
    for (let i = 0; i < notePool.length; i++) {
        const dist = Math.abs(i - lastIndex);
        if (dist <= maxLeap) {
            const note = notePool[i];
            if (note === lastNote && lastNote === previousNote && notePool.length > 1) continue;
            const weight = dist === 1 ? 4 : (dist === 2 ? 3 : 1);
            for (let w = 0; w < weight; w++) candidates.push(note);
        }
    }

    if (candidates.length === 0) {
        return notePool[Math.floor(randomFloat() * notePool.length)];
    }
    return candidates[Math.floor(randomFloat() * candidates.length)];
}

function findPlayableChordVoicingOnFretboard(notes) {
    if (!Array.isArray(notes) || notes.length === 0) return null;
    const NUM_FRETS = 15;
    let minF = 0, maxF = NUM_FRETS;
    if (state.fretPosition && state.fretPosition !== 'all') {
        const [f1, f2] = state.fretPosition.split('-').map(Number);
        minF = f1; maxF = f2;
    }

    const sortedNotes = [...notes].sort((a, b) => notesData.chromaticMap[a] - notesData.chromaticMap[b]);
    const candidatesPerNote = sortedNotes.map(note => {
        const positions = notesData.guitarFretboard[note] || [];
        return positions.filter(p => p.fret >= minF && p.fret <= maxF).map(p => ({ note, string: p.string, fret: p.fret }));
    });

    if (candidatesPerNote.some(list => list.length === 0)) return null;

    let bestSolution = null;
    let bestScore = Infinity;

    function backtrack(idx, chosen, usedStrings) {
        if (idx === sortedNotes.length) {
            const fretted = chosen.filter(c => c.fret > 0).map(c => c.fret);
            let span = 0;
            let avgFret = 0;
            if (fretted.length > 0) {
                const minFretUsed = Math.min(...fretted);
                const maxFretUsed = Math.max(...fretted);
                span = maxFretUsed - minFretUsed;
                if (span > 4) return;
                avgFret = fretted.reduce((a, b) => a + b, 0) / fretted.length;
            }
            // Preferir formas compactas y en trastes bajos/medios sin cuerdas cruzadas
            const score = (span * 10) + avgFret;
            if (score < bestScore) {
                bestScore = score;
                bestSolution = [...chosen];
            }
            return;
        }

        for (const cand of candidatesPerNote[idx]) {
            if (usedStrings.has(cand.string)) continue;
            usedStrings.add(cand.string);
            chosen.push(cand);
            backtrack(idx + 1, chosen, usedStrings);
            chosen.pop();
            usedStrings.delete(cand.string);
        }
    }

    backtrack(0, [], new Set());
    return bestSolution;
}

function generateExercise() {
    const allMeasures = []; 
    let notesPerMeasure = state.timeSignatureBeats;
    if (state.exerciseType === 'armonia' && state.notesPerChord === 4) notesPerMeasure = 2;

    let weakNotePool = [];
    if (state.isWeaknessMode && userData?.stats?.globalNoteStats) {
        const entries = Object.entries(userData.stats.globalNoteStats)
            .filter(([_, data]) => data.misses > 0)
            .sort((a, b) => b[1].misses - a[1].misses)
            .slice(0, 6)
            .map(([noteName]) => noteName);
        weakNotePool = entries;
    }

    const progressionMap = {
        '1-4-5-1': [
            { root: 'C', quadType: 'maj7' },
            { root: 'F', quadType: 'maj7' },
            { root: 'G', quadType: 'dom7' },
            { root: 'C', quadType: 'maj7' }
        ],
        '2-5-1': [
            { root: 'D', quadType: 'm7' },
            { root: 'G', quadType: 'dom7' },
            { root: 'C', quadType: 'maj7' },
            { root: 'C', quadType: 'maj7' }
        ],
        '1-6-2-5': [
            { root: 'C', quadType: 'maj7' },
            { root: 'A', quadType: 'm7' },
            { root: 'D', quadType: 'm7' },
            { root: 'G', quadType: 'dom7' }
        ]
    };
    let progStep = 0;

    const scaleNotesForKey = notesData.keySignatures[state.keySignature].notes;
    const scaleSet = new Set(scaleNotesForKey);

    const getDiatonicStepFrom = (note, stepDir, diatonicPool) => {
        const idx = diatonicPool.indexOf(note);
        if (idx === -1) return null;
        const targetIdx = idx + stepDir;
        if (targetIdx < 0 || targetIdx >= diatonicPool.length) return null;
        return diatonicPool[targetIdx];
    };

    const resolveMidiToNote = (targetMidi, preferredAcc, fullRange, measureLock, tempLock) => {
        const pitchClass = ((targetMidi % 12) + 12) % 12;
        let candidates = fullRange.filter(n => notesData.chromaticMap[n] === targetMidi);
        if (candidates.length === 0) return null;

        const lockedBase = tempLock[pitchClass] || measureLock[pitchClass];
        if (lockedBase) {
            return candidates.find(n => n.split('/')[0] === lockedBase) || null;
        }

        if (state.chromaticAccidentalType === 'sharps') {
            candidates = candidates.filter(n => !n.split('/')[0].includes('b'));
        } else if (state.chromaticAccidentalType === 'flats') {
            candidates = candidates.filter(n => !n.split('/')[0].includes('#'));
        }
        if (candidates.length === 0) return null;

        let chosen = candidates[0];
        if (candidates.length > 1 && preferredAcc) {
            const prefMatch = candidates.find(n => n.split('/')[0].includes(preferredAcc));
            if (prefMatch) chosen = prefMatch;
        }
        tempLock[pitchClass] = chosen.split('/')[0];
        return chosen;
    };

    let lastModelCategory = null;

    const buildChromaticUnit = (unitLen, diatonicPool, fullRange, prevNote, measureLock) => {
        const isChromaticNote = (n) => !scaleSet.has(n.split('/')[0]);
        const prevMidi = prevNote ? notesData.chromaticMap[prevNote] : null;

        // Definición exacta de modelos relativos a la nota objetivo T (offset 0) o raíz R
        const templates3 = [
            // 1. Notas de paso cromáticas (C -> C# -> D y D -> Db -> C)
            { cat: 'passing', offsets: [-2, -1, 0], prefs: [null, '#', null], reqDiatonicFirst: true, reqWholeToneSpan: true },
            { cat: 'passing', offsets: [2, 1, 0], prefs: [null, 'b', null], reqDiatonicFirst: true, reqWholeToneSpan: true },
            // 2. Doble aproximación de 2 notas hacia T (Bb -> B -> C y D -> Db -> C)
            { cat: 'double_approach', offsets: [-2, -1, 0], prefs: ['b', '#', null] },
            { cat: 'double_approach', offsets: [2, 1, 0], prefs: [null, 'b', null] },
            // 3. Aproximación simple / Bordadura cromática (D -> C# -> D, C -> Db -> C)
            { cat: 'approach', offsets: [0, -1, 0], prefs: [null, '#', null] },
            { cat: 'approach', offsets: [0, 1, 0], prefs: [null, 'b', null] },
            // 4. Encerradas de 1/2 tono - 1 tono y viceversa (B -> D -> C, D -> B -> C, Bb -> Db -> C, Db -> Bb -> C)
            { cat: 'enclosure_hw', offsets: [-1, 2, 0], prefs: ['#', null, null] },
            { cat: 'enclosure_hw', offsets: [2, -1, 0], prefs: [null, '#', null] },
            { cat: 'enclosure_wh', offsets: [-2, 1, 0], prefs: ['b', 'b', null] },
            { cat: 'enclosure_wh', offsets: [1, -2, 0], prefs: ['b', 'b', null] },
            // 5. Encerradas de 1/2 tono - 1/2 tono (B -> Db -> C y Db -> B -> C)
            { cat: 'enclosure_hh', offsets: [-1, 1, 0], prefs: ['#', 'b', null] },
            { cat: 'enclosure_hh', offsets: [1, -1, 0], prefs: ['b', '#', null] },
            // 6. Encerradas de 1 tono - 1 tono (Bb -> D -> C y D -> Bb -> C)
            { cat: 'enclosure_ww', offsets: [-2, 2, 0], prefs: ['b', null, null] },
            { cat: 'enclosure_ww', offsets: [2, -2, 0], prefs: [null, 'b', null] },
            // 7. Arpegios de Tríada con nota cromática
            { cat: 'arpeggio', offsets: [0, 4, 7], prefs: [null, '#', null], isRootBased: true },
            { cat: 'arpeggio', offsets: [0, 3, 7], prefs: [null, 'b', null], isRootBased: true },
            { cat: 'arpeggio', offsets: [7, 3, 0], prefs: [null, 'b', null], isRootBased: true },
            { cat: 'arpeggio', offsets: [0, 3, 6], prefs: [null, 'b', 'b'], isRootBased: true },
            { cat: 'arpeggio', offsets: [0, 4, 8], prefs: [null, null, '#'], isRootBased: true }
        ];

        const templates4 = [
            // 1. Doble aproximación cromática de 4 notas (A -> Bb -> B -> C y Eb -> D -> Db -> C)
            { cat: 'double_approach', offsets: [-3, -2, -1, 0], prefs: [null, 'b', null, null], reqDiatonicFirst: true },
            { cat: 'double_approach', offsets: [3, 2, 1, 0], prefs: ['b', null, 'b', null] },
            // 2. Doble encerrada / Combinadas de 4 notas (D -> Db -> B -> C, B -> D -> Db -> C, Bb -> B -> Db -> C, etc.)
            { cat: 'double_enclosure', offsets: [2, 1, -1, 0], prefs: [null, 'b', '#', null] },
            { cat: 'double_enclosure', offsets: [-1, 2, 1, 0], prefs: ['#', null, 'b', null] },
            { cat: 'double_enclosure', offsets: [-2, -1, 1, 0], prefs: ['b', null, 'b', null] },
            { cat: 'double_enclosure', offsets: [1, -2, -1, 0], prefs: ['b', 'b', null, null] },
            { cat: 'double_enclosure', offsets: [-2, -1, 2, 0], prefs: ['b', null, null, null] },
            { cat: 'double_enclosure', offsets: [2, -2, -1, 0], prefs: [null, 'b', null, null] },
            // 3. Arpegios de Tétrada con nota cromática y Aproximación + Tríada
            { cat: 'arpeggio', offsets: [0, 4, 7, 10], prefs: [null, '#', null, 'b'], isRootBased: true },
            { cat: 'arpeggio', offsets: [10, 7, 4, 0], prefs: ['b', null, '#', null], isRootBased: true },
            { cat: 'arpeggio', offsets: [0, 3, 7, 10], prefs: [null, 'b', null, 'b'], isRootBased: true },
            { cat: 'arpeggio', offsets: [0, 3, 6, 10], prefs: [null, 'b', 'b', 'b'], isRootBased: true },
            { cat: 'arpeggio', offsets: [0, 3, 6, 9], prefs: [null, null, null, 'b'], isRootBased: true },
            { cat: 'arpeggio', offsets: [-1, 0, 4, 7], prefs: ['#', null, null, null], isRootBased: true },
            { cat: 'arpeggio', offsets: [-1, 0, 3, 7], prefs: ['#', null, null, null], isRootBased: true },
            { cat: 'arpeggio', offsets: [0, 4, 8, 9], prefs: [null, null, '#', null], isRootBased: true }
        ];

        const candidates = [];

        const evaluateCell = (notes, cat, tempLock) => {
            if (!notes || notes.length !== unitLen) return;
            if (!notes.some(isChromaticNote)) return;

            let score = randomFloat() * 1.5;
            if (cat === lastModelCategory) score += 4;

            if (prevMidi !== null) {
                const entryDist = Math.abs(notesData.chromaticMap[notes[0]] - prevMidi);
                if (entryDist === 0) score += 6;
                else if (entryDist <= 2) score += 0;
                else if (entryDist <= 4) score += 1.5;
                else score += entryDist * 2.5;
            }
            candidates.push({ notes, cat, tempLock, score });
        };

        for (const anchorNote of diatonicPool) {
            const anchorMidi = notesData.chromaticMap[anchorNote];

            if (unitLen === 2) {
                for (const [off, pref] of [[-1, '#'], [1, 'b']]) {
                    const tempLock = {};
                    const n1 = resolveMidiToNote(anchorMidi + off, pref, fullRange, measureLock, tempLock);
                    if (n1 && isChromaticNote(n1)) {
                        evaluateCell([n1, anchorNote], 'approach', tempLock);
                    }
                }
                continue;
            }

            if (unitLen === 3 || unitLen === 4) {
                for (const tpl of templates3) {
                    const tempLock = {};
                    const cell3 = [];
                    let ok = true;
                    for (let k = 0; k < 3; k++) {
                        const off = tpl.offsets[k];
                        const n = off === 0
                            ? anchorNote
                            : resolveMidiToNote(anchorMidi + off, tpl.prefs[k], fullRange, measureLock, tempLock);
                        if (!n) { ok = false; break; }
                        if (k === 0 && tpl.reqDiatonicFirst && !scaleSet.has(n.split('/')[0])) { ok = false; break; }
                        cell3.push(n);
                    }
                    if (!ok) continue;

                    if (unitLen === 3) {
                        evaluateCell(cell3, tpl.cat, tempLock);
                    } else {
                        // Extender el modelo de 3 notas a 4 notas con 1 grado conjunto diatónico antes o después
                        const stepAfterUp = getDiatonicStepFrom(cell3[2], 1, diatonicPool);
                        const stepAfterDown = getDiatonicStepFrom(cell3[2], -1, diatonicPool);
                        if (stepAfterUp && stepAfterUp !== cell3[1]) {
                            evaluateCell([...cell3, stepAfterUp], tpl.cat, { ...tempLock });
                        }
                        if (stepAfterDown && stepAfterDown !== cell3[1]) {
                            evaluateCell([...cell3, stepAfterDown], tpl.cat, { ...tempLock });
                        }
                        const firstDiatonicIdx = diatonicPool.indexOf(cell3[0]);
                        if (firstDiatonicIdx !== -1) {
                            for (const dir of [-1, 1]) {
                                const stepBefore = getDiatonicStepFrom(cell3[0], dir, diatonicPool);
                                if (stepBefore && stepBefore !== cell3[1]) {
                                    evaluateCell([stepBefore, ...cell3], tpl.cat, { ...tempLock });
                                }
                            }
                        }
                    }
                }
            }

            if (unitLen === 4) {
                for (const tpl of templates4) {
                    const tempLock = {};
                    const cell4 = [];
                    let ok = true;
                    for (let k = 0; k < 4; k++) {
                        const off = tpl.offsets[k];
                        const n = off === 0
                            ? anchorNote
                            : resolveMidiToNote(anchorMidi + off, tpl.prefs[k], fullRange, measureLock, tempLock);
                        if (!n) { ok = false; break; }
                        if (k === 0 && tpl.reqDiatonicFirst && !scaleSet.has(n.split('/')[0])) { ok = false; break; }
                        cell4.push(n);
                    }
                    if (ok) evaluateCell(cell4, tpl.cat, tempLock);
                }
            }
        }

        if (candidates.length === 0) return null;
        candidates.sort((a, b) => a.score - b.score);
        const topPool = candidates.slice(0, Math.min(6, candidates.length));
        const picked = topPool[Math.floor(randomFloat() * topPool.length)];
        Object.assign(measureLock, picked.tempLock);
        lastModelCategory = picked.cat;
        return picked.notes;
    };

    const buildStepwiseDiatonicUnit = (unitLen, diatonicPool, prevNote) => {
        const res = [];
        let cur = prevNote;
        for (let k = 0; k < unitLen; k++) {
            let next = null;
            if (cur) {
                const curMidi = notesData.chromaticMap[cur];
                const nearby = diatonicPool.filter(n => {
                    const d = Math.abs(notesData.chromaticMap[n] - curMidi);
                    return d >= 1 && d <= 2;
                });
                if (nearby.length > 0) {
                    next = nearby[Math.floor(randomFloat() * nearby.length)];
                }
            }
            if (!next) {
                next = generateMelodicNote(diatonicPool, cur, res.length > 1 ? res[res.length - 2] : null);
            }
            res.push(next);
            cur = next;
        }
        return res;
    };

    const buildPitchesForMeasureBlock = (blockLen, diatonicPool, fullRange, recentPitches, measureLock) => {
        if (state.chromaticMode === 'none') {
            const out = [];
            for (let k = 0; k < blockLen; k++) {
                const lastN = recentPitches.length > 0 ? recentPitches[recentPitches.length - 1] : null;
                const prevN = recentPitches.length > 1 ? recentPitches[recentPitches.length - 2] : null;
                let pitch;
                if (state.isWeaknessMode && weakNotePool.length > 0 && randomFloat() < 0.7) {
                    const validWeak = weakNotePool.filter(wn => diatonicPool.includes(wn));
                    pitch = validWeak.length > 0
                        ? validWeak[Math.floor(randomFloat() * validWeak.length)]
                        : generateMelodicNote(diatonicPool, lastN, prevN);
                } else {
                    pitch = generateMelodicNote(diatonicPool, lastN, prevN);
                }
                recentPitches.push(pitch);
                out.push(pitch);
            }
            return out;
        }

        // Particionar el bloque del compás en sub-unidades de 2, 3 o 4 notas para que ningún modelo quede cortado
        const subLengths = [];
        let rem = blockLen;
        while (rem > 0) {
            if (rem === 4 || rem === 3 || rem === 2 || rem === 1) {
                subLengths.push(rem);
                rem = 0;
            } else if (rem === 5) {
                subLengths.push(3, 2);
                rem = 0;
            } else if (rem === 6) {
                subLengths.push(3, 3);
                rem = 0;
            } else if (rem === 7) {
                subLengths.push(4, 3);
                rem = 0;
            } else {
                subLengths.push(4);
                rem -= 4;
            }
        }

        const out = [];
        subLengths.forEach((uLen, idx) => {
            const prevNote = recentPitches.length > 0 ? recentPitches[recentPitches.length - 1] : null;
            const useChromatic = state.chromaticMode === 'heavy' ? (uLen >= 2) : (idx === 0 && uLen >= 2);
            let unitNotes = null;
            if (useChromatic) {
                unitNotes = buildChromaticUnit(uLen, diatonicPool, fullRange, prevNote, measureLock);
            }
            if (!unitNotes) {
                unitNotes = buildStepwiseDiatonicUnit(uLen, diatonicPool, prevNote);
            }
            unitNotes.forEach(n => {
                recentPitches.push(n);
                out.push(n);
            });
        });
        return out;
    };

    const recentPitches = [];
    
    for (let i = 0; i < state.measuresPerExercise; i++) {
        if (state.exerciseType === 'melodia') {
            const fullRange = getNoteRangeForDifficulty().filter(n => {
                const base = n.split('/')[0];
                return !FORBIDDEN_ENHARMONICS.has(base) && !base.includes('##') && !base.includes('bb');
            });
            const diatonicNotePool = fullRange.filter(note => scaleSet.has(note.split('/')[0]));
            const activeDiatonicPool = diatonicNotePool.length > 0 ? diatonicNotePool : fullRange;

            const measureLock = {};
            scaleNotesForKey.forEach(nName => {
                if (!FORBIDDEN_ENHARMONICS.has(nName)) {
                    const midi = notesData.chromaticMap[`${nName}/4`];
                    if (midi !== undefined) measureLock[midi % 12] = nName;
                }
            });

            // 1. Generar primero la estructura rítmica del compás
            const measureContent = [];
            let currentBeat = 1;
            let noteIndex = 0;
            let hasAtLeastOnePlayableNote = false;

            while (currentBeat <= state.timeSignatureBeats) {
                const beatsLeft = state.timeSignatureBeats - currentBeat + 1;
                let fig = 'q';
                const r = randomFloat();

                if (state.rhythmMode === 'quarters') {
                    fig = 'q';
                } else if (state.rhythmMode === 'halves_quarters') {
                    fig = (beatsLeft >= 2 && r < 0.45) ? 'h' : 'q';
                } else if (state.rhythmMode === 'eighths_quarters') {
                    fig = (r < 0.4) ? '8_pair' : 'q';
                } else if (state.rhythmMode === 'with_rests') {
                    const canRest = hasAtLeastOnePlayableNote || beatsLeft > 1;
                    fig = (canRest && r < 0.25) ? 'qr' : 'q';
                } else if (state.rhythmMode === 'mixed') {
                    if (beatsLeft >= 2 && r < 0.25) fig = 'h';
                    else if (r < 0.5) fig = '8_pair';
                    else if ((hasAtLeastOnePlayableNote || beatsLeft > 1) && r < 0.65) fig = 'qr';
                    else fig = 'q';
                }

                if (fig === 'h') {
                    hasAtLeastOnePlayableNote = true;
                    measureContent.push({
                        note: null, duration: 'h', beat: currentBeat, subBeat: 0,
                        beats: 2, isRest: false, noteIndex: noteIndex++
                    });
                    currentBeat += 2;
                } else if (fig === '8_pair') {
                    hasAtLeastOnePlayableNote = true;
                    const beamId = `${i}-${currentBeat}`;
                    measureContent.push({
                        note: null, duration: '8', beat: currentBeat, subBeat: 0,
                        beats: 0.5, isRest: false, beamGroup: beamId, noteIndex: noteIndex++
                    });
                    measureContent.push({
                        note: null, duration: '8', beat: currentBeat, subBeat: 0.5,
                        beats: 0.5, isRest: false, beamGroup: beamId, noteIndex: noteIndex++
                    });
                    currentBeat += 1;
                } else if (fig === 'qr') {
                    measureContent.push({
                        note: null, duration: 'qr', beat: currentBeat, subBeat: 0,
                        beats: 1, isRest: true, noteIndex: noteIndex++
                    });
                    currentBeat += 1;
                } else {
                    hasAtLeastOnePlayableNote = true;
                    measureContent.push({
                        note: null, duration: 'q', beat: currentBeat, subBeat: 0,
                        beats: 1, isRest: false, noteIndex: noteIndex++
                    });
                    currentBeat += 1;
                }
            }

            // 2. Asignar las alturas por bloques contiguos dentro del compás para preservar cada modelo completo
            let idx = 0;
            while (idx < measureContent.length) {
                if (measureContent[idx].isRest) {
                    idx++;
                    continue;
                }
                let endIdx = idx;
                while (endIdx < measureContent.length && !measureContent[endIdx].isRest) {
                    endIdx++;
                }
                const blockLength = endIdx - idx;
                const blockPitches = buildPitchesForMeasureBlock(
                    blockLength,
                    activeDiatonicPool,
                    fullRange,
                    recentPitches,
                    measureLock
                );
                for (let k = 0; k < blockLength; k++) {
                    measureContent[idx + k].note = blockPitches[k];
                }
                idx = endIdx;
            }

            allMeasures.push(measureContent);
        } else {
            const measureContent = []; let measureTries = 0;
            const activeProg = (state.harmonyProgression !== 'random' && progressionMap[state.harmonyProgression])
                ? progressionMap[state.harmonyProgression]
                : null;
            const progCycle = (activeProg && notesPerMeasure === 3 && state.harmonyProgression === '2-5-1')
                ? activeProg.slice(0, 3)
                : activeProg;

            while(measureContent.length < notesPerMeasure && measureTries < 200) {
                const noteRange = getNoteRangeForDifficulty(); 
                let forcedDegree = null;
                if (progCycle) {
                    forcedDegree = progCycle[progStep % progCycle.length];
                }
                const item = generateHarmonicItem(noteRange, forcedDegree); 
                if (item) {
                    progStep++;
                    measureContent.push(item);
                }
                measureTries++;
            }
            if (measureContent.length === notesPerMeasure) allMeasures.push(measureContent);
            else { i--; }
        }
    }
    return allMeasures;
}
function generateHarmonicItem(noteRange, forcedDegree = null) {
    const numNotes = state.notesPerChord;
    const forcedRoot = forcedDegree ? (typeof forcedDegree === 'object' ? forcedDegree.root : forcedDegree) : null;
    const forcedQuadType = (forcedDegree && typeof forcedDegree === 'object') ? forcedDegree.quadType : null;

    const buildPoolForRange = (activeRange, relaxFilters = false) => {
        const pool = [];
        if (numNotes === 2) {
            const diatonicScale = notesData.keySignatures['C'].notes; 
            const diatonicNotePool = activeRange.filter(note => diatonicScale.includes(note.split('/')[0]));
            let intervalStepsList = state.selectedInterval === 'custom' ? Array.from(state.selectedCustomIntervals).map(i => parseInt(i, 10)) : (state.selectedInterval == 0 ? [1,2,3,4,5,6,7] : [parseInt(state.selectedInterval, 10)]);

            for (let rootIndex = 0; rootIndex < diatonicNotePool.length; rootIndex++) {
                const rootNote = diatonicNotePool[rootIndex];
                for (let steps of intervalStepsList) {
                    const topNoteIndex = rootIndex + steps;
                    if (topNoteIndex < diatonicNotePool.length) pool.push([rootNote, diatonicNotePool[topNoteIndex]]);
                }
            }
        } else if (numNotes === 3) {
            const diatonicScale = notesData.keySignatures['C'].notes;
            const candidateRoots = notesData.all.filter(note => {
                const [rName, octStr] = note.split('/');
                const oct = parseInt(octStr, 10);
                if (oct < 3 || oct > 5) return false;
                if (forcedRoot && rName !== forcedRoot) return false;
                return diatonicScale.includes(rName);
            });

            let triadTypes = relaxFilters
                ? ['triad_fundamental', 'triad_inv1', 'triad_inv2']
                : (state.selectedTriad === 'all' ? Array.from(ui.triadSelect.options).filter(o => !['all', 'custom'].includes(o.value)).map(o => o.value) : (state.selectedTriad === 'custom' ? Array.from(state.selectedCustomTriads) : [state.selectedTriad]));

            for (let rootNote of candidateRoots) {
                const rootName = rootNote.split('/')[0];
                for (let triadType of triadTypes) {
                    const [chordFamily] = triadType.split('_');
                    let fundamentalNoteNames;
                    if (chordFamily === 'shell') fundamentalNoteNames = notesData.diatonicShellVoicings[rootName];
                    else if (chordFamily === 'sus2') {
                        const rootIdx = diatonicScale.indexOf(rootName);
                        fundamentalNoteNames = [diatonicScale[rootIdx], diatonicScale[(rootIdx+1)%7], diatonicScale[(rootIdx+4)%7]];
                    } else if (chordFamily === 'sus4') {
                        const rootIdx = diatonicScale.indexOf(rootName);
                        fundamentalNoteNames = [diatonicScale[rootIdx], diatonicScale[(rootIdx+3)%7], diatonicScale[(rootIdx+4)%7]];
                    } else fundamentalNoteNames = notesData.diatonicTriads[rootName];

                    const closeChord = findClosestNotes(rootNote, fundamentalNoteNames, notesData.all);
                    if (!closeChord || closeChord.length !== 3) continue;

                    let chordVariants = [];
                    if (chordFamily === 'shell') {
                        chordVariants.push([...closeChord]);
                        const thirdUp = alterNote(closeChord[1], 12);
                        if (thirdUp) chordVariants.push([closeChord[0], closeChord[2], thirdUp]);
                    } else if (triadType === 'triad_inv1') {
                        const newRoot = alterNote(closeChord[0], 12);
                        if (newRoot) chordVariants.push([closeChord[1], closeChord[2], newRoot]);
                    } else if (triadType === 'triad_inv2') {
                        const newFifth = alterNote(closeChord[2], -12);
                        if (newFifth) chordVariants.push([newFifth, closeChord[0], closeChord[1]]);
                        const newRoot = alterNote(closeChord[0], 12);
                        const newThird = alterNote(closeChord[1], 12);
                        if (newRoot && newThird) chordVariants.push([closeChord[2], newRoot, newThird]);
                    } else {
                        chordVariants.push([...closeChord]);
                    }

                    for (let variant of chordVariants) {
                        variant.sort((a,b) => notesData.chromaticMap[a] - notesData.chromaticMap[b]);
                        let targetPositions = (chordFamily.startsWith('sus') || chordFamily === 'shell') ? ['cerrada'] : (relaxFilters || state.triadPosition === 'all' ? ['cerrada', 'abierta'] : [state.triadPosition]);
                        for (let pos of targetPositions) {
                            if (pos === 'cerrada') {
                                if (variant.every(n => activeRange.includes(n)) && notesData.chromaticMap[variant[0]] >= notesData.chromaticMap['A/3']) {
                                    pool.push(variant);
                                }
                            } else if (pos === 'abierta') {
                                const midUp = alterNote(variant[1], 12);
                                if (midUp) {
                                    const openVariant = [variant[0], variant[2], midUp].sort((a,b) => notesData.chromaticMap[a] - notesData.chromaticMap[b]);
                                    if (openVariant.every(n => activeRange.includes(n))) pool.push(openVariant);
                                }
                            }
                        }
                    }
                }
            }
        } else if (numNotes === 4) {
            let chordTypes;
            if (forcedQuadType && (relaxFilters || state.selectedQuadChordType === 'all')) {
                chordTypes = [forcedQuadType];
            } else {
                chordTypes = state.selectedQuadChordType === 'custom' ? Array.from(state.selectedCustomQuadChordTypes) : (state.selectedQuadChordType === 'all' ? ['maj7','m7','dom7','m7b5','dim7'] : [state.selectedQuadChordType]);
            }
            let inversions = relaxFilters ? ['0','1','2','3'] : (state.selectedQuadInversion === 'custom' ? Array.from(state.selectedCustomQuadInversions) : (state.selectedQuadInversion === 'all' ? ['0','1','2','3'] : [state.selectedQuadInversion]));
            let voicings = relaxFilters ? Object.keys(notesData.voicingInversionMap) : (state.selectedQuadVoicing === 'custom' ? Array.from(state.selectedCustomVoicings) : (state.selectedQuadVoicing === 'all' ? Object.keys(notesData.voicingInversionMap) : [state.selectedQuadVoicing]));

            const rootKeys = forcedRoot && notesData.allowedFourNoteChords[forcedRoot] ? [forcedRoot] : Object.keys(notesData.allowedFourNoteChords);
            for (let rootName of rootKeys) {
                const chords = notesData.allowedFourNoteChords[rootName];
                for (let chordType of chordTypes) {
                    let suffix = chordType === 'dom7' ? '7' : (chordType === 'dim7' ? '°7' : chordType);
                    const chordDef = chords.find(c => {
                         if (suffix === 'm7') return c.name.endsWith('m7') && !c.name.endsWith('m7b5');
                         if (suffix === '7') return c.name.endsWith('7') && !c.name.endsWith('maj7') && !c.name.endsWith('m7') && !c.name.endsWith('°7');
                         return c.name.endsWith(suffix);
                    });
                    if (!chordDef) continue;

                    for (let inv of inversions) {
                        if (chordDef.name.includes('°7') && inv !== '0') continue;
                        for (let voicing of voicings) {
                            const sourceInversion = notesData.voicingInversionMap[voicing] ? notesData.voicingInversionMap[voicing][inv] : inv;
                            const possibleCloseChords = getAllClosePositionInversions(chordDef.notes, parseInt(sourceInversion, 10), activeRange);
                            for (let closeChord of possibleCloseChords) {
                                const voicedChord = applyVoicing(closeChord, voicing, activeRange);
                                if (voicedChord && voicedChord.every(n => n && activeRange.includes(n))) {
                                    voicedChord.voicingApplied = voicing;
                                    pool.push(voicedChord);
                                }
                            }
                        }
                    }
                }
            }
        }
        return pool;
    };

    let validPool = buildPoolForRange(noteRange, false);

    // Si hay una progresión armónica activa y el rango o filtro estricto (ej. Nivel Básico) no tiene esa raíz en estado fundamental, flexibilizamos inversiones o ampliamos ligeramente el registro para garantizar la progresión
    if (validPool.length === 0 && forcedRoot) {
        validPool = buildPoolForRange(noteRange, true);
        if (validPool.length === 0) {
            const expandedMin = notesData.chromaticMap['A/3'];
            const expandedMax = notesData.chromaticMap['A/5'];
            const expandedRange = notesData.all.filter(n => {
                const m = notesData.chromaticMap[n];
                return m >= expandedMin && m <= expandedMax;
            });
            validPool = buildPoolForRange(expandedRange, true);
        }
    }

    if (validPool.length === 0) return null;
    const playableChordPool = validPool.filter(chord => findPlayableChordVoicingOnFretboard(chord) !== null);
    const finalPool = playableChordPool.length > 0 ? playableChordPool : validPool;
    return finalPool[Math.floor(randomFloat() * finalPool.length)];
}

function getAllClosePositionInversions(noteNames, inversion, noteRange) {
    const results = [];
    if (inversion >= noteNames.length) return results;
    const bassNoteName = noteNames[inversion];
    for(let octave = 2; octave <= 6; octave++) {
        const bassNote = `${bassNoteName}/${octave}`;
        if (!noteRange.includes(bassNote)) continue;
        const chord = [bassNote];
        let lastNoteValue = notesData.chromaticMap[bassNote];
        let success = true;

        for (let i = 1; i < noteNames.length; i++) {
            const targetName = noteNames[(inversion + i) % noteNames.length];
            let nextNote = null; const lastOctave = parseInt(chord[i-1].split('/')[1]);
            for (let oct_offset = 0; oct_offset <= 2; oct_offset++) {
                const currentOctave = lastOctave + oct_offset;
                const candidateNote = `${targetName}/${currentOctave}`;
                if (notesData.all.includes(candidateNote) && notesData.chromaticMap[candidateNote] > lastNoteValue) { nextNote = candidateNote; break; }
            }
            if (nextNote && noteRange.includes(nextNote)) { chord.push(nextNote); lastNoteValue = notesData.chromaticMap[nextNote]; } 
            else { success = false; break; }
        }
        if (success) results.push(chord);
    }
    return results;
}

function applyVoicing(closePositionChord, voicingType, noteRange) {
    const notesInOrder = [...closePositionChord].sort((a,b) => notesData.chromaticMap[b] - notesData.chromaticMap[a]);
    const [S, A, T, B] = notesInOrder;
    const drop = (note, octaves = 1) => { const newNote = alterNote(note, -12 * octaves); return (newNote && noteRange.includes(newNote)) ? newNote : null; };
    let voicedNotes = null;
    switch (voicingType) {
        case 'drop2': { const newA = drop(A); if (newA) voicedNotes = [S, T, B, newA]; break; }
        case 'drop3': { const newT = drop(T); if (newT) voicedNotes = [S, A, B, newT]; break; }
        case 'drop24': { const newA = drop(A); const newB = drop(B); if (newA && newB) voicedNotes = [S, T, newA, newB]; break; }
        case 'drop23': { const newA = drop(A); const newT = drop(T); if (newA && newT) voicedNotes = [S, B, newT, newA]; break; }
        case 'doubleDrop23': { const newA = drop(A, 2); const newT = drop(T, 1); if (!newA || !newT) break; voicedNotes = [S, B, newT, newA]; break; }
        default: return closePositionChord; 
    }
    if (!voicedNotes) return null;
    voicedNotes.sort((a, b) => notesData.chromaticMap[a] - notesData.chromaticMap[b]); return voicedNotes;
}

function findClosestNotes(rootNote, noteNames, noteRange) {
    if (!rootNote.startsWith(noteNames[0])) return null;
    const result = [rootNote]; let lastNoteValue = notesData.chromaticMap[rootNote];
    for (let i = 1; i < noteNames.length; i++) {
        const targetName = noteNames[i]; let bestCandidate = null;
        const lastOctave = parseInt(result[i-1].split('/')[1]);
        for (let oct = lastOctave; oct <= lastOctave + 2; oct++) {
            const candidateNote = `${targetName}/${oct}`;
            if (noteRange.includes(candidateNote) && notesData.chromaticMap[candidateNote] > lastNoteValue) { bestCandidate = candidateNote; break; }
        }
        if (bestCandidate) { result.push(bestCandidate); lastNoteValue = notesData.chromaticMap[bestCandidate]; } else return null;
    }
    return result.length === noteNames.length ? result : null;
}

function getIntervalAbbreviation(notes) {
    if (notes.length !== 2) return { name: '' };
    const [note1, note2] = notes.sort((a,b) => notesData.chromaticMap[a] - notesData.chromaticMap[b]);
    const [name1, oct1_str] = note1.split('/'); const [name2, oct2_str] = note2.split('/');
    const diatonicIndex1 = notesData.letterToDiatonic[name1[0]]; const diatonicIndex2 = notesData.letterToDiatonic[name2[0]];
    const diatonicDiff = (parseInt(oct2_str) - parseInt(oct1_str)) * 7 + (diatonicIndex2 - diatonicIndex1) + 1;
    const chromaticDiff = notesData.chromaticMap[note2] - notesData.chromaticMap[note1];
    return { name: notesData.intervalAbbreviations[`${diatonicDiff}-${chromaticDiff}`] || diatonicDiff.toString() };
}

function getChordName(notes) {
    if (!notes || notes.length < 2) return { name: '', figuredBass: [], root: null };
    const sortedNotes = [...notes].sort((a, b) => notesData.chromaticMap[a] - notesData.chromaticMap[b]);
    const bassNote = sortedNotes[0]; const bassNoteName = bassNote.split('/')[0];

    for (let i = 0; i < sortedNotes.length; i++) {
        const potentialRoot = sortedNotes[i]; const rootValue = notesData.chromaticMap[potentialRoot];
        const intervals = sortedNotes.map(n => (notesData.chromaticMap[n] - rootValue + 120) % 12).sort((a, b) => a - b);
        let quality = null; const intervalString = intervals.join(','); let rootNoteName = potentialRoot.split('/')[0];
        if (notes.length === 3) {
            if (intervalString === '0,4,11') quality = 'maj7'; else if (intervalString === '0,3,10') quality = 'm7'; else if (intervalString === '0,4,10') quality = '7'; else if (intervalString === '0,4,7') quality = ''; else if (intervalString === '0,3,7') quality = 'm'; else if (intervalString === '0,3,6') quality = '°'; else if (intervalString === '0,4,8') quality = '+'; else if (intervalString === '0,2,7') quality = 'sus2'; else if (intervalString === '0,5,7') quality = 'sus4';
        } else if (notes.length === 4) {
            if (intervalString === '0,4,7,11') quality = 'maj7'; else if (intervalString === '0,3,7,10') quality = 'm7'; else if (intervalString === '0,4,7,10') quality = '7'; else if (intervalString === '0,3,6,10') quality = 'm7♭5'; else if (intervalString === '0,3,6,9') quality = '°7';
        }
        if (quality !== null) {
            let chordName = rootNoteName === bassNoteName ? `${rootNoteName}${quality}` : `${rootNoteName}${quality}/${bassNoteName}`;
            let figuredBass = []; const isInversion = rootNoteName !== bassNoteName;
            if (notes.length === 3 && isInversion) {
                if (['','m','°','+'].includes(quality)) {
                    let interval = (notesData.letterToDiatonic[bassNoteName[0]] - notesData.letterToDiatonic[rootNoteName[0]] + 7) % 7;
                    if (interval === 2) figuredBass = ['6']; else if (interval === 4) figuredBass = ['6', '4'];
                }
            }
            return { name: chordName, figuredBass: figuredBass, root: rootNoteName };
        }
    }
    return { name: '', figuredBass: [], root: null };
}

function getEnharmonicName(midiVal, forceSystem = null) {
    const pc = ((midiVal % 12) + 12) % 12;
    const names = notesData.midiToEnharmonicName[pc];
    if (!names) return '';
    let baseName;
    if (names.sharp === names.flat) baseName = names.sharp;
    else if (state.enharmonicPreference === 'sharps') baseName = names.sharp;
    else if (state.enharmonicPreference === 'flats') baseName = names.flat;
    else baseName = notesData.keySignatures[state.keySignature].type === 'flat' ? names.flat : names.sharp;

    const system = forceSystem || state.notationSystem || 'american';
    if (system === 'latin') {
        const latinBase = notesData.noteToLatin[baseName[0]] || baseName[0];
        return latinBase + baseName.slice(1);
    }
    return baseName;
}

// Renderizado del mástil SVG, pentagrama VexFlow y guía visual

async function handleFretboardNoteClick(event) {
    if (state.exerciseStarted) return;
    const clickedNote = event.currentTarget.dataset.note;
    if (clickedNote) {
        try {
            await initAudioEngine();
            playNoteSound(clickedNote, audio.context.currentTime);
        } catch (e) {
            console.error("Error playing note sound on click:", e);
        }
        state.manualNotesToDisplay = [clickedNote];
        renderStave(state.manualNotesToDisplay); 
    }
}

function drawFretboardWithCurrentSettings() {
    if (state.exerciseType === 'melodia') {
        const scaleNoteNames = notesData.keySignatures[state.keySignature].notes;
        drawFretboard(getNoteRangeForDifficulty().filter(note => scaleNoteNames.includes(note.split('/')[0])));
    } else drawFretboard([]);
}

function drawFretboard(staticNotes = []) {
    const container = ui.fretboardContainer; container.innerHTML = '';
    const NUM_FRETS = 15, NUM_STRINGS = 6;
    const tuning = ['E/5', 'B/4', 'G/4', 'D/4', 'A/3', 'E/3'];
    const fretWidth = 50, stringHeight = 20, startX = 35, startY = 20;
    const svgWidth = startX + (NUM_FRETS * fretWidth) + fretWidth / 2 + 10; const svgHeight = startY + (NUM_STRINGS * stringHeight) + 30;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'fretboard-svg'); svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    container.appendChild(svg);
    
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', '#18181b'); svg.appendChild(bg);

    const wood = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    wood.setAttribute('x', startX); wood.setAttribute('y', startY); wood.setAttribute('width', NUM_FRETS * fretWidth);
    wood.setAttribute('height', (NUM_STRINGS - 1) * stringHeight); wood.setAttribute('fill', '#6b462a'); wood.setAttribute('rx', '5'); svg.appendChild(wood);

    [3, 5, 7, 9, 15].forEach(fret => {
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        marker.setAttribute('cx', startX + (fret * fretWidth) - fretWidth / 2); marker.setAttribute('cy', startY + (NUM_STRINGS * stringHeight) / 2 - stringHeight / 2);
        marker.setAttribute('r', 4); marker.setAttribute('fill', '#a1a1aa'); marker.setAttribute('opacity', '0.5'); svg.appendChild(marker);
    });
    const marker1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); marker1.setAttribute('cx', startX + (12 * fretWidth) - fretWidth / 2); marker1.setAttribute('cy', startY + 1.5 * stringHeight); marker1.setAttribute('r', 4); marker1.setAttribute('fill', '#a1a1aa'); marker1.setAttribute('opacity', '0.5'); svg.appendChild(marker1);
    const marker2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); marker2.setAttribute('cx', startX + (12 * fretWidth) - fretWidth / 2); marker2.setAttribute('cy', startY + 3.5 * stringHeight); marker2.setAttribute('r', 4); marker2.setAttribute('fill', '#a1a1aa'); marker2.setAttribute('opacity', '0.5'); svg.appendChild(marker2);

    for (let i = 0; i <= NUM_FRETS; i++) {
        const x = startX + (i * fretWidth); const fret = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        fret.setAttribute('x1', x); fret.setAttribute('y1', startY); fret.setAttribute('x2', x); fret.setAttribute('y2', startY + (NUM_STRINGS - 1) * stringHeight);
        fret.setAttribute('stroke', '#cccccc'); fret.setAttribute('stroke-width', i === 0 ? 6 : 2); svg.appendChild(fret);
    }
    for (let i = 0; i < NUM_STRINGS; i++) {
        const y = startY + (i * stringHeight); const string = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        string.setAttribute('x1', startX); string.setAttribute('y1', y); string.setAttribute('x2', startX + NUM_FRETS * fretWidth); string.setAttribute('y2', y);
        string.setAttribute('stroke', '#d1d5db'); string.setAttribute('stroke-width', 1 + (NUM_STRINGS - 1 - i) * 0.3); svg.appendChild(string);
    }

    const staticNotesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    staticNotesGroup.setAttribute('id', 'fretboard-static-notes'); svg.appendChild(staticNotesGroup);
    
    const transposeSt = state.instrumentTranspose || 0;
    tuning.forEach((openNote, i) => {
        const midiVal = notesData.chromaticMap[openNote] + transposeSt; const noteName = getEnharmonicName(midiVal);
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.classList.add('clickable-note'); g.dataset.note = openNote; g.addEventListener('click', handleFretboardNoteClick);
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', startX - 20); circle.setAttribute('cy', startY + (i * stringHeight)); circle.setAttribute('r', 9);
        const rootNoteName = notesData.keySignatures[state.keySignature].notes[0];
        circle.setAttribute('fill', openNote.startsWith(rootNoteName) ? '#ef4444' : '#3b82f6');
        g.appendChild(circle);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', startX - 20); text.setAttribute('y', startY + (i * stringHeight));
        text.textContent = noteName; text.classList.add('static-note-text'); g.appendChild(text);
        staticNotesGroup.appendChild(g);
    });

    [3, 5, 7, 9, 12, 15].forEach(fret => {
        if (fret > NUM_FRETS) return;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', startX + (fret * fretWidth) - fretWidth / 2); text.setAttribute('y', svgHeight - 10);
        text.setAttribute('fill', '#a1a1aa'); text.setAttribute('font-size', '12px'); text.setAttribute('text-anchor', 'middle'); text.textContent = fret; svg.appendChild(text);
    });
    
    const notePositions = []; const processedNotes = new Set();
    let minF = 1, maxF = NUM_FRETS;
    if (state.fretPosition && state.fretPosition !== 'all') {
        const [f1, f2] = state.fretPosition.split('-').map(Number);
        minF = Math.max(1, f1); maxF = f2;
    }
    staticNotes.forEach(note => {
        if (notesData.guitarFretboard[note]) {
             notesData.guitarFretboard[note].forEach(pos => {
                if (pos.fret >= minF && pos.fret <= maxF && !processedNotes.has(`${pos.string}-${pos.fret}`)) { notePositions.push({note, ...pos}); processedNotes.add(`${pos.string}-${pos.fret}`); }
            });
        }
    });

    notePositions.forEach(({note, string, fret}) => {
        const midiVal = notesData.chromaticMap[note] + transposeSt; const noteName = getEnharmonicName(midiVal);
        const cx = startX + (fret * fretWidth) - (fretWidth / 2); const cy = startY + (string * stringHeight);
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.classList.add('clickable-note'); g.dataset.note = note; g.addEventListener('click', handleFretboardNoteClick);
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', 9);
        const rootNoteName = notesData.keySignatures[state.keySignature].notes[0];
        circle.setAttribute('fill', note.startsWith(rootNoteName) ? '#ef4444' : '#3b82f6');
        circle.setAttribute('stroke', '#18181b'); circle.setAttribute('stroke-width', '1.5');
        g.appendChild(circle);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', cx); text.setAttribute('y', cy); text.textContent = noteName; text.classList.add('static-note-text');
        g.appendChild(text); staticNotesGroup.appendChild(g);
    });

    const highlightsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    highlightsGroup.setAttribute('id', 'fretboard-highlights'); svg.appendChild(highlightsGroup);
}

function updateFretboard(playingNotes, rootNoteName = null) {
    const highlightsGroup = document.getElementById('fretboard-highlights'); if (!highlightsGroup) return;
    highlightsGroup.innerHTML = '';
    if (!Array.isArray(playingNotes) || playingNotes.length === 0) return;
    const NUM_FRETS = 15, fretWidth = 50, stringHeight = 20, startX = 35, startY = 20;
    const notePositions = new Set();
    let minF = 0, maxF = NUM_FRETS;
    if (state.fretPosition && state.fretPosition !== 'all') {
        const [f1, f2] = state.fretPosition.split('-').map(Number);
        minF = f1; maxF = f2;
    }
    
    if (state.exerciseType === 'armonia' && playingNotes.length > 1) {
        const playableVoicing = findPlayableChordVoicingOnFretboard(playingNotes);
        if (playableVoicing) {
            playableVoicing.forEach(pos => notePositions.add(JSON.stringify(pos)));
        }
    } else {
        playingNotes.forEach(note => {
            if (notesData.guitarFretboard[note]) {
                notesData.guitarFretboard[note].forEach(pos => { if (pos.fret >= minF && pos.fret <= maxF) notePositions.add(JSON.stringify({note, ...pos})); });
            }
        });
    }

    const transposeSt = state.instrumentTranspose || 0;
    notePositions.forEach((posString) => {
        const {note, string, fret} = JSON.parse(posString);
        const midiVal = notesData.chromaticMap[note] + transposeSt; const noteName = getEnharmonicName(midiVal);
        const cx = fret === 0 ? startX - 20 : startX + (fret * fretWidth) - (fretWidth / 2); const cy = startY + (string * stringHeight);
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'note-marker'); circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', 9); circle.setAttribute('stroke', '#ffffff'); circle.setAttribute('stroke-width', '1.5');

        if (state.exerciseType === 'armonia' && rootNoteName && playingNotes.length > 1) {
            circle.setAttribute('fill', note.split('/')[0] === rootNoteName ? '#ef4444' : '#3b82f6'); 
        } else circle.setAttribute('fill', '#16a34a');
        highlightsGroup.appendChild(circle);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('class', 'note-text'); text.setAttribute('x', cx); text.setAttribute('y', cy); text.textContent = noteName;
        highlightsGroup.appendChild(text);
    });
}

function renderStave(notesToShow = null) {
    ui.staveContainer.innerHTML = '';
    if (typeof Vex === 'undefined') {
        ui.staveContainer.innerHTML = '<p class="text-red-500">Cargando motor de partituras (VexFlow)...</p>';
        setTimeout(() => renderStave(notesToShow), 200);
        return;
    }

    const VF = Vex.Flow;
    const containerWidth = ui.staveContainer.clientWidth;
    const containerHeight = ui.staveContainer.clientHeight;
    if (containerWidth === 0 || containerHeight === 0) return;

    const renderer = new VF.Renderer(ui.staveContainer, VF.Renderer.Backends.SVG);
    renderer.resize(containerWidth, containerHeight);
    const context = renderer.getContext();

    const logicalWidth = 480, logicalHeight = 225;
    const svgElement = ui.staveContainer.querySelector("svg");
    if (svgElement) {
        svgElement.setAttribute("viewBox", `0 0 ${logicalWidth} ${logicalHeight}`);
        svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }

    const stave = new VF.Stave(12, 40, logicalWidth - 24); 
    const vfClef = ui.clefSelect.value === 'G' ? 'treble' : (ui.clefSelect.value === 'F' ? 'bass' : 'alto');
    stave.addClef(vfClef).addTimeSignature(ui.timeSigSelect.value);

    if (state.exerciseType === 'melodia' && state.keySignature !== 'C') stave.addKeySignature(state.keySignature);
    stave.setContext(context).draw();

    let contentToDraw = notesToShow;
    if (!contentToDraw) {
        if (state.visualIsPreRoll && state.exerciseMeasures.length > 0) contentToDraw = state.exerciseMeasures[0];
        else if (state.exerciseStarted) contentToDraw = state.currentDisplayedContent;
    }

    if (!contentToDraw || contentToDraw.length === 0) {
        if (svgElement) {
            let guideLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            guideLine.setAttribute('id', 'guide-line');
            guideLine.setAttribute('y1', '5'); guideLine.setAttribute('y2', '165');
            guideLine.setAttribute('stroke', 'rgba(56, 189, 248, 0.8)'); guideLine.setAttribute('stroke-width', '2');
            guideLine.style.display = 'none'; guideLine.style.transition = 'transform 0.05s linear';
            svgElement.appendChild(guideLine);
            ui.guideLine = guideLine;
        }
        return;
    }

    const vfNotes = []; const activeAccidentals = {};
    const beamGroupsMap = {};
    const restPositionKey = vfClef === 'treble' ? 'b/4' : (vfClef === 'bass' ? 'd/3' : 'c/4');
    let totalVoiceBeats = 0;

    contentToDraw.forEach((item) => {
        if (!item) return;
        const isRhythmObj = typeof item === 'object' && !Array.isArray(item);
        const isChord = Array.isArray(item);

        if (isRhythmObj && item.isRest) {
            const restNote = new VF.StaveNote({ clef: vfClef, keys: [restPositionKey], duration: "qr" });
            restNote.customTexts = [];
            vfNotes.push(restNote);
            totalVoiceBeats += item.beats || 1;
            return;
        }

        const rawNotes = isChord
            ? [...item].sort((a,b) => notesData.chromaticMap[a] - notesData.chromaticMap[b])
            : [isRhythmObj ? item.note : item];
        if (!rawNotes[0]) return;

        const keys = rawNotes.map(n => n.toLowerCase().replace('##', '##').replace('bb', 'bb'));
        const noteDuration = isRhythmObj ? (item.duration || "q") : "q";
        const showStems = state.exerciseType === 'melodia' && state.rhythmMode !== 'quarters';

        const staveNote = new VF.StaveNote({
            clef: vfClef,
            keys: keys,
            duration: noteDuration,
            auto_stem: showStems
        });
        if (!showStems) {
            staveNote.hasStem = () => false;
        }

        keys.forEach((key, keyIndex) => {
            const noteLetter = key.charAt(0);
            const accidental = key.split('/')[0].slice(1);
            const keyNotes = notesData.keySignatures[state.keySignature].notes;
            const noteInKey = keyNotes.find(n => n.toLowerCase().startsWith(noteLetter));
            const keyAccidental = noteInKey && noteInKey.length > 1 ? noteInKey.slice(1).toLowerCase() : '';
            const currentAccidentalInMeasure = activeAccidentals[noteLetter] === undefined ? keyAccidental : activeAccidentals[noteLetter];

            if (state.exerciseType === 'armonia' || accidental !== currentAccidentalInMeasure) {
                if (accidental) staveNote.addModifier(new VF.Accidental(accidental), keyIndex);
                else if (state.exerciseType !== 'armonia') staveNote.addModifier(new VF.Accidental("n"), keyIndex);
                activeAccidentals[noteLetter] = accidental;
            }
        });

        let customTexts = [];
        if (state.showNoteNames) {
            if (isChord) {
                let bottomParts = [];
                if (rawNotes.length === 2) bottomParts.push(getIntervalAbbreviation(rawNotes).name || '');
                else if (rawNotes.length === 3 && (state.cipherType === 'bajo' || state.cipherType === 'todos')) bottomParts = getChordName(rawNotes).figuredBass || [];
                else if (rawNotes.length === 4 && (state.cipherType === 'drops' || state.cipherType === 'todos')) {
                     const voicingText = notesData.voicingAbbreviations[item.voicingApplied];
                     if(voicingText) bottomParts.push(voicingText);
                }
                if ((state.cipherType === 'americano' || state.cipherType === 'todos') && rawNotes.length > 2) {
                     const chordInfo = getChordName(rawNotes);
                     if (chordInfo.name) customTexts.push({ text: chordInfo.name, position: 'top', size: 16 });
                }
                bottomParts.forEach((part, idx) => customTexts.push({ text: part, position: 'bottom', offset: idx * 16, size: 14 }));
            } else {
                let latinName = notesData.noteToLatin[rawNotes[0].charAt(0).toUpperCase()];
                if (state.melodyNoteNameStyle === 'con-alteracion') {
                    const accidental = rawNotes[0].split('/')[0].slice(1);
                    if (accidental) latinName += accidental;
                }
                if (state.instrumentTranspose) {
                    const realMidi = notesData.chromaticMap[rawNotes[0]] + state.instrumentTranspose;
                    const realLatin = getEnharmonicName(realMidi, 'latin');
                    latinName = `${latinName}→${realLatin}`;
                }
                customTexts.push({ text: latinName, position: 'bottom', offset: 0, size: 14 });
            }
        }
        staveNote.customTexts = customTexts;
        vfNotes.push(staveNote);
        totalVoiceBeats += isRhythmObj ? (item.beats || 1) : 1;

        if (isRhythmObj && item.beamGroup) {
            if (!beamGroupsMap[item.beamGroup]) beamGroupsMap[item.beamGroup] = [];
            beamGroupsMap[item.beamGroup].push(staveNote);
        }
    });

    // Importante: Crear los VF.Beam con auto_stem=true ANTES de formatear y dibujar la voz
    const beamsToDraw = [];
    Object.values(beamGroupsMap).forEach(group => {
        if (group.length > 1) {
            beamsToDraw.push(new VF.Beam(group, true));
        }
    });

    const voice = new VF.Voice({ num_beats: Math.max(1, Math.round(totalVoiceBeats)), beat_value: 4 });
    voice.setStrict(false); voice.addTickables(vfNotes);
    const usableStaveWidth = Math.max(200, (stave.getNoteEndX() - stave.getNoteStartX()) - 28);
    new VF.Formatter().joinVoices([voice]).format([voice], usableStaveWidth);
    voice.draw(context, stave);
    beamsToDraw.forEach(b => b.setContext(context).draw());

    state.notePositionsX = vfNotes.map(n => n.getAbsoluteX());

    if (svgElement) {
        vfNotes.forEach((vfNote, idx) => {
            if (vfNote.customTexts && vfNote.customTexts.length > 0) {
                const x = state.notePositionsX[idx] + 6;
                vfNote.customTexts.forEach(ct => {
                    const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    textEl.setAttribute("x", x);
                    const y = ct.position === 'top' ? 32 : (175 + (ct.offset || 0));
                    textEl.setAttribute("y", y);
                    textEl.setAttribute("text-anchor", "middle");
                    textEl.setAttribute("font-family", "Inter, sans-serif");
                    textEl.setAttribute("font-weight", "bold");
                    textEl.setAttribute("font-size", `${ct.size || 14}px`);
                    textEl.setAttribute("fill", "#10b981");
                    textEl.textContent = ct.text;
                    svgElement.appendChild(textEl);
                });
            }
        });

        let guideLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        guideLine.setAttribute('id', 'guide-line');
        guideLine.setAttribute('y1', '5'); guideLine.setAttribute('y2', '165');
        guideLine.setAttribute('stroke', 'rgba(56, 189, 248, 0.8)'); guideLine.setAttribute('stroke-width', '2');
        guideLine.style.display = 'none'; guideLine.style.transition = 'transform 0.05s linear';
        svgElement.appendChild(guideLine);
        ui.guideLine = guideLine;
    }
}

function updateGuidePosition(currentEvent) {
    const svgElement = ui.staveContainer.querySelector("svg");
    if (svgElement && currentEvent && !currentEvent.isPreRoll && (state.micEnabled || state.midiEnabled)) {
        const targetMeasureIdx = currentEvent.displayedMeasureIndex !== undefined
            ? currentEvent.displayedMeasureIndex
            : currentEvent.measureIndex;
        const noteGroups = svgElement.querySelectorAll('.vf-stavenote');
        noteGroups.forEach((noteEl, idx) => {
            let hitKey;
            if (state.exerciseType === 'melodia') {
                hitKey = `${targetMeasureIdx}-${idx + 1}`;
            } else {
                const targetBeat = (state.notesPerChord === 4) ? (idx * 2) + 1 : (idx + 1);
                hitKey = `${targetMeasureIdx}-${targetBeat}`;
            }
            const status = state.score.status[hitKey];
            const reason = state.score.reason ? state.score.reason[hitKey] : '';
            let noteColor = status === 'hit' ? '#34d399' : (status === 'imprecise' ? '#facc15' : (status === 'miss' ? '#ef4444' : ''));
            if (noteColor && noteEl.dataset.currentColor !== noteColor) {
                noteEl.querySelectorAll('path, rect').forEach(el => {
                    if (el.getAttribute('fill') && el.getAttribute('fill') !== 'none') el.setAttribute('fill', noteColor);
                    if (el.getAttribute('stroke') && el.getAttribute('stroke') !== 'none') el.setAttribute('stroke', noteColor);
                });
                noteEl.dataset.currentColor = noteColor; 
                if (status === 'hit') noteEl.classList.add('note-hit-anim');
            }

            // Marca diagnóstica encima de la nota (✕ Nota escuchada vs ⏱ Tiempo / Tarde / Pronto)
            const badgeId = `note-eval-badge-${idx}`;
            let badgeEl = svgElement.querySelector(`#${badgeId}`);
            if (reason && (status === 'miss' || status === 'imprecise') && state.notePositionsX && state.notePositionsX[idx] !== undefined) {
                const badgeColor = status === 'miss' ? '#ef4444' : '#d97706';
                if (!badgeEl) {
                    badgeEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    badgeEl.setAttribute("id", badgeId);
                    badgeEl.setAttribute("text-anchor", "middle");
                    badgeEl.setAttribute("font-family", "Inter, sans-serif");
                    badgeEl.setAttribute("font-weight", "bold");
                    badgeEl.setAttribute("font-size", "11px");
                    svgElement.appendChild(badgeEl);
                }
                badgeEl.setAttribute("x", state.notePositionsX[idx] + 6);
                badgeEl.setAttribute("y", 18);
                badgeEl.setAttribute("fill", badgeColor);
                badgeEl.textContent = reason;
            } else if (badgeEl) {
                badgeEl.remove();
            }
        });
    }

    if ((!state.showGuide && !(state.waitMode && (state.micEnabled || state.midiEnabled))) || !state.exerciseStarted || state.visualIsPreRoll) { 
        if (ui.guideLine) ui.guideLine.style.display = 'none'; 
    } else if (ui.guideLine && state.notePositionsX && state.notePositionsX.length > 0) {
        ui.guideLine.style.display = 'block';
        ui.guideLine.setAttribute('stroke', 'rgba(56, 189, 248, 0.8)');
        let beatIndex = (currentEvent && currentEvent.activeNoteIndex !== undefined)
            ? currentEvent.activeNoteIndex
            : (state.currentVisualBeat - 1);
        if (state.exerciseType === 'armonia' && state.notesPerChord === 4) beatIndex = Math.floor((state.currentVisualBeat - 1) / 2);
        beatIndex = Math.min(beatIndex, state.notePositionsX.length - 1);
        if (beatIndex >= 0 && beatIndex < state.notePositionsX.length) {
            ui.guideLine.setAttribute('transform', `translate(${state.notePositionsX[beatIndex] + 12}, 0)`);
        }
    }
}

// Motor de práctica, scheduler, bucle de dibujo y modos de juego

function startDailyChallenge() {
    const today = getLocalISODate();
    let hash = 0;
    for (let i = 0; i < today.length; i++) hash = Math.imul(31, hash) + today.charCodeAt(i) | 0;
    seededRNG = hash;
    state.isDailyChallenge = true;
    state.isSurvivalMode = false;

    ui.exerciseTypeRadios[0].checked = true;
    ui.exerciseTypeRadios[0].dispatchEvent(new Event('change'));
    
    ui.difficultySelect.value = 'medium';
    
    ui.keySigSelect.value = 'C';
    ui.keySigSelect.dispatchEvent(new Event('change'));
    
    ui.measuresSelect.value = '10';
    ui.measuresSelect.dispatchEvent(new Event('change'));
    
    ui.tempoInput.value = 60;

    startExercise();
}

async function startSurvivalMode() {
    if (!state.micEnabled && !state.midiEnabled) {
        ui.enableMicToggle.checked = true;
        await toggleMicrophone(true);
        if (!state.micEnabled) {
            showTemporaryMessage("El Modo Supervivencia requiere el Micrófono o MIDI activo.", true);
            return;
        }
    }
    seededRNG = null;
    state.isDailyChallenge = false;
    state.isSurvivalMode = true;
    
    ui.measuresSelect.value = 'custom';
    ui.customMeasuresContainer.classList.remove('hidden');
    ui.customMeasuresInput.value = 100; 
    
    state.survivalHearts = 3;
    updateHeartsUI();

    startExercise();
}

function updateHeartsUI() {
    if (state.isSurvivalMode) {
        ui.survivalHeartsContainer.classList.remove('hidden');
        for (let i = 1; i <= 3; i++) {
            const heart = document.getElementById(`heart-${i}`);
            if (i <= state.survivalHearts) {
                heart.classList.remove('lost');
            } else {
                heart.classList.add('lost');
            }
        }
    } else {
        ui.survivalHeartsContainer.classList.add('hidden');
    }
}

function startWeaknessesMode() {
    const missed = userData?.stats?.missedNotes || {};
    const globalStats = userData?.stats?.globalNoteStats || {};
    const weakExist = Object.keys(missed).length > 0 || Object.values(globalStats).some(s => s.misses > 0);
    if (!weakExist) {
        showTemporaryMessage("Aún no tienes fallos registrados. ¡Practica con el micrófono o MIDI primero!", true);
        return;
    }
    seededRNG = null;
    state.isDailyChallenge = false;
    state.isSurvivalMode = false;
    state.isWeaknessMode = true;
    state.activeCampaignStage = null;
    ui.exerciseTypeRadios[0].checked = true;
    ui.exerciseTypeRadios[0].dispatchEvent(new Event('change'));
    showTemporaryMessage("🎯 Modo Debilidades: 70% enfocado en tus notas difíciles.", false);
    startExercise();
}

async function startCampaignStage(stage) {
    if (!stage) return;
    ui.campaignModal.classList.add('hidden');
    if (state.exerciseStarted) stopExercise(false);

    if (!state.micEnabled) {
        ui.enableMicToggle.checked = true;
        await toggleMicrophone(true);
    }
    if (!state.micEnabled) {
        showTemporaryMessage("El Modo Carrera requiere el micrófono activo para evaluar tu lectura.", true);
        return;
    }

    seededRNG = null;
    state.isDailyChallenge = false;
    state.isSurvivalMode = false;
    state.isWeaknessMode = false;
    state.activeCampaignStage = stage.id;

    const radio = document.getElementById(`type-${stage.type}`);
    if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
    }
    if (stage.type === 'armonia' && stage.notesPerChord) {
        ui.notesPerChordSelect.value = String(stage.notesPerChord);
        ui.notesPerChordSelect.dispatchEvent(new Event('change'));
    }
    if (stage.progression && ui.harmonyProgressionSelect) {
        ui.harmonyProgressionSelect.value = stage.progression;
        state.harmonyProgression = stage.progression;
    }
    ui.difficultySelect.value = stage.diff;
    ui.difficultySelect.dispatchEvent(new Event('change'));

    if (ui.fretPositionSelect && stage.fret) {
        ui.fretPositionSelect.value = stage.fret;
        state.fretPosition = stage.fret;
    }
    if (ui.rhythmSelect && stage.rhythm) {
        ui.rhythmSelect.value = stage.rhythm;
        state.rhythmMode = stage.rhythm;
    }
    ui.tempoInput.value = stage.bpm;
    ui.measuresSelect.value = stage.measures;
    ui.measuresSelect.dispatchEvent(new Event('change'));

    showTemporaryMessage(`🎓 Iniciando ${stage.title}`, false);
    startExercise();
}

async function startExercise() {
    try {
        if (state.activeCampaignStage && !state.micEnabled) {
            ui.enableMicToggle.checked = true;
            await toggleMicrophone(true);
            if (!state.micEnabled) {
                showTemporaryMessage("El Modo Carrera requiere el Micrófono activo para evaluar tu lectura.", true);
                return;
            }
        }

        await initAudioEngine();
        state.keySignature = ui.keySigSelect.value;
        state.rhythmMode = ui.rhythmSelect ? ui.rhythmSelect.value : 'quarters';
        state.chromaticMode = ui.chromaticSelect ? ui.chromaticSelect.value : 'none';
        state.chromaticAccidentalType = ui.chromaticAccidentalSelect ? ui.chromaticAccidentalSelect.value : 'both';
        state.measuresChangeBeat = parseInt(ui.changeBeatSelect.value, 10) || state.timeSignatureBeats;
        state.exerciseStartTime = new Date();
        handleMeasuresChange(); 
        state.exerciseMeasures = generateExercise();
        if (state.exerciseMeasures.length === 0) { console.error("Failed to generate measures."); stopExercise(false); return; }
        
        state.score = { total: 0, hits: new Set(), status: {}, reason: {}, expectedNotes: {} };
        state.scheduledSynthNotes = [];
        state.consecutivePerfectMeasures = 0;
        state.measureRepeatCount = 0;
        state.currentRenderKey = null;
        state.pitchHistory = [];
        state.lastHitPitchClass = null;
        state.lastHitKey = null;
        state.micSilenceSinceLastHit = true;
        state.silenceFramesCount = 0;
        state.lastEvaluatedPitchClass = null;
        startSessionRecording();

        Object.assign(state, { 
            exerciseStarted: true, isPlaying: true, isPaused: false, 
            logicalIsPreRoll: true, visualIsPreRoll: true,
            logicalMetronomeCount: 0, logicalSubBeat: 0.5, logicalMeasureIndex: -1,
            visualQueue: [], activeVisualEvent: null, currentDisplayedContent: null,
            currentVisualBeat: 1
        });

        ui.preRollMessage.classList.remove('hidden'); 
        ui.displayArea.classList.add('hidden');
        ui.toggleInfoBtn.classList.add('hidden');
        ui.startStopButton.textContent = 'Detener'; 
        ui.pauseResumeButton.textContent = 'Pausar'; 
        ui.pauseResumeButton.classList.remove('hidden');
        
        if (!audio.context || audio.context.state !== 'running') return;

        if (state.waitMode && (state.micEnabled || state.midiEnabled)) {
            if (window.innerWidth < 1024 && !state.configPanelCollapsed) {
                setConfigPanelCollapsed(true);
            }
            if (ui.mainDisplayArea) ui.mainDisplayArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            startWaitModeExercise();
            return;
        }

        if (window.innerWidth < 1024 && !state.configPanelCollapsed) {
            setConfigPanelCollapsed(true);
        }
        if (ui.mainDisplayArea) ui.mainDisplayArea.scrollIntoView({ behavior: 'smooth', block: 'center' });

        if (window.AndroidApp && typeof window.AndroidApp.ensureSpeakerAudio === 'function') {
            try { window.AndroidApp.ensureSpeakerAudio(); } catch (e) {}
        }

        audio.nextNoteTime = audio.context.currentTime + 0.1;
        scheduler(); 
        
        if (state.drawFrameId) cancelAnimationFrame(state.drawFrameId);
        state.drawFrameId = requestAnimationFrame(drawLoop);
    } catch (e) { console.error("Error starting exercise:", e); stopExercise(false); }
}

function getWaitModeNoteHitKey(measureIdx, itemIdx) {
    if (state.exerciseType === 'melodia') {
        return `${measureIdx}-${itemIdx + 1}`;
    }
    const targetBeat = (state.notesPerChord === 4) ? (itemIdx * 2) + 1 : (itemIdx + 1);
    return `${measureIdx}-${targetBeat}`;
}

function extractWaitModeNotes(item) {
    if (!item) return [];
    if (Array.isArray(item)) return item;
    if (typeof item === 'object') {
        if (item.isRest) return [];
        return item.note ? [item.note] : [];
    }
    return [item];
}

function playWaitReferenceNote(notes) {
    if (!notes || notes.length === 0 || !audio.context) return;
    const now = audio.context.currentTime + 0.02;
    const refDuration = 0.28; // Nota guía breve para evitar que el altavoz dispare el micrófono
    notes.forEach(n => playNoteSound(n, now, refDuration));
    if (state.micEnabled && !state.midiEnabled) {
        // Pausa la escucha del micrófono mientras suena la nota guía + cola de sala (450 ms)
        state.waitStepMuteUntil = performance.now() + 450;
        state.waitStepNeedsFreshAttack = true;
        state.waitStepHitMs = 0;
        state.pitchHistory = [];
    }
}

function loadWaitModeStep(measureIdx, noteIdx) {
    if (!state.exerciseStarted) return;
    if (state.isSurvivalMode && measureIdx + 1 >= state.exerciseMeasures.length) {
        state.exerciseMeasures.push(...generateExercise());
        state.measuresPerExercise = state.exerciseMeasures.length;
    }
    if (!state.isSurvivalMode && measureIdx >= state.exerciseMeasures.length) {
        stopExercise(true);
        return;
    }

    const measure = state.exerciseMeasures[measureIdx] || [];
    let idx = noteIdx;
    while (idx < measure.length) {
        const notes = extractWaitModeNotes(measure[idx]);
        if (notes.length > 0) break;
        idx++;
    }

    if (idx >= measure.length) {
        loadWaitModeStep(measureIdx + 1, 0);
        return;
    }

    state.waitStepMeasure = measureIdx;
    state.waitStepIndex = idx;
    state.waitStepHitMs = 0;
    state.waitStepTransitioning = false;

    const item = measure[idx];
    const notes = extractWaitModeNotes(item);
    const hitKey = getWaitModeNoteHitKey(measureIdx, idx);

    if (!state.score.expectedNotes[hitKey]) {
        state.score.expectedNotes[hitKey] = {
            notes,
            time: audio.context ? audio.context.currentTime : 0,
            durationSec: 1,
            status: 'waiting'
        };
        state.score.status[hitKey] = 'waiting';
    }

    state.visualIsPreRoll = false;
    state.currentVisualBeat = idx + 1;
    ui.preRollMessage.classList.add('hidden');
    ui.displayArea.classList.remove('hidden');
    ui.toggleInfoBtn.classList.remove('hidden');
    ui.metronomeCount.textContent = '⏸️';
    if (ui.beatLedsContainer) ui.beatLedsContainer.innerHTML = '<span class="text-xs text-sky-400 font-bold">Paso a paso</span>';
    if (ui.waitHearNoteBtn) ui.waitHearNoteBtn.classList.remove('hidden');
    ui.measuresCount.textContent = state.isSurvivalMode ? `${measureIdx + 1}` : `${measureIdx + 1} / ${state.measuresPerExercise}`;

    const renderKey = `wait-${measureIdx}`;
    if (state.currentRenderKey !== renderKey) {
        state.currentDisplayedContent = measure;
        state.currentRenderKey = renderKey;
        renderStave(measure);
    }

    const rootName = (state.exerciseType === 'armonia' && notes.length > 1)
        ? (getChordName(notes).root || notes[0].split('/')[0])
        : null;
    updateFretboard(notes, rootName);

    state.activeVisualEvent = {
        type: 'wait-step',
        isPreRoll: false,
        measureIndex: measureIdx,
        displayedMeasureIndex: measureIdx,
        activeNoteIndex: idx,
        metronomeCount: idx + 1,
        displayedContent: measure,
        playingNotes: notes,
        rootName
    };

    if (state.soundEnabled && notes.length > 0 && audio.context) {
        playWaitReferenceNote(notes);
    }

    updateGuidePosition(state.activeVisualEvent);
}

function startWaitModeExercise() {
    state.logicalIsPreRoll = false;
    state.visualIsPreRoll = false;
    state.waitModeFrozen = false;
    state.waitStepTransitioning = false;
    state.waitStepHitMs = 0;
    state.waitStepCooldownUntil = 0;
    state.lastFramePerfTime = performance.now();
    state.currentRenderKey = null;
    loadWaitModeStep(0, 0);
    if (state.drawFrameId) cancelAnimationFrame(state.drawFrameId);
    state.drawFrameId = requestAnimationFrame(waitModeLoop);
}

function waitModeLoop() {
    if (!state.exerciseStarted || state.isPaused) return;
    const nowPerf = performance.now();
    const deltaMs = state.lastFramePerfTime ? Math.min(80, Math.max(4, nowPerf - state.lastFramePerfTime)) : 16.67;
    state.lastFramePerfTime = nowPerf;

    if (!state.waitStepTransitioning && state.activeVisualEvent) {
        // Durante la reproducción de la nota guía interna, pausamos la escucha del micrófono para evitar auto-aciertos
        if (state.micEnabled && !state.midiEnabled && nowPerf < (state.waitStepMuteUntil || 0)) {
            state.pitchHistory = [];
            state.waitStepHitMs = 0;
            if (ui.micDetectedNote) {
                ui.micDetectedNote.textContent = '🔊';
                ui.micDetectedNote.className = 'ml-1 text-xs font-bold text-amber-400 w-10 truncate text-center';
            }
            updateGuidePosition(state.activeVisualEvent);
            state.drawFrameId = requestAnimationFrame(waitModeLoop);
            return;
        }

        const measureIdx = state.waitStepMeasure;
        const noteIdx = state.waitStepIndex;
        const notes = state.activeVisualEvent.playingNotes || [];
        const expectedMidis = notes.map(n => notesData.chromaticMap[n]);
        const transposeSt = state.instrumentTranspose || 0;
        const soundingOffset = getInstrumentSoundingOffset();
        const micExpectedMidis = expectedMidis.map(m => m + soundingOffset);
        const toleranceCents = state.micToleranceCents || 40;
        const isBassClef = ui.clefSelect && ui.clefSelect.value === 'F';
        const minValidMidi = isBassClef ? 28 : 38;

        let detectedPitch = -1;
        let detectedMidi = -1;
        let centsOff = 0;

        if (state.micEnabled) {
            detectedPitch = detectPitch();
            updateMicLevelMeter(audio.lastRms || 0, detectedPitch);
            // Si venimos de la nota guía, exigimos silencio breve o nuevo ataque real de la cuerda
            if (state.waitStepNeedsFreshAttack) {
                const muteEndedAudio = audio.context ? (audio.context.currentTime - ((nowPerf - state.waitStepMuteUntil) / 1000)) : 0;
                const gotFreshOnset = (state.lastOnsetTime || 0) >= (muteEndedAudio - 0.02);
                if (detectedPitch <= 0 || gotFreshOnset) {
                    state.waitStepNeedsFreshAttack = false;
                } else {
                    // Todavía es la cola de reverberación del altavoz; ignorar hasta que decaiga o ataque el músico
                    detectedPitch = -1;
                }
            }
            if (detectedPitch > 0) {
                const exactNoteFloat = 12 * Math.log2(detectedPitch / 440) + 69;
                detectedMidi = Math.round(exactNoteFloat);
                centsOff = Math.abs((exactNoteFloat - detectedMidi) * 100);
            }
        }

        const inRepeatCooldown = nowPerf < (state.waitStepCooldownUntil || 0);
        let hit = false;
        let wrongDetected = false;

        if (state.midiEnabled && state.activeMidiNotes.size > 0 && !inRepeatCooldown) {
            if (state.exerciseType === 'melodia') {
                hit = expectedMidis.some(em => Array.from(state.activeMidiNotes).some(am => (am % 12) === (em % 12)));
            } else {
                hit = expectedMidis.every(em => Array.from(state.activeMidiNotes).some(am => (am % 12) === (em % 12)));
            }
            wrongDetected = !hit;
        } else if (state.micEnabled) {
            if (state.exerciseType === 'melodia') {
                if (detectedPitch > 0 && centsOff <= toleranceCents) {
                    const detectedClass = ((detectedMidi % 12) + 12) % 12;
                    const matchesPitch = micExpectedMidis.some(em => {
                        const emClass = ((em % 12) + 12) % 12;
                        const octaveDiff = Math.abs(detectedMidi - em);
                        return detectedClass === emClass && detectedMidi >= minValidMidi && detectedMidi <= 93 && octaveDiff <= 24;
                    });
                    const sameAsLast = state.lastHitPitchClass === detectedClass && !state.micSilenceSinceLastHit;
                    if (matchesPitch && !(inRepeatCooldown && sameAsLast)) {
                        state.waitStepHitMs = (state.waitStepHitMs || 0) + deltaMs;
                        state.waitStepWrongMs = 0;
                        if (state.waitStepHitMs >= 32) hit = true;
                    } else if (!matchesPitch && !(inRepeatCooldown && sameAsLast)) {
                        state.waitStepHitMs = Math.max(0, (state.waitStepHitMs || 0) - deltaMs * 0.6);
                        state.waitStepWrongMs = (state.waitStepWrongMs || 0) + deltaMs;
                        if (state.waitStepWrongMs >= 110) wrongDetected = true;
                    } else {
                        state.waitStepHitMs = Math.max(0, (state.waitStepHitMs || 0) - deltaMs * 0.6);
                    }
                } else {
                    state.waitStepHitMs = Math.max(0, (state.waitStepHitMs || 0) - deltaMs * 0.6);
                    state.waitStepWrongMs = Math.max(0, (state.waitStepWrongMs || 0) - deltaMs * 0.5);
                }
            } else {
                const chordEval = verifyChord(micExpectedMidis);
                if (chordEval.hit && !inRepeatCooldown) {
                    state.waitStepHitMs = (state.waitStepHitMs || 0) + deltaMs;
                    state.waitStepWrongMs = 0;
                    if (state.waitStepHitMs >= 38) hit = true;
                } else if (chordEval.wrong && !inRepeatCooldown) {
                    state.waitStepHitMs = Math.max(0, (state.waitStepHitMs || 0) - deltaMs * 0.6);
                    state.waitStepWrongMs = (state.waitStepWrongMs || 0) + deltaMs;
                    if (chordEval.dominantMidi > 0) detectedMidi = chordEval.dominantMidi;
                    if (state.waitStepWrongMs >= 130) wrongDetected = true;
                } else {
                    state.waitStepHitMs = Math.max(0, (state.waitStepHitMs || 0) - deltaMs * 0.6);
                    state.waitStepWrongMs = Math.max(0, (state.waitStepWrongMs || 0) - deltaMs * 0.5);
                }
            }
        }

        const displayMidi = detectedMidi > 0 ? (detectedMidi - (state.midiEnabled ? 0 : transposeSt)) : -1;

        if (hit) {
            const hitKey = getWaitModeNoteHitKey(measureIdx, noteIdx);
            state.score.status[hitKey] = 'hit';
            if (state.score.reason) delete state.score.reason[hitKey];
            if (state.score.expectedNotes[hitKey]) state.score.expectedNotes[hitKey].status = 'hit';
            if (detectedMidi > 0) {
                state.lastHitPitchClass = ((detectedMidi % 12) + 12) % 12;
            }
            state.micSilenceSinceLastHit = false;
            if (ui.micDetectedNote && displayMidi > 0) {
                ui.micDetectedNote.textContent = getEnharmonicName(displayMidi);
                ui.micDetectedNote.className = 'ml-1 text-xs font-bold text-emerald-400 w-10 truncate text-center';
            }
            updateGuidePosition(state.activeVisualEvent);

            // Verificar si quedan más notas en este compás
            const measure = state.exerciseMeasures[measureIdx] || [];
            let nextIdx = noteIdx + 1;
            while (nextIdx < measure.length && extractWaitModeNotes(measure[nextIdx]).length === 0) {
                nextIdx++;
            }

            state.waitStepCooldownUntil = performance.now() + 200;
            if (nextIdx < measure.length) {
                loadWaitModeStep(measureIdx, nextIdx);
            } else {
                // Breve pausa visual de 220 ms para ver la última nota del compás en verde antes de cambiar de compás
                state.waitStepTransitioning = true;
                state.waitStepTimer = setTimeout(() => {
                    state.waitStepTimer = null;
                    if (state.exerciseStarted && !state.isPaused) {
                        loadWaitModeStep(measureIdx + 1, 0);
                    }
                }, 220);
            }
        } else if (wrongDetected) {
            const hitKey = getWaitModeNoteHitKey(measureIdx, noteIdx);
            const heardLabel = displayMidi > 0 ? getEnharmonicName(displayMidi) : 'Nota';
            state.score.status[hitKey] = 'miss';
            if (!state.score.reason) state.score.reason = {};
            state.score.reason[hitKey] = `✕ ${heardLabel}`;
            if (ui.micDetectedNote && displayMidi > 0) {
                ui.micDetectedNote.textContent = heardLabel;
                ui.micDetectedNote.className = 'ml-1 text-xs font-bold text-red-400 w-10 truncate text-center';
            }
        } else if (displayMidi > 0 && ui.micDetectedNote) {
            ui.micDetectedNote.textContent = getEnharmonicName(displayMidi);
            ui.micDetectedNote.className = 'ml-1 text-xs font-bold text-sky-400 w-10 truncate text-center';
        } else if (ui.micDetectedNote && !state.midiEnabled) {
            ui.micDetectedNote.textContent = '';
        }
    }

    updateGuidePosition(state.activeVisualEvent);
    state.drawFrameId = requestAnimationFrame(waitModeLoop);
}

function stopExercise(completedSuccessfully) {
     if (!state.exerciseStarted) return;
     stopSessionRecording();

     const nowAudio = audio.context ? audio.context.currentTime : Infinity;
     for (const key in state.score.expectedNotes) {
         if (state.score.status[key] === 'waiting') {
             if (completedSuccessfully || state.score.expectedNotes[key].time <= nowAudio) {
                 state.score.status[key] = 'miss';
                 state.score.expectedNotes[key].status = 'miss';
             }
         }
     }

     let notesEvaluatedCount = 0;
     let correctCount = 0;
     
     for (const key in state.score.expectedNotes) {
         const status = state.score.status[key];
         if (status === 'hit' || status === 'imprecise' || status === 'miss') {
             notesEvaluatedCount++;
             if (status === 'hit' || status === 'imprecise') correctCount++;
         }
     }

     const inputEvaluationActive = state.micEnabled || state.midiEnabled;

     if (userData && state.exerciseStartTime) {
        if (completedSuccessfully || state.isSurvivalMode || (inputEvaluationActive && notesEvaluatedCount > 0)) {
            userData.stats.totalExercises++; 
            if (state.isDailyChallenge && completedSuccessfully) userData.stats.dailyChallengesCompleted++;
            if (completedSuccessfully && new Date().getHours() >= 22) userData.stats.nightOwlUnlocked = true;
        }
        const endTime = new Date(); 
        let durationMs = endTime - state.exerciseStartTime;
        if (state.pauseStartTimeReal) durationMs -= (endTime - state.pauseStartTimeReal);
        durationMs -= (state.totalPausedTime || 0);
        durationMs = Math.max(0, durationMs); 
        
        const durationMinutes = Math.floor(durationMs / 60000); 
        const durationSeconds = Math.floor((durationMs % 60000) / 1000);
        const durationString = durationMinutes < 1 ? `${durationSeconds} seg` : `${durationMinutes} min ${durationSeconds} seg`;
        
        let exerciseInfo = '';
        if (state.exerciseType === 'melodia') {
            const keyOption = ui.keySigSelect.querySelector(`option[value="${state.keySignature}"]`);
            const keyText = keyOption ? keyOption.textContent.split(' (')[0] : state.keySignature; 
            exerciseInfo = `Melodía (${keyText})`;
        } else { exerciseInfo = `Armonía (${state.notesPerChord} voces)`; }
        
        let scoreStr = '-';
        let xpEarnedThisRound = 0;
        let missedCount = notesEvaluatedCount - correctCount;

        if (inputEvaluationActive && notesEvaluatedCount > 0) {
            const percentage = Math.round((correctCount / notesEvaluatedCount) * 100);
            scoreStr = `${percentage}%`;

            userData.stats.totalCorrect = (userData.stats.totalCorrect || 0) + correctCount;
            userData.stats.totalIncorrect = (userData.stats.totalIncorrect || 0) + missedCount;

            if (completedSuccessfully || state.isSurvivalMode) {
                if (state.exerciseType === 'armonia') {
                    userData.stats.harmonyCorrect = (userData.stats.harmonyCorrect || 0) + correctCount;
                }
                if (completedSuccessfully && ui.difficultySelect.value === 'advanced' && notesEvaluatedCount > 0 && percentage === 100) {
                    userData.stats.mastermindUnlocked = true;
                }
                
                let multiplier = ui.difficultySelect.value === 'advanced' ? 2 : 1;
                if (state.isSurvivalMode) multiplier *= 1.5;
                
                xpEarnedThisRound = Math.floor(correctCount * 10 * multiplier);

                if (completedSuccessfully && state.activeCampaignStage && state.micEnabled && percentage >= 75) {
                    if (!userData.stats.completedCampaignStages) userData.stats.completedCampaignStages = [];
                    if (!userData.stats.completedCampaignStages.includes(state.activeCampaignStage)) {
                        userData.stats.completedCampaignStages.push(state.activeCampaignStage);
                    }
                    xpEarnedThisRound += 250;
                }

                userData.stats.xp += xpEarnedThisRound;
                updateXPDisplay();
            }

            if (state.score.expectedNotes) {
                Object.keys(state.score.expectedNotes).forEach(hitKey => {
                    const noteObj = state.score.expectedNotes[hitKey];
                    const status = state.score.status[hitKey];
                    if (status === 'waiting') return; 
                    
                    const notes = noteObj.notes;
                    if (!notes || notes.length === 0) return;
                    
                    const isHit = status === 'hit' || status === 'imprecise';

                    notes.forEach(note => {
                        let [baseName, octave] = note.split('/');
                        const letter = baseName[0];
                        const accidental = baseName.slice(1);
                        const latinName = notesData.noteToLatin[letter.toUpperCase()] + accidental + octave;
                        
                        const rawNoteName = baseName + '/' + octave;
                        if (!userData.stats.globalNoteStats[rawNoteName]) {
                            userData.stats.globalNoteStats[rawNoteName] = { hits: 0, misses: 0 };
                        }
                        if (isHit) userData.stats.globalNoteStats[rawNoteName].hits++;
                        else userData.stats.globalNoteStats[rawNoteName].misses++;

                        if (!userData.stats.missedNotes) userData.stats.missedNotes = {};
                        if (!userData.stats.missedNotesByExercise) userData.stats.missedNotesByExercise = {};
                        if (!userData.stats.missedNotesByExercise[exerciseInfo]) userData.stats.missedNotesByExercise[exerciseInfo] = {};

                        if (!isHit) {
                            userData.stats.missedNotes[latinName] = (userData.stats.missedNotes[latinName] || 0) + 1;
                            userData.stats.missedNotesByExercise[exerciseInfo][latinName] = (userData.stats.missedNotesByExercise[exerciseInfo][latinName] || 0) + 1;
                        }
                    });
                });
            }
        }

        const historyEntry = {
            date: endTime.toLocaleDateString('es-ES'), 
            time: endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            duration: durationString, 
            exercise: exerciseInfo,
            level: ui.difficultySelect.options[ui.difficultySelect.selectedIndex].text,
            measures: state.isSurvivalMode ? `${state.logicalMeasureIndex + 1} (Sup.)` : state.measuresPerExercise, 
            bpm: ui.tempoInput.value,
            score: scoreStr
        };
        userData.practiceHistory.push(historyEntry);

        const todayStr = getLocalISODate();
        if (userData.stats.lastPracticeDate !== todayStr) { 
            userData.stats.lastPracticeDate = todayStr; 
            userData.stats.currentStreak++; 
            if (!userData.stats.maxStreak || userData.stats.currentStreak > userData.stats.maxStreak) {
                userData.stats.maxStreak = userData.stats.currentStreak;
            }
            updateStreakDisplay(); 
        }
        checkAchievements(); 
        saveUserData();

        if ((completedSuccessfully || state.isSurvivalMode) && inputEvaluationActive) {
            const percentage = notesEvaluatedCount > 0 ? Math.round((correctCount / notesEvaluatedCount) * 100) : 0;

            if(ui.resultsTotal) {
                ui.resultsTitle.textContent = state.isSurvivalMode ? "¡Fin del Juego!" : "¡Ejercicio Completado!";
                ui.resultsTitle.className = state.isSurvivalMode ? "text-3xl font-extrabold text-orange-500 mb-4" : "text-3xl font-extrabold text-emerald-400 mb-4";
                
                ui.resultsTotal.textContent = notesEvaluatedCount;
                ui.resultsCorrect.textContent = correctCount;
                ui.resultsMissed.textContent = missedCount;
                ui.resultsPercentage.textContent = `${percentage}%`;
                ui.resultsPercentage.className = `text-6xl mb-4 font-bold ${percentage >= 80 ? 'text-emerald-400' : (percentage >= 50 ? 'text-amber-400' : 'text-red-400')}`;
                
                if (xpEarnedThisRound > 0) {
                    ui.resultsXpEarned.textContent = `+${xpEarnedThisRound} XP`;
                    ui.resultsXpEarned.classList.remove('hidden');
                } else {
                    ui.resultsXpEarned.classList.add('hidden');
                }

                ui.resultsModal.classList.remove('hidden');
            }
        }
    }

    if (state.drawFrameId) { cancelAnimationFrame(state.drawFrameId); state.drawFrameId = null; }
    if (state.waitStepTimer) { clearTimeout(state.waitStepTimer); state.waitStepTimer = null; }
    state.visualQueue = [];
    seededRNG = null;

    Object.assign(state, { 
        exerciseStarted: false, isPlaying: false, isPaused: false, 
        logicalIsPreRoll: false, visualIsPreRoll: false,
        logicalMeasureIndex: -1, logicalMetronomeCount: 0, logicalSubBeat: 0,
        currentMeasureIndex: -1, currentMetronomeCount: 0,
        lastMelodicNote: null, currentDisplayedContent: null, exerciseStartTime: null,
        pauseStartTimeReal: null, activeVisualEvent: null, isDailyChallenge: false,
        isSurvivalMode: false, survivalHearts: 3, isWeaknessMode: false, activeCampaignStage: null,
        waitModeFrozen: false, lastFramePerfTime: 0, lastAudioFrameTime: 0, lastHitChordClasses: null
    });
    ui.startStopButton.textContent = 'Comenzar'; ui.pauseResumeButton.classList.add('hidden'); ui.displayArea.classList.add('hidden'); ui.toggleInfoBtn.classList.add('hidden'); ui.survivalHeartsContainer.classList.add('hidden');
    if (ui.waitHearNoteBtn) ui.waitHearNoteBtn.classList.add('hidden');
    if (state.metronomeTimer) { clearTimeout(state.metronomeTimer); state.metronomeTimer = null; }
    handleMeasuresChange(); ui.metronomeCount.textContent = "0"; ui.preRollMessage.classList.add('hidden');
    if(ui.guideLine) ui.guideLine.style.display = 'none';
    if(ui.micDetectedNote) ui.micDetectedNote.textContent = '';
    renderStave(); if(state.showFretboard) drawFretboardWithCurrentSettings(); updateFretboard([]);
}

function togglePause() {
    if (!state.exerciseStarted) return;
    state.isPaused = !state.isPaused;
    if (state.isPaused) {
        clearTimeout(state.metronomeTimer); 
        cancelAnimationFrame(state.drawFrameId);
        if(audio.context) audio.pauseStartTime = audio.context.currentTime; 
        state.pauseStartTimeReal = new Date();
        ui.pauseResumeButton.textContent = 'Reanudar';
    } else {
        if(audio.context) {
            const elapsedPauseTime = audio.context.currentTime - audio.pauseStartTime;
            audio.nextNoteTime += elapsedPauseTime; 
            state.visualQueue.forEach(ev => ev.time += elapsedPauseTime);
            for (const key in state.score.expectedNotes) {
                state.score.expectedNotes[key].time += elapsedPauseTime;
            }
            if (state.scheduledSynthNotes) {
                state.scheduledSynthNotes.forEach(n => { n.start += elapsedPauseTime; n.end += elapsedPauseTime; });
            }
        }
        if (state.pauseStartTimeReal) {
            state.totalPausedTime += (new Date() - state.pauseStartTimeReal);
            state.pauseStartTimeReal = null;
        }
        ui.pauseResumeButton.textContent = 'Pausar';
        if (state.waitMode && (state.micEnabled || state.midiEnabled)) {
            state.lastFramePerfTime = performance.now();
            state.drawFrameId = requestAnimationFrame(waitModeLoop);
        } else {
            scheduler();
            state.drawFrameId = requestAnimationFrame(drawLoop);
        }
    }
}

function drawLoop() {
    if (!state.exerciseStarted || state.isPaused) return;
    if (!audio.context) return;
    const nowPerf = performance.now();
    const deltaMs = state.lastFramePerfTime ? Math.min(80, Math.max(4, nowPerf - state.lastFramePerfTime)) : 16.67;
    state.lastFramePerfTime = nowPerf;

    const currentTime = audio.context.currentTime;
    const deltaSec = state.lastAudioFrameTime ? Math.min(0.1, Math.max(0, currentTime - state.lastAudioFrameTime)) : 0;
    state.lastAudioFrameTime = currentTime;

    const tempo = parseInt(ui.tempoInput.value, 10) || 60;
    const beatDur = 60.0 / tempo;
    const isWaitModeActive = state.waitMode && (state.micEnabled || state.midiEnabled) && !state.visualIsPreRoll;

    // Modo Espera: si hay una nota actual sin acertar que ya alcanzó su pulso, congelamos la línea de tiempo
    let waitModeBlockingNote = null;
    if (isWaitModeActive) {
        const waitingEntries = Object.entries(state.score.expectedNotes)
            .filter(([k, nd]) => state.score.status[k] === 'waiting' && nd.time <= currentTime + 0.02)
            .sort((a, b) => a[1].time - b[1].time);
        if (waitingEntries.length > 0) {
            const firstWaiting = waitingEntries[0][1];
            const freezePoint = firstWaiting.time + Math.min(0.14, beatDur * 0.25);
            if (currentTime >= freezePoint) {
                waitModeBlockingNote = firstWaiting;
                state.waitModeFrozen = true;
                if (deltaSec > 0) {
                    audio.nextNoteTime += deltaSec;
                    state.visualQueue.forEach(ev => ev.time += deltaSec);
                    for (const k in state.score.expectedNotes) {
                        if (state.score.status[k] === 'waiting' && state.score.expectedNotes[k] !== firstWaiting) {
                            state.score.expectedNotes[k].time += deltaSec;
                        }
                    }
                    if (state.scheduledSynthNotes) {
                        state.scheduledSynthNotes.forEach(n => { n.start += deltaSec; n.end += deltaSec; });
                    }
                }
            } else {
                state.waitModeFrozen = false;
            }
        } else {
            state.waitModeFrozen = false;
        }
    } else {
        state.waitModeFrozen = false;
    }

    let newEventProcessed = false;
    if (!state.waitModeFrozen) {
        while (state.visualQueue.length > 0 && state.visualQueue[0].time <= currentTime) {
            state.activeVisualEvent = state.visualQueue.shift();
            newEventProcessed = true;
        }
    }

    if (newEventProcessed && state.activeVisualEvent) {
        const currentEvent = state.activeVisualEvent;
        if (currentEvent.type === 'stop') { stopExercise(true); return; }

        state.visualIsPreRoll = currentEvent.isPreRoll;
        state.currentVisualBeat = currentEvent.metronomeCount;

        if (currentEvent.isPreRoll) {
            ui.preRollMessage.classList.remove('hidden');
            ui.displayArea.classList.add('hidden');
            ui.toggleInfoBtn.classList.add('hidden');
            ui.preRollCount.textContent = currentEvent.metronomeCount;
            if (state.currentDisplayedContent !== currentEvent.displayedContent || state.currentRenderKey !== currentEvent.renderKey) {
                state.currentDisplayedContent = currentEvent.displayedContent;
                state.currentRenderKey = currentEvent.renderKey;
                renderStave(currentEvent.displayedContent);
            }
        } else {
            ui.preRollMessage.classList.add('hidden'); 
            ui.displayArea.classList.remove('hidden');
            ui.toggleInfoBtn.classList.remove('hidden');
            ui.metronomeCount.textContent = currentEvent.metronomeCount;
            renderBeatLeds(currentEvent.metronomeCount);
            
            const mCount = state.isSurvivalMode ? currentEvent.measureIndex + 1 : `${currentEvent.measureIndex + 1} / ${state.measuresPerExercise}`;
            ui.measuresCount.textContent = mCount;

            if (state.currentDisplayedContent !== currentEvent.displayedContent || state.currentRenderKey !== currentEvent.renderKey) {
                state.currentDisplayedContent = currentEvent.displayedContent;
                state.currentRenderKey = currentEvent.renderKey;
                renderStave(currentEvent.displayedContent);
            }
            updateFretboard(currentEvent.playingNotes, currentEvent.rootName);
        }
    }

    if ((state.micEnabled || state.midiEnabled) && !state.visualIsPreRoll) {
        let activeKeys = [];
        const latencySec = state.midiEnabled ? 0 : ((state.micLatencyMs || 0) / 1000);
        const effectiveTime = currentTime - latencySec;

        for (const hitKey in state.score.expectedNotes) {
            const noteData = state.score.expectedNotes[hitKey];
            const status = state.score.status[hitKey];
            const noteDur = noteData.durationSec || beatDur;
            const lateWindow = Math.min(noteDur * 0.92, Math.max(0.32, beatDur * 0.88));
            const earlyWindow = Math.min(0.08, noteDur * 0.16);

            if (status === 'waiting') {
                const timeDiff = effectiveTime - noteData.time;
                if (isWaitModeActive && waitModeBlockingNote && noteData === waitModeBlockingNote) {
                    activeKeys.push({ key: hitKey, noteData, lateWindow, earlyWindow });
                } else if (timeDiff >= -earlyWindow && timeDiff <= lateWindow) {
                    activeKeys.push({ key: hitKey, noteData, lateWindow, earlyWindow });
                } else if (!isWaitModeActive && timeDiff > lateWindow) {
                    noteData.status = 'miss';
                    state.score.status[hitKey] = 'miss';
                    if (!state.score.reason) state.score.reason = {};
                    state.score.reason[hitKey] = '⏱ Tiempo';

                    if (state.isSurvivalMode) {
                        state.survivalHearts--;
                        updateHeartsUI();
                        if (state.survivalHearts <= 0 && state.exerciseStarted) {
                            stopExercise(false);
                            return;
                        }
                    }
                }
            }
        }

        let isSynthBleed = false;
        if (!state.midiEnabled) {
            const now = audio.context.currentTime;
            // Solo protege contra el transiente breve del clic del metrónomo (nunca silencia durante toda la nota del sintetizador)
            if (state.metronomeEnabled && state.metronomeVolume > 0.05 && audio.lastMetronomeClickEnd && now <= audio.lastMetronomeClickEnd) {
                isSynthBleed = true;
            }
        }

        if (!isSynthBleed) {
            let detectedPitch = -1;
            let detectedMidi = -1;
            let centsOff = 0;

            if (state.micEnabled) {
                detectedPitch = detectPitch();
                updateMicLevelMeter(audio.lastRms || 0, detectedPitch);
                if (detectedPitch > 0) {
                    const exactNoteFloat = 12 * (Math.log(detectedPitch / 440) / Math.log(2)) + 69;
                    detectedMidi = Math.round(exactNoteFloat);
                    centsOff = Math.abs((exactNoteFloat - detectedMidi) * 100);
                }
            }

            if (activeKeys.length > 0) {
                activeKeys.sort((a, b) => a.noteData.time - b.noteData.time);
                const targetObj = activeKeys[0];
                const target = targetObj.noteData;
                const targetKey = targetObj.key;
                const expectedMidis = target.notes.map(n => notesData.chromaticMap[n]);
                const transposeSt = state.instrumentTranspose || 0;
                const soundingOffset = getInstrumentSoundingOffset();
                const micExpectedMidis = expectedMidis.map(m => m + soundingOffset);
                const toleranceCents = state.micToleranceCents || 30;
                const isBassClef = ui.clefSelect && ui.clefSelect.value === 'F';
                const minValidMidi = isBassClef ? 28 : 38;

                let hit = false;
                let wrongNotePlayed = false;

                if (state.midiEnabled && state.activeMidiNotes.size > 0) {
                    if (state.exerciseType === 'melodia') {
                        hit = expectedMidis.some(em => Array.from(state.activeMidiNotes).some(am => (am % 12) === (em % 12)));
                    } else {
                        hit = expectedMidis.every(em => Array.from(state.activeMidiNotes).some(am => (am % 12) === (em % 12)));
                    }
                    wrongNotePlayed = !hit;
                } else if (state.micEnabled) {
                    if (state.exerciseType === 'melodia') {
                        if (detectedPitch > 0 && centsOff <= toleranceCents) {
                            const detectedClass = ((detectedMidi % 12) + 12) % 12;
                            const hasFreshOnset = (state.lastOnsetTime || 0) >= (target.time - 0.08);
                            const isCarryoverFromPrevNote = !state.micSilenceSinceLastHit &&
                                state.lastHitKey !== targetKey &&
                                (state.lastHitPitchClass === detectedClass || state.lastEvaluatedPitchClass === detectedClass);

                            const matchesPitch = micExpectedMidis.some(em => {
                                const emClass = ((em % 12) + 12) % 12;
                                const octaveDiff = Math.abs(detectedMidi - em);
                                const validOctave = detectedMidi >= minValidMidi && detectedMidi <= 93 && octaveDiff <= 24;
                                return detectedClass === emClass && validOctave;
                            });

                            if (matchesPitch) {
                                const isRepeatedWithoutAttack = !isWaitModeActive && isCarryoverFromPrevNote &&
                                    !hasFreshOnset &&
                                    (effectiveTime - target.time) < Math.min(0.16, beatDur * 0.30);

                                if (!isRepeatedWithoutAttack) {
                                    if (target.lastCandidateClass === detectedClass) {
                                        target.hitDurationMs = (target.hitDurationMs || 0) + deltaMs;
                                    } else {
                                        target.lastCandidateClass = detectedClass;
                                        target.hitDurationMs = deltaMs;
                                    }
                                    target.wrongDurationMs = 0;
                                    if (target.hitDurationMs >= 32) {
                                        hit = true;
                                    }
                                }
                            } else {
                                target.hitDurationMs = Math.max(0, (target.hitDurationMs || 0) - deltaMs * 0.6);
                                const isPrevNoteTail = isCarryoverFromPrevNote &&
                                    !hasFreshOnset &&
                                    (effectiveTime - target.time) < Math.min(0.45, beatDur * 0.58);

                                if (!isPrevNoteTail && effectiveTime >= target.time + 0.14 && centsOff <= Math.min(35, toleranceCents)) {
                                    if (target.lastWrongClass === detectedClass) {
                                        target.wrongDurationMs = (target.wrongDurationMs || 0) + deltaMs;
                                    } else {
                                        target.lastWrongClass = detectedClass;
                                        target.wrongDurationMs = deltaMs;
                                    }
                                    wrongNotePlayed = true;
                                }
                            }
                        } else {
                            target.hitDurationMs = Math.max(0, (target.hitDurationMs || 0) - deltaMs * 0.6);
                        }
                    } else {
                        const chordEval = verifyChord(micExpectedMidis);
                        const hasFreshOnset = (state.lastOnsetTime || 0) >= (target.time - 0.08);
                        if (chordEval.hit) {
                            target.hitDurationMs = (target.hitDurationMs || 0) + deltaMs;
                            target.wrongDurationMs = 0;
                            if (target.hitDurationMs >= 38) hit = true;
                        } else if (chordEval.wrong && effectiveTime >= target.time + 0.16) {
                            // Protección contra cola de resonancia del acorde anterior
                            const isPrevChordTail = !state.micSilenceSinceLastHit &&
                                state.lastHitKey !== targetKey &&
                                !hasFreshOnset &&
                                state.lastHitChordClasses &&
                                chordEval.detectedClasses.length > 0 &&
                                chordEval.detectedClasses.every(pc => state.lastHitChordClasses.includes(pc)) &&
                                (effectiveTime - target.time) < Math.min(0.55, beatDur * 0.65);

                            if (!isPrevChordTail) {
                                target.wrongDurationMs = (target.wrongDurationMs || 0) + deltaMs;
                                if (chordEval.dominantMidi > 0) detectedMidi = chordEval.dominantMidi;
                                wrongNotePlayed = true;
                            }
                        } else {
                            target.hitDurationMs = 0;
                        }
                    }
                }

                const displayMidi = detectedMidi > 0 ? (detectedMidi - (state.midiEnabled ? 0 : transposeSt)) : -1;

                if (hit) {
                    const signedDiff = effectiveTime - target.time;
                    const timeDiff = Math.abs(signedDiff);
                    const newStatus = (isWaitModeActive || timeDiff <= Math.max(0.32, beatDur * 0.55)) ? 'hit' : 'imprecise';
                    state.score.status[targetKey] = newStatus;
                    if (!state.score.reason) state.score.reason = {};
                    if (newStatus === 'imprecise') {
                        state.score.reason[targetKey] = signedDiff >= 0 ? '⏱ Tarde' : '⏱ Pronto';
                    } else {
                        delete state.score.reason[targetKey];
                    }
                    target.status = newStatus;
                    state.waitModeFrozen = false;
                    if (detectedMidi > 0) {
                        const pc = ((detectedMidi % 12) + 12) % 12;
                        state.lastHitPitchClass = pc;
                        state.lastEvaluatedPitchClass = pc;
                    }
                    state.lastHitChordClasses = Array.from(new Set(micExpectedMidis.map(m => ((m % 12) + 12) % 12)));
                    state.lastHitKey = targetKey;
                    state.micSilenceSinceLastHit = false;
                    if (ui.micDetectedNote && displayMidi > 0) {
                        ui.micDetectedNote.textContent = getEnharmonicName(displayMidi);
                        ui.micDetectedNote.className = 'ml-1 text-xs font-bold text-emerald-400 w-10 truncate text-center';
                    }
                } else if (wrongNotePlayed) {
                    if (ui.micDetectedNote && displayMidi > 0) {
                        ui.micDetectedNote.textContent = getEnharmonicName(displayMidi);
                        ui.micDetectedNote.className = 'ml-1 text-xs font-bold text-red-400 w-10 truncate text-center';
                    }
                    // En Modo Espera no marcamos fallo: dejamos que el músico corrija la nota hasta acertarla
                    if (!isWaitModeActive && ((target.wrongDurationMs || 0) >= 145 || state.midiEnabled)) {
                        state.score.status[targetKey] = 'miss';
                        if (!state.score.reason) state.score.reason = {};
                        state.score.reason[targetKey] = displayMidi > 0 ? `✕ ${getEnharmonicName(displayMidi)}` : '✕ Nota';
                        target.status = 'miss';
                        if (detectedMidi > 0) {
                            const pc = ((detectedMidi % 12) + 12) % 12;
                            state.lastEvaluatedPitchClass = pc;
                        }
                        state.lastHitKey = targetKey;
                        state.micSilenceSinceLastHit = false;

                        if (state.isSurvivalMode) {
                            state.survivalHearts--;
                            updateHeartsUI();
                            if (state.survivalHearts <= 0 && state.exerciseStarted) {
                                stopExercise(false);
                                return;
                            }
                        }
                    }
                } else if (displayMidi > 0 && ui.micDetectedNote) {
                    ui.micDetectedNote.textContent = getEnharmonicName(displayMidi);
                    ui.micDetectedNote.className = 'ml-1 text-xs font-bold text-sky-400 w-10 truncate text-center';
                } else if (ui.micDetectedNote && !state.midiEnabled) {
                    ui.micDetectedNote.textContent = '';
                }
            } else if (detectedMidi > 0 && ui.micDetectedNote) {
                const displayMidi = detectedMidi - (state.midiEnabled ? 0 : (state.instrumentTranspose || 0));
                ui.micDetectedNote.textContent = getEnharmonicName(displayMidi);
                ui.micDetectedNote.className = 'ml-1 text-xs font-bold text-sky-400 w-10 truncate text-center';
            } else if (ui.micDetectedNote && !state.midiEnabled) {
                ui.micDetectedNote.textContent = '';
            }
        } else if (ui.micDetectedNote && !state.midiEnabled) {
            ui.micDetectedNote.textContent = '';
        }
    }
    
    updateGuidePosition(state.activeVisualEvent);

    state.drawFrameId = requestAnimationFrame(drawLoop);
}

function scheduler() {
    if (!state.isPlaying || state.isPaused) return;
    if (state.waitModeFrozen) {
        state.metronomeTimer = setTimeout(scheduler, audio.lookahead);
        return;
    }
    while (audio.nextNoteTime < audio.context.currentTime + audio.scheduleAheadTime) {
        const tempo = parseInt(ui.tempoInput.value, 10) || 60;
        const beatDuration = 60.0 / tempo;
        const halfBeatDuration = beatDuration * 0.5;

        if (state.logicalSubBeat === 0.5) {
            state.logicalSubBeat = 0;
            state.logicalMetronomeCount++;
            if (state.logicalMetronomeCount > state.timeSignatureBeats) state.logicalMetronomeCount = 1;
        } else {
            state.logicalSubBeat = 0.5;
        }

        const isDownBeat = state.logicalSubBeat === 0;

        if (state.logicalIsPreRoll) {
            if (isDownBeat) {
                playMetronomeSound(audio.nextNoteTime, state.logicalMetronomeCount === 1, state.logicalMetronomeCount);
                const displayedContent = state.exerciseMeasures.length > 0 ? state.exerciseMeasures[0] : [];
                state.visualQueue.push({
                    time: audio.nextNoteTime, type: 'tick', isPreRoll: true,
                    metronomeCount: state.logicalMetronomeCount, measureIndex: -1,
                    displayedMeasureIndex: 0, isEarlyPreview: false, renderKey: '0',
                    displayedContent: displayedContent, playingNotes: [], rootName: null
                });
            } else if (state.logicalMetronomeCount === state.timeSignatureBeats) {
                state.logicalIsPreRoll = false;
            }
        } else if (isDownBeat) {
            if (state.logicalMetronomeCount === 1) {
                if (state.logicalMeasureIndex >= 0 && (state.micEnabled || state.midiEnabled)) {
                    const prevIdx = state.logicalMeasureIndex;
                    let totalInMeasure = 0;
                    let hitsInMeasure = 0;
                    const measureKeys = Object.keys(state.score.expectedNotes).filter(k => k.startsWith(`${prevIdx}-`));
                    measureKeys.forEach(k => {
                        totalInMeasure++;
                        const st = state.score.status[k];
                        const noteObj = state.score.expectedNotes[k];
                        if (st === 'hit' || st === 'imprecise') {
                            hitsInMeasure++;
                        } else if (st === 'waiting' && noteObj) {
                            const noteEndWindow = noteObj.time + Math.max(0.28, (noteObj.durationSec || beatDuration) * 0.75);
                            if (audio.nextNoteTime > noteEndWindow) {
                                state.score.status[k] = 'miss';
                                if (!state.score.reason) state.score.reason = {};
                                state.score.reason[k] = '⏱ Tiempo';
                                noteObj.status = 'miss';
                            }
                        }
                    });

                    if (totalInMeasure > 0 && hitsInMeasure === totalInMeasure) {
                        state.consecutivePerfectMeasures++;
                        if (state.speedTrainer && state.consecutivePerfectMeasures % 2 === 0) {
                            const curBpm = parseInt(ui.tempoInput.value, 10) || 60;
                            ui.tempoInput.value = Math.min(240, curBpm + 5);
                        }
                    } else {
                        state.consecutivePerfectMeasures = 0;
                    }
                    state.logicalMeasureIndex++;
                } else {
                    if (state.logicalMeasureIndex === -1) state.logicalMeasureIndex = 0;
                    else state.logicalMeasureIndex++;
                }

                if (state.isSurvivalMode && state.logicalMeasureIndex + 1 >= state.measuresPerExercise) {
                    state.exerciseMeasures.push(...generateExercise());
                    state.measuresPerExercise = state.exerciseMeasures.length;
                }

                if (!state.isSurvivalMode && state.logicalMeasureIndex >= state.measuresPerExercise) {
                    state.visualQueue.push({ time: audio.nextNoteTime + 0.18, type: 'stop' });
                    state.isPlaying = false;
                    return;
                }
            }

            playMetronomeSound(audio.nextNoteTime, state.logicalMetronomeCount === 1, state.logicalMetronomeCount);

            const contentForPlayback = state.exerciseMeasures[state.logicalMeasureIndex];
            const currentBeat = state.logicalMetronomeCount;
            const beatIndex = currentBeat - 1;
            let activeNoteIndexForVisual = beatIndex;
            let playingNotes = [];
            let rootNoteNameForFretboard = null;

            if (state.exerciseType === 'melodia') {
                if (contentForPlayback && contentForPlayback.length > 0 && typeof contentForPlayback[0] === 'object' && !Array.isArray(contentForPlayback[0])) {
                    const onBeatItem = contentForPlayback.find(it => it.beat === currentBeat && it.subBeat === 0);
                    if (onBeatItem) {
                        activeNoteIndexForVisual = onBeatItem.noteIndex;
                        if (!onBeatItem.isRest && onBeatItem.note) {
                            playingNotes.push(onBeatItem.note);
                            const hitKey = `${state.logicalMeasureIndex}-${onBeatItem.noteIndex + 1}`;
                            if (!state.score.expectedNotes[hitKey]) {
                                state.score.expectedNotes[hitKey] = {
                                    notes: [onBeatItem.note],
                                    time: audio.nextNoteTime,
                                    durationSec: beatDuration * (onBeatItem.beats || 1),
                                    wrongFrames: 0,
                                    status: 'waiting'
                                };
                                state.score.status[hitKey] = 'waiting';
                            }
                            if (state.soundEnabled) {
                                const beatsVal = onBeatItem.beats || 1;
                                const articulationFactor = beatsVal < 1 ? 0.88 : 0.94;
                                const noteDurSec = beatDuration * beatsVal * articulationFactor;
                                playNoteSound(onBeatItem.note, audio.nextNoteTime, noteDurSec);
                                if (!state.scheduledSynthNotes) state.scheduledSynthNotes = [];
                                state.scheduledSynthNotes.push({ start: audio.nextNoteTime, end: audio.nextNoteTime + noteDurSec });
                            }
                        }
                    } else {
                        // Sustaining a half note started on the previous beat
                        const sustainingItem = contentForPlayback.find(it => it.beat < currentBeat && (it.beat + it.beats) > currentBeat);
                        if (sustainingItem) {
                            activeNoteIndexForVisual = sustainingItem.noteIndex;
                            if (!sustainingItem.isRest && sustainingItem.note) {
                                playingNotes.push(sustainingItem.note);
                            }
                        }
                    }
                } else if (beatIndex >= 0 && contentForPlayback && beatIndex < contentForPlayback.length) {
                    const note = contentForPlayback[beatIndex];
                    playingNotes.push(note);
                    if (state.soundEnabled) {
                        const noteDurSec = beatDuration * 0.94;
                        playNoteSound(note, audio.nextNoteTime, noteDurSec);
                        if (!state.scheduledSynthNotes) state.scheduledSynthNotes = [];
                        state.scheduledSynthNotes.push({ start: audio.nextNoteTime, end: audio.nextNoteTime + noteDurSec });
                    }
                    const hitKey = `${state.logicalMeasureIndex}-${currentBeat}`;
                    if (!state.score.expectedNotes[hitKey]) {
                        state.score.expectedNotes[hitKey] = {
                            notes: playingNotes,
                            time: audio.nextNoteTime,
                            durationSec: beatDuration,
                            wrongFrames: 0,
                            status: 'waiting'
                        };
                        state.score.status[hitKey] = 'waiting';
                    }
                }
            } else {
                let itemIndex = beatIndex;
                if (state.notesPerChord === 4) itemIndex = Math.floor(beatIndex / 2);
                activeNoteIndexForVisual = itemIndex;
                if (itemIndex >= 0 && contentForPlayback && itemIndex < contentForPlayback.length) {
                    playingNotes = contentForPlayback[itemIndex];
                    if (playingNotes && playingNotes.length > 1) rootNoteNameForFretboard = getChordName(playingNotes).root;
                }
                const shouldStrikeChord = state.notesPerChord !== 4 || (currentBeat % 2 === 1);
                const chordBeats = state.notesPerChord === 4 ? 2 : 1;
                if (state.soundEnabled && shouldStrikeChord && playingNotes && playingNotes.length > 0) {
                    const chordDurSec = beatDuration * chordBeats * 0.94;
                    playingNotes.forEach(note => playNoteSound(note, audio.nextNoteTime, chordDurSec));
                    if (!state.scheduledSynthNotes) state.scheduledSynthNotes = [];
                    state.scheduledSynthNotes.push({ start: audio.nextNoteTime, end: audio.nextNoteTime + chordDurSec });
                }
                if (playingNotes && playingNotes.length > 0) {
                    const targetBeat = (state.notesPerChord === 4) ? (Math.floor((currentBeat - 1) / 2) * 2) + 1 : currentBeat;
                    const hitKey = `${state.logicalMeasureIndex}-${targetBeat}`;
                    if (!state.score.expectedNotes[hitKey]) {
                        state.score.expectedNotes[hitKey] = {
                            notes: playingNotes,
                            time: audio.nextNoteTime,
                            durationSec: beatDuration * chordBeats,
                            wrongFrames: 0,
                            status: 'waiting'
                        };
                        state.score.status[hitKey] = 'waiting';
                    }
                }
            }

            const nextMeasureIndex = state.logicalMeasureIndex + 1;
            const hasNextMeasure = nextMeasureIndex < state.measuresPerExercise && state.exerciseMeasures[nextMeasureIndex];
            const shouldAdvanceEarly = hasNextMeasure && currentBeat >= state.measuresChangeBeat;
            const displayedMeasureIndex = shouldAdvanceEarly ? nextMeasureIndex : state.logicalMeasureIndex;
            const displayedContent = shouldAdvanceEarly ? state.exerciseMeasures[nextMeasureIndex] : contentForPlayback;
            const renderKey = shouldAdvanceEarly ? `${nextMeasureIndex}` : `${state.logicalMeasureIndex}`;

            let visualNoteIndex = activeNoteIndexForVisual;
            if (shouldAdvanceEarly && state.exerciseType === 'melodia' && Array.isArray(displayedContent) && displayedContent.length > 0 && typeof displayedContent[0] === 'object' && !Array.isArray(displayedContent[0])) {
                const itemOnDisplayed = displayedContent.find(it => it.beat === currentBeat && it.subBeat === 0) ||
                    displayedContent.find(it => it.beat < currentBeat && (it.beat + it.beats) > currentBeat);
                if (itemOnDisplayed) visualNoteIndex = itemOnDisplayed.noteIndex;
            }

            state.visualQueue.push({
                time: audio.nextNoteTime, type: 'tick', isPreRoll: false,
                metronomeCount: currentBeat, measureIndex: state.logicalMeasureIndex,
                displayedMeasureIndex: displayedMeasureIndex, isEarlyPreview: shouldAdvanceEarly, renderKey: renderKey,
                displayedContent: displayedContent, playingNotes: playingNotes, rootName: rootNoteNameForFretboard,
                activeNoteIndex: visualNoteIndex
            });
        } else {
            // Sub-pulso (contratiempo de corchea: subBeat === 0.5)
            const contentForPlayback = state.exerciseMeasures[state.logicalMeasureIndex];
            const currentBeat = state.logicalMetronomeCount;
            if (state.exerciseType === 'melodia' && contentForPlayback && contentForPlayback.length > 0 && typeof contentForPlayback[0] === 'object' && !Array.isArray(contentForPlayback[0])) {
                const offBeatItem = contentForPlayback.find(it => it.beat === currentBeat && it.subBeat === 0.5);
                if (offBeatItem && !offBeatItem.isRest && offBeatItem.note) {
                    const offHitKey = `${state.logicalMeasureIndex}-${offBeatItem.noteIndex + 1}`;
                    if (!state.score.expectedNotes[offHitKey]) {
                        state.score.expectedNotes[offHitKey] = {
                            notes: [offBeatItem.note],
                            time: audio.nextNoteTime,
                            durationSec: halfBeatDuration,
                            wrongFrames: 0,
                            status: 'waiting'
                        };
                        state.score.status[offHitKey] = 'waiting';
                    }
                    if (state.soundEnabled) {
                        const offNoteDurSec = halfBeatDuration * 0.88;
                        playNoteSound(offBeatItem.note, audio.nextNoteTime, offNoteDurSec);
                        if (!state.scheduledSynthNotes) state.scheduledSynthNotes = [];
                        state.scheduledSynthNotes.push({ start: audio.nextNoteTime, end: audio.nextNoteTime + offNoteDurSec });
                    }

                    const nextMeasureIndex = state.logicalMeasureIndex + 1;
                    const hasNextMeasure = nextMeasureIndex < state.measuresPerExercise && state.exerciseMeasures[nextMeasureIndex];
                    const shouldAdvanceEarly = hasNextMeasure && currentBeat >= state.measuresChangeBeat;
                    const displayedMeasureIndex = shouldAdvanceEarly ? nextMeasureIndex : state.logicalMeasureIndex;
                    const displayedContent = shouldAdvanceEarly ? state.exerciseMeasures[nextMeasureIndex] : contentForPlayback;
                    const renderKey = shouldAdvanceEarly ? `${nextMeasureIndex}` : `${state.logicalMeasureIndex}`;

                    let visualNoteIndex = offBeatItem.noteIndex;
                    if (shouldAdvanceEarly && Array.isArray(displayedContent) && displayedContent.length > 0 && typeof displayedContent[0] === 'object' && !Array.isArray(displayedContent[0])) {
                        const itemOnDisplayed = displayedContent.find(it => it.beat === currentBeat && it.subBeat === 0.5) ||
                            displayedContent.find(it => it.beat === currentBeat && it.subBeat === 0) ||
                            displayedContent.find(it => it.beat < currentBeat && (it.beat + it.beats) > currentBeat);
                        if (itemOnDisplayed) visualNoteIndex = itemOnDisplayed.noteIndex;
                    }

                    state.visualQueue.push({
                        time: audio.nextNoteTime, type: 'tick', isPreRoll: false,
                        metronomeCount: currentBeat, measureIndex: state.logicalMeasureIndex,
                        displayedMeasureIndex: displayedMeasureIndex, isEarlyPreview: shouldAdvanceEarly, renderKey: renderKey,
                        displayedContent: displayedContent, playingNotes: [offBeatItem.note], rootName: null,
                        activeNoteIndex: visualNoteIndex
                    });
                }
            }
        }

        audio.nextNoteTime += halfBeatDuration;
    }
    state.metronomeTimer = setTimeout(scheduler, audio.lookahead);
}

// Modales: mapa de calor, logros, historial, carrera, afinador, filtros y tutorial

function renderHeatmapModal() {
    ui.heatmapGrid.innerHTML = '';
    const stats = userData.stats.globalNoteStats || {};
    
    const notesOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const allNotes = [];
    for (let oct = 2; oct <= 6; oct++) {
        notesOrder.forEach(n => allNotes.push(`${n}/${oct}`));
    }

    allNotes.forEach(noteName => {
        const noteData = stats[noteName];
        if (!noteData) return; 

        const total = noteData.hits + noteData.misses;
        if (total === 0) return;

        const hitRate = noteData.hits / total;
        let bgColor = 'bg-zinc-700'; 
        if (total >= 5) {
            if (hitRate >= 0.8) bgColor = 'bg-green-500';
            else if (hitRate >= 0.5) bgColor = 'bg-yellow-500';
            else bgColor = 'bg-red-500';
        }

        const card = document.createElement('div');
        card.className = `${bgColor} text-white p-2 rounded-lg text-center shadow-md flex flex-col justify-center items-center h-16`;
        card.innerHTML = `
            <span class="font-bold text-sm leading-none">${noteName}</span>
            <span class="text-[10px] mt-1 bg-black/30 px-1.5 py-0.5 rounded">${Math.round(hitRate * 100)}%</span>
        `;
        ui.heatmapGrid.appendChild(card);
    });

    if (ui.heatmapGrid.children.length === 0) {
        ui.heatmapGrid.innerHTML = '<p class="col-span-full text-center text-zinc-500 py-8">Aún no hay suficientes datos. ¡Activa el micrófono y practica un poco!</p>';
    }
    
    ui.heatmapModal.classList.remove('hidden');
}

function renderAchievementsModal() {
    ui.achievementsList.innerHTML = '';
    ACHIEVEMENTS_DEF.forEach(ach => {
        const isUnlocked = userData.achievements.includes(ach.id);
        const card = document.createElement('div');
        card.className = `achievement-card p-4 rounded-xl border-2 flex items-center gap-4 bg-zinc-700 ${isUnlocked ? 'unlocked border-emerald-500' : 'locked border-zinc-600'}`;
        card.innerHTML = `
            <div class="text-4xl bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center border-2 ${isUnlocked ? 'border-yellow-500 text-yellow-400' : 'border-zinc-500 text-zinc-500'} flex-shrink-0 shadow-inner">
                ${ach.icon}
            </div>
            <div>
                <h4 class="font-bold ${isUnlocked ? 'text-white' : 'text-zinc-400'}">${ach.name}</h4>
                <p class="text-xs ${isUnlocked ? 'text-zinc-300' : 'text-zinc-500'} mt-1">${ach.desc}</p>
            </div>
        `;
        ui.achievementsList.appendChild(card);
    });
    ui.achievementsModal.classList.remove('hidden');
}

function renderMissedNotesChart(filter) {
    const chartContainer = document.getElementById('missed-notes-chart');
    chartContainer.innerHTML = '';
    let dataToRender = filter === 'general' ? (userData.stats.missedNotes || {}) : ((userData.stats.missedNotesByExercise && userData.stats.missedNotesByExercise[filter]) || {});

    const sortedMissed = Object.entries(dataToRender).filter(([_, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, 7); 
         
     if (sortedMissed.length > 0) {
         const maxCount = sortedMissed[0][1];
         sortedMissed.forEach(([note, count]) => {
            const heightPct = Math.max(15, (count / maxCount) * 100);
            const barHtml = `
                <div class="flex flex-col items-center flex-1 h-full justify-end">
                    <span class="text-xs text-zinc-400 mb-1 font-bold">${count}</span>
                    <div class="w-full max-w-[40px] bg-red-500 rounded-t flex-shrink-0 transition-all duration-500" style="height: ${heightPct}%;"></div>
                    <span class="text-[10px] sm:text-xs font-bold text-zinc-300 mt-2 text-center whitespace-nowrap">${note}</span>
                </div>
            `;
            chartContainer.insertAdjacentHTML('beforeend', barHtml);
         });
     } else {
         chartContainer.innerHTML = '<p class="text-zinc-500 text-sm w-full text-center mt-4 mb-4">No hay fallos registrados para este filtro. ¡Excelente trabajo!</p>';
     }
}

function showHistoryModal() {
    ui.historyTableBody.innerHTML = '';
    const statsContainer = document.getElementById('missed-notes-stats');
    const filterSelect = ui.missedNotesFilter;
    const history = userData.practiceHistory || [];

    if (ui.kpiTotalSessions) {
        ui.kpiTotalSessions.textContent = userData?.stats?.totalExercises || history.length || 0;
        ui.kpiTotalCorrect.textContent = userData?.stats?.totalCorrect || 0;
        const totalHits = userData?.stats?.totalCorrect || 0;
        const totalMisses = userData?.stats?.totalIncorrect || 0;
        if (totalHits + totalMisses > 0) {
            const globalAvg = Math.round((totalHits / (totalHits + totalMisses)) * 100);
            ui.kpiAvgAccuracy.textContent = `${globalAvg}%`;
        } else {
            const scoredEntries = history.filter(h => h.score && h.score !== '-' && !isNaN(parseInt(h.score)));
            if (scoredEntries.length > 0) {
                const avg = Math.round(scoredEntries.reduce((acc, cur) => acc + parseInt(cur.score, 10), 0) / scoredEntries.length);
                ui.kpiAvgAccuracy.textContent = `${avg}%`;
            } else {
                ui.kpiAvgAccuracy.textContent = '-';
            }
        }
        const completedStages = (userData?.stats?.completedCampaignStages || []).length;
        ui.kpiCareerProgress.textContent = `${completedStages}/${CAMPAIGN_STAGES.length}`;
    }
    
    if (userData.stats && userData.stats.missedNotes && Object.keys(userData.stats.missedNotes).length > 0) {
         statsContainer.classList.remove('hidden');
         filterSelect.innerHTML = '<option value="general">General</option>';
         if (userData.stats.missedNotesByExercise) {
             Object.keys(userData.stats.missedNotesByExercise).forEach(exerciseName => {
                 if (Object.keys(userData.stats.missedNotesByExercise[exerciseName]).length > 0) {
                     const opt = document.createElement('option');
                     opt.value = exerciseName; opt.textContent = exerciseName;
                     filterSelect.appendChild(opt);
                 }
             });
         }
         filterSelect.value = 'general';
         renderMissedNotesChart('general');
    } else {
         statsContainer.classList.add('hidden');
    }

    if (history.length === 0) {
        ui.noHistoryMessage.classList.remove('hidden');
        ui.historyTableBody.parentElement.classList.add('hidden');
    } else {
        ui.noHistoryMessage.classList.add('hidden');
        ui.historyTableBody.parentElement.classList.remove('hidden');
        [...history].reverse().forEach(entry => {
            const row = document.createElement('tr');
            row.className = 'bg-zinc-800 border-b border-zinc-700 hover:bg-zinc-600 transition-colors';
            const scoreCell = entry.score && entry.score !== '-' 
                ? `<td class="px-4 py-4 text-center font-bold ${parseInt(entry.score) >= 80 ? 'text-emerald-400' : (parseInt(entry.score) >= 50 ? 'text-amber-400' : 'text-red-400')}">${entry.score}</td>` 
                : `<td class="px-4 py-4 text-center text-zinc-500">-</td>`;

            row.innerHTML = `
                <td class="px-4 py-4">${entry.date}</td>
                <td class="px-4 py-4">${entry.time}</td>
                <td class="px-4 py-4">${entry.duration}</td>
                <td class="px-4 py-4">${entry.exercise || '-'}</td>
                <td class="px-4 py-4 text-center">${entry.level || '-'}</td>
                <td class="px-4 py-4 text-center">${entry.measures || '-'}</td>
                <td class="px-4 py-4 text-center">${entry.bpm || '-'}</td>
                ${scoreCell}
            `;
            ui.historyTableBody.appendChild(row);
        });
    }
    ui.historyModal.classList.remove('hidden');
}

function renderCampaignModal() {
    if (!ui.campaignStagesList) return;
    ui.campaignStagesList.innerHTML = '';
    const completed = userData?.stats?.completedCampaignStages || [];

    CAMPAIGN_STAGES.forEach((stage, idx) => {
        const isDone = completed.includes(stage.id);
        const card = document.createElement('div');
        card.className = `p-4 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-700/80 ${isDone ? 'border-emerald-500' : 'border-zinc-600'}`;
        card.innerHTML = `
            <div>
                <div class="flex items-center gap-2">
                    <span class="text-lg font-bold ${isDone ? 'text-emerald-400' : 'text-white'}">${stage.title}</span>
                    ${isDone ? '<span class="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full font-bold">✓ Superada</span>' : ''}
                </div>
                <p class="text-xs text-zinc-300 mt-1">${stage.desc}</p>
            </div>
            <button data-stage-idx="${idx}" class="start-stage-btn bg-teal-500 hover:bg-teal-400 text-white font-bold py-2 px-5 rounded-full shadow text-xs whitespace-nowrap transition-transform transform hover:scale-105">
                ${isDone ? 'Repetir Etapa' : 'Iniciar Etapa'}
            </button>
        `;
        ui.campaignStagesList.appendChild(card);
    });

    ui.campaignStagesList.querySelectorAll('.start-stage-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.stageIdx, 10);
            startCampaignStage(CAMPAIGN_STAGES[idx]);
        });
    });

    ui.campaignModal.classList.remove('hidden');
}

let tunerRafId = null;
async function openTuner() {
    ui.tunerModal.classList.remove('hidden');
    try {
        await ensureMicAnalyser();
        state.tunerSoundPlayed = false; state.tunerLastNote = null; state.tunerSilenceFrames = 0; state.tunerStableFrames = 0; state.tunerSmoothedCents = 0; state.tunerSmoothedHz = 0;
        tunerLoop();
    } catch (err) {
        ui.tunerNoteDisplay.textContent = 'Error';
        ui.tunerNoteDisplay.style.color = '#ef4444';
        ui.tunerCentsDisplay.textContent = 'Permiso denegado.';
    }
}

function closeTuner() {
    ui.tunerModal.classList.add('hidden');
    if (tunerRafId) { cancelAnimationFrame(tunerRafId); tunerRafId = null; }
    if (!state.micEnabled) stopMicStream();
}

function closeResultsModal() {
    if (ui.sessionAudioPlayer) {
        ui.sessionAudioPlayer.pause();
        ui.sessionAudioPlayer.currentTime = 0;
    }
    ui.resultsModal.classList.add('hidden');
}

function tunerLoop() {
    if (ui.tunerModal.classList.contains('hidden')) return;
    let rawPitch = detectPitch();
    if (rawPitch > 0) {
        state.tunerSilenceFrames = 0; 
        if (state.tunerSmoothedHz === 0 || Math.abs(rawPitch - state.tunerSmoothedHz) > 50) state.tunerSmoothedHz = rawPitch; 
        else state.tunerSmoothedHz = (0.2 * rawPitch) + (0.8 * state.tunerSmoothedHz); 

        let pitch = state.tunerSmoothedHz;
        let noteNum = 12 * (Math.log(pitch / 440) / Math.log(2)) + 69;
        let closestMidi = Math.round(noteNum);
        let rawCents = (noteNum - closestMidi) * 100;
        if (Math.abs(rawCents) < 1.0) rawCents = 0;
        state.tunerSmoothedCents = (0.3 * rawCents) + (0.7 * state.tunerSmoothedCents);
        let displayCents = state.tunerSmoothedCents;
        let noteName = getEnharmonicName(closestMidi);
        let octave = Math.floor(closestMidi / 12) - 1;
        ui.tunerNoteDisplay.textContent = noteName + octave;
        ui.tunerCentsDisplay.textContent = (displayCents > 0 ? "+" : "") + displayCents.toFixed(1) + "c";
        if(ui.tunerHzDisplay) ui.tunerHzDisplay.textContent = pitch.toFixed(1) + " Hz";
        
        let clampedCents = Math.max(-50, Math.min(50, displayCents));
        ui.tunerNeedleGroup.style.transform = `rotate(${clampedCents * 1.4}deg)`;
        
        if (state.tunerLastNote !== closestMidi) { state.tunerSoundPlayed = false; state.tunerLastNote = closestMidi; state.tunerStableFrames = 0; }
        if (Math.abs(displayCents) < 5) { 
            state.tunerStableFrames = (state.tunerStableFrames || 0) + 1;
            if (state.tunerStableFrames > 15 && !state.tunerSoundPlayed) { playTunerDing(); state.tunerSoundPlayed = true; }
            ui.tunerNoteDisplay.style.color = '#10b981'; ui.tunerCentsDisplay.style.color = '#10b981';
        } else {
            if (Math.abs(displayCents) > 15) state.tunerSoundPlayed = false; 
            state.tunerStableFrames = 0; 
            ui.tunerNoteDisplay.style.color = Math.abs(displayCents) < 20 ? '#fbbf24' : '#ef4444'; 
            ui.tunerCentsDisplay.style.color = Math.abs(displayCents) < 20 ? '#fbbf24' : '#ef4444';
        }
    } else {
        state.tunerSmoothedCents = state.tunerSmoothedCents * 0.9;
        if (Math.abs(state.tunerSmoothedCents) < 1) state.tunerSmoothedCents = 0;
        ui.tunerNeedleGroup.style.transform = `rotate(${state.tunerSmoothedCents * 1.4}deg)`;
        ui.tunerNoteDisplay.style.color = '#52525b'; ui.tunerCentsDisplay.style.color = '#9ca3af'; 
        state.tunerStableFrames = 0;
        state.tunerSilenceFrames = (state.tunerSilenceFrames || 0) + 1;
        if (state.tunerSilenceFrames > 30) { state.tunerLastNote = null; state.tunerSoundPlayed = false; state.tunerSmoothedHz = 0; }
    }
    tunerRafId = requestAnimationFrame(tunerLoop);
}

function showCustomSelectionModal(type) {
    let capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
    if (type === 'quadInversion') capitalizedType = 'QuadInversion'; if (type === 'quadChordType') capitalizedType = 'QuadChordType'; if (type === 'voicing') capitalizedType = 'Voicing';
    const modal = ui[`custom${capitalizedType}Modal`]; const checkboxes = ui[`${type}Checkboxes`].querySelectorAll('input[type="checkbox"]');
    let selectedSetKey = `selectedCustom${capitalizedType}s`; if (type === 'voicing') selectedSetKey = 'selectedCustomVoicings';
    const selectedSet = state[selectedSetKey];
    checkboxes.forEach(checkbox => checkbox.checked = selectedSet.has(checkbox.value));
    modal.classList.remove('hidden');
}

function hideCustomSelectionModal(type) {
    let capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
    if (type === 'quadInversion') capitalizedType = 'QuadInversion'; if (type === 'quadChordType') capitalizedType = 'QuadChordType'; if (type === 'voicing') capitalizedType = 'Voicing';
    const modal = ui[`custom${capitalizedType}Modal`]; let select = ui[`${type}Select`]; if (type === 'voicing') select = ui.quadVoicingSelect;
    let selectedSetKey = `selectedCustom${capitalizedType}s`; if (type === 'voicing') selectedSetKey = 'selectedCustomVoicings';
    const selectedSet = state[selectedSetKey]; modal.classList.add('hidden');
    if (selectedSet.size === 0 && select) {
        select.value = 'all'; let stateKey;
        if (type === 'voicing') stateKey = 'selectedQuadVoicing'; else if (type === 'quadInversion') stateKey = 'selectedQuadInversion'; else if (type === 'quadChordType') stateKey = 'selectedQuadChordType'; else { stateKey = `selected${capitalizedType}`; }
        state[stateKey] = 'all';
    }
}

function saveCustomSelection(type) {
    let capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
    if (type === 'quadInversion') capitalizedType = 'QuadInversion'; if (type === 'quadChordType') capitalizedType = 'QuadChordType'; if (type === 'voicing') capitalizedType = 'Voicing';
    const checkboxes = ui[`${type}Checkboxes`].querySelectorAll('input[type="checkbox"]:checked');
    let selectedSetKey = `selectedCustom${capitalizedType}s`; if (type === 'voicing') selectedSetKey = 'selectedCustomVoicings';
    const selectedSet = state[selectedSetKey]; selectedSet.clear(); checkboxes.forEach(checkbox => selectedSet.add(checkbox.value));
    let select = ui[`${type}Select`]; if (type === 'voicing') select = ui.quadVoicingSelect;
    if (selectedSet.size === 0 && select) {
         select.value = 'all'; let stateKey;
         if (type === 'voicing') stateKey = 'selectedQuadVoicing'; else if (type === 'quadInversion') stateKey = 'selectedQuadInversion'; else if (type === 'quadChordType') stateKey = 'selectedQuadChordType'; else { stateKey = `selected${capitalizedType}`; }
         state[stateKey] = 'all';
    }
    hideCustomSelectionModal(type);
}

function populateAllModals() {
    const createCheckbox = (container, value, text, stateSet) => {
        const div = document.createElement('div'); div.className = 'flex items-center';
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.id = `${container.id}-${value}`; checkbox.value = value;
        checkbox.className = 'w-5 h-5 rounded bg-zinc-600 text-emerald-500 border-zinc-500 focus:ring-emerald-500 focus:ring-2'; checkbox.checked = stateSet.has(value);
        const label = document.createElement('label'); label.htmlFor = checkbox.id; label.textContent = text; label.className = 'ml-2 text-zinc-300';
        div.appendChild(checkbox); div.appendChild(label); container.appendChild(div);
    };
    Array.from(ui.intervalSelect.options).forEach(opt => { if (!['0', 'custom'].includes(opt.value)) createCheckbox(ui.intervalCheckboxes, opt.value, opt.textContent, state.selectedCustomIntervals); });
    Array.from(ui.triadSelect.options).forEach(opt => { if (!['all', 'custom'].includes(opt.value)) createCheckbox(ui.triadCheckboxes, opt.value, opt.textContent, state.selectedCustomTriads); });
    Array.from(ui.quadVoicingSelect.options).forEach(opt => { if (!['all', 'custom'].includes(opt.value)) createCheckbox(ui.voicingCheckboxes, opt.value, opt.textContent, state.selectedCustomVoicings); });
    Array.from(ui.quadChordTypeSelect.options).forEach(opt => { if (!['all', 'custom'].includes(opt.value)) createCheckbox(ui.quadChordTypeCheckboxes, opt.value, opt.textContent, state.selectedCustomQuadChordTypes); });
    Array.from(ui.quadInversionSelect.options).forEach(opt => { if (!['all', 'custom'].includes(opt.value)) createCheckbox(ui.quadInversionCheckboxes, opt.value, opt.textContent, state.selectedCustomQuadInversions); });
}

const tutorialSteps = [
     { id: 'main-content', text: '<h2 class="text-2xl font-bold text-emerald-400">¡Bienvenido a Lectura a Primera Vista!</h2><p>Esta aplicación está pensada para <strong>guitarristas, requintistas punteros</strong> y músicos de cualquier instrumento.</p><p class="mt-2">La sección de <strong>Melodía</strong> y la <strong>Armonía a 2 voces (intervalos)</strong> funcionan en clave de Sol, Fa (con soporte automático para Bajo desde 38 Hz) y Do.</p><p class="mt-2">La <strong>Armonía a 3 y 4 voces</strong> está optimizada para guitarra/requinto en <strong>clave de Sol</strong>.</p><p class="mt-4">¡Vamos a recorrer todas las herramientas!</p>' },
     { id: 'user-info-panel', text: '<h3><strong>2. Panel de Usuario y Progreso</strong></h3><p>Controla tu perfil, tu barra de <strong>XP</strong>, tu racha diaria y tus estadísticas:</p><ul><li class="mt-2"><strong>🏆 Logros (L):</strong> Consulta tus medallas desbloqueadas.</li><li class="mt-2"><strong>☀️ Tema (D):</strong> Alterna entre modo oscuro y claro.</li><li class="mt-2"><strong>Historial (H):</strong> Sesiones, precisión media y puntos débiles.</li><li class="mt-2"><strong>Usuario (U) y Exportar/Importar (X / I):</strong> Cambia de perfil o respalda tus datos en <code>.json</code>.</li><li class="mt-2"><strong>🔥 Mapa de Calor (B):</strong> Dominio por nota.</li></ul>' },
     { id: 'config-toggle-bar', text: '<h3><strong>3. Configuración Colapsable, Instrumento y Notación</strong></h3><ul><li class="mt-2"><strong>⚙️ Ocultar/Mostrar Opciones (Atajo: P):</strong> Colapsa los controles para centrar el pentagrama y el mástil (en móvil/tablet se oculta automáticamente al comenzar).</li><li class="mt-2"><strong>🎸 Instrumento (Atajo: Q):</strong> Alterna entre <strong>Guitarra</strong> (E-A-D-G-B-E) y <strong>Requinto Puntero</strong> (A-D-G-C-E-A, +4ª justa). En Requinto lees como guitarra mientras el mástil, el sonido y el micrófono se transponen automáticamente +5 semitonos.</li><li class="mt-2"><strong>Notación (Atajo: Z):</strong> Elige entre <strong>Americano</strong> (C D E) o <strong>Latino</strong> (Do Re Mi) en el mástil, micrófono, afinador y marcas.</li></ul>' },
     { id: 'exercise-type-control', text: '<h3><strong>4. Tipo de Ejercicio y Armonía</strong></h3><ul><li class="mt-2"><strong>Melodía / Armonía (Atajo: E):</strong> Practica líneas melódicas o acordes de 2, 3 y 4 voces.</li><li class="mt-2"><strong>Filtros y Progresiones:</strong> En Armonía puedes filtrar por intervalos, tríadas, inversiones, Drops y practicar cadencias reales (<strong>I-IV-V-I</strong>, <strong>II-V-I</strong>, <strong>I-VI-II-V</strong>).</li></ul>' },
     { id: 'difficulty-select', text: '<h3><strong>5. Nivel de Dificultad y Posición del Mástil</strong></h3><ul class="text-sm mt-2"><li class="mt-2"><strong>Básico:</strong> Mi4 a Fa5.</li><li class="mt-2"><strong>Medio:</strong> Mi3 a La5.</li><li class="mt-2"><strong>Avanzado:</strong> Todo el registro (Mi3 a Mi6).</li></ul><p class="mt-2 text-sm">Con <strong>Posición Mástil</strong> limita el ejercicio a una zona del diapasón (Abierta 0-IV, Posición I, V o IX).</p>' },
     { id: 'clef-select', text: '<h3><strong>6. Pentagrama, Ritmo, Cromatismo y Tap Tempo</strong></h3><ul><li class="mt-2"><strong>Clave (C), Armadura y Compás:</strong> Sol, Fa (activa rango de Bajo 38 Hz+) y Do.</li><li class="mt-2"><strong>Figuras Rítmicas y Cromatismo:</strong> Negras, blancas, corcheas, silencios y alteraciones accidentales (♯, ♭).</li><li class="mt-2"><strong>🥁 Tap Tempo:</strong> Marca el pulso con varios clics para fijar los BPM.</li></ul>' },
     { id: 'change-beat-control', text: '<h3><strong>7. Modo Esperar Nota, Lectura Adelantada y Acelerador</strong></h3><ul><li class="mt-2"><strong>⏸️ Esperar Nota (Atajo: W):</strong> Modo paso a paso sin presión de tiempo; avanza al instante cuando tocas la nota/acorde correcto con Micrófono o MIDI. Pulsa <strong>🔊 Oír (Atajo: O)</strong> para escuchar la referencia sin que el mic se auto-acerte.</li><li class="mt-2"><strong>Adelantar Compás:</strong> Muestra el siguiente compás antes de terminar el actual.</li><li class="mt-2"><strong>🚀 Acelerador (+5 BPM):</strong> Sube 5 BPM cada 2 compases perfectos.</li></ul>' },
     { id: 'visual-aids-container', text: '<h3><strong>8. Micrófono, Calibración y Marcas Diagnósticas</strong></h3><ul><li class="mt-2"><strong>Nombres (N), Guía (G), Mástil (M), Enarmónicos (A) y Sonido (S).</strong></li><li class="mt-2 text-emerald-400"><strong>Micrófono (R) y MIDI (J):</strong> Al activar el micrófono aparece el panel minimizable de calibración (selector de interfaz, medidor VU, <strong>Calibrar Ruido 2s</strong>, sensibilidad, afinación, latencia y <strong>Cancelar eco</strong>).</li><li class="mt-2"><strong>Marcas sobre el pentagrama:</strong> <span class="text-emerald-400">Verde</span> = correcto, <span class="text-amber-400">⏱ Tarde / Pronto</span> = mal tiempo, <span class="text-red-400">✕ [Nota]</span> = nota equivocada escuchada, <span class="text-red-400">⏱ Tiempo</span> = sin señal a tiempo.</li></ul>' },
     { id: 'audio-controls-container', text: '<h3><strong>9. Controles de Audio y Afinador</strong></h3><ul><li class="mt-2"><strong>Metrónomo (K):</strong> Clic Clásico, Batería (Groove) o Voz (ES/EN).</li><li class="mt-2"><strong>Timbre y Volúmenes:</strong> 🎸 Guitarra o 🎹 Sintetizador (a altura real del instrumento elegido).</li><li class="mt-2"><strong>Afinador (T):</strong> Muestra la guía de cuerdas de Guitarra o Requinto según el instrumento activo.</li></ul>' },
     { id: 'startStopButton', text: '<h3><strong>10. Modos de Juego y Resumen de Atajos</strong></h3><p>Reta tus habilidades con <strong>⭐ Reto Diario</strong>, <strong>🔥 Supervivencia</strong>, <strong>🎯 Atacar Debilidades</strong> y <strong>🎓 Modo Carrera</strong>.</p><p class="mt-2"><strong>Espacio o Clic en Pentagrama:</strong> 1 toque Inicia/Pausa, 2 toques Detiene. <strong>Enter/Espacio/Esc</strong> cierran Afinador, Tutorial o Resultados.</p><ul class="grid grid-cols-2 sm:grid-cols-3 gap-x-2 text-xs mt-2"><li><strong>Q:</strong> Guitarra/Requinto</li><li><strong>Z:</strong> Americano/Latino</li><li><strong>P:</strong> Mostrar/Ocultar Opc.</li><li><strong>W:</strong> Esperar Nota</li><li><strong>O:</strong> Oír Referencia</li><li><strong>R:</strong> Micrófono</li><li><strong>J:</strong> MIDI</li><li><strong>T:</strong> Afinador</li><li><strong>E:</strong> Melodía/Armonía</li><li><strong>C:</strong> Cambiar Clave</li><li><strong>N:</strong> Nombres</li><li><strong>G:</strong> Guía Visual</li><li><strong>M:</strong> Mástil</li><li><strong>A:</strong> ♯ / ♭</li><li><strong>S:</strong> Sonido</li><li><strong>K:</strong> Metrónomo</li><li><strong>F:</strong> Pantalla Comp.</li><li><strong>V:</strong> Ocultar Info</li><li><strong>H / L / B:</strong> Hist/Logros/Calor</li><li><strong>D:</strong> Tema Claro/Osc.</li><li><strong>U / X / I:</strong> User/Exp/Imp</li><li><strong>?:</strong> Tutorial</li></ul>' }
];
let currentTutorialStep = 0;
function showTutorial() {
    if (state.configPanelCollapsed) setConfigPanelCollapsed(false);
    currentTutorialStep = 0;
    ui.tutorialModal.classList.remove('hidden');
    updateTutorialStep();
}
function hideTutorial() { ui.tutorialModal.classList.add('hidden'); ui.tutorialHighlight.classList.add('hidden'); }
function nextTutorialStep() { currentTutorialStep++; if (currentTutorialStep >= tutorialSteps.length) hideTutorial(); else updateTutorialStep(); }
function prevTutorialStep() { currentTutorialStep--; if (currentTutorialStep < 0) currentTutorialStep = 0; updateTutorialStep(); }
function updateTutorialStep() {
    const step = tutorialSteps[currentTutorialStep]; ui.tutorialStepsContainer.innerHTML = `<div class="tutorial-step active">${step.text}</div>`;
    ui.tutorialStepCounter.textContent = `${currentTutorialStep + 1} / ${tutorialSteps.length}`;
    ui.prevTutorialStepBtn.classList.toggle('hidden', currentTutorialStep === 0);
    ui.nextTutorialStepBtn.textContent = currentTutorialStep === tutorialSteps.length - 1 ? 'Finalizar' : 'Siguiente';
    const targetElement = document.getElementById(step.id);
    if (targetElement) {
        const rect = targetElement.getBoundingClientRect(); const highlight = ui.tutorialHighlight;
        highlight.style.left = `${rect.left - 10}px`; highlight.style.top = `${rect.top - 10}px`; highlight.style.width = `${rect.width + 20}px`; highlight.style.height = `${rect.height + 20}px`; highlight.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.7)'; highlight.classList.remove('hidden');
    } else ui.tutorialHighlight.classList.add('hidden');
}

// Controles de interfaz, eventos globales y arranque de la aplicación

function attachEventListeners() {
    ui.themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        ui.themeToggleBtn.innerHTML = isLight ? '🌙 Tema' : '☀️ Tema';
        ui.themeToggleBtn.classList.toggle('bg-slate-700', isLight);
        ui.themeToggleBtn.classList.toggle('bg-amber-500', !isLight);
    });

    ui.achievementsButton.addEventListener('click', renderAchievementsModal);
    ui.closeAchievementsModal.addEventListener('click', () => ui.achievementsModal.classList.add('hidden'));
    ui.dailyChallengeBtn.addEventListener('click', () => { if (state.exerciseStarted) stopExercise(false); state.isWeaknessMode = false; state.activeCampaignStage = null; startDailyChallenge(); });
    ui.survivalModeBtn.addEventListener('click', () => { if (state.exerciseStarted) stopExercise(false); state.isWeaknessMode = false; state.activeCampaignStage = null; startSurvivalMode(); });
    ui.weaknessesModeBtn.addEventListener('click', () => { if (state.exerciseStarted) stopExercise(false); startWeaknessesMode(); });
    ui.campaignModeBtn.addEventListener('click', renderCampaignModal);
    ui.closeCampaignModal.addEventListener('click', () => ui.campaignModal.classList.add('hidden'));
    ui.heatmapButton.addEventListener('click', renderHeatmapModal);
    ui.closeHeatmapModal.addEventListener('click', () => ui.heatmapModal.classList.add('hidden'));

    ui.fretPositionSelect.addEventListener('change', (e) => {
        state.fretPosition = e.target.value;
        if (state.showFretboard) drawFretboardWithCurrentSettings();
        if (state.exerciseStarted) stopExercise(false);
    });
    ui.rhythmSelect.addEventListener('change', (e) => {
        state.rhythmMode = e.target.value;
        if (state.exerciseStarted) stopExercise(false);
        renderStave(state.manualNotesToDisplay);
    });
    ui.chromaticSelect.addEventListener('change', (e) => {
        state.chromaticMode = e.target.value;
        if (state.exerciseStarted) stopExercise(false);
    });
    ui.chromaticAccidentalSelect.addEventListener('change', (e) => {
        state.chromaticAccidentalType = e.target.value;
        if (state.exerciseStarted) stopExercise(false);
    });
    ui.tapTempoBtn.addEventListener('click', () => {
        const now = performance.now();
        state.tapTimes = state.tapTimes.filter(t => now - t < 3000);
        state.tapTimes.push(now);
        if (state.tapTimes.length >= 2) {
            let sumIntervals = 0;
            for (let i = 1; i < state.tapTimes.length; i++) {
                sumIntervals += (state.tapTimes[i] - state.tapTimes[i - 1]);
            }
            const avgMs = sumIntervals / (state.tapTimes.length - 1);
            const bpm = Math.max(30, Math.min(240, Math.round(60000 / avgMs)));
            ui.tempoInput.value = bpm;
        }
    });
    ui.harmonyProgressionSelect.addEventListener('change', (e) => {
        state.harmonyProgression = e.target.value;
        if (state.exerciseStarted) stopExercise(false);
    });
    ui.synthTypeSelect.addEventListener('change', (e) => state.synthType = e.target.value);
    ui.enableMidiToggle.addEventListener('change', (e) => toggleMidi(e.target.checked));
    ui.speedTrainerToggle.addEventListener('change', (e) => state.speedTrainer = e.target.checked);
    if (ui.waitModeToggle) {
        ui.waitModeToggle.addEventListener('change', (e) => {
            state.waitMode = e.target.checked;
            if (!state.waitMode) state.waitModeFrozen = false;
            if (state.waitMode && !state.micEnabled && !state.midiEnabled) {
                showTemporaryMessage("Activa Micrófono o MIDI para usar el modo Esperar Nota.", false);
            }
        });
    }
    if (ui.micDeviceSelect) {
        ui.micDeviceSelect.addEventListener('change', async (e) => {
            state.micDeviceId = e.target.value;
            if (state.micEnabled) {
                try {
                    await ensureMicAnalyser(true);
                    showTemporaryMessage("Entrada de micrófono actualizada.", false);
                } catch (err) {
                    showTemporaryMessage("No se pudo cambiar la entrada: " + err.message, true);
                }
            }
        });
    }
    if (ui.micSensitivitySlider) {
        ui.micSensitivitySlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            state.micSensitivity = val;
            if (ui.micSensitivityVal) {
                ui.micSensitivityVal.textContent = val <= 0.7 ? 'Baja' : (val >= 1.5 ? 'Alta' : 'Normal');
            }
        });
    }
    if (ui.micToleranceSelect) {
        ui.micToleranceSelect.addEventListener('change', (e) => {
            state.micToleranceCents = parseInt(e.target.value, 10) || 30;
        });
    }
    if (ui.micLatencySlider) {
        ui.micLatencySlider.addEventListener('input', (e) => {
            const ms = parseInt(e.target.value, 10) || 0;
            state.micLatencyMs = ms;
            if (ui.micLatencyVal) ui.micLatencyVal.textContent = `${ms} ms`;
        });
    }
    if (ui.micCalibrateBtn) {
        ui.micCalibrateBtn.addEventListener('click', calibrateMicNoiseFloor);
    }
    if (ui.micPanelToggleBtn && ui.micSettingsBody) {
        ui.micPanelToggleBtn.addEventListener('click', () => {
            state.micPanelCollapsed = !state.micPanelCollapsed;
            ui.micSettingsBody.classList.toggle('hidden', state.micPanelCollapsed);
            ui.micPanelToggleBtn.textContent = state.micPanelCollapsed ? '▸ Expandir' : '▾ Minimizar';
        });
    }
    if (ui.micEchoCancelToggle) {
        ui.micEchoCancelToggle.addEventListener('change', async (e) => {
            state.micEchoCancel = e.target.checked;
            if (state.micEnabled) {
                try {
                    await ensureMicAnalyser(true);
                    showTemporaryMessage(
                        state.micEchoCancel
                            ? 'Cancelación de eco activada (ideal sin audífonos).'
                            : 'Cancelación de eco desactivada (sonido puro para audífonos).',
                        false
                    );
                } catch (err) {
                    showTemporaryMessage('No se pudo actualizar el micrófono: ' + err.message, true);
                }
            }
        });
    }
    if (ui.waitHearNoteBtn) {
        ui.waitHearNoteBtn.addEventListener('click', async () => {
            if (!state.exerciseStarted || !state.activeVisualEvent) return;
            try { await initAudioEngine(); } catch (e) {}
            playWaitReferenceNote(state.activeVisualEvent.playingNotes || []);
        });
    }
    if (ui.instrumentSelect) {
        ui.instrumentSelect.addEventListener('change', (e) => {
            state.instrumentType = e.target.value;
            updateInstrumentSettings();
            if (state.exerciseStarted) stopExercise(false);
            showTemporaryMessage(
                state.instrumentType === 'requinto'
                    ? 'Modo Requinto Puntero activo (+4ª justa: sonido y micrófono ajustados +5 semitonos).'
                    : 'Modo Guitarra Estándar activo (afinación E-A-D-G-B-E).',
                false
            );
        });
    }
    if (ui.notationSystemSelect) {
        ui.notationSystemSelect.addEventListener('change', (e) => {
            state.notationSystem = e.target.value;
            updateInstrumentSettings();
            showTemporaryMessage(
                state.notationSystem === 'latin'
                    ? 'Notación Latina activa (Do Re Mi Fa Sol La Si).'
                    : 'Notación Americana activa (C D E F G A B).',
                false
            );
        });
    }
    if (ui.toggleConfigPanelBtn) {
        ui.toggleConfigPanelBtn.addEventListener('click', () => {
            setConfigPanelCollapsed(!state.configPanelCollapsed);
        });
    }

    ui.startStopButton.addEventListener('click', () => { state.isWeaknessMode = false; state.activeCampaignStage = null; state.exerciseStarted ? stopExercise(false) : startExercise(); });
    ui.pauseResumeButton.addEventListener('click', togglePause);
    ui.changeUserButton.addEventListener('click', () => { saveUserData(); location.reload(); });
    ui.historyButton.addEventListener('click', showHistoryModal);
    ui.closeHistoryModal.addEventListener('click', () => ui.historyModal.classList.add('hidden'));
    ui.historyModal.addEventListener('click', (e) => { if (e.target === ui.historyModal) ui.historyModal.classList.add('hidden'); });
    
    ui.exportBtn.addEventListener('click', exportUserData);
    ui.importBtn.addEventListener('click', () => ui.importInput.click());
    ui.importInput.addEventListener('change', importUserData);

    ui.showTutorialBtn.addEventListener('click', showTutorial);
    ui.closeModalBtn.addEventListener('click', hideTutorial);
    ui.tutorialModal.addEventListener('click', (e) => e.target === ui.tutorialModal && hideTutorial());
    ui.nextTutorialStepBtn.addEventListener('click', nextTutorialStep);
    ui.prevTutorialStepBtn.addEventListener('click', prevTutorialStep);
    
    ui.showTunerBtn.addEventListener('click', openTuner);
    ui.closeTunerBtn.addEventListener('click', closeTuner);
    
    ui.closeIntervalModalBtn.addEventListener('click', () => hideCustomSelectionModal('interval'));
    ui.cancelIntervalSelectionBtn.addEventListener('click', () => hideCustomSelectionModal('interval'));
    ui.saveIntervalSelectionBtn.addEventListener('click', () => saveCustomSelection('interval'));
    ui.closeTriadModalBtn.addEventListener('click', () => hideCustomSelectionModal('triad'));
    ui.cancelTriadSelectionBtn.addEventListener('click', () => hideCustomSelectionModal('triad'));
    ui.saveTriadSelectionBtn.addEventListener('click', () => saveCustomSelection('triad'));
    ui.closeVoicingModalBtn.addEventListener('click', () => hideCustomSelectionModal('voicing'));
    ui.cancelVoicingSelectionBtn.addEventListener('click', () => hideCustomSelectionModal('voicing'));
    ui.saveVoicingSelectionBtn.addEventListener('click', () => { saveCustomSelection('voicing'); if(state.exerciseStarted) stopExercise(false); });
    ui.closeQuadChordTypeModalBtn.addEventListener('click', () => hideCustomSelectionModal('quadChordType'));
    ui.cancelQuadChordTypeSelectionBtn.addEventListener('click', () => hideCustomSelectionModal('quadChordType'));
    ui.saveQuadChordTypeSelectionBtn.addEventListener('click', () => { saveCustomSelection('quadChordType'); if(state.exerciseStarted) stopExercise(false); });
     ui.closeQuadInversionModalBtn.addEventListener('click', () => hideCustomSelectionModal('quadInversion'));
    ui.cancelQuadInversionSelectionBtn.addEventListener('click', () => hideCustomSelectionModal('quadInversion'));
    ui.saveQuadInversionSelectionBtn.addEventListener('click', () => { saveCustomSelection('quadInversion'); if(state.exerciseStarted) stopExercise(false); });

    ui.closeResultsBtn.addEventListener('click', closeResultsModal);

    function toggleDisplayInfo() {
        state.showDisplayInfo = !state.showDisplayInfo;
        if (state.showDisplayInfo) {
            ui.displayArea.classList.remove('opacity-0', 'pointer-events-none');
            ui.infoVisibleIcon.classList.remove('hidden');
            ui.infoHiddenIcon.classList.add('hidden');
        } else {
            ui.displayArea.classList.add('opacity-0', 'pointer-events-none');
            ui.infoVisibleIcon.classList.add('hidden');
            ui.infoHiddenIcon.classList.remove('hidden');
        }
    }
    ui.toggleInfoBtn.addEventListener('click', toggleDisplayInfo);

    let staveClickTimer = null; let staveClickCount = 0;
    ui.staveContainer.addEventListener('click', () => {
        staveClickCount++;
        if (staveClickTimer) clearTimeout(staveClickTimer);
        staveClickTimer = setTimeout(() => {
            if (staveClickCount === 1) { if (!state.exerciseStarted) startExercise(); else togglePause(); }
            else if (staveClickCount >= 2) { if (state.exerciseStarted) stopExercise(false); }
            staveClickCount = 0;
        }, 300);
    });
    
    ui.showNoteNamesToggle.addEventListener('change', () => { 
        state.showNoteNames = ui.showNoteNamesToggle.checked; 
        updateHarmonyControlsVisibility(); 
        renderStave(state.exerciseStarted ? state.currentDisplayedContent : state.manualNotesToDisplay); 
    });
    ui.showGuideToggle.addEventListener('change', () => { state.showGuide = ui.showGuideToggle.checked; if (!state.exerciseStarted && ui.guideLine) ui.guideLine.style.display = 'none'; });
    ui.showFretboardToggle.addEventListener('change', (e) => {
        state.showFretboard = e.target.checked;
        ui.fretboardContainer.classList.toggle('hidden', !state.showFretboard);
        ui.enharmonicControlContainer.classList.toggle('hidden', !state.showFretboard);
        if (state.showFretboard) drawFretboardWithCurrentSettings();
    });
    ui.enableSoundToggle.addEventListener('change', (e) => { state.soundEnabled = e.target.checked; updateHeadphonesWarning(); });
    ui.enableMetronome.addEventListener('change', (e) => { state.metronomeEnabled = e.target.checked; updateHeadphonesWarning(); });
    
    ui.enableMicToggle.addEventListener('change', (e) => {
        if (state.exerciseStarted && state.activeCampaignStage && !e.target.checked) {
            e.target.checked = true;
            showTemporaryMessage("El micrófono debe permanecer activo durante el Modo Carrera.", true);
            return;
        }
        // Llamar directamente dentro del gesto del usuario sin awaits previos (requerido por Safari en iPadOS/iOS)
        toggleMicrophone(e.target.checked);
    });
    
    ui.missedNotesFilter.addEventListener('change', (e) => renderMissedNotesChart(e.target.value));
    
    ui.noteVolume.addEventListener('input', (e) => state.noteVolume = parseFloat(e.target.value));
    ui.metronomeVolume.addEventListener('input', (e) => state.metronomeVolume = parseFloat(e.target.value));
    ui.metronomeSoundSelect.addEventListener('change', (e) => state.metronomeSound = e.target.value);
    ui.enharmonicSelect.addEventListener('change', (e) => { state.enharmonicPreference = e.target.value; if (state.showFretboard) drawFretboardWithCurrentSettings(); });
    ui.cipherTypeSelect.addEventListener('change', (e) => { 
        state.cipherType = e.target.value; 
        renderStave(state.exerciseStarted ? state.currentDisplayedContent : state.manualNotesToDisplay); 
    });
    ui.exerciseTypeRadios.forEach(radio => radio.addEventListener('change', (e) => {
        state.exerciseType = e.target.value; updateHarmonyControlsVisibility(); if(state.showFretboard) drawFretboardWithCurrentSettings(); if(state.exerciseStarted) stopExercise(false); 
        renderStave(state.exerciseStarted ? state.currentDisplayedContent : state.manualNotesToDisplay);
    }));
    ui.notesPerChordSelect.addEventListener('change', (e) => { 
        state.notesPerChord = parseInt(e.target.value, 10); 
        updateHarmonyControlsVisibility(); 
        if(state.exerciseStarted) stopExercise(false); 
        renderStave(state.exerciseStarted ? state.currentDisplayedContent : state.manualNotesToDisplay); 
    });

    const setupCustomSelection = (selectElement, type) => {
        selectElement.addEventListener('change', e => {
            let capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
            if (type === 'quadInversion') capitalizedType = 'QuadInversion';
            if (type === 'quadChordType') capitalizedType = 'QuadChordType';
            let stateKey = `selected${capitalizedType}`;
            if (type === 'voicing') stateKey = 'selectedQuadVoicing';
            state[stateKey] = e.target.value;
            if (e.target.value === 'custom') showCustomSelectionModal(type);
            if(state.exerciseStarted) stopExercise(false); 
        });
    };
    setupCustomSelection(ui.intervalSelect, 'interval'); setupCustomSelection(ui.triadSelect, 'triad'); setupCustomSelection(ui.quadVoicingSelect, 'voicing'); setupCustomSelection(ui.quadInversionSelect, 'quadInversion'); setupCustomSelection(ui.quadChordTypeSelect, 'quadChordType');
    ui.triadPositionSelect.addEventListener('change', e => { state.triadPosition = e.target.value; if(state.exerciseStarted) stopExercise(false); });
    ui.melodyNoteNameStyleSelect.addEventListener('change', (e) => { 
        state.melodyNoteNameStyle = e.target.value; 
        if(state.exerciseStarted) renderStave(state.currentDisplayedContent); 
        else if (state.manualNotesToDisplay) renderStave(state.manualNotesToDisplay);
    });
    ui.measuresSelect.addEventListener('change', handleMeasuresChange);
    ui.customMeasuresInput.addEventListener('input', handleMeasuresChange);
    ui.difficultySelect.addEventListener('change', () => { 
        updateHarmonyControlsVisibility(); updateDropVoicingOptions(); 
        if(state.showFretboard) drawFretboardWithCurrentSettings(); 
        if (state.exerciseStarted) stopExercise(false); 
        renderStave(state.exerciseStarted ? state.currentDisplayedContent : state.manualNotesToDisplay); 
    });
    ui.keySigSelect.addEventListener('change', () => {
        state.keySignature = ui.keySigSelect.value;
        state.enharmonicPreference = 'auto'; ui.enharmonicSelect.value = 'auto';
        if (state.showFretboard) drawFretboardWithCurrentSettings();
        if (state.exerciseStarted) stopExercise(false); 
        renderStave(state.exerciseStarted ? state.currentDisplayedContent : state.manualNotesToDisplay);
    });
    [ui.clefSelect, ui.timeSigSelect, ui.changeBeatSelect].forEach(el => {
        el.addEventListener('change', () => {
            if (state.exerciseStarted) stopExercise(false);
            if (el === ui.timeSigSelect) updateChangeBeatOptions(); 
            if (el === ui.clefSelect) { updateHarmonyControlsVisibility(); updateMicFilterForClef(); if (state.showFretboard) drawFretboardWithCurrentSettings(); }
            if (el === ui.changeBeatSelect) state.measuresChangeBeat = parseInt(ui.changeBeatSelect.value, 10);
            renderStave(state.exerciseStarted ? state.currentDisplayedContent : state.manualNotesToDisplay);
        });
    });
    ui.fullscreenToggle.addEventListener('click', toggleFullscreen);

    function updateFullscreenIcons() {
        const isNativeFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        const isCssFs = ui.mainDisplayArea.classList.contains('app-fullscreen-mode');
        const isFullscreen = isNativeFs || isCssFs;
        ui.enterFullscreenIcon.classList.toggle('hidden', isFullscreen);
        ui.exitFullscreenIcon.classList.toggle('hidden', !isFullscreen);
        ui.fretboardContainer.classList.toggle('hidden', !state.showFretboard);

        // Sincronizar orientación horizontal automática en Android APK y navegadores móviles
        if (window.AndroidApp && typeof window.AndroidApp.setFullscreenLandscape === 'function') {
            try { window.AndroidApp.setFullscreenLandscape(isFullscreen); } catch (e) {}
        }
        if (screen.orientation) {
            if (isFullscreen && typeof screen.orientation.lock === 'function') {
                screen.orientation.lock('landscape').catch(() => {});
            } else if (!isFullscreen && typeof screen.orientation.unlock === 'function') {
                try { screen.orientation.unlock(); } catch (e) {}
            }
        }

        const rerender = () => {
            renderStave(state.exerciseStarted ? state.currentDisplayedContent : state.manualNotesToDisplay);
            if (state.exerciseStarted) updateGuidePosition(state.activeVisualEvent);
        };
        setTimeout(rerender, 80);
        setTimeout(rerender, 350);
    }
    document.addEventListener('fullscreenchange', updateFullscreenIcons);
    document.addEventListener('webkitfullscreenchange', updateFullscreenIcons);
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            renderStave(state.exerciseStarted ? state.currentDisplayedContent : state.manualNotesToDisplay);
            if (state.exerciseStarted) updateGuidePosition(state.activeVisualEvent);
        }, 250);
    });
    window.__exitAppFullscreen = () => {
        if (ui.mainDisplayArea.classList.contains('app-fullscreen-mode')) {
            ui.mainDisplayArea.classList.remove('app-fullscreen-mode');
            document.body.classList.remove('overflow-hidden');
            updateFullscreenIcons();
            return true;
        }
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            return true;
        }
        return false;
    };
    window.addEventListener('resize', () => { 
        clearTimeout(window.resizeTimeout); 
        window.resizeTimeout = setTimeout(() => {
            if (!state.exerciseStarted) renderStave(state.manualNotesToDisplay);
            else { renderStave(state.currentDisplayedContent); updateGuidePosition(state.activeVisualEvent); }
        }, 150); 
    });
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        const key = e.key.toLowerCase();
        
        if (!ui.tunerModal.classList.contains('hidden')) {
            if (key === 'enter' || key === ' ' || key === 'escape') {
                e.preventDefault();
                closeTuner();
                return; 
            }
        }

        if (!ui.resultsModal.classList.contains('hidden')) {
            if (key === 'enter' || key === ' ' || key === 'escape') {
                e.preventDefault();
                closeResultsModal();
                return; 
            }
        }

        if (!ui.tutorialModal.classList.contains('hidden')) {
            if (key === 'escape') { e.preventDefault(); hideTutorial(); return; }
            if (key === 'arrowright') { e.preventDefault(); nextTutorialStep(); return; }
            if (key === 'arrowleft') { e.preventDefault(); prevTutorialStep(); return; }
        }

        if (key === 'f') { e.preventDefault(); toggleFullscreen(); }
        else if (key === ' ') {
            e.preventDefault(); state.spacebarPressCount++;
            if (state.spacebarTimeout) clearTimeout(state.spacebarTimeout);
            state.spacebarTimeout = setTimeout(() => {
                if (state.spacebarPressCount === 1) { if (!state.exerciseStarted) startExercise(); else togglePause(); }
                else if (state.spacebarPressCount >= 2) { if (state.exerciseStarted) stopExercise(false); }
                state.spacebarPressCount = 0;
            }, 300);
        } else if (key === 'n') { e.preventDefault(); ui.showNoteNamesToggle.checked = !ui.showNoteNamesToggle.checked; ui.showNoteNamesToggle.dispatchEvent(new Event('change')); }
        else if (key === 'g') { e.preventDefault(); ui.showGuideToggle.checked = !ui.showGuideToggle.checked; ui.showGuideToggle.dispatchEvent(new Event('change')); }
        else if (key === 'c') { e.preventDefault(); const clefs = Array.from(ui.clefSelect.options).filter(opt => !opt.hidden); const currentIndex = clefs.findIndex(opt => opt.value === ui.clefSelect.value); const nextIndex = (currentIndex + 1) % clefs.length; ui.clefSelect.value = clefs[nextIndex].value; ui.clefSelect.dispatchEvent(new Event('change')); }
        else if (key === 'm') { e.preventDefault(); ui.showFretboardToggle.checked = !ui.showFretboardToggle.checked; ui.showFretboardToggle.dispatchEvent(new Event('change')); }
        else if (key === 's') { e.preventDefault(); ui.enableSoundToggle.checked = !ui.enableSoundToggle.checked; ui.enableSoundToggle.dispatchEvent(new Event('change')); }
        else if (key === 'k') { e.preventDefault(); ui.enableMetronome.checked = !ui.enableMetronome.checked; ui.enableMetronome.dispatchEvent(new Event('change')); }
        else if (key === 'a') {
            if (state.showFretboard) {
                e.preventDefault(); const currentVal = ui.enharmonicSelect.value; const options = Array.from(ui.enharmonicSelect.options).map(o => o.value);
                const currentIndex = options.indexOf(currentVal); const nextIndex = (currentIndex + 1) % options.length; ui.enharmonicSelect.value = options[nextIndex]; ui.enharmonicSelect.dispatchEvent(new Event('change'));
            }
        } else if (key === 'e') { e.preventDefault(); const currentType = state.exerciseType; const nextType = currentType === 'melodia' ? 'armonia' : 'melodia'; const radioToSelect = document.getElementById(`type-${nextType}`); if (radioToSelect) { radioToSelect.checked = true; radioToSelect.dispatchEvent(new Event('change')); } }
        else if (key === 'u') { e.preventDefault(); ui.changeUserButton.click(); }
        else if (key === 'h') { e.preventDefault(); if(ui.historyModal.classList.contains('hidden')) showHistoryModal(); else ui.historyModal.classList.add('hidden'); }
        else if (key === 'l') { e.preventDefault(); if(ui.achievementsModal.classList.contains('hidden')) renderAchievementsModal(); else ui.achievementsModal.classList.add('hidden'); }
        else if (key === 'b') { e.preventDefault(); if(ui.heatmapModal.classList.contains('hidden')) renderHeatmapModal(); else ui.heatmapModal.classList.add('hidden'); }
        else if (key === 'd') { e.preventDefault(); ui.themeToggleBtn.click(); }
        else if (key === 'j') { e.preventDefault(); ui.enableMidiToggle.checked = !ui.enableMidiToggle.checked; ui.enableMidiToggle.dispatchEvent(new Event('change')); }
        else if (key === 't') { e.preventDefault(); if(ui.tunerModal.classList.contains('hidden')) openTuner(); else closeTuner(); }
        else if (key === 'r') { e.preventDefault(); ui.enableMicToggle.checked = !ui.enableMicToggle.checked; ui.enableMicToggle.dispatchEvent(new Event('change')); }
        else if (key === 'x') { e.preventDefault(); ui.exportBtn.click(); }
        else if (key === 'i') { e.preventDefault(); ui.importBtn.click(); }
        else if (key === 'v') { e.preventDefault(); toggleDisplayInfo(); }
        else if (key === 'q') {
            if (ui.instrumentSelect) {
                e.preventDefault();
                ui.instrumentSelect.value = ui.instrumentSelect.value === 'requinto' ? 'guitar' : 'requinto';
                ui.instrumentSelect.dispatchEvent(new Event('change'));
            }
        } else if (key === 'z') {
            if (ui.notationSystemSelect) {
                e.preventDefault();
                ui.notationSystemSelect.value = ui.notationSystemSelect.value === 'latin' ? 'american' : 'latin';
                ui.notationSystemSelect.dispatchEvent(new Event('change'));
            }
        } else if (key === 'w') {
            if (ui.waitModeToggle) {
                e.preventDefault();
                ui.waitModeToggle.checked = !ui.waitModeToggle.checked;
                ui.waitModeToggle.dispatchEvent(new Event('change'));
            }
        } else if (key === 'o') {
            if (ui.waitHearNoteBtn && !ui.waitHearNoteBtn.classList.contains('hidden')) {
                e.preventDefault();
                ui.waitHearNoteBtn.click();
            }
        } else if (key === 'p') {
            e.preventDefault();
            setConfigPanelCollapsed(!state.configPanelCollapsed);
        }
        else if (key === '?') { e.preventDefault(); if(ui.tutorialModal.classList.contains('hidden')) showTutorial(); else hideTutorial(); }
    });
}

function toggleFullscreen() {
    const el = ui.mainDisplayArea;
    const isNativeFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const isCssFs = el.classList.contains('app-fullscreen-mode');

    // En Android APK, usar modo CSS fullscreen + orientación horizontal nativa garantiza 100% de compatibilidad y fluidez
    if (window.AndroidApp && typeof window.AndroidApp.setFullscreenLandscape === 'function') {
        const enter = !isCssFs;
        el.classList.toggle('app-fullscreen-mode', enter);
        document.body.classList.toggle('overflow-hidden', enter);
        try { window.AndroidApp.setFullscreenLandscape(enter); } catch (e) {}
        ui.enterFullscreenIcon.classList.toggle('hidden', enter);
        ui.exitFullscreenIcon.classList.toggle('hidden', !enter);
        ui.fretboardContainer.classList.toggle('hidden', !state.showFretboard);
        const rerender = () => {
            renderStave(state.exerciseStarted ? state.currentDisplayedContent : state.manualNotesToDisplay);
            if (state.exerciseStarted) updateGuidePosition(state.activeVisualEvent);
        };
        setTimeout(rerender, 120);
        setTimeout(rerender, 380);
        return;
    }

    if (!isNativeFs && !isCssFs) {
        if (el.requestFullscreen) {
            el.requestFullscreen().catch(() => {
                el.classList.add('app-fullscreen-mode');
                document.body.classList.add('overflow-hidden');
                document.dispatchEvent(new Event('fullscreenchange'));
            });
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        } else {
            el.classList.add('app-fullscreen-mode');
            document.body.classList.add('overflow-hidden');
            document.dispatchEvent(new Event('fullscreenchange'));
        }
    } else {
        if (isCssFs) {
            el.classList.remove('app-fullscreen-mode');
            document.body.classList.remove('overflow-hidden');
            document.dispatchEvent(new Event('fullscreenchange'));
        } else if (document.exitFullscreen) {
            document.exitFullscreen().catch(err => console.warn(`Exit fullscreen error: ${err.message}`));
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

function updateHarmonyControlsVisibility() {
    const isHarmony = state.exerciseType === 'armonia'; const notes = parseInt(ui.notesPerChordSelect.value, 10);
    const showNames = ui.showNoteNamesToggle.checked; const difficulty = ui.difficultySelect.value;
    ui.keySigContainer.classList.toggle('hidden', isHarmony);
    if (ui.rhythmOptionsContainer) ui.rhythmOptionsContainer.classList.toggle('hidden', isHarmony);
    if (ui.chromaticOptionsContainer) ui.chromaticOptionsContainer.classList.toggle('hidden', isHarmony);
    if (ui.chromaticAccidentalContainer) ui.chromaticAccidentalContainer.classList.toggle('hidden', isHarmony);

    if (isHarmony) { state.keySignature = 'C'; ui.keySigSelect.value = 'C'; } else { state.keySignature = ui.keySigSelect.value; }
    ui.harmonyOptionsContainer.classList.toggle('hidden', !isHarmony);
    ui.intervalOptionsContainer.classList.toggle('hidden', !isHarmony || notes !== 2);
    ui.triadOptionsContainer.classList.toggle('hidden', !isHarmony || notes !== 3);
    const showTriadPosition = isHarmony && notes === 3 && (difficulty === 'medium' || difficulty === 'advanced');
    ui.triadPositionContainer.classList.toggle('hidden', !showTriadPosition);
    ui.quadOptionsContainer.classList.toggle('hidden', !isHarmony || notes !== 4);
    ui.quadInversionContainer.classList.toggle('hidden', !isHarmony || notes !== 4);
    ui.quadChordTypeContainer.classList.toggle('hidden', !isHarmony || notes !== 4);
    ui.harmonyProgressionContainer.classList.toggle('hidden', !isHarmony || notes < 3);
    const showMelodyNameOptions = !isHarmony && showNames;
    ui.melodyNoteNameOptionsContainer.classList.toggle('hidden', !showMelodyNameOptions);
    const showCipherControl = isHarmony && showNames && notes > 2;
    ui.cipherTypeContainer.classList.toggle('hidden', !showCipherControl);

    if (showCipherControl) {
        const select = ui.cipherTypeSelect; const currentVal = select.value; select.innerHTML = ''; let options = [];
        if (notes === 3) options = [ {value: 'todos', text: 'Todos'}, {value: 'americano', text: 'Americano'}, {value: 'bajo', text: 'Bajo Cifrado'} ];
        else if (notes === 4) options = [ {value: 'todos', text: 'Todos'}, {value: 'americano', text: 'Americano'}, {value: 'drops', text: 'Drops'} ];
        options.forEach(opt => { const optionEl = document.createElement('option'); optionEl.value = opt.value; optionEl.textContent = opt.text; select.appendChild(optionEl); });
        if (options.some(opt => opt.value === currentVal)) select.value = currentVal; else select.value = 'todos';
        state.cipherType = select.value;
    }

    const isQuad = isHarmony && notes === 4; const is3or4VoiceHarmony = isHarmony && (notes === 3 || notes === 4);
    ui.timeSigContainer.classList.toggle('hidden', isQuad);
    if(isQuad) { ui.timeSigSelect.value = '4/4'; state.timeSignatureBeats = 4; updateChangeBeatOptions(); }
    Array.from(ui.clefSelect.options).forEach(option => { if (option.value === 'F' || option.value === 'C') option.hidden = is3or4VoiceHarmony; });
    if (is3or4VoiceHarmony && ui.clefSelect.value !== 'G') ui.clefSelect.value = 'G';
    
    if (isQuad && ui.difficultySelect.value === 'basico') { ui.difficultySelect.value = 'medium'; ui.difficultySelect.dispatchEvent(new Event('change')); }
    const isGClef = ui.clefSelect.value === 'G';
    ui.fretboardControlContainer.classList.toggle('hidden', !isGClef);
    if (!isGClef && state.showFretboard) { ui.showFretboardToggle.checked = false; ui.showFretboardToggle.dispatchEvent(new Event('change')); }
}

function updateDropVoicingOptions() {
    const voicings = notesData.voicingsByDifficulty.advanced;
    if (!voicings) { ui.quadVoicingSelect.innerHTML = ''; return; }
    const currentVoicing = ui.quadVoicingSelect.value; ui.quadVoicingSelect.innerHTML = '';
    const addOption = (val, text) => { const option = document.createElement('option'); option.value = val; option.textContent = text; ui.quadVoicingSelect.appendChild(option); }
    for (const key in voicings) addOption(key, voicings[key]);
    addOption('custom', 'Personalizado');
    if (Array.from(ui.quadVoicingSelect.options).some(opt => opt.value === currentVoicing)) ui.quadVoicingSelect.value = currentVoicing; else ui.quadVoicingSelect.value = 'all';
    state.selectedQuadVoicing = ui.quadVoicingSelect.value;
}

function handleMeasuresChange() {
    if (ui.measuresSelect.value === 'custom') {
        ui.customMeasuresContainer.classList.remove('hidden');
        const customValue = parseInt(ui.customMeasuresInput.value, 10);
        state.measuresPerExercise = isNaN(customValue) || customValue <= 0 ? 1 : customValue;
    } else {
        ui.customMeasuresContainer.classList.add('hidden');
        state.measuresPerExercise = parseInt(ui.measuresSelect.value, 10);
    }
    ui.measuresCount.textContent = `0 / ${state.measuresPerExercise}`;
}

function updateChangeBeatOptions() {
    const prevSelected = parseInt(ui.changeBeatSelect.value, 10);
    const timeSigParts = ui.timeSigSelect.value.split('/'); state.timeSignatureBeats = parseInt(timeSigParts[0], 10);
    ui.changeBeatSelect.innerHTML = '';
    for (let i = 1; i <= state.timeSignatureBeats; i++) {
        const option = document.createElement('option'); option.value = i; option.textContent = i; ui.changeBeatSelect.appendChild(option);
    }
    const newBeatVal = (!isNaN(prevSelected) && prevSelected >= 1 && prevSelected <= state.timeSignatureBeats)
        ? prevSelected
        : state.timeSignatureBeats;
    ui.changeBeatSelect.value = newBeatVal; state.measuresChangeBeat = newBeatVal;
    renderBeatLeds(0);
}

function renderBeatLeds(activeBeat = 0) {
    if (!ui.beatLedsContainer) return;
    ui.beatLedsContainer.innerHTML = '';
    for (let i = 1; i <= state.timeSignatureBeats; i++) {
        const dot = document.createElement('span');
        const isActive = i === activeBeat;
        const activeColor = i === 1 ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] scale-125' : 'bg-sky-400 shadow-[0_0_8px_#38bdf8] scale-110';
        dot.className = `w-2.5 h-2.5 rounded-full transition-all duration-100 ${isActive ? activeColor : 'bg-zinc-600'}`;
        ui.beatLedsContainer.appendChild(dot);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeLogin();
});

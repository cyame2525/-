// グローバル変数
let audioContext;
let analyser;
let dataArray;
let audioBuffer;
let source;
let isPlaying = false;
let analysisData = {
    frequencies: [],
    amplitudes: [],
    peaks: [],
    instruments: []
};

// 初期化
window.addEventListener('DOMContentLoaded', () => {
    initAudioContext();
    setupEventListeners();
});

// Audio Context の初期化
function initAudioContext() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
}

// イベントリスナーの設定
function setupEventListeners() {
    const audioFileInput = document.getElementById('audioFile');
    const sensitivityInput = document.getElementById('sensitivityInput');
    
    audioFileInput.addEventListener('change', handleFileUpload);
    sensitivityInput.addEventListener('input', (e) => {
        document.getElementById('sensitivityValue').textContent = e.target.value;
    });
}

// ファイルアップロード処理
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name;
    document.getElementById('fileName').textContent = `📄 ${fileName}`;

    const reader = new FileReader();
    reader.onload = (e) => {
        audioContext.decodeAudioData(e.target.result, (buffer) => {
            audioBuffer = buffer;
            enableControls();
            visualizeWaveform();
        }, (error) => {
            alert('オーディオファイルのデコードに失敗しました: ' + error);
        });
    };
    reader.readAsArrayBuffer(file);
}

// 制御ボタンの有効化
function enableControls() {
    document.getElementById('playBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('analyzeBtn').disabled = false;
}

// 波形の可視化
function visualizeWaveform() {
    const canvas = document.getElementById('waveformCanvas');
    const ctx = canvas.getContext('2d');
    const data = audioBuffer.getChannelData(0);
    
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;
    
    for (let i = 0; i < canvas.width; i++) {
        const min = Math.min(...data.slice(i * step, (i + 1) * step));
        const max = Math.max(...data.slice(i * step, (i + 1) * step));
        
        const y1 = amp + min * amp;
        const y2 = amp + max * amp;
        
        if (i === 0) {
            ctx.moveTo(i, y1);
        } else {
            ctx.lineTo(i, y1);
        }
    }
    
    ctx.stroke();
}

// 再生
function playAudio() {
    if (isPlaying) return;
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    source.start(0);
    isPlaying = true;
    document.getElementById('pauseBtn').disabled = false;
}

// 一時停止
function pauseAudio() {
    if (source) {
        source.stop();
    }
    isPlaying = false;
    document.getElementById('pauseBtn').disabled = true;
}

// 分析開始
function analyzeAudio() {
    if (!audioBuffer) {
        alert('まずオーディオファイルをアップロードしてください');
        return;
    }
    
    document.getElementById('progressSection').style.display = 'block';
    document.getElementById('analyzeBtn').disabled = true;
    
    // 分析処理をシミュレート
    performAnalysis();
}

// 分析処理
function performAnalysis() {
    const data = audioBuffer.getChannelData(0);
    const sensitivity = parseFloat(document.getElementById('sensitivityInput').value);
    
    // FFTを使用した周波数分析
    const frequencyData = performFFT(data);
    analysisData.frequencies = frequencyData;
    
    // ピークの検出
    const peaks = detectPeaks(frequencyData, sensitivity);
    analysisData.peaks = peaks;
    
    // 楽器の推定
    const instruments = estimateInstruments(frequencyData, peaks);
    analysisData.instruments = instruments;
    
    // 進捗更新
    updateProgress(50);
    
    // 可視化
    visualizeFrequency(frequencyData);
    displayInstruments(instruments);
    displayAnalysisInfo(frequencyData);
    
    // 進捗完了
    updateProgress(100);
    
    setTimeout(() => {
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('convertBtn').disabled = false;
        document.getElementById('analyzeBtn').disabled = false;
    }, 500);
}

// FFT処理（簡易版）
function performFFT(data) {
    const fftSize = 2048;
    const frequencies = new Array(fftSize / 2).fill(0);
    
    // サンプルを複数回実行して平均
    const numSamples = Math.floor(data.length / fftSize);
    
    for (let sample = 0; sample < Math.min(numSamples, 10); sample++) {
        for (let i = 0; i < fftSize / 2; i++) {
            let real = 0, imag = 0;
            
            for (let k = 0; k < fftSize; k++) {
                const idx = sample * fftSize + k;
                if (idx >= data.length) break;
                
                const angle = -2 * Math.PI * i * k / fftSize;
                real += data[idx] * Math.cos(angle);
                imag += data[idx] * Math.sin(angle);
            }
            
            const magnitude = Math.sqrt(real * real + imag * imag);
            frequencies[i] += magnitude;
        }
    }
    
    // 平均化
    return frequencies.map(f => f / Math.min(numSamples, 10));
}

// ピーク検出
function detectPeaks(frequencies, sensitivity) {
    const peaks = [];
    const threshold = Math.max(...frequencies) * sensitivity;
    
    for (let i = 1; i < frequencies.length - 1; i++) {
        if (frequencies[i] > frequencies[i - 1] && 
            frequencies[i] > frequencies[i + 1] && 
            frequencies[i] > threshold) {
            peaks.push({
                index: i,
                magnitude: frequencies[i],
                frequency: (i * 44100) / frequencies.length
            });
        }
    }
    
    return peaks.sort((a, b) => b.magnitude - a.magnitude).slice(0, 10);
}

// 楽器の推定
function estimateInstruments(frequencies, peaks) {
    const instruments = [
        { name: 'ピアノ', range: [20, 4000], confidence: 0 },
        { name: 'ギター', range: [80, 3000], confidence: 0 },
        { name: 'ベース', range: [20, 250], confidence: 0 },
        { name: 'バイオリン', range: [195, 3000], confidence: 0 },
        { name: 'トランペット', range: [165, 2000], confidence: 0 },
        { name: 'フルート', range: [262, 2093], confidence: 0 },
        { name: 'ドラム', range: [50, 5000], confidence: 0 }
    ];
    
    // ピークの周波数に基づいて楽器を推定
    peaks.forEach(peak => {
        instruments.forEach(instrument => {
            if (peak.frequency >= instrument.range[0] && 
                peak.frequency <= instrument.range[1]) {
                instrument.confidence += (peak.magnitude / 100);
            }
        });
    });
    
    // 正規化
    const maxConfidence = Math.max(...instruments.map(i => i.confidence));
    instruments.forEach(inst => {
        if (maxConfidence > 0) {
            inst.confidence = Math.min((inst.confidence / maxConfidence) * 100, 100);
        }
    });
    
    return instruments.filter(i => i.confidence > 10).sort((a, b) => b.confidence - a.confidence);
}

// 周波数の可視化
function visualizeFrequency(frequencies) {
    const canvas = document.getElementById('frequencyCanvas');
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#764ba2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const step = Math.ceil(frequencies.length / canvas.width);
    const scale = canvas.height / Math.max(...frequencies);
    
    for (let i = 0; i < canvas.width; i++) {
        const freq = frequencies[i * step] || 0;
        const y = canvas.height - (freq * scale);
        
        if (i === 0) {
            ctx.moveTo(i, y);
        } else {
            ctx.lineTo(i, y);
        }
    }
    
    ctx.stroke();
    
    // グリッド線
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const y = (canvas.height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// 楽器の表示
function displayInstruments(instruments) {
    const container = document.getElementById('instrumentsList');
    container.innerHTML = '';
    
    if (instruments.length === 0) {
        container.innerHTML = '<p class="placeholder">楽器が検出されませんでした</p>';
        return;
    }
    
    instruments.forEach(inst => {
        const card = document.createElement('div');
        card.className = 'instrument-card';
        card.innerHTML = `
            <div class="instrument-name">${inst.name}</div>
            <div class="instrument-confidence">信頼度: ${inst.confidence.toFixed(1)}%</div>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${inst.confidence}%"></div>
            </div>
        `;
        container.appendChild(card);
    });
}

// 分析情報の表示
function displayAnalysisInfo(frequencies) {
    const infoSection = document.getElementById('infoSection');
    infoSection.style.display = 'block';
    
    const nonZeroFreqs = analysisData.peaks.map(p => p.frequency);
    const minFreq = Math.min(...nonZeroFreqs) || 0;
    const maxFreq = Math.max(...nonZeroFreqs) || 0;
    const avgFreq = nonZeroFreqs.reduce((a, b) => a + b, 0) / nonZeroFreqs.length || 0;
    const dynamics = Math.max(...frequencies) - Math.min(...frequencies);
    
    document.getElementById('frequencyRange').textContent = 
        `${minFreq.toFixed(0)} Hz - ${maxFreq.toFixed(0)} Hz`;
    document.getElementById('averageFreq').textContent = 
        `${avgFreq.toFixed(0)} Hz`;
    document.getElementById('dynamics').textContent = 
        `${dynamics.toFixed(2)} dB`;
}

// 進捗更新
function updateProgress(percentage) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressFill.style.width = percentage + '%';
    progressText.textContent = `分析中... ${percentage}%`;
}

// MIDI変換
function convertToMIDI() {
    if (analysisData.instruments.length === 0) {
        alert('先に分析を実行してください');
        return;
    }
    
    try {
        const bpm = parseInt(document.getElementById('bpmInput').value);
        const instrumentNum = parseInt(document.getElementById('instrumentSelect').value);
        
        // MIDI生成（MIDIライターを使用）
        const midiData = generateMIDI(analysisData, bpm, instrumentNum);
        
        // ダウンロード
        downloadMIDI(midiData, 'converted_audio.mid');
        
        alert('✅ MIDIファイルが生成されました！\nBandLabにアップロードしてご利用ください。');
    } catch (error) {
        alert('MIDI生成エラー: ' + error.message);
    }
}

// MIDI生成
function generateMIDI(analysisData, bpm, instrumentNum) {
    // Simple MIDI generation
    const ticksPerBeat = 480;
    const midiData = [];
    
    // MIDIヘッダー
    midiData.push(...createMIDIHeader());
    
    // トラック
    const trackData = [];
    
    // テンポ設定 (Set Tempo)
    const microsecondsPerBeat = Math.round(60000000 / bpm);
    trackData.push(...createTempoEvent(microsecondsPerBeat));
    
    // プログラムチェンジ
    trackData.push(...createProgramChange(0, instrumentNum));
    
    // ノートイベント（ピークの周波数をノートに変換）
    const peaksToUse = analysisData.peaks.slice(0, 8);
    let currentTick = 0;
    
    peaksToUse.forEach((peak, index) => {
        const note = frequencyToNote(peak.frequency);
        const velocity = Math.min(127, Math.round(peak.magnitude * 2));
        const duration = ticksPerBeat * 2; // 2拍
        
        // ノートオン
        trackData.push(...createNoteOn(0, currentTick, note, velocity));
        
        // ノートオフ
        currentTick += duration;
        trackData.push(...createNoteOff(0, currentTick, note));
        
        currentTick += ticksPerBeat / 2; // 半拍の休符
    });
    
    // トラック終了
    trackData.push(...createEndOfTrack());
    
    // トラックヘッダーを追加
    const trackHeader = [
        0x4D, 0x54, 0x72, 0x6B, // "MTrk"
        0x00, 0x00, 0x00, trackData.length // トラックサイズ
    ];
    
    midiData.push(...trackHeader);
    midiData.push(...trackData);
    
    return new Uint8Array(midiData);
}

// MIDIヘッダー
function createMIDIHeader() {
    return [
        0x4D, 0x54, 0x68, 0x64, // "MThd"
        0x00, 0x00, 0x00, 0x06, // ヘッダーサイズ
        0x00, 0x00, // フォーマット 0
        0x00, 0x01, // 1トラック
        0x01, 0xE0  // 480ティックス/4分音符
    ];
}

// テンポイベント
function createTempoEvent(microsecondsPerBeat) {
    return [
        0x00, 0xFF, 0x51, 0x03,
        (microsecondsPerBeat >> 16) & 0xFF,
        (microsecondsPerBeat >> 8) & 0xFF,
        microsecondsPerBeat & 0xFF
    ];
}

// プログラムチェンジ
function createProgramChange(channel, program) {
    return [0x00, 0xC0 | channel, program];
}

// ノートオン
function createNoteOn(channel, tick, note, velocity) {
    const deltaTime = encodeVariableLength(tick);
    const status = 0x90 | channel;
    return [...deltaTime, status, note, velocity];
}

// ノートオフ
function createNoteOff(channel, tick, note) {
    const deltaTime = encodeVariableLength(tick);
    const status = 0x80 | channel;
    return [...deltaTime, status, note, 0x40];
}

// トラック終了
function createEndOfTrack() {
    return [0x00, 0xFF, 0x2F, 0x00];
}

// 可変長エンコード
function encodeVariableLength(value) {
    let result = [value & 0x7F];
    value >>= 7;
    while (value > 0) {
        result.unshift((value & 0x7F) | 0x80);
        value >>= 7;
    }
    return result;
}

// 周波数からノートへ
function frequencyToNote(frequency) {
    // A4 = 440 Hz = MIDI note 69
    const noteNumber = Math.round(12 * Math.log2(frequency / 440)) + 69;
    return Math.max(0, Math.min(127, noteNumber));
}

// MIDIダウンロード
function downloadMIDI(midiData, filename) {
    const blob = new Blob([midiData], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
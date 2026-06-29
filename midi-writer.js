// MIDI Writer Library
// BandLab互換のMIDIファイルを生成するユーティリティ

class MIDIWriter {
    constructor(options = {}) {
        this.bpm = options.bpm || 120;
        this.timeSignature = options.timeSignature || [4, 4];
        this.tracks = [];
        this.ticksPerBeat = 480;
    }

    addTrack(track) {
        this.tracks.push(track);
        return this;
    }

    toArray() {
        const midiArray = [];

        // MIDIヘッダー
        midiArray.push(...this.getHeaderChunk());

        // トラックチャンク
        this.tracks.forEach(track => {
            midiArray.push(...track.toArray(this.ticksPerBeat));
        });

        return midiArray;
    }

    getHeaderChunk() {
        const header = [];
        header.push(0x4D, 0x54, 0x68, 0x64); // "MThd"
        header.push(0x00, 0x00, 0x00, 0x06); // Length
        header.push(0x00, 0x00);              // Format 0
        header.push(0x00, this.tracks.length); // Number of tracks
        header.push(0x01, 0xE0);              // Division (480 ticks per quarter)
        return header;
    }
}

class Track {
    constructor(name = 'Track') {
        this.name = name;
        this.events = [];
    }

    addNote(note, duration, velocity = 100, channel = 0) {
        this.events.push({
            type: 'note',
            note: note,
            duration: duration,
            velocity: velocity,
            channel: channel
        });
        return this;
    }

    addRest(duration) {
        this.events.push({
            type: 'rest',
            duration: duration
        });
        return this;
    }

    setTempo(bpm) {
        this.events.unshift({
            type: 'tempo',
            bpm: bpm
        });
        return this;
    }

    setProgramChange(instrument, channel = 0) {
        this.events.unshift({
            type: 'programChange',
            instrument: instrument,
            channel: channel
        });
        return this;
    }

    toArray(ticksPerBeat) {
        const trackData = [];
        let currentTick = 0;
        let lastEventTime = 0;

        this.events.forEach(event => {
            let deltaTime = currentTick - lastEventTime;

            if (event.type === 'tempo') {
                const microsecondsPerBeat = Math.round(60000000 / event.bpm);
                trackData.push(...this.encodeVariableLength(deltaTime));
                trackData.push(0xFF, 0x51, 0x03);
                trackData.push(
                    (microsecondsPerBeat >> 16) & 0xFF,
                    (microsecondsPerBeat >> 8) & 0xFF,
                    microsecondsPerBeat & 0xFF
                );
                lastEventTime = currentTick;
            } else if (event.type === 'programChange') {
                trackData.push(...this.encodeVariableLength(deltaTime));
                trackData.push(0xC0 | event.channel, event.instrument);
                lastEventTime = currentTick;
            } else if (event.type === 'note') {
                // ノートオン
                trackData.push(...this.encodeVariableLength(deltaTime));
                trackData.push(0x90 | event.channel, event.note, event.velocity);
                currentTick += event.duration;
                lastEventTime = currentTick;

                // ノートオフ
                trackData.push(...this.encodeVariableLength(0));
                trackData.push(0x80 | event.channel, event.note, 0x40);
            } else if (event.type === 'rest') {
                currentTick += event.duration;
            }
        });

        // トラック終了
        trackData.push(0x00, 0xFF, 0x2F, 0x00);

        // トラックヘッダー
        const header = [];
        header.push(0x4D, 0x54, 0x72, 0x6B); // "MTrk"
        const size = trackData.length;
        header.push(
            (size >> 24) & 0xFF,
            (size >> 16) & 0xFF,
            (size >> 8) & 0xFF,
            size & 0xFF
        );

        return [...header, ...trackData];
    }

    encodeVariableLength(value) {
        const result = [value & 0x7F];
        value >>= 7;
        while (value > 0) {
            result.unshift((value & 0x7F) | 0x80);
            value >>= 7;
        }
        return result;
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MIDIWriter, Track };
}
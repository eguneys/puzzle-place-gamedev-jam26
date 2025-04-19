async function load_audio(ctx: AudioContext, src: string) {
    const buffer = await fetch(src).then(_ => _.arrayBuffer())
    const audio_buffer = await ctx.decodeAudioData(buffer)
    return audio_buffer
}

type AudioContent = {
    load: () => Promise<void>
    play: (buffer: AudioBuffer) => void
    buffers: Record<string, AudioBuffer>
}

function AudioContent() {

    let ctx = new AudioContext()

    let buffers: Record<string, AudioBuffer> = { }

    async function load() {
        buffers['drag'] = await load_audio(ctx, '/audio/drag.wav')
        buffers['drop'] = await load_audio(ctx, '/audio/drop.wav')
    }

    function play(music: string, loop: boolean = false, volume: number = 1) {
        let buffer = buffers[music]
        const source = ctx.createBufferSource()
        source.buffer = buffer

        let gain = ctx.createGain()
        gain.gain.value = volume


        gain.connect(ctx.destination)
        source.connect(gain)
        source.loop = loop

        source.start()
    }

    return {
        load,
        play,
        buffers
    }
}

export default AudioContent()
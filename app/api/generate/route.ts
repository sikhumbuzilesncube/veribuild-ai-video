import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const scriptText = formData.get('script') as string;

    if (!image || !scriptText) {
      return NextResponse.json({ error: 'Missing image or script' }, { status: 400 });
    }

    const rawDidKey = (process.env.DID_API_KEY || '').trim().replace(/^Basic\s+/i, '');
    const didAuthHeader = `Basic ${Buffer.from(rawDidKey).toString('base64')}`;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

    // 1. GENERATE VOICE WITH ELEVENLABS
    // PASTE YOUR CLONED VOICE ID HERE (replace the one below)
    const voiceId = 'YOUR_ELEVENLABS_VOICE_ID_HERE'; 
    
    const voiceRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsKey as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: scriptText,
        model_id: 'eleven_multilingual_v2', // Best for African languages
      }),
    });

    if (!voiceRes.ok) throw new Error('ElevenLabs voice generation failed. Check credits or Voice ID.');
    const voiceBlob = await voiceRes.blob();

    // 2. UPLOAD AUDIO TO D-ID
    const audioFormData = new FormData();
    audioFormData.append('audio', voiceBlob, 'audio.mp3');
    const didAudioRes = await fetch('https://api.d-id.com/audios', {
      method: 'POST',
      headers: { Authorization: didAuthHeader },
      body: audioFormData,
    });
    const didAudioData = await didAudioRes.json();
    if (!didAudioRes.ok) return NextResponse.json({ error: JSON.stringify(didAudioData) }, { status: 400 });

    // 3. UPLOAD IMAGE TO D-ID
    const imageFormData = new FormData();
    imageFormData.append('image', image);
    const didImageRes = await fetch('https://api.d-id.com/images', {
      method: 'POST',
      headers: { Authorization: didAuthHeader },
      body: imageFormData,
    });
    const didImageData = await didImageRes.json();
    if (!didImageRes.ok) return NextResponse.json({ error: JSON.stringify(didImageData) }, { status: 400 });

    // 4. CREATE THE VIDEO (Full flyer + Ndebele Audio)
    const didVideoRes = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        Authorization: didAuthHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_url: didImageData.url,
        script: {
          type: 'audio',
          audio_url: didAudioData.url,
        },
        config: {
          stitch: true, // Keeps the full flyer visible
        }
      }),
    });
    
    const didVideoData = await didVideoRes.json();
    if (!didVideoRes.ok) return NextResponse.json({ error: JSON.stringify(didVideoData) }, { status: 400 });

    return NextResponse.json({ talkId: didVideoData.id });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

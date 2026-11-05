import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const scriptText = formData.get('script') as string;

    if (!image || !scriptText) {
      return NextResponse.json({ error: 'Missing image or script' }, { status: 400 });
    }

    // --- 1. GENERATE VOICE USING ELEVENLABS ---
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Default voice. We will change this to your Ndebele voice later.
    
    const voiceRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: scriptText,
        model_id: 'eleven_multilingual_v2', 
      }),
    });

    if (!voiceRes.ok) throw new Error('ElevenLabs voice generation failed');
    const voiceBlob = await voiceRes.blob();

    // --- 2. UPLOAD VOICE TO D-ID ---
    const audioFormData = new FormData();
    audioFormData.append('audio', voiceBlob, 'voice.mp3');

    const didAudioRes = await fetch('https://api.d-id.com/audios', {
      method: 'POST',
      headers: { Authorization: `Basic ${process.env.DID_API_KEY}` },
      body: audioFormData,
    });
    const didAudioData = await didAudioRes.json();
    
    // --- 3. UPLOAD IMAGE TO D-ID ---
    const imageFormData = new FormData();
    imageFormData.append('image', image);

    const didImageRes = await fetch('https://api.d-id.com/images', {
      method: 'POST',
      headers: { Authorization: `Basic ${process.env.DID_API_KEY}` },
      body: imageFormData,
    });
    const didImageData = await didImageRes.json();

    // --- 4. TELL D-ID TO MAKE THE VIDEO ---
    const didVideoRes = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${process.env.DID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_url: didImageData.url,
        script: {
          type: 'audio',
          audio_url: didAudioData.url,
        },
      }),
    });
    
    const didVideoData = await didVideoRes.json();
    if (!didVideoRes.ok) throw new Error(didVideoData.description || 'D-ID Video Error');

    // --- 5. WAIT FOR VIDEO TO FINISH ---
    const talkId = didVideoData.id;
    let videoUrl = '';
    
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 3000)); 
      
      const statusRes = await fetch(`https://api.d-id.com/talks/${talkId}`, {
        headers: { Authorization: `Basic ${process.env.DID_API_KEY}` },
      });
      const statusData = await statusRes.json();
      
      if (statusData.status === 'done') {
        videoUrl = statusData.result_url;
        break;
      } else if (statusData.status === 'error') {
        throw new Error('Video generation failed');
      }
    }

    return NextResponse.json({ url: videoUrl });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
        }

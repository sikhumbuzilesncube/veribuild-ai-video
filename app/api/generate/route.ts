import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const scriptText = formData.get('script') as string;

    if (!image || !scriptText) {
      return NextResponse.json({ error: 'Missing image or script' }, { status: 400 });
    }

    // --- 1. UPLOAD IMAGE TO D-ID ---
    const imageFormData = new FormData();
    imageFormData.append('image', image);

    const didImageRes = await fetch('https://api.d-id.com/images', {
      method: 'POST',
      headers: { Authorization: `Basic ${process.env.DID_API_KEY}` },
      body: imageFormData,
    });
    
    const didImageData = await didImageRes.json();

    if (!didImageRes.ok) {
      throw new Error(didImageData.description || 'Image upload failed. Check D-ID credits/keys.');
    }

    // --- 2. TELL D-ID TO MAKE THE VIDEO (Using D-ID's built-in text-to-speech) ---
    const didVideoRes = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${process.env.DID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_url: didImageData.url,
        script: {
          type: 'text', 
          input: scriptText,
          provider: {
            type: 'microsoft',
            voice_id: 'en-US-JennyNeural' 
          }
        },
      }),
    });
    
    const didVideoData = await didVideoRes.json();
    if (!didVideoRes.ok) throw new Error(didVideoData.description || 'D-ID Video Error');

    // --- 3. WAIT FOR VIDEO TO FINISH ---
    const talkId = didVideoData.id;
    let videoUrl = '';
    
    // We check the status every 3 seconds
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
        throw new Error('Video generation failed during processing.');
      }
    }

    return NextResponse.json({ url: videoUrl });

  } catch (error: any) {
    // This will send the specific error back to the app screen
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
              }

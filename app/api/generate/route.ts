import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const scriptText = formData.get('script') as string;

    if (!image || !scriptText) {
      return NextResponse.json({ error: 'Missing image or script' }, { status: 400 });
    }

    // Safely format the API key for D-ID
    const apiKey = process.env.DID_API_KEY || '';
    const authHeader = `Basic ${Buffer.from(apiKey).toString('base64')}`;

    // --- 1. UPLOAD IMAGE TO D-ID ---
    const imageFormData = new FormData();
    imageFormData.append('image', image);

    const didImageRes = await fetch('https://api.d-id.com/images', {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: imageFormData,
    });
    
    const didImageData = await didImageRes.json();

    if (!didImageRes.ok) {
      return NextResponse.json({ error: JSON.stringify(didImageData) }, { status: 400 });
    }

    // --- 2. TELL D-ID TO MAKE THE VIDEO ---
    const didVideoRes = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
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
    
    if (!didVideoRes.ok) {
      return NextResponse.json({ error: JSON.stringify(didVideoData) }, { status: 400 });
    }

    // --- 3. WAIT FOR VIDEO TO FINISH ---
    const talkId = didVideoData.id;
    let videoUrl = '';
    
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 3000)); 
      
      const statusRes = await fetch(`https://api.d-id.com/talks/${talkId}`, {
        headers: { Authorization: authHeader },
      });
      const statusData = await statusRes.json();
      
      if (statusData.status === 'done') {
        videoUrl = statusData.result_url;
        break;
      } else if (statusData.status === 'error') {
        return NextResponse.json({ error: JSON.stringify(statusData) }, { status: 400 });
      }
    }

    return NextResponse.json({ url: videoUrl });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error occurred' }, { status: 500 });
  }
                                    }

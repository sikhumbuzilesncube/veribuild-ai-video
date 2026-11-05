import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const scriptText = formData.get('script') as string;

    if (!image || !scriptText) {
      return NextResponse.json({ error: 'Missing image or script' }, { status: 400 });
    }

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

    // --- 2. START THE VIDEO GENERATION ---
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
          provider: { type: 'microsoft', voice_id: 'en-US-JennyNeural' }
        },
      }),
    });
    
    const didVideoData = await didVideoRes.json();
    
    if (!didVideoRes.ok) {
      return NextResponse.json({ error: JSON.stringify(didVideoData) }, { status: 400 });
    }

    // Immediately return the ID and the API key so the frontend can check the status
    return NextResponse.json({ 
      talkId: didVideoData.id, 
      apiKey: apiKey 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
        }

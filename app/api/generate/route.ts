import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const scriptText = formData.get('script') as string;

    if (!image || !scriptText) {
      return NextResponse.json({ error: 'Missing image or script' }, { status: 400 });
    }

    const rawKey = (process.env.DID_API_KEY || '').trim().replace(/^Basic\s+/i, '');
    const authHeader = `Basic ${Buffer.from(rawKey).toString('base64')}`;

    const imageFormData = new FormData();
    imageFormData.append('image', image);

    const didImageRes = await fetch('https://api.d-id.com/images', {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: imageFormData,
    });
    
    const didImageData = await didImageRes.json();
    if (!didImageRes.ok) return NextResponse.json({ error: JSON.stringify(didImageData) }, { status: 400 });

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
    if (!didVideoRes.ok) return NextResponse.json({ error: JSON.stringify(didVideoData) }, { status: 400 });

    // Just return the ID. The frontend will use /api/status to check it.
    return NextResponse.json({ talkId: didVideoData.id });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

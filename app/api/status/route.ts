import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const talkId = searchParams.get('talkId');
  
  if (!talkId) return NextResponse.json({ error: 'No ID provided' }, { status: 400 });

  const rawKey = (process.env.DID_API_KEY || '').trim().replace(/^Basic\s+/i, '');
  const authHeader = `Basic ${Buffer.from(rawKey).toString('base64')}`;

  const statusRes = await fetch(`https://api.d-id.com/talks/${talkId}`, {
    headers: { Authorization: authHeader },
  });
  
  const statusData = await statusRes.json();
  return NextResponse.json(statusData);
                              }

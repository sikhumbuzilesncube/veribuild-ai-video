'use client';
import { useState } from 'react';

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const handleGenerate = async () => {
    if (!image || !script) return alert('Please provide an image and a script.');
    
    setLoading(true);
    setVideoUrl('');
    setStatusText('Uploading image and starting job...');

    const formData = new FormData();
    formData.append('image', image);
    formData.append('script', script);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert('Error: ' + (data.error || 'Failed to start generation'));
        setLoading(false);
        setStatusText('');
        return;
      }

      const { talkId } = data;
      setStatusText('Waiting for D-ID to process... (This takes ~30-90s)');

      let attempts = 0;
      const maxAttempts = 50; // 50 attempts * 3 seconds = 150 seconds max

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 3000)); 
        attempts++;

        try {
          const statusRes = await fetch(`/api/status?talkId=${talkId}`);
          const statusData = await statusRes.json();

          if (statusData.status === 'done') {
            setVideoUrl(statusData.result_url);
            setStatusText('Video Ready!');
            setLoading(false);
            return;
          } else if (statusData.status === 'error') {
            alert('D-ID Error: ' + JSON.stringify(statusData.error || 'Unknown error during processing'));
            setLoading(false);
            setStatusText('');
            return;
          }
        } catch (pollError) {
          console.log('Polling error, retrying...', pollError);
        }
      }

      alert('Timeout: D-ID took too long to make the video. Please try again.');
      setLoading(false);
      setStatusText('');

    } catch (err) {
      alert('Something went wrong with the connection.');
      setLoading(false);
      setStatusText('');
    }
  };

  return (
    <main style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px' }}>VeriBuild AI Video</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label><strong>1. Upload Image:</strong></label><br/>
        <input type="file" accept="image/jpeg, image/png" onChange={(e) => setImage(e.target.files?.[0] || null)} style={{ marginTop: '5px' }} disabled={loading} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label><strong>2. Enter Script:</strong></label><br/>
        <textarea 
          rows={4} 
          style={{ width: '100%', padding: '10px', marginTop: '5px' }} 
          value={script} 
          onChange={(e) => setScript(e.target.value)} 
          placeholder="Type your script here..." 
          disabled={loading}
        />
      </div>

      <button 
        onClick={handleGenerate} 
        disabled={loading}
        style={{ padding: '15px 20px', background: loading ? '#999' : '#f97316', color: 'white', border: 'none', borderRadius: '5px', cursor: loading ? 'not-allowed' : 'pointer', width: '100%', fontSize: '16px', fontWeight: 'bold' }}
      >
        {loading ? 'Processing...' : 'Generate Video'}
      </button>

      {statusText && (
        <p style={{ textAlign: 'center', marginTop: '15px', color: '#555', fontStyle: 'italic' }}>
          {statusText}
        </p>
      )}

      {videoUrl && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ fontSize: '18px' }}>Your Video:</h2>
          <video src={videoUrl} controls style={{ width: '100%', borderRadius: '10px' }} />
          <a href={videoUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: '15px', color: 'blue', textAlign: 'center', fontWeight: 'bold' }}>
            Download Video
          </a>
        </div>
      )}
    </main>
  );
    }

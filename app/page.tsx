'use client';
import { useState } from 'react';

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const handleGenerate = async () => {
    if (!image || !script) return alert('Please provide an image and a script.');
    setLoading(true);
    setVideoUrl('');

    const formData = new FormData();
    formData.append('image', image);
    formData.append('script', script);

    try {
      // 1. Start the job
      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.error) {
        alert('Error: ' + data.error);
        setLoading(false);
        return;
      }

      const { talkId } = data;
      await new Promise(r => setTimeout(r, 5000)); // Wait 5s before first check

      // 2. Check our OWN API for the status
      while (true) {
        const statusRes = await fetch(`/api/status?talkId=${talkId}`);
        const statusData = await statusRes.json();

        if (statusData.status === 'done') {
          setVideoUrl(statusData.result_url);
          break;
        } else if (statusData.status === 'error') {
          alert('Video generation failed during processing.');
          break;
        }
        
        // Wait 3 seconds before asking again
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (err) {
      alert('Something went wrong. The connection dropped.');
    }
    setLoading(false);
  };

  return (
    <main style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px' }}>VeriBuild AI Video</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label><strong>1. Upload Image:</strong></label><br/>
        <input type="file" accept="image/jpeg, image/png" onChange={(e) => setImage(e.target.files?.[0] || null)} style={{ marginTop: '5px' }} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label><strong>2. Enter Script:</strong></label><br/>
        <textarea 
          rows={4} 
          style={{ width: '100%', padding: '10px', marginTop: '5px' }} 
          value={script} 
          onChange={(e) => setScript(e.target.value)} 
          placeholder="Type your script here..." 
        />
      </div>

      <button 
        onClick={handleGenerate} 
        disabled={loading}
        style={{ padding: '15px 20px', background: '#f97316', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%', fontSize: '16px', fontWeight: 'bold' }}
      >
        {loading ? 'Generating... (Checking Status)' : 'Generate Video'}
      </button>

      {videoUrl && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ fontSize: '18px' }}>Your Video:</h2>
          <video src={videoUrl} controls style={{ width: '100%', borderRadius: '10px' }} />
          <a href={videoUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: '15px', color: 'blue', textAlign: 'center' }}>
            Download Video
          </a>
        </div>
      )}
    </main>
  );
        }

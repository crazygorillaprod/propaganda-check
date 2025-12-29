'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    // Verify the token
    fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
          setMessage(`Email verified: ${data.email}`);
          
          // Store email in localStorage
          localStorage.setItem('user_email', data.email);
          localStorage.setItem('email_verified', 'true');
          
          // Redirect to home after 3 seconds
          setTimeout(() => {
            router.push('/');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
        }
      })
      .catch(err => {
        setStatus('error');
        setMessage('Verification failed: ' + err.message);
      });
  }, [searchParams, router]);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: '#f9fafb'
    }}>
      <div style={{ 
        background: 'white', 
        padding: 48, 
        borderRadius: 16, 
        maxWidth: 480,
        textAlign: 'center',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
      }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 24 }}>⏳</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Verifying...</h1>
            <p style={{ color: '#6b7280' }}>Please wait while we verify your email</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: '#10b981' }}>Email Verified!</h1>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>{message}</p>
            <p style={{ fontSize: 14, color: '#9ca3af' }}>Redirecting you to the homepage...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 24 }}>❌</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: '#ef4444' }}>Verification Failed</h1>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>{message}</p>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '12px 24px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 600
              }}
            >
              Go to Homepage
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: '#f9fafb'
      }}>
        <div style={{ fontSize: 64 }}>⏳</div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

export default function WalletError() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1.5rem',
        padding: '2rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        maxWidth: '28rem',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            backgroundColor: '#fef2f2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ color: '#dc2626', fontSize: '1.125rem' }}>⚠</span>
          </div>
          <div>
            <h1 style={{ 
              color: '#7f1d1d', 
              fontWeight: '600', 
              fontSize: '1.125rem',
              margin: 0 
            }}>
              Apple Wallet Configuration
            </h1>
          </div>
        </div>
        <p style={{ 
          color: '#b91c1c', 
          margin: '1rem 0',
          lineHeight: '1.5'
        }}>
          Apple Wallet integration is not yet configured on this server. The digital membership card feature will be available once the administrator sets up the required certificates.
        </p>
        <p style={{ 
          color: '#dc2626', 
          fontSize: '0.875rem',
          margin: '1rem 0 0 0' 
        }}>
          Please contact support for assistance or check back later.
        </p>
        <div style={{ marginTop: '1.5rem' }}>
          <a 
            href="/" 
            style={{
              display: 'inline-block',
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
}
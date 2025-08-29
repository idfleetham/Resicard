import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Download, QrCode, Smartphone, Shield, CheckCircle, ArrowLeft, Home } from "lucide-react";
import QRCodeLib from "qrcode";

export default function WalletAdd() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [passUrl, setPassUrl] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Safe auth loading that won't crash on mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      // Check for error parameters first
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      
      // If there's an error, skip auth loading to show error page immediately
      if (error) {
        setAuthLoading(false);
        return;
      }
      
      // Only try to load auth if there's no error
      const token = localStorage.getItem('auth_token');
      if (token) {
        fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.ok ? res.json() : null)
        .then(userData => {
          setUser(userData);
          setAuthLoading(false);
        })
        .catch(() => {
          setAuthLoading(false);
        });
      } else {
        setAuthLoading(false);
      }
    } catch (err) {
      console.error('Auth loading error:', err);
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const baseUrl = window.location.origin;
    const passDownloadUrl = `${baseUrl}/api/wallet/pass`;
    setPassUrl(passDownloadUrl);
    
    // Check for error parameters in URL
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      if (error === 'not_configured') {
        setErrorMessage('Apple Wallet integration is not yet configured. Please contact support.');
      } else if (error === 'generation_failed') {
        setErrorMessage('Failed to generate Apple Wallet pass. Please try again later.');
      }
    } catch (err) {
      console.error('Error parsing URL parameters:', err);
    }
    
    // Generate QR code even if user is not logged in (for error display)
    QRCodeLib.toDataURL(passDownloadUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#1f2937',
        light: '#FFFFFF'
      }
    }).then(setQrCodeUrl).catch(console.error);
  }, []);

  const handleAddToWallet = async () => {
    if (!user || typeof window === 'undefined') return;
    
    setIsGenerating(true);
    try {
      // Direct link to the pass download endpoint
      window.location.href = passUrl;
    } catch (error) {
      console.error('Failed to add to wallet:', error);
      setErrorMessage('Failed to redirect to Apple Wallet. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Check if user came from QR code with error
  const hasError = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('error') : null;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user && !hasError) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <a 
                href="/" 
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-medium">Back to Home</span>
              </a>
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                <span>Resicard</span>
                <span className="text-blue-600">•</span>
                <span className="text-gray-600 font-normal">Apple Wallet</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center p-6 min-h-[calc(100vh-80px)]">
          <Card className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-0 ring-1 ring-gray-100">
            <CardHeader className="p-8">
              <CardTitle className="text-gray-900">Sign In Required</CardTitle>
              <CardDescription className="text-gray-600">
                Please sign in to add your Resicard to Apple Wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <a 
                href="/login" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-medium text-center block transition-colors"
              >
                Sign In
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a 
              href="/" 
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Back to Home</span>
            </a>
            <div className="flex items-center gap-2 text-gray-800 font-semibold">
              <span>Resicard</span>
              <span className="text-blue-600">•</span>
              <span className="text-gray-600 font-normal">Apple Wallet</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-700 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Smartphone className="w-12 h-12" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">
              {errorMessage ? 'Apple Wallet Setup Issue' : 'Add Resicard to Apple Wallet'}
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              {errorMessage 
                ? 'We found an issue with the Apple Wallet integration configuration.'
                : 'Keep your community deals and loyalty points right in your pocket. No app download required.'
              }
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        {/* Error Message */}
        {errorMessage && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-lg">⚠</span>
              </div>
              <div>
                <h3 className="text-red-900 font-semibold">Apple Wallet Issue</h3>
                <p className="text-red-700">{errorMessage}</p>
                <p className="text-red-600 text-sm mt-2">
                  Contact support or try again later for assistance.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add to Wallet Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="h-full bg-white rounded-3xl shadow-2xl border-0 ring-1 ring-gray-100 hover:shadow-3xl hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="p-8 pb-0">
                <CardTitle className="flex items-center gap-3 text-gray-900 text-2xl font-bold">
                  <Download className="w-6 h-6 text-blue-600" />
                  Add to Apple Wallet
                </CardTitle>
                <CardDescription className="text-gray-600 text-base">
                  Tap the button below to add your Resicard pass to Apple Wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-8 pt-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                  <div className="text-center space-y-4">
                    {/* Pass Preview */}
                    <div className="bg-gray-900 text-white p-4 rounded-xl shadow-lg max-w-sm mx-auto">
                      {/* Header strip */}
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-t-lg mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium opacity-90">RESICARD</span>
                          <span className="text-xs opacity-75">St Andrews</span>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Member</span>
                          <span className="text-sm font-medium">{user?.username || 'Your Name'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Tier</span>
                          <span className="text-sm">Standard</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Current Offer</span>
                          <span className="text-sm">20% Off First Order</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      Preview of your Resicard pass
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleAddToWallet}
                  disabled={isGenerating || !user || !!errorMessage}
                  className="w-full bg-black hover:bg-gray-800 text-white border-2 border-black rounded-lg py-4 text-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #000 0%, #333 100%)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      Generating Pass...
                    </div>
                  ) : (
                    <>
                      <img 
                        src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K"
                        alt="Apple Wallet"
                        className="w-6 h-6 mr-2"
                      />
                      Add to Apple Wallet
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Instant access to deals and rewards</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Automatic updates when you earn points</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Works offline - no internet required</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* QR Code Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="h-full bg-white rounded-3xl shadow-2xl border-0 ring-1 ring-gray-100 hover:shadow-3xl hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="p-8 pb-0">
                <CardTitle className="flex items-center gap-3 text-gray-900 text-2xl font-bold">
                  <QrCode className="w-6 h-6 text-blue-600" />
                  Scan QR Code
                </CardTitle>
                <CardDescription className="text-gray-600 text-base">
                  Or scan this QR code with your iPhone camera
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-8 pt-6">
                <div className="flex justify-center">
                  <div className="bg-white p-6 rounded-2xl shadow-lg">
                    {qrCodeUrl ? (
                      <img 
                        src={qrCodeUrl} 
                        alt="QR Code to add Resicard to Apple Wallet" 
                        className="w-48 h-48"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-sm font-medium text-gray-900">How to scan:</p>
                  <ol className="text-sm text-gray-700 space-y-1">
                    <li>1. Open Camera app on your iPhone</li>
                    <li>2. Point camera at the QR code</li>
                    <li>3. Tap the notification that appears</li>
                    <li>4. Follow prompts to add to Wallet</li>
                  </ol>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">Secure & Private</p>
                      <p className="text-blue-700">
                        Your pass is cryptographically signed and contains no sensitive data.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Additional Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12"
        >
          <Card className="bg-white rounded-3xl shadow-2xl border-0 ring-1 ring-gray-100">
            <CardHeader className="p-8 pb-0">
              <CardTitle className="text-gray-900 text-2xl font-bold">About Apple Wallet Passes</CardTitle>
              <CardDescription className="text-gray-600 text-base">
                Everything you need to know about your digital Resicard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-8 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2 text-gray-900">What's included:</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Your member name and tier status</li>
                    <li>• Current loyalty points balance</li>
                    <li>• Valid location information</li>
                    <li>• Contact and support details</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2 text-gray-900">Automatic updates:</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Points balance updates automatically</li>
                    <li>• Tier changes reflect immediately</li>
                    <li>• Special offers and notifications</li>
                    <li>• No manual refresh needed</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
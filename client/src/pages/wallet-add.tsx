import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Download, QrCode, Smartphone, Shield, CheckCircle } from "lucide-react";
import QRCodeLib from "qrcode";

export default function WalletAdd() {
  const { user } = useAuth();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [passUrl, setPassUrl] = useState<string>("");

  useEffect(() => {
    if (user) {
      const baseUrl = window.location.origin;
      const passDownloadUrl = `${baseUrl}/wallet/resicard.pkpass`;
      setPassUrl(passDownloadUrl);
      
      // Generate QR code
      QRCodeLib.toDataURL(passDownloadUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#0C0E1A',
          light: '#FFFFFF'
        }
      }).then(setQrCodeUrl).catch(console.error);
    }
  }, [user]);

  const handleAddToWallet = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    try {
      // Direct link to the pass download endpoint
      window.location.href = passUrl;
    } catch (error) {
      console.error('Failed to add to wallet:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to add your Resicard to Apple Wallet
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white">
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
            <h1 className="text-4xl font-bold mb-4">Add Resicard to Apple Wallet</h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Keep your community deals and loyalty points right in your pocket. 
              No app download required.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add to Wallet Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Download className="w-6 h-6 text-indigo-500" />
                  Add to Apple Wallet
                </CardTitle>
                <CardDescription>
                  Tap the button below to add your Resicard pass to Apple Wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 p-6 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div className="text-center space-y-4">
                    {/* Pass Preview */}
                    <div className="bg-gray-900 text-white p-4 rounded-xl shadow-lg max-w-sm mx-auto">
                      {/* Header strip */}
                      <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-3 rounded-t-lg mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium opacity-90">RESICARD</span>
                          <span className="text-xs opacity-75">St Andrews</span>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Member</span>
                          <span className="text-sm font-medium">{user.username || `User ${user.id}`}</span>
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
                    
                    <p className="text-sm text-muted-foreground">
                      Preview of your Resicard pass
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleAddToWallet}
                  disabled={isGenerating}
                  className="w-full bg-black hover:bg-gray-800 text-white border-2 border-black rounded-lg py-4 text-lg font-medium transition-all"
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

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Instant access to deals and rewards</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Automatic updates when you earn points</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <QrCode className="w-6 h-6 text-purple-500" />
                  Scan QR Code
                </CardTitle>
                <CardDescription>
                  Or scan this QR code with your iPhone camera
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                  <p className="text-sm font-medium">How to scan:</p>
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Open Camera app on your iPhone</li>
                    <li>2. Point camera at the QR code</li>
                    <li>3. Tap the notification that appears</li>
                    <li>4. Follow prompts to add to Wallet</li>
                  </ol>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 dark:text-blue-100">Secure & Private</p>
                      <p className="text-blue-700 dark:text-blue-200">
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
          <Card>
            <CardHeader>
              <CardTitle>About Apple Wallet Passes</CardTitle>
              <CardDescription>
                Everything you need to know about your digital Resicard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">What's included:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Your member name and tier status</li>
                    <li>• Current loyalty points balance</li>
                    <li>• Valid location information</li>
                    <li>• Contact and support details</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Automatic updates:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
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
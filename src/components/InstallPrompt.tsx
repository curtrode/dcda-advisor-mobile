import { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { X, Download, Share } from 'lucide-react';

export function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('pwa-install-dismissed') === 'true';
  });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      handleDismiss();
    }
  };

  // Don't show if already installed, dismissed, or no install available (and not iOS)
  if (isInstalled || dismissed || (!canInstall && !isIOS)) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 animate-in slide-in-from-bottom-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
          <img 
            src="/android-chrome-192x192.png" 
            alt="App icon" 
            className="w-8 h-8 rounded"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm">Install DCDA Advisor</h3>
          
          {isIOS ? (
            <p className="text-xs text-gray-600 mt-1">
              Tap <Share className="inline h-3 w-3 mx-0.5" /> then "Add to Home Screen" for the best experience
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-600 mt-1">
                Install for quick access and offline use
              </p>
              <Button
                onClick={handleInstall}
                size="sm"
                className="mt-2 h-8 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Install App
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

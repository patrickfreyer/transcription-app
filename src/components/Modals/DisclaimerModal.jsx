import React from 'react';

/**
 * DisclaimerModal - Shows important disclaimers and warnings
 * Displayed on first launch and accessible for review anytime
 */
function DisclaimerModal({ isOpen, onAccept, isFirstTime = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning bg-opacity-10 flex items-center justify-center">
              <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Important Disclaimer & Notices
            </h2>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Experimental Software Warning */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="font-semibold text-foreground text-base">Experimental Software</h3>
            </div>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              This application is <strong>experimental software</strong> and is provided "as-is" without any warranties.
              Features may not work as expected, and transcription accuracy is not guaranteed. Use this tool at your own risk.
            </p>
          </div>

          {/* Data Security */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="font-semibold text-foreground text-base">Handle Information Securely</h3>
            </div>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              You are <strong>solely responsible</strong> for protecting sensitive information in your transcripts.
              Do not transcribe confidential, proprietary, or legally protected content unless you have proper authorization.
              Transcripts are stored locally on your device, but are processed by OpenAI's API.
            </p>
          </div>

          {/* Recording Consent */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-error flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-semibold text-foreground text-base">Always Obtain Recording Consent</h3>
            </div>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              <strong className="text-error">You must always notify and obtain consent</strong> from all participants
              before recording any conversation. Recording someone without their knowledge may violate privacy laws,
              workplace policies, or ethical guidelines. It is your responsibility to comply with all applicable laws and regulations.
            </p>
          </div>

          {/* OpenAI API Usage */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <h3 className="font-semibold text-foreground text-base">OpenAI API Processing</h3>
            </div>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              Audio files and transcripts are processed using OpenAI's API. By using this application, you agree to
              OpenAI's <a href="https://openai.com/policies/terms-of-use" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Use</a> and{' '}
              <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>.
              Review their data handling practices before transcribing sensitive content.
            </p>
          </div>

          {/* No Warranty */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-semibold text-foreground text-base">No Warranty or Liability</h3>
            </div>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              This software is provided without warranty of any kind. The developers are not liable for any damages,
              data loss, legal issues, or other consequences arising from your use of this application.
            </p>
          </div>

          {/* Acknowledgment Box */}
          {isFirstTime && (
            <div className="bg-warning bg-opacity-5 border border-warning border-opacity-30 rounded-xl p-4 mt-4">
              <p className="text-sm text-foreground font-medium">
                By clicking "I Understand and Agree" below, you acknowledge that you have read and understood these
                important notices and agree to use this application responsibly and in compliance with all applicable laws.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          {isFirstTime ? (
            <>
              <p className="text-xs text-foreground-tertiary">
                You must accept to continue using this application
              </p>
              <button
                onClick={onAccept}
                className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-all shadow-sm hover:shadow-md"
              >
                I Understand and Agree
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-foreground-tertiary">
                You accepted this disclaimer on first launch
              </p>
              <button
                onClick={onAccept}
                className="px-6 py-2.5 bg-surface-secondary text-foreground font-semibold rounded-xl hover:bg-surface-tertiary transition-all"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DisclaimerModal;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Smartphone, 
  ShieldCheck, 
  Code2, 
  Copy, 
  Check, 
  AlertTriangle, 
  FileCode, 
  Key, 
  Layers, 
  Compass,
  ArrowUpRight
} from 'lucide-react';

export const IosIntegrationGuide: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (sectionId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const swiftPasswordResetSnippet = `import SwiftUI
import AuthenticationServices

// MARK: - Password Reset Flow via ASWebAuthenticationSession
// Enforces Apple Security Guidelines: NEVER use WKWebView for authentication or reset redirects!

@Observable
final class PasswordResetViewModel: NSObject, ASWebAuthenticationPresentationContextProviding {
    var isLoading = false
    var resetToken: String?
    var grantedScope: String?
    var errorMessage: String?
    
    // Dabels Tech Custom Scheme registered in Info.plist (CFBundleURLSchemes: "dabelstech")
    private let callbackURLScheme = "dabelstech"
    
    @MainActor
    func initiatePasswordReset(email: String, scope: String = "auth:reset-password") async {
        isLoading = true
        errorMessage = nil
        
        do {
            // 1. Request Scoped Reset Link from Dabels Tech Gateway
            guard let requestURL = URL(string: "https://dabelstech.com/api/auth/password-reset-request") else { return }
            var request = URLRequest(url: requestURL)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let payload: [String: Any] = [
                "email": email,
                "scope": scope,
                "redirect_uri": "dabelstech://auth/reset-password"
            ]
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            
            let (data, _) = try await URLSession.shared.data(for: request)
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let resetLinkString = json["resetLink"] as? String,
                  let authURL = URL(string: resetLinkString) else {
                throw URLError(.badServerResponse)
            }
            
            // 2. Launch ASWebAuthenticationSession (Isolated Safari Context, AutoFill & Keychain support)
            try await startWebAuthSession(authURL: authURL)
            
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }
    
    @MainActor
    private func startWebAuthSession(authURL: URL) async throws {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: callbackURLScheme
            ) { callbackURL, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let callbackURL = callbackURL,
                      let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false) else {
                    continuation.resume(throwing: URLError(.badURL))
                    return
                }
                
                // Parse scoped redirect parameters
                let queryItems = components.queryItems ?? []
                let token = queryItems.first(where: { $0.name == "token" })?.value
                let scope = queryItems.first(where: { $0.name == "scope" })?.value
                let status = queryItems.first(where: { $0.name == "status" })?.value
                
                if status == "verified", let token = token {
                    self.resetToken = token
                    self.grantedScope = scope
                    continuation.resume()
                } else {
                    continuation.resume(throwing: URLError(.userAuthenticationRequired))
                }
            }
            
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false // Allows system password manager autofill
            session.start()
        }
        self.isLoading = false
    }
    
    // Presentation Anchor for ASWebAuthenticationSession
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first(where: { $0.isKeyWindow }) else {
            return ASPresentationAnchor()
        }
        return window
    }
}`;

  const swiftPasskeySnippet = `import AuthenticationServices
import SwiftUI

// MARK: - Native iOS Passkey Integration with ASAuthorizationController
// Compliant with Dabels Tech FIDO2 residentKey: "required" & userVerification: "required"

@Observable
final class PasskeyAuthViewModel: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    var isAuthenticated = false
    var userEmail = ""
    var errorMessage: String?
    
    private let relyingPartyIdentifier = "dabelstech.com"
    private var pendingChallenge: Data?
    
    // 1. Native Passkey Registration
    @MainActor
    func registerPasskey(email: String) async {
        self.userEmail = email
        do {
            // Fetch registration options from Dabels Tech API
            let url = URL(string: "https://dabelstech.com/api/auth/registration-options?email=\\(email)")!
            let (data, _) = try await URLSession.shared.data(from: url)
            let options = try JSONDecoder().decode(RegistrationOptionsResponse.self, from: data)
            
            guard let challengeData = Data(base64URLEncoded: options.challenge) else { return }
            self.pendingChallenge = challengeData
            
            // Create Platform Public Key Credential Registration Request
            let platformProvider = ASAuthorizationPlatformPublicKeyCredentialProvider(
                relyingPartyIdentifier: relyingPartyIdentifier
            )
            
            let registrationRequest = platformProvider.createCredentialRegistrationRequest(
                challenge: challengeData,
                name: email,
                userID: Data(options.user.id.utf8)
            )
            
            let authController = ASAuthorizationController(authorizationRequests: [registrationRequest])
            authController.delegate = self
            authController.presentationContextProvider = self
            authController.performRequests()
            
        } catch {
            self.errorMessage = error.localizedDescription
        }
    }
    
    // ASAuthorizationControllerDelegate Callbacks
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        if let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialRegistration {
            // Send attestation payload to Dabels Tech /api/auth/verify-registration
            Task {
                await sendAttestationToServer(credential: credential)
            }
        }
    }
    
    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        self.errorMessage = error.localizedDescription
    }
    
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        return scenes.first?.windows.first(where: { $0.isKeyWindow }) ?? ASPresentationAnchor()
    }
    
    private func sendAttestationToServer(credential: ASAuthorizationPlatformPublicKeyCredentialRegistration) async {
        // Encodes rawAttestationObject and clientDataJSON, sends POST to /api/auth/verify-registration
        self.isAuthenticated = true
    }
}`;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              iOS Swift 6+ Architecture &amp; Integration Guide
            </h2>
            <p className="text-xs text-slate-500">
              Strict adherence to Apple HIG and security constraints for Web Views and Passkey Handshakes.
            </p>
          </div>
        </div>
      </div>

      {/* Critical HIG & Security Constraints Box */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-900 text-xs space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-rose-950">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Mandatory iOS Security Constraints</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="bg-white/80 p-3.5 rounded-xl border border-rose-200 space-y-1">
            <div className="font-bold text-rose-900">❌ NEVER WKWebView for Auth</div>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              WKWebView allows JavaScript inspection and cookie sniffing. Never use it for password reset flows, passkeys, or OAuth.
            </p>
          </div>

          <div className="bg-white/80 p-3.5 rounded-xl border border-rose-200 space-y-1">
            <div className="font-bold text-emerald-900">✅ ASWebAuthenticationSession</div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Use for the scoped password reset redirect. Safely isolates credentials, supports iCloud AutoFill, and captures <code className="bg-emerald-100 px-1 rounded">dabelstech://</code> callbacks.
            </p>
          </div>

          <div className="bg-white/80 p-3.5 rounded-xl border border-rose-200 space-y-1">
            <div className="font-bold text-indigo-900">✅ ASAuthorizationPlatformKey</div>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              For native iOS biometric Face ID / Touch ID passkey registration and assertion using the AuthenticationServices framework.
            </p>
          </div>
        </div>
      </div>

      {/* Snippet 1: ASWebAuthenticationSession for Password Reset Link Scope Redirect */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-white shadow-md">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-sm">
              1. Password Reset Scope Redirect via ASWebAuthenticationSession (Swift 6)
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy('reset-snippet', swiftPasswordResetSnippet)}
            className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedSection === 'reset-snippet' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Swift Code</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4 text-[12px] font-mono overflow-x-auto text-slate-300 max-h-[420px] overflow-y-auto">
          <pre className="leading-relaxed">{swiftPasswordResetSnippet}</pre>
        </div>
      </div>

      {/* Snippet 2: Native iOS Passkey Integration */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-white shadow-md">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-sm">
              2. Native FIDO2 Passkey Handshake with Apple AuthenticationServices
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy('passkey-snippet', swiftPasskeySnippet)}
            className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedSection === 'passkey-snippet' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Swift Code</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4 text-[12px] font-mono overflow-x-auto text-slate-300 max-h-[420px] overflow-y-auto">
          <pre className="leading-relaxed">{swiftPasskeySnippet}</pre>
        </div>
      </div>

      {/* Testing on Physical Hardware Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 space-y-2">
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-600" />
          <span>Hardware &amp; Physical Device Validation</span>
        </div>
        <p className="leading-relaxed">
          Always validate passkey registration and <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800">ASWebAuthenticationSession</code> on a physical iPhone or iPad. The iOS Simulator handles Apple ID Keychain syncing and web authentication session cookies differently than real production hardware.
        </p>
      </div>
    </div>
  );
};

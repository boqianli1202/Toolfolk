"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Mail, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const error = searchParams.get("error");

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState("");

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setResendError("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setResent(true);
      } else {
        const data = await res.json();
        setResendError(data.error || "Failed to resend");
      }
    } catch {
      setResendError("Something went wrong");
    }

    setResending(false);
  };

  // Error states
  if (error) {
    const errorMessages: Record<string, string> = {
      missing: "Verification link is incomplete.",
      invalid: "This verification link is invalid or has already been used.",
      expired: "This verification link has expired.",
      failed: "Something went wrong. Please try again.",
    };

    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md text-center">
          <XCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Verification failed
          </h1>
          <p className="text-gray-500 mb-6">
            {errorMessages[error] || errorMessages.failed}
          </p>
          <Link
            href="/signup"
            className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
          >
            Try signing up again
          </Link>
        </div>
      </div>
    );
  }

  // Success: waiting for verification
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md text-center">
        <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Mail className="h-8 w-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Check your email
        </h1>
        <p className="text-gray-500 mb-2">
          We sent a verification link to
        </p>
        {email && (
          <p className="font-medium text-gray-900 mb-6">{email}</p>
        )}
        <p className="text-sm text-gray-400 mb-8">
          Click the link in the email to verify your account. The link expires in 24 hours.
        </p>

        {resent ? (
          <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            Email resent!
          </div>
        ) : (
          <div>
            {resendError && (
              <p className="text-sm text-red-600 mb-3">{resendError}</p>
            )}
            {email && (
              <button
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
                {resending ? "Sending..." : "Resend verification email"}
              </button>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Already verified?{" "}
            <Link href="/login" className="text-indigo-600 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center text-gray-500">
          Loading...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

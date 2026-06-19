import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { GlassCard } from "../components/GlassCard";
import { isSupabaseConfigured, sendEmailOtp, verifyEmailOtp } from "../services/supabase";
import { colors } from "../theme/tokens";
import { ScreenShell } from "./ScreenShell";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function requestOtp() {
    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    setErrorMsg("");
    setStatusMsg("");
    setSending(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const result = await sendEmailOtp(trimmedEmail);
      if (result.error) {
        setErrorMsg(result.error.message || "Failed to send OTP. Check console for details.");
      } else {
        setOtpSent(true);
        setStatusMsg("OTP sent! Check your email inbox. Also check Spam/Junk folder. Code arrives in 10-30 seconds.");
      }
    } catch (err) {
      setErrorMsg("Unexpected error: " + String(err));
    } finally {
      setSending(false);
    }
  }

  async function confirmOtp() {
    if (!otp.trim()) {
      setErrorMsg("Please enter the 6-digit code from your email.");
      return;
    }
    setErrorMsg("");
    setStatusMsg("");
    setVerifying(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const result = await verifyEmailOtp(trimmedEmail, otp.trim());
      if (result.error) {
        setErrorMsg(result.error.message || "Verification failed.");
      } else {
        setStatusMsg("Login successful! Redirecting...");
      }
    } catch (err) {
      setErrorMsg("Unexpected error: " + String(err));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <ScreenShell title="EcoGuardian AI" subtitle="Sign in to track your carbon footprint across devices.">
      <GlassCard style={styles.gapCard}>
        <TextInput
          style={styles.textInput}
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={(t) => { setEmail(t); setErrorMsg(""); }}
          placeholderTextColor="#8a8f8c"
        />

        <Pressable
          style={[styles.primaryButton, sending && styles.disabledButton]}
          onPress={requestOtp}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {otpSent ? "Resend OTP" : "Send email OTP"}
            </Text>
          )}
        </Pressable>

        {otpSent && (
          <>
            <TextInput
              style={styles.textInput}
              placeholder="Enter 6-digit code"
              keyboardType="number-pad"
              autoCapitalize="none"
              value={otp}
              onChangeText={(t) => { setOtp(t); setErrorMsg(""); }}
              placeholderTextColor="#8a8f8c"
              maxLength={6}
            />
            <Pressable
              style={[styles.secondaryButton, verifying && styles.disabledButton]}
              onPress={confirmOtp}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator color="#154212" />
              ) : (
                <Text style={styles.secondaryButtonText}>Verify OTP</Text>
              )}
            </Pressable>
          </>
        )}

        {statusMsg !== "" && (
          <View style={styles.infoBox}>
            <Ionicons name="checkmark-circle" size={16} color="#154212" />
            <Text style={styles.infoText}>{statusMsg}</Text>
          </View>
        )}

        {errorMsg !== "" && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#ba1a1a" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {statusMsg !== "" && statusMsg.includes("spam") && (
          <View style={styles.warningBox}>
            <Ionicons name="mail-open" size={16} color="#92400e" />
            <Text style={styles.warningText}>
              Check your Spam/Junk folder. Gmail often filters Supabase emails. If using Gmail, check the "Promotions" and "Updates" tabs too.
            </Text>
          </View>
        )}

        {!isSupabaseConfigured && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={16} color="#92400e" />
            <Text style={styles.warningText}>
              Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env to enable login.
            </Text>
          </View>
        )}
      </GlassCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  gapCard: { gap: 16 },
  textInput: {
    borderRadius: 16,
    backgroundColor: "rgba(230,233,231,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: "sans-serif",
    color: colors.onSurface,
    fontSize: 16
  },
  primaryButton: {
    borderRadius: 9999,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center"
  },
  primaryButtonText: { textAlign: "center", fontWeight: "600", color: colors.white, fontSize: 16 },
  secondaryButton: {
    borderRadius: 9999,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center"
  },
  secondaryButtonText: { textAlign: "center", fontWeight: "600", color: colors.primary, fontSize: 16 },
  disabledButton: { opacity: 0.5 },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(163,245,161,0.3)",
    borderRadius: 12,
    padding: 12
  },
  infoText: { flex: 1, fontSize: 13, color: colors.primary, lineHeight: 18 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(186,26,26,0.1)",
    borderRadius: 12,
    padding: 12
  },
  errorText: { flex: 1, fontSize: 13, color: colors.danger, lineHeight: 18 },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(184,110,0,0.1)",
    borderRadius: 12,
    padding: 12
  },
  warningText: { flex: 1, fontSize: 12, color: colors.warning, lineHeight: 16 }
});

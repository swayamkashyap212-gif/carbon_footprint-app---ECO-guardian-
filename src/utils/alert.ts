import { Alert, Platform } from "react-native";

type AlertButton = {
  text: string;
  style?: "cancel" | "destructive" | "default";
  onPress?: () => void | Promise<void>;
};

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== "web" || !buttons || buttons.length <= 1) {
    Alert.alert(title, message, buttons);
    return;
  }

  const cancelBtn = buttons.find(b => b.style === "cancel");
  const destructiveBtn = buttons.find(b => b.style === "destructive");
  const primaryBtn = buttons.find(b => b.style !== "cancel" && b.style !== "destructive") || destructiveBtn;

  const confirmed = window.confirm(`${title}\n\n${message || ""}`);
  if (confirmed && primaryBtn?.onPress) {
    primaryBtn.onPress();
  } else if (!confirmed && cancelBtn?.onPress) {
    cancelBtn.onPress();
  }
}

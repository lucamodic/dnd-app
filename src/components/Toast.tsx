import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { MotiView, AnimatePresence } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { colors, font, radius, shadow } from "@/theme";

export type ToastType = "error" | "info" | "success";

interface ToastEntry {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
};

let globalShow: ((message: string, type?: ToastType) => void) | null = null;
/** Puente para mostrar toasts desde fuera de React (ej. el `onError` global del QueryClient). */
export function showGlobalToast(message: string, type: ToastType = "error") {
  globalShow?.(message, type);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastEntry | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessage = useRef<string | null>(null);
  const lastShownAt = useRef(0);

  const show = useCallback((message: string, type: ToastType = "error") => {
    // Evita spamear el mismo mensaje si ya se mostró hace poco (ej. el polling del tracker caído).
    const now = Date.now();
    if (message === lastMessage.current && now - lastShownAt.current < 4000) return;
    lastMessage.current = message;
    lastShownAt.current = now;

    if (timer.current) clearTimeout(timer.current);
    setToast({ id: `${now}`, message, type });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  globalShow = show;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastHost toast={toast} />
    </ToastContext.Provider>
  );
}

function ToastHost({ toast }: { toast: ToastEntry | null }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + 8 }]}>
      <AnimatePresence>
        {toast && (
          <MotiView
            key={toast.id}
            from={{ opacity: 0, translateY: -16 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -16 }}
            transition={{ type: "timing", duration: 220 }}
            style={[
              styles.toast,
              toast.type === "error" && styles.toastError,
              toast.type === "success" && styles.toastSuccess,
              shadow.card,
            ]}
          >
            <Ionicons
              name={toast.type === "error" ? "alert-circle" : toast.type === "success" ? "checkmark-circle" : "information-circle"}
              size={16}
              color={colors.text}
            />
            <Text style={styles.toastText}>{toast.message}</Text>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 16, right: 16, alignItems: "center", zIndex: 999 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: "100%",
  },
  toastError: { borderColor: colors.danger, backgroundColor: colors.danger + "22" },
  toastSuccess: { borderColor: colors.success, backgroundColor: colors.success + "22" },
  toastText: { color: colors.text, fontFamily: font.bodyMedium, fontSize: 13, flexShrink: 1 },
});

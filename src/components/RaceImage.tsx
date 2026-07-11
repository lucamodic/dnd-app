import { useState, ReactNode } from "react";
import {
  Image,
  ImageStyle,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

/**
 * User-Agent descriptivo para las imágenes de Wikimedia. Su política bloquea con 403 el User-Agent
 * por defecto de Android (okhttp), así que hay que mandar uno propio y descriptivo.
 * https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy
 */
const IMAGE_HEADERS = {
  "User-Agent": "DragonesYPrincipiantes/1.0 (app de D&D para amigos)",
};

/**
 * Imagen de raza (u otra de Wikimedia). Manda el User-Agent correcto y, si falla la carga o no hay
 * URL, muestra el `fallback` (por ejemplo un gradiente con la inicial).
 */
export function RaceImage({
  uri,
  style,
  fallback,
}: {
  uri?: string;
  style: StyleProp<ImageStyle>;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);
  if (!uri || failed) return <>{fallback}</>;
  const source = uri.startsWith("data:") ? { uri } : { uri, headers: IMAGE_HEADERS };
  const imageStyle = frame && sourceSize ? topCoverStyle(frame, sourceSize) : StyleSheet.absoluteFillObject;

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setFrame({ width, height });
  };

  return (
    <View style={[style as StyleProp<ViewStyle>, styles.container]} onLayout={onLayout}>
      <Image
        source={source}
        style={imageStyle}
        onLoad={(event) => {
          const source = event.nativeEvent.source;
          if (source?.width && source?.height) setSourceSize({ width: source.width, height: source.height });
        }}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

function topCoverStyle(
  frame: { width: number; height: number },
  source: { width: number; height: number }
): ImageStyle {
  const scale = Math.max(frame.width / source.width, frame.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;

  return {
    position: "absolute",
    width,
    height,
    left: (frame.width - width) / 2,
    top: 0,
  };
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});

import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { ARMORS, ARMOR_CATEGORY_LABEL, ArmorCategory } from "@/data/armors";
import { WEAPONS, WEAPON_CATEGORY_LABEL, WeaponCategory } from "@/data/weapons";
import { colors, font, radius, shadow } from "@/theme";

/* ---------- Editor numérico genérico (HP máx, característica, iniciativa...) ---------- */
export function NumberEditorModal({
  visible,
  title,
  subtitle,
  value,
  min = 0,
  max = 99,
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  value: number;
  min?: number;
  max?: number;
  onClose: () => void;
  onSave: (v: number) => void;
}) {
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value, visible]);

  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 15 }}
          style={[styles.sheet, shadow.glow]}
        >
          <Text variant="title" center>{title}</Text>
          {!!subtitle && <Text variant="caption" center style={{ marginTop: 4 }}>{subtitle}</Text>}

          <View style={styles.stepperRow}>
            <BigStep icon="remove" onPress={() => setVal((v) => clamp(v - 1))} />
            <TextInput
              value={String(val)}
              onChangeText={(t) => setVal(clamp(parseInt(t.replace(/[^0-9]/g, ""), 10) || 0))}
              keyboardType="number-pad"
              style={styles.bigInput}
            />
            <BigStep icon="add" onPress={() => setVal((v) => clamp(v + 1))} />
          </View>

          <Button label="Guardar" icon="checkmark" onPress={() => { onSave(val); onClose(); }} />
        </MotiView>
      </Pressable>
    </Modal>
  );
}

function BigStep({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.bigStep}>
      <Ionicons name={icon} size={24} color={colors.text} />
    </Pressable>
  );
}

/* ---------- Modal de armadura / CA ---------- */
export function ArmorModal({
  visible,
  armor,
  shield,
  acBonus,
  onClose,
  onSave,
}: {
  visible: boolean;
  armor: string;
  shield: boolean;
  acBonus: number;
  onClose: () => void;
  onSave: (patch: { armor: string; shield: boolean; acBonus: number }) => void;
}) {
  const [sel, setSel] = useState(armor);
  const [sh, setSh] = useState(shield);
  const [bonus, setBonus] = useState(acBonus);

  useEffect(() => {
    if (visible) { setSel(armor); setSh(shield); setBonus(acBonus); }
  }, [visible, armor, shield, acBonus]);

  const categories: ArmorCategory[] = ["special", "light", "medium", "heavy"];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.bottomSheet}>
          <View style={styles.handle} />
          <Text variant="title" style={{ marginBottom: 4 }}>Armadura y CA</Text>
          <Text variant="caption" style={{ marginBottom: 10 }}>
            Elegí tu armadura, sumá escudo o un bonus (ej. hechizos). La CA se calcula sola.
          </Text>

          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {categories.map((cat) => (
              <View key={cat} style={{ marginBottom: 6 }}>
                <Text variant="label" style={{ marginTop: 8, marginBottom: 4 }}>
                  {ARMOR_CATEGORY_LABEL[cat].toUpperCase()}
                </Text>
                {ARMORS.filter((a) => a.category === cat).map((a) => {
                  const active = sel === a.index;
                  return (
                    <Pressable key={a.index} onPress={() => setSel(a.index)} style={[styles.armorRow, active && styles.armorRowActive]}>
                      <Ionicons
                        name={active ? "radio-button-on" : "radio-button-off"}
                        size={18}
                        color={active ? colors.accent : colors.muted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text variant="subtitle" style={{ fontSize: 14 }}>{a.name}</Text>
                        <Text variant="caption">{a.description}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <Pressable onPress={() => setSh((s) => !s)} style={styles.toggleRow}>
            <Ionicons name={sh ? "checkbox" : "square-outline"} size={22} color={sh ? colors.accent : colors.muted} />
            <Text variant="subtitle" style={{ flex: 1, fontSize: 14 }}>Escudo (+2 CA)</Text>
          </Pressable>

          <View style={styles.bonusRow}>
            <Text variant="subtitle" style={{ flex: 1, fontSize: 14 }}>Bonus extra (hechizos, objetos)</Text>
            <BonusStep icon="remove" onPress={() => setBonus((b) => b - 1)} />
            <Text style={styles.bonusVal}>{bonus >= 0 ? `+${bonus}` : bonus}</Text>
            <BonusStep icon="add" onPress={() => setBonus((b) => b + 1)} />
          </View>

          <Button label="Guardar" icon="checkmark" onPress={() => { onSave({ armor: sel, shield: sh, acBonus: bonus }); onClose(); }} style={{ marginTop: 14 }} />
        </View>
      </View>
    </Modal>
  );
}

function BonusStep({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.bonusStep}>
      <Ionicons name={icon} size={16} color={colors.text} />
    </Pressable>
  );
}

/* ---------- Modal de arma equipada ---------- */
export function WeaponModal({
  visible,
  weapon,
  onClose,
  onSave,
}: {
  visible: boolean;
  weapon: string;
  onClose: () => void;
  onSave: (weapon: string) => void;
}) {
  const [sel, setSel] = useState(weapon);
  useEffect(() => {
    if (visible) setSel(weapon);
  }, [visible, weapon]);

  const categories: WeaponCategory[] = ["simple-melee", "simple-ranged", "martial-melee", "martial-ranged"];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.bottomSheet}>
          <View style={styles.handle} />
          <Text variant="title" style={{ marginBottom: 4 }}>Arma</Text>
          <Text variant="caption" style={{ marginBottom: 10 }}>
            Elegí qué arma lleva tu personaje. El daño se calcula solo con el botón "Lanzar".
          </Text>

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            <Pressable onPress={() => setSel("unarmed")} style={[styles.armorRow, sel === "unarmed" && styles.armorRowActive]}>
              <Ionicons
                name={sel === "unarmed" ? "radio-button-on" : "radio-button-off"}
                size={18}
                color={sel === "unarmed" ? colors.accent : colors.muted}
              />
              <View style={{ flex: 1 }}>
                <Text variant="subtitle" style={{ fontSize: 14 }}>Golpe sin arma</Text>
                <Text variant="caption">Pegar con el puño o una patada, sin usar ningún arma.</Text>
              </View>
            </Pressable>

            {categories.map((cat) => (
              <View key={cat} style={{ marginBottom: 6 }}>
                <Text variant="label" style={{ marginTop: 8, marginBottom: 4 }}>
                  {WEAPON_CATEGORY_LABEL[cat].toUpperCase()}
                </Text>
                {WEAPONS.filter((w) => w.category === cat && w.index !== "unarmed" && !w.properties.includes("Natural") && !w.properties.includes("Racial")).map((w) => {
                  const active = sel === w.index;
                  return (
                    <Pressable key={w.index} onPress={() => setSel(w.index)} style={[styles.armorRow, active && styles.armorRowActive]}>
                      <Ionicons
                        name={active ? "radio-button-on" : "radio-button-off"}
                        size={18}
                        color={active ? colors.accent : colors.muted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text variant="subtitle" style={{ fontSize: 14 }}>{w.name}</Text>
                        <Text variant="caption">
                          {w.damageDice ? `${w.damageDice} ${w.damageType}` : w.description}
                          {w.properties.length ? ` · ${w.properties.join(", ")}` : ""}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <Button label="Guardar" icon="checkmark" onPress={() => { onSave(sel); onClose(); }} style={{ marginTop: 14 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 340, backgroundColor: colors.surfaceAlt, borderRadius: radius.xl, padding: 24, borderWidth: 1, borderColor: colors.border },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginVertical: 22 },
  bigStep: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  bigInput: { fontFamily: font.display, fontSize: 40, color: colors.text, minWidth: 80, textAlign: "center" },
  sheetBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  bottomSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 22, paddingBottom: 40, borderTopWidth: 1, borderColor: colors.border },
  handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: colors.muted, marginBottom: 16 },
  armorRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderRadius: radius.md },
  armorRowActive: { backgroundColor: colors.surfaceAlt },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderTopWidth: 1, borderColor: colors.border, marginTop: 6 },
  bonusRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  bonusStep: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  bonusVal: { fontFamily: font.display, fontSize: 18, color: colors.accent, minWidth: 42, textAlign: "center" },
});

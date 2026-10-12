import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { SkeletonCard } from "@/components/Skeleton";
import { BackgroundSpellOption, useBackgrounds, useSubclasses } from "@/api/hooks";
import { ARMORS, ARMOR_CATEGORY_LABEL, ArmorCategory } from "@/data/armors";
import { WEAPON_CATEGORY_LABEL, WeaponCategory, Weapon } from "@/data/weapons";
import { abilityMod, formatMod } from "@/lib/format";
import { rollDie } from "@/lib/dice";
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

/* ---------- Editor de texto genérico (nombre del personaje...) ---------- */
export function TextEditorModal({
  visible,
  title,
  subtitle,
  value,
  placeholder,
  maxLength = 40,
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  onClose: () => void;
  onSave: (v: string) => void;
}) {
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value, visible]);
  const trimmed = val.trim();

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
          <TextInput
            value={val}
            onChangeText={setVal}
            placeholder={placeholder}
            placeholderTextColor={colors.textFaint}
            maxLength={maxLength}
            autoFocus
            style={styles.textInput}
          />
          <Button
            label="Guardar"
            icon="checkmark"
            disabled={!trimmed}
            onPress={() => { if (trimmed) { onSave(trimmed); onClose(); } }}
          />
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

/* ---------- Modal de especialidad/subclase ---------- */
export function SubclassModal({
  visible,
  classIndex,
  subclassLevel,
  currentLevel,
  selected,
  onClose,
  onSave,
  loading,
}: {
  visible: boolean;
  classIndex?: string;
  subclassLevel: number;
  currentLevel: number;
  selected?: string;
  onClose: () => void;
  onSave: (subclassIndex: string) => void;
  loading?: boolean;
}) {
  const { data: subclasses, isLoading } = useSubclasses(classIndex);
  const [sel, setSel] = useState(selected || "");
  const disabled = currentLevel < subclassLevel;

  useEffect(() => {
    if (visible) setSel(selected || "");
  }, [visible, selected]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.bottomSheet}>
          <View style={styles.handle} />
          <Text variant="title" style={{ marginBottom: 4 }}>Especialidad</Text>
          <Text variant="caption" style={{ marginBottom: 10 }}>
            Elegí el camino de tu clase. Se habilita a nivel {subclassLevel}.
          </Text>

          <ScrollView style={{ maxHeight: 390 }} showsVerticalScrollIndicator={false}>
            {isLoading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            {(subclasses || []).map((subclass) => {
              const active = sel === subclass.index;
              return (
                <Pressable
                  key={subclass.index}
                  onPress={() => !disabled && setSel(subclass.index)}
                  disabled={disabled}
                  style={[styles.armorRow, active && styles.armorRowActive, disabled && { opacity: 0.55 }]}
                >
                  <Ionicons
                    name={active ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={active ? colors.accent : colors.muted}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text variant="subtitle" style={{ fontSize: 14, flex: 1 }}>{subclass.name}</Text>
                      <View style={styles.levelChip}>
                        <Text style={styles.levelChipText}>N{internalLevel(subclass.subclassLevel)}</Text>
                      </View>
                    </View>
                    <Text variant="caption">{subclass.description}</Text>
                  </View>
                </Pressable>
              );
            })}
            {!isLoading && !subclasses?.length && (
              <Text variant="body" style={{ paddingVertical: 12 }}>No hay especialidades cargadas para esta clase.</Text>
            )}
          </ScrollView>

          <Button
            label="Elegir especialidad"
            icon="checkmark"
            onPress={() => sel && onSave(sel)}
            disabled={!sel || disabled}
            loading={loading}
            style={{ marginTop: 14 }}
          />
        </View>
      </View>
    </Modal>
  );
}

const internalLevel = (level: number) => String(level || 3);

/* ---------- Modal de trasfondo ---------- */

const CATEGORY_LABEL: Record<string, string> = {
  common: "Comunes",
  setting: "De ambientación",
  al: "Adventurers League",
  ravnica: "Rávnica",
  strixhaven: "Strixhaven",
  "acq-inc": "Acquisitions Inc.",
  amonkhet: "Amonkhet",
  dragonlance: "Dragonlance",
  innistrad: "Innistrad",
  planescape: "Planescape",
  spelljammer: "Spelljammer",
  wildemount: "Wildemount",
  homebrew: "Homebrew",
};

/** Orden de las secciones: lo más usado primero. */
const CATEGORY_ORDER = [
  "common", "setting", "al", "ravnica", "strixhaven", "acq-inc",
  "amonkhet", "dragonlance", "innistrad", "planescape", "spelljammer", "wildemount", "homebrew",
];

export function BackgroundModal({
  visible,
  selected,
  onClose,
  onSave,
  loading,
}: {
  visible: boolean;
  selected?: string;
  onClose: () => void;
  onSave: (backgroundIndex: string) => void;
  loading?: boolean;
}) {
  const { data: backgrounds, isLoading } = useBackgrounds();
  const [sel, setSel] = useState(selected || "");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (visible) {
      setSel(selected || "");
      setSearch("");
    }
  }, [visible, selected]);

  // Con ~100 trasfondos el buscador no es opcional; agrupamos por categoría para poder hojear.
  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matching = (backgrounds || []).filter(
      (b) => !query || b.name.toLowerCase().includes(query) || b.nameEn.toLowerCase().includes(query)
    );
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: matching.filter((b) => b.category === category),
    })).filter((group) => group.items.length > 0);
  }, [backgrounds, search]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.bottomSheet}>
          <View style={styles.handle} />
          <Text variant="title" style={{ marginBottom: 4 }}>Trasfondo</Text>
          <Text variant="caption" style={{ marginBottom: 10 }}>
            De dónde viene tu personaje. Te da competencias, equipo y una habilidad propia.
          </Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar trasfondo..."
            placeholderTextColor={colors.textFaint}
            style={[styles.textInput, { marginTop: 4, marginBottom: 0, textAlign: "left" }]}
          />

          <ScrollView style={{ maxHeight: 340, marginTop: 10 }} showsVerticalScrollIndicator={false}>
            {isLoading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            {groups.map((group) => (
              <View key={group.category}>
                <Text variant="label" style={{ marginTop: 10, marginBottom: 6 }}>
                  {(CATEGORY_LABEL[group.category] || group.category).toUpperCase()}
                </Text>
                {group.items.map((background) => {
                  const active = sel === background.index;
                  return (
                    <Pressable
                      key={background.index}
                      onPress={() => setSel(background.index)}
                      style={[styles.armorRow, active && styles.armorRowActive]}
                    >
                      <Ionicons
                        name={active ? "radio-button-on" : "radio-button-off"}
                        size={18}
                        color={active ? colors.accent : colors.muted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text variant="subtitle" style={{ fontSize: 14 }}>{background.name}</Text>
                        <Text variant="caption" numberOfLines={active ? undefined : 2}>{background.description}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            {!isLoading && !groups.length && (
              <Text variant="body" style={{ paddingVertical: 12 }}>No encontramos ningún trasfondo con ese nombre.</Text>
            )}
          </ScrollView>

          <Button
            label="Elegir trasfondo"
            icon="checkmark"
            onPress={() => sel && onSave(sel)}
            disabled={!sel}
            loading={loading}
            style={{ marginTop: 14 }}
          />
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Modal de hechizos que regala el trasfondo ---------- */
export function BackgroundSpellsModal({
  visible,
  options,
  selected,
  onClose,
  onSave,
  loading,
}: {
  visible: boolean;
  /** Elecciones ya resueltas a hechizos concretos por el backend. */
  options: BackgroundSpellOption[];
  selected: string[];
  onClose: () => void;
  onSave: (spellIds: string[]) => void;
  loading?: boolean;
}) {
  const [sel, setSel] = useState<string[]>(selected);

  useEffect(() => {
    if (visible) setSel(selected);
  }, [visible, selected]);

  const toggle = (choice: BackgroundSpellOption, spellId: string) => {
    const others = choice.spells.map((s) => s._id);
    const mine = sel.filter((id) => others.includes(id));
    if (mine.includes(spellId)) {
      setSel(sel.filter((id) => id !== spellId));
      return;
    }
    // Al llegar al tope, el más viejo sale para dejar entrar al nuevo.
    const next = mine.length >= choice.count ? sel.filter((id) => id !== mine[0]) : sel;
    setSel([...next, spellId]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.bottomSheet}>
          <View style={styles.handle} />
          <Text variant="title" style={{ marginBottom: 4 }}>Hechizos de tu trasfondo</Text>
          <Text variant="caption" style={{ marginBottom: 10 }}>
            Son gratis: no ocupan lugar entre los hechizos que podés conocer o preparar.
          </Text>

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {options.map((choice) => {
              const chosen = sel.filter((id) => choice.spells.some((s) => s._id === id));
              return (
                <View key={choice.key}>
                  <Text variant="label" style={{ marginTop: 10, marginBottom: 6 }}>
                    {choice.label.toUpperCase()} ({chosen.length}/{choice.count})
                  </Text>
                  {choice.spells.map((spell) => {
                    const active = sel.includes(spell._id);
                    return (
                      <Pressable
                        key={spell._id}
                        onPress={() => toggle(choice, spell._id)}
                        style={[styles.armorRow, active && styles.armorRowActive]}
                      >
                        <Ionicons
                          name={active ? "checkbox" : "square-outline"}
                          size={18}
                          color={active ? colors.accent : colors.muted}
                        />
                        <View style={{ flex: 1 }}>
                          <Text variant="subtitle" style={{ fontSize: 14 }}>{spell.name}</Text>
                          {!!spell.simpleDescription && <Text variant="caption" numberOfLines={2}>{spell.simpleDescription}</Text>}
                        </View>
                      </Pressable>
                    );
                  })}
                  {!choice.spells.length && (
                    <Text variant="caption" style={{ paddingVertical: 8 }}>
                      No hay hechizos disponibles para esta elección.
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <Button label="Guardar" icon="checkmark" onPress={() => onSave(sel)} loading={loading} style={{ marginTop: 14 }} />
        </View>
      </View>
    </Modal>
  );
}


/* ---------- Modal de arma equipada ---------- */
export function WeaponModal({
  visible,
  weapon,
  weapons,
  onClose,
  onSave,
}: {
  visible: boolean;
  weapon: string;
  weapons: Weapon[];
  onClose: () => void;
  onSave: (weapon: string) => void;
}) {
  // Tocar un arma la equipa al toque (no hace falta un botón "Guardar" aparte):
  // antes había que elegir y después tocar Guardar, y si el usuario cerraba el
  // modal tocando afuera se perdía la selección sin avisar. Así cambiar de arma
  // es un solo toque y siempre se aplica.
  const choose = (w: string) => {
    onSave(w);
    onClose();
  };

  const categories: WeaponCategory[] = ["simple-melee", "simple-ranged", "martial-melee", "martial-ranged"];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.bottomSheet}>
          <View style={styles.handle} />
          <Text variant="title" style={{ marginBottom: 4 }}>Arma</Text>
          <Text variant="caption" style={{ marginBottom: 10 }}>
            Tocá un arma para equipártela. El daño se calcula solo con el botón "Lanzar".
          </Text>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <Pressable onPress={() => choose("unarmed")} style={[styles.armorRow, weapon === "unarmed" && styles.armorRowActive]}>
              <Ionicons
                name={weapon === "unarmed" ? "radio-button-on" : "radio-button-off"}
                size={18}
                color={weapon === "unarmed" ? colors.accent : colors.muted}
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
                {weapons.filter((w) => w.category === cat && w.index !== "unarmed" && !w.properties.includes("Natural") && !w.properties.includes("Racial")).map((w) => {
                  const active = weapon === w.index;
                  return (
                    <Pressable key={w.index} onPress={() => choose(w.index)} style={[styles.armorRow, active && styles.armorRowActive]}>
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
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Descanso corto / largo ---------- */
export function RestModal({
  visible,
  mode,
  maxHp,
  hitDie,
  level,
  hitDiceUsed,
  conScore,
  onClose,
  onFullRest,
  onShortRest,
  fullRestLoading,
  shortRestLoading,
}: {
  visible: boolean;
  mode: "full" | "short" | null;
  maxHp: number;
  hitDie: number;
  level: number;
  hitDiceUsed: number;
  conScore: number;
  onClose: () => void;
  onFullRest: () => void;
  onShortRest: (rolls: number[]) => void;
  fullRestLoading?: boolean;
  shortRestLoading?: boolean;
}) {
  const remaining = Math.max(0, level - (hitDiceUsed || 0));
  const conMod = abilityMod(conScore);
  const [diceCount, setDiceCount] = useState(1);
  const [rollMode, setRollMode] = useState<"app" | "manual">("app");
  const [rolls, setRolls] = useState<number[]>([]);

  useEffect(() => {
    if (visible && mode === "short") {
      setDiceCount(Math.min(1, remaining) || 1);
      setRolls([]);
      setRollMode("app");
    }
  }, [visible, mode]);

  const changeCount = (next: number) => {
    setDiceCount(Math.max(1, Math.min(remaining, next)));
    setRolls([]);
  };

  const rollInApp = () => setRolls(Array.from({ length: diceCount }, () => rollDie(hitDie)));

  const setManualRoll = (i: number, v: string) => {
    const n = Math.max(1, Math.min(hitDie, parseInt(v, 10) || 0));
    setRolls((prev) => {
      const next = [...prev];
      next[i] = n;
      return next;
    });
  };

  const rollsReady = rolls.length === diceCount && rolls.every((r) => r >= 1 && r <= hitDie);
  const projectedHeal = rolls.reduce((sum, r) => sum + Math.max(0, r + conMod), 0);

  if (mode === "full") {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Ionicons name="moon" size={28} color={colors.accent} style={{ alignSelf: "center", marginBottom: 8 }} />
            <Text variant="title" center>Descanso largo</Text>
            <Text variant="body" center style={{ marginTop: 8 }}>
              Recuperás toda tu vida ({maxHp}/{maxHp}), todos tus dados de golpe, espacios de hechizo y recursos
              (furias, ki, puntos de hechicería, etc).
            </Text>
            <Button label="Descansar" icon="moon" onPress={onFullRest} loading={fullRestLoading} style={{ marginTop: 18 }} />
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  if (mode === "short") {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.sheetBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <View style={styles.bottomSheet}>
            <View style={styles.handle} />
            <Text variant="title" style={{ marginBottom: 4 }}>Descanso corto</Text>

            {remaining === 0 ? (
              <Text variant="body" style={{ marginTop: 8 }}>
                No te quedan dados de golpe (d{hitDie}). Hacé un descanso largo para recuperarlos.
              </Text>
            ) : (
              <>
                <Text variant="caption" style={{ marginBottom: 14 }}>
                  Te quedan {remaining} dado{remaining === 1 ? "" : "s"} de golpe (d{hitDie}). Elegí cuántos gastar:
                  cada uno cura 1d{hitDie} {formatMod(conMod)}.
                </Text>

                <View style={styles.bonusRow}>
                  <Pressable style={styles.bonusStep} onPress={() => changeCount(diceCount - 1)}>
                    <Ionicons name="remove" size={16} color={colors.text} />
                  </Pressable>
                  <Text style={styles.bonusVal}>{diceCount}</Text>
                  <Pressable style={styles.bonusStep} onPress={() => changeCount(diceCount + 1)}>
                    <Ionicons name="add" size={16} color={colors.text} />
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => { setRollMode("app"); setRolls([]); }}
                  style={[styles.armorRow, rollMode === "app" && styles.armorRowActive]}
                >
                  <Ionicons name={rollMode === "app" ? "radio-button-on" : "radio-button-off"} size={18} color={rollMode === "app" ? colors.accent : colors.muted} />
                  <Text variant="body" style={{ fontSize: 14 }}>Tirar los dados en la app</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setRollMode("manual"); setRolls([]); }}
                  style={[styles.armorRow, rollMode === "manual" && styles.armorRowActive]}
                >
                  <Ionicons name={rollMode === "manual" ? "radio-button-on" : "radio-button-off"} size={18} color={rollMode === "manual" ? colors.accent : colors.muted} />
                  <Text variant="body" style={{ fontSize: 14 }}>Ya tiré en la vida real, cargo el resultado</Text>
                </Pressable>

                {rollMode === "app" ? (
                  <Button
                    label={rolls.length ? "Volver a tirar" : `Tirar ${diceCount}d${hitDie}`}
                    icon="dice"
                    variant="secondary"
                    onPress={rollInApp}
                    style={{ marginTop: 10 }}
                  />
                ) : (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {Array.from({ length: diceCount }).map((_, i) => (
                      <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Text variant="caption" style={{ width: 56 }}>Dado {i + 1}</Text>
                        <TextInput
                          keyboardType="number-pad"
                          placeholder={`1-${hitDie}`}
                          placeholderTextColor={colors.textFaint}
                          value={rolls[i] ? String(rolls[i]) : ""}
                          onChangeText={(v) => setManualRoll(i, v)}
                          style={styles.restInput}
                        />
                      </View>
                    ))}
                  </View>
                )}

                {rollsReady && (
                  <Text variant="body" center style={{ marginTop: 14 }}>
                    Resultados: {rolls.join(", ")} ({formatMod(conMod)} por dado) → curás {projectedHeal} PV
                  </Text>
                )}

                <Button
                  label="Confirmar descanso corto"
                  icon="checkmark"
                  onPress={() => onShortRest(rolls)}
                  loading={shortRestLoading}
                  disabled={!rollsReady}
                  style={{ marginTop: 14 }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 340, backgroundColor: colors.surfaceAlt, borderRadius: radius.xl, padding: 24, borderWidth: 1, borderColor: colors.border },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginVertical: 22 },
  bigStep: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  bigInput: { fontFamily: font.display, fontSize: 40, color: colors.text, minWidth: 80, textAlign: "center" },
  textInput: {
    marginTop: 16,
    marginBottom: 18,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: font.body,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: "center",
  },
  sheetBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  bottomSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 22, paddingBottom: 40, borderTopWidth: 1, borderColor: colors.border },
  handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: colors.muted, marginBottom: 16 },
  armorRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderRadius: radius.md },
  armorRowActive: { backgroundColor: colors.surfaceAlt },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderTopWidth: 1, borderColor: colors.border, marginTop: 6 },
  bonusRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  bonusStep: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  bonusVal: { fontFamily: font.display, fontSize: 18, color: colors.accent, minWidth: 42, textAlign: "center" },
  levelChip: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  levelChipText: { fontFamily: font.bodyBold, fontSize: 10, color: colors.text },
  restInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

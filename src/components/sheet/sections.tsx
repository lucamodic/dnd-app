import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { MotiView, AnimatePresence } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { Character, Clazz, Race, ClassResource } from "@/api/hooks";
import {
  SKILLS,
  skillModifier,
  resourcesAt,
  spellSlotsAt,
  setResourceUsed,
  setSpellSlotUsed,
  weaponAttackInfo,
} from "@/lib/sheet";
import { ABILITY_LABELS, formatMod } from "@/lib/format";
import { WEAPON_BY_INDEX } from "@/data/weapons";
import { Text } from "@/components/Text";
import { useDice } from "@/components/dice/DiceProvider";
import { Pips } from "./Pips";
import { WeaponModal } from "./editors";
import { colors, font, radius } from "@/theme";

type UpdateFn = (patch: Partial<Character>) => void;

/* ---------- Monedas ---------- */
const COINS: { key: keyof Character["currency"]; label: string; color: string }[] = [
  { key: "gp", label: "Oro", color: "#E8C25A" },
  { key: "sp", label: "Plata", color: "#C7CCD6" },
  { key: "cp", label: "Cobre", color: "#C08457" },
];

/* ---------- Arma equipada ---------- */
export function WeaponSection({ character, cls, update }: { character: Character; cls: Clazz; update: UpdateFn }) {
  const weapon = WEAPON_BY_INDEX[character.weapon] || WEAPON_BY_INDEX["unarmed"];
  const needsWeapon = !character.weapon || character.weapon === "unarmed";
  const [weaponOpen, setWeaponOpen] = useState(false);
  const { roll } = useDice();
  const attack = weaponAttackInfo(character, weapon);
  const damageNotation = weapon.damageDice && weapon.damageDice.includes("d")
    ? `${weapon.damageDice}${attack.abilityBonus >= 0 ? `+${attack.abilityBonus}` : attack.abilityBonus}`
    : "";

  return (
    <View>
      {needsWeapon && (
        <View style={styles.weaponWarning}>
          <Ionicons name="warning" size={15} color={colors.warning} />
          <Text variant="caption" color={colors.warning}>Seleccioná un arma para calcular bien ataque y daño.</Text>
        </View>
      )}
      <Pressable onPress={() => setWeaponOpen(true)} style={[styles.weaponRow, needsWeapon && styles.weaponRowWarning]}>
        <View style={styles.weaponIcon}>
          <Ionicons name="flash" size={16} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subtitle" style={{ fontSize: 15 }}>{weapon.name}</Text>
          <Text variant="caption">
            {weapon.damageDice ? `${weapon.damageDice} ${weapon.damageType}` : weapon.description}
            {"  ·  "}
            Ataque d20 {formatMod(attack.attackBonus)}
            {"  ·  "}
            Daño {formatMod(attack.abilityBonus)} {attack.abilityLabel}
          </Text>
        </View>
        {!!damageNotation && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              roll(damageNotation, `${weapon.name} · ${damageNotation}`);
            }}
            style={styles.weaponRollBtn}
          >
            <Ionicons name="dice" size={16} color={colors.text} />
            <Text style={styles.weaponRollText}>{damageNotation}</Text>
          </Pressable>
        )}
        <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
      </Pressable>
      <WeaponModal
        visible={weaponOpen}
        weapon={character.weapon}
        onClose={() => setWeaponOpen(false)}
        onSave={(w) => update({ weapon: w })}
      />
    </View>
  );
}

/* ---------- Inventario (monedas + notas) ---------- */
export function InventorySection({ character, update }: { character: Character; update: UpdateFn }) {
  const [item, setItem] = useState("");
  const items = character.inventoryItems || [];

  const addItem = () => {
    const text = item.trim();
    if (!text) return;
    update({ inventoryItems: [...items, { text, createdAt: new Date().toISOString() }] });
    setItem("");
  };

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text variant="label" style={{ marginBottom: 8 }}>MONEDAS</Text>
        <CurrencySection character={character} update={update} />
      </View>

      <View style={styles.divider} />

      <View>
        <Text variant="label" style={{ marginBottom: 8 }}>ÍTEMS</Text>
        <View style={styles.itemAddRow}>
          <TextInput
            value={item}
            onChangeText={setItem}
            placeholder="Agregar ítem..."
            placeholderTextColor={colors.textFaint}
            style={styles.itemInput}
          />
          <StepBtn icon="add" onPress={addItem} />
        </View>
        <View style={{ gap: 6, marginTop: 10 }}>
          {items.length === 0 && <Text variant="caption">Todavía no agregaste ítems.</Text>}
          {items.map((it, i) => (
            <View key={it._id || `${it.text}-${i}`} style={styles.itemRow}>
              <Text variant="body" style={{ flex: 1, fontSize: 14 }}>{it.text}</Text>
              <Pressable onPress={() => update({ inventoryItems: items.filter((_, idx) => idx !== i) })}>
                <Ionicons name="close" size={16} color={colors.textFaint} />
              </Pressable>
            </View>
          ))}
        </View>
      </View>

    </View>
  );
}

export function NotesSection({ character, update }: { character: Character; update: UpdateFn }) {
  const initial = character.noteSections || { general: character.notes || "", campaign: "", npcs: "", places: "", other: "" };
  const [notes, setNotes] = useState(initial);

  useEffect(() => {
    setNotes(character.noteSections || { general: character.notes || "", campaign: "", npcs: "", places: "", other: "" });
  }, [character.noteSections, character.notes]);

  const save = (key: keyof typeof notes, value: string) => {
    const next = { ...notes, [key]: value };
    setNotes(next);
    update({ noteSections: next, notes: next.general });
  };

  return (
    <View style={{ gap: 12, marginTop: 14 }}>
      <NoteBox title="Generales" value={notes.general} onChange={(v) => save("general", v)} />
      <NoteBox title="Campaña" value={notes.campaign} onChange={(v) => save("campaign", v)} />
      <NoteBox title="NPCs" value={notes.npcs} onChange={(v) => save("npcs", v)} />
      <NoteBox title="Lugares" value={notes.places} onChange={(v) => save("places", v)} />
      <NoteBox title="Otros" value={notes.other} onChange={(v) => save("other", v)} />
    </View>
  );
}

function NoteBox({ title, value, onChange }: { title: string; value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value || "");
  useEffect(() => setLocal(value || ""), [value]);
  return (
    <View>
      <Text variant="label" style={{ marginBottom: 6 }}>{title.toUpperCase()}</Text>
      <TextInput
        multiline
        value={local}
        onChangeText={setLocal}
        onBlur={() => onChange(local)}
        placeholder={`Notas de ${title.toLowerCase()}...`}
        placeholderTextColor={colors.textFaint}
        style={styles.notesInput}
      />
    </View>
  );
}

export function CurrencySection({ character, update }: { character: Character; update: UpdateFn }) {
  const change = (key: keyof Character["currency"], delta: number) => {
    const next = { ...character.currency, [key]: Math.max(0, (character.currency[key] || 0) + delta) };
    update({ currency: next });
  };
  return (
    <View style={{ gap: 10 }}>
      {COINS.map((coin) => (
        <View key={coin.key} style={styles.coinRow}>
          <View style={[styles.coinDot, { backgroundColor: coin.color }]} />
          <Text variant="subtitle" style={{ flex: 1, fontSize: 15 }}>
            {coin.label}
          </Text>
          <StepBtn icon="remove" onPress={() => change(coin.key, -1)} />
          <Text style={styles.coinValue}>{character.currency[coin.key] || 0}</Text>
          <StepBtn icon="add" onPress={() => change(coin.key, 1)} />
          <StepBtn icon="add" label="10" onPress={() => change(coin.key, 10)} />
        </View>
      ))}
    </View>
  );
}

/* ---------- Competencias / Skills ---------- */
export function SkillsSection({
  character,
  cls,
  update,
}: {
  character: Character;
  cls: Clazz;
  update: UpdateFn;
}) {
  const toggle = (index: string) => {
    const current = character.skillProficiencies || [];
    const next = current.includes(index) ? current.filter((s) => s !== index) : [...current, index];
    update({ skillProficiencies: next });
  };

  return (
    <View>
      <Text variant="caption" style={{ marginBottom: 10 }}>
        Tu clase elige {cls.skillChoiceCount}. Tocá el círculo para marcar en cuáles sos competente
        (suma tu bono de +{character.proficiencyBonus}).
      </Text>
      <View style={{ gap: 2 }}>
        {SKILLS.map((skill) => {
          const proficient = character.skillProficiencies?.includes(skill.index);
          const mod = skillModifier(skill, character);
          const suggested = cls.skillOptions?.includes(skill.index);
          return (
            <Pressable key={skill.index} onPress={() => toggle(skill.index)} style={styles.skillRow}>
              <Ionicons
                name={proficient ? "checkmark-circle" : "ellipse-outline"}
                size={20}
                color={proficient ? colors.accent : colors.muted}
              />
              <Text variant="body" style={{ flex: 1, fontSize: 14, color: colors.text }}>
                {skill.label}
                {suggested && <Text variant="caption" color={colors.muted}>{"  ·  de tu clase"}</Text>}
              </Text>
              <Text variant="caption" color={colors.textFaint}>
                {ABILITY_LABELS[skill.ability]}
              </Text>
              <Text style={styles.skillMod}>{formatMod(mod)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ---------- Lista de rasgos / habilidades (expandibles) ---------- */
export function FeatureList({
  items,
}: {
  items: { name: string; description: string; level?: number }[];
}) {
  if (items.length === 0) return <Text variant="caption">Nada por acá todavía.</Text>;
  return (
    <View style={{ gap: 8 }}>
      {items.map((item, i) => (
        <FeatureRow key={`${item.name}-${i}`} item={item} />
      ))}
    </View>
  );
}

function FeatureRow({ item }: { item: { name: string; description: string; level?: number } }) {
  const [open, setOpen] = useState(false);
  const hasDesc = !!item.description;
  return (
    <Pressable onPress={() => hasDesc && setOpen((o) => !o)} style={styles.featureRow}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {item.level !== undefined && (
          <View style={styles.lvlTag}>
            <Text style={{ fontSize: 10, color: colors.text, fontFamily: font.bodyBold }}>N{item.level}</Text>
          </View>
        )}
        <Text variant="subtitle" style={{ flex: 1, fontSize: 14 }}>
          {item.name}
        </Text>
        {hasDesc && <Ionicons name={open ? "chevron-up" : "chevron-down"} size={15} color={colors.textFaint} />}
      </View>
      <AnimatePresence>
        {open && (
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Text variant="body" style={{ fontSize: 13, marginTop: 6 }}>
              {item.description}
            </Text>
          </MotiView>
        )}
      </AnimatePresence>
    </Pressable>
  );
}

/* ---------- Recursos de clase (furias, ki, etc.) ---------- */
export function ResourcesSection({
  character,
  cls,
  update,
}: {
  character: Character;
  cls: Clazz;
  update: UpdateFn;
}) {
  const resources = resourcesAt(cls, character);
  const trackable = resources.filter((r) => r.trackable);
  const info = resources.filter((r) => !r.trackable);

  if (resources.length === 0) return <Text variant="caption">Tu clase no tiene recursos especiales a este nivel.</Text>;

  return (
    <View style={{ gap: 14 }}>
      {trackable.map((r) => (
        <TrackableResource key={r.key} resource={r} character={character} update={update} />
      ))}
      {info.map((r) => (
        <View key={r.key} style={styles.infoResource}>
          <View style={{ flex: 1 }}>
            <Text variant="subtitle" style={{ fontSize: 14 }}>
              {r.label}
            </Text>
            <Text variant="caption">{r.description}</Text>
          </View>
          <Text style={styles.infoValue}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

function TrackableResource({
  resource,
  character,
  update,
}: {
  resource: ClassResource & { used: number };
  character: Character;
  update: UpdateFn;
}) {
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <Text variant="subtitle" style={{ fontSize: 14 }}>
          {resource.label}
        </Text>
        <Text variant="caption" color={colors.textDim}>
          {resource.value - resource.used} / {resource.value}
        </Text>
      </View>
      <Pips
        max={resource.value}
        used={resource.used}
        onChange={(used) => update({ resourcesUsed: setResourceUsed(character, resource.key, used) })}
      />
      <Text variant="caption" style={{ marginTop: 6 }}>
        {resource.description}
      </Text>
    </View>
  );
}

/* ---------- Espacios de conjuro ---------- */
export function SpellSlotsSection({
  character,
  cls,
  update,
}: {
  character: Character;
  cls: Clazz;
  update: UpdateFn;
}) {
  const slots = spellSlotsAt(cls, character);
  if (slots.length === 0) return <Text variant="caption">No tenés espacios de conjuro a este nivel.</Text>;

  return (
    <View style={{ gap: 12 }}>
      <Text variant="caption">
        Cada espacio se gasta al lanzar un conjuro y se recupera al descansar. Tocá para marcarlos.
      </Text>
      {slots.map((slot) => (
        <View key={slot.spellLevel}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text variant="subtitle" style={{ fontSize: 14 }}>
              Nivel {slot.spellLevel}
            </Text>
            <Text variant="caption" color={colors.textDim}>
              {slot.max - slot.used} / {slot.max}
            </Text>
          </View>
          <Pips
            max={slot.max}
            used={slot.used}
            color={colors.secondary}
            onChange={(used) => update({ spellSlotsUsed: setSpellSlotUsed(character, slot.spellLevel - 1, used) })}
          />
        </View>
      ))}
    </View>
  );
}

/* ---------- pequeños ---------- */
function StepBtn({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.stepBtn}>
      {label ? (
        <Text style={{ color: colors.text, fontSize: 12, fontFamily: font.bodyBold }}>+{label}</Text>
      ) : (
        <Ionicons name={icon} size={16} color={colors.text} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  weaponRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weaponIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  weaponRollBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  weaponRollText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.text },
  weaponWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.warning + "22",
    borderColor: colors.warning + "88",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  weaponRowWarning: { borderColor: colors.warning, backgroundColor: colors.warning + "12" },
  divider: { height: 1, backgroundColor: colors.border },
  notesInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    minHeight: 90,
    textAlignVertical: "top",
    color: colors.text,
    fontFamily: font.body,
    fontSize: 14,
  },
  itemAddRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: font.body,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  coinRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  coinDot: { width: 16, height: 16, borderRadius: 8 },
  coinValue: { fontFamily: font.display, fontSize: 18, color: colors.text, minWidth: 42, textAlign: "center" },
  stepBtn: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  skillRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  skillMod: { fontFamily: font.display, fontSize: 16, color: colors.accent, minWidth: 34, textAlign: "right" },
  featureRow: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12 },
  lvlTag: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  infoResource: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoValue: { fontFamily: font.display, fontSize: 22, color: colors.accent },
});

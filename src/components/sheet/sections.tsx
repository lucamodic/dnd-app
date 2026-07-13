import { useEffect, useMemo, useState } from "react";
import { Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { Character, Clazz, Race, ClassResource, useCreateWeapon, useWeapons, WeaponCategory } from "@/api/hooks";
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
import { naturalWeaponIndexesForRace, WEAPON_BY_INDEX, WEAPONS, Weapon } from "@/data/weapons";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { useDice } from "@/components/dice/DiceProvider";
import { useAuth } from "@/store/auth";
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

const WEAPON_CATEGORY_OPTIONS: { value: WeaponCategory; label: string }[] = [
  { value: "simple-melee", label: "Simple cuerpo a cuerpo" },
  { value: "simple-ranged", label: "Simple a distancia" },
  { value: "martial-melee", label: "Marcial cuerpo a cuerpo" },
  { value: "martial-ranged", label: "Marcial a distancia" },
];

/* ---------- Armas (varias, cada una reemplazable/eliminable por separado) ---------- */
export function WeaponSection({ character, cls, race, update }: { character: Character; cls: Clazz; race?: Race; update: UpdateFn }) {
  const user = useAuth((s) => s.user);
  const isDM = user?.role === "dm" || user?.role === "admin";
  const { data: dbWeapons } = useWeapons();
  const weapons = useMemo(() => (dbWeapons?.length ? dbWeapons : WEAPONS) as Weapon[], [dbWeapons]);
  const weaponByIndex = useMemo(() => ({ ...WEAPON_BY_INDEX, ...Object.fromEntries(weapons.map((w) => [w.index, w])) }), [weapons]);
  // "new" = agregando un arma nueva a la lista; un índice = reemplazando esa arma puntual.
  const [pickerFor, setPickerFor] = useState<string | "new" | null>(null);
  const [createWeaponOpen, setCreateWeaponOpen] = useState(false);
  const { roll } = useDice();
  const naturalWeapons = naturalWeaponIndexesForRace(race);
  const carriedWeapons = Array.from(new Set((character.weapons || []).filter(Boolean)));
  const ownedWeapons = Array.from(new Set([...carriedWeapons, ...naturalWeapons]));
  const needsWeapon = carriedWeapons.length === 0;

  const replaceWeapon = (oldIndex: string | null, newIndex: string) => {
    const next = oldIndex
      ? carriedWeapons.map((w) => (w === oldIndex ? newIndex : w))
      : [...carriedWeapons, newIndex];
    const deduped = Array.from(new Set(next));
    update({ weapons: deduped, weapon: deduped[0] || "unarmed" });
  };

  const removeWeapon = (index: string) => {
    const next = carriedWeapons.filter((w) => w !== index);
    update({ weapons: next, weapon: next[0] || "unarmed" });
  };

  return (
    <View>
      {needsWeapon && (
        <View style={styles.weaponWarning}>
          <Ionicons name="warning" size={15} color={colors.warning} />
          <Text variant="caption" color={colors.warning}>Agregá un arma para calcular bien ataque y daño.</Text>
        </View>
      )}
      <View style={{ gap: 8 }}>
        {ownedWeapons.length === 0 && (
          <WeaponCard weaponIndex="unarmed" weaponByIndex={weaponByIndex} character={character} roll={roll} onChange={() => setPickerFor("new")} />
        )}
        {ownedWeapons.map((weaponIndex) => {
          const natural = naturalWeapons.includes(weaponIndex);
          return (
            <WeaponCard
              key={weaponIndex}
              weaponIndex={weaponIndex}
              weaponByIndex={weaponByIndex}
              character={character}
              natural={natural}
              roll={roll}
              onChange={natural ? undefined : () => setPickerFor(weaponIndex)}
              onRemove={!natural && carriedWeapons.length > 1 ? () => removeWeapon(weaponIndex) : undefined}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <View style={{ flex: 1 }}>
          <Button label="Agregar arma" icon="add-circle" variant="secondary" small onPress={() => setPickerFor("new")} />
        </View>
        {isDM && (
          <View style={{ flex: 1 }}>
            <Button label="Crear arma" icon="hammer" variant="secondary" small onPress={() => setCreateWeaponOpen(true)} />
          </View>
        )}
      </View>
      <WeaponModal
        visible={pickerFor !== null}
        weapon={pickerFor && pickerFor !== "new" ? pickerFor : "unarmed"}
        weapons={weapons}
        onClose={() => setPickerFor(null)}
        onSave={(w) => replaceWeapon(pickerFor && pickerFor !== "new" ? pickerFor : null, w)}
      />
      {isDM && (
        <CreateWeaponModal
          visible={createWeaponOpen}
          onClose={() => setCreateWeaponOpen(false)}
          onCreated={(w) => replaceWeapon(null, w)}
        />
      )}
    </View>
  );
}

function CreateWeaponModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (weaponIndex: string) => void;
}) {
  const createWeapon = useCreateWeapon();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<WeaponCategory>("simple-melee");
  const [damageDice, setDamageDice] = useState("1d6");
  const [damageType, setDamageType] = useState("Cortante");
  const [properties, setProperties] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!visible) return;
    setName("");
    setCategory("simple-melee");
    setDamageDice("1d6");
    setDamageType("Cortante");
    setProperties("");
    setDescription("");
  }, [visible]);

  const save = async () => {
    if (!name.trim()) return;
    const weapon = await createWeapon.mutateAsync({
      name: name.trim(),
      category,
      damageDice: damageDice.trim(),
      damageType: damageType.trim(),
      properties: properties.split(",").map((p) => p.trim()).filter(Boolean),
      description: description.trim(),
    });
    onCreated(weapon.index);
    onClose();
  };

  const chooseCategory = (nextCategory: WeaponCategory) => {
    Keyboard.dismiss();
    setCategory(nextCategory);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.itemSheet}>
          <View style={styles.handle} />
          <Text variant="title">Crear arma</Text>
          <Text variant="caption" style={{ marginTop: 4, marginBottom: 12 }}>
            Se agrega a Mongo y queda equipada en este personaje.
          </Text>
          <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false} contentContainerStyle={styles.itemSheetContent}>
            <TextInput placeholder="Nombre" placeholderTextColor={colors.textFaint} value={name} onChangeText={setName} style={styles.itemInput} />
            <View style={styles.weaponCategoryGrid}>
              {WEAPON_CATEGORY_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPressIn={() => chooseCategory(option.value)}
                  hitSlop={6}
                  pressRetentionOffset={12}
                  style={[styles.weaponCategoryBtn, category === option.value && styles.weaponCategoryBtnActive]}
                >
                  <Text style={styles.weaponCategoryText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput placeholder="Daño (1d6)" placeholderTextColor={colors.textFaint} value={damageDice} onChangeText={setDamageDice} style={[styles.itemInput, { flex: 1 }]} />
              <TextInput placeholder="Tipo" placeholderTextColor={colors.textFaint} value={damageType} onChangeText={setDamageType} style={[styles.itemInput, { flex: 1 }]} />
            </View>
            <TextInput placeholder="Propiedades separadas por coma" placeholderTextColor={colors.textFaint} value={properties} onChangeText={setProperties} style={styles.itemInput} />
            <TextInput
              placeholder="Descripción"
              placeholderTextColor={colors.textFaint}
              value={description}
              onChangeText={setDescription}
              multiline
              style={[styles.itemInput, styles.itemDescriptionInput]}
            />
          </ScrollView>
          <Button label="Crear y dar" icon="checkmark" onPress={save} loading={createWeapon.isPending} disabled={!name.trim()} style={{ marginTop: 12 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function WeaponCard({
  weaponIndex,
  weaponByIndex,
  character,
  natural,
  roll,
  onChange,
  onRemove,
}: {
  weaponIndex: string;
  weaponByIndex: Record<string, Weapon>;
  character: Character;
  natural?: boolean;
  roll: (notation: string, label?: string) => void;
  onChange?: () => void;
  onRemove?: () => void;
}) {
  const weapon = weaponByIndex[weaponIndex] || weaponByIndex["unarmed"];
  const attack = weaponAttackInfo(character, weapon);
  const damageNotation = weapon.damageDice && weapon.damageDice.includes("d")
    ? `${weapon.damageDice}${attack.abilityBonus >= 0 ? `+${attack.abilityBonus}` : attack.abilityBonus}`
    : "";
  return (
    <Pressable onPress={onChange} disabled={!onChange} style={styles.weaponRow}>
      <View style={styles.weaponIcon}>
        <Ionicons name={natural ? "sparkles" : "flash"} size={16} color={colors.accent} />
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
        {natural && <Text variant="caption" color={colors.accent}>Racial</Text>}
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
      {onRemove && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          hitSlop={8}
        >
          <Ionicons name="close" size={16} color={colors.textFaint} />
        </Pressable>
      )}
    </Pressable>
  );
}

/* ---------- Inventario (monedas + notas) ---------- */
export function InventorySection({ character, update }: { character: Character; update: UpdateFn }) {
  const [itemOpen, setItemOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const items = character.inventoryItems || [];

  const saveItem = (text: string, description: string) => {
    if (!text) return;
    const next = [...items];
    if (editingIndex !== null) next[editingIndex] = { ...next[editingIndex], text, description };
    else next.push({ text, description, createdAt: new Date().toISOString() });
    update({ inventoryItems: next });
    setEditingIndex(null);
    setItemOpen(false);
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
        <Button label="Agregar ítem" icon="add-circle" variant="secondary" small onPress={() => { setEditingIndex(null); setItemOpen(true); }} />
        <View style={{ gap: 6, marginTop: 10 }}>
          {items.length === 0 && <Text variant="caption">Todavía no agregaste ítems.</Text>}
          {items.map((it, i) => (
            <ItemRow
              key={it._id || `${it.text}-${i}`}
              item={it}
              onEdit={() => { setEditingIndex(i); setItemOpen(true); }}
              onRemove={() => update({ inventoryItems: items.filter((_, idx) => idx !== i) })}
            />
          ))}
        </View>
        <ItemModal
          visible={itemOpen}
          item={editingIndex !== null ? items[editingIndex] : undefined}
          onClose={() => { setEditingIndex(null); setItemOpen(false); }}
          onSave={saveItem}
        />
      </View>

    </View>
  );
}

function ItemRow({ item, onEdit, onRemove }: { item: Character["inventoryItems"][number]; onEdit: () => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const hasDescription = !!item.description?.trim();
  return (
    <View style={styles.itemRow}>
      <Pressable onPress={() => hasDescription && setOpen((v) => !v)} style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text variant="body" style={{ flex: 1, fontSize: 14 }}>{item.text}</Text>
          {hasDescription && <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.textFaint} />}
        </View>
        {open && (
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "timing", duration: 140 }}>
            <Text variant="caption" style={{ marginTop: 6 }}>{item.description}</Text>
          </MotiView>
        )}
      </Pressable>
      <Pressable onPress={onEdit} hitSlop={8}>
        <Ionicons name="create-outline" size={16} color={colors.textFaint} />
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Ionicons name="close" size={16} color={colors.textFaint} />
      </Pressable>
    </View>
  );
}

function ItemModal({
  visible,
  item,
  onClose,
  onSave,
}: {
  visible: boolean;
  item?: Character["inventoryItems"][number];
  onClose: () => void;
  onSave: (text: string, description: string) => void;
}) {
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => {
    if (visible) {
      setText(item?.text || "");
      setDescription(item?.description || "");
    }
  }, [visible, item]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.itemSheet}>
          <View style={styles.handle} />
          <Text variant="title">{item ? "Editar ítem" : "Agregar ítem"}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.itemSheetContent}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Nombre del ítem"
              placeholderTextColor={colors.textFaint}
              cursorColor={colors.accent}
              selectionColor={colors.accent}
              style={[styles.itemInput, styles.itemNameInput]}
              returnKeyType="next"
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Descripción opcional"
              placeholderTextColor={colors.textFaint}
              cursorColor={colors.accent}
              selectionColor={colors.accent}
              style={[styles.itemInput, styles.itemDescriptionInput]}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>
          <Button label={item ? "Guardar cambios" : "Crear ítem"} icon="checkmark" onPress={() => onSave(text.trim(), description.trim())} disabled={!text.trim()} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function NotesSection({ character, update }: { character: Character; update: UpdateFn }) {
  const emptyNotes = { characterInfo: "", general: character.notes || "", campaign: "", npcs: "", places: "", other: "" };
  const initial = { ...emptyNotes, ...(character.noteSections || {}) };
  const [notes, setNotes] = useState(initial);
  const [page, setPage] = useState(0);
  const [editingNote, setEditingNote] = useState(false);
  const width = Dimensions.get("window").width - 40;
  const tabs = [
    ["characterInfo", "Información del personaje"],
    ["general", "Generales"],
    ["campaign", "Campaña"],
    ["npcs", "NPCs"],
    ["places", "Lugares"],
    ["other", "Otros"],
  ] as const;

  useEffect(() => {
    setNotes({ ...emptyNotes, ...(character.noteSections || {}) });
  }, [character.noteSections, character.notes]);

  const save = (key: keyof typeof notes, value: string) => {
    const next = { ...notes, [key]: value };
    setNotes(next);
    update({ noteSections: next, notes: next.general });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 24}
      style={{ gap: 12, marginTop: 14 }}
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {tabs.map(([key, title]) => (
          <View key={key} style={[styles.notePage, { width }]}>
            <NoteBox
              title={title}
              value={notes[key]}
              onFocus={() => setEditingNote(true)}
              onChange={(v) => {
                setEditingNote(false);
                save(key, v);
              }}
            />
          </View>
        ))}
      </ScrollView>
      <View style={styles.noteDots}>
        {tabs.map(([, title], i) => (
          <View key={title} style={[styles.noteDot, i === page && styles.noteDotActive]} />
        ))}
      </View>
      <Text variant="caption" center>{tabs[page]?.[1]}</Text>
      {editingNote && <View style={styles.keyboardSpacer} />}
    </KeyboardAvoidingView>
  );
}

function NoteBox({
  title,
  value,
  onChange,
  onFocus,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
}) {
  const [local, setLocal] = useState(value || "");
  useEffect(() => setLocal(value || ""), [value]);
  return (
    <View>
      <Text variant="label" style={{ marginBottom: 6 }}>{title.toUpperCase()}</Text>
      <TextInput
        multiline
        value={local}
        onChangeText={setLocal}
        onFocus={onFocus}
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
  const sortedSkills = [...SKILLS].sort((a, b) => a.label.localeCompare(b.label, "es"));

  return (
    <View>
      <Text variant="caption" style={{ marginBottom: 10 }}>
        Tu clase elige {cls.skillChoiceCount}. Tocá el círculo para marcar en cuáles sos competente
        (suma tu bono de +{character.proficiencyBonus}).
      </Text>
      <View style={{ gap: 2 }}>
        {sortedSkills.map((skill) => {
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
      {open && (
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "timing", duration: 140 }}>
          <Text variant="body" style={{ fontSize: 13, marginTop: 6 }}>
            {item.description}
          </Text>
        </MotiView>
      )}
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
    minHeight: 260,
    textAlignVertical: "top",
    color: colors.text,
    fontFamily: font.body,
    fontSize: 14,
  },
  itemAddRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemInput: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: font.body,
    fontSize: 14,
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
  itemSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
    paddingBottom: 34,
    gap: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: "88%",
  },
  itemSheetContent: { gap: 12, paddingBottom: 2 },
  itemNameInput: { minHeight: 48 },
  weaponCategoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  weaponCategoryBtn: {
    width: "48%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingVertical: 10,
    alignItems: "center",
  },
  weaponCategoryBtnActive: { borderColor: colors.accent, backgroundColor: colors.primary + "66" },
  weaponCategoryText: { color: colors.text, fontFamily: font.bodyBold, fontSize: 11, textAlign: "center" },
  handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: colors.muted, marginBottom: 4 },
  sheetBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  itemDescriptionInput: { minHeight: 130, paddingTop: 12 },
  noteDots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  notePage: { paddingHorizontal: 6 },
  keyboardSpacer: { height: Platform.OS === "ios" ? 260 : 320 },
  noteDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.surfaceAlt },
  noteDotActive: { width: 20, backgroundColor: colors.accent },
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

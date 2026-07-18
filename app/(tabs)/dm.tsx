import { useState } from "react";
import { Keyboard, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useCreateUser, useCreateWeapon, useTracker, useTrackerAddMonster, useTrackerSettings, WeaponCategory } from "@/api/hooks";
import { useAuth } from "@/store/auth";
import { colors, font, radius } from "@/theme";

const WEAPON_CATEGORY_OPTIONS: { value: WeaponCategory; label: string }[] = [
  { value: "simple-melee", label: "Simple cuerpo a cuerpo" },
  { value: "simple-ranged", label: "Simple a distancia" },
  { value: "martial-melee", label: "Marcial cuerpo a cuerpo" },
  { value: "martial-ranged", label: "Marcial a distancia" },
];

export default function DmTools() {
  const user = useAuth((s) => s.user);
  const isDM = user?.role === "dm" || user?.role === "admin";
  const createUser = useCreateUser();
  const createWeapon = useCreateWeapon();
  const addMonster = useTrackerAddMonster();
  const { data: tracker } = useTracker();
  const trackerSettings = useTrackerSettings();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [weaponName, setWeaponName] = useState("");
  const [weaponCategory, setWeaponCategory] = useState<WeaponCategory>("simple-melee");
  const [damageDice, setDamageDice] = useState("1d6");
  const [damageType, setDamageType] = useState("Cortante");
  const [properties, setProperties] = useState("");
  const [description, setDescription] = useState("");
  const [weaponBonus, setWeaponBonus] = useState(0);
  const [monsterName, setMonsterName] = useState("");
  const [monsterHp, setMonsterHp] = useState("");
  const [monsterAc, setMonsterAc] = useState("");
  const [monsterInit, setMonsterInit] = useState("");

  if (!isDM) {
    return (
      <Screen>
        <Text variant="display">DM</Text>
        <Card style={{ marginTop: 20 }}>
          <Text variant="body">Esta sección es solo para el DM.</Text>
        </Card>
      </Screen>
    );
  }

  const onCreateUser = async () => {
    if (!username.trim() || !password) return;
    await createUser.mutateAsync({ username: username.trim(), password });
    setUsername("");
    setPassword("");
  };

  const onCreateWeapon = async () => {
    if (!weaponName.trim()) return;
    await createWeapon.mutateAsync({
      name: weaponName.trim(),
      category: weaponCategory,
      damageDice: damageDice.trim(),
      damageType: damageType.trim(),
      properties: properties.split(",").map((p) => p.trim()).filter(Boolean),
      description: description.trim(),
      bonus: weaponBonus,
    });
    setWeaponName("");
    setWeaponCategory("simple-melee");
    setDamageDice("1d6");
    setDamageType("Cortante");
    setProperties("");
    setDescription("");
    setWeaponBonus(0);
  };

  const chooseWeaponCategory = (nextCategory: WeaponCategory) => {
    Keyboard.dismiss();
    setWeaponCategory(nextCategory);
  };

  const onCreateMonster = async () => {
    if (!monsterName.trim()) return;
    await addMonster.mutateAsync({
      name: monsterName.trim(),
      hp: Number(monsterHp) || 1,
      ac: Number(monsterAc) || 10,
      initiative: Number(monsterInit) || 0,
    });
    setMonsterName("");
    setMonsterHp("");
    setMonsterAc("");
    setMonsterInit("");
  };

  return (
    <Screen>
      <Text variant="display">DM</Text>
      <Text variant="caption" style={{ marginTop: 4 }}>Configuración y herramientas de campaña.</Text>

      <Card style={{ marginTop: 20 }}>
        <Text variant="subtitle">Reglas de la mesa</Text>
        <Pressable
          onPress={() => trackerSettings.mutate({ levelUpEnabled: !tracker?.levelUpEnabled })}
          style={styles.toggleRow}
        >
          <Ionicons
            name={tracker?.levelUpEnabled ? "checkbox" : "square-outline"}
            size={20}
            color={tracker?.levelUpEnabled ? colors.accent : colors.muted}
          />
          <Text variant="body" style={{ flex: 1 }}>Permitir que los players suban de nivel</Text>
        </Pressable>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Text variant="subtitle">Crear Player</Text>
        <View style={{ gap: 10, marginTop: 12 }}>
          <TextInput value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={colors.textFaint} autoCapitalize="none" style={styles.input} />
          <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.textFaint} secureTextEntry style={styles.input} />
          <Button label="Crear Player" icon="person-add" onPress={onCreateUser} loading={createUser.isPending} disabled={!username.trim() || !password} />
          {createUser.error && <Text color={colors.danger}>{(createUser.error as Error).message}</Text>}
        </View>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Text variant="subtitle">Crear arma</Text>
        <View style={{ gap: 10, marginTop: 12 }}>
          <TextInput value={weaponName} onChangeText={setWeaponName} placeholder="Nombre" placeholderTextColor={colors.textFaint} style={styles.input} />
          <View style={styles.categoryGrid}>
            {WEAPON_CATEGORY_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPressIn={() => chooseWeaponCategory(option.value)}
                hitSlop={6}
                pressRetentionOffset={12}
                style={[styles.categoryButton, weaponCategory === option.value && styles.categoryButtonActive]}
              >
                <Text style={styles.categoryText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput value={damageDice} onChangeText={setDamageDice} placeholder="Daño" placeholderTextColor={colors.textFaint} style={[styles.input, { flex: 1 }]} />
            <TextInput value={damageType} onChangeText={setDamageType} placeholder="Tipo" placeholderTextColor={colors.textFaint} style={[styles.input, { flex: 1 }]} />
          </View>
          <TextInput value={properties} onChangeText={setProperties} placeholder="Propiedades separadas por coma" placeholderTextColor={colors.textFaint} style={styles.input} />
          <TextInput value={description} onChangeText={setDescription} placeholder="Descripción" placeholderTextColor={colors.textFaint} multiline textAlignVertical="top" style={[styles.input, styles.textArea]} />
          <Text variant="caption">Bono mágico (solo DM)</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[0, 1, 2, 3].map((value) => (
              <Pressable
                key={value}
                onPressIn={() => {
                  Keyboard.dismiss();
                  setWeaponBonus(value);
                }}
                hitSlop={6}
                style={[styles.categoryButton, { width: undefined, flex: 1 }, weaponBonus === value && styles.bonusButtonActive]}
              >
                <Text style={styles.categoryText}>{value === 0 ? "Ninguno" : `+${value}`}</Text>
              </Pressable>
            ))}
          </View>
          <Button label="Crear arma" icon="hammer" onPress={onCreateWeapon} loading={createWeapon.isPending} disabled={!weaponName.trim()} />
          {createWeapon.error && <Text color={colors.danger}>{(createWeapon.error as Error).message}</Text>}
        </View>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Text variant="subtitle">Bichos</Text>
        <Text variant="body" style={{ marginTop: 6 }}>Crea un bicho custom y lo agrega al combate actual.</Text>
        <View style={{ gap: 10, marginTop: 12 }}>
          <TextInput value={monsterName} onChangeText={setMonsterName} placeholder="Nombre (ej. Goblin)" placeholderTextColor={colors.textFaint} style={styles.input} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput value={monsterHp} onChangeText={(v) => setMonsterHp(v.replace(/[^0-9]/g, ""))} placeholder="PV" placeholderTextColor={colors.textFaint} keyboardType="number-pad" style={[styles.input, { flex: 1 }]} />
            <TextInput value={monsterAc} onChangeText={(v) => setMonsterAc(v.replace(/[^0-9]/g, ""))} placeholder="CA" placeholderTextColor={colors.textFaint} keyboardType="number-pad" style={[styles.input, { flex: 1 }]} />
            <TextInput value={monsterInit} onChangeText={(v) => setMonsterInit(v.replace(/^-?[^0-9]|(?!^)-/g, ""))} placeholder="Init" placeholderTextColor={colors.textFaint} keyboardType="number-pad" style={[styles.input, { flex: 1 }]} />
          </View>
          <Button label="Crear bicho" icon="skull" variant="secondary" onPress={onCreateMonster} loading={addMonster.isPending} disabled={!monsterName.trim()} />
          {addMonster.error && <Text color={colors.danger}>{(addMonster.error as Error).message}</Text>}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: font.body,
  },
  textArea: { minHeight: 92, paddingTop: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryButton: {
    width: "48%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingVertical: 10,
    alignItems: "center",
  },
  categoryButtonActive: { borderColor: colors.accent, backgroundColor: colors.primary + "66" },
  bonusButtonActive: { borderColor: colors.success, backgroundColor: colors.success + "33" },
  categoryText: { color: colors.text, fontFamily: font.bodyBold, fontSize: 11, textAlign: "center" },
});

/** Armas base (espejo del backend src/data/weapons.ts) para el modal de arma equipada. */
export type WeaponCategory = "simple-melee" | "simple-ranged" | "martial-melee" | "martial-ranged";

export interface Weapon {
  index: string;
  name: string;
  category: WeaponCategory;
  damageDice: string;
  damageType: string;
  properties: string[];
  description: string;
}

export const WEAPON_CATEGORY_LABEL: Record<WeaponCategory, string> = {
  "simple-melee": "Simples cuerpo a cuerpo",
  "simple-ranged": "Simples a distancia",
  "martial-melee": "Marciales cuerpo a cuerpo",
  "martial-ranged": "Marciales a distancia",
};

export const WEAPONS: Weapon[] = [
  { index: "unarmed", name: "Golpe sin arma", category: "simple-melee", damageDice: "1", damageType: "Contundente", properties: [], description: "Pegar con el puño o una patada, sin usar ningún arma." },
  { index: "club", name: "Garrote", category: "simple-melee", damageDice: "1d4", damageType: "Contundente", properties: ["Ligera"], description: "Un palo pesado. Sencillo pero débil." },
  { index: "dagger", name: "Daga", category: "simple-melee", damageDice: "1d4", damageType: "Perforante", properties: ["Sutileza", "Ligera", "Arrojadiza"], description: "Rápida, liviana, y se puede tirar. La favorita de los pícaros." },
  { index: "greatclub", name: "Garrote Grande", category: "simple-melee", damageDice: "1d8", damageType: "Contundente", properties: ["A dos manos"], description: "Un garrote enorme que necesita las dos manos." },
  { index: "handaxe", name: "Hacha de Mano", category: "simple-melee", damageDice: "1d6", damageType: "Cortante", properties: ["Ligera", "Arrojadiza"], description: "Un hacha chica que también se puede lanzar." },
  { index: "javelin", name: "Jabalina", category: "simple-melee", damageDice: "1d6", damageType: "Perforante", properties: ["Arrojadiza"], description: "Pensada para tirarla, aunque también sirve cuerpo a cuerpo." },
  { index: "light-hammer", name: "Martillo Ligero", category: "simple-melee", damageDice: "1d4", damageType: "Contundente", properties: ["Ligera", "Arrojadiza"], description: "Chico, liviano y arrojadizo." },
  { index: "mace", name: "Maza", category: "simple-melee", damageDice: "1d6", damageType: "Contundente", properties: [], description: "Un arma contundente clásica, buena contra armaduras." },
  { index: "quarterstaff", name: "Bastón", category: "simple-melee", damageDice: "1d6", damageType: "Contundente", properties: ["Versátil"], description: "Un bastón de madera largo. Con las dos manos pega más fuerte." },
  { index: "sickle", name: "Hoz", category: "simple-melee", damageDice: "1d4", damageType: "Cortante", properties: ["Ligera"], description: "Una hoja curva chica, típica de druidas." },
  { index: "spear", name: "Lanza", category: "simple-melee", damageDice: "1d6", damageType: "Perforante", properties: ["Arrojadiza", "Versátil"], description: "Larga, se puede tirar, y con las dos manos pega más fuerte." },
  { index: "crossbow-light", name: "Ballesta Ligera", category: "simple-ranged", damageDice: "1d8", damageType: "Perforante", properties: ["Munición", "Carga lenta", "A dos manos"], description: "Fácil de usar a distancia, pero se recarga lento." },
  { index: "dart", name: "Dardo", category: "simple-ranged", damageDice: "1d4", damageType: "Perforante", properties: ["Sutileza", "Arrojadiza"], description: "Un proyectil chico para tirar con la mano." },
  { index: "shortbow", name: "Arco Corto", category: "simple-ranged", damageDice: "1d6", damageType: "Perforante", properties: ["Munición", "A dos manos"], description: "Arco simple, bueno para empezar con ataques a distancia." },
  { index: "sling", name: "Honda", category: "simple-ranged", damageDice: "1d4", damageType: "Contundente", properties: ["Munición"], description: "Tira piedras o balas de plomo. Barata y liviana." },
  { index: "battleaxe", name: "Hacha de Batalla", category: "martial-melee", damageDice: "1d8", damageType: "Cortante", properties: ["Versátil"], description: "Un hacha de guerra equilibrada." },
  { index: "flail", name: "Mangual", category: "martial-melee", damageDice: "1d8", damageType: "Contundente", properties: [], description: "Una bola con cadena, difícil de bloquear." },
  { index: "glaive", name: "Guja", category: "martial-melee", damageDice: "1d10", damageType: "Cortante", properties: ["Pesada", "Alcance", "A dos manos"], description: "Una hoja en la punta de un asta larga: pega desde lejos." },
  { index: "greataxe", name: "Hacha Grande", category: "martial-melee", damageDice: "1d12", damageType: "Cortante", properties: ["Pesada", "A dos manos"], description: "Un hachazo brutal a dos manos. Mucho daño." },
  { index: "greatsword", name: "Espadón", category: "martial-melee", damageDice: "2d6", damageType: "Cortante", properties: ["Pesada", "A dos manos"], description: "Una espada enorme a dos manos. De las que más daño hacen." },
  { index: "halberd", name: "Alabarda", category: "martial-melee", damageDice: "1d10", damageType: "Cortante", properties: ["Pesada", "Alcance", "A dos manos"], description: "Hacha y punta combinadas en un asta larga." },
  { index: "lance", name: "Lanza de Justa", category: "martial-melee", damageDice: "1d12", damageType: "Perforante", properties: ["Alcance", "Especial"], description: "Pensada para pelear a caballo. Incómoda a pie." },
  { index: "longsword", name: "Espada Larga", category: "martial-melee", damageDice: "1d8", damageType: "Cortante", properties: ["Versátil"], description: "La espada clásica de caballero. Equilibrada y confiable." },
  { index: "maul", name: "Almádena", category: "martial-melee", damageDice: "2d6", damageType: "Contundente", properties: ["Pesada", "A dos manos"], description: "Un martillo gigante a dos manos." },
  { index: "morningstar", name: "Lucero del Alba", category: "martial-melee", damageDice: "1d8", damageType: "Perforante", properties: [], description: "Una maza con púas." },
  { index: "pike", name: "Pica", category: "martial-melee", damageDice: "1d10", damageType: "Perforante", properties: ["Pesada", "Alcance", "A dos manos"], description: "Una lanza larguísima, ideal para mantener a raya al enemigo." },
  { index: "rapier", name: "Estoque", category: "martial-melee", damageDice: "1d8", damageType: "Perforante", properties: ["Sutileza"], description: "Elegante y rápida. Podés usar Destreza para pegarle." },
  { index: "scimitar", name: "Cimitarra", category: "martial-melee", damageDice: "1d6", damageType: "Cortante", properties: ["Sutileza", "Ligera"], description: "Espada curva, liviana y ágil." },
  { index: "shortsword", name: "Espada Corta", category: "martial-melee", damageDice: "1d6", damageType: "Perforante", properties: ["Sutileza", "Ligera"], description: "Rápida y liviana, buena para pícaros y golpes dobles." },
  { index: "trident", name: "Tridente", category: "martial-melee", damageDice: "1d6", damageType: "Perforante", properties: ["Arrojadiza", "Versátil"], description: "Una lanza de tres puntas, se puede tirar." },
  { index: "war-pick", name: "Pico de Guerra", category: "martial-melee", damageDice: "1d8", damageType: "Perforante", properties: [], description: "Un pico afilado, bueno contra armaduras." },
  { index: "warhammer", name: "Martillo de Guerra", category: "martial-melee", damageDice: "1d8", damageType: "Contundente", properties: ["Versátil"], description: "Un martillo pesado de combate." },
  { index: "whip", name: "Látigo", category: "martial-melee", damageDice: "1d4", damageType: "Cortante", properties: ["Sutileza", "Alcance"], description: "Poco daño, pero llega lejos sin acercarte." },
  { index: "blowgun", name: "Cerbatana", category: "martial-ranged", damageDice: "1", damageType: "Perforante", properties: ["Munición", "Carga lenta"], description: "Casi no hace daño, pero es silenciosa." },
  { index: "crossbow-hand", name: "Ballesta de Mano", category: "martial-ranged", damageDice: "1d6", damageType: "Perforante", properties: ["Munición", "Ligera", "Carga lenta"], description: "Chica, se usa con una sola mano." },
  { index: "crossbow-heavy", name: "Ballesta Pesada", category: "martial-ranged", damageDice: "1d10", damageType: "Perforante", properties: ["Munición", "Pesada", "Carga lenta", "A dos manos"], description: "Pega fuerte a distancia, pero se recarga lento." },
  { index: "longbow", name: "Arco Largo", category: "martial-ranged", damageDice: "1d8", damageType: "Perforante", properties: ["Munición", "Pesada", "A dos manos"], description: "Llega lejos y pega fuerte. El arco de los expertos." },
  { index: "net", name: "Red", category: "martial-ranged", damageDice: "", damageType: "", properties: ["Arrojadiza", "Especial"], description: "No hace daño: atrapa al objetivo en vez de lastimarlo." },
  { index: "natural-talons", name: "Garras", category: "simple-melee", damageDice: "1d6", damageType: "Cortante", properties: ["Natural"], description: "Ataque natural con garras o talones de la raza." },
  { index: "dragonborn-breath", name: "Aliento dracónico", category: "simple-ranged", damageDice: "2d6", damageType: "Elemental", properties: ["Racial", "Salvación"], description: "Ataque de aliento de dragonborn. El tipo y la salvación dependen de tu ascendencia dracónica." },
];

export const WEAPON_BY_INDEX: Record<string, Weapon> = Object.fromEntries(WEAPONS.map((w) => [w.index, w]));

export function naturalWeaponIndexesForRace(race?: { index?: string; name?: string } | null): string[] {
  const key = `${race?.index || ""} ${race?.name || ""}`.toLowerCase();
  const weapons: string[] = [];
  if (key.includes("owlin") || key.includes("aarakocra") || key.includes("aaracokra")) weapons.push("natural-talons");
  if (key.includes("dragonborn") || key.includes("drac")) weapons.push("dragonborn-breath");
  return weapons;
}

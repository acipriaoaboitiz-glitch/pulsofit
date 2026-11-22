import type { Per100 } from './types'

/** Diccionario local de alimentos comunes (valores por 100 g) para el parser offline de la Barra Mágica. */
export interface DbFood {
  id: string
  name: string
  /** extra spoken names (accent-insensitive, lowercase) */
  aliases: string[]
  per100: Per100
  /** weight of one "unit" (1 plátano, 1 huevo, 1 yogur…) in grams */
  unitG?: number
  /** typical weight when no amount is given */
  defaultG?: number
}

const F = (id: string, name: string, aliases: string[], kcal: number, protein: number, carbs: number, fat: number, unitG?: number, defaultG?: number): DbFood => ({
  id,
  name,
  aliases,
  per100: { kcal, protein, carbs, fat },
  unitG,
  defaultG,
})

export const FOODS_DB: DbFood[] = [
  F('pollo', 'Pechuga de pollo', ['pechuga de pollo', 'pechuga', 'pollo'], 165, 31, 0, 3.6, undefined, 150),
  F('muslo-pollo', 'Muslo de pollo', ['muslo de pollo', 'muslo', 'muslos de pollo'], 209, 26, 0, 11, 120),
  F('pavo', 'Pechuga de pavo', ['pechuga de pavo', 'pavo'], 135, 30, 0, 1, undefined, 120),
  F('ternera', 'Ternera magra', ['ternera', 'filete de ternera', 'carne de ternera', 'solomillo'], 170, 26, 0, 7, undefined, 150),
  F('cerdo', 'Lomo de cerdo', ['lomo de cerdo', 'cerdo', 'lomo'], 143, 22, 0, 6, undefined, 150),
  F('carne-picada', 'Carne picada', ['carne picada', 'picada'], 250, 18, 0, 20, undefined, 150),
  F('jamon-serrano', 'Jamón serrano', ['jamon serrano', 'jamon'], 241, 30, 0, 13, 15, 40),
  F('jamon-cocido', 'Jamón cocido', ['jamon cocido', 'jamon york', 'york'], 110, 18, 1, 3, 15, 40),
  F('atun', 'Atún al natural', ['atun al natural', 'atun', 'lata de atun'], 116, 26, 0, 1, 80, 80),
  F('salmon', 'Salmón', ['salmon'], 208, 20, 0, 13, undefined, 150),
  F('merluza', 'Merluza', ['merluza'], 82, 18, 0, 1, undefined, 150),
  F('gambas', 'Gambas', ['gambas', 'langostinos'], 99, 24, 0, 0.3, undefined, 100),
  F('huevo', 'Huevo', ['huevo', 'huevos', 'huevo cocido', 'huevos cocidos'], 143, 12.6, 0.7, 9.5, 60),
  F('clara', 'Clara de huevo', ['clara de huevo', 'claras de huevo', 'claras', 'clara'], 52, 11, 0.7, 0.2, 33),
  F('tortilla-patata', 'Tortilla de patata', ['tortilla de patata', 'tortilla española'], 150, 6, 13, 8.5, undefined, 150),
  F('tortilla-francesa', 'Tortilla francesa', ['tortilla francesa', 'tortilla'], 154, 11, 0.6, 12, undefined, 120),
  F('arroz', 'Arroz cocido', ['arroz cocido', 'arroz blanco', 'arroz'], 130, 2.7, 28, 0.3, undefined, 150),
  F('pasta', 'Pasta cocida', ['pasta cocida', 'pasta', 'macarrones', 'espaguetis', 'espagueti', 'fideos'], 158, 5.8, 31, 0.9, undefined, 180),
  F('pan', 'Pan blanco', ['pan blanco', 'pan', 'barra de pan', 'tostada', 'tostadas'], 265, 9, 49, 3.2, 30),
  F('pan-integral', 'Pan integral', ['pan integral', 'tostada integral', 'tostadas integrales'], 247, 13, 41, 3.4, 30),
  F('patata', 'Patata cocida', ['patata cocida', 'patata', 'patatas', 'papas'], 87, 1.9, 20, 0.1, 150),
  F('boniato', 'Boniato', ['boniato', 'batata'], 90, 2, 21, 0.1, 150),
  F('avena', 'Copos de avena', ['copos de avena', 'avena'], 389, 17, 66, 7, undefined, 50),
  F('cereales', 'Cereales', ['cereales'], 380, 8, 80, 2, undefined, 40),
  F('lentejas', 'Lentejas cocidas', ['lentejas cocidas', 'lentejas'], 116, 9, 20, 0.4, undefined, 200),
  F('garbanzos', 'Garbanzos cocidos', ['garbanzos cocidos', 'garbanzos'], 164, 8.9, 27, 2.6, undefined, 150),
  F('alubias', 'Alubias cocidas', ['alubias cocidas', 'alubias', 'judias blancas'], 127, 8.7, 23, 0.5, undefined, 150),
  F('platano', 'Plátano', ['platano', 'platanos', 'banana'], 89, 1.1, 23, 0.3, 120),
  F('manzana', 'Manzana', ['manzana', 'manzanas'], 52, 0.3, 14, 0.2, 180),
  F('naranja', 'Naranja', ['naranja', 'naranjas', 'mandarina'], 47, 0.9, 12, 0.1, 150),
  F('pera', 'Pera', ['pera', 'peras'], 57, 0.4, 15, 0.1, 170),
  F('fresas', 'Fresas', ['fresas', 'fresa'], 32, 0.7, 7.7, 0.3, undefined, 150),
  F('uvas', 'Uvas', ['uvas'], 69, 0.7, 18, 0.2, undefined, 120),
  F('aguacate', 'Aguacate', ['aguacate'], 160, 2, 9, 15, 150),
  F('tomate', 'Tomate', ['tomate', 'tomates'], 18, 0.9, 3.9, 0.2, 120),
  F('lechuga', 'Lechuga', ['lechuga', 'ensalada'], 15, 1.4, 2.9, 0.2, undefined, 80),
  F('brocoli', 'Brócoli', ['brocoli'], 34, 2.8, 7, 0.4, undefined, 150),
  F('espinacas', 'Espinacas', ['espinacas'], 23, 2.9, 3.6, 0.4, undefined, 100),
  F('zanahoria', 'Zanahoria', ['zanahoria', 'zanahorias'], 41, 0.9, 10, 0.2, 80),
  F('pepino', 'Pepino', ['pepino'], 15, 0.7, 3.6, 0.1, 200),
  F('champinones', 'Champiñones', ['champinones', 'setas'], 22, 3.1, 3.3, 0.3, undefined, 100),
  F('aceite', 'Aceite de oliva', ['aceite de oliva', 'aceite'], 884, 0, 0, 100, 10),
  F('mantequilla', 'Mantequilla', ['mantequilla'], 717, 0.9, 0.1, 81, 10),
  F('queso-fresco', 'Queso fresco', ['queso fresco', 'requeson', 'queso batido'], 98, 11, 3.4, 4.3, undefined, 100),
  F('queso', 'Queso curado', ['queso curado', 'queso'], 402, 25, 1.3, 33, 20),
  F('mozzarella', 'Mozzarella', ['mozzarella', 'mozarela'], 280, 28, 3, 17, undefined, 100),
  F('yogur', 'Yogur natural', ['yogur natural', 'yogur', 'yogurt', 'yogures'], 61, 3.5, 4.7, 3.3, 125),
  F('yogur-griego', 'Yogur griego', ['yogur griego'], 97, 9, 4, 5, 125),
  F('skyr', 'Skyr', ['skyr'], 63, 11, 4, 0.2, 150),
  F('cafe-con-leche', 'Café con leche', ['cafe con leche'], 40, 2, 3, 1.5, 200),
  F('cafe', 'Café solo', ['cafe solo', 'cafe', 'expreso'], 2, 0.1, 0, 0, 60),
  F('leche', 'Leche entera', ['leche entera', 'leche'], 61, 3.2, 4.8, 3.3, 250),
  F('leche-desnatada', 'Leche desnatada', ['leche desnatada'], 34, 3.4, 5, 0.1, 250),
  F('whey', 'Proteína en polvo (whey)', ['proteina en polvo', 'whey', 'batido de proteinas', 'scoop de proteina', 'proteina'], 400, 80, 8, 7, 30),
  F('crema-cacahuete', 'Crema de cacahuete', ['crema de cacahuete', 'mantequilla de cacahuete'], 588, 25, 20, 50, 15),
  F('almendras', 'Almendras', ['almendras'], 579, 21, 22, 50, undefined, 30),
  F('nueces', 'Nueces', ['nueces'], 654, 15, 14, 65, undefined, 30),
  F('cacahuetes', 'Cacahuetes', ['cacahuetes'], 567, 26, 16, 49, undefined, 30),
  F('chocolate', 'Chocolate negro', ['chocolate negro', 'chocolate'], 546, 5, 60, 31, 10),
  F('galletas', 'Galletas', ['galletas', 'galleta'], 450, 6, 70, 16, 8),
  F('pizza', 'Pizza', ['pizza'], 266, 11, 33, 10, 100),
  F('hamburguesa', 'Hamburguesa', ['hamburguesa'], 250, 15, 22, 12, 200),
  F('hummus', 'Hummus', ['hummus'], 166, 8, 14, 10, undefined, 50),
  F('tofu', 'Tofu', ['tofu'], 76, 8, 1.9, 4.8, undefined, 100),
  F('cerveza', 'Cerveza', ['cerveza', 'caña', 'canya'], 43, 0.5, 3.6, 0, 250),
  F('vino', 'Vino', ['vino'], 85, 0.1, 2.6, 0, 150),
  F('refresco', 'Refresco de cola', ['refresco', 'coca cola', 'cola'], 42, 0, 10.6, 0, 330),
  F('zumo', 'Zumo de naranja', ['zumo de naranja', 'zumo'], 45, 0.7, 10, 0.2, 200),
]

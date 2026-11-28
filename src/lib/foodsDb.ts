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

/**
 * Extended generic catalogue (fruit, meat, fish, Spanish dishes, fast food, drinks…). Per 100 g, approximate values
 * from typical composition tables. Format: name|kcal|protein|carbs|fat|portion (u = one unit)|alias;alias
 */
const MORE = `
Plátano de Canarias|90|1.2|20|0.3|u120|
Manzana Golden|52|0.3|12|0.2|u180|manzana golden
Manzana asada|90|0.4|22|0.2|u180|
Mandarina|47|0.8|11|0.3|u90|mandarinas
Limón|29|1.1|9|0.3|u100|limones
Pomelo|38|0.8|9|0.1|u250|
Kiwi|61|1.1|12|0.5|u90|kiwis
Piña natural|50|0.5|12|0.1|150|pina
Piña en su jugo (lata)|60|0.4|14|0.1|150|pina en lata
Sandía|30|0.6|7.6|0.2|300|sandia
Melón|34|0.8|8|0.2|250|melon
Melocotón|39|0.9|9.5|0.3|u150|melocotones
Melocotón en almíbar|74|0.4|18|0.1|u60|
Nectarina|44|1.1|10|0.3|u140|nectarinas
Paraguayo|40|0.9|9|0.2|u120|paraguayos
Albaricoque|48|1.4|11|0.4|u45|albaricoques
Cereza|63|1.1|16|0.2|150|cerezas;picota
Ciruela|46|0.7|11|0.3|u65|ciruelas
Higo|74|0.8|19|0.3|u50|higos
Breva|70|1.2|16|0.3|u70|brevas
Granada|83|1.7|19|1.2|u200|
Caqui|70|0.6|18|0.2|u170|persimon
Chirimoya|75|1.6|18|0.7|u250|
Mango|60|0.8|15|0.4|u200|
Papaya|43|0.5|11|0.3|200|
Maracuyá|97|2.2|23|0.7|u40|maracuya
Coco fresco|354|3.3|15|33|50|coco
Arándanos|57|0.7|14|0.3|125|arandanos
Frambuesas|52|1.2|12|0.7|125|frambuesa
Moras|43|1.4|10|0.5|125|mora
Frutos rojos congelados|45|1|9|0.4|150|frutos del bosque
Dátiles|282|2.5|75|0.4|u8|datil;dates
Pasas|299|3.1|79|0.5|30|uvas pasas
Orejones|241|3.4|63|0.5|30|
Ciruelas pasas|240|2.2|64|0.4|u10|
Macedonia de frutas|55|0.7|13|0.2|200|ensalada de frutas
Compota de manzana|68|0.2|17|0.1|100|
Cebolla|40|1.1|9|0.1|u150|cebollas
Cebolla caramelizada|140|1.2|22|5|40|
Ajo|149|6.4|33|0.5|u5|ajos
Puerro|61|1.5|14|0.3|u150|puerros
Pimiento rojo|31|1|6|0.3|u180|pimiento
Pimiento verde|20|0.9|4.6|0.2|u120|
Pimientos de Padrón fritos|110|1.5|5|9|100|pimientos de padron
Pimientos del piquillo|30|1|5|0.3|80|piquillos
Calabacín|17|1.2|3.1|0.3|u250|calabacin
Berenjena|25|1|6|0.2|u300|berenjenas
Calabaza|26|1|6.5|0.1|200|
Coliflor|25|1.9|5|0.3|200|
Col|25|1.3|6|0.1|150|repollo;berza
Col lombarda|31|1.4|7|0.2|150|lombarda
Coles de Bruselas|43|3.4|9|0.3|150|
Kale|49|4.3|9|0.9|80|col rizada
Acelgas|19|1.8|3.7|0.2|200|acelga
Rúcula|25|2.6|3.7|0.7|50|rucula
Canónigos|21|2|3.6|0.4|50|canonigos
Escarola|17|1.3|3.4|0.2|80|
Endibia|17|1.3|3.4|0.2|80|endivia
Apio|16|0.7|3|0.2|80|
Alcachofa|47|3.3|11|0.2|u120|alcachofas
Espárragos trigueros|20|2.2|3.9|0.1|150|esparragos verdes;esparragos
Espárragos blancos en conserva|19|1.9|2.5|0.3|120|
Judías verdes|31|1.8|7|0.1|200|judias verdes
Guisantes|81|5.4|14|0.4|150|
Habas|88|7.9|18|0.7|150|
Maíz dulce|86|3.3|19|1.4|80|maiz;millo
Remolacha cocida|44|1.7|10|0.2|100|remolacha
Rábanos|16|0.7|3.4|0.1|50|rabanitos
Nabo|28|0.9|6.4|0.1|150|
Hinojo|31|1.2|7|0.2|150|
Cardo|20|0.7|4.1|0.1|150|
Setas shiitake|34|2.2|7|0.5|100|shiitake
Tomate cherry|18|0.9|3.9|0.2|100|cherrys
Tomate triturado|32|1.6|7|0.3|150|
Tomate frito|85|1.5|11|3.8|60|
Tomate seco en aceite|213|5|23|14|20|
Pisto|75|1.4|6|5|200|
Escalivada|80|1.2|7|5|150|
Parrillada de verduras|75|2|8|4|200|verduras a la plancha
Verduras salteadas|80|2.2|8|4.5|200|menestra;verduras
Ensalada mixta|45|1.8|4|2.5|250|
Ensalada César con pollo|140|9|6|9|300|ensalada cesar
Ensalada de pasta|165|5|20|7|250|
Ensalada rusa|170|3.5|11|13|150|ensaladilla rusa;ensaladilla
Ensalada griega|105|3.5|4.5|8|250|
Crema de verduras|45|1.2|6|1.8|300|pure de verduras
Crema de calabaza|50|1|7|2|300|
Crema de calabacín|45|1.5|4.5|2.3|300|
Gazpacho|44|0.9|4|2.6|300|
Salmorejo|125|2.5|10|8.5|250|
Sopa de pollo con fideos|40|2.5|5|1|300|sopa de fideos;caldo con fideos
Caldo de pollo|10|1.2|0.5|0.4|250|caldo
Sopa de verduras|30|0.9|5|0.7|300|
Puré de patata|110|2|15|4.5|200|pure de patatas
Patatas fritas caseras|312|3.4|41|15|150|patatas fritas
Patatas fritas de bolsa|536|6.6|53|34|40|patatas chips;chips
Patatas bravas|180|2.5|20|10|200|bravas
Patatas asadas|110|2.5|24|0.2|200|patata asada
Patatas al horno congeladas|165|2.8|27|5|150|
Patatas guisadas|95|3|13|3.5|300|patatas a la riojana
Ñoquis|150|4|32|0.5|180|noquis;gnocchi
Yuca cocida|125|1|30|0.3|150|mandioca
Contramuslo de pollo|180|20|0|11|120|contramuslos
Alitas de pollo|220|18|0|16|u40|alitas
Pollo asado|220|25|0|13|200|pollo al horno
Pollo empanado|250|19|14|13|150|san jacobo de pollo
Nuggets de pollo|296|15|18|18|u18|nuggets;nugget
Pollo al curry|135|13|5|7|300|curry de pollo
Pollo al ajillo|215|22|1|13|200|
Pollo frito crujiente|290|21|11|18|150|pollo frito
Carne picada de pollo|143|17|0|8|150|
Hamburguesa de pollo (carne)|150|18|3|7|u100|burger de pollo
Salchichas de pollo|180|13|4|12|u40|
Pavo picado|150|19|0|8|150|
Solomillo de cerdo|120|22|0|3.5|150|
Chuleta de cerdo|230|20|0|16|u150|chuletas
Costillas de cerdo|290|18|0|24|200|costillas
Secreto ibérico|330|16|0|29|150|secreto
Presa ibérica|240|18|0|19|150|presa
Panceta|450|13|1|44|60|
Bacon|417|13|1.4|40|u15|beicon;baicon
Lomo adobado|140|20|1|6|120|
Cinta de lomo|143|22|0|6|120|
Chorizo fresco|300|16|2|25|u80|
Chorizo criollo|290|16|2|24|u90|criollo
Morcilla|380|14|3|35|80|
Butifarra|300|16|1|26|u100|
Salchichas frescas|290|14|2|25|u70|salchicha;salchichas
Salchichas Frankfurt|270|12|2|24|u50|frankfurt
Albóndigas en salsa|180|12|7|12|250|albondigas
Solomillo de ternera|155|26|0|5.5|150|
Entrecot|250|22|0|18|250|
Chuletón de ternera|260|21|0|19|350|chuleton
Redondo de ternera|135|23|0|4.5|150|
Ternera guisada|150|16|4|8|300|estofado de ternera;guiso de carne
Hamburguesa de ternera (carne)|220|18|1|16|u120|burger de ternera
Escalope empanado|260|21|14|13|150|filete empanado;milanesa
Cordero asado|290|24|0|21|200|cordero
Chuletillas de cordero|280|23|0|21|150|chuletillas
Conejo|140|22|0|5.5|200|
Codorniz|190|22|0|11|u100|codornices
Pato|230|19|0|17|150|magret
Hígado de ternera|135|20|4|3.6|120|higado
Callos|140|13|2|9|300|callos a la madrileña
Carrillada al vino|180|20|3|9|250|carrilleras
Bacalao fresco|82|18|0|0.7|150|bacalao
Bacalao desalado|110|26|0|1|150|
Lubina|97|18|0|2.5|200|
Dorada|100|19|0|2.5|200|
Trucha|120|20|0|4|180|
Rape|75|16|0|1|150|
Lenguado|85|18|0|1.2|150|
Gallo|80|17|0|1.2|150|
Emperador|120|20|0|4.5|150|pez espada
Atún fresco|144|23|0|5|150|atun rojo
Bonito del norte|140|24|0|4.5|150|bonito
Caballa|205|19|0|14|150|
Sardinas frescas|160|20|0|9|150|sardinas;sardina
Sardinas en aceite (lata)|220|24|0|14|80|
Boquerones en vinagre|130|20|1|5|60|boquerones
Boquerones fritos|240|20|8|14|150|
Anchoas en aceite|210|29|0|10|20|anchoas
Caballa en aceite (lata)|230|22|0|16|80|
Atún en aceite (lata)|198|26|0|10|80|atun en aceite
Mejillones al vapor|86|12|4|2.2|200|mejillones
Mejillones en escabeche (lata)|160|16|5|8|80|
Almejas|74|13|2.6|1|150|
Berberechos (lata)|90|16|2|1.5|60|berberechos
Calamares|92|16|3|1.4|150|calamar
Calamares a la romana|230|11|18|13|150|rabas;calamares fritos
Chipirones a la plancha|110|17|2|3.5|150|chipirones
Sepia|80|16|1|0.9|200|
Pulpo a la gallega|140|17|5|6|200|pulpo;pulpo a feira
Gambas al ajillo|180|17|2|12|150|
Langostinos cocidos|90|21|0|0.8|150|
Palitos de cangrejo|95|8|13|1|u18|surimi
Gulas|110|8|10|4|100|
Merluza rebozada|190|14|11|10|150|pescado rebozado
Varitas de merluza|210|12|19|10|u25|palitos de pescado;fingers de pescado
Salmón ahumado|180|23|0|10|60|
Poke de salmón|150|8|18|5|350|poke bowl;poke
Huevo frito|196|13|0.8|15|u60|huevos fritos
Huevos revueltos|170|11|1.5|13|120|huevo revuelto;revuelto
Huevo poché|143|12.6|0.7|9.5|u60|huevo escalfado
Tortilla de claras|60|11|1|1|150|
Tortilla de patatas con cebolla|165|6|12|10.5|150|tortilla española con cebolla;pincho de tortilla
Revuelto de champiñones|120|8|2|9|200|
Huevos rellenos|200|10|3|17|u50|
Huevos rotos con jamón|190|9|11|12|300|huevos rotos;huevos estrellados
Leche semidesnatada sin lactosa|46|3.2|4.7|1.6|250|leche sin lactosa
Leche de cabra|69|3.6|4.5|4.1|250|
Leche condensada|321|7.9|54|8.7|20|
Leche evaporada|134|6.8|10|7.6|50|
Bebida de avena|46|0.8|7.5|1.4|250|leche de avena
Bebida de soja|40|3.3|1.6|1.8|250|leche de soja
Bebida de almendra|24|0.5|2.4|1.3|250|leche de almendra;leche de almendras
Bebida de arroz|55|0.3|11|1|250|leche de arroz
Nata para cocinar|180|2.8|4|17|50|nata
Nata para montar|337|2.1|2.8|35|50|
Nata montada en spray|260|2.5|9|24|20|
Yogur natural desnatado|40|4.3|5.5|0.2|u125|yogur desnatado
Yogur de sabores|85|3.2|13|2|u125|yogur de fresa
Yogur griego ligero|65|6|5|2|u125|
Yogur proteico|60|10|4|0.4|u120|yogur de proteinas
Yogur de soja|55|4|3|2.3|u125|
Kéfir|55|3.3|4.5|2.5|200|kefir
Cuajada|90|5|5.5|5.5|u125|
Natillas|120|3.3|19|3.3|u125|natilla
Flan de huevo|130|5|20|3.5|u110|flan
Arroz con leche|130|3.2|22|3|150|
Mousse de chocolate|220|4|23|12|u70|mousse
Petit suisse|140|7|14|6|u55|petit
Actimel / L. casei|72|2.8|11|1.6|u100|actimel;l casei
Batido de chocolate|80|3.3|12|2|u200|batido
Queso manchego curado|420|26|0.5|35|30|manchego
Queso semicurado|390|23|1|32|30|queso semi
Queso tierno|300|20|2|24|40|
Queso de cabra rulo|300|19|1|24|30|queso de cabra
Queso de oveja|410|25|1|34|30|
Queso Brie|334|21|0.5|28|30|brie
Queso Camembert|300|20|0.5|24|30|camembert
Queso azul|353|21|2.3|29|30|roquefort;cabrales
Queso Parmesano|431|38|3.2|29|15|parmesano
Queso Emmental|380|28|1.5|29|30|emmental
Queso Edam|357|25|1.4|28|30|edam
Queso Cheddar|403|25|1.3|33|25|cheddar
Queso Gouda|356|25|2.2|27|30|gouda
Queso en lonchas (sándwich)|300|18|5|23|u20|queso en lonchas;loncha de queso
Queso rallado|390|27|2|30|20|
Queso feta|264|14|4|21|40|feta
Ricotta|174|11|3|13|60|
Mascarpone|430|4.8|4.8|44|30|
Queso crema untar|250|6|4|23|30|queso crema;philadelphia
Queso crema light|150|8|5|11|30|
Burrata|280|14|2|24|80|
Cottage cheese|98|11|3.4|4.3|150|cottage
Queso de Burgos|170|12|4|11.5|80|queso de burgos
Jamón ibérico|375|43|0.5|22|40|jamon iberico;iberico
Chorizo ibérico|455|24|2|39|30|chorizo
Salchichón|440|25|2|37|30|salchichon
Lomo embuchado|240|40|1|9|30|lomo iberico
Fuet|480|28|2|40|30|
Salami|400|21|2|34|30|
Mortadela|310|13|3|28|30|
Chopped|230|12|4|18|30|
Sobrasada|600|13|2|60|20|
Paté|320|11|4|29|30|pate;foie
Fiambre de pavo|105|16|3|3|30|pavo en lonchas
Pechuga de pollo en lonchas|100|18|2|2|30|fiambre de pollo
Cecina|250|40|0.5|9|40|
Pan de molde blanco|265|8|48|4|u30|pan de molde;pan bimbo
Pan de centeno|250|8.5|48|3|u40|
Pan de semillas|290|11|42|8|u40|
Pan de hamburguesa|290|9|50|5.5|u60|
Pan de perrito|290|9|50|5.5|u50|
Pan de pita|275|9|55|1.2|u60|pita
Tortilla de trigo (wrap)|310|8.5|52|7.5|u60|wrap;tortillas de trigo;tortitas de trigo
Tortitas de maíz|380|8|80|3|u8|
Tortitas de arroz|387|8|82|2.8|u8|
Biscotes|395|11|73|6|u8|biscote
Picos y colines|410|11|70|9|20|picos;colines;regañas
Croissant|406|8|46|21|u60|croissant;cruasan
Croissant de chocolate|420|7.5|46|23|u70|napolitana de chocolate;napolitana
Pan con tomate y aceite|230|6|33|8|u80|pantumaca;pa amb tomaquet;pan con tomate
Tostada con aguacate|210|5|22|11|u110|tostada de aguacate
Arroz integral cocido|123|2.7|26|1|150|arroz integral
Arroz crudo|358|7|79|0.6|80|
Arroz de paella|355|6.5|79|0.6|80|
Arroz vaporizado|350|8|77|1|80|
Pasta integral cocida|124|5.3|26|0.5|180|pasta integral
Pasta cruda|360|12.5|72|1.5|80|
Pasta rellena (ravioli)|220|9|30|7|200|ravioli;tortellini
Cuscús cocido|112|3.8|23|0.2|150|cuscus;couscous
Quinoa cocida|120|4.4|21|1.9|150|quinoa;quinua
Bulgur cocido|83|3|19|0.2|150|
Mijo cocido|119|3.5|23|1|150|
Trigo sarraceno cocido|92|3.4|20|0.6|150|
Sémola de trigo|360|12|73|1|60|semola
Harina de trigo|364|10|76|1|30|harina
Harina de avena|380|13|60|7|40|
Pan rallado|395|13|72|5|20|
Muesli|370|10|62|8|50|
Granola|450|10|60|18|50|
Cereales integrales|355|11|68|3.5|40|all bran
Cereales de chocolate|400|7|74|8|40|
Corn flakes|378|7|84|0.9|40|copos de maiz
Fideos instantáneos (ramen)|450|9|62|18|85|yatekomo;ramen instantaneo
Palomitas|390|12|65|9|30|
Palomitas de microondas con mantequilla|500|8|55|27|50|
Lentejas con chorizo|135|7.5|13|6|300|lentejas estofadas
Lentejas con verduras|95|6|13|2|300|
Garbanzos con espinacas|125|6|13|5.5|300|potaje
Cocido madrileño|160|10|13|7.5|400|cocido;puchero
Fabada asturiana|185|9|13|11|350|fabada
Judías con chorizo|150|8|14|7|300|alubias con chorizo
Alubias en bote|100|6.5|15|0.6|200|
Edamame|122|11|9|5|100|
Soja texturizada|340|50|25|1|40|
Seitán|120|22|4|1.5|100|seitan
Tempeh|193|19|9|11|100|
Heura|130|18|4|4.5|100|
Hamburguesa vegetal|200|14|12|11|u100|burger vegana
Falafel|333|13|32|18|u20|
Anacardos|553|18|30|44|30|
Pistachos|560|20|28|45|30|
Avellanas|628|15|17|61|30|
Pipas de girasol|584|21|20|51|30|pipas
Pipas de calabaza|559|30|11|49|30|
Semillas de chía|486|17|42|31|15|chia
Semillas de lino|534|18|29|42|15|lino
Semillas de sésamo|573|18|23|50|10|sesamo
Castañas asadas|196|2.7|40|2|100|castañas
Mix de frutos secos|590|18|20|50|30|frutos secos
Nueces de macadamia|718|8|14|76|30|macadamia
Pistachos tostados con sal|570|20|27|46|30|
Quicos|430|8|70|12|40|kikos;maiz frito
Aceite de girasol|884|0|0|100|10|
Aceite de coco|862|0|0|100|10|
Margarina|720|0.2|1|80|10|
Mayonesa|680|1|1.5|75|15|
Mayonesa ligera|330|0.7|9|32|15|mayonesa light
Alioli|650|1.5|3|70|20|allioli
Kétchup|112|1.2|26|0.2|15|ketchup;catsup
Mostaza|66|4|5|3.5|10|
Salsa barbacoa|170|1|40|0.6|25|barbacoa
Salsa rosa|420|1|9|43|20|
Salsa de soja|60|8|6|0|10|soja
Salsa césar|480|2|5|50|20|
Salsa de yogur|180|3|7|15|25|
Salsa brava|110|1.5|9|7.5|40|
Salsa boloñesa|110|6|6|7|120|bolonesa
Salsa carbonara|220|6|5|19|100|carbonara
Pesto|480|5|5|49|30|
Guacamole|155|2|8|14|50|
Vinagre|20|0|0.9|0|10|
Vinagreta|450|0.2|3|48|15|
Miel|304|0.3|82|0|20|
Azúcar|400|0|100|0|8|azucar
Azúcar moreno|380|0|98|0|8|
Sirope de agave|310|0|76|0|15|agave
Mermelada|250|0.4|62|0.1|20|
Mermelada sin azúcar|110|0.5|25|0.2|20|
Nocilla / crema de cacao|539|6|57|31|15|nutella;nocilla;crema de cacao
Cacao puro en polvo|230|20|12|13|10|cacao
Cacao soluble (Cola Cao)|380|6|77|3|15|colacao;cola cao;nesquik
Levadura nutricional|340|45|30|5|5|
Paella mixta|160|8|20|5|350|paella
Paella de marisco|145|8|19|4|350|arroz de marisco
Arroz negro|150|7|20|4.5|350|
Arroz a la cubana|170|4.5|24|6|400|
Arroz tres delicias|165|5|23|5.5|250|
Arroz con pollo|155|9|19|4.5|350|
Risotto de setas|145|3.5|20|5.5|300|risotto
Fideuá|170|8|21|6|350|fideua
Macarrones con tomate y carne|165|8|20|6|350|macarrones boloñesa
Espaguetis carbonara|230|9|24|11|350|pasta carbonara
Espaguetis boloñesa|160|8|20|5.5|350|pasta boloñesa
Pasta al pesto|230|6.5|28|10|300|
Lasaña de carne|165|9|13|9|350|lasaña;lasana
Canelones|170|8|14|9|300|
Croquetas de jamón|240|7|21|14|u30|croquetas;croqueta
Empanadillas|290|7|28|17|u40|empanadilla
Empanada de atún|280|9|28|15|120|empanada gallega;empanada
Montadito de lomo|250|14|26|10|u80|montadito
Bocadillo de jamón serrano|270|14|35|8|u180|bocadillo de jamon;bocata de jamon
Bocadillo de tortilla|220|8|27|9|u220|bocata de tortilla
Bocadillo de lomo con queso|255|15|27|10|u200|serranito
Bocadillo de calamares|265|11|30|11|u200|
Bocadillo de chorizo|350|13|34|18|u160|bocata de chorizo
Bocadillo de atún|240|13|28|8|u180|
Sándwich mixto|270|13|27|12|u120|sandwich mixto;sandwich de jamon y queso
Sándwich vegetal con atún|215|9|22|10|u180|sandwich vegetal
Sándwich de pollo|220|13|24|8|u180|sandwich de pollo
Pincho de chistorra|380|14|18|28|u80|chistorra
Torreznos|620|25|1|57|60|torrezno
Migas|260|7|28|13|250|
Flamenquín|270|13|16|17|u180|flamenquin
Cachopo|260|17|14|15|300|
San Jacobo|270|13|18|16|u100|
Pimientos rellenos|130|7|8|8|250|
Berenjenas rellenas|110|5|7|7|300|
Moussaka|140|7|8|9|300|musaka
Quiche lorraine|300|10|20|20|150|quiche
Crepe salado|220|10|20|11|150|crepe
Pizza margarita|235|11|30|8|350|
Pizza barbacoa|250|12|30|9|400|
Pizza cuatro quesos|285|13|29|13|350|
Pizza jamón y queso|245|12|30|8.5|350|pizza prosciutto
Pizza pepperoni|285|12|30|13|350|pizza peperoni
Pizza vegetal|210|8|29|7|350|
Pizza carbonara|270|11|29|12|350|
Gyozas|200|8|23|8|u22|gyoza;empanadillas japonesas
Rollitos de primavera|220|5|25|11|u60|rollito de primavera
Sushi (maki variado)|145|5|28|1.5|200|sushi;maki
Nigiri de salmón|165|8|24|4|u30|nigiri
Tallarines fritos con pollo|180|8|23|6|350|yakisoba;noodles;tallarines
Pad thai|190|9|24|6.5|350|
Arroz frito chino|180|5|27|6|300|
Pollo agridulce|190|11|21|7|300|
Ternera con salsa de ostras|140|13|6|7|250|
Burrito de pollo|195|10|23|7|300|burrito
Tacos de carne|210|11|20|9|u100|tacos;taco
Quesadilla|290|13|27|14|150|quesadillas
Nachos con queso|345|9|32|20|200|nachos
Fajitas de pollo|180|12|18|6.5|300|fajitas;fajita
Kebab (durum) de ternera|220|12|22|9|350|durum;kebab
Kebab de pollo en pan|200|13|22|7|350|doner;shawarma
Lahmacun|240|10|33|7|250|
Perrito caliente|290|11|24|17|u150|hot dog
Big Mac (McDonald's)|230|12|19|12|u220|big mac;bigmac
McPollo / McChicken|240|11|23|12|u185|mcpollo;mcchicken
Cheeseburger (McDonald's)|260|14|27|11|u115|cheeseburger
McNuggets|255|15|17|14|u18|mcnuggets
Patatas fritas McDonald's / Burger King|300|3.4|38|15|115|patatas de mcdonalds;patatas medianas
Whopper (Burger King)|235|11|18|13|u280|whopper
Long Chicken (Burger King)|265|11|24|14|u200|long chicken
CBO / hamburguesa de pollo crujiente|250|11|22|13|u230|cbo
McFlurry|190|3.5|28|7|u185|mcflurry
Alitas KFC|290|20|9|20|u45|alitas kfc
Tiras de pollo KFC|250|20|12|14|u45|tiras de pollo;crispy chicken
Wrap de pollo crujiente|235|11|24|11|u230|mcwrap
Menú ensalada de pollo (cadena)|110|10|6|5|300|
Hamburguesa completa casera|230|14|18|12|u250|hamburguesa completa
Hamburguesa doble con queso|265|16|17|15|u300|doble cheeseburger
Subway pavo 15 cm|180|10|27|3.5|u220|subway
Chocolate con leche|535|7.6|59|30|25|
Chocolate blanco|540|6|59|32|25|
Bombones|540|6|55|32|u12|bombon
Barrita de chocolate (Kinder Bueno)|575|8.6|49|37|u43|kinder bueno
Snickers|480|9|60|23|u50|snickers
Twix|495|4.5|64|24|u50|
Kit Kat|510|6|63|26|u42|kitkat
Donut glaseado|420|5|49|23|u55|donut;donuts;rosquilla
Dónut de chocolate|440|5.5|47|26|u60|donut de chocolate
Magdalena|400|5.5|50|20|u35|magdalenas
Sobao|420|6|52|21|u40|sobaos
Ensaimada|400|7|50|19|u70|
Palmera de chocolate|500|5.5|50|31|u90|palmera
Churros|350|4.5|40|19|u25|churro
Porras|360|5|40|20|u60|porra
Chocolate a la taza|100|3|15|3.5|200|chocolate caliente
Torrijas|230|5|30|10|u100|torrija
Bizcocho casero|350|6|50|14|60|bizcocho
Tarta de queso|320|6|25|22|120|cheesecake
Tarta de chocolate|380|5|45|21|100|tarta
Tarta de Santiago|430|11|45|23|90|
Brownie|440|5.5|52|24|70|
Tiramisú|290|5|30|17|120|tiramisu
Crema catalana|180|4|22|8|u140|
Helado de vainilla|200|3.5|24|11|100|helado
Helado de chocolate|215|3.8|28|11|100|
Helado tipo Magnum|310|4|29|20|u80|magnum
Sorbete de limón|110|0.2|27|0.1|100|sorbete
Horchata|70|0.5|13|2|300|
Granizado|60|0|15|0|300|
Galletas María|440|7|74|12|u6|galletas maria;maria
Galletas Digestive|480|7|63|21|u15|digestive
Galletas Príncipe|470|6|70|18|u20|principe
Galletas Oreo|480|5|69|20|u11|oreo
Galletas de avena|440|8|63|17|u15|
Galletas Chips Ahoy|490|5.5|65|23|u11|chips ahoy
Turrón de Jijona|550|12|40|38|30|turron
Turrón de Alicante|520|12|48|32|30|
Mazapán|450|9|55|22|30|mazapan
Polvorones|490|6|55|28|u35|polvoron;mantecado
Gominolas|340|6|78|0.2|30|chucherias;chuches
Regaliz|330|3|77|1|20|
Chicle sin azúcar|180|0|60|0|u2|chicle
Barrita de cereales|390|6|68|10|u25|barrita
Barrita de proteínas|360|33|35|10|u55|barrita proteica;barrita de proteina
Doritos|500|7|60|26|40|nachos de bolsa
Cheetos|520|6|58|29|40|gusanitos
Pringles|530|4|52|34|40|
Cortezas de cerdo|545|60|1|33|30|cortezas
Aceitunas verdes|145|1|4|15|30|aceitunas;olivas
Aceitunas negras|185|1.2|6|18|30|
Pepinillos en vinagre|18|0.7|3|0.2|30|pepinillos
Banderillas|60|2|5|3.5|40|
Crackers|470|9|65|19|20|crackers;tuc
Coca-Cola Zero / light|1|0|0|0|330|coca cola zero;coca cola light;refresco zero
Fanta de naranja|40|0|9.5|0|330|fanta
Sprite|18|0|4|0|330|
Aquarius|27|0|6.5|0|330|
Nestea|19|0|4.5|0|330|te frio
Tónica|34|0|8.5|0|200|tonica
Gaseosa|2|0|0.5|0|200|
Bebida energética (Red Bull)|46|0|11|0|250|red bull;redbull
Monster Energy|47|0|11.5|0|500|monster
Monster Ultra (sin azúcar)|3|0|0.9|0|500|monster zero;monster ultra
Bebida isotónica|25|0|6|0|500|powerade;gatorade;isotonica
Zumo de piña|50|0.4|12|0.1|200|zumo de pina
Zumo de manzana|46|0.1|11|0.1|200|
Zumo de melocotón|52|0.3|12.5|0|200|
Zumo multifrutas|46|0.3|11|0|200|
Néctar de naranja|42|0.3|10|0|200|nectar
Smoothie de frutas|60|0.8|14|0.2|250|smoothie;batido de frutas
Café con leche desnatada|25|2.4|3.5|0.1|200|
Cortado|25|1.4|2|1.3|80|
Capuchino|45|2.5|4|2|200|cappuccino;capuccino
Café con leche de avena|35|0.6|5|1.1|200|
Frappé|90|2|14|3|350|frappuccino
Té o infusión|1|0|0.2|0|250|infusion;te verde;manzanilla
Cerveza sin alcohol|24|0.3|5|0|330|cerveza 0,0;cerveza 00
Clara (cerveza con limón)|40|0.2|6|0|330|clara con limon;radler
Cerveza IPA / tostada|55|0.6|5|0|330|ipa
Vino tinto|85|0.1|2.6|0|150|
Vino blanco|82|0.1|2.6|0|150|
Cava|75|0.2|1.5|0|120|champan
Sidra|45|0|3|0|200|
Sangría|75|0.1|8|0|250|sangria
Tinto de verano|50|0|7|0|300|
Vermut|150|0|16|0|80|vermouth
Ron|231|0|0|0|40|
Whisky|250|0|0|0|40|
Ginebra|240|0|0|0|40|gin
Vodka|231|0|0|0|40|
Licor de hierbas|250|0|22|0|30|orujo;licor
Gin tonic|75|0|7|0|300|gintonic
Cubata (ron cola)|90|0|10|0|300|cubata;ron cola
Mojito|110|0|12|0|250|
Proteína whey aislada|370|88|2|1|u30|iso whey;aislado de proteina
Proteína de caseína|360|80|5|2|u30|caseina
Proteína vegana en polvo|380|75|8|6|u30|proteina vegana
Creatina|0|0|0|0|u5|creatina
Ganador de peso (gainer)|380|20|70|3|u100|gainer
Harina de arroz|360|6|80|1|50|
Crema de arroz|370|7|82|1|50|
Tortitas proteicas|200|18|22|4|150|pancakes proteicos
Tortitas / pancakes|230|6|35|7|120|tortitas;pancakes
Gofre|290|6|36|14|u80|gofres;waffle
Porridge de avena con leche|100|4.5|14|2.8|300|porridge;gachas de avena
Bol de yogur con fruta y granola|120|5|18|3.5|300|bowl de yogur
Pudding de chía|110|4|10|6|200|
Claras pasteurizadas|48|10.8|0.7|0.1|200|
Pechuga de pollo a la plancha|165|31|0|3.6|150|pollo a la plancha
Arroz blanco con pollo y brócoli|135|11|16|2.5|400|pollo con arroz
Ensalada de atún|90|9|3|4.5|300|
Bowl de quinoa y pollo|140|10|15|4.5|350|
`

const slugId = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

for (const line of MORE.trim().split('\n')) {
  const [name = '', kcal, protein, carbs, fat, portion = '100', aliases = ''] = line.split('|')
  const unit = portion.startsWith('u')
  const grams = Number(unit ? portion.slice(1) : portion)
  FOODS_DB.push(F(`g-${slugId(name)}`, name, aliases ? aliases.split(';') : [], Number(kcal), Number(protein), Number(carbs), Number(fat), unit ? grams : undefined, unit ? undefined : grams))
}

# FUERA DE LA OFICINA

RPG por turnos sobre qué hacer con el resto del día cuando dejas la vida de oficina.

Alex lleva doce años en SICE, una empresa tecnológica ficticia. La compañía ha ido recortando el teletrabajo hasta dejarlo en nada, y un martes por la mañana Alex se va. La aventura no trata de si irse estuvo bien: trata de qué viene después.

El juego no defiende una tesis. Hay personajes que odian su trabajo, otros que lo disfrutan, otros que no pueden dejarlo porque mantienen a alguien, y otros que se fueron y se arrepintieron. Las conversaciones alimentan cuatro ejes — libertad, seguridad, vínculos y propósito — y esos ejes deciden cuál de los seis finales ves.

---

## Empezar rápido

No hay dependencias. Ni una. No hace falta `npm install`.

```bash
npm run dev      # construye y sirve en http://localhost:5173
```

O simplemente abre `dist/index.html` en el navegador con doble clic. El juego es un único archivo autónomo.

```bash
npm run build    # src/ -> dist/index.html
npm test         # 50 pruebas automatizadas
npm start        # sirve dist/ sin reconstruir
```

Requiere Node 18 o superior (solo para construir y probar; jugar no requiere nada).

---

## Controles

| Acción | Teclado | Móvil |
|---|---|---|
| Moverse | WASD o flechas | joystick |
| Interactuar / avanzar diálogo | E, Espacio o Enter | botón A |
| Menú | M o Esc | botón MENÚ |

En combate se juega con el ratón o el dedo sobre los botones de acción.

---

## Cómo funciona el combate

Cada personaje recibe **3 Puntos de Acción** por turno y los gasta como quiera: tres ataques básicos, una habilidad cara, o una mezcla. El orden lo marca la velocidad y se recalcula cada ronda.

Hay tres elementos — Físico, Mental y Social — y cada enemigo tiene una debilidad y una resistencia. Acertar la debilidad multiplica el daño por 1,6; fallar contra la resistencia lo baja a 0,6. El elemento Físico enfrenta ATK contra DEF, el Mental enfrenta MAG contra RES, y el Social enfrenta MAG contra DEF, así que atraviesa a los enemigos mentalmente blindados.

Quince estados alterados: Ansiedad y Duda hacen daño por turno, Agotamiento y Bloqueo bajan estadísticas, Silencio impide habilidades, Sueño salta el turno pero se rompe al golpear, Provocado atrae ataques, y del lado bueno Motivación, Foco, Muro, Respiración, Contraataque, Celeridad y Claridad, que además da inmunidad temporal a los estados negativos.

El terreno importa. La luz fluorescente de la oficina amplifica el daño Mental un 20%; el aire libre de las rutas regenera energía; el suelo pulido de la Ciudad Financiera potencia lo Social; la superficie del Espejo amplifica Mental y Social a la vez.

Los jefes tienen mecánicas propias: la Reunión Infinita invoca refuerzos cada tres rondas, el Calendario se acelera, el KPI sube sus estadísticas un 12% periódicamente, el Sueldo Fantasma te descuenta dinero, el Mercado Laboral inflige estados al azar, y El Jefe y El Espejo cambian de fase al bajar de HP, curándose y reforzándose.

---

## Arquitectura

```
fuera-de-la-oficina/
├── build.js                    empaquetador sin dependencias
├── package.json
├── vercel.json
├── dist/
│   └── index.html              el juego, autónomo (173 KB)
├── src/
│   ├── shell.html              estructura HTML + CSS (marcador /*__GAME__*/)
│   ├── 01-core-audio-sprites.js
│   ├── 02-data-combat.js
│   ├── 03-data-world.js
│   ├── 04-data-dialogue.js
│   ├── 05-engine-world.js
│   ├── 06-engine-combat.js
│   ├── 07-ui-save-loop.js
│   └── bundle.js               generado por build.js
├── test/
│   └── test.js                 50 pruebas con stubs de DOM
└── tools/
    └── serve.js                servidor estático mínimo
```

`build.js` lee los módulos `NN-*.js` por orden alfabético, los concatena y los inyecta en el marcador `/*__GAME__*/` de `shell.html`. Los prefijos numéricos son el orden de carga: no los cambies sin revisar las dependencias.

**Qué hay en cada módulo:**

- **01** — utilidades, RNG con semilla, audio por Web Audio API (todos los efectos son sintetizados, no hay archivos de sonido) y el sistema de sprites. Los gráficos son rejillas de caracteres con paleta, renderizadas a canvas fuera de pantalla y cacheadas. Los humanoides se componen de torso por dirección más dos fotogramas de piernas, así que un personaje nuevo solo necesita una paleta.
- **02** — estados alterados, las 45 habilidades, 46 objetos, los 5 personajes jugables, 24 enemigos y 10 jefes.
- **03** — tipos de casilla, temas visuales por zona, las 11 zonas, tiendas, capítulos y misiones.
- **04** — todos los guiones de diálogo.
- **05** — generación procedural de zonas, render 2.5D, movimiento y colisiones, interacción.
- **06** — motor de combate completo y su render.
- **07** — interfaz, diálogos, menús, tiendas, guardado, finales y bucle principal.

**Render.** Canvas 2D, un solo elemento, sin DOM para el mapa. Las casillas elevadas (muros, árboles, edificios, mesas) se dibujan con cara superior y lateral más sombra proyectada, y todo se ordena por Y para que lo cercano tape lo lejano. Encima va un degradado de luz ambiental, un halo alrededor del personaje en zonas oscuras y partículas de clima.

**Generación de zonas.** Cada zona tiene una semilla fija, así que se regenera idéntica siempre y el guardado no necesita almacenar el mapa. El generador rellena la base, esparce obstáculos con ruido agrupado, coloca agua con puentes y edificios con puerta, y después **talla caminos entre todos los puntos de interés** (NPCs, cofres, salidas, jefes). Eso garantiza que nada quede aislado, y hay una prueba con flood-fill que lo verifica en las 11 zonas.

**Guardado.** `localStorage`, tres ranuras manuales más autoguardado al cambiar de zona y al derrotar un jefe. Todo envuelto en `try/catch`: si el navegador bloquea el almacenamiento, el juego sigue funcionando sin guardar.

---

## Cómo añadir contenido

### Un enemigo

En `src/02-data-combat.js`, dentro del array que se recorre con `.forEach(e => ENEMIES[e.id] = e)`:

```js
E('nuevo_id', 'Nombre Visible', 'correo', cpal('pal1', '#8a8f9e', '#dfe3ee'),
  12,                                            // nivel base
  { hp: 220, atk: 24, def: 18, mag: 20, res: 16, spd: 14 },
  ['e_golpe', 'e_zumbido'],                      // habilidades (claves de SKILLS)
  'soc',                                         // debilidad: fis | men | soc
  'men',                                         // resistencia
  70, 80,                                        // XP y dinero
  ['cable'])                                     // objetos que suelta
```

El tercer argumento es la rejilla del sprite. Las disponibles están en `GRIDS` (módulo 01): `correo`, `notif`, `silla`, `maquina`, `fantasma`, `vagon`, `nube`, `grafico`, `torniquete`, `espejo`, `reloj`, `traje`. Cambiando solo la paleta con `cpal()` obtienes una criatura visualmente distinta. Después añade el id al array `enc` de la zona donde quieras que aparezca.

### Una misión

En `src/03-data-world.js`:

```js
Q('q_mi_mision', 'Título', 'barrio', 'Descripción para el diario.',
  { xp: 300, gold: 400, it: ['tila', 2] })
```

Y en el diálogo correspondiente (módulo 04) la activas y la cierras con efectos:

```js
{ do: { q: 'q_mi_mision' } }                      // activar
{ do: { qdone: 'q_mi_mision', ax: { libertad: 2 } } }   // completar y mover ejes
```

La recompensa se entrega sola al marcar `qdone`. Los efectos disponibles son `flag`, `ax`, `gold`, `it`, `q`, `qdone`, `join`, `ch` y `heal`.

### Un diálogo con decisiones

```js
mi_npc: [
  { w: 'Nombre', t: 'Primera línea.' },
  { c: [
      { l: 'Opción A', then: [ { w: 'Nombre', t: 'Respuesta.' }, { do: { ax: { libertad: 2 } } } ] },
      { l: 'Opción B', then: [ { do: { ax: { seguridad: 2 } } } ] }
  ]}
]
```

Una cadena suelta es narración. `{w, t}` es alguien hablando. Las opciones admiten `req` para condicionarlas a una bandera, capítulo u objeto.

### Una zona

En `ZONES` (módulo 03):

```js
mi_zona: {
  n: 'Nombre', theme: 'forest', w: 48, h: 40, seed: 12345, lvl: 15,
  gen: { base: T.FLOOR, obs: T.TREE, obsAmt: 0.2, tall: 0.2, water: 1 },
  weather: 'fog',
  enc: ['domingo', 'recuerdo'], encRate: 0.03, encTiles: [T.TALL],
  npcs: [ { x: 20, y: 20, n: 'Alguien', p: 'npc_g', s: 'mi_npc' } ],
  chests: [ { x: 5, y: 5, it: 'tila', n: 2 } ],
  exits: [ { x: 4, y: 20, to: 'bosque', tx: 48, ty: 24, label: 'Bosque', need: { ch: 8 } } ]
}
```

Los temas visuales están en `THEMES`; los climas son `rain`, `snow`, `fog`, `wind`, `sand` y `ash`. Recuerda añadir la salida recíproca en la zona vecina, y ejecuta `npm test` después: las pruebas verifican que las salidas apuntan a zonas reales y que ningún punto de interés queda inalcanzable.

---

## Pruebas

```bash
npm test
```

50 pruebas en nueve bloques, con stubs de DOM y Canvas para correr en Node sin navegador:

1. **Conectividad** — flood-fill en las 11 zonas comprobando que ningún NPC, cofre, salida ni jefe queda aislado.
2. **Integridad de datos** — todas las salidas, enemigos, jefes, habilidades, objetos, diálogos y misiones referenciados existen.
3. **Progresión** — curva de XP, subida de nivel, aprendizaje de habilidades, escalado de estadísticas.
4. **Combate** — daño, debilidades, resistencias, estados, victoria.
5. **Inventario y economía** — equipar, precios, restricciones por personaje.
6. **Guardado** — ida y vuelta conservando capítulo, oro, banderas, misiones, ejes, equipo, posición e inventario.
7. **Narrativa** — efectos de diálogo, recompensas, los 6 finales alcanzables, puertas bloqueadas por capítulo.
8. **Simulación** — 50 combates automáticos contra grupos de 2-3 enemigos y los 10 jefes con un equipo del nivel esperado.
9. **Volumen de contenido** — recuento informativo.

---

## Desplegar en Vercel

Sube el repositorio a GitHub y conéctalo en Vercel. `vercel.json` ya lo configura:

```json
{ "buildCommand": "node build.js", "outputDirectory": "dist", "installCommand": "echo \"sin dependencias\"" }
```

También vale subir `dist/` a cualquier hosting estático: GitHub Pages, Netlify, un bucket. No hay backend, no hay rutas de servidor, no hay variables de entorno.

**Aviso honesto:** este proyecto se preparó en un entorno sin acceso a red, así que el despliegue en Vercel no está verificado por mí. `npm run build` y `npm test` sí se ejecutaron y pasan. Al no haber dependencias que instalar, el riesgo de que el build falle en Vercel es bajo, pero no puedo afirmar que lo he comprobado.

---

## Contenido

11 zonas · 24 enemigos · 10 jefes · 5 personajes jugables · 45 habilidades · 46 objetos · 41 NPCs con diálogo · 37 cofres · 30 misiones · 14 capítulos · 6 finales · 7 tiendas

**Duración estimada: 3 a 5 horas** completando las misiones secundarias. No son las diez horas de un RPG largo; los sistemas están completos, lo que falta para llegar ahí es volumen de zonas, enemigos y misiones, no arquitectura.

### Los seis finales

Se deciden por el eje dominante entre libertad, seguridad, vínculos y propósito. Si dos van casi empatados sale el final de equilibrio; si apenas tomaste decisiones, sale el de la deriva. Ninguno está planteado como el correcto.

---

## Sobre SICE

SICE aparece como organización **ficticia**. La historia es una obra de ficción sobre una situación laboral genérica, no un retrato de ninguna empresa real ni de personas reales.

## Licencia

MIT. Todo el arte es procedural y todo el audio está sintetizado en tiempo real: no hay activos de terceros en el proyecto.

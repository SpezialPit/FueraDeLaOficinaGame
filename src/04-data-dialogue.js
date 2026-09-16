/* ---------- 15. DIÁLOGOS ---------- */
/* Nodo: string | {w,t} | {do:{...}} | {c:[{l, then:[], req:{}}]} | {if:'flag', then:[], else:[]} */
const DLG = {
  /* ===== OFICINA ===== */
  marta_of: [
    { w: 'Marta', t: 'Vaya. Has venido a recoger la mesa un martes por la mañana. Muy tú.' },
    { w: 'Marta', t: 'Aún estás a tiempo de decir que era una broma. Recursos Humanos tarda dos semanas en procesar nada.' },
    {
      c: [
        { l: '"No es una broma."', then: [{ w: 'Marta', t: 'Ya. Lo sabía antes de preguntarlo.' }, { w: 'Marta', t: 'Prométeme una cosa: no desaparezcas. La gente que se va desaparece, y luego un día te enteras de que vive en Portugal.' }, { do: { ax: { libertad: 2, vinculos: 1 }, q: 'q_marta' } }] },
        { l: '"No lo sé todavía."', then: [{ w: 'Marta', t: 'Eso es más honesto. Y más incómodo.' }, { w: 'Marta', t: 'Vete igual. Pero no te mientas diciendo que estás seguro.' }, { do: { ax: { seguridad: 1, proposito: 1 }, q: 'q_marta' } }] },
        { l: '"¿Y tú por qué sigues?"', then: [{ w: 'Marta', t: 'Porque el equipo que yo he montado es bueno y no quiero que lo herede un imbécil.' }, { w: 'Marta', t: 'Eso no es conformismo. Es otra cosa. A veces me cuesta explicarlo incluso a mí.' }, { do: { ax: { vinculos: 2 }, q: 'q_marta' } }] }
      ]
    },
    { w: 'Marta', t: 'Anda, te acompaño hasta la puerta. Quiero ver la cara del torniquete.' },
    { do: { join: 'marta' } },
    'Marta se une al equipo.'
  ],
  jorge_of: [
    { w: 'Jorge', t: 'Me han dicho que te vas. ¿Es verdad?' },
    { w: 'Jorge', t: 'No te voy a dar la charla. Cada uno sabe lo que puede permitirse.' },
    { w: 'Jorge', t: 'Yo tengo dos críos y una hipoteca a 2041. Mi libertad tiene un número, y el número es grande.' },
    {
      c: [
        { l: '"No te estoy juzgando."', then: [{ w: 'Jorge', t: 'Ya lo sé. Pero lo dices tú, no los demás.' }, { do: { ax: { vinculos: 2 } } }] },
        { l: '"Podrías buscar otra cosa."', then: [{ w: 'Jorge', t: 'Podría. Y podría salir mal. Y entonces el que se queda sin cenar no soy yo.' }, { do: { ax: { seguridad: 1 } } }] }
      ]
    },
    { w: 'Jorge', t: 'Oye. Si un día te lías en algo raro y necesitas a alguien que aguante el primer golpe, llámame. Los fines de semana soy libre.' }
  ],
  recepcion: [
    { w: 'Recepción', t: 'Buenos días. ¿Visita o empleado?' },
    { w: 'Alex', t: '...Todavía no lo sé.' },
    { w: 'Recepción', t: 'Le pongo "visita". Es más rápido de tramitar.' }
  ],
  comp1: [
    { w: 'Compañero', t: 'Tío, ¿de verdad te vas? ¿Sin otro sitio al que ir?' },
    { w: 'Compañero', t: 'Yo llevo cuatro años diciendo que me voy. Lo digo cada enero. Es casi una tradición familiar.' },
    { w: 'Compañero', t: 'Si te va bien, cuéntamelo. Si te va mal... cuéntamelo también, que me tranquiliza.' }
  ],
  comp2: [
    { w: 'Compañera', t: 'A mí lo del teletrabajo me daba igual, en serio.' },
    { w: 'Compañera', t: 'Vivo sola, mi casa es pequeña y la oficina tiene café gratis y gente. Yo estaba deseando volver.' },
    { w: 'Compañera', t: 'No todos estábamos sufriendo, ¿sabes? Eso también es verdad.' },
    { do: { ax: { seguridad: 1 } } }
  ],
  maquina_cafe: [
    'La máquina zumba. En la pantalla parpadea: SALDO 0,00 €.',
    { w: 'Alex', t: 'Me debes un euro desde 2019.' },
    'La máquina no responde. Pero algo dentro hace clic.',
    { do: { q: 'q_cafe', it: ['cafe', 3], qdone: 'q_cafe' } },
    'Caen tres cafés. Los últimos que te dará esta empresa.'
  ],
  boss_fichaje: [
    'El torniquete de salida se ilumina. La pantalla marca tu nombre.',
    '"FICHAJE DE SALIDA — 09:47. ¿CONFIRMAR ABANDONO DE JORNADA?"',
    { w: 'Marta', t: 'Alex... la puerta no se abre.' },
    { w: 'Alex', t: 'Ya lo veo.' },
    'EL ÚLTIMO FICHAJE bloquea la salida.'
  ],
  /* ===== BARRIO ===== */
  lucia_barrio: [
    { w: 'Lucía', t: '¡Anda! A estas horas por la calle. ¿Te han despedido?' },
    { w: 'Alex', t: 'Me he despedido yo.' },
    { w: 'Lucía', t: 'Uf. Valiente. O inconsciente. Suelen ser la misma cosa vista desde distinta distancia.' },
    { w: 'Lucía', t: 'Yo hago turnos de doce horas y no pienso dejarlo, por si te lo preguntas.' },
    {
      c: [
        { l: '"¿Cómo lo aguantas?"', then: [{ w: 'Lucía', t: 'No lo aguanto. Lo elijo. Es distinto.' }, { w: 'Lucía', t: 'Hay días horribles. Y hay días en los que alguien respira gracias a mí. Con eso me basta.' }, { do: { ax: { proposito: 2 } } }] },
        { l: '"¿No te cansas?"', then: [{ w: 'Lucía', t: 'Muchísimo. Pero cansarse haciendo algo que importa no es lo mismo que cansarse rellenando un Excel.' }, { do: { ax: { proposito: 1, libertad: 1 } } }] }
      ]
    },
    { w: 'Lucía', t: 'Mira, tienes cara de no haber comido. Voy contigo un rato. Alguien tiene que vigilarte.' },
    { do: { join: 'lucia' } },
    'Lucía se une al equipo.'
  ],
  dani_barrio: [
    { w: 'Dani', t: '¡No me lo creo! ¡El último hombre en pie ha caído!' },
    { w: 'Dani', t: 'Bienvenido al club. Somos pocos y no tenemos sede.' },
    { w: 'Dani', t: 'Llevo tres años fuera. Es lo mejor que he hecho.' },
    {
      c: [
        { l: '"¿De verdad?"', then: [{ w: 'Dani', t: '...' }, { w: 'Dani', t: 'Los martes sí. Los domingos a las siete de la tarde, no tanto.' }, { w: 'Dani', t: 'Pero eso no lo digo en voz alta normalmente. Te lo digo a ti porque acabas de saltar.' }, { do: { ax: { libertad: 1, vinculos: 2 } } }] },
        { l: '"Me alegro por ti."', then: [{ w: 'Dani', t: 'Gracias, tío. En serio.' }, { do: { ax: { vinculos: 1 } } }] }
      ]
    },
    { w: 'Dani', t: 'Venga, te acompaño. Conozco atajos que no salen en ningún mapa.' },
    { do: { join: 'dani' } },
    'Dani se une al equipo.'
  ],
  rosa: [
    { w: 'Rosa', t: 'Treinta y un años abriendo a las seis menos cuarto.' },
    { w: 'Rosa', t: 'Y no te voy a decir que me arrepiento, porque sería mentira, y tampoco que ha sido bonito, porque también.' },
    { w: 'Rosa', t: 'Vender periódicos no era mi sueño. Era mi manera de no depender de nadie. Eso sí era mi sueño.' },
    { do: { q: 'q_rosa' } },
    {
      c: [
        { l: '"¿Y ahora qué haría distinto?"', then: [{ w: 'Rosa', t: 'Cerrar los domingos veinte años antes.' }, { do: { ax: { libertad: 2 }, qdone: 'q_rosa' } }] },
        { l: '"¿Volvería a hacerlo?"', then: [{ w: 'Rosa', t: 'Sí. Pero más despacio.' }, { do: { ax: { proposito: 2 }, qdone: 'q_rosa' } }] }
      ]
    }
  ],
  tomas: [
    { w: 'Tomás', t: 'Cuarenta y un años en la misma empresa. Me jubilé en marzo.' },
    { w: 'Tomás', t: 'Y llevo desde marzo levantándome a las seis y media sin ningún sitio al que ir.' },
    { w: 'Tomás', t: 'Nadie me avisó de eso. Te preparan para trabajar. No te preparan para después.' },
    { do: { q: 'q_tomas' } },
    {
      c: [
        { l: '"Podría empezar algo nuevo."', then: [{ w: 'Tomás', t: '¿A los 67? ...Bueno. Siempre quise aprender a hacer muebles.' }, { w: 'Tomás', t: 'Toma, llévate esto. Era de la fábrica vieja. A mí ya no me dice nada.' }, { do: { ax: { proposito: 2 }, it: ['foto', 1], qdone: 'q_tomas' } }] },
        { l: '"A mí me da miedo acabar así."', then: [{ w: 'Tomás', t: 'Pues no acabes así. Tienes treinta años de ventaja sobre mí.' }, { w: 'Tomás', t: 'Toma esto. Y no lo guardes en un cajón.' }, { do: { ax: { libertad: 2 }, it: ['foto', 1], qdone: 'q_tomas' } }] }
      ]
    }
  ],
  nerea: [
    { w: 'Nerea', t: 'Me fui hace dos años. Todo el mundo me dijo que era un error.' },
    { w: 'Nerea', t: 'Y durante catorce meses lo fue. De verdad. Gasté los ahorros, discutí con mi pareja y volví a casa de mi madre.' },
    { w: 'Nerea', t: 'Ahora estoy bien. Pero no me gusta cuando la gente cuenta mi historia saltándose los catorce meses.' },
    { do: { q: 'q_nerea', ax: { libertad: 1, seguridad: 1 } } },
    {
      c: [
        { l: '"Cuéntame los catorce meses."', then: [{ w: 'Nerea', t: 'Gracias por preguntar eso. Nadie pregunta eso.' }, { w: 'Nerea', t: 'Lo peor no fue el dinero. Fue no tener una respuesta cuando alguien preguntaba "¿y tú a qué te dedicas?".' }, { do: { ax: { vinculos: 2, proposito: 1 }, qdone: 'q_nerea' } }] },
        { l: '"¿Volverías a irte?"', then: [{ w: 'Nerea', t: 'Sí. Pero con seis meses más de colchón y la mitad de soberbia.' }, { do: { ax: { seguridad: 2 }, qdone: 'q_nerea' } }] }
      ]
    }
  ],
  portal: [
    { w: 'Chico', t: 'Perdona... ¿tú trabajabas en SICE, no? Mi madre te conoce.' },
    { w: 'Chico', t: 'Tengo entrevista el jueves. Primer trabajo. ¿Algún consejo?' },
    { do: { q: 'q_portal' } },
    {
      c: [
        { l: '"Aprende todo lo que puedas y vete cuando deje de enseñarte."', then: [{ w: 'Chico', t: 'Eso... tiene sentido, sí.' }, { do: { ax: { libertad: 2 }, qdone: 'q_portal' } }] },
        { l: '"Que no te convenzan de que la empresa es tu familia."', then: [{ w: 'Chico', t: 'Jo. Qué oscuro. Pero vale.' }, { do: { ax: { libertad: 1, seguridad: 1 }, qdone: 'q_portal' } }] },
        { l: '"Disfrútalo. En serio."', then: [{ w: 'Chico', t: 'Eso no me lo esperaba de alguien que acaba de dimitir.' }, { do: { ax: { proposito: 2, vinculos: 1 }, qdone: 'q_portal' } }] }
      ]
    }
  ],
  camarero: [
    { w: 'Camarero', t: '¿Lo de siempre? Ah, no, que lo de siempre era a las siete de la tarde con la mochila puesta.' },
    { w: 'Camarero', t: 'Ahora puedes tomártelo a las once de la mañana. Qué escándalo.' }
  ],
  /* ===== MERIDIANA ===== */
  tienda_gen: [{ w: 'Tendera', t: 'Pasa, pasa. Tenemos de todo menos tiempo.' }],
  tienda_arm: [{ w: 'Herrera', t: 'Cada herramienta es una manera distinta de decir que no. Elige bien.' }],
  sonia: [
    { w: 'Sonia', t: 'Seis días a la semana en la peluquería. El séptimo me siento en el sofá y no sé qué hacer.' },
    { w: 'Sonia', t: 'He desaprendido a tener tiempo libre. ¿Eso se puede recuperar?' },
    { do: { q: 'q_sonia' } },
    {
      c: [
        { l: '"Se recupera. Despacio."', then: [{ w: 'Sonia', t: 'Voy a empezar por no poner la tele el domingo. A ver qué pasa.' }, { do: { ax: { libertad: 2 }, qdone: 'q_sonia' } }] },
        { l: '"A lo mejor no necesitas recuperarlo."', then: [{ w: 'Sonia', t: 'Eso me alivia más de lo que debería.' }, { do: { ax: { seguridad: 2 }, qdone: 'q_sonia' } }] }
      ]
    }
  ],
  iker: [
    { w: 'Iker', t: 'Yo lo dejé todo. Como tú. Viajé, hice cerámica, escribí medio libro.' },
    { w: 'Iker', t: 'A los ocho meses volví a una oficina. Y la gente me miró como si hubiera fracasado.' },
    { w: 'Iker', t: 'No fracasé. Descubrí que me gustaba tener un problema que resolver cada mañana. Eso también es una respuesta.' },
    { do: { q: 'q_iker', ax: { seguridad: 1, proposito: 1 } } },
    {
      c: [
        { l: '"¿No echas de menos la libertad?"', then: [{ w: 'Iker', t: 'Echo de menos las mañanas. No echo de menos la incertidumbre.' }, { w: 'Iker', t: 'Resulta que yo no quería no trabajar. Quería trabajar en otras condiciones.' }, { do: { ax: { proposito: 2 }, qdone: 'q_iker' } }] },
        { l: '"Entonces perdiste ocho meses."', then: [{ w: 'Iker', t: 'No. Compré una respuesta que no se puede conseguir de otra forma.' }, { do: { ax: { libertad: 1 }, qdone: 'q_iker' } }] }
      ]
    }
  ],
  musico: [
    { w: 'Músico', t: 'Antes llevaba nóminas. Ahora llevo una funda.' },
    { w: 'Músico', t: 'Gano una quinta parte. Duermo el doble. No sé si eso es ganar.' },
    { do: { q: 'q_musico' } },
    {
      c: [
        { l: '"¿Te arrepientes?"', then: [{ w: 'Músico', t: 'Los días 28 de cada mes, mucho. Los días que alguien se para a escuchar, nada.' }, { w: 'Músico', t: 'Toma. Tengo dos y solo puedo tocar una. Úsala para algo.' }, { do: { it: ['guitarra', 1], ax: { libertad: 2, proposito: 1 }, qdone: 'q_musico' } }] },
        { l: '"Suena bien."', then: [{ w: 'Músico', t: 'Gracias. Es lo único que necesitaba oír hoy.' }, { w: 'Músico', t: 'Llévate esta. En serio.' }, { do: { it: ['guitarra', 1], ax: { vinculos: 2 }, qdone: 'q_musico' } }] }
      ]
    }
  ],
  reclutadora: [
    { w: 'Reclutadora', t: 'Tu perfil encaja perfectamente con una posición que estoy gestionando.' },
    { w: 'Reclutadora', t: 'Mismo sector, mejor banda salarial. Cien por cien presencial, eso sí.' },
    { do: { q: 'q_curriculum' } },
    {
      c: [
        { l: 'Aceptar la entrevista.', then: [{ w: 'Reclutadora', t: 'Perfecto. Te envío los detalles.' }, 'Has aceptado explorar una vuelta. No te compromete a nada. Todavía.', { do: { flag: 'acepto_entrevista', ax: { seguridad: 3 }, gold: 400, qdone: 'q_curriculum' } }] },
        { l: 'Rechazarla.', then: [{ w: 'Reclutadora', t: 'Entiendo. Guardo tu perfil por si cambias de opinión.' }, { w: 'Alex', t: 'Guárdelo en un sitio difícil de encontrar.' }, { do: { flag: 'rechazo_entrevista', ax: { libertad: 3 }, qdone: 'q_curriculum' } }] },
        { l: '"¿Por qué hace usted este trabajo?"', then: [{ w: 'Reclutadora', t: '...Nadie me pregunta eso.' }, { w: 'Reclutadora', t: 'Porque colocar a alguien en un sitio donde está mejor me parece un trabajo decente. Aunque el guion que me obligan a leer sea horrible.' }, { do: { ax: { vinculos: 2, proposito: 1 }, qdone: 'q_curriculum' } }] }
      ]
    }
  ],
  padre: [
    { w: 'Padre', t: 'Tú eres el que lo ha dejado, ¿no? Se comenta.' },
    { w: 'Padre', t: 'Yo no puedo. Y no quiero que me digas que sí puedo, porque tú no pagas mi guardería.' },
    { do: { q: 'q_padre' } },
    {
      c: [
        { l: '"Tienes razón. No puedo saberlo."', then: [{ w: 'Padre', t: 'Gracias. De verdad.' }, { w: 'Padre', t: 'Mira, yo tampoco soy infeliz. Es que mi libertad ahora mismo se llama Leo y tiene cuatro años.' }, { do: { ax: { vinculos: 3 }, qdone: 'q_padre' } }] },
        { l: '"Quizá haya opciones intermedias."', then: [{ w: 'Padre', t: 'Las hay. Y las miro todas los domingos por la noche.' }, { w: 'Padre', t: 'El problema no es que no existan. Es que todas cuestan seis meses de riesgo que no tengo.' }, { do: { ax: { seguridad: 2, proposito: 1 }, qdone: 'q_padre' } }] }
      ]
    }
  ],
  ana: [
    { w: 'Ana', t: 'Si necesitas descansar, aquí se descansa. Cobro, pero poco.' },
    { w: 'Ana', t: 'Por cierto: se me ha roto la camilla. Si encuentras cinco piezas de chatarra por ahí, te lo compenso.' },
    { do: { q: 'q_ana' } }
  ],
  boss_reunion: [
    'La sala de juntas de la torre está vacía. Y aun así la puerta está ocupada.',
    'Un aviso flota en el aire: "REUNIÓN DE SEGUIMIENTO — SIN HORA DE FIN".',
    { w: 'Marta', t: 'Reconozco ese formato. Tiene 14 asistentes y ningún orden del día.' },
    'LA REUNIÓN INFINITA comienza.'
  ],
  /* ===== RUTA ===== */
  ciclista: [
    { w: 'Ciclista', t: 'Hoy llevo 84 kilómetros. Ayer 60. Mañana no sé.' },
    { w: 'Ciclista', t: 'Antes medía mi semana en reuniones. Ahora la mido en desniveles. Sigo midiendo. Eso me preocupa un poco.' },
    { do: { q: 'q_ciclista' } },
    {
      c: [
        { l: '"Medir no es malo."', then: [{ w: 'Ciclista', t: 'No. Lo malo es medir lo que no elegiste.' }, { do: { ax: { proposito: 2 }, qdone: 'q_ciclista' } }] },
        { l: '"Prueba a salir sin cuentakilómetros."', then: [{ w: 'Ciclista', t: '...Eso me da un miedo absurdo. Voy a hacerlo.' }, { do: { ax: { libertad: 2 }, qdone: 'q_ciclista' } }] }
      ]
    }
  ],
  pastor: [
    { w: 'Pastor', t: 'Cuarenta años sin jefe. No te creas que es lo que la gente imagina.' },
    { w: 'Pastor', t: 'No tengo jefe, pero tengo 300 ovejas y ninguna entiende de vacaciones.' },
    { w: 'Pastor', t: 'La libertad sin estructura es solo otro tipo de cadena. Hay que construirse la estructura uno mismo. Eso cansa.' },
    { do: { q: 'q_pastor', ax: { proposito: 2 }, qdone: 'q_pastor' } }
  ],
  excursionista: [
    { w: 'Excursionista', t: 'Quiero subir el Pico Mediano antes de intentar la Montaña del Futuro.' },
    { w: 'Excursionista', t: 'La gente va directa a la grande y se estrella. Yo prefiero una cima pequeña que sí pueda hacer.' },
    { do: { q: 'q_excursion', ax: { seguridad: 1, proposito: 1 }, qdone: 'q_excursion' } },
    { w: 'Excursionista', t: 'Toma, llévate esto. A mí me sobra cuerda.' },
    { do: { it: ['cuerda', 1] } }
  ],
  ambulante: [{ w: 'Paco', t: 'Furgoneta, café y carretera. Facturo poco, pero facturo yo.' }],
  /* ===== METRO ===== */
  revisor: [
    { w: 'Revisor', t: 'Veintidós años. Conozco a la gente por el andén en el que se ponen.' },
    { w: 'Revisor', t: 'A ti te he visto. Vagón cuatro, puerta del fondo, auriculares. Cada mañana durante años.' },
    { w: 'Alex', t: '...No sabía que alguien me veía.' },
    { w: 'Revisor', t: 'Yo veo a todos. Es lo único interesante de este trabajo, y da para veintidós años.' },
    { do: { q: 'q_revisor', ax: { vinculos: 3 }, qdone: 'q_revisor' } }
  ],
  chica_libro: [
    { w: 'Chica', t: 'Cuatro páginas de ida, cuatro de vuelta. Ocho al día.' },
    { w: 'Chica', t: 'Son los únicos cuarenta minutos que no le pertenecen a nadie.' },
    { do: { q: 'q_libro' } },
    {
      c: [
        { l: '"Eso es poco."', then: [{ w: 'Chica', t: 'Es 22 libros al año. Poco no es.' }, { do: { ax: { proposito: 2 }, qdone: 'q_libro' } }] },
        { l: '"Eso es mucho."', then: [{ w: 'Chica', t: 'Gracias. Necesitaba que alguien lo dijera.' }, { do: { ax: { vinculos: 2 }, qdone: 'q_libro' } }] }
      ]
    }
  ],
  dormido: [
    'Duerme profundamente. Lleva la acreditación puesta y el móvil apagado en la mano.',
    { w: 'Marta', t: 'Ese soy yo dentro de tres años.' },
    {
      c: [
        { l: 'Despertarlo.', then: [{ w: 'Hombre', t: '¿Eh? ¿Qué parada...? Ay. Me he pasado cuatro.' }, { w: 'Hombre', t: 'Gracias. En serio. Llevo meses pasándome.' }, { do: { ax: { vinculos: 2 }, it: ['tila', 3], q: 'q_dormido', qdone: 'q_dormido' } }] },
        { l: 'Dejarlo dormir.', then: ['Sigues adelante. El vagón se aleja con él dentro.', { w: 'Lucía', t: 'A lo mejor era lo único que necesitaba hoy.' }, { do: { ax: { libertad: 1 }, q: 'q_dormido', qdone: 'q_dormido' } }] }
      ]
    }
  ],
  boss_calendario: [
    'El andén se llena de cuadrículas de luz. Cada una lleva una hora escrita.',
    '"09:00 SEGUIMIENTO / 09:30 SEGUIMIENTO / 10:00 SEGUIMIENTO / 10:00 SEGUIMIENTO"',
    { w: 'Dani', t: 'Tío, hay dos reuniones a la misma hora.' },
    { w: 'Marta', t: 'Siempre hay dos reuniones a la misma hora.' },
    'EL CALENDARIO desciende.'
  ],
  /* ===== BOSQUE ===== */
  ermitano: [
    { w: 'Ermitaño', t: 'Seis años aquí. La gente dice que huí. No huí: elegí.' },
    { w: 'Ermitaño', t: 'Pero te voy a contar lo que nadie cuenta: se pasa mucho tiempo solo. Y la soledad, después del tercer año, ya no es paz. Es solo soledad.' },
    { do: { q: 'q_ermitano' } },
    {
      c: [
        { l: '"¿Volvería?"', then: [{ w: 'Ermitaño', t: 'A la ciudad, quizá. A la oficina, jamás.' }, { w: 'Ermitaño', t: 'No son la misma cosa, y me costó cuatro años entenderlo.' }, { do: { ax: { libertad: 2, vinculos: 1 }, qdone: 'q_ermitano' } }] },
        { l: '"¿Qué echa de menos?"', then: [{ w: 'Ermitaño', t: 'Que alguien note si un día no aparezco.' }, { do: { ax: { vinculos: 3 }, qdone: 'q_ermitano' } }] }
      ]
    }
  ],
  pareja: [
    { w: 'Marcos', t: 'Lo dejamos los dos a la vez. Fue romántico durante seis semanas.' },
    { w: 'Irene', t: 'Y luego descubrimos que él quería viajar y yo quería montar algo. Resulta que "dejarlo" no era un plan compartido.' },
    { w: 'Marcos', t: 'Estamos bien. Discutimos, pero estamos bien.' },
    { do: { q: 'q_pareja', ax: { vinculos: 2 }, qdone: 'q_pareja' } },
    { w: 'Irene', t: 'Consejo gratis: "irse" no es un proyecto. Es solo una puerta.' }
  ],
  nina: [
    { w: 'Niña', t: 'Estoy buscando una piña que sea perfecta. Todas tienen algo mal.' },
    { w: 'Alex', t: '...Conozco la sensación.' },
    { w: 'Niña', t: '¿Me acompañas a volver? Luego sigo buscando otro día.' },
    { do: { q: 'q_nina', ax: { vinculos: 2, proposito: 1 }, qdone: 'q_nina', gold: 600 } },
    'La acompañas hasta el camino. Sus padres te lo agradecen mucho.'
  ],
  boss_sueldo: [
    'Entre los árboles hay una figura hecha de nóminas viejas.',
    'Habla con la voz del día 30.',
    { w: 'Alex', t: 'Ya no me ingresas nada.' },
    '"NO. PERO SIGO CONTANDO."',
    'EL SUELDO FANTASMA se alza.'
  ],
  /* ===== FINANCIERA ===== */
  analista: [
    { w: 'Analista', t: 'He calculado cuánto vale mi hora. Bruto, neto y descontando el trayecto.' },
    { w: 'Analista', t: 'Sale menos que la chica que me trae el café. Y yo pensaba que era al revés.' },
    { do: { q: 'q_analista' } },
    {
      c: [
        { l: '"El número no es toda la historia."', then: [{ w: 'Analista', t: 'Lo sé. Pero es el único trozo de la historia que sé leer.' }, { do: { ax: { proposito: 2 }, qdone: 'q_analista' } }] },
        { l: '"Entonces vete."', then: [{ w: 'Analista', t: 'Tengo un bonus en abril. Siempre hay un bonus en abril.' }, { do: { ax: { libertad: 1, seguridad: 1 }, qdone: 'q_analista' } }] }
      ]
    }
  ],
  limpiadora: [
    { w: 'Rita', t: 'Entro a las cinco. Para las siete la torre entera es mía.' },
    { w: 'Rita', t: 'Ochocientas personas trabajan aquí y ninguna ha visto este edificio en silencio. Yo sí.' },
    { w: 'Rita', t: 'Mi trabajo no le gusta a nadie. A mí esas dos horas me parecen lo mejor del día.' },
    { do: { q: 'q_limpiadora', ax: { proposito: 2, vinculos: 1 }, qdone: 'q_limpiadora' } }
  ],
  emprendedor: [
    { w: 'Emprendedor', t: 'Me fui para no tener jefe. Tengo catorce. Se llaman clientes.' },
    { w: 'Emprendedor', t: 'Trabajo más que nunca. Gano menos que nunca. Y aun así no volvería.' },
    { do: { q: 'q_emprendedor' } },
    {
      c: [
        { l: '"¿Por qué no volverías?"', then: [{ w: 'Emprendedor', t: 'Porque cuando hoy trabajo hasta las once, es culpa mía. Antes era culpa de otro.' }, { w: 'Emprendedor', t: 'Y resulta que la culpa propia pesa menos. Nadie me avisó de eso.' }, { do: { ax: { libertad: 2, proposito: 1 }, qdone: 'q_emprendedor' } }] },
        { l: '"Suena a trampa."', then: [{ w: 'Emprendedor', t: 'Lo es, un poco. Pero es mi trampa.' }, { do: { ax: { seguridad: 1, libertad: 1 }, qdone: 'q_emprendedor' } }] }
      ]
    }
  ],
  trajes: [{ w: 'Lombard', t: 'Un buen traje no te hace creer en la empresa. Te hace soportarla.' }],
  boss_algoritmo: [
    'La torre entera parpadea. Las pantallas muestran tu propio patrón de actividad de los últimos diez años.',
    '"SUJETO ALEX. PRODUCTIVIDAD ÓPTIMA: MARTES 10:40. RECOMENDACIÓN: REPETIR MARTES INDEFINIDAMENTE."',
    { w: 'Lucía', t: 'Está intentando convertirte en una media.' },
    'EL ALGORITMO se despliega.'
  ],
  /* ===== DESIERTO ===== */
  consultor: [
    { w: 'Consultor', t: 'Estoy optimizando este desierto. Hay un 12% de ineficiencia en la distribución de la arena.' },
    { w: 'Alex', t: '¿Para quién?' },
    { w: 'Consultor', t: '...' },
    { w: 'Consultor', t: 'Buena pregunta. Llevo cuatro días sin hacérmela.' },
    { do: { q: 'q_consultor', ax: { proposito: 2 }, qdone: 'q_consultor', gold: 900 } }
  ],
  estatua: [
    'Una estatua de bronce. La placa dice: "AL TRABAJADOR MÁS PRODUCTIVO DE SU GENERACIÓN".',
    'No hay nombre. La parte donde estaba el nombre está lisa, borrada por el viento.',
    { w: 'Marta', t: 'Qué broma más cruel.' },
    { do: { q: 'q_estatua', ax: { libertad: 2 }, qdone: 'q_estatua', gold: 1000 } }
  ],
  boss_kpi: [
    'El horizonte se llena de barras. Suben. Nunca bajan.',
    '"ALEX — OBJETIVOS CUMPLIDOS ESTE TRIMESTRE: 0. VALOR ESTIMADO DE TU EXISTENCIA: PENDIENTE DE REVISIÓN."',
    { w: 'Jorge', t: 'Hay que darle fuerte. Esta cosa solo entiende números.' },
    'EL KPI se materializa.'
  ],
  /* ===== ARCHIVO ===== */
  archivera: [
    { w: 'Archivera', t: 'Bienvenido. Aquí guardamos todas las versiones tuyas que no llegaron a ocurrir.' },
    { w: 'Archivera', t: 'El Alex que aceptó el traslado. El que montó el estudio. El que nunca entró en SICE.' },
    { w: 'Archivera', t: 'Puedes mirarlos, pero te advierto: mirar mucho tiempo estropea al original.' },
    { do: { q: 'q_archivera' } },
    {
      c: [
        { l: 'Mirar los expedientes.', then: ['Ves una vida en la que nunca dimitiste. Eres razonablemente feliz. También razonablemente pequeño.', { w: 'Archivera', t: 'Ninguna es mejor. Solo son distintas. Eso es lo que la gente no soporta.' }, { do: { ax: { proposito: 2, seguridad: 1 }, it: ['brujula', 1], qdone: 'q_archivera' } }] },
        { l: 'No mirarlos.', then: [{ w: 'Archivera', t: 'Muy poca gente elige eso. Toma, te lo has ganado.' }, { do: { ax: { libertad: 3 }, it: ['brujula', 1], qdone: 'q_archivera' } }] }
      ]
    }
  ],
  boss_mercado: [
    'El fondo del Archivo se abre a una sala llena de ofertas de empleo flotando.',
    'Todas piden cinco años de experiencia en tecnologías de tres años de antigüedad.',
    { w: 'Dani', t: 'Yo a esto ya me he enfrentado. No se puede ganar.' },
    { w: 'Marta', t: 'Se puede sobrevivir. No es lo mismo, pero sirve.' },
    'EL MERCADO LABORAL se agita.'
  ],
  /* ===== MONTAÑA ===== */
  guarda: [
    { w: 'Guarda', t: 'Sube mucha gente huyendo de algo. Se nota en la mochila: llevan demasiado.' },
    { w: 'Guarda', t: 'Los que suben hacia algo llevan poco y van más despacio.' },
    { do: { q: 'q_guarda' } },
    {
      c: [
        { l: '"¿Yo de cuáles soy?"', then: [{ w: 'Guarda', t: 'Todavía no lo sé. Llevas la mochila a medias.' }, { do: { ax: { proposito: 2 }, qdone: 'q_guarda' } }] },
        { l: '"Huir también vale."', then: [{ w: 'Guarda', t: 'Vale para llegar arriba. No vale para quedarse.' }, { do: { ax: { libertad: 2 }, qdone: 'q_guarda' } }] }
      ]
    }
  ],
  escaladora: [
    { w: 'Escaladora', t: 'Esta ruta no llega a ninguna cima. Muere en mitad de la pared.' },
    { w: 'Escaladora', t: 'Por eso me gusta. No hay nada que conseguir. Solo el rato de estar haciéndolo.' },
    { do: { q: 'q_escaladora', ax: { libertad: 2, proposito: 1 }, qdone: 'q_escaladora' } }
  ],
  boss_jefe: [
    'En el collado, de espaldas, hay una figura con abrigo largo. Se gira.',
    { w: '???', t: 'Alex. Me alegro de verte. De verdad.' },
    { w: '???', t: 'Yo también quise irme. En 2011. Me ofrecieron dirigir el área y dije que sí.' },
    { w: '???', t: 'No soy tu enemigo. Soy lo que pasa cuando dices que sí muchas veces seguidas.' },
    'EL JEFE bloquea el paso.'
  ],
  /* ===== ESPEJO ===== */
  otro_alex: [
    { w: '¿Alex?', t: 'Hola.' },
    { w: '¿Alex?', t: 'Yo no dimití. Sigo allí. El martes pasado me ascendieron.' },
    { w: '¿Alex?', t: 'No he venido a convencerte. He venido a que me mires bien.' },
    {
      c: [
        { l: '"¿Eres feliz?"', then: [{ w: '¿Alex?', t: 'A ratos. Como tú. Exactamente en la misma proporción.' }, { do: { ax: { proposito: 2 } } }] },
        { l: '"Podría haber sido tú."', then: [{ w: '¿Alex?', t: 'Sigues pudiendo. Esa es la parte incómoda.' }, { do: { ax: { seguridad: 2 } } }] },
        { l: 'No decir nada.', then: [{ w: '¿Alex?', t: 'Vale. Eso también es una respuesta.' }, { do: { ax: { libertad: 2 } } }] }
      ]
    }
  ],
  boss_comparacion: [
    'La sala se llena de superficies pulidas. En cada una hay alguien que te lleva ventaja.',
    'Alguien con casa. Alguien con hijos. Alguien con una empresa. Alguien tranquilo.',
    { w: 'Lucía', t: 'No mires. En serio, Alex, no mires.' },
    'LA COMPARACIÓN se despliega.'
  ],
  boss_espejo: [
    'Al final del pasillo hay una sola superficie. No refleja la sala.',
    'Te refleja a ti a los 25. Y a los 40. Y a los 70.',
    { w: 'Marta', t: 'Esto no lo podemos pelear por ti.' },
    { w: 'Jorge', t: 'Pero podemos aguantar de pie mientras lo haces.' },
    'EL ESPEJO despierta.'
  ]
};

/* Textos de capítulo al avanzar */
const CH_INTRO = {
  2: ['Sales a la calle a las diez de la mañana de un martes.', 'Nunca habías visto tu barrio a esta hora. Hay gente. Muchísima gente. ¿Qué hace toda esta gente aquí?'],
  3: ['Primer día sin calendario.', 'Te despiertas a las 6:40 sin despertador. Tu cuerpo aún no se ha enterado.'],
  4: ['El dinero de la indemnización tiene fecha de caducidad.', 'Todavía no es urgente. Pero ya tiene forma.'],
  5: ['Han pasado tres semanas. La gente ha dejado de preguntar qué tal.', 'Eso es un alivio y una pérdida al mismo tiempo.'],
  6: ['Alguien te pregunta a qué te dedicas y por primera vez no tienes una frase preparada.'],
  7: ['Vuelves al barrio. Los que se quedaron siguen ahí, y siguen siendo personas completas.'],
  8: ['La Ciudad Financiera nunca apaga las luces. Ni siquiera para ahorrar.'],
  9: ['Todo aquí se mide. Hasta la arena.'],
  10: ['Toca decidir si quieres volver a existir para el mercado.'],
  11: ['La montaña se ve desde el desierto. Siempre se vio. Nunca miraste hacia allí.'],
  12: ['Arriba hace frío y hay menos excusas.'],
  13: ['La cumbre no era la cumbre.'],
  14: ['Última pregunta.']
};

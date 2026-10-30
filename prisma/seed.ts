/* eslint-disable no-console */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../apps/api/src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the seed');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = 'CafeQR123!';
const DEMO_PIN = '1234';

async function main() {
  const passwordHash = await argon2.hash(DEMO_PASSWORD, {
    type: argon2.argon2id,
  });
  const pinHash = await argon2.hash(DEMO_PIN, { type: argon2.argon2id });

  const cup = await prisma.moneda.upsert({
    where: { codigo: 'CUP' },
    update: {},
    create: { codigo: 'CUP', nombre: 'Peso cubano', simbolo: '$' },
  });
  await prisma.moneda.upsert({
    where: { codigo: 'USD' },
    update: {},
    create: { codigo: 'USD', nombre: 'Dólar estadounidense', simbolo: '$' },
  });
  await prisma.moneda.upsert({
    where: { codigo: 'MLC' },
    update: {},
    create: { codigo: 'MLC', nombre: 'Peso convertible', simbolo: '$' },
  });

  const negocio =
    (await prisma.negocio.findFirst({ where: { nombre: 'CaféQR Demo' } })) ??
    (await prisma.negocio.create({
      data: {
        nombre: 'CaféQR Demo',
        direccion: 'Calle 23, Vedado, La Habana',
        telefono: '+53 7 000 0000',
        whatsappNumero: '+53 5 000 0000',
        email: 'demo@cafeqr.cu',
        monedaPrincipalId: cup.id,
        zonaHoraria: 'America/Havana',
        corteDiaHora: '04:00',
      },
    }));

  const sucursal =
    (await prisma.sucursal.findFirst({
      where: { negocioId: negocio.id, nombre: 'Centro' },
    })) ??
    (await prisma.sucursal.create({
      data: {
        negocioId: negocio.id,
        nombre: 'Centro',
        direccion: 'Calle 23, Vedado, La Habana',
        telefono: '+53 7 000 0000',
      },
    }));

  const permisoDefs: Array<[string, string]> = [
    ['pedido.ver', 'Ver pedidos'],
    ['pedido.crear', 'Crear pedidos'],
    ['pedido.cancelar', 'Cancelar pedidos'],
    ['pedido.descuento', 'Aplicar descuentos'],
    ['caja.ver', 'Ver turnos de caja'],
    ['caja.abrir', 'Abrir caja'],
    ['caja.cerrar', 'Cerrar caja'],
    ['caja.movimiento', 'Registrar movimientos de caja'],
    ['caja.retiro', 'Retirar efectivo'],
    ['pago.registrar', 'Registrar pagos'],
    ['pago.conciliar', 'Conciliar pagos electrónicos'],
    ['pago.anular', 'Anular pagos'],
    ['catalogo.ver', 'Ver catálogo'],
    ['catalogo.gestionar', 'Gestionar catálogo'],
    ['mesa.gestionar', 'Gestionar mesas y QR'],
    ['usuario.gestionar', 'Gestionar usuarios y roles'],
    ['reporte.ver', 'Ver reportes'],
    ['reporte.exportar', 'Exportar reportes'],
    ['auditoria.ver', 'Ver auditoría'],
    ['configuracion.gestionar', 'Gestionar configuración'],
    ['repartidor.ver', 'Ver repartidores'],
    ['repartidor.asignar', 'Asignar pedidos a repartidores'],
    ['repartidor.liquidar', 'Liquidar efectivo de repartidores'],
    ['kds.ver', 'Ver KDS'],
    ['kds.actualizar', 'Actualizar estados en KDS'],
    ['pin.autorizar', 'Autorizar acciones sensibles con PIN'],
  ];

  const permisos = new Map<string, string>();
  for (const [codigo, descripcion] of permisoDefs) {
    const permiso = await prisma.permiso.upsert({
      where: { codigo },
      update: { descripcion },
      create: { codigo, descripcion },
    });
    permisos.set(codigo, permiso.id);
  }

  const rolDefs: Array<[string, string, string[]]> = [
    [
      'dueno',
      'Dueño del negocio',
      permisoDefs.map(([codigo]) => codigo),
    ],
    [
      'gerente',
      'Gerente de turno',
      permisoDefs
        .map(([codigo]) => codigo)
        .filter((codigo) => codigo !== 'configuracion.gestionar'),
    ],
    [
      'cajero',
      'Cajero',
      [
        'pedido.ver',
        'pedido.crear',
        'caja.ver',
        'caja.abrir',
        'caja.cerrar',
        'caja.movimiento',
        'caja.retiro',
        'pago.registrar',
        'pago.conciliar',
        'pago.anular',
        'catalogo.ver',
        'reporte.ver',
        'kds.ver',
      ],
    ],
    [
      'mesero',
      'Mesero',
      ['pedido.ver', 'pedido.crear', 'catalogo.ver', 'kds.ver'],
    ],
    [
      'cocina',
      'Cocina',
      ['pedido.ver', 'kds.ver', 'kds.actualizar'],
    ],
    [
      'repartidor',
      'Repartidor',
      ['pedido.ver', 'repartidor.ver', 'pago.registrar'],
    ],
  ];

  const roles = new Map<string, string>();
  for (const [nombre, descripcion, codigos] of rolDefs) {
    const rol = await prisma.rol.upsert({
      where: { nombre },
      update: { descripcion, esSistema: true },
      create: { nombre, descripcion, esSistema: true },
    });
    roles.set(nombre, rol.id);

    for (const codigo of codigos) {
      const permisoId = permisos.get(codigo);
      if (!permisoId) continue;
      await prisma.rolPermiso.upsert({
        where: { rolId_permisoId: { rolId: rol.id, permisoId } },
        update: {},
        create: { rolId: rol.id, permisoId },
      });
    }
  }

  const usuarioDefs: Array<[string, string, string]> = [
    ['owner', 'Owner Demo', 'dueno'],
    ['gerente', 'Gerente Demo', 'gerente'],
    ['cajero', 'Cajero Demo', 'cajero'],
    ['mesero', 'Mesero Demo', 'mesero'],
    ['cocina', 'Cocina Demo', 'cocina'],
    ['repartidor', 'Repartidor Demo', 'repartidor'],
  ];

  for (const [username, nombre, rolNombre] of usuarioDefs) {
    const rolId = roles.get(rolNombre);
    if (!rolId) throw new Error(`Missing role ${rolNombre}`);

    const existing = await prisma.usuario.findFirst({
      where: { negocioId: negocio.id, username },
    });

    const usuario = existing
      ? await prisma.usuario.update({
          where: { id: existing.id },
          data: { nombre, rolId, passwordHash, pinHash, activo: true },
        })
      : await prisma.usuario.create({
          data: {
            negocioId: negocio.id,
            rolId,
            nombre,
            username,
            passwordHash,
            pinHash,
          },
        });

    await prisma.usuarioSucursal.upsert({
      where: {
        usuarioId_sucursalId: {
          usuarioId: usuario.id,
          sucursalId: sucursal.id,
        },
      },
      update: { esPrincipal: true },
      create: {
        usuarioId: usuario.id,
        sucursalId: sucursal.id,
        esPrincipal: true,
      },
    });

    if (rolNombre === 'repartidor') {
      const existingRepartidor = await prisma.repartidor.findUnique({
        where: { usuarioId: usuario.id },
      });
      if (!existingRepartidor) {
        await prisma.repartidor.create({
          data: { usuarioId: usuario.id, vehiculo: 'Moto' },
        });
      }
    }
  }

  const caja =
    (await prisma.caja.findFirst({
      where: { sucursalId: sucursal.id, nombre: 'Caja principal' },
    })) ??
    (await prisma.caja.create({
      data: { sucursalId: sucursal.id, nombre: 'Caja principal' },
    }));

  const zonaSalon =
    (await prisma.zona.findFirst({
      where: { sucursalId: sucursal.id, nombre: 'Salón' },
    })) ??
    (await prisma.zona.create({
      data: { sucursalId: sucursal.id, nombre: 'Salón' },
    }));

  const zonaTerraza =
    (await prisma.zona.findFirst({
      where: { sucursalId: sucursal.id, nombre: 'Terraza' },
    })) ??
    (await prisma.zona.create({
      data: { sucursalId: sucursal.id, nombre: 'Terraza' },
    }));

  const mesas = [
    { zona: zonaSalon, numero: '1', capacidad: 2 },
    { zona: zonaSalon, numero: '2', capacidad: 2 },
    { zona: zonaSalon, numero: '3', capacidad: 4 },
    { zona: zonaSalon, numero: '4', capacidad: 4 },
    { zona: zonaSalon, numero: '5', capacidad: 4 },
    { zona: zonaSalon, numero: '6', capacidad: 6 },
    { zona: zonaTerraza, numero: '7', capacidad: 2 },
    { zona: zonaTerraza, numero: '8', capacidad: 2 },
    { zona: zonaTerraza, numero: '9', capacidad: 4 },
    { zona: zonaTerraza, numero: '10', capacidad: 4 },
  ];

  for (const mesa of mesas) {
    const existing = await prisma.mesa.findFirst({
      where: { zonaId: mesa.zona.id, numero: mesa.numero },
    });
    if (!existing) {
      await prisma.mesa.create({
        data: {
          zonaId: mesa.zona.id,
          numero: mesa.numero,
          capacidad: mesa.capacidad,
          codigoQr: randomUUID(),
        },
      });
    }
  }

  const categoriaDefs: Array<[string, string[]]> = [
    ['Cafés', ['Café con leche', 'Americano', 'Capuchino', 'Latte']],
    ['Fríos', ['Jugo natural', 'Refresco']],
    ['Dulces', ['Croissant', 'Tarta de queso']],
  ];

  const precios: Record<string, string> = {
    'Café con leche': '250.00',
    Americano: '180.00',
    Capuchino: '300.00',
    Latte: '320.00',
    'Jugo natural': '200.00',
    Refresco: '150.00',
    Croissant: '120.00',
    'Tarta de queso': '250.00',
  };

  const productos = new Map<string, string>();
  for (const [categoriaNombre, nombres] of categoriaDefs) {
    const categoria =
      (await prisma.categoria.findFirst({
        where: { negocioId: negocio.id, nombre: categoriaNombre },
      })) ??
      (await prisma.categoria.create({
        data: { negocioId: negocio.id, nombre: categoriaNombre },
      }));

    for (const nombre of nombres) {
      const producto =
        (await prisma.producto.findFirst({
          where: { categoriaId: categoria.id, nombre },
        })) ??
        (await prisma.producto.create({
          data: {
            categoriaId: categoria.id,
            nombre,
            descripcion: `${nombre} de la casa`,
            tiempoPreparacionMin: nombre.startsWith('Café') ? 6 : 3,
          },
        }));

      productos.set(nombre, producto.id);

      await prisma.productoPrecio.upsert({
        where: {
          productoId_monedaId: {
            productoId: producto.id,
            monedaId: cup.id,
          },
        },
        update: { precio: precios[nombre] },
        create: {
          productoId: producto.id,
          monedaId: cup.id,
          precio: precios[nombre],
        },
      });
    }
  }

  const grupoTamanio =
    (await prisma.grupoModificador.findFirst({
      where: { negocioId: negocio.id, nombre: 'Tamaño' },
    })) ??
    (await prisma.grupoModificador.create({
      data: {
        negocioId: negocio.id,
        nombre: 'Tamaño',
        tipo: 'unico',
        minSeleccion: 1,
        maxSeleccion: 1,
        obligatorio: true,
      },
    }));

  const grupoLeche =
    (await prisma.grupoModificador.findFirst({
      where: { negocioId: negocio.id, nombre: 'Leche' },
    })) ??
    (await prisma.grupoModificador.create({
      data: {
        negocioId: negocio.id,
        nombre: 'Leche',
        tipo: 'unico',
        minSeleccion: 0,
        maxSeleccion: 1,
      },
    }));

  const grupoExtras =
    (await prisma.grupoModificador.findFirst({
      where: { negocioId: negocio.id, nombre: 'Extras' },
    })) ??
    (await prisma.grupoModificador.create({
      data: {
        negocioId: negocio.id,
        nombre: 'Extras',
        tipo: 'multiple',
        minSeleccion: 0,
        maxSeleccion: 3,
      },
    }));

  const modificadorDefs: Array<[string, string, string]> = [
    [grupoTamanio.id, 'Pequeño', '0.00'],
    [grupoTamanio.id, 'Mediano', '30.00'],
    [grupoTamanio.id, 'Grande', '60.00'],
    [grupoLeche.id, 'Entera', '0.00'],
    [grupoLeche.id, 'Deslactosada', '20.00'],
    [grupoLeche.id, 'Almendra', '40.00'],
    [grupoExtras.id, 'Shot extra', '50.00'],
    [grupoExtras.id, 'Canela', '0.00'],
    [grupoExtras.id, 'Crema', '20.00'],
  ];

  for (const [grupoId, nombre, precioExtra] of modificadorDefs) {
    const existing = await prisma.modificador.findFirst({
      where: { grupoId, nombre },
    });
    if (!existing) {
      await prisma.modificador.create({
        data: { grupoId, nombre, precioExtra },
      });
    }
  }

  for (const nombre of ['Café con leche', 'Capuchino', 'Latte']) {
    const productoId = productos.get(nombre);
    if (!productoId) continue;
    for (const grupo of [grupoTamanio, grupoLeche, grupoExtras]) {
      await prisma.productoGrupoModificador.upsert({
        where: {
          productoId_grupoId: { productoId, grupoId: grupo.id },
        },
        update: {},
        create: { productoId, grupoId: grupo.id },
      });
    }
  }

  const configuraciones: Array<[string, unknown]> = [
    ['arqueo_ciego', false],
    ['impresora_ancho', 80],
    ['propina_sugerida', 10],
    ['whatsapp_mensaje', 'Hola, quiero hacer un pedido'],
  ];

  for (const [clave, valor] of configuraciones) {
    const existing = await prisma.configuracion.findFirst({
      where: { negocioId: negocio.id, sucursalId: sucursal.id, clave },
    });
    if (existing) {
      await prisma.configuracion.update({
        where: { id: existing.id },
        data: { valor: valor as object },
      });
    } else {
      await prisma.configuracion.create({
        data: {
          negocioId: negocio.id,
          sucursalId: sucursal.id,
          clave,
          valor: valor as object,
        },
      });
    }
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  await prisma.contadorDiario.upsert({
    where: {
      sucursalId_fechaOperativa: {
        sucursalId: sucursal.id,
        fechaOperativa: today,
      },
    },
    update: {},
    create: {
      sucursalId: sucursal.id,
      fechaOperativa: today,
      ultimoNumero: 0,
    },
  });

  console.log('Seed complete');
  console.log(`  business: ${negocio.nombre} (${negocio.id})`);
  console.log(`  branch:   ${sucursal.nombre} (${sucursal.id})`);
  console.log(`  cash:     ${caja.nombre} (${caja.id})`);
  console.log(`  users:    ${usuarioDefs.map(([username]) => username).join(', ')}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log(`  pin:      ${DEMO_PIN}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

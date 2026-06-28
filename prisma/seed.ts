import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('admin123', 10)

  // ─── Super Admin (sin empresa) ────────────────────────────────────────────
  await prisma.usuario.upsert({
    where: { email: 'superadmin@sistema.com' },
    update: {},
    create: {
      nombre: 'Super Admin',
      email: 'superadmin@sistema.com',
      password: await bcrypt.hash('super123', 10),
      rol: 'SUPERADMIN',
      empresaId: null,
    },
  })

  // ─── Empresa: actualiza la existente con datos fiscales completos ──────────
  const empresa = await prisma.empresa.upsert({
    where: { rfc: 'XAXX010101000' },
    update: {
      nombre: 'Materiales Crimson',
      razonSocial: 'MATERIALES CRIMSON SA DE CV',
      regimenFiscal: '601',
      codigoPostal: '64000',
      calle: 'Av. Constitución 1500',
      colonia: 'Centro',
      ciudad: 'Monterrey',
      estado: 'Nuevo León',
      colorPrimario: '#DC2626',
      colorSecundario: '#374151',
    },
    create: {
      nombre: 'Materiales Crimson',
      rfc: 'XAXX010101000',
      razonSocial: 'MATERIALES CRIMSON SA DE CV',
      regimenFiscal: '601',
      codigoPostal: '64000',
      calle: 'Av. Constitución 1500',
      colonia: 'Centro',
      ciudad: 'Monterrey',
      estado: 'Nuevo León',
      colorPrimario: '#DC2626',
      colorSecundario: '#374151',
    },
  })

  await prisma.usuario.upsert({
    where: { email: 'admin@empresa.com' },
    update: { nombre: 'José Arias' },
    create: {
      nombre: 'José Arias',
      email: 'admin@empresa.com',
      password,
      rol: 'ADMIN',
      empresaId: empresa.id,
    },
  })

  // ─── Clientes ─────────────────────────────────────────────────────────────
  const hasClientes = await prisma.cliente.count({ where: { empresaId: empresa.id } })

  if (hasClientes === 0) {
    await prisma.cliente.createMany({
      data: [
        {
          empresaId: empresa.id,
          nombre: 'Constructora Vega',
          rfc: 'CVE980312AB3',
          razonSocial: 'CONSTRUCTORA VEGA SA DE CV',
          email: 'compras@constructoravega.com',
          telefono: '8181234567',
          calle: 'Blvd. Díaz Ordaz 450',
          colonia: 'Santa María',
          ciudad: 'Monterrey',
          estado: 'Nuevo León',
          codigoPostal: '64650',
          regimenFiscal: '601',
        },
        {
          empresaId: empresa.id,
          nombre: 'Edificaciones del Norte',
          rfc: 'ENO010715PQ7',
          razonSocial: 'EDIFICACIONES DEL NORTE SA DE CV',
          email: 'administracion@edelnorte.mx',
          telefono: '8189876543',
          calle: 'Av. Garza Sada 2350',
          colonia: 'Tecnológico',
          ciudad: 'Monterrey',
          estado: 'Nuevo León',
          codigoPostal: '64700',
          regimenFiscal: '601',
        },
        {
          empresaId: empresa.id,
          nombre: 'Arq. Ramírez Torres',
          rfc: 'RATR780904HV2',
          razonSocial: 'RAMÍREZ TORRES CARLOS ALBERTO',
          email: 'carlosramirez.arq@gmail.com',
          telefono: '8112345678',
          calle: 'Calle Hidalgo 88',
          colonia: 'Obispado',
          ciudad: 'Monterrey',
          estado: 'Nuevo León',
          codigoPostal: '64060',
          regimenFiscal: '612',
        },
        {
          empresaId: empresa.id,
          nombre: 'Ferretera San Nicolás',
          rfc: 'FSN920601DF4',
          razonSocial: 'FERRETERA SAN NICOLÁS SA DE CV',
          email: 'ventas@ferreterasn.com',
          telefono: '8118765432',
          calle: 'Av. Lincoln 405 Local 3',
          colonia: 'Del Parque',
          ciudad: 'San Nicolás de los Garza',
          estado: 'Nuevo León',
          codigoPostal: '66480',
          regimenFiscal: '601',
        },
        {
          empresaId: empresa.id,
          nombre: 'Obras y Proyectos Garza',
          rfc: 'GARP850210LT9',
          razonSocial: 'GARZA REYES PEDRO ANTONIO',
          email: 'pedro.garza@obrasgarza.com',
          telefono: '8123456789',
          calle: 'Priv. Las Flores 12',
          colonia: 'Cumbres Elite',
          ciudad: 'Monterrey',
          estado: 'Nuevo León',
          codigoPostal: '64610',
          regimenFiscal: '626',
        },
        {
          empresaId: empresa.id,
          nombre: 'Grupo Constructor Nexo',
          rfc: 'GCN150820RS1',
          razonSocial: 'GRUPO CONSTRUCTOR NEXO SA DE CV',
          email: 'finanzas@gruponexo.mx',
          telefono: '8198765432',
          calle: 'Torres Adalid 212 Piso 3',
          colonia: 'Valle Oriente',
          ciudad: 'San Pedro Garza García',
          estado: 'Nuevo León',
          codigoPostal: '66269',
          regimenFiscal: '601',
        },
        {
          empresaId: empresa.id,
          nombre: 'Desarrolladora Cumbres',
          rfc: 'DCU030505MX8',
          razonSocial: 'DESARROLLADORA CUMBRES SA DE CV',
          email: 'costos@desarrolladoracumbres.com',
          telefono: '8113214321',
          calle: 'Av. Vasconcelos 200 Nte',
          colonia: 'Valle Oriente',
          ciudad: 'San Pedro Garza García',
          estado: 'Nuevo León',
          codigoPostal: '66238',
          regimenFiscal: '601',
        },
        {
          empresaId: empresa.id,
          nombre: 'Contratista Juan Medina',
          rfc: 'MEJJ760318NN5',
          razonSocial: 'MEDINA JIMÉNEZ JUAN CARLOS',
          email: 'jmedina.contratista@hotmail.com',
          telefono: '8145678901',
          calle: 'Calle Escobedo 530',
          colonia: 'Independencia',
          ciudad: 'Guadalupe',
          estado: 'Nuevo León',
          codigoPostal: '67110',
          regimenFiscal: '612',
        },
        {
          empresaId: empresa.id,
          nombre: 'Inmobiliaria Torres del Sol',
          rfc: 'ITS110930GH6',
          razonSocial: 'INMOBILIARIA TORRES DEL SOL SA DE CV',
          email: 'obra@torresdelsolnl.com',
          telefono: '8187654321',
          calle: 'Av. Revolución 1140',
          colonia: 'Mitras Norte',
          ciudad: 'Monterrey',
          estado: 'Nuevo León',
          codigoPostal: '64320',
          regimenFiscal: '601',
        },
        {
          empresaId: empresa.id,
          nombre: 'Público General',
          rfc: 'XAXX010101000',
          razonSocial: 'PÚBLICO EN GENERAL',
          regimenFiscal: '616',
          codigoPostal: '64000',
        },
      ],
    })
    console.log('✅ Clientes creados (10)')
  } else {
    console.log(`ℹ️  Clientes existentes (${hasClientes}), se omite`)
  }

  // ─── Productos de materiales de construcción ──────────────────────────────
  const hasProductos = await prisma.producto.count({ where: { empresaId: empresa.id } })

  if (hasProductos === 0) {
    await prisma.producto.createMany({
      data: [
        // ── Cementos y morteros ──
        {
          empresaId: empresa.id,
          nombre: 'Cemento Portland 50 kg',
          descripcion: 'Cemento gris Portland tipo I/II, bolsa 50 kg, marca Cemex',
          precio: 185.00,
          tasaIva: 0.16,
          claveSAT: '30111602',
          claveUnidad: 'BG',
          unidad: 'Bolsa',
        },
        {
          empresaId: empresa.id,
          nombre: 'Cal Hidratada 20 kg',
          descripcion: 'Cal hidratada en polvo para mortero y aplanados, bolsa 20 kg',
          precio: 98.00,
          tasaIva: 0.16,
          claveSAT: '30111510',
          claveUnidad: 'BG',
          unidad: 'Bolsa',
        },
        {
          empresaId: empresa.id,
          nombre: 'Yeso Industrial 20 kg',
          descripcion: 'Yeso blanco para interiores, fraguado rápido, bolsa 20 kg',
          precio: 75.00,
          tasaIva: 0.16,
          claveSAT: '30111504',
          claveUnidad: 'BG',
          unidad: 'Bolsa',
        },

        // ── Varilla y acero ──
        {
          empresaId: empresa.id,
          nombre: 'Varilla Corrugada 3/8" × 12 m',
          descripcion: 'Varilla corrugada de acero 3/8 pulgada, longitud 12 metros',
          precio: 128.00,
          tasaIva: 0.16,
          claveSAT: '30102901',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },
        {
          empresaId: empresa.id,
          nombre: 'Varilla Corrugada 1/2" × 12 m',
          descripcion: 'Varilla corrugada de acero 1/2 pulgada, longitud 12 metros',
          precio: 195.00,
          tasaIva: 0.16,
          claveSAT: '30102901',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },
        {
          empresaId: empresa.id,
          nombre: 'Alambre de Amarre #16',
          descripcion: 'Alambre recocido calibre 16 para amarre de varilla, venta por kilogramo',
          precio: 36.00,
          tasaIva: 0.16,
          claveSAT: '31161501',
          claveUnidad: 'KGM',
          unidad: 'Kilogramo',
        },
        {
          empresaId: empresa.id,
          nombre: 'Malla Electrosoldada 6"×6" 2.4×6 m',
          descripcion: 'Malla electrosoldada de acero 6×6 calibre 10/10, panel 2.4×6 m',
          precio: 1250.00,
          tasaIva: 0.16,
          claveSAT: '30102901',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },

        // ── Block y ladrillo ──
        {
          empresaId: empresa.id,
          nombre: 'Block Hueco de Concreto 15×20×40 cm',
          descripcion: 'Block hueco de concreto 15 cm de ancho, resistencia 70 kg/cm²',
          precio: 13.50,
          tasaIva: 0.16,
          claveSAT: '30111901',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },
        {
          empresaId: empresa.id,
          nombre: 'Block Hueco de Concreto 10×20×40 cm',
          descripcion: 'Block hueco de concreto 10 cm de ancho para muros divisorios',
          precio: 9.50,
          tasaIva: 0.16,
          claveSAT: '30111901',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },
        {
          empresaId: empresa.id,
          nombre: 'Ladrillo Rojo Recocido',
          descripcion: 'Ladrillo rojo macizo de arcilla cocida 6×12×24 cm',
          precio: 4.20,
          tasaIva: 0.16,
          claveSAT: '30111907',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },

        // ── Áridos y material pétreo ──
        {
          empresaId: empresa.id,
          nombre: 'Arena de Río',
          descripcion: 'Arena lavada de río para construcción, venta por metro cúbico',
          precio: 380.00,
          tasaIva: 0.16,
          claveSAT: '11121601',
          claveUnidad: 'M3',
          unidad: 'Metro cúbico',
        },
        {
          empresaId: empresa.id,
          nombre: 'Grava 3/4"',
          descripcion: 'Grava triturada 3/4 pulgada para concreto, venta por metro cúbico',
          precio: 420.00,
          tasaIva: 0.16,
          claveSAT: '11121702',
          claveUnidad: 'M3',
          unidad: 'Metro cúbico',
        },

        // ── Impermeabilizantes ──
        {
          empresaId: empresa.id,
          nombre: 'Impermeabilizante Acrílico 19 L',
          descripcion: 'Impermeabilizante acrílico elastomérico para azoteas, cubeta 19 litros, blanco',
          precio: 545.00,
          tasaIva: 0.16,
          claveSAT: '31201512',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },

        // ── Plomería y PVC ──
        {
          empresaId: empresa.id,
          nombre: 'Tubo PVC Hidráulico 4" × 6 m',
          descripcion: 'Tubo PVC sanitario para drenaje, diámetro 4 pulgadas, longitud 6 m',
          precio: 295.00,
          tasaIva: 0.16,
          claveSAT: '40141702',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },
        {
          empresaId: empresa.id,
          nombre: 'Tubo CPVC Hidráulico 1/2" × 3 m',
          descripcion: 'Tubo CPVC para agua caliente y fría, diámetro 1/2 pulgada, longitud 3 m',
          precio: 78.00,
          tasaIva: 0.16,
          claveSAT: '40141702',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },

        // ── Electricidad ──
        {
          empresaId: empresa.id,
          nombre: 'Cable THW #12 (rollo 100 m)',
          descripcion: 'Cable eléctrico THW calibre 12 AWG 600V, color negro, rollo 100 metros',
          precio: 680.00,
          tasaIva: 0.16,
          claveSAT: '26121608',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },
        {
          empresaId: empresa.id,
          nombre: 'Cable THW #10 (rollo 100 m)',
          descripcion: 'Cable eléctrico THW calibre 10 AWG 600V, color rojo, rollo 100 metros',
          precio: 980.00,
          tasaIva: 0.16,
          claveSAT: '26121608',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },

        // ── Pintura y acabados ──
        {
          empresaId: empresa.id,
          nombre: 'Pintura Vinílica Blanca 19 L',
          descripcion: 'Pintura vinílica para interiores y exteriores, color blanco hueso, cubeta 19 L',
          precio: 395.00,
          tasaIva: 0.16,
          claveSAT: '31201601',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },
        {
          empresaId: empresa.id,
          nombre: 'Thinner Sintético',
          descripcion: 'Thinner sintético para dilución de esmaltes y lacas, venta por litro',
          precio: 48.00,
          tasaIva: 0.16,
          claveSAT: '12352115',
          claveUnidad: 'LTR',
          unidad: 'Litro',
        },

        // ── Madera ──
        {
          empresaId: empresa.id,
          nombre: 'Madera de Pino 2"×4"×3 m (tabla)',
          descripcion: 'Tabla de madera de pino cepillada, escuadría 2×4 pulgadas, longitud 3 m',
          precio: 82.00,
          tasaIva: 0.16,
          claveSAT: '11152101',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },
        {
          empresaId: empresa.id,
          nombre: 'Triplay Pino 4\'×8\'×12 mm',
          descripcion: 'Panel de triplay de pino cepillado y lijado, 1.22×2.44 m, espesor 12 mm',
          precio: 345.00,
          tasaIva: 0.16,
          claveSAT: '11152203',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },

        // ── Acero y lámina ──
        {
          empresaId: empresa.id,
          nombre: 'Lámina Galvanizada Cal. 26 × 3 m',
          descripcion: 'Lámina acanalada galvanizada calibre 26, longitud 3 metros, ancho 0.83 m',
          precio: 335.00,
          tasaIva: 0.16,
          claveSAT: '30102919',
          claveUnidad: 'H87',
          unidad: 'Pieza',
        },

        // ── Clavo y tornillos ──
        {
          empresaId: empresa.id,
          nombre: 'Clavo de Acero 3" (bolsa 1 kg)',
          descripcion: 'Clavos de acero punta de París 3 pulgadas, bolsa 1 kg',
          precio: 32.00,
          tasaIva: 0.16,
          claveSAT: '31161501',
          claveUnidad: 'KGM',
          unidad: 'Kilogramo',
        },

        // ── Vidrio ──
        {
          empresaId: empresa.id,
          nombre: 'Vidrio Claro 6 mm',
          descripcion: 'Vidrio transparente plano 6 mm de espesor, corte a medida, precio por m²',
          precio: 295.00,
          tasaIva: 0.16,
          claveSAT: '30111701',
          claveUnidad: 'MTK',
          unidad: 'Metro cuadrado',
        },
      ],
    })
    console.log('✅ Productos creados (25)')
  } else {
    console.log(`ℹ️  Productos existentes (${hasProductos}), se omite`)
  }

  console.log('\n─────────────────────────────────────────────')
  console.log('✅ Seed completado — Materiales Crimson SA de CV')
  console.log('   [Empresa]   admin@empresa.com / admin123')
  console.log('   [SuperAdmin] superadmin@sistema.com / super123')
  console.log('─────────────────────────────────────────────')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

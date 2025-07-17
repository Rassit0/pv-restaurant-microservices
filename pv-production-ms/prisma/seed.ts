import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const grupos = ['Grupo A', 'Grupo B', 'Grupo C'];

  for (const name of grupos) {
    await prisma.parallelGroup.upsert({
      where: { name }, // asegúrate de que `name` tenga un índice único en el modelo
      update: {}, // no actualiza nada si ya existe
      create: { name },
    });
  }

  console.log('Grupos paralelos verificados/creados');
}

main()
    .catch((e) => {
        console.error('Error al poblar la base de datos:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

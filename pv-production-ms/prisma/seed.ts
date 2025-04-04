import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Crear 5 grupos paralelos
    const parallelGroups = await prisma.parallelGroup.createMany({
        data: [
            { name: 'Grupo A' },
            { name: 'Grupo B' },
            { name: 'Grupo C' },
        ]
    });

    console.log('Grupos paralelos creados:', parallelGroups);
}

main()
    .catch((e) => {
        console.error('Error al poblar la base de datos:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

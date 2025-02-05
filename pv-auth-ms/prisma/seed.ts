import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // Crear el rol ADMIN si no existe
    const adminRole = await prisma.role.upsert({
        where: { name: 'admin' },
        update: {},
        create: {
            name: 'admin_role',
            description: 'Administrator del sistema',
        },
    });

    console.log('Admin role created:', adminRole);

    // Crear un usuario administrador asociado al rol ADMIN
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            name: 'admin_user',
            email: 'admin@example.com',
            password: await bcrypt.hash('Admin123', 10), // Hashea esta contraseña en producción
            roleId: adminRole.id,
        },
    });

    let user = adminUser;
    user.password = 'Admin123';

    console.log('Admin user created:', user);
}

main()
    .catch((e) => {
        console.error('Error seeding the database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

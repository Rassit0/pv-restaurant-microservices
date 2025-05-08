import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const transaction = await prisma.$transaction(async (tx) => {
        // Insertar los módulos en la tabla `modules` con relaciones padre-hijo
        const moduleData = [
            { name: 'USERS' },
            { name: 'USERS_ROLES', parent: 'USERS' },
            { name: 'REPORTS' },
            { name: 'INVENTORY' },
            { name: 'INVENTORY_INCOME', parent: 'INVENTORY' },
            { name: 'INVENTORY_OUTCOME', parent: 'INVENTORY' },
            { name: 'INVENTORY_TRANSFER', parent: 'INVENTORY' },
            { name: 'INVENTORY_ADJUSTMENT', parent: 'INVENTORY' },
            { name: 'NOTIFICATIONS' },
            { name: 'NOTIFICATIONS_LOW_STOCK', parent: 'NOTIFICATIONS' },
            { name: 'PRODUCTS' },
            { name: 'PRODUCTS_CATEGORIES', parent: 'PRODUCTS' },
            { name: 'PRODUCTS_UNITS', parent: 'PRODUCTS' },
            { name: 'SETTINGS' },
            { name: 'BRANCHES' },
            { name: 'PRODUCTION' },
            { name: 'PRODUCTION_RECIPES', parent: 'PRODUCTION' },
            { name: 'PRODUCTION_ORDERS', parent: 'PRODUCTION' },
            { name: 'SUPPLIERS' },
            { name: 'SUPPLIERS_CONTACTS', parent: 'SUPPLIERS' },
            { name: 'WAREHOUSES' },
            { name: 'HOME' },
            { name: 'PERSONS' },
        ];

        const moduleRecords: Record<string, any> = {};

        for (const module of moduleData) {
            const createdModule = await tx.module.upsert({
                where: { name: module.name },
                update: {},
                create: { name: module.name },
            });
            moduleRecords[module.name] = createdModule;
        }

        // Actualizar módulos para asignar los parentId
        for (const module of moduleData) {
            if (module.parent) {
                await tx.module.update({
                    where: { name: module.name },
                    data: { parentModule: { connect: { id: moduleRecords[module.parent].id } } },
                });
            }
        }

        console.log('Módulos creados correctamente con jerarquía');

        // Insertar permisos
        const permissions = ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'];

        for (const permissionName of permissions) {
            await tx.permission.upsert({
                where: { name: permissionName },
                update: {},
                create: { name: permissionName },
            });
        }

        console.log('Permisos creados correctamente');

        // Insertar roles
        const roles = [
            { name: 'super_admin', description: 'Soporte del sistema' },
            { name: 'administrador', description: 'Dueño, puede gestionar sucursales y casi todo' },
            { name: 'encargado_inventario', description: 'Encargado de inventario' },
            { name: 'cocinero', description: 'Personal de cocina' }
        ];

        for (const role of roles) {
            await tx.role.upsert({
                where: { name: role.name },
                update: {},
                create: role,
            });
        }

        console.log('Roles creados correctamente');

        // Obtener registros
        const allRoles = await tx.role.findMany();
        const allModules = await tx.module.findMany();
        const allPermissions = await tx.permission.findMany();

        // Asignar módulos y permisos a roles
        const roleModulesPermissionsMap = {
            super_admin: {
                USERS: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                USERS_ROLES: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                REPORTS: ['READ'],
                INVENTORY: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                INVENTORY_INCOME: ['WRITE', 'READ', 'EDIT'],
                INVENTORY_OUTCOME: ['WRITE', 'READ', 'EDIT'],
                INVENTORY_TRANSFER: ['WRITE', 'READ', 'EDIT'],
                INVENTORY_ADJUSTMENT: ['WRITE', 'READ', 'EDIT'],
                PRODUCTS: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                PRODUCTS_CATEGORIES: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                PRODUCTS_UNITS: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                SETTINGS: ['MANAGE'],
                BRANCHES: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                PRODUCTION: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                PRODUCTION_RECIPES: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                PRODUCTION_ORDERS: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                PRODUCTION_RECIPES_ENTRY: ['WRITE', 'READ', 'EDIT'],
                PRODUCTION_RECIPES_EXIT: ['WRITE', 'READ', 'EDIT'],
                SUPPLIERS: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                SUPPLIERS_CONTACTS: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                WAREHOUSES: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                HOME: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                PERSONS: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE', 'RESTORE', 'DELETE_PHYSICAL'],
                NOTIFICATIONS: ['READ'],
                NOTIFICATIONS_LOW_STOCK: ['READ'],
            },
            administrador: {
                USERS: ['MANAGE', 'WRITE', 'READ', 'EDIT', 'DELETE'],
                REPORTS: ['READ'],
                INVENTORY: ['MANAGE', 'WRITE', 'READ', 'EDIT'],
                INVENTORY_INCOME: ['WRITE', 'READ', 'EDIT'],
                INVENTORY_OUTCOME: ['WRITE', 'READ', 'EDIT'],
                INVENTORY_TRANSFER: ['WRITE', 'READ', 'EDIT'],
                INVENTORY_ADJUSTMENT: ['WRITE', 'READ', 'EDIT'],
                PRODUCTS: ['MANAGE', 'WRITE', 'READ', 'EDIT'],
                PRODUCTS_CATEGORIES: ['MANAGE', 'WRITE', 'READ', 'EDIT'],
                PRODUCTS_UNITS: ['MANAGE', 'WRITE', 'READ', 'EDIT'],
                BRANCHES: ['MANAGE', 'WRITE', 'READ', 'EDIT'],
                PRODUCTION: ['MANAGE', 'WRITE', 'READ', 'EDIT'],
                PRODUCTION_RECIPES: ['MANAGE', 'WRITE', 'READ', 'EDIT'],
                PRODUCTION_ORDERS: ['MANAGE', 'WRITE', 'READ', 'EDIT'],
                PRODUCTION_RECIPES_ENTRY: ['WRITE', 'READ', 'EDIT'],
                PRODUCTION_RECIPES_EXIT: ['WRITE', 'READ', 'EDIT'],
                SUPPLIERS: ['MANAGE', 'WRITE', 'READ'],
                SUPPLIERS_CONTACTS: ['MANAGE', 'WRITE', 'READ'],
                WAREHOUSES: ['MANAGE', 'WRITE', 'READ'],
                NOTIFICATIONS_LOW_STOCK: ['READ'],
                HOME: ['READ'],
                PERSONS: ['MANAGE', 'WRITE', 'READ', 'DELETE'],
            },
            encargado_inventario: {
                INVENTORY: ['READ', 'EDIT', 'WRITE'],
                INVENTORY_ENTRY: ['WRITE', 'READ'],
                INVENTORY_EXIT: ['WRITE', 'READ'],
                PRODUCTS: ['READ', 'WRITE'],
                WAREHOUSES: ['READ'],
                PRODUCTS_CATEGORIES: ['READ'],
                PRODUCTS_UNITS: ['READ'],
                BRANCHES: ['READ'],
                NOTIFICATIONS: ['READ'],
                NOTIFICATIONS_LOW_STOCK: ['READ'],
                HOME: ['READ'],
                PRODUCTION: ['READ', 'WRITE'],
                PRODUCTION_ORDERS: ['READ'],
                SUPPLIERS: ['READ'],
                PERSONS: ['READ', 'WRITE'],
            },
            cocinero: {
                PRODUCTION: ['READ', 'WRITE'],
                PRODUCTION_RECIPES: ['READ', 'WRITE'],
                PRODUCTION_ORDERS: ['READ', 'WRITE', 'EDIT'],
                PRODUCTS: ['READ'],
                PRODUCTS_CATEGORIES: ['READ'],
                PRODUCTS_UNITS: ['READ'],
                // PRODUCTION_RECIPES_ENTRY: ['WRITE', 'READ'],
                PRODUCTION_RECIPES_EXIT: ['WRITE', 'READ'],
                NOTIFICATIONS: ['READ'],
                BRANCHES: ['READ'],
                SUPPLIERS: ['READ'],
                WAREHOUSES: ['READ'],
                NOTIFICATIONS_LOW_STOCK: ['READ'],
                HOME: ['READ'],
            }
        };


        for (const role of allRoles) {
            const permissions = roleModulesPermissionsMap[role.name] || {};

            for (const [moduleName, permissionList] of Object.entries(permissions)) {
                const module = allModules.find(m => m.name === moduleName);
                if (!module) continue;

                const roleModule = await tx.roleModule.upsert({
                    where: {
                        roleId_moduleId: { roleId: role.id, moduleId: module.id }
                    },
                    update: {},
                    create: {
                        roleId: role.id,
                        moduleId: module.id,
                    }
                });

                if (!Array.isArray(permissionList)) {
                    console.error(`permissionList no es un array para el módulo ${roleModule.id}`);
                    continue;
                }

                for (const permissionName of permissionList) {
                    const permission = allPermissions.find(p => p.name === permissionName);
                    if (!permission) continue;

                    await tx.roleModulePermission.upsert({
                        where: {
                            roleModuleId_permissionId: {
                                roleModuleId: roleModule.id,
                                permissionId: permission.id
                            }
                        },
                        update: {},
                        create: {
                            roleModuleId: roleModule.id,
                            permissionId: permission.id,
                        },
                    });
                }
            }
        }

        console.log('Permisos asignados correctamente');

        // Crear usuario Super Admin
        const superAdminRole = await tx.role.findUnique({
            where: { name: 'super_admin' },
        });

        if (!superAdminRole) {
            throw new Error('El rol "super_admin" no se creó correctamente.');
        }

        const adminUser = await tx.user.upsert({
            where: { email: 'superadmin@example.com' },
            update: {},
            create: {
                name: 'Super Administrador',
                email: 'superadmin@example.com',
                password: await bcrypt.hash('Admin.123', 10),
                roleId: superAdminRole.id,
                hasGlobalBranchesAccess: true
            },
        });

        console.log('Usuario Super Admin creado:', {
            name: adminUser.name,
            email: adminUser.email,
        });
    });

    console.log('Transacción completada correctamente');
}

main()
    .catch((e) => {
        console.error('Error al poblar la base de datos:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

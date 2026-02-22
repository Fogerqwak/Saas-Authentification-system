import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    create: { name: "admin", description: "Administrator" },
    update: {},
  });
  const userRole = await prisma.role.upsert({
    where: { name: "user" },
    create: { name: "user", description: "Regular user" },
    update: {},
  });
  const moderatorRole = await prisma.role.upsert({
    where: { name: "moderator" },
    create: { name: "moderator", description: "Moderator" },
    update: {},
  });

  const perms = [
    { name: "users:read", description: "View users" },
    { name: "users:write", description: "Create/update users" },
    { name: "users:delete", description: "Delete users" },
    { name: "admin", description: "Full admin access" },
  ];
  for (const p of perms) {
    await prisma.permission.upsert({
      where: { name: p.name },
      create: p,
      update: {},
    });
  }

  const usersRead = await prisma.permission.findUnique({ where: { name: "users:read" } });
  const usersWrite = await prisma.permission.findUnique({ where: { name: "users:write" } });
  const usersDelete = await prisma.permission.findUnique({ where: { name: "users:delete" } });
  const adminPerm = await prisma.permission.findUnique({ where: { name: "admin" } });

  if (usersRead && userRole) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: userRole.id, permissionId: usersRead.id },
      },
      create: { roleId: userRole.id, permissionId: usersRead.id },
      update: {},
    });
  }
  if (usersRead && usersWrite && moderatorRole) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: moderatorRole.id, permissionId: usersRead.id },
      },
      create: { roleId: moderatorRole.id, permissionId: usersRead.id },
      update: {},
    });
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: moderatorRole.id, permissionId: usersWrite.id },
      },
      create: { roleId: moderatorRole.id, permissionId: usersWrite.id },
      update: {},
    });
  }
  if (adminPerm && adminRole) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: adminPerm.id },
      },
      create: { roleId: adminRole.id, permissionId: adminPerm.id },
      update: {},
    });
  }

  console.log("Seed complete: roles and permissions created.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

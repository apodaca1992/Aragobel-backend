'use strict';

module.exports = {//npx sequelize-cli db:seed --seed nombre_de_tu_archivo.js
  up: async (queryInterface, Sequelize) => {
    // 1. Crear Aplicación
    await queryInterface.bulkInsert('aplicaciones', [{
      nombre: 'Sistema Interno AragoBel',
      descripcion: 'Panel de administración general',
      createdAt: new Date(), updatedAt: new Date()
    }]);

    // 2. Crear Rol
    await queryInterface.bulkInsert('roles', [{
      nombre: 'Administrador',
      descripcion: 'Acceso total al sistema',
      createdAt: new Date(), updatedAt: new Date()
    }]);

    // 3. Crear los 4 Permisos básicos
    // Insertamos el array de objetos para tener VER, CREAR, EDITAR, ELIMINAR
    await queryInterface.bulkInsert('permisos', [
      { id_permiso: 1, tipo_permiso: 'VER', createdAt: new Date(), updatedAt: new Date() },
      { id_permiso: 2, tipo_permiso: 'CREAR', createdAt: new Date(), updatedAt: new Date() },
      { id_permiso: 3, tipo_permiso: 'EDITAR', createdAt: new Date(), updatedAt: new Date() },
      { id_permiso: 4, tipo_permiso: 'ELIMINAR', createdAt: new Date(), updatedAt: new Date() }
    ]);

    // 4. Crear Recursos: Entregas y Checador
    await queryInterface.bulkInsert('recursos', [
      { id_recurso: 1, nombre: 'ENTREGAS', id_aplicacion: 1, createdAt: new Date(), updatedAt: new Date() },
      { id_recurso: 2, nombre: 'CHECADOR', id_aplicacion: 1, createdAt: new Date(), updatedAt: new Date() }
    ]);

    // 5. Vincular Usuario con el Rol (UsuarioRol)
    // Asumimos que ya tienes un usuario con ID 1
    await queryInterface.bulkInsert('usuarios_roles', [{
      id_usuario: 1, //adrian
      id_rol: 1,  //Administrador
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    // 6. Vincular Rol de Administrador con AMBOS Recursos para TODOS los Permisos
    await queryInterface.bulkInsert('roles_recursos_permisos', [
      // Permisos para el recurso ENTREGAS (id_recurso: 1)
      { id_rol: 1, id_recurso: 1, id_permiso: 1, createdAt: new Date(), updatedAt: new Date() },
      { id_rol: 1, id_recurso: 1, id_permiso: 2, createdAt: new Date(), updatedAt: new Date() },
      { id_rol: 1, id_recurso: 1, id_permiso: 3, createdAt: new Date(), updatedAt: new Date() },
      { id_rol: 1, id_recurso: 1, id_permiso: 4, createdAt: new Date(), updatedAt: new Date() },

      // Permisos para el recurso CHECADOR (id_recurso: 2)
      { id_rol: 1, id_recurso: 2, id_permiso: 1, createdAt: new Date(), updatedAt: new Date() },
      { id_rol: 1, id_recurso: 2, id_permiso: 2, createdAt: new Date(), updatedAt: new Date() },
      { id_rol: 1, id_recurso: 2, id_permiso: 3, createdAt: new Date(), updatedAt: new Date() },
      { id_rol: 1, id_recurso: 2, id_permiso: 4, createdAt: new Date(), updatedAt: new Date() }
    ]);
    console.log('✅ Seeder completo: Relaciones de Usuario, Rol y Permisos establecidas.');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('roles_recursos_permisos', null, {});
    await queryInterface.bulkDelete('usuarios_roles', null, {});
    await queryInterface.bulkDelete('recursos', null, {});
    await queryInterface.bulkDelete('permisos', null, {});
    await queryInterface.bulkDelete('roles', null, {});
    await queryInterface.bulkDelete('aplicaciones', null, {});
  }
};
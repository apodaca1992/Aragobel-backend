-- 1. Tabla de Tiendas
CREATE TABLE IF NOT EXISTS tiendas (
    id_tienda VARCHAR(36) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    latitud VARCHAR(50) NOT NULL,
    longitud VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_tienda)
);

-- 3. Tabla de Puestos
CREATE TABLE IF NOT EXISTS puestos (
    id_puesto VARCHAR(36) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_puesto)
);

-- 5. Tabla Tipo de Registros Checador
CREATE TABLE IF NOT EXISTS tipo_registros_checador (
    id_tipo_registro VARCHAR(36) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_tipo_registro)
);

CREATE TABLE IF NOT EXISTS permisos (
    id_permiso VARCHAR(36) NOT NULL,
    tipo_permiso VARCHAR(100) NOT NULL, -- Ejemplo: 'crear', 'eliminar'
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_permiso)
);

CREATE TABLE IF NOT EXISTS aplicaciones (
    id_aplicacion VARCHAR(36) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_aplicacion)
);

CREATE TABLE IF NOT EXISTS roles (
    id_rol VARCHAR(36) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_rol)
);

-- 4. Tabla de Empleados
CREATE TABLE IF NOT EXISTS empleados (
    id_empleado VARCHAR(36) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100) NOT NULL,
    email VARCHAR(100) NULL,
    id_tienda VARCHAR(36) NOT NULL,
    id_puesto VARCHAR(36) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_empleado),
    CONSTRAINT fk_empleado_tienda FOREIGN KEY (id_tienda) REFERENCES tiendas(id_tienda),
    CONSTRAINT fk_empleado_puesto FOREIGN KEY (id_puesto) REFERENCES puestos(id_puesto)
);

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario VARCHAR(36) NOT NULL,
    usuario VARCHAR(100) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL,
    id_empleado VARCHAR(36) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_usuario),
    -- Relación con la tabla empleados
    CONSTRAINT fk_usuarios_empleados FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado)
);
ALTER TABLE usuarios ADD CONSTRAINT UNIQUE (usuario);
ALTER TABLE usuarios ADD CONSTRAINT UNIQUE (email);

-- 2. Tabla de Vehículos (Relacionada con Tiendas)
CREATE TABLE IF NOT EXISTS vehiculos (
    id_vehiculo VARCHAR(36) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    id_tienda VARCHAR(36) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_vehiculo),
    CONSTRAINT fk_vehiculo_tienda FOREIGN KEY (id_tienda) REFERENCES tiendas(id_tienda)
);


CREATE TABLE IF NOT EXISTS entregas (
    id_entrega VARCHAR(36) NOT NULL,
    folio VARCHAR(100) NOT NULL,
    id_repartidor VARCHAR(36) NOT NULL,
    id_vehiculo VARCHAR(36) NOT NULL,
    colonia VARCHAR(100) NOT NULL,
    fec_registropedido DATETIME NULL,
    fec_salidapedido DATETIME NULL,
    fec_entregapedido DATETIME NULL,
    id_tienda VARCHAR(36) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_entrega),
    -- Relaciones (Llaves Foráneas)
    CONSTRAINT fk_entregas_repartidor FOREIGN KEY (id_repartidor) REFERENCES empleados(id_empleado),
    CONSTRAINT fk_entregas_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id_vehiculo),
    CONSTRAINT fk_entregas_tienda FOREIGN KEY (id_tienda) REFERENCES tiendas(id_tienda)
);

-- 6. Tabla Registros Checador (La tabla central de eventos)
CREATE TABLE IF NOT EXISTS registros_checador (
    id_registro VARCHAR(36) NOT NULL,
    id_empleado VARCHAR(36) NOT NULL,
    id_tipo_registro VARCHAR(36) NOT NULL,
    fecha_registro DATETIME NOT NULL,
    latitud VARCHAR(100) NULL,
    longitud VARCHAR(100) NULL,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_registro),
    CONSTRAINT fk_registro_empleado FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado),
    CONSTRAINT fk_registro_tipo FOREIGN KEY (id_tipo_registro) REFERENCES tipo_registros_checador(id_tipo_registro)
);

CREATE TABLE IF NOT EXISTS roles_aplicaciones (
    id_rol VARCHAR(36) NOT NULL,
    id_aplicacion VARCHAR(36) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_rol, id_aplicacion),
    CONSTRAINT fk_ra_rol FOREIGN KEY (id_rol) REFERENCES roles (id_rol),
    CONSTRAINT fk_ra_app FOREIGN KEY (id_aplicacion) REFERENCES aplicaciones (id_aplicacion)
);

CREATE TABLE IF NOT EXISTS recursos (
    id_recurso VARCHAR(36) NOT NULL,
    nombre VARCHAR(100) NOT NULL, -- Ejemplo: 'Tabla_Nomina', 'Dashboard'
    id_aplicacion VARCHAR(36) NOT NULL,
    aplicacion_nombre_snap VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_recurso),
    CONSTRAINT fk_rec_app FOREIGN KEY (id_aplicacion) REFERENCES aplicaciones (id_aplicacion)
);

CREATE TABLE IF NOT EXISTS roles_recursos_permisos (
    id_rol VARCHAR(36) NOT NULL,
    id_recurso VARCHAR(36) NOT NULL,
    id_permiso VARCHAR(36) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_rol, id_recurso, id_permiso),
    CONSTRAINT fk_rrp_rol FOREIGN KEY (id_rol) REFERENCES roles (id_rol),
    CONSTRAINT fk_rrp_rec FOREIGN KEY (id_recurso) REFERENCES recursos (id_recurso),
    CONSTRAINT fk_rrp_per FOREIGN KEY (id_permiso) REFERENCES permisos (id_permiso)
);
-- Tabla intermedia para conectar usuarios con sus roles
CREATE TABLE IF NOT EXISTS usuarios_roles (
    id_usuario VARCHAR(36) NOT NULL,
    id_rol VARCHAR(36) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_usuario, id_rol),
    CONSTRAINT fk_ur_user FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
    CONSTRAINT fk_ur_rol FOREIGN KEY (id_rol) REFERENCES roles (id_rol)
);
--le agregamos los timestamp a todas las tablas
ALTER TABLE tiendas 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE puestos 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE tipo_registros_checador 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE permisos 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE aplicaciones 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE roles 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE empleados 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE usuarios 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE vehiculos 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE entregas 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE registros_checador 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE roles_aplicaciones 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE recursos 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE roles_recursos_permisos 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE usuarios_roles 
ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS dispositivos_android (
    id_dispositivo VARCHAR(36) NOT NULL,
    id_usuario VARCHAR(36) NOT NULL, -- Relación con tu tabla de usuarios
    android_id VARCHAR(100) NOT NULL, -- ID único del hardware (SSAID)
    fcm_token TEXT NULL, -- Token de Firebase para notificaciones push
    modelo VARCHAR(50) NOT NULL, -- Ejemplo: 'Pixel 6', 'Galaxy S21'
    marca VARCHAR(50) NOT NULL, -- Ejemplo: 'Google', 'Samsung'
    version_so VARCHAR(20) NOT NULL, -- Ejemplo: 'Android 13'
    api_level INT NULL, -- Ejemplo: 33
    idioma VARCHAR(10) DEFAULT 'es', -- Locale del dispositivo
    ultima_conexion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id_dispositivo),
    CONSTRAINT fk_dispositivo_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    CONSTRAINT unique_android_id UNIQUE (android_id)
);

--agregamos la columna deletedAt a todas las tablas
ALTER TABLE tiendas 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE puestos 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE tipo_registros_checador 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE permisos 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE aplicaciones 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE roles 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE empleados 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE usuarios 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE vehiculos 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE entregas 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE registros_checador 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE roles_aplicaciones 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE recursos 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE roles_recursos_permisos 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE usuarios_roles 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;

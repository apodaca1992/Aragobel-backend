
 -- 1. Insertar Puestos (Catálogo base)
INSERT INTO puestos (id_puesto, nombre) VALUES 
('550e8400-e29b-41d4-a716-467655440000','Administrador de Sistemas')

-- 2. Insertar Tiendas (Catálogo base)
INSERT INTO tiendas (id_tienda,nombre, latitud, longitud) VALUES 
('550e8400-e29b-41d4-a716-446655440000','Tienda Matriz - Cosalá', '24.8090', '-107.3940');

-- 3. Insertar Empleado (Depende de las dos anteriores)
-- Nota: Usamos id_tienda = 1 (Matriz) e id_puesto = 1 (Administrador)
INSERT INTO empleados (id_empleado,nombre, apellido_paterno, apellido_materno, email, id_tienda, id_puesto) VALUES 
('550e8400-e29b-41d4-a716-467655447800','Jesus Adrian', 'Apodaca', 'Campos', 'jesus.apodaca@aragobel.com', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-467655440000');

INSERT INTO usuarios (id_usuario,usuario, contrasena,email,id_empleado) VALUES 
('550e8400-e29b-41d4-a716-467655447650','adrian', '$2b$10$SR9xybchTttf4QZ/CmJGGO0E.8pZA6qzF9ii7/kCGCo3Ef/7/6446', 'jesus.apodaca@info.uas.edu.mx','550e8400-e29b-41d4-a716-467655447800');


select * from empleados limit 10;
select * from usuarios limit 10; --que ejecutara el 
select * from tiendas limit 10;
select * from recursos limit 100;
select * from permisos

INSERT IGNORE INTO permisos (id_permiso,tipo_permiso) 
VALUES 
('550e8400-e29b-41d4-a716-467655454650','VER'),
('550e8400-e29b-41d4-a745-467655447650','CREAR'),
('550e8980-e29b-41d4-a716-467655447650','EDITAR'),
('550e8496-e29b-41d4-a716-467655447650','ELIMINAR'),
('550e8400-e29b-41d4-a716-467585447650','LISTAR');

-- 1. Insertar Puestos (Catálogo base)
INSERT INTO aplicaciones (id_aplicacion,nombre, descripcion) VALUES 
('550e8400-e29b-41d6-a745-467655447650','Sistema Interno Aragobel', 'Panel de administración general');


INSERT INTO roles (id_rol,nombre, descripcion) VALUES 
('550e8400-e29b-41d4-a745-467455447650','Administrador', 'Acceso total al sistema');


INSERT IGNORE INTO recursos (id_recurso,nombre, id_aplicacion) VALUES 
('550e8400-e29b-41d4-a745-461455447650','ENTREGAS', '550e8400-e29b-41d6-a745-467655447650'), 
('550e8400-e29b-41d4-a745-467655441250','CHECADOR','550e8400-e29b-41d6-a745-467655447650');


INSERT INTO usuarios_roles (id_usuario, id_rol) VALUES 
('550e8400-e29b-41d4-a716-467655447650', '550e8400-e29b-41d4-a745-467455447650');

INSERT INTO roles_recursos_permisos (id_rol,id_recurso,id_permiso) 
VALUES 
('550e8400-e29b-41d4-a745-467455447650','550e8400-e29b-41d4-a745-461455447650','550e8400-e29b-41d4-a716-467655454650'),
('550e8400-e29b-41d4-a745-467455447650','550e8400-e29b-41d4-a745-461455447650','550e8400-e29b-41d4-a745-467655447650'),
('550e8400-e29b-41d4-a745-467455447650','550e8400-e29b-41d4-a745-461455447650','550e8980-e29b-41d4-a716-467655447650'),
('550e8400-e29b-41d4-a745-467455447650','550e8400-e29b-41d4-a745-461455447650','550e8496-e29b-41d4-a716-467655447650'),
('550e8400-e29b-41d4-a745-467455447650','550e8400-e29b-41d4-a745-461455447650','550e8400-e29b-41d4-a716-467585447650'),
('550e8400-e29b-41d4-a745-467455447650','550e8400-e29b-41d4-a745-467655441250','550e8400-e29b-41d4-a716-467655454650'),
('550e8400-e29b-41d4-a745-467455447650','550e8400-e29b-41d4-a745-467655441250','550e8400-e29b-41d4-a745-467655447650'),
('550e8400-e29b-41d4-a745-467455447650','550e8400-e29b-41d4-a745-467655441250','550e8980-e29b-41d4-a716-467655447650'),
('550e8400-e29b-41d4-a745-467455447650','550e8400-e29b-41d4-a745-467655441250','550e8496-e29b-41d4-a716-467655447650'),
('550e8400-e29b-41d4-a745-467455447650','550e8400-e29b-41d4-a745-467655441250','550e8400-e29b-41d4-a716-467585447650');

--columnas para datos snap
/*-- Paso 1: Agregar la columna permitiendo NULL temporalmente
ALTER TABLE recursos 
ADD COLUMN aplicacion_nombre_snap VARCHAR(100) NULL;
-- Paso 2: Llenar la columna con la información de los JOINs actuales
UPDATE recursos r
JOIN aplicaciones a ON r.id_aplicacion = a.id_aplicacion
SET r.aplicacion_nombre_snap = a.nombre;
-- Paso 3: Ahora sí, restringir a NOT NULL
ALTER TABLE recursos 
MODIFY COLUMN aplicacion_nombre_snap VARCHAR(100) NOT NULL;*/
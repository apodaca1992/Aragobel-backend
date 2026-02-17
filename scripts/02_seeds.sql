-- 1. Insertar Puestos (Catálogo base)
INSERT INTO puestos (nombre) VALUES 
('Administrador de Sistemas')

-- 2. Insertar Tiendas (Catálogo base)
INSERT INTO tiendas (nombre, latitud, longitud) VALUES 
('Tienda Matriz - Cosalá', '', '');

-- 3. Insertar Empleado (Depende de las dos anteriores)
-- Nota: Usamos id_tienda = 1 (Matriz) e id_puesto = 1 (Administrador)
/*INSERT INTO empleados (nombre, apellido_paterno, apellido_materno, email, id_tienda, id_puesto) VALUES 
('Jesus Adrian', 'Apodaca', 'Campos', 'jesus.apodaca@aragobel.com', 1, 1);*/


INSERT INTO permisos (tipo_permiso) 
VALUES ('VER'),('CREAR'),('EDITAR'),('ELIMINAR'),('LISTAR');

INSERT INTO aplicaciones (nombre, descripcion) VALUES 
('Sistema Interno Aragobel', 'Panel de administración general');

INSERT INTO roles (nombre, descripcion) VALUES 
('Administrador', 'Acceso total al sistema');

INSERT INTO recursos (nombre, id_aplicacion) VALUES 
('ENTREGAS', 1), ('CHECADOR',2);

--falta el usuario
/*INSERT INTO usuarios (usuario, contrasena,email,id_empleado) VALUES 
('adrian', '$2b$10$SR9xybchTttf4QZ/CmJGGO0E.8pZA6qzF9ii7/kCGCo3Ef/7/6446', 'jesus.apodaca@info.uas.edu.mx',1);*/

/*INSERT INTO usuarios_roles (id_usuario, id_rol) VALUES 
(1, 1);*/

/*INSERT INTO roles_recursos_permisos (id_rol,id_recurso,id_permiso) 
VALUES (1,1,1),(1,1,2),(1,1,3),(1,1,4),(1,1,5),
(1,2,1),(1,2,2),(1,2,3),(1,2,4),(1,2,5);*/